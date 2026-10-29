// Shared flat-screen preference. This module deliberately has no 3D imports:
// the welcome menu can offer the same control before loading the game.
export const VIEW_STORAGE_KEY='pink-war-view';
export const normalizeView=value=>value==='third'?'third':'fps';
export function readPreferredView(){try{return normalizeView(globalThis.localStorage?.getItem(VIEW_STORAGE_KEY));}catch{return 'fps';}}
export function savePreferredView(value){try{globalThis.localStorage?.setItem(VIEW_STORAGE_KEY,normalizeView(value));}catch{}}

export function bindViewButton(button,{getView=readPreferredView,onSelect=savePreferredView,canChange=()=>true}={}){
 button.dataset.viewToggle='';
 let previousView,previousDisabled;
 function refresh(){
  const third=normalizeView(getView())==='third',disabled=!canChange();
  if(previousView===third&&previousDisabled===disabled)return;
  previousView=third;previousDisabled=disabled;button.disabled=disabled;
  button.textContent=third?'3P · Passer en FPS':'FPS · Passer en 3P';
  button.setAttribute('aria-label',third?'Vue à la troisième personne. Passer en FPS':'Vue FPS. Passer à la troisième personne');
  button.setAttribute('aria-pressed',String(third));
 }
 button.onclick=()=>{if(!button.disabled)onSelect(normalizeView(getView())==='third'?'fps':'third');refresh();};refresh();
 return {button,refresh};
}

export function mountViewControl(parent,options={}){
 let row=parent.querySelector('[data-view-control]');
 if(!row){
  row=document.createElement('div');row.dataset.viewControl='';row.className='setting-row';
  row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:14px 0';
  const label=document.createElement('span');label.textContent='Vue du personnage';
  const button=document.createElement('button');button.type='button';button.dataset.viewToggle='';
  button.style.cssText='min-height:44px;padding:10px 16px;border:1px solid #8493a3;border-radius:8px;background:#253140;color:#eef1f7;font:600 13px system-ui;cursor:pointer';
  row.append(label,button);parent.append(row);
 }
 return {row,...bindViewButton(row.querySelector('[data-view-toggle]'),options)};
}
