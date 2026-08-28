import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ledger px-4 text-center">
      <h1 className="font-serif text-5xl text-navy">404</h1>
      <p className="mt-3 text-muted-foreground">This page is not on the ledger.</p>
      <Link href="/" className="mt-6 rounded-full bg-teal px-4 py-2 text-sm text-white">
        Return home
      </Link>
    </div>
  );
}
