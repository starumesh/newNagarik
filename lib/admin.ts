import { cookies } from "next/headers";
import { sha256 } from "@/lib/hash";
import { env } from "@/lib/env";

export const ADMIN_COOKIE = "rs_admin";

export function adminCookieValue() {
  if (!env.adminSecret) return "";
  return sha256(`admin:${env.adminSecret}`);
}

export function isAdminRequest(request?: Request) {
  const expected = adminCookieValue();
  if (!expected) return false;
  if (request) {
    const header = request.headers.get("x-admin-secret");
    if (header && sha256(`admin:${header}`) === expected) return true;
    const cookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
    if (cookie?.split("=")[1] === expected) return true;
    return false;
  }
  return cookies().get(ADMIN_COOKIE)?.value === expected;
}
