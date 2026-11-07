import {createModernSwitch} from './modern-switch.js';
// Retain the cabinet anchor, caller-owned materials and gameplay-facing API.
export function createCircuitSwitch(T,parent,options={}){
 return createModernSwitch(T,parent,{label:'ALIMENTATION',onLabel:'EN SERVICE',offLabel:'CIRCUIT OUVERT',...options});
}
