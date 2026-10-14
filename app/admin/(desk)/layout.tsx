import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUserAndProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin } = await getCurrentUserAndProfile();
  if (!isAdmin) redirect("/admin/login");

  return <AdminShell email={user?.email}>{children}</AdminShell>;
}