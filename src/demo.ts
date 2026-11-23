// 一键自动演示（约 30 秒）：消息 → 待办建议 → 确认 → 溯源 → 主动提醒 → 设备联动。
// 演示从初始数据开始，并临时使用规则引擎保证节奏稳定；结束后恢复你原来的理解模式。
import * as E from "../lib/engine.js";
import { store, notify, persist, resetData, sendMessage, moveClock, act, setTrack, type View } from "./store";

type Nav = { goto: (v: View) => void; openSplit: (t: any) => void; closeSplit: () => void };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let cancelled = false;
export function stopDemo() { cancelled = true; store.demo.running = false; store.typing = null; notify(); }

const STEPS = 8;
function caption(step: number, text: string, sub = "") { store.demo = { running: true, step, total: STEPS, caption: text, sub }; notify(); }
async function wait(ms: number) { const end = Date.now() + ms; while (Date.now() < end) { if (cancelled) throw new Error("stopped"); await sleep(80); } }
function scrollTo(sel: string) { document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "center" }); }

export async function runDemo(nav: Nav) {
  if (store.demo.running || store.busy) return;
  cancelled = false;
  const prevMode = store.extractMode;
  try {
    resetData(); setTrack("study"); store.extractMode = "rules"; store.initiative.enabled = true; store.reminderOpen = false;
    nav.closeSplit();

    caption(1, "课程群里，助教发来一条新通知", "混在闲聊和表情包之间，最容易被刷过去");
    store.active = "course"; nav.goto("messages"); await wait(900);
    store.typing = { scene: "course", author: "助教" }; notify(); await wait(1600);
    const text = "数电第三次实验报告明天18:00前提交到学习通，命名：学号-姓名-实验3";
    await sendMessage(text, "助教", { forceRules: true }); await wait(1800);

    caption(2, "Whale 读懂通知，生成「待办建议」", "不直接替你做决定：附原文证据，等你确认");
    nav.goto("center"); await wait(500); scrollTo('[data-tour="suggestions"]'); await wait(2600);

    const s = store.states.course; const sug = s.suggestions.filter((g: any) => g.status === "pending").at(-1);
    caption(3, "一键确认，进入跨群日程", "也可以删除；删除的建议能随时恢复");
    let taskId = "";
    if (sug) { const r: any = act.addSug("course", sug.id); taskId = r?.taskId || ""; }
    await wait(2200);

    caption(4, "点开事项：原文高亮 + 编号连线，每个字段都可追溯", "时间精度、地点、要求、变化记录一目了然");
    if (taskId) nav.openSplit({ type: "task", id: taskId, scene: "course" });
    await wait(4200); nav.closeSplit();

    caption(5, "时间快进到截止前 1 小时，主动判断开始工作", "静默时段 / 每日配额 / 反馈过滤 —— 宁可漏提醒，不乱打扰");
    const t = s.tasks.find((x: any) => x.id === taskId);
    nav.goto("initiative"); await wait(900);
    if (t) await moveClock(E.reminderAt(t));
    persist(); await wait(1800);

    caption(6, "提醒以手机通知的样子到达", "可以「知道了」，也可以「不再提醒这类」");
    store.reminderOpen = true; notify(); await wait(3200);

    caption(7, "切到生活场景：在宿舍群里说一句话", "Whale 识别出设备指令，但不会擅自执行");
    setTrack("life"); store.active = "home"; nav.goto("messages"); await wait(900);
    store.typing = { scene: "home", author: "我" }; notify(); await wait(1200);
    await sendMessage("我快到宿舍了，帮我把客厅灯打开", "我", { forceRules: true }); await wait(1600);

    caption(8, "高风险操作需要你单次批准，执行结果写入行动账本", "设备为模拟受理，接口已预留 HomeAssistant 适配");
    nav.goto("devices"); await wait(1500);
    const pending = store.states.home.devices.pending.filter((p: any) => p.status === "needs_approval").at(-1);
    if (pending) { scrollTo('[data-tour="approval"]'); await wait(1200); await act.devApprove(pending.id); }
    await wait(2600);

    store.demo = { running: false, step: STEPS, total: STEPS, caption: "", sub: "" };
    store.notice = "演示完成。现在轮到你：去「消息来源」发一条自己的通知，或在侧栏切换「AI整理」体验真实模型。";
    nav.goto("center");
  } catch { /* stopped */ }
  finally { store.extractMode = prevMode; store.typing = null; store.demo.running = false; persist(); notify(); }
}
