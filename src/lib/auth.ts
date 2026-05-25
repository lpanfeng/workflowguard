import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Resend from "next-auth/providers/resend"
import { SupabaseAdapter } from "@auth/supabase-adapter"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)
 
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Resend({
      from: "noreply@workflowguard.com",
    }),
  ],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  pages: {
    signIn: "/auth/login",
    newUser: "/dashboard",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        // 从 Supabase 获取角色和套餐信息
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("role, plan")
          .eq("id", user.id)
          .single()
        if (profile) {
          session.user.role = profile.role
          session.user.plan = profile.plan
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("role, plan")
          .eq("id", user.id)
          .single()
        if (profile) {
          token.role = profile.role
          token.plan = profile.plan
        }
      }
      return token
    },
  },
})
