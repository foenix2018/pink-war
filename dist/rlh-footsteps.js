// User-authorized RLH footfalls, locally bundled; cache decoded clips per context.
export const RLH_STEP_SAMPLES=Object.freeze([1,2,3,4].map(i=>`audio/rlh/step-${i}.wav`));
const loads=new WeakMap(),clips=new WeakMap();
export function rlhStepClips(ctx){return clips.get(ctx)||[];}
export async function loadRLHFootsteps(ctx,fetcher=globalThis.fetch){
 if(!ctx?.decodeAudioData||!fetcher)return false;
 if(loads.has(ctx))return loads.get(ctx);
 const buffers=clips.get(ctx)||[];clips.set(ctx,buffers);
 const pending=Promise.allSettled(RLH_STEP_SAMPLES.map(async(url,i)=>{
  if(buffers[i])return;
  const response=await fetcher(url);if(!response.ok)throw Error('RLH footstep missing');
  buffers[i]=await ctx.decodeAudioData(await response.arrayBuffer());
 })).then(results=>{const ok=results.every(r=>r.status==='fulfilled');if(!ok)loads.delete(ctx);return ok;});
 loads.set(ctx,pending);return pending;
}
