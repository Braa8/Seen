// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error("Firebase Admin SDK environment variables are missing!");
}

const adapter = FirestoreAdapter({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials.password) return null;

        // تحقق من البريد/كلمة المرور باستخدام Firebase Auth REST API بشكل آمن على الخادم
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!apiKey) {
          console.error("Missing NEXT_PUBLIC_FIREBASE_API_KEY for password verification");
          return null;
        }

        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              returnSecureToken: true,
            }),
          }
        );

        if (!res.ok) {
          return null;
        }

        const authData = (await res.json()) as { localId?: string; email?: string; idToken?: string };
        if (!authData.localId || !authData.email || !authData.idToken) return null;

        // تحقق من تفعيل البريد الإلكتروني لمنع الحسابات الوهمية
        const lookupRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: authData.idToken }),
          }
        );
        if (!lookupRes.ok) return null;
        const lookup = (await lookupRes.json()) as { users?: Array<{ emailVerified?: boolean }> };
        const emailVerified = lookup.users?.[0]?.emailVerified === true;
        if (!emailVerified) {
          return null;
        }

        // ارجع هوية المستخدم (uid) لربط الأدوار من مجموعة users
        return {
          id: authData.localId,
          email: authData.email,
        } as User;
      },
    }),
  ],
  adapter,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    // Optional: only update the session cookie once per day to reduce writes
    updateAge: 60 * 60 * 24,
  },
  callbacks: {
    async jwt({ token, user }) {
      // Always ensure we have the user id in the token
      if (user) {
        token.id = user.id;
      }

      // Refresh roles on every JWT callback so UI reflects latest changes
      if (token.id) {
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(String(token.id)).get();
        const data = userDoc.exists ? userDoc.data() as { roles?: string[]; name?: string | null; image?: string | null } : undefined;
        const rolesFromDb = data?.roles || ["viewer"];
        token.roles = Array.isArray(rolesFromDb) ? rolesFromDb : ["viewer"];
        if (data?.name !== undefined) token.name = data.name || undefined;
        if (data?.image !== undefined) (token as { image?: string }).image = data.image || undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id || "";
        session.user.roles = Array.isArray(token.roles) ? token.roles : ["viewer"];
        if (typeof token.name === "string") session.user.name = token.name;
        const image = (token as { image?: string }).image;
        if (typeof image === "string") (session.user as { image?: string | null }).image = image;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
