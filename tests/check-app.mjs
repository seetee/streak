// Runs app.js against a fake browser: reset at load, reset on hashchange, refresh triggers, headers.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert";

const calls = [], listeners = {}, docListeners = {};
const location = { hash: "#reset=first", pathname: "/streak/", search: "" };
let interval;
const ctx = {
  SUPABASE_URL: "https://x.supabase.co", SUPABASE_KEY: "pk",
  document: { getElementById: () => ({ textContent: "" }), hidden: false, addEventListener: (t, f) => (docListeners[t] = f) },
  location,
  history: { replaceState: () => { location.hash = ""; } },
  localStorage: { setItem() {}, getItem: () => null },
  navigator: {},
  addEventListener: (t, f) => (listeners[t] = f),
  setInterval: (f, ms) => { interval = { f, ms }; },
  fetch: async (url, opts = {}) => {
    calls.push({ url, opts });
    return { ok: true, json: async () => [{ occurred_at: new Date().toISOString() }] };
  },
  console, Date, Math, JSON, decodeURIComponent,
};
vm.runInNewContext(readFileSync(new URL("../app.js", import.meta.url), "utf8"), ctx);
const tick = () => new Promise((r) => setTimeout(r, 10));
const rpcs = () => calls.filter((c) => c.url.includes("/rpc/")).map((c) => JSON.parse(c.opts.body).secret);
const reads = () => calls.filter((c) => c.url.includes("/incidents")).length;

await tick();
assert.deepEqual(rpcs(), ["first"], "reset at load");
assert.equal(location.hash, "", "hash stripped");
assert.equal(reads(), 1, "number loaded after reset");
for (const c of calls) {
  assert.equal(c.opts.headers.apikey, "pk");
  assert.equal(c.opts.headers.Authorization, undefined, "no Bearer header");
}

location.hash = "#reset=second";
listeners.hashchange();
await tick();
assert.deepEqual(rpcs(), ["first", "second"], "reset on an open page");

let before = reads();
ctx.document.hidden = true;
docListeners.visibilitychange();
await tick();
assert.equal(reads(), before, "no fetch while hidden");
ctx.document.hidden = false;
docListeners.visibilitychange();
await tick();
assert.equal(reads(), before + 1, "refresh when shown again");

assert.equal(interval.ms, 3600000);
before = reads();
interval.f();
await tick();
assert.equal(reads(), before + 1, "hourly refresh");

// A malformed link must not call the reset, and the number must still load.
const resets = rpcs().length;
before = reads();
location.hash = "#reset=%";
listeners.hashchange();
await tick();
assert.equal(rpcs().length, resets, "no reset on a malformed link");
assert.equal(location.hash, "", "malformed hash stripped");
assert.equal(reads(), before + 1, "number loads after a malformed link");

console.log("all checks passed");
