// Cloudflare Pages Function — proxy autenticado pra Google Gemini API
// Usado pela funcionalidade de contagem de estoque via foto no client.
//
// Endpoint: POST /gemini-vision
// Body: { images: [{media_type, data(base64)}, ...], prompt, model? }
//
// Requer variável de ambiente GEMINI_API_KEY em Cloudflare Pages → Settings → Env vars.
// Obtenha grátis em: https://aistudio.google.com/apikey
// Free tier: 1.500 requisições/dia com gemini-1.5-flash

export async function onRequest(context) {
  const { request, env } = context;

  const cors = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: cors });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  // Verifica se a API key está configurada
  if (!env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({
      error: "GEMINI_API_KEY não configurada. Obtenha grátis em https://aistudio.google.com/apikey e configure em Cloudflare Pages → Settings → Environment variables",
    }), { status: 500, headers: { "Content-Type": "application/json", ...cors } });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido no body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  const { images, prompt, model = "gemini-1.5-flash" } = body;
  if (!Array.isArray(images) || images.length === 0) {
    return new Response(JSON.stringify({ error: 'Envie ao menos 1 imagem em "images"' }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }

  // Monta parts pro Gemini: cada imagem + texto do prompt
  const parts = [];
  for (const img of images) {
    if (!img || !img.data || !img.media_type) {
      return new Response(JSON.stringify({ error: "Cada imagem precisa de {media_type, data}" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }
    parts.push({
      inline_data: {
        mime_type: img.media_type,
        data: img.data,
      },
    });
  }
  parts.push({ text: prompt });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4000,
        },
      }),
    });

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      return new Response(JSON.stringify({
        error: (data.error && data.error.message) || "Gemini API retornou " + geminiRes.status,
        details: data,
      }), { status: geminiRes.status, headers: { "Content-Type": "application/json", ...cors } });
    }

    // Extrai texto plano da resposta do Gemini
    const candidates = data.candidates || [];
    const partsResp = (candidates[0] && candidates[0].content && candidates[0].content.parts) || [];
    const textResp = partsResp
      .filter(p => p.text)
      .map(p => p.text)
      .join("\n")
      .trim();

    if (!textResp) {
      return new Response(JSON.stringify({
        error: "Gemini retornou resposta vazia",
        details: data,
      }), { status: 500, headers: { "Content-Type": "application/json", ...cors } });
    }

    return new Response(JSON.stringify({
      text: textResp,
      usage: data.usageMetadata,
    }), { status: 200, headers: { "Content-Type": "application/json", ...cors } });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro ao chamar Gemini: " + e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
}
