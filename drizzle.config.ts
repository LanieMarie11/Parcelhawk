import path from "node:path";
import { config } from "dotenv";

// Load .env from project root (where package.json lives) and override shell env
const envPath = path.resolve(process.cwd(), ".env");
config({ path: envPath, override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Create a .env file with DATABASE_URL=your_neon_connection_string");
}
// Quick check: connection should go to Neon, not 10.10.7.111
const host = new URL(databaseUrl).hostname;
if (host.includes("10.10.7")) {
  throw new Error(
    `DATABASE_URL still points to 10.10.7.111. Update .env with your Neon URL and ensure no other env (shell/system) sets DATABASE_URL. Current host: ${host}`
  );
}

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
