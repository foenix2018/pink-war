#!/usr/bin/env python3
"""Bundle Pink war into one HTML file; gameplay and five bundled CC0 recordings run offline."""
import pathlib, re, subprocess, sys, tempfile, urllib.parse, base64, json, mimetypes

project = pathlib.Path(__file__).resolve().parents[1]
output = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/livraison/Pink_war.html')
with tempfile.TemporaryDirectory(prefix='pink-war-') as temporary:
    bundle = pathlib.Path(temporary) / 'game.js'
    subprocess.run(['npm', 'exec', '--yes', '--package=esbuild@0.25.11', '--', 'esbuild', 'dist/entry.js', '--bundle', '--format=esm', '--platform=browser', '--target=es2022', '--minify', '--legal-comments=inline', '--outfile='+str(bundle)], cwd=project, check=True)
    javascript = '(async () => {\n' + bundle.read_text() + '\n})();'
    samples={id:'data:audio/wav;base64,'+base64.b64encode((project/('dist/audio/kenney/'+id+'.wav')).read_bytes()).decode() for id in ['r9','bloom','lance','thorn','nova']}
    javascript='globalThis.__PINKWAR_AUDIO_SAMPLES='+json.dumps(samples)+';\n'+javascript
    check = pathlib.Path(temporary) / 'check.js'; check.write_text(javascript)
    subprocess.run(['node','--check',str(check)], check=True)
    javascript = re.sub(r'</script', r'<\/script', javascript, flags=re.IGNORECASE)
    html = (project / 'dist/index.html').read_text()
    html = re.sub(r'(src|href)="(entry\.js|(?:style|hud|campaign)\.css)\?[^"]*"', r'\1="\2"', html)
    for stylesheet in ['style.css', 'hud.css', 'campaign.css']:
        link = '<link rel="stylesheet" href="'+stylesheet+'">'
        if link in html:
            html = html.replace(link, '<style>\n'+(project/'dist'/stylesheet).read_text()+'\n</style>')
    # The autonomous file must keep its welcome/loading artwork without a
    # sibling art directory or an internet connection. Preloading those images
    # after embedding would merely duplicate the image data in the document.
    html = re.sub(r'<link\b(?=[^>]*\brel=["\']preload["\'])(?=[^>]*\bas=["\']image["\'])[^>]*>\s*', '', html, flags=re.IGNORECASE)
    embedded_art = {}
    def art_url(url):
        path = urllib.parse.unquote(urllib.parse.urlsplit(url).path).removeprefix('./').lstrip('/')
        if path not in embedded_art:
            asset = (project/'dist'/path).resolve()
            if not asset.is_relative_to((project/'dist/art').resolve()):
                raise ValueError('Artwork must stay inside dist/art: '+url)
            media = mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'
            embedded_art[path] = 'data:'+media+';base64,'+base64.b64encode(asset.read_bytes()).decode()
        return embedded_art[path]
    html = re.sub(r'url\(\s*(["\']?)((?:\./|/)?art/[^)\s"\']+)\1\s*\)', lambda m: 'url("'+art_url(m[2])+'")', html)
    html = re.sub(r'(\bsrc\s*=\s*)(["\'])((?:\./|/)?art/[^"\']+)\2', lambda m: m[1]+m[2]+art_url(m[3])+m[2], html)
    html = html.replace('href="icon.svg"','href="data:image/svg+xml,'+urllib.parse.quote((project/'dist/icon.svg').read_text(),safe='')+'"')
    html = html.replace('  <link rel="manifest" href="manifest.webmanifest">\n','').replace('class="brand" href="./"','class="brand" href="#"')
    html = html.replace('href="mains.html"','href="https://pink-war.vercel.app/mains.html"').replace('href="personnage.html"','href="https://pink-war.vercel.app/personnage.html"').replace('href="propositions.html"','href="https://pink-war.vercel.app/propositions.html"').replace('href="at-home.html"','href="https://pink-war.vercel.app/at-home.html"')
    html = html.replace('<script type="module" src="entry.js"></script>','<script>\n'+javascript+'\n</script>')
    license_text = '\n'.join((project/('dist/vendor/'+name)).read_text() for name in ['LICENSE.three.txt','LICENSE.fflate.txt']).replace('--','—')
    html = html.replace('<!doctype html>','<!doctype html>\n<!-- Pink war 3.33 — HTML autonome. Three.js :\n'+license_text+'\n-->')
    assert 'src="entry.js"' not in html and 'href="style.css"' not in html
    output.parent.mkdir(parents=True,exist_ok=True); output.write_text(html)
    print(str(output), output.stat().st_size, 'bytes')
