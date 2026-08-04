// Cloudflare Pages Function — Proxy JSON da API ML
// Endpoint: ANY /ml-proxy?path=/users/me  (Authorization: Bearer <token>)

export async function onRequest(context) {
  const { request } = context;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-version",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  };

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: cors });
  }

  const url = new URL(request.url);
  const mlPath = url.searchParams.get("path");

  if (!mlPath) {
    return new Response(
      JSON.stringify({ error: "missing_path", detail: "?path=/users/me required" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const mlHeaders = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
  };
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  if (auth) mlHeaders["Authorization"] = auth;
  // Repassa headers extras que o ML reconhece (x-version, x-locale etc.)
  const xVersion = request.headers.get("x-version");
  if (xVersion) mlHeaders["x-version"] = xVersion;

  const init = {
    method: request.method,
    headers: mlHeaders,
  };

  // Para métodos com body, encaminha
  if (["POST", "PATCH", "PUT"].includes(request.method)) {
    try { init.body = await request.text(); } catch { init.body = ""; }
  }

  try {
    const mlResp = await fetch(`https://api.mercadolibre.com${mlPath}`, init);
    const body = await mlResp.text();

    // Garante que retornamos JSON válido — mesmo quando o ML retorna HTML/vazio
    let safeBody = body;
    if (!body) {
      safeBody = JSON.stringify({ error: "ml_empty_response", status: mlResp.status });
    } else {
      try {
        JSON.parse(body);
      } catch {
        // ML retornou algo que não é JSON (HTML de erro, etc.)
        safeBody = JSON.stringify({
          error: "ml_invalid_response",
          status: mlResp.status,
          detail: body.slice(0, 500),
        });
      }
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
