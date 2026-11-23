// 短周期主动判断（理想化模拟 + 真实接入口 /api/v1/initiative）。
// 概念对应 whale-core：ProactiveDraft → 门控(授权/静默/忙碌/配额/审批) → 决策账本 → 用户反馈过滤。
import {reminderAt, longReminderAt, day, fmt} from './engine.js';
import {recall} from './memory.js';
import {propose, riskFor} from './devices.js';
export const QUIET = { start: 23, end: 8 };
export const localHour = now => new Date(now + 8 * 3600000).getUTCHours();
export const inQuiet = now => { const h = localHour(now); return h >= QUIET.start || h < QUIET.end; };

export function initInitiative() {
  return { enabled: true, interval: 5, lastTick: null, used: 0, usedDate: null, feedback: [], ledger: [], inbox: [], activity: '' };
}
export function inferActivity(states, now) {
  const recent = states.flatMap(s => s.messages).filter(m => now - m.time < 6 * 3600000).sort((a, b) => b.time - a.time);
  for (const m of recent) {
    if (/湖边|调试|首测|眼镜/.test(m.text)) return '在湖边调试眼镜';
    if (/实验室|标定/.test(m.text)) return '在实验室';
    if (/宿舍|报告|写/.test(m.text)) return '在宿舍写报告';
  }
  return '在宿舍';
}
export function buildContext(states, now, ini) {
  const tasks = states.flatMap(s => s.tasks.map(t => ({ ...t, group: s.scenario })));
  const upcoming = tasks.filter(t => t.status === 'todo' && t.due && t.due >= now && t.due - now <= 24 * 3600000);
  // 逾期只主动提醒一次（overdueNotified），避免每个节拍重复打扰。
  const overdue = tasks.filter(t => t.status === 'todo' && t.due && t.due < now && !t.overdueNotified);
  const deadline = tasks.filter(t => t.status === 'todo' && t.due && t.due >= now && !t.reminded && reminderAt(t) <= now);
  const longDue = tasks.filter(t => t.status === 'todo' && longReminderAt(t, now) !== null && longReminderAt(t, now) <= now);
  const newMessages = states.flatMap(s => s.messages.filter(m => m.time > (ini.lastTick ?? now - ini.interval * 60000)).map(m => ({ ...m, group: s.scenario })));
  const query = (ini.activity || inferActivity(states, now)) + ' ' + upcoming.concat(overdue).map(t => t.title).join(' ');
  const memories = states.flatMap(s => recall(s, query, now, { limit: 3 })).map(h => ({ summary: h.record.summary, importance: h.record.importance, space: h.record.space }));
  const usedDate = day(now);
  const used = ini.usedDate === usedDate ? ini.used : 0;
  return { now, activity: ini.activity || inferActivity(states, now), upcoming, overdue, deadline, longDue, newMessages, memories, policy: { quiet: inQuiet(now), quota: 6, used, feedback: ini.feedback } };
}
export function promptText(ctx) {
  return [
    `当前演示时间：${fmt(ctx.now)}`,
    `用户在做什么：${ctx.activity}`,
    `未来24h日程：${ctx.upcoming.map(t => t.title + '@' + fmt(t.due)).join('；') || '无'}`,
    `已逾期：${ctx.overdue.map(t => t.title).join('；') || '无'}`,
    `临近截止信号：${ctx.deadline.map(t => t.title).join('；') || '无'}`,
    `新消息：${ctx.newMessages.map(m => m.author + ':' + m.text).join('；') || '无'}`,
    `相关记忆：${ctx.memories.map(m => m.summary).join('；') || '无'}`,
    `打扰策略：静默${QUIET.start}:00–0${QUIET.end}:00=${ctx.policy.quiet} 配额${ctx.policy.used}/${ctx.policy.quota} 反馈[${ctx.policy.feedback.join(',')}]`
  ].join('\n');
}
const filtered = (ctx, topic) => ctx.policy.feedback.includes(topic);
export function simulateDecision(ctx) {
  const silent = (reason) => ({ action: 'silent', text: '', reason, evidence: [], urgency: 'low', deviceProposal: null });
  if (ctx.policy.quiet) return silent('静默期（23:00–08:00），不打扰');
  if (ctx.policy.used >= ctx.policy.quota) return silent('每日配额已满，延后');
  // 临近截止仍可补救，优先于已逾期事项。
  if (ctx.deadline.length && !filtered(ctx, 'deadline')) return { action: 'remind', text: `临近截止：${ctx.deadline.map(t => t.title).join('、')}。`, reason: '到达演示提醒信号（reminderAt）', evidence: ctx.deadline.map(t => t.sources[0]).filter(Boolean), urgency: 'normal', deviceProposal: null };
  if (ctx.overdue.length && !filtered(ctx, 'deadline')) return { action: 'remind', text: `已逾期：${ctx.overdue.map(t => t.title).join('、')}，请核对进度。`, reason: '存在逾期事项', evidence: ctx.overdue.map(t => t.sources[0]).filter(Boolean), urgency: 'high', deviceProposal: null };
  const important = ctx.newMessages.filter(m => /提交|截止|集合|会议|培训|延期|取消|报修/.test(m.text));
  if (important.length && !filtered(ctx, 'message')) return { action: 'message', text: `新重要消息：${important[0].author}「${important[0].text.slice(0, 40)}」`, reason: '节拍以来出现重要群消息', evidence: [important[0].id], urgency: 'normal', deviceProposal: null };
  const h = localHour(ctx.now);
  if (h >= 22 && /宿舍/.test(ctx.activity) && !filtered(ctx, 'device')) return { action: 'message', text: '回宿舍了，建议打开客厅灯。', reason: '深夜回宿舍场景', evidence: [], urgency: 'low', deviceProposal: { deviceId: 'living_light', capability: 'on_off', args: { on: true }, reason: '深夜回宿舍照明' } };
  return silent('无值得打扰的事件');
}
export function gate(decision, ctx, ini) {
  if (!ini.enabled) return { status: 'disabled', reason: '主动判断已关闭' };
  if (ctx.policy.quiet) return { status: 'deferred', reason: '静默期延后' };
  if (ctx.policy.used >= ctx.policy.quota) return { status: 'deferred', reason: '配额延后' };
  if (decision.deviceProposal && riskFor(decision.deviceProposal.capability) !== 'read_only') return { status: 'needs_approval', reason: '设备操作需单次批准' };
  return { status: 'ready', reason: '授权且在配额内' };
}
export function addFeedback(ini, topic) { if (!ini.feedback.includes(topic)) ini.feedback.push(topic); }

