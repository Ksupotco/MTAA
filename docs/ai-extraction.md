# 群消息 AI 提取接入约定（Demo v1）

这是独立 Demo 的业务 HTTP 接口，**不是 Whale 已存在的 API，也不修改设备总线 contracts/v2**。当前只读取了本机 Whale 工程以核对接入位置，尚未提交 Whale 核心改动。

## 本机直接配置模型

将 `.env.example` 复制为本目录的 `.env`，在本机编辑 `DEEPSEEK_API_KEY` 和 `DEEPSEEK_MODEL`，重启 `node server.mjs`。密钥不放网页、不提交 Git、不写运行日志。默认示例型号来自 [DeepSeek JSON Output 官方文档](https://api-docs.deepseek.com/guides/json_mode/)，实际可用型号以账户为准。

默认进入“AI整理（工程接口）”。没有配置时返回 AI_NOT_CONFIGURED，消息保存为待处理；配置后点击“重试待整理消息”。没有规则回退。只有主动选择“规则演示”才走旧规则，预置任务详情明确标注不是 AI 产出。**目前未用真实模型验证理解效果，离线响应只验证接口与程序行为。**

## HTTP 协议

- `GET /api/v1/ai-status`：返回 configured / provider / model。configured 仅代表存在配置，不代表已联通。
- `POST /api/v1/extract`：同源 JSON，最大64KiB。请求 `version:1, groupId, now, message, context, tasks`。
- `message` 与 `context` 元素：`id, author, text, time`；时间为毫秒，参考时区 Asia/Shanghai。历史最多12条，只选同群被允许发布者；输入已有事项最多80条，仅提供ID、标题、状态和时间。
- 响应：`version:1, engine:{type:'ai',provider,model}, extraction:{items:[...]}`。
- 每项字段、枚举和校验以 `lib/extraction-contract.js` 为准；完整输出样例见 `backend/extractor.mjs` 的 SYSTEM_PROMPT。
- 操作支持 create/update/cancel/complete；变更须引用已有 targetId。支持多事项、活动/任务、时间周期与精度、地点类型、参与要求、原文引用、待确认原因。
- 原文引用须逐字匹配当前消息或所提供历史，每项必须引用当前消息。仅日期用当日北京时间23:59保存，保持date精度，展示时不冒充明确时刻。未知用null，不让AI提供身份权限。
- 无事项返回空items。输出无效、来源虚构、目标不存在、超时、空响应或截断都不写入任务；消息保留并支持重试。程序检查格式和引用，**不能证明模型对语义的理解一定正确**。

## 前端与存储

`lib/ai-client.js` 负责构造最小上下文、请求、再次校验和一次性应用结果，原消息ID用于幂等。模型产生的多项结果先在副本中处理，全部成功后提交；冲突不部分写入。AI不直接写数据库，不执行设备工具。

已有界面继续负责分类、原文定位、人工确认、长期进度和演示提醒。AI结果有疑问时进入待确认，不触发定时提醒。当前存储仍是浏览器localStorage，重试和幂等只针对本浏览器，不是跨客户端持久队列。

## 接入 Whale 的边界

本机已核对：

- `src/whale_core/integrations/im/models.py::ImMessage` 提供 `target_id / sender_id / message_id / text / received_at`。未来分别映射为 groupId / author / message.id / message.text / message.time。实际集成使用稳定ID，昵称只用于展示。
- `src/whale_core/plugins/model_provider.py` 提供 `llm.chat` 能力解析，模型端点和凭据由宿主管理。
- 当前 `DeepSeekCompanion.reply()` 会组合陪伴人格提示且将文本截到4000字符，**不能不加修改直接当作结构化提取器使用**。正式接入应增加独立结构化提取能力或明确的适配层，复用宿主的模型配置、HTTP错误处理和权限，避免重复安装一套模型管理。
- 群主/管理员信息当前由模拟目录提供，ImMessage本身没有这些角色字段。真实来源接入层需提供可信的成员目录；程序执行关注群和发布者筛选，不让AI从昵称推断权限。
- 消息存储、待办事务和重试幂等应落在宿主数据库；现有浏览器存储仅为Demo。

未来 Whale 侧新增一个返回上述协议的业务提取端点后，可设置 `WHALE_EXTRACT_URL`，可选 `WHALE_API_TOKEN`，本 Demo 后端将请求转交宿主并继续校验返回值。该地址是待实现配置，**不是声称 Whale 已有该路由**。生产宿主必须用自身鉴权、稳定成员ID与可信消息记录重新执行发布者和证据校验，不能相信浏览器传来的成员身份与历史。

本轮没有更改 Whale 的设备协议、QQ连接器或主工程代码，也没有真实QQ扫描能力。
