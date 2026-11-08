const daysEl = document.getElementById("days");
const headers = { apikey: SUPABASE_KEY };

// Whole calendar days (local time) between two dates; UTC maths avoids DST off-by-one.
function daysSince(then, now = new Date()) {
  const day = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((day(now) - day(then)) / 86400000));
}

function show(iso) {
  daysEl.textContent = daysSince(new Date(iso));
}

async function load() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/incidents?select=occurred_at&order=occurred_at.desc&limit=1`, { headers });
    if (!r.ok) throw new Error(r.status);
    const [row] = await r.json();
    if (row) {
      localStorage.setItem("last", row.occurred_at);
      show(row.occurred_at);
    }
  } catch {
    // offline or backend down: fall back to the last known value
    const last = localStorage.getItem("last");
    if (last) show(last);
  }
}

async function reset(secret) {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/reset_streak`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  }).catch(() => {}); // a failed/rejected reset just shows the unchanged number
}

async function handleHash() {
  const m = location.hash.match(/^#reset=(.+)$/);
  if (m) {
    history.replaceState(null, "", location.pathname + location.search); // keep the secret out of the address bar
    await reset(decodeURIComponent(m[1]));
  }
  load();
}

handleHash();
addEventListener("hashchange", handleHash); // a tap landing on an already-open page doesn't reload it

// Keep the number right on a page left open or resumed the next day.
document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
setInterval(load, 3600000);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
