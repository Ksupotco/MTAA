// 记忆提取契约（/api/v1/memory-extract）。复用 extraction-contract 的校验风格。
import {ExtractionError} from './extraction-contract.js';
const fail=m=>{throw new ExtractionError('INVALID_EXTRACTION',m);};
const str=(v,max=200)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const iso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
export function validateMemoryRequest(r){
 if(r?.version!==1||!str(r.groupId,100)||!Number.isFinite(r.now))fail('请求版本、群标识或参考时间无效');
 const cm=m=>m&&str(m.id,100)&&str(m.author,100)&&str(m.text,8000)&&Number.isFinite(m.time);
 if(!cm(r.message)||!Array.isArray(r.context)||r.context.length>12||!r.context.every(cm))fail('消息或历史上下文无效');
 const ids=[r.message,...r.context].map(m=>m.id);if(new Set(ids).size!==ids.length)fail('消息标识重复');
 return r;
}
export function validateMemoryExtraction(output,request){
 validateMemoryRequest(request);
 if(!output||!Array.isArray(output.items)||output.items.length>12)fail('记忆结果必须包含items数组，最多12项');
 const sources=new Map([request.message,...request.context].map(m=>[m.id,m.text]));
 for(const it of output.items){
  if(!['fact','preference','episode'].includes(it.kind)||!str(it.summary,200))fail('记忆类别或摘要无效');
  if(typeof it.importance!=='number'||it.importance<0||it.importance>1)fail('重要度须在0–1');
  if(!Array.isArray(it.evidence)||!it.evidence.length||it.evidence.length>6||!it.evidence.some(e=>e.messageId===request.message.id))fail('每条记忆必须引用本条消息原文');
  if(it.evidence.some(e=>!str(e.quote,8000)||!sources.get(e.messageId)?.includes(e.quote)))fail('记忆原文依据不存在，拒绝保存');
  if(it.expiresAt!==null&&it.expiresAt!==undefined&&!iso(it.expiresAt))fail('过期时间须为带时区ISO或null');
  if(it.space!==undefined&&!['owner','group:'+request.groupId].includes(it.space))fail('记忆空间无效');
 }
 return output;
}
