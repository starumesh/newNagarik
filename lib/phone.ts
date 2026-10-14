import type { ReviewerIdentity } from "@/lib/types";

export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local = digits;
  if (digits.length === 12 && digits.startsWith("91")) local = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) local = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return `+91${local}`;
}

/** Current internal auth email for a phone number. */
export function phoneToInternalEmail(e164: string): string {
  return `${e164.replace("+", "")}@phone.newnagarik.internal`;
}

/**
 * All internal emails that may belong to this phone.
 * Includes the pre-rebrand domain so existing accounts still log in.
 */
export function phoneAuthEmails(e164: string): string[] {
  const local = e164.replace("+", "");
  return [
    `${local}@phone.newnagarik.internal`,
    `${local}@phone.rentsahih.internal`,
  ];
}

export function isInternalPhoneEmail(email?: string | null): boolean {
  return Boolean(email && /@phone\.(newnagarik|rentsahih)\.internal$/i.test(email));
}

export function phoneFromInternalEmail(email?: string | null): string | null {
  if (!email) return null;
  const match = email.match(/^(\d{10,12})@phone\.(newnagarik|rentsahih)\.internal$/i);
  if (!match) return null;
  const digits = match[1]!;
  const local =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return normalizeIndianPhone(local);
}

export function displayIndianPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const normalized = normalizeIndianPhone(phone) ?? phoneFromInternalEmail(phone);
  if (!normalized) {
    const trimmed = phone.trim();
    return trimmed || null;
  }
  const local = normalized.replace("+91", "");
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

export function reviewerFromAuthUser(user: {
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
} | null): ReviewerIdentity {
  if (!user) return { phone: null, email: null, auth_via: null };
  const metaPhone =
    typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone
      : null;
  const phone =
    displayIndianPhone(user.phone) ??
    displayIndianPhone(metaPhone) ??
    displayIndianPhone(phoneFromInternalEmail(user.email));
  return {
    phone,
    email: isInternalPhoneEmail(user.email) ? null : user.email ?? null,
    auth_via:
      typeof user.user_metadata?.auth_via === "string"
        ? user.user_metadata.auth_via
        : null,
  };
}
