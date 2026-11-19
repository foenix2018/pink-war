/**
 * Standalone GHJU silhouette preview. Edits an isolated copy of each
 * skin/armour mesh in bind space. Never touches the original skeleton,
 * animations, faceplate, gloves or LYLU.
 */
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
const bell=(x,c,r)=>{const t=clamp(1-Math.abs(x-c)/r);return t*t*(3-2*t);};
export const FIT_PROFILE=Object.freeze({
  shoulderWidthChange:-.08,waistWidthChange:-.16,
  hipWidthChange:.12,thighWidthChange:.065,frontChestDepth:.024
});
export function ghjuFemininePoint(x,y,z,intensity=1){
  const k=clamp(intensity);
  if(!k||y<.30||y>1.69)return [x,y,z];
  const shoulder=bell(y,1.52,.24),waist=bell(y,1.165,.21),
    hip=bell(y,.965,.21),thigh=bell(y,.695,.285),
    bust=bell(y,1.44,.175)*bell(Math.abs(x),.105,.12);
  const sx=1+k*(-.08*shoulder-.16*waist+.12*hip+.065*thigh);
  const sz=1+k*(-.065*waist+.045*hip);
  return [x*sx,y,z*sz-(z<-.028?k*.024*bust:0)];
}
export function createGhjuSilhouetteFit(model){
  if(!model||model.root?.name!=='GHJU'||!model.actor||!model.shadowUnit)
    throw Error('Preview GHJU uniquement, avec squelette Shadow Unit existant.');
  const copies=new Map();let intensity=0;
  const active=()=>[...(model.armor?.parts||[]),
    ...(model.shadowUnit?.armour?.batches||[])]
    .filter(m=>m?.isSkinnedMesh&&m.visible!==false&&m.geometry?.getAttribute('position'));
  function refresh(){
    const used=new Set(active());
    for(const [mesh,data] of copies)if(!used.has(mesh)){
      if(mesh.geometry===data.geometry)mesh.geometry=data.source;
      data.geometry.dispose();copies.delete(mesh);
    }
    for(const mesh of used){
      if(!copies.has(mesh))copies.set(mesh,{source:mesh.geometry,geometry:mesh.geometry.clone(),
        coords:mesh.geometry.getAttribute('position').array.slice()});
      const data=copies.get(mesh);
      if(!intensity){mesh.geometry=data.source;continue;}
      const a=data.coords,p=data.geometry.getAttribute('position');
      for(let i=0;i<a.length;i+=3){
        const [x,y,z]=ghjuFemininePoint(a[i],a[i+1],a[i+2],intensity);
        p.setXYZ(i,x,y,z);
      }
      p.needsUpdate=true;data.geometry.computeVertexNormals();
      data.geometry.computeBoundingBox();data.geometry.computeBoundingSphere();
      mesh.geometry=data.geometry;
    }
    return copies.size;
  }
  return {
    refresh,
    setStrength(value){intensity=clamp(value);return refresh();},
    get intensity(){return intensity;},
    get editedMeshes(){return copies.size;},
    dispose(){intensity=0;for(const [mesh,data] of copies){
      if(mesh.geometry===data.geometry)mesh.geometry=data.source;
      data.geometry.dispose();
    }copies.clear();}
  };
}
