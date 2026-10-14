import { Resend } from "resend";
import { env } from "@/lib/env";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendInquiryEmail(options: {
  to: string;
  buildingName: string;
}) {
  if (!env.resendKey) {
    console.warn("RESEND_API_KEY missing; skipped inquiry email.");
    return { skipped: true as const };
  }

  const resend = new Resend(env.resendKey);
  await resend.emails.send({
    from: env.resendFrom,
    to: options.to,
    subject: `New inquiry on ${options.buildingName}`,
    html: `
      <div style="font-family:Georgia,serif;background:#F6F3EC;padding:32px;color:#1E293B">
        <p style="letter-spacing:0.2em;text-transform:uppercase;font-size:11px;color:#0D9488;margin:0 0 12px">NewNagarik</p>
        <h1 style="font-size:22px;margin:0 0 16px">You have a new inquiry</h1>
        <p style="line-height:1.6">Someone is interested in <strong>${escapeHtml(options.buildingName)}</strong>.</p>
        <p style="line-height:1.6">Login to NewNagarik to reply. The sender’s identity is not included in this email.</p>
        <p style="margin-top:28px"><a href="${env.appUrl}/inbox" style="background:#0D9488;color:white;padding:10px 16px;border-radius:999px;text-decoration:none">Open inbox</a></p>
      </div>
    `,
  });

  return { skipped: false as const };
}

export async function sendNewListingsDigest(options: {
  to: string;
  city: string;
  area: string;
  count: number;
  listings: Array<{ title: string; platform: string; url: string | null }>;
}) {
  if (!env.resendKey) {
    return { skipped: true as const };
  }

  const preview = options.listings
    .slice(0, 6)
    .map((listing) => {
      const href = listing.url
        ? `<a href="${escapeHtml(listing.url)}">${escapeHtml(listing.title)}</a>`
        : escapeHtml(listing.title);
      return `<li style="margin:0 0 8px">${href} · ${escapeHtml(listing.platform)}</li>`;
    })
    .join("");

  const resend = new Resend(env.resendKey);
  await resend.emails.send({
    from: env.resendFrom,
    to: options.to,
    subject: `${options.count} new owner rental${options.count === 1 ? "" : "s"} in ${options.area}`,
    html: `
      <div style="font-family:Georgia,serif;background:#F6F3EC;padding:32px;color:#1E293B">
        <p style="letter-spacing:0.2em;text-transform:uppercase;font-size:11px;color:#0D9488;margin:0 0 12px">NewNagarik</p>
        <h1 style="font-size:22px;margin:0 0 16px">New owner posts in ${escapeHtml(options.area)}</h1>
        <p style="line-height:1.6">${options.count} new listing${options.count === 1 ? "" : "s"} in ${escapeHtml(options.area)}, ${escapeHtml(options.city)}.</p>
        <ul style="padding-left:18px">${preview}</ul>
        <p style="margin-top:28px"><a href="${env.appUrl}/admin/listings" style="background:#0D9488;color:white;padding:10px 16px;border-radius:999px;text-decoration:none">Open listings desk</a></p>
      </div>
    `,
  });

  return { skipped: false as const };
}
