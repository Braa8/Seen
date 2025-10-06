'use client';
import React, { useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import WriterDashboard from "../../components/WriterDashboard";


const WriterPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
    const roles = Array.isArray(session.user?.roles) ? session.user.roles : ["viewer"];
    const allowed = roles.includes("writer") ;
    if (!allowed) {
      router.replace("/");
    }
  }, [session, status, router]);

  if (status === "loading") return <p>جاري التحميل ...</p>;
  const roles = Array.isArray(session?.user?.roles) ? session!.user.roles : ["viewer"];
  const allowed = roles.includes("writer") || roles.includes("admin");
  if (!session || !allowed) return null;

  return (
    <div>
      <WriterDashboard />
    </div>
  );
}

export default WriterPage;
