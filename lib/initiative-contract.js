// 主动判断契约（/api/v1/initiative）。
import {ExtractionError} from './extraction-contract.js';
const fail=m=>{throw new ExtractionError('INVALID_EXTRACTION',m);};
const str=(v,max=500)=>typeof v==='string'&&v.length<=max;
export function validateInitiativeRequest(r){
 if(r?.version!==1||!Number.isFinite(r.now))fail('请求版本或参考时间无效');
 if(!str(r.activity,200))fail('活动状态无效');
 for(const k of ['upcoming','overdue','newMessages','memories'])if(!Array.isArray(r[k])||r[k].length>40)fail(k+'列表无效');
 if(!r.policy||typeof r.policy!=='object')fail('打扰策略无效');
 return r;
}
export function validateInitiativeResponse(o){
 if(!o||!['remind','message','silent'].includes(o.action))fail('判断动作无效');
 if(o.action!=='silent'&&!str(o.text,500))fail('提醒/消息文案无效');
 if(!str(o.reason,500))fail('判断理由无效');
 if(!['low','normal','high'].includes(o.urgency))fail('紧急度无效');
 if(!Array.isArray(o.evidence)||o.evidence.length>8||o.evidence.some(e=>!str(e,8000)))fail('依据列表无效');
 if(o.deviceProposal){const d=o.deviceProposal;if(!str(d.deviceId,100)||!str(d.capability,100)||!str(d.reason,500))fail('设备提议无效');}
 return o;
}
