import { useEffect, useRef, useState } from "react";
import { Send, Users } from "lucide-react";
import { store, state, sendMessage, notify, persist } from "../store";
import { scenarios, memberDirectory, senderRole, publishers } from "../../lib/engine.js";
import { fmt, scName } from "../fmt";
import { GlassCard, Badge, Button } from "./ui";

export default function SourcesView() {
  const s = state();
  const messagesRef=useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(store.demoAuthor);
  const scene = scenarios.find((x: any) => x.id === store.active) || scenarios[0];
  const members = [...new Set([...(memberDirectory[s.scenario as keyof typeof memberDirectory] || []).map((m: any) => m.name), ...s.messages.map((m: any) => m.author)])];
  useEffect(() => { setAuthor("我"); }, [s.scenario]);
  const receipt = s.messages.find((m: any) => m.id === s.lastSendMessageId);
  useEffect(()=>{const target=store.focusMessageId||s.lastSendMessageId;const node=Array.from(messagesRef.current?.querySelectorAll<HTMLElement>("[data-message-id]")||[]).find(x=>x.dataset.messageId===target);node?.scrollIntoView({block:"center",behavior:"smooth"});},[s.scenario,s.messages.length,store.focusMessageId]);
  const submit = async (e: any) => { e.preventDefault(); if (!text.trim() || store.busy || !store.followed.has(store.active)) return; const t = text; store.focusMessageId=null; setText(""); await sendMessage(t, author); };
  return (
    <div>
      <GlassCard tour="sources" hover={false} className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Users className="h-5 w-5 text-whale-600" />
        <select aria-label="选择消息来源群" disabled={store.busy} value={store.active} onChange={(e) => { store.active = e.target.value; store.selected = null; persist(); notify(); }} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm">
          {scenarios.filter((x: any) => store.followed.has(x.id)).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <span className="text-xs text-slate-500">整理发布者：{publishers(s).join("、") || "未指定"}</span>
        <Badge tone="slate" className="ml-auto">模拟群聊 · 不接真实QQ</Badge>
      </GlassCard>
      <details className="mb-4 rounded-xl border border-line bg-white p-4"><summary className="cursor-pointer text-sm">管理关注来源 · {store.followed.size} 个群</summary><div className="mt-3 flex flex-wrap gap-4">{scenarios.map(sc=><label key={sc.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={store.followed.has(sc.id)} disabled={store.busy} onChange={e=>{if(e.target.checked)store.followed.add(sc.id);else store.followed.delete(sc.id);if(store.followed.size&&!store.followed.has(store.active))store.active=[...store.followed][0];store.focusMessageId=null;persist();notify();}}/>{sc.name}</label>)}</div><p className="mt-2 text-sm text-muted">取消关注只隐藏该群的事项，不删除消息。仅提供模拟来源。</p></details>
      {store.followed.size>0 ? <GlassCard hover={false} className="overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="font-display font-semibold text-slate-900">{scene.name}</div>
          <div className="text-xs text-slate-500">{scene.description}</div>
        </div>
        <div ref={messagesRef} role="log" aria-label="群聊消息" className="scrollbar-thin max-h-[480px] space-y-4 overflow-y-auto bg-slate-50/60 p-4">
          {s.messages.map((m: any, i: number) => (
            <div key={m.id} data-message-id={m.id} className={store.focusMessageId===m.id?"evidence-msg p-2":""}>
              {(i === 0 || m.time - s.messages[i - 1].time >= 5 * 60000) && <div className="my-2 text-center text-[11px] text-slate-400">{fmt(m.time)}</div>}
              <div className={`flex gap-2 ${m.author === "我" ? "flex-row-reverse" : ""}`}>
                <span className={`grid h-9 w-9 flex-none place-items-center rounded-xl text-sm font-semibold ${m.author === "我" ? "bg-whale-600 text-white" : "bg-whale-100 text-whale-700"}`}>{m.author.slice(0, 1)}</span>
                <div className={`max-w-[75%] ${m.author === "我" ? "text-right" : ""}`}>
                  <div className="mb-1 text-xs text-slate-500">{m.author}</div>
                  <div className={`inline-block rounded-2xl p-3 text-left text-sm ${m.author === "我" ? "rounded-tr-sm bg-whale-600 text-white" : "rounded-tl-sm border border-slate-200 bg-white text-slate-700"}`} style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{m.text}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="border-t border-slate-100 p-4">
          <details className="mb-2">
            <summary className="cursor-pointer text-xs text-slate-500">演示示例消息</summary>
            <div className="mt-2 flex flex-wrap gap-2">{scene.samples.map((x: string, i: number) => <button type="button" key={i} onClick={() => setText(x)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-whale-300">{x}</button>)}</div>
          </details>
          <textarea aria-label="输入模拟群消息" value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={8000} placeholder="输入模拟消息，Ctrl+Enter 发送" className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:border-whale-400 focus:outline-none"
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit(e); }} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select aria-label="模拟发送者" disabled={store.busy} value={author} onChange={(e) => { setAuthor(e.target.value); store.demoAuthor = e.target.value; }} className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs">
              {members.map((m: any) => <option key={m} value={m}>{m} · {senderRole(s, m)}</option>)}
            </select>
            <Button type="submit" disabled={store.busy || !text.trim()}><Send className="h-4 w-4" />{store.busy ? "发送中…" : "发送"}</Button>
            <span className="text-xs text-slate-500">{receipt?.outcome?.text || ""}</span>
          </div>
        </form>
      </GlassCard> : <GlassCard className="p-8 text-center"><p>尚未关注任何群聊，请在上方选择需要整理的来源。</p></GlassCard>}
    </div>
  );
}
