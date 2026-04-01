import { z } from 'zod';

/**
 * ContextChain 上下文链条目
 * 代表一个需要加载的 Markdown 文件
 */
export const ContextChainEntrySchema = z.string();

export const ContextChainSchema = z.array(ContextChainEntrySchema);

/**
 * Server 配置
 */
export const ServerSchema = z.object({
  port: z.number().default(8080),
  host: z.string().default('127.0.0.1'),
});

/**
 * ActiveContext 活跃上下文配置
 * 支持极简模式和高级模式
 */
export const ActiveContextSchema = z.object({
  persona: z.string().optional(),
  inject_user_profile: z.boolean().default(false),
  advanced_context_chain: ContextChainSchema.optional(),
});

/**
 * Provider 提供商配置
 */
export const ProviderSchema = z.object({
  base_url: z.string(),
  api_key: z.string(),
});

/**
 * Routes 路由配置
 */
export const RouteEntrySchema = z.object({
  provider: z.string(),
});

export const RoutesSchema = z.record(z.string(), RouteEntrySchema);

/**
 * 主配置结构
 */
export const ConfigSchema = z.object({
  server: ServerSchema.optional().default({ port: 8080, host: '127.0.0.1' }),
  active_context: ActiveContextSchema.optional().default({ inject_user_profile: false }),
  providers: z.record(z.string(), ProviderSchema),
  routes: RoutesSchema,
});

export type Config = z.infer<typeof ConfigSchema>;
export type Server = z.infer<typeof ServerSchema>;
export type ActiveContext = z.infer<typeof ActiveContextSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type RouteEntry = z.infer<typeof RouteEntrySchema>;
export type ContextChain = z.infer<typeof ContextChainSchema>;
