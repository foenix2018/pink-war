// M01 service caches: the interaction icon is a physical field-medical kit or
// high-voltage energy cartridge, never an anonymous glowing octahedron.
// Shared geos for mobile performance; collision/pickup authority unchanged.
export function createM01SupplyCache(T,{heal=false,M,accent=0xff6fb4}={}){
 const root=new T.Group();root.name='M01 / '+(heal?'trousse de secours':'cellule énergie')+' identifiable';
 const metal=M.paintedMetal||M.steel,steel=M.steel||metal,dark=M.dark||M.black;
 const sign=new T.MeshBasicMaterial({color:heal?accent:0x78e9ff,toneMapped:false});
 const shell=(m,s,p,round=.008)=>{
  const g=new T.BoxGeometry(...s),mesh=new T.Mesh(g,m);mesh.position.set(...p);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
 };
 // Physically lifted hard case with recessed locks, hinge and carrying handle.
 shell(dark,[.61,.07,.41],[0,.07,0]);
 shell(metal,[.58,.20,.39],[0,.205,0]);
 shell(dark,[.56,.043,.40],[0,.31,0]);
 for(const side of [-1,1]){
  shell(steel,[.085,.035,.052],[side*.17,.316,.19]);
  shell(dark,[.038,.056,.030],[side*.17,.27,.214]);
 }
 shell(steel,[.18,.025,.035],[0,.35,.02]);
 for(const side of [-1,1])shell(steel,[.028,.055,.035],[side*.08,.37,.02]);
 // Readable treatment/charge capsule on a suspended tray.
 const token=new T.Group();token.name=heal?'M01 / emblème secours':'M01 / cellule énergétique';
 token.position.y=.75;root.add(token);
 const hullMat=new T.MeshStandardMaterial({color:heal?0xe9e7e2:0x29465d,roughness:.45,metalness:heal?.32:.76});
 const tokenBox=(m,s,p)=>{const v=new T.Mesh(new T.BoxGeometry(...s),m);v.position.set(...p);v.castShadow=false;token.add(v);return v;};
 if(heal){
  tokenBox(hullMat,[.25,.28,.09],[0,0,0]);
  tokenBox(sign,[.16,.042,.008],[0,0,.051]);
  tokenBox(sign,[.042,.16,.008],[0,0,.052]);
  tokenBox(steel,[.20,.03,.025],[0,.155,0]);
 }else{
  const cell=new T.Mesh(new T.CylinderGeometry(.095,.095,.30,10),hullMat);token.add(cell);
  for(const sy of [-1,1]){
   const cap=new T.Mesh(new T.CylinderGeometry(.102,.102,.036,12),steel);cap.position.y=sy*.145;token.add(cap);
  }
  for(const side of [-1,1])tokenBox(sign,[.014,.17,.033],[side*.068,0,.061]);
  tokenBox(steel,[.14,.055,.014],[0,0,.094]);
 }
 // Identifying case badge. The object is also readable without animated glow.
 const front=sign.clone(),label=new T.Mesh(new T.PlaneGeometry(.16,.09),front);
 label.position.set(0,.19,.199);root.add(label);
 return {root,token};
}
