import { createHash } from "crypto";

export function sha256(value: string): string {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

export function hashIdentity(email?: string | null, phone?: string | null) {
  return {
    emailHash: email ? sha256(email) : null,
    phoneHash: phone ? sha256(phone.replace(/\s+/g, "")) : null,
  };
}

export function hashIp(ip: string): string {
  return sha256(`ip:${ip}`);
}
