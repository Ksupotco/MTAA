# Whale · 消息有着落（参赛 Demo · React 视觉重构版）

记忆对话：在“记忆”顶部切换“期末冲刺 / 项目交付 / 日常学习”三套虚构档案，填写同一个问题，按当前档案回答或进行三套对照。回答逐句显示M编号，可点击核对原记忆；引用是模型标注的依据，不是内部推理证明。AI模式请求真实模型，规则模式只展示明确标注的固定模板。档案与回答不覆盖下方用户策展的记忆。三套对照最多发起3次模型调用。

本机配置：双击 `configure-ai.cmd`，在隐藏输入提示处粘贴密钥并回车；保存到被Git忽略的本机 `.env` 并重启18762预览。不要把密钥发到聊天或写进前端。后台额外AI记忆提取默认关闭，以减少调用；开启自动播放前请留意主动判断也可能调用模型。

本地体验更新：默认直接进入工作区，介绍可展开；事项支持任务/地点/群名搜索与来源筛选，空分类可切换显示。原文入口定位并高亮消息，关注来源支持全部取消与恢复。提醒默认收起，不遮挡操作；输入错误、存储失败和设备模拟异常提供反馈。当前仍未接入真实QQ与设备。

独立参赛 Demo。**UI 层**用 React19 + Vite7 + Tailwind4 + vite-plugin-singlefile 重建，暖纸编辑风：paper 底 + ink 文字 + clay 主 accent + moss/sage 次 + amber 点缀；白底细线浅阴影卡片、dot-grid/grain 轻质感、衬线标题（系统回退不引外部字体）、lucide 图标；动效仅少量 fade-up/rise 并支持 prefers-reduced-motion。**业务逻辑**为纯 ES 模块，原样保留在 `lib/`，被 React 复用；不重写逻辑。

## 运行与构建

```
npm install        # 首次
npm run build      # 产出单文件 dist/index.html（js/css 全内联）
npm start          # node server.mjs，默认 http://127.0.0.1:18762
```

交付压缩包请双击上一级 `启动演示.cmd`（直接使用预构建网页，无需安装依赖）；源码开发可运行上面的 npm 命令。原工作区启动方式：双击 `start-demo.cmd`（自动 install/build/启动，日志在 `工作区根目录 logs/74-React-Demo优化/`）。`server.mjs` 只服务单文件 `dist/index.html` + 三个 `/api` 端点；`lib/` 不直接对外暴露。公网部署见 [deploy/deploy.md](deploy/deploy.md)（形态不变）。

QQ与家居设备均为模拟；配置本地密钥后，大模型端点实际请求 DeepSeek。尚未集成 whale-core / 真实设备。群聊、人物（仅角色称呼）、事实均为虚构演示数据，仅存当前浏览器 localStorage。

## 演示故事

学生开发者「我」做 whale 智能层 × 智能眼镜项目。五个模拟群：课程作业群（老师/助教）、社团活动群（社长/组织部）、项目协作群（负责人/成员）、实验室通知群（实验员/师兄）、生活通知群（楼长/室友）。预置消息分布 2026-11-18 至 11-20 上午，任务与闲聊混杂，埋入个人事实/偏好（我怕辣、习惯用 DeepSeek、周末湖边拍素材…）与各类日程形态。演示时钟 BASE=2026-11-20 09:00 (UTC+8)。预置任务仍由 seeds 经规则生成并标注「非 AI」。

## 视图与功能

玻璃 navbar（品牌 + 五视图 tab + DEMO 徽章 + 模式切换）；hero/介绍带（渐变标题 + stats count-up + 六功能卡 + 流程）可经「介绍」开关。五视图工作区：

- **信息总结**：「你可能关注的事项」建议区（计数+卡片+快捷＋+已处理恢复）；新消息先建议不直接落任务；截止分类 + 长期进行中。点卡片/日程进入分屏溯源。
- **分屏溯源**：左聊天整条高亮 + quote mark + ①②③双向编号 + SVG 贝塞尔连线（随滚动/resize 重算，<900px 堆叠隐藏）；右栏时间(值+精度+依据)/地点/要求/状态/相关记忆/证据/变化记录/操作/长期进度；顶栏「添加还是删除？」或保留/删除；返回列表。
- **消息来源**：群聊气泡 + 发送者选择 + 示例消息 + 发送（Ctrl+Enter）。
- **记忆**：关于我 / 记忆候选（记住/忘记）/ 你的一天 / 召回搜索（词项命中×重要度×半衰期30天衰减、过期退出、得分理由+证据）。
- **主动判断**：节拍1/5/15 + 自动播放调速 + 活动选择；提醒收件箱（可交互）+ 决策账本（可展开提示词、标模拟/AI）；静默23:00–08:00/配额/批准门控；反馈过滤。
- **设备**：卡片手动控制 + 风险分级 read_only/communicate/transaction + AI 待批准（单次批准→模拟执行）+ 行动账本。

## 双模式与端点

默认「AI整理（工程接口）」，未配置时待办保留待处理；记忆候选先走规则，主动判断可回退模拟，并明确标注；可切「规则演示」。`.env` 同一 DeepSeek 配置供 `/api/v1/extract`、`/api/v1/memory-extract`、`/api/v1/initiative`。详见 [docs/ai-extraction.md](docs/ai-extraction.md)。

## 存储与迁移

独立 localStorage 键 `whale.visual-demo.v2`（不覆盖旧版），内部版本 2；旧 v1 自动补齐 suggestions/memory/devices/initiative，不丢进度。

## 验证

`npm test`（仓内 tests/workflow.test.mjs，5组离线流程检查）；`npm run typecheck` 类型检查。`node --check` lib/backend/server。`npm run build` 单文件。HTTP 验证含 AI_NOT_CONFIGURED。

## 代码关系与边界

`lib/` 为独立实现的规则/契约原型（engine/memory/initiative/devices/ai-client/contracts），未复用 whale-core 业务代码；`src/` 为 React UI。虚构群聊不接 QQ；设备均模拟受理；仅日期按演示策略当日18:00、明确时刻提前1小时作为主动判断信号；推进时钟才触发；无系统通知。未来接后端可替换 lib 适配层保留 UI。
