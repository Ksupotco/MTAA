// 域状态 store：复用 lib 纯逻辑，移植原 vanilla app 的持久化/迁移/时钟/发送/门控行为。
import * as E from "../lib/engine.js";
import * as M from "../lib/memory.js";
import * as D from "../lib/devices.js";
import * as I from "../lib/initiative.js";
import { processAIMessage, processMemoryAI, decideInitiativeAI } from "../lib/ai-client.js";

export const KEY = "whale.visual-demo.v2";
export type View = "center" | "messages" | "memory" | "initiative" | "devices";

const listeners = new Set<() => void>();
export function notify() { listeners.forEach((f) => f()); }
export function subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }

export const store = {
  states: {} as Record<string, any>,
  followed: new Set<string>(["course", "club", "project"]),
  active: "course",
  extractMode: "ai" as "ai" | "rules",
  initiative: I.initInitiative() as any,
  demoAuthor: "我",
  busy: false,
  focusMessageId: null as string | null,
  notice: "",
  memoryAIEnabled: false,
  selected: null as string | null,
};

// 载入 + v1→v2 迁移
try {
  const old = JSON.parse(localStorage.getItem(KEY) || "null");
  if (old && E.scenarios.some((s: any) => s.id === old.active)) {
    store.active = old.active;
    if (["ai", "rules"].includes(old.extractMode)) store.extractMode = old.extractMode;
    if (Array.isArray(old.groups)) store.followed = new Set(old.groups.filter((id: string) => E.scenarios.some((x: any) => x.id === id)));
    for (const [id, s] of Object.entries<any>(old.states || {})) {
      if (s.version === 1 && Array.isArray(s.messages) && Array.isArray(s.tasks) && Array.isArray(s.reminders) && Number.isFinite(s.now) && Number.isInteger(s.seq)) {
        s.suggestions = s.suggestions || []; s.memory = s.memory || []; D.initDevices(s); store.states[id] = s;
      }
    }
    if (old.initiative) store.initiative = { ...I.initInitiative(), ...old.initiative };
  }
} catch { /* ignore */ }
E.scenarios.forEach((x: any) => { if (!store.states[x.id]) store.states[x.id] = E.fresh(x.id); });
Object.values(store.states).forEach((s: any) => { s.suggestions = s.suggestions || []; s.memory = s.memory || []; D.initDevices(s); });
Object.values(store.states).forEach((s: any) => {
  if (s.publisherVersion !== 2) { if (Array.isArray(s.publisherOverride) && !s.publisherOverride.includes("我")) s.publisherOverride.push("我"); E.rebuildPublisherTasks(s); }
  else if (s.noticeParserVersion !== 1) E.rebuildPublisherTasks(s);
});
const latestClock = Math.max(...Object.values(store.states).map((s: any) => s.now));
Object.values(store.states).forEach((s: any) => { s.now = latestClock; });

export const state = () => store.states[store.active];
export const tickStates = () => E.scenarios.filter((x: any) => store.followed.has(x.id)).map((x: any) => store.states[x.id]);
export const allRows = () => E.scenarios.filter((x: any) => store.followed.has(x.id)).flatMap((sc: any) => store.states[sc.id].tasks.map((t: any) => ({ scene: sc, task: t })));
export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 2, active: store.active, states: store.states, groups: [...store.followed], extractMode: store.extractMode, initiative: store.initiative })); } catch { store.notice="浏览器保存失败，请检查存储空间；当前操作尚未持久化。"; }
}

// 时钟 + 节拍（AI 配置时走 /api/v1/initiative，否则模拟）
let ticking = false; let playTimer: any = null;
async function runTicks(from: number, to: number) {
  const ini = store.initiative; const iv = ini.interval * 60000; const steps = Math.floor((to - from) / iv); const ts = tickStates();
  const at = async (t: number) => { const ai = store.extractMode === "ai" ? await decideInitiativeAI(I.buildContext(ts, t, ini)) : null; I.tick(ts, t, ini, { aiDecision: ai }); };
  if (steps > 12) await at(to); else { for (let k = 1; k <= steps; k++) await at(from + k * iv); if (to > from + steps * iv) await at(to); }
}
export async function moveClock(to: number) {
  if (ticking) return; ticking = true;
  try { const from = state().now; Object.values(store.states).forEach((s: any) => { s.now = to; }); await runTicks(from, to); notify(); }
  finally { ticking = false; }
}
export function setAutoplay(on: boolean) {
  store.initiative.autoplay = on; clearInterval(playTimer);
  if (on) playTimer = setInterval(() => { if (store.busy) return; moveClock(state().now + (Number(store.initiative.speed) || 1) * 60000).then(() => { persist(); }); }, 1000);
  persist(); notify();
}

