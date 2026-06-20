import { getLatest } from "@/lib/editions";
import { Paper } from "@/components/Paper";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const e = getLatest();
  return { title: `The South Knoxville Ear — ${e.dateLabel ?? e.date}`, description: e.feature.deck ?? e.feature.title };
}
export default function Home() {
  return <Paper edition={getLatest()} />;
}
