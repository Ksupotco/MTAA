// 模型供应商层：AgentScope 节点（OpenAI 兼容，仅 SSE 流式）与 DeepSeek（OpenAI 兼容，JSON 模式）。
// 密钥只从服务端环境变量读取；浏览器只能通过请求头选择「供应商 + 模型」，且模型必须在服务端实时拉取的列表内。
import {ExtractionError} from '../lib/extraction-contract.js';

export const PROVIDERS={
 agentscope:{id:'agentscope',label:'AgentScope 节点',keyEnv:'AGENTSCOPE_API_KEY',baseEnv:'AGENTSCOPE_BASE_URL',defaultBase:'https://platform.agentscope.io/v1',modelEnv:'AGENTSCOPE_MODEL',defaultModel:'qwen3.8-flash',stream:true,jsonMode:false},
 deepseek:{id:'deepseek',label:'DeepSeek',keyEnv:'DEEPSEEK_API_KEY',baseEnv:'DEEPSEEK_BASE_URL',defaultBase:'https://api.deepseek.com',modelEnv:'DEEPSEEK_MODEL',defaultModel:'deepseek-flash',stream:false,jsonMode:true}
};
export const PROVIDER_ORDER=['agentscope','deepseek'];
export const MODEL_ID=/^[A-Za-z0-9][\w.\-:/@+]{0,119}$/;
const MODELS_TTL=5*60000,MODELS_FAIL_TTL=30000;

export const keyOf=(id,env={})=>{const p=PROVIDERS[id];return p?String(env[p.keyEnv]||'').trim():'';};
export const baseOf=(id,env={})=>{const p=PROVIDERS[id];return String(env[p.baseEnv]||p.defaultBase).replace(/\/+$/,'');};
export const defaultModelOf=(id,env={})=>{const p=PROVIDERS[id];return String(env[p.modelEnv]||p.defaultModel).trim();};
export function configuredProviders(env={}){return PROVIDER_ORDER.filter(id=>keyOf(id,env));}
export function defaultProvider(env={}){const list=configuredProviders(env);const want=String(env.AI_PROVIDER||'').toLowerCase();return list.includes(want)?want:(list[0]||null);}
// 当前请求实际使用的供应商/模型：handler 把已校验的选择写入 WHALE_AI_PROVIDER / WHALE_AI_MODEL。
export function activeSelection(env={}){
 const list=configuredProviders(env);
 const provider=list.includes(env.WHALE_AI_PROVIDER)?env.WHALE_AI_PROVIDER:defaultProvider(env);
 if(!provider)return null;
 const model=env.WHALE_AI_PROVIDER===provider&&env.WHALE_AI_MODEL?env.WHALE_AI_MODEL:defaultModelOf(provider,env);
 return{provider,model};
}

function checkUrl(u){const url=new URL(u);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw new ExtractionError('AI_CONFIG_ERROR','模型地址须使用HTTPS，或本机回环HTTP');return url;}

