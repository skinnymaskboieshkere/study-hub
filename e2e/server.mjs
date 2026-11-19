// Starts the built app for end-to-end tests on a copy of the sample vault and an empty
// database in a temporary folder: tests never touch data/ or the real vault.
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = mkdtempSync(path.join(tmpdir(), "study-hub-e2e-"));
const vault = path.join(root, "vault");
cpSync(path.resolve("e2e/fixtures/vault"), vault, { recursive: true });

const server = spawn(process.execPath, ["dist/server/index.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    VAULT_PATH: vault,
    DATA_DIR: path.join(root, "data"),
    PORT: process.env.E2E_PORT ?? "5200",
  },
});

const stop = () => {
  server.kill();
  rmSync(root, { recursive: true, force: true });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => {
  rmSync(root, { recursive: true, force: true });
  process.exit(code ?? 0);
});
