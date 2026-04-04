const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");

let _client = null;

function getVaultUrl() {
  if (process.env.AZURE_KEY_VAULT_URL) {
    return process.env.AZURE_KEY_VAULT_URL;
  }

  const vaultName = process.env.AZURE_KEY_VAULT_NAME || "hr-portal-kv";
  return `https://${vaultName}.vault.azure.net/`;
}

/**
 * Returns a lazily-initialised SecretClient.
 * Authentication order (via DefaultAzureCredential):
 *   1. Environment variables  (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)
 *   2. Workload / Managed Identity (when deployed on Azure)
 *   3. Azure CLI / VS Code credentials (local dev fallback)
 */
function getClient() {
  if (!_client) {
    const credential = new DefaultAzureCredential();
    _client = new SecretClient(getVaultUrl(), credential);
  }
  return _client;
}

/**
 * Retrieve a single secret value by name.
 * @param {string} name  - Key Vault secret name (e.g. "DATABASE-URL")
 * @returns {Promise<string>} The secret value
 */
async function getSecret(name) {
  const client = getClient();
  const secret = await client.getSecret(name);
  return secret.value;
}

/**
 * Create or update a secret in Key Vault.
 * @param {string} name   - Secret name
 * @param {string} value  - Secret value
 */
async function setSecret(name, value) {
  const client = getClient();
  await client.setSecret(name, value);
}

/**
 * Delete a secret (soft-delete).
 * @param {string} name - Secret name
 */
async function deleteSecret(name) {
  const client = getClient();
  await client.beginDeleteSecret(name);
}

/**
 * List all non-deleted secret names in the vault.
 * @returns {Promise<string[]>}
 */
async function listSecretNames() {
  const client = getClient();
  const names = [];
  for await (const secretProps of client.listPropertiesOfSecrets()) {
    names.push(secretProps.name);
  }
  return names;
}

/**
 * Load all Key Vault secrets into process.env.
 * Secret names use hyphens (KV convention) which are converted to
 * underscores so they map cleanly to env var names.
 *   e.g.  "DATABASE-URL"  →  process.env.DATABASE_URL
 *
 * Call this once at app startup before any other module reads config.
 *
 * @returns {Promise<string[]>} Names of secrets that were loaded
 */
async function loadSecretsToEnv() {
  const client = getClient();
  const loaded = [];

  for await (const secretProps of client.listPropertiesOfSecrets()) {
    const name = secretProps.name;
    const envKey = name.replace(/-/g, "_").toUpperCase();

    try {
      const secret = await client.getSecret(name);
      const value =
        typeof secret.value === "string" ? secret.value.trim() : secret.value;
      process.env[envKey] = value;
      loaded.push(name);
    } catch (err) {
      console.warn(`[KeyVault] Could not load secret "${name}":`, err.message);
    }
  }

  return loaded;
}

module.exports = {
  getSecret,
  setSecret,
  deleteSecret,
  listSecretNames,
  loadSecretsToEnv,
};
