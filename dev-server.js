import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { contentType, notFoundFile, resolvePublicPath } from "./lib/files.js";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

async function sendFile(res, filePath, status = 200) {
  const data = await readFile(filePath);
  const ext = filePath.toLowerCase();
  res.writeHead(status, {
    "Content-Type": contentType(filePath),
    "Content-Length": data.length,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": ext.endsWith(".html") ? "no-cache" : "public, max-age=3600",
  });
  res.end(data);
}

async function sendNotFound(res) {
  try {
    const info = await stat(notFoundFile);
    if (!info.isFile()) throw new Error("missing 404 page");
    await sendFile(res, notFoundFile, 404);
  } catch {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    let pathname = url.pathname;
    if (pathname.endsWith("/")) pathname += "index.html";
    const filePath = resolvePublicPath(pathname);
    if (!filePath) {
      res.writeHead(400, {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      });
      res.end("Bad request");
      return;
    }
    let info;
    try {
      info = await stat(filePath);
    } catch {
      await sendNotFound(res);
      return;
    }
    if (!info.isFile()) {
      await sendNotFound(res);
      return;
    }
    await sendFile(res, filePath, 200);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      });
    }
    res.end("Server error");
  }
});

server.listen(port, host, () => {
  console.log(`House site ready at http://${host}:${port}`);
});

server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