// ---- 模型列表：实时从端点 GET {base}/models 拉取，进程内缓存 5 分钟 ----
const cache=new Map();
export function clearModelCache(){cache.clear();}
export async function listModels(id,{env={},fetcher=fetch,force=false}={}){
 const p=PROVIDERS[id];if(!p||!keyOf(id,env))return{provider:id,label:p?.label||id,models:[],live:false,default:null,error:'未配置'};
 const def=defaultModelOf(id,env),ck=id+'|'+baseOf(id,env);const hit=cache.get(ck);
 if(!force&&hit&&Date.now()-hit.at<(hit.live?MODELS_TTL:MODELS_FAIL_TTL))return hit.value;
 let models=[],live=false,error=null;
 try{
  const url=checkUrl(baseOf(id,env)+'/models');
  const res=await fetcher(url,{method:'GET',headers:{Authorization:`Bearer ${keyOf(id,env)}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!res.ok){await res.body?.cancel?.().catch(()=>{});throw new Error('HTTP '+res.status);}
  const text=await res.text();if(text.length>2*1024*1024)throw new Error('列表过大');
  const data=JSON.parse(text);const arr=Array.isArray(data)?data:Array.isArray(data.data)?data.data:Array.isArray(data.models)?data.models:[];
  models=[...new Set(arr.map(x=>typeof x==='string'?x:(x?.id||x?.name||x?.model)).filter(x=>typeof x==='string'&&MODEL_ID.test(x)))].sort();
  live=models.length>0;if(!live)error='端点未返回模型';
 }catch(e){error=e?.message?String(e.message).slice(0,80):'拉取失败';}
 if(!models.includes(def)){models.push(def);models.sort();}
 const value={provider:id,label:p.label,models,live,default:def,error};
 cache.set(ck,{at:Date.now(),live,value});
 return value;
}
// 校验浏览器请求的选择：供应商须已配置；模型须在实时列表内（列表拉取失败时只允许默认模型）。非法选择回退默认，不报错。
export async function resolveSelection(env={},{provider,model}={},{fetcher=fetch}={}){
 const list=configuredProviders(env);if(!list.length)return null;
 const id=list.includes(String(provider||'').toLowerCase())?String(provider).toLowerCase():defaultProvider(env);
 const def=defaultModelOf(id,env);let m=String(model||'').trim();
 if(!m||!MODEL_ID.test(m)||m===def)return{provider:id,model:def};
 const info=await listModels(id,{env,fetcher});
 return{provider:id,model:info.models.includes(m)?m:def};
}

// ---- 解析 ----
export function parseJSONText(raw){
 let s=String(raw||'').replace(/<think>[\s\S]*?<\/think>/gi,'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
 try{return JSON.parse(s);}catch{}
 const a=s.indexOf('{'),b=s.lastIndexOf('}');
 if(a>=0&&b>a){try{return JSON.parse(s.slice(a,b+1));}catch{}}
 throw new ExtractionError('BAD_AI_RESPONSE','AI结果不是可用JSON，未保存');
}
async function readLimited(res,limit=1024*1024){const reader=res.body.getReader();let bytes=0,chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>limit)throw new ExtractionError('BAD_AI_RESPONSE','模型返回内容过大');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}return new TextDecoder().decode(concat(chunks));}
function concat(chunks){const n=chunks.reduce((a,c)=>a+c.length,0),out=new Uint8Array(n);let o=0;for(const c of chunks){out.set(c,o);o+=c.length;}return out;}
// OpenAI 兼容 SSE：累计 choices[0].delta.content，遇 [DONE] 结束。
export async function readSSE(res,limit=2*1024*1024){
 const reader=res.body.getReader(),dec=new TextDecoder();let buf='',text='',finish=null,bytes=0,done=false;
 const line=l=>{l=l.replace(/\r$/,'');if(!l.startsWith('data:'))return;const d=l.slice(5).trim();if(!d)return;if(d==='[DONE]'){done=true;return;}
  let j;try{j=JSON.parse(d);}catch{return;}
  if(j.error)throw new ExtractionError('AI_UNAVAILABLE','AI服务返回错误，请稍后重试');
  const c=j.choices?.[0];if(!c)return;const piece=c.delta?.content??c.message?.content;if(typeof piece==='string')text+=piece;if(c.finish_reason)finish=c.finish_reason;};
 try{
  while(!done){const r=await reader.read();if(r.done)break;bytes+=r.value.length;if(bytes>limit)throw new ExtractionError('BAD_AI_RESPONSE','模型返回内容过大');
   buf+=dec.decode(r.value,{stream:true});let i;while(!done&&(i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i);buf=buf.slice(i+1);line(l);}}
  if(!done&&buf)line(buf);
 }finally{await reader.cancel().catch(()=>{});}
 return{text,finish};
}

// ---- 调用 ----
export async function chatJSON(systemPrompt,payload,{env={},fetcher=fetch,maxTokens=4096}={}){
 const sel=activeSelection(env);if(!sel)throw new ExtractionError('AI_NOT_CONFIGURED','AI尚未配置：服务端缺少模型密钥（AGENTSCOPE_API_KEY 或 DEEPSEEK_API_KEY）');
 const p=PROVIDERS[sel.provider];const url=checkUrl(baseOf(p.id,env)+'/chat/completions');
 const messages=[{role:'system',content:systemPrompt+(p.jsonMode?'':'\n务必只输出一个 JSON 对象，不要输出 Markdown 代码块或任何解释文字。')},{role:'user',content:JSON.stringify(payload)}];
 const body={model:sel.model,messages,max_tokens:Math.min(4096,Math.max(256,maxTokens)),stream:p.stream};
 if(p.jsonMode)body.response_format={type:'json_object'};
 let res;
 try{res=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:p.stream?'text/event-stream':'application/json',Authorization:`Bearer ${keyOf(p.id,env)}`},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(p.stream?60000:35000)});}
 catch{throw new ExtractionError('AI_UNAVAILABLE','AI连接失败或超时，请稍后重试');}
 if(!res.ok){await res.body?.cancel?.().catch(()=>{});const auth=res.status===401||res.status===403;throw new ExtractionError(auth?'AI_AUTH_ERROR':'AI_UNAVAILABLE',auth?'AI凭据不可用，请检查服务端配置':res.status===404||res.status===400?'所选模型不可用，请换一个模型重试':'AI服务暂时不可用，请稍后重试');}
 const ctype=String(res.headers?.get?.('content-type')||'');
 if(p.stream&&!/json/i.test(ctype)){
  const {text,finish}=await readSSE(res);
  if(finish==='length')throw new ExtractionError('BAD_AI_RESPONSE','AI结果被截断，未保存');
  if(!text.trim())throw new ExtractionError('BAD_AI_RESPONSE','AI未返回内容，未保存');
  return parseJSONText(text);
 }
 let data;try{data=JSON.parse(await readLimited(res));}catch(e){if(e instanceof ExtractionError)throw e;throw new ExtractionError('BAD_AI_RESPONSE','模型未返回完整JSON');}
 if(data.choices?.[0]?.finish_reason!=='stop')throw new ExtractionError('BAD_AI_RESPONSE','AI结果未完成，未保存');
 return parseJSONText(data.choices[0].message?.content);
}
