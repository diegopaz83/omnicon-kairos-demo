/* Odoo simulado (datos 100 % ficticios). Fuente unica de todo lo que en produccion es de Odoo:
   clientes y sitios, clusters, regionales, monedas, TRM diaria, cuentas analiticas (= CECO),
   pedidos de venta (lo vendido) y facturas (lo facturado). Kairos solo lee.
   Interfaz: OdooSim.searchRead(model, domain, opts) imita search_read de JSON-RPC para poder cambiarlo
   por la API real sin tocar a quien lo usa. Todo dato que sale de aqui se marca «Odoo · simulado».
   Generacion determinista: mismo resultado en cada carga. */
(function () {
  'use strict';
  var HOY = '2026-10-23';

  /* ---------- Maestros ---------- */
  var clusters = [
    { id: 'LATAM', name: 'LATAM', currency: 'COP' },
    { id: 'NA', name: 'North America', currency: 'USD' }
  ];
  var regionales = [
    { id: 'Col_North', cluster: 'LATAM' }, { id: 'Col_Center', cluster: 'LATAM' }, { id: 'Col_Andean East', cluster: 'LATAM' },
    { id: 'Col_West', cluster: 'LATAM' }, { id: 'Mx_Queretaro', cluster: 'LATAM' },
    { id: 'US_South', cluster: 'NA' }, { id: 'Corporate Program', cluster: 'NA' }
  ];
  var currencies = ['COP', 'USD', 'EUR'];

  /* res.partner: el pais del cliente define el cluster; los sitios no. */
  function pt(id, name, country, cluster, corp, sites) { return { id: id, name: name, country: country, cluster: cluster, corp: corp, sites: sites }; }
  var partners = [
    pt('RP-ECOPETROL', 'Ecopetrol S.A.', 'Colombia', 'LATAM', 'Grupo Ecopetrol', [['Campo Florena', 'CO'], ['Cusiana', 'CO'], ['Refinería Cartagena', 'CO'], ['Terminal Altamira', 'MX']]),
    pt('RP-GEOPARK', 'GeoPark Colombia S.A.S.', 'Colombia', 'LATAM', null, [['Bloque Llanos 34', 'CO']]),
    pt('RP-CELSIA', 'Celsia Colombia S.A. E.S.P.', 'Colombia', 'LATAM', null, [['Planta Yumbo', 'CO'], ['Central Salvajina', 'CO']]),
    pt('RP-DUQUESA', 'Duquesa S.A.S. BIC', 'Colombia', 'LATAM', null, [['Planta Cali', 'CO']]),
    pt('RP-SUCROAL', 'Sucroal S.A.', 'Colombia', 'LATAM', null, [['Planta Palmira', 'CO']]),
    pt('RP-CORTEVA', 'Corteva Agriscience de Colombia', 'Colombia', 'LATAM', 'Corteva', [['Planta Espinal', 'CO']]),
    pt('RP-KENVUE-CO', 'Kenvue Colombia S.A.', 'Colombia', 'LATAM', 'Kenvue', [['Planta Yumbo', 'CO']]),
    pt('RP-ROCKWELL-CO', 'Rockwell Automation Colombia', 'Colombia', 'LATAM', null, [['Base Manizales', 'CO']]),
    pt('RP-TEAMFOODS', 'Team Foods Colombia S.A.', 'Colombia', 'LATAM', null, [['Planta Bogotá', 'CO'], ['Planta Barranquilla', 'CO']]),
    pt('RP-TERMOEMCALI', 'Termoemcali I S.A. E.S.P.', 'Colombia', 'LATAM', null, [['Planta Cali', 'CO']]),
    pt('RP-ALTERNEGY', 'Alternegy S.A.', 'Panamá', 'LATAM', null, [['Central Prudencia', 'PA']]),
    pt('RP-NESTLE-EC', 'Nestlé Ecuador S.A.', 'Ecuador', 'LATAM', null, [['Planta Guayaquil', 'EC']]),
    pt('RP-ENVASES-BAJIO', 'Envases del Bajío S.A. de C.V.', 'México', 'LATAM', null, [['Planta Querétaro', 'MX']]),
    pt('RP-BARRY', 'Barry Callebaut (cuenta en EE. UU.)', 'Estados Unidos', 'NA', 'Barry Callebaut', [['Pasir Gudang', 'MY'], ['Itabuna', 'BR'], ['Toluca', 'MX']]),
    pt('RP-STEPAN', 'Stepan Company', 'Estados Unidos', 'NA', null, [['Millsdale', 'US'], ['Winder', 'US']]),
    pt('RP-KENVUE-US', 'Kenvue Inc.', 'Estados Unidos', 'NA', 'Kenvue', [['Helsingborg', 'SE']])
  ];

  /* ---------- Cuentas analiticas (CECO) con lo vendido y el plan de facturacion ----------
     sold / inv: { ENG, EQ, EXP } en la moneda de la cuenta. bill: [mes desde, mes hasta] de facturas mensuales. */
  function ac(code, name, partner, site, regional, cur, sold, inv, bill, so, quote) {
    return { code: code, name: name, partner: partner, site: site, regional: regional, currency: cur, sold: sold, inv: inv, bill: bill, so: so, quote: quote };
  }
  var accounts = [
    ac('30202004200', 'Act. estaciones cliente Florena', 'RP-ECOPETROL', 'Campo Florena', 'Col_Andean East', 'COP', { ENG: 412500000, EXP: 24000000 }, { ENG: 165000000, EXP: 9600000 }, ['2026-07', '2026-10'], 'S04112', 'COT-12198-F4R1-2'),
    ac('30202004201', 'Instrumentación de estaciones', 'RP-ECOPETROL', 'Campo Florena', 'Col_Andean East', 'COP', { EQ: 37400000 }, {}, null, 'S04288', 'COT-12371-F4R1-1'),
    ac('30204001500', 'Actualización del control de la estación Cusiana', 'RP-ECOPETROL', 'Cusiana', 'Col_Andean East', 'COP', { ENG: 268000000, EXP: 15000000 }, { ENG: 53600000 }, ['2026-09', '2026-10'], 'S04215', 'COT-12290-CU5A-1'),
    ac('30029800000', 'Assessment infraestructura SCADA', 'RP-GEOPARK', 'Bloque Llanos 34', 'Col_Andean East', 'COP', { ENG: 196000000 }, { ENG: 98000000 }, ['2026-08', '2026-10'], 'S04190', 'COT-12260-GP34-1'),
    ac('30701006700', 'Modernización red de control Refinería Cartagena', 'RP-ECOPETROL', 'Refinería Cartagena', 'Col_North', 'COP', { ENG: 185550800 }, {}, null, 'S04402', 'COT-12455-RC07-1'),
    ac('30701006500', 'Anexo 194 soporte base Manizales RA 2026', 'RP-ROCKWELL-CO', 'Base Manizales', 'Col_North', 'COP', { ENG: 42000000 }, {}, null, 'S04377', 'COT-12433-MZ94-1'),
    ac('30702001100', 'Soporte DCS planta Barranquilla', 'RP-TEAMFOODS', 'Planta Barranquilla', 'Col_North', 'COP', { ENG: 96000000 }, { ENG: 64000000 }, ['2026-02', '2026-10'], 'S03921', 'COT-11950-TB11-1'),
    ac('30703002400', 'Integración MES línea 4 Barranquilla', 'RP-TEAMFOODS', 'Planta Barranquilla', 'Col_North', 'COP', { ENG: 520000000, EQ: 145000000 }, { ENG: 156000000 }, ['2026-06', '2026-10'], 'S04066', 'COT-12102-TB24-2'),
    ac('30102003300', 'Bolsa de soporte OT Bogotá 2026', 'RP-TEAMFOODS', 'Planta Bogotá', 'Col_Center', 'COP', { ENG: 120000000 }, { ENG: 90000000 }, ['2026-01', '2026-10'], 'S03890', 'COT-11902-TBG3-1'),
    ac('30103004100', 'Migración SCADA planta Bogotá', 'RP-TEAMFOODS', 'Planta Bogotá', 'Col_Center', 'COP', { ENG: 610000000, EQ: 88000000 }, { ENG: 122000000, EQ: 88000000 }, ['2026-07', '2026-10'], 'S04140', 'COT-12187-TBG4-1'),
    ac('30104005200', 'Soporte remoto Central Prudencia', 'RP-ALTERNEGY', 'Central Prudencia', 'Col_Center', 'USD', { ENG: 48000 }, { ENG: 28000 }, ['2026-03', '2026-10'], 'S03958', 'COT-11977-AP52-1'),
    ac('30401007200', 'Contrato mtto plataforma Rockwell 2026', 'RP-CELSIA', 'Planta Yumbo', 'Col_West', 'COP', { ENG: 168000000 }, { ENG: 120400000 }, ['2026-03', '2026-10'], 'S03977', 'COT-11988-CY72-1'),
    ac('30314000800', 'Soporte Central Salvajina', 'RP-CELSIA', 'Central Salvajina', 'Col_West', 'COP', { ENG: 10000000 }, { ENG: 10500000 }, ['2026-04', '2026-09'], 'S04011', 'COT-12020-CS08-1'),
    ac('30301053200', 'Bolsa de horas de ingeniería 2026 · 40 días', 'RP-DUQUESA', 'Planta Cali', 'Col_West', 'COP', { ENG: 105000000 }, { ENG: 78750000 }, ['2026-01', '2026-10'], 'S03902', 'COT-11910-DQ32-1'),
    ac('30311055800', 'Programación planta remoción de sulfatos', 'RP-SUCROAL', 'Planta Palmira', 'Col_West', 'COP', { ENG: 154000000, EXP: 9000000 }, { ENG: 23100000 }, ['2026-10', '2026-10'], 'S04233', 'COT-12301-SP58-1'),
    ac('30311054100', 'Contrato de mtto enero a diciembre 2026', 'RP-CORTEVA', 'Planta Espinal', 'Col_West', 'COP', { ENG: 91000000 }, { ENG: 45500000 }, ['2026-04', '2026-10'], 'S04013', 'COT-12024-CE41-1'),
    ac('30032400000', 'Holding continuo TA3', 'RP-KENVUE-CO', 'Planta Yumbo', 'Col_West', 'COP', { ENG: 238000000, EQ: 64000000 }, {}, null, 'S04297', 'COT-12360-KY24-1'),
    ac('30312001900', 'SOPORTE PARA MEJORAMIENTO AUTOCLAVES', 'RP-KENVUE-CO', 'Planta Yumbo', 'Col_West', 'COP', { ENG: 11780000 }, { ENG: 7892600 }, ['2026-06', '2026-10'], 'S04051', 'COT-12474-L5Y8-1'),
    ac('30311053600', 'IMPLEMNT DE INFRAESTRUCTURA VIRTUALIZADA', 'RP-TERMOEMCALI', 'Planta Cali', 'Col_West', 'COP', { EQ: 10904000 }, {}, null, 'S04260', 'COT-12333-TC36-1'),
    ac('30313002700', 'Soporte en sitio planta Cali', 'RP-TERMOEMCALI', 'Planta Cali', 'Col_West', 'COP', { ENG: 20000000, EXP: 3000000 }, { ENG: 5000000, EXP: 1000000 }, ['2026-08', '2026-10'], 'S04129', 'COT-12170-TC27-1'),
    ac('30315001900', 'Optimización PLC línea de leches', 'RP-NESTLE-EC', 'Planta Guayaquil', 'Col_West', 'USD', { ENG: 86000, EXP: 6500 }, { ENG: 34400 }, ['2026-08', '2026-10'], 'S04117', 'COT-12160-NG19-1'),
    ac('30801000300', 'Automatización línea de envasado Querétaro', 'RP-ENVASES-BAJIO', 'Planta Querétaro', 'Mx_Queretaro', 'USD', { ENG: 13288 }, {}, null, 'S04390', 'COT-12448-EQ03-1'),
    ac('30802001200', 'Soporte de paros Terminal Altamira', 'RP-ECOPETROL', 'Terminal Altamira', 'Mx_Queretaro', 'USD', { ENG: 36000 }, { ENG: 21600 }, ['2026-05', '2026-10'], 'S04038', 'COT-12062-TA12-1'),
    ac('30027700000', 'BC PLC programming for Layer 3 Pasir', 'RP-BARRY', 'Pasir Gudang', 'Corporate Program', 'USD', { ENG: 372000, EXP: 28000 }, { ENG: 148800, EXP: 9000 }, ['2026-06', '2026-10'], 'S04095', 'COT-12131-PG77-2'),
    ac('30014700000', 'Change Request 1: Pasir Gudang', 'RP-BARRY', 'Pasir Gudang', 'Corporate Program', 'USD', { ENG: 114000 }, { ENG: 114000 }, ['2026-01', '2026-05'], 'S03811', 'COT-11820-PG47-1'),
    ac('30301044600', 'BC Smart Factory PM for Itabuna Brazil', 'RP-BARRY', 'Itabuna', 'Corporate Program', 'USD', { ENG: 48000 }, { ENG: 48000 }, ['2026-01', '2026-02'], 'S03760', 'COT-11761-IB46-1'),
    ac('30009400000', 'Toluca MES project · solid lines scope', 'RP-BARRY', 'Toluca', 'Corporate Program', 'USD', { ENG: 103500 }, { ENG: 103500 }, ['2026-04', '2026-10'], 'S04026', 'COT-12041-TL94-1'),
    ac('30905000600', 'Packaging line upgrade Helsingborg', 'RP-KENVUE-US', 'Helsingborg', 'Corporate Program', 'EUR', { ENG: 40000, EXP: 5000 }, { ENG: 10000 }, ['2026-09', '2026-10'], 'S04181', 'COT-12244-KH06-1'),
    ac('30901001400', 'Remote support Winder', 'RP-STEPAN', 'Winder', 'US_South', 'USD', { ENG: 2500 }, { ENG: 1000 }, ['2026-09', '2026-10'], 'S04172', 'COT-12230-SW14-1'),
    ac('30902002300', 'DCS migration Millsdale', 'RP-STEPAN', 'Millsdale', 'US_South', 'USD', { ENG: 210000, EXP: 18000 }, { ENG: 42000 }, ['2026-09', '2026-10'], 'S04176', 'COT-12236-SM23-1'),
    ac('30903003100', 'Spare parts Millsdale', 'RP-STEPAN', 'Millsdale', 'US_South', 'USD', { EQ: 26500 }, {}, null, 'S04251', 'COT-12318-SM31-1')
  ];

  /* Casos especiales para probar inconsistencias y notas credito. */
  var SPECIAL = {
    creditNote: { code: '30401007200', date: '2026-08-28', categ: 'Engineering', amount: -8400000, ref: 'Ajuste por horas no prestadas en julio' },
    unclassified: { code: '30102003300', date: '2026-09-21', amount: 2400000, product: 'Servicio sin categoría' }
  };

  /* ---------- Utilidades ---------- */
  var CATEG = { ENG: 'Engineering', EQ: 'Equipment', EXP: 'Viatics' };
  var PRODUCT = { Engineering: 'Servicios de ingeniería', Equipment: 'Equipos y licencias', Viatics: 'Viáticos', Unclassified: 'Servicio sin categoría' };
  function dec(cur) { return cur === 'COP' ? 0 : 2; }
  function round(v, cur) { var f = Math.pow(10, dec(cur)); return Math.round(v * f) / f; }
  function months(a, b) { var r = [], y = +a.slice(0, 4), m = +a.slice(5, 7), Y = +b.slice(0, 4), M = +b.slice(5, 7); while (y < Y || (y === Y && m <= M)) { r.push(y + '-' + String(m).padStart(2, '0')); m += 1; if (m > 12) { m = 1; y += 1; } } return r; }
  function addDays(s, n) { return new Date(Date.parse(s + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10); }

  /* ---------- res.currency.rate: TRM diaria determinista desde 2026-01-01 hasta HOY ----------
     USD: COP por 1 USD (3.900–4.200). EUR: USD por 1 EUR (1,05–1,15). */
  var rates = [];
  (function () {
    var d = '2026-01-01', i = 0;
    while (d <= HOY) {
      var usd = 4050 + 110 * Math.sin(2 * Math.PI * i / 97) + 35 * Math.sin(i / 11);
      var eur = 1.10 + 0.04 * Math.sin(i / 53) + 0.008 * Math.sin(i / 7);
      rates.push({ id: 'RT-USD-' + d, currency: 'USD', name: d, rate: Math.round(usd * 100) / 100, base: 'COP' });
      rates.push({ id: 'RT-EUR-' + d, currency: 'EUR', name: d, rate: Math.round(eur * 10000) / 10000, base: 'USD' });
      d = addDays(d, 1); i += 1;
    }
  })();
  var rateIdx = {}; rates.forEach(function (r) { rateIdx[r.currency + '|' + r.name] = r.rate; });
  function rateOn(cur, date) {
    var d = date > HOY ? HOY : date < '2026-01-01' ? '2026-01-01' : date;
    return rateIdx[cur + '|' + d];
  }
  /* Convierte un monto entre COP, USD y EUR con la TRM de Odoo de esa fecha. */
  function convert(amount, from, to, date) {
    if (from === to) return amount;
    var u = rateOn('USD', date), e = rateOn('EUR', date), usd;
    usd = from === 'USD' ? amount : from === 'COP' ? amount / u : amount * e;
    return to === 'USD' ? usd : to === 'COP' ? usd * u : usd / e;
  }

  /* ---------- Modelos con forma de Odoo ---------- */
  var M = {
    'res.partner': partners.map(function (p) { return { id: p.id, name: p.name, country_id: p.country, x_cluster: p.cluster, x_corporation: p.corp, child_ids: p.sites.map(function (s) { return { name: s[0], country_code: s[1] }; }) }; }),
    'x.cluster': clusters,
    'x.regional': regionales,
    'res.currency': currencies.map(function (c) { return { id: c, name: c, decimal_places: dec(c) }; }),
    'res.currency.rate': rates,
    'account.analytic.account': [],
    'sale.order': [],
    'sale.order.line': [],
    'account.move': [],
    'account.move.line': []
  };
  var invSeq = 14000, lineSeq = 1;
  var moves = [];
  accounts.forEach(function (a, ix) {
    var dist = {}; dist[a.code] = 100;
    M['account.analytic.account'].push({ id: a.code, code: a.code, name: a.name, partner_id: a.partner, currency_id: a.currency, x_regional: a.regional,
      x_cluster: regionales.filter(function (r) { return r.id === a.regional; })[0].cluster, x_site: a.site, active: true });
    var kc = window.KairosMaestros && window.KairosMaestros.ceco(a.code);
    var dOrder = kc ? addDays(kc.inicio, -21) : '2026-01-05';
    M['sale.order'].push({ id: a.so, name: a.so, origin: a.quote, client_order_ref: 'PO-' + (4500120000 + ix * 137), partner_id: a.partner, currency_id: a.currency, state: 'sale', date_order: dOrder, analytic_account_id: a.code });
    Object.keys(a.sold).forEach(function (k) {
      M['sale.order.line'].push({ id: 'SOL-' + (lineSeq++), order_id: a.so, product_id: PRODUCT[CATEG[k]], categ: CATEG[k], price_subtotal: a.sold[k], analytic_distribution: dist });
    });
    if (!a.bill) return;
    var ms = months(a.bill[0], a.bill[1]);
    var parts = {};
    Object.keys(a.inv).forEach(function (k) {
      var tot = a.inv[k], each = round(tot / ms.length, a.currency), acc = 0;
      parts[k] = ms.map(function (m, i) { var v = i === ms.length - 1 ? round(tot - acc, a.currency) : each; acc = round(acc + v, a.currency); return v; });
    });
    ms.forEach(function (m, i) {
      var date = m + (m === HOY.slice(0, 7) ? '-20' : '-25');
      var lines = Object.keys(parts).map(function (k) { return { categ: CATEG[k], amount: parts[k][i] }; }).filter(function (l) { return l.amount; });
      if (lines.length) moves.push({ code: a.code, partner: a.partner, currency: a.currency, date: date, type: 'out_invoice', lines: lines, dist: dist });
    });
  });
  /* Nota credito y linea sin categoria */
  (function () {
    var a = accounts.filter(function (x) { return x.code === SPECIAL.creditNote.code; })[0], d = {}; d[a.code] = 100;
    moves.push({ code: a.code, partner: a.partner, currency: a.currency, date: SPECIAL.creditNote.date, type: 'out_refund', ref: SPECIAL.creditNote.ref, lines: [{ categ: SPECIAL.creditNote.categ, amount: SPECIAL.creditNote.amount }], dist: d });
    var b = accounts.filter(function (x) { return x.code === SPECIAL.unclassified.code; })[0], e = {}; e[b.code] = 100;
    moves.push({ code: b.code, partner: b.partner, currency: b.currency, date: SPECIAL.unclassified.date, type: 'out_invoice', lines: [{ categ: 'Unclassified', amount: SPECIAL.unclassified.amount }], dist: e });
  })();
  moves.sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : (x.code < y.code ? -1 : 1); });
  moves.forEach(function (mv) {
    var id = 'FV-' + (invSeq++), name = mv.type === 'out_refund' ? 'NC-' + id.slice(3) : id;
    M['account.move'].push({ id: id, name: name, move_type: mv.type, state: 'posted', invoice_date: mv.date, partner_id: mv.partner, currency_id: mv.currency, ref: mv.ref || '' });
    mv.lines.forEach(function (l) {
      /* En Odoo la linea de una nota credito trae el subtotal positivo; el signo lo da move_type. */
      M['account.move.line'].push({ id: 'AML-' + (lineSeq++), move_id: id, product_id: PRODUCT[l.categ], categ: l.categ, price_subtotal: Math.abs(l.amount), analytic_distribution: mv.dist });
    });
  });

  /* ---------- search_read ----------
     domain: lista de [campo, operador, valor] con =, !=, in, >=, <=, >, <. Devuelve copias. */
  function match(rec, dom) {
    return (dom || []).every(function (t) {
      var v = rec[t[0]], op = t[1], w = t[2];
      if (t[0] === 'analytic_distribution' && op === 'in') return Object.keys(v || {}).some(function (k) { return w.indexOf(k) >= 0; });
      return op === '=' ? v === w : op === '!=' ? v !== w : op === 'in' ? w.indexOf(v) >= 0 : op === '>=' ? v >= w : op === '<=' ? v <= w : op === '>' ? v > w : op === '<' ? v < w : false;
    });
  }
  function pick(rec, fields) { if (!fields || !fields.length) return JSON.parse(JSON.stringify(rec)); var o = {}; fields.forEach(function (f) { o[f] = rec[f]; }); return JSON.parse(JSON.stringify(o)); }
  function searchReadSync(model, domain, opts) {
    var L = M[model]; if (!L) throw new Error('Modelo no simulado: ' + model);
    opts = opts || {};
    return L.filter(function (r) { return match(r, domain); }).map(function (r) { return pick(r, opts.fields); });
  }
  var lastSync = null;
  function searchRead(model, domain, opts) {
    return new Promise(function (res, rej) {
      setTimeout(function () { try { res(searchReadSync(model, domain, opts)); } catch (e) { rej(e); } }, 200 + Math.floor(Math.random() * 300));
    });
  }

  /* Totales por CECO y categoria de Odoo (sin reglas de region: esas son de Kairos). */
  function totals(code) {
    var out = { sold: {}, inv: {}, refunds: 0, unclassified: 0 };
    M['sale.order.line'].forEach(function (l) { if (l.analytic_distribution[code]) out.sold[l.categ] = (out.sold[l.categ] || 0) + l.price_subtotal; });
    var mv = {}; M['account.move'].forEach(function (m) { mv[m.id] = m; });
    M['account.move.line'].forEach(function (l) {
      if (!l.analytic_distribution[code]) return;
      var sign = mv[l.move_id].move_type === 'out_refund' ? -1 : 1;
      if (sign < 0) out.refunds += l.price_subtotal;
      if (l.categ === 'Unclassified') { out.unclassified += l.price_subtotal; return; }
      out.inv[l.categ] = (out.inv[l.categ] || 0) + sign * l.price_subtotal;
    });
    return out;
  }

  /* Solo demo: agrega una factura (para probar cumplimiento y alertas en vivo). */
  function simulateInvoice(code, categ, amount, date) {
    var a = M['account.analytic.account'].filter(function (x) { return x.code === code; })[0]; if (!a) return null;
    var id = 'FV-' + (invSeq++), d = {}; d[code] = 100;
    M['account.move'].push({ id: id, name: id, move_type: 'out_invoice', state: 'posted', invoice_date: date || HOY, partner_id: a.partner_id, currency_id: a.currency_id, ref: 'Factura simulada (demo)' });
    M['account.move.line'].push({ id: 'AML-' + (lineSeq++), move_id: id, product_id: PRODUCT[categ] || categ, categ: categ, price_subtotal: amount, analytic_distribution: d });
    return id;
  }

  window.OdooSim = {
    HOY: HOY, LABEL: 'Odoo · simulado', CATEG: CATEG,
    searchRead: searchRead, searchReadSync: searchReadSync, totals: totals, rateOn: rateOn, convert: convert,
    simulateInvoice: simulateInvoice, markSync: function () { lastSync = new Date().toISOString(); return lastSync; }, lastSync: function () { return lastSync; },
    partner: function (id) { return M['res.partner'].filter(function (p) { return p.id === id; })[0] || null; },
    account: function (code) { return M['account.analytic.account'].filter(function (x) { return x.code === code; })[0] || null; },
    regionales: function (cluster) { return regionales.filter(function (r) { return !cluster || r.cluster === cluster; }); },
    clusters: clusters
  };
})();
