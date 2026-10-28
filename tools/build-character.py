#!/usr/bin/env python3
"""Bundle the real RLH character and animations in a standalone HTML workshop."""
import pathlib,re,subprocess,sys,tempfile,urllib.parse,base64,json
project=pathlib.Path(__file__).resolve().parents[1]
output=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/livraison/PINK_WARS_GHJU_LYLU_3_66_2.html')
with tempfile.TemporaryDirectory(prefix='pink-character-') as temp:
    bundle=pathlib.Path(temp)/'character.js'
    subprocess.run(['npm','exec','--yes','--package=esbuild@0.25.11','--','esbuild','dist/personnage-lab.js','--bundle','--format=esm','--platform=browser','--target=es2022','--minify','--legal-comments=inline','--outfile='+str(bundle)],cwd=project,check=True)
    js='(async()=>{\n'+bundle.read_text()+'\n})();'
    samples={id:'data:audio/wav;base64,'+base64.b64encode((project/('dist/audio/kenney/'+id+'.wav')).read_bytes()).decode() for id in ['r9','bloom','lance','thorn','nova']}
    js='globalThis.__PINKWAR_AUDIO_SAMPLES='+json.dumps(samples)+';\n'+js
    embedded={p.name:base64.b64encode(p.read_bytes()).decode() for p in (project/'dist/assets/pink-war').glob('*-mk4.glb')}
    palette='data:image/png;base64,'+base64.b64encode((project/'dist/assets/kenney/colormap.png').read_bytes()).decode()
    js='globalThis.__PINKWAR_BLASTER_ASSETS='+json.dumps(embedded)+';\nglobalThis.__PINKWAR_BLASTER_PALETTE='+json.dumps(palette)+';\n'+js
    check=pathlib.Path(temp)/'check.js';check.write_text(js);subprocess.run(['node','--check',str(check)],check=True)
    js=re.sub(r'</script',r'<\/script',js,flags=re.IGNORECASE)
    html=re.sub(r'<script type="module" src="\./personnage-lab\.js(?:\?[^"]*)?"></script>',lambda _: '<script type="module">'+js+'</script>',(project/'dist/personnage.html').read_text())
    html=html.replace('href="./icon.svg"','href="data:image/svg+xml,'+urllib.parse.quote((project/'dist/icon.svg').read_text(),safe='')+'"').replace('href="./index.html"','href="https://pink-war.vercel.app"').replace('href="evolutions.html"','href="https://pink-war.vercel.app/evolutions.html"')
    license_text='\n'.join((project/('dist/vendor/'+name)).read_text() for name in ['LICENSE.three.txt','LICENSE.fflate.txt']).replace('--','—')
    html=html.replace('<!doctype html>','<!doctype html>\n<!-- Pink Wars 3.66.2 : GHJU / LYLU Shadow VII, armure de référence et animations RLH.\n'+license_text+'\n-->')
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(html);print(output,output.stat().st_size,'bytes')
