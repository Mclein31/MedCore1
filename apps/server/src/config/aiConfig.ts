export interface AiConfig {
  geminiApiKey?: string;
  geminiModel: string;
  geminiProModel: string;
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
  isTestMode: boolean;
}

let envLoaded = false;
function loadEnvIfAvailable() {
  if (envLoaded) return;
  envLoaded = true;
  try {
    if (typeof process !== 'undefined' && typeof process.loadEnvFile === 'function') {
      process.loadEnvFile();
    }
  } catch {
    // .env file not present or already loaded
  }
}

export function getAiConfig(env?: Record<string, any>): AiConfig {
  loadEnvIfAvailable();
  const processEnv = typeof process !== 'undefined' ? process.env : {};
  const merged = { ...processEnv, ...(env || {}) };

  const isTestMode = merged.NODE_ENV === 'test';
  const geminiApiKey = merged.GEMINI_API_KEY ? String(merged.GEMINI_API_KEY).trim() : undefined;
  const geminiModel = merged.GEMINI_MODEL ? String(merged.GEMINI_MODEL).trim() : 'gemini-3.8-flash';
  const geminiProModel = merged.GEMINI_PRO_MODEL ? String(merged.GEMINI_PRO_MODEL).trim() : 'gemini-1.5-pro-latest';
  const cloudflareAccountId = merged.CLOUDFLARE_ACCOUNT_ID ? String(merged.CLOUDFLARE_ACCOUNT_ID).trim() : undefined;
  const cloudflareApiToken = merged.CLOUDFLARE_API_TOKEN ? String(merged.CLOUDFLARE_API_TOKEN).trim() : undefined;

  return {
    geminiApiKey,
    geminiModel,
    geminiProModel,
    cloudflareAccountId,
    cloudflareApiToken,
    isTestMode
  };
}

export function isAiEnabled(env?: Record<string, any>): boolean {
  const config = getAiConfig(env);
  if (config.isTestMode && !process.env.TEST_LIVE_AI) {
    return false;
  }
  return Boolean(config.geminiApiKey && config.geminiApiKey.length > 5);
}

