import { useState } from "react";
import { Lightbulb, AirVent, Blinds, Speaker, Lock, ShieldCheck, ScrollText, Check, X } from "lucide-react";
import { state, act } from "../store";
import { fmt } from "../fmt";
import { GlassCard, Badge, Button, SectionHeading } from "./ui";

const icons: any = { light: Lightbulb, ac: AirVent, curtain: Blinds, speaker: Speaker, sensor: Lock };
const riskTone: any = { read_only: "green", communicate: "amber", transaction: "rose" };
export default function DevicesView() {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const run=async(action:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);setError("");try{await action();}catch{setError("模拟操作未完成，请检查设备状态后重试。");}finally{setBusy(false);}};
  const dev = state().devices || { registry: [], pending: [], ledger: [] };
  const pending = dev.pending.filter((p: any) => p.status === "needs_approval");
  const stateText = (d: any) => d.type === "light" ? (d.state.on ? "开" : "关") : d.type === "ac" ? (d.state.on ? `开 · ${d.state.temp}℃` : "关") : d.type === "curtain" ? (d.state.open ? "开" : "关") : d.type === "speaker" ? (d.state.playing ? "播放中" : "停止") : (d.state.locked ? "已锁" : "未锁");
  return (
    <div>
      <p className="mb-4 text-sm text-muted">设备与回执均为模拟，不控制真实设备。</p>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-rose-800">{error}</p>}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {dev.registry.map((d: any) => { const Icon = icons[d.type] || Lightbulb; return (
          <GlassCard tour={d.id==="living_light"?"devices":undefined} key={d.id} className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 font-display font-semibold text-slate-900"><Icon className="h-5 w-5 text-whale-600" />{d.name}</span>
              <Badge tone={d.online ? "green" : "slate"}>{d.online ? "在线" : "离线"}</Badge>
            </div>
            <div className="mb-1 text-sm text-slate-600">{stateText(d)}</div>
            <Badge tone={riskTone[d.riskTier]}>{d.riskTier}</Badge>
            <div className="mt-3 flex flex-wrap gap-2">
              {d.capabilities.filter((c: string) => c !== "get_state").map((c: string) => c === "on_off" ? (
                <Button key={c} size="sm" variant="soft" disabled={busy || !d.online} onClick={() => run(() => act.devManual(d.id, "on_off", { on: !d.state.on }))}>{d.state.on ? "关闭" : "打开"}</Button>
              ) : c === "open_close" ? (
                <Button key={c} size="sm" variant="soft" disabled={busy || !d.online} onClick={() => run(() => act.devManual(d.id, "open_close", { open: !d.state.open }))}>{d.state.open ? "关上" : "打开"}</Button>
              ) : c === "set_temperature" ? (
                <span key={c} className="flex gap-2"><Button size="sm" variant="soft" disabled={busy || !d.online} onClick={() => run(() => act.devManual(d.id, "set_temperature", { temp: 24 }))}>24℃</Button><Button size="sm" variant="soft" disabled={busy || !d.online} onClick={() => run(() => act.devManual(d.id, "set_temperature", { temp: 28 }))}>28℃</Button></span>
              ) : c === "play" ? (
                <Button key={c} size="sm" variant="soft" disabled={busy || !d.online} onClick={() => run(() => act.devManual(d.id, "play", { playing: !d.state.playing }))}>{d.state.playing ? "停止" : "播放"}</Button>
              ) : null)}
            </div>
          </GlassCard>
        ); })}
      </div>

      <SectionHeading eyebrow="Approval" title="AI 建议操作" sub="transaction 需单次批准；批准后模拟执行，不声称真实设备已执行。" />
      <GlassCard hover={false} className="mb-6 p-5">
        {pending.length ? pending.map((p: any) => (
          <div key={p.id} className="mb-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-3">
            <div className="flex items-center gap-2 font-medium text-slate-800"><ShieldCheck className="h-4 w-4 text-rose-600" />{dev.registry.find((d: any) => d.id === p.deviceId)?.name} · {p.capability}</div>
            <div className="text-xs text-slate-500">{p.reason} · 来源 {p.source} · 风险 {p.riskTier}</div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => run(() => act.devApprove(p.id))}><Check className="h-3 w-3" />批准</Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => act.devReject(p.id)}><X className="h-3 w-3" />拒绝</Button>
            </div>
          </div>
        )) : <p className="text-sm text-slate-500">暂无待批准操作。主动判断或聊天指令可产生。</p>}
      </GlassCard>

      <SectionHeading eyebrow="Ledger" title="行动账本" sub="意图→批准→执行→模拟受理回执。" />
      <GlassCard hover={false} className="p-5">
        {dev.ledger.length ? dev.ledger.slice().reverse().map((l: any, i: number) => (
          <div key={i} className="flex flex-wrap items-center gap-2 border-b border-dashed border-slate-200 py-2 text-sm last:border-0">
            <ScrollText className="h-4 w-4 text-slate-400" />
            <span className="font-mono text-xs text-slate-500">{fmt(l.at)}</span>
            <Badge tone="slate">{l.stage}</Badge>
            <span className="text-slate-700">{l.deviceId}.{l.capability}</span>
            <span className="text-xs text-slate-400">{l.source}{l.receipt ? " · 模拟受理（非真实设备）" : ""}</span>
          </div>
        )) : <p className="text-sm text-slate-500">暂无行动记录。</p>}
      </GlassCard>
    </div>
  );
}
