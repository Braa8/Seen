// src/app/api/auth/[...nextauth]/route.ts
import { NextAuthOptions } from 'next-auth';
import NextAuth from 'next-auth/next';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

// إنشاء معالج الجلسة مع استيراد متأخر لـ authOptions
const authOptionsPromise = import('@/lib/authOptions').then(mod => mod.authOptions);

// إنشاء الـ handler مع استيراد متأخر
const handler = async (req: Request, ctx: any) => {
  const authOptions: NextAuthOptions = await authOptionsPromise;
  return NextAuth(authOptions)(req, ctx);
};

export { handler as GET, handler as POST };
