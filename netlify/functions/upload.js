import { Octokit } from "@octokit/rest";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const owner  = process.env.GH_OWNER;
    const repo   = process.env.GH_REPO;
    const branch = process.env.GH_BRANCH || "main";
    const token  = process.env.GITHUB_TOKEN;
    const site   = process.env.URL || process.env.DEPLOY_PRIME_URL || "";

    if (!owner || !repo || !token) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing server env vars" }) };
    }

    const octokit = new Octokit({ auth: token });

    function decodeDataUrl(dataUrl) {
      const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || "");
      if (!m) throw new Error("Invalid data URL");
      const mime = m[1];
      const ext  = mime.split("/")[1].replace("jpeg","jpg");
      return { ext, base64: m[2] };
    }

    async function commitBase64(path, base64Content, message) {
      let sha;
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
        sha = data.sha; // existing file -> update
      } catch {
        // new file -> create
      }
      await octokit.repos.createOrUpdateFileContents({
        owner, repo, path, branch, message, content: base64Content, sha
      });
    }

    // Full callsheet (master + per-row)
    if (body.projectId && body.masterOgDataUrl && Array.isArray(body.items)) {
      const projectId = body.projectId.trim();

      const master = decodeDataUrl(body.masterOgDataUrl); // should be jpeg
      const masterPath = `images/${projectId}-og.${master.ext}`;
      await commitBase64(masterPath, master.base64, `Upload master OG for ${projectId}`);

      for (const it of body.items) {
        if (!it || !it.rowId || !it.ogDataUrl) continue;
        const row = decodeDataUrl(it.ogDataUrl);
        const rowPath = `images/${projectId}__${it.rowId}-og.${row.ext}`;
        await commitBase64(rowPath, row.base64, `Upload row OG for ${projectId} ${it.rowId}`);
      }

      const shareUrl = `${site}/share/${encodeURIComponent(projectId)}`;
      return { statusCode: 200, body: JSON.stringify({ ok: true, shareUrl }) };
    }

    // Single row (still supported)
    if (body.id && body.ogDataUrl) {
      const id = body.id.trim();
      const og = decodeDataUrl(body.ogDataUrl); // should be jpeg
      const path = `images/${id}-og.${og.ext}`;
      await commitBase64(path, og.base64, `Upload OG for ${id}`);

      const shareUrl = `${site}/share/${encodeURIComponent(id)}`;
      return { statusCode: 200, body: JSON.stringify({ ok: true, shareUrl }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Bad payload" }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
}
