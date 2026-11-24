import { useMemo, useState } from "react";
import { GitBranch, RefreshCw, RotateCcw } from "lucide-react";
import { currentGroupMemories, freshGroupDemo, refreshGroupDemo, segmentGroupMessages, stageGroupMessage } from "../../lib/group-memory-demo.js";
import { Badge, Button, GlassCard } from "./ui";

const time = (ms: number) => new Date(ms).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const colors: Record<string, string> = { active: "#427a69", superseded: "#b88245", revoked: "#a87171" };

export default function GroupMemoryDemo() {
  const [data, setData] = useState<any>(freshGroupDemo);
  const [selected, setSelected] = useState("group");
  const [notice, setNotice] = useState("群消息已备好；点击「手动整合」形成记忆");
  const segments = useMemo(() => segmentGroupMessages(data.messages), [data.messages]);
  const current = currentGroupMemories(data);
  const pending = data.messages.filter((m: any) => !data.processed.includes(m.id)).length;
  const old = data.memories.find((m: any) => m.id === "meeting-v1");
  const newer = data.memories.find((m: any) => m.id === "meeting-v2");
  const canCorrect = old?.status === "active" && !data.messages.some((m: any) => m.id === "g5");
  const canRevoke = newer?.status === "active" && !data.messages.some((m: any) => m.id === "g6");
  const message = data.messages.find((m: any) => `source-${m.id}` === selected);
  const memory = data.memories.find((m: any) => m.id === selected);
  const points = data.memories.map((m: any, i: number) => ({ ...m, x: 360, y: 90 + i * 125 }));
  function refresh() {
    const next = refreshGroupDemo(data);
    setData(next);
    setNotice(next.lastRefresh.processed ? `已整合 ${next.lastRefresh.processed} 条新消息；再次刷新不会重复写入` : "没有新消息，本次没有重复写入");
    if (next.memories.length && selected === "group") setSelected(next.memories[0].id);
  }
  function stage(kind: "correction" | "revoke") {
    setData(stageGroupMessage(data, kind));
    setNotice(kind === "correction" ? "更正消息已进入群聊，点击「手动整合」更新事实" : "撤销消息已进入群聊，点击「手动整合」使当前安排失效");
  }
  return <GlassCard hover={false} className="mb-6 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><GitBranch className="h-5 w-5 text-whale-600"/><h2 className="font-display text-lg font-bold">群记忆工作台</h2><Badge tone="whale">虚构数据演示</Badge></div>
        <p className="mt-1 text-sm text-slate-600">一段群聊怎样形成话题、成员偏好和可更正的事实。所有操作只影响这张演示卡片</p></div>
      <Button size="sm" variant="ghost" onClick={() => { setData(freshGroupDemo()); setSelected("group"); setNotice("演示已重置"); }}><RotateCcw className="h-3 w-3"/>重置</Button>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button onClick={refresh}><RefreshCw className="h-3 w-3"/>手动整合 {pending ? `（${pending} 条待处理）` : "（无新消息）"}</Button>
      <Button variant="ghost" disabled={!canCorrect} onClick={() => stage("correction")}>加入更正消息</Button>
      <Button variant="ghost" disabled={!canRevoke} onClick={() => stage("revoke")}>加入撤销消息</Button>
      <span role="status" className="text-xs text-slate-600">{notice}</span>
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(310px,0.75fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-3" aria-label="二维记忆图谱">
        <div className="flex items-center justify-between px-1"><b className="text-sm">二维记忆图谱</b><span className="text-xs text-slate-500">点击节点看依据</span></div>
        <div className="overflow-x-auto"><svg viewBox="0 0 800 470" className="mt-2 min-w-[590px] w-full" role="img" aria-label="项目群、成员、记忆和原消息之间的关系">
          {points.map((m: any) => <g key={`edge-${m.id}`} stroke="#b8c5c0" strokeWidth="2" fill="none"><path d={`M 137 ${m.subject === "小禾" ? 350 : 180} Q 235 ${m.y}, 302 ${m.y}`} /><path d={`M 419 ${m.y} L 611 ${m.y}`} />{m.previous && <path strokeDasharray="5 5" d={`M 360 ${points.find((p: any) => p.id === m.previous)?.y ?? 90} L 360 ${m.y}`} />}</g>)}
          {([{ id: "group", x: 94, y: 180, label: "项目群", color: "#5e8175" }, { id: "member", x: 94, y: 350, label: "小禾", color: "#8a769a" }, ...points.map((m: any) => ({ id: m.id, x: m.x, y: m.y, label: m.id === "member-preference" ? "表达偏好" : m.id === "meeting-v1" ? "原安排" : "更正安排", color: colors[m.status] })), ...points.map((m: any) => ({ id: `source-${m.evidence}`, x: 670, y: m.y, label: "原话证据", color: "#aa8a61" }))] as any[]).map(node => <g key={node.id} role="button" tabIndex={0} aria-label={`查看${node.label}`} onClick={() => setSelected(node.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSelected(node.id); }} className="cursor-pointer"><circle cx={node.x} cy={node.y} r={selected === node.id ? 52 : 46} fill={node.color} stroke={selected === node.id ? "#253e44" : "white"} strokeWidth="4"/><text x={node.x} y={node.y + 5} textAnchor="middle" fill="white" fontSize="15" fontWeight="600">{node.label}</text></g>)}
        </svg></div>
        <div className="rounded-xl bg-slate-50 p-3 text-sm"><b>当前可用记忆：</b>{current.length ? current.map((m: any) => m.summary).join("；") : "暂无。候选尚未整合，或安排已撤销"}</div>
        <div className="mt-2 rounded-xl bg-teal-50 p-3 text-sm"><b>演示中的提醒判断：</b>{current.some((m: any) => m.slot === "meeting") ? "可依据当前项目讨论安排准备提醒" : data.memories.some((m: any) => m.slot === "meeting") ? "讨论已撤销，不再依据旧安排提醒" : "尚无已整合的讨论安排"}</div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm" aria-live="polite">
        <b>节点详情</b>
        {message ? <><p className="mt-3 font-medium">{message.author} · {time(message.time)}</p><blockquote className="mt-2 border-l-2 border-teal-400 pl-3">{message.text}</blockquote><p className="mt-2 text-xs text-slate-500">虚构项目群 · 消息 {message.id}</p></>
          : memory ? <><p className="mt-3 font-medium">{memory.summary}</p><p className="mt-2">类型：{memory.kind} · 状态：{memory.status === "active" ? "当前有效" : memory.status === "superseded" ? "已被更正" : "已撤销"}</p><p className="mt-1 text-xs text-slate-500">主体：{memory.subject}{memory.previous ? ` · 接替 ${memory.previous}` : ""}</p><button className="mt-3 text-whale-700 underline" onClick={() => setSelected(`source-${memory.evidence}`)}>查看来源原话</button>{memory.changedBy && <button className="ml-3 text-whale-700 underline" onClick={() => setSelected(`source-${memory.changedBy}`)}>查看更正或撤销原话</button>}</>
          : <><p className="mt-3">{selected === "member" ? "小禾的群内自述形成一条表达偏好：先看图，再讨论细节。这是有来源的简短画像，不推测性格" : "项目群空间保留群公共事实和成员公开自述；旧版本留在图中，但退出当前可用记忆"}</p>{selected === "member" && data.memories.some((m: any) => m.slot === "preference") && <button className="mt-3 text-whale-700 underline" onClick={() => setSelected("source-g2")}>查看小禾的原话</button>}</>}
      </section>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {segments.map((segment: any, index: number) => <div key={segment.id} className="rounded-2xl border border-slate-200 bg-white/70 p-3"><b className="text-sm">对话段 {index + 1}</b><span className="ml-2 text-xs text-slate-500">{segment.messages.length} 条 · 间隔超过 30 分钟自动分段</span>
        <div className="mt-2 flex flex-wrap gap-1">{segment.keywords.map((word: string) => <span key={word} className="rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-800">{word}</span>)}</div>
        {segment.messages.map((m: any) => <button key={m.id} onClick={() => setSelected(`source-${m.id}`)} className="mt-2 block w-full rounded-lg px-2 py-1 text-left text-xs hover:bg-slate-100"><b>{m.author}</b> · {time(m.time)} · {m.text}</button>)}
      </div>)}
    </div>
  </GlassCard>;
}
