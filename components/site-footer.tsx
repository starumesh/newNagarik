import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-navy/10 py-10 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BrandLogo href="/" markSize={28} wordmarkClassName="text-lg" />
          <p className="mt-2 max-w-sm">
            Neighborhood rent clarity — without the brokerage fog.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/login">Admin desk</Link>
          <span>Privacy-first · No public PII</span>
        </div>
      </div>
    </footer>
  );
}
