// 公网演示的 AI 调用保护：按 IP 滑动窗口限流 + 全站每日总额度。
// 进程内存实现：单实例足够；多实例 / Serverless 冷启动时各实例独立计数（见 deploy/qoder-sites.md）。
export function createLimiter({perIp=30,windowMs=10*60000,daily=1000,now=()=>Date.now()}={}){
 const hits=new Map();let day='',used=0;
 const today=()=>new Date(now()+8*3600000).toISOString().slice(0,10);
 const roll=()=>{const d=today();if(d!==day){day=d;used=0;}};
 return {
  check(ip){
   roll();const t=now();
   if(daily>0&&used>=daily)return{ok:false,code:'DAILY_LIMIT',message:'今日公开演示的 AI 额度已用完，已自动回退规则模式，明天再来试试。'};
   const key=String(ip||'unknown');const list=(hits.get(key)||[]).filter(x=>t-x<windowMs);
   if(perIp>0&&list.length>=perIp){hits.set(key,list);const wait=Math.max(1,Math.ceil((windowMs-(t-list[0]))/60000));return{ok:false,code:'RATE_LIMITED',message:`调用太频繁，请约 ${wait} 分钟后再试（本次已回退规则模式）。`};}
   list.push(t);hits.set(key,list);used++;
   if(hits.size>5000)for(const [k,v] of hits)if(!v.length||t-v[v.length-1]>windowMs)hits.delete(k);
   return{ok:true};
  },
  stats(){roll();return{daily,used,remaining:daily>0?Math.max(0,daily-used):null,perIp,windowMinutes:Math.round(windowMs/60000)};}
 };
}
