// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

// إنشاء الـ handler مباشرة
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
