"use client";

import { SessionProvider } from "next-auth/react";
import AdminUsersPageContent from "./AdminUsersPageContent";

export default function AdminUsersPageWrapper() {
  return (
    <SessionProvider>
      <AdminUsersPageContent />
    </SessionProvider>
  );
}
