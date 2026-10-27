// Existing local Poly Haven CC0 photo sets, streamed only on entry to the range.
// No new external requests and no displacement or full-screen reflections on Quest.
export function createRangeMaterials(T,mats,textures,{low=false}={}){
  let enabled=false,disposed=false,loaded=0,failed=0,ready=Promise.resolve();
  const pending=[];
  function enable(){
    if(enabled||disposed||typeof document==='undefined')return ready;enabled=true;
    const loader=new T.TextureLoader();
    for(const [name,asset,repeat] of [['floor','concrete_floor',[8,30]],['wall','concrete_floor',[20,2]],['rust','rusty_painted_metal',[2,2]],['target','vesper-steel',[1,1]]]){
      const mat=mats[name];
      for(const [channel,slot] of name==='target'?[['diff','map']]:[['diff','map'],['rough','roughnessMap'],...(low?[]:[['normal','normalMap']])]){
        pending.push(new Promise(resolve=>{
          const photo=asset==='concrete_floor'&&channel==='diff'?'vesper-concrete':asset;
          loader.load(`./assets/cc0/${photo}_${channel}_512.jpg`,texture=>{
            if(disposed){texture.dispose();resolve();return;}
            texture.colorSpace=channel==='diff'?T.SRGBColorSpace:T.NoColorSpace;
            texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(...repeat);texture.anisotropy=4;
            textures.push(texture);mat[slot]=texture;
            if(name==='target')mat.bumpMap=null;
            if(channel==='normal'){mat.normalScale.set(.38,.38);mat.bumpMap=null;}
            mat.needsUpdate=true;loaded++;resolve();
          },undefined,()=>{failed++;resolve();});
        }));
      }
    }
    ready=Promise.all(pending);return ready;
  }
  return {enable,get ready(){return ready;},stats:()=>({enabled,loaded,failed}),dispose(){disposed=true;}};
}
