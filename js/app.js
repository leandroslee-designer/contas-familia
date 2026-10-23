/* Contas da Família - telas */
(function () {
  const U = D.U, $ = s => document.querySelector(s);
  D.load();

  const ui = {
    page: "inicio", month: U.mesAtual(), modo: "cartao", busca: "", filtroCartao: "", filtroCat: "",
    aba: "evolucao", catAnalise: "lanches", imp: null,
  };
  try { Object.assign(ui, JSON.parse(localStorage.getItem("cf-ui") || "{}"), { imp: null }); } catch (e) { }
  const guardarUI = () => { try { localStorage.setItem("cf-ui", JSON.stringify({ modo: ui.modo, aba: ui.aba, catAnalise: ui.catAnalise })); } catch (e) { } };

  const PAGINAS = [
    { id: "inicio", nome: "Início", ico: "🏠" },
    { id: "lancamentos", nome: "Lançamentos", ico: "🧾" },
    { id: "fixas", nome: "Contas fixas", ico: "📌" },
    { id: "fatura", nome: "Importar fatura", ico: "📥" },
    { id: "analises", nome: "Análises", ico: "📊" },
    { id: "ajustes", nome: "Ajustes", ico: "⚙️" },
  ];

  // ---------- helpers de tela ----------
  const cat = id => D.cat(id), card = id => D.card(id);
  const icoCat = (id, extra = "") => `<span class="cat-ico" ${extra}>${cat(id).icon}</span>`;
  function toast(msg, acao, fn) {
    const t = $("#toast");
    t.innerHTML = `<span>${U.esc(msg)}</span>` + (acao ? `<button>${U.esc(acao)}</button>` : "");
    if (acao) t.querySelector("button").onclick = () => { fn(); t.classList.remove("show"); };
    t.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), acao ? 6000 : 2600);
  }
  function abrirSheet(html, wide) {
    const s = $("#sheet");
    s.className = "sheet" + (wide ? " wide" : "");
    s.innerHTML = html;
    requestAnimationFrame(() => { s.classList.add("open"); $("#sheetBackdrop").classList.add("open"); });
    return s;
  }
  function fecharSheet() { $("#sheet").classList.remove("open"); $("#sheetBackdrop").classList.remove("open"); }
  $("#sheetBackdrop").onclick = fecharSheet;
  document.addEventListener("keydown", e => { if (e.key === "Escape") fecharSheet(); });
  const cabecaSheet = t => `<div class="sheet-head"><h2>${t}</h2><button class="icon-btn" data-close aria-label="Fechar">✕</button></div>`;
  document.addEventListener("click", e => { if (e.target.closest("[data-close]")) fecharSheet(); });

  function aplicarTema() {
    const t = D.state.settings.theme;
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }

  // ---------- navegação ----------
  function ir(page) { location.hash = "#/" + page; }
  window.addEventListener("hashchange", () => { ui.page = (location.hash.split("/")[1] || "inicio"); render(); window.scrollTo(0, 0); });
  ui.page = location.hash.split("/")[1] || "inicio";

  function renderNav() {
    $("#sideNav").innerHTML = PAGINAS.map(p => `<button class="nav-item ${ui.page === p.id ? "active" : ""}" data-go="${p.id}"><span class="ico">${p.ico}</span>${p.nome}</button>`).join("");
    const mob = [PAGINAS[0], PAGINAS[1], { id: "+", nome: "", ico: "+" }, { id: "fixas", nome: "Fixas", ico: "📌" }, { id: "mais", nome: "Mais", ico: "☰" }];
    $("#bottomNav").innerHTML = mob.map(p => p.id === "+"
      ? `<button class="nav-item nav-add" data-act="novo" aria-label="Novo lançamento"><span>+</span></button>`
      : `<button class="nav-item ${ui.page === p.id || (p.id === "mais" && ["fatura", "analises", "ajustes"].includes(ui.page)) ? "active" : ""}" data-go="${p.id}"><span class="ico">${p.ico}</span>${p.nome}</button>`).join("");
    $("#monthLabel").textContent = U.nomeMes(ui.month);
    $("#monthSwitch").style.visibility = ui.page === "ajustes" ? "hidden" : "visible";
    $("#pageTitle").textContent = (PAGINAS.find(p => p.id === ui.page) || PAGINAS[0]).nome;
  }

  document.addEventListener("click", e => {
    const go = e.target.closest("[data-go]");
    if (go) {
      if (go.dataset.go === "mais") return abrirMais();
      fecharSheet();
      return ir(go.dataset.go);
    }
    const a = e.target.closest("[data-act]");
    if (!a) return;
    const act = a.dataset.act;
    if (act === "prev-month") { ui.month = U.addMes(ui.month, -1); render(); }
    else if (act === "next-month") { ui.month = U.addMes(ui.month, 1); render(); }
    else if (act === "pick-month") escolherMes();
    else if (act === "novo") abrirLancamento(null);
  });

  function abrirMais() {
    const s = abrirSheet(cabecaSheet("Mais") + `<div class="stack">${PAGINAS.slice(3).map(p => `<button class="nav-item" data-go="${p.id}" style="background:var(--surface-2)"><span class="ico">${p.ico}</span>${p.nome}</button>`).join("")}</div>`);
  }

  function escolherMes() {
    const meses = D.meses();
    let todos = [];
    const ini = meses[0], fim = U.addMes(U.mesAtual(), 6);
    for (let m = fim; m >= ini; m = U.addMes(m, -1)) todos.push(m);
    const s = abrirSheet(cabecaSheet("Escolher mês") + `<div class="pick-grid">${todos.map(m => {
      const tot = D.total(D.doMes(m));
      return `<button class="pick ${m === ui.month ? "on" : ""}" data-m="${m}"><b style="font-size:14px;color:var(--text)">${U.nomeMes(m, true)}</b><span>${tot ? U.brl(tot, false) : "—"}</span></button>`;
    }).join("")}</div>`);
    s.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { ui.month = b.dataset.m; fecharSheet(); render(); });
  }

  // ---------- render ----------
  function render() {
    if (D.garantirFixas(ui.month)) D.save();
    renderNav();
    renderBanner();
    const v = $("#view");
    ({ inicio: telaInicio, lancamentos: telaLancamentos, fixas: telaFixas, fatura: telaFatura, analises: telaAnalises, ajustes: telaAjustes }[ui.page] || telaInicio)(v);
  }
  D.onSave(() => { gravarArquivo(); });

  // ================= INÍCIO =================
  function resumoMes(m) {
    const tx = D.doMes(m);
    const total = D.total(tx);
    const prev = D.total(tx.filter(t => t.status === "previsto"));
    const porCartao = {}, porCat = {}, qtdCat = {};
    for (const t of tx) {
      porCartao[t.card] = (porCartao[t.card] || 0) + t.amount;
      porCat[t.cat] = (porCat[t.cat] || 0) + t.amount;
      qtdCat[t.cat] = (qtdCat[t.cat] || 0) + 1;
    }
    return { tx, total, prev, porCartao, porCat, qtdCat };
  }
  function mediaCat(catId, m, n = 6) {
    let soma = 0, qtd = 0, meses = 0;
    for (let k = 1; k <= n; k++) {
      const mm = U.addMes(m, -k);
      const tx = D.doMes(mm);
      if (!tx.length) continue;
      meses++;
      const c = tx.filter(t => t.cat === catId);
      soma += D.total(c); qtd += c.length;
    }
    return meses ? { total: soma / meses, qtd: qtd / meses, meses } : null;
  }

  function telaInicio(v) {
    const m = ui.month, r = resumoMes(m), ant = resumoMes(U.addMes(m, -1));
    const dif = ant.total ? (r.total - ant.total) / ant.total * 100 : 0;
    const split = D.state.settings.split;
    const pessoas = split.on ? split.people.length : 1;
    const entradas = D.state.incomes.filter(i => i.month === m);
    const totEnt = D.total(entradas);
    const fixas = r.tx.filter(t => t.card === "fixas");
    const pagas = fixas.filter(t => t.paid).length;
    if (!D.state.tx.length) {
      v.innerHTML = boasVindas();
      return;
    }
    const cats = Object.entries(r.porCat).sort((a, b) => b[1] - a[1]);
    const maxCat = cats.length ? cats[0][1] : 1;
    v.innerHTML = `
      <div class="hero">
        <div class="label">Total de ${U.nomeMes(m)}</div>
        <div class="big num">${U.brl(r.total)}</div>
        <div class="small" style="opacity:.85">${r.prev ? `${U.brl(r.total - r.prev)} lançado · ${U.brl(r.prev)} previsto` : `${r.tx.length} lançamentos`}</div>
        <div class="sub">
          ${split.on ? `<span class="pill">👥 Pra cada um: <b class="num">${U.brl(r.total / pessoas)}</b></span>` : ""}
          ${ant.total ? `<span class="pill">${dif > 0 ? "▲" : "▼"} ${Math.abs(dif).toFixed(0)}% vs ${U.nomeMes(U.addMes(m, -1), true)}</span>` : ""}
          ${totEnt ? `<span class="pill">💰 Sobra: <b class="num">${U.brl(totEnt - r.total)}</b></span>` : ""}
        </div>
        <div class="hero-actions">
          <button class="btn" data-act="novo">＋ Lançar gasto</button>
          <button class="btn ghost" data-go="fatura">📥 Importar fatura</button>
        </div>
      </div>

      <div class="section-title">Onde foi o dinheiro</div>
      <div class="tiles">${D.state.cards.map(c => {
        const val = r.porCartao[c.id] || 0, qtd = r.tx.filter(t => t.card === c.id).length;
        if (!val && c.kind !== "fixas" && !qtd) return "";
        return `<button class="tile" data-card="${c.id}"><span class="t-name"><i class="dot" style="background:var(--${c.color})"></i>${U.esc(c.name)}</span><span class="t-val num">${U.brl(val)}</span><span class="t-sub">${qtd} ${qtd === 1 ? "item" : "itens"}</span></button>`;
      }).join("")}</div>

      <div class="grid g2" style="margin-top:16px">
        <div class="card">
          <h3>Categorias <small>${cats.length} no mês</small></h3>
          <div class="cat-list">${cats.slice(0, 8).map(([id, val]) => linhaCategoria(id, val, maxCat, r.qtdCat[id], m)).join("")}</div>
          ${cats.length > 8 ? `<button class="btn soft sm block" style="margin-top:10px" data-todas>Ver todas as ${cats.length}</button>` : ""}
        </div>
        <div class="stack">
          <div class="card">
            <h3>📌 Contas fixas <small>${pagas} de ${fixas.length} pagas</small></h3>
            <div class="bar ${pagas === fixas.length && fixas.length ? "good" : ""}"><i style="width:${fixas.length ? pagas / fixas.length * 100 : 0}%"></i></div>
            <div class="row between" style="margin-top:12px"><span class="muted small">Total das fixas</span><b class="num">${U.brl(D.total(fixas))}</b></div>
            <div class="row between"><span class="muted small">Falta pagar</span><b class="num">${U.brl(D.total(fixas.filter(t => !t.paid)))}</b></div>
            <button class="btn soft sm block" style="margin-top:12px" data-go="fixas">Marcar contas pagas</button>
          </div>
          <div class="card">
            <h3>💰 Entradas do mês <small>${entradas.length ? U.brl(totEnt) : "nenhuma"}</small></h3>
            ${entradas.map(i => `<div class="row between small" style="padding:4px 0"><span>${U.esc(i.desc)}</span><span class="row"><b class="num">${U.brl(i.amount)}</b><button class="icon-btn" style="width:28px;height:28px;font-size:14px" data-del-ent="${i.id}" aria-label="Remover">✕</button></span></div>`).join("")}
            <div class="row" style="margin-top:10px;gap:8px">
              <button class="btn soft sm" data-nova-ent>＋ Entrada</button>
              ${!entradas.length && D.state.incomes.some(i => i.month === U.addMes(m, -1)) ? `<button class="btn ghost sm" data-copia-ent>Copiar do mês anterior</button>` : ""}
            </div>
          </div>
        </div>
      </div>

      <div class="section-title">Hábitos e avisos do mês</div>
      <div class="insights">${insights(m, r).join("")}</div>`;
    v.querySelectorAll("[data-card]").forEach(b => b.onclick = () => { ui.filtroCartao = b.dataset.card; ui.filtroCat = ""; ir("lancamentos"); });
    v.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { ui.filtroCat = b.dataset.cat; ui.filtroCartao = ""; ui.modo = "lista"; ir("lancamentos"); });
    const todas = v.querySelector("[data-todas]");
    if (todas) todas.onclick = () => { ui.modo = "categoria"; ui.filtroCartao = ""; ui.filtroCat = ""; ir("lancamentos"); };
    v.querySelector("[data-nova-ent]").onclick = () => novaEntrada(m);
    const cp = v.querySelector("[data-copia-ent]");
    if (cp) cp.onclick = () => { D.state.incomes.filter(i => i.month === U.addMes(m, -1)).forEach(i => D.state.incomes.push(Object.assign({}, i, { id: U.uid(), month: m }))); D.save(); render(); };
    v.querySelectorAll("[data-del-ent]").forEach(b => b.onclick = () => { D.state.incomes = D.state.incomes.filter(i => i.id !== b.dataset.delEnt); D.save(); render(); });
  }

  function linhaCategoria(id, val, max, qtd, m) {
    const c = cat(id);
    const orc = c.budget || 0;
    const pct = orc ? val / orc * 100 : val / max * 100;
    const cls = orc ? (pct > 100 ? "bad" : pct > 85 ? "warn" : "good") : "";
    return `<button class="cat-row" data-cat="${id}">${icoCat(id)}<div><div class="c-name"><span>${U.esc(c.name)}</span><span class="num">${U.brl(val)}</span></div><div class="bar ${cls}"><i style="width:${Math.min(100, pct)}%"></i></div></div><div class="c-meta">${qtd}×${orc ? `<br>${Math.round(pct)}%` : ""}</div></button>`;
  }

  function insights(m, r) {
    const out = [];
    const bloco = (ico, titulo, texto, tom) => `<div class="insight"><span class="i-ico" ${tom ? `style="background:var(--${tom}-soft)"` : ""}>${ico}</span><div><b>${titulo}</b><p>${texto}</p></div></div>`;
    for (const id of ["lanches", "padaria", "restaurantes", "uber", "mercado"]) {
      const tot = r.porCat[id] || 0, qtd = r.qtdCat[id] || 0;
      if (!qtd) continue;
      const med = mediaCat(id, m);
      let txt = `${qtd} ${qtd === 1 ? "vez" : "vezes"} · ticket médio ${U.brl(tot / qtd)}`;
      let tom = "";
      if (med && med.total > 0) {
        const d = (tot - med.total) / med.total * 100;
        txt += `<br>${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(0)}% vs média de ${med.meses} meses (${U.brl(med.total, false)})`;
        tom = d > 25 ? "warn" : d < -10 ? "good" : "";
      }
      out.push(bloco(cat(id).icon, `${cat(id).name}: ${U.brl(tot)}`, txt, tom));
    }
    for (const c of D.state.categories) {
      if (!c.budget) continue;
      const v = r.porCat[c.id] || 0;
      if (v > c.budget) out.push(bloco("🚨", `${c.name} passou do limite`, `${U.brl(v)} de ${U.brl(c.budget)} (+${U.brl(v - c.budget)})`, "bad"));
      else if (v > c.budget * 0.85) out.push(bloco("⚠️", `${c.name} perto do limite`, `${U.brl(v)} de ${U.brl(c.budget)}`, "warn"));
    }
    const futuro = D.state.tx.filter(t => t.status === "previsto" && t.month > m && t.card !== "fixas" && t.inst);
    if (futuro.length) out.push(bloco("🗓️", `Parcelas a vencer: ${U.brl(D.total(futuro))}`, `Já comprometido nos próximos meses (${U.brl(D.total(futuro.filter(t => t.month === U.addMes(m, 1))))} em ${U.nomeMes(U.addMes(m, 1), true)})`));
    const maior = r.tx.filter(t => t.card !== "fixas").sort((a, b) => b.amount - a.amount)[0];
    if (maior) out.push(bloco("🔝", `Maior gasto: ${U.brl(maior.amount)}`, `${U.esc(maior.desc)} · ${U.esc(card(maior.card).name)}`));
    const freq = frequentes(m).slice(0, 2);
    for (const f of freq) out.push(bloco("🔁", `${U.esc(f.nome)}: ${f.qtd}× no mês`, `${U.brl(f.total)} somados — vale olhar se é hábito`));
    return out;
  }

  // Estabelecimentos que se repetem no mês (só onde há descrição da fatura)
  function frequentes(m) {
    const mapa = {};
    for (const t of D.doMes(m)) {
      if (t.source !== "fatura" && t.source !== "manual") continue;
      if (t.card === "fixas" || t.inst) continue;
      const k = U.chaveLoja(t.raw || t.desc);
      if (!k) continue;
      (mapa[k] = mapa[k] || { nome: t.desc, qtd: 0, total: 0 }).qtd++;
      mapa[k].total += t.amount;
    }
    return Object.values(mapa).filter(x => x.qtd >= 3).sort((a, b) => b.qtd - a.qtd);
  }

  function boasVindas() {
    const N = window.NUVEM;
    if (N.configurado() && !N.usuario) {
      setTimeout(() => { const b = document.getElementById("bvEntrar"); if (b) b.onclick = () => N.entrar(); });
      return `<div class="hero"><div class="label">Bem-vindos 👋</div><div class="big" style="font-size:30px">Contas da Família</div>
        <p style="opacity:.9;max-width:560px">Entre com a sua conta Google para ver as contas da família neste aparelho. Tudo o que for lançado aparece no celular e no computador.</p>
        <div class="hero-actions"><button class="btn" id="bvEntrar">Entrar com Google</button></div></div>`;
    }
    if (N.estado === "conectando") return `<div class="card empty"><div class="e-ico">☁️</div>Buscando os dados da família…</div>`;
    return `<div class="hero"><div class="label">Bem-vindos 👋</div><div class="big" style="font-size:30px">Contas da Família</div>
      <p style="opacity:.9;max-width:560px">Para começar, traga o histórico da planilha (Ajustes → Dados → Importar histórico) ou lance o primeiro gasto. Os dados ficam salvos neste aparelho.</p>
      <div class="hero-actions"><button class="btn" data-go="ajustes">Trazer histórico da planilha</button><button class="btn ghost" data-act="novo">＋ Primeiro lançamento</button></div></div>`;
  }

  function novaEntrada(m) {
    const s = abrirSheet(cabecaSheet("Nova entrada") + `
      <div class="field"><label>Descrição</label><input class="input" id="eDesc" placeholder="Salário" list="entSug"><datalist id="entSug">${[...new Set(D.state.incomes.map(i => i.desc))].map(d => `<option value="${U.esc(d)}">`).join("")}</datalist></div>
      <div class="field"><label>Valor</label><input class="input" id="eVal" inputmode="decimal" placeholder="0,00"></div>
      <div class="sheet-actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn" id="eOk">Salvar</button></div>`);
    s.querySelector("#eOk").onclick = () => {
      const amount = U.numero(s.querySelector("#eVal").value), desc = s.querySelector("#eDesc").value.trim() || "Entrada";
      if (!amount) return toast("Informe o valor");
      D.state.incomes.push({ id: U.uid(), month: m, desc, amount }); D.save(); fecharSheet(); render();
    };
  }

  // ================= LANÇAMENTOS =================
  function telaLancamentos(v) {
    const m = ui.month;
    let tx = D.doMes(m);
    const q = U.semAcento(ui.busca.toLowerCase());
    if (q) tx = tx.filter(t => U.semAcento((t.desc + " " + (t.raw || "") + " " + cat(t.cat).name + " " + (t.person || "") + " " + (t.note || "")).toLowerCase()).includes(q));
    if (ui.filtroCartao) tx = tx.filter(t => t.card === ui.filtroCartao);
    if (ui.filtroCat) tx = tx.filter(t => t.cat === ui.filtroCat);
    const usados = D.state.cards.filter(c => D.doMes(m).some(t => t.card === c.id));
    v.innerHTML = `
      <div class="toolbar">
        <label class="search">🔎<input id="busca" placeholder="Buscar (ex.: ifood, padaria, farmácia)" value="${U.esc(ui.busca)}"></label>
        <div class="seg" role="tablist">
          ${[["cartao", "Como na planilha"], ["categoria", "Por categoria"], ["lista", "Por data"]].map(([k, n]) => `<button class="${ui.modo === k ? "on" : ""}" data-modo="${k}">${n}</button>`).join("")}
        </div>
        <button class="btn sm" data-act="novo">＋ Novo</button>
      </div>
      <div class="chips" style="margin-bottom:16px">
        <button class="chip ${!ui.filtroCartao && !ui.filtroCat ? "on" : ""}" data-fc="">Todos · ${U.brl(D.total(D.doMes(m)), false)}</button>
        ${usados.map(c => `<button class="chip ${ui.filtroCartao === c.id ? "on" : ""}" data-fc="${c.id}"><i class="dot" style="background:var(--${c.color})"></i>${U.esc(c.name)}</button>`).join("")}
        ${ui.filtroCat ? `<button class="chip on" data-fcat="">${cat(ui.filtroCat).icon} ${U.esc(cat(ui.filtroCat).name)} ✕</button>` : ""}
      </div>
      <div id="txArea"></div>`;
    const area = v.querySelector("#txArea");
    if (!tx.length) area.innerHTML = `<div class="card empty"><div class="e-ico">🗒️</div>Nada lançado ${q || ui.filtroCartao || ui.filtroCat ? "com esse filtro" : "neste mês"}.<br><br><button class="btn soft sm" data-act="novo">＋ Lançar gasto</button></div>`;
    else if (ui.modo === "lista") {
      const ord = tx.slice().sort((a, b) => (b.date || b.month + "-00").localeCompare(a.date || a.month + "-00") || b.amount - a.amount);
      area.innerHTML = grupo("Todos os lançamentos", "", ord);
    } else {
      const chave = ui.modo === "cartao" ? "card" : "cat";
      const ids = ui.modo === "cartao" ? D.state.cards.map(c => c.id) : Object.entries(tx.reduce((a, t) => (a[t.cat] = (a[t.cat] || 0) + t.amount, a), {})).sort((a, b) => b[1] - a[1]).map(x => x[0]);
      area.innerHTML = ids.map(id => {
        const l = tx.filter(t => t[chave] === id);
        if (!l.length) return "";
        const ord = ui.modo === "cartao" ? l.sort((a, b) => cat(a.cat).name.localeCompare(cat(b.cat).name) || (a.date || "").localeCompare(b.date || "")) : l.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const head = ui.modo === "cartao" ? `<i class="dot" style="background:var(--${card(id).color})"></i>${U.esc(card(id).name)}` : `${cat(id).icon} ${U.esc(cat(id).name)}`;
        return grupo(head, id, ord);
      }).join("");
    }
    const busca = v.querySelector("#busca");
    busca.oninput = () => { ui.busca = busca.value; const pos = busca.selectionStart; telaLancamentos(v); const b = v.querySelector("#busca"); b.focus(); b.setSelectionRange(pos, pos); };
    v.querySelectorAll("[data-modo]").forEach(b => b.onclick = () => { ui.modo = b.dataset.modo; guardarUI(); render(); });
    v.querySelectorAll("[data-fc]").forEach(b => b.onclick = () => { ui.filtroCartao = b.dataset.fc; if (!b.dataset.fc) ui.filtroCat = ""; render(); });
    v.querySelectorAll("[data-fcat]").forEach(b => b.onclick = () => { ui.filtroCat = ""; render(); });
    v.querySelectorAll("[data-tx]").forEach(b => b.onclick = () => abrirLancamento(D.state.tx.find(t => t.id === b.dataset.tx)));
  }

  function grupo(head, id, lista) {
    return `<div class="group"><div class="group-head"><span class="gh-left">${head}<span class="tag">${lista.length}</span></span><span class="gh-total num">${U.brl(D.total(lista))}</span></div>
      <div class="tx-list">${lista.map(linhaTx).join("")}</div></div>`;
  }
  function textoParcela(t) {
    if (!t.inst) return "";
    if (t.inst.left) return `<span class="tag p">faltam ${t.inst.of - t.inst.n + 1}</span>`;
    return `<span class="tag p">${t.inst.n}/${t.inst.of}</span>`;
  }
  function linhaTx(t) {
    const data = t.date ? t.date.slice(8, 10) + "/" + t.date.slice(5, 7) : "";
    return `<button class="tx ${t.status === "previsto" ? "previsto" : ""}" data-tx="${t.id}">${icoCat(t.cat)}
      <div style="min-width:0"><div class="t-desc">${U.esc(t.desc)}</div>
      <div class="t-meta">${U.esc(cat(t.cat).name)}${t.person && t.person !== "Família" ? " · " + U.esc(t.person) : ""}${data ? " · " + data : ""} ${textoParcela(t)}
      ${t.status === "previsto" ? `<span class="tag w">previsto</span>` : ""}${t.card === "fixas" ? (t.paid ? `<span class="tag g">pago</span>` : `<span class="tag">a pagar</span>`) : ""}</div></div>
      <div class="t-amt num">${U.brl(t.amount)}</div></button>`;
  }

  // ---------- formulário de lançamento ----------
  function abrirLancamento(t) {
    const novo = !t;
    const f = t ? JSON.parse(JSON.stringify(t)) : {
      month: ui.month, date: new Date().toISOString().slice(0, 10), desc: "", amount: 0, card: ui.filtroCartao || "c6",
      cat: ui.filtroCat || "mercado", person: "Família", status: "confirmado",
    };
    if (novo && f.date.slice(0, 7) !== ui.month) f.date = ui.month + "-01";
    const catOrig = f.cat;
    const grupoParc = t && t.inst && t.inst.group;
    const s = abrirSheet(cabecaSheet(novo ? "Novo lançamento" : "Editar lançamento") + `
      <div class="field"><input class="input amount-big num" id="fVal" inputmode="decimal" placeholder="R$ 0,00" value="${f.amount ? String(f.amount).replace(".", ",") : ""}"></div>
      <div class="field"><label>Descrição</label><input class="input" id="fDesc" value="${U.esc(f.desc)}" placeholder="Ex.: iFood, padaria, farmácia…" list="descSug">
        <datalist id="descSug">${[...new Set(D.state.tx.slice(-400).map(x => x.desc))].slice(0, 200).map(d => `<option value="${U.esc(d)}">`).join("")}</datalist></div>
      <div class="field"><span class="lbl">Categoria</span><div class="pick-grid" id="fCat">${D.state.categories.map(c => `<button class="pick ${f.cat === c.id ? "on" : ""}" data-v="${c.id}"><span class="p-ico">${c.icon}</span>${U.esc(c.name)}</button>`).join("")}</div></div>
      <div class="field"><span class="lbl">Pago com</span><div class="chips wrap" id="fCard" style="flex-wrap:wrap">${D.state.cards.map(c => `<button class="chip ${f.card === c.id ? "on" : ""}" data-v="${c.id}"><i class="dot" style="background:var(--${c.color})"></i>${U.esc(c.name)}</button>`).join("")}</div></div>
      <div class="field"><span class="lbl">De quem</span><div class="chips" id="fPes" style="flex-wrap:wrap">${D.state.people.map(p => `<button class="chip ${f.person === p ? "on" : ""}" data-v="${U.esc(p)}">${U.esc(p)}</button>`).join("")}</div></div>
      <div class="two">
        <div class="field"><label>Data da compra</label><input class="input" type="date" id="fData" value="${f.date || ""}"></div>
        <div class="field"><label>Entra no mês</label><input class="input" type="month" id="fMes" value="${f.month}"></div>
      </div>
      <div class="two">
        <div class="field"><label>Parcela</label><input class="input" id="fParc" placeholder="à vista (ou 1/10)" value="${f.inst && !f.inst.left ? f.inst.n + "/" + f.inst.of : ""}" ${f.inst && f.inst.left ? "disabled" : ""}></div>
        <div class="field"><label>Situação</label><select class="input" id="fSit">
          <option value="confirmado" ${f.status === "confirmado" ? "selected" : ""}>Lançado</option>
          <option value="previsto" ${f.status === "previsto" ? "selected" : ""}>Previsto</option></select></div>
      </div>
      ${f.card === "fixas" || f.recId ? `<label class="row" style="margin-bottom:12px"><input type="checkbox" id="fPago" ${f.paid ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--good)"> Conta paga</label>` : ""}
      <div class="field"><label>Observação</label><input class="input" id="fNota" value="${U.esc(f.note || "")}" placeholder="opcional"></div>
      ${grupoParc ? `<label class="row small" style="margin-bottom:8px"><input type="checkbox" id="fTodas" checked style="accent-color:var(--primary)"> Aplicar às próximas parcelas também</label>` : ""}
      ${t && t.raw && t.raw !== t.desc ? `<p class="small muted">Na fatura: ${U.esc(t.raw)}</p>` : ""}
      <div class="sheet-actions">
        ${novo ? "" : `<button class="btn danger" id="fDel">Excluir</button>`}
        <button class="btn" id="fOk">${novo ? "Lançar" : "Salvar"}</button>
      </div>`);
    const pick = (sel, campo) => s.querySelectorAll(sel + " [data-v]").forEach(b => b.onclick = () => {
      s.querySelectorAll(sel + " [data-v]").forEach(x => x.classList.remove("on")); b.classList.add("on"); f[campo] = b.dataset.v;
      if (campo === "card") ajustarMes();
    });
    pick("#fCat", "cat"); pick("#fCard", "card"); pick("#fPes", "person");
    const desc = s.querySelector("#fDesc");
    desc.addEventListener("change", () => {
      if (!novo) return;
      const c = D.classificar(desc.value);
      const ant = D.state.tx.slice().reverse().find(x => x.desc.toLowerCase() === desc.value.toLowerCase());
      const alvo = ant ? ant.cat : c.cat !== "outros" ? c.cat : null;
      if (alvo) { f.cat = alvo; s.querySelectorAll("#fCat [data-v]").forEach(x => x.classList.toggle("on", x.dataset.v === alvo)); }
    });
    const ajustarMes = () => { const d = s.querySelector("#fData").value; if (d && novo) s.querySelector("#fMes").value = D.mesDaFatura(f.card, d); };
    s.querySelector("#fData").onchange = ajustarMes;
    if (novo) setTimeout(() => s.querySelector("#fVal").focus(), 250);
    s.querySelector("#fOk").onclick = () => {
      const amount = U.numero(s.querySelector("#fVal").value);
      if (!amount) return toast("Informe o valor");
      f.amount = U.round(amount);
      f.desc = desc.value.trim() || cat(f.cat).name;
      f.date = s.querySelector("#fData").value || null;
      f.month = s.querySelector("#fMes").value || ui.month;
      f.status = s.querySelector("#fSit").value;
      f.note = s.querySelector("#fNota").value.trim();
      const pago = s.querySelector("#fPago"); if (pago) f.paid = pago.checked;
      const pm = s.querySelector("#fParc").value.match(/(\d+)\s*(?:\/|de)\s*(\d+)/);
      if (novo) {
        if (pm && +pm[2] > 1) f.inst = { n: +pm[1], of: +pm[2] };
        D.adicionar(f);
        toast(f.inst ? `Lançado, com ${f.inst.of - f.inst.n} parcelas futuras` : "Lançado ✓");
      } else {
        const orig = D.state.tx.find(x => x.id === t.id);
        if (pm && !(orig.inst && orig.inst.left)) f.inst = Object.assign({}, orig.inst || {}, { n: +pm[1], of: +pm[2] });
        Object.assign(orig, f);
        const todas = s.querySelector("#fTodas");
        if (grupoParc && todas && todas.checked) {
          D.state.tx.filter(x => x.inst && x.inst.group === grupoParc && x.inst.n > orig.inst.n).forEach(x => Object.assign(x, { amount: f.amount, desc: f.desc, cat: f.cat, card: f.card, person: f.person }));
        }
        if (f.cat !== catOrig && (orig.source === "fatura" || orig.source === "manual") && D.aprender(orig.raw || orig.desc, f.cat, f.person)) toast(`Vou lembrar: “${U.chaveLoja(orig.raw || orig.desc)}” é ${cat(f.cat).name}`);
        else toast("Salvo ✓");
      }
      D.save(); fecharSheet(); render();
    };
    const del = s.querySelector("#fDel");
    if (del) del.onclick = () => {
      const copia = JSON.parse(JSON.stringify(D.state.tx));
      D.state.tx = D.state.tx.filter(x => x.id !== t.id);
      let extra = 0;
      if (grupoParc) extra = D.removerParcelasFuturas(t);
      if (t.recId) (D.state.skips = D.state.skips || []).push(t.recId + "@" + t.month);
      D.save(); fecharSheet(); render();
      toast(extra ? `Excluído (e ${extra} parcelas futuras)` : "Excluído", "Desfazer", () => { D.state.tx = copia; D.save(); render(); });
    };
  }

  // ================= CONTAS FIXAS =================
  function telaFixas(v) {
    const m = ui.month;
    const fixas = D.doMes(m).filter(t => t.card === "fixas").sort((a, b) => (a.paid - b.paid) || (a.dueDay || 99) - (b.dueDay || 99) || a.desc.localeCompare(b.desc));
    const tot = D.total(fixas), pago = D.total(fixas.filter(t => t.paid));
    const emp = D.state.recurring.filter(r => r.active && r.inst);
    v.innerHTML = `
      <div class="stats">
        <div class="card"><div class="muted small">Total das fixas</div><div class="stat-v num">${U.brl(tot)}</div></div>
        <div class="card"><div class="muted small">Já pago</div><div class="stat-v num" style="color:var(--good)">${U.brl(pago)}</div></div>
        <div class="card"><div class="muted small">Falta pagar</div><div class="stat-v num">${U.brl(tot - pago)}</div></div>
      </div>
      <div class="row between wrap" style="margin-bottom:10px;gap:8px"><div class="section-title" style="margin:0">Contas de ${U.nomeMes(m)}</div>
        <div class="row"><button class="btn ghost sm" id="gerRec">Gerenciar contas fixas</button><button class="btn sm" id="novaFixa">＋ Conta</button></div></div>
      ${fixas.length ? `<div class="tx-list">${fixas.map(t => `
        <div class="fix ${t.paid ? "paid" : ""}">
          <button class="check ${t.paid ? "on" : ""}" data-pagar="${t.id}" aria-label="Marcar como pago">✓</button>
          <button style="text-align:left;min-width:0" data-tx="${t.id}"><div class="f-name">${cat(t.cat).icon} ${U.esc(t.desc)}</div>
            <div class="small muted">${U.esc(cat(t.cat).name)}${t.inst ? ` · parcela ${t.inst.n} de ${t.inst.of}` : ""}${t.dueDay ? ` · vence dia ${t.dueDay}` : ""}${t.status === "previsto" && !t.paid ? " · valor do mês passado" : ""}</div></button>
          <input class="amt-input num" data-val="${t.id}" inputmode="decimal" value="${t.amount.toFixed(2).replace(".", ",")}">
        </div>`).join("")}</div>`
        : `<div class="card empty"><div class="e-ico">📌</div>${m < (D.state.settings.recFrom || "") ? "Mês do histórico da planilha sem fixas." : "Nenhuma conta fixa ainda."}<br><br><button class="btn soft sm" id="novaFixa2">＋ Cadastrar conta fixa</button></div>`}
      ${emp.length ? `<div class="section-title">Empréstimos e parcelamentos fixos</div><div class="grid g2">${emp.map(r => {
        const n = r.inst.n + U.difMes(r.inst.month, m), of = r.inst.of, val = r.amount;
        const ult = D.state.tx.filter(t => t.recId === r.id).sort((a, b) => a.month < b.month ? 1 : -1)[0];
        const valor = ult ? ult.amount : val;
        return `<div class="card"><h3>${U.esc(r.name)} <small>${Math.min(n, of)} de ${of}</small></h3><div class="bar"><i style="width:${Math.min(100, n / of * 100)}%"></i></div>
          <div class="row between small" style="margin-top:10px"><span class="muted">Faltam ${Math.max(0, of - n)} × ${U.brl(valor)}</span><b class="num">${U.brl(Math.max(0, of - n) * valor)}</b></div>
          <div class="small muted">Termina em ${U.nomeMes(U.addMes(m, of - n))}</div></div>`;
      }).join("")}</div>` : ""}
      <div class="section-title">Acertos e dívidas</div>
      <div class="grid g2">${D.state.debts.map(d => {
        const pago = d.pays.reduce((s, p) => s + p.amount, 0);
        return `<div class="card"><h3>${U.esc(d.name)} <small>${U.brl(d.total)}</small></h3><div class="bar good"><i style="width:${Math.min(100, pago / d.total * 100)}%"></i></div>
          <div class="row between small" style="margin-top:10px"><span class="muted">Pago ${U.brl(pago)}</span><b>Falta ${U.brl(d.total - pago)}</b></div>
          <div class="small muted" style="margin-top:6px">${d.pays.map(p => `${p.date.split("-").reverse().slice(0, 2).join("/")}: ${U.brl(p.amount, false)}`).join(" · ")}</div>
          <div class="row" style="margin-top:12px"><button class="btn soft sm" data-pag-div="${d.id}">＋ Registrar pagamento</button><button class="btn ghost sm" data-del-div="${d.id}">Remover</button></div></div>`;
      }).join("")}
      <button class="card" id="novaDiv" style="border:2px dashed var(--line);box-shadow:none;background:transparent;color:var(--text-2);font-weight:700">＋ Novo acerto / dívida</button></div>`;
    v.querySelectorAll("[data-pagar]").forEach(b => b.onclick = () => {
      const t = D.state.tx.find(x => x.id === b.dataset.pagar); t.paid = !t.paid; if (t.paid) t.status = "confirmado"; D.save(); render();
    });
    v.querySelectorAll("[data-val]").forEach(i => i.onchange = () => {
      const t = D.state.tx.find(x => x.id === i.dataset.val); t.amount = U.round(U.numero(i.value)); t.status = "confirmado"; D.save(); render(); toast("Valor atualizado");
    });
    v.querySelectorAll("[data-tx]").forEach(b => b.onclick = () => abrirLancamento(D.state.tx.find(t => t.id === b.dataset.tx)));
    const nf = () => editarFixa(null);
    v.querySelector("#novaFixa").onclick = nf;
    const nf2 = v.querySelector("#novaFixa2"); if (nf2) nf2.onclick = nf;
    v.querySelector("#gerRec").onclick = gerenciarFixas;
    v.querySelector("#novaDiv").onclick = () => editarDivida();
    v.querySelectorAll("[data-pag-div]").forEach(b => b.onclick = () => pagarDivida(b.dataset.pagDiv));
    v.querySelectorAll("[data-del-div]").forEach(b => b.onclick = () => { if (confirm("Remover este acerto?")) { D.state.debts = D.state.debts.filter(d => d.id !== b.dataset.delDiv); D.save(); render(); } });
  }

  function gerenciarFixas() {
    const s = abrirSheet(cabecaSheet("Contas fixas") + `<p class="small muted">Cada mês novo recebe estas contas com o valor do mês anterior. Desative a que acabou.</p>
      <div class="tx-list">${D.state.recurring.map(r => `<button class="tx" data-rec="${r.id}" style="${r.active ? "" : "opacity:.5"}">${icoCat(r.cat)}<div><div class="t-desc">${U.esc(r.name)}</div><div class="t-meta">${r.active ? "ativa" : "desativada"}${r.inst ? ` · ${r.inst.of} parcelas` : ""}${r.dueDay ? ` · dia ${r.dueDay}` : ""}</div></div><div class="t-amt num">${U.brl(r.amount)}</div></button>`).join("")}</div>
      <div class="sheet-actions"><button class="btn" id="rNova">＋ Nova conta fixa</button></div>`);
    s.querySelectorAll("[data-rec]").forEach(b => b.onclick = () => editarFixa(D.state.recurring.find(r => r.id === b.dataset.rec)));
    s.querySelector("#rNova").onclick = () => editarFixa(null);
  }

  function editarFixa(r) {
    const novo = !r;
    const f = r ? Object.assign({}, r) : { id: U.uid(), name: "", amount: 0, cat: "casa_contas", person: "Família", active: true, card: "fixas", dueDay: 0 };
    const nAtual = f.inst ? f.inst.n + U.difMes(f.inst.month, ui.month) : "";
    const s = abrirSheet(cabecaSheet(novo ? "Nova conta fixa" : "Editar conta fixa") + `
      <div class="field"><label>Nome</label><input class="input" id="rNome" value="${U.esc(f.name)}" placeholder="Luz, Internet, Escola…"></div>
      <div class="two"><div class="field"><label>Valor padrão</label><input class="input num" id="rVal" inputmode="decimal" value="${f.amount ? String(f.amount).replace(".", ",") : ""}"></div>
      <div class="field"><label>Dia do vencimento</label><input class="input" id="rDia" inputmode="numeric" value="${f.dueDay || ""}" placeholder="opcional"></div></div>
      <div class="field"><label>Categoria</label><select class="input" id="rCat">${D.state.categories.map(c => `<option value="${c.id}" ${c.id === f.cat ? "selected" : ""}>${c.icon} ${U.esc(c.name)}</option>`).join("")}</select></div>
      <div class="two"><div class="field"><label>Parcela atual (${U.nomeMes(ui.month, true)})</label><input class="input" id="rParc" value="${f.inst ? nAtual + "/" + f.inst.of : ""}" placeholder="não é parcelado"></div>
      <div class="field"><label>Situação</label><select class="input" id="rAtiva"><option value="1" ${f.active ? "selected" : ""}>Ativa</option><option value="0" ${!f.active ? "selected" : ""}>Desativada</option></select></div></div>
      <div class="sheet-actions">${novo ? "" : `<button class="btn danger" id="rDel">Excluir</button>`}<button class="btn" id="rOk">Salvar</button></div>`);
    s.querySelector("#rOk").onclick = () => {
      f.name = s.querySelector("#rNome").value.trim();
      if (!f.name) return toast("Dê um nome");
      f.amount = U.round(U.numero(s.querySelector("#rVal").value));
      f.dueDay = parseInt(s.querySelector("#rDia").value) || 0;
      f.cat = s.querySelector("#rCat").value;
      f.active = s.querySelector("#rAtiva").value === "1";
      const pm = s.querySelector("#rParc").value.match(/(\d+)\s*(?:\/|de)\s*(\d+)/);
      f.inst = pm ? { n: +pm[1], of: +pm[2], month: ui.month } : undefined;
      if (novo) { f.from = ui.month; D.state.recurring.push(f); }
      else Object.assign(r, f);
      // reflete no mês aberto
      const t = D.state.tx.find(x => x.recId === f.id && x.month === ui.month);
      if (t && !t.paid) Object.assign(t, { desc: f.name, cat: f.cat, dueDay: f.dueDay, amount: novo ? f.amount : t.amount });
      if (t && pm) t.inst = { n: +pm[1], of: +pm[2] };
      if (!f.active) D.state.tx = D.state.tx.filter(x => !(x.recId === f.id && x.month > ui.month && x.status === "previsto"));
      if (ui.month >= (D.state.settings.recFrom || "")) D.garantirFixas(ui.month);
      D.save(); fecharSheet(); render(); toast("Conta fixa salva");
    };
    const del = s.querySelector("#rDel");
    if (del) del.onclick = () => {
      if (!confirm("Excluir esta conta fixa? Os meses já lançados ficam como estão.")) return;
      D.state.recurring = D.state.recurring.filter(x => x.id !== f.id);
      D.state.tx = D.state.tx.filter(x => !(x.recId === f.id && x.status === "previsto" && !x.paid && x.month >= U.mesAtual()));
      D.save(); fecharSheet(); render();
    };
  }

  function editarDivida() {
    const s = abrirSheet(cabecaSheet("Novo acerto / dívida") + `
      <div class="field"><label>Descrição</label><input class="input" id="dNome" placeholder="Ex.: Empréstimo de um parente"></div>
      <div class="field"><label>Valor total</label><input class="input num" id="dTot" inputmode="decimal"></div>
      <div class="sheet-actions"><button class="btn" id="dOk">Salvar</button></div>`);
    s.querySelector("#dOk").onclick = () => {
      const total = U.numero(s.querySelector("#dTot").value), name = s.querySelector("#dNome").value.trim();
      if (!total || !name) return toast("Preencha nome e valor");
      D.state.debts.push({ id: U.uid(), name, total, pays: [] }); D.save(); fecharSheet(); render();
    };
  }
  function pagarDivida(id) {
    const d = D.state.debts.find(x => x.id === id);
    const s = abrirSheet(cabecaSheet("Pagamento — " + U.esc(d.name)) + `
      <div class="two"><div class="field"><label>Valor</label><input class="input num" id="pVal" inputmode="decimal"></div>
      <div class="field"><label>Data</label><input class="input" type="date" id="pData" value="${new Date().toISOString().slice(0, 10)}"></div></div>
      <div class="sheet-actions"><button class="btn" id="pOk">Registrar</button></div>`);
    s.querySelector("#pOk").onclick = () => {
      const amount = U.numero(s.querySelector("#pVal").value);
      if (!amount) return toast("Informe o valor");
      d.pays.push({ date: s.querySelector("#pData").value, amount }); D.save(); fecharSheet(); render();
    };
  }

  // ================= IMPORTAR FATURA =================
  function telaFatura(v) {
    if (!ui.imp) ui.imp = { etapa: 1, card: "c6", month: ui.month, itens: [], tipo: "", nome: "" };
    const imp = ui.imp;
    const passos = ["Escolher fatura", "Conferir e classificar", "Pronto"];
    let html = `<div class="steps">${passos.map((p, i) => `<span class="step ${imp.etapa >= i + 1 ? "on" : ""}"><i>${i + 1}</i>${p}</span>${i < 2 ? '<span class="muted">—</span>' : ""}`).join("")}</div>`;
    if (imp.etapa === 1) {
      html += `<div class="grid g2">
        <div class="card">
          <h3>1. Qual fatura?</h3>
          <div class="field"><span class="lbl">Cartão</span><div class="chips" style="flex-wrap:wrap" id="iCard">${D.state.cards.filter(c => c.kind !== "fixas").map(c => `<button class="chip ${imp.card === c.id ? "on" : ""}" data-v="${c.id}"><i class="dot" style="background:var(--${c.color})"></i>${U.esc(c.name)}</button>`).join("")}</div></div>
          <div class="field"><label>Mês das compras (igual à aba da planilha: vence em outubro → setembro)</label><input class="input" type="month" id="iMes" value="${imp.month}"></div>
          <p class="small muted">Fatura parcial (ainda aberta) pode ser importada quantas vezes quiser: o que já entrou é reconhecido e não duplica.</p>
        </div>
        <div class="card">
          <h3>2. Traga a fatura</h3>
          <label class="drop" id="drop"><div class="d-ico">📄</div><b>Solte aqui o PDF, CSV, OFX ou Excel</b><div class="small muted">ou toque para escolher o arquivo</div>
            <input type="file" id="iFile" accept=".pdf,.csv,.ofx,.qfx,.xlsx,.xls,.txt,.tsv" hidden></label>
          <div class="field" style="margin-top:14px"><label>…ou cole o texto da fatura (copiado do app do banco ou a resposta do Claude)</label>
            <textarea class="input" id="iTexto" placeholder="05/10  IFOOD *RESTAURANTE      45,90&#10;07/10  DROGASIL 2/3          89,00"></textarea></div>
          <div class="row wrap"><button class="btn" id="iLer">Ler texto colado</button><button class="btn ghost" id="iClaude">🤖 Copiar pedido para o Claude</button></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px"><h3>Como funciona a leitura</h3>
        <p class="small" style="margin:0;color:var(--text-2)">O app lê sozinho, sem inteligência artificial: PDF com texto (a maioria das faturas baixadas do app do banco), CSV/Excel (C6, Nubank, Inter e outros exportam) e OFX. Se o PDF vier como imagem ou a leitura sair estranha, use o botão “Copiar pedido para o Claude”: cole o pedido no Claude junto com o PDF ou print da fatura, copie a resposta e cole aqui no campo de texto.</p></div>`;
      v.innerHTML = html;
      v.querySelectorAll("#iCard [data-v]").forEach(b => b.onclick = () => { imp.card = b.dataset.v; telaFatura(v); });
      v.querySelector("#iMes").onchange = e => { imp.month = e.target.value; };
      const drop = v.querySelector("#drop"), inp = v.querySelector("#iFile");
      inp.onchange = () => inp.files[0] && lerArquivo(inp.files[0]);
      drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
      drop.ondragleave = () => drop.classList.remove("over");
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); e.dataTransfer.files[0] && lerArquivo(e.dataTransfer.files[0]); };
      v.querySelector("#iLer").onclick = () => {
        const txt = v.querySelector("#iTexto").value;
        if (!txt.trim()) return toast("Cole o texto da fatura");
        prepararRevisao(F.lerTextoOuCSV(txt, imp.month), "Texto colado", "texto colado", txt);
      };
      v.querySelector("#iClaude").onclick = async () => {
        try { await navigator.clipboard.writeText(F.PROMPT_CLAUDE); toast("Pedido copiado. Cole no Claude junto com a fatura"); }
        catch (e) { abrirSheet(cabecaSheet("Pedido para o Claude") + `<textarea class="input" style="min-height:260px">${U.esc(F.PROMPT_CLAUDE)}</textarea>`); }
      };
    } else if (imp.etapa === 2) {
      v.innerHTML = html + revisaoHTML();
      ligarRevisao(v);
    } else {
      v.innerHTML = html + `<div class="card empty"><div class="e-ico">🎉</div><b style="font-size:18px;color:var(--text)">${imp.resultado}</b><br><br>
        <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap"><button class="btn" id="iVer">Ver lançamentos</button><button class="btn ghost" id="iOutra">Importar outra fatura</button></div></div>`;
      v.querySelector("#iVer").onclick = () => { ui.month = imp.month; ui.filtroCartao = imp.card; ui.imp = null; ir("lancamentos"); };
      v.querySelector("#iOutra").onclick = () => { ui.imp = null; render(); };
    }
  }

  async function lerArquivo(file, senha) {
    const imp = ui.imp;
    imp.month = $("#iMes") ? $("#iMes").value : imp.month;
    toast("Lendo " + file.name + "…");
    try {
      const r = await F.lerArquivo(file, imp.month, senha);
      if (!r.itens.length) {
        abrirSheet(cabecaSheet("Não achei lançamentos") + `<p>O arquivo foi aberto (${r.tipo}), mas não reconheci as linhas de compra. ${r.tipo === "PDF" && !r.texto.trim() ? "O PDF parece ser imagem (escaneado)." : ""}</p>
          <p class="small muted">Use o botão “Copiar pedido para o Claude” e cole a resposta no campo de texto. Se puder, me mande este arquivo para eu ensinar o app a ler esse formato.</p>
          ${r.texto ? `<details class="tbl"><summary>Ver o texto que saiu do arquivo</summary><textarea class="input" style="min-height:220px">${U.esc(r.texto.slice(0, 20000))}</textarea></details>` : ""}`);
        return;
      }
      if (r.mes && r.mes !== imp.month) {
        imp.month = r.mes; ui.month = r.mes;
        toast(`Vencimento ${r.venc.split("-").reverse().join("/")}: entra em ${U.nomeMes(r.mes)}, como na planilha`);
      }
      prepararRevisao(r.itens, r.tipo, file.name, r.texto);
    } catch (e) {
      if (e && e.name === "PasswordException") {
        const senhaNova = prompt("Este PDF tem senha (geralmente os primeiros dígitos do CPF). Digite a senha para abrir:");
        if (senhaNova) return lerArquivo(file, senhaNova);
        return;
      }
      console.error(e);
      toast("Não consegui ler: " + (e.message || e));
    }
  }

  function prepararRevisao(itens, tipo, nome, texto) {
    const imp = ui.imp;
    imp.tipo = tipo; imp.nome = nome; imp.texto = texto || "";
    // O mês já tem esta fatura resumida, vinda da planilha? Os valores iguais dizem a categoria
    // que a família usou, e a fatura detalhada pode substituir o resumo.
    imp.planilha = D.state.tx.filter(t => t.card === imp.card && t.month === imp.month && t.source === "planilha" && t.status === "confirmado");
    imp.substituir = imp.planilha.length > 0;
    const livres = imp.planilha.slice();
    imp.itens = itens.map((it, i) => {
      const c = D.classificar(it.desc);
      const match = D.acharIgual(it, imp.card, imp.month);
      let catId = c.cat, person = c.person || "", regra = c.regra;
      if (match && match.tipo === "previsto" && (c.cat === "outros" || match.t.source === "planilha")) { catId = match.t.cat; person = person || match.t.person; }
      const k = livres.findIndex(t => Math.abs(t.amount - it.amount) < 0.015);
      if (k >= 0 && regra !== "aprendida") { catId = livres[k].cat; regra = "planilha"; if (livres[k].person !== "Família") person = person || livres[k].person; livres.splice(k, 1); }
      // titular do cartão na fatura ("MARIA S SILVA ·1234") -> pessoa
      if (!person && it.titular) person = D.state.people.find(p => U.semAcento(it.titular).toUpperCase().startsWith(U.semAcento(p).toUpperCase())) || "";
      return Object.assign({}, it, { i, cat: catId, catAuto: c.cat, person: person || "Família", regra, match, on: !it.skip && !(match && match.tipo === "duplicado") });
    });
    imp.etapa = 2;
    render();
  }

  function revisaoHTML() {
    const imp = ui.imp, its = imp.itens;
    const sel = its.filter(i => i.on), total = D.total(sel);
    const dup = its.filter(i => i.match && i.match.tipo === "duplicado").length, prev = its.filter(i => i.match && i.match.tipo === "previsto").length;
    const semCat = sel.filter(i => i.cat === "outros").length;
    const opcoesCat = id => D.state.categories.map(c => `<option value="${c.id}" ${c.id === id ? "selected" : ""}>${c.icon} ${U.esc(c.name)}</option>`).join("");
    const status = it => it.skip ? `<span class="tag">${it.skip}</span>` : it.match ? (it.match.tipo === "duplicado" ? `<span class="tag w">já lançado</span>` : `<span class="tag p">parcela prevista</span>`) : it.regra === "aprendida" ? `<span class="tag g">aprendido</span>` : it.regra === "planilha" ? `<span class="tag g">como na planilha</span>` : "";
    const quem = it => it.titular ? `<span class="tag" title="${U.esc(it.titular)}">💳 ${U.esc(it.titular.split(" ·")[1] || "")}</span>` : "";
    const data = d => d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "";
    return `
      <div class="card" style="margin-bottom:14px"><div class="row between wrap" style="gap:12px">
        <div><b>${U.esc(card(imp.card).name)} · ${U.nomeMes(imp.month)}</b><div class="small muted">${U.esc(imp.nome)} (${imp.tipo}) · ${its.length} linhas lidas${dup ? ` · ${dup} já estavam no app` : ""}${prev ? ` · ${prev} confirmam parcelas previstas` : ""}</div></div>
        <div style="text-align:right"><div class="small muted">${sel.length} selecionados</div><div class="stat-v num">${U.brl(total)}</div></div></div>
        ${imp.planilha.length ? `<label class="banner info" style="margin:12px 0 0;cursor:pointer"><input type="checkbox" id="iSubst" ${imp.substituir ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--primary)">
          <span>${U.nomeMes(imp.month)} já tem <b>${imp.planilha.length} lançamentos de ${U.esc(card(imp.card).name)} vindos da planilha</b> (${U.brl(D.total(imp.planilha))}). Trocar pelo detalhe desta fatura — as categorias da planilha foram aproveitadas.</span></label>` : ""}
        <p class="small muted" style="margin:10px 0 0">Confira o total com o da fatura. ${semCat ? `<b style="color:var(--warn)">${semCat} sem categoria</b> — escolha e o app aprende para as próximas.` : "Trocar uma categoria ensina o app para as próximas faturas."}</p>
      </div>
      <div class="card" style="padding:10px">
        <div class="imp-scroll">
          <table class="imp-table"><thead><tr><th><input type="checkbox" id="iTodos" ${sel.length === its.length ? "checked" : ""}></th><th>Data</th><th>Descrição</th><th>Parcela</th><th style="text-align:right">Valor</th><th>Categoria</th><th>Pessoa</th><th></th></tr></thead>
          <tbody>${its.map(it => `<tr class="${it.on ? "" : "off"}">
            <td><input type="checkbox" data-on="${it.i}" ${it.on ? "checked" : ""}></td><td class="num">${data(it.date)}</td>
            <td><input class="input" style="padding:6px 8px;border-radius:9px;min-width:180px" data-desc="${it.i}" value="${U.esc(it.desc)}"></td>
            <td>${it.inst ? `<span class="tag p">${it.inst.n}/${it.inst.of}</span>` : ""} ${quem(it)}</td>
            <td class="num" style="text-align:right;font-weight:700;${it.amount < 0 ? "color:var(--good)" : ""}">${U.brl(it.amount)}</td>
            <td><select data-cat="${it.i}">${opcoesCat(it.cat)}</select></td>
            <td><select data-pes="${it.i}">${D.state.people.map(p => `<option ${p === it.person ? "selected" : ""}>${U.esc(p)}</option>`).join("")}</select></td>
            <td>${status(it)}</td></tr>`).join("")}</tbody></table>
          <div class="imp-cards">${its.map(it => `<div class="imp-card ${it.on ? "" : "off"}">
            <input type="checkbox" data-on="${it.i}" ${it.on ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--primary)">
            <div style="min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${U.esc(it.desc)}</div>
              <div class="small muted">${data(it.date)} ${it.inst ? `<span class="tag p">${it.inst.n}/${it.inst.of}</span>` : ""} ${quem(it)} ${status(it)}</div>
              <select data-cat="${it.i}">${opcoesCat(it.cat)}</select></div>
            <b class="num" style="${it.amount < 0 ? "color:var(--good)" : ""}">${U.brl(it.amount)}</b></div>`).join("")}</div>
        </div>
      </div>
      <div class="row wrap" style="margin-top:14px;gap:10px">
        <button class="btn ghost" id="iVoltar">← Voltar</button><span class="spacer"></span>
        ${imp.texto ? `<button class="btn ghost" id="iTxt">Ver texto lido</button>` : ""}
        <button class="btn" id="iConf">Lançar ${sel.length} itens · ${U.brl(total)}</button>
      </div>`;
  }

  function ligarRevisao(v) {
    const imp = ui.imp, re = () => { const y = window.scrollY; const sc = v.querySelector(".imp-scroll").scrollTop; telaFatura(v); v.querySelector(".imp-scroll").scrollTop = sc; window.scrollTo(0, y); };
    v.querySelectorAll("[data-on]").forEach(c => c.onchange = () => { imp.itens[c.dataset.on].on = c.checked; re(); });
    v.querySelector("#iTodos").onchange = e => { imp.itens.forEach(i => i.on = e.target.checked); re(); };
    v.querySelectorAll("[data-cat]").forEach(s => s.onchange = () => {
      const it = imp.itens[s.dataset.cat]; it.cat = s.value;
      // mesmo estabelecimento na mesma fatura recebe a mesma categoria
      const k = U.chaveLoja(it.desc);
      imp.itens.forEach(o => { if (o !== it && U.chaveLoja(o.desc) === k && o.cat === o.catAuto) o.cat = s.value; });
      re();
    });
    v.querySelectorAll("[data-pes]").forEach(s => s.onchange = () => { imp.itens[s.dataset.pes].person = s.value; });
    v.querySelectorAll("[data-desc]").forEach(s => s.onchange = () => { imp.itens[s.dataset.desc].descEdit = s.value; });
    const sub = v.querySelector("#iSubst");
    if (sub) sub.onchange = () => { imp.substituir = sub.checked; };
    v.querySelector("#iVoltar").onclick = () => { imp.etapa = 1; render(); };
    const vt = v.querySelector("#iTxt");
    if (vt) vt.onclick = () => abrirSheet(cabecaSheet("Texto lido do arquivo") + `<textarea class="input" style="min-height:360px">${U.esc(imp.texto.slice(0, 40000))}</textarea>`, true);
    v.querySelector("#iConf").onclick = confirmarImportacao;
  }

  function confirmarImportacao() {
    const imp = ui.imp, id = U.uid();
    const reg = { id, date: new Date().toISOString(), card: imp.card, month: imp.month, file: imp.nome, created: [], matched: [], removed: [] };
    let novos = 0, confirmados = 0, aprendidos = 0, total = 0;
    if (imp.substituir && imp.planilha.length) {
      const fora = new Set(imp.planilha.map(t => t.id));
      reg.removed = D.state.tx.filter(t => fora.has(t.id));
      D.state.tx = D.state.tx.filter(t => !fora.has(t.id));
    }
    for (const it of imp.itens) {
      if (!it.on) continue;
      const desc = (it.descEdit || it.desc).trim();
      if (it.cat !== it.catAuto && D.aprender(it.desc, it.cat, it.person)) aprendidos++;
      total += it.amount;
      if (it.match && it.match.tipo === "previsto") {
        const t = it.match.t;
        reg.matched.push(JSON.parse(JSON.stringify(t)));
        Object.assign(t, { status: "confirmado", date: it.date, desc, raw: it.desc, amount: it.amount, cat: it.cat, person: it.person, source: "fatura", importId: id });
        if (it.inst && t.inst) Object.assign(t.inst, { n: it.inst.n, of: it.inst.of, left: false });
        confirmados++;
        continue;
      }
      const antes = D.state.tx.length;
      // parcelas antecipadas (01/03, 02/03 e 03/03 na mesma fatura): só a última projeta as seguintes
      const antecipada = it.inst && imp.itens.some(o => o.on && o !== it && o.inst && o.desc === it.desc && o.inst.of === it.inst.of && o.inst.n > it.inst.n);
      D.adicionar({ month: imp.month, date: it.date, desc, raw: it.desc, amount: it.amount, card: imp.card, cat: it.cat, person: it.person, source: "fatura", importId: id, inst: it.inst ? { n: it.inst.n, of: it.inst.of } : undefined }, !antecipada);
      reg.created.push(...D.state.tx.slice(antes).map(t => t.id));
      novos++;
    }
    reg.count = novos + confirmados; reg.total = U.round(total);
    D.state.imports.unshift(reg);
    D.save();
    imp.etapa = 3;
    imp.resultado = `${novos + confirmados} lançamentos (${U.brl(total)}) em ${card(imp.card).name}` + (aprendidos ? ` · aprendi ${aprendidos} categoria${aprendidos > 1 ? "s" : ""}` : "");
    render();
  }

  function desfazerImportacao(reg) {
    const criados = new Set(reg.created);
    D.state.tx = D.state.tx.filter(t => !criados.has(t.id));
    for (const antigo of reg.matched) {
      const i = D.state.tx.findIndex(t => t.id === antigo.id);
      if (i >= 0) D.state.tx[i] = antigo;
    }
    D.state.tx.push(...(reg.removed || []));
    D.state.imports = D.state.imports.filter(r => r.id !== reg.id);
    D.save();
  }

  // ================= ANÁLISES =================
  function telaAnalises(v) {
    const abas = [["evolucao", "Evolução"], ["categorias", "Categorias"], ["habitos", "Hábitos"], ["parcelas", "Parcelas futuras"]];
    v.innerHTML = `<div class="seg" style="margin-bottom:16px;flex-wrap:wrap">${abas.map(([k, n]) => `<button class="${ui.aba === k ? "on" : ""}" data-aba="${k}">${n}</button>`).join("")}</div><div id="anArea"></div>`;
    v.querySelectorAll("[data-aba]").forEach(b => b.onclick = () => { ui.aba = b.dataset.aba; guardarUI(); telaAnalises(v); });
    const a = v.querySelector("#anArea");
    ({ evolucao: anEvolucao, categorias: anCategorias, habitos: anHabitos, parcelas: anParcelas }[ui.aba] || anEvolucao)(a);
  }
  const ultimosMeses = (m, n) => { const r = []; for (let k = n - 1; k >= 0; k--) r.push(U.addMes(m, -k)); return r; };
  const cacheMes = {};
  function somaMes(m, campo, id) { return D.total(D.doMes(m).filter(t => t[campo] === id)); }

  function anEvolucao(a) {
    const meses = ultimosMeses(ui.month, 12).filter(m => D.doMes(m).length || m === ui.month);
    const series = D.state.cards.map(c => ({ id: c.id, nome: c.name, cor: c.color })).filter(s => meses.some(m => somaMes(m, "card", s.id)));
    const totais = meses.map(m => D.total(D.doMes(m)));
    const med = totais.reduce((s, x) => s + x, 0) / (totais.filter(Boolean).length || 1);
    const max = Math.max(...totais), min = Math.min(...totais.filter(Boolean));
    a.innerHTML = `<div class="stats">
        <div class="card"><div class="muted small">Média mensal (${meses.length} meses)</div><div class="stat-v num">${U.brl(med)}</div></div>
        <div class="card"><div class="muted small">Mês mais caro</div><div class="stat-v num">${U.brl(max)}</div><div class="small muted">${U.nomeMes(meses[totais.indexOf(max)])}</div></div>
        <div class="card"><div class="muted small">Mês mais econômico</div><div class="stat-v num">${U.brl(min)}</div><div class="small muted">${U.nomeMes(meses[totais.indexOf(min)])}</div></div></div>
      <div class="card"><h3>Gasto por mês e por origem <small>toque numa coluna para abrir o mês</small></h3><div id="chEvo"></div>
      <details class="tbl"><summary>Ver tabela</summary><div style="overflow:auto"><table class="plain"><thead><tr><th>Mês</th>${series.map(s => `<th>${U.esc(s.nome)}</th>`).join("")}<th>Total</th></tr></thead>
      <tbody>${meses.map((m, i) => `<tr><td>${U.nomeMes(m, true)}</td>${series.map(s => `<td class="num">${U.brl(somaMes(m, "card", s.id), false)}</td>`).join("")}<td class="num"><b>${U.brl(totais[i], false)}</b></td></tr>`).join("")}</tbody></table></div></details></div>`;
    G.colunas(a.querySelector("#chEvo"), { meses, series, valor: (m, id) => somaMes(m, "card", id), destaque: ui.month, aoClicar: m => { ui.month = m; ir("inicio"); } });
  }

  function anCategorias(a) {
    const meses = ultimosMeses(ui.month, 6);
    const ids = D.state.categories.map(c => c.id).filter(id => meses.some(m => somaMes(m, "cat", id)));
    const linhas = ids.map(id => ({ id, vals: meses.map(m => somaMes(m, "cat", id)) })).map(l => Object.assign(l, { med: l.vals.slice(0, -1).reduce((s, x) => s + x, 0) / Math.max(1, meses.length - 1) })).sort((x, y) => y.vals[5] - x.vals[5] || y.med - x.med);
    if (!ids.includes(ui.catAnalise)) ui.catAnalise = ids[0] || "mercado";
    const m12 = ultimosMeses(ui.month, 12).filter(m => D.doMes(m).length || m === ui.month);
    a.innerHTML = `<div class="card" style="margin-bottom:16px"><h3><span>${cat(ui.catAnalise).icon} ${U.esc(cat(ui.catAnalise).name)} mês a mês</span><select class="input" id="catSel" style="width:auto;padding:8px 12px">${ids.map(id => `<option value="${id}" ${id === ui.catAnalise ? "selected" : ""}>${cat(id).icon} ${U.esc(cat(id).name)}</option>`).join("")}</select></h3><div id="chCat"></div></div>
      <div class="card"><h3>Categorias nos últimos 6 meses <small>▲▼ = ${U.nomeMes(ui.month, true)} contra a média dos 5 anteriores</small></h3><div style="overflow:auto"><table class="plain">
        <thead><tr><th>Categoria</th>${meses.map(m => `<th>${U.nomeMes(m, true)}</th>`).join("")}<th>Média</th><th></th></tr></thead>
        <tbody>${linhas.map(l => {
          const d = l.med ? (l.vals[5] - l.med) / l.med * 100 : 0;
          return `<tr><td>${cat(l.id).icon} ${U.esc(cat(l.id).name)}</td>${l.vals.map((x, i) => `<td class="num" ${i === 5 ? 'style="font-weight:700"' : ""}>${x ? U.brl(x, false) : "—"}</td>`).join("")}<td class="num muted">${U.brl(l.med, false)}</td>
          <td>${l.med && Math.abs(d) >= 15 ? `<span class="tag ${d > 0 ? "w" : "g"}">${d > 0 ? "▲" : "▼"}${Math.abs(d).toFixed(0)}%</span>` : ""}</td></tr>`;
        }).join("")}</tbody></table></div></div>`;
    a.querySelector("#catSel").onchange = e => { ui.catAnalise = e.target.value; guardarUI(); anCategorias(a); };
    G.colunas(a.querySelector("#chCat"), { meses: m12, series: [{ id: ui.catAnalise, nome: cat(ui.catAnalise).name, cor: "s7" }], valor: (m, id) => somaMes(m, "cat", id), destaque: ui.month });
  }

  function anHabitos(a) {
    const meses = ultimosMeses(ui.month, 12).filter(m => D.doMes(m).length || m === ui.month);
    const grupos = ["lanches", "padaria", "restaurantes", "mercado", "uber", "carro", "presentes", "roupas"];
    const blocos = grupos.map(id => {
      const tx = D.doMes(ui.month).filter(t => t.cat === id);
      const qtd = tx.length, tot = D.total(tx);
      const totais = meses.map(m => somaMes(m, "cat", id));
      const med = mediaCat(id, ui.month);
      const lugares = {};
      tx.forEach(t => { const k = (t.source === "planilha" ? t.desc : U.chaveLoja(t.raw || t.desc)) || t.desc; lugares[k] = (lugares[k] || 0) + 1; });
      const top = Object.entries(lugares).sort((x, y) => y[1] - x[1]).slice(0, 5);
      if (!qtd && !totais.some(Boolean)) return "";
      return `<div class="card"><div class="habit">${icoCat(id)}<div><div class="row between"><b>${U.esc(cat(id).name)}</b><b class="num">${U.brl(tot)}</b></div>
        <div class="habit-nums"><div><b>${qtd}×</b><small>no mês</small></div><div><b class="num">${qtd ? U.brl(tot / qtd, false) : "—"}</b><small>ticket médio</small></div><div><b class="num">${med ? med.qtd.toFixed(1) + "×" : "—"}</b><small>média/mês</small></div></div>
        ${G.spark(totais)}<div class="small muted">Gasto nos últimos ${meses.length} meses · média ${med ? U.brl(med.total, false) : "—"}/mês</div>
        ${top.length ? `<div class="places">${top.map(([k, n]) => `<span class="tag">${U.esc(k)} · ${n}×</span>`).join("")}</div>` : ""}</div></div></div>`;
    }).join("");
    const freq = frequentes(ui.month);
    const assin = assinaturas();
    a.innerHTML = `<p class="small muted" style="margin-top:0">Quantas vezes e quanto se gastou em cada hábito em ${U.nomeMes(ui.month)}. Com as faturas importadas, aparecem também os lugares mais frequentes.</p>
      <div class="grid g2">${blocos}</div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><h3>🔁 Lugares que se repetem no mês</h3>${freq.length ? freq.map(f => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${U.esc(f.nome)}</span><span><b>${f.qtd}×</b> · ${U.brl(f.total)}</span></div>`).join("") : `<p class="small muted">Aparece quando houver faturas importadas com o mesmo lugar 3 vezes ou mais.</p>`}</div>
        <div class="card"><h3>📺 Possíveis assinaturas</h3>${assin.length ? assin.map(f => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${U.esc(f.nome)}</span><span>${U.brl(f.valor)} · ${f.meses} meses</span></div>`).join("") : `<p class="small muted">Valores iguais que se repetem todo mês na fatura aparecem aqui.</p>`}</div>
      </div>`;
  }
  function assinaturas() {
    const mapa = {};
    for (const t of D.state.tx) {
      if (t.source !== "fatura" || t.inst || t.card === "fixas") continue;
      const k = U.chaveLoja(t.raw || t.desc) + "|" + Math.round(t.amount);
      (mapa[k] = mapa[k] || { nome: t.desc, valor: t.amount, ms: new Set() }).ms.add(t.month);
    }
    return Object.values(mapa).filter(x => x.ms.size >= 2).map(x => ({ nome: x.nome, valor: x.valor, meses: x.ms.size })).sort((a, b) => b.meses - a.meses);
  }

  function anParcelas(a) {
    const m0 = ui.month;
    const meses = []; for (let k = 1; k <= 12; k++) meses.push(U.addMes(m0, k));
    const fut = D.state.tx.filter(t => t.month > m0 && t.inst && t.card !== "fixas");
    const series = D.state.cards.filter(c => c.kind !== "fixas").map(c => ({ id: c.id, nome: c.name, cor: c.color })).filter(s => fut.some(t => t.card === s.id));
    const val = (m, id) => D.total(fut.filter(t => t.month === m && t.card === id));
    const mesesComValor = meses.filter(m => fut.some(t => t.month === m));
    const grupos = {};
    for (const t of D.state.tx.filter(t => t.inst && t.card !== "fixas" && t.month >= m0)) {
      const g = t.inst.group || t.id;
      (grupos[g] = grupos[g] || []).push(t);
    }
    const lista = Object.values(grupos).map(l => { l.sort((x, y) => x.month.localeCompare(y.month)); const atual = l[0]; return { t: atual, restam: l.filter(x => x.month > m0).length, total: D.total(l.filter(x => x.month > m0)) }; }).filter(x => x.restam).sort((x, y) => y.total - x.total);
    a.innerHTML = `<div class="grid g2" style="margin-bottom:16px">
        <div class="card"><div class="muted small">Já comprometido depois de ${U.nomeMes(m0, true)}</div><div style="font-size:28px;font-weight:800" class="num">${U.brl(D.total(fut))}</div><div class="small muted">${lista.length} compras parceladas em andamento</div></div>
        <div class="card"><div class="muted small">Só em ${U.nomeMes(U.addMes(m0, 1))}</div><div style="font-size:28px;font-weight:800" class="num">${U.brl(D.total(fut.filter(t => t.month === U.addMes(m0, 1))))}</div><div class="small muted">antes de qualquer compra nova</div></div></div>
      ${mesesComValor.length ? `<div class="card" style="margin-bottom:16px"><h3>Parcelas por mês</h3><div id="chParc"></div></div>` : ""}
      <div class="card"><h3>Compras parceladas</h3>${lista.length ? `<div class="tx-list" style="box-shadow:none">${lista.map(x => `<button class="tx" data-tx="${x.t.id}">${icoCat(x.t.cat)}<div style="min-width:0"><div class="t-desc">${U.esc(x.t.desc)}</div><div class="t-meta">${U.esc(card(x.t.card).name)} · faltam ${x.restam} × ${U.brl(x.t.amount)}</div></div><div class="t-amt num">${U.brl(x.total)}</div></button>`).join("")}</div>` : `<div class="empty">Nenhuma parcela futura.</div>`}</div>`;
    if (mesesComValor.length) G.colunas(a.querySelector("#chParc"), { meses: meses.slice(0, Math.max(...mesesComValor.map(m => meses.indexOf(m))) + 1), series, valor: val });
    a.querySelectorAll("[data-tx]").forEach(b => b.onclick = () => abrirLancamento(D.state.tx.find(t => t.id === b.dataset.tx)));
  }

  // ================= AJUSTES =================
  function telaAjustes(v) {
    const s = D.state;
    v.innerHTML = `
      <div class="card" style="margin-bottom:16px" id="cardNuvem"></div>
      <div class="grid g2">
        <div class="card"><h3>💾 Onde ficam os dados</h3>
          <p class="small" style="margin-top:0;color:var(--text-2)">Os dados ficam salvos neste aparelho. No computador dá para ligar um arquivo na pasta do OneDrive: cada mudança é gravada nele e fica com backup na nuvem.</p>
          <div id="arqStatus" class="small" style="margin-bottom:10px"></div>
          <div class="row wrap" style="gap:8px">
            ${"showSaveFilePicker" in window ? `<button class="btn sm" id="aLigar">Ligar arquivo no OneDrive</button>` : ""}
            <button class="btn soft sm" id="aExp">Baixar backup (.json)</button>
            <label class="btn ghost sm">Abrir backup<input type="file" id="aImp" accept=".json" hidden></label>
            <button class="btn ghost sm" id="aCsv">Exportar mês (Excel/CSV)</button>
          </div></div>
        <div class="card"><h3>📗 Histórico da planilha</h3>
          <p class="small" style="margin-top:0;color:var(--text-2)">Traz os meses da planilha “Contas da família.xlsx” (gerado pelo arquivo <b>historico_planilha.json</b> na pasta app-dados). Pode repetir: o histórico antigo é trocado, o resto fica.</p>
          <label class="btn sm">Escolher historico_planilha.json<input type="file" id="aHist" accept=".json" hidden></label>
          <div class="small muted" style="margin-top:8px">${s.tx.filter(t => t.source === "planilha").length} lançamentos vindos da planilha</div></div>
        <div class="card"><h3>👥 Divisão das despesas</h3>
          <label class="row" style="margin-bottom:10px"><input type="checkbox" id="aSplit" ${s.settings.split.on ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--primary)"> Mostrar “pra cada um” (total dividido)</label>
          <div class="field"><label>Quem divide (separado por vírgula)</label><input class="input" id="aSplitP" value="${U.esc(s.settings.split.people.join(", "))}"></div></div>
        <div class="card"><h3>🎨 Aparência</h3><div class="seg">${[["auto", "Automático"], ["light", "Claro"], ["dark", "Escuro"]].map(([k, n]) => `<button class="${s.settings.theme === k ? "on" : ""}" data-tema="${k}">${n}</button>`).join("")}</div>
          <div class="field" style="margin-top:14px"><label>Pessoas (separado por vírgula)</label><input class="input" id="aPessoas" value="${U.esc(s.people.join(", "))}"></div></div>
      </div>

      <div class="section-title">Cartões e contas</div>
      <div class="card"><p class="small muted" style="margin-top:0">Com o dia de fechamento e de vencimento, uma compra lançada à mão já cai no mês certo da fatura.</p>
        <div style="overflow:auto"><table class="plain"><thead><tr><th>Nome</th><th>Fecha dia</th><th>Vence dia</th></tr></thead><tbody>
        ${s.cards.map(c => `<tr><td><span class="row"><i class="dot" style="background:var(--${c.color})"></i><input class="input" style="padding:6px 10px" data-cnome="${c.id}" value="${U.esc(c.name)}"></span></td>
          <td>${c.kind === "cartao" ? `<input class="input" style="padding:6px 10px;width:80px" data-cfecha="${c.id}" inputmode="numeric" value="${c.closeDay || ""}">` : ""}</td>
          <td>${c.kind === "cartao" ? `<input class="input" style="padding:6px 10px;width:80px" data-cvence="${c.id}" inputmode="numeric" value="${c.dueDay || ""}">` : ""}</td></tr>`).join("")}</tbody></table></div></div>

      <div class="section-title">Categorias e limites do mês</div>
      <div class="card"><p class="small muted" style="margin-top:0">Coloque um limite mensal e o app avisa quando estiver perto. Em branco = sem limite. A média é dos últimos 6 meses.</p>
        <div style="overflow:auto"><table class="plain"><thead><tr><th>Categoria</th><th>Média</th><th>Limite</th></tr></thead><tbody>
        ${s.categories.map(c => { const med = mediaCat(c.id, U.mesAtual()); return `<tr><td><span class="row"><input class="input" style="padding:6px;width:52px;text-align:center" data-kico="${c.id}" value="${c.icon}"><input class="input" style="padding:6px 10px" data-knome="${c.id}" value="${U.esc(c.name)}"></span></td>
          <td class="num muted">${med ? U.brl(med.total, false) : "—"}</td><td><input class="input num" style="padding:6px 10px;width:110px" data-korc="${c.id}" inputmode="decimal" value="${c.budget || ""}" placeholder="—"></td></tr>`; }).join("")}
        </tbody></table></div><button class="btn soft sm" id="aNovaCat" style="margin-top:10px">＋ Categoria</button></div>

      <div class="section-title">O que o app aprendeu (${s.rules.length})</div>
      <div class="card">${s.rules.length ? `<div style="max-height:320px;overflow:auto"><table class="plain"><thead><tr><th>Na fatura contém</th><th style="text-align:left">Vira</th><th></th></tr></thead><tbody>
        ${s.rules.map(r => `<tr><td>${U.esc(r.key || r.pattern)}</td><td style="text-align:left">${cat(r.cat).icon} ${U.esc(cat(r.cat).name)}${r.person ? " · " + U.esc(r.person) : ""}</td><td><button class="icon-btn" data-delregra="${r.id}" style="width:28px;height:28px;font-size:13px">✕</button></td></tr>`).join("")}</tbody></table></div>`
        : `<p class="small muted" style="margin:0">Quando você troca a categoria de um item importado, o app guarda a regra aqui e usa nas próximas faturas.</p>`}</div>

      <div class="section-title">Faturas importadas</div>
      <div class="card">${s.imports.length ? s.imports.slice(0, 30).map(r => `<div class="row between small" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${U.esc(card(r.card).name)} · ${U.nomeMes(r.month, true)} · ${U.esc(r.file)}<br><span class="muted">${new Date(r.date).toLocaleString("pt-BR")} · ${r.count} itens · ${U.brl(r.total)}</span></span><button class="btn ghost sm" data-desfaz="${r.id}">Desfazer</button></div>`).join("") : `<p class="small muted" style="margin:0">Nenhuma ainda.</p>`}</div>

      <div class="section-title">Zona de cuidado</div>
      <div class="card row wrap" style="gap:10px"><button class="btn danger sm" id="aZerar">Apagar todos os dados deste aparelho</button><span class="small muted">Baixe um backup antes.</span></div>`;

    const salvar = () => { D.save(); };
    v.querySelectorAll("[data-tema]").forEach(b => b.onclick = () => { s.settings.theme = b.dataset.tema; aplicarTema(); salvar(); render(); });
    v.querySelector("#aSplit").onchange = e => { s.settings.split.on = e.target.checked; salvar(); };
    v.querySelector("#aSplitP").onchange = e => { s.settings.split.people = e.target.value.split(",").map(x => x.trim()).filter(Boolean); salvar(); };
    v.querySelector("#aPessoas").onchange = e => { s.people = e.target.value.split(",").map(x => x.trim()).filter(Boolean); if (!s.people.includes("Família")) s.people.unshift("Família"); salvar(); };
    v.querySelectorAll("[data-cnome]").forEach(i => i.onchange = () => { D.card(i.dataset.cnome).name = i.value; salvar(); renderNav(); });
    v.querySelectorAll("[data-cfecha]").forEach(i => i.onchange = () => { D.card(i.dataset.cfecha).closeDay = parseInt(i.value) || 0; salvar(); });
    v.querySelectorAll("[data-cvence]").forEach(i => i.onchange = () => { D.card(i.dataset.cvence).dueDay = parseInt(i.value) || 0; salvar(); });
    v.querySelectorAll("[data-knome]").forEach(i => i.onchange = () => { D.cat(i.dataset.knome).name = i.value; salvar(); });
    v.querySelectorAll("[data-kico]").forEach(i => i.onchange = () => { D.cat(i.dataset.kico).icon = i.value.trim() || "❓"; salvar(); });
    v.querySelectorAll("[data-korc]").forEach(i => i.onchange = () => { D.cat(i.dataset.korc).budget = U.numero(i.value); salvar(); });
    v.querySelector("#aNovaCat").onclick = () => { const n = prompt("Nome da nova categoria:"); if (n) { s.categories.push({ id: "c" + U.uid(), name: n, icon: "🏷️", budget: 0 }); salvar(); render(); } };
    v.querySelectorAll("[data-delregra]").forEach(b => b.onclick = () => { s.rules = s.rules.filter(r => r.id !== b.dataset.delregra); salvar(); render(); });
    v.querySelectorAll("[data-desfaz]").forEach(b => b.onclick = () => { const r = s.imports.find(x => x.id === b.dataset.desfaz); if (confirm(`Desfazer a importação de ${r.count} itens?`)) { desfazerImportacao(r); render(); toast("Importação desfeita"); } });
    v.querySelector("#aZerar").onclick = async () => {
      if (!confirm("Apagar TODOS os dados deste aparelho? (a nuvem e o arquivo do OneDrive não são apagados; este aparelho sai da sincronização)")) return;
      // sai da nuvem antes, para o apagão não ser enviado aos outros aparelhos
      if (window.NUVEM.usuario) await window.NUVEM.sair();
      D.reset(); render();
    };
    v.querySelector("#aExp").onclick = () => baixar(`contas-familia-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(D.state), "application/json");
    v.querySelector("#aCsv").onclick = exportarCSV;
    v.querySelector("#aImp").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const obj = JSON.parse(await f.text()); if (!obj.tx) throw new Error("não é um backup do app"); if (confirm(`Trocar os dados deste aparelho pelo backup (${obj.tx.length} lançamentos)?`)) { D.replace(obj); aplicarTema(); render(); toast("Backup carregado"); } }
      catch (err) { toast("Arquivo inválido: " + err.message); }
    };
    v.querySelector("#aHist").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const h = JSON.parse(await f.text());
        if (h.tipo !== "historico_planilha") throw new Error("escolha o historico_planilha.json");
        D.importarHistorico(h);
        ui.month = h.meses[h.meses.length - 1];
        toast(`${h.tx.length} lançamentos de ${h.meses.length} meses trazidos da planilha`);
        ir("inicio"); render();
      } catch (err) { toast("Não deu: " + err.message); }
    };
    const lig = v.querySelector("#aLigar");
    if (lig) lig.onclick = ligarArquivo;
    statusArquivo();
    cartaoNuvem();
  }

  // ---------- sincronização (Firebase) ----------
  function cartaoNuvem() {
    const el = document.getElementById("cardNuvem");
    if (!el) return;
    const N = window.NUVEM;
    if (!N.configurado()) {
      el.innerHTML = `<h3>☁️ Sincronizar entre aparelhos <small>não configurado</small></h3>
        <p class="small" style="margin:0;color:var(--text-2)">Falta ligar o projeto do Firebase em <b>js/config.js</b>. Enquanto isso, os dados ficam só neste aparelho.</p>`;
      return;
    }
    const st = { ok: ["g", "Sincronizado"], conectando: ["w", "Conectando…"], erro: ["b", "Com problema"], entrar: ["", "Desconectado"], desligado: ["", "Carregando…"] }[N.estado] || ["", N.estado];
    el.innerHTML = `<h3>☁️ Sincronizar entre aparelhos <span class="tag ${st[0]}">${st[1]}</span></h3>
      ${N.usuario ? `<p class="small" style="margin:0 0 10px;color:var(--text-2)">Conectado como <b>${U.esc(N.usuario.email)}</b>. Tudo o que for lançado aqui aparece nos outros aparelhos da família em segundos.${N.ultimo ? ` Última troca: ${new Date(N.ultimo).toLocaleTimeString("pt-BR")}.` : ""}</p>`
        : `<p class="small" style="margin:0 0 10px;color:var(--text-2)">Entre com a conta Google (a mesma autorizada para a família) para ver e lançar os mesmos dados no celular e no computador.</p>`}
      ${N.erro ? `<div class="banner" style="margin-bottom:10px">⚠️ ${U.esc(N.erro)}</div>` : ""}
      ${N.usuario ? `<button class="btn ghost sm" id="nSair">Sair desta conta</button>` : `<button class="btn" id="nEntrar">Entrar com Google</button>`}`;
    const e = el.querySelector("#nEntrar"); if (e) e.onclick = () => N.entrar();
    const s = el.querySelector("#nSair"); if (s) s.onclick = () => { if (confirm("Sair? Os dados continuam neste aparelho, mas param de sincronizar.")) N.sair(); };
  }
  window.NUVEM.onChange(() => { cartaoNuvem(); statusArquivo(); if (ui.page === "inicio" && !D.state.tx.length) render(); });

  function baixar(nome, conteudo, tipo) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportarCSV() {
    const m = ui.month, linhas = [["Mês", "Data", "Origem", "Categoria", "Descrição", "Pessoa", "Parcela", "Valor", "Situação", "Pago"]];
    for (const t of D.doMes(m)) linhas.push([m, t.date || "", card(t.card).name, cat(t.cat).name, t.desc, t.person || "", t.inst ? (t.inst.left ? "faltam " + (t.inst.of - t.inst.n + 1) : t.inst.n + "/" + t.inst.of) : "", String(t.amount).replace(".", ","), t.status, t.paid ? "sim" : ""]);
    baixar(`contas-${m}.csv`, "﻿" + linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n"), "text/csv");
  }

  // ---------- arquivo no OneDrive (Chrome/Edge no computador) ----------
  const arq = { handle: null, ok: false, gravando: false, ultimo: 0 };
  function idb() { return new Promise((ok, erro) => { const r = indexedDB.open("cf-arquivo", 1); r.onupgradeneeded = () => r.result.createObjectStore("h"); r.onsuccess = () => ok(r.result); r.onerror = erro; }); }
  async function idbGet(k) { const db = await idb(); return new Promise(ok => { const r = db.transaction("h").objectStore("h").get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); }); }
  async function idbSet(k, v) { const db = await idb(); return new Promise(ok => { const tx = db.transaction("h", "readwrite"); tx.objectStore("h").put(v, k); tx.oncomplete = ok; }); }

  async function ligarArquivo() {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: "contas-familia-dados.json", types: [{ description: "Dados do app", accept: { "application/json": [".json"] } }] });
      // se o arquivo escolhido já tem dados mais novos, usa eles
      const f = await handle.getFile();
      if (f.size > 10) {
        try { const obj = JSON.parse(await f.text()); if (obj.tx && obj.updatedAt > D.state.updatedAt && confirm("Esse arquivo tem dados mais recentes que este aparelho. Usar os dados do arquivo?")) { D.replace(obj); } } catch (e) { }
      }
      arq.handle = handle; arq.ok = true;
      await idbSet("arquivo", handle);
      await gravarArquivo(true);
      toast("Arquivo ligado ✓ — salve-o na pasta do OneDrive");
      render();
    } catch (e) { if (e.name !== "AbortError") toast("Não deu para ligar: " + e.message); }
  }
  async function gravarArquivo(forcar) {
    if (!arq.handle || !arq.ok) return;
    if (arq.gravando) { arq.pendente = true; return; }
    arq.gravando = true;
    try {
      const w = await arq.handle.createWritable();
      await w.write(JSON.stringify(D.state));
      await w.close();
      arq.ultimo = Date.now();
    } catch (e) { arq.ok = false; renderBanner(); }
    arq.gravando = false;
    if (arq.pendente) { arq.pendente = false; gravarArquivo(); }
    statusArquivo();
  }
  async function reconectar() {
    if (!arq.handle) return;
    const p = await arq.handle.requestPermission({ mode: "readwrite" });
    if (p !== "granted") return;
    arq.ok = true;
    await lerDoArquivo();
    render();
  }
  async function lerDoArquivo() {
    try {
      const f = await arq.handle.getFile();
      const obj = JSON.parse(await f.text());
      if (obj.tx && obj.updatedAt > D.state.updatedAt) { D.state = Object.assign(D.state, obj); localStorage.setItem("contas-familia-v1", JSON.stringify(D.state)); toast("Dados atualizados pelo arquivo do OneDrive"); }
      else if (obj.updatedAt < D.state.updatedAt) gravarArquivo();
    } catch (e) { }
  }
  function statusArquivo() {
    const el = document.getElementById("arqStatus");
    const txt = arq.handle ? (arq.ok ? `✅ Gravando em <b>${U.esc(arq.handle.name)}</b>${arq.ultimo ? " · " + new Date(arq.ultimo).toLocaleTimeString("pt-BR") : ""}` : `⚠️ Arquivo ${U.esc(arq.handle.name)} desconectado`) : "Só neste aparelho";
    if (el) el.innerHTML = txt;
    const N = window.NUVEM;
    const nuvem = N.usuario && N.estado === "ok" ? "☁️ Sincronizado" : N.configurado() && N.estado === "entrar" ? "☁️ Entrar para sincronizar" : N.estado === "erro" ? "⚠️ Sincronização com problema" : "";
    $("#syncBadge").innerHTML = `<button class="small muted" data-go="ajustes" style="padding:10px 14px;text-align:left">${nuvem || (arq.handle && arq.ok ? "✅ Salvo no OneDrive" : arq.handle ? "⚠️ Reconectar arquivo" : "💾 Salvo neste aparelho")}</button>`;
  }
  function renderBanner() {
    const b = $("#banner");
    if (arq.handle && !arq.ok) {
      b.innerHTML = `<div class="banner"><span>⚠️ O arquivo <b>${U.esc(arq.handle.name)}</b> precisa de permissão para continuar salvando.</span><button class="btn sm" id="bRec">Reconectar</button></div>`;
      b.querySelector("#bRec").onclick = reconectar;
    } else b.innerHTML = "";
  }
  async function iniciarArquivo() {
    if (!("showSaveFilePicker" in window)) return;
    try {
      const h = await idbGet("arquivo");
      if (!h) return;
      arq.handle = h;
      arq.ok = (await h.queryPermission({ mode: "readwrite" })) === "granted";
      if (arq.ok) await lerDoArquivo();
      render();
    } catch (e) { }
  }

  // ---------- início ----------
  aplicarTema();
  render();
  iniciarArquivo();
  window.NUVEM.iniciar();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });
  window.APP = { render, ui };
})();
