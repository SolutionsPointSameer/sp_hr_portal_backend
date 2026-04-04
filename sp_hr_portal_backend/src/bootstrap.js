const path = require("path");
const { spawn } = require("child_process");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { loadSecretsToEnv } = require("./lib/keyVault");

async function loadStartupSecrets() {
  const hadDatabaseUrl = Boolean(process.env.DATABASE_URL);

  try {
    const loadedSecrets = await loadSecretsToEnv();
    process.env.KEYVAULT_SECRETS_LOADED = "1";
    return loadedSecrets;
  } catch (err) {
    if (hadDatabaseUrl) {
      console.warn(
        `[KeyVault] Failed to load startup secrets, falling back to existing environment variables: ${err.message}`
      );
      return [];
    }

    throw err;
  }
}

function runPrismaMigrate() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["prisma", "migrate", "deploy"],
      {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit",
        shell: process.platform === "win32",
        env: process.env,
      }
    );

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Prisma migrate deploy exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

async function bootstrap() {
  const loadedSecrets = await loadStartupSecrets();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL was not loaded from Azure Key Vault.");
  }

  if (loadedSecrets.length > 0) {
    console.log(
      `[KeyVault] Loaded ${loadedSecrets.length} secret(s) before migrations: ${loadedSecrets.join(", ")}`
    );
  } else {
    console.log("[KeyVault] No startup secrets were loaded before migrations.");
  }

  await runPrismaMigrate();

  const { startServer } = require("./index");
  await startServer();
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error("[bootstrap] Failed to start API:", err.message);
    process.exit(1);
  });
}

module.exports = { bootstrap };
