import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { adminDb } from "@/lib/firebaseAdmin";

const ALLOWED_ROLES = new Set([
  "viewer",
  "writer",
  "editor",
  "admin",
]);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        try {
          const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

          if (!apiKey) {
            throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
          }

          const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email,
                password,
                returnSecureToken: true,
              }),
              cache: "no-store",
            }
          );

          if (!response.ok) {
            return null;
          }

          const firebaseUser = (await response.json()) as {
            localId?: string;
            email?: string;
          };

          if (!firebaseUser.localId || !firebaseUser.email) {
            return null;
          }

          const userDoc = await adminDb
            .collection("users")
            .doc(firebaseUser.localId)
            .get();

          // يجب أن يكون للمستخدم مستند في Firestore.
          if (!userDoc.exists) {
            return null;
          }

          const userData = userDoc.data();

          // رفض الحسابات المعطلة.
          if (!userData || userData.isActive === false) {
            return null;
          }

          let roles: string[];

          if (userData.roles === undefined) {
            // دعم الحسابات القديمة التي لا تحتوي على حقل roles.
            roles = ["viewer"];
          } else {
            if (
              !Array.isArray(userData.roles) ||
              userData.roles.length === 0 ||
              !userData.roles.every(
                (role: unknown) =>
                  typeof role === "string" &&
                  ALLOWED_ROLES.has(role)
              )
            ) {
              return null;
            }

            roles = userData.roles;
          }

          return {
            id: firebaseUser.localId,
            email: firebaseUser.email,
            roles,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles ?? ["viewer"];
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles =
          (token.roles as string[]) ?? ["viewer"];
      }

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};