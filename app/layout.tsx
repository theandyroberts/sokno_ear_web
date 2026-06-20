import type { Metadata } from "next";
import "./globals.css";
import { fontVars } from "@/lib/fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://soknoear.com"),
  title: "The South Knoxville Ear",
  description: "South Knoxville events and stories — we hear things.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
