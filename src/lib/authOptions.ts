// src/lib/authOptions.js
import { type NextAuthOptions, type User } from "next-auth";
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
  adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials.password) return null;

        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        if (!apiKey) return null;

        // تسجيل الدخول عبر Firebase REST API
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

        if (!res.ok) return null;
        const authData = await res.json();
        if (!authData.localId || !authData.email) return null;

        // التحقق من أن البريد مفعّل
        const lookupRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: authData.idToken }),
          }
        );

        if (!lookupRes.ok) return null;
        const lookup = await lookupRes.json();
        const verified = lookup?.users?.[0]?.emailVerified === true;
        if (!verified) return null;

        return { id: authData.localId, email: authData.email } as User;
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // أسبوع
  },

  debug: process.env.NODE_ENV === "development",
  useSecureCookies: process.env.NODE_ENV === "production",

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        try {
          const db = getFirestore();
          const userDoc = await db.collection("users").doc(String(user.id)).get();

          if (userDoc.exists) {
            const data = userDoc.data();
            if (data && Array.isArray(data.roles) && data.roles.length > 0) {
              token.roles = data.roles;
            } else {
              token.roles = ["viewer"];
            }
          } else {
            token.roles = ["viewer"];
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          token.roles = ["viewer"];
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.roles = token.roles || ["viewer"];
      }
      return session;
    },
  },
};
