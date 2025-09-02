export async function handler(event) {
  const q = event.queryStringParameters || {};
  const id = q.id || "";
  if (!id) return { statusCode: 200, headers: { "content-type": "text/plain" }, body: "OK" };

  const owner  = process.env.GH_OWNER;
  const repo   = process.env.GH_REPO;
  const branch = process.env.GH_BRANCH || "main";
  const redirectBase = process.env.REDIRECT_BASE || "";
  const site = process.env.URL || "";

  // We save JPEGs from the browser canvas; point OG to jsDelivr
  const og = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/images/${encodeURIComponent(id)}-og.jpg`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Callsheet • ${id}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="Callsheet • ${id} — Callsheet Preview">
<meta property="og:description" content="Open this callsheet.">
<meta property="og:url" content="${site}/share/${encodeURIComponent(id)}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${og}">
</head>
<body>
<script>
  setTimeout(function(){
    var base = ${JSON.stringify(redirectBase)};
    if (base) location.replace(base + ${JSON.stringify(id)});
  }, 50);
</script>
</body>
</html>`;

  return { statusCode: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: html };
}
