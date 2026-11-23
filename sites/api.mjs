// Qoder Sites server function / Web 标准 fetch 运行时入口。
// 把站点的 /api/* 路由到本文件；静态页面使用 dist/index.html。密钥通过 Sites「环境变量（Secrets）」注入：DEEPSEEK_API_KEY。
// 若平台要求不同的导出签名，只需在此文件做一层包装，业务逻辑全部在 backend/handler.mjs。
import {createFetchHandler,limiterFromEnv} from '../backend/handler.mjs';
const handlers=new WeakMap();let fallback;let limiter;
function handlerFor(runtimeEnv){
 const env={...(globalThis.process?.env||{}),...(runtimeEnv&&typeof runtimeEnv==='object'?runtimeEnv:{})};
 limiter=limiter||limiterFromEnv(env);
 if(runtimeEnv&&typeof runtimeEnv==='object'){let h=handlers.get(runtimeEnv);if(!h){h=createFetchHandler({env,limiter});handlers.set(runtimeEnv,h);}return h;}
 return fallback||(fallback=createFetchHandler({env,limiter}));
}
// 1) Workers / 模块风格：export default { fetch(request, env) }
export default {fetch:(request,env)=>handlerFor(env)(request)};
// 2) 直接函数风格：export async function handler(request)
export async function handler(request,env){return handlerFor(env)(request);}
// 3) Pages Functions 风格：onRequest({request, env})
export async function onRequest(context){return handlerFor(context?.env)(context.request);}
