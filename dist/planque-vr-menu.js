// Menu 3D de la planque en VR : les boîtes de dialogue HTML ne sont pas visibles dans un casque.
// Le modèle de menu et la détection des boutons sont purs (testés sans WebGL) ; le panneau les dessine
// sur une toile et se pointe au laser de la manette droite, gâchette = valider.
export const MENU={width:1024,height:768,perPage:6,top:236,step:70,rowHeight:58,left:92,right:932,footerTop:672,footerHeight:62};
const FOOTER=Object.freeze({prev:[60,250],close:[290,734],next:[774,964]});

export const pageCount=(model,perPage=MENU.perPage)=>Math.max(1,Math.ceil((model?.buttons?.length||0)/perPage));
export function visibleButtons(model,page=0,perPage=MENU.perPage){
  const pages=pageCount(model,perPage),p=Math.max(0,Math.min(pages-1,page|0));
  return model.buttons.slice(p*perPage,p*perPage+perPage).map((button,i)=>({button,index:p*perPage+i,slot:i}));
}
export const buttonRect=slot=>({x0:MENU.left,x1:MENU.right,y0:MENU.top+slot*MENU.step,y1:MENU.top+slot*MENU.step+MENU.rowHeight});

// Cible touchée par un point de la toile (px) : bouton, ◀, ▶ ou fermeture. Un bouton désactivé reste ciblable (survol) mais ne valide pas.
export function pickMenuTarget(model,page,x,y){
  if(!model)return null;
  const pages=pageCount(model);
  if(y>=MENU.footerTop&&y<=MENU.footerTop+MENU.footerHeight){
    if(x>=FOOTER.close[0]&&x<=FOOTER.close[1])return{kind:'close'};
    if(pages>1&&x>=FOOTER.prev[0]&&x<=FOOTER.prev[1])return{kind:'prev'};
    if(pages>1&&x>=FOOTER.next[0]&&x<=FOOTER.next[1])return{kind:'next'};
    return null;
  }
  for(const {button,index,slot} of visibleButtons(model,page)){
    const r=buttonRect(slot);
    if(x>=r.x0&&x<=r.x1&&y>=r.y0&&y<=r.y1)return{kind:'button',index,button};
  }
  return null;
}
// Applique une sélection ; renvoie ce qui s'est passé (le panneau le répercute sur la page affichée).
export function activateMenuTarget(model,page,target){
  if(!target)return{page,closed:false,fired:false};
  const pages=pageCount(model);
  if(target.kind==='close')return{page,closed:true,fired:false};
  if(target.kind==='prev')return{page:Math.max(0,page-1),closed:false,fired:false};
  if(target.kind==='next')return{page:Math.min(pages-1,page+1),closed:false,fired:false};
  const button=target.button;if(!button||button.disabled)return{page,closed:false,fired:false,refused:true};
  button.onSelect?.();return{page,closed:false,fired:true};
}

function wrap(c,text,maxWidth){
  const lines=[];let line='';
  for(const word of String(text).split(/\s+/)){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);return lines;
}
export function paintMenu(c,model,{page=0,hover=null,accent='#ef91b4'}={}){
  c.clearRect(0,0,MENU.width,MENU.height);
  c.fillStyle='#101c2af2';c.beginPath();c.roundRect(2,2,MENU.width-4,MENU.height-4,46);c.fill();c.strokeStyle='#71899c';c.lineWidth=2;c.stroke();
  c.textAlign='center';c.fillStyle=accent;c.font='600 21px sans-serif';c.fillText((model.kicker||'LA PLANQUE').toUpperCase(),512,58);
  c.fillStyle='#f2f2ed';c.font='600 46px sans-serif';c.fillText(model.title,512,116);
  c.fillStyle='#c4d0d8';c.font='24px sans-serif';let y=156;
  for(const paragraph of (model.body||[]).slice(0,2)){for(const line of wrap(c,paragraph,820).slice(0,2)){c.fillText(line,512,y);y+=30;}}
  for(const {button,index,slot} of visibleButtons(model,page)){
    const r=buttonRect(slot),on=hover?.kind==='button'&&hover.index===index;
    c.fillStyle=button.disabled?'#1a2531':on?accent:button.active?'#2f4d63':'#243343';c.beginPath();c.roundRect(r.x0,r.y0,r.x1-r.x0,r.y1-r.y0,28);c.fill();
    if(button.active){c.strokeStyle=accent;c.lineWidth=3;c.stroke();}
    c.textAlign='left';c.fillStyle=button.disabled?'#6b7a86':on?'#101c2a':'#f1f2ee';c.font='600 27px sans-serif';c.fillText(button.label,r.x0+30,r.y0+(button.sub?27:38),r.x1-r.x0-60);
    if(button.sub){c.font='20px sans-serif';c.fillStyle=button.disabled?'#5d6c78':on?'#27394a':'#a9bac5';c.fillText(button.sub,r.x0+30,r.y0+48,r.x1-r.x0-60);}
  }
  const pages=pageCount(model);
  for(const [kind,label,[x0,x1]] of [['prev','◀',FOOTER.prev],['close','FERMER',FOOTER.close],['next','▶',FOOTER.next]]){
    if(kind!=='close'&&pages<2)continue;const on=hover?.kind===kind;
    c.fillStyle=on?accent:'#243343';c.beginPath();c.roundRect(x0,MENU.footerTop,x1-x0,MENU.footerHeight,30);c.fill();
    c.textAlign='center';c.fillStyle=on?'#101c2a':'#f1f2ee';c.font='600 26px sans-serif';c.fillText(label,(x0+x1)/2,MENU.footerTop+41);
  }
  if(pages>1){c.fillStyle='#8fa1ad';c.font='20px sans-serif';c.textAlign='center';c.fillText('Page '+(page+1)+' / '+pages,512,MENU.footerTop-8);}
}

