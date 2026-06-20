import type { Metadata } from "next";
import "./globals.css";
import { fontVars } from "@/lib/fonts";
import { Analytics } from "@/components/Analytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://soknoear.com"),
  title: "The South Knoxville Ear",
  description:
    "South Knoxville's weekly paper — events, openings, and neighborhood news for Sevier Avenue, Ijams Park, Kern's, and the river.",
  applicationName: "The South Knoxville Ear",
  keywords: [
    "South Knoxville", "SoKno", "Sevier Avenue", "Old Sevier", "Ijams Park",
    "Urban Wilderness", "Suttree Landing", "Knoxville events", "South Waterfront",
  ],
  openGraph: { type: "website", siteName: "The South Knoxville Ear", locale: "en_US" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
