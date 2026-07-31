# Norte — investimento com direção

App de acompanhamento e planejamento de investimentos (PF, mercado brasileiro):
sugestão por metas em 3 pilares, carteira com aporte inteligente, dividendos/renda
passiva, educação com dados de mercado ao vivo e copiloto de reconciliação da B3.

Stack: **Vite + React** (frontend) e **Cloudflare Pages Functions** (backend `/api/market`).

## Rodar localmente
```bash
npm install
npm run dev
```
Obs.: a função `/api/market` só roda no Cloudflare (ou via `npx wrangler pages dev`).
No `vite dev` puro o app cai para o modo "cache" — normal.

## Publicar (GitHub + Cloudflare Pages)
1. Suba este projeto para um repositório no GitHub.
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → escolha o repo.
3. Build settings: **Framework preset = Vite**, **Build command = `npm run build`**,
   **Output directory = `dist`**.
4. Environment variables (Production): adicione **`BRAPI_TOKEN`** (token grátis em
   https://brapi.dev) — necessário só para Ibovespa/IFIX ao vivo. Opcional: `NODE_VERSION=20`.
5. Save and Deploy. Cada `git push` na branch principal redeploya sozinho.

Verifique: abra `https://SEU-PROJETO.pages.dev/api/market` (deve retornar JSON) e o site
(o topo deve indicar "ao vivo").

## Ajustes rápidos
- `src/App.jsx` topo: `USE_BACKEND` liga/desliga o backend; `API_BASE` ("" = mesmo domínio).
- Carteira-alvo e posições iniciais: constantes `TARGET_SEED` / `HOLDINGS_SEED` no topo do `App.jsx`.
- Enquadramento educacional (sem recomendação individualizada de ativo) é proposital —
  ver histórico do projeto antes de mudar.