// Panneau ancré dans la pièce (il ne suit pas la tête : plus confortable) à l'endroit où il s'ouvre.
export function createXRMenuPanel(T,scene,{accent='#ef91b4',distance=1.35,onClose=()=>{}}={}){
  const canvas=document.createElement('canvas');canvas.width=MENU.width;canvas.height=MENU.height;const c=canvas.getContext('2d');
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const mesh=new T.Mesh(new T.PlaneGeometry(1.0,.75),new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}));
  mesh.name='Planque / menu VR';mesh.renderOrder=200;mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
  const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);
  const beam=new T.Line(geometry,new T.LineBasicMaterial({color:accent,depthTest:false,transparent:true,opacity:.85}));beam.renderOrder=201;beam.frustumCulled=false;beam.visible=false;scene.add(beam);
  const caster=new T.Raycaster(),origin=new T.Vector3(),direction=new T.Vector3(),q=new T.Quaternion(),forward=new T.Vector3();
  let model=null,page=0,hover=null,placed=false,pressed=true;
  const repaint=()=>{if(!model)return;paintMenu(c,model,{page,hover,accent});texture.needsUpdate=true;};
  const same=(a,b)=>a===b||(a&&b&&a.kind===b.kind&&a.index===b.index);
  const api={mesh,get open(){return !!model;},get model(){return model;},get page(){return page;},get hover(){return hover;},
    show(next,{keepPage=false}={}){model=next;if(!keepPage)page=0;page=Math.min(page,pageCount(model)-1);hover=null;mesh.visible=true;if(!keepPage){placed=false;pressed=true;}repaint();},
    refresh(next){if(next)model=next;page=Math.min(page,pageCount(model)-1);repaint();},
    hide(){model=null;mesh.visible=false;beam.visible=false;hover=null;},
    // ray : objet de la manette droite ; renvoie true tant que le menu consomme l'entrée.
    update({camera,ray,trigger=false}){
      if(!model){beam.visible=false;return false;}
      if(!placed){camera.getWorldPosition(mesh.position);camera.getWorldDirection(forward);forward.y=0;if(forward.lengthSq()<1e-4)forward.set(0,0,-1);forward.normalize();
        mesh.position.addScaledVector(forward,distance);mesh.position.y=Math.max(1.05,mesh.position.y-.05);mesh.lookAt(mesh.position.x-forward.x,mesh.position.y,mesh.position.z-forward.z);placed=true;pressed=!!trigger;}
      mesh.updateMatrixWorld(true);
      let hit=null;
      if(ray){ray.updateWorldMatrix(true,false);ray.getWorldPosition(origin);ray.getWorldQuaternion(q);direction.set(0,0,-1).applyQuaternion(q);caster.set(origin,direction);caster.near=.02;caster.far=6;hit=caster.intersectObject(mesh)[0]||null;}
      let target=null;
      if(hit){target=pickMenuTarget(model,page,hit.uv.x*MENU.width,(1-hit.uv.y)*MENU.height);const a=geometry.attributes.position;a.setXYZ(0,origin.x,origin.y,origin.z);a.setXYZ(1,hit.point.x,hit.point.y,hit.point.z);a.needsUpdate=true;}
      beam.visible=!!hit;
      if(!same(target,hover)){hover=target;repaint();}
      const click=trigger&&!pressed;pressed=!!trigger;
      if(click&&target){const result=activateMenuTarget(model,page,target);if(result.closed){api.hide();onClose();return true;}if(result.page!==page){page=result.page;repaint();}else if(model)repaint();}
      return true;
    },
    dispose(){mesh.removeFromParent();beam.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();texture.dispose();geometry.dispose();beam.material.dispose();}
  };
  return api;
}
