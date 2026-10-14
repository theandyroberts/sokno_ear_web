import type { Metadata } from "next";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { DASH_COOKIE, isDeskToken } from "@/lib/desk";
import { DeskView } from "@/components/DeskView";

// soknoear.com/dashboard — the week's work list. A device signs in once with the
// passphrase (or by opening the old /desk/<token> link) and stays signed in for a year.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard · The South Knoxville Ear",
  robots: { index: false, follow: false },
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ w?: string; wrong?: string }> }) {
  const { w, wrong } = await searchParams;
  const token = (await cookies()).get(DASH_COOKIE)?.value ?? "";
  if (isDeskToken(db(), token)) return <DeskView token={token} asked={w} base="/dashboard" />;

  return (
    <main className="dash-login">
      <style>{CSS}</style>
      <p className="dash-kicker">★ The South Knoxville Ear · Dashboard</p>
      <h1>Sign in</h1>
      <form method="post" action="/api/dashboard/login">
        <label htmlFor="pass">Passphrase</label>
        <input id="pass" name="pass" type="password" autoComplete="current-password" autoFocus required />
        <button type="submit">Open the dashboard</button>
        {wrong && <p className="dash-wrong">That isn’t it. Try again.</p>}
      </form>
      <p className="dash-note">This device stays signed in for a year.</p>
    </main>
  );
}

const CSS = `
.dash-login{max-width:380px;margin:0 auto;padding:64px 16px;font-family:var(--font-body);color:var(--ink-black)}
.dash-kicker{font-family:var(--font-label);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--rust);margin:0 0 8px}
.dash-login h1{font-size:32px;margin:0 0 20px}
.dash-login form{display:flex;flex-direction:column;gap:10px}
.dash-login label{font-family:var(--font-label);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faded)}
.dash-login input{font:inherit;font-size:18px;padding:10px 12px;border:2px solid var(--ink-black);border-radius:6px;background:var(--paper-bright)}
.dash-login button{font:700 16px var(--font-body);padding:12px;border:0;border-radius:6px;background:var(--green-bridge);color:var(--paper-cream);cursor:pointer}
.dash-wrong{color:var(--rust);margin:4px 0 0}
.dash-note{color:var(--ink-faded);font-size:14px;margin-top:18px}
`;
