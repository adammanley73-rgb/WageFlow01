import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString() ?? '';
        const password = credentials?.password?.toString() ?? '';

        // Demo user for client testing
        if (email === 'demo@wageflow.com' && password === 'demo123') {
          return {
            id: '1',
            email: 'demo@wageflow.com',
            name: 'Demo User',
          };
        }

        // Invalid credentials
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      // Ensure session.user exists and attach id
      const user = (session.user ?? {}) as Record<string, unknown>;
      if (token?.id) user.id = token.id as string;
      session.user = user as typeof session.user;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
