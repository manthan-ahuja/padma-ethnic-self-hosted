import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/admin-api";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maxBytes = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await authorizeAdminMutation(request);
  if (auth.error) return auth.error;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Image storage is not configured." }, { status: 503 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes + 100_000) return NextResponse.json({ error: "Image must be 4 MB or smaller." }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Upload a JPG, PNG, WebP, or AVIF image." }, { status: 400 });
    if (file.size < 1 || file.size > maxBytes) return NextResponse.json({ error: "Image must be between 1 byte and 4 MB." }, { status: 400 });
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "") || "product-image";
    const blob = await put(`products/${safeName}`, file, { access: "public", addRandomSuffix: true });
    return NextResponse.json({ image: { src: blob.url, alt: String(form.get("alt") ?? file.name).trim() || file.name } }, { status: 201 });
  } catch (error) {
    console.error("Admin image upload failed", error);
    return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
  }
}
