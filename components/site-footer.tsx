import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-navy/10 py-10 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p>RentSahih — rental intelligence without the brokerage fog.</p>
        <div className="flex gap-4">
          <Link href="/admin/verification">Admin</Link>
          <span>Privacy-first · No public PII</span>
        </div>
      </div>
    </footer>
  );
}
