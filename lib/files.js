import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const publicRoot = fileURLToPath(new URL("../public/", import.meta.url));
export const notFoundFile = join(publicRoot, "404.html");

export const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

export function contentType(filePath) {
  return types[extname(filePath).toLowerCase()] || "application/octet-stream";
}

const shareImagePath = "/images/first-floor-4.jpg";

export function withShareImage(html, origin) {
  return html.replaceAll(`content="${shareImagePath}"`, `content="${origin}${shareImagePath}"`);
}

export function requestOrigin(url, header) {
  const forwardedHost = header("x-forwarded-host");
  const host = firstHeader(forwardedHost) || url.host;
  const forwardedProto = header("x-forwarded-proto");
  const proto = firstHeader(forwardedProto) || url.protocol.replace(/:$/, "");
  return `${proto}://${host}`;
}

function firstHeader(value) {
  if (!value) return "";
  return String(value).split(",")[0].trim();
}

export function resolvePublicPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const relative = decoded.replace(/^[/\\]+/, "");
  const candidate = normalize(join(publicRoot, relative));
  const prefix = publicRoot.endsWith(sep) ? publicRoot : publicRoot + sep;
  if (candidate !== publicRoot && !candidate.startsWith(prefix)) return null;
  return candidate;
}
