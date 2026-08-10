import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseModuleAccess } from "@/lib/permissions/modules";

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const portal = String(credentials?.portal || "staff");

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user || !user.password || !user.isActive) {
          return null;
        }

        if (portal === "customer" && user.role !== "CUSTOMER") {
          return null;
        }
        if (portal !== "customer" && user.role === "CUSTOMER") {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        try {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "LOGIN",
              entity: "User",
              entityId: user.id,
              newValues: {
                email: user.email,
                role: user.role,
                provider: "credentials",
              },
            },
          });
        } catch {
          // Do not block authentication if audit write fails
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          moduleAccess: parseModuleAccess(user.moduleAccess),
        };
      },
    }),
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session, account }) {
      if (user) {
        token.id = user.id ?? token.sub ?? token.id;
        token.role = (user as { role?: Role }).role ?? "CASHIER";
        token.avatar = (user as { avatar?: string | null }).avatar ?? null;
        token.name = user.name;
        token.email = user.email;
        token.moduleAccess =
          (user as { moduleAccess?: ReturnType<typeof parseModuleAccess> })
            .moduleAccess ?? null;
      }

      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
          select: {
            id: true,
            role: true,
            avatar: true,
            name: true,
            moduleAccess: true,
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.avatar = dbUser.avatar;
          token.name = dbUser.name;
          token.moduleAccess = parseModuleAccess(dbUser.moduleAccess);
        } else {
          token.role = (token.role as Role | undefined) ?? "CASHIER";
        }
      }

      // Keep module access fresh when admin changes permissions
      if (token.id && !user) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: String(token.id) },
            select: {
              role: true,
              avatar: true,
              name: true,
              isActive: true,
              moduleAccess: true,
            },
          });
          if (dbUser?.isActive) {
            token.role = dbUser.role;
            token.avatar = dbUser.avatar;
            token.name = dbUser.name;
            token.moduleAccess = parseModuleAccess(dbUser.moduleAccess);
          }
        } catch {
          /* ignore refresh errors */
        }
      }

      if (trigger === "update" && session) {
        token.name = session.name ?? token.name;
        token.avatar = session.avatar ?? token.avatar;
        token.role = session.role ?? token.role;
        if (session.moduleAccess !== undefined) {
          token.moduleAccess = session.moduleAccess;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.avatar = (token.avatar as string | null) ?? null;
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.moduleAccess =
          (token.moduleAccess as ReturnType<typeof parseModuleAccess>) ?? null;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });
        if (existing && !existing.isActive) {
          return false;
        }
      }
      return true;
    },
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
});
