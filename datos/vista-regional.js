/* Vista rapida por cluster y regional (CAMBIOS 31-oct, boceto 7 y 8 aprobados).
   Calculo unico que usan Inicio y Analitica. Determinista, sin IA.
   Fuentes: OdooSim (vendido, facturado, TRM), KairosMaestros (lider, estado, responsables),
   OmniaSeguimiento (alertas), KX (reservas de la semana) y el almacen de Proyectos (equipos).
   Indicadores por grupo [ACORDADO 31-oct]: facturacion, pendiente por facturar, alertas y ocupacion del equipo. */
(function () {
  'use strict';
  function O() { return window.OdooSim; } function K() { return window.KairosMaestros; }
  var CL = { LATAM: 'LATAM', NA: 'North America' };

  function proyectos() { try { var s = JSON.parse(localStorage.getItem('kairos-proyectos-v1-real') || 'null'); return s && s.projects ? s.projects : []; } catch (e) { return []; } }

  /* Moneda de consolidacion: la del cluster; con varios clusters, USD. */
  function moneda(cluster) { return cluster === 'LATAM' ? 'COP' : 'USD'; }

  /* Filas por CECO activo, montos convertidos a `cur`. Vendido con la TRM de hoy; facturado con la TRM de cada factura. */
  function filas(cur) {
    var os = O(), km = K(); if (!os || !km) return [];
    var hoy = km.HOY, moves = {}, team = {};
    os.searchReadSync('account.move', []).forEach(function (m) { moves[m.id] = m; });
    proyectos().forEach(function (p) { if (p.code) team[p.code] = p.team || []; });
    var al = {};
    if (window.OmniaSeguimiento) window.OmniaSeguimiento.evaluar().forEach(function (a) { var c = a.code; al[c] = al[c] || { critical: 0, important: 0 }; al[c][a.level] += 1; });
    var sol = os.searchReadSync('sale.order.line', []), aml = os.searchReadSync('account.move.line', []);
    return km.cecos.filter(function (k) { return k.estado === 'activo'; }).map(function (k) {
      var a = os.account(k.code), pr = os.partner(a.partner_id), sold = 0, inv = 0;
      sol.forEach(function (l) { if (l.analytic_distribution[k.code]) sold += os.convert(l.price_subtotal, a.currency_id, cur, hoy); });
      aml.forEach(function (l) {
        if (!l.analytic_distribution[k.code] || l.categ === 'Unclassified') return;
        var m = moves[l.move_id], sg = m.move_type === 'out_refund' ? -1 : 1;
        inv += sg * os.convert(l.price_subtotal, a.currency_id, cur, m.invoice_date);
      });
      return { code: k.code, name: a.name, cliente: pr ? pr.name : a.partner_id, regional: a.x_regional, cluster: a.x_cluster, currency: a.currency_id,
        leader: k.leader, sold: sold, inv: inv, alerts: al[k.code] || { critical: 0, important: 0 }, team: team[k.code] || [k.leader] };
    });
  }

  /* Lo que puede ver una persona: todo (Direccion, Planeacion, Administrativo) o lo que lidera mas su grupo. */
  function alcance(rows, nombre, role) {
    if (['direccion', 'planeacion', 'admin'].indexOf(role) >= 0) return rows;
    var km = K();
    return rows.filter(function (r) { return r.leader === nombre || (km && km.gestiona(nombre, r.regional, r.cluster)); });
  }

  /* Ocupacion del equipo: horas reservadas esta semana en esos CECO / capacidad semanal de las personas de sus equipos. */
  function ocupacion(rows) {
    var kx = window.KX; if (!kx || !kx.context) return null;
    var cx = kx.context(), y = kx.CUR.year, w = kx.CUR.week, cap = kx.capacity(y, w), codes = {}, people = {};
    rows.forEach(function (r) { codes[r.code] = 1; r.team.forEach(function (n) { people[n] = 1; }); });
    var names = Object.keys(people); if (!names.length || !cap) return null;
    var h = 0; names.forEach(function (n) { var b = cx.reserved(n, y, w).by || {}; Object.keys(b).forEach(function (c) { if (codes[c]) h += b[c]; }); });
    /* Sin reservas no hay dato (Reservas aun no esta conectada a los datos compartidos): mejor «—» que un 0 % engañoso */
    if (!h) return null;
    return { pct: Math.round(h * 100 / (names.length * cap)), horas: Math.round(h), personas: names.length, cap: cap };
  }

  function resumen(rows) {
    var s = { n: rows.length, sold: 0, inv: 0, critical: 0, important: 0, leaders: {} };
    rows.forEach(function (r) { s.sold += r.sold; s.inv += r.inv; s.critical += r.alerts.critical; s.important += r.alerts.important; s.leaders[r.leader] = 1; });
    s.pend = Math.max(0, s.sold - s.inv); s.pct = s.sold ? Math.round(s.inv * 100 / s.sold) : 0; s.nLeaders = Object.keys(s.leaders).length;
    s.occ = ocupacion(rows);
    return s;
  }

  /* Agrupa por 'regional' | 'leader' | 'cliente' | 'cluster'. Devuelve [{key, rows, s}] ordenado por pendiente. */
  function agrupar(rows, by) {
    var g = {}; rows.forEach(function (r) { var k = r[by]; (g[k] = g[k] || []).push(r); });
    return Object.keys(g).map(function (k) { return { key: k, rows: g[k], s: resumen(g[k]) }; }).sort(function (a, b) { return b.s.pend - a.s.pend; });
  }

  /* Regionales que gestiona una persona (cluster completo o su regional). */
  function regionalesDe(nombre) {
    var km = K(), os = O(); if (!km || !os) return [];
    var g = km.grupos(nombre), out = [];
    os.regionales().forEach(function (r) { if (g.clusters.indexOf(r.cluster) >= 0 || g.regionales.indexOf(r.id) >= 0) out.push(r); });
    return out;
  }

  function fmt(v, cur) {
    if (cur === 'COP') { var m = v / 1e6; return '$ ' + (m >= 100 ? Math.round(m).toLocaleString('es-CO') : m.toLocaleString('es-CO', { maximumFractionDigits: 1 })) + ' M'; }
    return 'US$ ' + (v >= 1e6 ? (v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 2 }) + ' M' : Math.round(v / 1000).toLocaleString('es-CO') + ' k');
  }

  window.KairosRegional = { CL: CL, moneda: moneda, filas: filas, alcance: alcance, resumen: resumen, agrupar: agrupar, regionalesDe: regionalesDe, ocupacion: ocupacion, fmt: fmt };
})();
