#!/usr/bin/env python3
"""Bundle Pink war into one HTML file; no runtime network dependencies."""
import pathlib, re, subprocess, sys, tempfile, urllib.parse

project = pathlib.Path(__file__).resolve().parents[1]
output = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/livraison/Pink_war.html')
with tempfile.TemporaryDirectory(prefix='pink-war-') as temporary:
    bundle = pathlib.Path(temporary) / 'game.js'
    subprocess.run(['npm', 'exec', '--yes', '--package=esbuild@0.25.11', '--', 'esbuild', 'dist/game.js', '--bundle', '--format=esm', '--platform=browser', '--target=es2022', '--minify', '--legal-comments=inline', '--outfile='+str(bundle)], cwd=project, check=True)
    javascript = '(async () => {\n' + bundle.read_text() + '\n})();'
    check = pathlib.Path(temporary) / 'check.js'; check.write_text(javascript)
    subprocess.run(['node','--check',str(check)], check=True)
    javascript = re.sub(r'</script', r'<\/script', javascript, flags=re.IGNORECASE)
    html = (project / 'dist/index.html').read_text()
    html = html.replace('<link rel="stylesheet" href="style.css">','<style>\n'+(project/'dist/style.css').read_text()+'\n</style>')
    html = html.replace('href="icon.svg"','href="data:image/svg+xml,'+urllib.parse.quote((project/'dist/icon.svg').read_text(),safe='')+'"')
    html = html.replace('  <link rel="manifest" href="manifest.webmanifest">\n','').replace('class="brand" href="./"','class="brand" href="#"')
    html = html.replace('<script type="module" src="game.js"></script>','<script>\n'+javascript+'\n</script>')
    license_text = (project/'dist/vendor/LICENSE.three.txt').read_text().replace('--','—')
    html = html.replace('<!doctype html>','<!doctype html>\n<!-- Pink war 3.1 — HTML autonome. Three.js :\n'+license_text+'\n-->')
    assert 'src="game.js"' not in html and 'href="style.css"' not in html
    output.parent.mkdir(parents=True,exist_ok=True); output.write_text(html)
    print(str(output), output.stat().st_size, 'bytes')
