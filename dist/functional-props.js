// Pink Wars — reusable recognizable world props for M02/M03/M04/Ligne 9/Couronne.
// Geometry is built once, merged by physically existing scene material, and never
// changes authored collision envelopes, objective coordinates or interaction IDs.
// Three.js MeshStandardMaterial supports WebGPURenderer and WebGL fallback.
import {Assembly,bevelBox,matrix,limb} from './geo.js';
export const FUNCTIONAL_PROP_REV='world-functional-props-2026-11-v1';
export const FUNCTIONAL_KINDS=Object.freeze([
 'forklift','railcar','cot','stretcher','bed','bench','desk','workbench','counter',
 'cabinet','rack','servers','batteries','generator','ticket-machine','vending',
 'scanner','terminal','security-desk','console','kiosk','booth','pump','winch','chair'
]);
export function createFunctionalProp(T,kind,{w=2,d=1,h=2,low=false,M={}}={}){
 if(!FUNCTIONAL_KINDS.includes(kind))return null;
 const root=new T.Group();root.name='PW / '+kind+' · géométrie fonctionnelle';
 root.userData.visualRevision=FUNCTIONAL_PROP_REV;
 const a=new Assembly(),W=Math.max(.35,w),D=Math.max(.3,d),H=Math.max(.5,h);
 const material=(...names)=>names.map(n=>M[n]).find(v=>v&&v.isMaterial)||
   Object.values(M).find(v=>v&&v.isMaterial)||
   new T.MeshStandardMaterial({color:0x63707b,metalness:.55,roughness:.65});
 const steel=material('steel','galva','metal','stainless','plate','trim','white');
 const body=material('paintedMetal','white','panel','plate','helixWhite','paint','rust','metal');
 const shadow=material('dark','black','rubber','helixBlack','trim');
 const rubber=material('rubber','black','dark');
 const glass=material('glass','ice','screenOff','screen','helixBlack');
 const led=material('cyan','ledCyan','ledBlue','helix','blue','yellow','amber','neonAmber');
 const warm=material('yellow','amber','ledYellow','rust','wood');
 const textile=material('fabric','sheet','blanket','canvasBlue','tarp','white');
 const light=material('white','ceramic','helixWhite','paper','metal');
 function box(m,s,p,r=[0,0,0],v=.01){
   if(s.some(x=>x<=0))return;
   const g=v?bevelBox(...s,Math.min(v,...s.map(x=>x*.18)),low?1:2):new T.BoxGeometry(...s);
   a.add(g,m,matrix(p,r),!low);g.dispose();
 }
 function cyl(m,p,r,height,rot=[0,0,0],segments=low?9:16){
   const g=new T.CylinderGeometry(r,r,height,segments);a.add(g,m,matrix(p,rot),!low);g.dispose();
 }
 function tor(m,p,r,t,rot=[0,0,0],segments=low?12:20){
   const g=new T.TorusGeometry(r,t,4,segments);a.add(g,m,matrix(p,rot),!low);g.dispose();
 }
 function rod(m,u,v,r=.025){
   const g=limb(u,v,r,r,low?6:10);a.add(g,m,null,!low);g.dispose();
 }
 const sides=[-1,1],face=D/2-.025,foot=(px,pz)=>box(steel,[.075,H-.18,.075],[px,H*.5,pz]);
 function table(){
   const y=Math.min(H,.93);
   box(shadow,[W,.09,D],[0,y-.04,0],[],.015);
   box(steel,[W-.045,.04,D-.045],[0,y+.02,0],[],.012);
   for(const x of [-W*.45,W*.45])for(const z of [-D*.43,D*.43]){
     box(steel,[.068,y-.13,.068],[x,(y-.13)*.5,z],[],.005);
   }
   for(const z of [-D*.41,D*.41])box(shadow,[W-.16,.046,.035],[0,y*.37,z]);
   if(kind==='workbench'||kind==='counter'){
     box(body,[W*.40,.31,D*.42],[-W*.22,y*.60,-D*.20],[],.012);
     for(let i=0;i<3;i++){
       box(steel,[W*.34,.075,.025],[-W*.22,y*.40+i*.13,-D*.20+D*.21],[],.005);
       box(shadow,[W*.13,.018,.029],[-W*.22,y*.41+i*.13,-D*.20+D*.23]);
     }
     box(shadow,[W*.42,.045,D*.35],[W*.24,y*.54,-D*.19]);
     if(kind==='workbench'){
       box(steel,[W*.14,.22,.18],[W*.22,y+.17,0]);
       cyl(shadow,[W*.22,y+.3,0],.055,.10,[0,0,Math.PI/2]);
     }
   }
 }
 function bench(){
  const y=Math.min(.55,H*.74);
  box(steel,[W,.075,D],[0,y,0],[],.014);
  box(body,[W-.07,.043,D-.07],[0,y+.055,0],[],.013);
  for(const x of [-W*.44,W*.44])for(const z of [-D*.39,D*.39])
    box(shadow,[.07,y-.08,.06],[x,(y-.08)*.5,z],[],.005);
  for(const x of [-W*.44,W*.44])rod(steel,[x,y-.04,-D*.37],[x,y+.45,-D*.37],.025);
  box(steel,[W-.11,.20,.052],[0,y+.35,-D*.37],[-.15,0,0],.009);
 }
 function bed(){
   const y=Math.min(.55,H*.48);
   for(const x of [-W*.43,W*.43])rod(steel,[x,y,-D*.46],[x,y,D*.46],.027);
   for(const z of [-D*.44,D*.44]){
     rod(steel,[-W*.44,y,z],[W*.44,y,z],.023);
     for(const x of [-W*.44,W*.44]){
       rod(steel,[x,.08,z],[x,y,z],.028);
       cyl(rubber,[x,.085,z],.065,.05,[0,0,Math.PI/2]);
     }
   }
   box(shadow,[W-.08,.095,D-.07],[0,y+.016,0],[],.017);
   box(textile,[W-.12,.085,D-.11],[0,y+.103,0],[],.038);
   box(light,[W*.54,.09,D*.22],[0,y+.185,D*.32],[],.034);
   box(textile,[W-.15,.045,D*.46],[0,y+.15,-D*.20],[],.014);
   for(const z of [-D*.39,D*.26])rod(steel,[-W*.46,y+.22,z],[-W*.46,y+.23,z+.045],.024);
   rod(steel,[-W*.46,y+.25,-D*.39],[-W*.46,y+.25,D*.30],.020);
   if(kind==='bed')for(const x of sides){
     rod(steel,[x*W*.43,y,-D*.42],[x*W*.43,y+.30,-D*.42],.018);
     rod(steel,[x*W*.43,y,-D*.25],[x*W*.43,y+.30,-D*.25],.018);
   }
 }
 function storage(){
   const doorType=kind==='cabinet'||kind==='rack'||kind==='servers'||kind==='batteries';
   const columns=Math.max(2,Math.min(5,Math.round(W/.64)));
   box(steel,[W,.09,D],[0,H-.046,0],[],.014);
   box(shadow,[W,.075,D],[0,.045,0],[],.008);
   for(const x of [-W*.47,W*.47])box(steel,[.065,H-.10,D-.05],[x,H*.5,0],[],.008);
   box(shadow,[W-.11,H-.20,.036],[0,H*.5,-D*.46],[],.008);
   for(let i=1;i<columns;i++)box(steel,[.025,H-.14,D-.1],[-W/2+i*W/columns,H*.51,0],[],.003);
   for(let k=0;k<columns;k++){
     const x=-W/2+(k+.5)*W/columns;
     const fw=W/columns-.055;
     if(kind==='servers'||kind==='rack'){
       for(let r=0;r<(low?5:9);r++){
         const y=.23+r*(H-.36)/(low?5:9);
         box(body,[fw,.09,D*.20],[x,y,face-.08],[],.008);
         box(shadow,[fw*.75,.03,.020],[x,y,face+.013]);
         box(led,[.035,.018,.02],[x-fw*.37,y,face+.027]);
       }
     }else if(kind==='batteries'){
       for(let row=0;row<3;row++){
         const y=.39+row*(H-.65)/3;
         box(shadow,[fw*.85,.18,D*.36],[x,y,-D*.04],[],.018);
         cyl(steel,[x,y,face+.015],.040,.035,[Math.PI/2,0,0]);
         box(warm,[fw*.50,.026,.02],[x,y+.09,face+.014]);
       }
     }else{
       box(body,[fw,H-.21,.030],[x,H*.50,face],[],.010);
       box(shadow,[fw*.62,.034,.015],[x,H*.74,face+.025]);
       for(let j=0;j<(low?2:4);j++)box(shadow,[fw*.48,.011,.014],[x,H*.70-j*.043,face+.033],[],0);
       box(steel,[.027,.17,.036],[x+fw*.31,H*.50,face+.036]);
     }
   }
 }
 function cabinetMachine(){
   const machine=kind==='terminal'||kind==='ticket-machine'||kind==='vending'||kind==='console'||kind==='security-desk'||kind==='kiosk'||kind==='booth';
   const tall=kind==='ticket-machine'||kind==='vending'||kind==='terminal';
   if(kind==='security-desk'||kind==='console'){
     table();
     box(shadow,[W*.68,.09,D*.60],[0,H*.91,-D*.12]);
     box(glass,[W*.50,.055,D*.48],[0,H*.94,-D*.12],[-.28,0,0]);
     for(const x of [-W*.3,W*.3])box(steel,[.08,.30,.08],[x,H*.72,-D*.28]);
     return;
   }
   // A shallow kiosk is an open booth, while a vending machine is enclosed.
   if(kind==='booth'||kind==='kiosk'){
     for(const x of [-W*.46,W*.46])for(const z of [-D*.43,D*.43])box(steel,[.08,H,.08],[x,H/2,z]);
     box(steel,[W,.11,D],[0,H-.055,0],[],.015);
     box(body,[W,.42,D*.36],[0,.27,-D*.28],[],.01);
     box(shadow,[W*.60,.075,D*.38],[0,.77,-D*.26],[],.009);
     if(kind==='kiosk'){
       box(steel,[W*.7,.05,.05],[0,H*.65,face]);
       box(led,[W*.38,.12,.022],[0,H*.82,face+.024]);
     }
     return;
   }
   const y=H/2;
   box(body,[W,H,D],[0,y,0],[],.035);
   box(shadow,[W-.16,H-.19,.055],[0,y,face+.017],[],.012);
   if(tall){
     const screenY=kind==='vending'?H*.65:H*.70;
     box(steel,[W*.72,H*.36,.060],[0,screenY,face+.061],[],.012);
     box(glass,[W*.65,H*.29,.022],[0,screenY,face+.102],[],.007);
     if(kind==='vending'){
       for(let row=0;row<3;row++)for(let col=0;col<3;col++){
         const x=(col-1)*W*.18,z=face+.118,yy=screenY+(row-1)*H*.088;
         cyl(warm,[x,yy,z],.050,.020,[Math.PI/2,0,0],8);
       }
     }
     box(shadow,[W*.52,.08,.03],[0,H*.30,face+.075]);
     box(steel,[W*.34,.025,.035],[0,H*.30,face+.099],[],.002);
     for(let j=0;j<4;j++)box(led,[.018,.018,.015],[W*.32,H*.53-j*.058,face+.09],[],0);
   }
 }
 function scanner(){
   // Structurally open portal; collisions are still controlled by stage layout.
   for(const x of [-W*.44,W*.44]){
     box(body,[W*.10,H*.94,D*.67],[x,H*.47,0],[],.035);
     box(shadow,[W*.065,H*.57,D*.30],[x,H*.50,face-.16],[],.009);
     for(const y of [.66,H*.65,H*.78])box(led,[.020,.055,D*.24],[x-Math.sign(x)*W*.057,y,0],[],.003);
   }
   box(body,[W*.97,.18,D*.68],[0,H-.09,0],[],.015);
   box(shadow,[W*.60,.11,D*.42],[0,H-.18,0],[],.007);
   box(led,[W*.50,.022,D*.19],[0,H-.184,0],[],.003);
 }
 function generator(){
   box(shadow,[W,.15,D],[0,.14,0],[],.014);
   box(body,[W*.95,H*.66,D*.89],[0,H*.48,0],[],.045);
   box(shadow,[W*.73,H*.40,.045],[0,H*.46,face],[],.018);
   for(let row=0;row<(low?6:12);row++)box(steel,[W*.65,.022,.035],[0,H*.29+row*H*.025,face+.041],[],.002);
   for(const x of [-W*.32,W*.32]){
     cyl(shadow,[x,H*.82,0],D*.18,.06);
     tor(steel,[x,H*.85,0],D*.165,.016,[Math.PI/2,0,0]);
   }
   box(steel,[W*.32,H*.13,.027],[W*.27,H*.72,face+.055],[],.007);
   for(const x of [-W*.30,-W*.17,-W*.04])cyl(led,[x,H*.72,face+.073],.022,.024,[Math.PI/2,0,0],8);
   cyl(steel,[-W*.36,H*.93,-D*.20],.08,H*.25);
 }
 function locomotive(){
   const wheelRadius=Math.min(.36,D*.18);
   box(shadow,[W,.30,D*.91],[0,.52,0]);
   box(body,[W-.18,H*.62,D*.94],[0,H*.45,0],[],.055);
   box(steel,[W-.15,.11,D*.98],[0,H*.78,0],[],.025);
   for(const x of [-W*.45,W*.45]){
     box(shadow,[.07,H*.45,.036],[x,H*.45,face+.008],[],.004);
   }
   for(let i=0;i<Math.max(3,Math.round(W/1.7));i++){
     const x=-W*.39+i*(W*.78)/Math.max(2,Math.round(W/1.7)-1);
     box(glass,[W*.075,H*.21,.030],[x,H*.56,face+.040],[],.012);
     box(glass,[W*.075,H*.21,.030],[x,H*.56,-face-.04],[],.012);
   }
   for(const x of [-W*.33,W*.33])for(const z of [-D*.45,D*.45]){
     cyl(rubber,[x,wheelRadius,z],wheelRadius,.13,[Math.PI/2,0,0]);
     cyl(steel,[x,wheelRadius,z+Math.sign(z)*.08],wheelRadius*.55,.025,[Math.PI/2,0,0]);
   }
   for(const z of [-D*.45,D*.45])box(steel,[W*.9,.10,.10],[0,.76,z],[],.007);
   for(const x of [-W*.39,W*.39])box(led,[.12,.10,.028],[x,H*.52,face+.052]);
 }
 function forklift(){
   const fr=Math.min(.37,D*.27),y=.6;
   box(shadow,[W*.93,.26,D*.74],[0,.53,0],[],.08);
   box(warm,[W*.59,.50,D*.61],[-W*.13,.96,0],[],.085);
   box(shadow,[W*.38,.22,D*.41],[-W*.25,1.22,-D*.04],[],.052);
   box(shadow,[W*.21,.12,D*.22],[-W*.20,1.49,-D*.07],[],.015);
   rod(steel,[-W*.18,1.38,0],[-W*.06,1.83,-D*.13],.032);
   cyl(shadow,[-W*.06,1.86,-D*.13],.16,.035,[0,0,Math.PI/2]);
   for(const x of [-W*.31,W*.30])for(const z of [-D*.39,D*.39]){
     cyl(rubber,[x,fr,z],fr,.18,[Math.PI/2,0,0]);
     cyl(steel,[x,fr,z+Math.sign(z)*.10],fr*.57,.028,[Math.PI/2,0,0]);
   }
   const forkX=W*.42;
   for(const z of [-D*.28,D*.28]){
     box(steel,[.095,Math.min(H*.89,2.8),.13],[forkX,H*.48,z],[],.014);
     box(shadow,[.065,Math.min(H*.77,2.4),.026],[forkX+.07,H*.48,z]);
     box(steel,[W*.52,.075,.12],[forkX-W*.25,.25,z],[],.008);
     box(shadow,[W*.33,.024,.025],[forkX-W*.20,.315,z],[],.003);
   }
   box(steel,[.12,H*.26,D*.73],[forkX,H*.20,0]);
   box(steel,[W*.88,.11,D*.77],[0,Math.min(H-.055,2.45),0],[],.01);
   for(const x of [-W*.38,W*.33])for(const z of [-D*.32,D*.32])
     rod(steel,[x,.94,z],[x,Math.min(H-.14,2.4),z],.025);
 }
 function pumpWinch(){
   const winch=kind==='winch';
   box(shadow,[W,.16,D],[0,.15,0],[],.018);
   box(body,[W*.78,H*.55,D*.66],[0,H*.42,0],[],.039);
   const R=Math.min(H*.24,D*.36);
   if(winch){
     cyl(shadow,[0,H*.72,0],R,W*.70,[0,0,Math.PI/2]);
     cyl(steel,[-W*.36,H*.72,0],R*1.18,.075,[0,0,Math.PI/2]);
     cyl(steel,[W*.36,H*.72,0],R*1.18,.075,[0,0,Math.PI/2]);
     for(let i=0;i<(low?3:6);i++)tor(steel,[0,H*.72,0],R*(.61+i*.048),.012,[0,Math.PI/2,0],12);
     rod(steel,[W*.36,H*.72,0],[W*.47,H*.91,.23],.034);
     cyl(shadow,[W*.47,H*.91,.23],.06,.10);
   }else{
     cyl(shadow,[0,H*.72,0],R,W*.47,[0,0,Math.PI/2]);
     cyl(steel,[W*.25,H*.72,0],R*.78,.07,[0,0,Math.PI/2]);
     tor(steel,[W*.30,H*.72,0],R*.58,.02,[0,Math.PI/2,0]);
     cyl(steel,[-W*.25,H*.72,0],R*.46,.09,[0,0,Math.PI/2]);
     rod(steel,[W*.30,H*.72,0],[W*.48,H*.49,-D*.38],.08);
     rod(steel,[-W*.36,H*.63,D*.33],[-W*.36,H*.37,D*.40],.065);
     for(const z of [-D*.37,D*.37])box(warm,[.12,.045,.10],[W*.40,.48,z]);
   }
 }
 function chair(){
   const y=Math.min(H*.48,.58);
   box(shadow,[W*.73,.14,D*.67],[0,y,0],[],.05);
   box(body,[W*.76,H*.34,.12],[0,y+H*.26,D*.34],[-.16,0,0],.042);
   cyl(steel,[0,y*.52,0],.053,y);
   for(let k=0;k<5;k++){
     const a=k*Math.PI*2/5;
     rod(shadow,[0,.16,0],[Math.sin(a)*W*.45,.13,Math.cos(a)*D*.43],.032);
     cyl(rubber,[Math.sin(a)*W*.45,.10,Math.cos(a)*D*.43],.06,.055,[Math.PI/2,0,0],8);
   }
   for(const x of [-W*.39,W*.39]){
     rod(steel,[x,y-.10,-D*.15],[x,y+.16,D*.12],.027);
     box(shadow,[.07,.065,D*.41],[x,y+.17,D*.02]);
   }
 }
 if(['cot','bed','stretcher'].includes(kind))bed();
 else if(kind==='bench')bench();
 else if(kind==='forklift')forklift();
 else if(kind==='railcar')locomotive();
 else if(['desk','workbench','counter'].includes(kind))table();
 else if(['cabinet','rack','servers','batteries'].includes(kind))storage();
 else if(['ticket-machine','vending','terminal','security-desk','console','kiosk','booth'].includes(kind))cabinetMachine();
 else if(kind==='scanner')scanner();
 else if(kind==='generator')generator();
 else if(kind==='pump'||kind==='winch')pumpWinch();
 else if(kind==='chair')chair();
 const meshes=a.build(root,{name:'PW / '+kind+' · batches PBR',userData:{visualOnly:true}});
 root.userData.drawCalls=meshes.length;
 for(const part of a.items)part.geometry.dispose();
 a.items.length=0;
 return root;
}
