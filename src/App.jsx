import React, { useState, useMemo, useEffect } from "react";
import {
  Compass, Target, GraduationCap, Sparkles, ArrowRight, ArrowLeft,
  Sprout, TrendingUp, SlidersHorizontal, AlertTriangle, Check,
  Lightbulb, ShieldCheck, Info, Wifi, WifiOff, Wallet, Plus, X, Coins, Pencil,
} from "lucide-react";

/* ---------- design tokens ---------- */
const T = {
  paper: "#F6F4EF", surface: "#FFFFFF", surfaceAlt: "#F0EEE7",
  ink: "#16211D", inkSoft: "#46524D", muted: "#8A938D", line: "#E4E1D8",
  primary: "#0F6E56", primarySoft: "#E2F0EA",
  positive: "#1D9E75", negative: "#C0553B", negSoft: "#F6E7E1",
  warn: "#9C6B12", warnSoft: "#F6ECD6",
  rf: "#1D9E75", fii: "#7F77DD", stocks: "#378ADD", cash: "#9A9488",
};
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

/* ---------- asset model ----------
   Expected returns float off the LIVE CDI (risk-free base) + a fixed risk premium.
   Volatilities are fixed, illustrative, calibrated on index history.            */
const ASSET_META = {
  rf:     { label: "Renda fixa (CDI / IPCA+)", color: T.rf },
  fii:    { label: "Fundos imobiliários",       color: T.fii },
  stocks: { label: "Ações / ETF",               color: T.stocks },
  cash:   { label: "Caixa",                     color: T.cash },
};
function deriveStats(cdi) {
  return {
    rf:     { mu: cdi,         sig: 0.03 },
    cash:   { mu: cdi - 0.005, sig: 0.01 },
    fii:    { mu: cdi + 0.005, sig: 0.13 },
    stocks: { mu: cdi + 0.03,  sig: 0.26 },
  };
}
const RHO = {
  "rf-cash": 0.9, "rf-fii": 0.2, "rf-stocks": 0.0,
  "cash-fii": 0.1, "cash-stocks": 0.0, "fii-stocks": 0.5,
};
const rho = (a, b) => (a === b ? 1 : (RHO[`${a}-${b}`] ?? RHO[`${b}-${a}`] ?? 0));

const PILLARS = {
  iniciante:     { key: "iniciante",     label: "Iniciante",     icon: Sprout,            tag: "Não me deixe errar",
    alloc: { rf: 0.70, fii: 0.20, stocks: 0.05, cash: 0.05 } },
  intermediario: { key: "intermediario", label: "Intermediário", icon: TrendingUp,        tag: "Me ajude a otimizar",
    alloc: { rf: 0.40, fii: 0.35, stocks: 0.20, cash: 0.05 } },
  avancado:      { key: "avancado",      label: "Avançado",      icon: SlidersHorizontal, tag: "Me dê controle",
    alloc: { rf: 0.20, fii: 0.30, stocks: 0.45, cash: 0.05 } },
};

/* ---------- example assets per pillar (illustrative, not recommendations) ---------- */
const EXAMPLE_ASSETS = {
  iniciante: [
    { t: "Tesouro Selic", type: "Renda fixa pós", w: "Segurança e liquidez diária — a base da reserva.", hist: "≈ CDI" },
    { t: "BOVA11", type: "ETF", w: "Replica o Ibovespa inteiro num único ativo.", hist: "Ibov · +22% '23 · −10% '24" },
    { t: "IVVB11", type: "ETF", w: "S&P 500 (as maiores dos EUA), negociado em reais.", hist: "sobe junto com o dólar" },
    { t: "MXRF11", type: "FII", w: "FII popular de recebíveis, com renda mensal isenta.", hist: "renda ~1% a.m. isenta de IR" },
  ],
  intermediario: [
    { t: "Tesouro IPCA+ 2035", type: "Renda fixa inflação", w: "Trava um juro real acima da inflação p/ longo prazo.", hist: "IPCA + juro; oscila até vencer" },
    { t: "ITSA4", type: "Ações", w: "Itaúsa — holding historicamente pagadora de dividendos.", hist: "perfil dividendos · IDIV +84% em 5 anos" },
    { t: "TAEE11", type: "Ações", w: "Taesa — transmissão de energia, fluxo previsível.", hist: "defensiva, foco em proventos" },
    { t: "KNRI11", type: "FII", w: "FII de tijolo (lajes e galpões) consolidado.", hist: "IFIX · +16% '23 · −6% '24" },
  ],
  avancado: [
    { t: "SMAL11", type: "ETF", w: "Small caps — empresas menores, mais risco e retorno.", hist: "mais volátil que o Ibovespa" },
    { t: "HASH11", type: "Cripto", w: "ETF de cripto — exposição a Bitcoin pela B3.", hist: "BTC +183% '24 · −67% '22" },
    { t: "Opções", type: "Derivativos", w: "Proteção (hedge) ou renda com venda coberta.", hist: "alto risco, exige estudo" },
    { t: "BDRs de tech", type: "BDR", w: "Ações estrangeiras (ex.: NVDC34) em reais.", hist: "BDRx +71% em '24" },
  ],
};

