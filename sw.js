/* Guarda o app para abrir sem internet. Ao publicar versão nova, troque VERSAO. */
const VERSAO = "contas-v10";
const ARQUIVOS = ["./", "index.html", "styles.css", "js/dados.js", "js/fatura.js", "js/graficos.js", "js/app.js", "js/nuvem.js", "js/config.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))); self.clients.claim(); });
// Rede primeiro (pega versão nova), cache se estiver sem internet
// Só o próprio app e as bibliotecas; o tráfego do Firebase (login e banco) passa direto.
const GUARDAR = u => u.startsWith(self.location.origin) || u.startsWith("https://cdnjs.cloudflare.com/") ||
  u.startsWith("https://fonts.g") || u.startsWith("https://www.gstatic.com/firebasejs/");
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !GUARDAR(e.request.url)) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
