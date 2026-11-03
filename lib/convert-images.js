import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/convert-heic.py", import.meta.url));

export function convertHeicImages() {
  const result = spawnSync("python", [script], { stdio: "inherit" });
  if (result.error) {
    console.error("Could not run Python to convert HEIC images.");
    console.error("Install Python, then run: pip install -r requirements.txt");
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
