# 记忆对话接入

- `lib/memory-profiles.js`：三套预置、虚构、独立的记忆。不是Whale数据库，不改变用户已确认记忆。
- `POST /api/v1/memory-chat`：请求 `{version:1,profileId,question,now}`。服务端按ID读取档案，忽略客户端自行附带的memory字段，复用现有callModel与服务端凭据。
- 响应 `{version:1,profileId,engine,extraction:{sentences:[{text,memoryIds}]}}`。每句最多4条引用，最多6句，未知/跨档案ID拒绝。
- 返回AI结果只代表真实模型生成并通过格式与ID校验。语义是否正确、引用是否充分仍需核对，不能把引用当成内部思维追踪。
- AI未配置或失败时明确报错，不自动换成模板。选择规则演示时使用固定模板，并明确标注不理解问题。
- 结果独立存储于浏览器 `whale.memory-chat.v1`，每套仅保留最近一份；目前为单轮问答与同题对照，不是完整多轮聊天历史。
- 模型回答最大输出预算1200 tokens；单档一次调用，三套对照最多三次。服务端 `.env` 与密钥不会由静态路由提供。
- 未来若Whale提供相同契约的记忆问答端点，可配置 `WHALE_MEMORY_CHAT_URL` 和服务端 `WHALE_API_TOKEN` 转交宿主。这个配置是适配入口，不代表Whale当前已有对应API。

2026-11-22已用本机配置的DeepSeek实测：一条年级大会通知正确识别时间/地点/签到请假要求；一个期末档案问题返回逐句记忆引用。其余档案的模型回答效果仍需实际体验验证。9组离线检查通过，离线测试不冒充真实模型验证。
