import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySecret } from "@/lib/crypto";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || "devscribe-local-auth-secret-1234567890",
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: parsed.data.username },
        });

        if (!user) {
          return null;
        }

        const validPassword = await verifySecret(user.passwordHash, parsed.data.password);
        if (!validPassword) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          name: user.name ?? user.username,
          email: user.email ?? `${user.username}@local.dev`,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.username = (user as { username?: string }).username ?? (user as { name?: string }).name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | undefined) ?? "local-user";
        session.user.name = (token.username as string | undefined) ?? session.user.name;
      }
      return session;
    },
  },
});
