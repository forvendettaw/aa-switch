import { startProxyServer } from './proxy/proxy.js';
import { getConfigManager } from './config/manager.js';
import { resolve } from 'path';

// 获取配置文件路径
// 默认: ~/.aa-switch/config.yaml
function getConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
  return resolve(homeDir, '.aa-switch', 'config.yaml');
}

function main() {
  const configPath = getConfigPath();

  console.log(`📄 Loading config from: ${configPath}`);

  // 初始化配置管理器
  const configManager = getConfigManager(configPath);
  const config = configManager.getConfig();

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

  startProxyServer(configManager);
}

main();
