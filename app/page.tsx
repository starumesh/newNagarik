import Link from "next/link";
import { ArrowRight, Building2, Eye, KeyRound, ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ledger">
      <SiteHeader profile={null} />
      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20">
          <div>
            <p className="font-serif text-3xl tracking-tight text-navy sm:text-4xl">
              New<span className="text-teal-700">Nagarik</span>
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
              Real rents. Real buildings.
            </p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.05] text-navy sm:text-6xl">
              Know what people actually pay in your society.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-navy/75">
              Listings show asking prices. Living there reveals the real rent,
              maintenance surprises, and society quirks. NewNagarik shares that
              lived-in truth — so you decide before you move, not after.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-6")}
              >
                Explore properties
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/#trust"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 rounded-full px-6"
                )}
              >
                How we keep rents honest
              </Link>
            </div>
          </div>
          <aside className="ledger-card relative overflow-hidden p-6">
            <div className="absolute -right-8 -top-8 size-32 rounded-full bg-teal/15" />
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              What you can see for a building
            </p>
            <h2 className="mt-3 font-serif text-3xl text-navy">
              Prestige Lakeside Habitat
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Whitefield, Bengaluru · 2 BHK
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              {[
                ["Starting rent", "₹33,500"],
                ["Maintenance", "₹3,200"],
                ["Carpet area", "1,100 sq. ft."],
                ["Metro", "2.1 km"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-secondary/70 p-4">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-2 font-serif text-2xl text-navy">{value}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-5 space-y-2 text-sm text-navy/75">
              {[
                "Water, lift, and power backup in daily use",
                "Society rules listings never mention",
                "Noise and move-in friction from residents",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section id="how" className="border-y border-navy/10 bg-card/70 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-serif text-3xl text-navy">Choose how you want to use NewNagarik</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: KeyRound,
                  title: "Owner",
                  body: "Advertise a vacant flat with asking rent and photos. Interested tenants reach you privately — without your number going public.",
                },
                {
                  icon: Building2,
                  title: "Renter",
                  body: "Add a rental review for the home you currently rent. Unlock what neighbours actually pay — and what life in a society feels like before you sign.",
                },
                {
                  icon: Eye,
                  title: "Explorer",
                  body: "Browse city trends, demand, and rent movement. When you’re ready for a specific building, add a rental review to unlock it.",
                },
              ].map((item) => (
                <article key={item.title} className="ledger-card p-6">
                  <item.icon className="size-5 text-teal-700" />
                  <h3 className="mt-4 font-serif text-2xl text-navy">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="trust" className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-center gap-2 text-teal-700">
            <ShieldAlert className="size-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em]">
              Built for accuracy
            </p>
          </div>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl text-navy">
            Every rent is checked before it helps someone else decide.
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["01 Identity", "We protect privacy with hashed contact details, so fake re-signups are harder and your number stays out of public view."],
              ["02 Property fit", "Rent is checked against size, furnishing, amenities, and what the locality usually supports."],
              ["03 Community data", "Compared with verified rents from the same building — or the locality when a society is still new."],
              ["04 Market check", "When needed, we quietly cross-check against live listings so outliers get a second look."],
            ].map(([title, body]) => (
              <li key={title} className="ledger-card p-6">
                <p className="font-serif text-xl text-navy">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
