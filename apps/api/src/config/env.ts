type NodeEnv = "development" | "test" | "production";

function getEnvVar(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value;
}

export function getNodeEnv(): NodeEnv {
  const raw = getEnvVar("NODE_ENV");
  if (raw === "production" || raw === "test" || raw === "development") return raw;
  return "development";
}

export function getPort(): number {
  return 3001;
}

export function getMongoUri(): string {
  const uri = getEnvVar("MONGODB_URI");
  if (uri) return uri;

  if (getNodeEnv() === "production") {
    throw new Error("Missing MONGODB_URI");
  }

  return "mongodb://127.0.0.1:27017/nft_marketplace";
}

export function getCorsOrigins(): string[] {
  const raw = getEnvVar("CORS_ORIGIN");
  if (!raw) return ["http://localhost:3000", "http://127.0.0.1:3000"];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
