/* Ground-side anomaly scoring for a deterministic, synthetic pilot. */
'use strict';
const Pilot=(()=>{
 const fields={pressure:{label:'Pressure',unit:'bar',digits:2},temperature:{label:'Temperature',unit:'°C',digits:2},vibration:{label:'Vibration',unit:'mm/s RMS',digits:3},flow:{label:'Mass flow',unit:'kg/s',digits:2}};
 const epoch=Date.UTC(2026,10,24,16),tickMs=1800000;
 const sites=[0,2.5,5,7.5,10];
 function generator(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return (seed+.5)/4294967296;};}
 const median=a=>{const s=[...a].sort((x,y)=>x-y),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2};
 function nominal(site,t,random){
  const wave=Math.sin(t*Math.PI/24),noise=s=>s*(random()+random()+random()-1.5);
  return {pressure:68-site*.42+.60*wave+noise(.42),temperature:41+.24*site+1.25*Math.sin((t-5)*Math.PI/24)+noise(.45),vibration:1.30+site*.045+.09*wave+noise(.14),...(site===1||site===5?{flow:187-site*.055+.65*wave+noise(.48)}:{})};
 }
 const models={};
 for(let site=1;site<=5;site++){
  const rand=generator(6026+site),ref=Array.from({length:336},(_,t)=>nominal(site,t,rand));
  for(const key of Object.keys(ref[0])){
   const series=ref.map(r=>r[key]).sort((a,b)=>a-b),mid=median(series),mad=median(series.map(v=>Math.abs(v-mid)));
   // KNN distance includes the 8 closest historical samples. A robust envelope guards against sparse tails.
   const distance=v=>series.map(x=>Math.abs(x-v)).sort((a,b)=>a-b).slice(0,8).reduce((s,x)=>s+x,0)/8;
   const q99=series.map(distance).sort((a,b)=>a-b)[Math.floor(.99*series.length)];
   models[site+key]={median:mid,trainCount:series.length,low:series[0],high:series.at(-1),cutoff:Math.max(4*q99,1.6*mad),distance};
  }
 }
 function crc(bytes){let c=65535;for(const b of bytes){c^=b<<8;for(let k=0;k<8;k++)c=c&32768?((c<<1)^0x1021)&65535:(c<<1)&65535}return c;}
 function packet(r){
  let bytes=new Uint8Array(24),v=new DataView(bytes.buffer);
  v.setUint8(0,1);v.setUint8(1,r.site);v.setUint8(2,r.flow==null?7:15);v.setUint8(3,r.priority?1:0);
  v.setUint32(4,r.tick+1,true);v.setUint32(8,r.time/1000,true);
  v.setUint16(12,Math.round(r.pressure*100),true);v.setInt16(14,Math.round(r.temperature*100),true);v.setUint16(16,Math.round(r.vibration*1000),true);
  v.setUint16(18,r.flow==null?65535:Math.round(r.flow*100),true);v.setUint16(20,sites[r.site-1]*10,true);
  v.setUint16(22,crc(bytes.slice(0,22)),true);return bytes;
 }
 function sample(site,tick){
  const rand=generator(85+tick*17351+site*7607),v=nominal(site,tick,rand);
  // Field priority is an independent sample-scene input. The ground detector only sees measurements.
  const events={39:[5,'flow',-8],43:[4,'vibration',1.12],46:[3,'pressure',-6.2],66:[2,'temperature',5.4],69:[3,'pressure',-5.5],92:[1,'flow',7.3]};
  const event=events[tick];const priority=Boolean(event&&event[0]===site);
  if(priority)v[event[1]]+=event[2];
  Object.keys(v).forEach(k=>v[k]=Number(v[k].toFixed(fields[k].digits)));
  const r={id:'S'+String(site).padStart(2,'0')+'-'+String(tick+1).padStart(4,'0'),site,tick,time:epoch+tick*tickMs,receipt:epoch+(Math.floor(tick/24)*24+23)*tickMs+12*60000,priority,flow:null,...v};
  r.hex=Array.from(packet(r),b=>b.toString(16).padStart(2,'0')).join('');
  r.flags=Object.keys(v).map(key=>{
    const m=models[site+key],score=m.distance(v[key])/m.cutoff;
    return {key,score,delta:v[key]-m.median,median:m.median};
  }).filter(f=>f.score>1).sort((a,b)=>b.score-a.score);
  return r;
 }
 function records(end){const rows=[];for(let t=0;t<=end;t++)for(let s=1;s<=5;s++)rows.push(sample(s,t));return rows;}
 const fmt=t=>new Date(t).toISOString();
 function csv(rows){
  const heads=['scenario','record_id','site','corridor_km','sequence','event_time_utc','ground_stored_utc','field_priority','pressure_bar','temperature_c','vibration_mm_s_rms','mass_flow_kg_s','ground_flags','packet_hex_24_bytes'];
  return [heads.join(','),...rows.map(r=>['synthetic_pdr',r.id,r.site,sites[r.site-1],r.tick+1,fmt(r.time),fmt(r.receipt),r.priority?'priority':'routine',r.pressure,r.temperature,r.vibration,r.flow??'',r.flags.map(f=>f.key).join('|'),r.hex].join(','))].join('\r\n')+'\r\n';
 }
 return {fields,sites,models,records,csv,packet,crc,epoch,tickMs};
})();
if(typeof module!=='undefined')module.exports=Pilot;
