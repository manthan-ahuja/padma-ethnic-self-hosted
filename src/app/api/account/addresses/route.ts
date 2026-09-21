import { NextResponse } from "next/server";
import { getCustomerId } from "@/lib/account-session";
import { parseAddress } from "@/lib/account-validation";
import { AddressOwnershipError, customerStore } from "@/lib/customer-store";

export async function GET() {
  const userId = await getCustomerId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ addresses: await customerStore.listAddresses(userId) });
}

export async function POST(request: Request) {
  const userId = await getCustomerId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let input: ReturnType<typeof parseAddress>;
  try {
    input = parseAddress(await request.json());
  } catch {
    return NextResponse.json({ error: "Please check the address details." }, { status: 400 });
  }
  try {
    const address = await customerStore.saveAddress(userId, input);
    return NextResponse.json({ address });
  } catch (error) {
    if (error instanceof AddressOwnershipError) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }
    console.error("Saving customer address failed", error);
    return NextResponse.json({ error: "Unable to save the address right now." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = await getCustomerId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Address id is required" }, { status: 400 });
  try {
    await customerStore.deleteAddress(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Deleting customer address failed", error);
    return NextResponse.json({ error: "Unable to remove the address right now." }, { status: 500 });
  }
}
