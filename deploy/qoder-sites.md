# 部署到 Qoder Sites

比赛要求作品用 Qoder Sites 部署，并设为公开访问。本项目已经拆成**静态单页**和**运行时无关的 API 处理器**两部分。下面的指令可以直接粘贴给 Qoder 的 Sites Skills 去执行。

> 依据 Qoder 官方文档：Sites 支持静态站点，也支持带 server functions、数据库和存储的 Agent App；环境变量（Secrets）只能写入，写入后读不回来。个人免费版只能部署静态站点，要用 server function 必须是付费版（Lite / Pro 等）。

## 1. 构建产物

```
npm install
npm run verify      # typecheck + test + build
```

构建完成后得到 `dist/index.html`，JS 和 CSS 已全部内联进这一个文件。

## 2. 目录与路由约定

| 路径 | 作用 |
|---|---|
| `dist/index.html` | 站点首页（静态） |
| `sites/api.mjs` | server function 入口，同时导出 `default.fetch` / `handler` / `onRequest` 三种签名 |
| `backend/handler.mjs` | 真正的逻辑：同源校验、限流、契约校验、调用模型 |
| `/api/v1/ai-status` `/api/v1/extract` `/api/v1/memory-extract` `/api/v1/initiative` `/api/v1/memory-chat` | 需要路由到 `sites/api.mjs` 的接口 |

前端默认请求同源的 `/api/v1/*`。如果平台把函数放在别的域名，有两种办法：
- 构建时设置 `VITE_API_BASE=https://函数域名`；
- 或者在 `index.html` 里加一行 `<script>window.WHALE_API_BASE='https://函数域名'</script>`，并在服务端设置 `ALLOWED_ORIGINS=https://站点域名`。

## 3. 给 Qoder 的指令（示例）

```
@sites 把当前项目发布为站点「whale-demo」：
1. 静态页面使用 dist/index.html 作为首页。
2. 新建 server function，把 /api/* 的请求交给 sites/api.mjs（它导出 Web 标准 fetch(request, env) 处理器）；如果平台需要别的导出签名，只在 sites/api.mjs 里加一层包装，不要改 backend/。
3. 在环境变量（Secrets）里添加 AGENTSCOPE_API_KEY（我会手动填写值；如需 DeepSeek 备选再加 DEEPSEEK_API_KEY），以及 AI_PROVIDER=agentscope、TRUST_PROXY=1、AI_RATE_PER_IP=30、AI_DAILY_LIMIT=1000。
4. 先生成预览：确认 GET /api/v1/ai-status 返回 configured:true、GET /api/v1/models 列出节点实时模型，在「消息来源」发送一条消息后显示「AI提取」。
5. 确认无误后发布，并把访问范围设为「任何人可访问」。
```

## 4. 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `AGENTSCOPE_API_KEY` | 二选一（推荐） | AgentScope 节点密钥，只放在 Secrets |
| `AGENTSCOPE_BASE_URL` | 否 | 默认 `https://platform.agentscope.io/v1`；调用 `/chat/completions`（仅 SSE 流式），模型列表来自 `/models` |
| `AGENTSCOPE_MODEL` | 否 | 默认模型 `qwen3.8-flash` |
| `DEEPSEEK_API_KEY` | 二选一 | DeepSeek 密钥（备选节点） |
| `DEEPSEEK_MODEL` / `DEEPSEEK_BASE_URL` | 否 | 默认 `deepseek-flash` / `https://api.deepseek.com` |
| `AI_PROVIDER` | 否 | 默认节点 `agentscope` 或 `deepseek`；两个密钥都配时，访客可在侧栏切换节点与模型 |
| `AI_RATE_PER_IP` / `AI_RATE_WINDOW_MIN` | 否 | 单个 IP 的滑动窗口限流，默认 10 分钟内最多 30 次 |
| `AI_DAILY_LIMIT` | 否 | 全站每天的调用总上限，默认 1000，填 0 表示不限 |
| `TRUST_PROXY` | 建议 1 | 部署在代理后面时，从 `X-Forwarded-For` / `CF-Connecting-IP` 识别访客 IP；`sites/api.mjs` 默认按 1 处理 |
| `ALLOWED_ORIGINS` | 否 | 跨域部署时允许的页面来源，多个用逗号分隔；默认只接受同源请求 |

> 限流计数保存在函数实例的内存里。Serverless 冷启动或同时运行多个实例时，每个实例各自计数，所以实际上限会略高于配置值。如果平台提供 KV 或数据库，可以把 `backend/rate-limit.mjs` 换成持久化计数，接口保持不变。

## 5. 失败时的表现

- 没有配置密钥时，`/api/v1/*` 返回 `503 AI_NOT_CONFIGURED`。前端自动切到规则引擎，并在页面上标注「AI 未配置 · 规则回退」，演示不会中断。
- 触发限流时返回 `429 RATE_LIMITED` 或 `DAILY_LIMIT`。前端同样回退到规则模式，并告诉用户原因。
- 跨站请求返回 `403 ORIGIN_REJECTED`。

## 6. 退路：自己的服务器 + Node

如果 Sites 的函数运行时不合适，可以使用 `deploy/deploy.md` 里的 systemd + nginx 方案，运行 `node server.mjs`，逻辑和 Sites 共用同一个 `backend/handler.mjs`。不过比赛要求的作品链接必须是 Qoder Sites 地址。

## 7. 模型节点与模型选择

- 侧栏「模型节点 / 模型」下拉框：节点列表来自已配置密钥的供应商；模型列表由服务端实时请求 `{BASE}/models` 拉取，缓存 5 分钟，可点刷新按钮强制重新拉取。
- 浏览器只通过请求头 `X-Whale-Provider` / `X-Whale-Model` 传递选择；服务端对照实时列表校验，不在列表里的模型自动改用默认模型。密钥永远不会下发。
- AgentScope 节点只支持 SSE 流式：服务端以 `stream:true` + `Accept: text/event-stream` 调用，逐帧拼接 `choices[0].delta.content` 直到 `[DONE]`，再做 JSON 与原文校验。
- `/models` 拉取失败时，下拉框显示「仅默认」，只允许使用默认模型，演示不中断。
