import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const envFile = path.resolve(process.cwd(), ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65534).default(5180),
  VAULT_PATH: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
});

const env = EnvSchema.parse(process.env);
const isDev = process.argv.includes("--dev");

export const config = {
  isDev,
  /** Only this computer can reach the server (BRIEF). */
  host: "127.0.0.1",
  /** The UI port. In dev Vite serves the UI here and the API runs on `uiPort + 1`. */
  uiPort: env.PORT,
  port: isDev ? env.PORT + 1 : env.PORT,
  dataDir: path.resolve(process.cwd(), "data"),
  migrationsDir: path.resolve(process.cwd(), "drizzle"),
  clientDir: path.resolve(process.cwd(), "dist/client"),
  vaultPath: env.VAULT_PATH || undefined,
  youtubeApiKey: env.YOUTUBE_API_KEY || undefined,
} as const;
