// ==UserScript==
// @name         mx.vendetta.rooms.cost-timer.
// @namespace    mx.vendetta.rooms.cost-timer.
// @version      2.2.0
// @description  Colori costi + tooltip IT con produzione, risorse mancanti e tempo di attesa (Costruibile tra).
// @author       mx.
// @match        *://vendettagame.es/habitaciones*
// @run-at       document-end
// @grant        none
// @updateURL    https://github.com/dani-csg/rooms.costi-timer/raw/refs/heads/main/Rooms.Cost-Timer.user.js
// @downloadURL  https://github.com/dani-csg/rooms.costi-timer/raw/refs/heads/main/Rooms.Cost-Timer.user.js
// ==/UserScript==


(function () {
  'use strict';
  const $ = window.jQuery;
  if (!$) return;

  /* ================= STILE ================= */
  function ensureStyle() {
    if (document.getElementById('vdRoomsStyle')) return;
    const css = `
      .vd-cost-ok  { color:#14532d !important; font-weight:600; }
      .vd-cost-bad { color:#7f1d1d !important; font-weight:600; }

      .vd-tooltip {
        position:absolute;
        background:rgba(0,0,0,.80);
        color:#fff;
        padding:8px 10px;
        border-radius:6px;
        font-size:11px;
        line-height:1.45;
        z-index:99999;
        white-space:nowrap;
        pointer-events:none;
        box-shadow:0 4px 12px rgba(0,0,0,.45);
      }

      .vd-label { color:#ca8a04; }
      .vd-prod  { color:#15803d; }
      .vd-miss  { color:#b91c1c; }
      .vd-time  { color:#ffffff; }
    `;
    const s = document.createElement('style');
    s.id = 'vdRoomsStyle';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ================= HELPERS ================= */
  const parseNum = v =>
    parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;

  function formatThousands(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function formatTime(sec) {
    if (sec <= 0) return "00:00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return [h,m,s].map(v => String(v).padStart(2,'0')).join(":");
  }

  /* ================= TOOLTIP ================= */
  let tooltip = null;

  function showTip(e, html) {
    if (!tooltip) tooltip = $('<div class="vd-tooltip"></div>').appendTo('body');
    tooltip.html(html);
    tooltip.css({ top:e.pageY+14, left:e.pageX+14 }).show();
  }

  function hideTip() {
    if (tooltip) tooltip.hide();
  }

  /* ================= DISABLE GAME TOOLTIPS ================= */
  function disableGameTooltips($el) {
    const attrs = [
      'title','data-original-title','data-bs-original-title',
      'data-title','aria-label','data-toggle','data-bs-toggle'
    ];
    $el.find('*').addBack().each(function () {
      attrs.forEach(a => this.removeAttribute?.(a));
      try { this.title = ''; } catch(e){}
    });
  }

  /* ================= RISORSE & PRODUZIONE ================= */
  function getResources() {
    return {
      arm: parseNum($('#recursos-arm').data('cantidad')),
      mun: parseNum($('#recursos-mun').data('cantidad')),
      dol: parseNum($('#recursos-dol').data('cantidad'))
    };
  }

  function getProduction() {
    const prod = { arm:0, mun:0, dol:0 };

    $('.dropdown-produccion').each(function () {
      const m = $(this).text().match(/\+([\d\.,]+)\/hora/);
      if (!m) return;
      const val = parseNum(m[1]);

      if (this.id.includes('armas')) prod.arm = val;
      else if (this.id.includes('municion')) prod.mun = val;
      else if (this.id.includes('dolares')) prod.dol = val;
    });
    return prod;
  }

  /* ================= ROOMS ================= */
  function processRooms() {
    const res = getResources();
    const prod = getProduction();

    $('.habitacion-item').each(function () {
      const box = $(this);
      const costs = {
        arm: parseNum(box.data('costo-arm')),
        mun: parseNum(box.data('costo-mun')),
        dol: parseNum(box.data('costo-dol'))
      };

      box.find('.recurso').each(function () {
        const $r = $(this);
        const span = $r.find('span').first();
        const img  = $r.find('img').attr('src') || '';
        if (!span.length) return;

        let type = null;
        if (img.includes('/arm')) type = 'arm';
        else if (img.includes('/mun')) type = 'mun';
        else if (img.includes('/dol')) type = 'dol';
        else return;

        disableGameTooltips($r);

        const missing = Math.max(0, costs[type] - res[type]);
        const prodVal = prod[type];

        span.removeClass('vd-cost-ok vd-cost-bad')
            .addClass(missing === 0 ? 'vd-cost-ok' : 'vd-cost-bad');

        span.off('.vdtip');
        if (missing === 0) return;

        let html = `
<span class="vd-label">Produzione/ora:</span> <span class="vd-prod">${formatThousands(prodVal)}</span><br>
<span class="vd-label">Mancano:</span> <span class="vd-miss">${formatThousands(missing)}</span><br>
`;

        if (prodVal > 0) {
          const sec = Math.ceil(missing / prodVal * 3600);
          html += `<span class="vd-label">Costruibile tra:</span> <span class="vd-time">${formatTime(sec)}</span>`;
        } else {
          html += `<span class="vd-miss">Produzione assente</span>`;
        }

        span.on('mousemove.vdtip', e => showTip(e, html))
            .on('mouseleave.vdtip', hideTip);
      });
    });
  }

  /* ================= BOOT ================= */
  function boot() {
    ensureStyle();
    processRooms();
    setInterval(processRooms, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
