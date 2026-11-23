# 主动判断（短周期 AI 主动 × whale-core 概念对应）

`lib/initiative.js` 实现节拍→提示词→判断→门控→账本→反馈的闭环，替代旧定点提醒主机制。理想化模拟，不发送真实系统通知。

## 节拍与时钟

演示时钟每推进一个节拍（间隔 1/5/15 分钟可选）触发一次判断。保留手动 +1小时/+1天/推进到下一次提醒；新增自动播放（1真实秒=1/5/15/60模拟分钟）。手动跳步超过12个间隔时合并为一次判断，避免账本爆炸。旧 `reminderAt`/`longReminderAt` 降级为判断的输入信号（临近截止/长期节点），不再直接发提醒。

## 提示词构造（buildContext/promptText）

当前演示时间、用户在做什么（最近消息推断或手动活动选择器）、未来24h日程+已逾期、上次节拍以来新消息、相关记忆召回、打扰策略（静默23:00–08:00、每日配额6、用户反馈）。

## 判断

AI 配置→`/api/v1/initiative`（`backend/initiative.mjs`，独立 INITIATIVE_SYSTEM_PROMPT，输出 `{action:remind|message|silent,text,reason,evidence,urgency,deviceProposal}` 过 `lib/initiative-contract.js` 校验）。未配置→理想化确定性模拟判断器（`simulateDecision`）：静默/配额/反馈→silent；逾期/临近截止→remind；新重要消息→message；深夜回宿舍→deviceProposal；无事件→silent。界面标注「模拟判断」。

## 门控与账本（对应 whale-core）

| Demo | whale-core | 说明 |
|---|---|---|
| ProactiveDraft 字段 | `life/initiative.py` ProactiveDraft | draft_id/text/reason/evidence/channel/importance/expires_at |
| 门控 disabled/deferred/needs_approval/ready | `ProactiveOutbox.inspect` | 授权/静默/忙碌/配额/审批 |
| 决策账本 attempting→accepted/unknown | `ProactiveOutbox.dispatch` | Demo 以 delivered+模拟受理表达，不声称用户已读 |
| 反馈过滤后续候选 | `feedback` + day_context §B6 | 「不再提醒这类」写入 feedback，后续节拍过滤 |
| 静默跨午夜 | `initiative/policy.py` QuietHoursPolicy | 23:00–08:00 按或区间 |
| 宁可漏提醒不可乱打扰 | `life/day_context.py` | 无事件零产出 |

remind/message 经门控进入提醒收件箱+页面内可交互提醒卡（知道了/不再提醒这类/查看日程）。deviceProposal 的 transaction 操作转设备批准门控（见 devices.md）。

## 真实接入边界

当前活动状态为消息推断/手动选择，非真实感知；配额/静默为演示常量；渠道受理为模拟。真实版应接宿主感知事件、可信日程/天气来源、Outbox 渠道网关与回执，且频控/风险门控为核心不可插件化安全不变量。不声称已集成。
