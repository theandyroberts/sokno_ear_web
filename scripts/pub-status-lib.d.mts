// Types for the publishing desk's pure lib, so lib/desk.ts and the page can import it.
export type ChannelKey = "site" | "party" | "instagram" | "venues";
export type TaskState = "done" | "todo" | "late" | "failed" | "skipped" | "missed" | "na";

export interface DeskItem {
  id: string;
  date: string;
  channel: ChannelKey;
  title: string;
  who: "Pipeline" | "Claude" | "Andy";
  kind: "auto" | "mark";
  done: boolean;
  detail: string;
  time?: string;
  due?: string | null;
  state?: TaskState;
}

export interface SettledItem extends DeskItem {
  state: TaskState;
  dueToday: boolean;
  locked: boolean;
  markedBy: string | null;
  markedAt: string | null;
}

export interface DeskDay<I = DeskItem> { date: string; dow: string; label: string; items: I[] }

export interface WeekSnapshot {
  week: string;
  slug: string | null;
  number: number | null;
  shortDate: string | null;
  feature: string | null;
  stage: "published" | "draft" | "not-started";
  days: DeskDay[];
  stray: DeskItem[];
  generatedAt: string;
}

export interface DeskMark { task: string; done: number | boolean; note?: string | null; by?: string | null; at?: string | null }

export interface MergedWeek extends Omit<WeekSnapshot, "days"> {
  days: Array<DeskDay<SettledItem> & { isToday: boolean }>;
  channels: Array<{ key: ChannelKey; name: string; done: number; total: number; trouble: number }>;
  waiting: SettledItem[];
  done: number;
  total: number;
  today: string;
}

export const SCHEMA: string;
export const CHANNELS: Record<ChannelKey, string>;
export const DOW: string[];
export function addDays(ymd: string, n: number): string;
export function todayET(now?: number): string;
export function weekOf(ymd: string): string;
export function dayLabel(ymd: string): string;
export function weekDays(week: string): Array<{ date: string; dow: string; label: string }>;
export function clock(hhmm: string): string;
export function deriveWeek(facts: Record<string, unknown>): WeekSnapshot;
export function mergeMarks(snapshot: WeekSnapshot, marks?: DeskMark[], now?: number): MergedWeek;

export type MoveOwner = "claude" | "andy";
export type MoveAnswer = "go" | "no" | "done" | "later";
export interface DeskMove {
  key: string; title: string; owner: MoveOwner; plan: string | null; due: string | null; opened: string;
  answer: MoveAnswer | null; note: string | null; answeredAt: string | null;
  handledAt: string | null; handledNote: string | null; closedAt: string | null; closedNote: string | null;
}
export const MOVE_ANSWERS: Record<MoveOwner, MoveAnswer[]>;
export function listMoves(db: unknown, opts?: { all?: boolean }): DeskMove[];
export function pendingAnswers(db: unknown): DeskMove[];
export function putMove(db: unknown, move: { key: string; title: string; owner: MoveOwner; plan?: string | null; due?: string | null }, now?: number): void;
export function answerMove(db: unknown, key: string, answer: MoveAnswer | null, note?: string | null, now?: number): "ok" | "unknown-move" | "closed" | "bad-answer";
export function handleMove(db: unknown, key: string, note?: string | null, now?: number): boolean;
export function closeMove(db: unknown, key: string, note?: string | null, now?: number): boolean;
