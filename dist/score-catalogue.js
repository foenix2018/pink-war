// Creator-supplied soundtrack. AAC stereo, 96 kb/s, -23 LUFS; streamed on demand.
const track=(id,title)=>Object.freeze({id,title,url:`./assets/music/score-3930/${id}.m4a`});
export const SCORE=Object.freeze({
 spire:track('under-the-iron-spire','Under the Iron Spire'),
 well:track('the-iron-well','The Iron Well'),
 collapse:track('kinetic-collapse','Kinetic Collapse'),
 garden:track('the-iron-garden','The Iron Garden'),
 piston:track('overclocked-piston','Overclocked Piston'),
 machinery:track('heavy-machinery-requiem','Heavy Machinery Requiem'),
 sector:track('sector-nine-breach','Sector Nine Breach'),
 siege:track('under-heavy-siege','Under Heavy Siege'),
 corridor:track('locked-corridor','Locked Corridor'),
 blackout:track('blackout-protocol','Blackout Protocol')
});
export const CHAPTER_SCORE=Object.freeze({1:SCORE.spire,2:SCORE.corridor,3:SCORE.siege,4:SCORE.piston,5:SCORE.well,6:SCORE.machinery,7:SCORE.well,8:SCORE.blackout,9:SCORE.garden,10:SCORE.sector,11:SCORE.siege,12:SCORE.blackout,13:SCORE.machinery,14:SCORE.spire,15:SCORE.corridor});
export const chapterForMode=mode=>({campaign:1,campaign2:2,campaign3:3,campaign4:4,ligne9:5,campaign6:6,foret:7,campaign8:8,campaign9:9,campaign10:10,campaign11:11,campaign12:12,campaign13:13,campaign14:14,campaign15:15}[mode]||1);
export function scoreFor(level,{mode,finale=false}={}){
 if(mode==='planque'||mode==='training')return SCORE.garden;
 if(mode==='arena'||mode==='breach'||finale)return SCORE.collapse;
 return CHAPTER_SCORE[level]||CHAPTER_SCORE[1];
}
// A bounded, quarter-second sample in the owner keeps audio decisions off the hot path.
export function scoreMix({surface='gameplay',level=1,mode,game,dialogue=false,finale=false}={}){
 let combat=!!finale;
 if(game?.player)for(const e of (game.enemies||[]).slice(0,64)){
  if(e.hp>0&&Math.hypot(e.x-game.player.x,e.z-game.player.z)<24){combat=true;break;}
 }
 let gain=surface==='gameplay'?(combat?.48:.36):.4;
 if(mode==='planque'||mode==='training'||Number(level)===7)gain*=.72;
 if(dialogue)gain*=.28;
 return {gain,section:dialogue?'dialogue':combat?'combat':mode==='planque'?'interlude':'exploration'};
}
