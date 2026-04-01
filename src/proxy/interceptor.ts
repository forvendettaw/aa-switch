import type { Request, Response, NextFunction } from 'express';
import { readFileSync, existsSync } from 'fs';
import { loadConfig, normalizeToContextChain } from '../config/loader.js';
import type { Config } from '../config/schema.js';

/**
 * 从环境变量解析 API Key
 * 支持 "env:VAR_NAME" 格式
 */
export function resolveApiKey(keySpec: string): string {
  if (keySpec.startsWith('env:')) {
    const envVar = keySpec.slice(4);
    const value = process.env[envVar];
    if (!value) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
    return value;
  }
  return keySpec;
}

/**
 * 读取 ContextChain 中的所有 Markdown 文件并拼接内容
 */
export function loadContextChainContent(chain: string[]): string {
  const contents: string[] = [];

  for (const filePath of chain) {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      contents.push(content);
    }
    // 文件不存在时静默跳过（可能还没创建）
  }

  return contents.join('\n\n---\n\n');
}

/**
 * 检测请求协议类型
 */
export type ProtocolType = 'anthropic' | 'openai' | 'unknown';

export function detectProtocol(path: string): ProtocolType {
  if (path.includes('/v1/messages')) {
    return 'anthropic';
  }
  if (path.includes('/v1/chat/completions')) {
    return 'openai';
  }
  return 'unknown';
}

/**
 * 为 Anthropic 请求追加 System Prompt
 * Anthropic 格式: { system: "...", messages: [...] }
 */
export function injectAnthropicSystem(body: Record<string, unknown>, injectedContent: string): Record<string, unknown> {
  const existingSystem = (body.system as string) || '';
  const newSystem = existingSystem
    ? `${existingSystem}\n\n---\n\n${injectedContent}`
    : injectedContent;

  return {
    ...body,
    system: newSystem,
  };
}

/**
 * 为 OpenAI 请求追加 System Prompt
 * OpenAI 格式: { messages: [{role: "system", content: "..."}, ...] }
 */
export function injectOpenAISystem(body: Record<string, unknown>, injectedContent: string): Record<string, unknown> {
  const messages = (body.messages as any[]) || [];

  // 查找现有的 system 消息
  const systemIndex = messages.findIndex(
    (m: { role?: string }) => m.role === 'system'
  );

  let newMessages: any[];
  if (systemIndex >= 0) {
    // 追加到现有 system 消息
    const existingContent = messages[systemIndex].content || '';
    newMessages = [...messages];
    newMessages[systemIndex] = {
      ...messages[systemIndex],
      content: `${existingContent}\n\n---\n\n${injectedContent}`,
    };
  } else {
    // 在数组开头插入 system 消息
    newMessages = [
      { role: 'system', content: injectedContent },
      ...messages,
    ];
  }

  return {
    ...body,
    messages: newMessages,
  };
}

/**
 * 创建上下文注入拦截器
 */
export function createContextInjector(config: Config, configBaseDir: string) {
  const contextChain = normalizeToContextChain(config, configBaseDir);
  const injectedContent = loadContextChainContent(contextChain);

  return (req: Request, res: Response, next: NextFunction) => {
    // 仅处理 JSON 请求体
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const protocol = detectProtocol(req.path);

    if (protocol === 'anthropic') {
      req.body = injectAnthropicSystem(req.body as Record<string, unknown>, injectedContent);
    } else if (protocol === 'openai') {
      req.body = injectOpenAISystem(req.body as Record<string, unknown>, injectedContent);
    }
    // unknown 协议直接透传

    next();
  };
}
