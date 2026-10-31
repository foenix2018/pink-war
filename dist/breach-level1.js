import {BREACH_LOGS} from './breach-dressing-layout.js';
import {CampaignLevel1} from './campaign-level1.js';
import {ArenaGame,clamp,segmentBox} from './game-logic.js';
import {BREACH,breachTraversal} from './breach-layout.js';
const siteHeight=p=>p.x===15&&p.z===8?4:0;
const titles={arrival:['01 · Arrivée','Rejoindre le hangar. Déplacements, saut et accroupissement libres.'],hangar:['02 · Hangar de transit','Neutraliser les deux sentinelles. Utiliser les containers.'],passages:['03 · Passerelles et tunnels','Choisir la passerelle ou le tunnel puis rejoindre la cour.'],courtyard:['04 · Cour centrale','Neutraliser la patrouille puis activer les deux relais.'],reactor:['05 · Cœur énergétique','Détruire les trois stabilisateurs pour affaiblir le blindage du gardien.'],extraction:['06 · Extraction','Surcharge engagée. Rejoindre le portail au nord.'],complete:['La Brèche Violette','Complexe neutralisé. Extraction réussie.']};
export class BreachLevel1 extends CampaignLevel1{
 // Solid tops and undersides participate in vertical physics, including tall cargo.
 surfaceHeight(x,z,time=this.time,max=Infinity){let floor=super.surfaceHeight(x,z,time,max);for(const b of this.obstacles){const top=(b.y||0)+b.height;if(top<=max+.001&&Math.abs(x-b.x)<b.hx&&Math.abs(z-b.z)<b.hz)floor=Math.max(floor,top);}return floor;}
 settle(entity,dt,isPlayer=false){const previous=entity.elevation||0,rising=(entity.verticalSpeed||0)>0;super.settle(entity,dt,isPlayer);if(!rising)return;const height=entity.crouched?.95:1.8;for(const b of this.obstacles)if(Math.abs(entity.x-b.x)<b.hx&&Math.abs(entity.z-b.z)<b.hz&&previous+height<=(b.y||0)+.001&&entity.elevation+height>(b.y||0)){entity.elevation=(b.y||0)-height;entity.verticalSpeed=0;entity.grounded=false;}}
 reset(id=this.characterId||'ghju'){ArenaGame.prototype.reset.call(this,id);this.mode='campaign';this.characterId=id;this.sibling=id==='ghju'?'LYLU':'GHJU';this.stage='arrival';this.relays=[false,false];this.stabilizers=[false,false,false];this.completed=false;this.checkpoint='arrival';this.encounter=0;this.toSpawn=0;this.nextSpawnAt=Infinity;this.traversal=breachTraversal;this.routes=breachTraversal.routes;this.lifts=[];this.stairNavigation=this.routes.map(()=>new this.navigation.constructor(this.obstacles));Object.assign(this.player,{...BREACH.start,elevation:0,yaw:0});this.nextWave=-1;this.secretFound=[false,false];this.pendingSpawns=[];this.portalSerial=800;this.stabilizerHits=[0,0,0];return this;}

