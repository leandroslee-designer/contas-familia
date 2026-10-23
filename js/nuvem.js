/* Sincronização entre aparelhos pelo Firebase (login com Google).
   Só liga quando js/config.js tem a configuração do projeto. Os dados ficam em
   familias/<id>/dados/config (ajustes) e familias/<id>/meses/<AAAA-MM> (lançamentos do mês). */
(function () {
  const SDK = "https://www.gstatic.com/firebasejs/10.12.5/";
  const N = { estado: "desligado", usuario: null, erro: "", ultimo: 0 };
  const ouvintes = [];
  let db, auth, fam, enviado = {}, enviadoCfg = "", ligado = false;
  const CAMPOS_CFG = ["settings", "cards", "categories", "people", "rules", "recurring", "incomes", "debts", "imports", "skips"];

  N.configurado = () => !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);
  N.onChange = f => ouvintes.push(f);
  const avisar = () => ouvintes.forEach(f => { try { f(N); } catch (e) { console.error(e); } });

  function script(url) {
    return new Promise((ok, erro) => {
      const s = document.createElement("script"); s.src = url; s.onload = ok;
      s.onerror = () => erro(new Error("sem internet para carregar o Firebase"));
      document.head.appendChild(s);
    });
  }
  function traduz(e) {
    const c = (e && e.code) || "";
    if (c.includes("permission-denied")) return "Este e-mail não tem permissão. Peça para incluir nas regras do Firebase.";
    if (c.includes("unauthorized-domain")) return "Este endereço não está autorizado no Firebase (Authentication → Settings → Authorized domains).";
    if (c.includes("popup-closed")) return "Login cancelado.";
    if (c.includes("network") || c.includes("unavailable")) return "Sem internet agora; o app sincroniza quando voltar.";
    return (e && e.message) || String(e);
  }

  // ---------- leitura/escrita ----------
  const limpo = o => JSON.parse(JSON.stringify(o)); // o Firestore não aceita undefined
  function mesesLocais() {
    const por = {};
    for (const t of D.state.tx) (por[t.month] = por[t.month] || []).push(t);
    return por;
  }
  function cfgLocal() {
    const c = {};
    for (const k of CAMPOS_CFG) c[k] = D.state[k];
    // importações antigas guardam cópias para desfazer; na nuvem vão só as 10 últimas
    c.imports = (c.imports || []).slice(0, 10);
    return limpo(c);
  }

  N.enviar = async function () {
    if (!ligado) return;
    const lote = db.batch();
    let n = 0;
    const quem = N.usuario ? N.usuario.email : "";
    const por = mesesLocais();
    const todos = new Set([...Object.keys(por), ...Object.keys(enviado)]);
    for (const m of todos) {
      const txt = JSON.stringify(por[m] || []);
      if (txt === enviado[m]) continue;
      enviado[m] = txt;
      lote.set(fam.collection("meses").doc(m), { tx: JSON.parse(txt), updatedAt: Date.now(), por: quem });
      n++;
    }
    const cfg = JSON.stringify(cfgLocal());
    if (cfg !== enviadoCfg) {
      enviadoCfg = cfg;
      lote.set(fam.collection("dados").doc("config"), Object.assign(JSON.parse(cfg), { updatedAt: Date.now(), por: quem }));
      n++;
    }
    if (!n) return;
    try { await lote.commit(); N.ultimo = Date.now(); N.erro = ""; N.estado = "ok"; }
    catch (e) { N.erro = traduz(e); N.estado = "erro"; }
    avisar();
  };

  function aplicarMes(m, tx) {
    D.state.tx = D.state.tx.filter(t => t.month !== m).concat(tx || []);
  }
  function aplicarCfg(c) {
    for (const k of CAMPOS_CFG) if (c[k] !== undefined) D.state[k] = c[k];
  }
  let timerRender = null;
  function recarregarTela() {
    D.save(true);
    clearTimeout(timerRender);
    timerRender = setTimeout(() => {
      // não atrapalha quem está digitando
      const a = document.activeElement;
      if (a && a.closest && a.closest("#view") && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
      window.APP && window.APP.render();
    }, 250);
  }

  function ouvir() {
    fam.collection("meses").onSnapshot(qs => {
      let mudou = false;
      for (const ch of qs.docChanges()) {
        if (ch.doc.metadata.hasPendingWrites) continue;
        const m = ch.doc.id, tx = ch.doc.data().tx || [];
        const txt = JSON.stringify(tx);
        if (txt === enviado[m]) continue;
        enviado[m] = txt;
        aplicarMes(m, tx);
        mudou = true;
      }
      if (mudou) { N.ultimo = Date.now(); recarregarTela(); avisar(); }
    }, e => { N.erro = traduz(e); N.estado = "erro"; avisar(); });
    fam.collection("dados").doc("config").onSnapshot(doc => {
      if (!doc.exists || doc.metadata.hasPendingWrites) return;
      const c = doc.data();
      delete c.updatedAt; delete c.por;
      const txt = JSON.stringify(limpo(Object.assign(cfgLocal(), c)));
      if (txt === enviadoCfg) return;
      aplicarCfg(c);
      enviadoCfg = JSON.stringify(cfgLocal());
      N.ultimo = Date.now(); recarregarTela(); avisar();
    }, () => { });
  }

  async function conectar() {
    N.estado = "conectando"; avisar();
    fam = db.collection("familias").doc(window.FIREBASE_FAMILIA || "casa");
    try {
      const [cfg, meses] = await Promise.all([fam.collection("dados").doc("config").get(), fam.collection("meses").get()]);
      const nuvemVazia = !cfg.exists && meses.empty;
      const localTem = D.state.tx.length > 0;
      let usarNuvem = !nuvemVazia;
      if (!nuvemVazia && localTem && !localStorage.getItem("cf-nuvem-ok")) {
        usarNuvem = confirm(`A nuvem já tem dados da família (${meses.size} meses). Usar os dados da nuvem neste aparelho?\n\nOK = usar os da nuvem (recomendado)\nCancelar = mandar os deste aparelho para a nuvem`);
      }
      if (usarNuvem) {
        if (cfg.exists) { const c = cfg.data(); delete c.updatedAt; delete c.por; aplicarCfg(c); }
        D.state.tx = [];
        meses.forEach(d => { const tx = d.data().tx || []; enviado[d.id] = JSON.stringify(tx); D.state.tx.push(...tx); });
        enviadoCfg = JSON.stringify(cfgLocal());
        D.save(true);
      } else {
        meses.forEach(d => { enviado[d.id] = JSON.stringify(d.data().tx || []); });
      }
      localStorage.setItem("cf-nuvem-ok", "1");
      ligado = true;
      ouvir();
      await N.enviar();
      N.estado = "ok"; N.erro = "";
      window.APP && window.APP.render();
    } catch (e) { N.estado = "erro"; N.erro = traduz(e); }
    avisar();
  }

  // ---------- login ----------
  N.iniciar = async function () {
    if (!N.configurado()) return;
    try {
      for (const f of ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]) await script(SDK + f);
      firebase.initializeApp(window.FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      try { await db.enablePersistence({ synchronizeTabs: true }); } catch (e) { }
      await auth.getRedirectResult().catch(e => { N.erro = traduz(e); });
      auth.onAuthStateChanged(u => {
        N.usuario = u;
        if (u) conectar();
        else { ligado = false; N.estado = "entrar"; avisar(); }
      });
      D.onSave(() => N.enviar());
    } catch (e) { N.estado = "erro"; N.erro = traduz(e); avisar(); }
  };
  N.entrar = async function () {
    const p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    try { await auth.signInWithPopup(p); }
    catch (e) {
      if (/popup-blocked|operation-not-supported/.test(e.code || "")) return auth.signInWithRedirect(p);
      N.erro = traduz(e); avisar();
    }
  };
  N.sair = async function () { ligado = false; enviado = {}; enviadoCfg = ""; localStorage.removeItem("cf-nuvem-ok"); await auth.signOut(); };

  window.NUVEM = N;
})();
