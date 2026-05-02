import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const rows = await sql`
          SELECT id, email, display_name, password_hash
          FROM users
          WHERE email = ${credentials.email as string}
        `
        const user = rows[0]
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash as string
        )
        if (!valid) return null

        return {
          id: user.id as string,
          email: user.email as string,
          name: user.display_name as string,
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Salva/atualiza perfil de usuários OAuth no banco
      if (account && account.provider !== 'credentials') {
        const userId = `${account.provider}:${account.providerAccountId}`
        await sql`
          INSERT INTO user_profiles (user_id, display_name, avatar_url)
          VALUES (${userId}, ${user.name ?? ''}, ${user.image ?? ''})
          ON CONFLICT (user_id) DO UPDATE
            SET display_name = EXCLUDED.display_name,
                avatar_url = EXCLUDED.avatar_url,
                updated_at = NOW()
        `
      }
      return true
    },

    jwt({ token, user, account }) {
      if (user) {
        if (account && account.provider !== 'credentials') {
          token.userId = `${account.provider}:${account.providerAccountId}`
        } else {
          token.userId = user.id
        }
        token.name = user.name
        token.picture = user.image
      }
      return token
    },

    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string
      }
      if (token.picture) {
        session.user.image = token.picture as string
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
  },
})
