// Reinicia uma rodada: marca as respostas visíveis como ocultas (o histórico é preservado)
// e mantém o evento aberto. Protegida por código de administrador.
//
// Segredos (supabase secrets set ...):
//   ALLOWED_ORIGIN    ex.: https://seu-site.netlify.app   (origem exata do site)
//   ADMIN_CODE_HASH   SHA-256 em hexadecimal do código de administrador
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas pelo Supabase.

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "";
const adminHash = (Deno.env.get("ADMIN_CODE_HASH") ?? "").toLowerCase();
const cors = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Comparação sem atalho de saída antecipada.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (!allowedOrigin || !adminHash) return json({ error: "not_configured" }, 500);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (req.headers.get("origin") !== allowedOrigin) return json({ error: "origin_not_allowed" }, 403);

  let body: { event_id?: string; code?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (typeof body.event_id !== "string" || !/^[a-z0-9-]{1,64}$/.test(body.event_id) || typeof body.code !== "string") {
    return json({ error: "invalid_request" }, 400);
  }
  if (!safeEqual(await sha256(body.code), adminHash)) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" };
  const event = encodeURIComponent(body.event_id);

  const hidden = await fetch(`${url}/rest/v1/responses?event_id=eq.${event}&hidden=eq.false`, {
    method: "PATCH", headers, body: JSON.stringify({ hidden: true }),
  });
  if (!hidden.ok) return json({ error: "reset_failed" }, 500);

  const opened = await fetch(`${url}/rest/v1/events?id=eq.${event}`, {
    method: "PATCH", headers, body: JSON.stringify({ is_open: true }),
  });
  if (!opened.ok) return json({ error: "reset_failed" }, 500);

  return json({ success: true });
});
