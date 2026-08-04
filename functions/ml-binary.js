// Cloudflare Pages Function — Proxy binário ML (PDFs de etiquetas, etc.)
// Endpoint: GET /ml-binary?path=/shipment_labels?shipment_ids=...

export async function onRequest(context) {
  const { request } = context;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: cors });
  }

  const url = new URL(request.url);
  const mlPath = url.searchParams.get("path");
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");

  if (!mlPath) {
    return new Response(
      JSON.stringify({ error: "missing_path", detail: "?path=/shipment_labels?... required" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const mlHeaders = {
    "Accept": "application/pdf, application/octet-stream, */*",
    "User-Agent": "Mozilla/5.0",
  };
  if (auth) mlHeaders["Authorization"] = auth;

  try {
    const mlResp = await fetch(`https://api.mercadolibre.com${mlPath}`, {
      method: "GET",
      headers: mlHeaders,
    });

    if (!mlResp.ok) {
      const errBody = await mlResp.text();
      return new Response(
        JSON.stringify({
          error: "ml_error",
          status: mlResp.status,
          detail: errBody.slice(0, 1000),
        }),
        { status: mlResp.status, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Streama o body binário diretamente (Cloudflare suporta nativo)
    const contentType = mlResp.headers.get("content-type") || "application/pdf";
    const buffer = await mlResp.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": contentType,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "proxy_error", detail: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
}
