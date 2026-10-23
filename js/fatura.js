/* Leitura de fatura: PDF, CSV, OFX, Excel ou texto colado -> lista de itens
   { date: "AAAA-MM-DD"|null, desc, amount, inst: {n, of}|null, skip: motivo|"" } */
(function () {
  const U = D.U;
  const MES_TXT = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  const VALOR = "(-\\s*)?(?:R\\$\\s*)?(-\\s*)?(\\d{1,3}(?:\\.\\d{3})+,\\d{2}|\\d+,\\d{2})(\\s*[-+]|\\s+[DC])?";
  const RE_VALOR_FIM = new RegExp(VALOR + "\\s*$", "i");
  const RE_DATA_INI = /^(\d{1,2})\s*[\/.\-]\s*(\d{1,2})(?:\s*[\/.\-]\s*(\d{2,4}))?\s+/;
  const RE_DATA_TXT = /^(\d{1,2})\s*(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?(?:\s+(\d{4}))?\s+/i;
  const IGNORAR = /^(pagamento|pagto|pgto|pag fatura|saldo|total|subtotal|limite|vencimento|fatura anterior|valor (?:total|minimo)|cr[eé]dito rotativo|lan[cç]amentos|data\b)/i;
  // Só títulos de seção ("Compras parceladas - próximas faturas"), não frases soltas do texto
  const PROXIMAS = /^\s*(?:compras parceladas\s*[-–]?\s*)?(?:pr[oó]ximas faturas|lan[cç]amentos futuros|parcelas a vencer)\s*:?\s*$/i;
  const ATUAIS = /(lan[cç]amentos\s*(atuais|nacionais|internacionais|no cart)|despesas do m[eê]s|transa[cç][oõ]es|detalhamento da fatura)/i;
  // "MARIA S SILVA - 5201 XXXX XXXX 1234" = começa o bloco de um cartão (titular ou adicional)
  const RE_TITULAR = /^@?\s*([A-ZÀ-Ú][A-ZÀ-Ú .]{2,}?)\s*-\s*\d{4}\s*[X*.]{4}\s*[X*.]{4}\s*(\d{4})\b/;
  const RE_INICIO = /^(?:\d\s+)?(?:\d{1,2}\s*\/\s*\d{1,2}(?:\/\d{2,4})?\s+\S|\d{1,2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b|IOF\b)/i;
  const RE_SO_VALOR = /^(?:-\s*)?(?:R\$\s*)?-?\s*(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}(?:\s*[-+DC])?$/i;
  const RE_TERMINA_VALOR = /\d,\d{2}(?:\s*[-+DC])?$/i;

  const F = {};

  function anoDaCompra(diaMes, mesNum, faturaMes) {
    const [fa, fm] = faturaMes.split("-").map(Number);
    // compras aparecem até ~11 meses antes do vencimento
    return mesNum > fm ? fa - 1 : fa;
  }
  function iso(a, m, d) { return a + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }

  function extrairParcela(desc) {
    let m = desc.match(/\s*(?:-\s*)?parc(?:ela)?\.?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\s*/i);
    if (!m) m = desc.match(/\s+(\d{1,2})\s*\/\s*(\d{1,2})\s*$/);
    if (!m) return { desc, inst: null };
    const n = +m[1], of = +m[2];
    if (!(of >= 2 && of <= 72 && n >= 1 && n <= of)) return { desc, inst: null };
    return { desc: (desc.slice(0, m.index) + " " + desc.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim(), inst: { n, of } };
  }

  // Um pedaço "DATA DESCRIÇÃO [PARC] VALOR"
  function lerSegmento(seg, faturaMes) {
    // o Santander põe um dígito solto antes da data ("3 25/09 LNT")
    seg = seg.replace(/\s+/g, " ").trim().replace(/^\d\s+(?=\d{1,2}\s*[\/.])/, "");
    let date = null, m;
    if (/^IOF\b/i.test(seg)) { /* IOF vem sem data */ }
    else if ((m = seg.match(RE_DATA_INI))) {
      const d = +m[1], mm = +m[2];
      if (mm < 1 || mm > 12 || d < 1 || d > 31) return null;
      let a = m[3] ? +m[3] : anoDaCompra(d, mm, faturaMes);
      if (a < 100) a += 2000;
      date = iso(a, mm, d); seg = seg.slice(m[0].length);
    } else if ((m = seg.match(RE_DATA_TXT))) {
      const d = +m[1], mm = MES_TXT[m[2].toLowerCase().slice(0, 3)];
      date = iso(m[3] ? +m[3] : anoDaCompra(d, mm, faturaMes), mm, d); seg = seg.slice(m[0].length);
    } else return null;
    const v = seg.match(RE_VALOR_FIM);
    if (!v) return null;
    let amount = U.numero(v[3]);
    const sinal = (v[1] || v[2] || "") + (v[4] || "");
    if (/-|C/i.test(sinal)) amount = -amount;
    let desc = seg.slice(0, v.index).trim();
    // valor em dólar no meio (fatura internacional): fica só o último valor (em R$)
    desc = desc.replace(/\s(?:US\$|USD)?\s?\d+[.,]\d{2}\s*$/i, "").trim();
    if (!desc) return null;
    const p = extrairParcela(desc);
    return { date, desc: p.desc, amount: U.round(amount), inst: p.inst };
  }

  // Texto livre (PDF convertido ou colado do app do banco).
  // Cada linha é cortada em células (3+ espaços = troca de coluna no PDF); um lançamento começa
  // numa célula com data e termina na primeira célula de valor.
  F.lerTexto = function (texto, faturaMes) {
    const itens = [];
    let futuro = false, titular = "", ultimo = null;
    const fechar = seg => {
      const it = lerSegmento(seg, faturaMes);
      ultimo = null;
      if (!it || !it.amount) return;
      it.skip = futuro ? "próxima fatura" : IGNORAR.test(it.desc) ? "pagamento/total" : "";
      if (titular) it.titular = titular;
      itens.push(it);
      ultimo = it;
    };
    for (const linha of texto.split(/\r?\n/)) {
      if (!linha.trim()) continue;
      if (PROXIMAS.test(linha)) futuro = true;
      else if (ATUAIS.test(linha)) futuro = false;
      const celulas = [];
      for (const c of linha.split(/\s{3,}/)) {
        // texto colado sem colunas: corta antes de cada data que vem depois de um valor
        celulas.push(...c.split(/(?<=\d,\d{2}(?:\s*[-DC])?)\s+(?=(?:\d\s+)?\d{1,2}\s*[\/.]\s*\d{1,2}\s|\d{1,2}\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez))/i));
      }
      let seg = null;
      ultimo = null;
      for (let c of celulas) {
        c = c.trim();
        if (!c) continue;
        // segundo valor logo depois do lançamento = coluna US$ (compra no exterior)
        if (seg === null && ultimo && RE_SO_VALOR.test(c)) { if (U.numero(c)) ultimo.usd = U.numero(c); ultimo = null; continue; }
        ultimo = null;
        const t = c.match(RE_TITULAR);
        if (t) { seg = null; titular = t[1].trim() + " ·" + t[2]; continue; }
        if (RE_INICIO.test(c)) {
          seg = c;
          if (RE_TERMINA_VALOR.test(c)) { fechar(seg); seg = null; }
        } else if (seg !== null) {
          seg += " " + c;
          if (RE_SO_VALOR.test(c)) { fechar(seg); seg = null; }
        }
      }
    }
    // o IOF vem sem data e às vezes fora do bloco: vai para o cartão que teve compra em dólar
    const exterior = itens.filter(i => i.usd && i.titular).pop();
    if (exterior) itens.filter(i => !i.date && /^IOF\b/i.test(i.desc)).forEach(i => { i.titular = exterior.titular; i.date = exterior.date; });
    return itens;
  };

  // "Vencimento 07/10/2026" -> "2026-10"
  F.vencimento = function (texto) {
    const conta = {};
    for (const m of texto.matchAll(/vencimento[\s\S]{0,120}?(\d{2})\/(\d{2})\/(\d{4})/gi)) conta[m[3] + "-" + m[2]] = (conta[m[3] + "-" + m[2]] || 0) + 1;
    return Object.keys(conta).sort((a, b) => conta[b] - conta[a])[0] || "";
  };

  // ---------- CSV / planilha ----------
  function separarCSV(texto) {
    const prim = texto.split(/\r?\n/).find(l => l.trim()) || "";
    const sep = [";", "\t", ","].sort((a, b) => prim.split(b).length - prim.split(a).length)[0];
    const linhas = [];
    let cel = "", lin = [], aspas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (aspas) { if (c === '"' && texto[i + 1] === '"') { cel += '"'; i++; } else if (c === '"') aspas = false; else cel += c; continue; }
      if (c === '"') aspas = true;
      else if (c === sep) { lin.push(cel); cel = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && texto[i + 1] === "\n") i++; lin.push(cel); linhas.push(lin); lin = []; cel = ""; }
      else cel += c;
    }
    if (cel || lin.length) { lin.push(cel); linhas.push(lin); }
    return linhas.filter(l => l.some(c => String(c).trim()));
  }

  function lerData(v, faturaMes) {
    if (v instanceof Date) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
    if (typeof v === "number" && v > 30000) { const d = new Date(Math.round((v - 25569) * 864e5)); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
    const s = String(v || "").trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return iso(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?/);
    if (m) { let a = m[3] ? +m[3] : anoDaCompra(+m[1], +m[2], faturaMes); if (a < 100) a += 2000; return iso(a, +m[2], +m[1]); }
    m = s.match(/^(\d{1,2})\s*(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i);
    if (m) { const mm = MES_TXT[m[2].toLowerCase()]; return iso(anoDaCompra(+m[1], mm, faturaMes), mm, +m[1]); }
    return null;
  }

  F.lerTabela = function (linhas, faturaMes) {
    const norm = s => U.semAcento(String(s || "")).toLowerCase().trim();
    let h = linhas.findIndex(l => l.some(c => /^(data|date)/.test(norm(c))) && l.some(c => /(valor|amount|value|r\$)/.test(norm(c))));
    let col;
    if (h >= 0) {
      const cab = linhas[h].map(norm);
      const achar = (...res) => { for (const re of res) { const i = cab.findIndex(c => re.test(c)); if (i >= 0) return i; } return -1; };
      col = {
        data: achar(/^data de compra/, /^data/, /^date/),
        desc: achar(/descri/, /estabelecimento/, /lancamento/, /^title/, /historico/, /^nome$/, /^loja/),
        valor: achar(/valor.*r\$/, /^valor$/, /^valor/, /^amount/, /^value/, /r\$/),
        parc: achar(/parcela/, /installment/),
      };
    } else {
      // sem cabeçalho: formato pedido ao Claude (data;descricao;parcela;valor)
      h = -1; col = { data: 0, desc: 1, parc: 2, valor: 3 };
    }
    const itens = [];
    for (const l of linhas.slice(h + 1)) {
      const date = lerData(l[col.data], faturaMes);
      let desc = String(l[col.desc] ?? "").trim();
      const bruto = l[col.valor];
      if (!date || !desc || bruto === undefined || String(bruto).trim() === "") continue;
      let amount = U.numero(bruto);
      let inst = null;
      if (col.parc >= 0) {
        const m = String(l[col.parc] || "").match(/(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/);
        if (m && +m[2] > 1) inst = { n: +m[1], of: +m[2] };
      }
      if (!inst) { const p = extrairParcela(desc); desc = p.desc; inst = p.inst; }
      itens.push({ date, desc, amount: U.round(amount), inst, skip: IGNORAR.test(desc) ? "pagamento/total" : "" });
    }
    // extrato do banco (compras negativas) -> compras positivas
    const neg = itens.filter(i => i.amount < 0).length;
    if (neg > itens.length * 0.6) itens.forEach(i => { i.amount = -i.amount; });
    return itens;
  };

  F.lerCSV = (texto, faturaMes) => F.lerTabela(separarCSV(texto), faturaMes);

  F.lerOFX = function (texto) {
    const itens = [];
    const blocos = texto.split(/<STMTTRN>/i).slice(1);
    for (const b of blocos) {
      const tag = n => { const m = b.match(new RegExp("<" + n + ">([^<\\r\\n]*)", "i")); return m ? m[1].trim() : ""; };
      const dt = tag("DTPOSTED");
      const amount = -U.numero(tag("TRNAMT").replace(",", "."));
      let desc = tag("MEMO") || tag("NAME");
      if (!dt || !desc) continue;
      const p = extrairParcela(desc);
      itens.push({ date: iso(+dt.slice(0, 4), +dt.slice(4, 6), +dt.slice(6, 8)), desc: p.desc, amount: U.round(amount), inst: p.inst, skip: IGNORAR.test(desc) ? "pagamento/total" : "" });
    }
    return itens;
  };

  // ---------- bibliotecas sob demanda ----------
  const carregados = {};
  function script(url) {
    if (!carregados[url]) carregados[url] = new Promise((ok, erro) => {
      const s = document.createElement("script"); s.src = url; s.onload = ok; s.onerror = () => erro(new Error("Sem internet para carregar o leitor (" + url.split("/").pop() + ")"));
      document.head.appendChild(s);
    });
    return carregados[url];
  }
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

  // PDF -> texto em linhas, montando cada linha pela altura (y) dos pedaços
  F.pdfParaTexto = async function (buffer, senha) {
    await script(PDFJS);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const doc = await window.pdfjsLib.getDocument({ data: buffer, password: senha || undefined }).promise;
    const saida = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const largura = page.getViewport({ scale: 1 }).width;
      const pedacos = tc.items.filter(it => it.str && it.str.trim()).map(it => ({ x: it.transform[4], y: it.transform[5], s: it.str, w: it.width }));
      // Fatura em duas colunas (Santander, Itaú): se há várias datas começando na metade direita,
      // lê a coluna da esquerda inteira e depois a da direita
      const datasDireita = pedacos.filter(p => p.x > largura * 0.44 && /^\d{1,2}\/\d{1,2}\b/.test(p.s.trim()));
      let corte = Infinity;
      if (datasDireita.length >= 4) {
        // a coluna da direita começa no pedaço mais à esquerda entre o meio da página e a 1ª data
        // (títulos como "JOAO S SILVA - 5201…" e o dígito antes da data ficam um pouco antes)
        const inicioDatas = Math.min(...datasDireita.map(p => p.x));
        corte = Math.min(inicioDatas, ...pedacos.filter(p => p.x > largura * 0.44 && p.x < inicioDatas).map(p => p.x)) - 2;
      }
      for (const coluna of [pedacos.filter(p => p.x < corte), pedacos.filter(p => p.x >= corte)]) {
        const linhas = [];
        for (const it of coluna) {
          let l = linhas.find(l => Math.abs(l.y - it.y) < 3);
          if (!l) { l = { y: it.y, itens: [] }; linhas.push(l); }
          l.itens.push(it);
        }
        linhas.sort((a, b) => b.y - a.y);
        for (const l of linhas) {
          l.itens.sort((a, b) => a.x - b.x);
          let txt = "", fim = null;
          for (const it of l.itens) {
            if (fim !== null) txt += it.x - fim > 12 ? "   " : (it.x - fim > 1 ? " " : "");
            txt += it.s; fim = it.x + (it.w || 0);
          }
          saida.push(txt);
        }
      }
      saida.push("");
    }
    return saida.join("\n");
  };

  // Arquivo -> { itens, texto, tipo }
  F.lerArquivo = async function (file, faturaMes, senha) {
    const nome = file.name.toLowerCase();
    if (nome.endsWith(".pdf")) {
      const texto = await F.pdfParaTexto(await file.arrayBuffer(), senha);
      // a planilha lança a fatura no mês das compras: vencimento em outubro = aba de setembro
      const venc = F.vencimento(texto);
      if (venc) faturaMes = U.addMes(venc, -1);
      return { tipo: "PDF", texto, venc, mes: venc ? faturaMes : "", itens: F.lerTexto(texto, faturaMes) };
    }
    if (/\.(xlsx|xls|ods)$/.test(nome)) {
      await script(XLSX_URL);
      const wb = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      let itens = [];
      for (const n of wb.SheetNames) {
        const linhas = window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" });
        itens = itens.concat(F.lerTabela(linhas, faturaMes));
      }
      return { tipo: "Excel", texto: "", itens };
    }
    const texto = await file.text();
    if (/<OFX>|<STMTTRN>/i.test(texto)) return { tipo: "OFX", texto, itens: F.lerOFX(texto) };
    if (nome.endsWith(".csv") || nome.endsWith(".tsv")) return { tipo: "CSV", texto, itens: F.lerCSV(texto, faturaMes) };
    return { tipo: "Texto", texto, itens: F.lerTextoOuCSV(texto, faturaMes) };
  };

  F.lerTextoOuCSV = function (texto, faturaMes) {
    const prim = texto.split(/\r?\n/).filter(l => l.trim()).slice(0, 3).join("\n");
    if (/;|\t/.test(prim) && /data|date|\d{2}\/\d{2}/i.test(prim)) {
      const r = F.lerCSV(texto, faturaMes);
      if (r.length) return r;
    }
    return F.lerTexto(texto, faturaMes);
  };

  F.PROMPT_CLAUDE = `Leia esta fatura de cartão de crédito e me devolva SOMENTE um bloco CSV, separado por ponto e vírgula, com este cabeçalho:
data;descricao;parcela;valor
Regras:
- Uma linha por lançamento do período atual (ignore "próximas faturas", resumo, limites, encargos futuros).
- data no formato DD/MM/AAAA.
- descricao exatamente como está na fatura, sem o número da parcela.
- parcela no formato 3/10 (vazio se for à vista).
- valor em reais com vírgula decimal (ex.: 123,45). Estornos e créditos com sinal negativo. Ignore o pagamento da fatura anterior.
- Se a fatura tiver mais de um cartão (titular e adicional), inclua todos.
No fim, fora do CSV, diga o total que você somou e o total impresso na fatura.`;

  window.F = F;
})();
