import { useEffect, useReducer, useRef, useState } from "react";
import { subscribe, store, allRows, tickStates, persist, notify, type View } from "./store";
import UsageGuide, { GUIDE_KEY } from "./components/UsageGuide";
import Navbar from "./components/Navbar";
import Showcase from "./components/Showcase";
import ClockBar from "./components/ClockBar";
import SummaryView from "./components/SummaryView";
import SourcesView from "./components/SourcesView";
import MemoryView from "./components/MemoryView";
import InitiativeView from "./components/InitiativeView";
import DevicesView from "./components/DevicesView";
import SplitView from "./components/SplitView";
import ReminderCard from "./components/ReminderCard";
import { WhaleLogo } from "./components/ui";

function useStore() { const [, force] = useReducer((x: number) => x + 1, 0); useEffect(() => subscribe(force), []); return store; }

export default function App() {
  useStore();
  const [guideOpen,setGuideOpen]=useState(()=>{try{return !localStorage.getItem(GUIDE_KEY);}catch{return true;}});
  const returnView=useRef<View>("center");
  const [view, setView] = useState<View>("center");
  const [split, setSplit] = useState<any>(null);
  const [intro, setIntro] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => { fetch("/api/v1/ai-status").then((r) => r.json()).then((i) => setConfigured(Boolean(i.configured))).catch(() => setConfigured(false)); }, []);
  const now = store.states[store.active].now;
  const rows = allRows();
  const stats = { groups: store.followed.size, todo: rows.filter((x: any) => x.task.status === "todo").length, memory: tickStates().reduce((a: number, s: any) => a + (s.memory || []).length, 0), reminders: store.initiative.inbox.length };
  const goto = (v: View) => { setView(v); setSplit(null); };
  const gotoMessage = (scene: string, id: string) => { store.focusMessageId = id; store.active = scene; persist(); setSplit(null); setView("messages"); };
  const openSplit = (t: any) => { store.active = t.scene; setSplit(t); setView("center"); };

  return (
    <div className="relative min-h-screen">
      <div className="bg-canvas" />
      <div className="dot-grid" />
      <div className="grain" />
      <div className="relative z-10 application-content">
        <Navbar startGuide={()=>{returnView.current=view;setSplit(null);setIntro(false);setGuideOpen(true);}} view={view} setView={goto} mode={store.extractMode} setMode={(m) => { store.extractMode = m; persist(); notify(); }} configured={configured} intro={intro} setIntro={setIntro} />
        <main id="main-content" className="mx-auto max-w-7xl px-4 pb-16"><div className="workspace-heading"><h1>{{center:"信息总结",messages:"消息来源",memory:"记忆",initiative:"主动判断",devices:"设备"}[view]}</h1><span>WHALE · DEMO</span></div>
          {store.notice && <div role="status" className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-white p-3 text-sm"><span className="flex-1">{store.notice}</span><button aria-label="关闭操作提示" onClick={()=>{store.notice="";notify();}}>关闭</button></div>}
          {store.extractMode === "ai" && configured === false && <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">AI尚未配置：新消息保留待整理，不代表已经理解。记忆候选和主动判断仍可使用明确标注的规则模拟；设备操作均为模拟。</p>}
          {view === "center" && intro && !split && <Showcase stats={stats} />}
          {view !== "messages" && <div className="pt-6"><ClockBar /></div>}
          {view === "center" && (split ? <SplitView target={split} onBack={() => setSplit(null)} now={now} gotoSource={() => { const source=store.states[split.scene];const obj=split.type==="suggestion"?source.suggestions.find((x:any)=>x.id===split.id):source.tasks.find((x:any)=>x.id===split.id);gotoMessage(split.scene,obj?.messageId||obj?.sources?.at(-1)||""); }} /> : <SummaryView openSplit={openSplit} />)}
          {view === "messages" && <div className="pt-6"><SourcesView /></div>}
          {view === "memory" && <div className="pt-6"><MemoryView gotoMessage={gotoMessage} now={now} /></div>}
          {view === "initiative" && <div className="pt-6"><InitiativeView gotoCenter={() => goto("center")} /></div>}
          {view === "devices" && <div className="pt-6"><DevicesView /></div>}
        </main>
        <footer className="border-t border-line bg-paper py-6 text-center text-xs text-muted">
          <WhaleLogo className="mx-auto mb-2 h-5 w-5 text-clay-deep" />
          Whale 概念演示 · 虚构群聊与模拟设备 · 数据仅存当前浏览器 · AI 需服务端配置 · 无真实 QQ / 系统通知 / 设备操作
        </footer>
      </div>
      {guideOpen && <UsageGuide onViewChange={goto} onClose={()=>{try{localStorage.setItem(GUIDE_KEY,"seen");}catch{}setGuideOpen(false);goto(returnView.current);}}/>}
      <ReminderCard gotoCenter={() => goto("center")} />
    </div>
  );
}
