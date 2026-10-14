import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { deskToken } from "@/lib/desk";
import { DeskView } from "@/components/DeskView";

// soknoear.com/dashboard — the week's work list. Open to anyone with the address (Andy,
// 2026-10-14: "I don't care if anybody in the world sees this"); kept out of search.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard · The South Knoxville Ear",
  robots: { index: false, follow: false },
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const token = deskToken(db());
  if (!token) notFound();
  return <DeskView token={token} asked={w} base="/dashboard" />;
}
