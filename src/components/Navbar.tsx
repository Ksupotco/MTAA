import { useState } from "react";
import { LayoutDashboard, MessagesSquare, Brain, BellRing, PlugZap, Sparkles, Menu, X, CircleHelp } from "lucide-react";
import { WhaleLogo, Badge } from "./ui";
import { store, type View } from "../store";
const tabs:{id:View;label:string;icon:any}[]=[{id:"center",label:"信息总结",icon:LayoutDashboard},{id:"messages",label:"消息来源",icon:MessagesSquare},{id:"memory",label:"记忆",icon:Brain},{id:"initiative",label:"主动判断",icon:BellRing},{id:"devices",label:"设备",icon:PlugZap}];
export default function Navbar({view,setView,mode,setMode,configured,intro,setIntro,startGuide}:{startGuide:()=>void;view:View;setView:(v:View)=>void;mode:string;setMode:(m:"ai"|"rules")=>void;configured:boolean|null;intro:boolean;setIntro:(b:boolean)=>void}){
 const [open,setOpen]=useState(false);
 return <>
  <div className="mobile-navigation"><button aria-label={open?"关闭导航":"打开导航"} aria-expanded={open} aria-controls="primary-sidebar" onClick={()=>setOpen(!open)}>{open?<X size={21}/>:<Menu size={21}/>}</button><span className="font-display font-semibold">WHALE</span><button onClick={startGuide} className="ml-auto text-sm">使用引导</button></div>
  {open&&<button className="sidebar-backdrop" aria-label="关闭导航遮罩" onClick={()=>setOpen(false)}/>}
  <aside id="primary-sidebar" aria-label="主导航" className={"primary-sidebar "+(open?"is-open":"")}>
   <div className="sidebar-brand"><span className="sidebar-logo"><WhaleLogo className="h-6 w-6"/></span><div><strong>WHALE</strong><small>生活中枢</small></div><button className="sidebar-close" aria-label="关闭导航" onClick={()=>setOpen(false)}><X size={20}/></button></div>
   <p className="sidebar-caption">工作空间</p>
   <nav>{tabs.map(t=><button key={t.id} aria-current={view===t.id?"page":undefined} onClick={()=>{setView(t.id);setOpen(false);}}><t.icon size={18}/><span>{t.label}</span></button>)}</nav>
   <div className="sidebar-tools">
    <button data-tour="help" onClick={()=>{setOpen(false);startGuide();}}><CircleHelp size={17}/>使用引导</button>
    <button aria-pressed={intro} onClick={()=>{setIntro(!intro);setView("center");setOpen(false);}}><Sparkles size={17}/>{intro?"收起产品介绍":"产品介绍"}</button>
    <label htmlFor="understanding-mode">消息理解模式</label>
    <select id="understanding-mode" aria-label="消息理解模式" disabled={store.busy} value={mode} onChange={e=>setMode(e.target.value as "ai"|"rules")}><option value="ai">AI整理（工程接口）</option><option value="rules">规则演示</option></select>
    <Badge tone={configured?"green":"amber"}>{configured===null?"检查中":configured?"AI已配置·待验证":"AI未配置"}</Badge>
    <p className="sidebar-footnote">本地体验 · 模拟消息与设备</p>
   </div>
  </aside>
 </>;
}