/* ---------- top 10 asset types (real index history) ---------- */
const ASSET_TYPES = [
  { name: "Tesouro Selic", area: "Dívida do governo · pós-fixado", tier: "baixo", color: "#1D9E75", live: "cdi",
    desc: "Você empresta ao governo e recebe a taxa Selic. O ativo mais seguro do país, com resgate a qualquer dia.",
    hist: [["'22", 12], ["'23", 13], ["'24", 11]] },
  { name: "CDB", area: "Crédito bancário", tier: "baixo", color: "#1D9E75", live: "cdi",
    desc: "Você empresta a um banco, que paga um % do CDI. Protegido pelo FGC até R$ 250 mil por banco.",
    hist: [["'22", 12], ["'23", 13], ["'24", 11]] },
  { name: "Tesouro IPCA+", area: "Dívida do governo · inflação", tier: "médio", color: "#0F6E56",
    desc: "Rende a inflação (IPCA) mais um juro fixo. Protege o poder de compra no longo prazo, mas oscila se vender antes do vencimento.",
    hist: [["'22", 6], ["'23", 16], ["'24", 7]] },
  { name: "Fundos imobiliários", area: "Mercado imobiliário", tier: "médio", color: "#7F77DD", live: "ifix",
    desc: "Você vira sócio de galpões, shoppings e recebíveis, recebendo aluguel mensal isento de IR para pessoa física.",
    hist: [["'22", 2], ["'23", 16], ["'24", -6]] },
  { name: "Ações", area: "Empresas na bolsa", tier: "alto", color: "#378ADD", live: "ibov",
    desc: "Você compra um pedaço de uma empresa. O maior potencial de ganho — e também as maiores quedas.",
    hist: [["'22", 5], ["'23", 22], ["'24", -10]] },
  { name: "ETF", area: "Cestas de índices", tier: "médio", color: "#5AA0E0", live: "ibov",
    desc: "Um único ativo que replica uma cesta inteira (BOVA11 = Ibovespa). Diversificação instantânea e barata.",
    hist: [["'22", 5], ["'23", 22], ["'24", -10]] },
  { name: "BDR", area: "Empresas estrangeiras · via B3", tier: "alto", color: "#5AA0E0",
    desc: "Recibos que representam ações de fora (Apple, Nvidia) negociadas em reais, sem abrir conta no exterior.",
    hist: [["'24", 71]] },
  { name: "Ouro", area: "Metal · reserva de valor", tier: "médio", color: "#C08A2E",
    desc: "Reserva de valor histórica; costuma subir em crises e com o dólar em alta. Na B3, via ETF.",
    hist: [["'24", 27], ["'25*", 31]] },
  { name: "Dólar", area: "Câmbio", tier: "médio", color: "#A88A3C", live: "usd",
    desc: "Proteção contra a desvalorização do real. Sobe quando o cenário do Brasil piora.",
    hist: [["'24", 26]] },
  { name: "Criptomoedas", area: "Ativos digitais", tier: "alto", color: "#D8703A", live: "btc",
    desc: "O ativo mais volátil da lista: pode multiplicar ou cair pela metade em um ano. Oferta limitada, sem banco central. Ex.: Bitcoin.",
    hist: [["'22", -67], ["'23", 146], ["'24", 183]] },
];

/* ---------- portfolio: classes, target allocation & holdings seed (from the plan) ---------- */
const CLASSE_META = {
  acao: { label: "Ações", color: "#378ADD" },
  fii:  { label: "FIIs", color: "#7F77DD" },
  rf:   { label: "Reserva", color: "#1D9E75" },
};
const TARGET_SEED = [
  { ticker: "BBAS3", classe: "acao", weight: 0.15 },
  { ticker: "ITSA4", classe: "acao", weight: 0.10 },
  { ticker: "ITUB4", classe: "acao", weight: 0.10 },
  { ticker: "TAEE11", classe: "acao", weight: 0.08 },
  { ticker: "PETR4", classe: "acao", weight: 0.07 },
  { ticker: "CXSE3", classe: "acao", weight: 0.05 },
  { ticker: "TRXF11", classe: "fii", weight: 0.10 },
  { ticker: "XPML11", classe: "fii", weight: 0.08 },
  { ticker: "BTHF11", classe: "fii", weight: 0.05 },
  { ticker: "GGRC11", classe: "fii", weight: 0.04 },
  { ticker: "KNSC11", classe: "fii", weight: 0.03 },
  { ticker: "Reserva", classe: "rf", weight: 0.15 },
];
const HOLDINGS_SEED = [
  { ticker: "ITSA4", classe: "acao", valor: 1076 },
  { ticker: "BTHF11", classe: "fii", valor: 2649 },
  { ticker: "Reserva", classe: "rf", valor: 6100 },
];

/* ---------- live market data ----------
   Set API_BASE to your deployed backend (see api/market.js) to get ALL series
   live through one CORS-safe endpoint — including Ibovespa and IFIX.
   Left empty, the app hits the keyless public sources directly (BCB + AwesomeAPI),
   which cover CDI/Selic/IPCA/USD/BTC but not the B3 indices.                      */
const USE_BACKEND = true;  // consome /api/market (Cloudflare Worker). Deixe false só p/ testar sem backend.
const API_BASE = "";       // "" = mesmo domínio (Cloudflare Pages). Ou a URL completa do backend.
const DEFAULTS = { cdi: 0.149, selic: 15.0, ipca: 4.6, usd12: null, btc12: null, ibov12: null, ifix12: null };

function useMarketData() {
  const [state, setState] = useState({ status: "loading", ...DEFAULTS });
  useEffect(() => {
    let alive = true;

    async function viaBackend() {
      const r = await fetch(`${API_BASE}/api/market`);
      if (!r.ok) throw new Error("backend");
      const d = await r.json();
      if (!alive) return;
      setState({
        status: "live",
        cdi: d.cdi != null ? d.cdi / 100 : DEFAULTS.cdi,
        selic: d.selic != null ? d.selic : DEFAULTS.selic,
        ipca: d.ipca12 != null ? d.ipca12 : DEFAULTS.ipca,
        usd12: d.usd12 != null ? d.usd12 : null,
        btc12: d.btc12 != null ? d.btc12 : null,
        ibov12: d.ibov12 != null ? d.ibov12 : null,
        ifix12: d.ifix12 != null ? d.ifix12 : null,
      });
    }

    async function viaDirect() {
      const bcb = (code) => fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`).then((r) => r.json());
      const daily = (pair) => fetch(`https://economia.awesomeapi.com.br/json/daily/${pair}/360`).then((r) => r.json());
      const lastVal = (r) => (r.status === "fulfilled" && Array.isArray(r.value) && r.value.length ? parseFloat(r.value[r.value.length - 1].valor) : null);
      const ret12 = (r) => {
        if (r.status !== "fulfilled" || !Array.isArray(r.value) || r.value.length < 2) return null;
        const a = r.value, latest = parseFloat(a[0].bid), oldest = parseFloat(a[a.length - 1].bid);
        return isFinite(latest) && isFinite(oldest) && oldest > 0 ? latest / oldest - 1 : null;
      };
      const [cdiR, selicR, ipcaR, btcR, usdR] = await Promise.allSettled([
        bcb(4389), bcb(432), bcb(13522), daily("BTC-BRL"), daily("USD-BRL"),
      ]);
      if (!alive) return;
      const cdi = lastVal(cdiR), selic = lastVal(selicR), ipca = lastVal(ipcaR);
      setState({
        status: cdi != null ? "live" : "cached",
        cdi: cdi != null ? cdi / 100 : DEFAULTS.cdi,
        selic: selic != null ? selic : DEFAULTS.selic,
        ipca: ipca != null ? ipca : DEFAULTS.ipca,
        usd12: ret12(usdR), btc12: ret12(btcR),
        ibov12: null, ifix12: null,
      });
    }

    (USE_BACKEND ? viaBackend() : viaDirect())
      .catch(() => alive && setState((s) => ({ ...s, status: "cached" })));
    return () => { alive = false; };
  }, []);
  return state;
}

