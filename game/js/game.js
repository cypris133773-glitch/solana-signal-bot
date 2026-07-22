/* =========================================================================
   SURVIVOR.io HEX EDITION — Richard Heart vs The Bear Market
   A Survivor.io / Vampire-Survivors style auto-shooter.
   Theme: Richard Heart, HEX, PulseChain, PulseX. Vanilla JS + Canvas.
   ========================================================================= */
(() => {
'use strict';

// ---------- Canvas ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const playArea = document.getElementById('play-area');
let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

function resize(){
  W = playArea.clientWidth; H = playArea.clientHeight;
  if (W <= 0 || H <= 0) return;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(playArea);

// ---------- Helpers ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const TAU = Math.PI * 2;
const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(Math.floor(s % 60)).padStart(2,'0')}`;
function fmtBig(n){
  if (n >= 1e12) return (n/1e12).toFixed(1)+'T';
  if (n >= 1e9)  return (n/1e9).toFixed(1)+'B';
  if (n >= 1e6)  return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3)  return (n/1e3).toFixed(1)+'K';
  return Math.round(n).toString();
}
const DMG_SCALE = 1e8; // crypto-flavored damage numbers ("-2.4B")

// ---------- Constants ----------
const WORLD = { w: 3200, h: 3200 };
const WIN_TIME = 300, BOSS_TIME = 270;

// ---------- Weapons ----------
const WEAPONS = {
  hexstake: { name:'HEX Stake', icon:'⬡', kind:'orbit', maxLevel:6,
    short:'Staked HEX shields orbit and shred FUD.',
    desc:l=>l===0?'Staked HEX shields orbit you, shredding anything they touch.':`${2+Math.floor((l)/1.5)} shields · +dmg`,
    stat:l=>({count:2+Math.floor(l/1.5),radius:78+l*6,dmg:8+l*4,speed:2.0+l*0.15,size:15}) },
  pulsefork: { name:'PulseChain Fork', icon:'🍴', kind:'projectile', maxLevel:6,
    short:'Auto-fires homing bolts at the nearest enemy.',
    desc:l=>l===0?'Fork the chain — auto-fires bolts at the nearest enemy.':`Fires ${1+Math.floor(l/2)} bolts · faster · +dmg`,
    stat:l=>({dmg:14+l*7,cd:0.85-l*0.09,speed:460,count:1+Math.floor(l/2),pierce:Math.floor(l/3),size:7}) },
  pulsex: { name:'PulseX Spread', icon:'🔄', kind:'spread', maxLevel:6,
    short:'Swap-fee shotgun blast around you.',
    desc:l=>l===0?'Swap fees blast out in a shotgun spread.':`${4+l} pellets · wider · +dmg`,
    stat:l=>({dmg:9+l*5,cd:1.5-l*0.12,speed:380,count:4+l,spread:0.5+l*0.06,size:6,range:300}) },
  tshare: { name:'T-Share Beam', icon:'⚡', kind:'beam', maxLevel:5,
    short:'Big-payday laser that burns over time.',
    desc:l=>l===0?'Big-payday laser sweeps the field.':`Wider beam · +dmg · faster`,
    stat:l=>({dmg:22+l*12,cd:3.2-l*0.25,width:26+l*8,len:900,dur:0.5}) },
  sacrifice: { name:'Pulse Wave', icon:'💥', kind:'nova', maxLevel:5,
    short:'PulseChain shockwave knocks back nearby FUD.',
    desc:l=>l===0?'Sacrifice pulse — shockwave knocks back and burns.':`Bigger radius · +dmg · faster`,
    stat:l=>({dmg:16+l*9,cd:2.6-l*0.2,radius:120+l*30,knock:180}) }
};
const PASSIVES = {
  maxhp:  { name:'Diamond Hands',   icon:'💎', short:'Heart barrier — more max HP.', desc:l=>`+25 Max HP (and heal)`, max:6 },
  speed:  { name:'Lambo Speed',     icon:'🏎️', short:'Move faster.', desc:l=>`+10% Move Speed`, max:5 },
  magnet: { name:'HEX Magnet',      icon:'🧲', short:'Wider HEX pickup range.', desc:l=>`+30% HEX pickup range`, max:5 },
  power:  { name:'Bull Market',     icon:'📈', short:'More damage.', desc:l=>`+12% All Damage`, max:6 },
  haste:  { name:'Gas Optimizer',   icon:'⛽', short:'Faster attacks.', desc:l=>`+10% Attack Speed`, max:5 },
  regen:  { name:'Staking Rewards', icon:'🌱', short:'Regenerate HP over time.', desc:l=>`Regenerate +0.6 HP/sec`, max:5 },
  greed:  { name:'Number Go Up',    icon:'🤑', short:'More XP per gem.', desc:l=>`+18% XP gained`, max:4 }
};

// ---------- Enemies ----------
const ENEMIES = {
  fud:    { name:'FUDster',    hp:14, spd:66, dmg:6,  r:15, xp:1, sprite:'zombie', color:'#5aa02e', score:1 },
  paper:  { name:'Paper Hands',hp:8,  spd:104,dmg:5,  r:13, xp:1, sprite:'paper',  color:'#e6e6f0', score:1 },
  shorter:{ name:'Shorter',    hp:24, spd:78, dmg:8,  r:16, xp:2, sprite:'blob',   color:'#8b2fff', score:2 },
  bear:   { name:'Bear',       hp:42, spd:52, dmg:11, r:21, xp:3, sprite:'bear',   color:'#8a5a2b', score:2 },
  sec:    { name:'SEC Agent',  hp:84, spd:44, dmg:15, r:23, xp:5, sprite:'golem',  color:'#6b7280', score:4 },
};
const BOSS = { name:'The Bear Market', hp:6000, spd:34, dmg:26, r:64, xp:200, sprite:'boss', color:'#5a2d0e', score:100 };

// ---------- State ----------
let state = 'menu';
let player, enemies, bullets, gems, particles, floaters, novas, beams;
let cam = { x:0, y:0 };
let time, kills, hexCollected, gemCollected, bag, wave, spawnTimer, bossSpawned, bossRef, screenShake;
let lastTs = 0;

function newRun(){
  player = {
    x:WORLD.w/2, y:WORLD.h/2, r:16,
    hp:100, maxHp:100, baseSpeed:165, speed:165,
    level:1, xp:0, xpNext:4, invuln:0,
    weapons:{ hexstake:{ level:1, t:0, ang:0 } },
    passives:{}, dmgMul:1, hasteMul:1, magnetMul:1, xpMul:1, regen:0,
    facing:{ x:1, y:0 }
  };
  enemies=[]; bullets=[]; gems=[]; particles=[]; floaters=[]; novas=[]; beams=[];
  time=0; kills=0; hexCollected=0; gemCollected=0; bag=0; wave=1;
  spawnTimer=0; bossSpawned=false; bossRef=null; screenShake=0;
  recalcStats();
  for (let i=0;i<6;i++) spawnEnemy('fud');
}
function recalcStats(){
  const p=player, P=p.passives;
  p.maxHp = 100 + (P.maxhp||0)*25;
  p.speed = p.baseSpeed*(1+(P.speed||0)*0.10);
  p.magnetMul = 1+(P.magnet||0)*0.30;
  p.dmgMul = 1+(P.power||0)*0.12;
  p.hasteMul = 1+(P.haste||0)*0.10;
  p.regen = (P.regen||0)*0.6;
  p.xpMul = 1+(P.greed||0)*0.18;
}

// ---------- Input ----------
const keys = {};
const move = { x:0, y:0 };
window.addEventListener('keydown', e=>{
  keys[e.key.toLowerCase()]=true;
  if (e.key==='Escape') togglePause();
  if ([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
});
window.addEventListener('keyup', e=>keys[e.key.toLowerCase()]=false);

const joyEl = document.getElementById('joystick');
const knobEl = document.getElementById('joystick-knob');
let touchId=null, joyOrigin=null;
function paRect(){ return playArea.getBoundingClientRect(); }
function pointerStart(x,y,id){
  if (state!=='playing') return;
  touchId=id; joyOrigin={x,y};
  const r=paRect();
  joyEl.style.left=(x-r.left-55)+'px'; joyEl.style.top=(y-r.top-55)+'px';
  joyEl.classList.remove('hidden');
}
function pointerMove(x,y){
  if (!joyOrigin) return;
  let dx=x-joyOrigin.x, dy=y-joyOrigin.y;
  const mag=Math.hypot(dx,dy)||1, cl=Math.min(mag,44), nx=dx/mag, ny=dy/mag;
  knobEl.style.left=(31+nx*cl)+'px'; knobEl.style.top=(31+ny*cl)+'px';
  if (mag>7){ move.x=nx; move.y=ny; } else { move.x=0; move.y=0; }
}
function pointerEnd(){ joyOrigin=null; touchId=null; move.x=0; move.y=0;
  joyEl.classList.add('hidden'); knobEl.style.left='31px'; knobEl.style.top='31px'; }
canvas.addEventListener('touchstart',e=>{ const t=e.changedTouches[0]; pointerStart(t.clientX,t.clientY,t.identifier); },{passive:true});
canvas.addEventListener('touchmove',e=>{ for(const t of e.changedTouches) if(t.identifier===touchId) pointerMove(t.clientX,t.clientY); },{passive:true});
canvas.addEventListener('touchend',e=>{ for(const t of e.changedTouches) if(t.identifier===touchId) pointerEnd(); },{passive:true});
let mouseDown=false;
canvas.addEventListener('mousedown',e=>{ mouseDown=true; pointerStart(e.clientX,e.clientY,'m'); });
window.addEventListener('mousemove',e=>{ if(mouseDown) pointerMove(e.clientX,e.clientY); });
window.addEventListener('mouseup',()=>{ if(mouseDown){ mouseDown=false; pointerEnd(); } });

function readInput(){
  let x=0,y=0;
  if (keys['w']||keys['arrowup']) y-=1;
  if (keys['s']||keys['arrowdown']) y+=1;
  if (keys['a']||keys['arrowleft']) x-=1;
  if (keys['d']||keys['arrowright']) x+=1;
  if (x||y){ const m=Math.hypot(x,y); return {x:x/m,y:y/m}; }
  return { x:move.x, y:move.y };
}

// ---------- Spawning ----------
function spawnEnemy(kind, ox, oy){
  const def=ENEMIES[kind];
  let x,y;
  if (ox!==undefined){ x=ox; y=oy; }
  else { const a=rand(0,TAU), d=Math.min(Math.max(W,H)*0.55,470)+rand(0,90);
    x=clamp(player.x+Math.cos(a)*d,20,WORLD.w-20); y=clamp(player.y+Math.sin(a)*d,20,WORLD.h-20); }
  const s=1+(time/60)*0.55;
  enemies.push({ kind,x,y,r:def.r,hp:def.hp*s,maxHp:def.hp*s,spd:def.spd,dmg:def.dmg,xp:def.xp,
    sprite:def.sprite,color:def.color,hitFlash:0,knock:{x:0,y:0},boss:false,wob:rand(0,TAU),def });
}
function spawnBoss(){
  const a=rand(0,TAU), d=Math.max(W,H)*0.6;
  const b={ kind:'boss',x:clamp(player.x+Math.cos(a)*d,120,WORLD.w-120),y:clamp(player.y+Math.sin(a)*d,120,WORLD.h-120),
    r:BOSS.r,hp:BOSS.hp,maxHp:BOSS.hp,spd:BOSS.spd,dmg:BOSS.dmg,xp:BOSS.xp,sprite:'boss',color:BOSS.color,
    hitFlash:0,knock:{x:0,y:0},boss:true,wob:0,def:BOSS };
  enemies.push(b); bossRef=b; bossSpawned=true;
  toast('☠ THE BEAR MARKET APPROACHES', '#ff3b5c'); screenShake=22;
}
function updateSpawning(dt){
  spawnTimer-=dt;
  const interval=Math.max(0.26,0.9-time/240);
  if (spawnTimer<=0){
    spawnTimer=interval;
    const batch=1+Math.floor(time/40);
    for (let i=0;i<batch;i++){
      let kind='fud'; const t=time,r=Math.random();
      if (t>200) kind=r<.28?'sec':r<.5?'bear':r<.72?'shorter':r<.86?'paper':'fud';
      else if (t>130) kind=r<.18?'sec':r<.42?'bear':r<.64?'shorter':r<.82?'paper':'fud';
      else if (t>70) kind=r<.30?'bear':r<.55?'shorter':r<.78?'paper':'fud';
      else if (t>30) kind=r<.35?'shorter':r<.6?'paper':'fud';
      spawnEnemy(kind);
    }
  }
  if (!bossSpawned && time>=BOSS_TIME) spawnBoss();
}

// ---------- Combat ----------
function fireProjectile(x,y,ang,spd,dmg,size,pierce,color){
  bullets.push({x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,dmg,r:size,life:1.6,pierce,hitSet:new Set(),color});
}
function nearestEnemy(x,y,maxD){
  let best=null,bd=maxD?maxD*maxD:Infinity;
  for (const e of enemies){ const d=dist2(x,y,e.x,e.y); if(d<bd){bd=d;best=e;} }
  return best;
}
function updateWeapons(dt){
  const p=player;
  for (const key in p.weapons){
    const w=p.weapons[key], def=WEAPONS[key], s=def.stat(w.level-1);
    if (def.kind==='orbit'){
      w.ang=(w.ang+s.speed*dt)%TAU;
      for (let i=0;i<s.count;i++){
        const a=w.ang+(i/s.count)*TAU, ox=p.x+Math.cos(a)*s.radius, oy=p.y+Math.sin(a)*s.radius;
        for (const e of enemies){
          if (dist2(ox,oy,e.x,e.y)<(s.size+e.r)**2){
            e._orbT=e._orbT||0;
            if (time-e._orbT>0.25){ e._orbT=time; damageEnemy(e,s.dmg*p.dmgMul,ox,oy,40); }
          }
        }
      }
    } else if (def.kind==='projectile'){
      w.t-=dt;
      if (w.t<=0){ w.t=s.cd/p.hasteMul; const tg=nearestEnemy(p.x,p.y,700);
        if (tg){ const base=Math.atan2(tg.y-p.y,tg.x-p.x);
          for (let i=0;i<s.count;i++){ const sp=(i-(s.count-1)/2)*0.16;
            fireProjectile(p.x,p.y,base+sp,s.speed,s.dmg*p.dmgMul,s.size,s.pierce,'#00e5ff'); } } }
    } else if (def.kind==='spread'){
      w.t-=dt;
      if (w.t<=0){ w.t=s.cd/p.hasteMul;
        const tg=nearestEnemy(p.x,p.y,s.range)||{x:p.x+p.facing.x*100,y:p.y+p.facing.y*100};
        const base=Math.atan2(tg.y-p.y,tg.x-p.x);
        for (let i=0;i<s.count;i++){ const a=base+rand(-s.spread,s.spread);
          bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*s.speed,vy:Math.sin(a)*s.speed,dmg:s.dmg*p.dmgMul,r:s.size,life:s.range/s.speed,pierce:0,hitSet:new Set(),color:'#ff2d9b'}); } }
    } else if (def.kind==='beam'){
      w.t-=dt;
      if (w.t<=0){ w.t=s.cd/p.hasteMul; const tg=nearestEnemy(p.x,p.y,900);
        const ang=tg?Math.atan2(tg.y-p.y,tg.x-p.x):Math.atan2(p.facing.y,p.facing.x);
        beams.push({x:p.x,y:p.y,ang,width:s.width,len:s.len,dmg:s.dmg*p.dmgMul,dur:s.dur,t:s.dur,hitSet:new Set()});
        screenShake=Math.max(screenShake,6); }
    } else if (def.kind==='nova'){
      w.t-=dt;
      if (w.t<=0){ w.t=s.cd/p.hasteMul;
        novas.push({x:p.x,y:p.y,r:0,max:s.radius,dmg:s.dmg*p.dmgMul,knock:s.knock,hitSet:new Set()}); }
    }
  }
}
function updateBeams(dt){
  for (let i=beams.length-1;i>=0;i--){
    const b=beams[i]; b.t-=dt; b.x=player.x; b.y=player.y;
    const dx=Math.cos(b.ang),dy=Math.sin(b.ang);
    for (const e of enemies){
      const rx=e.x-b.x,ry=e.y-b.y,proj=rx*dx+ry*dy;
      if (proj<0||proj>b.len) continue;
      if (Math.abs(rx*-dy+ry*dx)<b.width/2+e.r) damageEnemy(e,b.dmg*dt/0.5,e.x,e.y,0);
    }
    if (b.t<=0) beams.splice(i,1);
  }
}
function updateNovas(dt){
  for (let i=novas.length-1;i>=0;i--){
    const n=novas[i]; n.r+=620*dt;
    for (const e of enemies){
      if (n.hitSet.has(e)) continue;
      if (Math.hypot(e.x-n.x,e.y-n.y)<n.r+e.r){
        n.hitSet.add(e); damageEnemy(e,n.dmg,e.x,e.y,0);
        const a=Math.atan2(e.y-n.y,e.x-n.x); e.knock.x+=Math.cos(a)*n.knock; e.knock.y+=Math.sin(a)*n.knock;
      }
    }
    if (n.r>=n.max) novas.splice(i,1);
  }
}
function updateBullets(dt){
  for (let i=bullets.length-1;i>=0;i--){
    const b=bullets[i]; b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    let dead=b.life<=0;
    for (const e of enemies){
      if (b.hitSet.has(e)) continue;
      if (dist2(b.x,b.y,e.x,e.y)<(b.r+e.r)**2){
        damageEnemy(e,b.dmg,b.x,b.y,0); b.hitSet.add(e);
        if (b.pierce>0) b.pierce--; else { dead=true; break; }
      }
    }
    if (dead) bullets.splice(i,1);
  }
}
function damageEnemy(e,dmg,fx,fy,knock){
  e.hp-=dmg; e.hitFlash=0.12; bag+=dmg*DMG_SCALE*0.4;
  // crypto-flavored damage popup
  if (Math.random()<0.32) floater(pick(['-HEX!','-PLS!']), fx, fy, Math.random()<0.5?'#ff2d9b':'#00e5ff', true);
  else floater('-'+fmtBig(dmg*DMG_SCALE), fx, fy, e.boss?'#ffcf33':'#ffffff', false);
  if (knock){ const a=Math.atan2(e.y-player.y,e.x-player.x); e.knock.x+=Math.cos(a)*knock; e.knock.y+=Math.sin(a)*knock; }
  if (e.hp<=0) killEnemy(e);
}
function killEnemy(e){
  const idx=enemies.indexOf(e); if (idx<0) return;
  enemies.splice(idx,1); kills++;
  burst(e.x,e.y,e.color,e.boss?60:8);
  const n=e.boss?40:1;
  for (let i=0;i<n;i++) dropGem(e.x+rand(-e.r,e.r), e.y+rand(-e.r,e.r), e.xp, 'hex');
  if (e.boss){ for(let i=0;i<12;i++) dropGem(e.x+rand(-60,60),e.y+rand(-60,60),3,'gem');
               for(let i=0;i<5;i++) dropGem(e.x+rand(-50,50),e.y+rand(-50,50),0,'heart'); }
  else {
    if (Math.random()<0.16) dropGem(e.x,e.y,Math.max(2,e.xp),'gem');
    if (Math.random()<0.07) dropGem(e.x,e.y,0,'heart');
  }
  if (e.boss) win();
}
function dropGem(x,y,xp,type){
  gems.push({x,y,r:type==='heart'?8:6,xp,type,vx:rand(-40,40),vy:rand(-40,40),pulled:false});
}

// ---------- Player ----------
function updatePlayer(dt){
  const p=player, inp=readInput();
  if (inp.x||inp.y){ p.facing.x=inp.x; p.facing.y=inp.y; }
  p.x=clamp(p.x+inp.x*p.speed*dt,p.r,WORLD.w-p.r);
  p.y=clamp(p.y+inp.y*p.speed*dt,p.r,WORLD.h-p.r);
  p.invuln=Math.max(0,p.invuln-dt);
  if (p.regen) heal(p.regen*dt);
  if (p.invuln<=0){
    for (const e of enemies){
      if (dist2(p.x,p.y,e.x,e.y)<(p.r+e.r)**2){
        p.hp-=e.dmg; p.invuln=0.6; screenShake=Math.max(screenShake,8);
        burst(p.x,p.y,'#ff3b5c',10); floater('-'+e.dmg,p.x,p.y-20,'#ff3b5c',false);
        if (p.hp<=0){ p.hp=0; gameOver(); } break;
      }
    }
  }
}
function heal(a){ player.hp=Math.min(player.maxHp,player.hp+a); }
function updateEnemies(dt){
  for (const e of enemies){
    e.hitFlash=Math.max(0,e.hitFlash-dt); e.wob+=dt*6;
    const a=Math.atan2(player.y-e.y,player.x-e.x);
    e.x+=Math.cos(a)*e.spd*dt+e.knock.x*dt; e.y+=Math.sin(a)*e.spd*dt+e.knock.y*dt;
    e.knock.x*=0.86; e.knock.y*=0.86;
    e.x=clamp(e.x,0,WORLD.w); e.y=clamp(e.y,0,WORLD.h);
  }
}
function updateGems(dt){
  const p=player, pullR=95*p.magnetMul, pullR2=pullR*pullR;
  for (let i=gems.length-1;i>=0;i--){
    const g=gems[i]; g.x+=g.vx*dt; g.y+=g.vy*dt; g.vx*=0.9; g.vy*=0.9;
    const d2=dist2(g.x,g.y,p.x,p.y);
    if (g.pulled||d2<pullR2) g.pulled=true;
    if (g.pulled){ const a=Math.atan2(p.y-g.y,p.x-g.x), sp=Math.max(260,260+(pullR2-d2)*0.0006);
      g.x+=Math.cos(a)*sp*dt; g.y+=Math.sin(a)*sp*dt; }
    if (d2<(p.r+9)**2){
      gems.splice(i,1);
      if (g.type==='heart'){ heal(p.maxHp*0.15); floater('+HP',p.x,p.y-18,'#3bff7a',true); }
      else if (g.type==='gem'){ gainXp(g.xp); gemCollected+=1; }
      else { gainXp(g.xp); hexCollected+=g.xp; }
    }
  }
}
function gainXp(amount){
  const p=player; p.xp+=amount*p.xpMul;
  if (p.xp>=p.xpNext){ p.xp-=p.xpNext; p.level++;
    p.xpNext=Math.floor(5+p.level*3.4+p.level*p.level*0.55); heal(8); openLevelUp(); }
}

// ---------- Upgrades ----------
function buildUpgradePool(){
  const p=player, pool=[];
  for (const key in WEAPONS){ const def=WEAPONS[key], owned=p.weapons[key];
    if (owned){ if (owned.level<def.maxLevel) pool.push({type:'weapon',key,icon:def.icon,name:def.name,isNew:false,desc:`Lv ${owned.level}→${owned.level+1}: ${def.desc(owned.level)}`}); }
    else if (Object.keys(p.weapons).length<6) pool.push({type:'weapon',key,icon:def.icon,name:def.name,isNew:true,desc:def.desc(0)});
  }
  for (const key in PASSIVES){ const def=PASSIVES[key], lvl=p.passives[key]||0;
    if (lvl<def.max) pool.push({type:'passive',key,icon:def.icon,name:def.name,isNew:lvl===0,desc:def.desc(lvl+1)});
  }
  return pool;
}
function openLevelUp(){
  const pool=buildUpgradePool();
  if (pool.length===0){ heal(40); return; }
  const choices=[], copy=pool.slice(), n=Math.min(3,copy.length);
  for (let i=0;i<n;i++) choices.push(copy.splice(randInt(0,copy.length-1),1)[0]);
  state='levelup';
  const c=document.getElementById('upgrade-cards'); c.innerHTML='';
  document.getElementById('lvl-num').textContent=player.level;
  for (const ch of choices){
    const el=document.createElement('div'); el.className='upgrade-card'+(ch.isNew?' is-new':'');
    el.innerHTML=`<div class="uc-icon">${ch.icon}</div><div class="uc-body">
      <div class="uc-name">${ch.name}<span class="tag ${ch.isNew?'new':'up'}">${ch.isNew?'NEW':'UP'}</span></div>
      <div class="uc-desc">${ch.desc}</div></div>`;
    el.addEventListener('click',()=>applyUpgrade(ch)); c.appendChild(el);
  }
  show('levelup-screen');
}
function applyUpgrade(ch){
  const p=player;
  if (ch.type==='weapon'){ if (p.weapons[ch.key]) p.weapons[ch.key].level++; else p.weapons[ch.key]={level:1,t:0,ang:rand(0,TAU)}; }
  else { p.passives[ch.key]=(p.passives[ch.key]||0)+1; recalcStats(); if (ch.key==='maxhp') heal(25); }
  hide('levelup-screen'); updateSkillList();
  if (player.xp>=player.xpNext){ gainXp(0); if (state==='levelup') return; }
  state='playing';
}

// ---------- Particles / floaters ----------
function burst(x,y,color,n){ for(let i=0;i<n;i++){ const a=rand(0,TAU),s=rand(40,220);
  particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.25,.6),max:.6,color,r:rand(2,4)}); } }
function floater(txt,x,y,color,big){ floaters.push({txt:String(txt),x,y,vy:-46,life:.75,max:.75,color,big:!!big}); }
function updateParticles(dt){
  for (let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.9;p.vy*=0.9;p.life-=dt; if(p.life<=0) particles.splice(i,1); }
  for (let i=floaters.length-1;i>=0;i--){ const f=floaters[i]; f.y+=f.vy*dt;f.vy*=0.92;f.life-=dt; if(f.life<=0) floaters.splice(i,1); }
}
let toastMsg=null;
function toast(msg,color){ toastMsg={msg,color,life:2.4}; }

/* =========================================================================
   CHARACTER ART (canvas-drawn chibi sprites)
   ========================================================================= */
function heartPath(g,s){ // heart centered at origin, s=half-width
  g.beginPath(); g.moveTo(0,s*0.35);
  g.bezierCurveTo(-s*1.15,-s*0.55,-s*0.5,-s*1.25,0,-s*0.45);
  g.bezierCurveTo(s*0.5,-s*1.25,s*1.15,-s*0.55,0,s*0.35); g.closePath();
}
function hexPath(g,R){ g.beginPath(); for(let i=0;i<6;i++){ const a=i/6*TAU; g[i?'lineTo':'moveTo'](Math.cos(a)*R,Math.sin(a)*R);} g.closePath(); }

// Richard Heart head (skin, hair, heart sunglasses). Draw at origin, hr=head radius.
function drawRHHead(g,hr){
  // hair back
  g.fillStyle='#7a4a24'; g.beginPath(); g.arc(0,-hr*0.15,hr*1.06,Math.PI*0.9,Math.PI*2.1); g.fill();
  // face
  g.fillStyle='#f0c39a'; g.beginPath(); g.arc(0,0,hr,0,TAU); g.fill();
  // hair top
  g.fillStyle='#8a5a2e'; g.beginPath();
  g.arc(0,-hr*0.35,hr*0.98,Math.PI,0); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-hr*0.9,-hr*0.2); g.quadraticCurveTo(-hr*0.2,-hr*1.15,hr*0.95,-hr*0.35);
  g.quadraticCurveTo(hr*0.2,-hr*0.7,-hr*0.9,-hr*0.2); g.fill();
  // heart sunglasses (two lenses + bridge)
  g.save(); g.translate(0,-hr*0.02);
  g.fillStyle='#ff2d9b'; g.shadowColor='#ff2d9b'; g.shadowBlur=hr*0.4;
  g.save(); g.translate(-hr*0.42,0); g.scale(hr*0.028,hr*0.028); heartPath(g,10); g.fill(); g.restore();
  g.save(); g.translate(hr*0.42,0); g.scale(hr*0.028,hr*0.028); heartPath(g,10); g.fill(); g.restore();
  g.shadowBlur=0; g.strokeStyle='#ff2d9b'; g.lineWidth=hr*0.08;
  g.beginPath(); g.moveTo(-hr*0.12,-hr*0.05); g.lineTo(hr*0.12,-hr*0.05); g.stroke();
  // lens glint
  g.fillStyle='rgba(255,255,255,.7)'; g.beginPath(); g.arc(-hr*0.5,-hr*0.15,hr*0.09,0,TAU); g.arc(hr*0.34,-hr*0.15,hr*0.09,0,TAU); g.fill();
  g.restore();
  // smile + beard hint
  g.strokeStyle='#7a4a24'; g.lineWidth=hr*0.09; g.beginPath(); g.arc(0,hr*0.35,hr*0.35,0.15*Math.PI,0.85*Math.PI); g.stroke();
}

function drawPlayer(){
  const p=player;
  ctx.save(); ctx.translate(p.x,p.y);
  if (p.invuln>0 && Math.floor(p.invuln*20)%2) ctx.globalAlpha=0.45;
  // hexagon shield aura (rotating)
  ctx.save(); ctx.rotate(time*0.6);
  ctx.strokeStyle='rgba(255,45,155,0.9)'; ctx.lineWidth=3; ctx.shadowColor='#ff2d9b'; ctx.shadowBlur=16;
  hexPath(ctx,p.r*2.5); ctx.stroke();
  ctx.strokeStyle='rgba(139,47,255,0.5)'; ctx.lineWidth=2; hexPath(ctx,p.r*2.0); ctx.stroke();
  ctx.restore(); ctx.shadowBlur=0;
  // body (black shirt)
  ctx.fillStyle='#171622';
  ctx.beginPath(); ctx.roundRect(-p.r*0.85,p.r*0.1,p.r*1.7,p.r*1.35,p.r*0.4); ctx.fill();
  // HEX logo on chest
  ctx.save(); ctx.translate(0,p.r*0.75); ctx.fillStyle='#ffcf33'; hexPath(ctx,p.r*0.45); ctx.fill();
  ctx.fillStyle='#ff2d9b'; hexPath(ctx,p.r*0.22); ctx.fill(); ctx.restore();
  // staff with glowing hex
  ctx.strokeStyle='#c9a86a'; ctx.lineWidth=p.r*0.16;
  ctx.beginPath(); ctx.moveTo(p.r*0.7,p.r*1.1); ctx.lineTo(p.r*1.5,-p.r*1.2); ctx.stroke();
  ctx.save(); ctx.translate(p.r*1.55,-p.r*1.35); ctx.fillStyle='#ff2d9b'; ctx.shadowColor='#ff2d9b'; ctx.shadowBlur=14;
  hexPath(ctx,p.r*0.55); ctx.fill(); ctx.fillStyle='#ffd6ec'; hexPath(ctx,p.r*0.26); ctx.fill(); ctx.restore();
  ctx.shadowBlur=0;
  // head
  ctx.save(); ctx.translate(0,-p.r*0.55); drawRHHead(ctx,p.r*0.78); ctx.restore();
  ctx.globalAlpha=1; ctx.restore();
}

function drawEnemy(e){
  const g=ctx, flash=e.hitFlash>0;
  g.save(); g.translate(e.x,e.y);
  const bob=Math.sin(e.wob)*e.r*0.08; g.translate(0,bob);
  const col=flash?'#ffffff':e.color;
  g.shadowColor=e.color; g.shadowBlur=e.boss?26:7;

  if (e.sprite==='zombie'){
    // green FUD zombie
    g.fillStyle=col; g.beginPath(); g.roundRect(-e.r*0.8,-e.r*0.6,e.r*1.6,e.r*1.5,e.r*0.45); g.fill();
    g.shadowBlur=0;
    // arms out
    g.strokeStyle=col; g.lineWidth=e.r*0.35; g.lineCap='round';
    g.beginPath(); g.moveTo(-e.r*0.7,-e.r*0.1); g.lineTo(-e.r*1.25,-e.r*0.4);
    g.moveTo(e.r*0.7,-e.r*0.1); g.lineTo(e.r*1.25,-e.r*0.4); g.stroke();
    // eyes
    g.fillStyle='#ff3b3b'; g.beginPath(); g.arc(-e.r*0.32,-e.r*0.15,e.r*0.16,0,TAU); g.arc(e.r*0.32,-e.r*0.15,e.r*0.16,0,TAU); g.fill();
    // mouth
    g.strokeStyle='#123'; g.lineWidth=e.r*0.12; g.beginPath(); g.moveTo(-e.r*0.35,e.r*0.4); g.lineTo(-e.r*0.1,e.r*0.25); g.lineTo(e.r*0.15,e.r*0.45); g.lineTo(e.r*0.4,e.r*0.28); g.stroke();
  } else if (e.sprite==='paper'){
    g.fillStyle=col; g.beginPath(); g.moveTo(-e.r,-e.r*0.7);
    g.lineTo(e.r,-e.r*0.7); g.lineTo(e.r,e.r*0.7); g.lineTo(e.r*0.5,e.r*0.4);
    g.lineTo(0,e.r*0.8); g.lineTo(-e.r*0.5,e.r*0.4); g.lineTo(-e.r,e.r*0.7); g.closePath(); g.fill();
    g.shadowBlur=0; g.fillStyle='#556'; g.beginPath(); g.arc(-e.r*0.3,-e.r*0.1,e.r*0.12,0,TAU); g.arc(e.r*0.3,-e.r*0.1,e.r*0.12,0,TAU); g.fill();
    g.strokeStyle='#556'; g.lineWidth=e.r*0.1; g.beginPath(); g.arc(0,e.r*0.35,e.r*0.25,Math.PI,0); g.stroke();
  } else if (e.sprite==='blob'){
    g.fillStyle=col; g.beginPath(); g.arc(0,0,e.r,0,TAU); g.fill(); g.shadowBlur=0;
    g.fillStyle='#fff'; g.beginPath(); g.arc(-e.r*0.32,-e.r*0.1,e.r*0.2,0,TAU); g.arc(e.r*0.32,-e.r*0.1,e.r*0.2,0,TAU); g.fill();
    g.fillStyle='#000'; g.beginPath(); g.arc(-e.r*0.3,-e.r*0.05,e.r*0.1,0,TAU); g.arc(e.r*0.34,-e.r*0.05,e.r*0.1,0,TAU); g.fill();
    // angry brows
    g.strokeStyle='#000'; g.lineWidth=e.r*0.12; g.beginPath();
    g.moveTo(-e.r*0.55,-e.r*0.45); g.lineTo(-e.r*0.12,-e.r*0.25); g.moveTo(e.r*0.55,-e.r*0.45); g.lineTo(e.r*0.12,-e.r*0.25); g.stroke();
  } else if (e.sprite==='bear'){
    g.fillStyle=col; g.beginPath(); g.arc(-e.r*0.55,-e.r*0.6,e.r*0.35,0,TAU); g.arc(e.r*0.55,-e.r*0.6,e.r*0.35,0,TAU); g.fill();
    g.beginPath(); g.arc(0,0,e.r,0,TAU); g.fill(); g.shadowBlur=0;
    g.fillStyle='#d9b38c'; g.beginPath(); g.arc(0,e.r*0.25,e.r*0.5,0,TAU); g.fill();
    g.fillStyle='#000'; g.beginPath(); g.arc(0,e.r*0.15,e.r*0.16,0,TAU); g.fill();
    g.fillStyle='#ff3b3b'; g.beginPath(); g.arc(-e.r*0.35,-e.r*0.2,e.r*0.13,0,TAU); g.arc(e.r*0.35,-e.r*0.2,e.r*0.13,0,TAU); g.fill();
  } else if (e.sprite==='golem'){
    g.fillStyle=col; g.beginPath(); g.roundRect(-e.r*0.85,-e.r*0.7,e.r*1.7,e.r*1.5,e.r*0.3); g.fill();
    // spikes
    g.fillStyle='#9aa3af'; for(let i=-1;i<=1;i++){ g.beginPath(); g.moveTo(i*e.r*0.5-e.r*0.2,-e.r*0.7); g.lineTo(i*e.r*0.5,-e.r*1.15); g.lineTo(i*e.r*0.5+e.r*0.2,-e.r*0.7); g.closePath(); g.fill(); }
    g.shadowBlur=0; g.fillStyle='#ff3b3b'; g.beginPath(); g.arc(-e.r*0.3,-e.r*0.1,e.r*0.15,0,TAU); g.arc(e.r*0.3,-e.r*0.1,e.r*0.15,0,TAU); g.fill();
    g.strokeStyle='#1b2430'; g.lineWidth=e.r*0.12; g.beginPath(); g.moveTo(-e.r*0.3,e.r*0.4); g.lineTo(e.r*0.3,e.r*0.4); g.stroke();
  } else if (e.sprite==='boss'){
    g.fillStyle=flash?'#fff':'#6a2fb0'; g.beginPath(); g.arc(0,0,e.r,0,TAU); g.fill();
    g.fillStyle='#4a1f80'; g.beginPath(); g.arc(0,e.r*0.2,e.r*0.7,0,TAU); g.fill();
    g.shadowBlur=0;
    // pulse logo on chest
    g.strokeStyle='#00e5ff'; g.lineWidth=e.r*0.09; g.beginPath();
    g.moveTo(-e.r*0.5,e.r*0.2); g.lineTo(-e.r*0.2,e.r*0.2); g.lineTo(-e.r*0.05,-e.r*0.15); g.lineTo(e.r*0.12,e.r*0.5); g.lineTo(e.r*0.25,e.r*0.05); g.lineTo(e.r*0.5,e.r*0.05); g.stroke();
    // angry eyes + brows
    g.fillStyle='#ff3b3b'; g.beginPath(); g.arc(-e.r*0.35,-e.r*0.45,e.r*0.14,0,TAU); g.arc(e.r*0.35,-e.r*0.45,e.r*0.14,0,TAU); g.fill();
    g.strokeStyle='#2a0d18'; g.lineWidth=e.r*0.1; g.beginPath();
    g.moveTo(-e.r*0.55,-e.r*0.7); g.lineTo(-e.r*0.15,-e.r*0.5); g.moveTo(e.r*0.55,-e.r*0.7); g.lineTo(e.r*0.15,-e.r*0.5); g.stroke();
  }
  g.shadowBlur=0; g.lineCap='butt';
  // hp bar
  if ((e.boss||e.maxHp>30) && e.hp<e.maxHp){
    const w=e.r*2,h=e.boss?6:4; g.translate(0,-bob);
    g.fillStyle='rgba(0,0,0,.6)'; g.fillRect(-w/2,-e.r-11,w,h);
    g.fillStyle='#ff3b5c'; g.fillRect(-w/2,-e.r-11,w*clamp(e.hp/e.maxHp,0,1),h);
  }
  g.restore();
}

// ---------- Render ----------
function draw(){
  if (W<=0) return;
  ctx.clearRect(0,0,W,H);
  let sx=0,sy=0; if (screenShake>0){ sx=rand(-screenShake,screenShake); sy=rand(-screenShake,screenShake); }
  cam.x=clamp(player.x-W/2,0,Math.max(0,WORLD.w-W)); cam.y=clamp(player.y-H/2,0,Math.max(0,WORLD.h-H));
  ctx.save(); ctx.translate(-cam.x+sx,-cam.y+sy);
  drawBackground();

  // gems
  for (const gm of gems){
    ctx.save(); ctx.translate(gm.x,gm.y);
    if (gm.type==='heart'){ ctx.fillStyle='#ff4d7d'; ctx.shadowColor='#ff2d9b'; ctx.shadowBlur=10;
      ctx.save(); ctx.scale(0.8,0.8); heartPath(ctx,gm.r); ctx.fill(); ctx.restore(); }
    else if (gm.type==='gem'){ ctx.rotate((time*2+gm.x)%TAU); ctx.fillStyle='#4fd0ff'; ctx.shadowColor='#4fd0ff'; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.moveTo(0,-gm.r); ctx.lineTo(gm.r*0.8,0); ctx.lineTo(0,gm.r); ctx.lineTo(-gm.r*0.8,0); ctx.closePath(); ctx.fill(); }
    else { ctx.rotate((time*3+gm.x)%TAU); ctx.fillStyle='#ffcf33'; ctx.shadowColor='#ff8a00'; ctx.shadowBlur=10; hexPath(ctx,gm.r); ctx.fill(); }
    ctx.restore();
  }
  ctx.shadowBlur=0;

  for (const n of novas){
    ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,TAU); ctx.strokeStyle='rgba(255,45,155,'+(1-n.r/n.max)+')'; ctx.lineWidth=8; ctx.stroke();
    ctx.beginPath(); ctx.arc(n.x,n.y,n.r*0.7,0,TAU); ctx.strokeStyle='rgba(0,229,255,'+(0.6-n.r/n.max*0.6)+')'; ctx.lineWidth=4; ctx.stroke();
  }
  for (const b of beams){ const al=clamp(b.t/b.dur,0,1);
    ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.ang);
    const gr=ctx.createLinearGradient(0,0,b.len,0);
    gr.addColorStop(0,'rgba(255,207,51,'+(0.9*al)+')'); gr.addColorStop(1,'rgba(255,45,155,0)');
    ctx.fillStyle=gr; ctx.fillRect(0,-b.width/2*(0.5+al*0.5),b.len,b.width*(0.5+al*0.5)); ctx.restore(); }

  for (const e of enemies) drawEnemy(e);

  for (const b of bullets){ ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,TAU); ctx.fillStyle=b.color; ctx.shadowColor=b.color; ctx.shadowBlur=10; ctx.fill(); }
  ctx.shadowBlur=0;

  // orbit shields (HEX hexes)
  const hs=player.weapons.hexstake;
  if (hs){ const s=WEAPONS.hexstake.stat(hs.level-1);
    for (let i=0;i<s.count;i++){ const a=hs.ang+(i/s.count)*TAU, ox=player.x+Math.cos(a)*s.radius, oy=player.y+Math.sin(a)*s.radius;
      ctx.save(); ctx.translate(ox,oy); ctx.rotate(a*3); ctx.fillStyle='#ffcf33'; ctx.shadowColor='#ff2d9b'; ctx.shadowBlur=14;
      hexPath(ctx,s.size); ctx.fill(); ctx.fillStyle='#ff2d9b'; hexPath(ctx,s.size*0.45); ctx.fill(); ctx.restore(); }
  }
  ctx.shadowBlur=0;

  drawPlayer();

  for (const p of particles){ ctx.globalAlpha=clamp(p.life/p.max,0,1); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,TAU); ctx.fill(); }
  ctx.globalAlpha=1;

  ctx.textAlign='center';
  for (const f of floaters){ ctx.globalAlpha=clamp(f.life/f.max,0,1);
    ctx.font='bold '+(f.big?16:14)+'px Trebuchet MS, sans-serif';
    ctx.fillStyle=f.color; ctx.strokeStyle='rgba(0,0,0,.65)'; ctx.lineWidth=3;
    ctx.strokeText(f.txt,f.x,f.y); ctx.fillText(f.txt,f.x,f.y); }
  ctx.globalAlpha=1;
  ctx.restore();

  if (toastMsg){ ctx.globalAlpha=clamp(toastMsg.life,0,1); ctx.textAlign='center'; ctx.font='bold 20px Trebuchet MS, sans-serif';
    ctx.fillStyle=toastMsg.color; ctx.strokeStyle='rgba(0,0,0,.7)'; ctx.lineWidth=4;
    ctx.strokeText(toastMsg.msg,W/2,64); ctx.fillText(toastMsg.msg,W/2,64); ctx.globalAlpha=1; }

  if (bossRef && enemies.includes(bossRef)){
    const bw=Math.min(W*0.8,420),bh=13,bx=(W-bw)/2,by=H-30;
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(bx-2,by-2,bw+4,bh+4);
    ctx.fillStyle='#2a0d18'; ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle='#ff3b5c'; ctx.fillRect(bx,by,bw*clamp(bossRef.hp/bossRef.maxHp,0,1),bh);
    ctx.textAlign='center'; ctx.font='bold 11px Trebuchet MS'; ctx.fillStyle='#fff'; ctx.fillText('🐻 THE BEAR MARKET',W/2,by-4);
  }
}
function drawBackground(){
  ctx.fillStyle='#0c0720'; ctx.fillRect(cam.x,cam.y,W,H);
  const grid=64; ctx.strokeStyle='rgba(139,47,255,0.10)'; ctx.lineWidth=1; ctx.beginPath();
  const sX=Math.floor(cam.x/grid)*grid, sY=Math.floor(cam.y/grid)*grid;
  for (let x=sX;x<cam.x+W;x+=grid){ ctx.moveTo(x,cam.y); ctx.lineTo(x,cam.y+H); }
  for (let y=sY;y<cam.y+H;y+=grid){ ctx.moveTo(cam.x,y); ctx.lineTo(cam.x+W,y); }
  ctx.stroke();
  ctx.strokeStyle='rgba(255,45,155,0.5)'; ctx.lineWidth=6; ctx.strokeRect(0,0,WORLD.w,WORLD.h);
}

// ---------- HUD ----------
function updateHud(){
  const p=player;
  document.getElementById('xp-fill').style.width=clamp(p.xp/p.xpNext*100,0,100)+'%';
  document.getElementById('av-lvl').textContent=p.level;
  document.getElementById('av-hp-fill').style.width=clamp(p.hp/p.maxHp*100,0,100)+'%';
  document.getElementById('av-hp-pct').textContent=Math.max(0,Math.round(p.hp/p.maxHp*100))+'%';
  document.getElementById('timer').textContent=fmtTime(time);
  wave=1+Math.floor(time/12); document.getElementById('wave-num').textContent=wave;
  document.getElementById('cur-hex').textContent=hexCollected.toLocaleString();
  document.getElementById('cur-gem').textContent=gemCollected.toLocaleString();
  document.getElementById('cur-bag').textContent=fmtBig(bag);
  // stats
  const P=p.passives;
  document.getElementById('st-hp').textContent=Math.round(p.maxHp);
  document.getElementById('st-atk').textContent=Math.round(100*p.dmgMul);
  document.getElementById('st-def').textContent=(P.maxhp||0)*12+(P.regen||0)*8;
  document.getElementById('st-luck').textContent=Math.round((p.xpMul-1)*100)+'%';
  document.getElementById('st-spd').textContent='+'+Math.round((p.speed/p.baseSpeed-1)*100)+'%';
}
function updateSkillList(){
  const list=document.getElementById('skill-list'); list.innerHTML='';
  const keys=Object.keys(player.weapons).slice(0,3);
  for (const k of keys){ const def=WEAPONS[k], w=player.weapons[k];
    const el=document.createElement('div'); el.className='skill';
    el.innerHTML=`<div class="sk-ic">${def.icon}<span class="sk-lv">${w.level}</span></div>
      <div class="sk-body"><div class="sk-name">${def.name}</div><div class="sk-desc">${def.short}</div></div>`;
    list.appendChild(el);
  }
}

// ---------- Avatar & pet (static) ----------
function drawAvatar(){
  const c=document.getElementById('avatar'), g=c.getContext('2d');
  g.clearRect(0,0,72,72);
  g.fillStyle='#120a24'; g.fillRect(0,0,72,72);
  g.save(); g.translate(36,20); drawRHHead(g,18); g.restore();
  // shirt with hex
  g.fillStyle='#171622'; g.beginPath(); g.roundRect(14,40,44,34,10); g.fill();
  g.save(); g.translate(36,58); g.fillStyle='#ffcf33'; hexPath(g,9); g.fill(); g.fillStyle='#ff2d9b'; hexPath(g,4.5); g.fill(); g.restore();
}
function drawPet(){
  const c=document.getElementById('pet'); if(!c) return; const g=c.getContext('2d');
  g.clearRect(0,0,52,52); g.fillStyle='#120a24'; g.fillRect(0,0,52,52);
  g.translate(26,28);
  // ears
  g.fillStyle='#8a5a2e'; g.beginPath(); g.ellipse(-15,-6,7,12,-0.4,0,TAU); g.ellipse(15,-6,7,12,0.4,0,TAU); g.fill();
  // head
  g.fillStyle='#b07a3c'; g.beginPath(); g.arc(0,0,16,0,TAU); g.fill();
  g.fillStyle='#e6c79a'; g.beginPath(); g.arc(0,6,9,0,TAU); g.fill();
  g.fillStyle='#000'; g.beginPath(); g.arc(0,3,3,0,TAU); g.fill();
  // heart glasses
  g.fillStyle='#ff2d9b'; g.save(); g.translate(-7,-3); g.scale(0.32,0.32); heartPath(g,10); g.fill(); g.restore();
  g.save(); g.translate(7,-3); g.scale(0.32,0.32); heartPath(g,10); g.fill(); g.restore();
  // tongue
  g.fillStyle='#ff5b8a'; g.beginPath(); g.roundRect(-3,9,6,7,3); g.fill();
}

// ---------- Flow ----------
function show(id){ document.getElementById(id).classList.remove('hidden'); }
function hide(id){ document.getElementById(id).classList.add('hidden'); }

function startGame(){
  document.getElementById('app').classList.remove('hidden');
  resize();
  newRun();
  hide('start-screen'); hide('gameover-screen'); hide('win-screen');
  drawAvatar(); drawPet(); updateSkillList(); updateHud();
  state='playing'; lastTs=performance.now();
}
const GAMEOVER_FLAVORS=['The bears got your bags.','Paper hands claimed another.','You should have kept staking.',
  'FUD is a hell of a drug.','Sold the bottom, as always.','Not your keys, not your survival.'];
function gameOver(){
  state='over';
  document.getElementById('gameover-flavor').textContent=pick(GAMEOVER_FLAVORS);
  document.getElementById('ro-time').textContent=fmtTime(time);
  document.getElementById('ro-level').textContent=player.level;
  document.getElementById('ro-kills').textContent=kills;
  document.getElementById('ro-hex').textContent=hexCollected;
  saveBest(); show('gameover-screen');
}
function win(){
  state='win';
  document.getElementById('wo-level').textContent=player.level;
  document.getElementById('wo-kills').textContent=kills;
  document.getElementById('wo-hex').textContent=hexCollected;
  saveBest(); show('win-screen');
}
function saveBest(){
  try{ const best=JSON.parse(localStorage.getItem('hexsurvivor_best')||'{}');
    const cur={time,level:player.level,kills,hex:hexCollected};
    const better=cur.time>(best.time||0);
    if (better) localStorage.setItem('hexsurvivor_best',JSON.stringify(cur));
    const b=better?cur:best;
    if (b.time!==undefined) document.getElementById('best-line').textContent=`Best: ${fmtTime(b.time)} survived · Lv ${b.level} · ${b.kills} kills`;
  }catch(_){}
}
function togglePause(){ if(state==='playing') state='paused'; else if(state==='paused'){ state='playing'; lastTs=performance.now(); } }

// nav buttons (flavor)
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>{
  const map={stake:'🔒 Staking longer pays better. (coming soon)',daily:'📅 Come back tomorrow for HEX!',
    board:'🏆 '+(document.getElementById('best-line').textContent||'No runs yet — go survive!'),shop:'🛒 Shop is closed. Never sell.'};
  toast(map[b.dataset.nav]||'', '#ffcf33');
}));

// ---------- Loop ----------
function loop(ts){
  requestAnimationFrame(loop);
  let dt=(ts-lastTs)/1000; lastTs=ts; if (dt>0.05) dt=0.05;
  if (screenShake>0) screenShake=Math.max(0,screenShake-dt*40);
  if (toastMsg){ toastMsg.life-=dt; if(toastMsg.life<=0) toastMsg=null; }
  if (state==='playing'){
    time+=dt;
    updateSpawning(dt); updatePlayer(dt); updateEnemies(dt); updateWeapons(dt);
    updateBullets(dt); updateBeams(dt); updateNovas(dt); updateGems(dt); updateParticles(dt); updateHud();
  } else if (state==='levelup'||state==='paused'){ updateParticles(dt); }
  if (state!=='menu') draw();
}

document.getElementById('start-btn').addEventListener('click',startGame);
document.getElementById('restart-btn').addEventListener('click',startGame);
document.getElementById('win-restart-btn').addEventListener('click',startGame);
document.getElementById('pause-btn').addEventListener('click',togglePause);
requestAnimationFrame(loop);

// Dev-only hook (dormant unless ?debug) — for automated smoke tests.
if (location.search.indexOf('debug')!==-1){
  window.__hs={ forceLevel:()=>{ if(state==='playing') gainXp(player.xpNext); },
    snapshot:()=>({state,level:player.level,kills,hex:hexCollected,gem:gemCollected,weapons:Object.keys(player.weapons).length}) };
}
})();
