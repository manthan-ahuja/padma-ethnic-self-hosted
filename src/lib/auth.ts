import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { customerStore } from "./customer-store";
import { accountRateLimiter, requestIp } from "./rate-limit";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleProvider = googleClientId && googleClientSecret
  ? GoogleProvider({ clientId: googleClientId, clientSecret: googleClientSecret })
  : null;

export const googleAuthConfigured = Boolean(googleProvider);

const credentialsProvider = CredentialsProvider({
  name: "Email and password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials, request) {
    if (!credentials?.email || !credentials.password) return null;
    const ip = requestIp(request.headers);
    if (!accountRateLimiter.allow(`login-ip:${ip}`, 30, 10 * 60_000)) return null;
    if (!accountRateLimiter.allow(`login-account:${ip}:${credentials.email.trim().toLowerCase()}`, 8, 10 * 60_000)) return null;
    return customerStore.authenticatePassword(credentials.email, credentials.password);
  },
});

export const authOptions: NextAuthOptions = {
  providers: [...(googleProvider ? [googleProvider] : []), credentialsProvider],
  pages: { signIn: "/account" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      if (!user.email || !account.providerAccountId || (profile as { email_verified?: boolean } | undefined)?.email_verified !== true) return false;
      try {
        const customer = await customerStore.upsertGoogleUser({
          name: user.name ?? user.email.split("@")[0],
          email: user.email,
          subject: account.providerAccountId,
        });
        user.id = customer.id;
        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user?.id && (account?.provider === "credentials" || account?.provider === "google")) {
        token.customerId = user.id;
        token.authProvider = account.provider;
      }
      if (!token.customerId && token.email) {
        const existingGoogleUser = await customerStore.findGoogleUserByEmail(token.email);
        if (existingGoogleUser) {
          token.customerId = existingGoogleUser.id;
          token.authProvider = "google";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.customerId) {
        session.user.id = String(token.customerId);
        session.user.authProvider = token.authProvider;
      }
      return session;
    },
  },
};
