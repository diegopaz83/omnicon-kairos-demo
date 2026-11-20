/* Kairos · Ejecucion — tablero semanal de horas reales, horas extra y semanas bloqueadas.
   Reglas portadas de Planeacion v1 (16 oct) con la reserva como plan (24 oct). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var app = $('app');
  var SH = window.KAIROS_SHELL, HOST = window.KAIROS_HOST, X = window.KX;
  /* iconos de tipo de CECO compartidos [ACORDADO 01-nov] */
  var KT = null; try { KT = window.KairosTipos || (window.parent !== window ? window.parent.KairosTipos : null); if (KT) KT.inject(document); } catch (e) { }
  if (!SH || !HOST || !X) { app.innerHTML = '<div class="empty">Ejecución se abre dentro del Ecosistema de Kairos, con una sesión iniciada.</div>'; return; }

  /* ---------- Sesion y datos ---------- */
  var me = { name: SH.user, role: SH.role, caps: SH.caps || [] };
  var Y = X.CUR.year, CW = X.CUR.week;
  var ctx = X.context(), db = X.load(ctx);
  var R = me.role, ADM = me.caps.indexOf('administrar') >= 0;
  var isPlan = R === 'planeacion' || ADM;
  var readAll = isPlan || ['direccion', 'aprobador', 'admin'].indexOf(R) >= 0;
  var noAccess = R === 'sd';
  var OWN = !readAll && R === 'ejecutor';
  var ledCodes = ctx.projects.filter(function (p) { return p.leader === me.name; }).map(function (p) { return p.code; });
  var mobile = window.matchMedia('(max-width: 760px)').matches;

  var ui = {
    tab: /extras/.test(location.hash) ? 'extras' : /bloqueos/.test(location.hash) ? 'locks' : 'board',
    weeks: mobile ? [CW] : [CW - 1, CW, CW + 1], start: mobile ? CW - 1 : CW - 4, group: 'person', q: '', qo: false, fp: '',
    open: {}, edit: null, menu: null, dlg: null, notice: null, xf: { person: '', week: '', state: '', appr: '', q: '', view: '' }, xOpen: {}, lk: { start: '', end: '', err: '' }, reopen: {}
  };

  function persist() { X.save(db); try { if (HOST.refresh) HOST.refresh(); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var num = X.num, r1 = X.r1;
  function h(n) { return String(r1(num(n))).replace('.', ',') + ' h'; }
  function supplied(v) { return v !== null && v !== undefined && String(v).trim() !== ''; }
  function ic(id, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '"><use href="#' + id + '"></use></svg>'; }
  var tt;
  function toast(t) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(function () { el.hidden = true; }, 3200); }
  function notify(t, kind, undo) { ui.notice = { text: t, kind: kind || 'ok' }; ui.undo = undo || null; render(); }

  /* ---------- Semanas ---------- */
  var MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  function dm(s) { return +s.slice(8) + ' ' + MON[+s.slice(5, 7) - 1]; }
  function wr(w) { var s = X.weekStart(Y, w), e = X.add(s, 6); return s.slice(5, 7) === e.slice(5, 7) ? +s.slice(8) + '–' + dm(e) : dm(s) + ' – ' + dm(e); }
  function lockOf(w) { return db.locks.filter(function (l) { return l.active && l.year === Y && w >= l.start && w <= l.end; })[0]; }
  function isLocked(w) { return !!lockOf(w); }
  function isFuture(w) { return w > CW; }
  function cap(w) { return X.capacity(Y, w); }
  function hols(w) { return X.weekDays(Y, w).slice(0, 5).filter(function (d) { return X.holiday(d); }); }

  /* ---------- Personas y proyectos ---------- */
  function user(name) { return SH.users.filter(function (u) { return u.name === name; })[0]; }
  function roleLabel(name) { var u = user(name); if (!u) return 'Ingeniero'; var r = SH.roles.filter(function (x) { return x.key === u.role; })[0]; return r ? r.label : 'Ingeniero'; }
  function avatar(name, cls) { var u = user(name); var ini = name.split(' ').slice(0, 2).map(function (w) { return w.charAt(0); }).join(''); return '<span class="av' + (cls ? ' ' + cls : '') + '" title="' + esc(name) + '">' + (u ? SH.photo(u.face) : '<span class="ini">' + esc(ini) + '</span>') + '</span>'; }
  function prj(code) { return ctx.byCode[code]; }
  function pname(code) { var p = prj(code); return p ? p.name : code; }
  function approverFor(person, code) { var p = prj(code); return p && p.leader && p.leader !== person ? p.leader : 'Planeación'; }

  function recs(person, w, code) { return db.records.filter(function (r) { return r.year === Y && r.week === w && (!person || r.person === person) && (!code || r.code === code); }); }
  function exec(person, w, code) { return r1(recs(person, w, code).reduce(function (s, r) { return s + num(r.hours); }, 0)); }
  function resv(person, w) { return ctx.reserved(person, Y, w); }
  function dkey(person, w, code) { return person + '|' + w + '|' + code; }
  function isDirty(d) { return d.rows.some(function (r) { return String(r.value) !== String(r.orig) || (r.motivo || '') !== (r.omot || ''); }); }

  function scopePersons() {
    return ctx.persons.filter(function (p) {
      if (!p.active && !ui.weeks.some(function (w) { return exec(p.name, w) > 0 || resv(p.name, w).total > 0; })) return false;
      if (readAll) return true;
      if (p.name === me.name) return true;
      if (R === 'lider' || R === 'pm') {
        return ledCodes.some(function (c) { var pr = prj(c); return pr.team.indexOf(p.name) >= 0 || ui.weeks.some(function (w) { return exec(p.name, w, c) > 0 || resv(p.name, w).by[c]; }); });
      }
      return false;
    });
  }
  function visiblePersons() {
    var q = ui.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return scopePersons().filter(function (p) {
      if (q && p.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(q) < 0) return false;
      if (ui.fp && !ui.weeks.some(function (w) { return lineCodes(p.name, w).indexOf(ui.fp) >= 0; })) return false;
      return true;
    }).sort(function (a, b) { return a.name === me.name ? -1 : b.name === me.name ? 1 : a.name.localeCompare(b.name); });
  }
  /* Lineas visibles por ambito: un lider de proyecto ve solo sus proyectos en las tarjetas de su equipo */
  function codeVisible(person, code) {
    if (readAll || person === me.name) return true;
    return ledCodes.indexOf(code) >= 0;
  }
  function lineCodes(person, w) {
    var out = [];
    Object.keys(resv(person, w).by).forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); });
    recs(person, w).forEach(function (r) { if (out.indexOf(r.code) < 0) out.push(r.code); });
    Object.keys(db.drafts).forEach(function (k) { var d = db.drafts[k]; if (d.person === person && d.week === w && out.indexOf(d.code) < 0) out.push(d.code); });
    return out.filter(function (c) { return codeVisible(person, c); });
  }

  /* ---------- Permisos (hipotesis de interfaz; el backend debe validarlos) ---------- */
  function lineBlock(person, w, code) {
    if (noAccess) return 'Sin acceso';
    if (isFuture(w)) return 'Semana futura: solo reserva';
    if (isLocked(w)) return 'Semana bloqueada';
    var p = prj(code); if (!p) return 'Proyecto desconocido';
    if (p.state === 'cerrado') return 'Proyecto cerrado';
    if (p.state === 'auditoria' && !(isPlan || p.leader === me.name)) return 'En auditoría: corrigen el líder y Planeación';
    if (isPlan) return '';
    if ((R === 'lider' || R === 'ejecutor') && person === me.name) return '';
    if ((R === 'lider' || R === 'pm') && p.leader === me.name) return '';
    return 'Solo lectura';
  }
  function canEdit(person, w, code) { return !lineBlock(person, w, code); }
  function addable(person, w) {
    if (isFuture(w) || isLocked(w)) return [];
    var have = lineCodes(person, w);
    return ctx.projects.filter(function (p) {
      if (!p.open || have.indexOf(p.code) >= 0 || !canEdit(person, w, p.code)) return false;
      return p.internal || p.team.indexOf(person) >= 0 || p.leader === person || isPlan;
    });
  }
  /* Bloquear semanas: solo Planeacion [ACORDADO 3-nov]; se hace desde Configuracion */
  function isLockAdmin() { return R === 'planeacion'; }
  var EMB = /embed/.test(location.hash);

  /* ---------- Aceptar reserva, editar, guardar ---------- */
  function phaseClosed(code, ph, w) { var c = (prj(code).closed || {})[ph]; return !!c && (c.year < Y || (c.year === Y && w > c.week)); }
  function openPhases(code, w) { return prj(code).phases.filter(function (ph) { return !phaseClosed(code, ph, w); }); }
  function lastPhase(person, code, w) {
    var r = db.records.filter(function (x) { return x.person === person && x.code === code && x.week < w && x.phase !== X.NF && !phaseClosed(code, x.phase, w); }).sort(function (a, b) { return b.week - a.week; })[0];
    return r ? r.phase : (openPhases(code, w).filter(function (ph) { return ph !== X.NF; })[0] || X.NF);
  }
  function putRec(person, w, code, phase, val, how, motivo) {
    var i = -1; db.records.forEach(function (x, j) { if (x.year === Y && x.person === person && x.week === w && x.code === code && x.phase === phase) i = j; });
    var old = i >= 0 ? db.records[i] : null, from = old ? old.hours : null;
    if (val === null || val === 0) { if (i >= 0) db.records.splice(i, 1); return from !== null; }
    if (old && old.hours === val && (old.motivo || '') === (motivo || '')) return false;
    var rec = old || { id: 'e' + (++db.seq), year: Y, week: w, person: person, code: code, phase: phase, hours: 0, history: [] };
    rec.history = (rec.history || []).concat([{ at: new Date().toISOString(), by: me.name, from: from, to: val, how: how || 'editor' }]);
    rec.hours = val; rec.by = me.name; rec.at = X.TODAY; if (phase === X.NF) rec.motivo = motivo || rec.motivo || '';
    if (i < 0) db.records.push(rec);
    return true;
  }
  function acceptLines(person, w, codes) {
    var rv = resv(person, w), n = 0, hrs = 0;
    codes.forEach(function (c) {
      if (!rv.by[c] || exec(person, w, c) > 0 || !canEdit(person, w, c)) return;
      putRec(person, w, c, lastPhase(person, c, w), rv.by[c], 'aceptar-reserva'); n++; hrs += rv.by[c];
      delete db.drafts[dkey(person, w, c)];
    });
    if (!n) return;
    persist();
    var t = exec(person, w), c = cap(w);
    notify('Reserva aceptada como ejecutado · ' + person + ' · ' + wr(w) + ': ' + h(hrs) + '. Semana ' + h(t) + ' de ' + h(c) + '. Revisa la fase y ajusta si hiciste algo distinto.', 'ok');
  }
  function openDraft(person, w, code) {
    var k = dkey(person, w, code);
    if (db.drafts[k]) return db.drafts[k];
    var phs = prj(code).phases.slice();
    recs(person, w, code).forEach(function (r) { if (phs.indexOf(r.phase) < 0) phs.push(r.phase); });
    /* solo las fases con horas esa semana; las demas se agregan con el desplegable */
    var rows = recs(person, w, code).map(function (r) { var v = String(r.hours).replace('.', ','); return { phase: r.phase, value: v, orig: v, motivo: r.motivo || '', omot: r.motivo || '' }; });
    if (!rows.length) { var lp = lastPhase(person, code, w); rows.push({ phase: lp, value: '', orig: '', motivo: '', omot: '' }); }
    db.drafts[k] = { key: k, person: person, week: w, code: code, rows: rows, error: '', fe: {} };
    return db.drafts[k];
  }
  function draftSum(d) { return r1(d.rows.reduce(function (s, r) { return s + num(String(r.value).replace(',', '.')); }, 0)); }
  function draftWeek(d) { return r1(exec(d.person, d.week) - exec(d.person, d.week, d.code) + draftSum(d)); }
  function saveDraft(k) {
    var d = db.drafts[k]; if (!d) return;
    d.error = ''; d.fe = {};
    var why = lineBlock(d.person, d.week, d.code);
    if (why) { d.error = why + '. No se guardó ningún cambio.'; return render(); }
    d.rows.forEach(function (r, i) {
      var v = String(r.value).replace(',', '.');
      if (supplied(v) && (!isFinite(Number(v)) || Number(v) < 0 || Number(v) > 168 || Math.round(Number(v) * 2) !== Number(v) * 2)) d.fe[i] = 'Usa de 0 a 168 h, en pasos de 0,5.';
    });
    d.rows.forEach(function (r, i) {
      if (d.fe[i]) return;
      if (phaseClosed(d.code, r.phase, d.week) && String(r.value) !== String(r.orig)) d.fe[i] = 'Fase aprobada en Avance: no admite horas nuevas. Si es trabajo no cobrable, usa «No facturable».';
      else if (r.phase === X.NF && num(String(r.value).replace(',', '.')) > 0 && !r.motivo) d.fe[i] = 'Elige el motivo.';
    });
    if (Object.keys(d.fe).length) { d.error = 'Revisa los campos marcados. No se guardó ninguna fase.'; return render(); }
    if (draftWeek(d) > 168) { d.error = 'La semana suma más de 168 h. No se guardó ningún cambio.'; return render(); }
    (d.gone || []).forEach(function (ph) { if (!d.rows.some(function (r) { return r.phase === ph; })) putRec(d.person, d.week, d.code, ph, null); });
    var before = X.xState(db, d.person, Y, d.week);
    d.rows.forEach(function (r) { var v = String(r.value).replace(',', '.'); putRec(d.person, d.week, d.code, r.phase, supplied(v) ? Number(v) : null, null, r.motivo); });
    delete db.drafts[k]; ui.edit = null; persist();
    var t = exec(d.person, d.week), c = cap(d.week), xs = X.xState(db, d.person, Y, d.week);
    var msg = 'Horas guardadas · ' + d.person + ' · ' + wr(d.week) + ' · ejecutado ' + h(t) + ' de ' + h(c) + '.';
    if (xs === 'todo' || xs === 'stale' || xs === 'returned') msg += ' ' + h(t - c) + ' por encima de la capacidad: ' + (d.person === me.name ? 'distribúyelas en «Horas extra»' : d.person + ' debe distribuirlas en «Horas extra»') + (xs === 'stale' && before && before !== 'todo' ? ' (la ejecución cambió: hay que redistribuir)' : '') + '.';
    notify(msg, t > c ? 'warn' : 'ok');
  }

  /* ---------- Horas extra ---------- */
  /* COMP [ACORDADO 04-nov, boceto 36-37]: parte del excedente semanal que pasa a tiempo compensatorio; por CECO y semana (day -1); se avisa al lider, no se aprueba */
  var XTYPES = [{ id: 'HED', name: 'Extra diurna', sun: false }, { id: 'HEN', name: 'Extra nocturna', sun: false }, { id: 'HEDDF', name: 'Extra dominical o festiva diurna', sun: true }, { id: 'HENDF', name: 'Extra dominical o festiva nocturna', sun: true }, { id: 'COMP', name: 'Compensatorio', sun: null }];
  var XSTATE = { todo: 'Por distribuir', stale: 'Redistribuir', returned: 'Devuelta', pending: 'En aprobación', approved: 'Aprobadas', expired: 'Vencida' };
  function xType(id) { return XTYPES.filter(function (t) { return t.id === id; })[0]; }
  function dayDate(w, d) { return X.add(X.weekStart(Y, w), d); }
  function isSunHol(w, d) { return d === 6 || !!X.holiday(dayDate(w, d)); }
  /* Keep the hour type consistent with the day: Sunday or holiday uses the dominical types */
  var XPAIR = { HED: 'HEDDF', HEN: 'HENDF', HEDDF: 'HED', HENDF: 'HEN' };
  function fitType(w, d, t) { var sh = isSunHol(w, Number(d)), x = xType(t) || XTYPES[0]; return x.sun === sh ? x.id : XPAIR[x.id]; }
  function dayTypes(w, d) { var sh = isSunHol(w, Number(d)); return XTYPES.filter(function (t) { return t.sun === sh; }); }
  function dayLabel(w, d) { if (Number(d) < 0) return 'Toda la semana'; var s = dayDate(w, d); return DAYS[d] + ' ' + dm(s) + (X.holiday(s) ? ' · festivo' : ''); }
  function canApprove(row) { return row.status === 'pending' && (row.approver === me.name || (row.approver === 'Planeación' && R === 'planeacion')); }
  function xItems() {
    var seen = {}, out = [];
    db.records.forEach(function (r) {
      var k = r.person + '|' + r.week; if (seen[k] || r.year !== Y) return; seen[k] = 1;
      var ex = X.excess(db, r.person, Y, r.week); if (ex <= 0) return;
      var e = X.xEntry(db, r.person, Y, r.week);
      var mine = r.person === me.name || readAll || (e && e.rows.some(function (x) { return x.approver === me.name; })) || ((R === 'lider' || R === 'pm') && recs(r.person, r.week).some(function (x) { return ledCodes.indexOf(x.code) >= 0; }));
      if (!mine) return;
      out.push({ person: r.person, week: r.week, excess: ex, state: X.xState(db, r.person, Y, r.week), entry: e });
    });
    return out.sort(function (a, b) { return b.week - a.week || a.person.localeCompare(b.person); });
  }
  function myTodo() { return xItems().filter(function (it) { return it.person === me.name && /todo|stale|returned/.test(it.state); }); }
  function pendRows() {
    var out = [];
    db.extras.forEach(function (e) {
      if (e.status !== 'sent' || X.xState(db, e.person, e.year, e.week) !== 'pending') return;
      e.rows.forEach(function (r, i) { if (r.status === 'pending' && (r.approver === me.name || R === 'planeacion' || ADM)) out.push({ e: e, r: r, i: i }); });
    });
    return out.sort(function (a, b) { return (canApprove(b.r) ? 1 : 0) - (canApprove(a.r) ? 1 : 0) || b.e.week - a.e.week; });
  }
  function xDraft(person, w) {
    var e = X.xEntry(db, person, Y, w), st = X.xState(db, person, Y, w);
    if (!e) {
      var codes = []; recs(person, w).forEach(function (r) { if (codes.indexOf(r.code) < 0 && !prj(r.code).absence) codes.push(r.code); });
      var over = codes.map(function (c) { return { c: c, d: exec(person, w, c) - (resv(person, w).by[c] || 0) }; }).sort(function (a, b) { return b.d - a.d; });
      e = { id: 'x' + (++db.seq), year: Y, week: w, person: person, status: 'draft', rows: [] }; /* [ACORDADO 03-nov] se distribuye en la grilla CECO x dia; arranca vacio */
      db.extras.push(e); persist();
    } else if (e.status === 'sent' && (st === 'stale' || st === 'returned')) {
      e.status = 'draft'; e.rows.forEach(function (r) { r.status = 'draft'; r.reviewedBy = null; }); persist();
    }
    return e;
  }
  function sendExtras(id) {
    var e = db.extras.filter(function (x) { return x.id === id; })[0]; if (!e) return;
    var ex = X.excess(db, e.person, Y, e.week); e.error = ''; e.re = {};
    if (X.weeksLeft(Y, e.week) < 0) { e.error = 'Pasaron más de ' + X.WINDOW + ' semanas: ya no se pueden solicitar estas horas extra.'; return render(); }
    e.rows.forEach(function (r, i) {
      var hv = Number(String(r.hours).replace(',', '.'));
      if (!r.code) e.re[i] = 'Elige el proyecto.';
      else if (!isFinite(hv) || hv <= 0 || Math.round(hv * 2) !== hv * 2) e.re[i] = 'Horas mayores que 0, en pasos de 0,5.';
      else if (r.type === 'COMP') return;
      else if (xType(r.type).sun && !isSunHol(e.week, Number(r.day))) e.re[i] = 'Ese día no es domingo ni festivo: usa una extra diurna o nocturna.';
      else if (!xType(r.type).sun && isSunHol(e.week, Number(r.day))) e.re[i] = 'Ese día es domingo o festivo: usa una extra dominical o festiva.';
    });
    if (Object.keys(e.re).length) { e.error = 'Revisa las filas marcadas. No se envió.'; return render(); }
    if (!e.rows.length) { e.error = 'Escribe al menos una hora en la grilla.'; return render(); }
    var sum = r1(e.rows.reduce(function (s, r) { return s + Number(String(r.hours).replace(',', '.')); }, 0));
    if (sum > ex + 0.001) { e.error = 'Solo puedes solicitar hasta ' + h(ex) + ' (llevas ' + h(sum) + ').'; return render(); }
    e.status = 'sent'; e.sentAt = new Date().toISOString(); e.excessAtSend = ex;
    e.rows.forEach(function (r) { r.status = r.type === 'COMP' ? 'approved' : 'pending'; r.reviewedBy = r.type === 'COMP' ? 'aviso' : null; r.note = ''; r.hours = Number(String(r.hours).replace(',', '.')); r.day = Number(r.day); r.approver = approverFor(e.person, r.code); });
    persist();
    var who = e.rows.filter(function (r) { return r.type !== 'COMP'; }).map(function (r) { return r.approver; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ');
    var cp = r1(e.rows.filter(function (r) { return r.type === 'COMP'; }).reduce(function (s2, r) { return s2 + r.hours; }, 0)), xh = r1(sum - cp);
    notify(wr(e.week) + ': ' + (xh ? h(xh) + ' extra a aprobación (aprueba ' + who + ')' : '') + (xh && cp ? ' y ' : '') + (cp ? h(cp) + ' a tu compensatorio; se avisa al líder' : '') + (sum < ex ? '. No pediste ' + h(ex - sum) : '') + '.', 'ok');
  }
  function xSendAll() {
    var L = myTodo().map(function (it) { return { it: it, e: xDraft(it.person, it.week) }; }).filter(function (o) { var sm = xSum(o.e); return sm > 0 && sm <= o.it.excess + 0.001; });
    var tot = 0, ws = [];
    L.forEach(function (o) { var sm = xSum(o.e); sendExtras(o.e.id); if (o.e.status === 'sent') { tot += sm; ws.push('W' + o.e.week); } });
    if (ws.length) notify(h(r1(tot)) + ' extra enviadas a aprobación · ' + ws.join(', ') + '.', 'ok');
  }
  function review(id, i, ok, note) {
    var e = db.extras.filter(function (x) { return x.id === id; })[0], r = e && e.rows[i]; if (!r || !canApprove(r)) return;
    r.status = ok ? 'approved' : 'returned'; r.reviewedBy = me.name; r.reviewedAt = X.TODAY; r.note = note || '';
    persist();
  }

  /* ---------- Bloqueos ---------- */
  function weekGaps(w) {
    var c = cap(w);
    return ctx.persons.filter(function (p) { return p.active; }).map(function (p) { return { person: p.name, ex: exec(p.name, w) }; }).filter(function (x) { return x.ex < c; });
  }

  /* ---------- Asertividad [ACORDADO 31-oct]: dias reservados en un proyecto con alguna hora ejecutada en ese proyecto esa semana / dias reservados evaluables (sin ausencias) ---------- */
  function astDays(person, w) {
    var rv = resv(person, w), ok = 0, tot = 0;
    Object.keys(rv.days || {}).forEach(function (c) { var p = prj(c); if (!p || p.absence) return; var n = (rv.days[c] || []).length; tot += n; if (exec(person, w, c) > 0) ok += n; });
    return { ok: ok, tot: tot };
  }
  function weekStats(w, persons) {
    var res = 0, ex = 0, mn = 0, mx = 0, full = 0, n = 0;
    persons.forEach(function (p) {
      var rv = resv(p.name, w), codes = lineCodes(p.name, w);
      if (!codes.length && !rv.total) return; n++;
      if (exec(p.name, w) >= cap(w)) full++;
      /* semana en curso: la asertividad solo cuenta a quien ya registro algo */
      if (w === CW && exec(p.name, w) === 0) { codes.forEach(function (c) { res += rv.by[c] || 0; }); return; }
      codes.forEach(function (c) { res += rv.by[c] || 0; ex += exec(p.name, w, c); });
      var ad = astDays(p.name, w); mn += ad.ok; mx += ad.tot;
    });
    return { res: r1(res), ex: r1(ex), ast: mx ? Math.round(mn / mx * 100) : null, full: full, n: n };
  }

  /* ---------- Render ---------- */
  function render() {
    var fk = document.activeElement && document.activeElement.getAttribute('data-fk'), sel = null;
    try { sel = document.activeElement && document.activeElement.selectionStart; } catch (e) {}
    var sy = window.scrollY;
    if (noAccess) { app.innerHTML = head() + '<div class="empty">Tu rol no registra ni consulta horas ejecutadas. Si lo necesitas, pide la capacidad en Configuración.</div>'; return; }
    /* Sin pestanas [ACORDADO 3-nov]: Ejecucion y Horas extra son entradas del menu; Semanas bloqueadas vive en Configuracion */
    if (EMB) { document.documentElement.classList.add('emb'); app.innerHTML = noticeBar() + locksView(); $('ov').innerHTML = ''; fitFrame(); return; }
    app.innerHTML = head() + noticeBar() + (ui.tab === 'extras' ? extrasView() : boardView());
    $('ov').innerHTML = ui.dlg ? dialog() : '';
    if (fk) { var el = document.querySelector('[data-fk="' + fk + '"]'); if (el) { el.focus({ preventScroll: true }); if (sel != null && el.setSelectionRange && el.type !== 'number') try { el.setSelectionRange(sel, sel); } catch (e) {} } }
    window.scrollTo(0, sy);
  }
  function fitFrame() { try { var fe = window.frameElement; if (fe) fe.style.height = (document.documentElement.scrollHeight + 4) + 'px'; } catch (e) {} }
  function scopeText() {
    if (isPlan) return 'Planeación · todas las personas';
    if (readAll) return 'Consulta · todas las personas';
    if (R === 'pm') return 'Tus proyectos y su equipo';
    if (R === 'lider') return 'Tus horas y las de los proyectos que lideras';
    return 'Solo tus horas';
  }
  function head() {
    return '<div class="head"><div><h1>' + (ui.tab === 'extras' ? 'Horas extra' : OWN ? 'Mis horas' : 'Ejecución') + '</h1><p>' +
      (ui.tab === 'extras' ? 'El excedente de la semana sobre la capacidad se reparte en hora extra (por proyecto, día y tipo) o en compensatorio. La hora extra la aprueba el líder del proyecto (Planeación si quien trabajó es el líder); el compensatorio solo se le avisa.' :
        OWN ? 'Registra tus horas por proyecto y fase. Toca un proyecto para editarlo.' : 'Horas reales por persona, proyecto y fase. La reserva es el plan; lo ejecutado cierra el ciclo.') +
      '</p></div><span class="scope">' + avatar(me.name, 'sm') + esc(scopeText()) + '</span></div>';
  }
  function tabs() {
    var todo = myTodo().length, ap = pendRows().filter(function (x) { return canApprove(x.r); }).length;
    var t = [['board', 'Tablero semanal', ''], ['extras', 'Horas extra', (ap ? '<span class="count ap" title="Por aprobar">' + ap + '</span>' : '') + (todo ? '<span class="count" title="Por distribuir">' + todo + '</span>' : '')], ['locks', 'Semanas bloqueadas', '']];
    return '<div class="tabs" role="tablist">' + t.map(function (x) { return '<button role="tab" aria-selected="' + (ui.tab === x[0]) + '" data-a="tab" data-v="' + x[0] + '" data-fk="tab-' + x[0] + '">' + x[1] + x[2] + '</button>'; }).join('') + '</div>';
  }
  function noticeBar() {
    if (!ui.notice) return '';
    var n = ui.notice;
    return '<div class="banner ' + (n.kind === 'warn' ? 'warn' : n.kind === 'err' ? 'err' : 'ok') + '" role="status"><span class="b-ic">' + ic(n.kind === 'ok' ? 'i-check' : 'i-alert') + '</span><div class="txt"><b>' + esc(n.text) + '</b></div>' + (ui.undo ? '<button class="btn ghost sm" data-a="undo" data-fk="undo">Deshacer</button>' : '') + '<button class="icon-btn" data-a="nclose" aria-label="Cerrar aviso">' + ic('i-x') + '</button></div>';
  }

  /* ----- Tablero ----- */
  function carousel() {
    var html = '<div class="weeks"><button class="icon-btn" data-a="wprev" aria-label="Semanas anteriores" data-fk="wprev">' + ic('i-left') + '</button><div class="wlist" role="group" aria-label="Semanas">';
    for (var w = ui.start; w < ui.start + 8; w++) {
      var on = ui.weeks.indexOf(w) >= 0, lk = isLocked(w);
      html += '<button class="wk' + (w === CW ? ' cur' : '') + (isFuture(w) ? ' fut' : '') + '" aria-pressed="' + on + '" data-a="wk" data-v="' + w + '" data-fk="wk-' + w + '"><b>' + wr(w) + '</b><small>' + (lk ? ic('i-lock') : '') + 'W' + w + (hols(w).length ? ' · festivo' : '') + (isFuture(w) ? ' · reserva' : '') + '</small></button>';
    }
    return html + '</div><button class="icon-btn" data-a="wnext" aria-label="Semanas siguientes" data-fk="wnext">' + ic('i-right') + '</button></div>';
  }
  function nrm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function suggest(codes) {
    var q = nrm(ui.q).trim();
    var ps = scopePersons().filter(function (p) { return !q || nrm(p.name).indexOf(q) >= 0; }).sort(function (x, y) { return x.name.localeCompare(y.name); }).slice(0, 12);
    var pr = codes.filter(function (c) { return q && (nrm(c).indexOf(q) >= 0 || nrm(pname(c)).indexOf(q) >= 0); }).slice(0, 6);
    if (!ps.length && !pr.length) return '<div class="sug" role="listbox"><div class="sug-e">Sin coincidencias</div></div>';
    return '<div class="sug" role="listbox">' + (ps.length ? '<div class="sug-h">Personas</div>' + ps.map(function (p) { return '<button type="button" role="option" data-a="pickp" data-v="' + esc(p.name) + '">' + avatar(p.name, 'sm') + '<span>' + esc(p.name) + '</span></button>'; }).join('') : '') +
      (pr.length ? '<div class="sug-h">Proyectos</div>' + pr.map(function (c) { return '<button type="button" role="option" data-a="pickprj" data-v="' + esc(c) + '"><span class="sug-c">' + esc(c) + '</span><span>' + esc(pname(c)) + '</span></button>'; }).join('') : '') + '</div>';
  }
  function toolbar() {
    var codes = []; scopePersons().forEach(function (p) { ui.weeks.forEach(function (w) { lineCodes(p.name, w).forEach(function (c) { if (codes.indexOf(c) < 0) codes.push(c); }); }); });
    codes.sort();
    return '<div class="toolbar">' + (OWN ? '' : '<div class="sbox"><label class="search">' + ic('i-search') + '<span class="sr">Buscar persona</span><input type="search" placeholder="Buscar persona" autocomplete="off" role="combobox" aria-expanded="' + !!ui.qo + '" aria-autocomplete="list" value="' + esc(ui.q) + '" data-in="q" data-fk="q"></label>' + (ui.qo ? suggest(codes) : '') + '</div>') +
      '<select class="f" data-in="fp" data-fk="fp" aria-label="Filtrar por proyecto"><option value="">Todos los proyectos</option>' + codes.map(function (c) { return '<option value="' + c + '"' + (ui.fp === c ? ' selected' : '') + '>' + esc(c + ' · ' + pname(c)) + '</option>'; }).join('') + '</select>' +
      (OWN ? '' : '<div class="seg" role="group" aria-label="Agrupar"><button data-a="group" data-v="person" aria-pressed="' + (ui.group === 'person') + '" data-fk="g-person">Por persona</button><button data-a="group" data-v="project" aria-pressed="' + (ui.group === 'project') + '" data-fk="g-project">Por proyecto</button></div>') +
      '<span class="sp"></span><button class="btn ghost sm" data-a="xlsdown" data-fk="xlsdown">' + ic('i-down') + 'Plantilla Excel</button>' +
      (ui.weeks.some(function (w) { return !isFuture(w) && !isLocked(w); }) && !(readAll && !isPlan) ? '<button class="btn ghost sm" data-a="xlsup" data-fk="xlsup">' + ic('i-up') + 'Cargar plantilla</button><input type="file" id="xlsFile" accept=".csv,text/csv" hidden>' : '') + '</div>';
  }
  function draftsBar() {
    var ds = Object.keys(db.drafts).map(function (k) { return db.drafts[k]; }).filter(isDirty);
    if (!ds.length) return '';
    return '<div class="drafts" role="status">' + ic('i-alert') + '<b>' + ds.length + ' borrador' + (ds.length > 1 ? 'es' : '') + ' sin guardar</b><ul>' + ds.map(function (d) {
      return '<li>' + esc(d.person) + ' · ' + esc(d.code) + ' · ' + wr(d.week) + (isLocked(d.week) ? ' · semana bloqueada' : '') + ' <button class="link" data-a="gotodraft" data-k="' + esc(d.key) + '">Mostrar</button></li>';
    }).join('') + '</ul></div>';
  }
  function summaries(persons) {
    return '<div class="sumrow" style="grid-template-columns:repeat(' + ui.weeks.length + ',minmax(0,1fr))">' + ui.weeks.map(function (w) {
      var s = weekStats(w, persons), lk = lockOf(w), hl = hols(w);
      return '<div class="wsum"><div class="wsum-h"><b>' + wr(w) + '</b><small>W' + w + ' · capacidad ' + h(cap(w)) + (hl.length ? ' (festivo ' + hl.map(dm).join(', ') + ')' : '') + '</small>' +
        (lk ? '<span class="pill">' + ic('i-lock') + 'Bloqueada</span>' : isFuture(w) ? '<span class="pill sim">Solo reserva</span>' : w === CW ? '<span class="pill pri">En curso</span>' : '') + '</div>' +
        '<div class="kv"><span>Reservado <b>' + h(s.res) + '</b></span>' + (isFuture(w) ? '' : '<span>Ejecutado <b>' + h(s.ex) + '</b></span><span>Completas <b>' + s.full + '/' + s.n + '</b></span><span title="Días reservados en un proyecto con horas ejecutadas en ese proyecto esa semana, sobre los días reservados (sin ausencias)">Asertividad <b>' + (s.ast == null ? '—' : s.ast + ' %') + '</b>' + (w === CW ? ' <span class="muted">parcial</span>' : '') + ' </span>') + '</div></div>';
    }).join('') + '</div>';
  }
  function boardView() {
    var persons = visiblePersons();
    var html = '<div class="card" style="gap:12px;padding:14px">' + carousel() + toolbar() + '</div>' + draftsBar() + (OWN ? '' : summaries(persons));
    if (!persons.length) return html + '<div class="empty">No hay personas con horas o reservas en estas semanas' + (ui.q || ui.fp ? ' con estos filtros' : '') + '.</div>' + legend();
    html += '<div class="board">' + (!OWN && ui.group === 'project' ? projectRows(persons) : persons.map(personRow).join('')) + '</div>';
    return html + legend();
  }
  function legend() {
    return '<div class="legend"><span><i style="background:var(--off-ink)"></i>Menos de la capacidad</span><span><i style="background:var(--ok-ink)"></i>Completa</span><span><i style="background:var(--err-ink)"></i>Excede: pasa a horas extra</span>' + (OWN ? '' : '<span class="pill prop">Asertividad: días reservados con horas en el proyecto · indicador general</span>') +
      '<span class="pill sim">Capacidad: 42 h · 33 h con un festivo · 24 h con dos</span><span class="pill sim">Se registra por fase; las fases las define el proyecto (Proyectos › Settings)</span><span class="pill sim">Contratos: la Disponibilidad no se registra</span></div>';
  }
  function cols() { return '<div class="cols" style="grid-template-columns:repeat(' + ui.weeks.length + ',minmax(0,1fr))">'; }
  function personRow(p) {
    var sub = roleLabel(p.name) + (p.active ? '' : ' · inactivo');
    return '<section class="prow"><div class="prow-h">' + avatar(p.name) + '<div class="nm"><b>' + esc(p.name) + (p.name === me.name ? ' <span class="pill pri">Tú</span>' : '') + '</b><small>' + esc(sub) + '</small></div></div>' + cols() + ui.weeks.map(function (w) { return weekCard(p.name, w); }).join('') + '</div></section>';
  }
  /* Estado de la semana [ACORDADO 30-oct]: un solo color por estado (falta, completa, excede), sin desglose por proyecto */
  function loadBlock(person, w) {
    var t = exec(person, w), c = cap(w), rv = resv(person, w).total, fut = isFuture(w);
    var st = fut ? 'res' : t > c ? 'over' : t === c ? 'full' : 'under';
    var txt = fut ? 'Reservado ' + h(rv) : t > c ? 'Excede ' + h(t - c) : t === c ? 'Completa' : t === 0 ? 'Sin horas · faltan ' + h(c) : 'Faltan ' + h(c - t);
    var wd = fut ? Math.min(100, rv / c * 100) : t > c ? 100 : t / c * 100;
    return '<div class="load"><div class="load-t"><span class="st-' + st + '">' + (st === 'full' ? ic('i-check') : '') + '<b>' + txt + '</b></span><span class="muted">' + h(fut ? rv : t) + ' de ' + h(c) + '</span></div>' +
      '<div class="bar" role="img" aria-label="' + esc(txt) + '"><i class="' + st + '" style="width:' + wd + '%"></i></div></div>';
  }
  /* Asertividad por dias reservados [ACORDADO 31-oct]: indicador discreto; no lo ve quien solo registra sus horas */
  function astOf(person, w) {
    if (OWN || isFuture(w) || (person === me.name && !readAll)) return null;
    if (w === CW && exec(person, w) === 0) return null;
    var ad = astDays(person, w);
    return ad.tot ? Math.round(ad.ok / ad.tot * 100) : null;
  }
  function addBtn(person, w, add) {
    var mk = 'add|' + person + '|' + w;
    return '<span class="kw"><button class="addc" data-a="menu" data-v="' + esc(mk) + '" aria-haspopup="menu" aria-expanded="' + (ui.menu === mk) + '" title="Agregar proyecto" aria-label="Agregar proyecto a ' + wr(w) + '" data-fk="addc-' + esc(person + '|' + w) + '">' + ic('i-plus') + '</button>' +
      (ui.menu === mk ? '<div class="menu left" role="menu">' + add.map(function (p) { return '<button role="menuitem" data-a="addpick" data-p="' + esc(person) + '" data-w="' + w + '" data-v="' + esc(p.code) + '"><span class="code">' + esc(p.code) + '</span><span>' + esc(p.name) + '</span></button>'; }).join('') + '</div>' : '') + '</span>';
  }
  function kebab(person, w) {
    var mk = person + '|' + w;
    return '<span class="kw"><button class="icon-btn" data-a="menu" data-v="' + esc(mk) + '" aria-haspopup="menu" aria-expanded="' + (ui.menu === mk) + '" title="Más acciones de la semana" aria-label="Más acciones de la semana" data-fk="menu-' + esc(mk) + '">' + ic('i-dots') + '</button>' +
      (ui.menu === mk ? '<div class="menu" role="menu"><button role="menuitem" data-a="copy" data-p="' + esc(person) + '" data-w="' + w + '">' + ic('i-copy') + 'Copiar desde otra semana</button><button role="menuitem" class="danger" data-a="del" data-p="' + esc(person) + '" data-w="' + w + '">' + ic('i-trash') + 'Borrar ejecución de la semana</button></div>' : '') + '</span>';
  }
  function weekCard(person, w) {
    var codes = lineCodes(person, w).filter(function (c) { return !ui.fp || c === ui.fp; });
    var lk = isLocked(w), fut = isFuture(w), xs = fut ? null : X.xState(db, person, Y, w);
    var add = addable(person, w), canAny = !fut && !lk && (codes.some(function (c) { return canEdit(person, w, c); }) || add.length), ast = astOf(person, w);
    var html = '<article class="wcard' + (lk ? ' locked' : '') + (fut ? ' fut' : '') + '"><div class="wc-h"><span class="wt">' + wr(w) + '</span><small class="wn">W' + w + '</small>' + (add.length ? addBtn(person, w, add) : '') + '<span class="sp"></span>' + (canAny ? kebab(person, w) : '') + '</div>';
    var meta = (lk ? '<span class="pill">' + ic('i-lock') + 'Bloqueada</span>' : '') + (xs ? '<button class="xs-st ' + xs + '" data-a="goextras" title="Ver en Horas extra">' + XSTATE[xs] + '</button>' : '') +
      (ast != null ? '<span class="ast" title="Asertividad: días reservados en los que hubo horas en ese proyecto esa semana">Asert. ' + ast + ' %</span>' : '');
    html += (meta ? '<div class="wc-meta">' + meta + '</div>' : '') + loadBlock(person, w);
    html += '<div class="lines">' + (codes.length ? codes.map(function (c) { return lineHTML(person, w, c, false); }).join('') : '<p class="empty sm">' + (fut ? 'Sin reserva' : 'Sin reserva ni horas registradas') + '</p>') + '</div>';
    html += cardFoot(person, w, codes);
    return html + '</article>';
  }
  function cardFoot(person, w, codes) {
    if (isFuture(w)) return '<div class="wc-note">' + ic('i-cal') + 'Semana futura: se registra al trabajarla.</div>';
    var lk = lockOf(w);
    if (lk) return '<div class="wc-note">' + ic('i-lock') + 'Cierre de nómina · ' + esc(lk.by) + ' · ' + esc(lk.at) + '</div>';
    var acc = codes.filter(function (c) { return resv(person, w).by[c] && exec(person, w, c) === 0 && canEdit(person, w, c); });
    return ''; /* [ACORDADO 30-oct] sin aceptar todo: cada proyecto se acepta en su editor */
    return '<div class="wc-f"><button class="btn primary sm" data-a="acceptall" data-p="' + esc(person) + '" data-w="' + w + '" data-fk="acc-' + esc(person + '|' + w) + '">' + ic('i-check') + 'Aceptar toda la reserva · ' + h(acc.reduce(function (s, c) { return s + resv(person, w).by[c]; }, 0)) + '</button></div>';
  }
  function lineHTML(person, w, code, byProject) {
    var p = prj(code), rv = resv(person, w).by[code] || 0, ex = exec(person, w, code), k = dkey(person, w, code), open = ui.open[k] || ui.edit === k;
    var why = lineBlock(person, w, code), ed = !why, fut = isFuture(w);
    var tags = (p.absence ? '<span class="tag abs">Ausencia</span>' : '') + (!rv && ex > 0 ? '<span class="tag noplan" title="Ejecutado sin reserva previa">Sin reserva</span>' : '') + (p.state === 'cerrado' ? '<span class="tag closed">Cerrado</span>' : '');
    var label = byProject ? '<span class="who" style="display:flex;gap:8px;align-items:center">' + avatar(person, 'sm') + '<span>' + esc(person) + '</span></span>' : '<span class="code">' + (KT ? KT.tileCode(code, 'sm') + ' ' : '') + esc(code) + ' ' + tags + '</span><span title="' + esc(p.name) + '">' + esc(p.name) + '</span>';
    var vals = OWN ? (ex ? '<span class="e" title="Ejecutado">' + h(ex) + '</span>' : rv ? '<span class="r" title="Reservado">Reservado ' + h(rv) + '</span>' : '') : '<span class="r" title="Reservado">R ' + h(rv) + '</span>' + (fut ? '' : '<span class="e" title="Ejecutado">E ' + h(ex) + '</span>');
    var rmable = !fut && ed && (ex > 0 || !!db.drafts[k]);
    var html = '<div class="ln' + (open ? ' open' : '') + '"><div class="ln-row"><button class="ln-h" data-a="line" data-k="' + esc(k) + '" aria-expanded="' + !!open + '" data-fk="ln-' + esc(k) + '"><span class="ln-n">' + label + '</span><span class="ln-v">' + vals + ic('i-chev', 'chev') + '</span></button>' +
      (rmable ? '<button class="ln-x" data-a="rmprj" data-k="' + esc(k) + '" title="Quitar de la semana" aria-label="Quitar ' + esc(byProject ? person : code) + ' de ' + wr(w) + '" data-fk="rm-' + esc(k) + '">' + ic('i-x') + '</button>' : '') + '</div>';
    if (!fut && ed && rv && ex === 0 && ui.edit !== k) html += '<div class="ln-acts"><button class="btn ghost sm" data-a="accept" data-k="' + esc(k) + '" data-fk="acc1-' + esc(k) + '">' + ic('i-check') + 'Aceptar reserva</button><button class="link" data-a="edit" data-k="' + esc(k) + '">Registrar distinto</button></div>';
    if (ui.edit === k) html += editor(db.drafts[k]);
    else if (open) {
      var rs = recs(person, w, code);
      html += '<div class="ph-list">' + (rs.length ? rs.map(function (r) { return '<div class="ph-row"><span>' + (phaseClosed(code, r.phase, w) ? ic('i-lock') + ' ' : '') + esc(r.phase) + (r.motivo ? ' · ' + esc(r.motivo) : '') + '</span><b>' + h(r.hours) + '</b></div>'; }).join('') : '<div class="ph-row"><span>' + (fut ? 'Reservado: ' + (resv(person, w).days[code] || []).map(dm).join(', ') : 'Sin horas registradas') + '</span></div>') +
        (!fut ? '<div class="ph-row"><span>' + (ed ? '' : esc(why)) + '</span>' + (ed ? '<button class="link" data-a="edit" data-k="' + esc(k) + '">Editar fases</button>' : '') + '</div>' : '') + '</div>';
    }
    return html + '</div>';
  }
  function editor(d) {
    if (!d) return '';
    var rv = resv(d.person, d.week).by[d.code] || 0, c = cap(d.week);
    var used = d.rows.map(function (r) { return r.phase; }), free = openPhases(d.code, d.week).filter(function (ph) { return used.indexOf(ph) < 0; });
    var nClosed = prj(d.code).phases.filter(function (ph) { return phaseClosed(d.code, ph, d.week); }).length;
    return '<div class="editor" data-ed="' + esc(d.key) + '">' + d.rows.map(function (r, i) {
      var bad = d.fe && d.fe[i], cl = phaseClosed(d.code, r.phase, d.week), nf = r.phase === X.NF, id = 'ed-' + i + '-' + esc(d.key);
      var opts = [r.phase].concat(free);
      return '<div class="ed-row' + (bad ? ' bad' : '') + (nf ? ' nf' : '') + '">' +
        (cl ? '<span class="ph-lock">' + ic('i-lock') + esc(r.phase) + '</span>' : '<select class="ph-sel" aria-label="Fase" data-in="edph" data-k="' + esc(d.key) + '" data-i="' + i + '" data-fk="edph-' + esc(d.key) + '-' + i + '">' + opts.map(function (ph) { return '<option' + (ph === r.phase ? ' selected' : '') + '>' + esc(ph) + '</option>'; }).join('') + '</select>') +
        '<span class="hin"><input id="' + id + '" aria-label="Horas en ' + esc(r.phase) + '" type="text" inputmode="decimal" value="' + esc(r.value) + '" placeholder="0" data-in="edv" data-k="' + esc(d.key) + '" data-i="' + i + '" data-fk="edv-' + esc(d.key) + '-' + i + '"' + (cl ? ' disabled' : '') + '><span>h</span></span>' +
        (cl || d.rows.length < 2 ? '<span></span>' : '<button class="icon-btn" data-a="edrm" data-k="' + esc(d.key) + '" data-i="' + i + '" title="Quitar fase" aria-label="Quitar fase">' + ic('i-x') + '</button>') +
        (i === d.rows.length - 1 && free.length ? '<button class="addc sm" data-a="edadd" data-k="' + esc(d.key) + '" title="Agregar fase" aria-label="Agregar fase" data-fk="edadd-' + esc(d.key) + '">' + ic('i-plus') + '</button>' : '<span></span>') +
        (nf ? '<select class="nf-mot" aria-label="Motivo" data-in="edmot" data-k="' + esc(d.key) + '" data-i="' + i + '" data-fk="edmot-' + esc(d.key) + '-' + i + '"><option value="">Motivo…</option>' + X.NF_MOTIVOS.map(function (m) { return '<option' + (m === r.motivo ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select>' : '') +
        (cl ? '<span class="ferr muted">Aprobada en Avance: sin horas nuevas</span>' : '') + (bad ? '<span class="ferr">' + esc(bad) + '</span>' : '') + '</div>';
    }).join('') +
      (nClosed ? '<p class="note">' + nClosed + (nClosed === 1 ? ' fase aprobada' : ' fases aprobadas') + ' en Avance no aparece' + (nClosed === 1 ? '' : 'n') + '. El trabajo que no se cobra va en «No facturable».</p>' : '') +
      '<div class="ed-sum" data-edsum="' + esc(d.key) + '">' + edSum(d) + '</div>' +
      (d.error ? '<div class="form-err" role="alert">' + ic('i-alert') + esc(d.error) + '</div>' : '') +
      '<div class="ed-acts"><button class="btn primary sm" data-a="save" data-k="' + esc(d.key) + '" data-fk="save-' + esc(d.key) + '">Guardar</button><button class="btn ghost sm" data-a="discard" data-k="' + esc(d.key) + '">Descartar</button>' +
      (rv ? '<button class="link" data-a="same" data-k="' + esc(d.key) + '">Igual a la reserva (' + h(rv) + ')</button>' : '') + '</div></div>';
  }
  function edSum(d) {
    var rv = resv(d.person, d.week).by[d.code] || 0, s = draftSum(d), t = draftWeek(d), c = cap(d.week);
    return '<span>Proyecto <b>' + h(s) + '</b> · reservado ' + h(rv) + '</span><span>Semana <b>' + h(t) + '</b> de ' + h(c) + (t > c ? ' · <span class="st-over">excede ' + h(t - c) + '</span>' : t === c ? ' · <span class="st-full">completa</span>' : '') + '</span>';
  }
  function projectRows(persons) {
    var codes = [];
    persons.forEach(function (p) { ui.weeks.forEach(function (w) { lineCodes(p.name, w).forEach(function (c) { if (codes.indexOf(c) < 0 && (!ui.fp || c === ui.fp)) codes.push(c); }); }); });
    codes.sort(function (a, b) { var A = prj(a), B = prj(b); return (A.internal ? 1 : 0) - (B.internal ? 1 : 0) || a.localeCompare(b); });
    if (!codes.length) return '<div class="empty">Sin proyectos en estas semanas.</div>';
    return codes.map(function (c) {
      var p = prj(c);
      return '<section class="prow"><div class="prow-h">' + (p.leader ? avatar(p.leader) : '<span class="av"><span class="ini">' + esc(c.slice(0, 2)) + '</span></span>') + '<div class="nm"><b><span class="code">' + esc(c) + '</span> ' + esc(p.name) + '</b><small>' + esc(p.client || '') + (p.leader ? ' · Líder ' + esc(p.leader) : ' · Interno') + (p.state !== 'activo' ? ' · ' + esc(p.state) : '') + '</small></div></div>' + cols() +
        ui.weeks.map(function (w) {
          var ps = persons.filter(function (x) { return lineCodes(x.name, w).indexOf(c) >= 0; });
          var res = r1(ps.reduce(function (s, x) { return s + (resv(x.name, w).by[c] || 0); }, 0)), ex = r1(ps.reduce(function (s, x) { return s + exec(x.name, w, c); }, 0));
          return '<article class="wcard' + (isLocked(w) ? ' locked' : '') + (isFuture(w) ? ' fut' : '') + '"><div class="wc-h"><span class="wt">' + wr(w) + '</span><small class="wn">W' + w + '</small><span class="sp"></span>' + (isLocked(w) ? '<span class="pill">' + ic('i-lock') + 'Bloqueada</span>' : '') + '</div>' +
            '<div class="load"><div class="load-t"><span>Reservado <b>' + h(res) + '</b></span>' + (isFuture(w) ? '' : '<span>Ejecutado <b>' + h(ex) + '</b></span>') + '</div></div>' +
            '<div class="lines">' + (ps.length ? ps.map(function (x) { return lineHTML(x.name, w, c, true); }).join('') : '<p class="empty sm">Nadie en esta semana</p>') + '</div></article>';
        }).join('') + '</div></section>';
    }).join('');
  }

  /* ----- Horas extra ----- */
  /* Horas extra con el estandar de grilla y filtros de Forecast [ACORDADO 03-nov, boceto 27-28]. Sin «Recordar»: el aviso le sale solo en su Inicio. */
  function hxTile(code) { return KT ? KT.tileCode(code, 'sm', (prj(code) || {}).cat === 'servicio' ? 'servicio' : 'proyecto') : ''; }
  function hxType(t) { if (t === 'COMP') return '<span class="hx-ty c" title="Tiempo compensatorio: suma al saldo, no va a nómina">Compensatorio</span>'; var x = xType(t), n = /nocturna/i.test(x.name); return '<span class="hx-ty ' + (x.sun ? (n ? 'dn' : 'dd') : (n ? 'n' : 'd')) + '" title="' + esc(x.name) + '">' + (x.sun ? 'Dominical ' : '') + (n ? 'nocturna' : 'diurna').replace(/^./, function (c) { return x.sun ? c : c.toUpperCase(); }) + '</span>'; }
  var HXST = { todo: 'w', stale: 'w', returned: 'r', pending: 'v', approved: 'g', expired: 'x' };
  function hxSt(k, txt) { return '<span class="hx-st ' + (HXST[k] || 'x') + '">' + esc(txt || XSTATE[k] || k) + '</span>'; }
  function rowSt(r) { if (r.type === 'COMP') return hxSt('approved', 'Avisado al líder'); return r.status === 'approved' ? hxSt('approved', 'Aprobada') : r.status === 'returned' ? hxSt('returned', 'Devuelta') : hxSt('pending', 'En aprobación'); }
  function extrasView() {
    var todo = myTodo(), items = xItems(), f = ui.xf;
    var mineRow = function (it) { var e = it.entry; return !!(e && e.status === 'sent' && e.rows.some(function (r) { return canApprove(r); })); };
    var nMine = items.filter(mineRow).reduce(function (s, it) { return s + it.entry.rows.filter(canApprove).length; }, 0);
    var nOwn = items.filter(function (it) { return it.person === me.name; }).length;
    /* vista: todas · mias (lo que yo solicito) · aprobar (lo que me corresponde) [comentario 03-nov] */
    if (!f.view) f.view = nMine ? 'aprobar' : nOwn ? 'mias' : 'todas';
    var isTodo = function (it) { return /todo|stale|returned/.test(it.state); };
    var sumH = function (L) { return r1(L.reduce(function (s, it) { return s + it.excess; }, 0)); };
    var D = items.filter(isTodo), P = items.filter(function (it) { return it.state === 'pending'; }), A = items.filter(function (it) { return it.state === 'approved'; });
    var html = '<div class="hx-k"><div class="kpi w"><small>Por distribuir</small><b>' + D.length + (D.length === 1 ? ' persona' : ' personas') + ' · ' + h(sumH(D)) + '</b><span>' + (D.length ? 'A cada uno le sale en su Inicio' : 'Nada pendiente') + '</span></div>' +
      '<div class="kpi v"><small>En aprobación</small><b>' + P.length + (P.length === 1 ? ' persona' : ' personas') + ' · ' + h(sumH(P)) + '</b><span>' + (nMine ? '<strong>' + nMine + (nMine === 1 ? ' te corresponde' : ' te corresponden') + '</strong>' : 'Ninguna te corresponde') + '</span></div>' +
      '<div class="kpi g"><small>Aprobadas</small><b>' + h(sumH(A)) + '</b><span>' + A.length + (A.length === 1 ? ' persona' : ' personas') + ' · últimas ' + X.WINDOW + ' semanas</span></div>' +
      '<div class="kpi"><small>Semanas abiertas</small><b>W' + Math.max(1, CW - X.WINDOW + 1) + ' – W' + CW + '</b><span>Máximo ' + X.WINDOW + ' semanas para solicitar</span></div></div>';
    html += '<p class="hx-pol">' + ic('i-alert') + '<span><b>Política:</b> lo ejecutado sobre la capacidad puede solicitarse como hora extra; quien la trabajó la distribuye por proyecto, día y tipo, y puede pedir menos del total. Máximo ' + X.WINDOW + ' semanas; después la semana vence.</span></p>';
    /* tus horas por distribuir: el editor se queda arriba (solo para quien trabajo) */
    if (!todo.length && compVal() > 0) html += '<div class="xh-row"><span></span>' + compSaldo() + '</div>';
    if (todo.length) html += '<div class="xh-row"><h2 class="xh">Tus horas por distribuir <span class="count">' + todo.length + (todo.length === 1 ? ' semana' : ' semanas') + '</span></h2>' + compSaldo() + '</div>' + xGrid(todo);
    /* filtros estandar */
    var uniq = function (L) { return L.filter(function (v, i, a) { return v && a.indexOf(v) === i; }); };
    var apprs = uniq([].concat.apply([], items.map(function (it) { return it.entry && it.entry.status === 'sent' ? it.entry.rows.map(function (r) { return r.approver; }) : []; }))).sort();
    var sel = function (k, lab, list, all, fmt) { return '<label class="hx-ms"><span class="lbl">' + lab + '</span><select data-in="xf" data-k="' + k + '" aria-label="' + lab + '"><option value="">' + all + '</option>' + list.map(function (o) { return '<option value="' + esc(o) + '"' + (String(o) === String(f[k] || '') ? ' selected' : '') + '>' + esc(fmt ? fmt(o) : o) + '</option>'; }).join('') + '</select></label>'; };
    var chips = [];
    if (f.q) chips.push(['q', 'Búsqueda', f.q]); if (f.week) chips.push(['week', 'Semana', 'W' + f.week]); if (f.person) chips.push(['person', 'Persona', f.person]); if (f.appr) chips.push(['appr', 'Aprueba', f.appr]); if (f.state) chips.push(['state', 'Estado', XSTATE[f.state]]); if (f.view !== 'todas') chips.push(['view', 'Vista', f.view === 'mias' ? 'Mías' : 'Me corresponde']);
    var shown = items.filter(function (it) {
      if (f.view === 'aprobar' && !mineRow(it)) return false;
      if (f.view === 'mias' && it.person !== me.name) return false;
      if (f.person && it.person !== f.person) return false; if (f.week && String(it.week) !== String(f.week)) return false; if (f.state && it.state !== f.state) return false;
      var rows = it.entry && it.entry.status === 'sent' ? it.entry.rows : [];
      if (f.appr && !rows.some(function (r) { return r.approver === f.appr; })) return false;
      if (f.q) { var q = f.q.toLowerCase(); if ((it.person + ' ' + rows.map(function (r) { return r.code + ' ' + pname(r.code); }).join(' ')).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    });
    html += '<section class="hx-fb" aria-label="Filtros"><div class="hx-fr"><label class="hx-ms q">' + ic('i-search') + '<span class="sr">Buscar</span><input data-in="xq" data-fk="xq" placeholder="Buscar persona, CECO o proyecto" value="' + esc(f.q || '') + '" autocomplete="off"></label>' +
      sel('week', 'Semana', uniq(items.map(function (it) { return it.week; })).sort(function (a, b) { return b - a; }), 'Todas', function (w) { return 'W' + w + ' · ' + wr(w); }) +
      sel('person', 'Persona', uniq(items.map(function (it) { return it.person; })).sort(), 'Todas') + sel('appr', 'Aprueba', apprs, 'Todos') +
      sel('state', 'Estado', Object.keys(XSTATE).filter(function (k) { return items.some(function (it) { return it.state === k; }); }), 'Todos', function (k) { return XSTATE[k]; }) +
      '<div class="hx-seg" role="group" aria-label="Vista">' + [['todas', 'Todas', ''], ['mias', 'Mías', nOwn ? '<b class="o">' + nOwn + '</b>' : ''], ['aprobar', 'Me corresponde', nMine ? '<b>' + nMine + '</b>' : '']].map(function (o) { return '<button data-a="xme" data-v="' + o[0] + '" aria-pressed="' + (f.view === o[0]) + '" title="' + (o[0] === 'mias' ? 'Las horas extra que tú solicitas' : o[0] === 'aprobar' ? 'Las que debes aprobar' : 'Todo lo que puedes ver') + '">' + o[1] + o[2] + '</button>'; }).join('') + '</div>' +
      (KT ? KT.clearBtn(chips.length, ' data-a="xclear"') : '') + '</div>' +
      '<div class="hx-chips">' + chips.map(function (c) { return '<span class="hx-chip"><i>' + c[1] + '</i>' + esc(c[2]) + '<button data-a="xunf" data-k="' + c[0] + '" aria-label="Quitar ' + esc(c[2]) + '">' + ic('i-x') + '</button></span>'; }).join('') +
      '<span class="sp"></span><span class="hx-ctx"><b>' + shown.length + '</b> de ' + items.length + (items.length === 1 ? ' semana' : ' semanas') + ' · ' + h(sumH(shown)) + ' extra</span>' + (nMine > 1 ? '<button class="btn approve sm" data-a="apall">' + ic('i-check') + 'Aprobar las ' + nMine + '</button>' : '') + '</div></section>';
    if (!shown.length) return html + '<div class="empty">' + (f.view === 'aprobar' ? 'Nada te corresponde aprobar. Cambia a «Todas» para ver el resto.' : f.view === 'mias' ? 'No tienes horas extra en las últimas ' + X.WINDOW + ' semanas.' : 'Ningún registro con estos filtros.') + '</div>' + hxFoot();
    /* grilla */
    var exCell = function (it) { var ex = exec(it.person, it.week), c = cap(it.week), left = X.weeksLeft(Y, it.week); return '<div class="hx-ex"><span>W' + it.week + ' · ' + wr(it.week) + '</span><div class="bar"><i style="width:' + Math.min(100, c / Math.max(ex, c) * 100) + '%"></i><em style="width:' + Math.max(0, (ex - c) / Math.max(ex, c) * 100) + '%"></em></div><small>' + h(ex) + ' de ' + h(c) + '</small>' + (isTodo(it) && left <= 3 && left >= 0 ? '<span class="hx-due">' + ic('i-clock') + (left === 0 ? 'vence esta semana' : 'vence en ' + left + (left === 1 ? ' semana' : ' semanas')) + '</span>' : '') + '</div>'; };
    var apCell = function (r) { return '<span class="hx-ap" title="' + (r.type === 'COMP' ? 'Se avisa a ' : 'Aprueba ') + esc(r.approver) + '">' + avatar(r.approver, 'sm') + '<span class="hx-apn">' + esc(r.approver) + '</span></span>'; };
    var actCell = function (it, r, i) {
      if (!canApprove(r)) return rowSt(r) + (r.status !== 'pending' && r.reviewedBy && r.type !== 'COMP' ? '<small class="hx-by">' + (r.status === 'approved' ? 'aprobó ' : 'devolvió ') + esc(r.reviewedBy) + '</small>' : '') + (r.note ? '<small class="hx-by">«' + esc(r.note) + '»</small>' : '');
      var rk = it.entry.id + '-' + i, rr = ui.reopen['x' + rk];
      return rr !== undefined ? '<div class="reopen"><input placeholder="Motivo de la devolución" value="' + esc(rr) + '" data-in="retnote" data-k="' + rk + '" data-fk="ret-' + rk + '"><button class="btn danger sm" data-a="retok" data-id="' + it.entry.id + '" data-i="' + i + '">Devolver</button><button class="link" data-a="retno" data-k="' + rk + '">Cancelar</button></div>' :
        '<div class="hx-acts"><button class="btn approve sm" data-a="approve" data-id="' + it.entry.id + '" data-i="' + i + '" data-fk="ap-' + rk + '">' + ic('i-check') + 'Aprobar</button><button class="btn ghost sm" data-a="ret" data-k="' + rk + '">Devolver</button></div>';
    };
    var tb = '<div class="hx-wrap hx-desk"><table class="hx-g"><colgroup><col class="c-per"><col class="c-sem"><col class="c-ex"><col><col class="c-ty"><col class="c-h"><col class="c-ap"><col class="c-st"></colgroup>' +
      '<thead><tr><th>Persona</th><th>Semana · ejecutado</th><th class="n">Extra</th><th>CECO · día</th><th>Tipo de extra</th><th class="n">Horas</th><th>Aprueba</th><th class="n">Estado</th></tr></thead><tbody>';
    var cards = '<div class="hx-cards">';
    shown.forEach(function (it) {
      var rows = it.entry && it.entry.status === 'sent' ? it.entry.rows : [], n = Math.max(1, rows.length), mine = mineRow(it);
      var per = '<td class="hx-per" rowspan="' + n + '"><span class="hx-who">' + avatar(it.person, 'sm') + '<span><b>' + esc(it.person) + '</b>' + (it.person === me.name ? '<small>tú</small>' : '') + '</span></span></td><td class="hx-per" rowspan="' + n + '">' + exCell(it) + '</td><td class="hx-per n" rowspan="' + n + '"><b class="hx-xh">' + h(it.excess) + '</b></td>';
      var cd = '<article class="hx-card' + (mine ? ' mine' : '') + '"><div class="hx-ch"><span class="hx-who">' + avatar(it.person, 'sm') + '<span><b>' + esc(it.person) + '</b><small>W' + it.week + ' · ' + wr(it.week) + '</small></span></span><b class="hx-xh">' + h(it.excess) + '</b></div>' + exCell(it);
      if (!rows.length) {
        var msg = it.state === 'expired' ? 'Vencida: pasaron más de ' + X.WINDOW + ' semanas.' : it.person === me.name ? 'Distribúyelas arriba, en «Tus horas por distribuir».' : 'Le aparece en su Inicio para que las distribuya.';
        tb += '<tr class="hx-r1">' + per + '<td colspan="4" class="hx-cs"><span class="hx-none">' + hxSt(it.state) + esc(msg) + '</span></td><td class="n"></td></tr>';
        cd += '<p class="hx-none">' + hxSt(it.state) + esc(msg) + '</p>';
      }
      rows.forEach(function (r, i) {
        tb += '<tr class="' + (i === 0 ? 'hx-r1' : '') + (canApprove(r) ? ' mine' : '') + '">' + (i === 0 ? per : '') + '<td><span class="hx-ceco">' + hxTile(r.code) + '<span><b>' + esc(r.code) + '</b><small>' + esc(pname(r.code)) + '</small><small class="hx-dia2">' + dayLabel(it.week, r.day) + '</small></span></span></td><td>' + hxType(r.type) + '</td><td class="n"><b>' + h(r.hours) + '</b></td><td>' + apCell(r) + '</td><td class="n">' + actCell(it, r, i) + '</td></tr>';
        cd += '<div class="hx-cl"><span class="hx-ceco">' + hxTile(r.code) + '<span><b>' + esc(r.code) + '</b><small>' + esc(pname(r.code)) + '</small></span></span><div class="hx-cr"><span>' + dayLabel(it.week, r.day) + ' · ' + hxType(r.type) + '</span><b>' + h(r.hours) + '</b></div><div class="hx-cr"><span class="muted">Aprueba ' + esc(r.approver) + '</span>' + (canApprove(r) ? '' : rowSt(r)) + '</div>' + (canApprove(r) ? actCell(it, r, i) : '') + '</div>';
      });
      cards += cd + '</article>';
    });
    html += tb + '</tbody></table></div>' + cards + '</div>';
    return html + hxFoot();
  }
  function hxFoot() { return '<p class="note">Tipos según la legislación laboral colombiana. Recargos, cálculo y envío a nómina pendientes; el prototipo no calcula valores.</p>'; }
  /* saldo de compensatorio ganado en Horas extra [PROPUESTA 04-nov]: usarlo se pedira en Solicitudes (en diseno) */
  function compVal() { var g = 0; db.extras.forEach(function (e) { if (e.person !== me.name || e.status !== 'sent') return; e.rows.forEach(function (r) { if (r.type === 'COMP') g += num(r.hours); }); }); return r1(g); }
  function compSaldo() {
    var g = compVal();
    return '<div class="cs-box" title="Se usará pidiendo «Usar compensatorio» en Solicitudes (en diseño)">' + ic('i-bank') + '<span><b>' + h(r1(g)) + '</b><small>Compensatorio a favor</small></span></div>';
  }
  /* ----- Distribuir: todas las semanas pendientes en una grilla CECO x dia, cada dia con Diurna y Nocturna [ACORDADO 03-nov] ----- */
  function xIsN(t) { return t === 'HEN' || t === 'HENDF'; }
  function xVal(e, code, d, n) { var r = e.rows.filter(function (x) { return x.code === code && x.type !== 'COMP' && Number(x.day) === d && xIsN(x.type) === !!n; })[0]; return r ? String(r.hours).replace('.', ',') : ''; }
  function xCVal(e, code) { var r = e.rows.filter(function (x) { return x.code === code && x.type === 'COMP'; })[0]; return r ? String(r.hours).replace('.', ',') : ''; }
  function xCSet(e, code, v) {
    v = String(v || '').trim(); var i = -1; e.rows.forEach(function (x, k) { if (x.code === code && x.type === 'COMP') i = k; });
    if (!v || num(v.replace(',', '.')) === 0) { if (i >= 0) e.rows.splice(i, 1); } else if (i >= 0) e.rows[i].hours = v; else e.rows.push({ code: code, day: -1, type: 'COMP', hours: v, status: 'draft' });
    e.error = ''; e.re = {};
  }
  function xCIn(e, code, mob) { var v = xCVal(e, code); return '<input class="xg-c cc' + (v ? ' v' : '') + '" type="text" inputmode="decimal" value="' + esc(v) + '" data-in="xcomp" data-id="' + e.id + '" data-c="' + esc(code) + '" data-fk="xcc-' + (mob ? 'm' : '') + e.id + '-' + code + '" aria-label="' + esc(code + ' · compensar en la semana') + '" title="Horas de esta semana que pasan a tiempo compensatorio">'; }
  function xSum(e) { return r1(e.rows.reduce(function (s, r) { return s + num(String(r.hours).replace(',', '.')); }, 0)); }
  function xSet(e, code, d, n, v) {
    v = String(v || '').trim();
    var i = -1; e.rows.forEach(function (x, k) { if (x.code === code && x.type !== 'COMP' && Number(x.day) === d && xIsN(x.type) === !!n) i = k; });
    if (!v || num(v.replace(',', '.')) === 0) { if (i >= 0) e.rows.splice(i, 1); }
    else if (i >= 0) e.rows[i].hours = v;
    else e.rows.push({ code: code, day: d, type: fitType(e.week, d, n ? 'HEN' : 'HED'), hours: v, status: 'draft' });
    e.error = ''; e.re = {};
  }
  function xCodes(it, e) {
    var c = []; recs(it.person, it.week).forEach(function (r) { if (c.indexOf(r.code) < 0 && !prj(r.code).absence) c.push(r.code); });
    e.rows.forEach(function (r) { if (r.code && c.indexOf(r.code) < 0) c.push(r.code); });
    return c;
  }
  function xHead(it, e, cols, tag) {
    var ex = it.excess, sum = xSum(e), left = X.weeksLeft(Y, it.week), open = ui.xOpen[e.id] !== false;
    var ret = (X.xEntry(db, it.person, Y, it.week) || { rows: [] }).rows.filter(function (r) { return r.note; });
    var ok = sum > 0 && sum <= ex + 0.001;
    var inner = '<div class="xw-h"><button class="xw-t" data-a="xwk" data-id="' + e.id + '" aria-expanded="' + open + '">' + ic('i-chev', 'chev') + '<span><b>Semana ' + it.week + ' · ' + wr(it.week) + '</b><small>Ejecutaste ' + h(exec(it.person, it.week)) + ' de ' + h(cap(it.week)) + ' · puedes solicitar <strong>' + h(ex) + '</strong></small></span></button>' +
      (it.state !== 'todo' ? hxSt(it.state) : '') +
      '<div class="xw-p" data-xprog="' + e.id + '">' + xProg(e) + '</div>' +
      '<span class="xw-pl ' + (left <= 2 ? 'soon' : 'muted') + '">' + (left <= 0 ? 'Última semana' : 'Quedan ' + left + ' sem.') + ' · plazo ' + wr(it.week + X.WINDOW) + '</span>' +
      (tag || '') +
      '<button class="btn ' + (ok ? 'primary' : 'ghost') + ' sm xw-s" data-a="xsend" data-id="' + e.id + '" data-fk="xsend-' + e.id + '"' + (ok ? '' : ' disabled title="' + (sum > ex ? 'Excede lo que puedes solicitar' : 'Escribe al menos una hora') + '"') + '>' + ic('i-send') + 'Enviar W' + it.week + '</button></div>' +
      (ret.length ? '<p class="ret-note">' + ret.map(function (r) { return esc(r.reviewedBy) + ' devolvió: «' + esc(r.note) + '»'; }).join('<br>') + '</p>' : '') +
      (e.error ? '<div class="form-err" role="alert">' + ic('i-alert') + esc(e.error) + '</div>' : '');
    return cols ? '<tr class="xw-r"><td colspan="' + cols + '">' + inner + '</td></tr>' : inner;
  }
  function xIn(e, it, code, d, n, mob) {
    var v = xVal(e, code, d, n), sh = isSunHol(it.week, d);
    return '<input class="xg-c' + (n ? ' n' : '') + (v ? ' v' : '') + (sh ? ' dom' : '') + '" type="text" inputmode="decimal" value="' + esc(v) + '" data-in="xcell" data-id="' + e.id + '" data-c="' + esc(code) + '" data-d="' + d + '" data-n="' + (n ? 1 : 0) + '" data-fk="xc-' + (mob ? 'm' : '') + e.id + '-' + code + '-' + d + '-' + (n ? 1 : 0) + '" aria-label="' + esc(code + ' · ' + dayLabel(it.week, d) + ' · ' + (n ? 'nocturna' : 'diurna')) + '" title="' + esc(dayLabel(it.week, d) + ' · ' + (n ? 'nocturna 7 p. m.–6 a. m.' : 'diurna 6 a. m.–7 p. m.')) + '">';
  }
  /* v4 [ACORDADO 03-nov]: cada semana es su propia tarjeta con su encabezado de dias y fechas */
  function xGrid(todo) {
    var AP = !window.matchMedia('(max-width: 1149px)').matches; /* MID: aprueba va bajo el CECO */
    var L = todo.slice().sort(function (a, b) { return a.week - b.week; }).map(function (it) { return { it: it, e: xDraft(it.person, it.week) }; });
    var html = '';
    L.forEach(function (o) {
      var it = o.it, e = o.e, open = ui.xOpen[e.id] !== false, codes = xCodes(it, e), left = X.weeksLeft(Y, it.week);
      html += '<article class="xw-card' + (left <= 2 ? ' soon' : '') + (open ? '' : ' cl') + '">' + xHead(it, e, 0, open ? '' : '<span class="xw-n">' + codes.length + ' CECO · plegada</span>');
      if (open) {
        var tb = '<div class="tbl-wrap xg-desk"><table class="xg"><colgroup><col class="c-cc">' + DAYS.map(function () { return '<col><col>'; }).join('') + '<col class="c-cp"><col class="c-tt">' + (AP ? '<col class="c-ap">' : '') + '</colgroup>' +
          '<thead><tr><th class="l" rowspan="2">CECO</th>' + DAYS.map(function (n, d) { var dt = dayDate(it.week, d), sh = isSunHol(it.week, d); return '<th class="dd' + (sh ? ' dom' : '') + '" colspan="2"><b>' + n + '</b><small>' + dm(dt) + (X.holiday(dt) ? ' · festivo' : '') + '</small></th>'; }).join('') + '<th class="cp" rowspan="2" title="Horas de la semana que pasan a tiempo compensatorio">' + ic('i-bank') + 'Compensar<small>toda la semana</small></th><th class="r" rowspan="2">Total</th>' + (AP ? '<th class="l" rowspan="2">Aprueba la extra</th>' : '') + '</tr>' +
          '<tr>' + DAYS.map(function (n, d) { var sh = isSunHol(it.week, d); return '<th class="fq dd' + (sh ? ' dom' : '') + '" title="Diurna · 6 a. m.–7 p. m.">' + ic('i-sun') + 'D</th><th class="fq' + (sh ? ' dom' : '') + '" title="Nocturna · 7 p. m.–6 a. m.">' + ic('i-moon') + 'N</th>'; }).join('') + '</tr></thead><tbody>';
        var mob = '<div class="xg-mob">';
        codes.forEach(function (c) {
          var tot = r1(e.rows.filter(function (r) { return r.code === c; }).reduce(function (s, r) { return s + num(String(r.hours).replace(',', '.')); }, 0));
          var ap = approverFor(it.person, c);
          var cc = '<div class="hx-ceco">' + hxTile(c) + '<span><b>' + esc(c) + '</b><small>' + esc(pname(c)) + '</small><small>Ejecutaste ' + h(exec(it.person, it.week, c)) + '<span class="xg-apm"> · aprueba ' + esc(ap) + '</span></small></span></div>';
          tb += '<tr><td class="l">' + cc + '</td>' + DAYS.map(function (n, d) { var sh = isSunHol(it.week, d); return '<td class="dl' + (sh ? ' dom' : '') + '">' + xIn(e, it, c, d, 0) + '</td><td' + (sh ? ' class="dom"' : '') + '>' + xIn(e, it, c, d, 1) + '</td>'; }).join('') +
            '<td class="cp">' + xCIn(e, c) + '</td>' + '<td class="r"><b>' + (tot ? h(tot) : '') + '</b></td>' + (AP ? '<td class="l"><span class="xg-ap">' + (ap === 'Planeación' ? '<span class="av sm"><span class="ini">PL</span></span>' : avatar(ap, 'sm')) + '<span>' + esc(ap) + '</span></span>' + (xCVal(e, c) ? '<small class="xg-cn">' + ic('i-bell') + 'Compensatorio: se avisa</small>' : '') + '</td>' : '') + '</tr>';
          mob += '<div class="xg-mc">' + cc + '<div class="xg-mg"><span></span>' + DAYS.map(function (n, d) { return '<span class="' + (isSunHol(it.week, d) ? 'dom' : '') + '">' + n.charAt(0) + '<small>' + +dayDate(it.week, d).slice(8) + '</small></span>'; }).join('') +
            '<span title="Diurna">' + ic('i-sun') + '</span>' + DAYS.map(function (n, d) { return xIn(e, it, c, d, 0, 1); }).join('') +
            '<span title="Nocturna">' + ic('i-moon') + '</span>' + DAYS.map(function (n, d) { return xIn(e, it, c, d, 1, 1); }).join('') + '</div><label class="xg-cm">' + ic('i-bank') + '<span>Compensar esta semana</span>' + xCIn(e, c, 1) + '</label></div>';
        });
        html += tb + '</tbody></table></div>' + mob + '</div>';
      }
      html += '</article>';
    });
    /* pie: distribuido por tipo y envio de todas las semanas con horas */
    var byT = {}, nOk = 0;
    L.forEach(function (o) { var sm = xSum(o.e); if (sm > 0 && sm <= o.it.excess + 0.001) nOk++; o.e.rows.forEach(function (r) { byT[r.type] = r1((byT[r.type] || 0) + num(String(r.hours).replace(',', '.'))); }); });
    html += '<div class="xg-foot"><div class="xg-tys"><span class="muted">Distribuido por tipo</span>' + (Object.keys(byT).length ? XTYPES.filter(function (t) { return byT[t.id]; }).map(function (t) { return '<span class="xg-ty' + (t.id === 'COMP' ? ' c' : '') + '">' + ic(t.id === 'COMP' ? 'i-bank' : xIsN(t.id) ? 'i-moon' : 'i-sun') + esc(t.name) + ' <b>' + h(byT[t.id]) + '</b></span>'; }).join('') : '<span class="muted">nada aún · escribe las horas en la celda del día</span>') + '</div>' +
      (L.length > 1 ? '<button class="btn primary" data-a="xsendall"' + (nOk ? '' : ' disabled') + '>' + ic('i-send') + 'Enviar las semanas con horas (' + nOk + ')</button>' : '') +
      '<p class="note xg-note">D diurna (6 a. m.–7 p. m.) · N nocturna (7 p. m.–6 a. m.). Domingos y festivos sombreados: pasan a dominical o festiva. Puedes pedir menos de lo disponible; lo que no pidas no se paga.</p></div>';
    return '<div class="xg-list">' + html + '</div>';
  }
  /* desglose informativo por tipo [comentario 04-nov]: 2 h diurna · 1 h nocturna · 2 h compensatorio */
  var XSPL = [['HED', 'diurna', 'i-sun', 'd'], ['HEN', 'nocturna', 'i-moon', 'n'], ['HEDDF', 'dominical diurna', 'i-sun', 'dd'], ['HENDF', 'dominical nocturna', 'i-moon', 'dn'], ['COMP', 'compensatorio', 'i-bank', 'c']];
  function xSplit(e) {
    var t = {}; e.rows.forEach(function (r) { t[r.type] = r1((t[r.type] || 0) + num(String(r.hours).replace(',', '.'))); });
    var o = XSPL.filter(function (x) { return t[x[0]]; }).map(function (x) { return '<span class="xw-sb ' + x[3] + '">' + ic(x[2]) + h(t[x[0]]) + ' ' + x[1] + '</span>'; });
    return o.length ? '<span class="xw-split">' + o.join('') + '</span>' : '';
  }
  function xProg(e) {
    var ex = X.excess(db, e.person, Y, e.week), sum = r1(e.rows.reduce(function (s, r) { return s + num(String(r.hours).replace(',', '.')); }, 0));
    return '<span>Distribuidas <b>' + h(sum) + '</b> de ' + h(ex) + (Math.abs(sum - ex) < 0.001 ? ' · completo' : sum > ex ? ' · <span class="st-over">excede en ' + h(sum - ex) + '</span>' : '') + '</span><div class="bar xbar"><i style="width:' + Math.min(100, ex ? sum / ex * 100 : 0) + '%"></i></div>' + xSplit(e);
  }
  function xCard(it, idx) {
    var e = xDraft(it.person, it.week), ex = it.excess, id = e.id, left = X.weeksLeft(Y, it.week);
    var sum = r1(e.rows.reduce(function (s, r) { return s + num(String(r.hours).replace(',', '.')); }, 0));
    var codes = []; recs(it.person, it.week).forEach(function (r) { if (codes.indexOf(r.code) < 0 && !prj(r.code).absence) codes.push(r.code); });
    var open = ui.xOpen[id] !== undefined ? ui.xOpen[id] : idx === 0;
    var ret = (X.xEntry(db, it.person, Y, it.week) || { rows: [] }).rows.filter(function (r) { return r.note; });
    return '<details class="xcard"' + (open ? ' open' : '') + ' data-x="' + id + '"><summary data-a="xtoggle" data-id="' + id + '"><b>' + wr(it.week) + '</b><span class="muted">W' + it.week + '</span><span><b>' + h(ex) + '</b> extra</span><span class="' + (left <= 2 ? 'soon' : 'muted') + '">Plazo: ' + wr(it.week + X.WINDOW) + ' · ' + (left <= 0 ? 'última semana' : 'quedan ' + left + ' sem.') + '</span>' + (it.state !== 'todo' ? '<span class="xs-st ' + it.state + '">' + XSTATE[it.state] + '</span>' : '') + ic('i-chev', 'chev') + '</summary>' +
      '<div class="xbody"><p class="note">Ejecutaste <b>' + h(exec(it.person, it.week)) + '</b> de ' + h(cap(it.week)) + ' → puedes solicitar hasta <b>' + h(ex) + '</b>.</p>' +
      (ret.length ? '<p class="ret-note">' + ret.map(function (r) { return esc(r.reviewedBy) + ' devolvió: «' + esc(r.note) + '»'; }).join('<br>') + '</p>' : '') +
      '<div class="xprog" data-xprog="' + id + '">' + xProg(e) + '</div>' +
      '<div class="xrows">' + e.rows.map(function (r, i) {
        r.type = fitType(it.week, r.day, r.type);
        var err = e.re && e.re[i];
        return '<div class="xr' + (err ? ' bad' : '') + '"><label>Proyecto<select data-in="xrow" data-id="' + id + '" data-i="' + i + '" data-f="code" data-fk="xp-' + id + '-' + i + '"><option value="">Elige</option>' + codes.map(function (c) { return '<option value="' + c + '"' + (c === r.code ? ' selected' : '') + '>' + esc(c + ' · ' + pname(c)) + '</option>'; }).join('') + '</select></label>' +
          '<label>Día<select data-in="xrow" data-id="' + id + '" data-i="' + i + '" data-f="day" data-fk="xd-' + id + '-' + i + '">' + DAYS.map(function (n, d) { return '<option value="' + d + '"' + (String(d) === String(r.day) ? ' selected' : '') + '>' + dayLabel(it.week, d) + '</option>'; }).join('') + '</select></label>' +
          '<label>Tipo de hora<select data-in="xrow" data-id="' + id + '" data-i="' + i + '" data-f="type" data-fk="xt-' + id + '-' + i + '">' + dayTypes(it.week, r.day).map(function (t) { return '<option value="' + t.id + '"' + (t.id === r.type ? ' selected' : '') + '>' + t.name + '</option>'; }).join('') + '</select></label>' +
          '<label>Horas<input type="text" inputmode="decimal" value="' + esc(r.hours) + '" data-in="xrow" data-id="' + id + '" data-i="' + i + '" data-f="hours" data-fk="xh-' + id + '-' + i + '"></label>' +
          '<button class="icon-btn xdel" data-a="xdel" data-id="' + id + '" data-i="' + i + '" aria-label="Quitar fila"' + (e.rows.length < 2 ? ' disabled' : '') + '>' + ic('i-x') + '</button>' +
          (err ? '<span class="ferr">' + esc(err) + '</span>' : '') + (r.code ? '<span class="xap">Aprueba: ' + esc(approverFor(it.person, r.code)) + '</span>' : '') + '</div>';
      }).join('') + '</div>' +
      '<div class="ed-acts"><button class="btn ghost sm" data-a="xadd" data-id="' + id + '">' + ic('i-plus') + 'Agregar fila</button><span style="flex:1"></span><button class="btn primary" data-a="xsend" data-id="' + id + '" data-fk="xsend-' + id + '">Enviar a aprobación</button></div>' +
      (e.error ? '<div class="form-err" role="alert">' + ic('i-alert') + esc(e.error) + '</div>' : '') + '</div></details>';
  }

  /* ----- Semanas bloqueadas ----- */
  function locksView() {
    var adm = isLockAdmin(), f = ui.lk;
    var html = '<div class="card"><div class="card-h"><div><h2>Semanas bloqueadas · ' + Y + '</h2><p>El bloqueo congela ejecución, horas extra y aprobaciones de esas semanas. Se bloquea al hacer el cierre de nómina y solo se pueden bloquear semanas completas: todas las personas activas con lo ejecutado igual o mayor a la capacidad. La reapertura es excepcional y registra motivo, responsable y fecha. Al bloquear, todas las personas reciben el aviso en Inicio.</p></div></div>';
    if (adm) {
      var cand = []; for (var w = CW; w >= CW - 10; w--) if (!isLocked(w)) cand.push(w);
      var opt = function (k) { return '<option value="">Elige semana</option>' + cand.map(function (w) { var g = weekGaps(w).length; return '<option value="' + w + '"' + (String(w) === f[k] ? ' selected' : '') + '>' + wr(w) + ' · W' + w + (g ? ' · ' + g + ' incompletas' : ' · completa') + '</option>'; }).join(''); };
      html += '<form class="lock-form" data-form="lock"><label>Desde<select class="f" data-in="lk" data-k="start" data-fk="lk-start">' + opt('start') + '</select></label><label>Hasta<select class="f" data-in="lk" data-k="end" data-fk="lk-end">' + opt('end') + '</select></label><button class="btn primary" type="submit" data-fk="lk-go">' + ic('i-lock') + 'Bloquear semanas</button></form>';
      if (f.err) html += '<div class="form-err" role="alert">' + ic('i-alert') + '<div>' + f.err + '</div></div>';
    } else html += '<p class="note">' + ic('i-lock') + ' Solo consulta. Bloquea y reabre Planeación.</p>';
    html += '</div>';
    var ls = db.locks.filter(function (l) { return l.year === Y; }).slice().reverse();
    html += ls.length ? '<ul class="locks">' + ls.map(function (l) {
      var ro = ui.reopen[l.id];
      return '<li class="' + (l.active ? 'on' : 'off') + '"><div class="t"><b>' + (l.active ? ic('i-lock') : '') + (l.start === l.end ? 'W' + l.start + ' · ' + wr(l.start) : 'W' + l.start + ' a W' + l.end + ' · hasta ' + wr(l.end)) + ' · ' + (l.active ? 'Bloqueadas' : 'Reabiertas') + '</b><small>' + esc(l.reason) + ' · ' + esc(l.by) + ' · ' + esc(l.at) + '</small>' +
        (!l.active ? '<small>Reapertura: «' + esc(l.reopenReason) + '» · ' + esc(l.reopenedBy) + ' · ' + esc(l.reopenedAt) + '</small>' : '') + '</div>' +
        (l.active && adm ? (ro !== undefined ? '<div class="reopen"><input placeholder="Motivo de la reapertura (obligatorio)" value="' + esc(ro.t || '') + '" data-in="reopen" data-k="' + l.id + '" data-fk="ro-' + l.id + '"><button class="btn danger sm" data-a="reopenok" data-id="' + l.id + '">Confirmar reapertura</button><button class="link" data-a="reopenno" data-id="' + l.id + '">Cancelar</button>' + (ro.err ? '<span class="ferr">' + esc(ro.err) + '</span>' : '') + '</div>' : '<button class="btn ghost sm" data-a="reopen" data-id="' + l.id + '">Reabrir…</button>') : '') + '</li>';
    }).join('') + '</ul>' : '<div class="empty">Sin semanas bloqueadas en ' + Y + '.</div>';
    return html;
  }
  function doLock() {
    var f = ui.lk, a = Number(f.start), b = Number(f.end || f.start); f.err = '';
    if (!a) { f.err = 'Elige la semana inicial.'; return render(); }
    if (b < a) { var t = a; a = b; b = t; }
    var bad = [];
    for (var w = a; w <= b; w++) { if (isLocked(w)) { f.err = 'W' + w + ' ya está bloqueada.'; return render(); } var g = weekGaps(w); if (g.length) bad.push('<b>W' + w + '</b>: ' + g.map(function (x) { return esc(x.person) + ' (' + h(x.ex) + ')'; }).join(', ')); }
    if (bad.length) { f.err = 'No se bloqueó: hay personas con menos de la capacidad.<br>' + bad.join('<br>'); return render(); }
    var drafts = Object.keys(db.drafts).filter(function (k) { var d = db.drafts[k]; return d.week >= a && d.week <= b && isDirty(d); }).length;
    db.locks.push({ id: 'l' + (++db.seq), year: Y, start: a, end: b, active: true, reason: 'Cierre de nómina', by: me.name, at: X.TODAY });
    try { if (HOST && HOST.refresh) HOST.refresh(); } catch (e) {}
    ui.lk = { start: '', end: '', err: '' }; persist();
    notify('Semanas bloqueadas: W' + a + (b !== a ? ' a W' + b : '') + '. Todos lo verán en Inicio.' + (drafts ? ' ' + drafts + ' borrador(es) de esas semanas ya no se pueden guardar.' : ''), 'ok');
  }

  /* Quitar un proyecto de la semana [ACORDADO 30-oct]: pide confirmacion; la reserva no cambia */
  function removeLine(person, w, code) {
    if (!canEdit(person, w, code)) return;
    var gone = recs(person, w, code).map(function (r) { return JSON.parse(JSON.stringify(r)); }), hrs = exec(person, w, code);
    gone.forEach(function (r) { putRec(person, w, code, r.phase, null); });
    var k = dkey(person, w, code); delete db.drafts[k]; if (ui.edit === k) ui.edit = null; delete ui.open[k];
    persist();
    notify(code + ' · ' + pname(code) + ' quitado de ' + wr(w) + (hrs ? ' (' + h(hrs) + ')' : '') + (person !== me.name ? ' · ' + person : '') + '. La reserva no cambia.', 'ok');
  }

  /* ----- Dialogos: copiar, borrar, importar ----- */
  function dialog() {
    var d = ui.dlg, html = '';
    if (d.type === 'copy') {
      var origins = []; for (var w = d.w - 1; w >= d.w - 8; w--) if (recs(d.p, w).length) origins.push(w);
      var src = Number(d.src || origins[0] || 0), rows = src ? recs(d.p, src) : [], codes = [];
      rows.forEach(function (r) { if (codes.indexOf(r.code) < 0) codes.push(r.code); });
      html = '<h2 id="dlgT">Copiar ejecución</h2><p class="sub">' + esc(d.p) + ' · destino ' + wr(d.w) + ' (W' + d.w + '). Reemplaza las horas de los proyectos elegidos en el destino y conserva el resto.</p>' +
        (origins.length ? '<label class="fld">Semana de origen<select class="f" data-in="dsrc" data-fk="dsrc">' + origins.map(function (w) { return '<option value="' + w + '"' + (w === src ? ' selected' : '') + '>' + wr(w) + ' · W' + w + ' · ' + h(exec(d.p, w)) + '</option>'; }).join('') + '</select></label>' +
          '<div>' + codes.map(function (c) { var ok = canEdit(d.p, d.w, c), on = ok && !(d.ex || {})[c]; return '<label class="chk"><input type="checkbox" data-in="dex" data-k="' + c + '"' + (on ? ' checked' : '') + (ok ? '' : ' disabled') + '><span><span class="code">' + esc(c) + '</span> ' + esc(pname(c)) + (ok ? '' : ' · <span class="muted">' + esc(lineBlock(d.p, d.w, c)) + '</span>') + '</span><span class="sp"></span><b>' + h(exec(d.p, src, c)) + '</b>' + (exec(d.p, d.w, c) ? '<span class="muted"> reemplaza ' + h(exec(d.p, d.w, c)) + '</span>' : '') + '</label>'; }).join('') + '</div>' :
          '<p class="note">No hay semanas anteriores con horas para copiar.</p>') +
        (d.err ? '<div class="form-err">' + ic('i-alert') + esc(d.err) + '</div>' : '') +
        '<div class="dlg-acts"><button class="btn ghost" data-a="dclose">Cancelar</button>' + (origins.length ? '<button class="btn primary" data-a="dcopy" data-fk="dcopy">Copiar</button>' : '') + '</div>';
    } else if (d.type === 'del') {
      var rs = recs(d.p, d.w).filter(function (r) { return canEdit(d.p, d.w, r.code); }), tot = r1(rs.reduce(function (s, r) { return s + r.hours; }, 0));
      html = '<h2 id="dlgT">Borrar ejecución</h2><p class="sub">' + esc(d.p) + ' · ' + wr(d.w) + '. Se borran ' + h(tot) + ' en ' + rs.length + ' fase(s) que puedes editar. La reserva no cambia; si había horas extra solicitadas, vuelven a distribución.</p>' +
        '<div class="dlg-acts"><button class="btn ghost" data-a="dclose">Cancelar</button><button class="btn danger" data-a="ddel" data-fk="ddel"' + (rs.length ? '' : ' disabled') + '>Borrar ' + h(tot) + '</button></div>';
    } else if (d.type === 'rmp') {
      var rr = recs(d.p, d.w, d.c), th = exec(d.p, d.w, d.c);
      html = '<h2 id="dlgT">Quitar proyecto de la semana</h2><p class="sub"><span class="code">' + esc(d.c) + '</span> ' + esc(pname(d.c)) + ' · ' + esc(d.p) + ' · ' + wr(d.w) + '.</p>' +
        '<p class="sub">Se borran <b>' + h(th) + '</b> ejecutadas en ' + rr.length + ' fase(s): ' + rr.map(function (r) { return esc(r.phase) + ' ' + h(r.hours); }).join(', ') + '. La reserva no cambia; si había horas extra solicitadas, vuelven a distribución.</p>' +
        '<div class="dlg-acts"><button class="btn ghost" data-a="dclose" data-fk="dclose">Cancelar</button><button class="btn danger" data-a="drmp" data-fk="drmp">Quitar ' + h(th) + '</button></div>';
    } else if (d.type === 'imp') {
      html = '<h2 id="dlgT">Revisar carga · ' + esc(d.name) + '</h2><p class="sub">Nada se guarda hasta que apliques. Las filas con error no se cargan.</p>' +
        '<div class="kv" style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px"><span class="imp-ok"><b>' + d.ok.length + '</b> filas para cargar</span><span class="muted"><b>' + d.same + '</b> sin cambios</span><span class="imp-bad"><b>' + d.bad.length + '</b> con error</span></div>' +
        (d.bad.length ? '<div class="tbl-wrap"><table><thead><tr><th>Fila</th><th>Motivo</th></tr></thead><tbody>' + d.bad.slice(0, 30).map(function (b) { return '<tr><td class="nowrap">' + b.n + '</td><td>' + esc(b.why) + '</td></tr>'; }).join('') + (d.bad.length > 30 ? '<tr><td colspan="2" class="note">y ' + (d.bad.length - 30) + ' más</td></tr>' : '') + '</tbody></table></div>' : '') +
        (d.ok.length ? '<div class="tbl-wrap"><table><thead><tr><th>Persona</th><th>Semana</th><th>Proyecto · fase</th><th class="n">Horas</th></tr></thead><tbody>' + d.ok.slice(0, 20).map(function (o) { return '<tr><td>' + esc(o.p) + '</td><td>W' + o.w + '</td><td><span class="code">' + esc(o.c) + '</span><small>' + esc(o.ph) + '</small></td><td class="n">' + (o.from != null ? '<small>antes ' + h(o.from) + '</small>' : '') + '<b>' + h(o.v) + '</b></td></tr>'; }).join('') + (d.ok.length > 20 ? '<tr><td colspan="4" class="note">y ' + (d.ok.length - 20) + ' más</td></tr>' : '') + '</tbody></table></div>' : '') +
        '<div class="dlg-acts"><button class="btn ghost" data-a="dclose">Cancelar</button><button class="btn primary" data-a="dimp" data-fk="dimp"' + (d.ok.length ? '' : ' disabled') + '>Aplicar ' + d.ok.length + ' filas</button></div>';
    }
    return '<div class="dlg-bg" data-a="dbg"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgT">' + html + '</div></div>';
  }
  function doCopy() {
    var d = ui.dlg, src = Number(d.src || 0);
    if (!src) { var o = []; for (var w = d.w - 1; w >= d.w - 8; w--) if (recs(d.p, w).length) o.push(w); src = o[0]; }
    if (isLocked(d.w)) { d.err = 'La semana destino está bloqueada. No se copió nada.'; return render(); }
    var codes = []; recs(d.p, src).forEach(function (r) { if (codes.indexOf(r.code) < 0 && canEdit(d.p, d.w, r.code) && !(d.ex || {})[r.code]) codes.push(r.code); });
    if (!codes.length) { d.err = 'Marca al menos un proyecto que puedas editar.'; return render(); }
    codes.forEach(function (c) {
      recs(d.p, d.w, c).forEach(function (r) { putRec(d.p, d.w, c, r.phase, null); });
      recs(d.p, src, c).forEach(function (r) { putRec(d.p, d.w, c, r.phase, r.hours, 'copia W' + src); });
      delete db.drafts[dkey(d.p, d.w, c)];
    });
    ui.dlg = null; persist();
    notify('Ejecución copiada de W' + src + ' a W' + d.w + ' · ' + d.p + ' · ' + codes.length + ' proyecto(s). Semana ' + h(exec(d.p, d.w)) + ' de ' + h(cap(d.w)) + '.', exec(d.p, d.w) > cap(d.w) ? 'warn' : 'ok');
  }
  function doDel() {
    var d = ui.dlg;
    if (isLocked(d.w)) { ui.dlg = null; return notify('La semana está bloqueada. No se borró nada.', 'err'); }
    recs(d.p, d.w).filter(function (r) { return canEdit(d.p, d.w, r.code); }).forEach(function (r) { putRec(d.p, d.w, r.code, r.phase, null); });
    Object.keys(db.drafts).forEach(function (k) { var x = db.drafts[k]; if (x.person === d.p && x.week === d.w) delete db.drafts[k]; });
    ui.dlg = null; persist();
    notify('Ejecución borrada · ' + d.p + ' · ' + wr(d.w) + '. La reserva se conserva.', 'ok');
  }

  /* ----- Plantilla Excel (CSV con ; compatible con Excel) ----- */
  function csvCell(v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function nfmt(n) { return n === '' || n == null ? '' : String(r1(n)).replace('.', ','); }
  function download() {
    var weeks = ui.weeks.filter(function (w) { return !isFuture(w); }).sort(function (a, b) { return a - b; });
    if (!weeks.length) return toast('Elige al menos una semana actual o pasada.');
    var rows = [['Semana', 'Desde', 'Persona', 'Proyecto', 'Nombre del proyecto', 'Fase', 'Reservado (h)', 'Ejecutado (h)']];
    visiblePersons().forEach(function (p) {
      weeks.forEach(function (w) {
        lineCodes(p.name, w).filter(function (c) { return !ui.fp || c === ui.fp; }).forEach(function (c) {
          var rv = resv(p.name, w).by[c] || 0, rs = recs(p.name, w, c);
          prj(c).phases.forEach(function (ph, i) { var r = rs.filter(function (x) { return x.phase === ph; })[0]; rows.push(['W' + w, X.weekStart(Y, w), p.name, c, pname(c), ph, i === 0 ? nfmt(rv) : '', r ? nfmt(r.hours) : '']); });
        });
      });
    });
    var csv = '﻿sep=;\r\n' + rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
    var name = 'kairos-ejecucion-W' + weeks[0] + (weeks.length > 1 ? '-W' + weeks[weeks.length - 1] : '') + '.csv';
    try {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast('Plantilla «' + name + '» descargada: ' + (rows.length - 1) + ' filas. Llena «Ejecutado (h)» y cárgala.');
    } catch (e) { toast('No se pudo descargar en esta vista.'); }
  }
  function parseCSV(t) {
    var out = [], row = [], cell = '', q = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
      if (ch === '"') q = true; else if (ch === ';') { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell); out.push(row); row = []; cell = ''; } else if (ch !== '\r') cell += ch;
    }
    if (cell || row.length) { row.push(cell); out.push(row); }
    return out;
  }
  function importText(text, name) {
    var rows = parseCSV(text.replace(/^﻿/, '')).filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
    if (rows.length && /^sep=/i.test(rows[0][0])) rows.shift();
    var hi = rows.findIndex ? rows.findIndex(function (r) { return /semana/i.test(r[0] || '') && /persona/i.test(r[2] || ''); }) : 0;
    if (hi < 0) { ui.dlg = null; return notify('No es una plantilla de ejecución de Kairos (faltan las columnas Semana, Persona, Proyecto, Fase y Ejecutado).', 'err'); }
    var ok = [], bad = [], same = 0, seen = {};
    rows.slice(hi + 1).forEach(function (r, i) {
      var n = hi + i + 2, w = Number(String(r[0] || '').replace(/[^0-9]/g, '')), person = String(r[2] || '').trim(), c = String(r[3] || '').trim(), ph = String(r[5] || '').trim(), raw = String(r[7] || '').trim().replace(',', '.');
      if (!raw) return;
      var v = Number(raw), p = prj(c), per = ctx.persons.filter(function (x) { return x.name === person; })[0];
      if (ph === X.NF) { bad.push({ n: n, why: '«No facturable» se registra en el editor porque exige motivo' }); return; }
      if (p && w && phaseClosed(c, ph, w)) { bad.push({ n: n, why: 'Fase «' + ph + '» aprobada en Avance: no admite horas nuevas' }); return; }
      var cur0 = p && per && w ? recs(person, w, c).filter(function (x) { return x.phase === ph; })[0] : null;
      if (cur0 && cur0.hours === v) { same++; return; }
      var why = !w ? 'Semana vacía o inválida' : !per ? 'Persona «' + person + '» no está entre las personas planeables' : !p ? 'Proyecto «' + c + '» no existe' : p.phases.indexOf(ph) < 0 ? 'Fase «' + ph + '» no es de ' + c : !isFinite(v) || v < 0 || v > 168 || Math.round(v * 2) !== v * 2 ? 'Horas «' + r[7] + '»: usa de 0 a 168, en pasos de 0,5' : lineBlock(person, w, c);
      if (why) { bad.push({ n: n, why: why }); return; }
      var k = person + '|' + w + '|' + c + '|' + ph; if (seen[k]) { bad.push({ n: n, why: 'Fila repetida (persona, semana, proyecto y fase)' }); return; } seen[k] = 1;
      var cur = recs(person, w, c).filter(function (x) { return x.phase === ph; })[0];
      if ((cur ? cur.hours : 0) === v) { same++; return; }
      ok.push({ p: person, w: w, c: c, ph: ph, v: v, from: cur ? cur.hours : null });
    });
    ui.dlg = { type: 'imp', name: name, ok: ok, bad: bad, same: same }; render();
  }
  function doImport() {
    var d = ui.dlg;
    d.ok.forEach(function (o) { putRec(o.p, o.w, o.c, o.ph, o.v, 'plantilla'); delete db.drafts[dkey(o.p, o.w, o.c)]; });
    ui.dlg = null; persist();
    notify('Plantilla cargada: ' + d.ok.length + ' filas aplicadas' + (d.bad.length ? ', ' + d.bad.length + ' con error no se cargaron' : '') + '.', d.bad.length ? 'warn' : 'ok');
  }

  /* ---------- Eventos ---------- */
  function setTab(t) {
    ui.tab = t; ui.notice = null; ui.menu = null;
    try { if (HOST.markNav) HOST.markNav(t === 'extras' ? 'horasextra' : 'ejecucion'); } catch (e) {}
    render(); window.scrollTo(0, 0);
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.dataset.a, k = b.dataset.k, p = b.dataset.p, w = Number(b.dataset.w);
    if (a !== 'menu' && ui.menu) ui.menu = null;
    switch (a) {
      case 'tab': setTab(b.dataset.v); break;
      case 'pickp': ui.q = b.dataset.v; ui.qo = false; render(); break;
      case 'pickprj': ui.fp = b.dataset.v; ui.q = ''; ui.qo = false; render(); break;
      case 'nclose': ui.notice = null; ui.undo = null; render(); break;
      case 'undo': if (!ui.undo) return; ui.undo.recs.forEach(function (r) { db.records.push(r); }); ui.undo = null; persist(); notify('Se restauraron las horas quitadas.', 'ok'); break;
      case 'rmprj': var zr = k.split('|'); ui.dlg = { type: 'rmp', p: zr[0], w: Number(zr[1]), c: zr[2] }; render(); break;
      case 'addpick': ui.menu = null; var ka = dkey(p, w, b.dataset.v); openDraft(p, w, b.dataset.v); ui.edit = ka; ui.open[ka] = true; persist(); render(); var fa2 = document.querySelector('[data-ed="' + ka.replace(/"/g, '\\"') + '"] input'); if (fa2) fa2.focus(); break;
      case 'goextras': if (HOST && HOST.show) HOST.show('horasextra'); else setTab('extras'); break;
      case 'wprev': ui.start -= 4; render(); break;
      case 'wnext': ui.start = Math.min(ui.start + 4, CW + 4); render(); break;
      case 'wk':
        var v = Number(b.dataset.v), i = ui.weeks.indexOf(v);
        if (mobile) ui.weeks = [v];
        /* tocar selecciona; tocar de nuevo quita; maximo 4; la quinta reinicia a la semana actual (sin semanas, vuelve a la actual) */
        else if (i >= 0) { ui.weeks.splice(i, 1); if (!ui.weeks.length) ui.weeks = [CW]; }
        else if (ui.weeks.length >= 4) { ui.weeks = [CW]; toast('Máximo 4 semanas: volvimos a la semana actual.'); }
        else { ui.weeks.push(v); ui.weeks.sort(function (x, y) { return x - y; }); }
        render(); break;
      case 'group': ui.group = b.dataset.v; render(); break;
      case 'line': ui.open[k] = !ui.open[k]; if (ui.edit === k && !ui.open[k]) ui.edit = null; render(); break;
      case 'accept':
        /* [ACORDADO 30-oct] aceptar no guarda directo: abre el editor con lo reservado en la ultima fase usada; el usuario confirma o reparte entre fases */
        var q = k.split('|'), dq2 = openDraft(q[0], Number(q[1]), q[2]), rq = resv(q[0], Number(q[1])).by[q[2]] || 0;
        if (dq2.rows.length === 1 && !dq2.rows[0].orig && !dq2.rows[0].value) dq2.rows[0].value = String(rq).replace('.', ',');
        ui.edit = k; ui.open[k] = true; persist(); render();
        var fq = document.querySelector('[data-ed="' + k.replace(/"/g, '\\"') + '"] .ph-sel'); if (fq) fq.focus(); break;
      case 'acceptall': acceptLines(p, w, lineCodes(p, w)); break;
      case 'edit': var z = k.split('|'); openDraft(z[0], Number(z[1]), z[2]); ui.edit = k; ui.open[k] = true; persist(); render(); var f = document.querySelector('[data-ed="' + k.replace(/"/g, '\\"') + '"] input'); if (f) f.focus(); break;
      case 'same':
        var d = db.drafts[k]; if (!d) return; var rv = resv(d.person, d.week).by[d.code] || 0, lp = lastPhase(d.person, d.code, d.week);
        /* toda la reserva a la ultima fase abierta usada; las demas filas editables se retiran */
        var nr = [], lpRow = null;
        d.rows.forEach(function (r) { if (phaseClosed(d.code, r.phase, d.week)) nr.push(r); else if (r.phase === lp) lpRow = r; else if (r.orig) d.gone = (d.gone || []).concat([r.phase]); });
        lpRow = lpRow || { phase: lp, value: '', orig: '', motivo: '', omot: '' }; lpRow.value = String(rv); nr.push(lpRow); d.rows = nr; persist(); render(); break;
      case 'edadd':
        var da = db.drafts[k], usedA = da.rows.map(function (r) { return r.phase; }), fa = openPhases(da.code, da.week).filter(function (ph) { return usedA.indexOf(ph) < 0; });
        if (fa.length) da.rows.push({ phase: fa[0], value: '', orig: '', motivo: '', omot: '' }); persist(); render();
        var nf2 = document.querySelectorAll('[data-ed="' + k.replace(/"/g, '\\"') + '"] .ph-sel'); if (nf2.length) nf2[nf2.length - 1].focus(); break;
      case 'edrm':
        var dr = db.drafts[k], ri = Number(b.dataset.i), row = dr.rows[ri];
        if (row.orig) { row.value = ''; row.removed = true; dr.rows.splice(ri, 1); dr.gone = (dr.gone || []).concat([row.phase]); } else dr.rows.splice(ri, 1);
        persist(); render(); break;
      case 'save': saveDraft(k); break;
      case 'discard': delete db.drafts[k]; ui.edit = null; persist(); render(); break;
      case 'gotodraft':
        var g = db.drafts[k]; if (!g) return; ui.tab = 'board';
        if (ui.weeks.indexOf(g.week) < 0) { if (mobile) ui.weeks = [g.week]; else { ui.weeks.push(g.week); ui.weeks.sort(function (x, y) { return x - y; }); if (ui.weeks.length > 4) ui.weeks.shift(); } }
        ui.edit = k; ui.open[k] = true; ui.q = ''; ui.fp = ''; render();
        var el = document.querySelector('[data-ed="' + k.replace(/"/g, '\\"') + '"]'); if (el) el.scrollIntoView({ block: 'center' }); break;
      case 'menu': ui.menu = ui.menu === b.dataset.v ? null : b.dataset.v; render(); break;
      case 'copy': ui.menu = null; ui.dlg = { type: 'copy', p: p, w: w, ex: {} }; render(); break;
      case 'del': ui.menu = null; ui.dlg = { type: 'del', p: p, w: w }; render(); break;
      case 'xlsdown': download(); break;
      case 'xlsup': var fi = $('xlsFile'); if (fi) fi.click(); break;
      case 'xwk': ui.xOpen[b.dataset.id] = ui.xOpen[b.dataset.id] === false; render(); break;
      case 'xsendall': xSendAll(); break;
      case 'xtoggle': e.preventDefault(); var det = b.closest('details'); ui.xOpen[b.dataset.id] = !det.open; det.open = !det.open; break;
      case 'xadd': var xe = db.extras.filter(function (x) { return x.id === b.dataset.id; })[0]; xe.rows.push({ code: xe.rows[0].code, day: 5, type: fitType(xe.week, 5, 'HED'), hours: '', status: 'draft' }); persist(); render(); break;
      case 'xdel': var xd = db.extras.filter(function (x) { return x.id === b.dataset.id; })[0]; xd.rows.splice(Number(b.dataset.i), 1); persist(); render(); break;
      case 'xsend': sendExtras(b.dataset.id); break;
      case 'approve': review(b.dataset.id, Number(b.dataset.i), true); notify('Horas extra aprobadas.', 'ok'); break;
      case 'xme': ui.xf.view = b.dataset.v; render(); break;
      case 'xclear': ui.xf = { person: '', week: '', state: '', appr: '', q: '', view: 'todas' }; render(); break;
      case 'xunf': if (k === 'view') ui.xf.view = 'todas'; else ui.xf[k] = ''; render(); break;
      case 'apall': var n = 0; pendRows().forEach(function (x) { if (canApprove(x.r)) { review(x.e.id, x.i, true); n++; } }); notify(n + ' solicitudes de horas extra aprobadas.', 'ok'); break;
      case 'ret': ui.reopen['x' + k] = ''; render(); break;
      case 'retno': delete ui.reopen['x' + k]; render(); break;
      case 'retok':
        var rk = b.dataset.id + '-' + b.dataset.i, note = (ui.reopen['x' + rk] || '').trim();
        if (!note) { toast('Escribe el motivo de la devolución.'); return; }
        review(b.dataset.id, Number(b.dataset.i), false, note); delete ui.reopen['x' + rk]; notify('Solicitud devuelta con motivo. La persona la verá en «Por distribuir».', 'ok'); break;
      case 'reopen': ui.reopen[b.dataset.id] = { t: '' }; render(); break;
      case 'reopenno': delete ui.reopen[b.dataset.id]; render(); break;
      case 'reopenok':
        var ro = ui.reopen[b.dataset.id], l = db.locks.filter(function (x) { return x.id === b.dataset.id; })[0];
        if (!ro.t || !ro.t.trim()) { ro.err = 'Escribe el motivo de la reapertura.'; render(); return; }
        l.active = false; l.reopenReason = ro.t.trim(); l.reopenedBy = me.name; l.reopenedAt = X.TODAY; delete ui.reopen[b.dataset.id]; persist();
        notify('Semanas reabiertas: W' + l.start + (l.end !== l.start ? ' a W' + l.end : '') + '. Quedó registrado el motivo.', 'warn'); break;
    }
  });
  $('ov').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.dataset.a;
    if (a === 'dbg' && e.target !== b) return;
    if (a === 'dclose' || a === 'dbg') { ui.dlg = null; render(); }
    else if (a === 'dcopy') doCopy();
    else if (a === 'ddel') doDel();
    else if (a === 'drmp') { var dq = ui.dlg; ui.dlg = null; removeLine(dq.p, dq.w, dq.c); }
    else if (a === 'dimp') doImport();
  });
  $('ov').addEventListener('change', function (e) {
    var t = e.target, d = ui.dlg; if (!d) return;
    if (t.dataset.in === 'dsrc') { d.src = t.value; d.ex = {}; d.err = ''; render(); }
    else if (t.dataset.in === 'dex') { d.ex = d.ex || {}; d.ex[t.dataset.k] = !t.checked; }
  });
  function onInput(e, commit) {
    var t = e.target, k = t.dataset.in; if (!k) return;
    if (k === 'q') { ui.q = t.value; ui.qo = true; ui.qs = false; render(); }
    else if (k === 'edv') {
      var d = db.drafts[t.dataset.k]; if (!d) return; d.rows[Number(t.dataset.i)].value = t.value.trim(); X.save(db);
      var s = document.querySelector('[data-edsum="' + t.dataset.k.replace(/"/g, '\\"') + '"]'); if (s) s.innerHTML = edSum(d);
    }
    else if (k === 'edph' || k === 'edmot') {
      var de = db.drafts[t.dataset.k]; if (!de) return; var rw = de.rows[Number(t.dataset.i)];
      if (k === 'edmot') { rw.motivo = t.value; X.save(db); return; }
      if (rw.orig) { de.gone = (de.gone || []).concat([rw.phase]); }
      var exist = de.gone && de.gone.indexOf(t.value) >= 0; rw.phase = t.value; rw.orig = ''; rw.motivo = ''; rw.omot = '';
      if (exist) { var o2 = recs(de.person, de.week, de.code).filter(function (x) { return x.phase === t.value; })[0]; if (o2) { rw.orig = String(o2.hours); de.gone = de.gone.filter(function (g) { return g !== t.value; }); } }
      X.save(db); render(); return;
    }
    else if (k === 'xcomp') {
      var xe3 = db.extras.filter(function (y) { return y.id === t.dataset.id; })[0]; if (!xe3) return;
      var cv = t.value.replace(/[^0-9.,]/g, ''); if (cv !== t.value) t.value = cv;
      xCSet(xe3, t.dataset.c, cv); X.save(db);
      if (commit) setTimeout(render, 0); else document.querySelectorAll('[data-xprog="' + xe3.id + '"]').forEach(function (el) { el.innerHTML = xProg(xe3); });
    }
    else if (k === 'xcell') {
      var xe2 = db.extras.filter(function (y) { return y.id === t.dataset.id; })[0]; if (!xe2) return;
      var vv = t.value.replace(/[^0-9.,]/g, ''); if (vv !== t.value) t.value = vv;
      xSet(xe2, t.dataset.c, Number(t.dataset.d), t.dataset.n === '1', vv); X.save(db);
      if (commit) setTimeout(render, 0); else document.querySelectorAll('[data-xprog="' + xe2.id + '"]').forEach(function (el) { el.innerHTML = xProg(xe2); });
    }
    else if (k === 'xrow') {
      var x = db.extras.filter(function (y) { return y.id === t.dataset.id; })[0], xr = x.rows[Number(t.dataset.i)]; xr[t.dataset.f] = t.value;
      if (t.dataset.f === 'day') xr.type = fitType(x.week, xr.day, xr.type);
      X.save(db);
      if (t.tagName === 'SELECT') render();
      else { var xp = document.querySelector('[data-xprog="' + x.id + '"]'); if (xp) xp.innerHTML = xProg(x); }
    }
    else if (k === 'retnote') ui.reopen['x' + t.dataset.k] = t.value;
    else if (k === 'xq') { ui.xf.q = t.value; render(); }
    else if (k === 'reopen') ui.reopen[t.dataset.k].t = t.value;
    else if (!commit) return;
    else if (k === 'fp') { ui.fp = t.value; render(); }
    else if (k === 'addprj') { if (!t.value) return; var kk = dkey(t.dataset.p, Number(t.dataset.w), t.value); openDraft(t.dataset.p, Number(t.dataset.w), t.value); ui.edit = kk; ui.open[kk] = true; persist(); render(); }
    else if (k === 'xf') { ui.xf[t.dataset.k] = t.value; render(); }
    else if (k === 'lk') { ui.lk[t.dataset.k] = t.value; ui.lk.err = ''; render(); }
  }
  app.addEventListener('input', function (e) { if (e.target.tagName !== 'SELECT') onInput(e, false); });
  app.addEventListener('change', function (e) {
    if (e.target.id === 'xlsFile') {
      var file = e.target.files && e.target.files[0]; if (!file) return;
      var rd = new FileReader(); rd.onload = function () { importText(String(rd.result), file.name); }; rd.readAsText(file, 'utf-8'); e.target.value = ''; return;
    }
    if (e.target.dataset.in === 'edv' || (e.target.dataset.in === 'xrow' && e.target.tagName !== 'SELECT')) return;
    if (e.target.dataset.in === 'xcell' || e.target.dataset.in === 'xcomp') { onInput(e, true); return; }
    onInput(e, true);
  });
  app.addEventListener('submit', function (e) { if (e.target.dataset.form === 'lock') { e.preventDefault(); doLock(); } });
  app.addEventListener('focusin', function (e) { if (e.target.dataset && e.target.dataset.in === 'q' && !ui.qo && !ui.qs) { ui.qo = true; render(); } });
  app.addEventListener('click', function (e) { if (e.target.dataset && e.target.dataset.in === 'q' && !ui.qo) { ui.qs = false; ui.qo = true; render(); } });
  app.addEventListener('keydown', function (e) {
    if (e.target.dataset && e.target.dataset.in === 'q') {
      if (e.key === 'ArrowDown') { var f = document.querySelector('.sug button'); if (f) { e.preventDefault(); f.focus(); } }
      else if (e.key === 'Escape') { ui.qo = false; ui.qs = true; render(); }
      else if (e.key === 'Enter') { var f1 = document.querySelector('.sug button'); if (f1) { e.preventDefault(); f1.click(); } }
    } else if (e.target.closest && e.target.closest('.sug')) {
      var bs = Array.prototype.slice.call(document.querySelectorAll('.sug button')), i = bs.indexOf(e.target);
      if (e.key === 'ArrowDown' && bs[i + 1]) { e.preventDefault(); bs[i + 1].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (bs[i - 1] || document.querySelector('[data-in=q]')).focus(); }
      else if (e.key === 'Escape') { ui.qo = false; render(); var qi = document.querySelector('[data-in=q]'); if (qi) qi.focus(); }
    }
    if (e.key === 'Enter' && e.target.dataset.in === 'edv') { e.preventDefault(); saveDraft(e.target.dataset.k); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (ui.dlg) { ui.dlg = null; render(); } else if (ui.menu) { ui.menu = null; render(); } } });
  document.addEventListener('click', function (e) { if (ui.menu && !e.target.closest('.kw')) { ui.menu = null; render(); } if (ui.qo && !e.target.closest('.sbox')) { ui.qo = false; render(); } });
  window.addEventListener('hashchange', function () { setTab(/extras/.test(location.hash) ? 'extras' : /bloqueos/.test(location.hash) ? 'locks' : 'board'); });
  /* la grilla de horas extra cambia de columnas en 1150 px: re-render al cruzar */
  var lastAP = window.innerWidth >= 1150; window.addEventListener('resize', function () { var a = window.innerWidth >= 1150; if (a !== lastAP) { lastAP = a; if (ui.tab === 'extras') render(); } });
  window.KX_APP = { setTab: setTab };

  render();
})();
