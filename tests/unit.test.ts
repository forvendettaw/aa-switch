import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';

// 测试配置目录
const TEST_CONFIG_DIR = resolve(process.cwd(), '.test-unit-aa-switch');
const TEST_CONFIG_PATH = resolve(TEST_CONFIG_DIR, 'config.yaml');
const TEST_PERSONAS_DIR = resolve(TEST_CONFIG_DIR, 'personas');
const TEST_USER_MD = resolve(TEST_CONFIG_DIR, 'user.md');
const TEST_CODER_MD = resolve(TEST_CONFIG_DIR, 'personas/coder.md');
const TEST_MONICA_MD = resolve(TEST_CONFIG_DIR, 'personas/monica.md');

// 测试配置
function setupTestConfig() {
  mkdirSync(TEST_CONFIG_DIR, { recursive: true });
  mkdirSync(TEST_PERSONAS_DIR, { recursive: true });

  writeFileSync(TEST_USER_MD, '# User Profile\n\nThis is a test user profile.');
  writeFileSync(TEST_CODER_MD, '# Coder Persona\n\nYou are a professional coder.');
  writeFileSync(TEST_MONICA_MD, '# Monica Persona\n\nYou are Monica, a helpful assistant.');

  const testConfig = {
    server: { port: 18080, host: '127.0.0.1' },
    active_context: { persona: 'coder', inject_user_profile: true },
    providers: {
      test_provider: {
        base_url: 'http://127.0.0.1:18081',
        api_key: 'env:TEST_API_KEY',
      },
    },
    routes: {
      anthropic: { provider: 'test_provider' },
      openai: { provider: 'test_provider' },
    },
  };

  writeFileSync(TEST_CONFIG_PATH, JSON.stringify(testConfig, null, 2));
}

function cleanupTestConfig() {
  if (existsSync(TEST_CONFIG_DIR)) {
    rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
  }
}

// 读取并更新配置
function updateConfig(updates: any) {
  const content = readFileSync(TEST_CONFIG_PATH, 'utf-8');
  const config = JSON.parse(content);
  const newConfig = { ...config, ...updates };
  writeFileSync(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2));
  return newConfig;
}

describe('Unit: ConfigLoader', () => {
  let loadConfig: any;
  let normalizeToContextChain: any;

  beforeAll(async () => {
    setupTestConfig();
    const loaderModule = await import('../src/config/loader.js');
    loadConfig = loaderModule.loadConfig;
    normalizeToContextChain = loaderModule.normalizeToContextChain;
  });

  it('should parse config correctly', () => {
    const config = loadConfig(TEST_CONFIG_PATH);
    expect(config.server.port).toBe(18080);
    expect(config.active_context.persona).toBe('coder');
  });

  it('should normalize context chain from simple mode', () => {
    const config = loadConfig(TEST_CONFIG_PATH);
    const chain = normalizeToContextChain(config, TEST_CONFIG_DIR);

    expect(chain).toContain(resolve(TEST_CONFIG_DIR, 'user.md'));
    expect(chain).toContain(resolve(TEST_CONFIG_DIR, 'personas/coder.md'));
  });

  it('should normalize context chain from advanced mode', () => {
    updateConfig({
      active_context: {
        advanced_context_chain: ['./personas/monica.md'],
      },
    });

    const config = loadConfig(TEST_CONFIG_PATH);
    const chain = normalizeToContextChain(config, TEST_CONFIG_DIR);

    expect(chain).toHaveLength(1);
    expect(chain[0]).toContain('monica.md');

    // 恢复简单模式
    updateConfig({
      active_context: { persona: 'coder', inject_user_profile: true },
    });
  });
});

describe('Unit: Context Injection', () => {
  let detectProtocol: any;
  let injectAnthropicSystem: any;
  let injectOpenAISystem: any;

  beforeAll(async () => {
    const interceptorModule = await import('../src/proxy/interceptor.js');
    detectProtocol = interceptorModule.detectProtocol;
    injectAnthropicSystem = interceptorModule.injectAnthropicSystem;
    injectOpenAISystem = interceptorModule.injectOpenAISystem;
  });

  it('should detect OpenAI protocol', () => {
    expect(detectProtocol('/v1/chat/completions')).toBe('openai');
    expect(detectProtocol('/v1/chat/completions?model=gpt-4')).toBe('openai');
  });

  it('should detect Anthropic protocol', () => {
    expect(detectProtocol('/v1/messages')).toBe('anthropic');
  });

  it('should detect unknown protocol', () => {
    expect(detectProtocol('/v1/unknown')).toBe('unknown');
  });

  it('should inject system content for OpenAI format', () => {
    const body = {
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const result = injectOpenAISystem(body, 'INJECTED CONTENT');

    expect(result.messages[0].role).toBe('system');
    expect(result.messages[0].content).toBe('INJECTED CONTENT');
    expect(result.messages[1].role).toBe('user');
  });

  it('should append to existing system message for OpenAI', () => {
    const body = {
      messages: [
        { role: 'system', content: 'ORIGINAL' },
        { role: 'user', content: 'Hello' },
      ],
    };

    const result = injectOpenAISystem(body, 'INJECTED');

    expect(result.messages[0].content).toBe('ORIGINAL\n\n---\n\nINJECTED');
  });

  it('should inject system content for Anthropic format', () => {
    const body = {
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const result = injectAnthropicSystem(body, 'INJECTED CONTENT');

    expect(result.system).toBe('INJECTED CONTENT');
  });

  it('should append to existing system for Anthropic', () => {
    const body = {
      system: 'ORIGINAL',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const result = injectAnthropicSystem(body, 'INJECTED');

    expect(result.system).toBe('ORIGINAL\n\n---\n\nINJECTED');
  });
});
