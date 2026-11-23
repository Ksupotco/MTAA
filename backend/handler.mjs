// 与运行时无关的 API 处理器：Node（server.mjs）与 Serverless / Qoder Sites server function（sites/api.mjs）共用。
// 密钥只从服务端环境变量读取，绝不下发到浏览器。
import {extract,configuration} from './extractor.mjs';
import {memoryExtract} from './memory-extractor.mjs';
import {memoryChat} from './memory-chat.mjs';
import {initiativeDecide} from './initiative.mjs';
import {createLimiter} from './rate-limit.mjs';
import {configuredProviders,listModels,resolveSelection} from './providers.mjs';

export const MAX_BODY=65536;
const JSON_HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const LOOPBACK=/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;
const num=(v,d)=>{const n=Number(v);return Number.isFinite(n)&&v!==''&&v!==undefined?n:d;};
const lower=h=>Object.fromEntries(Object.entries(h||{}).map(([k,v])=>[k.toLowerCase(),Array.isArray(v)?v.join(','):String(v)]));

export function clientIp(headers,remote,env={}){
 const h=lower(headers);
 if(env.TRUST_PROXY==='1'){
  if(h['cf-connecting-ip'])return h['cf-connecting-ip'].trim();
  if(h['x-forwarded-for'])return h['x-forwarded-for'].split(',')[0].trim();
  if(h['x-real-ip'])return h['x-real-ip'].trim();
 }
 return remote||'unknown';
}

export function limiterFromEnv(env={}){
 return createLimiter({perIp:num(env.AI_RATE_PER_IP,30),windowMs:num(env.AI_RATE_WINDOW_MIN,10)*60000,daily:num(env.AI_DAILY_LIMIT,1000)});
}

export function createApi(opts={}){
 const {extractor=extract,memoryExtractor=memoryExtract,initiative=initiativeDecide,chat=memoryChat,status=configuration,fetcher=fetch}=opts;
 const env=opts.env||globalThis.process?.env||{};
 const limiter=opts.limiter||limiterFromEnv(env);
 const allowList=String(env.ALLOWED_ORIGINS||env.PUBLIC_ORIGIN||'').split(',').map(s=>s.trim().replace(/\/$/,'')).filter(Boolean);
 const routes={'api/v1/extract':extractor,'api/v1/memory-extract':memoryExtractor,'api/v1/initiative':initiative,'api/v1/memory-chat':chat};
 const originCheck=h=>{
  const host=h.host||'',origin=h.origin||'';
  if(!origin)return{ok:LOOPBACK.test(host)||env.ALLOW_NO_ORIGIN==='1',cors:null};
  if(allowList.includes(origin))return{ok:true,cors:origin};
  try{if(new URL(origin).host===host)return{ok:true,cors:null};}catch{}
  return{ok:false,cors:null};
 };
 // 返回 {status,headers,body} ；非 /api 路径返回 null，交给静态资源处理。
 return async function handle({method='GET',path='',headers={},body='',bytes,ip='unknown'}){
  path=String(path).replace(/^\/+/,'');
  if(!path.startsWith('api/'))return null;
  const h=lower(headers),oc=originCheck(h);
  const cors=oc.cors?{'Access-Control-Allow-Origin':oc.cors,'Vary':'Origin'}:{};
  const json=(code,data)=>({status:code,headers:{...JSON_HEADERS,...cors},body:JSON.stringify(data)});
  if(method==='OPTIONS'){
   if(!oc.cors)return{status:204,headers:{},body:''};
   return{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Whale-Provider, X-Whale-Model','Access-Control-Max-Age':'600'},body:''};
  }
  if(path==='api/v1/ai-status'){
   if(!['GET','HEAD'].includes(method))return json(405,{code:'METHOD_NOT_ALLOWED',message:'仅支持GET'});
   return json(200,{...status(env),limits:limiter.stats()});
  }
  // 可选模型：实时从各供应商端点 GET /models 拉取（服务端缓存 5 分钟），密钥不出服务端。
  if(path==='api/v1/models'){
   if(!['GET','HEAD'].includes(method))return json(405,{code:'METHOD_NOT_ALLOWED',message:'仅支持GET'});
   const force=h['x-whale-refresh']==='1';
   const providers=await Promise.all(configuredProviders(env).map(id=>listModels(id,{env,fetcher,force})));
   const cfg=status(env);
   return json(200,{default:{provider:cfg.provider,model:cfg.model},providers});
  }
  const route=routes[path];
  if(!route)return json(404,{code:'NOT_FOUND',message:'接口不存在'});
  if(method!=='POST')return json(405,{code:'METHOD_NOT_ALLOWED',message:'仅支持POST'});
  if(!oc.ok)return json(403,{code:'ORIGIN_REJECTED',message:'只接受同源或已配置来源（ALLOWED_ORIGINS）的请求'});
  if(!/^application\/json(?:;|$)/i.test(h['content-type']||''))return json(415,{code:'JSON_REQUIRED',message:'需要JSON请求'});
  if((bytes??body.length)>MAX_BODY)return json(413,{code:'TOO_LARGE',message:'消息上下文过大'});
  let input;try{input=JSON.parse(body);}catch{return json(400,{code:'INVALID_JSON',message:'请求JSON无效'});}
  const cfg=status(env);
  if(!cfg.configured&&!(path==='api/v1/memory-chat'&&env.WHALE_MEMORY_CHAT_URL))return json(503,{code:'AI_NOT_CONFIGURED',message:'服务端尚未配置模型密钥'});
  const gate=limiter.check(ip);
  if(!gate.ok)return json(429,{code:gate.code,message:gate.message});
  let runEnv=env;
  if(cfg.provider!=='whale'){
   const sel=await resolveSelection(env,{provider:h['x-whale-provider'],model:h['x-whale-model']},{fetcher});
   if(sel)runEnv={...env,WHALE_AI_PROVIDER:sel.provider,WHALE_AI_MODEL:sel.model};
  }
  try{return json(200,await route(input,{env:runEnv}));}
  catch(e){const code=e.code||'AI_UNAVAILABLE';return json(code==='AI_NOT_CONFIGURED'?503:code==='INVALID_EXTRACTION'?422:502,{code,message:e.code?e.message:'AI处理失败，消息已保留'});}
 };
}

// Web 标准 fetch 适配：(Request) => Response。适用于 Qoder Sites server function / Workers / Deno / Bun 等。
export function createFetchHandler(opts={}){
 const handle=createApi(opts);const env=opts.env||globalThis.process?.env||{};
 return async function fetchHandler(request){
  const url=new URL(request.url);let path;
  try{path=decodeURIComponent(url.pathname);}catch{return new Response('Bad request',{status:400});}
  const headers=Object.fromEntries(request.headers);headers.host=headers.host||url.host;
  let body='',bytes=0;
  if(request.method==='POST'){
   const buf=new Uint8Array(await request.arrayBuffer());bytes=buf.length;
   if(bytes<=MAX_BODY)body=new TextDecoder().decode(buf);
  }
  const r=await handle({method:request.method,path,headers,body,bytes,ip:clientIp(headers,'',{TRUST_PROXY:env.TRUST_PROXY??'1'})});
  if(!r)return new Response('Not found',{status:404});
  return new Response(r.status===204?null:r.body,{status:r.status,headers:r.headers});
 };
}
