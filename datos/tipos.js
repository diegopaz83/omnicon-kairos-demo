/* Kairos · iconos de tipo de CECO [ACORDADO 01-nov, boceto 11]
   Proyecto (bandera, azul) y Servicio con 4 subtipos: Mantenimiento (llave), Suministro (caja),
   Bolsa de horas (reloj de arena) y Puntual (rayo). Urgencia = Puntual con punto rojo.
   Glifo + color + tooltip corto: nunca depende solo del color.
   El subtipo es un atributo del CECO en Kairos (Odoo no lo trae). Lo usan todos los modulos via window.parent.KairosTipos. */
(function () {
  var G = {
    proyecto: '<path d="M5 21V4"/><path d="M5 4h11l-2.5 4L16 12H5"/>',
    mantenimiento: '<path d="M14.7 6.3a4 4 0 0 0-5.3 5.3L3.5 17.5a1.5 1.5 0 0 0 2.1 2.1l5.9-5.9a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.1-.5-.5-2.1z"/>',
    suministro: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    bolsa: '<path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/>',
    puntual: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    limpiar: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/><path d="m16 15 5 5M21 15l-5 5"/>'
  };
  var T = {
    proyecto: { label: 'Proyecto', tip: 'Proyecto' },
    mantenimiento: { label: 'Mantenimiento', tip: 'Servicio · Mantenimiento' },
    suministro: { label: 'Suministro', tip: 'Servicio · Suministro' },
    bolsa: { label: 'Bolsa de horas', tip: 'Servicio · Bolsa de horas' },
    puntual: { label: 'Puntual', tip: 'Servicio · Puntual' }
  };
  var SUBS = ['mantenimiento', 'suministro', 'bolsa', 'puntual'];
  function svg(k, s) { return '<svg class="kt-g" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + G[k] + '</svg>'; }
  /* tipo: 'proyecto' | 'servicio' (o 'Project' | 'Service'); sub: mantenimiento | suministro | bolsa | puntual | urgencia */
  function key(tipo, sub) {
    var t = String(tipo || '').toLowerCase();
    if (t === 'proyecto' || t === 'project') return { k: 'proyecto', urg: false };
    if (sub === 'urgencia') return { k: 'puntual', urg: true };
    return { k: T[sub] ? sub : 'puntual', urg: false };
  }
  function fromCode(code) {
    var M = window.KairosMaestros, c = M && M.ceco ? M.ceco(code) : null;
    return c ? key(c.tipo, c.sub) : null;
  }
  /* Baldosa con icono. size: 'sm' 24px · 'md' 30px (por defecto) · 'lg' 36px */
  function tile(tipo, sub, size) {
    var r = key(tipo, sub), px = { sm: [24, 14], md: [30, 17], lg: [36, 20] }[size || 'md'] || [30, 17], t = T[r.k];
    var tip = t.tip + (r.urg ? ' · Urgencia' : '');
    return '<span class="kt kt-' + r.k + (r.urg ? ' kt-urg' : '') + '" style="width:' + px[0] + 'px;height:' + px[0] + 'px" title="' + tip + '" role="img" aria-label="' + tip + '">' + svg(r.k, px[1]) + '</span>';
  }
  function tileCode(code, size, fallbackTipo) { var r = fromCode(code); return r ? tile(r.k === 'proyecto' ? 'proyecto' : 'servicio', r.urg ? 'urgencia' : r.k, size) : fallbackTipo ? tile(fallbackTipo, null, size) : ''; }
  function label(tipo, sub) { var r = key(tipo, sub); return T[r.k].tip + (r.urg ? ' · Urgencia' : ''); }
  /* Pista de servicios para el selector: 4 cuadritos con los colores de los subtipos */
  function dots() { return '<span class="kt-dots" title="Mantenimiento, Suministro, Bolsa de horas y Puntual" aria-hidden="true">' + SUBS.map(function (s) { return '<i class="kt-' + s + '"></i>'; }).join('') + '</span>'; }
  function flag(s) { return '<span class="kt-flag">' + svg('proyecto', s || 15) + '</span>'; }
  /* Boton de limpiar filtros: embudo con X, tooltip y contador de filtros activos */
  function clearBtn(n, attrs) {
    return '<button type="button" class="kt-clear"' + (attrs || '') + (n ? '' : ' disabled') + ' title="' + (n ? 'Limpiar filtros (' + n + ')' : 'Sin filtros para limpiar') + '" aria-label="Limpiar filtros">' + svg('limpiar', 18) + (n ? '<b>' + n + '</b>' : '') + '</button>';
  }
  var CSS = [
    ':root{--kt-proyecto:#002473;--kt-proyecto-bg:#e3e9fb;--kt-mantenimiento:#00727f;--kt-mantenimiento-bg:#dff4f6;--kt-suministro:#7a4f12;--kt-suministro-bg:#f3e8d6;--kt-bolsa:#5b33d6;--kt-bolsa-bg:#eee8ff;--kt-puntual:#3d4f66;--kt-puntual-bg:#e7ecf2;--kt-urg:#d23b44}',
    '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--kt-proyecto:#9db8ff;--kt-proyecto-bg:#1b2d55;--kt-mantenimiento:#5fd3e0;--kt-mantenimiento-bg:#0f3a42;--kt-suministro:#e2b877;--kt-suministro-bg:#3d2d14;--kt-bolsa:#b9a3ff;--kt-bolsa-bg:#2f2457;--kt-puntual:#b8c6d8;--kt-puntual-bg:#26364d;--kt-urg:#ff6b73}}',
    ':root[data-theme="dark"]{--kt-proyecto:#9db8ff;--kt-proyecto-bg:#1b2d55;--kt-mantenimiento:#5fd3e0;--kt-mantenimiento-bg:#0f3a42;--kt-suministro:#e2b877;--kt-suministro-bg:#3d2d14;--kt-bolsa:#b9a3ff;--kt-bolsa-bg:#2f2457;--kt-puntual:#b8c6d8;--kt-puntual-bg:#26364d;--kt-urg:#ff6b73}',
    '.kt{display:inline-flex;align-items:center;justify-content:center;border-radius:8px;flex:none;position:relative;vertical-align:middle}',
    '.kt .kt-g{display:block}',
    '.kt-proyecto{color:var(--kt-proyecto);background:var(--kt-proyecto-bg)}.kt-mantenimiento{color:var(--kt-mantenimiento);background:var(--kt-mantenimiento-bg)}.kt-suministro{color:var(--kt-suministro);background:var(--kt-suministro-bg)}.kt-bolsa{color:var(--kt-bolsa);background:var(--kt-bolsa-bg)}.kt-puntual{color:var(--kt-puntual);background:var(--kt-puntual-bg)}',
    '.kt-urg::after{content:"";position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:var(--kt-urg);box-shadow:0 0 0 2px var(--surface,#fff)}',
    '.kt-dots{display:inline-grid;grid-template-columns:5px 5px;gap:2px;vertical-align:middle}.kt-dots i{display:block;width:5px;height:5px;border-radius:2px}',
    '.kt-dots .kt-mantenimiento{background:var(--kt-mantenimiento)}.kt-dots .kt-suministro{background:var(--kt-suministro)}.kt-dots .kt-bolsa{background:var(--kt-bolsa)}.kt-dots .kt-puntual{background:var(--kt-puntual)}',
    '.kt-flag{display:inline-flex;color:var(--kt-proyecto)}',
    '.kt-clear{position:relative;width:40px;height:38px;border-radius:8px;border:1px solid var(--line,#dbe2ea);background:var(--surface,#fff);color:var(--primary,#002473);display:inline-flex;align-items:center;justify-content:center;flex:none;cursor:pointer;padding:0}',
    '.kt-clear:hover:not(:disabled){border-color:var(--primary,#002473)}',
    '.kt-clear:disabled{color:var(--off-ink,#b5c0ce);background:var(--surface-2,#f6f8fb);cursor:default;opacity:1}',
    '.kt-clear b{position:absolute;top:-6px;right:-6px;background:var(--primary,#002473);color:var(--primary-ink,#fff);font-size:10px;line-height:16px;min-width:16px;border-radius:999px;padding:0 4px;font-weight:600;box-shadow:0 0 0 2px var(--surface,#fff)}'
  ].join('\n');
  function inject(doc) {
    doc = doc || document; if (!doc || doc.getElementById('kt-css')) return;
    var st = doc.createElement('style'); st.id = 'kt-css'; st.textContent = CSS; (doc.head || doc.documentElement).appendChild(st);
  }
  window.KairosTipos = { T: T, SUBS: SUBS, key: key, fromCode: fromCode, tile: tile, tileCode: tileCode, label: label, dots: dots, flag: flag, clearBtn: clearBtn, inject: inject, CSS: CSS };
  try { inject(document); } catch (e) {}
})();
