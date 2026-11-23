# 记忆（Demo 理想化实现 × whale-core 概念对应）

本模块 `lib/memory.js` 为纯函数+状态操作，浏览器与 Node 测试复用。它复刻 whale-core 记忆设计的精髓，但**不复制其业务代码**，也不连接其记忆库。

## 数据模型 MemoryRecord

`id, kind(fact|preference|episode), summary, evidence[{messageId,quote}], space('owner'|'group:'+id), importance(0–1), createdAt, expiresAt?, state('candidate'|'curated'|'forgotten'), origin('rules'|'ai'), pattern, groupId`。quote 逐字来自消息。

## 与 whale-core 的对应

| Demo | whale-core | 说明 |
|---|---|---|
| 原始消息≠事实，候选不自动晋升 | `memory/curation.py` MemoryCurator |  raw 日志不自动成事实 |
| 「记住」=显式同意晋升 | `curation.remember(consent=True, evidence_id=...)` | 无 consent 抛 PermissionError；Demo 以按钮表达同意 |
| 「忘记」留痕 | `curation.forget` / owner_facts 墓碑 | Demo 置 forgotten 不展示，不物理删 |
| 召回词项=中文单字+二元组 | `curation._terms` | 单字查询「辣」可命中「我怕辣」 |
| 打分=命中×重要度×衰减 | `curation.recall` | whale 用 BM25+加权；Demo 用乘积式（命中×重要度×半衰期30天），fact 视为长期事实不衰减 |
| 过期退出召回 | `_is_expired`(G2/MEM-04) | expiresAt 到期即不召回，不删记录 |
| 空间 owner/group | `memory/types.py` MemorySpaceType | Demo 简化为 owner 与 group:；真实版有 protected_original/member_private 等硬围栏 |
| 成员授权/退出 | `memory/consent.py` | Demo 未实现成员级授权，仅主人自述入 owner；真实接入需 consent 双门 |

## 提取

规则与 AI 两模式都对进入消息跑理想化规则（`candidatesFor`），命中模式写进 `pattern` 可解释。AI 配置时可选走 `/api/v1/memory-extract`（`backend/memory-extractor.mjs`，独立 MEMORY_SYSTEM_PROMPT，输出过 `lib/memory-contract.js` 校验，quote 逐字、必须引用本条消息）。未配置时规则结果标注「模拟提取」。

## 被真正使用

- 主动判断提示词包含召回命中（`initiative.buildContext`）。
- 分屏右栏「相关记忆」按标题召回。

## 真实接入边界

当前词项级启发式检索，非语义向量/事实冲突解析；存储为浏览器 localStorage。真实产品应将可信记忆置于单一受保护端点，跨设备经认证 API 与相同 owner_id 使用，并启用成员 consent/空间硬围栏（MEM-HARD-01）。不声称已集成。
