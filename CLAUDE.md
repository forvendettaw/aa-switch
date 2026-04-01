# aa-switch 开发指南
1. **核心逻辑：** 这是一个大模型本地反向代理网关。需将用户的极简 YAML 配置归一化为上下文链，读取对应 Markdown 文件并安全追加到请求的 System Prompt 中。
2. **代码规范：** 严格使用 TypeScript (ESM) 和 Zod 进行类型校验。优先使用函数式编程，保持逻辑极简。
3. **性能底线：** 拦截大模型请求后，必须使用 `stream.pipe()` 实现 SSE 响应流的零缓冲 (Zero-Buffering) 透传。