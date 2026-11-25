'use strict';
const chartColors = {pressure:'#8c73ff',temperature:'#efb45c',vibration:'#5ad1af',flow:'#57a7f3'};

function renderDistributions(records, activeSite) {
  const sites = Array(5).fill(0);
  const channels = {pressure:0, temperature:0, vibration:0, flow:0};
  for (const record of records) {
    if (record.flags.length) sites[record.site-1]++;
    for (const flag of record.flags) channels[flag.key]++;
  }
  const max = Math.max(1,...sites);
  $('stations').innerHTML = sites.map((count,index) => {
    const site=index+1;
    return '<button class="barrow" data-site="'+site+'" aria-pressed="'+(site===activeSite)+'" aria-label="'+siteName(site)+', '+count+' flagged records"><span>'+siteName(site)+'</span><i><b style="width:'+count/max*100+'%"></b></i><strong>'+count+'</strong></button>';
  }).join('');
  const total=Object.values(channels).reduce((a,b)=>a+b,0);
  let sum=0;
  const stops=[];
  const legend=[];
  for (const [key,count] of Object.entries(channels)) {
    const start=sum;
    sum+=count;
    if(count) stops.push(chartColors[key]+' '+start/total*100+'% '+sum/total*100+'%');
    legend.push('<div><i style="background:'+chartColors[key]+'"></i><span>'+Pilot.fields[key].label+'</span><b>'+count+'</b></div>');
  }
  $('ring').style.background=total?'conic-gradient('+stops.join(',')+')':'#424557';
  $('ringTotal').textContent=total;
  $('channelLegend').innerHTML=legend.join('');
}

function renderGauge(record,key) {
  const model=Pilot.models[record.site+key];
  const score=model.distance(record[key])/model.cutoff;
  const angle=v=>(145+250*Math.sqrt(Math.min(v,16))/4)*Math.PI/180;
  const point=(v,r)=>[96+r*Math.cos(angle(v)),77+r*Math.sin(angle(v))];
  function arc(from,to,color) {
    return '<path d="M'+point(from,64).join(' ')+' A64 64 0 0 1 '+point(to,64).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="10"/>';
  }
  const ticks=[0,1,4,9,16].map(v=>{
    const [x,y]=point(v,48);
    return '<text x="'+x+'" y="'+(y+3)+'" text-anchor="middle">'+v+'</text>';
  }).join('');
  const tip=point(score,55);
  $('dial').innerHTML='<svg viewBox="0 0 192 126" role="img" aria-label="Anomaly score '+score.toFixed(1)+' times the flag threshold">'+arc(0,1,'#59d1ae')+arc(1,4,'#f7c869')+arc(4,16,'#f08f67')+ticks+'<line x1="96" y1="77" x2="'+tip[0]+'" y2="'+tip[1]+'" stroke="#f3f3ff" stroke-width="3"/><circle cx="96" cy="77" r="5" fill="#f3f3ff"/><text class="gaugeValue" x="96" y="116" text-anchor="middle">'+score.toFixed(1)+'×</text></svg>';
  $('reference').textContent='Reference median · '+display(model.median,key)+' '+Pilot.fields[key].unit;
}
