import { spawn } from "node:child_process";
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const port = 4173;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn(process.execPath, ["dev-server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
  stdio: "inherit",
  windowsHide: true,
});

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: "127.0.0.1", port, path: pathname }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          type: res.headers["content-type"] || "",
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on("error", reject);
  });
}

async function waitUntilReady() {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < 10000) {
    try {
      const result = await request("/");
      if (result.status === 200) return;
      lastError = new Error(`status ${result.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw lastError || new Error("Dev server did not start");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let failed = false;
try {
  await waitUntilReady();
  const home = await request("/");
  const html = home.body.toString("utf8");
  assert(home.status === 200, `home status ${home.status}`);
  assert(home.type.includes("text/html"), `home type ${home.type}`);
  assert(html.includes("Second bedroom"), "home is missing the second bedroom");
  assert(html.includes("Kitchen"), "home is missing the kitchen");
  assert(html.includes('id="rooms"'), "home is missing the rooms");
  assert(html.includes('id="viewing-calendar"'), "home is missing the viewing calendar");
  assert(html.includes("house-grisslingevagen13d/30min"), "home is missing the Cal.com link");

  const css = await request("/css/styles.css");
  assert(css.status === 200 && css.type.includes("text/css"), "stylesheet did not load");
  assert(css.body.toString("utf8").includes(".hero"), "stylesheet is missing the hero");

  const js = await request("/js/main.js");
  assert(js.status === 200, "script did not load");
  assert(js.body.toString("utf8").includes("lightbox"), "script is missing the lightbox");

  const icon = await request("/favicon.svg");
  assert(icon.status === 200 && icon.type.includes("image/svg"), "favicon did not load");

  const hero = await request("/images/landing-room-1.jpg");
  assert(hero.status === 200 && hero.type.includes("image/jpeg"), `hero type ${hero.type}`);
  assert(hero.body.length > 10000, "hero image looks empty");

  const missing = await request("/no-such-page");
  assert(missing.status === 404, `expected 404, got ${missing.status}`);
  assert(missing.body.toString("utf8").includes("not on the tour"), "404 page is missing its message");

  const escaped = await request("/css/../../package.json");
  const escapedText = escaped.body.toString("utf8");
  assert(escaped.status === 404 || escaped.status === 400, `traversal status ${escaped.status}`);
  assert(!escapedText.includes('"private"'), "server exposed a file outside public/");

  console.log("Smoke test passed");
} catch (error) {
  console.error(error);
  failed = true;
} finally {
  child.kill();
}

if (failed) process.exit(1);
