import { useState } from "react";
import { BellRing, Check, Ban, CalendarSearch } from "lucide-react";
import { store, act } from "../store";
import { fmt } from "../fmt";
import { Button } from "./ui";

export default function ReminderCard({ gotoCenter }: { gotoCenter: () => void }) {
  const [expanded,setExpanded]=useState(false);
  const unread = store.initiative.inbox.filter((r: any) => !r.read);
  if (!unread.length) return null;
  const r = unread[unread.length - 1];
  if(!expanded)return <button aria-label={`展开${unread.length}条未读提醒`} onClick={()=>setExpanded(true)} className="card fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm text-clay-deep"><BellRing className="h-4 w-4"/>{unread.length} 条提醒 · 展开</button>;
  return (
    <div className="card fixed bottom-5 right-5 z-50 w-[340px] max-w-[calc(100vw-32px)] rounded-2xl p-4 animate-fade-up">
      <div className="flex items-center gap-2 text-clay-deep"><button className="ml-auto text-sm" aria-label="收起提醒" onClick={()=>setExpanded(false)}>收起</button><BellRing className="h-4 w-4" /><span className="text-xs font-semibold">主动提醒 · 门控通过</span></div>
      <div className="mt-2 text-sm font-medium text-slate-800">{r.text}</div>
      <div className="mt-1 text-xs text-slate-500">{r.reason} · {fmt(r.at)}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => act.iniRead(r.id)}><Check className="h-3 w-3" />知道了</Button>
        <Button size="sm" variant="ghost" onClick={() => act.iniStop(r.topic)}><Ban className="h-3 w-3" />不再提醒这类</Button>
        <Button size="sm" variant="soft" onClick={gotoCenter}><CalendarSearch className="h-3 w-3" />查看日程</Button>
      </div>
    </div>
  );
}
