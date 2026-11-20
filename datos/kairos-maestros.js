/* Kairos · maestros propios (datos 100 % ficticios). Fuente unica para todos los modulos.
   Kairos es dueno de: personas y su asignacion, responsables de cluster y de regional, sombrillas,
   lider y datos operativos de cada CECO, y parametros como el margen minimo.
   Lo que es de Odoo (clientes, clusters, regionales, monedas, TRM, cuentas analiticas, ventas, facturas)
   vive en datos/odoo-simulado.js. El enlace entre ambos es el codigo del CECO (cuenta analitica).
   Decisiones: CAMBIOS.md 31-oct (maestros de datos) y doc «Kairos · Maestros de datos de ejemplo». */
(function () {
  'use strict';

  var HOY = '2026-10-23'; /* fecha unica del prototipo */

  /* Responsables: asignaciones en Configuracion. Filtran analisis y dan edicion sobre los CECO de su grupo. */
  var responsables = {
    cluster: { LATAM: 'Gonzalo Perdomo', NA: 'Rafael de Vega' },
    regional: {
      Col_North: 'Iván Paternina',      /* confirmado */
      Col_Center: 'Luis Lara',          /* propuesta para la demo */
      'Col_Andean East': 'Ernesto Osorio',
      Col_West: 'Brainer Ocampo',
      Mx_Queretaro: 'Natalie Ramírez',
      US_South: 'Jhon Herrera',
      'Corporate Program': 'Rafael de Vega'
    },
    confirmados: ['Col_North']
  };

  /* Personas nuevas que aun no existen en el shell. */
  var personasNuevas = [
    { id: 'USR-IVAN-PATERNINA', name: 'Iván Paternina', role: 'lider', job: 'Responsable Col_North' }
  ];

  /* Sombrillas: solo agrupan CECO. */
  var sombrillas = [
    { id: 'SB-01', name: 'Ecopetrol · Campo Florena', cecos: ['30202004200', '30202004201'] },
    { id: 'SB-02', name: 'Ecopetrol · Cusiana', cecos: ['30204001500'] },
    { id: 'SB-03', name: 'GeoPark · Bloque Llanos 34', cecos: ['30029800000'] },
    { id: 'SB-04', name: 'Ecopetrol · Refinería Cartagena', cecos: ['30701006700'] },
    { id: 'SB-05', name: 'Rockwell · Base Manizales', cecos: ['30701006500'] },
    { id: 'SB-06', name: 'Team Foods · Planta Barranquilla', cecos: ['30702001100', '30703002400'] },
    { id: 'SB-07', name: 'Team Foods · Planta Bogotá', cecos: ['30102003300', '30103004100'] },
    { id: 'SB-08', name: 'Alternegy · Central Prudencia', cecos: ['30104005200'] },
    { id: 'SB-09', name: 'Celsia · Planta Yumbo', cecos: ['30401007200'] },
    { id: 'SB-10', name: 'Celsia · Central Salvajina', cecos: ['30314000800'] },
    { id: 'SB-11', name: 'Duquesa · Planta Cali', cecos: ['30301053200'] },
    { id: 'SB-12', name: 'Sucroal · Planta Palmira', cecos: ['30311055800'] },
    { id: 'SB-13', name: 'Corteva · Planta Espinal', cecos: ['30311054100'] },
    { id: 'SB-14', name: 'Kenvue Colombia · Planta Yumbo', cecos: ['30032400000', '30312001900'] },
    { id: 'SB-15', name: 'Termoemcali · Planta Cali', cecos: ['30311053600', '30313002700'] },
    { id: 'SB-16', name: 'Nestlé Ecuador · Planta Guayaquil', cecos: ['30315001900'] },
    { id: 'SB-17', name: 'Envases del Bajío · Planta Querétaro', cecos: ['30801000300'] },
    { id: 'SB-18', name: 'Ecopetrol · Terminal Altamira', cecos: ['30802001200'] },
    { id: 'SB-19', name: 'Barry Callebaut · Pasir Gudang', cecos: ['30027700000', '30014700000'] },
    { id: 'SB-20', name: 'Barry Callebaut · Itabuna', cecos: ['30301044600'] },
    { id: 'SB-21', name: 'Barry Callebaut · Toluca', cecos: ['30009400000'] },
    { id: 'SB-22', name: 'Kenvue Inc. · Helsingborg', cecos: ['30905000600'] },
    { id: 'SB-23', name: 'Stepan · Winder', cecos: ['30901001400'] },
    { id: 'SB-24', name: 'Stepan · Millsdale', cecos: ['30902002300', '30903003100'] }
  ];

  /* Datos de Kairos por CECO: lider, tipo, estado, fechas, horas cotizadas y unidad de negocio.
     prev = id del proyecto en el prototipo v87 (para migrar sin perder lo guardado). */
  function c(code, leader, tipo, sub, estado, inicio, fin, horas, unidad, prev) {
    return { code: code, leader: leader, tipo: tipo, sub: sub, estado: estado, inicio: inicio, fin: fin, horas: horas, unidad: unidad, prev: prev || null };
  }
  var cecos = [
    c('30202004200', 'Ernesto Osorio', 'proyecto', null, 'activo', '2026-07-06', '2026-12-18', 1840, 'AU', 'p01'),
    c('30202004201', 'Ernesto Osorio', 'proyecto', null, 'activo', '2026-09-14', '2026-12-18', 0, 'AU'),
    c('30204001500', 'Jhon Herrera', 'proyecto', null, 'activo', '2026-08-18', '2027-02-26', 1240, 'AU'),
    c('30029800000', 'Jhon Herrera', 'proyecto', null, 'activo', '2026-08-03', '2026-12-11', 1120, 'AU', 'p03'),
    c('30701006700', 'Iván Paternina', 'proyecto', null, 'activo', '2026-06-01', '2027-03-31', 960, 'AU'),
    c('30701006500', 'Juan Dueñas', 'servicio', 'puntual', 'activo', '2026-10-05', '2026-12-04', 240, 'AU', 'p10'),
    c('30702001100', 'Iván Paternina', 'servicio', 'mantenimiento', 'activo', '2026-02-02', '2026-12-18', 520, 'AU'),
    c('30703002400', 'Iván Paternina', 'proyecto', null, 'activo', '2026-05-04', '2027-04-30', 2400, 'SM'),
    c('30102003300', 'Luis Lara', 'servicio', 'bolsa', 'activo', '2026-01-12', '2026-12-18', 640, 'AU'),
    c('30103004100', 'Luis Lara', 'proyecto', null, 'activo', '2026-06-01', '2027-03-31', 2800, 'AU'),
    c('30104005200', 'Luis Lara', 'servicio', 'mantenimiento', 'activo', '2026-03-02', '2027-02-26', 360, 'AU'),
    c('30401007200', 'Ernesto Osorio', 'servicio', 'mantenimiento', 'activo', '2026-03-02', '2027-02-26', 960, 'AU', 'p02'),
    c('30314000800', 'Miguel Quintero', 'servicio', 'puntual', 'activo', '2026-04-06', '2026-11-27', 60, 'AU'),
    c('30301053200', 'Miguel Quintero', 'servicio', 'bolsa', 'activo', '2026-01-12', '2026-12-18', 600, 'AU', 'p04'),
    c('30311055800', 'Brainer Ocampo', 'proyecto', null, 'activo', '2026-09-07', '2027-01-22', 880, 'AU', 'p07'),
    c('30311054100', 'Federman Tapia', 'servicio', 'mantenimiento', 'activo', '2026-04-06', '2027-03-31', 520, 'AU', 'p08'),
    c('30032400000', 'Santiago Tobar', 'proyecto', null, 'activo', '2026-11-03', '2027-03-12', 1360, 'AU', 'p09'),
    c('30312001900', 'Federman Tapia', 'servicio', 'puntual', 'activo', '2026-06-01', '2026-12-18', 64, 'AU'),
    c('30311053600', 'Brainer Ocampo', 'servicio', 'suministro', 'activo', '2026-09-21', '2027-02-26', 120, 'SM'),
    c('30313002700', 'Luis Lara', 'servicio', 'urgencia', 'activo', '2026-07-06', '2026-12-18', 110, 'AU'),
    c('30315001900', 'Santiago Tobar', 'proyecto', null, 'activo', '2026-07-06', '2026-12-18', 900, 'AU'),
    c('30801000300', 'Natalie Ramírez', 'proyecto', null, 'activo', '2026-10-19', '2027-01-29', 160, 'AU'),
    c('30802001200', 'Natalie Ramírez', 'servicio', 'mantenimiento', 'activo', '2026-05-04', '2026-12-18', 420, 'AU'),
    c('30027700000', 'Rafael de Vega', 'proyecto', null, 'activo', '2026-06-01', '2027-01-29', 2480, 'AU', 'p05'),
    c('30014700000', 'Rafael de Vega', 'proyecto', null, 'cerrado', '2025-11-03', '2026-05-29', 760, 'AU', 'p06'),
    c('30301044600', 'Rafael de Vega', 'proyecto', null, 'cerrado', '2025-09-01', '2026-02-27', 320, 'SM', 'p12'),
    c('30009400000', 'Natalie Ramírez', 'proyecto', null, 'auditoria', '2026-04-13', '2026-10-16', 690, 'SM', 'p11'),
    c('30905000600', 'Natalie Ramírez', 'proyecto', null, 'activo', '2026-08-03', '2027-02-26', 400, 'AU'),
    c('30901001400', 'Jhon Herrera', 'servicio', 'suministro', 'activo', '2026-08-03', '2026-12-18', 20, 'AU'),
    c('30902002300', 'Jhon Herrera', 'proyecto', null, 'activo', '2026-08-03', '2027-05-28', 1500, 'AU'),
    c('30903003100', 'Jhon Herrera', 'proyecto', null, 'activo', '2026-09-07', '2027-01-29', 0, 'AU')
  ];

  /* Cotizacion por adjudicar: aun sin CECO (Odoo no ha creado el pedido). */
  var porAdjudicar = [{ prev: 'p13', ref: 'ANT-0003', name: 'Hoja de ruta de transformación digital', client: 'RP-ALTERNEGY', leader: 'Laura Posso' }];

  /* Margen minimo por modalidad y cluster [ACORDADO 31-oct: configurable; valores = propuesta]. */
  var margenMinimo = {
    alcance: { LATAM: 35, NA: 45 },
    horas: { LATAM: 30, NA: 40 },
    suministro: { LATAM: 12, NA: 15 },
    propuesta: true
  };

  /* Mapeo del cluster viejo de Cotizaciones al nuevo [ACORDADO 31-oct]. */
  var clusterViejo = { NAC: 'LATAM', LAT: 'LATAM', NAM: 'NA', EUR: 'NA' };

  var byCode = {}; cecos.forEach(function (x) { byCode[x.code] = x; });
  sombrillas.forEach(function (s) { s.cecos.forEach(function (k) { if (byCode[k]) byCode[k].sombrilla = s.id; }); });

  /* ---------- Configuracion vigente (lo que Administrar cambia en Configuracion) ----------
     En produccion es un servicio del backend; aqui vive en el navegador sobre los valores por defecto. */
  var LS_ORG = 'kairos-organizacion';
  function readOrg() { try { return JSON.parse(localStorage.getItem(LS_ORG) || 'null') || {}; } catch (e) { return {}; } }
  function writeOrg(o) { try { localStorage.setItem(LS_ORG, JSON.stringify(o)); } catch (e) {} }
  function vigentes() {
    var o = readOrg(), r = { cluster: {}, regional: {} };
    Object.keys(responsables.cluster).forEach(function (k) { r.cluster[k] = (o.cluster && o.cluster[k] != null) ? o.cluster[k] : responsables.cluster[k]; });
    Object.keys(responsables.regional).forEach(function (k) { r.regional[k] = (o.regional && o.regional[k] != null) ? o.regional[k] : responsables.regional[k]; });
    return r;
  }
  function setResponsable(tipo, clave, nombre) { var o = readOrg(); o[tipo] = o[tipo] || {}; o[tipo][clave] = nombre || ''; writeOrg(o); }
  function margenes() { var o = readOrg(), m = JSON.parse(JSON.stringify(margenMinimo)); if (o.margen) { Object.keys(o.margen).forEach(function (k) { m[k] = o.margen[k]; }); m.propuesta = false; } return m; }
  function setMargenes(m) { var o = readOrg(); o.margen = { alcance: m.alcance, horas: m.horas, suministro: m.suministro }; writeOrg(o); }
  function resetOrg() { try { localStorage.removeItem(LS_ORG); } catch (e) {} }
  /* Grupos que gestiona una persona: clusters y regionales de los que es responsable. */
  function grupos(nombre) {
    var r = vigentes(), g = { clusters: [], regionales: [] };
    Object.keys(r.cluster).forEach(function (k) { if (r.cluster[k] === nombre) g.clusters.push(k); });
    Object.keys(r.regional).forEach(function (k) { if (r.regional[k] === nombre) g.regionales.push(k); });
    return g;
  }
  /* true si la persona gestiona un CECO de esa regional y cluster (responsable de su regional o de su cluster). */
  function gestiona(nombre, regional, cluster) { var g = grupos(nombre); return g.regionales.indexOf(regional) >= 0 || g.clusters.indexOf(cluster) >= 0; }

  window.KairosMaestros = {
    HOY: HOY, responsables: responsables, personasNuevas: personasNuevas, sombrillas: sombrillas, cecos: cecos,
    porAdjudicar: porAdjudicar, margenMinimo: margenMinimo, clusterViejo: clusterViejo,
    vigentes: vigentes, setResponsable: setResponsable, margenes: margenes, setMargenes: setMargenes, resetOrg: resetOrg, grupos: grupos, gestiona: gestiona,
    ceco: function (code) { return byCode[code] || null; },
    sombrilla: function (id) { return sombrillas.filter(function (s) { return s.id === id; })[0] || null; }
  };
})();
