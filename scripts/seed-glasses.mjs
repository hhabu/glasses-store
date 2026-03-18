import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SEED_FILE = path.resolve(__dirname, "data", "glasses-seed.json");

function printHelp() {
  console.log(
    [
      "Seed glasses data to MockAPI.",
      "",
      "Usage:",
      "  node scripts/seed-glasses.mjs [--api-url=<url>] [--file=<path>] [--clear]",
      "",
      "Options:",
      "  --api-url=<url>  Override API URL (default: VITE_API_URL in environment).",
      "  --file=<path>    Seed JSON file path (default: scripts/data/glasses-seed.json).",
      "  --clear          Delete existing records before seeding.",
    ].join("\n")
  );
}

function parseArgs(argv) {
  const args = {
    apiUrl: "",
    file: DEFAULT_SEED_FILE,
    clear: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--clear") {
      args.clear = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }

    if (arg.startsWith("--api-url=")) {
      args.apiUrl = arg.slice("--api-url=".length).trim();
      continue;
    }

    if (arg.startsWith("--file=")) {
      const value = arg.slice("--file=".length).trim();
      args.file = path.resolve(process.cwd(), value);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

function normalizeApiUrl(value) {
  return (value || "").trim().replace(/\/+$/, "");
}

function parseApiUrlFromEnvText(content) {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    if (!trimmed.startsWith("VITE_API_URL=")) {
      continue;
    }
    const raw = trimmed.slice("VITE_API_URL=".length).trim();
    return raw.replace(/^['"]|['"]$/g, "");
  }
  return "";
}

async function readApiUrlFromEnvFiles() {
  const envFiles = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const filePath of envFiles) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const apiUrl = parseApiUrlFromEnvText(content);
      if (apiUrl) {
        return apiUrl;
      }
    } catch {
      // Ignore missing env files.
    }
  }

  return "";
}

function toSeedPayload(record) {
  const { id: _id, product_id: _productId, ...rest } = record || {};
  return rest;
}

async function loadSeedData(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Seed file must contain a non-empty JSON array.");
  }
  return parsed;
}

async function clearExistingRecords(apiUrl, existing) {
  let deleted = 0;

  for (const item of existing) {
    const routeId = item?.id ?? item?.product_id;
    if (routeId === undefined || routeId === null || routeId === "") {
      throw new Error(
        "Cannot clear existing records because one record has no route id (id/product_id)."
      );
    }
    await requestJson(`${apiUrl}/${routeId}`, { method: "DELETE" });
    deleted += 1;
  }

  return deleted;
}

async function seedRecords(apiUrl, seedData) {
  let created = 0;

  for (const item of seedData) {
    const payload = toSeedPayload(item);
    await requestJson(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    created += 1;
    process.stdout.write(`Seeded ${created}/${seedData.length}\r`);
  }

  process.stdout.write("\n");
  return created;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const apiUrl = normalizeApiUrl(
    args.apiUrl || process.env.VITE_API_URL || (await readApiUrlFromEnvFiles())
  );
  if (!apiUrl) {
    throw new Error("Missing API URL. Set VITE_API_URL or pass --api-url=<url>.");
  }

  const seedFile = args.file;
  const seedData = await loadSeedData(seedFile);
  let existingList = [];

  try {
    const existing = await requestJson(apiUrl);
    existingList = Array.isArray(existing) ? existing : [];
  } catch (error) {
    if (error?.status !== 404) {
      throw error;
    }
    // Some mock backends return 404 when collection exists but has no records.
    existingList = [];
  }

  console.log(`Seed file: ${seedFile}`);
  console.log(`API URL: ${apiUrl}`);
  console.log(`Current records: ${existingList.length}`);

  if (existingList.length > 0 && !args.clear) {
    throw new Error(
      "Endpoint is not empty. Re-run with --clear or use an empty/new resource URL."
    );
  }

  if (existingList.length > 0 && args.clear) {
    const deleted = await clearExistingRecords(apiUrl, existingList);
    console.log(`Deleted ${deleted} existing record(s).`);
  }

  const created = await seedRecords(apiUrl, seedData);
  const finalData = await requestJson(apiUrl);
  const finalCount = Array.isArray(finalData) ? finalData.length : "unknown";

  console.log(`Seed complete. Created ${created} record(s).`);
  console.log(`Final record count: ${finalCount}`);
}

main().catch((error) => {
  console.error("[seed-glasses] Failed:", error.message);
  if (error?.body) {
    console.error("[seed-glasses] API response:", error.body);
  }
  process.exitCode = 1;
});
