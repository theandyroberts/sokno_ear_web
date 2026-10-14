import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isDeskToken } from "@/lib/desk";
import { DeskView } from "@/components/DeskView";
import { RememberDevice } from "@/components/DeskCheck";

// The old private link. It still works, and opening it signs this device in to
// soknoear.com/dashboard so the short address works here from then on.
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
  return <><RememberDevice token={token} /><DeskView token={token} asked={w} base={`/desk/${token}`} /></>;
}
