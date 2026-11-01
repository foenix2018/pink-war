// Digital Bold-D style counters drawn as vector seven-segment numerals.
// No third-party font, external download or per-frame canvas allocation.
const SEGMENTS=Object.freeze({
 '0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg',
 '5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg'
});
const SHAPES=Object.freeze([
 'M6 1H18L15 4H8Z',       // a
 'M19 3L22 6V18L19 20L17 17V7Z', // b
 'M19 23L22 25V36L19 39L17 36V26Z', // c
 'M8 38H15L18 41H6L5 39Z', // d
 'M3 23L6 26V36L3 39L1 36V25Z', // e
 'M3 3L6 7V17L3 20L1 18V6Z', // f
 'M7 19H17L20 21L17 23H7L4 21Z' // g
]);
const NS='http://www.w3.org/2000/svg';
export const digitalSegments=character=>SEGMENTS[String(character)]||'';
export const isDigitalCounter=value=>/^[0-9/ ]+$/.test(String(value));
// Called only when the visible value changes, not once per render frame.
export function renderDigitalCounter(node,value){
 const displayed=String(value);
 if(node.dataset.digitalText===displayed)return;
 node.dataset.digitalText=displayed;
 node.setAttribute('aria-label',displayed);
 if(!isDigitalCounter(displayed)){node.textContent=displayed;return;}
 const run=node.ownerDocument.createElement('span');run.className='pw-led-run';run.setAttribute('aria-hidden','true');
 for(const char of displayed){
  if(char===' '){const space=node.ownerDocument.createElement('span');space.className='pw-led-space';run.append(space);continue;}
  const svg=node.ownerDocument.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','0 0 24 42');svg.setAttribute('focusable','false');svg.setAttribute('aria-hidden','true');
  svg.classList.add('pw-led-digit');
  if(char==='/'){svg.classList.add('pw-led-slash');const slash=node.ownerDocument.createElementNS(NS,'path');slash.setAttribute('d','M19 5H23L5 40H1Z');slash.classList.add('pw-led-on');svg.append(slash);}
  else{
   const active=digitalSegments(char);
   SHAPES.forEach((d,i)=>{const path=node.ownerDocument.createElementNS(NS,'path');path.setAttribute('d',d);path.classList.add(active.includes('abcdefg'[i])?'pw-led-on':'pw-led-off');svg.append(path);});
  }
  run.append(svg);
 }
 node.replaceChildren(run);
}