/* ---------- finance math ---------- */
function fv(annualR, P0, PMT, years) {
  const months = Math.round(years * 12);
  const m = Math.pow(1 + annualR, 1 / 12) - 1;
  if (Math.abs(m) < 1e-9) return P0 + PMT * months;
  return P0 * Math.pow(1 + m, months) + PMT * (Math.pow(1 + m, months) - 1) / m;
}
function solveRate(target, P0, PMT, years) {
  let lo = -0.5, hi = 1.5;
  if (fv(hi, P0, PMT, years) < target) return hi;
  if (fv(lo, P0, PMT, years) > target) return lo;
  for (let i = 0; i < 90; i++) { const mid = (lo + hi) / 2; if (fv(mid, P0, PMT, years) < target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function solveYears(target, P0, PMT, annualR) {
  if (fv(annualR, P0, PMT, 60) < target) return 99;
  let lo = 0.1, hi = 60;
  for (let i = 0; i < 90; i++) { const mid = (lo + hi) / 2; if (fv(annualR, P0, PMT, mid) < target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function solvePMT(target, P0, annualR, years) {
  const months = Math.round(years * 12);
  const m = Math.pow(1 + annualR, 1 / 12) - 1;
  const factor = Math.abs(m) < 1e-9 ? months : (Math.pow(1 + m, months) - 1) / m;
  return Math.max(0, (target - P0 * Math.pow(1 + m, months)) / factor);
}
function pStats(alloc, stats) {
  const keys = Object.keys(alloc).filter((k) => alloc[k] > 0);
  let mu = 0, varr = 0;
  keys.forEach((k) => (mu += alloc[k] * stats[k].mu));
  keys.forEach((i) => keys.forEach((j) => { varr += alloc[i] * alloc[j] * stats[i].sig * stats[j].sig * rho(i, j); }));
  return { mu, sig: Math.sqrt(Math.max(0, varr)) };
}

/* ---------- portfolio math: cash-flow rebalancing (aporte inteligente) ---------- */
const EMERGENCY_TARGET = 30000; // reserva cheia -> redireciona o aporte
function effectiveTargets(targets, holdings) {
  const reserve = holdings.find((h) => h.classe === "rf");
  const full = reserve && reserve.valor >= EMERGENCY_TARGET;
  const eff = targets.map((t) => ({ ...t, weight: full && t.classe === "rf" ? 0 : t.weight }));
  const sum = eff.reduce((a, t) => a + t.weight, 0) || 1;
  return eff.map((t) => ({ ...t, weight: t.weight / sum }));
}
function smartContribution(holdings, targets, aporte) {
  const cur = {};
  holdings.forEach((h) => { cur[h.ticker] = (cur[h.ticker] || 0) + h.valor; });
  const totalNow = holdings.reduce((a, h) => a + h.valor, 0);
  const totalAfter = totalNow + aporte;
  const rows = effectiveTargets(targets, holdings).map((t) => {
    const c = cur[t.ticker] || 0;
    return { ticker: t.ticker, classe: t.classe, weight: t.weight, cur: c, need: Math.max(0, totalAfter * t.weight - c) };
  });
  const totalNeed = rows.reduce((a, r) => a + r.need, 0);
  let buys;
  if (aporte <= 0) buys = rows.map(() => 0);
  else if (totalNeed <= aporte + 1e-6) { const left = aporte - totalNeed; buys = rows.map((r) => r.need + left * r.weight); }
  else buys = rows.map((r) => (aporte * r.need) / totalNeed);
  return rows.map((r, i) => ({ ...r, buy: buys[i] }));
}
function classSummary(holdings, targets) {
  const total = holdings.reduce((a, h) => a + h.valor, 0) || 1;
  const cc = {}, tc = {};
  holdings.forEach((h) => { cc[h.classe] = (cc[h.classe] || 0) + h.valor; });
  targets.forEach((t) => { tc[t.classe] = (tc[t.classe] || 0) + t.weight; });
  return ["acao", "fii", "rf"].map((c) => ({ classe: c, cur: (cc[c] || 0) / total, tgt: tc[c] || 0 }));
}
let seed = 12345;
function gauss() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  const u1 = (seed % 1000000) / 1000000 || 1e-6;
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  const u2 = (seed % 1000000) / 1000000;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function probability(P0, PMT, years, target, mu, sig, sims = 2500) {
  seed = 987654;
  const annualPMT = PMT * 12;
  let hit = 0;
  for (let s = 0; s < sims; s++) {
    let w = P0;
    for (let y = 0; y < years; y++) { const ret = mu + sig * gauss(); w = w * (1 + ret) + annualPMT; if (w < 0) w = 0; }
    if (w >= target) hit++;
  }
  return hit / sims;
}

/* ---------- formatting ---------- */
const brl = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Math.round(v));
const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const signPct = (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}%`;

/* ---------- small UI atoms ---------- */
const chipStyle = (kind) => {
  const map = { pos: [T.primarySoft, T.primary], neg: [T.negSoft, T.negative], warn: [T.warnSoft, T.warn], n: [T.surfaceAlt, T.inkSoft] };
  const [bg, fg] = map[kind] || map.n;
  return { fontSize: 11, padding: "3px 9px", borderRadius: 20, background: bg, color: fg, whiteSpace: "nowrap" };
};
const tierKind = { baixo: "pos", "médio": "warn", alto: "neg" };

function Field({ label, prefix, value, onChange, step = 100 }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "0 10px" }}>
        {prefix && <span style={{ fontSize: 13, color: T.muted, fontFamily: MONO }}>{prefix}</span>}
        <input type="number" value={value} step={step}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          style={{ border: "none", outline: "none", background: "transparent", padding: "10px 6px", width: "100%", fontFamily: MONO, fontSize: 15, color: T.ink }} />
      </div>
    </label>
  );
}

/* ---------- screens ---------- */
function PillarScreen({ onPick, stats, onCancel }) {
  return (
    <div style={{ padding: "8px 20px 20px" }}>
      {onCancel && (
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex", alignItems: "center", gap: 4, fontSize: 13, padding: "8px 0" }}>
          <ArrowLeft size={16} /> Voltar
        </button>
      )}
      <p style={{ fontSize: 22, fontWeight: 600, color: T.ink, margin: "6px 0 4px", letterSpacing: -0.3 }}>Onde você está hoje?</p>
      <p style={{ fontSize: 14, color: T.inkSoft, margin: "0 0 20px", lineHeight: 1.5 }}>
        Isso define como o Norte fala com você — quanto explica, quantas opções mostra. Dá pra mudar depois.
      </p>
      {Object.values(PILLARS).map((p) => {
        const Icon = p.icon; const s = pStats(p.alloc, stats);
        return (
          <button key={p.key} onClick={() => onPick(p.key)}
            style={{ width: "100%", textAlign: "left", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: T.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={22} color={T.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{p.label}</div>
              <div style={{ fontSize: 13, color: T.muted }}>{p.tag} · retorno esperado {pct(s.mu, 0)} a.a.</div>
            </div>
            <ArrowRight size={18} color={T.muted} />
          </button>
        );
      })}
      <p style={{ fontSize: 11, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>
        Simulação educacional. Nada aqui é recomendação de investimento.
      </p>
    </div>
  );
}

function GoalScreen({ pillar, goal, setGoal, onBack, onDone }) {
  const [g, setG] = useState(goal);
  const set = (k) => (v) => setG({ ...g, [k]: v });
  return (
    <div style={{ padding: "8px 20px 20px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex", alignItems: "center", gap: 4, fontSize: 13, padding: "8px 0" }}>
        <ArrowLeft size={16} /> Voltar
      </button>
      <p style={{ fontSize: 22, fontWeight: 600, color: T.ink, margin: "6px 0 4px", letterSpacing: -0.3 }}>Qual é a sua meta?</p>
      <p style={{ fontSize: 14, color: T.inkSoft, margin: "0 0 20px", lineHeight: 1.5 }}>
        Diga quanto quer, em quanto tempo, e o quanto consegue guardar. O resto é comigo.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Quero chegar a" prefix="R$" value={g.target} step={5000} onChange={set("target")} />
        <div>
          <span style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>Em quantos anos — {g.years}</span>
          <input type="range" min={1} max={30} step={1} value={g.years} onChange={(e) => set("years")(Number(e.target.value))} style={{ width: "100%", accentColor: T.primary }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><Field label="Tenho hoje" prefix="R$" value={g.initial} step={1000} onChange={set("initial")} /></div>
          <div style={{ flex: 1 }}><Field label="Guardo por mês" prefix="R$" value={g.monthly} step={100} onChange={set("monthly")} /></div>
        </div>
      </div>
      <button onClick={() => { setGoal(g); onDone(); }}
        style={{ width: "100%", marginTop: 22, background: T.primary, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        Ver minha sugestão <ArrowRight size={18} />
      </button>
    </div>
  );
}

function AllocBar({ alloc }) {
  const keys = Object.keys(alloc).filter((k) => alloc[k] > 0);
  return (
    <>
      <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
        {keys.map((k) => <div key={k} style={{ width: `${alloc[k] * 100}%`, background: ASSET_META[k].color }} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {keys.map((k) => (
          <div key={k} style={{ display: "flex", alignItems: "center", fontSize: 13 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: ASSET_META[k].color, marginRight: 9 }} />
            <span style={{ flex: 1, color: T.inkSoft }}>{ASSET_META[k].label}</span>
            <span style={{ fontWeight: 600, color: T.ink, fontFamily: MONO }}>{Math.round(alloc[k] * 100)}%</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Projection({ P0, PMT, years, target, mu }) {
  const pts = []; let w = P0; pts.push(w);
  for (let y = 1; y <= years; y++) { w = w * (1 + mu) + PMT * 12; pts.push(w); }
  const max = Math.max(target, ...pts) * 1.08;
  const W = 300, H = 90;
  const x = (i) => (i / years) * W;
  const y = (v) => H - (v / max) * H;
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const ty = y(target);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="90" style={{ display: "block" }}>
      <line x1="0" y1={ty} x2={W} y2={ty} stroke={T.negative} strokeWidth="1" strokeDasharray="4 3" />
      <text x={W - 2} y={Math.max(10, ty - 4)} textAnchor="end" fontSize="9" fill={T.negative} fontFamily={MONO}>meta {brl(target)}</text>
      <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill={T.primarySoft} opacity="0.6" />
      <path d={path} fill="none" stroke={T.primary} strokeWidth="2" />
    </svg>
  );
}

function SuggestionScreen({ pillar, goal, stats, live, onEditGoal }) {
  const alloc = PILLARS[pillar].alloc;
  const port = useMemo(() => pStats(alloc, stats), [alloc, stats]);
  const [wYears, setWYears] = useState(goal.years);
  const [wMonthly, setWMonthly] = useState(goal.monthly);

  const required = useMemo(() => solveRate(goal.target, goal.initial, wMonthly, wYears), [goal.target, goal.initial, wMonthly, wYears]);
  const prob = useMemo(() => probability(goal.initial, wMonthly, wYears, goal.target, port.mu, port.sig), [goal.initial, wMonthly, wYears, goal.target, port.mu, port.sig]);
  const stretched = required > port.mu + 0.005;
  const yearsNeeded = useMemo(() => stretched ? solveYears(goal.target, goal.initial, wMonthly, port.mu) : null, [stretched, goal.target, goal.initial, wMonthly, port.mu]);
  const pmtNeeded = useMemo(() => stretched ? solvePMT(goal.target, goal.initial, port.mu, wYears) : null, [stretched, goal.target, goal.initial, port.mu, wYears]);

  const probColor = prob >= 0.7 ? T.positive : prob >= 0.45 ? T.warn : T.negative;
  const probBg = prob >= 0.7 ? T.primarySoft : prob >= 0.45 ? T.warnSoft : T.negSoft;

  return (
    <div style={{ padding: "4px 20px 20px" }}>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Target size={16} color={T.inkSoft} />
          <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, flex: 1 }}>{brl(goal.target)} em {wYears} anos</span>
          <button onClick={onEditGoal} style={{ background: "none", border: "none", cursor: "pointer", color: T.primary, display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: 0 }}>
            <Pencil size={13} /> Editar
          </button>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[["Tenho hoje", brl(goal.initial)], ["Por mês", brl(wMonthly)], ["Retorno necessário", pct(required)]].map(([l, v], i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: i === 2 ? T.primary : T.ink, fontFamily: MONO }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "4px 2px 8px" }}>
        <span style={{ fontSize: 12, color: T.muted }}>Alocação sugerida · retorno esperado {pct(port.mu, 0)} a.a.</span>
        {live && <span style={{ ...chipStyle("pos"), fontSize: 10, padding: "2px 7px" }}>CDI ao vivo</span>}
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <AllocBar alloc={alloc} />
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <Projection P0={goal.initial} PMT={wMonthly} years={wYears} target={goal.target} mu={port.mu} />
      </div>

      <div style={{ background: probBg, borderRadius: 14, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 34, fontWeight: 700, color: probColor, fontFamily: MONO }}>{Math.round(prob * 100)}%</span>
          <span style={{ fontSize: 13, color: probColor }}>de chance de atingir a meta</span>
        </div>
        <div style={{ height: 6, background: "rgba(0,0,0,0.07)", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
          <div style={{ width: `${Math.round(prob * 100)}%`, height: "100%", background: probColor }} />
        </div>
      </div>

      {stretched && (
        <div style={{ background: T.warnSoft, borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
            <AlertTriangle size={16} color={T.warn} style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: T.warn, margin: 0, lineHeight: 1.5 }}>
              Sua meta pede <b>{pct(required)} a.a.</b>, acima do que seu perfil costuma entregar ({pct(port.mu, 0)}). Não vou te empurrar mais risco — vamos ajustar a meta:
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setWYears(Math.min(30, Math.ceil(yearsNeeded)))}
              style={{ flex: 1, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 11, color: T.muted }}>Esticar prazo</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: MONO }}>{yearsNeeded >= 99 ? "30+ anos" : `${Math.ceil(yearsNeeded)} anos`}</div>
            </button>
            <button onClick={() => setWMonthly(Math.ceil(pmtNeeded / 50) * 50)}
              style={{ flex: 1, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: 11, color: T.muted }}>Guardar por mês</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: MONO }}>{brl(pmtNeeded)}</div>
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: T.muted, margin: "6px 2px 8px" }}>E se eu ajustar?</div>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginBottom: 4 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.inkSoft, marginBottom: 6 }}>
            <span>Guardar por mês</span><span style={{ fontFamily: MONO, fontWeight: 600 }}>{brl(wMonthly)}</span>
          </div>
          <input type="range" min={0} max={5000} step={50} value={wMonthly} onChange={(e) => setWMonthly(Number(e.target.value))} style={{ width: "100%", accentColor: T.primary }} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.inkSoft, marginBottom: 6 }}>
            <span>Prazo</span><span style={{ fontFamily: MONO, fontWeight: 600 }}>{wYears} anos</span>
          </div>
          <input type="range" min={1} max={30} step={1} value={wYears} onChange={(e) => setWYears(Number(e.target.value))} style={{ width: "100%", accentColor: T.primary }} />
        </div>
      </div>

      <div style={{ fontSize: 12, color: T.muted, margin: "16px 2px 8px" }}>Exemplos de ativos deste perfil</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {EXAMPLE_ASSETS[pillar].map((a, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: "11px 13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: MONO }}>{a.t}</span>
              <span style={chipStyle("n")}>{a.type}</span>
            </div>
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.5 }}>{a.w}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4, fontFamily: MONO }}>{a.hist}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: T.muted, marginTop: 8, lineHeight: 1.5 }}>Exemplos para ilustrar cada categoria — não é indicação de compra.</p>

      <p style={{ fontSize: 11, color: T.muted, marginTop: 12, lineHeight: 1.5 }}>
        Retornos esperados calibrados sobre o CDI (taxa livre de risco) mais um prêmio de risco por classe; probabilidade por simulação de 2.500 cenários. Rentabilidade passada não garante retorno futuro. Não é recomendação.
      </p>
    </div>
  );
}

function EducationScreen({ market }) {
  const liveVal = { cdi: null, usd: market.usd12, btc: market.btc12, ibov: market.ibov12, ifix: market.ifix12 };
  return (
    <div style={{ padding: "4px 20px 20px" }}>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Cenário hoje</span>
          <span style={{ ...chipStyle(market.status === "live" ? "pos" : "n"), fontSize: 10, padding: "2px 7px" }}>
            {market.status === "live" ? "Banco Central · ao vivo" : market.status === "loading" ? "carregando…" : "em cache"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[["CDI", pct(market.cdi, 1) + " a.a."], ["Selic", market.selic.toFixed(2) + "%"], ["IPCA 12m", market.ipca.toFixed(2) + "%"]].map(([l, v], i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, fontFamily: MONO }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 13, color: T.inkSoft, margin: "0 2px 14px", lineHeight: 1.5 }}>
        Os principais tipos de ativo do mercado, do mais seguro ao mais arriscado — o que são, onde atuam e como se saíram de verdade.
      </p>
      {ASSET_TYPES.map((a, i) => {
        const lv = a.live && liveVal[a.live] != null ? liveVal[a.live] : null;
        return (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: a.color }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: T.ink, flex: 1 }}>{i + 1}. {a.name}</span>
              <span style={chipStyle(tierKind[a.tier])}>Risco {a.tier}</span>
            </div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, marginLeft: 20 }}>{a.area}</div>
            <p style={{ fontSize: 13, color: T.inkSoft, margin: "0 0 10px", lineHeight: 1.55 }}>{a.desc}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {a.hist.map(([yr, v], j) => (
                <span key={j} style={{ fontSize: 11, fontFamily: MONO, padding: "3px 9px", borderRadius: 6, background: v < 0 ? T.negSoft : T.primarySoft, color: v < 0 ? T.negative : T.primary }}>
                  {yr} {v > 0 ? "+" : ""}{v}%
                </span>
              ))}
              {lv != null && (
                <span style={{ fontSize: 11, fontFamily: MONO, padding: "3px 9px", borderRadius: 6, border: `1px solid ${lv < 0 ? T.negative : T.primary}`, color: lv < 0 ? T.negative : T.primary, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Wifi size={11} /> 12m {signPct(lv)}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div style={{ background: T.primarySoft, borderRadius: 14, padding: 14, display: "flex", gap: 8, alignItems: "flex-start", marginTop: 4 }}>
        <Lightbulb size={16} color={T.primary} style={{ marginTop: 1, flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: T.primary, margin: 0, lineHeight: 1.5 }}>
          Quanto maior o retorno possível, maiores as quedas. O que mais subiu (cripto, BDR) também é o que mais cai. Por isso se mistura risco alto com a base segura.
        </p>
      </div>
      <p style={{ fontSize: 11, color: T.muted, marginTop: 12, lineHeight: 1.5 }}>
        Barras: retornos anuais em reais, aproximados, de índices de referência ('25* parcial). Selos "12m ao vivo" (dólar e cripto) vêm de cotação em tempo real. Para fins educacionais; rentabilidade passada não garante retorno futuro.
      </p>
    </div>
  );
}

function CarteiraScreen({ holdings, setHoldings, targets, aporteDefault }) {
  const [aporte, setAporte] = useState(aporteDefault);
  const [nt, setNt] = useState("");
  const [nc, setNc] = useState("acao");
  const [nv, setNv] = useState(0);

  const total = holdings.reduce((s, h) => s + h.valor, 0);
  const classes = classSummary(holdings, targets);
  const reserve = holdings.find((h) => h.classe === "rf");
  const reserveFull = reserve && reserve.valor >= EMERGENCY_TARGET;
  const plan = useMemo(
    () => smartContribution(holdings, targets, aporte).filter((r) => r.buy > 0.5).sort((a, b) => b.buy - a.buy),
    [holdings, targets, aporte]
  );

  const updateVal = (i, v) => setHoldings(holdings.map((h, idx) => (idx === i ? { ...h, valor: Math.max(0, v) } : h)));
  const remove = (i) => setHoldings(holdings.filter((_, idx) => idx !== i));
  const add = () => { if (!nt.trim()) return; setHoldings([...holdings, { ticker: nt.trim().toUpperCase(), classe: nc, valor: Number(nv) || 0 }]); setNt(""); setNv(0); };

  return (
    <div style={{ padding: "4px 20px 20px" }}>
      <p style={{ fontSize: 13, color: T.inkSoft, margin: "8px 2px 14px", lineHeight: 1.5 }}>
        Cadastre o que você já tem. O Norte compara com a sua carteira-alvo e diz para onde mandar o próximo aporte — sem escolher ativo por você, só fazendo a conta do seu plano.
      </p>

      <div style={{ fontSize: 12, color: T.muted, margin: "0 2px 8px" }}>Atual vs. alvo</div>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        {classes.map((c) => {
          const m = CLASSE_META[c.classe];
          return (
            <div key={c.classe} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", fontSize: 13, marginBottom: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: m.color, marginRight: 9 }} />
                <span style={{ flex: 1, color: T.inkSoft }}>{m.label}</span>
                <span style={{ fontFamily: MONO, fontWeight: 600, color: T.ink }}>{pct(c.cur, 0)}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, marginLeft: 6 }}>/ alvo {pct(c.tgt, 0)}</span>
              </div>
              <div style={{ height: 8, background: T.surfaceAlt, borderRadius: 4, position: "relative", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, c.cur * 100)}%`, height: "100%", background: m.color }} />
                <div style={{ position: "absolute", top: -2, left: `${Math.min(100, c.tgt * 100)}%`, width: 2, height: 12, background: T.ink }} />
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
          <span style={{ color: T.muted }}>Total investido</span>
          <span style={{ fontFamily: MONO, fontWeight: 600, color: T.ink }}>{brl(total)}</span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: T.muted, margin: "6px 2px 8px" }}>Aporte inteligente</div>
      <div style={{ background: T.primarySoft, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: T.inkSoft }}>Vou aportar</span>
          <div style={{ display: "flex", alignItems: "center", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "0 10px", flex: 1 }}>
            <span style={{ fontSize: 13, color: T.muted, fontFamily: MONO }}>R$</span>
            <input type="number" value={aporte} step={100} onChange={(e) => setAporte(Math.max(0, Number(e.target.value)))}
              style={{ border: "none", outline: "none", background: "transparent", padding: "9px 6px", width: "100%", fontFamily: MONO, fontSize: 15, color: T.ink }} />
          </div>
        </div>
        {reserveFull && (
          <div style={{ fontSize: 12, color: T.primary, marginBottom: 10, display: "flex", gap: 6, alignItems: "flex-start" }}>
            <Check size={14} style={{ marginTop: 1, flexShrink: 0 }} /> Reserva na meta — aporte redirecionado para ações e FIIs.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {plan.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface, borderRadius: 10, padding: "9px 12px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: CLASSE_META[r.classe].color }} />
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: T.ink, flex: 1 }}>{r.ticker}</span>
              <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: T.primary }}>{brl(r.buy)}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: T.inkSoft, marginTop: 10, lineHeight: 1.5 }}>
          Conta feita sobre a SUA carteira-alvo, priorizando o que está mais abaixo do peso. Não é indicação de compra.
        </p>
      </div>

      <div style={{ fontSize: 12, color: T.muted, margin: "6px 2px 8px" }}>Minha carteira</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {holdings.map((h, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 10px" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: CLASSE_META[h.classe].color }} />
            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: T.ink, width: 72 }}>{h.ticker}</span>
            <div style={{ display: "flex", alignItems: "center", background: T.surfaceAlt, borderRadius: 8, padding: "0 8px", flex: 1 }}>
              <span style={{ fontSize: 12, color: T.muted, fontFamily: MONO }}>R$</span>
              <input type="number" value={h.valor} step={100} onChange={(e) => updateVal(i, Number(e.target.value))}
                style={{ border: "none", outline: "none", background: "transparent", padding: "7px 4px", width: "100%", fontFamily: MONO, fontSize: 13, color: T.ink }} />
            </div>
            <span style={{ fontFamily: MONO, fontSize: 11, color: T.muted, width: 34, textAlign: "right" }}>{total > 0 ? pct(h.valor / total, 0) : "0%"}</span>
            <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 2, display: "flex" }}><X size={15} /></button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
        <input value={nt} onChange={(e) => setNt(e.target.value)} placeholder="TICKER"
          style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 8px", width: 76, fontFamily: MONO, fontSize: 13, background: T.surface, color: T.ink, outline: "none" }} />
        <select value={nc} onChange={(e) => setNc(e.target.value)}
          style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 4px", fontSize: 12, background: T.surface, color: T.ink }}>
          <option value="acao">Ação</option><option value="fii">FII</option><option value="rf">Reserva</option>
        </select>
        <div style={{ display: "flex", alignItems: "center", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, padding: "0 8px", flex: 1 }}>
          <span style={{ fontSize: 12, color: T.muted, fontFamily: MONO }}>R$</span>
          <input type="number" value={nv || ""} step={100} onChange={(e) => setNv(Number(e.target.value))} placeholder="0"
            style={{ border: "none", outline: "none", background: "transparent", padding: "8px 4px", width: "100%", fontFamily: MONO, fontSize: 13, color: T.ink }} />
        </div>
        <button onClick={add} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={16} /></button>
      </div>

      <p style={{ fontSize: 11, color: T.muted, marginTop: 12, lineHeight: 1.5 }}>
        Valores editáveis manualmente; com o backend conectado, o preço atual de cada ativo entra sozinho. Simulação educacional — não é recomendação.
      </p>
    </div>
  );
}

