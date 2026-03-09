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
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  
  // Add Vercel URL if available
  const vercelUrl = getEnvVar("VERCEL_URL");
  if (vercelUrl) {
    defaults.push(`https://${vercelUrl}`);
  }

  // Add Production URL if available
  const prodUrl = getEnvVar("NEXT_PUBLIC_APP_URL");
  if (prodUrl) {
    defaults.push(prodUrl);
  }

  if (!raw) return defaults;
  
  return [
    ...defaults,
    ...raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  ];
}
