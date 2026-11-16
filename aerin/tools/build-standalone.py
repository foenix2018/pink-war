"""Génère le HTML autonome (racine de l'archive) entièrement à partir de dist/index.html.

Usage : python3 Aerin/tools/build-standalone.py <racine de l'archive>
- feuilles de style de dist/ intégrées en <style> ;
- scripts intégrés dans l'ordre : modèle GLB embarqué, boot (lancement direct), mobile, Three r128,
  GLTFLoader, modules V12/V13 (style, corps, mouvements, aventure, chevalier), moteur WebGL ;
- le modèle, boot et Three r128 sont lus dans dist/ ; aucun ancien HTML requis.
Le moteur WebGPU (CDN) n'est pas utilisé dans le fichier autonome : il fonctionne sans serveur."""
import re, sys, pathlib, base64

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
dist = pathlib.Path(__file__).resolve().parent.parent / 'dist'
page = root / 'index.html'
html = (dist / 'index.html').read_text(encoding='utf-8')

def safe(js):
    return js.replace('</script', '<\\/script')

KEEP = ['embedded-model', 'boot', 'mobile', 'three-r128', 'GLTFLoader']
boot = (dist / 'game' / 'boot.js').read_text(encoding='utf-8')
boot = boot.replace("start.textContent = 'JOUER →';", "start.textContent = 'JOUER →'; queueMicrotask(() => { if (!start.hidden && !start.disabled) start.click(); });")
kept = {
    'embedded-model': "window.AERIN_DIRECT_LAUNCH=true;window.AERIN_EMBEDDED_GLB='data:model/gltf-binary;base64," + base64.b64encode((dist / 'assets' / 'aerin.glb').read_bytes()).decode() + "';",
    'boot': safe(boot),
    'mobile': safe((dist / 'game' / 'mobile.js').read_text(encoding='utf-8')),
    'three-r128': safe((dist / 'preview' / 'three.min.js').read_text(encoding='utf-8')),
    'GLTFLoader': safe((dist / 'preview' / 'GLTFLoader.js').read_text(encoding='utf-8')),
}
MODULES = ['aerin-style-v12', 'aerin-body-v13', 'aerin-hair-v15', 'aerin-motion-v11', 'aerin-motion-adventure-v12', 'aerin-knight-v11']
game = (dist / 'game' / 'aerin-game-webgl.js').read_text(encoding='utf-8')
game = game.replace("new T.GLTFLoader().load('assets/aerin.glb',", "new T.GLTFLoader().load(window.AERIN_EMBEDDED_GLB || 'assets/aerin.glb',")
assert 'AERIN_EMBEDDED_GLB' in game

# 1. feuilles de style intégrées
def css(m):
    href = m.group(1).split('?')[0]
    return f'<style data-embedded="{href}">\n' + (dist / href).read_text(encoding='utf-8') + '</style>'
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
# 2. liens inutiles hors serveur
html = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>', '', html)
html = html.replace('</head>', '<link rel="icon" href="data:,"></head>')
# 3. tous les scripts externes / module remplacés par les blocs intégrés
html = re.sub(r'<script src="[^"]+"></script>', '', html)
html = re.sub(r'<script type="importmap">.*?</script>', '', html, flags=re.S)
html = re.sub(r'<script type="module"[^>]*></script>', '', html)
scripts = [f'<script data-inline="{n}">{kept[n]}</script>' for n in KEEP]
scripts += [f'<script data-inline="{n}">\n' + safe((dist / 'game' / (n + '.js')).read_text(encoding='utf-8')) + '</script>' for n in MODULES]
scripts.append('<script data-inline="webgl-game">\n' + safe(game) + '</script>')
if html.count('</body>') != 1:
    raise SystemExit('</body> attendu une fois')
html = html.replace('</body>', '\n'.join(scripts) + '\n</body>')
# 4. liens relatifs depuis la racine de l'archive
html = html.replace('href="atelier-v12.html"', 'href="Aerin/dist/atelier-v12.html"').replace('href="atelier.html"', 'href="Aerin/dist/atelier.html"')
html = '<!-- Aerin V15 autonome : Three WebGL, chevalier cel shading, HUD V13 + disposition tactile Pink Wars (V14), 75 animations, sans serveur. -->\n' + html
for n in KEEP + MODULES + ['webgl-game']:
    assert html.count(f'data-inline="{n}"') == 1, n
page.write_text(html, encoding='utf-8')
print('HTML autonome écrit :', page, len(html.encode('utf-8')), 'octets')
