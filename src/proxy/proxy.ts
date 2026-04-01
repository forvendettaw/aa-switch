import { createServer } from 'http';
import type { Server } from 'http';
import express from 'express';
import type { Express, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Config } from '../config/schema.js';
import { resolveApiKey, createContextInjector } from './interceptor.js';

/**
 * 创建 HTTP 代理中间件
 * 关键点：SSE 响应必须使用零缓冲透传
 */
export function createProxy(config: Config) {
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
 * 启动代理服务器
 */
export function startProxyServer(config: Config, configBaseDir: string): Server {
  const app: Express = express();

  // 解析 JSON 请求体
  app.use(express.json({ limit: '10mb' }));

  // 挂载上下文注入拦截器
  const contextInjector = createContextInjector(config, configBaseDir);
  app.use(contextInjector);

  // 挂载代理中间件
  const proxy = createProxy(config);
  app.use('/v1', proxy);

  // 健康检查端点
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  const { host, port } = config.server;
  const server = app.listen(port, host, () => {
    console.log(`🚀 aa-switch is running on http://${host}:${port}`);
  });

  return server;
}
