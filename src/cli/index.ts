import { Command } from 'commander';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse, stringify } from 'yaml';
import { startProxyServer } from '../proxy/proxy.js';
import { getConfigManager, resetConfigManager } from '../config/manager.js';
import { loadConfig } from '../config/loader.js';

/**
 * 获取配置文件路径
 */
function getConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
  return resolve(homeDir, '.aa-switch', 'config.yaml');
}

/**
 * 打印状态信息
 */
async function statusAction() {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    console.log('   Run "aa-switch start" to initialize the server first.');
    return;
  }

  try {
    const config = loadConfig(configPath);
    const configManager = getConfigManager(configPath);
    const chain = configManager.getContextChain();

    console.log('🟢 Status: Running');
    console.log(`   Server: ${config.server.host}:${config.server.port}`);
    console.log(`   👤 Active Persona: ${config.active_context.persona || 'none'}`);
    console.log(`   ⚙️  User Profile Injected: ${config.active_context.inject_user_profile ? 'true' : 'false'}`);

    if (config.active_context.advanced_context_chain) {
      console.log(`   📋 Advanced Mode: ${config.active_context.advanced_context_chain.length} files`);
    }

    console.log(`   📁 Context Chain (${chain.length} files):`);
    for (const file of chain) {
      console.log(`      - ${file}`);
    }

    // 显示当前 provider
    const routeKeys = Object.keys(config.routes);
    if (routeKeys.length > 0) {
      console.log(`   🌐 Routes:`);
      for (const [name, route] of Object.entries(config.routes)) {
        const provider = config.providers[route.provider];
        if (provider) {
          console.log(`      - ${name}: ${provider.base_url}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to load config:', error);
  }
}

/**
 * 切换 persona
 */
async function useAction(personaName: string) {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    console.log('   Please create the config file first.');
    return;
  }

  try {
    // 读取当前配置
    const rawContent = readFileSync(configPath, 'utf-8');
    const config = parse(rawContent);

    // 更新 persona
    if (!config.active_context) {
      config.active_context = {};
    }
    config.active_context.persona = personaName;

    // 保存配置 - 使用 YAML.stringify 保留格式
    const newContent = stringify(config);
    writeFileSync(configPath, newContent, 'utf-8');

    console.log(`✅ 成功切换上下文至: ${personaName}.md`);

    // 如果服务正在运行，通知热重载
    try {
      const configManager = getConfigManager(configPath);
      configManager.reload();
      console.log(`🔄 配置已热重载，新的 context chain 将立即生效`);
    } catch {
      // 服务未运行，忽略
    }
  } catch (error) {
    console.error('❌ Failed to switch persona:', error);
  }
}

/**
 * 启动服务
 */
async function startAction() {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    console.log('   Please create the config file first.');
    console.log(`   Expected location: ${configPath}`);
    return;
  }

  try {
    // 初始化配置管理器
    const configManager = getConfigManager(configPath);
    const config = configManager.getConfig();

    console.log(`📄 Loading config from: ${configPath}`);
    console.log(`✅ Config loaded successfully`);
    console.log(`   Server: ${config.server.host}:${config.server.port}`);

    // 启动代理服务器
    startProxyServer(configManager);

    // 保持进程运行
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down aa-switch...');
      resetConfigManager();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * 创建 CLI 程序
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name('aa-switch')
    .description('All-Agent Switch - Local Context Gateway')
    .version('1.0.0');

  // start 命令
  program
    .command('start')
    .description('Start the aa-switch proxy server')
    .action(startAction);

  // use 命令
  program
    .command('use <persona_name>')
    .description('Switch to a different persona')
    .action(useAction);

  // status 命令
  program
    .command('status')
    .description('Show current status and configuration')
    .action(statusAction);

  return program;
}

/**
 * 运行 CLI
 */
export function runCLI(args: string[] = process.argv) {
  const program = createCLI();
  program.parse(args);
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI();
}
