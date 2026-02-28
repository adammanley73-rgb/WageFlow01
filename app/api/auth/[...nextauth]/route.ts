// C:\Projects\wageflow01\app\api\auth\[...nextauth]\route.ts

import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEMO_EMAIL = "demo@wageflow.com";
const DEMO_PASSWORD = "demo123";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        // Demo user for client testing
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          return {
            id: "1",
            email: DEMO_EMAIL,
            name: "Demo User",
          };
        }

        // Invalid credentials
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        (token as Record<string, unknown>).id = String(user.id);
      }
      return token;
    },
    async session({ session, token }) {
      const user = (session.user ?? {}) as Record<string, unknown>;
      const id = (token as Record<string, unknown>)?.id;

      if (id) user.id = String(id);
      session.user = user as typeof session.user;

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };