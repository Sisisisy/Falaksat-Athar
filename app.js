'use strict';
const $=id=>document.getElementById(id), F=Pilot.fields;
const ast=(t,day=false)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',...(day?{day:'2-digit',month:'short'}:{}),hour:'2-digit',minute:'2-digit',hour12:false}).format(t);
const siteName=s=>'Site '+String(s).padStart(2,'0'), label=(k)=>F[k].label;
const display=(v,k)=>Number(v).toFixed(F[k].digits);
let end=47,data=Pilot.records(end),selected=data.find(r=>r.tick===46&&r.site===3),metric='pressure',page=0,stage=3,playing=false,lastContact=selected.receipt,timerToken=0;
const checks={pressure:'Compare the same-time pressures at neighboring stations and check the preceding sample. If the change persists, request an operator review of Site ',vibration:'Compare this vibration sample with the previous samples and the station’s pressure history. Ask the operator to confirm the local instrument at Site ',flow:'Compare inlet and outlet mass flow for the same sample and verify both meters before interpreting the imbalance at Site ',temperature:'Compare temperatures at adjacent stations and check the instrument history before escalating Site '};
function download(content,filename,type){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([content],{type}));a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function view(){return data.filter(r=>($('scope').value==='all'||r.site===+$('scope').value)&&($('status').value!=='flagged'||r.flags.length)).slice().reverse()}
function setSelected(r,k,scroll=false){selected=r;metric=k||r.flags[0]?.key||'pressure';paint();if(scroll)document.querySelector('.trace').scrollIntoView({behavior:'smooth',block:'center'})}
function trend(){
 const available=Object.keys(F).filter(k=>selected[k]!=null);if(!available.includes(metric))metric='pressure';
 $('metric').innerHTML=available.map(k=>'<option value="'+k+'">'+label(k)+'</option>').join('');$('metric').value=metric;
 const m=Pilot.models[selected.site+metric],v=selected[metric],from=Math.max(0,selected.tick-23),to=Math.min(end,Math.max(23,selected.tick+2));
 const series=data.filter(r=>r.site===selected.site&&r.tick>=from&&r.tick<=to),vals=series.map(r=>r[metric]),lo=Math.min(...vals,m.low),hi=Math.max(...vals,m.high),pad=(hi-lo)*.16||1;
 const X=t=>55+(t-from)/(to-from||1)*686,Y=value=>17+(hi+pad-value)/(hi-lo+2*pad)*106;
 const lines=[hi,(hi+lo)/2,lo].map(n=>'<line x1="55" x2="741" y1="'+Y(n)+'" y2="'+Y(n)+'" stroke="#424556"/><text x="48" y="'+(Y(n)+4)+'" text-anchor="end">'+n.toFixed(metric==='vibration'?2:1)+'</text>').join('');
 const path=series.map(r=>X(r.tick).toFixed(1)+','+Y(r[metric]).toFixed(1)).join(' ');
 $('chart').innerHTML='<svg viewBox="0 0 760 155" xmlns="http://www.w3.org/2000/svg" fill="#c0c3d1" font-family="inherit" font-size="12"><rect x="55" y="'+Y(m.high)+'" width="686" height="'+(Y(m.low)-Y(m.high))+'" fill="#30423f"/>'+lines+'<polyline points="'+path+'" fill="none" stroke="#62d4b8" stroke-width="3" stroke-linejoin="round"/><line x1="'+X(selected.tick)+'" x2="'+X(selected.tick)+'" y1="12" y2="128" stroke="#b47548" stroke-dasharray="3 4"/><circle cx="'+X(selected.tick)+'" cy="'+Y(v)+'" r="5.4" fill="#ffac6b" stroke="white" stroke-width="2"/><text x="55" y="148">'+ast(series[0].time)+'</text><text x="398" y="148" text-anchor="middle">'+ast(series[Math.floor(series.length/2)].time)+'</text><text x="741" y="148" text-anchor="end">'+ast(series.at(-1).time)+' AST</text></svg>';
 $('chart').setAttribute('aria-label',label(metric)+' trace for '+siteName(selected.site)+'. Selected value '+display(v,metric)+' '+F[metric].unit+'.');
 $('traceSite').textContent=siteName(selected.site).toUpperCase()+'  /  '+Pilot.sites[selected.site-1]+' KM';
 $('traceTitle').textContent=label(metric)+' history';$('bigValue').innerHTML=display(v,metric)+' <span class="units">'+F[metric].unit+' · '+ast(selected.time,true)+' AST</span>';
 const f=selected.flags.find(f=>f.key===metric);
 $('analysisTitle').textContent=siteName(selected.site)+' · '+(f?label(metric).toLowerCase()+(f.delta<0?' below':' above')+' reference':label(metric).toLowerCase()+' within reference pattern');
 $('evidence').textContent=f?display(v,metric)+' '+F[metric].unit+' versus a reference median of '+display(m.median,metric)+'. Its neighbor-distance score is '+f.score.toFixed(1)+'× the learned flag threshold.':display(v,metric)+' '+F[metric].unit+' is within the model’s reference pattern. Reference median: '+display(m.median,metric)+' '+F[metric].unit+'.';
 $('recommend').textContent=f?checks[metric]+String(selected.site).padStart(2,'0')+'.':'Continue routine monitoring. Use the raw record and nearby samples if the operator needs more context.';
 renderGauge(selected, metric);
 const isNew=selected.receipt===lastContact&&playing;
 $('custody').textContent=selected.id+' · Ground stored '+ast(selected.receipt,true)+' AST. '+(!isNew||stage>=2?'Receipt relayed to ATHAR. ':'Receipt relay pending. ')+(!isNew||stage>=3?'Demo endpoint accepted delivery.':'Endpoint acceptance pending.');
}
function paintTable(){const v=view(),pages=Math.max(1,Math.ceil(v.length/8));page=Math.min(Math.max(0,page),pages-1);
 $('rows').innerHTML=v.slice(page*8,page*8+8).map(r=>'<tr><td><button class="idbtn" data-id="'+r.id+'">'+r.id+'</button></td><td>'+ast(r.time,true)+'</td><td>'+display(r.pressure,'pressure')+'</td><td>'+display(r.temperature,'temperature')+'</td><td>'+display(r.vibration,'vibration')+'</td><td>'+(r.flow==null?'—':display(r.flow,'flow'))+'</td><td>'+(r.flags.length?'<span class="pill">'+r.flags.map(f=>label(f.key)).join(', ')+'</span>':'Routine')+'</td></tr>').join('')||'<tr><td colspan="7">No records match these filters.</td></tr>';
 $('tableCount').textContent=v.length?(page*8+1)+'–'+Math.min(v.length,page*8+8)+' of '+v.length+' records':'0 records';$('prev').disabled=page===0;$('next').disabled=page>=pages-1;$('exportview').disabled=!v.length;
}
function paint(){
 const flags=data.filter(r=>r.flags.length).sort((a,b)=>b.tick-a.tick||a.site-b.site);
 $('count').textContent=data.length;$('flag-count').textContent=$('alertN').textContent=flags.length;
 $('alertList').innerHTML=flags.map(r=>{const f=r.flags[0];return '<button class="alert '+(r.id===selected.id?'selected':'')+'" data-id="'+r.id+'" aria-pressed="'+(r.id===selected.id)+'"><small>'+siteName(r.site)+' · '+ast(r.time,true)+' AST</small><strong>'+label(f.key)+(f.delta<0?' drop':' rise')+'</strong><span>'+display(r[f.key],f.key)+' '+F[f.key].unit+' · '+r.id+'</span></button>';}).join('')||'<p>No flagged readings in this batch.</p>';
 renderDistributions(data, selected.site);
 $('stationPick').value = selected.site;
 $('clock').textContent=ast(lastContact,true)+' AST · simulated contact';$('replay').disabled=playing;$('replay').textContent=playing?'Replaying contact…':end>=95?'Restart demo':'Replay next contact';
 document.querySelectorAll('.stages span').forEach((el,i)=>{el.className=i<stage||(!playing&&i===stage)?'done':i===stage?'active':'';});
 trend();paintTable();
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function replay(){
 if(playing)return;
 if(end>=95){end=47;data=Pilot.records(end);selected=data.find(r=>r.tick===46&&r.site===3);metric='pressure';lastContact=selected.receipt;page=0;stage=3;$('scope').value='all';$('status').value='all';$('contactStatus').textContent='Initial 24-hour scenario restored. Select an alert or replay a contact.';paint();return;}
 const token=++timerToken;playing=true;stage=0;const next=end+24;lastContact=Pilot.epoch+next*Pilot.tickMs+720000;
 const stages=['Receiving 120 synthetic records at the modeled nominal downlink rate of 125 kbps.','120 new records stored. The ground system has generated record-specific receipts.','The station has relayed the receipts on the 10 kbps command uplink.','The simulated Aramco endpoint has accepted the batch. This is logged separately from ground storage.'];
 for(let i=0;i<4;i++){if(token!==timerToken)return;stage=i;
  if(i===1){const old=end;end=next;data=Pilot.records(end);selected=data.filter(r=>r.tick>old&&r.flags.length).at(-1)||data.at(-1);metric=selected.flags[0]?.key||'pressure';page=0;}
  $('contactStatus').textContent=stages[i];paint();if(i<3)await delay(1000);
 }playing=false;paint();
}
$('scope').innerHTML='<option value="all">All stations</option>'+Pilot.sites.map((x,i)=>'<option value="'+(i+1)+'">'+siteName(i+1)+'</option>').join('');
$('alertList').onclick=e=>{const b=e.target.closest('button[data-id]');if(b)setSelected(data.find(r=>r.id===b.dataset.id))};
$('rows').onclick=e=>{const b=e.target.closest('button[data-id]');if(b)setSelected(data.find(r=>r.id===b.dataset.id),null,true)};
$('stations').onclick=e=>{const b=e.target.closest('button[data-site]');if(b){const s=+b.dataset.site;setSelected(data.find(r=>r.site===s&&r.tick===selected.tick)||data.filter(r=>r.site===s).at(-1),metric==='flow'&&![1,5].includes(s)?'pressure':metric);}};
$('stationPick').innerHTML=Pilot.sites.map((km,i)=>'<option value="'+(i+1)+'">'+siteName(i+1)+'</option>').join('');
$('stationPick').onchange=e=>{const site=Number(e.target.value);setSelected(data.find(r=>r.site===site&&r.tick===selected.tick),metric)};
$('metric').onchange=e=>{metric=e.target.value;trend()};$('replay').onclick=replay;
$('download').onclick=()=>download(Pilot.csv(data),'ATHAR_raw_'+data.length+'_records.csv','text/csv;charset=utf-8');
$('exportview').onclick=()=>download(Pilot.csv(view()),'ATHAR_filtered_'+view().length+'_records.csv','text/csv;charset=utf-8');
$('prev').onclick=()=>{page--;paintTable()};$('next').onclick=()=>{page++;paintTable()};for(const id of ['scope','status'])$(id).onchange=()=>{page=0;paintTable()};
$('contactStatus').textContent='Last batch stored and acknowledged. Select a flagged reading or replay the next pass.';paint();
