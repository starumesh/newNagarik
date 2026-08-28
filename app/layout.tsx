import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "RentSahih — Trust-forced rental intelligence",
  description:
    "Contribute exact rent and property facts to unlock verified building-level pricing. False entries lock you to explorer mode.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
