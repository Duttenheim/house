import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const script = fileURLToPath(new URL("../scripts/convert-tours.swift", import.meta.url));
const videoDir = path.join(root, "public", "videos");
const imageDir = path.join(root, "public", "images");

function movieSources() {
  let names = [];
  try {
    names = readdirSync(videoDir);
  } catch {
    return [];
  }
  return names.filter((name) => name.toLowerCase().endsWith(".mov"));
}

function olderThan(source, destination) {
  try {
    return statSync(source).mtimeMs > statSync(destination).mtimeMs;
  } catch {
    return true;
  }
}

function needsConversion(name) {
  const source = path.join(videoDir, name);
  const stem = name.slice(0, name.length - path.extname(name).length);
  const mp4 = path.join(videoDir, `${stem}.mp4`);
  const poster = path.join(imageDir, `${stem}.jpg`);
  return olderThan(source, mp4) || olderThan(source, poster);
}

export function convertTourVideos() {
  const pending = movieSources().filter(needsConversion);
  if (pending.length === 0) return;

  const result = spawnSync("swift", ["-suppress-warnings", script], { stdio: "inherit" });
  if (result.error) {
    console.error("Could not run Swift to convert tour movies.");
    console.error("Install the Xcode command line tools, then run: swift scripts/convert-tours.swift");
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
