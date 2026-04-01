import { startProxyServer } from './proxy/proxy.js';
import { loadConfig } from './config/loader.js';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// 获取配置文件路径
// 默认: ~/.aa-switch/config.yaml
function getConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
  return resolve(homeDir, '.aa-switch', 'config.yaml');
}

function main() {
  const configPath = getConfigPath();
  const configBaseDir = dirname(configPath);

  console.log(`📄 Loading config from: ${configPath}`);

  const config = loadConfig(configPath);

  console.log(`✅ Config loaded successfully`);
  console.log(`   Server: ${config.server.host}:${config.server.port}`);
  console.log(`   Active Context:`);
  if (config.active_context.advanced_context_chain) {
    console.log(`     - Advanced mode (${config.active_context.advanced_context_chain.length} files)`);
  } else {
    if (config.active_context.persona) {
      console.log(`     - Persona: ${config.active_context.persona}`);
    }
    console.log(`     - Inject User Profile: ${config.active_context.inject_user_profile}`);
  }

  startProxyServer(config, configBaseDir);
}

main();
