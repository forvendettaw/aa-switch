# aa-switch

> **All-Agent Switch** — 让 AI 更懂你

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-ESNext-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 缘起

你是否有过这样的经历——

清晨☀️，你打开 Claude Code，准备开始一天的工作。今天的任务是重构一个复杂的模块，你需要「专业模式」：严谨、高效、少说废话。

午后🌤️，Code Review 完毕，现在要写一封给客户的邮件。你切换到「 Monica 模式」：温暖、专业、措辞得体。

深夜🌙，灵感突现，你想和 AI 聊聊新产品的 idea。你换上「创业者和投资人模式」：有格局、有洞察、能一针见血指出问题。

**aa-switch** 就是为这样的你设计的。

它是一个安静运行在你电脑后台的「AI 人格切换器」。一行命令，瞬间切换。Claude Code、OpenClaw——任何支持自定义 API 地址的 AI 工具，都能立刻「变身」。

---

## 一句话定位

**aa-switch** 是本地 AI 的「人格大衣橱」。在不同的上下文之间切换，就像换一件外套一样自然。

---

## 核心理念

### 🎭 Persona 是灵魂

你的 AI 不应该永远只有一个面孔。通过 Markdown 文件，你可以为 AI 塑造无数种人格：

- **coder** — 专注、高效、代码优先
- **monica** — 温暖、耐心、善解人意
- **cto** — 战略眼光、系统思维、风险意识
- 或者任何你能想到的角色

### 🔄 切换应该无感

修改配置 → 保存 → AI 即刻「新装上阵」。无需重启服务，无需调整环境变量。`fs.watch` 在背后默默工作，0 秒停机。

### 🛡️ 安全是底线

API Key 不应该出现在任何配置文件里。`env:VAR_NAME` 格式，让敏感信息留在环境变量中，你的信息你做主。

### 🌊 流式响应，必须原汁原味

SSE (Server-Sent Events) 的打字机体验，是 AI 对话的灵魂。我们用 `stream.pipe()` 透传，绝不缓冲一秒。

---

## 快速开始

### 第一步：克隆并安装

```bash
git clone https://github.com/forvendettaw/aa-switch.git
cd aa-switch
pnpm install
```

### 第二步：配置（一次性操作）

**2.1 创建配置目录和文件**

```bash
mkdir -p ~/.aa-switch/personas
```

**2.2 创建配置文件**

创建 `~/.aa-switch/config.yaml`，内容如下：

```yaml
server:
  port: 8080
  host: "127.0.0.1"

active_context:
  persona: "coder"              # 默认人格
  inject_user_profile: true     # 是否注入 user.md

providers:
  anthropic_official:
    base_url: "https://api.anthropic.com/v1"
    api_key: "env:ANTHROPIC_API_KEY"  # 从环境变量读取

routes:
  anthropic: { provider: "anthropic_official" }
  openai: { provider: "anthropic_official" }
```

> **注意**：`api_key: "env:ANTHROPIC_API_KEY"` 表示从系统环境变量 `ANTHROPIC_API_KEY` 读取真实密钥，保证密钥安全。

**2.3 创建用户信息文件（可选但推荐）**

```bash
# 用户自我介绍
echo "# 用户档案

我是 Scott，全栈开发者，喜欢用技术解决实际问题。" > ~/.aa-switch/user.md
```

**2.4 启动人格已经在内置库中**

项目已内置 11 种人格在 `personas/` 目录，无需手动创建。

### 第三步：启动网关

```bash
pnpm build   # 编译 TypeScript
pnpm start   # 启动网关
```

成功后会看到：

```
🚀 aa-switch is running on http://127.0.0.1:8080
👤 Active Persona: coder
```

**保持这个终端开着**，网关就会一直在后台运行。

### 第四步：配置 AI 客户端

打开**另一个终端**，设置环境变量：

```bash
# 告诉 AI 客户端使用本地网关
export ANTHROPIC_BASE_URL="http://127.0.0.1:8080/v1"
export ANTHROPIC_API_KEY="sk-ant-placeholder"   # 任意值，真实密钥在配置里
```

### 第五步：启动 Claude Code

```bash
claude
```

现在 Claude Code 已经是一个穿着「coder」人格外套的 AI 了。

---

## 切换人格

### 查看所有可用人格

```bash
ls ~/.aa-switch/personas/
```

输出：
```
coder.md
entp_debater.md
intj_architect.md
isfj_guardian.md
istp_hacker.md
machiavelli_exec.md
...
```

### 一键切换

```bash
# 切换到架构师人格
aa-switch use intj_architect

# 切换到混沌破局者
aa-switch use entp_debater

# 切换到极客老炮
aa-switch use istp_hacker
```

### 查看当前状态

```bash
aa-switch status
```

输出：
```
🟢 Status: Running
   Server: 127.0.0.1:8080
   👤 Active Persona: intj_architect
   📁 Context Chain (2 files):
      - /Users/scott/.aa-switch/user.md
      - /Users/scott/.aa-switch/personas/intj_architect.md
```

### 重要：Claude Code 无需重启

切换人格后，直接在 Claude Code 对话框继续聊天即可。AI 会立即以新人格响应。

---

## 桌面托盘（可选）

想要更直观？安装 **aa-switch-ui**，一个运行在系统托盘的小工具。

- 点击托盘图标 → 切换人格
- 实时显示当前状态
- 自动启动网关

```bash
cd aa-switch-ui
pnpm install
pnpm tauri build
```

---

## 编写自定义 Persona

在 `~/.aa-switch/personas/` 创建任意 `.md` 文件：

```markdown
# Monica

你是 Monica，一个温暖而专业的 AI 助手。

## 风格
- 善解人意，但不矫情
- 回答简洁，但不失温度
- 适当用 emoji，但不过度

## 专长
- 邮件写作和润色
- 创意讨论
- 日常咨询
```

保存后，`aa-switch use monica` 即可切换。

---

## 内置 Persona 库

项目内置了 5 个高维度人格，可直接使用：

| Persona | MBTI | 特点 |
|---------|------|------|
| `intj_architect` | INTJ · 5w4 | 架构机器 · 显微镜级审查 · 抗拒过度设计 |
| `entp_debater` | ENTP · 7w8 | 混沌破局者 · 拥抱前沿 · 虎头蛇尾 |
| `machiavelli_exec` | ENTJ | 铁血执行官 · ROI导向 · 技术债杠杆 |
| `isfj_guardian` | ISFJ · 6w5 | 系统守夜人 · 风险厌恶 · 鲁棒性偏执 |
| `istp_hacker` | ISTP · 5w6 | 极客老炮 · Less is More · Talk is cheap |

```bash
aa-switch use intj_architect   # 召唤架构机器
aa-switch use entp_debater    # 召唤混沌破局者
```

详细人格说明见 [personas/](personas/) 目录。

---

## 技术细节（可选阅读）

对于喜欢深挖的同学：

```
aa-switch/
├── src/
│   ├── cli/          # Commander CLI
│   ├── config/       # Zod 校验 + YAML 加载
│   ├── proxy/        # Express 反向代理 + 上下文注入
│   └── index.ts
├── tests/
│   ├── unit.test.ts
│   └── e2e.test.ts
└── aa-switch-ui/    # 可选的 Tauri 托盘应用
```

**技术栈：**
- Node.js 18+ / TypeScript (ESM)
- Express 5 + http-proxy-middleware
- Zod 4 配置校验
- Vitest 测试
- Tauri v2 桌面托盘（可选）

---

## License

MIT

---

*让 AI 成为更好的自己，从切换 persona 开始。*