 resumeCheckpoint(checkpoint){if(!['passages','reactor'].includes(checkpoint))return;this.enemies=[];this.checkpoint=checkpoint;this.stage=checkpoint;this.ownedWeapons.add(1);if(checkpoint==='passages'){Object.assign(this.player,{x:0,z:34,elevation:0});this.deploy(['synth','seer','stalker'],[{x:-13,z:16},{x:5,z:21}]);}else{Object.assign(this.player,{x:0,z:-30,elevation:0});this.relays=[true,true];this.encounter=2;this.deploy(['bulwark'],[{x:0,z:-67}]);}this.setStage(checkpoint);}
 get campaign(){const t=titles[this.stage]||titles.arrival;let objective=null;if(this.stage==='courtyard'&&!this.enemies.length&&!this.pendingSpawns.length){const i=this.relays.findIndex(v=>!v);if(i>=0)objective={id:`relay-${i}`,label:`ACTIVER RELAIS ${i+1}/2`,position:BREACH.relays[i]};}if(this.stage==='reactor'){const i=this.stabilizers.findIndex(v=>!v);if(i>=0)objective={id:`stabilizer-${i}`,label:`SABOTER STABILISATEUR ${i+1}/3`,position:BREACH.stabilizers[i]};}if(this.stage==='extraction')objective={id:'exit',label:'EXTRACTION',position:BREACH.exit};return {id:'breche-violette-01',name:'La Brèche Violette',stage:this.stage,title:t[0],subtitle:t[1],objective,archive:[],sibling:this.sibling,remaining:this.enemies.length+this.pendingSpawns.length,total:13,completed:this.completed,relays:this.relays,stabilizers:this.stabilizers,checkpoint:this.checkpoint,secrets:this.secretFound};}
 getInteraction(){if(this.state!=='playing')return null;const objective=this.campaign.objective;const targets=[...(objective?[objective]:[]),...BREACH_LOGS.map(log=>({id:'log-'+log.id,label:'CONSULTER LE TERMINAL',position:log}))];
 for(const o of targets){const p=o.position;if(Math.hypot(this.player.x-p.x,this.player.z-p.z)>2.65||Math.abs(this.player.elevation-p.y)>.6)continue;
 const eye={x:this.player.x,y:this.player.elevation+1.4,z:this.player.z},target={x:p.x,y:p.y+1.35,z:p.z};if(!this.obstacles.some(b=>b.kind!=='terminal'&&!b.walkableSurface&&segmentBox(eye,target,b)!==null))return o;}return null;}
 interact(){const o=this.getInteraction();if(!o)return false;if(o.id.startsWith('log-')){const log=BREACH_LOGS.find(l=>'log-'+l.id===o.id);this.event('campaign',{title:log.title,subtitle:log.text.replace('{sibling}',this.sibling)});return true;}if(o.id.startsWith('relay')){this.relays[Number(o.id.at(-1))]=true;if(this.relays.every(Boolean)){this.checkpoint='reactor';this.activePortals=[];this.setStage('reactor');this.encounter=2;this.deploy(['bulwark'],[{x:0,z:-67}]);}}
 else if(o.id.startsWith('stabilizer')){this.disableStabilizer(Number(o.id.at(-1))); this.event('impact',{x:o.position.x,y:1.5,z:o.position.z,surface:'metal'});}else if(o.id==='exit'){this.completed=true;this.state='won';this.bullets=[];this.setStage('complete');this.event('win',{campaign:true,level:1});}return true;}
 deploy(forms,sites){
 // Open a physical gate first; units are created only after its opening animation.
 const valid=sites.filter(p=>this.portalIsClear(p));
 const pool=valid.filter(p=>Math.hypot(p.x-this.player.x,p.z-this.player.z)>=7);
 const selected=pool.length?pool:valid;if(!selected.length)throw new Error('No clear reinforcement portal');
 this.pendingSpawns=[];this.activePortals=[];
 selected.forEach((p,i)=>{this.activePortals.push({id:++this.portalSerial,...p,y:siteHeight(p),yaw:Math.atan2(this.player.x-p.x,this.player.z-p.z),openedAt:this.time+i*.35});});
 forms.forEach((form,i)=>{const site=this.activePortals[i%this.activePortals.length];this.pendingSpawns.push({form,site,at:this.time+1.6+i*1.35,guardian:form==='bulwark'&&this.encounter===2});});
 this.portalCloseAt=this.pendingSpawns.at(-1).at+2;
 this.event('portals',{count:this.activePortals.length,sites:this.activePortals.map(p=>({...p}))});
 }
 emergeReinforcements(){
 if(!this.pendingSpawns.length)return;
 const job=this.pendingSpawns[0];if(this.time<job.at||this.enemies.length>=5)return;
 // Leave the mouth free: no overlapping enemies and no emergence into the player.
 if(Math.hypot(this.player.x-job.site.x,this.player.z-job.site.z)<3||this.enemies.some(e=>Math.hypot(e.x-job.site.x,e.z-job.site.z)<1.9))return;
 const e=this.makeEnemy(job.form,job.site);e.homeHeight=job.site.y||0;e.elevation=e.homeHeight;e.speed*=.7;e.awareness='search';e.alertedUntil=this.time+12;
 if(job.guardian){e.guardian=true;e.elite=true;e.hp=360;}
 this.enemies.push(e);this.pendingSpawns.shift();this.event('spawn',{id:e.id,x:e.x,y:e.elevation+e.aimHeight,z:e.z});
 this.portalCloseAt=this.time+2;
 }
 event(type,data={}){super.event(type,data);if(type==='impact'&&this.stage==='reactor'&&!data.hostile&&!data.enemy){const i=BREACH.stabilizers.findIndex(p=>Math.abs(p.x-data.x)<.9&&Math.abs(p.z-1.4-data.z)<.75&&data.y>=0&&data.y<2.9);if(i>=0){this.stabilizerHits||=[0,0,0];if(!this.stabilizers[i]&&++this.stabilizerHits[i]>=4)this.disableStabilizer(i);}}}
 disableStabilizer(i){if(this.stabilizers[i])return;this.stabilizers[i]=true;const left=this.stabilizers.filter(v=>!v).length;this.event('campaign',{title:`STABILISATEUR NEUTRALISÉ · ${3-left}/3`,subtitle:left?`Blindage du gardien affaibli · ${left} stabilisateur(s) restant(s)`:'Blindage désactivé. Le gardien reçoit tous les dégâts.'});}
 damageEnemy(e,amount,...args){if(!this.enemies.includes(e))return;const active=this.stabilizers.filter(v=>!v).length;const reduction=e.guardian?.55*active/3:0;
 if(reduction>0&&this.time>=(this.shieldNoticeAt||0)){this.shieldNoticeAt=this.time+4;this.event('campaign',{title:'GARDIEN · BLINDAGE ACTIF',subtitle:`Dégâts réduits de ${Math.round(reduction*100)} % · Détruire les stabilisateurs lumineux (${3-active}/3).`});}
 return super.damageEnemy(e,amount*(1-reduction),...args);}

