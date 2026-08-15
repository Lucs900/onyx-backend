import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "@/styles/globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
  weight: ["400", "500"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "ONYX",
  description: "ONYX — Active Credit Relationship.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${newsreader.variable}`}>
      <body className={GeistSans.className}>{children}</body>
    </html>
  );
}
