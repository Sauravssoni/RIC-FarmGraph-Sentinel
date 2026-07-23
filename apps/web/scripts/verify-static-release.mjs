import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const out = path.resolve(process.cwd(), "out");
const failures = [];

function requireFile(relativePath, label = relativePath) {
  const absolutePath = path.join(out, relativePath);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    failures.push(`Missing ${label}: ${relativePath}`);
    return null;
  }
  if (statSync(absolutePath).size === 0) failures.push(`Empty ${label}: ${relativePath}`);
  return absolutePath;
}

function requireHtml(relativePath, markers = []) {
  const file = requireFile(relativePath, "route HTML");
  if (!file) return;
  const html = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!html.toLowerCase().includes(marker.toLowerCase())) {
      failures.push(`Route ${relativePath} is missing marker: ${marker}`);
    }
  }
}

function collectFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(full) : [full];
  });
}

if (!existsSync(out)) failures.push("Static export directory out/ does not exist");

const routes = [
  ["index.html", ["FarmGraph"]],
  ["command-centre/index.html", ["Crop-health operations command centre", "AI decision intelligence", "Next 72 hours", "Recommended next actions"]],
  ["demo/index.html", ["The complete proof in five acts", "Begin evaluator proof"]],
  ["field/scan/index.html", []],
  ["integrations/index.html", []],
  ["support/index.html", []],
  ["digital-twins/index.html", []],
  ["expert/index.html", []],
  ["learning/index.html", []],
  ["missions/index.html", []],
  ["outbreaks/index.html", []],
  ["governance/index.html", []],
  ["release-proof/index.html", []],
];

for (const [route, markers] of routes) requireHtml(route, markers);

const manifestPath = requireFile("manifest.webmanifest", "PWA manifest");
requireFile("sw.js", "service worker");
requireFile("icons/icon.svg", "SVG app icon");
requireFile("icons/icon-192.png", "192px PWA icon");
requireFile("icons/icon-512.png", "512px PWA icon");

if (manifestPath) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.name !== "FarmGraph Rakshak") failures.push("Unexpected PWA manifest name");
    if (manifest.display !== "standalone") failures.push("PWA manifest display must be standalone");
    if (!String(manifest.start_url || "").includes("command-centre")) failures.push("PWA manifest start_url must point to command centre");
  } catch (error) {
    failures.push(`Invalid PWA manifest JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const staticFiles = collectFiles(path.join(out, "_next", "static"));
if (staticFiles.length < 5) failures.push("Next static asset bundle is missing or unexpectedly small");

const modelFiles = collectFiles(path.join(out, "models"));
if (!modelFiles.some((file) => file.endsWith(".onnx"))) failures.push("No exported ONNX model found under out/models");

const ortFiles = collectFiles(path.join(out, "ort"));
if (!ortFiles.some((file) => file.endsWith(".wasm"))) failures.push("No exported ONNX Runtime WASM file found under out/ort");

const htmlCount = collectFiles(out).filter((file) => file.endsWith(".html")).length;
if (htmlCount < 70) failures.push(`Expected at least 70 exported HTML pages, found ${htmlCount}`);

const report = {
  schema: "farmgraph-static-release-verification/v1",
  verifiedAt: new Date().toISOString(),
  commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local",
  routesChecked: routes.map(([route]) => `/${route.replace(/index\.html$/, "")}`),
  htmlPages: htmlCount,
  nextStaticFiles: staticFiles.length,
  onnxModels: modelFiles.filter((file) => file.endsWith(".onnx")).length,
  wasmRuntimeFiles: ortFiles.filter((file) => file.endsWith(".wasm")).length,
  status: failures.length === 0 ? "PASS" : "FAIL",
  failures,
};

if (existsSync(out)) writeFileSync(path.join(out, "release-verification.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error("Static production release verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Static production release verified: ${htmlCount} HTML pages, ${staticFiles.length} Next assets, ${report.onnxModels} ONNX model(s), ${report.wasmRuntimeFiles} WASM runtime file(s).`);
