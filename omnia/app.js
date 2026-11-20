/* omnIA dentro del ecosistema de Kairos. Basado en el prototipo omnIA v5; el ecosistema es el host.
   El host expone window.KAIROS_HOST (show, closeNav, isNavOpen, toast) y llama a window.Omnia (start, stop, setModule, relayout). */
(function () {
  'use strict';
  var D = window.OMNIA_DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ic = function (n, c) { return '<svg class="ic ' + (c || '') + '" aria-hidden="true"><use href="#i-' + n + '"></use></svg>'; };
  var money = function (n) { return 'COP ' + Math.round(n).toLocaleString('es-CO'); };
  var MARK = '<span class="mini-orb" aria-hidden="true"></span>';
  var fabOrb = null, headOrb = null;
  var SIM = '<span class="sim" title="En producción este dato viene de Odoo. Aquí es simulado.">Odoo · simulado</span>';
  var PROFILES = D.profiles.map(function (p) { return p.id; });
  var RATES = D.priceList.rates;
  var COMP_NAMES = {}; D.quoteTemplate.components.forEach(function (c) { COMP_NAMES[c.key] = c.name; });

  var clock = D.now.hour * 60 + D.now.minute;
  function now() { var h = Math.floor(clock / 60), m = clock % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
  function tick() { clock += 1; return now(); }
  var seq = 0;
  function uid(p) { seq += 1; return p + seq; }

  var S = null, HOST_USER = null, ACTIVE = false;
  var H = function () { return window.KAIROS_HOST || {}; };
  function freshState(roleKey) {
    return {
      role: roleKey || 'comercial', denied: false, online: true, limit: false, module: 'inicio', selQuote: 'COT-2026-0142', selProject: 'PRJ-0031',
      panelOpen: true, hidden: loadHidden(), view: 'chat', threads: seedThreads(), activeId: null, generating: false, gen: null,
      atts: [], unread: 0, quotes: {}, alertsUnseen: 1, critUnseen: false, toast: false, demoOpen: false, q: '',
      explanations: {}, explainOpen: null, explainDraft: '', explainCausas: [], explainErr: '', alertFilter: 'todas', rejectOpen: false, rejectDraft: '', sent: 0, forceBottom: false
    };
  }
  function loadHidden() { try { return localStorage.getItem('omnia.hidden') === '1'; } catch (e) { return false; } }
  function setHidden(v) {
    S.hidden = v;
    try { localStorage.setItem('omnia.hidden', v ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
  }
  function seedThreads() {
    return D.history.map(function (h, i) {
      return { id: h.id, ctx: h.ctx, title: h.title, updated: h.updated, atts: [], flow: null, ts: -100 + i,
        messages: h.messages.map(function (m) { return msg(m.who, { text: m.text, origin: m.origin }); }) };
    });
  }
  function msg(who, o) { var m = { id: uid('m'), who: who, text: '', blocks: [], fb: null, atts: [] }; for (var k in o) m[k] = o[k]; return m; }
  function eventMsg(html) { return msg('event', { html: html, trace: now() }); }

  /* ---------- Context & threads ---------- */
  /* Capacidades por rol del ecosistema. En produccion las valida el backend (contrato §8 y §2). */
  /* pm fue absorbido por lider: liderProyectos es atributo de la persona, no cambia sus capacidades de chat
     (Maestro §9.1, [ACORDADO 27-oct]). aprobador fue absorbido por direccion. */
  var CAPS = {
    direccion:  { chat: true,  canQuote: false, canApprove: true,  canReserve: false, canExplainAlerts: true },
    sd:         { chat: true,  canQuote: true,  canApprove: false, canReserve: false, canExplainAlerts: false },
    planeacion: { chat: true,  canQuote: false, canApprove: false, canReserve: true,  canExplainAlerts: false },
    lider:      { chat: true,  canQuote: true,  canApprove: false, canReserve: true,  canExplainAlerts: true },
    ejecutor:   { chat: false, canQuote: false, canApprove: false, canReserve: false, canExplainAlerts: false },
    admin:      { chat: false, canQuote: false, canApprove: false, canReserve: false, canExplainAlerts: false }
  };
  function role() {
    var u = HOST_USER || { role: 'sd', name: 'Usuario', title: '' }, c = CAPS[u.role] || CAPS.ejecutor;
    /* Capacidades por persona del ecosistema (Maestro 13, puntos 1-3): Administrar puede asignar Cotizar o Chat a otras
       personas. La tabla CAPS solo es respaldo si omnIA corre sin el shell. En produccion las valida el servidor. */
    var sh = window.KAIROS_SHELL, k = sh && sh.id === u.id && sh.caps ? sh.caps : null;
    if (k) c = { chat: k.indexOf('chat') >= 0, canQuote: k.indexOf('cotizar') >= 0, canApprove: k.indexOf('aprobar') >= 0, canReserve: k.indexOf('reservar') >= 0, canExplainAlerts: c.canExplainAlerts };
    if (S && S.denied) c = CAPS.admin;
    return { key: u.role, label: u.title, user: u.name, chat: c.chat, canQuote: c.canQuote, canApprove: c.canApprove, canReserve: c.canReserve, canExplainAlerts: c.canExplainAlerts };
  }
  /* Nombre legible del modulo y, cuando aplica, del registro abierto: lo usa el saludo para ubicarse (Maestro §13.7). */
  function moduleLabel() {
    var m = D.modules[S.module]; if (!m) return '';
    if (S.module === 'cotizaciones') return 'Cotizaciones · ' + S.selQuote;
    if (S.module === 'proyectos') return 'Proyectos · ' + S.selProject;
    if (S.module === 'reservas') return 'Reservas · ' + (ctxInfo(m.ctx) || {}).short;
    return m.label;
  }
  function moduleCtx() {
    if (S.recCtx && Object.prototype.hasOwnProperty.call(S.recCtx, S.module)) return S.recCtx[S.module];
    if (NO_AI[S.module]) return null;
    if (S.module === 'cotizaciones') return 'quote:' + S.selQuote;
    if (S.module === 'proyectos') return 'project:' + S.selProject;
    var m = D.modules[S.module];
    return m ? m.ctx : null;
  }
  /* Saludo por nombre: solo al abrir un hilo vacio y la primera vez del dia (Maestro §13.7, decision 6 del 27-oct). */
  function greetedToday() { try { return localStorage.getItem('omnia.greeted') === todayKey(); } catch (e) { return false; } }
  function markGreeted() { try { localStorage.setItem('omnia.greeted', todayKey()); } catch (e) {} }
  function todayKey() { return D.now.date; /* la demo no avanza fecha real; en produccion es la fecha del servidor */ }
  function ctxInfo(c) { return c ? D.contexts[c] : null; }
  function thread() { for (var i = 0; i < S.threads.length; i++) if (S.threads[i].id === S.activeId) return S.threads[i]; return null; }
  function newThread(ctx) {
    var t = { id: uid('TH-2'), ctx: ctx, title: 'Nueva conversación', updated: now(), atts: [], flow: null, messages: [], ts: seq };
    S.threads.push(t); S.activeId = t.id; return t;
  }
  /* Decisión 1(b): un hilo por contexto. Al cambiar de registro se abre el hilo más reciente de ese registro, o uno vacío. */
  function ensureThread() {
    var c = moduleCtx(), cur = thread();
    if (cur && cur.ctx === c && (c || cur.ts > 0)) return;
    var cands = S.threads.filter(function (t) { return t.ctx === c && t.messages.length && (c || t.ts > 0); })
      .sort(function (a, b) { return b.ts - a.ts; });
    if (cands.length) S.activeId = cands[0].id;
    else {
      var empty = S.threads.filter(function (t) { return t.ctx === c && !t.messages.length; })[0];
      if (empty) S.activeId = empty.id; else newThread(c);
    }
  }
  function setMod(mod, sel) {
    S.module = D.modules[mod] ? mod : 'inicio';
    if (mod === 'cotizaciones' && sel) S.selQuote = sel;
    if (mod === 'proyectos' && sel) S.selProject = sel;
    S.rejectOpen = false;
    ensureThread();
  }
  /* Navegacion pedida por omnIA: el ecosistema muestra el modulo sin volver a avisar a omnIA. */
  function go(mod, sel) {
    setMod(mod, sel);
    if (H().show) H().show(mod);
    if (mod === 'cotizaciones' && sel && S.quotes[sel] && H().toast) H().toast(sel + ' es de la demo de omnIA: el módulo Cotizaciones no la muestra. Aprueba o rechaza desde Demo omnIA.');
    render();
  }
  function closeOnMobile() { if (window.innerWidth < 768) S.panelOpen = false; }

  /* ---------- Quote model ---------- */
  function defaultComps() { return { alcance: { on: true, mod: 'alcance' }, horas: { on: true, mod: 'horas' }, suministro: { on: true, mod: 'suministro' } }; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function createQuote(t) {
    var f = t.flow.form, n = 148 + Object.keys(S.quotes).length, id = 'COT-2026-0' + n, T = D.quoteTemplate;
    var cl = D.clients.filter(function (c) { return c.id === f.client; })[0];
    var q = { id: id, rev: 0, client: cl.name, contact: cl.contact, plant: f.plant, unit: f.unit, comps: clone(f.comps), scope: f.scope,
      phases: clone(T.phases), block: clone(T.hoursBlock), supply: clone(T.supply), status: 'draft', dirty: false, changed: {}, open: { 0: true },
      confirmOpen: false, trace: [], threadId: t.id, owner: role().user, extract: f.extract.filter(function (x) { return x.on; }).map(function (x) { return x.text; }) };
    q.saved = false;
    q.trace.push('omnIA propuso un borrador sin guardar para ' + role().user + ' · ' + tick());
    S.quotes[id] = q;
    if (!D.contexts['quote:' + id]) D.contexts['quote:' + id] = { kind: 'quote', id: id, label: 'Cotización ' + id + ' · ' + q.client, short: id, group: 'Cotizaciones' };
    t.flow.quoteId = id; t.flow.stage = 'draft';
    return q;
  }
  function calc(q) {
    var byP = {}, acts = {}, phs = [], missing = [], svc = 0, hrs = 0;
    PROFILES.forEach(function (p) { byP[p] = 0; });
    if (q.comps.alcance.on) q.phases.forEach(function (ph, pi) {
      var ph_h = 0, ph_v = 0;
      ph.activities.forEach(function (a, ai) {
        var h = 0, v = 0;
        for (var p in a.hours) { var x = +a.hours[p] || 0; h += x; v += x * RATES[p]; byP[p] += x; }
        ph_h += h; ph_v += v; acts[pi + '-' + ai] = { h: h, v: v };
        if (!h) missing.push('«' + a.name + '» sin horas');
      });
      phs[pi] = { h: ph_h, v: ph_v }; hrs += ph_h; svc += ph_v;
    });
    var blk = { h: 0, v: 0 };
    if (q.comps.horas.on) {
      blk.h = +q.block.hours || 0; blk.v = blk.h * RATES[q.block.profile]; byP[q.block.profile] += blk.h; hrs += blk.h; svc += blk.v;
      if (!blk.h) missing.push('Soporte post-arranque sin horas');
    }
    var sup = 0;
    if (q.comps.suministro.on) { if (q.supply.value == null) missing.push('Licencias MES sin valor de suministro'); else sup = q.supply.value; }
    return { byP: byP, acts: acts, phs: phs, blk: blk, sup: sup, svc: svc, hrs: hrs, total: svc + sup, missing: missing };
  }
  function editable(q) { return (q.status === 'draft' || q.status === 'rejected') && role().canQuote; }
  function ref(q) { return q.saved ? q.id : 'Propuesta sin número'; }
  /* Decisión 23 oct: la propuesta solo existe en Kairos cuando se guarda. Al primer guardado recibe número y el hilo se vincula. */
  function saveQuote(q) {
    var first = !q.saved;
    q.dirty = false; q.changed = {}; q.saved = true;
    q.trace.push(role().user + (first ? ' guardó y creó ' + q.id : ' guardó el borrador') + ' Rev. ' + q.rev + ' · ' + tick());
    if (first) {
      var t = S.threads.filter(function (x) { return x.id === q.threadId; })[0];
      if (t) {
        t.ctx = 'quote:' + q.id; t.title = 'MES · ' + q.client;
        t.messages.push(eventMsg('Cotización <b>' + q.id + '</b> creada en Kairos. Esta conversación quedó vinculada a ella.'));
      }
    }
  }
  function sendQuote(q, t) {
    q.status = 'pending'; q.rev += 1; q.confirmOpen = false; q.sentBy = role().user; q.sentAt = tick();
    q.trace.push(q.sentBy + ' envió Rev. ' + q.rev + ' a aprobación · ' + q.sentAt);
    t.messages.push(msg('bot', { origin: 'Estimador', text: 'Listo. ' + q.id + ' quedó pendiente de aprobación. Yo no apruebo: debe hacerlo en el módulo Cotizaciones alguien con permiso de aprobación.', blocks: [{ type: 'approval', id: q.id }] }));
    t.updated = now();
  }
  function decide(q, decision, by, reason, viaDemo) {
    q.status = decision; q.decidedBy = by; q.decidedAt = tick(); q.reason = reason || '';
    q.trace.push(by + (decision === 'approved' ? ' aprobó' : ' rechazó') + ' Rev. ' + q.rev + ' en Cotizaciones · ' + q.decidedAt + (viaDemo ? ' (simulado)' : ''));
    var t = S.threads.filter(function (x) { return x.id === q.threadId; })[0];
    if (t) {
      t.messages.push(eventMsg('<b>' + q.id + ' · Rev. ' + q.rev + '</b> ' + (decision === 'approved' ? 'fue aprobada' : 'fue rechazada') + ' por ' + esc(by) + ' en Cotizaciones.' + (reason ? ' Motivo: ' + esc(reason) : '')));
      t.updated = now(); bumpUnread(t);
    }
  }

  /* ---------- Generation engine (simulated) ---------- */
  function bumpUnread(t) { if (!S.panelOpen || S.view !== 'chat' || S.activeId !== t.id) S.unread += 1; }
  function respond(t, spec) {
    S.generating = true;
    var typing = msg('typing', {});
    t.messages.push(typing); S.forceBottom = true; render();
    var g = S.gen = { t: t, typing: typing, m: null, spec: spec, timer: null };
    g.timer = setTimeout(function () {
      var i = t.messages.indexOf(typing); if (i > -1) t.messages.splice(i, 1);
      var m = msg('bot', { origin: spec.origin, text: spec.text, spec: spec, words: spec.text.split(/(\s+)/), shown: 0, streaming: true });
      t.messages.push(m); g.m = m; S.forceBottom = true; render();
      g.timer = setInterval(function () {
        m.shown += 4;
        if (m.shown >= m.words.length) { clearInterval(g.timer); finish(t, m, spec); }
        else updateStream(m);
      }, 40);
    }, 650);
  }
  function finish(t, m, spec) {
    m.streaming = false; m.blocks = spec.blocks || [];
    S.generating = false; S.gen = null;
    if (spec.after) spec.after(m);
    t.updated = now(); bumpUnread(t); S.forceBottom = true; render();
  }
  function stopGen(reason) {
    var g = S.gen; if (!g) return;
    clearTimeout(g.timer); clearInterval(g.timer);
    var t = g.t;
    if (g.m) { g.m.streaming = false; g.m.text = g.m.words.slice(0, g.m.shown).join(''); g.m.incomplete = reason || 'stopped'; }
    else {
      var i = t.messages.indexOf(g.typing); if (i > -1) t.messages.splice(i, 1);
      t.messages.push(msg('bot', { origin: g.spec.origin, text: '', spec: g.spec, incomplete: reason || 'stopped' }));
    }
    S.generating = false; S.gen = null; render();
  }
  function updateStream(m) {
    var el = $('[data-mid="' + m.id + '"] .text'); if (!el) return;
    el.innerHTML = paras(m.words.slice(0, m.shown).join('')) .replace(/<\/p>$/, '<span class="caret"></span></p>');
    var b = $('#pBody'); b.scrollTop = b.scrollHeight;
  }
  function paras(s) { return s.split(/\n\n+/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''); }

  /* ---------- Intents ---------- */
  var CAP_TEXT = 'Te ayudo sobre el registro que tengas abierto, con botones dentro de cada módulo:\n\n' + 'Cotizaciones: leer el pliego del cliente, sugerir horas con el histórico, revisar antes de enviar y resumir para quien aprueba.\n\nProyectos, Bitácoras, Informes y Control de cambios: resumir la bitácora, redactar el Status Report o el informe desde las bitácoras y decir si una solicitud de cambio parece estar en lo vendido.\n\nForecast y Backlog: explicar la variación del mes cerrado y preparar la conversación con cada líder en el cierre.\n\nAnalítica: responder preguntas sobre la cartera (riesgo, avance sin actualizar, utilidad por unidad).\n\nEn Reservas, Ejecución, Horas extra y Configuración no uso IA: te aviso por la campana. No armo cotizaciones, no apruebo ni cambio cifras.';
  var SUG_QUOTE = 'Cotiza un MES para la planta de Kenvue Colombia';
  function PROP_TEXT(unit) { return 'Armé una propuesta con la plantilla de MES de ' + unit + '. Aún no existe en Kairos: se crea cuando la guardes. Puedes ajustar horas aquí mismo. Los valores salen de la lista de precios simulada.'; }
  function handle(t, txt, atts) {
    var low = txt.toLowerCase(), r = role();
    /* El modulo abierto responde primero sobre su registro (IA simulada). Las cotizaciones se arman en el wizard, no en el panel [ACORDADO 17-nov]. */
    var ask = MOD_ASK[S.module], hit = null;
    if (ask) { try { hit = ask(low); } catch (e) { hit = null; } }
    if (hit) return respond(t, assistSpec(hit));
    var q = t.flow && t.flow.quoteId ? S.quotes[t.flow.quoteId] : null;
    if (q) {
      if (/guard/.test(low)) {
        if ((q.dirty || !q.saved) && editable(q)) { saveQuote(q); return respond(t, { origin: 'Estimador', text: 'Guardé ' + q.id + ' Rev. ' + q.rev + '.' }); }
        return respond(t, { origin: 'Estimador', text: 'No hay cambios por guardar en ' + ref(q) + '.' });
      }
      if (/falta|revis/.test(low)) {
        var c = calc(q);
        return respond(t, { origin: 'Estimador', text: c.missing.length ? 'A ' + ref(q) + ' le falta: ' + c.missing.join('; ') + '.' : ref(q) + ' no tiene faltantes.' + (q.saved ? ' Puedes enviarla a aprobación.' : ' Guárdala para crearla en Kairos.') });
      }
      if (/aprob|env[ií]a/.test(low)) {
        if (editable(q)) { q.confirmOpen = true; return respond(t, { origin: 'Estimador', text: 'Para enviarla a aprobación confirma en la tarjeta del borrador. Revisa el total antes de confirmar.' }); }
        return respond(t, { origin: 'Estimador', text: q.status === 'pending' ? q.id + ' ya está pendiente. La aprobación se hace en el módulo Cotizaciones.' : q.id + ' ya fue decidida. Revisa la tarjeta de aprobación.' });
      }
    }
    if (/cotiz/.test(low)) return respond(t, { text: S.module === 'cotizaciones' ? (moduleCtx() ? 'Sobre esta cotización puedo revisar si le falta algo o resumirla para quien aprueba. Para armarla o cambiar valores, usa los pasos del wizard.' : 'Abre una cotización y la reviso contigo. Para crear una, usa «Nueva cotización»: se arma en el wizard, paso a paso.') : 'Las cotizaciones se arman en el módulo Cotizaciones, con el wizard paso a paso. Ahí te ayudo a revisarlas antes de enviar y a resumirlas para quien aprueba.', blocks: S.module === 'cotizaciones' ? [] : [{ type: 'nav', label: 'Ir a Cotizaciones', mod: 'cotizaciones' }] });
    if (t.flow && t.flow.stage === 'collect' && !t.flow.form.confirmed)
      return respond(t, { origin: 'Estimador', text: 'Completa los datos de la tarjeta de arriba y confirma. Con eso armo el borrador.' });
    if (/falta|revis/.test(low) && t.ctx === 'quote:COT-2026-0142')
      return respond(t, { origin: 'Estimador', text: 'COT-2026-0142 ya está aprobada (Rev. 2). La fase «Puesta en marcha» no tiene horas de E5; tenlo en cuenta en la próxima revisión.' });
    if (/qu[eé] puedes|ayuda|qu[eé] haces/.test(low))
      return respond(t, { text: CAP_TEXT, blocks: [{ type: 'nav', label: 'Ir a Cotizaciones', mod: 'cotizaciones' }] });
    if (atts.length && !txt)
      return respond(t, { text: 'Recibí el adjunto. Si quieres cotizar con él, dime qué cotizamos y lo uso para completar los datos.' });
    return respond(t, { text: (NO_AI[S.module] ? 'En este módulo no uso IA: es de registro y reglas. Los avisos te llegan por la campana.' : 'Usa los botones de omnIA de esta pantalla o las sugerencias de abajo: trabajo sobre el registro que tengas abierto.'), blocks: [{ type: 'nav', label: 'Ir a Cotizaciones', mod: 'cotizaciones' }] });
  }
  function startQuote(t, txt) {
    var low = txt.toLowerCase();
    var cl = D.clients.filter(function (c) { return low.indexOf(c.name.toLowerCase()) > -1 || (c.id === 'CLI-9001' && /demo norte/.test(low)) || (c.id === 'CLI-9002' && /demo sur/.test(low)); })[0];
    var unit = /\bmes\b|manufactur|trazab|oee/.test(low) ? 'Smart Manufacturing' : /plc|automat/.test(low) ? 'Automation' : '';
    var plant = '';
    if (cl) { cl.plants.forEach(function (p) { if (low.indexOf(p.replace('Planta Demo ', '').toLowerCase()) > -1) plant = p; }); if (!plant && cl.plants.length === 1) plant = cl.plants[0]; }
    var ext = [];
    t.atts.forEach(function (a) { (D.extraction[a.kind === 'image' ? 'image' : 'file'] || []).forEach(function (x) { ext.push({ text: x, src: a.name, on: true }); }); });
    t.flow = { stage: 'collect', form: { client: cl ? cl.id : '', plant: plant, unit: unit, unitInferred: !!unit, comps: defaultComps(), scope: txt, extract: ext, confirmed: false } };
    var miss = collectMissing(t.flow.form);
    var text = 'Entendí: cotización de ' + (unit === 'Smart Manufacturing' ? 'un MES' : 'un servicio') + (cl ? ' para ' + cl.name : '') + '. Completé lo que pude inferir' + (ext.length ? ' y lo que leí del adjunto' : '') + '.' + (miss.length ? ' Me falta: ' + miss.join(', ') + '.' : ' Revisa y confirma.');
    respond(t, { origin: 'Estimador', text: text, blocks: [{ type: 'collect' }] });
  }
  function collectMissing(f) {
    var m = [];
    if (!f.client) m.push('cliente'); if (!f.plant) m.push('planta'); if (!f.unit) m.push('unidad de negocio');
    if (!f.comps.alcance.on && !f.comps.horas.on && !f.comps.suministro.on) m.push('al menos un componente');
    if (!f.scope.trim()) m.push('alcance general');
    return m;
  }
  function confirmCollect(t) {
    var f = t.flow.form; if (collectMissing(f).length) return;
    f.confirmed = true;
    t.messages.push(eventMsg('Datos confirmados por <b>' + esc(role().user) + '</b>'));
    respond(t, { origin: 'Estimador', text: PROP_TEXT(f.unit),
      after: function (m) { var q = createQuote(t); m.blocks = [{ type: 'quote', id: q.id }]; } });
  }

  /* ---------- Rendering ---------- */
  function render() { if (!S) return; renderTop(); renderPanel(); renderToast(); renderDemo(); }

  function renderTop() {
    var r = role();
    var btn = $('#omniaBtn'), t = thread();
    btn.setAttribute('aria-expanded', String(S.panelOpen));
    var count = S.panelOpen ? 0 : S.unread + (S.critUnseen ? 1 : 0);
    var active = !S.panelOpen && ((t && t.messages.length) || S.generating);
    $('#omniaInd').innerHTML = count ? '<span class="count" aria-label="' + count + ' novedades">' + count + '</span>' : active ? '<span class="dot" title="Conversación activa"></span>' : '';
    btn.setAttribute('aria-label', 'Abrir omnIA' + (count ? ', ' + count + ' novedades' : active ? ', conversación activa' : ''));
    btn.dataset.state = orbState(count);
    var none = ACTIVE && nothingToShow();
    if (none && S.panelOpen) S.panelOpen = false;
    btn.hidden = S.hidden || !ACTIVE || none;
    if (fabOrb) { fabOrb.setState(btn.dataset.state); fabOrb.setVisible(ACTIVE && !S.panelOpen && !S.hidden && !none); }
    var so = $('#sideOmnia');
    so.hidden = none;
    so.classList.toggle('off', S.hidden);
    so.setAttribute('aria-pressed', String(S.panelOpen));
    $('#sideOmniaSt').textContent = S.hidden ? 'Oculto · clic para mostrar' : S.panelOpen ? 'Abierto' : 'Visible';
    so.dataset.tip = S.hidden ? 'Mostrar omnIA' : 'omnIA';
    so.setAttribute('aria-label', (S.hidden ? 'Mostrar omnIA' : 'Abrir omnIA') + (count ? ', ' + count + ' novedades' : ''));
    $('#sideOmniaDot').hidden = !count;
    if (headOrb) headOrb.setVisible(ACTIVE && S.panelOpen);
  }

  function orbState(count) {
    if (!S.online) return 'offline';
    if (S.generating) return 'thinking';
    if (count) return 'alert';
    var i = $('#input');
    if (i && document.activeElement === i && i.value.trim()) return 'listening';
    return 'idle';
  }
  function syncPanelOrb() { var h = $('#pHead'); if (h) h.dataset.state = orbState(0); if (headOrb) headOrb.setState(orbState(0)); }

  /* Mock module screens */
  function allQuotes() {
    var list = D.existingQuotes.map(function (x) { return { id: x.id, client: x.client, unit: x.unit, status: x.status, rev: x.rev, total: x.total, ex: x }; });
    Object.keys(S.quotes).forEach(function (k) { var q = S.quotes[k]; if (q.saved) list.unshift({ id: q.id, client: q.client, unit: q.unit, status: q.status, rev: q.rev, total: calc(q).total, q: q }); });
    return list;
  }
  function statusPill(st, rev) {
    return { draft: '<span class="pill draft">Borrador</span>', pending: '<span class="pill pending">' + ic('lock', 'sm') + 'Pendiente de aprobación</span>',
      approved: '<span class="pill approved">' + ic('check', 'sm') + 'Aprobada · Rev. ' + rev + '</span>', rejected: '<span class="pill rejected">Rechazada · Rev. ' + rev + '</span>' }[st];
  }
  function renderMain() {
    var h = '', r = role(), first = r.user.split(' ')[0];
    if (S.module === 'inicio') {
      h = '<div class="mod-head"><div class="crumb">Kairos / Inicio</div><h1>Buenos días, ' + esc(first) + '</h1></div><div class="grid">' +
        '<section class="card"><h2>Cotizaciones recientes</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ref.</th><th>Cliente</th><th>Estado</th></tr></thead><tbody>' +
        allQuotes().map(function (x) { return '<tr data-open="' + x.id + '"><td>' + x.id + '</td><td>' + esc(x.client) + '</td><td>' + statusPill(x.status, x.rev) + '</td></tr>'; }).join('') + '</tbody></table></div></section>' +
        '<section class="card"><h2>Proyectos activos</h2><div class="plist"><button data-proj="PRJ-0031"><b>PRJ-0031 · Smart Manufacturing</b><small>Kenvue Colombia</small></button><button data-proj="PRJ-0027"><b>PRJ-0027 · Automation</b><small>Team Foods Colombia</small></button></div></section>' +
        '<section class="card"><h2>omnIA</h2><p class="note">Asistente interno de Kairos. Usa el registro que tengas abierto como contexto. En Inicio no hay registro abierto, así que las conversaciones son libres.</p><div class="row"><button class="btn soft" data-mact="open-omnia">' + MARK + 'Abrir omnIA</button></div></section></div>';
    } else if (S.module === 'cotizaciones') {
      var list = allQuotes(), sel = list.filter(function (x) { return x.id === S.selQuote; })[0] || list[0];
      h = '<div class="mod-head"><div class="crumb">Kairos / Cotizaciones</div><h1>Cotizaciones</h1></div><div class="grid stack">' +
        '<section class="card"><h2>Listado</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ref.</th><th>Cliente</th><th>Unidad</th><th>Estado</th><th class="num">Total</th></tr></thead><tbody>' +
        list.map(function (x) { return '<tr data-open="' + x.id + '" class="' + (x.id === sel.id ? 'sel' : '') + '"><td>' + x.id + '</td><td>' + esc(x.client) + '</td><td>' + esc(x.unit) + '</td><td>' + statusPill(x.status, x.rev) + '</td><td class="num">' + money(x.total) + '</td></tr>'; }).join('') +
        '</tbody></table></div></section><section class="card">' + quoteDetail(sel) + '</section></div>';
    } else if (S.module === 'proyectos') {
      var p = S.selProject === 'PRJ-0031'
        ? { id: 'PRJ-0031', unit: 'Smart Manufacturing', client: 'Kenvue Colombia', leader: 'Ernesto Osorio', start: '01 sep 2026', end: '15 dic 2026', cat: 'Proyecto' }
        : { id: 'PRJ-0027', unit: 'Automation', client: 'Team Foods Colombia', leader: 'Ernesto Osorio', start: '04 ago 2026', end: '30 nov 2026', cat: 'Proyecto básico' };
      h = '<div class="mod-head"><div class="crumb">Kairos / Proyectos / ' + p.id + '</div><h1>Proyecto ' + p.unit + '</h1><div class="row"><button class="btn sm ' + (p.id === 'PRJ-0031' ? 'soft' : '') + '" data-proj="PRJ-0031">PRJ-0031</button><button class="btn sm ' + (p.id === 'PRJ-0027' ? 'soft' : '') + '" data-proj="PRJ-0027">PRJ-0027</button></div></div><div class="grid">' +
        '<section class="card"><h2>Ficha</h2><dl class="kv"><dt>Proyecto</dt><dd>' + p.id + '</dd><dt>Cliente</dt><dd>' + p.client + ' ' + SIM + '</dd><dt>Unidad</dt><dd>' + p.unit + '</dd><dt>Líder</dt><dd>' + p.leader + '</dd><dt>Inicio</dt><dd>' + p.start + '</dd><dt>Fin</dt><dd>' + p.end + '</dd><dt>Categoría</dt><dd>' + p.cat + '</dd></dl></section>' +
        '<section class="card"><h2>Hitos</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hito</th><th>Fecha</th><th>Estado</th></tr></thead><tbody><tr><td>Diseño funcional</td><td>30 sep</td><td><span class="pill approved">Cerrado</span></td></tr><tr><td>FAT</td><td>21 oct</td><td><span class="pill rejected">Vencido</span></td></tr><tr><td>SAT</td><td>25 nov</td><td><span class="pill draft">Planeado</span></td></tr></tbody></table></div><p class="note">Los avisos de seguimiento se consultan en omnIA › Avisos.</p></section></div>';
    } else {
      var days = ['Lun 19', 'Mar 20', 'Mié 21', 'Jue 22', 'Vie 23'], ppl = ['Camilo Pérez', 'Ernesto Osorio', 'Técnico Demo 1'];
      var cal = '<div class="cal"><div class="h"></div>' + days.map(function (d) { return '<div class="h">' + d + '</div>'; }).join('') +
        ppl.map(function (n, i) { return '<div class="h">' + n + '</div>' + days.map(function (d, j) { return (i + j) % 3 === 0 ? '<div class="b">PRJ-0031</div>' : (i + j) % 4 === 1 ? '<div class="b">PRJ-0027</div>' : '<div></div>'; }).join(''); }).join('') + '</div>';
      h = '<div class="mod-head"><div class="crumb">Kairos / Reservas</div><h1>Reservas · Semana 43</h1></div><section class="card"><h2>Asignaciones (ficticias)</h2><div class="tbl-wrap">' + cal + '</div></section>';
    }
    $('#main').innerHTML = h;
  }
  function quoteDetail(x) {
    var r = role();
    if (!x.q) {
      var e = x.ex;
      return '<h2>' + e.id + '</h2><dl class="kv"><dt>Cliente</dt><dd>' + esc(e.client) + ' ' + SIM + '</dd><dt>Unidad</dt><dd>' + esc(e.unit) + '</dd><dt>Estado</dt><dd>' + statusPill(e.status, e.rev) + '</dd><dt>Total</dt><dd>' + money(e.total) + '</dd><dt>Decisión</dt><dd>' + esc(e.by) + ' · ' + e.when + '</dd></dl>';
    }
    var q = x.q, c = calc(q), h = '<h2>' + q.id + ' · Rev. ' + q.rev + '</h2><dl class="kv"><dt>Cliente</dt><dd>' + esc(q.client) + ' ' + SIM + '</dd><dt>Planta</dt><dd>' + esc(q.plant) + '</dd><dt>Unidad</dt><dd>' + esc(q.unit) + '</dd><dt>Estado</dt><dd>' + statusPill(q.status, q.rev) + '</dd><dt>Horas</dt><dd>' + c.hrs + ' h</dd><dt>Total</dt><dd>' + money(c.total) + '</dd></dl>';
    h += '<h2 style="margin-top:16px">Aprobación</h2>';
    if (q.status === 'pending') {
      if (r.canApprove) {
        h += '<p class="note">Enviada por ' + esc(q.sentBy) + ' · ' + q.sentAt + '. Al aprobar, la revisión queda cerrada. El envío a Odoo es un paso posterior.</p>';
        if (S.rejectOpen) h += '<div class="reject-box"><label class="field"><span>Motivo del rechazo (obligatorio)</span><textarea id="rejectReason" class="inp" rows="3" data-mf="reject">' + esc(S.rejectDraft) + '</textarea></label><div class="row"><button class="btn danger" data-mact="reject-confirm"' + (S.rejectDraft.trim() ? '' : ' disabled') + '>Confirmar rechazo</button><button class="btn" data-mact="reject-cancel">Cancelar</button></div></div>';
        else h += '<div class="row"><button class="btn approve" data-mact="approve">' + ic('check') + 'Aprobar Rev. ' + q.rev + '</button><button class="btn danger" data-mact="reject">Rechazar</button></div>';
      } else h += '<p class="note">' + ic('lock', 'sm') + ' Pendiente. Solo el rol Aprobador ve los botones para aprobar o rechazar. Cambia de rol en el menú de usuario.</p>';
    } else if (q.status === 'approved') h += '<p class="note">Aprobada por ' + esc(q.decidedBy) + ' · ' + q.decidedAt + '.</p>';
    else if (q.status === 'rejected') h += '<p class="note">Rechazada por ' + esc(q.decidedBy) + ' · ' + q.decidedAt + '. Motivo: ' + esc(q.reason) + '</p>';
    else h += '<p class="note">Borrador. Se envía a aprobación desde la tarjeta del borrador.</p>';
    h += '<h2 style="margin-top:16px">Registro</h2><div class="trace" style="display:grid;gap:4px">' + q.trace.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + '</div>';
    return h;
  }

  /* Panel */
  function renderPanel() {
    var p = $('#panel');
    p.hidden = !(ACTIVE && S.panelOpen);
    if (p.hidden) return;
    renderHead(); renderBody(); renderComposer();
  }
  function statusInfo() {
    var r = role();
    if (!r.chat) return S.online ? { cls: '', txt: 'Avisos' } : { cls: 'offline', txt: 'Sin conexión' };
    if (!S.online) return { cls: 'offline', txt: 'Sin conexión' };
    if (S.generating) return { cls: 'busy', txt: 'Ocupada' };
    return { cls: '', txt: 'En línea' };
  }
  function renderHead() {
    var r = role(), st = statusInfo(), t = thread(), c = t ? t.ctx : moduleCtx(), ci = ctxInfo(c);
    var chip = !r.chat ? ''
      : ci ? '<div class="ctx-chip" title="omnIA usa este registro como contexto"><span class="lbl">Contexto</span><b>' + esc(ci.label) + (ci.step && c === moduleCtx() ? ' · ' + esc(ci.step) : '') + '</b></div>'
      : '<div class="ctx-chip free" title="Sin registro: omnIA no usa datos de ningún registro"><span class="lbl">Contexto</span><b>Conversación libre · sin registro</b></div>';
    $('#pHead').dataset.state = orbState(0);
    $('#pHead').innerHTML = '<span class="grab" aria-hidden="true"></span><div class="p-title"><canvas class="orb-cv sm" id="headOrb" data-size="24" width="48" height="48" aria-hidden="true"></canvas><span class="name" id="pTitle">omnIA</span><span class="status ' + st.cls + '"><i></i>' + st.txt + '</span>' +
      '<div class="p-actions">' +
      (r.chat ? '<button class="icon-btn" data-hact="new" title="Nueva conversación" aria-label="Nueva conversación">' + ic('plus') + '</button>' +
      '<button class="icon-btn" data-hact="history" title="Historial" aria-label="Historial" aria-pressed="' + (S.view === 'history') + '">' + ic('history') + '</button>' +
      '<button class="icon-btn" data-hact="alerts" title="Avisos" aria-label="Avisos' + (S.alertsUnseen ? ', ' + S.alertsUnseen + ' sin ver' : '') + '" aria-pressed="' + (S.view === 'alerts') + '">' + ic('bell') + (S.alertsUnseen ? '<span class="badge">' + S.alertsUnseen + '</span>' : '') + '</button>' : '') +
      '<button class="icon-btn" data-hact="hide" title="Ocultar omnIA (vuelve desde el menú izquierdo)" aria-label="Ocultar omnIA">' + ic('eyeoff') + '</button>' +
      '<button class="icon-btn" data-hact="close" title="Cerrar (Esc)" aria-label="Cerrar omnIA">' + ic('x') + '</button></div></div>' + chip;
    var hc = $('#headOrb');
    if (window.OmniaOrb) { if (headOrb) headOrb.attach(hc); else headOrb = new window.OmniaOrb(hc); headOrb.setState(orbState(0)); headOrb.setVisible(true); }
  }
  function renderBody() {
    var b = $('#pBody'), atBottom = b.scrollHeight - b.scrollTop - b.clientHeight < 60, st = b.scrollTop, r = role(), h;
    if (!r.chat) h = consultaView();
    else if (S.view === 'alerts') h = alertsView();
    else if (S.view === 'history') h = historyView();
    else h = chatView();
    b.innerHTML = h;
    if (S.view === 'chat' && (S.forceBottom || atBottom)) b.scrollTop = b.scrollHeight; else b.scrollTop = st;
    S.forceBottom = false;
  }
  function chatView() {
    var t = thread(), r = role(), h = '';
    if (!S.online) h += '<div class="banner err" role="status">' + ic('wifioff') + '<span>Sin conexión. Puedes leer la conversación; para enviar, espera a que vuelva la conexión.</span><button class="btn sm" data-act="reconnect">Reintentar</button></div>';
    if (S.limit) h += '<div class="banner warn" role="status">' + ic('alert') + '<span>Llegaste al límite de ' + D.limits.dailyMessages + ' mensajes de hoy. Se restablece mañana a las 06:00. Lo ya creado sigue disponible en Cotizaciones.</span></div>';
    if (t && t.ctx && t.ctx !== moduleCtx()) h += '<div class="banner info">' + ic('ext') + '<span>Esta conversación es de ' + esc(ctxInfo(t.ctx).short) + '. Para continuarla, abre ese registro. Las tarjetas siguen activas.</span><button class="btn sm" data-act="open-ctx">Abrir registro</button></div>';
    if (!t || !t.messages.length) {
      var c = moduleCtx(), kind = c ? ctxInfo(c).kind : 'none';
      var sugs = (NO_AI[S.module] ? ['¿Qué puedes hacer?'] : c && MOD_SUGS[S.module] ? MOD_SUGS[S.module].concat(['¿Qué puedes hacer?']) : (D.moduleSuggestions[S.module] || D.suggestions[kind] || D.suggestions.none))
        .filter(function (s) { return r.canQuote || !/cotiz/i.test(s); })
        .filter(function (s) { return r.canReserve || !/libre|ocupaci/i.test(s); })
        .filter(function (s) { return r.canApprove || !/aprobar/i.test(s); });
      var firstGreet = !greetedToday();
      if (firstGreet) markGreeted();
      var greet = firstGreet
        ? 'Hola, ' + esc(r.user.split(' ')[0]) + '. Estás en ' + esc(moduleLabel()) + '. ¿En qué te ayudo?'
        : '¿En qué te ayudo en ' + esc(moduleLabel()) + '?';
      h += '<div class="empty"><div class="hello">' + greet + '</div>' +
        '<div class="sugs">' + sugs.map(function (s) { return '<button class="sug" data-act="sug" data-val="' + esc(s) + '">' + ic('msg', 'sm') + esc(s) + '</button>'; }).join('') + '</div>' +
        (c ? '<p class="note">Esta conversación usa el contexto de ' + esc(ctxInfo(c).short) + '. <button class="btn sm ghost" data-act="free">Empezar sin contexto</button></p>' : '') +
        '<div class="scope">' + (NO_AI[S.module] ? '<div><b>Aquí omnIA no usa IA:</b> este módulo es de registro y reglas. Te avisa por la campana cuando algo requiere atención.</div>' : '<div><b>En cada módulo:</b> botones de omnIA que revisan, explican o resumen el registro abierto. Tú decides qué aplicar.</div>') + '<div><b>No hace:</b> armar cotizaciones, aprobar ni cambiar cifras. Eso se hace en las pantallas del módulo.</div><div>Uso interno de Omnicon. omnIA solo ve lo que tu rol puede ver. <span class="as-sim">IA · simulada</span></div></div></div>';
      return h;
    }
    return h + '<div class="thread" role="log" aria-live="polite" aria-label="Conversación con omnIA">' + t.messages.map(function (m) { return msgHTML(m, t); }).join('') + '</div>';
  }
  function msgHTML(m, t) {
    if (m.who === 'user') {
      return '<div class="msg user" data-mid="' + m.id + '">' + (m.atts && m.atts.length ? '<div class="att-row">' + m.atts.map(function (a) { return '<span class="att-mini">' + (a.url ? '<img src="' + a.url + '" alt="">' : ic('doc', 'sm')) + esc(a.name) + '</span>'; }).join('') + '</div>' : '') +
        (m.text ? '<div class="bubble' + (m.via ? ' via' : '') + '">' + (m.via ? '<span class="mini-orb"></span>' : '') + esc(m.text) + (m.via ? '<small>botón</small>' : '') + '</div>' : '') + '</div>';
    }
    if (m.who === 'event') return '<div class="event">' + ic('check', 'sm') + '<div>' + m.html + '<div class="trace">' + ic('clock', 'sm') + m.trace + '</div></div></div>';
    var who = '<div class="who">' + MARK + '<b>omnIA</b>' + (m.origin ? '<span class="origin" title="Capacidad que generó esta respuesta">' + esc(m.origin) + '</span>' : '') + '</div>';
    if (m.who === 'typing') return '<div class="msg bot">' + who + '<div class="typing" aria-label="omnIA está escribiendo"><i></i><i></i><i></i></div></div>';
    var text = m.streaming ? paras(m.words.slice(0, m.shown).join('')).replace(/<\/p>$/, '<span class="caret"></span></p>') : (m.text ? paras(m.text) : '');
    var h = '<div class="msg bot" data-mid="' + m.id + '">' + who + '<div class="text">' + text + '</div>';
    if (!m.streaming) {
      h += (m.blocks || []).map(function (b) { return blockHTML(b, t, m); }).join('');
      if (m.incomplete) h += '<div class="incomplete">' + ic('alert', 'sm') + '<span>' + (m.incomplete === 'stopped' ? 'Respuesta detenida antes de terminar.' : 'La respuesta quedó incompleta por un corte.') + '</span><button class="btn sm" data-act="retry" data-mid="' + m.id + '">' + ic('retry', 'sm') + 'Reintentar</button></div>';
      else h += fbHTML(m);
    }
    return h + '</div>';
  }
  /* Tarjeta de un boton de IA: hallazgos con su origen (IA o regla) y acciones que decide la persona. La IA es simulada:
     el modulo calcula los hallazgos de regla con sus datos y prepara los de IA; en produccion los devuelve el servicio de omnIA. */
  var ASSIST_CB = {}, MOD_ASK = {}, MOD_SUGS = {};
  /* Donde la IA no agrega valor: registros y reglas. omnIA solo avisa (campana) [ACORDADO 17-nov]. */
  var NO_AI = { reservas: 1, ejecucion: 1, horasextra: 1, configuracion: 1, solicitudes: 1 };
  var AI_MAP = [['Cotizaciones', 'leer el pliego del cliente, sugerir horas con el histórico, revisar antes de enviar y resumir para quien aprueba'], ['Proyectos, Bitácoras e Informes', 'redactar el informe desde las bitácoras y detectar si una solicitud está en lo vendido'], ['Forecast y Backlog', 'explicar la variación del mes y preparar la reunión con cada líder'], ['Analítica', 'responder preguntas sobre la cartera en lenguaje natural']];
  function assistSpec(o) { var id = uid('as'); ASSIST_CB[id] = o.onAction || null; return { origin: o.origin || 'Asistente', text: o.intro || '', blocks: [{ type: 'assist', cbId: id, data: o.card, state: null }] }; }
  function assistCard(b, m) {
    var d = b.data, SY = { w: '!', k: ic('check', 'sm'), n: 'i' };
    var h = '<div class="as-card' + (b.state ? ' done' : '') + '"><div class="as-h"><b>' + esc(d.title) + '</b><span class="as-sim" title="En producción responde el modelo de IA. Aquí es simulado.">IA · simulada</span></div>';
    h += d.findings.map(function (f, i) {
      return '<div class="as-f"><i class="' + (d.numbered ? 'n' : f.k) + '">' + (d.numbered ? i + 1 : SY[f.k]) + '</i><div>' + f.html +
        '<div class="as-m"><span class="as-src ' + (f.src === 'ia' ? 'ia' : 'rg') + '">' + esc(f.srcLabel || (f.src === 'ia' ? 'IA · lee el texto' : 'Regla · cálculo')) + '</span>' +
        (f.link && !b.state ? '<button class="as-lk" data-act="as-go" data-mid="' + m.id + '" data-val="' + esc(f.link.act) + '">' + esc(f.link.label) + ' →</button>' : '') + '</div></div></div>';
    }).join('');
    h += '<div class="as-ft"><span>' + esc(b.state ? b.state : d.foot || '') + '</span>' + (b.state ? '' : '<span class="as-bt">' + (d.buttons || []).map(function (x) { return '<button class="btn sm' + (x.primary ? ' primary' : '') + '" data-act="as-btn" data-mid="' + m.id + '" data-val="' + esc(x.act) + '">' + esc(x.label) + '</button>'; }).join('') + '</span>') + '</div></div>';
    return h;
  }
  function assistAct(mid, act) {
    var t = thread(), m = null; if (t) t.messages.forEach(function (x) { if (x.id === mid) m = x; });
    var b = m && (m.blocks || []).filter(function (x) { return x.type === 'assist'; })[0]; if (!b) return;
    var cb = ASSIST_CB[b.cbId], res = null;
    try { if (cb) res = cb(act); } catch (e) { res = null; }
    if (act === 'dismiss') b.state = 'Descartada'; else if (typeof res === 'string') b.state = res;
    if (/^go:/.test(act)) closeOnMobile();
    render();
  }
  function assist(o) {
    if (!S || !ACTIVE) return false;
    var r = role();
    if (!r.chat) { if (H().toast) H().toast('Los botones de omnIA requieren la capacidad Chat.'); return false; }
    if (S.generating) return false;
    if (S.hidden) setHidden(false);
    S.view = 'chat'; ensureThread();
    var t = thread() || newThread(moduleCtx());
    if (!t.messages.length) t.title = o.action.slice(0, 46);
    t.ts = ++seq; t.updated = now();
    t.messages.push(msg('user', { text: o.action, via: true }));
    S.panelOpen = true; S.unread = 0; S.forceBottom = true;
    respond(t, assistSpec(o));
    return true;
  }
  var REC_KIND = { cotizaciones: 'quote', proyectos: 'project', bitacoras: 'project', statusreport: 'project', cambios: 'project', forecast: 'fc', analisis: 'an' };
  function setRecord(mod, rec) {
    if (!S || !ACTIVE || S.module !== mod || !REC_KIND[mod]) return;
    S.recCtx = S.recCtx || {};
    var before = moduleCtx() + '|' + ((ctxInfo(moduleCtx()) || {}).step || '');
    if (!rec) S.recCtx[mod] = null;
    else {
      var k = REC_KIND[mod], key = k + ':' + rec.id;
      S.recCtx[mod] = key; if (k === 'quote') S.selQuote = rec.id; if (k === 'project') S.selProject = rec.id;
      D.contexts[key] = { kind: k, id: rec.id, label: rec.label, short: rec.short || rec.id, group: D.modules[mod] ? D.modules[mod].label : mod, step: rec.step || '' };
    }
    if (before === moduleCtx() + '|' + ((ctxInfo(moduleCtx()) || {}).step || '')) return;
    if (!S.generating) ensureThread();
    render();
  }
  function fbHTML(m) {
    var h = '<div class="fb"><button class="icon-btn" data-act="fb-up" data-mid="' + m.id + '" aria-label="Respuesta útil" aria-pressed="' + (m.fb === 'up') + '">' + ic('up', 'sm') + '</button>' +
      '<button class="icon-btn" data-act="fb-down" data-mid="' + m.id + '" aria-label="Respuesta no útil" aria-pressed="' + (m.fb === 'down' || m.fb === 'down-open') + '">' + ic('down', 'sm') + '</button>' +
      (m.fb === 'up' ? '<span class="trace">Gracias. Registrado.</span>' : m.fb === 'down' ? '<span class="trace">Comentario registrado' + (m.fbReason ? ': ' + esc(m.fbReason) : '') + '.</span>' : '') + '</div>';
    if (m.fb === 'down-open') {
      h += '<div class="fb-form"><span>¿Qué falló? (opcional)</span><div class="chips">' + ['Dato incorrecto', 'No entendió lo que pedí', 'Muy larga', 'Otro'].map(function (r) {
        return '<button class="chip" data-act="fb-reason" data-mid="' + m.id + '" data-val="' + r + '" aria-pressed="' + (m.fbReason === r) + '">' + r + '</button>'; }).join('') + '</div>' +
        '<textarea class="inp" rows="2" placeholder="Detalle (opcional)" data-fbtext="' + m.id + '" aria-label="Detalle del comentario">' + esc(m.fbText || '') + '</textarea>' +
        '<div class="row"><button class="btn sm primary" data-act="fb-send" data-mid="' + m.id + '">Enviar comentario</button><button class="btn sm" data-act="fb-cancel" data-mid="' + m.id + '">Cancelar</button></div></div>';
    }
    return h;
  }
  function blockHTML(b, t, m) {
    if (b.type === 'collect') return collectCard(t);
    if (b.type === 'quote') return S.quotes[b.id] ? quoteCard(S.quotes[b.id]) : '';
    if (b.type === 'approval') return S.quotes[b.id] ? approvalCard(S.quotes[b.id]) : '';
    if (b.type === 'assist') return assistCard(b, m);
    if (b.type === 'nav') return S.module === b.mod ? '' : '<div class="row"><button class="btn sm soft" data-act="as-nav" data-val="' + esc(b.mod) + '">' + esc(b.label) + '</button></div>';
    if (b.type === 'actions') return '<div class="row">' + b.items.map(function (it) { return '<button class="btn sm soft" data-act="sug" data-val="' + esc(it.val) + '">' + esc(it.label) + '</button>'; }).join('') + '</div>';
    return '';
  }

  function collectCard(t) {
    var f = t.flow.form, cl = D.clients.filter(function (c) { return c.id === f.client; })[0], dis = f.confirmed ? ' disabled' : '';
    var miss = collectMissing(f);
    var h = '<div class="ocard" data-collect="' + t.id + '"><div class="hd">' + ic('doc') + '<span class="t">Datos para la cotización</span><span class="pills">' + (f.confirmed ? '<span class="pill approved">' + ic('check', 'sm') + 'Confirmados</span>' : '<span class="pill missing" data-cd="pill">' + (miss.length ? 'Faltan ' + miss.length : 'Listos') + '</span>') + '</span></div><div class="bd">';
    h += '<div class="f2"><label class="field' + (f.client ? '' : ' need') + '"><span>Cliente ' + SIM + '</span><select class="inp" data-f="client"' + dis + '><option value="">Elegir…</option>' +
      D.clients.map(function (c) { return '<option value="' + c.id + '"' + (c.id === f.client ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field' + (f.plant ? '' : ' need') + '"><span>Planta</span><select class="inp" data-f="plant"' + dis + (cl ? '' : ' disabled') + '><option value="">' + (cl ? 'Elegir…' : 'Elige cliente') + '</option>' +
      (cl ? cl.plants.map(function (p) { return '<option' + (p === f.plant ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') : '') + '</select></label></div>';
    if (cl) h += '<div class="note">Contacto: ' + esc(cl.contact) + ' ' + SIM + '</div>';
    h += '<label class="field' + (f.unit ? '' : ' need') + '"><span>Unidad de negocio' + (f.unitInferred && f.unit ? ' · inferida de tu mensaje' : '') + '</span><select class="inp" data-f="unit"' + dis + '><option value="">Elegir…</option>' +
      D.businessUnits.map(function (u) { return '<option' + (u === f.unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></label>';
    h += '<div class="field"><span>Componentes y modalidad comercial</span>' + ['alcance', 'horas', 'suministro'].map(function (k) {
      var c = f.comps[k];
      return '<div class="comp"><input type="checkbox" id="cmp-' + t.id + '-' + k + '" data-f="on:' + k + '"' + (c.on ? ' checked' : '') + dis + '><label for="cmp-' + t.id + '-' + k + '">' + COMP_NAMES[k] + '</label><select class="inp" data-f="mod:' + k + '" aria-label="Modalidad de ' + COMP_NAMES[k] + '"' + dis + (c.on ? '' : ' disabled') + '>' +
        Object.keys(D.modalities).map(function (mk) { return '<option value="' + mk + '"' + (mk === c.mod ? ' selected' : '') + '>' + D.modalities[mk] + '</option>'; }).join('') + '</select></div>';
    }).join('') + '</div>';
    h += '<label class="field' + (f.scope.trim() ? '' : ' need') + '" data-cd="scope"><span>Alcance general</span><textarea class="inp" rows="2" data-f="scope"' + dis + '>' + esc(f.scope) + '</textarea></label>';
    if (f.extract.length) h += '<div class="extract"><b>Leí esto del adjunto ' + esc(f.extract[0].src) + '. Marca lo que aplica:</b>' + f.extract.map(function (x, i) {
      return '<label><input type="checkbox" data-f="ext:' + i + '"' + (x.on ? ' checked' : '') + dis + '>' + esc(x.text) + '</label>'; }).join('') + '</div>';
    h += '</div>';
    if (!f.confirmed) h += '<div class="ft" data-cd="ft">' + collectFooter(f) + '</div>';
    return h + '</div>';
  }
  function collectFooter(f) {
    var miss = collectMissing(f), r = role(), lock = !S.online || S.limit;
    return (miss.length ? '<div class="why">Falta: ' + miss.join(', ') + '.</div>' : '') +
      '<div class="row"><button class="btn primary" data-act="collect-confirm"' + (miss.length || lock || S.generating || !r.canQuote ? ' disabled' : '') + '>Confirmar y armar borrador</button></div>';
  }
  function updateCollect(t) {
    var card = $('[data-collect="' + t.id + '"]'); if (!card) return;
    var f = t.flow.form, miss = collectMissing(f);
    var ft = card.querySelector('[data-cd="ft"]'); if (ft) ft.innerHTML = collectFooter(f);
    var pill = card.querySelector('[data-cd="pill"]'); if (pill) pill.textContent = miss.length ? 'Faltan ' + miss.length : 'Listos';
    var sc = card.querySelector('[data-cd="scope"]'); if (sc) sc.classList.toggle('need', !f.scope.trim());
  }

  function qPills(q, c) {
    if (q.status === 'pending') return '<span class="pill pending">' + ic('lock', 'sm') + 'Pendiente de aprobación</span>';
    if (q.status === 'approved') return '<span class="pill approved">' + ic('check', 'sm') + 'Aprobada · Rev. ' + q.rev + '</span>';
    var h = q.status === 'rejected' ? '<span class="pill rejected">Rechazada · Rev. ' + q.rev + '</span>' : '';
    if (!q.saved) h += '<span class="pill dirty">Sin guardar</span>';
    h += c.missing.length ? '<span class="pill missing">Con faltantes</span>' : q.status === 'draft' && q.saved ? '<span class="pill approved">Completo</span>' : '';
    if (q.dirty) h += '<span class="pill dirty">Cambios sin guardar</span>';
    return h;
  }
  function qTotals(c) {
    return '<div><span>Horas</span><span>' + c.hrs + ' h</span></div><div><span>Servicios</span><span>' + money(c.svc) + '</span></div><div><span>Suministro</span><span>' + (c.sup ? money(c.sup) : '—') + '</span></div><div class="grand"><span>Total</span><span>' + money(c.total) + '</span></div>';
  }
  function qBars(c) {
    return PROFILES.filter(function (p) { return c.byP[p]; }).map(function (p) { return '<i style="width:' + (c.byP[p] / c.hrs * 100).toFixed(2) + '%;background:var(--p-' + p + ')" title="' + p + ' · ' + c.byP[p] + ' h"></i>'; }).join('');
  }
  function qLegend(c) {
    return PROFILES.filter(function (p) { return c.byP[p]; }).map(function (p) { return '<span><i style="background:var(--p-' + p + ')"></i>' + p + ' ' + c.byP[p] + ' h</span>'; }).join('');
  }
  function qMissing(c) { return c.missing.length ? '<div class="banner warn" style="margin:0">' + ic('alert', 'sm') + '<span>Falta: ' + esc(c.missing.join('; ')) + '.</span></div>' : ''; }
  function qFooter(q, c) {
    var r = role(), ed = editable(q), lock = !S.online;
    var canSend = ed && q.saved && !q.dirty && !c.missing.length && !lock;
    var why = q.status === 'pending' ? 'Pendiente de aprobación: no se puede editar.'
      : q.status === 'approved' ? 'Aprobada. Para cambiarla se crea una nueva revisión en Cotizaciones.'
      : !r.canQuote ? 'Tu rol no puede modificar cotizaciones.'
      : lock ? 'Sin conexión: no se pueden guardar ni enviar cambios.'
      : !q.saved ? 'Es una propuesta: aún no existe en Kairos. Guárdala para crear la cotización.'
      : c.missing.length ? 'Completa los faltantes para enviarla a aprobación.'
      : q.dirty ? 'Guarda los cambios antes de enviarla a aprobación.' : '';
    var h = q.trace.slice(-2).map(function (l) { return '<div class="trace">' + ic('clock', 'sm') + esc(l) + '</div>'; }).join('');
    if (q.confirmOpen && ed) {
      h += '<div class="confirm" role="group" aria-label="Confirmar envío a aprobación"><b>¿Enviar ' + q.id + ' a aprobación?</b><div>Se enviará como Rev. ' + (q.rev + 1) + ' por ' + money(c.total) + '. Mientras esté pendiente no se podrá editar. Esto no la envía a Odoo.</div>' +
        '<div class="row"><button class="btn approve sm" data-act="send-confirm" data-q="' + q.id + '"' + (canSend ? '' : ' disabled') + '>' + ic('lock', 'sm') + 'Confirmar envío</button><button class="btn sm" data-act="send-cancel" data-q="' + q.id + '">Cancelar</button></div></div>';
      return h;
    }
    if (ed) h += '<div class="row"><button class="btn sm primary" data-act="q-save" data-q="' + q.id + '"' + ((q.dirty || !q.saved) && !lock ? '' : ' disabled') + '>' + (q.saved ? 'Guardar borrador' : 'Guardar y crear cotización') + '</button>' + (q.saved ? '<button class="btn sm" data-act="q-edit" data-q="' + q.id + '">Editar en Cotizaciones</button>' : '') + '<button class="btn sm approve" data-act="q-send" data-q="' + q.id + '"' + (canSend ? '' : ' disabled') + '>' + ic('lock', 'sm') + 'Enviar a aprobación</button></div>';
    else h += '<div class="row"><button class="btn sm" data-act="go-quote" data-q="' + q.id + '">' + ic('ext', 'sm') + 'Abrir en Cotizaciones</button></div>';
    if (why) h += '<div class="why">' + why + '</div>';
    return h;
  }
  function quoteCard(q) {
    var c = calc(q), ed = editable(q) && S.online, dis = ed ? '' : ' disabled';
    var h = '<div class="ocard" data-quote="' + q.id + '"><div class="hd">' + ic('doc') + '<span class="t">' + (q.saved ? 'Borrador de cotización' : 'Propuesta de cotización') + '</span><span class="pills" data-d="pills">' + qPills(q, c) + '</span></div><div class="bd">' +
      '<div class="q-meta"><span><b>' + ref(q) + '</b>' + (q.saved ? ' · Rev. ' + q.rev : '') + '</span><span><b>' + esc(q.client) + '</b> ' + SIM + '</span><span>' + esc(q.plant) + '</span><span>' + esc(q.unit) + '</span></div>';
    if (q.extract && q.extract.length) h += '<div class="note">Incluye del adjunto: ' + esc(q.extract.join('; ')) + '.</div>';
    if (q.comps.alcance.on) {
      h += '<div class="q-sec"><div class="lbl">' + COMP_NAMES.alcance + ' · ' + D.modalities[q.comps.alcance.mod] + '</div>' + q.phases.map(function (ph, pi) {
        var p = c.phs[pi];
        return '<details class="ph" data-pi="' + pi + '"' + (q.open[pi] ? ' open' : '') + '><summary>' + ic('chev', 'sm chev') + '<span>' + esc(ph.name) + '</span><span class="s" data-d="ph-' + pi + '">' + p.h + ' h · ' + money(p.v) + '</span></summary>' +
          ph.activities.map(function (a, ai) {
            var x = c.acts[pi + '-' + ai];
            return '<div class="act' + (x.h ? '' : ' zero') + '" data-act-row="' + pi + '-' + ai + '"><div class="an"><span>' + esc(a.name) + '</span><span class="s" data-d="act-' + pi + '-' + ai + '">' + x.h + ' h · ' + money(x.v) + '</span></div><div class="hrs">' +
              Object.keys(a.hours).map(function (pr) {
                var k = pi + '|' + ai + '|' + pr;
                return '<label class="hr' + (q.changed[k] ? ' changed' : '') + '" title="' + pr + ' · ' + money(RATES[pr]) + ' por hora"><span>' + pr + '</span><input type="number" min="0" step="1" inputmode="numeric" value="' + a.hours[pr] + '" data-h="' + k + '" data-q="' + q.id + '" aria-label="Horas ' + pr + ' en ' + esc(a.name) + '"' + dis + '></label>';
              }).join('') + '</div></div>';
          }).join('') + '</details>';
      }).join('') + '</div>';
    }
    if (q.comps.horas.on) h += '<div class="q-sec"><div class="lbl">' + COMP_NAMES.horas + ' · ' + D.modalities[q.comps.horas.mod] + '</div><div class="line"><span>Bolsa de horas</span><label class="hr' + (q.changed.blk ? ' changed' : '') + '"><span>' + q.block.profile + '</span><input type="number" min="0" step="1" inputmode="numeric" value="' + q.block.hours + '" data-blk data-q="' + q.id + '" aria-label="Horas de soporte"' + dis + '></label><span class="s" data-d="blk">' + money(c.blk.v) + '</span></div></div>';
    if (q.comps.suministro.on) h += '<div class="q-sec"><div class="lbl">' + COMP_NAMES.suministro + ' · ' + D.modalities[q.comps.suministro.mod] + '</div><div class="line' + (q.supply.value == null ? ' need' : '') + '" data-d="supline"><span>' + esc(q.supply.desc) + '</span><input class="inp" inputmode="numeric" placeholder="Valor del proveedor (COP)" value="' + (q.supply.value == null ? '' : q.supply.value) + '" data-supply data-q="' + q.id + '" aria-label="Valor de suministro en COP"' + dis + '></div></div>';
    h += '<div class="q-sec"><div class="lbl">Horas por perfil</div><div class="bars" data-d="bars">' + qBars(c) + '</div><div class="legend" data-d="legend">' + qLegend(c) + '</div></div>';
    h += '<div class="totals" data-d="totals">' + qTotals(c) + '</div>';
    h += '<div class="note">Tarifas: ' + D.priceList.name + ' (' + D.priceList.id + ') ' + SIM + ' · solo lectura</div>';
    h += '<div data-d="missing">' + qMissing(c) + '</div></div><div class="ft" data-d="ft">' + qFooter(q, c) + '</div></div>';
    return h;
  }
  function refreshQuote(q) {
    var c = calc(q);
    $$('[data-quote="' + q.id + '"]').forEach(function (card) {
      var set = function (k, v) { var e = card.querySelector('[data-d="' + k + '"]'); if (e) e.innerHTML = v; };
      set('pills', qPills(q, c)); set('totals', qTotals(c)); set('bars', qBars(c)); set('legend', qLegend(c)); set('missing', qMissing(c)); set('ft', qFooter(q, c));
      if (q.comps.alcance.on) q.phases.forEach(function (ph, pi) {
        set('ph-' + pi, c.phs[pi].h + ' h · ' + money(c.phs[pi].v));
        ph.activities.forEach(function (a, ai) {
          var x = c.acts[pi + '-' + ai]; set('act-' + pi + '-' + ai, x.h + ' h · ' + money(x.v));
          var row = card.querySelector('[data-act-row="' + pi + '-' + ai + '"]'); if (row) row.classList.toggle('zero', !x.h);
        });
      });
      set('blk', money(c.blk.v));
      var sl = card.querySelector('[data-d="supline"]'); if (sl) sl.classList.toggle('need', q.supply.value == null);
    });
    renderTop();
  }
  function approvalCard(q) {
    var c = calc(q), st = q.status === 'approved' ? 'approved' : q.status === 'rejected' ? 'rejected' : q.status === 'pending' ? 'pending' : 'pending';
    var title = st === 'approved' ? 'Aprobada en Cotizaciones' : st === 'rejected' ? 'Rechazada en Cotizaciones' : 'Requiere aprobación humana';
    var h = '<div class="ocard approval ' + st + '" data-approval="' + q.id + '"><div class="hd">' + ic(st === 'approved' ? 'check' : 'lock') + '<span class="t">' + title + '</span><span class="pills">' + statusPill(q.status === 'draft' ? 'pending' : q.status, q.rev) + '</span></div><div class="bd">' +
      '<div class="steps"><div class="ok">Borrador</div><div class="' + (st === 'pending' ? 'on' : 'ok') + '">Pendiente</div><div class="' + (st === 'approved' ? 'ok' : st === 'rejected' ? 'no' : '') + '">' + (st === 'rejected' ? 'Rechazada' : 'Aprobada') + '</div></div>' +
      '<dl class="kv"><dt>Referencia</dt><dd>' + q.id + ' · Rev. ' + q.rev + '</dd><dt>Total</dt><dd>' + money(c.total) + '</dd><dt>Enviada</dt><dd>' + esc(q.sentBy || '—') + ' · ' + (q.sentAt || '') + '</dd>' +
      (q.decidedBy ? '<dt>Decisión</dt><dd>' + esc(q.decidedBy) + ' · ' + q.decidedAt + '</dd>' : '') + (q.reason ? '<dt>Motivo</dt><dd>' + esc(q.reason) + '</dd>' : '') + '</dl>';
    if (st === 'pending') h += '<div class="note">omnIA no aprueba. Ve a Cotizaciones: solo quien tenga permiso de aprobación verá los botones para decidir.</div>';
    if (st === 'approved') h += '<div class="note">La aprobación quedó registrada. El envío a Odoo ocurre después, fuera de omnIA.</div>';
    h += '</div><div class="ft"><div class="row">';
    if (st === 'pending') h += '<button class="btn sm approve" data-act="go-quote" data-q="' + q.id + '">' + ic('ext', 'sm') + 'Ir a aprobar en Cotizaciones</button>';
    else if (st === 'rejected') h += '<button class="btn sm primary" data-act="focus-quote" data-q="' + q.id + '">Ajustar el borrador</button><button class="btn sm" data-act="go-quote" data-q="' + q.id + '">Abrir en Cotizaciones</button>';
    else h += '<button class="btn sm" data-act="go-quote" data-q="' + q.id + '">' + ic('ext', 'sm') + 'Abrir cotización</button>';
    return h + '</div></div></div>';
  }

  function historyView() {
    var ql = S.q.trim().toLowerCase();
    var h = '<div class="list"><label class="search"><span class="sr">Buscar conversaciones</span>' + ic('search') + '<input id="histSearch" class="inp" placeholder="Buscar por título, registro o texto" value="' + esc(S.q) + '"></label><div data-d="hlist">' + historyList(ql) + '</div></div>';
    return h;
  }
  function historyList(ql) {
    var items = S.threads.filter(function (t) {
      if (!t.messages.length) return false;
      if (!ql) return true;
      var hay = (t.title + ' ' + (t.ctx ? ctxInfo(t.ctx).label : 'libre') + ' ' + t.messages.map(function (m) { return m.text || ''; }).join(' ')).toLowerCase();
      return hay.indexOf(ql) > -1;
    }).sort(function (a, b) { return b.ts - a.ts; });
    if (!items.length) return '<p class="note">No hay conversaciones que coincidan con «' + esc(S.q) + '».</p>';
    var groups = { Cotizaciones: {}, Proyectos: {}, Reservas: {}, Libres: { '': [] } };
    items.forEach(function (t) {
      var g = t.ctx ? ctxInfo(t.ctx).group : 'Libres', k = t.ctx || '';
      (groups[g][k] = groups[g][k] || []).push(t);
    });
    var h = '<div style="display:grid;gap:14px">';
    Object.keys(groups).forEach(function (g) {
      var recs = Object.keys(groups[g]).filter(function (k) { return groups[g][k].length; }); if (!recs.length) return;
      h += '<section class="grp"><h3>' + g + '</h3>' + recs.map(function (k) {
        return (k ? '<h4>' + ic('doc', 'sm') + esc(ctxInfo(k).label) + '</h4>' : '') + groups[g][k].map(function (t) {
          var last = t.messages.filter(function (m) { return m.text; }).slice(-1)[0];
          return '<button class="hitem' + (t.id === S.activeId ? ' cur' : '') + '" data-act="hist-open" data-id="' + t.id + '"><span class="t">' + esc(t.title) + '<span>' + esc(t.updated) + '</span></span><span class="p">' + esc(last ? last.text : '') + '</span></button>';
        }).join('');
      }).join('') + '</section>';
    });
    return h + '</div>';
  }
  /* ---------- Alertas de seguimiento (Maestro 13, punto 15) ----------
     El nivel lo calcula omnia/seguimiento.js con una regla fija. omnIA solo pide y ordena la explicacion. */
  var SEG = function () { return window.OmniaSeguimiento; };
  function segList() { var E = SEG(); return E && HOST_USER ? E.visibles(HOST_USER.role, HOST_USER.name) : []; }
  function seenKey() { return 'omnia.seg.seen.' + ((HOST_USER && HOST_USER.id) || 'anon'); }
  function seenMap() { try { return JSON.parse(localStorage.getItem(seenKey()) || '{}'); } catch (e) { return {}; } }
  function unseenAlerts() { var m = seenMap(); return segList().filter(function (a) { return m[a.key] !== a.level; }); }
  function markSeen() { var m = {}; segList().forEach(function (a) { m[a.key] = a.level; }); try { localStorage.setItem(seenKey(), JSON.stringify(m)); } catch (e) {} S.alertsUnseen = 0; S.critUnseen = false; }
  function syncAlerts(withToast) {
    if (!S) return;
    var u = unseenAlerts();
    S.alertsUnseen = u.length;
    var crit = u.some(function (a) { return a.level === 'critical'; });
    S.critUnseen = crit;
    if (withToast && crit) S.toast = true;
  }
  function segWhen(a) {
    var E = SEG(), h = a.hist || [];
    var parts = h.map(function (x, i) { return (i === 0 ? 'Abierta el ' : (x.level === 'critical' ? 'se agravó a Crítica el ' : 'bajó a Importante el ')) + E.fecha(x.wk) + (i === 0 ? ' como ' + E.LV[x.level] : ''); });
    return parts.join(' · ');
  }
  function alertCard(a, r) {
    var E = SEG(), can = E.puedeExplicar(a, HOST_USER.role, HOST_USER.name);
    var x = '<article class="alert ' + a.level + '" data-alert="' + esc(a.key) + '"><div class="t"><span class="lv">' + E.LV[a.level] + '</span><span class="seg-org">Seguimiento · corte ' + E.semana(a.corte) + '</span></div>' +
      '<div class="seg-tt">' + esc(a.title) + '</div>';
    if (a.rule === 'horas') {
      x += '<div class="seg-m"><span>Horas<b>' + a.h + ' %</b></span><span>Avance<b>' + a.a + ' %</b></span><span>Diferencia<b class="d">' + (a.d >= 0 ? '+' : '') + a.d + ' pts</b><small>' + (a.level === 'critical' ? 'crítica' : 'importante') + ' desde ' + a.umbral + '</small></span></div>';
    } else x += '<div>' + esc(a.text) + '</div>';
    x += '<div class="trace">' + esc(a.code) + ' · Líder: ' + esc(a.leader) + ' · ' + esc(segWhen(a)) + '</div>';
    if (a.below) x += '<div class="trace">En el último corte quedó bajo el umbral. Si sigue así en el próximo corte, la alerta se cierra.</div>';
    a.exps.forEach(function (ex) {
      x += '<div class="event">' + ic('check', 'sm') + '<div>' + esc(ex.causas.length ? ex.causas.join(', ') : 'Explicación') + (ex.detail ? ': ' + esc(ex.detail) : '') + '<div class="trace">' + esc(ex.by) + ' · ' + esc(E.fecha(ex.at)) + ' ' + esc(ex.hm || '') + ' · en la Bitácora</div></div></div>';
    });
    if (can && S.explainOpen === a.key) {
      var q = a.rule === 'horas' ? (a.exps.length ? 'Ya hay una explicación registrada. ¿Qué explica la desviación ahora?' : '¿Qué explica la desviación?') : '¿Por qué no se reportó el avance?';
      x += '<div class="seg-ask">' + MARK + '<div><b>omnIA</b> · Seguimiento<div>' + esc(q) + '</div></div></div>' +
        '<fieldset class="seg-causas"><legend>Causas (puedes marcar varias)</legend><div class="chips">' + E.CAUSAS.map(function (c) {
          var on = S.explainCausas.indexOf(c) >= 0;
          return '<button type="button" class="chip" data-act="explain-causa" data-val="' + esc(c) + '" aria-pressed="' + on + '">' + esc(c) + '</button>';
        }).join('') + '</div></fieldset>' +
        '<label class="field"><span>Detalle</span><textarea class="inp" rows="2" id="explainText">' + esc(S.explainDraft) + '</textarea></label>' +
        (S.explainErr ? '<div class="seg-err" role="alert">' + esc(S.explainErr) + '</div>' : '') +
        '<p class="note">Queda en la Bitácora del proyecto con tu nombre y la hora. Registrar no cierra la alerta: se cierra cuando la regla deja de cumplirse.</p>' +
        '<div class="row"><button class="btn sm primary" data-act="explain-save" data-id="' + esc(a.key) + '">Registrar en Bitácora</button><button class="btn sm" data-act="explain-cancel">Ahora no</button></div>';
    } else {
      x += '<div class="row">' + (can ? '<button class="btn sm primary" data-act="explain" data-id="' + esc(a.key) + '">Registrar explicación</button>' : '') +
        '<button class="btn sm" data-act="seg-open" data-id="' + esc(a.projectId) + '">Ver proyecto</button></div>';
    }
    if (a.level === 'important') x += '<div class="trace">Entra en el resumen del lunes a las 7:00 para el líder y Dirección.</div>';
    return x + '</article>';
  }
  function clearExplainErr() { if (!S.explainErr) return; S.explainErr = ''; var e = $('#pBody .seg-err'); if (e) e.remove(); }
  function alertsView() {
    var r = role(), E = SEG(), h = '<div class="list">';
    if (!E) return h + '<p class="note">El seguimiento no está disponible.</p></div>';
    var L = segList(), rk = HOST_USER.role;
    if (rk === 'sd' || rk === 'admin') return h + '<div class="empty"><div class="hello">Tu perfil no recibe alertas de seguimiento</div><p class="note">Las alertas llegan al líder del proyecto, a Planeación, a Dirección y al equipo del proyecto.</p></div></div>';
    var nC = L.filter(function (a) { return a.level === 'critical'; }).length, nI = L.length - nC;
    if (L.length) h += '<div class="chips" role="group" aria-label="Filtrar avisos">' + [['todas', 'Todas', L.length], ['critical', 'Crítica', nC], ['important', 'Importante', nI]].map(function (c) {
      return '<button class="chip" data-act="seg-filter" data-val="' + c[0] + '" aria-pressed="' + (S.alertFilter === c[0]) + '">' + c[1] + ' ' + c[2] + '</button>';
    }).join('') + '</div>';
    if (rk === 'ejecutor') h += '<p class="note">' + ic('lock', 'sm') + ' Puedes consultar los avisos de tus proyectos; no editarlos. Si algo no cuadra, avisa a tu líder.</p>';
    var F = L.filter(function (a) { return S.alertFilter === 'todas' || a.level === S.alertFilter; });
    if (!L.length) h += '<div class="empty"><div class="hello">Sin alertas</div><p class="note">Ningún proyecto ' + (rk === 'lider' ? 'que lideras ' : rk === 'ejecutor' ? 'de tu equipo ' : '') + 'supera los umbrales en el último corte.</p></div>';
    h += F.map(function (a) { return alertCard(a, r); }).join('');
    var u = E.umbrales();
    h += '<p class="note">El nivel lo calcula una regla fija, no omnIA: importante desde ' + u.imp + ' puntos de horas sobre avance, crítica desde ' + u.crit + (u.sinReporte ? '; también alerta la semana sin reporte de avance' : '') + '. Crítica: aviso inmediato. Importante: resumen semanal.</p>';
    if (E.simulado()) h += '<p class="note">Corte de referencia del prototipo. Al abrir Proyectos se recalcula con los datos de este navegador.</p>';
    return h + '</div>';
  }
  /* ---------- Modo consulta (perfiles sin capacidad Chat) [ACORDADO 31-oct, Juan] ----------
     Avisos de sus proyectos y sugerencias por reglas. No usa el modelo de IA ni cuenta para el limite de uso. */
  function consultaSugs() {
    var K = window.KX, u = HOST_USER, out = [];
    if (!K || !u || !K.load || !K.CUR) return out;
    try {
      var db = K.load(), y = K.CUR.year, w = K.CUR.week, pw = w > 1 ? w - 1 : 52, py = w > 1 ? y : y - 1, cx = K.context();
      var known = cx.persons.some(function (p) { return p.name === u.name && p.active; });
      if (!known) return out;
      var prev = K.total(db, u.name, py, pw), capP = K.capacity(py, pw), cur = K.total(db, u.name, y, w), cap = K.capacity(y, w);
      if (prev < capP) out.push({ title: 'Completa tus horas de la semana ' + pw, text: 'Tienes ' + fmtH(prev) + ' de ' + fmtH(capP) + ' h. La semana anterior debe quedar completa.', btn: 'Ir a Ejecución', go: 'ejecucion' });
      if (cur < cap) out.push({ title: 'Registra tus horas de la semana ' + w, text: 'Llevas ' + fmtH(cur) + ' de ' + fmtH(cap) + ' h.', btn: 'Ir a Ejecución', go: 'ejecucion' });
      var nw = w + 1, ny = y; if (nw > 52) { nw = 1; ny = y + 1; }
      if (!cx.reserved(u.name, ny, nw).total) out.push({ title: 'Semana ' + nw + ' sin reserva', text: 'Aún no tienes proyecto asignado para la próxima semana. Planeación lo define.', btn: 'Ver mis reservas', go: 'reservas' });
    } catch (e) {}
    return out;
  }
  function fmtH(n) { return (Math.round(n * 10) / 10).toLocaleString('es-CO'); }
  /* Solo el Administrativo sin Chat y sin nada que mostrar pierde el lanzador [ACORDADO 31-oct, Juan]. El Ejecutor siempre lo ve. */
  function nothingToShow() { var r = role(); return !!HOST_USER && HOST_USER.role === 'admin' && !r.chat && !segList().length && !consultaSugs().length; }
  function consultaView() {
    var L = segList(), G = consultaSugs(), h = '<div class="list">';
    if (!S.online) h += '<div class="banner err" role="status">' + ic('wifioff') + '<span>Sin conexión. Los avisos pueden no estar al día.</span></div>';
    h += '<h3 class="seg-h">Avisos de tus proyectos' + (L.length ? ' · ' + L.length : '') + '</h3>';
    h += L.length ? L.map(function (a) { return alertCard(a, role()); }).join('') : '<p class="note">Tus proyectos no tienen alertas en el último corte.</p>';
    h += '<h3 class="seg-h">Para ti</h3>';
    h += G.length ? G.map(function (s) { return '<article class="alert sug"><div class="seg-tt">' + esc(s.title) + '</div><div>' + esc(s.text) + '</div><div class="row"><button class="btn sm" data-act="sug-go" data-val="' + s.go + '">' + esc(s.btn) + '</button></div></article>'; }).join('') : '<p class="note">Nada pendiente para ti.</p>';
    return h + '<p class="note">Avisos y sugerencias calculados por reglas de Kairos. Para conversar con omnIA se necesita la capacidad Chat.</p></div>';
  }
  function deniedView() {
    var c = moduleCtx(), items = D.assisted[c] || D.assisted['default'];
    return '<div class="empty"><div class="hello">La conversación con omnIA no está habilitada para tu perfil</div><p class="note">Puedes ver las sugerencias asistidas del registro abierto y los avisos de tus proyectos en la campana. Si necesitas conversar con omnIA, pide la capacidad Chat a quien administra Kairos.</p>' +
      '<div class="assist">' + items.map(function (s) { return '<article class="alert"><div class="t">' + esc(s.title) + '</div><div>' + esc(s.text) + '</div>' + (s.action ? '<div class="row"><button class="btn sm" data-act="assist">' + esc(s.action) + '</button></div>' : '') + '</article>'; }).join('') + '</div></div>';
  }

  /* Composer */
  function lockReason() {
    var t = thread();
    if (!S.online) return 'Sin conexión';
    if (S.limit) return 'Límite de uso alcanzado';
    if (t && t.ctx && t.ctx !== moduleCtx()) return 'Conversación de otro registro';
    return '';
  }
  function canSend() {
    var txt = $('#input').value.trim();
    if (lockReason() || S.generating) return false;
    if (S.atts.some(function (a) { return a.status !== 'ready'; })) return false;
    return !!(txt || S.atts.length);
  }
  function renderComposer() {
    var r = role(), comp = $('#composer');
    comp.hidden = !(r.chat && S.view === 'chat');
    if (comp.hidden) return;
    var lock = lockReason(), input = $('#input');
    comp.classList.toggle('locked', !!lock);
    input.disabled = !!lock;
    input.placeholder = !lock ? 'Escribe a omnIA…' : lock === 'Conversación de otro registro' ? 'Abre ' + ctxInfo(thread().ctx).short + ' para continuar' : lock + '. No puedes enviar mensajes ahora.';
    $$('#attFile, #attImg').forEach(function (b) { b.disabled = !!lock; });
    $('#atts').innerHTML = S.atts.map(attHTML).join('');
    var send = $('#send');
    if (S.generating) { send.innerHTML = ic('stop'); send.setAttribute('aria-label', 'Detener respuesta'); send.title = 'Detener respuesta'; send.disabled = false; }
    else { send.innerHTML = ic('send'); send.setAttribute('aria-label', 'Enviar'); send.title = 'Enviar (Enter)'; send.disabled = !canSend(); }
    var err = S.atts.some(function (a) { return a.status === 'error'; }), up = S.atts.some(function (a) { return a.status === 'uploading'; });
    $('#hintL').textContent = lock === 'Conversación de otro registro' ? 'Esta conversación pertenece a otro registro.' : err ? 'Quita el adjunto con error para enviar.' : up ? 'Esperando a que terminen de subir los adjuntos…' : 'Enter envía · Shift+Enter nueva línea';
  }
  function attHTML(a) {
    var sub = a.status === 'uploading' ? '<div class="prog"><i style="width:' + a.pct + '%"></i></div>' : a.status === 'error' ? '<span class="sub">' + esc(a.err) + '</span>' : '<span class="sub">' + (a.kind === 'image' ? 'Imagen lista' : 'Listo') + ' · ' + fmtSize(a.size) + '</span>';
    return '<div class="att' + (a.status === 'error' ? ' err' : '') + '" data-att="' + a.id + '">' + (a.url && a.status !== 'error' ? '<img src="' + a.url + '" alt="Vista previa de ' + esc(a.name) + '">' : '<span class="fi">' + ic(a.status === 'error' ? 'alert' : a.kind === 'image' ? 'image' : 'doc', 'sm') + '</span>') +
      '<div style="min-width:0"><div class="nm">' + esc(a.name) + '</div>' + sub + '</div><button class="x" data-attx="' + a.id + '" aria-label="Quitar ' + esc(a.name) + '">' + ic('x', 'sm') + '</button></div>';
  }
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function addFile(file, kind) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var a = { id: uid('a'), name: file.name, size: file.size, kind: kind, status: 'uploading', pct: 0 };
    if (D.limits.accepted.indexOf(ext) === -1) { a.status = 'error'; a.err = 'Tipo no admitido. Usa PDF, Word, Excel, PNG o JPG.'; }
    else if (file.size > D.limits.maxFileMB * 1048576) { a.status = 'error'; a.err = 'Supera ' + D.limits.maxFileMB + ' MB.'; }
    else if (kind === 'image' || /png|jpe?g/.test(ext)) { a.kind = 'image'; try { a.url = URL.createObjectURL(file); } catch (e) { a.url = ''; } }
    S.atts.push(a); renderComposer();
    if (a.status === 'uploading') simulateUpload(a);
  }
  function simulateUpload(a) {
    var iv = setInterval(function () {
      if (S.atts.indexOf(a) === -1) return clearInterval(iv);
      a.pct = Math.min(100, a.pct + 18);
      if (a.pct >= 100) { a.status = 'ready'; clearInterval(iv); renderComposer(); return; }
      var bar = $('[data-att="' + a.id + '"] .prog i'); if (bar) bar.style.width = a.pct + '%';
    }, 220);
  }
  function sendMessage(text) {
    var input = $('#input'), txt = (text != null ? text : input.value).trim();
    if (text == null && !canSend()) return;
    if (text != null && (lockReason() || S.generating || !txt)) return;
    var t = thread() || newThread(moduleCtx());
    var atts = text != null ? [] : S.atts.filter(function (a) { return a.status === 'ready'; });
    if (!t.messages.length) t.title = (txt || atts[0].name).slice(0, 46);
    t.ts = ++seq; t.updated = now();
    t.messages.push(msg('user', { text: txt, atts: atts.map(function (a) { return { name: a.name, kind: a.kind, url: a.url }; }) }));
    Array.prototype.push.apply(t.atts, atts);
    if (text == null) { S.atts = []; input.value = ''; autosize(); }
    S.sent += 1; S.forceBottom = true;
    handle(t, txt, atts);
  }
  function autosize() { var i = $('#input'); i.style.height = 'auto'; i.style.height = Math.min(140, i.scrollHeight) + 'px'; }

  function renderToast() {
    var el = $('#oToast');
    if (!S.toast || !ACTIVE) { el.hidden = true; el.innerHTML = ''; return; }
    var a = segList().filter(function (x) { return x.level === 'critical'; })[0];
    if (!a) { S.toast = false; el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<div class="t">' + ic('alert') + 'Aviso crítico · ' + esc(a.code) + '</div><div>' + esc(a.title) + '. ' + esc(a.text) + '</div><div class="row"><button class="btn sm primary" data-tact="view">Ver en omnIA</button><button class="btn sm" data-tact="close">Cerrar</button></div>';
  }
  function triggerCritical() { S.toast = true; S.critUnseen = true; S.alertsUnseen = Math.max(S.alertsUnseen, 1); render(); }

  /* Demo drawer */
  var SCENARIOS = [
    ['inicial', 'Sin conversación (inicial)'], ['generando', 'Respuesta en generación'], ['adjuntos', 'Adjuntos: subiendo, listo, error, imagen'],
    ['incompleta', 'Respuesta incompleta'], ['sinpermiso', 'Sin permiso'], ['offline', 'Sin conexión'], ['limite', 'Límite de uso'],
    ['cerrado', 'Panel cerrado con novedades'], ['critico', 'Aviso crítico inmediato']
  ];
  var curScenario = 'inicial';
  function renderDemo() {
    var d = $('#demo'); d.hidden = !(ACTIVE && S.demoOpen); if (d.hidden) return;
    var pend = Object.keys(S.quotes).map(function (k) { return S.quotes[k]; }).filter(function (q) { return q.status === 'pending'; })[0];
    d.innerHTML = '<h2>Barra de demo <button class="icon-btn" data-dact="close" aria-label="Cerrar barra de demo">' + ic('x') + '</button></h2><p class="note" style="margin:0">No es parte del producto. Sirve para recorrer estados con datos ficticios.</p>' +
      '<label>Escenario<select class="inp" id="dScenario">' + SCENARIOS.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === curScenario ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label>' +
      '<p class="note" style="margin:0">Rol: <b>' + esc(role().label) + '</b>. Cámbialo en el menú de usuario de Kairos.</p>' +
      '<label class="tog"><input type="checkbox" id="dOnline"' + (S.online ? ' checked' : '') + '>Conexión disponible</label>' +
      '<label class="tog"><input type="checkbox" id="dLimit"' + (S.limit ? ' checked' : '') + '>Límite de uso alcanzado</label>' +
      '<label class="tog"><input type="checkbox" id="dCut">Cortar la próxima respuesta</label>' +
      '<div class="row"><button class="btn sm approve" data-dact="approve"' + (pend ? '' : ' disabled') + '>Simular aprobación en módulo</button><button class="btn sm danger" data-dact="reject"' + (pend ? '' : ' disabled') + '>Simular rechazo</button></div>' +
      '<div class="row"><button class="btn sm" data-dact="critical">Disparar aviso crítico</button></div>';
  }
  var cutNext = false;

  /* ---------- Scenarios ---------- */
  function userMsg(text) { return msg('user', { text: text }); }
  function botMsg(origin, text, blocks) { return msg('bot', { origin: origin, text: text, blocks: blocks || [] }); }
  function scQuote(status, opts) {
    opts = opts || {};
    var t = newThread(null), txt = 'Cotiza un MES para la planta Riofrío de Kenvue Colombia';
    t.ts = ++seq;
    t.messages.push(userMsg(txt));
    t.flow = { stage: 'collect', form: { client: 'CLI-9001', plant: 'Planta Yumbo', unit: 'Smart Manufacturing', unitInferred: true, comps: defaultComps(), scope: 'MES con trazabilidad por lote y OEE para la línea de envasado 2.', extract: [], confirmed: true } };
    t.messages.push(botMsg('Estimador', 'Entendí: cotización de un MES para Kenvue Colombia. Completé lo que pude inferir. Revisa y confirma.', [{ type: 'collect' }]));
    t.messages.push(eventMsg('Datos confirmados por <b>' + esc(role().user) + '</b>'));
    var q = createQuote(t);
    t.messages.push(botMsg('Estimador', PROP_TEXT('Smart Manufacturing'), [{ type: 'quote', id: q.id }]));
    if (opts.complete) q.supply.value = 38500000;
    if (opts.unsaved) { S.module = 'inicio'; S.activeId = t.id; return { t: t, q: q }; }
    saveQuote(q);
    if (opts.dirty) { q.phases[2].activities[0].hours.E2 = 72; q.changed['2|0|E2'] = true; q.dirty = true; q.open[2] = true; }
    if (status !== 'draft') {
      sendQuote(q, t);
      if (status === 'approved') decide(q, 'approved', 'Gonzalo Perdomo', '', true);
      if (status === 'rejected') decide(q, 'rejected', 'Gonzalo Perdomo', D.rejectReason, true);
    }
    S.unread = 0;
    S.module = 'cotizaciones'; S.selQuote = q.id; S.activeId = t.id;
    return { t: t, q: q };
  }
  function sampleImage() {
    try {
      var c = document.createElement('canvas'); c.width = 160; c.height = 120; var x = c.getContext('2d');
      x.fillStyle = '#e8eefc'; x.fillRect(0, 0, 160, 120); x.fillStyle = '#002473'; x.fillRect(10, 70, 140, 10);
      x.fillStyle = '#0a58eb'; [20, 62, 104].forEach(function (p) { x.fillRect(p, 40, 30, 30); });
      x.fillStyle = '#00dcfa'; x.fillRect(130, 30, 18, 40); return c.toDataURL('image/png');
    } catch (e) { return ''; }
  }
  function applyScenario(name) {
    if (S && S.gen) { clearTimeout(S.gen.timer); clearInterval(S.gen.timer); }
    var demo = S ? S.demoOpen : false;
    curScenario = name;
    S = freshState(HOST_USER ? HOST_USER.role : 'sd');
    S.denied = name === 'sinpermiso';
    S.demoOpen = demo;
    var t;
    switch (name) {
      case 'generando': S.module = 'inicio'; t = newThread(null); t.ts = ++seq; t.messages.push(userMsg(SUG_QUOTE)); t.title = SUG_QUOTE; render(); startQuote(t, SUG_QUOTE); return;
      case 'curso': S.module = 'inicio'; t = newThread(null); t.ts = ++seq; t.title = SUG_QUOTE; t.messages.push(userMsg(SUG_QUOTE));
        t.flow = { stage: 'collect', form: { client: 'CLI-9001', plant: '', unit: 'Smart Manufacturing', unitInferred: true, comps: defaultComps(), scope: SUG_QUOTE, extract: [], confirmed: false } };
        t.messages.push(botMsg('Estimador', 'Entendí: cotización de un MES para Kenvue Colombia. Completé lo que pude inferir. Me falta: planta.', [{ type: 'collect' }])); break;
      case 'propuesta': scQuote('draft', { unsaved: true }); break;
      case 'faltantes': scQuote('draft'); break;
      case 'completo': scQuote('draft', { complete: true }); break;
      case 'singuardar': scQuote('draft', { complete: true, dirty: true }); break;
      case 'pendiente': scQuote('pending', { complete: true }); break;
      case 'aprobada': scQuote('approved', { complete: true }); break;
      case 'rechazada': scQuote('rejected', { complete: true }); break;
      case 'adjuntos': S.module = 'inicio';
        S.atts = [
          { id: uid('a'), name: 'alcance-cliente.pdf', size: 820000, kind: 'file', status: 'uploading', pct: 45 },
          { id: uid('a'), name: 'lista-equipos.xlsx', size: 64000, kind: 'file', status: 'ready', pct: 100 },
          { id: uid('a'), name: 'instalador.exe', size: 2400000, kind: 'file', status: 'error', err: 'Tipo no admitido. Usa PDF, Word, Excel, PNG o JPG.' },
          { id: uid('a'), name: 'planta-linea2.png', size: 310000, kind: 'image', status: 'ready', pct: 100, url: sampleImage() } ];
        break;
      case 'incompleta': S.module = 'inicio'; t = newThread(null); t.ts = ++seq; t.title = '¿Qué puedes hacer?'; t.messages.push(userMsg('¿Qué puedes hacer?'));
        t.messages.push(msg('bot', { text: CAP_TEXT.slice(0, 92), incomplete: 'cut', spec: { text: CAP_TEXT, blocks: [{ type: 'nav', label: 'Ir a Cotizaciones', mod: 'cotizaciones' }] } })); break;
      case 'sinpermiso': S.module = 'cotizaciones'; S.selQuote = 'COT-2026-0142'; break;
      case 'offline': scQuote('draft'); S.online = false; break;
      case 'limite': scQuote('draft', { complete: true }); S.limit = true; break;
      case 'cerrado': scQuote('approved', { complete: true }); S.panelOpen = false; S.unread = 1; break;
      case 'critico': S.module = 'proyectos'; S.panelOpen = false; ensureThread(); syncHost(); triggerCritical(); return;
      default: S.module = 'inicio';
    }
    ensureThread(); S.forceBottom = true; syncHost(); render();
  }
  function syncHost() { if (H().show) H().show(S.module); }

  /* ---------- Lanzador flotante arrastrable ---------- */
  var fabDragEnd = 0, fabPos = { side: 'right', y: null };
  function placeFab() {
    var fab = $('#omniaBtn'), gutter = 'max(20px, calc(env(safe-area-inset-' + fabPos.side + ', 0px) + 12px))';
    fab.dataset.side = fabPos.side;
    fab.style.left = fabPos.side === 'left' ? (sideEdge() + 20) + 'px' : 'auto';
    fab.style.right = fabPos.side === 'right' ? gutter : 'auto';
    if (fabPos.y == null) { fab.style.top = 'auto'; fab.style.bottom = ''; return; }
    var top = Math.min(Math.max(fabPos.y * window.innerHeight, 64), window.innerHeight - 80);
    fab.style.top = top + 'px'; fab.style.bottom = 'auto';
  }
  /* Borde derecho del menú izquierdo: el lanzador nunca entra en esa zona. */
  function sideEdge() { var s = $('#side'); return !s || window.innerWidth <= 900 ? 0 : Math.max(0, s.getBoundingClientRect().right); }
  function initFab() {
    var fab = $('#omniaBtn'), drag = null;
    try { var saved = JSON.parse(localStorage.getItem('omnia.fab') || 'null'); if (saved && saved.side) fabPos = saved; } catch (e) { /* sin almacenamiento */ }
    placeFab();
    fab.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, moved: false, r: fab.getBoundingClientRect(), id: e.pointerId };
      try { fab.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    });
    fab.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) { if (Math.abs(dx) + Math.abs(dy) < 6) return; drag.moved = true; fab.classList.add('dragging'); }
      fab.style.left = Math.min(Math.max(drag.r.left + dx, sideEdge() + 8), window.innerWidth - drag.r.width - 4) + 'px';
      fab.style.top = Math.min(Math.max(drag.r.top + dy, 4), window.innerHeight - drag.r.height - 4) + 'px';
      fab.style.right = 'auto'; fab.style.bottom = 'auto';
    });
    var end = function () {
      if (!drag) return;
      var moved = drag.moved; drag = null; fab.classList.remove('dragging');
      if (!moved) return;
      var r = fab.getBoundingClientRect();
      var mid = (sideEdge() + window.innerWidth) / 2;
      fabPos = { side: r.left + r.width / 2 < mid ? 'left' : 'right', y: r.top / window.innerHeight };
      try { localStorage.setItem('omnia.fab', JSON.stringify(fabPos)); } catch (e) { /* sin almacenamiento */ }
      placeFab(); fabDragEnd = Date.now();
    };
    /* Menu contextual: clic derecho o mantener presionado */
    var press = null;
    fab.addEventListener('contextmenu', function (e) { e.preventDefault(); openFabMenu(); });
    fab.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') press = setTimeout(function () { press = null; if (!drag || !drag.moved) { drag = null; fabDragEnd = Date.now(); openFabMenu(); } }, 550); });
    ['pointerup', 'pointercancel', 'pointermove'].forEach(function (ev) { fab.addEventListener(ev, function (e) { if (press && (ev !== 'pointermove' || (drag && drag.moved))) { clearTimeout(press); press = null; } }); });
    fab.addEventListener('pointerup', end);
    fab.addEventListener('pointercancel', end);
    window.addEventListener('resize', placeFab);
  }

  function openFabMenu() {
    var m = $('#fabMenu'), r = $('#omniaBtn').getBoundingClientRect();
    m.hidden = false;
    var left = fabPos.side === 'left' ? r.left : r.right - m.offsetWidth;
    m.style.left = Math.max(8, left) + 'px';
    m.style.top = Math.max(8, r.top - m.offsetHeight - 8) + 'px';
    m.querySelector('button').focus();
  }
  function closeFabMenu() { $('#fabMenu').hidden = true; }
  function setDrawer(open) { if (!open && H().closeNav) H().closeNav(); }

  /* ---------- Events ---------- */
  function findMsg(id) {
    for (var i = 0; i < S.threads.length; i++) for (var j = 0; j < S.threads[i].messages.length; j++) if (S.threads[i].messages[j].id === id) return { t: S.threads[i], m: S.threads[i].messages[j] };
    return null;
  }
  function openPanel() { S.panelOpen = true; S.unread = 0; S.toast = false; if (!role().chat) markSeen(); /* el aviso critico sigue en la campana del panel */ render(); setTimeout(function () { var i = $('#input'); if (i && !i.disabled && window.innerWidth >= 768) i.focus(); }, 30); }
  function closePanel() { S.panelOpen = false; render(); (S.hidden ? $('#sideOmnia') : $('#omniaBtn')).focus(); }

  function bind() {
    if (window.OmniaOrb) fabOrb = new window.OmniaOrb($('#fabOrb'));
    initFab();
    $('#omniaBtn').addEventListener('click', function () { if (Date.now() - fabDragEnd < 350) return; if (S.panelOpen) closePanel(); else openPanel(); });
    $('#demoBtn').addEventListener('click', function () { if (!S) return; S.demoOpen = !S.demoOpen; renderDemo(); });
    $('#sideOmnia').addEventListener('click', function () {
      setDrawer(false);
      if (S.hidden) { setHidden(false); openPanel(); } else if (S.panelOpen) closePanel(); else openPanel();
    });
    $('#fabMenu').addEventListener('click', function (e) {
      var b = e.target.closest('[data-fm]'); if (!b) return; closeFabMenu();
      if (b.dataset.fm === 'open') openPanel();
      if (b.dataset.fm === 'hide') { setHidden(true); render(); $('#sideOmnia').focus(); }
    });
    document.addEventListener('pointerdown', function (e) { if (!$('#fabMenu').hidden && !e.target.closest('#fabMenu')) closeFabMenu(); });

    $('#pHead').addEventListener('click', function (e) {
      var b = e.target.closest('[data-hact]'); if (!b) return;
      var a = b.dataset.hact;
      if (a === 'close') return closePanel();
      if (a === 'hide') { setHidden(true); S.panelOpen = false; render(); $('#sideOmnia').focus(); return; }
      if (a === 'new') { if (S.gen) stopGen(); newThread(moduleCtx()); S.view = 'chat'; render(); $('#input').focus(); }
      if (a === 'history') { S.view = S.view === 'history' ? 'chat' : 'history'; render(); if (S.view === 'history') $('#histSearch').focus(); }
      if (a === 'alerts') { S.view = S.view === 'alerts' ? 'chat' : 'alerts'; if (S.view === 'alerts') markSeen(); render(); }
    });

    var body = $('#pBody');
    body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = b.dataset.act, t = thread(), q = b.dataset.q ? S.quotes[b.dataset.q] : null, f, found;
      switch (a) {
        case 'sug': sendMessage(b.dataset.val); break;
        case 'as-go': case 'as-btn': assistAct(b.dataset.mid, b.dataset.val); break;
        case 'as-nav': go(b.dataset.val); closeOnMobile(); render(); break;
        case 'free': newThread(null); render(); break;
        case 'reconnect': S.online = true; render(); break;
        case 'open-ctx': var c = ctxInfo(t.ctx); closeOnMobile();
          if (c.kind === 'quote') go('cotizaciones', c.id); else if (c.kind === 'project') go('proyectos', c.id); else go('reservas'); S.activeId = t.id; render(); break;
        case 'collect-confirm': confirmCollect(t); break;
        case 'q-save': saveQuote(q); S.forceBottom = true; render(); break;
        case 'q-edit': case 'go-quote': closeOnMobile(); go('cotizaciones', q.id); break;
        case 'q-send': q.confirmOpen = true; refreshQuote(q); var cb = $('[data-quote="' + q.id + '"] [data-act="send-confirm"]'); if (cb) cb.focus(); break;
        case 'send-cancel': q.confirmOpen = false; refreshQuote(q); break;
        case 'send-confirm': sendQuote(q, S.threads.filter(function (x) { return x.id === q.threadId; })[0]); S.forceBottom = true; render(); break;
        case 'focus-quote': var card = $('[data-quote="' + q.id + '"]'); if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); var inp = card.querySelector('input:not([disabled])'); if (inp) inp.focus({ preventScroll: true }); } break;
        case 'retry': found = findMsg(b.dataset.mid); if (found) { var sp = found.m.spec; found.t.messages.splice(found.t.messages.indexOf(found.m), 1); respond(found.t, sp); } break;
        case 'fb-up': found = findMsg(b.dataset.mid); found.m.fb = found.m.fb === 'up' ? null : 'up'; renderBody(); break;
        case 'fb-down': found = findMsg(b.dataset.mid); found.m.fb = found.m.fb === 'down-open' ? null : 'down-open'; renderBody(); break;
        case 'fb-reason': found = findMsg(b.dataset.mid); found.m.fbReason = b.dataset.val; renderBody(); break;
        case 'fb-cancel': found = findMsg(b.dataset.mid); found.m.fb = null; found.m.fbReason = ''; renderBody(); break;
        case 'fb-send': found = findMsg(b.dataset.mid); found.m.fb = 'down'; renderBody(); break;
        case 'hist-open': if (S.gen) stopGen(); S.activeId = b.dataset.id; S.view = 'chat'; S.forceBottom = true; render(); break;
        case 'explain': S.explainOpen = b.dataset.id; S.explainDraft = ''; S.explainCausas = []; S.explainErr = ''; renderBody(); var fc = $('[data-act="explain-causa"]'); if (fc) fc.focus(); break;
        case 'explain-causa': var ci = S.explainCausas.indexOf(b.dataset.val); if (ci >= 0) S.explainCausas.splice(ci, 1); else S.explainCausas.push(b.dataset.val); b.setAttribute('aria-pressed', String(ci < 0)); clearExplainErr(); break;
        case 'explain-cancel': S.explainOpen = null; S.explainErr = ''; renderBody(); break;
        case 'explain-save':
          var al = segList().filter(function (x) { return x.key === b.dataset.id; })[0];
          if (!al || !SEG().puedeExplicar(al, HOST_USER.role, HOST_USER.name)) { S.explainErr = 'Solo el líder del proyecto o Dirección registran explicaciones.'; renderBody(); break; }
          var er = SEG().registrar(al, S.explainCausas.slice(), S.explainDraft.trim(), role().user);
          if (er) { S.explainErr = er; renderBody(); break; }
          S.explainOpen = null; S.explainErr = ''; renderBody(); if (H().toast) H().toast('Explicación registrada en la Bitácora de ' + al.code); break;
        case 'sug-go': closeOnMobile(); if (H().show) H().show(b.dataset.val); render(); break;
        case 'seg-filter': S.alertFilter = b.dataset.val; renderBody(); break;
        case 'seg-open': closeOnMobile(); if (H().show) H().show('proyectos'); render(); break;
        case 'assist': closeOnMobile(); render(); break;
      }
    });
    body.addEventListener('input', function (e) {
      var el = e.target, t = thread(), q;
      if (el.dataset.h != null) {
        q = S.quotes[el.dataset.q]; var k = el.dataset.h.split('|'), v = Math.max(0, parseInt(el.value, 10) || 0);
        q.phases[+k[0]].activities[+k[1]].hours[k[2]] = v; q.changed[el.dataset.h] = true; q.dirty = true; q.confirmOpen = false;
        el.parentNode.classList.add('changed'); refreshQuote(q);
      } else if (el.hasAttribute('data-blk')) {
        q = S.quotes[el.dataset.q]; q.block.hours = Math.max(0, parseInt(el.value, 10) || 0); q.changed.blk = true; q.dirty = true; q.confirmOpen = false; el.parentNode.classList.add('changed'); refreshQuote(q);
      } else if (el.hasAttribute('data-supply')) {
        q = S.quotes[el.dataset.q]; var digits = el.value.replace(/\D/g, ''); if (digits !== el.value) el.value = digits;
        q.supply.value = digits ? parseInt(digits, 10) : null; q.dirty = true; q.confirmOpen = false; refreshQuote(q);
      } else if (el.dataset.f === 'scope') { t.flow.form.scope = el.value; updateCollect(t); }
      else if (el.dataset.fbtext) { findMsg(el.dataset.fbtext).m.fbText = el.value; }
      else if (el.id === 'histSearch') { S.q = el.value; var l = $('[data-d="hlist"]'); if (l) l.innerHTML = historyList(S.q.trim().toLowerCase()); }
      else if (el.id === 'explainText') { S.explainDraft = el.value; clearExplainErr(); }
    });
    body.addEventListener('change', function (e) {
      var el = e.target, t = thread(); if (!el.dataset.f || !t || !t.flow) return;
      var f = t.flow.form, k = el.dataset.f;
      if (k === 'client') { f.client = el.value; var cl = D.clients.filter(function (c) { return c.id === f.client; })[0]; f.plant = cl && cl.plants.length === 1 ? cl.plants[0] : ''; }
      else if (k === 'plant') f.plant = el.value;
      else if (k === 'unit') { f.unit = el.value; f.unitInferred = false; }
      else if (k.indexOf('on:') === 0) f.comps[k.slice(3)].on = el.checked;
      else if (k.indexOf('mod:') === 0) f.comps[k.slice(4)].mod = el.value;
      else if (k.indexOf('ext:') === 0) f.extract[+k.slice(4)].on = el.checked;
      else return;
      renderBody();
    });
    body.addEventListener('toggle', function (e) {
      var d = e.target; if (!d.matches || !d.matches('details.ph')) return;
      var card = d.closest('[data-quote]'); if (card) S.quotes[card.dataset.quote].open[d.dataset.pi] = d.open;
    }, true);

    var input = $('#input');
    input.addEventListener('input', function () { autosize(); renderComposer(); syncPanelOrb(); });
    input.addEventListener('blur', syncPanelOrb);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!S.generating) sendMessage(); }
    });
    $('#send').addEventListener('click', function () { if (S.generating) stopGen('stopped'); else sendMessage(); });
    $('#attFile').addEventListener('click', function () { $('#fileIn').click(); });
    $('#attImg').addEventListener('click', function () { $('#imgIn').click(); });
    $('#fileIn').addEventListener('change', function (e) { Array.prototype.forEach.call(e.target.files, function (f) { addFile(f, 'file'); }); e.target.value = ''; });
    $('#imgIn').addEventListener('change', function (e) { Array.prototype.forEach.call(e.target.files, function (f) { addFile(f, 'image'); }); e.target.value = ''; });
    $('#atts').addEventListener('click', function (e) {
      var x = e.target.closest('[data-attx]'); if (!x) return;
      S.atts = S.atts.filter(function (a) { return a.id !== x.dataset.attx; }); renderComposer(); input.focus();
    });
    input.addEventListener('paste', function (e) {
      var items = (e.clipboardData && e.clipboardData.files) || []; if (!items.length) return;
      e.preventDefault(); Array.prototype.forEach.call(items, function (f) { addFile(f, /^image\//.test(f.type) ? 'image' : 'file'); });
    });

    $('#oToast').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tact]'); if (!b) return;
      S.toast = false;
      if (b.dataset.tact === 'view') { S.panelOpen = true; S.view = 'alerts'; markSeen(); S.unread = 0; }
      render();
    });

    var demo = $('#demo');
    demo.addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 'dScenario') return applyScenario(e.target.value);
      if (id === 'dOnline') { S.online = e.target.checked; render(); }
      if (id === 'dLimit') { S.limit = e.target.checked; render(); }
      if (id === 'dCut') cutNext = e.target.checked;
    });
    demo.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dact]'); if (!b) return;
      var a = b.dataset.dact, pend = Object.keys(S.quotes).map(function (k) { return S.quotes[k]; }).filter(function (q) { return q.status === 'pending'; })[0];
      if (a === 'close') { S.demoOpen = false; renderDemo(); $('#demoBtn').focus(); }
      if (a === 'approve' && pend) { decide(pend, 'approved', 'Gonzalo Perdomo', '', true); render(); }
      if (a === 'reject' && pend) { decide(pend, 'rejected', 'Gonzalo Perdomo', D.rejectReason, true); render(); }
      if (a === 'critical') triggerCritical();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !ACTIVE) return;
      if (!$('#fabMenu').hidden) { closeFabMenu(); $('#omniaBtn').focus(); return; }
      if (H().isNavOpen && H().isNavOpen()) { setDrawer(false); return; }
      if (S.demoOpen) { S.demoOpen = false; renderDemo(); return; }
      if (S.panelOpen) closePanel();
    });

    /* «Cortar la próxima respuesta» simula un corte de red a mitad de la generación. */
    var origRespond = respond;
    respond = function (t, spec) {
      origRespond(t, spec);
      if (cutNext) { cutNext = false; var cb = $('#dCut'); if (cb) cb.checked = false; setTimeout(function () { stopGen('cut'); }, 1000); }
    };
  }

  bind();
  if (window.OmniaSeguimiento) window.OmniaSeguimiento.onChange(function () { if (!S || !ACTIVE) return; syncAlerts(false); if ((S.view === 'alerts' || !role().chat) && S.panelOpen) markSeen(); render(); });

  /* API para el ecosistema */
  window.Omnia = {
    start: function (user) {
      HOST_USER = user; ACTIVE = true;
      var mod = S ? S.module : 'inicio';
      if (S && S.gen) { clearTimeout(S.gen.timer); clearInterval(S.gen.timer); }
      S = freshState(user.role); curScenario = 'inicial';
      S.panelOpen = false; setMod(mod); syncAlerts(true); placeFab(); render();
    },
    stop: function () {
      ACTIVE = false; HOST_USER = null;
      if (S) { if (S.gen) stopGen(); S.panelOpen = false; S.toast = false; S.demoOpen = false; }
      closeFabMenu(); render();
      if (fabOrb) fabOrb.setVisible(false); if (headOrb) headOrb.setVisible(false);
      $('#omniaBtn').hidden = true;
    },
    setModule: function (mod) { if (!S) return; setMod(mod); render(); },
    /* El modulo informa el registro abierto (rec = { id, label, step }) o null si esta en la lista. */
    setRecord: function (mod, rec) { setRecord(mod, rec); },
    /* Boton de IA de un modulo: abre el panel y responde con una tarjeta de hallazgos (IA simulada). */
    assist: function (o) { return assist(o); },
    ready: function () { return !!(S && ACTIVE && role().chat); },
    /* El modulo registra como responde omnIA a lo que se escribe sobre su registro: fn(texto) devuelve lo mismo que assist() o null. */
    onAsk: function (mod, fn, sugs) { MOD_ASK[mod] = fn; if (sugs) MOD_SUGS[mod] = sugs; if (S && S.module === mod && ACTIVE) render(); },
    relayout: function () { placeFab(); },
    toggleDemo: function () { if (!S) return; S.demoOpen = !S.demoOpen; renderDemo(); }
  };
})();