 step(dt,input={}){if(this.state!=='playing')return;this.nextWave=Infinity;this.spawnTimer=Infinity;ArenaGame.prototype.step.call(this,clamp(dt,0,.05),input);this.nextWave=-1;if(this.state!=='playing')return;const p=this.player;this.emergeReinforcements();if(!this.pendingSpawns.length&&this.stage!=='extraction'&&this.time>this.portalCloseAt)this.activePortals=[];
 if(this.stage==='arrival'&&p.z<62){this.setStage('hangar');this.deploy(['synth','seer'],[{x:-8,z:49},{x:10,z:43}]);}
 else if(this.stage==='hangar'&&!this.enemies.length&&!this.pendingSpawns.length){this.checkpoint='passages';this.offerWeapon(1);this.setStage('passages');this.deploy(['synth','seer','stalker'],[{x:-13,z:16},{x:5,z:21}]);}
 else if(this.stage==='passages'&&p.z<0&&!this.enemies.length&&!this.pendingSpawns.length){this.setStage('courtyard');this.encounter=1;this.deploy(['synth','seer','brute','stalker','synth','seer','synth'],[{x:-18,z:-17},{x:18,z:-17},{x:0,z:-23}]);}
 else if(this.stage==='reactor'&&this.stabilizers.every(Boolean)&&!this.enemies.length&&!this.pendingSpawns.length){this.setStage('extraction');this.extractionStarted=this.time;this.activePortals=[{id:777,...BREACH.exit,yaw:0,openedAt:this.time}];}
 for(const [i,s] of [{x:-23,z:30},{x:23,z:-64}].entries())if(!this.secretFound[i]&&Math.hypot(p.x-s.x,p.z-s.z)<2.4){this.secretFound[i]=true;this.player.hp=100;this.score+=500;this.offerWeapon(i+2);this.event('campaign',{title:'CACHE DÉCOUVERTE',subtitle:'Énergie restaurée · Arme disponible'});}
 }
 objectiveTarget(){const o=this.campaign.objective;if(o)return {...o.position,id:o.id,label:o.label,kind:'objective'};const gate=this.pendingSpawns[0]?.site;if(gate)return {...gate,id:`gate-${gate.id}`,label:'RENFORTS PAR LE PORTAIL',kind:'portal'};const enemy=this.enemies[0];if(enemy)return {x:enemy.x,z:enemy.z,y:enemy.homeHeight||0,id:`enemy-${enemy.id}`,label:'NEUTRALISER LES HOSTILES',kind:'enemy'};return {x:0,y:0,z:this.stage==='arrival'?59:-3,id:'route',label:'SUIVRE LA LIGNE BLEUE',kind:'route'};}
 guidance(){const t=this.objectiveTarget();return t?{...t,distance:Math.hypot(t.x-this.player.x,t.z-this.player.z),target:t,stage:this.stage}:null;}
}
