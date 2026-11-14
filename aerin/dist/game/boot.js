/* Keep the entry screen actionable when a script, model or GPU fails. */
(() => {
  let ready = false;
  const start = document.querySelector('#start-button');
  const retry = document.querySelector('#reload-button');
  const welcome = document.querySelector('#welcome');
  const error = document.querySelector('#load-error');
  const deadline = setTimeout(() => fail('Le chargement prend trop de temps. Vérifie ta connexion, puis touche Recharger.'), 45000);
  function fail(message) {
    clearTimeout(deadline);
    ready = false;
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    welcome.hidden = false;
    welcome.classList.add('load-failed');
    start.hidden = true;
    retry.hidden = false;
    error.textContent = message;
  }
  retry.onclick = () => {
    // A fresh URL also avoids reopening an old cached entry document on iOS.
    const url = new URL(location.href);
    url.searchParams.set('reload', Date.now().toString());
    location.replace(url.href);
  };
  window.aerinBoot = {
    fail,
    progress(value) { if (!ready && !welcome.classList.contains('load-failed')) start.textContent = `Chargement du personnage… ${Math.round(value * 100)} %`; },
    ready() {
      clearTimeout(deadline);
      ready = true;
      welcome.classList.remove('load-failed');
      error.textContent = '';
      retry.hidden = true;
      start.hidden = false;
      start.disabled = false;
      start.textContent = 'JOUER →';
    }
  };
  window.addEventListener('error', event => {
    if (!ready && (event.target?.tagName === 'SCRIPT' || event.error)) fail('Le jeu n’a pas pu démarrer. Ouvre le lien dans Safari, puis touche Recharger.');
  }, true);
  window.addEventListener('unhandledrejection', () => {
    if (!ready) fail('Le jeu n’a pas pu terminer son chargement. Touche Recharger pour réessayer.');
  });
})();
