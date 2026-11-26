import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as L from '../dist/m06-layout.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

test('chapter 6 set dressing: dozens of props, none on a wall, door, interaction, spawn, checkpoint, supply or portal',()=>{
  assert.ok(L.DRESSING.length>=60,String(L.DRESSING.length));
  const kinds=new Set(L.DRESSING.map(d=>d.kind));for(const k of ['mast','barrels','cars','tires','jersey','console','cabinet-row','container-stack','transformer','drone-rack'])assert.ok(kinds.has(k),k);
  const base=[...L.buildCollisions().filter(o=>!L.DRESSING.some(d=>d.x===o.x&&d.z===o.z&&d.kind===o.kind))].filter(o=>(o.y||0)<3);
  for(const d of L.DRESSING){
    assert.ok(!base.some(b=>Math.abs(d.x-b.x)<d.hx+b.hx+2&&Math.abs(d.z-b.z)<d.hz+b.hz+2),`${d.kind}@${d.x},${d.z} touches a collider`);
    for(const i of L.INTERACTIONS)assert.ok(!(Math.abs(d.x-i.x)<d.hx+3&&Math.abs(d.z-i.z)<d.hz+3),`${d.kind} near ${i.id}`);
    for(const s of L.STAGES)assert.ok(!(Math.abs(d.x-s.checkpoint.x)<d.hx+4&&Math.abs(d.z-s.checkpoint.z)<d.hz+4),`${d.kind} on checkpoint ${s.id}`);
  }
});
test('the dressed level stays fully playable: every interaction and every spawn is reachable from the start',()=>{
  const cols=L.buildCollisions({open:['portail','coeur','quai']}).filter(o=>!o.walkableSurface&&(o.y||0)<2),N=200,R=.6,grid=new Uint8Array(N*N);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=-99.5+i,z=-99.5+j;if(cols.some(b=>Math.abs(x-b.x)<b.hx+R&&Math.abs(z-b.z)<b.hz+R))grid[j*N+i]=1;}
  const idx=(x,z)=>Math.round(z+99.5)*N+Math.round(x+99.5),seen=new Uint8Array(N*N),q=[idx(L.START.x,L.START.z)];seen[q[0]]=1;
  for(let h=0;h<q.length;h++){const c=q[h],x=c%N,y=(c/N)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const n=ny*N+nx;if(!seen[n]&&!grid[n]){seen[n]=1;q.push(n);}}}
  const near=(x,z)=>{for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(seen[idx(x+dx,z+dz)])return true;return false;};
  for(const it of L.INTERACTIONS)if(!(it.y>0))assert.ok(near(it.x,it.z),it.id);
  for(const [n,e] of Object.entries(L.ENCOUNTERS))for(const u of e.units)assert.ok(near(u.x,u.z),n+'/'+u.form);
});
test('relief and horizon: flat play area matching the asphalt, ridges, skyline, forest; art wires the dressing and the Blender models',()=>{
  const h=read('m06-horizon.js'),art=read('m06-art.js'),dr=read('m06-dressing.js');
  assert.match(h,/PLAY_HALF = 112/);assert.match(art,/extendPaving\(T,M.asphalt/);   // asphalt paving extended by the shared chapter horizon
  for(const part of ['function height','ridge(1050','LatheGeometry','InstancedMesh','LineSegments','train','Sprite'])assert.ok(h.includes(part),part);
  assert.match(art,/createFoundryHorizon/);assert.match(art,/buildDressing/);assert.match(art,/horizon\?\.update\(t[,)]/);
  assert.match(dr,/m04\/models/);assert.match(read('niveau6.js'),/PerspectiveCamera\(70,innerWidth\/innerHeight,\.06,3600\)/);
});
