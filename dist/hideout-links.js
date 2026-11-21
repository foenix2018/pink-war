import {recordHideoutArrival,hideoutURL} from './hideout-state.js';
export function addHideoutDebrief(parent,{level,characterId='ghju',game=null,choice=null}={}){
 if(!parent)return null;recordHideoutArrival({level,characterId,game,choice,completed:true});
 let link=parent.querySelector('[data-hideout-return]');if(!link){link=document.createElement('a');link.dataset.hideoutReturn='';link.className='pw-hideout-return';link.textContent='REJOINDRE LA PLANQUE →';link.style.cssText='display:block;box-sizing:border-box;width:100%;margin:14px 0;padding:15px 18px;border:1px solid #ef72b8;border-radius:8px;background:linear-gradient(110deg,#70274f,#173d57);color:#f6f4ff;text-align:center;text-decoration:none;font:800 13px system-ui;letter-spacing:.07em';const replay=parent.querySelector('#start,#retry-button');if(replay)replay.before(link);else parent.append(link);}
 parent.style.maxHeight='calc(100dvh - 48px)';parent.style.overflowY='auto';
 link.href=hideoutURL({characterId,level,renderer:new URLSearchParams(location.search).get('renderer')});return link;
}
