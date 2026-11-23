import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {extract,configuration} from './backend/extractor.mjs';
import {memoryExtract} from './backend/memory-extractor.mjs';
import {memoryChat} from './backend/memory-chat.mjs';
import {initiativeDecide} from './backend/initiative.mjs';
const base=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
// 构建产物为单文件 dist/index.html（js/css 全内联），白名单仅放行它；lib/ 逻辑不直接对外暴露。
const files=new Set(['index.html']);
// 同源/本机校验：放行回环；配置 PUBLIC_ORIGIN 后放行该公网来源（部署用，见 deploy/deploy.md）。
function originAllowed(req){const host=req.headers.host||'',origin=req.headers.origin;const pub=process.env.PUBLIC_ORIGIN;
 if(pub&&origin===pub)return true;
 if(/^(?:127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host)&&(!origin||origin===`http://${host}`))return true;
 return false;}
export function createServer({extractor=extract,memoryExtractor=memoryExtract,initiative=initiativeDecide,chat=memoryChat,status=configuration}={}){return http.createServer(async(req,res)=>{
 const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400).end();return;}
 if(name==='api/v1/ai-status'&&req.method==='GET'){json(200,status());return;}
 const routes={'api/v1/extract':extractor,'api/v1/memory-extract':memoryExtractor,'api/v1/initiative':initiative,'api/v1/memory-chat':chat};
 if(routes[name]){
  if(req.method!=='POST'){json(405,{code:'METHOD_NOT_ALLOWED',message:'仅支持POST'});return;}
  if(!originAllowed(req)){json(403,{code:'ORIGIN_REJECTED',message:'只接受本机同源或已配置的公网来源请求'});return;}
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){json(415,{code:'JSON_REQUIRED',message:'需要JSON请求'});return;}
  try{let bytes=0,body=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>65536){json(413,{code:'TOO_LARGE',message:'消息上下文过大'});return;}body.push(chunk);}let input;try{input=JSON.parse(Buffer.concat(body).toString('utf8'));}catch{json(400,{code:'INVALID_JSON',message:'请求JSON无效'});return;}json(200,await routes[name](input));}
  catch(e){const code=e.code||'AI_UNAVAILABLE';json(code==='AI_NOT_CONFIGURED'?503:code==='INVALID_EXTRACTION'?422:502,{code,message:e.code?e.message:'AI处理失败，消息已保留'});}return;
 }
 if(!['GET','HEAD'].includes(req.method)||!files.has(name)){res.writeHead(404).end('Not found');return;}
 try{const body=await readFile(path.join(base,name));res.writeHead(200,{'Content-Type':types[path.extname(name)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(500).end('Unable to read asset');}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(typeof process.loadEnvFile==='function'){try{process.loadEnvFile(fileURLToPath(new URL('./.env',import.meta.url)));}catch(e){if(e.code!=='ENOENT')console.error('Local AI configuration could not be loaded');}}
 const host=process.env.HOST||'127.0.0.1';
 const server=createServer();server.on('error',err=>{console.error(`Preview failed: ${err.code||'UNKNOWN'}`);process.exit(1);});server.listen(Number(process.env.PORT||18762),host,()=>console.log(`Local: http://${host}:${server.address().port}`));
}
