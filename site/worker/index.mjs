// Cloudflare Worker 入口（wrangler.jsonc 的 main）。只有 run_worker_first 列的路徑會進來，其餘直接由靜態資源回應。
// 1. /api/contact        → 聯絡表單（worker/contact.mjs）
// 2. 舊站 .php 網址等     → 301 到新站網址（worker/redirects.mjs 的對照表）
// 3. 其他                 → 交回靜態資源（env.ASSETS）
import { handleContact } from './contact.mjs';
import { legacyRedirect } from './redirects.mjs';

const fail = (code, status) => Response.json({ ok: false, code }, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/api/contact') return await handleContact(request, env);
      if (path.startsWith('/api/')) return fail('not_found', 404);
      const target = legacyRedirect(url);
      if (target) return Response.redirect(new URL(target, url.origin).toString(), 301);
      return await env.ASSETS.fetch(request);
    } catch {
      if (path.startsWith('/api/')) return fail('error', 503);
      return env.ASSETS.fetch(request);
    }
  },
};
