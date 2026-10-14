import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isDeskToken } from "@/lib/desk";
import { DeskView } from "@/components/DeskView";

// The old private link. It still works; soknoear.com/dashboard is the address now.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard · The South Knoxville Ear",
  robots: { index: false, follow: false },
};

export default async function DeskPage({ params, searchParams }: {
  params: Promise<{ token: string }>; searchParams: Promise<{ w?: string }>;
}) {
  const { token } = await params;
  const { w } = await searchParams;
  if (!isDeskToken(db(), token)) notFound();
  return <DeskView token={token} asked={w} base={`/desk/${token}`} />;
}
