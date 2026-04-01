import { parse } from 'yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ConfigSchema, ContextChainSchema } from './schema.js';
import type { Config, ContextChain } from './schema.js';

/**
 * 从指定路径加载并校验 YAML 配置文件
 */
export function loadConfig(configPath: string): Config {
  const rawContent = readFileSync(configPath, 'utf-8');
  const rawConfig = parse(rawContent);
  return ConfigSchema.parse(rawConfig);
}

/**
 * 将配置归一化为 ContextChain 数组
 *
 * 极简模式:
 *   - persona: "coder" => ["./personas/coder.md"]
 *   - inject_user_profile: true => ["./user.md"]
 *
 * 高级模式:
 *   - 直接使用 advanced_context_chain
 *
 * 规则: 高级模式会覆盖极简模式
 */
export function normalizeToContextChain(
  config: Config,
  baseDir: string
): ContextChain {
  const { active_context } = config;

  // 高级模式优先
  if (active_context.advanced_context_chain) {
    return active_context.advanced_context_chain.map((p: string) => resolve(baseDir, p));
  }

  const chain: ContextChain = [];

  // 注入 user profile
  if (active_context.inject_user_profile) {
    chain.push(resolve(baseDir, './user.md'));
  }

  // 注入 persona
  if (active_context.persona) {
    chain.push(resolve(baseDir, `./personas/${active_context.persona}.md`));
  }

  return chain;
}
