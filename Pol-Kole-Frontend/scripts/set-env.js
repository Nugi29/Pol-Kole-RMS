const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const targetDevEnvPath = path.join(rootDir, 'src', 'environments', 'environment.development.ts');
const targetProdEnvPath = path.join(rootDir, 'src', 'environments', 'environment.ts');

const defaultEnv = {
  API_BASE_URL: 'http://localhost:8080/api',
  WS_BASE_URL: 'ws://localhost:8080/ws/orders',
  LOGIN_BG_IMAGE_URL: 'https://fqjltiegiezfetthbags.supabase.co/storage/v1/object/public/block.images/blocks/signin/signin-glass.jpg',
  PRODUCTION: 'false',
};

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

const parsedEnv = parseEnv(envPath);
const envConfig = { ...defaultEnv, ...parsedEnv, ...process.env };

function createEnvContent(isProd) {
  const apiUrl = envConfig.API_BASE_URL || defaultEnv.API_BASE_URL;
  const wsUrl = envConfig.WS_BASE_URL || defaultEnv.WS_BASE_URL;
  const loginBgImageUrl = envConfig.LOGIN_BG_IMAGE_URL || defaultEnv.LOGIN_BG_IMAGE_URL;

  return `export const environment = {
  production: ${isProd},
  apiUrl: '${apiUrl}',
  wsUrl: '${wsUrl}',
  loginBgImageUrl: '${loginBgImageUrl}',
};
`;
}

// Ensure environments directory exists
const envDir = path.join(rootDir, 'src', 'environments');
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

// Write environment files
fs.writeFileSync(targetDevEnvPath, createEnvContent(false), 'utf-8');
fs.writeFileSync(targetProdEnvPath, createEnvContent(true), 'utf-8');

console.log(' Successfully synchronized environment files from .env / defaults.');
