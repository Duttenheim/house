import { readdirSync, renameSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const imageDir = fileURLToPath(new URL("../public/images/", import.meta.url));
const suffixes = new Set([".png", ".jpg", ".jpeg"]);

function sameFile(left, right) {
  try {
    const a = statSync(left);
    const b = statSync(right);
    return a.dev === b.dev && a.ino === b.ino;
  } catch {
    return false;
  }
}

export function lowercaseImageExtensions() {
  let names;
  try {
    names = readdirSync(imageDir);
  } catch {
    console.error(`No image directory at ${imageDir}`);
    process.exit(1);
  }

  for (const name of names) {
    const ext = path.extname(name);
    const lowered = ext.toLowerCase();
    if (!suffixes.has(lowered) || ext === lowered) continue;

    const source = path.join(imageDir, name);
    let info;
    try {
      info = statSync(source);
    } catch {
      continue;
    }
    if (!info.isFile()) continue;

    const destination = path.join(imageDir, `${name.slice(0, -ext.length)}${lowered}`);
    if (statSync(destination, { throwIfNoEntry: false }) && !sameFile(source, destination)) {
      console.error(`leave ${name}: ${path.basename(destination)} already exists`);
      continue;
    }

    const temporary = path.join(imageDir, `.${path.basename(name, ext)}.renaming${lowered}`);
    renameSync(source, temporary);
    renameSync(temporary, destination);
    console.log(`renamed ${name} -> ${path.basename(destination)}`);
  }
}
