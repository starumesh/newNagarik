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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
              A public ledger for private rent
            </p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.05] text-navy sm:text-6xl">
              The rent is either <em>sahih</em>, or it stays hidden.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-navy/75">
              Brokers inflate. Listings omit. Neighbours stay silent. RentSahih
              forces the truth: contribute your exact agreement, pass a
              four-pillar check, then see building-level numbers. Guess wrong on
              purpose and you are locked to city trends forever.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-6")}
              >
                Start contributing
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/#how"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 rounded-full px-6"
                )}
              >
                How trust is forced
              </Link>
            </div>
          </div>
          <aside className="ledger-card relative overflow-hidden p-6">
            <div className="absolute -right-8 -top-8 size-32 rounded-full bg-teal/15" />
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Sample unlocked ledger
            </p>
            <h2 className="mt-3 font-serif text-3xl text-navy">
              Prestige Lakeside Habitat
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Whitefield, Bengaluru · 2 BHK · Semi-furnished
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4">
              {[
                ["Avg", "₹34,800"],
                ["Median", "₹33,500"],
                ["Min", "₹29,000"],
                ["Max", "₹41,000"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-secondary/70 p-4">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="font-serif text-2xl text-navy">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs text-teal-700">
              Visible only after a verified contribution. Explorers never see this.
            </p>
          </aside>
        </section>

        <section id="how" className="border-y border-navy/10 bg-card/70 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-serif text-3xl text-navy">Three doors. One ledger.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: KeyRound,
                  title: "Owner",
                  body: "Post asking rent, photos, and the building. Negotiate through an anonymous relay — your email never leaves the vault.",
                },
                {
                  icon: Building2,
                  title: "Renter",
                  body: "Enter the exact agreement amount plus a deep property profile. The verification engine decides if the city gets to see it.",
                },
                {
                  icon: Eye,
                  title: "Explorer",
                  body: "Heatmaps, inflation, top localities. No building names. No averages you did not earn. The sticky bar will keep reminding you.",
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
              Four-pillar verification
            </p>
          </div>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl text-navy">
            Every rupee is cross-examined before it becomes public.
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["01 Identity", "Emails and phones are hashed. Banned identities never re-enter. Burst submissions land in review."],
              ["02 Structure", "Rent per sqft is tested against furnishing, lift, parking, backup, and locality baselines."],
              ["03 Internal ground truth", "Compared with verified building averages, or locality averages if the building is still thin."],
              ["04 External reality", "Only when needed: cached aggregator benchmarks from NoBroker, 99acres, MyGate, MagicBricks, Anacity."],
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
