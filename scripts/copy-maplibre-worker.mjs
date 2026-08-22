// MapLibre 6 locates its worker via `import.meta.url`, and bails to an empty
// string when that isn't an http(s) URL — which is exactly what happens once a
// bundler has inlined the module. An empty worker URL resolves to the page
// itself, the browser gets text/html where it wanted JavaScript, and the map
// silently never initialises.
//
// So we serve the worker ourselves from /public and point MapLibre at it with
// setWorkerUrl(). The worker imports ./maplibre-gl-shared.mjs relatively, so
// both files have to land in the same directory.
//
// Runs from predev/prebuild to stay in step with whatever version is installed.

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "maplibre-gl", "dist");
const to = join(root, "public", "maplibre");

const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const { version } = JSON.parse(
  await readFile(join(root, "node_modules", "maplibre-gl", "package.json"), "utf8"),
);

await mkdir(to, { recursive: true });
for (const file of FILES) {
  await copyFile(join(from, file), join(to, file));
}

console.log(`copied maplibre ${version} worker assets → public/maplibre/`);