function DividendosScreen({ holdings, aporteDefault, cdi }) {
  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const [log, setLog] = useState(Array(12).fill(0));
  const [meta, setMeta] = useState(3000);

  const total = holdings.reduce((s, h) => s + h.valor, 0);
  const fiiVal = holdings.filter((h) => h.classe === "fii").reduce((s, h) => s + h.valor, 0);
  const acaoVal = holdings.filter((h) => h.classe === "acao").reduce((s, h) => s + h.valor, 0);
  const annual = fiiVal * 0.10 + acaoVal * 0.055;
  const monthlyEst = annual / 12;
  const yoc = total > 0 ? annual / total : 0;

  const totalLog = log.reduce((a, b) => a + b, 0);
  const nz = log.filter((v) => v > 0).length;
  const avgLog = nz > 0 ? totalLog / nz : 0;
  const maxLog = Math.max(...log, 1);

  const anos = 20;
  const growth = Math.max(cdi, 0.08) + 0.02;
  const yieldRate = total > 0 ? annual / total : 0.08;
  const proj = [];
  for (let t = 0; t <= anos; t++) proj.push(fv(growth, total, aporteDefault, t) * yieldRate / 12);
  const hit = proj.findIndex((m) => m >= meta);

  const setMonth = (i, v) => setLog(log.map((x, idx) => (idx === i ? Math.max(0, v) : x)));

  const W = 300, H = 88;
  const maxP = Math.max(meta, ...proj) * 1.12;
  const px = (i) => (i / anos) * W;
  const py = (v) => H - (v / maxP) * H;
  const ppath = proj.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");
  const metaY = py(meta);

  return (
    <div style={{ padding: "4px 20px 20px" }}>
      <p style={{ fontSize: 13, color: T.inkSoft, margin: "8px 2px 14px", lineHeight: 1.5 }}>
        Sua renda passiva — os aluguéis dos FIIs e os dividendos das ações. A meta do plano é ela crescer até cobrir suas contas.
      </p>

      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Renda passiva estimada hoje</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: T.primary, fontFamily: MONO }}>{brl(monthlyEst)}</span>
          <span style={{ fontSize: 13, color: T.muted }}>/ mês</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>No ano</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: MONO }}>{brl(annual)}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Yield on cost</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: MONO }}>{pct(yoc, 1)} a.a.</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: T.muted, margin: "6px 2px 8px" }}>Quando minha renda paga minhas contas?</div>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: T.inkSoft }}>Meta de renda/mês</span>
          <div style={{ display: "flex", alignItems: "center", background: T.surfaceAlt, borderRadius: 10, padding: "0 10px", flex: 1 }}>
            <span style={{ fontSize: 13, color: T.muted, fontFamily: MONO }}>R$</span>
            <input type="number" value={meta} step={500} onChange={(e) => setMeta(Math.max(0, Number(e.target.value)))}
              style={{ border: "none", outline: "none", background: "transparent", padding: "9px 6px", width: "100%", fontFamily: MONO, fontSize: 15, color: T.ink }} />
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="88" style={{ display: "block" }}>
          <line x1="0" y1={metaY} x2={W} y2={metaY} stroke={T.warn} strokeWidth="1" strokeDasharray="4 3" />
          <text x={W - 2} y={Math.max(9, metaY - 4)} textAnchor="end" fontSize="9" fill={T.warn} fontFamily={MONO}>meta {brl(meta)}</text>
          <path d={`${ppath} L ${W} ${H} L 0 ${H} Z`} fill={T.primarySoft} opacity="0.6" />
          <path d={ppath} fill="none" stroke={T.primary} strokeWidth="2" />
        </svg>
        <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
          {hit > 0
            ? <>No ritmo atual, sua renda passa <b>{brl(meta)}/mês</b> em cerca de <b>{hit} anos</b>, chegando a {brl(proj[Math.min(anos, hit)])}/mês.</>
            : <>Em {anos} anos, sua renda chega a <b>{brl(proj[anos])}/mês</b>. Aumente o aporte para acelerar.</>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[[5, proj[5]], [10, proj[10]], [20, proj[20]]].map(([y, v], i) => (
            <div key={i} style={{ flex: 1, background: T.surfaceAlt, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.muted }}>{y} anos</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: MONO }}>{brl(v)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: T.muted, margin: "6px 2px 8px" }}>Registro do ano</div>
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 46, marginBottom: 10 }}>
          {log.map((v, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
              <div style={{ width: "72%", height: Math.max(2, (v / maxLog) * 40), background: v > 0 ? T.rf : T.line, borderRadius: 2 }} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {MESES.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", background: T.surfaceAlt, borderRadius: 8, padding: "0 6px" }}>
              <span style={{ fontSize: 11, color: T.muted, width: 22 }}>{m}</span>
              <input type="number" value={log[i] || ""} step={10} placeholder="0" onChange={(e) => setMonth(i, Number(e.target.value))}
                style={{ border: "none", outline: "none", background: "transparent", padding: "7px 2px", width: "100%", fontFamily: MONO, fontSize: 12, color: T.ink }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12 }}>
          <span style={{ color: T.muted }}>Recebido no ano</span>
          <span style={{ fontFamily: MONO, fontWeight: 600, color: T.ink }}>{brl(totalLog)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12 }}>
          <span style={{ color: T.muted }}>Média mensal</span>
          <span style={{ fontFamily: MONO, fontWeight: 600, color: T.ink }}>{brl(avgLog)}</span>
        </div>
      </div>

      <p style={{ fontSize: 11, color: T.muted, marginTop: 4, lineHeight: 1.5 }}>
        Renda estimada por yield médio (FII ~10% a.a., ações ~5,5% a.a.); a reserva não conta como renda passiva. FIIs são isentos de IR para pessoa física. Projeção não é promessa — não é recomendação.
      </p>
    </div>
  );
}

