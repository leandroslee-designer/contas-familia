/* Dados do app: modelo, armazenamento, classificação, parcelas e contas fixas. */
(function () {
  const CHAVE = "contas-familia-v1";

  const CATEGORIAS = [
    ["mercado", "Mercado", "🛒"], ["padaria", "Padaria & café", "🥐"], ["lanches", "Lanches & delivery", "🍔"],
    ["restaurantes", "Restaurantes & bares", "🍽️"], ["saude", "Farmácia & saúde", "💊"], ["acidente", "Acidente", "🩹"],
    ["uber", "Uber & transporte", "🚕"], ["carro", "Carro", "⛽"], ["casa", "Casa & produtos", "🏠"],
    ["casa_contas", "Contas da casa", "💡"], ["assinaturas", "Telefone & assinaturas", "📱"], ["roupas", "Roupas", "👕"],
    ["manu", "Filhos & escola", "🎀"], ["luna", "Pet", "🐾"], ["presentes", "Presentes", "🎁"], ["lazer", "Lazer & passeios", "🎉"],
    ["academia", "Academia", "💪"], ["familia", "Família & ajuda", "👨‍👩‍👧"], ["emprestimos", "Empréstimos", "🏦"],
    ["trabalho_impostos", "Trabalho & impostos", "🧾"], ["outros", "Sem lembrar / outros", "❓"],
  ].map(([id, name, icon]) => ({ id, name, icon, budget: 0 }));

  const CARTOES = [
    { id: "fixas", name: "Despesas fixas", kind: "fixas", color: "s1" },
    { id: "itau", name: "Cartão Itaú", kind: "cartao", color: "s2", closeDay: 0, dueDay: 0 },
    { id: "itau_online", name: "Itaú On Line", kind: "cartao", color: "s3", closeDay: 0, dueDay: 0 },
    { id: "c6", name: "Cartão C6", kind: "cartao", color: "s4", closeDay: 0, dueDay: 0 },
    { id: "santander", name: "Santander", kind: "cartao", color: "s5", closeDay: 0, dueDay: 0 },
    { id: "pix", name: "Pix / débito", kind: "conta", color: "s6" },
  ];

  const PESSOAS = ["Família"];

  // Palavras da descrição da fatura -> categoria. A primeira que casar vence;
  // as regras aprendidas (quando alguém corrige uma categoria) vêm antes destas.
  const REGRAS_PADRAO = [
    ["UBER EATS|UBEREATS|IFOOD|IFD\\*|RAPPI|AIQFOME|ZE DELIVERY|MCDONALD|MC DONALD|BURGER KING|BK |SUBWAY|HABIB|LANCH|PIZZ|ACAI|SORVET|PASTEL|HOT DOG|KFC|POPEYES|GIRAFFAS|BOBS|SPOLETO|CACAU SHOW|KOPENHAGEN|CHOCOLAT|OUTBACK|HAMBURG|BURGUER|BURGER|ESFIHA|COXINHA", "lanches"],
    ["MERCADOLIVRE|MERCADO LIVRE|MERCADOLIVR|MELI |SHOPEE|AMAZON MARKETPLACE|AMAZON BR|AMAZON\\.COM\\.BR|MAGALU|MAGAZINE|CASAS BAHIA|LEROY|TELHANORTE|TOK ?STOK|CAMICADO|HAVAN|ALIEXPRESS|TEMU|PONTO FRIO|UTILIDADES|MOVEIS|COLCHAO|ELETRO", "casa"],
    ["PADARIA|PANIFIC|PAES |CAFETERIA|CONFEITARIA|DOCERIA|CAFE |STARBUCKS|BOULANGERIE", "padaria"],
    ["RESTAUR|CHOPP|CHURRASC|CERVEJ|BOTEQUIM|BOTECO|GRILL|SUSHI|TEMAKI|JAPONES|BISTRO|CANTINA|TRATTORIA|PUB |BAR |BAR$|ESPETINHO|PEIXARIA", "restaurantes"],
    ["SUPERMERC|MERCADO|ATACADAO|ASSAI|CARREFOUR|PAO DE ACUCAR|EXTRA |ATACADISTA|HORTIFRUTI|HORTI|SACOLAO|ACOUGUE|MAKRO|SAMS CLUB|MERCADINHO|EMPORIO|QUITANDA|BISTEK|ANGELONI|GIASSI|KOCH|COMPER|FORT ATACADISTA|NAGUMO|SONDA|ZAFFARI|BIG |DIA ", "mercado"],
    ["DROGA|FARMA|RAIA|PAGUE MENOS|PANVEL|NISSEI|ODONTO|CLINICA|LABORAT|HOSPITAL|MEDIC|EXAME|UNIMED|OTICA|DENTIST|FISIO|PSICOL", "saude"],
    ["UBER|99APP|99 APP|99POP|99 TAXI|CABIFY|TAXI|METRO |ONIBUS|BILHETE|BLABLACAR", "uber"],
    ["POSTO|SHELL|IPIRANGA|PETROBRAS|BR MANIA|COMBUST|ESTACION|ESTAPAR|ZONA AZUL|SEM PARAR|SEMPARAR|CONECTCAR|VELOE|PEDAGIO|OFICINA|AUTO ?PECAS|PNEU|LAVA ?JATO|LAVA ?RAPIDO|DETRAN|MECANICA|AUTOCENTER|AUTO CENTER", "carro"],
    ["NETFLIX|SPOTIFY|AMAZON PRIME|PRIME VIDEO|PRIMEVIDEO|AMAZONPRIME|AMAZON MUSIC|DISNEY|HBO|MAX\\.COM|GLOBOPLAY|YOUTUBE|GOOGLE|APPLE\\.COM|ICLOUD|CHATGPT|OPENAI|CLAUDE|ANTHROPIC|DEEZER|PARAMOUNT|CRUNCHYROLL|VIVO|CLARO|TIM |OI |MICROSOFT|XBOX|PLAYSTATION|DROPBOX|CANVA", "assinaturas"],
    ["RENNER|C&A|C ?& ?A |CEA |RIACHUELO|ZARA|MARISA|HERING|CENTAURO|NETSHOES|SHEIN|DAFITI|CALCAD|SAPAT|ARTWALK|PERNAMBUCANAS|YOUCOM|MALWEE|NIKE|ADIDAS|DECATHLON|LUPO|OSKLEN|FARM ", "roupas"],
    ["PET |PETZ|COBASI|PETLOVE|VETERIN|RACAO|BANHO E TOSA|AGROPECUARIA", "luna"],
    ["ESCOLA|COLEGIO|BALE|BALLET|LIVRARIA|PAPELARIA|KALUNGA|CURSO", "manu"],
    ["CINEMA|CINEMARK|CINEPOLIS|INGRESSO|SYMPLA|EVENTIM|TICKET|TEATRO|PARQUE|HOTEL|POUSADA|AIRBNB|BOOKING|DECOLAR|LATAM|GOL LINHAS|AZUL LINHAS|IATE|CLUBE", "lazer"],
    ["ACADEMIA|SMART ?FIT|BLUEFIT|GYMPASS|WELLHUB|TOTALPASS|CROSSFIT|PILATES", "academia"],
    ["BOTICARIO|NATURA|FLORES|FLORICULTURA|PRESENTE|O BOTICARIO|SEPHORA|EUDORA|AVON", "presentes"],
    ["OAB|IOF|ANUIDADE|JUROS|MULTA|TARIFA|ENCARGO|IPTU|IPVA|RECEITA FEDERAL|DARF", "trabalho_impostos"],
    ["SEGURO|SEGURADORA|PORTO SEGURO|ENERGIA|SANEAMENTO|CELESC|COPEL|ENEL|CEMIG|LIGHT|SABESP|CASAN|INTERNET|NET VIRTUA", "casa_contas"],
  ].map(([pattern, cat]) => ({ pattern, cat }));

  // ---------- utilidades ----------
  const U = {};
  U.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  U.brl = (v, cents = true) => (v < 0 ? "-" : "") + "R$ " + Math.abs(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  U.round = v => Math.round((v + Number.EPSILON) * 100) / 100;
  U.semAcento = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  U.mesAtual = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
  U.addMes = (m, k) => { let [a, mm] = m.split("-").map(Number); mm += k; a += Math.floor((mm - 1) / 12); mm = ((mm - 1) % 12 + 12) % 12 + 1; return a + "-" + String(mm).padStart(2, "0"); };
  U.difMes = (a, b) => { const [y1, m1] = a.split("-").map(Number), [y2, m2] = b.split("-").map(Number); return (y2 - y1) * 12 + (m2 - m1); };
  U.NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  U.nomeMes = (m, curto) => { const [a, mm] = m.split("-").map(Number); const n = U.NOMES_MES[mm - 1]; return curto ? n.slice(0, 3) + "/" + String(a).slice(2) : n + " " + a; };
  U.esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  U.numero = s => {
    if (typeof s === "number") return s;
    let t = String(s || "").replace(/R\$|\s/g, "");
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
    const v = parseFloat(t);
    return isNaN(v) ? 0 : v;
  };
  // Chave do estabelecimento: sem acento, sem parcela, sem números soltos
  U.chaveLoja = desc => U.semAcento(desc).toUpperCase()
    .replace(/PARC(ELA)?\.?\s*\d+\s*(\/|DE)\s*\d+/g, " ").replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/g, " ")
    .replace(/[*\-_.]/g, " ").replace(/\b\d+\b/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 3).join(" ");

  // ---------- estado ----------
  function novoEstado() {
    return {
      version: 1, updatedAt: 0,
      settings: { theme: "auto", split: { on: true, people: ["Pessoa 1", "Pessoa 2"] }, recFrom: U.mesAtual() },
      cards: JSON.parse(JSON.stringify(CARTOES)),
      categories: JSON.parse(JSON.stringify(CATEGORIAS)),
      people: PESSOAS.slice(),
      rules: [],
      recurring: [],
      tx: [],
      incomes: [],
      debts: [],
      imports: [],
    };
  }

  const D = { U, REGRAS_PADRAO, state: null, listeners: [] };

  D.load = function () {
    try {
      const raw = localStorage.getItem(CHAVE);
      D.state = raw ? Object.assign(novoEstado(), JSON.parse(raw)) : novoEstado();
    } catch (e) { D.state = novoEstado(); }
    return D.state;
  };
  D.replace = function (obj) { D.state = Object.assign(novoEstado(), obj); D.save(true); };
  let timer = null;
  D.save = function (agora) {
    D.state.updatedAt = Date.now();
    try { localStorage.setItem(CHAVE, JSON.stringify(D.state)); } catch (e) { console.error(e); }
    clearTimeout(timer);
    timer = setTimeout(() => D.listeners.forEach(f => f(D.state)), agora ? 0 : 600);
  };
  D.onSave = f => D.listeners.push(f);
  D.reset = function () { D.state = novoEstado(); D.save(true); };

  D.cat = id => D.state.categories.find(c => c.id === id) || D.state.categories.find(c => c.id === "outros");
  D.card = id => D.state.cards.find(c => c.id === id) || { id, name: id, color: "s8" };

  // ---------- classificação ----------
  D.classificar = function (desc) {
    const t = " " + U.semAcento(desc).toUpperCase() + " ";
    const chave = U.chaveLoja(desc);
    // "LOJA XPTO" aprendida também vale para "LOJA XPTO FILIAL"
    const parecida = k => k === chave || chave.startsWith(k + " ") || k.startsWith(chave + " ");
    const aprendida = D.state.rules.find(r => r.key && r.key === chave) || D.state.rules.find(r => r.key && parecida(r.key)) ||
      D.state.rules.find(r => r.pattern && new RegExp(r.pattern, "i").test(t));
    if (aprendida) return { cat: aprendida.cat, person: aprendida.person || "", regra: "aprendida" };
    for (const r of REGRAS_PADRAO) if (new RegExp(r.pattern).test(t)) return { cat: r.cat, person: "", regra: "padrão" };
    return { cat: "outros", person: "", regra: "" };
  };
  D.aprender = function (desc, cat, person) {
    const key = U.chaveLoja(desc);
    if (!key || key.length < 3) return false;
    const r = D.state.rules.find(x => x.key === key);
    if (r) { r.cat = cat; if (person) r.person = person; }
    else D.state.rules.unshift({ id: U.uid(), key, cat, person: person && person !== "Família" ? person : "" });
    return true;
  };

  // ---------- meses ----------
  D.doMes = m => D.state.tx.filter(t => t.month === m);
  D.total = lista => U.round(lista.reduce((s, t) => s + (t.amount || 0), 0));
  D.meses = function () {
    const s = new Set(D.state.tx.map(t => t.month));
    s.add(U.mesAtual());
    return [...s].sort();
  };
  // Mês em que a compra entra, como na planilha: o mês em que a fatura fecha
  // (fatura que fecha 30/09 e vence 07/10 fica em setembro)
  D.mesDaFatura = function (cardId, dataISO) {
    const c = D.card(cardId);
    const m = dataISO.slice(0, 7), dia = +dataISO.slice(8, 10);
    if (!c.closeDay) return m;
    return dia > c.closeDay ? U.addMes(m, 1) : m;
  };

  // ---------- lançamentos e parcelas ----------
  // Quantas parcelas faltam contando a do mês (é o número que a planilha guarda ao lado do valor)
  const restantesDe = x => x.inst ? x.inst.of - x.inst.n + 1 : 0;

  // Garante a parcela k de uma compra parcelada (base = a parcela que já existe, de uma fatura).
  // 1) se a planilha já lançou essa parcela no mês (mesmo cartão, mesmo valor, mesmo "quantas faltam"),
  //    a linha da planilha vira a parcela da fatura, sem somar duas vezes;
  // 2) se a planilha só previu, a previsão ganha o nome da fatura;
  // 3) senão cria a parcela como "previsto".
  D.projetarParcela = function (base, k) {
    const g = base.inst.group, of = base.inst.of, mes = U.addMes(base.month, k - base.inst.n);
    if (D.state.tx.some(x => x.inst && x.inst.group === g && x.inst.n === k)) return false;
    // linha da planilha ainda não ligada a uma fatura (as ligadas já perderam o "left")
    const perto = x => x.month === mes && x.card === base.card && x.source === "planilha" && !(x.inst && !x.inst.left) &&
      Math.abs(x.amount - base.amount) <= 0.05 && (!x.inst || !x.inst.left || restantesDe(x) === of - k + 1);
    // a planilha lança "quantas faltam" quando a parcela já está contada; quando o campo fica em 1 ou vazio
    // (sem número de parcelas), só o valor identifica a compra
    const lancada = D.state.tx.filter(x => perto(x) && x.status === "confirmado")
      .sort((a, b) => (!!b.inst - !!a.inst) || Math.abs(a.amount - base.amount) - Math.abs(b.amount - base.amount))[0];
    if (lancada) { Object.assign(lancada, { desc: base.desc, raw: base.raw, inst: { n: k, of, group: g } }); return true; }
    const prevista = D.state.tx.find(x => perto(x) && x.status === "previsto");
    if (prevista) {
      Object.assign(prevista, { desc: base.desc, raw: base.raw, cat: base.cat, person: base.person, source: base.source, inst: { n: k, of, group: g } });
      return true;
    }
    D.state.tx.push(Object.assign({}, base, { id: U.uid(), month: mes, date: null, status: "previsto", paid: false, inst: { n: k, of, group: g } }));
    return true;
  };

  // Cria o lançamento e, se for parcelado, as parcelas futuras
  D.adicionar = function (t, projetar = true) {
    const base = Object.assign({ id: U.uid(), status: "confirmado", person: "Família", source: "manual" }, t);
    base.amount = U.round(base.amount);
    D.state.tx.push(base);
    if (projetar && base.inst && base.inst.of > base.inst.n) {
      base.inst.group = base.inst.group || U.uid();
      for (let k = base.inst.n + 1; k <= base.inst.of; k++) D.projetarParcela(base, k);
    }
    return base;
  };

  // Reaplica a regra acima a todas as compras parceladas que já vieram de fatura
  // (conserta o que foi importado antes de a planilha e a fatura serem ligadas)
  D.conciliarParcelas = function () {
    let n = 0;
    const bases = D.state.tx.filter(t => t.source === "fatura" && t.status === "confirmado" && t.inst && t.inst.group && t.inst.of > t.inst.n && !t.inst.left);
    for (const b of bases) for (let k = b.inst.n + 1; k <= b.inst.of; k++) if (D.projetarParcela(b, k)) n++;
    return n;
  };
  D.removerParcelasFuturas = function (t) {
    if (!t.inst || !t.inst.group) return 0;
    const antes = D.state.tx.length;
    D.state.tx = D.state.tx.filter(x => !(x.inst && x.inst.group === t.inst.group && x.inst.n > t.inst.n));
    return antes - D.state.tx.length;
  };

  // Procura um lançamento já existente que seja o mesmo item de fatura
  D.acharIgual = function (item, cardId, mes) {
    const cents = Math.round(item.amount * 100);
    const doMes = D.state.tx.filter(t => t.card === cardId && t.month === mes);
    const k = U.chaveLoja(item.desc);
    // 1) mesmo item já importado (fatura parcial reimportada)
    let e = doMes.find(t => t.status === "confirmado" && t.source === "fatura" && Math.round(t.amount * 100) === cents &&
      (t.date || "") === (item.date || "") && U.chaveLoja(t.raw || t.desc) === k);
    if (e) return { tipo: "duplicado", t: e };
    // 2) parcela prevista (projeção de mês anterior)
    e = doMes.find(t => t.status === "previsto" && Math.abs(t.amount - item.amount) <= 0.05 && t.source !== "fixa" &&
      (!item.inst || !t.inst || t.inst.left || t.inst.of === item.inst.of) &&
      (U.chaveLoja(t.raw || t.desc) === k || t.source === "planilha"));
    if (e) return { tipo: "previsto", t: e };
    return null;
  };

  // ---------- contas fixas ----------
  // Gera no mês as contas fixas ativas que ainda não existem (só a partir de recFrom)
  D.garantirFixas = function (mes) {
    if (!D.state.settings.recFrom || mes < D.state.settings.recFrom) return false;
    if (mes > U.addMes(U.mesAtual(), 2)) return false;
    let mudou = false;
    for (const r of D.state.recurring) {
      if (!r.active) continue;
      if (r.from && mes < r.from) continue;
      if (D.state.tx.some(t => t.recId === r.id && t.month === mes)) continue;
      if ((D.state.skips || []).includes(r.id + "@" + mes)) continue;
      let inst;
      if (r.inst) {
        const n = r.inst.n + U.difMes(r.inst.month, mes);
        if (n > r.inst.of || n < 1) continue;
        inst = { n, of: r.inst.of };
      }
      const anterior = D.state.tx.filter(t => t.recId === r.id && t.month < mes).sort((a, b) => a.month < b.month ? 1 : -1)[0];
      D.state.tx.push({
        id: U.uid(), month: mes, desc: r.name, amount: anterior ? anterior.amount : r.amount, card: r.card || "fixas",
        cat: r.cat, person: r.person || "Família", source: "fixa", status: "previsto", paid: false, recId: r.id, inst,
        dueDay: r.dueDay || 0,
      });
      mudou = true;
    }
    return mudou;
  };

  // Posição da parcela ("3/10"). Na planilha a coluna ao lado do valor diz quantas parcelas FALTAM
  // contando a do mês (10 em agosto, 9 em setembro, 8 em outubro), então o app liga os meses
  // seguidos (mesmo cartão, mesmo valor, faltando uma a mais no mês anterior) para descobrir o número.
  let idxParc = null, idxChave = "";
  D.parcelaInfo = function (t) {
    if (!t.inst) return null;
    if (!t.inst.left) return { n: t.inst.n, of: t.inst.of, est: false };
    const chave = D.state.tx.length + ":" + D.state.updatedAt;
    if (idxChave !== chave) {
      idxParc = new Map(); idxChave = chave;
      for (const x of D.state.tx) if (x.inst && x.inst.left) {
        const k = x.card + "|" + x.month + "|" + (x.inst.of - x.inst.n + 1);
        (idxParc.get(k) || idxParc.set(k, []).get(k)).push(x);
      }
    }
    let rest = t.inst.of - t.inst.n + 1, n = 1, cur = t;
    for (let i = 0; i < 120; i++) {
      const prev = (idxParc.get(cur.card + "|" + U.addMes(cur.month, -1) + "|" + (rest + 1)) || [])
        .filter(x => Math.abs(x.amount - t.amount) <= 0.02)
        .sort((a, b) => (b.desc === cur.desc) - (a.desc === cur.desc))[0];
      if (!prev) break;
      n++; rest++; cur = prev;
    }
    return { n, of: n + (t.inst.of - t.inst.n), est: true };
  };

  // ---------- histórico da planilha ----------
  D.importarHistorico = function (h) {
    const s = D.state;
    s.tx = s.tx.filter(t => t.source !== "planilha");
    const ultimo = h.meses[h.meses.length - 1];
    for (const t of h.tx) {
      const novo = Object.assign({}, t, { id: "h" + t.id });
      delete novo.restantes;
      // a coluna ao lado do valor diz quantas parcelas faltam (contando a do mês)
      if (t.restantes > 1) novo.inst = { n: 1, of: t.restantes, left: true };
      s.tx.push(novo);
      if (t.month === ultimo && t.restantes > 1) {
        const g = U.uid();
        novo.inst.group = g;
        for (let k = 1; k < t.restantes; k++) {
          s.tx.push(Object.assign({}, novo, { id: U.uid(), month: U.addMes(ultimo, k), status: "previsto", inst: { n: k + 1, of: t.restantes, left: true, group: g } }));
        }
      }
    }
    // liga as fixas já lançadas às contas recorrentes
    for (const r of h.recurring) {
      if (!s.recurring.some(x => x.id === r.id)) s.recurring.push(Object.assign({ card: "fixas", dueDay: 0 }, r));
    }
    for (const t of s.tx) {
      if (t.source === "planilha" && t.card === "fixas" && !t.recId) {
        const r = s.recurring.find(x => x.name === t.desc);
        if (r) t.recId = r.id;
      }
    }
    s.settings.recFrom = U.addMes(ultimo, 1);
    // nomes da família, categorias com nome próprio e acertos vêm do arquivo (que fica fora do código)
    if (h.people) s.people = [...new Set(["Família", ...s.people, ...h.people])];
    if (h.split) s.settings.split = h.split;
    for (const [id, nome] of Object.entries(h.categorias || {})) { const c = s.categories.find(x => x.id === id); if (c) c.name = nome; }
    for (const d of h.debts || []) if (!s.debts.some(x => x.name === d.name)) s.debts.push(Object.assign({ id: U.uid() }, d));
    D.save(true);
  };

  window.D = D;
})();
