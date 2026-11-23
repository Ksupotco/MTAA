import { createRoot } from "react-dom/client";
import App from "./App";
import { Component, type ReactNode } from "react";
class PageBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?<main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-semibold">页面暂时无法显示</h1><p className="my-4">当前浏览器中的数据未删除，可先刷新页面重试。</p><button onClick={()=>window.location.reload()} className="rounded-xl bg-clay-deep px-4 py-2 text-white">重新加载</button></main>:this.props.children;}}
import "./index.css";

createRoot(document.getElementById("root")!).render(<PageBoundary><App /></PageBoundary>);
