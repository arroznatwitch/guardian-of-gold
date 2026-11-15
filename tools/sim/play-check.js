(function(){const o=[];on={token:'a'.repeat(64)};dmgLog=true;
for(const c of ['knight','archer','mage']){for(let wi=0;wi<5;wi++){for(const mode of ['farm','raid']){
 try{save=newSave(c);save.pl.lv=49;save.own[c]=[1,1,1,1,1];save.eq[c]=wi;for(const w of CLASSES[c].weapons){save.wst[w.id][0]=1}
  try{ensurePets&&ensurePets();save.pets.own.dog=1;save.pets.eq='dog'}catch(e){}
  for(const sl of SLOTS)save.gear[sl]=genItem(sl,3,40);
  if(mode==='farm')startMission(0,undefined,true);else startMission(1,1);
  R.p.face=0;let key=0;
  for(let i=0;i<900;i++){ if(i%5===0)attack(); if(i%90===30){try{skill()}catch(e){throw e}} if(i%200===100)special(); update(1/60);ui=[];drawPlayScreens(); if(state!=='play')break}
  o.push(c+wi+mode+' ok '+state)}catch(e){o.push(c+wi+mode+' ERRO '+e.stack.split('\n').slice(0,4).join(' <- '))}
}}}
return o.filter(x=>!x.includes(' ok ')).join('\n')||'tudo ok '+o.length})()
