"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ProfileDashboard from "../../components/ProfileDashboard";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }
    const roles = Array.isArray(session.user?.roles) ? session.user.roles : ["viewer"];
    const isWriter = roles.includes("writer");
    if (!isWriter) router.replace("/");
  }, [session, status, router]);

  if (status === "loading") return <p>جاري التحميل ...</p>;
  if (!session) return null;
  const roles = Array.isArray(session.user?.roles) ? session.user.roles : ["viewer"];
  if (!roles.includes("writer")) return null;
  return <ProfileDashboard />;
}


