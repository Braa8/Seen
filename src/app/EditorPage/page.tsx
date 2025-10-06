"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import EditorDashboard from "../../components/EditorDashboard";

export default function EditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
    const roles = Array.isArray(session.user?.roles) ? session.user.roles : ["viewer"];
    const allowed = roles.includes("editor") || roles.includes("admin");
    if (!allowed) router.replace("/");
  }, [session, status, router]);

  if (status === "loading") return <p>جاري التحميل ...</p>;
  const roles = Array.isArray(session?.user?.roles) ? session!.user.roles : ["viewer"];
  const allowed = roles.includes("editor") || roles.includes("admin");
  if (!session || !allowed) return null;

  return <EditorDashboard />;
}


