// node render.mjs <page.html> <outdir> [fps] [t1,t2,...]  — frames of window.render(t) via raw CDP
import { spawn } from "node:child_process";
import fs from "node:fs";
const [page, out, fpsArg, only] = process.argv.slice(2);
const fps = Number(fpsArg || 30);
const BIN = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
fs.mkdirSync(out, { recursive: true });
const port = 9300 + Math.floor(Math.random() * 500);
const ch = spawn(BIN, [`--remote-debugging-port=${port}`, "--hide-scrollbars", "--force-device-scale-factor=1", `--user-data-dir=${out}/.prof`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const events = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } else events.push(d); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result?.result?.value; };
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "file://" + page });
for (let i = 0; i < 100; i++) { await sleep(200); if (await ev("typeof window.ready!=='undefined'")) break; }
await ev("window.ready"); await sleep(500);
const dur = await ev("window.DURATION");
const times = only ? only.split(",").map(Number) : Array.from({ length: Math.ceil(dur * fps) }, (_, i) => i / fps);
let n = 0;
for (const t of times) {
  await ev(`render(${t}); new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  const s = await send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
  const name = only ? `still_${t.toFixed(2)}.jpg` : `f${String(n).padStart(5, "0")}.jpg`;
  fs.writeFileSync(`${out}/${name}`, Buffer.from(s.result.data, "base64")); n++;
}
console.log(`wrote ${n} frame(s), duration ${dur.toFixed(2)}s`);
ws.close(); ch.kill();
process.exit(0);
