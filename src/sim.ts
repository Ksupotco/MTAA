// 群聊拟真层（仅展示）：虚构人物、群资料、公告样式、附件/接龙/图片占位、引用回复与系统提示。
// 不改动 lib/ 中的消息与权限逻辑：作者键仍是「老师/助教/成员/我…」，这里只映射为更像真实群聊的显示。
export type Persona = { name: string; short: string; tag?: string; color: string };
const P = (name: string, color: string, tag?: string): Persona => ({ name, short: name.replace(/^.*·\s*/, "").replace(/（.*?）/, ""), tag, color });

export const groups: Record<string, { title: string; members: number; icon: string; color: string; kind: "study" | "life" }> = {
  course: { title: "数字电路 · 2024级1班", members: 86, icon: "课", color: "#5d7351", kind: "study" },
  club: { title: "摄影社 · 活动通知", members: 142, icon: "社", color: "#c99a3a", kind: "life" },
  project: { title: "Whale 智能眼镜项目组", members: 6, icon: "项", color: "#bc5a34", kind: "study" },
  lab: { title: "微纳实验室通知群", members: 23, icon: "实", color: "#4c6a7a", kind: "study" },
  home: { title: "3栋302 & 楼长通知", members: 48, icon: "生", color: "#8a6a9a", kind: "life" },
};

const personas: Record<string, Record<string, Persona>> = {
  course: { 老师: P("王老师", "#5d7351", "群主"), 助教: P("林助教", "#6a8f6b", "管理员"), 成员: P("陈一鸣", "#a3a19a") },
  club: { 社长: P("周社长", "#c99a3a", "群主"), 组织部: P("组织部 · 小许", "#d9a85a", "管理员"), 成员: P("李想", "#a3a19a") },
  project: { 负责人: P("赵学长", "#bc5a34", "群主"), 成员: P("孙小雨", "#a3a19a") },
  lab: { 实验员: P("刘老师（实验员）", "#4c6a7a", "群主"), 师兄: P("何师兄", "#7d94a0") },
  home: { 楼长: P("张阿姨（楼长）", "#8a6a9a", "群主"), 室友: P("室友 · 阿杰", "#b08fb8") },
};
const ME: Persona = { name: "我", short: "我", color: "#bc5a34", tag: "管理员" };
export function persona(scene: string, author: string): Persona {
  if (author === "我") return ME;
  return personas[scene]?.[author] || P(author, "#a3a19a");
}

const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return Math.abs(h); };
const NOTICE = /提交|截止|集合|会议|培训|检查|报修|例会|延期|改到|取消|上交|上门/;
export function isNotice(scene: string, m: any) {
  const p = persona(scene, m.author);
  return m.author !== "我" && (p.tag === "群主" || p.tag === "管理员") && NOTICE.test(m.text);
}
export function readCount(scene: string, m: any) {
  const total = groups[scene]?.members || 10;
  return { read: Math.min(total - 1, Math.round(total * 0.55) + (hash(m.id + m.text) % Math.max(2, Math.round(total * 0.4)))), total };
}

export type Attachment =
  | { type: "file"; name: string; size: string; ext: string }
  | { type: "images"; count: number; label: string }
  | { type: "relay"; title: string; count: number }
  | { type: "link"; title: string; sub: string };
const rules: [RegExp, Attachment][] = [
  [/课程设计11月20日至12月20日/, { type: "file", name: "课程设计任务书.pdf", size: "1.2 MB", ext: "PDF" }],
  [/选题表11月21日前提交/, { type: "file", name: "课设选题表-模板.xlsx", size: "18 KB", ext: "XLS" }],
  [/实验记录.*原始数据/, { type: "file", name: "实验记录模板（含原始数据页）.docx", size: "42 KB", ext: "DOC" }],
  [/活动照片/, { type: "images", count: 3, label: "上次外拍精选" }],
  [/志愿服务11月22日/, { type: "relay", title: "志愿服务报名接龙", count: 23 }],
  [/快递架/, { type: "images", count: 1, label: "快递架位置" }],
  [/湖边首测不错/, { type: "images", count: 2, label: "湖边首测截图" }],
  [/会议室/, { type: "link", title: "线上会议室 · 点击入会", sub: "会议号 728 316 905" }],
  [/安全培训11月28日/, { type: "file", name: "实验室安全手册2026版.pdf", size: "3.4 MB", ext: "PDF" }],
];
export function attachmentFor(m: any): Attachment | null {
  for (const [re, a] of rules) if (re.test(m.text)) return a;
  return null;
}
// 系统提示：撤回、拍一拍等，增加真实群聊的节奏感（纯展示，不进入任何提取）。
const systemAfter: Record<string, string[]> = {
  "这次作业量大吗？": ["陈一鸣 撤回了一条消息"],
  "卷王。": ["李想 拍了拍 我"],
  "原始数据放哪？": ["刘老师（实验员） 设置了群公告"],
  "早餐帮我带一份。": ["室友 · 阿杰 拍了拍 我"],
};
export const systemLines = (m: any) => systemAfter[m.text] || [];
export function quoteFor(list: any[], i: number) {
  const m = list[i], prev = list[i - 1];
  if (!prev || !/[？?]$/.test(m.text) || prev.author === m.author || m.time - prev.time > 30 * 60000) return null;
  return prev;
}
export const weekday = (ms: number) => "周" + "日一二三四五六"[new Date(ms + 8 * 3600000).getUTCDay()];
