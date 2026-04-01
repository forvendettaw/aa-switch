# aa-switch (All-Agent Switch) 核心架构与工程完整指南 v1.3

## 第一部分：架构总纲与设计设计 (Architecture & PRD)

### 1. 产品定位与核心价值
**`aa-switch`** 是一款专为 AI 开发者与多智能体框架设计的 **本地认知路由网关 (Local Context Gateway)**。

它以反向代理 (Reverse Proxy) 的形态运行，向下无缝兼容各类大模型客户端（Claude Code, OpenClaw, Gemini CLI 等），向上提供两大核心能力：
* **统一网络与凭证路由：** 集中管理多模型 API Key 与第三方中转商，实现一键无感切换底层模型网络。
* **动态上下文级联 (Context Cascading)：** 在不破坏客户端原生请求结构的前提下，根据配置驱动的“上下文链”，动态组合多维度上下文（如全局画像、单体人设、系统护栏），并安全地注入到 System Prompt 中。

### 2. 核心架构哲学：约定优于配置
* **对用户极简：** 默认仅需关心 `persona` 和 `inject_user_profile` 两个开关。
* **对引擎抽象：** 底层引擎将极简配置归一化（Normalize）为 `ContextChain` 数组，依序读取拼接，严禁硬编码文件名。
* **对极客开放：** 预留 `advanced_context_chain` 字段，允许高级玩家手动定义多级文件的挂载顺序。

### 3. 架构红线 (不可违背)
* **绝对无状态 (Stateless)：** 代理层不维护会话记忆，保障大模型 Prompt Caching 效率。
* **无代理层工具 (No Ghost Tools)：** 绝不私自向大模型注入未经客户端注册的 MCP 工具。
* **零缓冲流式透传 (Zero-Buffering SSE)：** 保证终端“打字机”体验的绝对顺滑，严禁阻塞流式数据。

### 4. 核心数据契约 (Schema)
默认接管与监听 `~/.aa-switch/` 目录。以下为主网关配置 `config.yaml` 示例：

```yaml
server:
  port: 8080
  host: "127.0.0.1"

active_context:
  persona: "coder"           # 极简模式：自动寻找 ./personas/coder.md
  inject_user_profile: true  # 极简模式：自动加载 ./user.md
  
  # advanced_context_chain:  # 高级模式：激活则覆盖极简模式
  #   - "./contexts/project_rules.md"
  #   - "./personas/special_agent.md"

providers:
  anthropic_official:
    base_url: "[https://api.anthropic.com/v1](https://api.anthropic.com/v1)"
    api_key: "env:ANTHROPIC_API_KEY"
  siliconflow:
    base_url: "[https://api.siliconflow.cn/v1](https://api.siliconflow.cn/v1)"
    api_key: "env:SILICONFLOW_API_KEY"

routes:
  anthropic: { provider: "anthropic_official" }
  openai: { provider: "siliconflow" }
```

---

## 第二部分：工程构建指南 (How to Build)

采用 Vibe Coding (AI 辅助编程) 模式，按照以下步骤引导大模型（如 Claude Code）完成开发。

### 1. 物理环境初始化 (Bootstrap)
在你的终端执行以下基础命令，搭建纯净的 Node.js + TypeScript 开发环境：
```bash
mkdir aa-switch && cd aa-switch
git init
pnpm init
pnpm add -D typescript vitest @types/node tsx
pnpm add express zod yaml http-proxy-middleware commander
npx tsc --init
```

### 2. 设置“研发护栏” (CLAUDE.md)
在项目根目录创建 `CLAUDE.md` 文件，限制 AI 的发散行为。写入以下内容：
```markdown
# aa-switch 开发指南
1. **核心逻辑：** 这是一个大模型本地反向代理网关。需将用户的极简 YAML 配置归一化为上下文链，读取对应 Markdown 文件并安全追加到请求的 System Prompt 中。
2. **代码规范：** 严格使用 TypeScript (ESM) 和 Zod 进行类型校验。优先使用函数式编程，保持逻辑极简。
3. **性能底线：** 拦截大模型请求后，必须使用 `stream.pipe()` 实现 SSE 响应流的零缓冲 (Zero-Buffering) 透传。
```

### 3. 敏捷开发里程碑 (Milestones)
分步骤向 AI 下达开发指令，每完成一步务必进行 Git Commit：

* **阶段一：配置驱动层 (Schema & Loader)**
  * 指令目标：编写 Zod Schema 校验 `config.yaml`，并实现文件读取与“归一化”引擎（将极简配置转为 ContextChain 数组）。
* **阶段二：代理拦截层 (Proxy Engine - 核心难点)**
  * 指令目标：使用 Express 搭建服务器，拦截发往 Anthropic/OpenAI 的请求。解析 Payload，注入组装好的 System Prompt，并实现 SSE 流无损透传。
* **阶段三：控制平面 (CLI Controller)**
  * 指令目标：使用 `commander` 编写 CLI 入口，实现 `aa-switch use <persona>` 命令，通过读写本地文件或 IPC 机制热更新代理网关的内存状态。
* **阶段四：质量保障 (Testing)**
  * 指令目标：使用 Vitest 编写单元测试，重点测试 Payload 的组装边界条件和 YAML 文件的热重载。

---

## 第三部分：核心使用指南 (How to Use)

当工具开发完成并全局安装（`npm link` 或打包为可执行文件）后，用户端的操作流如下：

### 1. 启动网关服务
在终端运行启动命令，`aa-switch` 将在后台守护运行，默认监听 `8080` 端口。
```bash
aa-switch start
# 输出: 🚀 aa-switch is running on [http://127.0.0.1:8080](http://127.0.0.1:8080)
# 当前激活人设: coder
```

### 2. 客户端接入 (以 Claude Code 为例)
无需修改 Claude Code 的源码，只需将其底层的 API Base URL 指向本地网关。
在终端设置环境变量（取决于具体客户端的支持方式）：
```bash
export ANTHROPIC_BASE_URL="[http://127.0.0.1:8080/v1](http://127.0.0.1:8080/v1)"
export ANTHROPIC_API_KEY="dummy_key" # 真实 Key 由 config.yaml 配置接管
claude
```
此时，Claude Code 发出的所有指令，都会被静默注入 `user.md` 和当前激活的人设。

### 3. 一键热切换上下文 (Hot-Swap Persona)
当你需要让 AI 从“严苛的程序员”切换为“贴心的日常助理”时，打开一个新的终端标签页：
```bash
aa-switch use monica
# 输出: ✅ 成功切换上下文至: monica.md
```
无需重启 Claude Code 和网关服务。你在 Claude Code 中敲下的下一句话，将会由拥有 `monica.md` 灵魂的模型来回答。

### 4. 查看当前状态
随时检查网关的运行健康度与当前挂载的上下文：
```bash
aa-switch status
# 输出:
# 🟢 Status: Running (Port 8080)
# 👤 Active Persona: monica
# ⚙️  User Profile Injected: true
# 🌐 Current Provider: siliconflow (OpenAI Format)
```