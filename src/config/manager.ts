import { watch } from 'fs';
import { dirname } from 'path';
import { loadConfig, normalizeToContextChain } from './loader.js';
import type { Config, ContextChain } from './schema.js';
import { loadContextChainContent } from '../proxy/interceptor.js';

/**
 * ConfigManager - 配置管理单例
 * 负责加载配置、热重载和提供当前 context chain
 */
export class ConfigManager {
  private config: Config;
  private configPath: string;
  private configBaseDir: string;
  private contextChain: ContextChain = [];
  private injectedContent: string = '';
  private watcher: ReturnType<typeof watch> | null = null;
  private listeners: Set<() => void> = new Set();

  constructor(configPath: string) {
    this.configPath = configPath;
    this.configBaseDir = dirname(configPath);
    this.config = loadConfig(this.configPath);
    this.rebuildContextChain();
  }

  /**
   * 获取当前配置
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * 获取当前注入的上下文内容
   */
  getInjectedContent(): string {
    return this.injectedContent;
  }

  /**
   * 获取当前 ContextChain
   */
  getContextChain(): ContextChain {
    return this.contextChain;
  }

  /**
   * 重建 ContextChain 并更新注入内容
   */
  private rebuildContextChain(): void {
    this.contextChain = normalizeToContextChain(this.config, this.configBaseDir);
    this.injectedContent = loadContextChainContent(this.contextChain);
    console.log(`[ConfigManager] Context chain updated: ${this.contextChain.length} files`);
  }

  /**
   * 重新加载配置
   */
  reload(): void {
    console.log(`[ConfigManager] Reloading config from ${this.configPath}`);
    this.config = loadConfig(this.configPath);
    this.rebuildContextChain();
    this.notifyListeners();
  }

  /**
   * 监听配置变化（热重载）
   */
  startWatching(): void {
    if (this.watcher) {
      return;
    }

    this.watcher = watch(this.configPath, (eventType) => {
      if (eventType === 'change') {
        console.log(`[ConfigManager] Config file changed, reloading...`);
        this.reload();
      }
    });

    console.log(`[ConfigManager] Watching config file: ${this.configPath}`);
  }

  /**
   * 停止监听
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log(`[ConfigManager] Stopped watching config file`);
    }
  }

  /**
   * 添加配置变更监听器
   */
  onChange(listener: () => void): void {
    this.listeners.add(listener);
  }

  /**
   * 移除配置变更监听器
   */
  offChange(listener: () => void): void {
    this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/**
 * 获取全局 ConfigManager 实例
 */
let globalManager: ConfigManager | null = null;

export function getConfigManager(configPath: string): ConfigManager {
  if (!globalManager) {
    globalManager = new ConfigManager(configPath);
  }
  return globalManager;
}

export function resetConfigManager(): void {
  if (globalManager) {
    globalManager.stopWatching();
    globalManager = null;
  }
}