// 一个节拍：构造提示词 → 判断（模拟或AI）→ 门控 → 账本 + 收件箱/设备提议。
export function tick(states, now, ini, { aiDecision = null, deliver = true } = {}) {
  const ctx = buildContext(states, now, ini);
  const decision = aiDecision || simulateDecision(ctx);
  const g = gate(decision, ctx, ini);
  const entry = { id: 'tick' + (ini.ledger.length + 1), at: now, promptSummary: `${fmt(now)} · ${ctx.activity} · 逾期${ctx.overdue.length}/临近${ctx.deadline.length}/新消息${ctx.newMessages.length}`, prompt: promptText(ctx), decision, gate: g, delivered: false, engine: aiDecision ? 'ai' : 'sim' };
  if (deliver && g.status === 'ready' && (decision.action === 'remind' || decision.action === 'message')) {
    ini.inbox.push({ id: 'pr' + (ini.inbox.length + 1), at: now, action: decision.action, text: decision.text, reason: decision.reason, urgency: decision.urgency, evidence: decision.evidence, topic: decision.deviceProposal ? 'device' : (decision.reason.includes('逾期') || decision.reason.includes('reminderAt') ? 'deadline' : 'message'), read: false });
    ini.used = (ini.usedDate === day(now) ? ini.used : 0) + 1; ini.usedDate = day(now);
    // 任务ID只在群内唯一：按 group + id 定位原任务。
    const source = t => states.find(s => s.scenario === t.group)?.tasks.find(x => x.id === t.id);
    for (const t of ctx.deadline) { const src = source(t); if (src) src.reminded = true; }
    if (decision.action === 'remind') for (const t of ctx.overdue) { const src = source(t); if (src) src.overdueNotified = true; }
    entry.delivered = true;
  }
  if (deliver && g.status === 'needs_approval' && decision.deviceProposal) {
    for (const s of states) { propose(s, { ...decision.deviceProposal, source: 'initiative', evidence: decision.evidence }); break; }
  }
  ini.ledger.push(entry); ini.lastTick = now;
  return entry;
}
