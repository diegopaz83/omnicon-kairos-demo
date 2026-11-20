/* Forecast y Backlog · motor (CAMBIOS 31-oct). Reemplaza el Excel con macros de control financiero.
   Partes: FxService (TRM de Odoo), ForecastCalculator (funciones puras), MovementEngine (movimientos)
   y repositorio del modulo (localStorage `kairos-forecast`). Toda lectura de Odoo pasa por OdooSim.
   Reglas: prompt «Forecast y Backlog» con los ajustes acordados: cuenta analitica = CECO, cluster = LATAM / North America,
   la TRM viene de Odoo (sin tasa de planeacion propia), lider y responsables desde Kairos, analista = Planeacion con la capacidad «Forecast».
   Montos siempre en la moneda de la cuenta; solo se convierten al mostrar o consolidar. */
(function () {
  'use strict';
  var LS = 'kairos-forecast';
  function OS() { return window.OdooSim; } function KM() { return window.KairosMaestros; }
  var HOY = (KM() && KM().HOY) || '2026-10-23', CUR = HOY.slice(0, 8) + '01', HORIZON = 15;
  var CATS = { LATAM: ['ENG', 'EQ'], NA: ['ENG', 'EXP'] };
  var CATMAP = { Engineering: 'ENG', Equipment: 'EQ', Viatics: 'EXP' };
  var CLN = { LATAM: 'LATAM', NA: 'North America' };
  var TYPES = ['Payment - Anticipated', 'Payment - Delayed', 'Forecast - Anticipated', 'Forecast - Delayed', 'Deleted'];

  /* ---------- fechas ---------- */
  function addM(m, n) { var y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1 + n; y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12; return y + '-' + String(mo + 1).padStart(2, '0') + '-01'; }
  function mOf(d) { return d.slice(0, 8) + '01'; }
  function months() { var r = []; for (var i = 0; i < HORIZON; i++) r.push(addM(CUR, i)); return r; }
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function mLabel(m) { return MES[+m.slice(5, 7) - 1] + ' ' + m.slice(2, 4); }
  function round(v, cur) { var f = cur === 'COP' ? 1 : 100; return Math.round(v * f) / f; }
  function bizDaysLeft(d) { var n = 0, x = new Date(d + 'T00:00:00Z'), m = x.getUTCMonth(); x.setUTCDate(x.getUTCDate() + 1); while (x.getUTCMonth() === m) { var w = x.getUTCDay(); if (w && w < 6) n++; x.setUTCDate(x.getUTCDate() + 1); } return n; }

  /* ---------- FxService ---------- */
  var Fx = {
    /* Facturado: TRM de Odoo a la fecha de la factura */
    onDate: function (v, from, to, date) { return OS().convert(v, from, to, date); },
    /* Forecast y backlog (meses futuros): ultima TRM de Odoo [ACORDADO 31-oct: Kairos no define tasa propia] */
    plan: function (v, from, to) { return OS().convert(v, from, to, HOY); },
    planText: function () { return 'TRM de Odoo del ' + HOY + ': USD→COP ' + OS().rateOn('USD', HOY).toLocaleString('es-CO') + ' · EUR→USD ' + OS().rateOn('EUR', HOY).toLocaleString('es-CO'); }
  };

  /* ---------- Lectura de Odoo (cache por sincronizacion) ---------- */
  var BASE = null;
  function readOdoo() {
    var os = OS(), km = KM(), accs = os.searchReadSync('account.analytic.account', []), moves = {}, out = {}, incons = [];
    os.searchReadSync('account.move', []).forEach(function (m) { moves[m.id] = m; });
    accs.forEach(function (a) {
      var k = km.ceco(a.code), pr = os.partner(a.partner_id);
      out[a.code] = { code: a.code, name: a.name, cliente: pr ? pr.name : a.partner_id, clienteId: a.partner_id, currency: a.currency_id, regional: a.x_regional, cluster: a.x_cluster,
        leader: k ? k.leader : '', tipo: k && k.tipo === 'servicio' ? 'Service' : 'Project', kEstado: k ? k.estado : 'activo', so: '', origin: '', po: '',
        raw: { quote: {}, inv: {} }, invM: {}, invoices: [] };
      if (!a.currency_id) incons.push({ code: a.code, kind: 'Cuenta sin moneda', text: a.code + ' no tiene moneda en Odoo.' });
    });
    os.searchReadSync('sale.order', []).forEach(function (s) { var x = out[s.analytic_account_id]; if (x) { x.so = s.name; x.origin = s.origin; x.po = s.client_order_ref; } });
    os.searchReadSync('sale.order.line', []).forEach(function (l) {
      Object.keys(l.analytic_distribution || {}).forEach(function (code) { var x = out[code]; if (!x) return; var c = CATMAP[l.categ]; if (!c) return; x.raw.quote[c] = (x.raw.quote[c] || 0) + l.price_subtotal; });
    });
    os.searchReadSync('account.move.line', []).forEach(function (l) {
      var mv = moves[l.move_id], codes = Object.keys(l.analytic_distribution || {});
      if (!codes.length) { incons.push({ code: '', kind: 'Factura sin cuenta', text: mv.name + ' tiene una línea sin cuenta analítica.' }); return; }
      codes.forEach(function (code) {
        var x = out[code]; if (!x) return;
        var sg = mv.move_type === 'out_refund' ? -1 : 1, c = CATMAP[l.categ], m = mOf(mv.invoice_date);
        x.invoices.push({ move: mv.name, date: mv.invoice_date, type: mv.move_type, categ: l.categ, cat: c || null, amount: sg * l.price_subtotal });
        if (!c) { incons.push({ code: code, kind: 'Categoría no mapeada', text: mv.name + ' (' + mv.invoice_date + ') trae una línea «' + l.categ + '» de ' + l.price_subtotal.toLocaleString('es-CO') + ' ' + x.currency + '.' }); return; }
        x.raw.inv[c] = (x.raw.inv[c] || 0) + sg * l.price_subtotal;
        x.invM[m] = x.invM[m] || {}; x.invM[m][c] = (x.invM[m][c] || 0) + sg * l.price_subtotal;
      });
    });
    Object.keys(out).forEach(function (code) {
      var x = out[code];
      if (x.cluster === 'NA' && (x.raw.quote.EQ || x.raw.inv.EQ)) incons.push({ code: code, kind: 'EQ en North America', text: code + ' tiene equipos (EQ) vendidos en North America, que solo muestra ENG y EXP.' });
    });
    BASE = { acc: out, incons: incons, at: new Date().toISOString(), n: accs.length + os.searchReadSync('account.move', []).length };
    return BASE;
  }
  function base() { return BASE || readOdoo(); }

  /* Reglas de region: LATAM suma EXP a ENG; NA ignora EQ (va a inconsistencias). */
  function byCat(raw, cluster) {
    var o = {}; CATS[cluster].forEach(function (c) { o[c] = raw[c] || 0; });
    if (cluster === 'LATAM') o.ENG += raw.EXP || 0;
    return o;
  }

  /* ---------- Repositorio ---------- */
  var ST = null;
  function load() { if (ST) return ST; try { ST = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { ST = null; } if (!ST || ST.v !== 1) { ST = seed(); save(); } if (!ST.bitacoras || ST.bitacoras.some(function (b) { return !b.code; })) { ST.bitacoras = seedBitacoras(); save(); } /* bitacoras por lider (version anterior) pasan a la semilla por CECO */ return ST; }
  function save() { try { localStorage.setItem(LS, JSON.stringify(ST)); } catch (e) {} fire(); }
  function reset() { ST = seed(); BASE = null; readOdoo(); save(); }
  function audit(who, what, code, cat, month, before, after, why) { ST.audit.push({ at: stamp(), by: who, what: what, code: code, cat: cat || '', month: month || '', before: before, after: after, why: why || '' }); }
  function stamp() { var d = new Date(); return HOY + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function uid(p) { ST.seq = (ST.seq || 0) + 1; return p + ST.seq; }

  /* ---------- ForecastCalculator (puro sobre base + estado) ---------- */
  function entry(code, cat, m) { var e = ST.entries[code]; return e && e[cat] && e[cat][m] || 0; }
  function calc(code) {
    var b = base().acc[code], st = load(); if (!b) return null;
    var tol = st.cfg.tol, quote = byCat(b.raw.quote, b.cluster), inv = byCat(b.raw.inv, b.cluster), cats = CATS[b.cluster], out = { code: code, b: b, cats: {}, status: 'COMPLETE', state: st.accStatus[code] || null };
    var rank = { COMPLETE: 0, MISSING: 1, OVER: 2 };
    cats.forEach(function (c) {
      var pending = Math.max(0, round(quote[c] - inv[c], b.currency)), adj = st.adj[code] && st.adj[code][c], backlog = adj ? adj.amount : pending, fc = 0;
      var e = st.entries[code] && st.entries[code][c] || {}; Object.keys(e).forEach(function (m) { if (m >= CUR) fc += e[m]; });
      fc = round(fc, b.currency);
      var rem = round(backlog - fc, b.currency), s = Math.abs(rem) <= tol ? 'COMPLETE' : rem > tol ? 'MISSING' : 'OVER';
      out.cats[c] = { quote: quote[c], inv: inv[c], pending: pending, backlog: backlog, adjusted: !!adj, adj: adj || null, forecast: fc, remaining: rem, status: s };
      if (rank[s] > rank[out.status]) out.status = s;
    });
    var tp = 0; cats.forEach(function (c) { tp += out.cats[c].pending; });
    if (!out.state) out.state = b.kEstado === 'cerrado' && tp <= tol ? 'closed' : 'active';
    return out;
  }
  function accounts(cluster) { var A = base().acc; return Object.keys(A).filter(function (k) { return !cluster || A[k].cluster === cluster; }).map(calc); }

  /* Capacidad (M, M+1, M+2): ingenieros requeridos y ocupacion */
  function capacity(cluster, m) {
    var p = load().cfg.cap[cluster], cur = cluster === 'LATAM' ? 'COP' : 'USD', eng = 0;
    accounts(cluster).forEach(function (a) { if (a.state === 'excluded') return; eng += Fx.plan(entry(a.code, 'ENG', m), a.b.currency, cur); });
    var per = p.rate * p.prod * p.days, req = per ? Math.ceil(eng / per) : 0;
    return { month: m, eng: eng, req: req, occ: p.eng ? req * p.prod / p.eng : 0, p: p, cur: cur };
  }
  function capacityCheck() { var per = 1260000 * 0.8 * 21, req = Math.ceil(608333271 / per); return { req: req, occ: Math.round(req * 0.8 / 41 * 1000) / 10 }; }

  /* ---------- MovementEngine ---------- */
  /* Propone movimientos desde un diff de la grilla: [{code, cat, month, before, after}] */
  function proposeFromDiff(diff) {
    var g = {}, out = [];
    diff.forEach(function (d) { var k = d.code + '|' + d.cat; (g[k] = g[k] || []).push(d); });
    Object.keys(g).forEach(function (k) {
      var L = g[k], dec = [], inc = [];
      L.forEach(function (d) { var v = d.after - d.before; if (v < 0) dec.push({ m: d.month, v: -v }); else if (v > 0) inc.push({ m: d.month, v: v }); });
      dec.forEach(function (d) {
        inc.forEach(function (i) {
          if (!d.v || !i.v) return;
          var x = Math.min(d.v, i.v);
          out.push({ code: L[0].code, cat: L[0].cat, amount: x, previous_month: d.m, current_month: i.m, type: i.m < d.m ? 'Forecast - Anticipated' : 'Forecast - Delayed', origin: 'grid_edit' });
          d.v -= x; i.v -= x;
        });
        if (d.v > 0) out.push({ code: L[0].code, cat: L[0].cat, amount: d.v, previous_month: d.m, current_month: null, type: 'Deleted', origin: 'grid_edit' });
      });
    });
    return out;
  }
  function addMovement(mv, who, status) {
    var x = { id: uid('MV-'), code: mv.code, record_month: CUR, cat: mv.cat, amount: mv.amount, previous_month: mv.previous_month || null, current_month: mv.type === 'Deleted' ? null : (mv.current_month || null),
      type: mv.type, reason: (mv.reason || '').trim(), origin: mv.origin || 'manual', status: status || 'confirmed', by: who, at: stamp() };
    if (x.status === 'confirmed' && !x.reason) throw new Error('Un movimiento confirmado necesita razón');
    ST.movements.push(x); audit(who, 'Movimiento ' + x.type, x.code, x.cat, x.current_month || x.previous_month, null, x.amount, x.reason); return x;
  }

  /* ---------- Permisos (validados aqui, no solo en la interfaz) ---------- */
  function me() { var sh = window.KAIROS_SHELL || {}; return { name: sh.user || '', role: sh.role || '', caps: sh.caps || [] }; }
  function isAnalyst(u) { u = u || me(); return u.caps.indexOf('forecast') >= 0; }
  function canSee(u) { u = u || me(); return isAnalyst(u) || ['direccion', 'planeacion', 'lider', 'admin'].indexOf(u.role) >= 0; }
  function canEdit(code, u) {
    u = u || me(); if (isAnalyst(u)) return true;
    var b = base().acc[code]; if (!b) return false;
    return b.leader === u.name || !!(KM() && KM().gestiona(u.name, b.regional, b.cluster));
  }
  /* Alcance obligatorio [ACORDADO 02-nov]: nadie ve lo que no le corresponde.
     Todo: analista de forecast, Planeacion, Administrativo (lectura) y Direccion general (sin grupo asignado).
     Lider de cluster o responsable de regional: su grupo (y sus propios CECO). Lider: solo sus CECO. */
  function scopeOf(u) {
    u = u || me();
    var g = KM() ? KM().grupos(u.name) : { clusters: [], regionales: [] };
    if (isAnalyst(u) || u.role === 'planeacion' || u.role === 'admin') return { kind: 'todo', g: g };
    if (u.role === 'direccion' && !g.clusters.length && !g.regionales.length) return { kind: 'todo', g: g };
    if (g.clusters.length) return { kind: 'cluster', g: g };
    if (g.regionales.length) return { kind: 'regional', g: g };
    return { kind: 'lider', g: g };
  }
  function seesAccount(code, u) {
    u = u || me(); if (scopeOf(u).kind === 'todo') return true;
    return canEdit(code, u);
  }

  /* ---------- Operaciones ---------- */
  /* Guarda cambios de la grilla. changes: [{code, cat, month, after}]; movs: movimientos propuestos con tipo y razon. */
  function saveGrid(changes, movs) {
    var u = me(), st = load();
    changes.forEach(function (c) { if (!canEdit(c.code, u)) throw new Error('Sin permiso para editar ' + c.code); if (c.month < CUR) throw new Error('Los meses pasados son de solo lectura'); });
    movs.forEach(function (m) { if (!m.reason || m.reason.trim().length < 3) throw new Error('Cada movimiento necesita razón'); });
    changes.forEach(function (c) {
      st.entries[c.code] = st.entries[c.code] || {}; st.entries[c.code][c.cat] = st.entries[c.code][c.cat] || {};
      var before = st.entries[c.code][c.cat][c.month] || 0, v = Math.max(0, c.after);
      if (v > 0) st.entries[c.code][c.cat][c.month] = v; else delete st.entries[c.code][c.cat][c.month];
      audit(u.name, 'Forecast', c.code, c.cat, c.month, before, v, (movs.filter(function (m) { return m.code === c.code && m.cat === c.cat; })[0] || {}).reason || 'Aumento de forecast');
    });
    movs.forEach(function (m) { addMovement(m, u.name, 'confirmed'); });
    save();
  }
  /* Ajuste de backlog (solo analista). Si el forecast supera el nuevo backlog, lo reduce desde el mes mas lejano y propone Deleted. */
  function previewBacklog(code, cat, amount) {
    var a = calc(code), c = a.cats[cat], over = round(c.forecast - amount, a.b.currency), cuts = [];
    if (over > load().cfg.tol) {
      var e = ST.entries[code] && ST.entries[code][cat] || {}, ms = Object.keys(e).filter(function (m) { return m >= CUR; }).sort().reverse(), left = over;
      ms.forEach(function (m) { if (left <= 0) return; var x = Math.min(e[m], left); cuts.push({ month: m, amount: round(x, a.b.currency) }); left = round(left - x, a.b.currency); });
    }
    return { pending: c.pending, cuts: cuts };
  }
  function adjustBacklog(code, cat, amount, reason, exclude) {
    var u = me(); if (!isAnalyst(u)) throw new Error('Solo el analista ajusta el backlog');
    if (!reason || reason.trim().length < 10) throw new Error('La razón debe tener al menos 10 caracteres');
    var a = calc(code), c = a.cats[cat]; if (amount < 0 || amount > c.pending + load().cfg.tol) throw new Error('El backlog no puede superar el pendiente (' + c.pending.toLocaleString('es-CO') + ' ' + a.b.currency + ')');
    var pv = previewBacklog(code, cat, amount);
    pv.cuts.forEach(function (x) {
      var e = ST.entries[code][cat], nv = round(e[x.month] - x.amount, a.b.currency);
      if (nv > 0) e[x.month] = nv; else delete e[x.month];
      addMovement({ code: code, cat: cat, amount: x.amount, previous_month: x.month, type: 'Deleted', reason: reason, origin: 'backlog_adjustment' }, u.name, 'confirmed');
    });
    ST.adj[code] = ST.adj[code] || {}; var before = c.backlog;
    ST.adj[code][cat] = { amount: amount, reason: reason.trim(), by: u.name, at: stamp() };
    audit(u.name, exclude ? 'Excluir cuenta' : 'Ajuste de backlog', code, cat, '', before, amount, reason);
  }
  function excludeAccount(code, reason) {
    var a = calc(code); Object.keys(a.cats).forEach(function (c) { adjustBacklog(code, c, 0, reason, true); });
    ST.accStatus[code] = 'excluded'; save();
  }

  /* ---------- Cierre mensual (por cluster) ---------- */
  function snapshot(cluster, m) { return load().snapshots.filter(function (s) { return s.cluster === cluster && s.month === m; }).sort(function (a, b) { return a.status === 'closed' ? -1 : 1; })[0] || null; }
  /* Paso 1: diferencias del mes anterior (comprometido vs facturado) */
  function closeDiffs(cluster) {
    var prev = addM(CUR, -1), sn = snapshot(cluster, prev), st = load(), tol = st.cfg.tol, out = [];
    if (!sn) return { prev: prev, diffs: [], snapshot: null };
    var done = {}; st.movements.forEach(function (mv) { if (mv.origin === 'month_close' && mv.record_month === CUR) done[mv.code + '|' + mv.cat] = (done[mv.code + '|' + mv.cat] || 0) + mv.amount; });
    var keys = {}; sn.lines.forEach(function (l) { keys[l.code + '|' + l.cat] = l.amount; });
    Object.keys(keys).forEach(function (k) {
      var p = k.split('|'), b = base().acc[p[0]]; if (!b) return;
      var inv = byCat((b.invM[prev] || {}), cluster)[p[1]] || 0, d = round(inv - keys[k], b.currency);
      if (Math.abs(d) <= tol) return;
      out.push({ code: p[0], cat: p[1], committed: keys[k], invoiced: inv, diff: d, kind: d > 0 ? 'over' : 'under', resolved: (done[k] || 0) >= Math.abs(d) - tol, b: b });
    });
    return { prev: prev, diffs: out, snapshot: sn };
  }
  function resolveDiff(d, type, toMonth, reason) {
    var u = me(); if (!isAnalyst(u)) throw new Error('Solo el analista cierra el mes');
    if (!reason || !reason.trim()) throw new Error('La razón es obligatoria');
    var amt = Math.abs(d.diff), e;
    ST.entries[d.code] = ST.entries[d.code] || {}; e = ST.entries[d.code][d.cat] = ST.entries[d.code][d.cat] || {};
    if (d.kind === 'over') {
      /* Payment - Anticipated: se descuenta de los meses futuros, empezando por el mas cercano */
      var left = amt; Object.keys(e).filter(function (m) { return m >= CUR; }).sort().forEach(function (m) { if (left <= 0) return; var x = Math.min(e[m], left); e[m] = round(e[m] - x, d.b.currency); if (e[m] <= 0) delete e[m]; left = round(left - x, d.b.currency); });
      addMovement({ code: d.code, cat: d.cat, amount: amt, previous_month: null, current_month: addM(CUR, -1), type: 'Payment - Anticipated', reason: reason, origin: 'month_close' }, u.name);
    } else if (type === 'Payment - Delayed') {
      if (!toMonth || toMonth < CUR) throw new Error('Elige un mes futuro');
      e[toMonth] = round((e[toMonth] || 0) + amt, d.b.currency);
      addMovement({ code: d.code, cat: d.cat, amount: amt, previous_month: addM(CUR, -1), current_month: toMonth, type: 'Payment - Delayed', reason: reason, origin: 'month_close' }, u.name);
    } else {
      addMovement({ code: d.code, cat: d.cat, amount: amt, previous_month: addM(CUR, -1), type: 'Deleted', reason: reason, origin: 'month_close' }, u.name);
    }
    save();
  }
  /* lineas que congelaria el snapshot del mes actual (vista previa del paso 2) */
  function snapLines(cluster) {
    var lines = [];
    accounts(cluster).forEach(function (a) {
      if (a.state !== 'active') return;
      Object.keys(a.cats).forEach(function (c) {
        var v = entry(a.code, c, CUR);
        if (cluster === 'LATAM' && v <= 0) return;
        lines.push({ code: a.code, leader: a.b.leader, cliente: a.b.cliente, tipo: a.b.tipo, currency: a.b.currency, regional: a.b.regional, cat: c, amount: v });
      });
    });
    return lines;
  }
  /* Paso 2: congela el snapshot del mes actual. LATAM solo lineas > 0; NA todas las cuentas activas, tambien en cero. */
  function takeSnapshot(cluster) {
    var u = me(); if (!isAnalyst(u)) throw new Error('Solo el analista toma el snapshot');
    var cd = closeDiffs(cluster); if (cd.diffs.some(function (d) { return !d.resolved; })) throw new Error('Resuelve primero todas las diferencias del mes anterior');
    var ex = snapshot(cluster, CUR); if (ex && ex.status === 'closed') throw new Error('Ya hay un snapshot cerrado de este mes y cluster');
    var lines = snapLines(cluster);
    if (ex) ST.snapshots.splice(ST.snapshots.indexOf(ex), 1);
    var s = { id: uid('SN-'), cluster: cluster, month: CUR, takenAt: stamp(), by: u.name, status: 'open', lines: lines };
    ST.snapshots.push(s); audit(u.name, ex ? 'Retomó snapshot' : 'Tomó snapshot', '', '', CUR, null, lines.length, CLN[cluster]); save(); return s;
  }
  function closeSnapshot(cluster) {
    var u = me(); if (!isAnalyst(u)) throw new Error('Solo el analista cierra el snapshot');
    var s = snapshot(cluster, CUR); if (!s) throw new Error('Toma primero el snapshot');
    if (load().snapshots.some(function (x) { return x !== s && x.cluster === cluster && x.month === CUR && x.status === 'closed'; })) throw new Error('Ya hay un snapshot cerrado de este mes y cluster');
    s.status = 'closed'; audit(u.name, 'Cerró snapshot', '', '', CUR, 'open', 'closed', CLN[cluster]); closedNotices(cluster); save();
  }

  /* ---------- Cumplimiento ---------- */
  function compliance(cluster, m) {
    var sn = snapshot(cluster, m), cur = cluster === 'LATAM' ? 'COP' : 'USD', rows = {}, A = base().acc;
    if (sn) sn.lines.forEach(function (l) {
      var r = rows[l.code] = rows[l.code] || { code: l.code, leader: l.leader, cliente: l.cliente, regional: l.regional, cluster: cluster, tipo: l.tipo, currency: l.currency, com: {}, inv: {}, inSnap: true };
      r.com[l.cat] = (r.com[l.cat] || 0) + l.amount;
    });
    Object.keys(A).forEach(function (code) {
      var b = A[code]; if (b.cluster !== cluster) return;
      b.invoices.forEach(function (iv) {
        if (!iv.cat || mOf(iv.date) !== m) return;
        var c = cluster === 'LATAM' && iv.cat === 'EXP' ? 'ENG' : iv.cat; if (CATS[cluster].indexOf(c) < 0) return;
        var r = rows[code] = rows[code] || { code: code, leader: b.leader, cliente: b.cliente, regional: b.regional, cluster: cluster, tipo: b.tipo, currency: b.currency, com: {}, inv: {}, inSnap: false, invList: [] };
        r.inv[c] = (r.inv[c] || 0) + iv.amount; r.invConv = (r.invConv || 0) + Fx.onDate(iv.amount, b.currency, cur, iv.date);
        (r.invList = r.invList || []).push(iv);
      });
    });
    return Object.keys(rows).map(function (k) {
      var r = rows[k], com = 0; Object.keys(r.com).forEach(function (c) { com += r.com[c]; });
      r.comConv = Fx.onDate(com, r.currency, cur, m); r.invConv = r.invConv || 0;
      r.comByCat = {}; r.invByCat = {}; CATS[cluster].forEach(function (c) { r.comByCat[c] = Fx.onDate(r.com[c] || 0, r.currency, cur, m); r.invByCat[c] = 0; });
      (r.invList || []).forEach(function (iv) { var c = cluster === 'LATAM' && iv.cat === 'EXP' ? 'ENG' : iv.cat; if (r.invByCat[c] != null) r.invByCat[c] += Fx.onDate(iv.amount, r.currency, cur, iv.date); });
      return r;
    });
  }
  function snapshotMonths(cluster) { var s = {}; load().snapshots.forEach(function (x) { if (x.cluster === cluster) s[x.month] = x.status; }); return Object.keys(s).sort().map(function (m) { return { month: m, status: s[m] }; }); }

  /* ---------- Reuniones ---------- */
  /* Reuniones de seguimiento [ACORDADO 02-nov]: Kairos sugiere cada mes a quien le toca y por que; no se programa ni se marca.
     El analista registra una Bitacora tipo Forecast con las conclusiones. Se escribe una vez por lider y se guarda con
     la foto de sus CECO activos ese dia: la historia se consulta por CECO y sigue al CECO aunque cambie de lider. */
  /* Novedades por CECO [ACORDADO 02-nov]: lo que hay que revisar en el mes, recalculado.
     El tamano del lider no cuenta. Informativo = pagos o forecast anticipados del mes. */
  var NOVK = { 'Mes sin facturación': 'sin facturar este mes', 'Sobrefacturación': 'facturó más de lo vendido', 'Inconsistencia de datos': 'inconsistencia de Odoo', 'Movimiento sin razón': 'movimiento en borrador', 'Forecast vencido': 'forecast vencido sin movimiento', 'Cuenta nueva con pendiente': 'cuenta nueva de Odoo sin forecast' };
  function novedades(cluster) {
    var out = {}, cd = null, al = []; try { cd = closeDiffs(cluster); } catch (e) {} try { al = alerts(cluster); } catch (e) {}
    var mvs = load().movements.filter(function (m) { return m.record_month === CUR && m.status === 'confirmed' && /Anticipated/.test(m.type) && m.current_month; });
    accounts(cluster).forEach(function (a) {
      if (a.state !== 'active') return;
      var nov = [], info = [], add = function (t) { if (nov.indexOf(t) < 0) nov.push(t); };
      if (a.status === 'MISSING') add('proyección incompleta');
      if (a.status === 'OVER') add('proyectado de más');
      al.forEach(function (x) { if (x.code === a.code && NOVK[x.kind]) add(NOVK[x.kind]); });
      if (cd) cd.diffs.forEach(function (x) { if (x.code === a.code && !x.resolved) add(x.kind === 'over' ? 'facturó de más en el cierre' : 'facturó de menos en el cierre'); });
      mvs.forEach(function (m) { if (m.code !== a.code) return; var k = m.type.indexOf('Payment') === 0 ? 'pago' : 'forecast'; info.push(m.previous_month ? k + ' anticipado de ' + mLabel(m.previous_month).split(' ')[0] + ' a ' + mLabel(m.current_month).split(' ')[0] : k + ' anticipado en el cierre de ' + mLabel(m.current_month).split(' ')[0]); });
      out[a.code] = { nov: nov, info: info };
    });
    return out;
  }
  /* Bitacora Forecast por CECO: la escribe el analista; la historia sigue al CECO aunque cambie de lider */
  function bitacoras() { return load().bitacoras || []; }
  function bitacorasOf(code) { return bitacoras().filter(function (b) { return b.code === code; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; }); }
  function addBitacora(code, text) {
    var u = me(); if (!isAnalyst(u)) throw new Error('Solo el analista de control financiero registra la bitácora');
    text = String(text || '').trim(); if (text.length < 10) throw new Error('Escribe la observación (mínimo 10 caracteres)');
    var acc = base().acc[code]; if (!acc) throw new Error('CECO no encontrado: ' + code);
    var nv = novedades(acc.cluster)[code] || { nov: [], info: [] };
    var b = { id: uid('BF-'), tipo: 'Forecast', at: stamp(), date: HOY, month: CUR, cluster: acc.cluster, code: code, leader: acc.leader, by: u.name, nov: nv.nov.concat(nv.info), text: text };
    load().bitacoras.push(b); audit(u.name, 'Bitácora Forecast', code, '', CUR, null, null, text.slice(0, 80)); save(); return b;
  }
  function seedBitacoras() {
    var B = [
      ['2026-08-14', 'LATAM', '30102003300', 'Luis Lara', [], 'El cliente consume más horas de lo previsto; se anticipa facturación de septiembre.'],
      ['2026-09-15', 'LATAM', '30102003300', 'Luis Lara', ['proyectado de más'], 'Quedó proyectada de más en 5 M; se ajusta en la grilla cuando el cliente confirme el consumo de octubre.'],
      ['2026-09-15', 'LATAM', '30104005200', 'Luis Lara', [], 'Factura retenida por cambio de razón social del cliente; pasa a octubre.'],
      ['2026-09-16', 'LATAM', '30202004200', 'Ernesto Osorio', [], 'El acta de avance de julio se aprobó tarde; se factura en agosto y septiembre sin cambio de total.'],
      ['2026-09-16', 'LATAM', '30401007200', 'Ernesto Osorio', [], 'Se descuentan las horas del paro de planta; el contrato sigue mensual.'],
      ['2026-09-17', 'LATAM', '30703002400', 'Iván Paternina', [], 'Los equipos llegan en noviembre; se proyectan en partes iguales hasta diciembre.'],
      ['2026-09-17', 'LATAM', '30702001100', 'Iván Paternina', [], 'Soporte DCS se factura mensual; sin cambios en el total.'],
      ['2026-09-18', 'NA', '30902002300', 'Jhon Herrera', [], 'Engineering billed monthly from September; review travel expenses in October.']
    ];
    return B.map(function (x, i) { return { id: 'BF-' + (i + 1), tipo: 'Forecast', at: x[0] + ' 17:3' + i, date: x[0], month: x[0].slice(0, 8) + '01', cluster: x[1], code: x[2], leader: x[3], by: 'Isabela Tierradentro', nov: x[4], text: x[5] }; });
  }
  function setMeeting(cluster, leader, patch) { var k = cluster + '|' + CUR + '|' + leader, r = ST.meetings[k] = ST.meetings[k] || { prog: false, done: false, notes: '' }; Object.keys(patch).forEach(function (x) { r[x] = patch[x]; }); save(); }

  /* ---------- Alertas e inconsistencias ---------- */
  function alerts(cluster) {
    var st = load(), out = [], day = +HOY.slice(8, 10), left = bizDaysLeft(HOY), known = st.known || {};
    accounts(cluster).forEach(function (a) {
      if (a.state !== 'active') return;
      var b = a.b;
      if (day > 5 && a.status !== 'COMPLETE') out.push({ kind: 'Proyección incompleta', level: 'warn', code: b.code, to: 'lider', leader: b.leader, text: b.code + ' ' + b.name + ': ' + Object.keys(a.cats).filter(function (c) { return a.cats[c].status !== 'COMPLETE'; }).map(function (c) { var x = a.cats[c]; return c + ' ' + (x.status === 'MISSING' ? 'falta ' : 'sobra ') + Math.abs(x.remaining).toLocaleString('es-CO') + ' ' + b.currency; }).join(' · ') });
      Object.keys(a.cats).forEach(function (c) {
        var e = st.entries[b.code] && st.entries[b.code][c] || {};
        Object.keys(e).forEach(function (m) {
          if (m >= CUR || !e[m]) return;
          var inv = byCat(b.invM[m] || {}, b.cluster)[c] || 0, mv = st.movements.some(function (x) { return x.code === b.code && x.cat === c && (x.previous_month === m); });
          if (inv < e[m] && !mv) out.push({ kind: 'Forecast vencido', level: 'warn', code: b.code, to: 'ambos', leader: b.leader, text: b.code + ' ' + c + ' de ' + mLabel(m) + ' sin facturar ni movimiento.' });
        });
      });
      var fc = 0; Object.keys(a.cats).forEach(function (c) { fc += entry(b.code, c, CUR); });
      var invNow = b.invM[CUR] ? Object.keys(b.invM[CUR]).reduce(function (s, c) { return s + b.invM[CUR][c]; }, 0) : 0;
      if (fc > 0 && !invNow && left <= 5) out.push({ kind: 'Mes sin facturación', level: 'warn', code: b.code, to: 'lider', leader: b.leader, text: b.code + ' tiene ' + fc.toLocaleString('es-CO') + ' ' + b.currency + ' proyectados en ' + mLabel(CUR) + ' y aún no factura; quedan ' + left + ' días hábiles.' });
      var q = 0, i = 0; Object.keys(b.raw.quote).forEach(function (c) { q += b.raw.quote[c]; }); Object.keys(b.raw.inv).forEach(function (c) { i += b.raw.inv[c]; });
      if (i > q + st.cfg.tol) out.push({ kind: 'Sobrefacturación', level: 'err', code: b.code, to: 'analista', leader: b.leader, text: b.code + ' facturó ' + i.toLocaleString('es-CO') + ' ' + b.currency + ' de ' + q.toLocaleString('es-CO') + ' vendidos.' });
      var pend = 0; Object.keys(a.cats).forEach(function (c) { pend += a.cats[c].pending; });
      if (pend > 0 && !known[b.code]) out.push({ kind: 'Cuenta nueva con pendiente', level: 'info', code: b.code, to: 'analista', leader: b.leader, text: b.code + ' ' + b.name + ' llegó de Odoo con pendiente y no estaba en el forecast.' });
    });
    st.movements.forEach(function (m) { var b = base().acc[m.code]; if (m.status === 'draft' && b && b.cluster === cluster) out.push({ kind: 'Movimiento sin razón', level: 'warn', code: m.code, to: 'ambos', leader: m.by, text: m.code + ' · ' + m.type + ' por ' + m.amount.toLocaleString('es-CO') + ' sigue en borrador.' }); });
    base().incons.forEach(function (x) { var b = base().acc[x.code]; if (!b || b.cluster === cluster) out.push({ kind: 'Inconsistencia de datos', sub: x.kind, level: 'err', code: x.code, to: 'analista', leader: b ? b.leader : '', text: x.text }); });
    return out;
  }

  /* ---------- Resumen por lider ---------- */
  function leaderSummary(cluster, regional, m) {
    var by = {};
    accounts(cluster).forEach(function (a) {
      if (a.state !== 'active' || (regional && a.b.regional !== regional) || !seesAccount(a.code)) return;
      var vals = {}, any = false; Object.keys(a.cats).forEach(function (c) { vals[c] = entry(a.code, c, m); if (vals[c]) any = true; });
      if (!any) return;
      var L = by[a.b.leader] = by[a.b.leader] || {}; (L[a.b.cliente] = L[a.b.cliente] || []).push({ code: a.code, name: a.b.name, currency: a.b.currency, vals: vals });
    });
    return by;
  }
  function notifyLeaders(cluster, regional, m, blocks) {
    var u = me(); ST.notices = (ST.notices || []).filter(function (n) { return !(n.month === m && n.regional === regional && n.cluster === cluster); });
    Object.keys(blocks).forEach(function (leader) { ST.notices.push({ id: uid('NT-'), leader: leader, cluster: cluster, regional: regional, month: m, by: u.name, at: stamp(), clients: Object.keys(blocks[leader]).length, seen: false }); });
    audit(u.name, 'Notificó resumen', '', '', m, null, Object.keys(blocks).length, (regional || CLN[cluster]));
    save();
  }

  /* Paso 3 del cierre [ACORDADO 03-nov]: el analista avisa a todos los lideres del snapshot cerrado.
     Cada lider recibe un aviso en su Inicio; al abrir Forecast queda «visto». Es la evidencia de la gestion. */
  function avisoLeaders(cluster) {
    var sn = snapshot(cluster, CUR); if (!sn) return [];
    var by = {}; sn.lines.forEach(function (l) { var o = by[l.leader] = by[l.leader] || { name: l.leader, codes: {}, tot: {} }; o.codes[l.code] = 1; o.tot[l.currency] = (o.tot[l.currency] || 0) + l.amount; });
    return Object.keys(by).sort(function (a, b) { return a.localeCompare(b, 'es'); }).map(function (k) { var o = by[k]; return { name: k, n: Object.keys(o.codes).length, tot: o.tot }; });
  }
  function avisosOf(cluster, month) { return (load().notices || []).filter(function (n) { return n.kind === 'cierre' && n.cluster === cluster && n.month === (month || CUR); }); }
  function avisarLideres(cluster, soloPendientes) {
    var u = me(); if (!isAnalyst(u)) throw new Error('Solo el analista avisa a los líderes');
    var sn = snapshot(cluster, CUR); if (!sn || sn.status !== 'closed') throw new Error('Cierra primero el snapshot de ' + mLabel(CUR));
    var prev = avisosOf(cluster), seen = {}; prev.forEach(function (n) { if (n.seen) seen[n.leader] = n.seen; });
    var L = avisoLeaders(cluster).filter(function (x) { return !soloPendientes || !seen[x.name]; }), at = stamp();
    ST.notices = (ST.notices || []).filter(function (n) { return !(n.kind === 'cierre' && n.cluster === cluster && n.month === CUR && L.some(function (x) { return x.name === n.leader; })); });
    L.forEach(function (x) { ST.notices.push({ id: uid('NT-'), kind: 'cierre', leader: x.name, cluster: cluster, month: CUR, by: u.name, at: at, n: x.n, tot: x.tot, seen: null, first: (prev.filter(function (n) { return n.leader === x.name; })[0] || {}).first || at }); });
    audit(u.name, soloPendientes ? 'Avisó de nuevo a líderes' : 'Avisó a los líderes', '', '', CUR, null, L.length, CLN[cluster]); save(); return L.length;
  }
  function markSeen(name) {
    var ch = false; (load().notices || []).forEach(function (n) { if ((n.kind === 'cierre' || n.kind === 'pedido') && n.leader === name && !n.seen) { n.seen = stamp(); ch = true; } });
    if (ch) save(); return ch;
  }

  /* ---------- Cierre: pedir actualizacion a los lideres y propuestas de resolucion [ACORDADO 03-nov] ---------- */
  /* festivos de Colombia (prototipo) para mover la fecha limite al siguiente dia habil */
  var FEST = ['2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25', '2027-01-01', '2027-01-11', '2027-03-22'];
  function habil(d) { var x = new Date(d + 'T12:00:00'); while (x.getDay() === 0 || x.getDay() === 6 || FEST.indexOf(x.toISOString().slice(0, 10)) >= 0) x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10); }
  /* limite: dia 5 calendario del mes del cierre (si ya paso, el del mes siguiente); si cae festivo o fin de semana, el siguiente habil */
  function deadline() { var d = habil(CUR.slice(0, 8) + '05'); if (d < HOY) d = habil(addM(CUR, 1).slice(0, 8) + '05'); return d; }
  function pedidoOf(cluster) { return ((load().pedidos || {})[cluster + '|' + CUR]) || null; }
  function leadersOf(cluster) { var o = {}; accounts(cluster).forEach(function (a) { if (a.state === 'active') o[a.b.leader] = 1; }); return Object.keys(o).sort(function (a, b) { return a.localeCompare(b, 'es'); }); }
  function proposals() { return load().proposals || (ST.proposals = {}); }
  function propKey(d) { return d.code + '|' + d.cat + '|' + addM(CUR, -1); }
  function proposalOf(d) { var p = proposals()[propKey(d)]; return p && p.status === 'pending' ? p : null; }
  /* estado de cada lider: visto, novedades de proyeccion y diferencias sin resolver (propuestas o no) */
  function leaderStatus(cluster) {
    var cd = closeDiffs(cluster), seen = {}, out = [];
    (load().notices || []).forEach(function (n) { if (n.kind === 'pedido' && n.cluster === cluster && n.month === CUR && n.seen) seen[n.leader] = n.seen; });
    leadersOf(cluster).forEach(function (L) {
      var acc = accounts(cluster).filter(function (a) { return a.state === 'active' && a.b.leader === L; });
      var miss = acc.filter(function (a) { return a.status === 'MISSING'; }).length, over = acc.filter(function (a) { return a.status === 'OVER'; }).length;
      var D = cd.diffs.filter(function (d) { return d.b.leader === L && !d.resolved; }), prop = D.filter(function (d) { return proposalOf(d); }).length;
      var resolvedBy = cd.diffs.filter(function (d) { return d.b.leader === L && d.resolved; }).length;
      out.push({ leader: L, seen: seen[L] || null, miss: miss, over: over, diffs: D.length, proposed: prop, resolved: resolvedBy, ready: !miss && !over && prop === D.length, codes: acc.length });
    });
    return out;
  }
  function pedirActualizacion(cluster, soloPendientes) {
    var u = me(); if (!isAnalyst(u)) throw new Error('Solo el analista pide la actualización');
    var key = cluster + '|' + CUR, P = (ST.pedidos = ST.pedidos || {}), at = stamp(), st = leaderStatus(cluster);
    if (!P[key]) P[key] = { by: u.name, at: at, deadline: deadline(), reminders: [] }; else if (soloPendientes) P[key].reminders.push(at);
    var to = st.filter(function (x) { return !soloPendientes || !x.ready || !x.seen; });
    ST.notices = (ST.notices || []).filter(function (n) { return !(n.kind === 'pedido' && n.cluster === cluster && n.month === CUR && to.some(function (x) { return x.leader === n.leader; })); });
    to.forEach(function (x) { ST.notices.push({ id: uid('NT-'), kind: 'pedido', leader: x.leader, cluster: cluster, month: CUR, by: u.name, at: at, deadline: P[key].deadline, seen: null }); });
    audit(u.name, soloPendientes ? 'Recordó la actualización' : 'Pidió actualización a los líderes', '', '', CUR, null, to.length, CLN[cluster]); save(); return to.length;
  }
  /* el lider propone como resolver su diferencia del cierre: que pasa con la plata y la razon (ambos obligatorios) */
  function proposeDiff(d, type, toMonth, reason) {
    var u = me(); if (!canEdit(d.code, u)) throw new Error('Solo el líder del CECO propone la resolución');
    reason = String(reason || '').trim(); if (reason.length < 5) throw new Error('Escribe la razón');
    if (d.kind === 'over') type = 'Payment - Anticipated'; else if (type !== 'Deleted') { type = 'Payment - Delayed'; if (!toMonth || toMonth < CUR) throw new Error('Elige el mes al que se aplaza'); }
    proposals()[propKey(d)] = { code: d.code, cat: d.cat, month: addM(CUR, -1), kind: d.kind, type: type, toMonth: type === 'Payment - Delayed' ? toMonth : null, reason: reason, amount: Math.abs(d.diff), by: u.name, at: stamp(), status: 'pending' };
    audit(u.name, 'Propuso resolución', d.code, d.cat, addM(CUR, -1), null, Math.abs(d.diff), type + ' · ' + reason); save();
  }
  function approveProposal(d) {
    var u = me(); if (!isAnalyst(u)) throw new Error('Solo el analista aprueba');
    var p = proposalOf(d); if (!p) throw new Error('No hay propuesta pendiente');
    resolveDiff(d, p.type, p.toMonth, p.reason); var mv = ST.movements[ST.movements.length - 1]; if (mv) mv.proposed_by = p.by;
    p.status = 'approved'; p.approvedBy = u.name; p.approvedAt = stamp(); save();
  }
  function closedNotices(cluster) {
    var u = me(), at = stamp();
    ST.notices = (ST.notices || []).filter(function (n) { return !(n.kind === 'cierre' && n.cluster === cluster && n.month === CUR); });
    avisoLeaders(cluster).forEach(function (x) { ST.notices.push({ id: uid('NT-'), kind: 'cierre', leader: x.name, cluster: cluster, month: CUR, by: u.name, at: at, n: x.n, tot: x.tot, seen: null, first: at }); });
  }

  /* ---------- Sincronizar y simular (demo) ---------- */
  function sync() { var u = me(); if (!isAnalyst(u)) throw new Error('Solo el analista sincroniza'); BASE = null; var b = readOdoo(); ST.sync = { at: stamp(), n: b.n, by: u.name }; save(); return ST.sync; }
  function simulateInvoice(code, cat, amount) {
    var u = me(); if (!isAnalyst(u) && u.role !== 'admin') throw new Error('Solo el analista o Administrativo simulan facturas');
    var map = { ENG: 'Engineering', EQ: 'Equipment', EXP: 'Viatics' }, id = OS().simulateInvoice(code, map[cat], amount, HOY);
    BASE = null; readOdoo(); audit(u.name, 'Factura simulada', code, cat, CUR, null, amount, id); save(); return id;
  }

  /* ---------- Semilla ---------- */
  function seed() {
    var s = { v: 1, entries: {}, adj: {}, accStatus: {}, movements: [], snapshots: [], meetings: {}, audit: [], notices: [], known: {}, seq: 100,
      cfg: { tol: 1, cap: { LATAM: { rate: 1260000, prod: 0.8, days: 21, eng: 41 }, NA: { rate: 880, prod: 0.8, days: 21, eng: 13 } } }, sync: { at: HOY + ' 06:00', n: 0, by: 'Sistema' } };
    ST = s; BASE = null; var B = readOdoo(), km = KM();
    function put(code, cat, m, v) { s.entries[code] = s.entries[code] || {}; s.entries[code][cat] = s.entries[code][cat] || {}; s.entries[code][cat][m] = (s.entries[code][cat][m] || 0) + v; }
    var SKIP = { '30312001900': 1, '30701006700': 1, '30311053600': 1, '30202004201': 1 };
    Object.keys(B.acc).forEach(function (code) {
      var b = B.acc[code], k = km.ceco(code); s.known[code] = 1;
      if (SKIP[code] || !k || k.estado !== 'activo') return;
      var q = byCat(b.raw.quote, b.cluster), iv = byCat(b.raw.inv, b.cluster);
      var from = k.inicio > HOY ? mOf(k.inicio) : CUR, to = mOf(k.fin); if (to < from) to = from;
      var ms = []; for (var m = from; m <= to && ms.length < HORIZON; m = addM(m, 1)) ms.push(m);
      CATS[b.cluster].forEach(function (c) {
        var pend = Math.max(0, round(q[c] - iv[c], b.currency)); if (!pend) return;
        var each = round(pend / ms.length, b.currency), acc = 0;
        ms.forEach(function (m, i) { var v = i === ms.length - 1 ? round(pend - acc, b.currency) : each; acc = round(acc + v, b.currency); if (v > 0) put(code, c, m, v); });
      });
    });
    /* Casos de prueba */
    put('30311053600', 'EQ', '2026-12-01', 10904000);           /* mover a un mes anterior -> Forecast - Anticipated */
    put('30202004201', 'EQ', '2026-11-01', 37400000);
    put('30102003300', 'ENG', '2027-01-01', 5000000);            /* OVER */
    s.adj['30701006700'] = { ENG: { amount: 0, reason: 'El cliente canceló la orden de compra el 15 de octubre; queda en espera de nueva negociación.', by: 'Isabela Tierradentro', at: '2026-10-16 09:12' } };
    /* Snapshots de jul, ago y sep: lo comprometido fue cercano a lo facturado, con algunas diferencias */
    var DEV = { '2026-09-01': { '30702001100': 3000000, '30027700000': 15000, '30301053200': -2000000, '30401007200': 4000000 }, '2026-08-01': { '30103004100': 20000000, '30902002300': 8000 }, '2026-07-01': { '30202004200': 15000000 } };
    var SKIPSN = { '2026-09-01': { '30313002700': 1 } };
    ['2026-07-01', '2026-08-01', '2026-09-01'].forEach(function (m) {
      ['LATAM', 'NA'].forEach(function (cl) {
        var lines = [];
        Object.keys(B.acc).forEach(function (code) {
          var b = B.acc[code], k = km.ceco(code); if (b.cluster !== cl || !k) return;
          if (SKIPSN[m] && SKIPSN[m][code]) return;
          var inv = byCat(b.invM[m] || {}, cl), active = k.inicio <= m.slice(0, 7) + '-28' && k.fin >= m;
          CATS[cl].forEach(function (c, ci) {
            var v = Math.max(0, inv[c] || 0); if (ci === 0 && DEV[m] && DEV[m][code]) v = Math.max(0, v + DEV[m][code]);
            if (cl === 'LATAM' && v <= 0) return;
            if (cl === 'NA' && !active && !v) return;
            lines.push({ code: code, leader: b.leader, cliente: b.cliente, tipo: b.tipo, currency: b.currency, regional: b.regional, cat: c, amount: v });
          });
        });
        s.snapshots.push({ id: 'SN-' + cl + '-' + m.slice(0, 7), cluster: cl, month: m, takenAt: m.slice(0, 8) + '03 08:00', by: 'Isabela Tierradentro', status: 'closed', lines: lines });
      });
    });
    /* Movimientos historicos */
    function mv(code, rm, cat, amount, pm, cm, type, reason, by) { s.movements.push({ id: 'MV-' + (s.seq++), code: code, record_month: rm, cat: cat, amount: amount, previous_month: pm, current_month: cm, type: type, reason: reason, origin: 'seed', status: 'confirmed', by: by, at: rm.slice(0, 8) + '04 10:00' }); }
    mv('30202004200', '2026-07-01', 'ENG', 15000000, '2026-07-01', '2026-08-01', 'Payment - Delayed', 'El cliente no aprobó el acta de avance a tiempo.', 'Isabela Tierradentro');
    mv('30103004100', '2026-07-01', 'EQ', 22000000, '2026-09-01', '2026-07-01', 'Forecast - Anticipated', 'El proveedor entregó los equipos antes de lo previsto.', 'Luis Lara');
    mv('30027700000', '2026-07-01', 'ENG', 12000, '2026-08-01', '2026-10-01', 'Forecast - Delayed', 'Pruebas FAT reprogramadas por el cliente.', 'Rafael de Vega');
    mv('30401007200', '2026-07-01', 'ENG', 5600000, '2026-07-01', null, 'Deleted', 'Horas no prestadas por paro de planta del cliente.', 'Ernesto Osorio');
    mv('30103004100', '2026-08-01', 'ENG', 20000000, '2026-08-01', '2026-11-01', 'Payment - Delayed', 'Orden de cambio pendiente de firma del cliente.', 'Isabela Tierradentro');
    mv('30902002300', '2026-08-01', 'ENG', 8000, '2026-08-01', '2026-09-01', 'Payment - Delayed', 'El cliente pidió facturar junto con el siguiente hito.', 'Isabela Tierradentro');
    mv('30702001100', '2026-08-01', 'ENG', 3000000, '2026-10-01', '2026-08-01', 'Payment - Anticipated', 'Se facturó en agosto un soporte previsto para octubre.', 'Isabela Tierradentro');
    mv('30029800000', '2026-08-01', 'ENG', 18000000, '2026-11-01', '2026-10-01', 'Forecast - Anticipated', 'El assessment avanzó más rápido de lo planeado.', 'Jhon Herrera');
    mv('30905000600', '2026-08-01', 'EXP', 2000, '2026-09-01', '2026-11-01', 'Forecast - Delayed', 'Viaje a Helsingborg aplazado a noviembre.', 'Natalie Ramírez');
    mv('30311055800', '2026-09-01', 'ENG', 12000000, '2026-10-01', '2026-12-01', 'Forecast - Delayed', 'Arranque en planta movido por paro de zafra.', 'Brainer Ocampo');
    mv('30802001200', '2026-09-01', 'ENG', 3600, '2026-09-01', null, 'Deleted', 'El cliente redujo el alcance del soporte.', 'Natalie Ramírez');
    mv('30204001500', '2026-09-01', 'ENG', 26800000, '2026-12-01', '2026-11-01', 'Forecast - Anticipated', 'Se adelanta la ingeniería de detalle.', 'Jhon Herrera');
    mv('30301053200', '2026-09-01', 'ENG', 7875000, '2026-11-01', '2026-09-01', 'Payment - Anticipated', 'El cliente consumió horas de la bolsa antes de lo previsto.', 'Isabela Tierradentro');
    mv('30902002300', '2026-09-01', 'EXP', 4500, '2026-10-01', '2026-12-01', 'Forecast - Delayed', 'Visita a Millsdale aplazada.', 'Jhon Herrera');
    mv('30104005200', '2026-09-01', 'ENG', 4000, '2026-09-01', '2026-10-01', 'Payment - Delayed', 'Factura retenida por cambio de razón social del cliente.', 'Isabela Tierradentro');
    mv('30032400000', '2026-10-01', 'ENG', 9500000, '2026-11-01', '2026-10-01', 'Payment - Anticipated', 'El cliente aprobó el acta de Holding TA3 antes de lo previsto.', 'Isabela Tierradentro');
    s.sync.n = B.n;
    return s;
  }

  /* ---------- Tableros (D-23, D-24, RF-25, RF-26 del levantamiento) ----------
     ok(code) filtra las cuentas que la persona puede ver. Montos consolidados en la moneda del cluster:
     facturado con la TRM de cada factura; comprometido y movimientos con la TRM del mes. */
  function ccy(cluster) { return cluster === 'LATAM' ? 'COP' : 'USD'; }
  function monthsBetween(a, b) { var r = []; for (var m = a; m <= b; m = addM(m, 1)) r.push(m); return r; }
  function billedByMonth(cluster, ok, from) {
    var cur = ccy(cluster), A = base().acc, M = monthsBetween(from || '2026-01-01', CUR), out = {};
    M.forEach(function (m) { out[m] = { month: m, inv: 0, cats: {}, com: null }; CATS[cluster].forEach(function (c) { out[m].cats[c] = 0; }); });
    Object.keys(A).forEach(function (code) {
      var b = A[code]; if (b.cluster !== cluster || (ok && !ok(code))) return;
      b.invoices.forEach(function (iv) { var m = mOf(iv.date), c = cluster === 'LATAM' && iv.cat === 'EXP' ? 'ENG' : iv.cat; if (!out[m] || !iv.cat || CATS[cluster].indexOf(c) < 0) return; var v = Fx.onDate(iv.amount, b.currency, cur, iv.date); out[m].inv += v; out[m].cats[c] += v; });
    });
    load().snapshots.forEach(function (s) { if (s.cluster !== cluster || !out[s.month]) return; var v = 0; s.lines.forEach(function (l) { if (!ok || ok(l.code)) v += Fx.onDate(l.amount, l.currency, cur, s.month); }); out[s.month].com = (out[s.month].com || 0) + v; });
    return M.map(function (m) { return out[m]; });
  }
  function billedByClient(cluster, ok, from) {
    var cur = ccy(cluster), A = base().acc, by = {};
    Object.keys(A).forEach(function (code) {
      var b = A[code]; if (b.cluster !== cluster || (ok && !ok(code))) return;
      b.invoices.forEach(function (iv) {
        if (!iv.cat || iv.date < (from || '2026-01-01')) return;
        var x = by[b.cliente] = by[b.cliente] || { cliente: b.cliente, total: 0, orig: {} };
        x.total += Fx.onDate(iv.amount, b.currency, cur, iv.date); x.orig[b.currency] = (x.orig[b.currency] || 0) + iv.amount;
      });
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.total - a.total; });
  }
  /* Cascada del mes m: comprometido + facturado de mas + no comprometido - aplazado - eliminado - sin resolver = facturado */
  function cascade(cluster, m, ok, cliente) {
    var cur = ccy(cluster), rows = compliance(cluster, m).filter(function (r) { return (!ok || ok(r.code)) && (!cliente || r.cliente === cliente); });
    var next = addM(m, 1), st = load(), s = { com: 0, over: 0, unplanned: 0, delayed: 0, deleted: 0, open: 0, inv: 0, cur: cur, month: m };
    rows.forEach(function (r) {
      s.inv += r.invConv;
      if (!r.inSnap) { s.unplanned += r.invConv; return; }
      s.com += r.comConv;
      CATS[cluster].forEach(function (c) {
        var d = (r.invByCat[c] || 0) - (r.comByCat[c] || 0); if (Math.abs(d) < 1e-6) return;
        if (d > 0) { s.over += d; return; }
        var gap = -d, rate = r.comByCat[c] && r.com[c] ? r.comByCat[c] / r.com[c] : Fx.onDate(1, r.currency, cur, m);
        var mv = st.movements.filter(function (x) { return x.code === r.code && x.cat === c && x.previous_month === m && (x.type === 'Payment - Delayed' || x.type === 'Deleted' || x.type === 'Forecast - Delayed'); });
        mv.forEach(function (x) { if (gap <= 0) return; var v = Math.min(gap, x.amount * rate); if (x.type === 'Deleted') s.deleted += v; else s.delayed += v; gap -= v; });
        if (gap > 0) s.open += gap;
      });
    });
    return s;
  }
  /* Cambios documentados (movimientos por mes de registro) y alertas por mes */
  function changesByMonth(cluster, ok) {
    var cur = ccy(cluster), A = base().acc, st = load(), M = monthsBetween(addM(CUR, -3), CUR), out = {};
    M.forEach(function (m) { out[m] = { month: m, ant: 0, del: 0, rem: 0, n: 0, justified: 0, alerts: { vencida: 0, sinFactura: 0, incompleta: 0 }, live: m === CUR }; });
    st.movements.forEach(function (x) {
      var b = A[x.code], o = out[x.record_month]; if (!o || !b || b.cluster !== cluster || (ok && !ok(x.code))) return;
      var v = Fx.onDate(x.amount, b.currency, cur, x.record_month);
      if (x.type.indexOf('Anticipated') >= 0) o.ant += v; else if (x.type === 'Deleted') o.rem += v; else o.del += v;
      o.n++; if (x.status === 'confirmed' && x.reason) o.justified++;
    });
    M.forEach(function (m) {
      var o = out[m];
      if (m === CUR) {
        alerts(cluster).forEach(function (a) { if (ok && a.code && !ok(a.code)) return; if (a.kind === 'Forecast vencido') o.alerts.vencida++; else if (a.kind === 'Mes sin facturación') o.alerts.sinFactura++; else if (a.kind === 'Proyección incompleta') o.alerts.incompleta++; });
        return;
      }
      /* Meses cerrados: se reconstruyen desde el snapshot y lo facturado */
      compliance(cluster, m).forEach(function (r) {
        if (!r.inSnap || (ok && !ok(r.code))) return;
        if (r.comConv > 0 && !r.invConv) o.alerts.sinFactura++;
        CATS[cluster].forEach(function (c) {
          if ((r.invByCat[c] || 0) + 1e-6 >= (r.comByCat[c] || 0)) return;
          var doc = st.movements.some(function (x) { return x.code === r.code && x.cat === c && x.previous_month === m; });
          if (!doc) o.alerts.vencida++;
        });
      });
    });
    return M.map(function (m) { return out[m]; });
  }

  var subs = [];
  function fire() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }
  window.addEventListener('storage', function (e) { if (e.key === LS) { ST = null; fire(); } });

  window.KairosForecast = {
    CUR: CUR, HOY: HOY, CATS: CATS, CLN: CLN, TYPES: TYPES, months: months, addM: addM, mLabel: mLabel, round: round, Fx: Fx,
    load: load, save: save, reset: reset, base: base, readOdoo: readOdoo, calc: calc, accounts: accounts, entry: entry, capacity: capacity, capacityCheck: capacityCheck,
    proposeFromDiff: proposeFromDiff, addMovement: function (m, status) { var u = me(); if (!canEdit(m.code, u)) throw new Error('Sin permiso para ' + m.code); var x = addMovement(m, u.name, status); save(); return x; },
    saveGrid: saveGrid, previewBacklog: previewBacklog, adjustBacklog: function (c, k, a, r) { adjustBacklog(c, k, a, r); save(); }, excludeAccount: excludeAccount,
    closeDiffs: closeDiffs, resolveDiff: resolveDiff, takeSnapshot: takeSnapshot, closeSnapshot: closeSnapshot, snapshot: snapshot, snapshotMonths: snapshotMonths,
    compliance: compliance, scopeOf: scopeOf, novedades: novedades, snapLines: snapLines, avisoLeaders: avisoLeaders, avisosOf: avisosOf, avisarLideres: avisarLideres, markSeen: markSeen, deadline: deadline, pedidoOf: pedidoOf, leaderStatus: leaderStatus, pedirActualizacion: pedirActualizacion, proposalOf: proposalOf, proposeDiff: proposeDiff, approveProposal: approveProposal, setMeeting: setMeeting, bitacoras: bitacoras, bitacorasOf: bitacorasOf, addBitacora: addBitacora, alerts: alerts, leaderSummary: leaderSummary, notifyLeaders: notifyLeaders,
    sync: sync, simulateInvoice: simulateInvoice, me: me, isAnalyst: isAnalyst, canSee: canSee, canEdit: canEdit, seesAccount: seesAccount,
    setCfg: function (cfg) { var u = me(); if (!isAnalyst(u) && u.caps.indexOf('administrar') < 0) throw new Error('Solo el analista o Administrar configuran'); load().cfg = cfg; audit(u.name, 'Configuración', '', '', '', null, null, JSON.stringify(cfg)); save(); },
    billedByMonth: billedByMonth, billedByClient: billedByClient, cascade: cascade, changesByMonth: changesByMonth,
    onChange: function (f) { subs.push(f); }
  };
})();
