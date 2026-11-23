# 设备（外部控制骨架 × whale 插件风险门控对应）

`lib/devices.js` 提供模拟设备注册表、风险分级、批准门控、行动账本与适配器骨架。**不声称真实设备已执行**；所有执行回执明确标注模拟。

## 注册表（模拟）

客厅灯(light)、卧室空调(ac)、窗帘(curtain)、音箱(speaker)、门锁传感器(sensor)。字段 `id/name/type/capabilities/state/online/riskTier`。能力 `on_off/set_temperature/open_close/play/get_state`。

## 风险分级（照 WhaleIO/docs/plugin-architecture.md §2）

| 能力 | 风险级 | 门控 |
|---|---|---|
| get_state | read_only | 查状态，ready |
| play | communicate | 音箱播报，AI 提议需批准 |
| on_off/set_temperature/open_close | transaction | 开关/温度/窗帘，AI 提议必须单次批准 |

手动面板操作=用户直接控制，允许（不需批准）。AI 提议的 transaction 生成 `needs_approval` 待批准卡片（批准/拒绝）；批准后 SimulatedAdapter 改状态并写行动账本：意图→批准→执行→模拟受理回执。拒绝写 denied。风险级不由意图自 declare，而由能力映射解析（防伪造提权）。

## 适配器骨架（真实接入点）

`DeviceAdapter` 接口：`discover()/getState(id)/execute(id,capability,args)`。
- `SimulatedAdapter`：进程内改 registry 状态，返回 `{simulated:true,accepted:true,...}`。
- `HomeAssistantAdapter`：空壳，方法签名+TODO，无真实网络调用。真实接入时由宿主注入 `{baseUrl,token}`，`discover`=GET /api/states、`getState`=GET /api/states/{entity_id}、`execute`=POST /api/services/{domain}/{service}；**风险门控与鉴权在宿主**，适配器只执行已批准意图。

## 产生待批准操作的来源

- 主动判断（initiative.js deviceProposal，如深夜回宿舍建议开灯）。
- 聊天指令（`detectCommand`，如「回宿舍把客厅灯打开」「空调调到24度」）。

## 与 whale-core 的对应

能力枚举思路对应 `devices/capabilities.py`（contracts/v2 单一事实源）；行动账本对应 `devices/action_records.py` 与 gateway 的「谁触发、什么风险级、谁批准」可审计要求。Demo 未接 contracts/v2 设备总线，不修改 whale-core。

## 真实接入边界

当前 online/state 为模拟常量；无真实发现/配对/验签。真实版需 DeviceGateway 验签、registry 查表、单笔限额+日限（transaction）、失败回执不自动重试（unknown 语义）。不声称已集成。
