import Link from "next/link";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "NewNagarik";
export const BRAND_TAGLINE = "Know your neighborhood rents";

export function BrandMark({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="40" height="40" rx="12" fill="#1E293B" />
      <path
        d="M8 28.5V16.2L20 8.5L32 16.2V28.5C32 29.6 31.1 30.5 30 30.5H10C8.9 30.5 8 29.6 8 28.5Z"
        fill="#0D9488"
      />
      <path
        d="M14 30.5V21.5H26V30.5"
        stroke="#F6F3EC"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect x="17.4" y="24.2" width="5.2" height="6.3" rx="1" fill="#F6F3EC" />
      <circle cx="28.2" cy="12.2" r="2.1" fill="#F6F3EC" opacity="0.9" />
    </svg>
  );
}

export function BrandLogo({
  href = "/",
  className,
  markSize = 36,
  wordmarkClassName,
  showWordmark = true,
}: {
  href?: string | null;
  className?: string;
  markSize?: number;
  wordmarkClassName?: string;
  showWordmark?: boolean;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={markSize} />
      {showWordmark ? (
        <span
          className={cn(
            "font-serif text-[1.35rem] leading-none tracking-tight text-navy",
            wordmarkClassName
          )}
        >
          New<span className="text-teal-700">Nagarik</span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
