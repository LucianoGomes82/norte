# Norte — investimento com direção

App de acompanhamento e planejamento de investimentos (PF, mercado brasileiro):
sugestão por metas em 3 pilares, carteira com aporte inteligente, dividendos/renda
passiva, educação com dados de mercado ao vivo e copiloto de reconciliação da B3.

Stack: **Vite + React** (app) servido por um **Cloudflare Worker** que também
publica a rota `/api/market` (dados do Banco Central + AwesomeAPI + brapi).

## Rodar localmente
```bash
npm install
npm run build        # gera dist/
npx wrangler dev     # sobe o app + /api/market localmente
# (ou apenas: npm run dev — mas aí /api/market não roda, o app cai p/ "cache")
```

## Publicar (GitHub + Cloudflare Workers)
Este projeto usa o pipeline **Workers Builds**. O `wrangler.jsonc` na raiz faz o
Cloudflare pular a autoconfiguração (e some o erro de versão do Vite).

1. Suba o projeto para um repositório no GitHub.
2. Cloudflare → **Workers & Pages** → **Create** → **Import a repository** → escolha o repo.
   - O nome do Worker precisa ser **`norte`** (igual ao campo `name` do `wrangler.jsonc`).
   - Build command: `npm run build` · Deploy command: `npx wrangler deploy` (padrão).
3. No Worker → **Settings** → **Variables and Secrets**, adicione **`BRAPI_TOKEN`**
   (token grátis em https://brapi.dev; necessário só p/ Ibovespa/IFIX ao vivo).
4. Faça um novo deploy (ou um `git push`). Cada push na branch principal redeploya.

Verifique: `https://SEU-WORKER.workers.dev/api/market` deve retornar JSON, e o app
deve mostrar "ao vivo" no topo.

## Ajustes rápidos
- `src/App.jsx` (topo): `USE_BACKEND` liga/desliga o backend; `API_BASE` ("" = mesmo domínio).
- Carteira-alvo e posições iniciais: `TARGET_SEED` / `HOLDINGS_SEED` no topo do `App.jsx`.
- Lógica dos dados de mercado: `worker/index.js`.
