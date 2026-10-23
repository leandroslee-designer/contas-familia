/* Gráficos em SVG puro: colunas empilhadas, colunas simples e mini-linha. */
(function () {
  const U = D.U;
  const G = {};

  function escala(max) {
    if (max <= 0) return { top: 1, ticks: [0] };
    const pot = Math.pow(10, Math.floor(Math.log10(max / 4)));
    const passo = [1, 2, 2.5, 5, 10, 20].map(f => f * pot).find(s => max / s <= 5);
    const top = Math.ceil(max / passo) * passo;
    const ticks = [];
    for (let v = 0; v <= top + 1e-9; v += passo) ticks.push(v);
    return { top, ticks };
  }
  const curto = v => v >= 1000 ? (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : Math.round(v).toString();

  // Coluna arredondada só no topo (4px), presa à base
  function coluna(x, y, w, h, r) {
    if (h <= 0) return "";
    r = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  /* series: [{id, nome, cor}], meses: ["2026-01"...], valor(mes, serieId) */
  G.colunas = function (el, { meses, series, valor, destaque, aoClicar }) {
    const W = 720, H = 260, L = 46, R = 8, T = 12, B = 28;
    const totais = meses.map(m => series.reduce((s, se) => s + Math.max(0, valor(m, se.id)), 0));
    const { top, ticks } = escala(Math.max(...totais, 1));
    const pw = (W - L - R) / meses.length, bw = Math.min(42, pw * 0.62);
    const y = v => T + (H - T - B) * (1 - v / top);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gastos por mês">`;
    svg += `<g class="axis">`;
    for (const t of ticks) svg += `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${curto(t)}</text>`;
    meses.forEach((m, i) => svg += `<text x="${L + pw * i + pw / 2}" y="${H - 8}" text-anchor="middle" ${m === destaque ? 'style="font-weight:700;fill:var(--text)"' : ""}>${U.nomeMes(m, true)}</text>`);
    svg += `</g>`;
    meses.forEach((m, i) => {
      const x = L + pw * i + (pw - bw) / 2;
      let base = 0;
      const segs = series.map(se => ({ se, v: Math.max(0, valor(m, se.id)) })).filter(s => s.v > 0);
      segs.forEach((s, k) => {
        const y1 = y(base + s.v), y0 = y(base);
        const gap = k > 0 ? 2 : 0;
        const h = Math.max(0, y0 - y1 - gap);
        svg += k === segs.length - 1
          ? `<path d="${coluna(x, y1, bw, h, 4)}" fill="var(--${s.se.cor})"/>`
          : `<rect x="${x}" y="${y1}" width="${bw}" height="${h}" fill="var(--${s.se.cor})"/>`;
        base += s.v;
      });
      svg += `<rect class="hit" data-i="${i}" x="${L + pw * i}" y="${T}" width="${pw}" height="${H - T - B}" rx="8"/>`;
    });
    svg += `</svg>`;
    el.innerHTML = `<div class="chart">${svg}<div class="tip"></div></div>` +
      (series.length > 1 ? `<div class="legend">${series.map(s => `<span><i class="dot" style="background:var(--${s.cor})"></i>${U.esc(s.nome)}</span>`).join("")}</div>` : "");
    const tip = el.querySelector(".tip"), box = el.querySelector(".chart");
    el.querySelectorAll(".hit").forEach(h => {
      const i = +h.dataset.i, m = meses[i];
      h.addEventListener("mouseenter", () => {
        const linhas = series.map(s => ({ s, v: valor(m, s.id) })).filter(x => x.v);
        tip.innerHTML = `<div style="font-weight:700;margin-bottom:4px">${U.nomeMes(m)}</div>` +
          linhas.map(x => `<div class="tr"><span>${series.length > 1 ? `<i class="dot" style="background:var(--${x.s.cor})"></i>` : ""}${U.esc(x.s.nome)}</span><b>${U.brl(x.v)}</b></div>`).join("") +
          (series.length > 1 ? `<div class="tr" style="margin-top:4px;border-top:1px solid rgba(128,128,128,.4);padding-top:4px"><span>Total</span><b>${U.brl(totais[i])}</b></div>` : "");
        tip.classList.add("show");
        const r = box.getBoundingClientRect(), hr = h.getBoundingClientRect();
        let left = hr.left - r.left + hr.width / 2 - tip.offsetWidth / 2;
        left = Math.max(0, Math.min(left, r.width - tip.offsetWidth));
        tip.style.left = left + "px"; tip.style.top = "-6px";
      });
      h.addEventListener("mouseleave", () => tip.classList.remove("show"));
      if (aoClicar) h.addEventListener("click", () => aoClicar(m));
    });
  };

  G.spark = function (vals, cor = "var(--primary)") {
    const W = 200, H = 36, max = Math.max(...vals, 1);
    const pts = vals.map((v, i) => [vals.length === 1 ? W / 2 : (i * (W - 8)) / (vals.length - 1) + 4, H - 4 - (v / max) * (H - 10)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join("");
    const ult = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="${ult[0]}" cy="${ult[1]}" r="4" fill="${cor}" stroke="var(--surface)" stroke-width="2"/></svg>`;
  };

  window.G = G;
})();
