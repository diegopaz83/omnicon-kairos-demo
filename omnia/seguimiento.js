/* omnIA · Alertas de seguimiento (Maestro 13, punto 15; CAMBIOS 31-oct).
   Motor determinista: compara % de horas consumidas contra % de avance reportado en cada corte semanal.
   No usa IA. La fuente es el corte que publica Proyectos (kairos-seguimiento-corte); si aun no existe,
   usa SEED, que es una copia del mismo corte generada con los datos ficticios del prototipo.
   En produccion esto es un servicio del backend: lee horas de Ejecucion y avance de Avance, y guarda
   las explicaciones por un servicio de negocio auditable. */
(function () {
  'use strict';
  var LS_CORTE = 'kairos-seguimiento-corte', LS_STATE = 'kairos-seguimiento', LS_UMB = 'kairos-omnia-alertas';
  var UMB0 = { imp: 15, crit: 30, sinReporte: true };
  var CAUSAS = ['Recursos insuficientes', 'Perfil inadecuado', 'Materiales tardíos', 'Subestimación', 'Bloqueo técnico', 'Cambio de alcance', 'Otra'];
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var SEED = null; /* se reemplaza abajo por el corte de referencia */

  function get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function fd(s) { var d = new Date(s + 'T00:00:00Z'); return d.getUTCDate() + ' ' + MES[d.getUTCMonth()]; }
  function isoW(s) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 3 - (d.getUTCDay() + 6) % 7); var y = d.getUTCFullYear(), j = new Date(Date.UTC(y, 0, 4)); return 1 + Math.round(((d - j) / 864e5 - 3 + (j.getUTCDay() + 6) % 7) / 7); }
  function nf(n) { return Math.round(n).toLocaleString('es-CO'); }
  var LV = { important: 'Importante', critical: 'Crítica' };

  function umbrales() { var u = get(LS_UMB) || {}; return { imp: u.imp != null ? u.imp : UMB0.imp, crit: u.crit != null ? u.crit : UMB0.crit, sinReporte: u.sinReporte != null ? u.sinReporte : UMB0.sinReporte }; }
  /* Valida en el mismo lugar que guarda: en produccion el backend repite esta validacion. */
  function setUmbrales(o) {
    var imp = parseInt(o.imp, 10), crit = parseInt(o.crit, 10);
    if (!(imp >= 1 && imp <= 100)) return 'El umbral importante debe estar entre 1 y 100 puntos';
    if (!(crit >= 2 && crit <= 100)) return 'El umbral crítico debe estar entre 2 y 100 puntos';
    if (crit <= imp) return 'El umbral crítico debe ser mayor que el importante';
    put(LS_UMB, { imp: imp, crit: crit, sinReporte: !!o.sinReporte }); fire(); return null;
  }
  function resetUmbrales() { try { localStorage.removeItem(LS_UMB); } catch (e) {} fire(); }
  function corte() { return get(LS_CORTE) || SEED; }
  function simulado() { return !get(LS_CORTE); }
  function state() { var s = get(LS_STATE) || {}; s.exp = s.exp || []; return s; }

  function nivel(d, u) { return d >= u.crit ? 'critical' : d >= u.imp ? 'important' : null; }

  /* Regla horas vs avance. Abre con el primer corte sobre el umbral; cambia de nivel con historial;
     se cierra tras 2 cortes seguidos bajo el umbral importante [PROPUESTA aprobada 31-oct]. */
  function reglaHoras(it, u) {
    var open = null, below = 0;
    (it.serie || []).forEach(function (pt) {
      var d = pt.h - pt.a, lv = nivel(d, u);
      if (lv) {
        below = 0;
        if (!open) open = { since: pt.wk, level: lv, hist: [{ wk: pt.wk, level: lv, d: d }] };
        else if (lv !== open.level) { open.hist.push({ wk: pt.wk, level: lv, d: d }); open.level = lv; }
      } else if (open) { below += 1; if (below >= 2) { open = null; below = 0; } }
    });
    if (!open) return null;
    var last = it.serie[it.serie.length - 1], d = last.h - last.a;
    var esc = open.hist.length > 1 && open.hist[open.hist.length - 1].level === 'critical' && open.hist[open.hist.length - 2].level === 'important';
    var hrs = it.refH ? ' (' + nf(it.execH) + ' de ' + nf(it.refH) + ' h)' : '';
    return {
      key: it.id + ':horas:' + open.since, rule: 'horas', level: open.level, projectId: it.id, code: it.code, name: it.name, leader: it.leader, team: it.team,
      h: last.h, a: last.a, d: d, since: open.since, hist: open.hist, below: below, umbral: open.level === 'critical' ? u.crit : u.imp,
      title: it.name + ' consume más de lo que avanza',
      text: 'Horas ' + last.h + ' %' + hrs + ' contra avance ' + last.a + ' %: ' + (d >= 0 ? '+' : '') + d + ' puntos.',
      escalated: esc
    };
  }
  /* Semana sin reporte: importante la primera, critica desde la segunda seguida [PROPUESTA aprobada 31-oct]. */
  function reglaReporte(it) {
    var n = (it.pend || []).length; if (!n) return null;
    var lv = n >= 2 ? 'critical' : 'important';
    return {
      key: it.id + ':reporte:' + it.pend[0], rule: 'reporte', level: lv, projectId: it.id, code: it.code, name: it.name, leader: it.leader, team: it.team,
      since: it.pend[0], pend: it.pend, hist: [{ wk: it.pend[0], level: 'important' }].concat(n >= 2 ? [{ wk: it.pend[1], level: 'critical' }] : []),
      title: it.name + (n === 1 ? ' no reportó avance' : ' lleva ' + n + ' semanas sin reportar avance'),
      text: 'Sin reporte de ' + it.pend.map(function (w) { return 'S' + isoW(w); }).join(', ') + '. Sin avance no se puede comparar contra las horas.',
      escalated: n >= 2
    };
  }
  function evaluar() {
    var c = corte(), u = umbrales(), out = [];
    if (!c) return out;
    c.items.forEach(function (it) {
      /* Servicios sin % de avance quedan fuera [PROPUESTA aprobada 31-oct]. Solo proyectos activos con linea base. */
      if (it.cat === 'servicio' || !it.base) return;
      var a = reglaHoras(it, u); if (a) out.push(a);
      if (u.sinReporte) { var b = reglaReporte(it); if (b) out.push(b); }
    });
    var X = state().exp;
    out.forEach(function (a) { a.corte = c.corte; a.exps = X.filter(function (x) { return x.key === a.key; }); });
    var ord = { critical: 0, important: 1 };
    return out.sort(function (x, y) { return ord[x.level] - ord[y.level] || y.d - x.d || (x.code < y.code ? -1 : 1); });
  }
  /* Quien ve: Direccion y Planeacion todo; el lider sus proyectos; el ejecutor los proyectos de su equipo.
     Solution Design y Administrativo no reciben alertas de seguimiento. En produccion lo filtra el servidor. */
  function visibles(role, user) {
    return evaluar().filter(function (a) {
      if (role === 'direccion' || role === 'planeacion') return true;
      if (role === 'lider') return a.leader === user;
      if (role === 'ejecutor') return a.leader === user || (a.team || []).indexOf(user) >= 0;
      return false;
    });
  }
  function puedeExplicar(a, role, user) { return role === 'direccion' || (role === 'lider' && a.leader === user); }
  function alertsFor(projectId) { return evaluar().filter(function (a) { return a.projectId === projectId; }); }
  function contar() { var L = evaluar(), r = { critical: 0, important: 0, reporte: 0, total: L.length }; L.forEach(function (a) { if (a.rule === 'reporte') r.reporte += 1; else r[a.level] += 1; }); return r; }

  /* Registrar no cierra la alerta: solo deja la explicacion con autor y hora y la lleva a la Bitacora. */
  function registrar(a, causas, detalle, by) {
    if (!causas.length && !detalle) return 'Marca al menos una causa o escribe el detalle';
    var s = state(), now = new Date(), today = (window.KX && window.KX.TODAY) || now.toISOString().slice(0, 10);
    var hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    var head = 'Explicación de alerta ' + LV[a.level].toLowerCase() + (a.rule === 'horas' ? ' (horas ' + a.h + ' % · avance ' + a.a + ' %)' : ' (semana sin reporte)') + '. ';
    var x = { id: 'x' + now.getTime(), key: a.key, projectId: a.projectId, level: a.level, causas: causas, detail: detalle, by: by, at: today, hm: hm,
      text: head + (causas.length ? 'Causas: ' + causas.join(', ') + '. ' : '') + (detalle || '') };
    s.exp.push(x); put(LS_STATE, s); fire(); return null;
  }

  var subs = [];
  function fire() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }
  window.addEventListener('storage', function (e) { if (e.key === LS_CORTE || e.key === LS_STATE || e.key === LS_UMB) fire(); });

  window.OmniaSeguimiento = {
    CAUSAS: CAUSAS, LV: LV, umbrales: umbrales, setUmbrales: setUmbrales, resetUmbrales: resetUmbrales, corte: corte, simulado: simulado,
    evaluar: evaluar, visibles: visibles, puedeExplicar: puedeExplicar, alertsFor: alertsFor, contar: contar, registrar: registrar,
    fecha: fd, semana: function (w) { return 'S' + isoW(w); }, onChange: function (f) { subs.push(f); }, setSeed: function (s) { SEED = s; }
  };
})();
