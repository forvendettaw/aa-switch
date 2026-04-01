import type { Server } from 'http';
import express from 'express';
import type { Express, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Config } from '../config/schema.js';
import { resolveApiKey } from './interceptor.js';
import { ConfigManager } from '../config/manager.js';

/**
 * 创建 HTTP 代理中间件
 * 关键点：SSE 响应必须使用零缓冲透传
 */
export function createProxy(config: Config, configManager: ConfigManager) {
  return createProxyMiddleware({
    // 代理目标
    router: (req: Request) => {
      // 根据路由匹配 provider
      // req.path 在挂载到 /v1 后是相对于 /v1 的路径
      const path = req.path;
      let providerName = '';

      if (path.includes('/messages')) {
        providerName = config.routes.anthropic?.provider || '';
      } else if (path.includes('/chat/completions')) {
        providerName = config.routes.openai?.provider || '';
      }

      const provider = config.providers[providerName];
      if (!provider) {
        throw new Error(`Provider not found: ${providerName}`);
      }

      return provider.base_url;
    },

    // 零缓冲透传：绝对禁止缓冲 SSE 响应
    on: {
      // 凭证替换：在转发前替换 API Key
      proxyReq: (proxyReq: any, req: Request) => {
        const path = req.path;
        let providerName = '';

        if (path.includes('/messages')) {
          providerName = config.routes.anthropic?.provider || '';
        } else if (path.includes('/chat/completions')) {
          providerName = config.routes.openai?.provider || '';
        }

        const provider = config.providers[providerName];
        if (provider) {
          // 替换 Authorization header
          const resolvedKey = resolveApiKey(provider.api_key);
          proxyReq.setHeader('Authorization', `Bearer ${resolvedKey}`);
        }

        return proxyReq;
      },

      // SSE 响应处理：零缓冲透传
      proxyRes: (proxyRes: any, req: Request, res: Response) => {
        // 检查是否是流式响应 (SSE)
        const contentType = proxyRes.headers['content-type'] as string || '';

        if (contentType.includes('text/event-stream')) {
          // SSE 必须使用原始 pipe，禁止任何缓冲
          // 仅设置必要的 headers，保持流完整性
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          // 零缓冲透传 - 关键代码
          proxyRes.pipe(res as any);
        }
        // 非 SSE 响应由 express 默认处理
      },
    },

    // 改变请求目标
    changeOrigin: true,

    // 透传原始请求路径
    pathRewrite: {},
  });
}

/**
 * 创建上下文注入中间件
 * 每次请求时从 ConfigManager 获取最新的 injected content
 */
export function createContextMiddleware(configManager: ConfigManager) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 仅处理 JSON 请求体
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const { detectProtocol, injectAnthropicSystem, injectOpenAISystem } = require('./interceptor.js');
    const protocol = detectProtocol(req.path);
    const injectedContent = configManager.getInjectedContent();

    if (!injectedContent) {
      return next();
    }

    if (protocol === 'anthropic') {
      req.body = injectAnthropicSystem(req.body as Record<string, unknown>, injectedContent);
    } else if (protocol === 'openai') {
      req.body = injectOpenAISystem(req.body as Record<string, unknown>, injectedContent);
    }
    // unknown 协议直接透传

    next();
  };
}

import type { NextFunction } from 'express';

/**
 * 启动代理服务器
 */
export function startProxyServer(configManager: ConfigManager): Server {
  const app: Express = express();
  const config = configManager.getConfig();

  // 解析 JSON 请求体
  app.use(express.json({ limit: '10mb' }));

  // 挂载上下文注入拦截器（每次请求都获取最新内容）
  const contextMiddleware = createContextMiddleware(configManager);
  app.use(contextMiddleware);

  // 挂载代理中间件
  const proxy = createProxy(config, configManager);
  app.use('/v1', proxy);

  // 健康检查端点
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      active_persona: configManager.getConfig().active_context.persona || 'none',
      context_files: configManager.getContextChain().length,
    });
  });

  // 启动配置热重载监听
  configManager.startWatching();

  const { host, port } = config.server;
  const server = app.listen(port, host, () => {
    console.log(`🚀 aa-switch is running on http://${host}:${port}`);
    console.log(`👤 Active Persona: ${configManager.getConfig().active_context.persona || 'none'}`);
  });

  return server;
}
