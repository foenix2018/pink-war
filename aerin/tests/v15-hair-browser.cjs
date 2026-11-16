// Aerin V15 — cheveux : longueur aux épaules, mouvement réel en course / saut / roulade, retour au calme,
// masqués en 1re personne, aucune erreur JS.  npm run dev puis BASE_URL=http://localhost:8082/ node tests/v15-hair-browser.cjs
const assert=require('node:assert/strict');const fs=require('node:fs');const {chromium}=require('playwright');
const BASE=process.env.BASE_URL||'http://localhost:8082/';
(async()=>{const exe=process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
 const b=await chromium.launch({executablePath:exe,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});const p=await b.newPage({viewport:{width:560,height:360}});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'||/V1\d :/.test(m.text()))errors.push(m.text());});
 const G=f=>p.evaluate(f);const until=(f,t=300000)=>p.waitForFunction(f,null,{timeout:t,polling:30});const R={};
 await p.goto(BASE+(process.env.PAGE||'index.html'));await until(()=>window.aerinGame&&aerinGame.state.ready);await p.waitForTimeout(500);
 if(!(await G(()=>aerinGame.state.started)))await p.click('#start-button');if(await G(()=>aerinGame.state.paused))await p.click('#resume-button');
 // Mesures dans le repère de la tête : pointes des mèches arrière (déplacement relatif = vrai mouvement des cheveux).
 await G(()=>{const g=aerinGame,h=g.hair,head=g.knight.bones.Head;window.__tip=()=>{const a=h.mesh.geometry.attributes.position.array,n=a.length/3;const inv=head.matrixWorld.clone().invert();let s=new THREE.Vector3();const k=[6,8].map(l=>(l*7+6)*2);for(const i of k)s.add(new THREE.Vector3(a[i*3],a[i*3+1],a[i*3+2]).applyMatrix4(inv));return s.multiplyScalar(.5);};
  window.__hr={max:0};(function f(){if(window.__base){const d=window.__tip().distanceTo(window.__base);window.__hr.max=Math.max(window.__hr.max,d);}requestAnimationFrame(f);})();});
 R.meches=await G(()=>aerinGame.hair.locks);assert.ok(R.meches>=30,'mèches');
 await G(()=>{aerinGame.player.position.set(0,0,6);});await p.waitForTimeout(3000);
 R.longueur=await G(()=>{const g=aerinGame,a=g.hair.mesh.geometry.attributes.position.array;let minY=9;for(let i=1;i<a.length;i+=3)minY=Math.min(minY,a[i]);const head=g.knight.bones.Head.getWorldPosition(new THREE.Vector3());const sh=g.knight.bones.LeftArm.getWorldPosition(new THREE.Vector3());return {pointe:+minY.toFixed(2),tete:+head.y.toFixed(2),epaule:+sh.y.toFixed(2)};});
 assert.ok(R.longueur.pointe<R.longueur.epaule+.06,'mi-longs : jusqu’aux épaules');
 await G(()=>{window.__base=window.__tip();window.__hr.max=0;});
 await p.keyboard.down('ShiftLeft');await p.keyboard.down('KeyW');await until(()=>aerinGame.state.motionSpeed>3.5);
 await p.keyboard.press('KeyJ');await until(()=>aerinGame.state.airborne);await until(()=>!aerinGame.state.airborne);
 await G(()=>{aerinGame.state.stamina=100;aerinGame.state.rollCooldown=0;});await p.keyboard.press('KeyR');await until(()=>aerinGame.state.action==='roll');await until(()=>aerinGame.state.action!=='roll');
 await p.keyboard.up('KeyW');await p.keyboard.up('ShiftLeft');
 R.mouvement=await G(()=>+window.__hr.max.toFixed(3));assert.ok(R.mouvement>.04,'les mèches bougent avec le corps');
 await until(()=>!aerinGame.state.action&&aerinGame.state.motionSpeed===0);await p.waitForTimeout(4000);
 R.calme=await G(()=>+window.__tip().distanceTo(window.__base).toFixed(3));assert.ok(R.calme<R.mouvement,'retour au calme');
 await p.keyboard.press('KeyV');R.premiere=await G(()=>aerinGame.hair.visible);assert.equal(R.premiere,false);await p.keyboard.press('KeyV');
 assert.deepEqual(errors,[]);console.log(JSON.stringify(R,null,1));console.log('OK AERIN V15 : cheveux mi-longs, mouvement en course/saut/roulade, retour au calme, 1re personne');await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