// 发送（规则→建议；AI→建议；记忆候选；聊天设备指令）
export async function sendMessage(text: string, author: string) {
  if (store.busy || !text.trim()) return {kind:"ignored",text:"请等待上一条消息完成，或填写消息内容。"};
  const s = state(); store.busy = true; notify();
  let outcome: any;
  try {
    if (store.extractMode === "rules") outcome = E.extractSuggestion(s, text, author);
    else {
      const message = { id: "m" + ++s.seq, author, text, time: s.now, outcome: { kind: "ai_pending", text: "等待AI整理" } };
      s.messages.push(message); (s as any).lastSendMessageId = message.id; persist(); notify();
      outcome = await processAIMessage(s, message);
    }
    const last = s.messages.at(-1);
    if (last) { M.extractInto(s, last, "rules"); if (store.extractMode === "ai" && store.memoryAIEnabled) void processMemoryAI(s, last).then(() => { persist(); notify(); }); const cmd = D.detectCommand(text); if (cmd && E.publishers(s).includes(author)) D.propose(s, { ...cmd, source: "chat", reason: "聊天指令：" + text }); }
  } catch { outcome = { kind: "error", text: "整理未完成，消息已保留，请重试。" }; }
  store.busy = false; persist(); notify();
  return outcome;
}
export async function retryPending() {
 if(store.busy)return;store.busy=true;notify();let done=0;
 try{const pend=tickStates().flatMap((s:any)=>s.messages.filter((m:any)=>E.publishers(s).includes(m.author)&&(m.outcome?.kind==="ai_pending"||(m.outcome?.kind==="review"&&!m.taskId))).map((m:any)=>({s,id:m.id})));
 for(const {s,id} of pend){const o=await processAIMessage(s,s.messages.find((m:any)=>m.id===id));persist();if(o.code==="AI_NOT_CONFIGURED"){store.notice=o.text;break;}if(o.kind!=="ai_pending")done++;}if(!store.notice)store.notice=`已重新处理 ${done} 条消息。`;
 }catch{store.notice="重试未完成，消息仍保留，可稍后重试。";}finally{store.busy=false;persist();notify();}
}

// 便捷动作
export const act = {
  addSug: (scene: string, id: string) => { const r = E.applySuggestion(store.states[scene], id, "add"); persist(); notify(); return r; },
  dismissSug: (scene: string, id: string) => { E.applySuggestion(store.states[scene], id, "dismiss"); persist(); notify(); },
  restoreSug: (scene: string, id: string) => { E.applySuggestion(store.states[scene], id, "restore"); persist(); notify(); },
  promote: (scene: string, id: string) => { M.promote(store.states[scene], id, store.states[scene].now); persist(); notify(); },
  forget: (scene: string, id: string) => { M.forget(store.states[scene], id, store.states[scene].now); persist(); notify(); },
  status: (id: string, st: string) => { E.changeStatus(state(), id, st); persist(); notify(); },
  devManual: async (id: string, cap: string, args: any) => { await D.manualControl(state(), id, cap, args); persist(); notify(); },
  devApprove: async (id: string) => { await D.approve(state(), id); persist(); notify(); },
  devReject: (id: string) => { D.reject(state(), id); persist(); notify(); },
  iniRead: (id: string) => { const r = store.initiative.inbox.find((x: any) => x.id === id); if (r) r.read = true; persist(); notify(); },
  iniStop: (topic: string) => { I.addFeedback(store.initiative, topic); store.initiative.inbox.forEach((x: any) => { if (x.topic === topic) x.read = true; }); persist(); notify(); },
  reset: () => { const now = state().now; store.states[store.active] = E.fresh(store.active); store.states[store.active].now = now; store.selected = null; persist(); notify(); },
};