function CopilotScreen() {
  const [fixed, setFixed] = useState(false);
  return (
    <div style={{ padding: "4px 20px 20px" }}>
      <p style={{ fontSize: 13, color: T.inkSoft, margin: "8px 2px 14px", lineHeight: 1.5 }}>
        A B3 às vezes manda dados errados — é assim pra todo mundo. A diferença é que eu te aviso e resolvo, em vez de te deixar com a carteira torta.
      </p>
      {!fixed ? (
        <>
          <div style={{ background: T.warnSoft, borderRadius: 14, padding: 14, marginBottom: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={18} color={T.warn} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.warn, marginBottom: 2 }}>Divergência em ITSA4</div>
              <div style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.5 }}>Sua posição mudou sem uma ordem sua. Dei uma olhada.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            {[["Antes · 10/03", "100 cotas", "R$ 9,80 / cota"], ["Depois · 12/03", "50 cotas", "R$ 19,60 / cota"]].map((c, i) => (
              <React.Fragment key={i}>
                <div style={{ flex: 1, background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: T.muted }}>{c[0]}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, fontFamily: MONO }}>{c[1]}</div>
                  <div style={{ fontSize: 11, color: T.inkSoft, fontFamily: MONO }}>{c[2]}</div>
                </div>
                {i === 0 && <ArrowRight size={16} color={T.muted} />}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.primarySoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={15} color={T.primary} />
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: 12 }}>
              <p style={{ fontSize: 13, color: T.ink, margin: 0, lineHeight: 1.55 }}>
                A quantidade caiu pela metade e o preço unitário dobrou no mesmo dia. Isso é padrão de <b>grupamento</b>, não de venda — um erro conhecido da API da B3.
              </p>
              <p style={{ fontSize: 13, color: T.ink, margin: "8px 0 0", lineHeight: 1.55 }}>
                Se eu registrar como grupamento, sua rentabilidade volta ao certo e você não paga IR sobre uma venda que não houve.
              </p>
            </div>
          </div>
          <div style={{ background: T.negSoft, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Info size={15} color={T.negative} />
            <span style={{ fontSize: 12, color: T.inkSoft }}>
              Rentabilidade hoje: <span style={{ fontFamily: MONO, fontWeight: 600, color: T.negative }}>-49,8%</span> <span style={{ color: T.muted }}>(errada)</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setFixed(true)} style={{ flex: 1, background: T.primary, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Registrar grupamento</button>
            <button style={{ flex: 1, background: T.surface, color: T.inkSoft, border: `1px solid ${T.line}`, borderRadius: 10, padding: 12, fontSize: 13, cursor: "pointer" }}>Foi venda</button>
          </div>
        </>
      ) : (
        <div style={{ background: T.primarySoft, borderRadius: 14, padding: 20, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.primary, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <Check size={26} color="#fff" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>Corrigido</p>
          <p style={{ fontSize: 13, color: T.inkSoft, margin: "0 0 12px", lineHeight: 1.5 }}>ITSA4 registrado como grupamento. Sua rentabilidade voltou ao real.</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.surface, borderRadius: 10, padding: "8px 14px" }}>
            <span style={{ fontFamily: MONO, fontSize: 13, color: T.muted, textDecoration: "line-through" }}>-49,8%</span>
            <ArrowRight size={14} color={T.muted} />
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: T.positive }}>+2,1%</span>
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setFixed(false)} style={{ background: "none", border: "none", color: T.primary, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Ver de novo</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- shell ---------- */
const TABS = [
  { key: "sugestao", label: "Sugestão", icon: Compass },
  { key: "carteira", label: "Carteira", icon: Wallet },
  { key: "dividendos", label: "Dividendos", icon: Coins },
  { key: "educacao", label: "Educação", icon: GraduationCap },
  { key: "copiloto", label: "Copiloto", icon: Sparkles },
];

export default function App() {
  const [flow, setFlow] = useState("pillar");
  const [pillar, setPillar] = useState(null);
  const [tab, setTab] = useState("sugestao");
  const [goal, setGoal] = useState({ target: 100000, years: 5, initial: 5000, monthly: 1000 });
  const [started, setStarted] = useState(false);
  const [holdings, setHoldings] = useState(HOLDINGS_SEED);
  const [targets] = useState(TARGET_SEED);
  const market = useMarketData();
  const stats = useMemo(() => deriveStats(market.cdi), [market.cdi]);

  return (
    <div style={{ fontFamily: SANS, background: T.surfaceAlt, minHeight: 640, display: "flex", justifyContent: "center", padding: "24px 12px", color: T.ink }}>
      <div style={{ width: "100%", maxWidth: 400, background: T.paper, borderRadius: 26, overflow: "hidden", border: `1px solid ${T.line}`, display: "flex", flexDirection: "column" }}>

        <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: T.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Compass size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Norte</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div title={market.status === "live" ? "Dados ao vivo (Banco Central)" : "Dados em cache"}
              style={{ display: "flex", alignItems: "center", gap: 4, color: market.status === "live" ? T.primary : T.muted }}>
              {market.status === "live" ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span style={{ fontSize: 11, fontWeight: 500 }}>{market.status === "live" ? "ao vivo" : market.status === "loading" ? "…" : "cache"}</span>
            </div>
            {flow === "app" && (
              <button onClick={() => setFlow("pillar")} title="Trocar perfil" style={{ display: "flex", alignItems: "center", gap: 6, background: T.primarySoft, border: "none", borderRadius: 20, padding: "5px 10px", cursor: "pointer" }}>
                <ShieldCheck size={13} color={T.primary} />
                <span style={{ fontSize: 12, color: T.primary, fontWeight: 600 }}>{PILLARS[pillar].label}</span>
                <Pencil size={11} color={T.primary} />
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {flow === "pillar" && <PillarScreen stats={stats} onPick={(p) => { setPillar(p); setFlow(started ? "app" : "goal"); }} onCancel={started ? () => setFlow("app") : undefined} />}
          {flow === "goal" && <GoalScreen pillar={pillar} goal={goal} setGoal={setGoal} onBack={started ? () => setFlow("app") : () => setFlow("pillar")} onDone={() => { setFlow("app"); setTab("sugestao"); setStarted(true); }} />}
          {flow === "app" && tab === "sugestao" && <SuggestionScreen pillar={pillar} goal={goal} stats={stats} live={market.status === "live"} onEditGoal={() => setFlow("goal")} />}
          {flow === "app" && tab === "carteira" && <CarteiraScreen holdings={holdings} setHoldings={setHoldings} targets={targets} aporteDefault={goal.monthly} />}
          {flow === "app" && tab === "dividendos" && <DividendosScreen holdings={holdings} aporteDefault={goal.monthly} cdi={market.cdi} />}
          {flow === "app" && tab === "educacao" && <EducationScreen market={market} />}
          {flow === "app" && tab === "copiloto" && <CopilotScreen />}
        </div>

        {flow === "app" && (
          <div style={{ display: "flex", borderTop: `1px solid ${T.line}`, background: T.surface }}>
            {TABS.map((t) => {
              const Icon = t.icon; const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "10px 0 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: active ? T.primary : T.muted }}>
                  <Icon size={20} />
                  <span style={{ fontSize: 11, fontWeight: active ? 600 : 400 }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
