/* Kairos · Ejecucion y horas extra — motor de datos compartido por el modulo y el Ecosistema.
   La reserva (modulo Reservas) es el plan: persona x dia x proyecto. Lo ejecutado cierra el ciclo:
   persona x proyecto x fase x semana x horas. Datos ficticios; persistencia local del prototipo. */
(function () {
  'use strict';
  var LS = 'kairos-ejecucion-v4-real', LS_RES = 'kairos-reservas-cal-v1-real', LS_PRJ = 'kairos-proyectos-v1-real';
  var TODAY = '2026-10-23', DAYH = 8.4, BASE = 42, WINDOW = 8;

  /* ---------- Fechas ISO y festivos de Colombia ---------- */
  function parse(s) { var a = s.split('-').map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2])); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function add(s, n) { var d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function dow(s) { return parse(s).getUTCDay(); }
  function nextMonday(s) { var w = dow(s); return w === 1 ? s : add(s, (8 - w) % 7); }
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return y + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0');
  }
  var hcache = {};
  function holidays(y) {
    if (hcache[y]) return hcache[y];
    var p = function (md) { return y + '-' + md; }, E = easter(y), h = {};
    [['01-01', 'Año Nuevo'], ['05-01', 'Día del Trabajo'], ['07-20', 'Independencia'], ['08-07', 'Batalla de Boyacá'],
      ['12-08', 'Inmaculada Concepción'], ['12-25', 'Navidad']].forEach(function (x) { h[p(x[0])] = x[1]; });
    [['01-06', 'Reyes Magos'], ['03-19', 'San José'], ['06-29', 'San Pedro y San Pablo'], ['08-15', 'Asunción de la Virgen'],
      ['10-12', 'Día de la Raza'], ['11-01', 'Todos los Santos'], ['11-11', 'Independencia de Cartagena']].forEach(function (x) { h[nextMonday(p(x[0]))] = x[1]; });
    h[add(E, -3)] = 'Jueves Santo'; h[add(E, -2)] = 'Viernes Santo';
    h[add(E, 43)] = 'Ascensión del Señor'; h[add(E, 64)] = 'Corpus Christi'; h[add(E, 71)] = 'Sagrado Corazón';
    return (hcache[y] = h);
  }
  function holiday(s) { return holidays(Number(s.slice(0, 4)))[s] || null; }
  function weekStart(y, w) { var j = new Date(Date.UTC(y, 0, 4)), d = j.getUTCDay() || 7; return iso(new Date(Date.UTC(y, 0, 4 - d + 1 + (w - 1) * 7))); }
  function isoWeek(s) { var d = parse(s), day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); var y = d.getUTCFullYear(), y0 = new Date(Date.UTC(y, 0, 1)); return { year: y, week: Math.ceil(((d - y0) / 864e5 + 1) / 7) }; }
  function weekDays(y, w) { var s = weekStart(y, w), o = []; for (var i = 0; i < 7; i++) o.push(add(s, i)); return o; }
  function workdays(y, w) { return weekDays(y, w).slice(0, 5).filter(function (s) { return !holiday(s); }); }
  /* Capacidad de la semana segun el Maestro 6.3: 42 h sin festivos, 33 h con uno, 24 h con dos (9 h por festivo) */
  function capacity(y, w) { return Math.max(0, BASE - 9 * (5 - workdays(y, w).length)); }
  var CUR = isoWeek(TODAY);
  function r1(n) { return Math.round(n * 10) / 10; }
  function num(v) { return v === null || v === undefined || v === '' ? 0 : Number(v); }

  /* ---------- Semilla de Reservas (misma regla que el modulo Reservas) ---------- */
  var RCLIENTS = { 'cli-00': 'Omnicon', 'cli-01': 'Ecopetrol S.A.', 'cli-02': 'Celsia Colombia S.A. E.S.P.', 'cli-03': 'GeoPark Colombia S.A.S.', 'cli-04': 'Duquesa S.A.S. BIC', 'cli-05': 'Barry Callebaut', 'cli-06': 'Sucroal S.A.', 'cli-07': 'Corteva Agriscience de Colombia', 'cli-08': 'Kenvue Colombia S.A.', 'cli-09': 'Rockwell Automation Colombia' };
  var RPROJ = [
    ['prj-01', '30202004200', 'Act. estaciones cliente Florena', 'cli-01', 'Proyecto', 'activo'],
    ['prj-02', '30401007200', 'Contrato mtto plataforma Rockwell 2026', 'cli-02', 'Servicio', 'activo'],
    ['prj-03', '30029800000', 'Assessment infraestructura SCADA', 'cli-03', 'Proyecto', 'activo'],
    ['prj-04', '30301053200', 'Bolsa de horas de ingeniería 2026 · 40 días', 'cli-04', 'Servicio', 'activo'],
    ['prj-05', '30027700000', 'BC PLC programming for Layer 3 Pasir', 'cli-05', 'Proyecto', 'activo'],
    ['prj-06', '30014700000', 'Change Request 1: Pasir Gudang', 'cli-05', 'Proyecto', 'cerrado'],
    ['prj-07', '30311055800', 'Programación planta remoción de sulfatos', 'cli-06', 'Proyecto', 'activo'],
    ['prj-08', '30311054100', 'Contrato de mtto enero a diciembre 2026', 'cli-07', 'Servicio', 'activo'],
    ['prj-09', '30032400000', 'Holding continuo TA3', 'cli-08', 'Proyecto', 'activo'],
    ['prj-10', '30701006500', 'Anexo 194 soporte base Manizales RA 2026', 'cli-09', 'Servicio', 'activo'],
    ['prj-11', '30009400000', 'Toluca MES project · solid lines scope', 'cli-05', 'Proyecto', 'activo'],
    ['prj-12', '30301044600', 'BC Smart Factory PM for Itabuna Brazil', 'cli-05', 'Proyecto', 'cerrado'],
    ['prj-90', 'OMN-VAC', 'Vacaciones', 'cli-00', 'Interno', 'activo', 'abs'],
    ['prj-91', 'OMN-INC', 'Incapacidad', 'cli-00', 'Interno', 'activo', 'abs'],
    ['prj-92', 'OMN-ENT', 'Entrenamiento', 'cli-00', 'Interno', 'activo'],
    ['prj-93', 'OMN-COM', 'Compensatorio', 'cli-00', 'Interno', 'activo', 'abs']
  ].map(function (r) { return { id: r[0], code: r[1], name: r[2], client: RCLIENTS[r[3]], type: r[4], rstate: r[5], absence: r[6] === 'abs', internal: r[4] === 'Interno' }; });
  var RPERS = [
    ['per-01', 'Brainer Ocampo'], ['per-02', 'Federman Tapia'], ['per-03', 'Luis Lara'], ['per-04', 'Natalie Ramírez'],
    ['per-05', 'Rafael de Vega'], ['per-06', 'Cristian Pérez'], ['per-07', 'Juan Menco'], ['per-08', 'Kenya Sánchez'],
    ['per-09', 'Kevin Peña'], ['per-10', 'Laura Posso'], ['per-11', 'Simón Giraldo'], ['per-12', 'Víctor Rivera'],
    ['per-13', 'Nataly Méndez'], ['per-14', 'Carlos Restrepo'], ['per-15', 'Brayan Castro'], ['per-16', 'Willian Villalobos'],
    ['per-17', 'Camilo Ávila'], ['per-18', 'Juan Quintero'], ['per-19', 'Santiago Tobar'], ['per-20', 'Carlos Morales'],
    ['per-21', 'Cristian Mejía', false], ['per-22', 'Isabella Orozco', false]
  ].map(function (p) { return { id: p[0], name: p[1], active: p[2] !== false }; });
  function seedReservations() {
    var HOL = { '2026-10-12': 1, '2026-11-02': 1, '2026-11-16': 1 }, days = [];
    for (var s = '2026-10-01'; s <= '2026-11-30'; s = add(s, 1)) { var w = dow(s); if (w !== 0 && w !== 6 && !HOL[s]) days.push(s); }
    function between(a, b) { return function (s) { return s >= a && s <= b; }; }
    var rules = {
      'per-01': function (s, i) { return i % 2 ? 'prj-07' : 'prj-02'; },
      'per-02': function (s) { return s < '2026-11-01' ? 'prj-01' : 'prj-09'; },
      'per-03': function (s) { return s === '2026-10-27' ? 'prj-91' : 'prj-05'; },
      'per-04': function (s) { return between('2026-11-09', '2026-11-13')(s) ? 'prj-92' : 'prj-11'; },
      'per-05': function (s) { return s <= '2026-10-23' ? 'prj-05' : null; },
      'per-06': function (s) { return s <= '2026-10-09' ? 'prj-12' : (s === '2026-10-28' ? 'prj-12' : 'prj-01'); },
      'per-07': function () { return 'prj-02'; },
      'per-08': function (s) { return s <= '2026-11-20' ? 'prj-11' : null; },
      'per-09': function (s) { return between('2026-11-23', '2026-11-27')(s) ? 'prj-90' : 'prj-03'; },
      'per-10': function () { return 'prj-04'; },
      'per-11': function (s) { return s <= '2026-10-23' ? 'prj-03' : null; },
      'per-12': function () { return 'prj-05'; },
      'per-13': function (s) { return s <= '2026-11-27' || s === '2026-11-30' ? 'prj-05' : null; },
      'per-14': function (s) { return s < '2026-11-03' ? 'prj-05' : null; },
      'per-15': function (s) { return s <= '2026-10-16' ? 'prj-02' : 'prj-07'; },
      'per-16': function () { return 'prj-01'; },
      'per-17': function (s) { return s === '2026-10-30' ? 'prj-93' : 'prj-01'; },
      'per-18': function (s) { var w = dow(s); return w === 1 || w === 3 || w === 5 ? 'prj-02' : null; },
      'per-19': function () { return 'prj-09'; },
      'per-20': function (s) { return between('2026-11-03', '2026-11-06')(s) ? 'prj-03' : 'prj-09'; },
      'per-21': function (s) { return s <= '2026-10-15' ? 'prj-01' : null; }
    };
    var res = {};
    Object.keys(rules).forEach(function (pid) { days.forEach(function (s, i) { var prj = rules[pid](s, i); if (prj) res[pid + '|' + s] = { personId: pid, projectId: prj, date: s }; }); });
    return res;
  }

  /* ---------- Semilla de Proyectos (lider, categoria, unidad y estado por codigo) ---------- */
  var PSEED = {
    '30202004200': ['Ernesto Osorio', 'proyecto', 'AU', 'activo', ['Willian Villalobos', 'Camilo Ávila', 'Cristian Córdoba', 'Cristian Pérez', 'José Oviedo', 'Federman Tapia']],
    '30401007200': ['Ernesto Osorio', 'servicio', 'AU', 'activo', ['Brayan Castro', 'Juan Quintero', 'Néstor Mazabuel', 'Juan Menco', 'Brainer Ocampo']],
    '30029800000': ['Jhon Herrera', 'proyecto', 'AU', 'activo', ['Simón Giraldo', 'Iván Velasco', 'Miguel Quintero', 'Kevin Peña']],
    '30301053200': ['Miguel Quintero', 'servicio', 'AU', 'activo', ['Miguel Quintero', 'Laura Posso']],
    '30027700000': ['Rafael de Vega', 'proyecto', 'SM', 'activo', ['Nataly Méndez', 'Carlos Restrepo', 'Luis Lara', 'Víctor Rivera']],
    '30014700000': ['Rafael de Vega', 'proyecto', 'SM', 'cerrado', ['Nataly Méndez']],
    '30311055800': ['Brainer Ocampo', 'proyecto', 'AU', 'activo', ['Brainer Ocampo', 'Brayan Castro']],
    '30311054100': ['Kevin Peña', 'servicio', 'AU', 'activo', ['Kevin Peña']],
    '30032400000': ['Santiago Tobar', 'proyecto', 'AU', 'activo', ['Santiago Tobar', 'Carlos Morales', 'Juan Gutiérrez', 'Federman Tapia']],
    '30701006500': ['Juan Dueñas', 'servicio', 'AU', 'activo', ['Juan Dueñas', 'Diego López', 'George Moreno', 'César Bolívar', 'Carlos Rodríguez']],
    '30009400000': ['Natalie Ramírez', 'proyecto', 'SM', 'auditoria', ['Natalie Ramírez', 'Luis Orozco', 'Kenya Sánchez']],
    '30301044600': ['Rafael de Vega', 'proyecto', 'SM', 'cerrado', ['Luis Angulo', 'Daniela Perea', 'Víctor Rivera', 'Cristian Pérez']],
    'ANT-0003': ['Laura Posso', 'proyecto', 'CO', 'pendiente', ['Laura Posso'], 'Hoja de ruta de transformación digital', 'Alternegy S.A.']
  };
  /* Fechas de los proyectos (las de Proyectos) para elegir la fase activa en la semilla */
  var DATES = { '30202004200': ['2026-07-06', '2026-12-18'], '30401007200': ['2026-03-02', '2027-02-26'], '30029800000': ['2026-08-03', '2026-12-11'], '30301053200': ['2026-01-12', '2026-12-18'],
    '30027700000': ['2026-06-01', '2027-01-29'], '30014700000': ['2025-11-03', '2026-05-29'], '30311055800': ['2026-09-07', '2027-01-22'], '30311054100': ['2026-04-06', '2027-03-31'],
    '30032400000': ['2026-11-03', '2027-03-12'], '30701006500': ['2026-10-05', '2026-12-04'], '30009400000': ['2026-04-13', '2026-10-16'], '30301044600': ['2025-09-01', '2026-02-27'] };
  /* Ventanas de fase iguales a Avance: fase i activa entre i/n*0,8 y +0,34 del plazo; Gestion todo el plazo */
  function activePhases(p, y, w) {
    var d = DATES[p.code], tpl = PH_TPL[p.un] || PH_TPL.AU;
    if (!d || p.cat === 'servicio' || p.internal) return p.phases.filter(function (x) { return x !== NF; });
    var a = parse(d[0]), b = parse(d[1]), t = (parse(weekStart(y, w)) - a) / (b - a);
    var out = tpl.filter(function (n, i) { var s = i / tpl.length * 0.8; return t >= s && t < Math.min(1, s + 0.34); });
    if (p.cat === 'proyecto') { if (t >= 0.35 && t < 0.7) out.push('Ingeniería del alcance ampliado'); if (t >= 0.65) out.push('Puesta en marcha del alcance ampliado'); }
    out.push('Gestión del proyecto');
    return out;
  }
  var SUBSEED = { '30401007200': 'mantenimiento', '30301053200': 'bolsa', '30311054100': 'mantenimiento', '30701006500': 'puntual' };
  /* Fases: las mismas de Avance en Proyectos (plantilla por unidad de negocio) */
  var PH_TPL = { AU: ['Preparación', 'Configuración de PLC', 'Configuración de HMI', 'Protocolos y pruebas FAT', 'Comisionamiento y SAT'],
    SM: ['Levantamiento de información', 'Diseño de arquitectura', 'Desarrollo de reportes', 'Pruebas FAT/UAT', 'Despliegue y soporte de arranque'],
    CO: ['Preparación', 'Estado actual (MOM Mapping)', 'Diseño del estado futuro', 'Desarrollo de documento'] };
  /* Servicios: las fases de su cotizacion. Historico: una sola fase «Soporte al cliente».
     Contrato de mantenimiento: sus lineas cotizadas; la Disponibilidad es linea comercial y no se registra. */
  var PH_SERV = ['Soporte al cliente'];
  var PH_CONTRATO = ['Preventivo y correctivo', 'Urgencias', 'Gestión del contrato'];
  function phasesFor(cat, un, sub) {
    if (cat === 'servicio') return (sub === 'mantenimiento' ? PH_CONTRATO : PH_SERV).slice();
    var l = (PH_TPL[un] || PH_TPL.AU).concat(['Gestión del proyecto']);
    if (cat === 'proyecto') l = l.concat(['Ingeniería del alcance ampliado', 'Puesta en marcha del alcance ampliado']);
    return l;
  }

  var NF = 'No facturable', NF_MOTIVOS = ['Reproceso', 'Garantía', 'Traslado', 'Otro'];
  function readLS(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }

  /* Contexto: personas planeables, proyectos y reservas, leyendo lo que hayan guardado Reservas y Proyectos */
  function context() {
    var rs = readLS(LS_RES), pj = readLS(LS_PRJ);
    var res = rs && rs.res ? rs.res : seedReservations();
    var byPrj = {}, projects = [], byCode = {};
    var plist = pj && pj.v === 1 && pj.projects ? pj.projects : null;
    RPROJ.forEach(function (r) {
      var p = { code: r.code, name: r.name, client: r.client, type: r.type, internal: r.internal, absence: r.absence, state: r.rstate, leader: null, team: [], cat: r.internal ? 'interno' : r.type === 'Servicio' ? 'servicio' : 'proyecto', un: 'AU' };
      var s = PSEED[r.code]; if (s) { p.leader = s[0]; p.cat = s[1]; p.un = s[2]; p.state = s[3]; p.team = s[4].slice(); p.sub = SUBSEED[r.code] || null; }
      byPrj[r.id] = p; byCode[p.code] = p; projects.push(p);
    });
    Object.keys(PSEED).forEach(function (c) {
      if (byCode[c]) return; var s = PSEED[c];
      var p = { code: c, name: s[5], client: s[6], type: 'Proyecto', internal: false, absence: false, leader: s[0], cat: s[1], un: s[2], state: s[3], team: s[4].slice() };
      byCode[c] = p; projects.push(p);
    });
    if (plist) plist.forEach(function (q) {
      var p = byCode[q.code];
      if (!p) { p = { code: q.code, name: q.name, client: q.clientName || '', type: q.cat === 'servicio' ? 'Servicio' : 'Proyecto', internal: false, absence: false }; byCode[q.code] = p; projects.push(p); }
      p.leader = q.leader || p.leader; p.cat = q.cat || p.cat; p.un = q.un || p.un; p.state = q.state || p.state; p.team = (q.team || p.team || []).slice(); p.name = q.name || p.name; p.sub = q.sub || p.sub;
      /* fases definidas en Proyectos (incluye fases partidas por el lider) */
      if (q.av && q.av.phases && q.av.phases.length) {
        p.ownPhases = q.av.phases.map(function (x) { return x.name; }); p.split = q.av.phases.filter(function (x) { return x.parent; }).map(function (x) { return x.name; });
        /* fase Aprobada (100 %) en Avance: cerrada desde la semana siguiente al reporte */
        p.closed = {};
        (q.av.reports || []).forEach(function (r) { q.av.phases.forEach(function (x) { if ((r.ph || {})[x.id] === 100 && !(x.name in p.closed)) { var wk = isoWeek(r.wk); p.closed[x.name] = { year: wk.year, week: wk.week }; } }); });
      }
    });
    projects.forEach(function (p) {
      p.phases = p.absence ? ['Ausencia'] : p.internal ? ['General'] : p.ownPhases && p.cat !== 'servicio' ? p.ownPhases.slice() : phasesFor(p.cat, p.un, p.sub);
      /* [PROPUESTA 24-oct] cada proyecto o servicio tiene la fase fija «No facturable», con motivo obligatorio; no pesa en Avance y nunca se cierra */
      if (!p.internal) p.phases.push(NF);
      p.closed = p.closed || {};
      p.open = p.state === 'activo' || p.state === 'auditoria' || p.state === 'pendiente';
    });
    var persons = RPERS.map(function (x) { return { id: x.id, name: x.name, active: x.active }; });
    var pById = {}; persons.forEach(function (x) { pById[x.id] = x; });
    /* reserva por persona y semana: { code: horas } */
    var rmap = {};
    Object.keys(res).forEach(function (k) {
      var r = res[k], per = pById[r.personId], prj = byPrj[r.projectId]; if (!per || !prj) return;
      var wk = isoWeek(r.date), key = per.name + '|' + wk.year + '|' + wk.week;
      var m = rmap[key] || (rmap[key] = { total: 0, by: {}, days: {} });
      /* hora-dia de la reserva = capacidad de la semana / dias habiles (8,4 h; 8,25 h con un festivo) */
      var dh = capacity(wk.year, wk.week) / Math.max(1, workdays(wk.year, wk.week).length);
      m.by[prj.code] = Math.round(((m.by[prj.code] || 0) + dh) * 100) / 100; m.total = Math.round((m.total + dh) * 100) / 100;
      (m.days[prj.code] || (m.days[prj.code] = [])).push(r.date);
    });
    function reserved(name, y, w) { return rmap[name + '|' + y + '|' + w] || { total: 0, by: {}, days: {} }; }
    return { persons: persons, projects: projects, byCode: byCode, reserved: reserved, fromReservas: !!(rs && rs.res), fromProyectos: !!plist };
  }

  /* ---------- Semilla de ejecucion ---------- */
  function seed(ctx) {
    var recs = [], seq = 0;
    function put(person, w, code, phase, hours) {
      var r = recs.filter(function (x) { return x.person === person && x.week === w && x.code === code && x.phase === phase; })[0];
      if (r) { r.hours = r1(r.hours + hours); return; }
      recs.push({ id: 'e' + (++seq), year: 2026, week: w, person: person, code: code, phase: phase, hours: r1(hours), by: person, at: weekStart(2026, w), history: [] });
    }
    function accept(person, w) {
      var rv = ctx.reserved(person, 2026, w);
      Object.keys(rv.by).forEach(function (code, j) {
        var p = ctx.byCode[code], ph = activePhases(p, 2026, w), hrs = rv.by[code];
        if (ph.length > 1 && hrs > 16) { var a = r1(Math.round(hrs * 0.6 * 2) / 2); put(person, w, code, ph[(w + j) % ph.length], a); put(person, w, code, ph[(w + j + 1) % ph.length], r1(hrs - a)); }
        else put(person, w, code, ph[(w + j) % ph.length], hrs);
      });
    }
    var exec43 = ['Brainer Ocampo', 'Federman Tapia', 'Natalie Ramírez', 'Kenya Sánchez', 'Juan Menco', 'Víctor Rivera', 'Nataly Méndez', 'Laura Posso', 'Brayan Castro', 'Santiago Tobar'];
    ctx.persons.forEach(function (p) {
      if (!p.active && p.name !== 'Cristian Mejía') return;
      accept(p.name, 41); accept(p.name, 42);
      if (exec43.indexOf(p.name) >= 0) accept(p.name, 43);
    });
    function first(person, w, code) { return recs.filter(function (x) { return x.person === person && x.week === w && x.code === code; })[0]; }
    function bump(person, w, code, h) { var r = first(person, w, code); if (r) r.hours = r1(r.hours + h); else put(person, w, code, activePhases(ctx.byCode[code], 2026, w)[0], h); }
    bump('Víctor Rivera', 42, '30027700000', 4);
    bump('Kenya Sánchez', 42, '30029800000', 3);
    bump('Brainer Ocampo', 42, '30027700000', 2);
    bump('Federman Tapia', 41, '30202004200', 5);
    bump('Laura Posso', 42, '30301053200', 3);
    bump('Natalie Ramírez', 43, '30009400000', 2.5);
    var sg = first('Simón Giraldo', 42, '30301053200'); if (sg) sg.hours = r1(sg.hours - DAYH);
    var extras = [
      { id: 'x1', year: 2026, week: 42, person: 'Víctor Rivera', status: 'sent', excessAtSend: 4, sentAt: '2026-10-19T07:40:00', rows: [
        { code: '30027700000', day: 3, type: 'HED', hours: 2.5, status: 'pending', approver: 'Brainer Ocampo' },
        { code: '30027700000', day: 5, type: 'HED', hours: 1.5, status: 'pending', approver: 'Brainer Ocampo' }] },
      { id: 'x2', year: 2026, week: 42, person: 'Kenya Sánchez', status: 'sent', excessAtSend: 3, sentAt: '2026-10-19T08:15:00', rows: [
        { code: '30029800000', day: 2, type: 'HEN', hours: 3, status: 'pending', approver: 'Jhon Herrera' }] },
      { id: 'x3', year: 2026, week: 42, person: 'Brainer Ocampo', status: 'sent', excessAtSend: 2, sentAt: '2026-10-20T17:05:00', rows: [
        { code: '30027700000', day: 6, type: 'HEDDF', hours: 2, status: 'pending', approver: 'Planeación' }] },
      { id: 'x4', year: 2026, week: 41, person: 'Federman Tapia', status: 'sent', excessAtSend: 5, sentAt: '2026-10-12T09:00:00', rows: [
        { code: '30202004200', day: 4, type: 'HED', hours: 3, status: 'approved', approver: 'Ernesto Osorio', reviewedBy: 'Ernesto Osorio', reviewedAt: '2026-10-13' },
        { code: '30202004200', day: 5, type: 'HED', hours: 2, status: 'approved', approver: 'Ernesto Osorio', reviewedBy: 'Ernesto Osorio', reviewedAt: '2026-10-13' }] }
    ];
    var locks = [{ id: 'l1', year: 2026, start: 1, end: 41, active: true, reason: 'Cierre de nómina', by: 'Mireya Uribe', at: '2026-10-13' }];
    return { v: 1, records: recs, extras: extras, locks: locks, drafts: {}, seq: 100, log: [] };
  }
  function load(ctx) { var s = readLS(LS); if (s && s.v === 1 && s.records) { s.drafts = s.drafts || {}; s.log = s.log || []; return s; } return seed(ctx || context()); }
  function save(db) { try { localStorage.setItem(LS, JSON.stringify(db)); return true; } catch (e) { return false; } }

  /* ---------- Derivados ---------- */
  function total(db, person, y, w) { return r1(db.records.filter(function (r) { return r.person === person && r.year === y && r.week === w; }).reduce(function (s, r) { return s + num(r.hours); }, 0)); }
  function excess(db, person, y, w) { return Math.max(0, r1(total(db, person, y, w) - capacity(y, w))); }
  function xEntry(db, person, y, w) { return db.extras.filter(function (x) { return x.person === person && x.year === y && x.week === w; })[0]; }
  function xSum(e) { return r1(e.rows.reduce(function (s, r) { return s + num(r.hours); }, 0)); }
  function weeksLeft(y, w) { return y === CUR.year ? w + WINDOW - CUR.week : -1; }
  function xState(db, person, y, w) {
    var ex = excess(db, person, y, w); if (ex <= 0) return null;
    var e = xEntry(db, person, y, w), st;
    if (!e || e.status !== 'sent') st = 'todo';
    else if (Math.abs((e.excessAtSend || xSum(e)) - ex) > 0.001 || xSum(e) > ex + 0.001) st = 'stale';
    else if (e.rows.some(function (r) { return r.status === 'returned'; })) st = 'returned';
    else return e.rows.every(function (r) { return r.status === 'approved'; }) ? 'approved' : 'pending';
    return weeksLeft(y, w) < 0 ? 'expired' : st;
  }
  /* Avisos para el Ecosistema: por aprobar (con aprobador) y por distribuir (por persona) */
  function avisos(db) {
    var pend = [], todo = [];
    db.extras.forEach(function (e) {
      if (e.status !== 'sent') return;
      var st = xState(db, e.person, e.year, e.week); if (st !== 'pending') return;
      e.rows.forEach(function (r, i) { if (r.status === 'pending') pend.push({ id: e.id, i: i, person: e.person, year: e.year, week: e.week, code: r.code, hours: r.hours, approver: r.approver }); });
    });
    var seen = {};
    db.records.forEach(function (r) {
      var k = r.person + '|' + r.year + '|' + r.week; if (seen[k]) return; seen[k] = 1;
      var st = xState(db, r.person, r.year, r.week);
      if (st === 'todo' || st === 'stale' || st === 'returned') todo.push({ person: r.person, year: r.year, week: r.week, excess: excess(db, r.person, r.year, r.week), state: st });
    });
    return { pend: pend, todo: todo };
  }

  /* Color por cliente [ACORDADO 30-oct]: un color por cliente; Omnicon (internos y ausencias) siempre azul oscuro */
  var CPAL = ['#BFD3FF', '#A8EEF7', '#D7C9FF', '#BFEBD2', '#FFD6B0', '#E3D9CC', '#F8C6DE', '#C9F0E9', '#F1E3A6', '#C7CCFF', '#D6EDB6', '#E9D4F5', '#FFE08A', '#B9E3FF', '#F5CFC2', '#D3E4C5'];
  function clientColor(c) {
    var id = RCLIENTS[c] ? c : Object.keys(RCLIENTS).filter(function (k) { return RCLIENTS[k] === c; })[0];
    if (!id || id === 'cli-00') return { bg: '#002473', ink: '#ffffff' };
    var ids = Object.keys(RCLIENTS).filter(function (k) { return k !== 'cli-00'; }).sort();
    return { bg: CPAL[ids.indexOf(id) % CPAL.length], ink: '' };
  }
  window.KX = {
    LS: LS, TODAY: TODAY, NF: NF, NF_MOTIVOS: NF_MOTIVOS, CUR: CUR, DAYH: DAYH, BASE: BASE, WINDOW: WINDOW,
    parse: parse, iso: iso, add: add, dow: dow, holiday: holiday, weekStart: weekStart, weekDays: weekDays, workdays: workdays, isoWeek: isoWeek, capacity: capacity, r1: r1, num: num,
    context: context, seed: seed, load: load, save: save,
    clientColor: clientColor,
    total: total, excess: excess, xEntry: xEntry, xSum: xSum, xState: xState, weeksLeft: weeksLeft, avisos: avisos
  };
})();
