// Cloudflare Pages Function — OAuth Token ML
// Endpoint: POST /ml-token (body JSON: { grant_type, client_id, client_secret, refresh_token, code, redirect_uri })
// Usa onRequest genérico para aceitar POST + OPTIONS

export async function onRequest(context) {
  const { request } = context;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: cors });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method_not_allowed", detail: `Method ${request.method} not supported` }),
      { status: 405, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  // Parse body com proteção
  let params;
  try {
    params = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_body", detail: "Body must be valid JSON" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (!params || typeof params !== "object") {
    return new Response(
      JSON.stringify({ error: "invalid_body", detail: "Body must be a JSON object" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  // Monta o body como form-urlencoded
  const formBody = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  try {
    const mlResp = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });
    const body = await mlResp.text();

    // Garante que sempre retorna JSON válido
    let safeBody = body;
    try {
      if (body) JSON.parse(body);
      else safeBody = JSON.stringify({ error: "ml_empty_response", status: mlResp.status });
    } catch {
      safeBody = JSON.stringify({
        error: "ml_invalid_response",
        status: mlResp.status,
        detail: body.slice(0, 500),
      });
    }

    return new Response(safeBody, {
      status: mlResp.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "proxy_error", detail: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
}
