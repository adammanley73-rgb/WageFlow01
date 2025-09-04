import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const handler = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔍 AUTHORIZE CALLED with:', credentials);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }
        
        const ok = await authenticate(credentials.email, credentials.password);
        console.log('🔐 Authentication result:', ok);
        
        if (ok) {
          const user = { 
            id: 'user-1', 
            email: credentials.email,
            name: credentials.email === "demo@wageflow.com" ? "Demo Smith" : "Demo User"
          };
          console.log('✅ Returning user:', user);
          return user;
        }
        
        console.log('❌ Authentication failed');
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      console.log('🎫 JWT callback - token:', token, 'user:', user);
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      console.log('👤 Session callback - session:', session, 'token:', token);
      if (token?.userId) (session as any).userId = token.userId;
      return session;
    },
  },
  debug: true,
});

// Enhanced authenticate function with logging
async function authenticate(email: string, password: string): Promise<boolean> {
  console.log('🔍 Authenticate function called with:', { email, password });
  
  if (email === "demo@wageflow.com" && password === "demo123") {
    console.log('✅ Demo credentials matched!');
    return true;
  }
  
  if (email === "admin@wageflow.com" && password === "admin123") {
    console.log('✅ Admin credentials matched!');
    return true;
  }
  
  console.log('❌ No credentials matched');
  return false;
}

export { handler as GET, handler as POST };