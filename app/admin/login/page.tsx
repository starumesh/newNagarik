import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { env } from "@/lib/env";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b14] px-4 py-16">
      <AdminLoginForm defaultEmail={env.adminEmail} />
    </div>
  );
}
