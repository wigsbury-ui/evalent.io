import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      schoolId: string | null;
      schoolName: string | null;
    };
  }
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    schoolId: string | null;
    schoolName: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    schoolId: string | null;
    schoolName: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Evalent",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const supabase = createServerClient();

        const { data: user, error } = await supabase
          .from("users")
          .select(
            "id, email, name, role, school_id, password_hash, is_active"
          )
          .eq("email", credentials.email.toLowerCase())
          .single();

        if (error || !user || !user.is_active) return null;

        const { compare } = await import("bcryptjs");
        const isValid = await compare(
          credentials.password,
          user.password_hash
        );
        if (!isValid) return null;

        // Look up the school name if the user has a school_id
        let schoolName: string | null = null;
        if (user.school_id) {
          const { data: school } = await supabase
            .from("schools")
            .select("name")
            .eq("id", user.school_id)
            .single();
          if (school) {
            schoolName = school.name;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          schoolId: user.school_id,
          schoolName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.schoolName = user.schoolName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.schoolId = token.schoolId;
      session.user.schoolName = token.schoolName;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
