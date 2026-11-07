import { stat } from "node:fs/promises";
import { convertHeicImages } from "./lib/convert-images.js";
import { convertTourVideos } from "./lib/convert-videos.js";
import { contentType, notFoundFile, requestOrigin, resolvePublicPath, withShareImage } from "./lib/files.js";

convertHeicImages();
convertTourVideos();

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

function text(message, status) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function notFound() {
  try {
    const info = await stat(notFoundFile);
    if (!info.isFile()) throw new Error("missing 404 page");
  } catch {
    return text("Not found", 404);
  }
  return new Response(Bun.file(notFoundFile), {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  });
}

Bun.serve({
  port,
  hostname: host,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;
    if (pathname.endsWith("/")) pathname += "index.html";
    const filePath = resolvePublicPath(pathname);
    if (!filePath) return text("Bad request", 400);
    try {
      const info = await stat(filePath);
      if (!info.isFile()) return notFound();
    } catch {
      return notFound();
    }
    const type = contentType(filePath);
    const headers = {
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": type.startsWith("text/html") ? "no-cache" : "public, max-age=86400",
    };
    if (!type.startsWith("text/html")) return new Response(Bun.file(filePath), { headers });
    const origin = requestOrigin(url, (name) => req.headers.get(name));
    const html = withShareImage(await Bun.file(filePath).text(), origin);
    return new Response(html, { headers });
  },
});

const shownHost = host === "0.0.0.0" || host === "::" ? "localhost" : host;
console.log(`House site listening on http://${shownHost}:${port}`);
