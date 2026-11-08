// A cancelled held aim cannot restart until the input is released or deliberately pressed again.
export function createAimRelease(){let blocked=false;return{cancel(){blocked=true;},freshPress(){blocked=false;},read(held){if(!held)blocked=false;return !!held&&!blocked;},get blocked(){return blocked;}};}
export function reconcileAimModifiers(keys,event){
 if(!event.ctrlKey&&!/^Control/.test(event.code||'')){keys.delete('ControlLeft');keys.delete('ControlRight');}
 if(!event.metaKey&&!/^Meta/.test(event.code||'')){keys.delete('MetaLeft');keys.delete('MetaRight');}
}
