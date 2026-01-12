import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { query } from '../../../../lib/db'
import bcrypt from 'bcrypt'

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        try {
          // Query user by email
          const result = await query('SELECT id, email, name, password, credits, role FROM users WHERE email = $1', [credentials.email]);
          const user = result.rows[0];
          if (!user) return null;
          // Check password with bcrypt
          const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          if (!isValidPassword) return null;
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            credits: user.credits,
            role: user.role || 'user',
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const
  },
  callbacks: {
    async jwt({ token, user }: { token: any, user: any }) {
      // On login, merge user info into token
      if (user) {
        token.credits = user.credits;
        token.userId = user.id;
        token.role = user.role || 'user';
        token.name = user.name;
        token.email = user.email;
      }
      // On session refresh, always fetch latest user info from Postgres
      if (token?.userId) {
        try {
          const result = await query('SELECT name, email, credits, role FROM users WHERE id = $1', [token.userId]);
          const user = result.rows[0];
          if (user) {
            token.name = user.name;
            token.email = user.email;
            token.credits = user.credits;
            token.role = user.role || 'user';
          }
        } catch (e) {
          // ignore
        }
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      if (token && session.user) {
        session.user.id = token.userId || token.sub;
        session.user.email = token.email || token.sub;
        session.user.credits = token.credits || 0;
        session.user.role = token.role || 'user';
        session.user.name = token.name || '';
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin'
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

// Export authOptions for use in other API routes
export { authOptions }