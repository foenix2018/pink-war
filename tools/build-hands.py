#!/usr/bin/env python3
"""Bundle the isolated RLH glove workshop with local Three.js and procedural materials."""
import pathlib,re,subprocess,sys,tempfile,urllib.parse
project=pathlib.Path(__file__).resolve().parents[1]
output=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/livraison/Pink_war_mains_RLH.html')
with tempfile.TemporaryDirectory(prefix='pink-hands-') as temp:
    bundle=pathlib.Path(temp)/'hands.js'
    subprocess.run(['npm','exec','--yes','--package=esbuild@0.25.11','--','esbuild','dist/mains-lab.js','--bundle','--format=esm','--platform=browser','--target=es2022','--minify','--legal-comments=inline','--outfile='+str(bundle)],cwd=project,check=True)
    js='(async()=>{\n'+bundle.read_text()+'\n})();'
    check=pathlib.Path(temp)/'check.js';check.write_text(js);subprocess.run(['node','--check',str(check)],check=True)
    js=re.sub(r'</script',r'<\/script',js,flags=re.IGNORECASE)
    html=(project/'dist/mains.html').read_text().replace('<link rel="stylesheet" href="mains.css">','<style>'+ (project/'dist/mains.css').read_text()+'</style>')
    html=html.replace('<script type="module" src="mains-lab.js"></script>','<script>'+js+'</script>')
    html=html.replace('href="icon.svg"','href="data:image/svg+xml,'+urllib.parse.quote((project/'dist/icon.svg').read_text(),safe='')+'"').replace('href="./"','href="https://pink-war.vercel.app"')
    license_text=(project/'dist/vendor/LICENSE.three.txt').read_text().replace('--','—')
    html=html.replace('<!doctype html>','<!doctype html>\n<!-- Pink war 3.22 : atelier des gants dérivés du fichier RLH V40 fourni.\n'+license_text+'\n-->')
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(html);print(output,output.stat().st_size,'bytes')
