// worker/index.js — Cloudflare Worker
// Serve o app (assets estáticos do build) e a rota GET /api/market no mesmo domínio.
// Secret (painel Cloudflare > Worker > Settings > Variables and Secrets):
//   BRAPI_TOKEN -> token grátis de https://brapi.dev (só p/ Ibovespa/IFIX).

const FALLBACK = { cdi: 14.9, selic: 15.0, ipca12: 4.6, usd12: null, btc12: null, ibov12: null, ifix12: null };

const bcbUrl = (code) => `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`;
const awsDaily = (pair) => `https://economia.awesomeapi.com.br/json/daily/${pair}/360`;

async function jget(url) {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
function lastBcb(res) {
  if (res.status !== "fulfilled") return null;
  const a = res.value;
  return Array.isArray(a) && a.length ? parseFloat(a[a.length - 1].valor) : null;
}
function ret12Aws(res) {
  if (res.status !== "fulfilled") return null;
  const a = res.value;
  if (!Array.isArray(a) || a.length < 2) return null;
  const latest = parseFloat(a[0].bid), oldest = parseFloat(a[a.length - 1].bid);
  return oldest > 0 ? latest / oldest - 1 : null;
}
function ret12Brapi(res) {
  if (res.status !== "fulfilled") return null;
  const q = res.value && res.value.results && res.value.results[0];
  const h = q && q.historicalDataPrice;
  if (!Array.isArray(h) || h.length < 2) return null;
  const first = h[0].close, last = h[h.length - 1].close;
  return first > 0 ? last / first - 1 : null;
}
async function buildMarket(env) {
  const token = env && env.BRAPI_TOKEN;
  const brapi = (sym) =>
    token
      ? jget(`https://brapi.dev/api/quote/${encodeURIComponent(sym)}?range=1y&interval=1mo&token=${token}`)
      : Promise.reject(new Error("BRAPI_TOKEN ausente"));
  const [cdi, selic, ipca, usd, btc, ibov, ifix] = await Promise.allSettled([
    jget(bcbUrl(4389)), jget(bcbUrl(432)), jget(bcbUrl(13522)),
    jget(awsDaily("USD-BRL")), jget(awsDaily("BTC-BRL")),
    brapi("^BVSP"), brapi("^IFIX"),
  ]);
  return {
    status: "ok", updatedAt: new Date().toISOString(),
    cdi: lastBcb(cdi), selic: lastBcb(selic), ipca12: lastBcb(ipca),
    usd12: ret12Aws(usd), btc12: ret12Aws(btc),
    ibov12: ret12Brapi(ibov), ifix12: ret12Brapi(ifix),
    sources: {
      rates: "Banco Central do Brasil (SGS 4389/432/13522)",
      fx_crypto: "AwesomeAPI",
      indices: token ? "brapi.dev (^BVSP, ^IFIX)" : "brapi.dev — defina BRAPI_TOKEN",
    },
  };
}
async function marketResponse(env, ctx, request) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "s-maxage=900, stale-while-revalidate=3600",
  };
  let cache = null, key = null;
  try {
    cache = caches.default;
    key = new Request(new URL(request.url).origin + "/api/market", request);
    const hit = await cache.match(key);
    if (hit) return hit;
  } catch (_) { /* cache indisponível: segue sem cache */ }
  try {
    const data = await buildMarket(env);
    const res = new Response(JSON.stringify(data), { headers });
    if (cache && key) { try { ctx.waitUntil(cache.put(key, res.clone())); } catch (_) {} }
    return res;
  } catch (e) {
    return new Response(
      JSON.stringify({ status: "error", error: String((e && e.message) || e), updatedAt: new Date().toISOString(), ...FALLBACK }),
      { headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" } }
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/market") return marketResponse(env, ctx, request);
    return env.ASSETS.fetch(request); // qualquer outra rota -> app estático
  },
};
