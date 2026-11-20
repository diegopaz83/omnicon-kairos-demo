/* omnIA · datos de demostración. Todo es ficticio: clientes, personas, tarifas e IDs.
   Lo que en producción viene de Odoo se marca con odoo:true y se pinta «Odoo · simulado». */
window.OMNIA_DATA = {
  now: { date: '23 oct 2026', hour: 11, minute: 38 },

  roles: {
    comercial:  { label: 'Comercial · capacidad Cotizar',            user: 'Juliana Torres', initials: 'JT', chat: true,  canQuote: true,  canApprove: false, canExplainAlerts: false },
    lider:      { label: 'Líder de proyecto',    user: 'Ernesto Osorio', initials: 'EO', chat: true,  canQuote: false,  canApprove: false, canExplainAlerts: true },
    ingeniero:  { label: 'Ingeniero',            user: 'Cristian Pérez', initials: 'CP', chat: true,  canQuote: false, canApprove: false, canExplainAlerts: false },
    aprobador:  { label: 'Aprobador',            user: 'Gonzalo Perdomo', initials: 'GP', chat: true,  canQuote: false,  canApprove: true,  canExplainAlerts: true },
    sinpermiso: { label: 'Sin permiso de chat',  user: 'Katherine Garcés', initials: 'KG', chat: false, canQuote: false, canApprove: false, canExplainAlerts: false }
  },

  modules: {
    inicio:        { label: 'Inicio',       ctx: null },
    cotizaciones:  { label: 'Cotizaciones', ctx: 'quote:COT-2026-0142' },
    proyectos:     { label: 'Proyectos',    ctx: null },
    reservas:      { label: 'Reservas',     ctx: null },
    forecast:      { label: 'Forecast y Backlog', ctx: null },
    bitacoras:     { label: 'Bitácoras',    ctx: null },
    statusreport:  { label: 'Informes', ctx: null },
    cambios:       { label: 'Control de cambios', ctx: null },
    ejecucion:     { label: 'Ejecución',    ctx: null },
    horasextra:    { label: 'Horas extra',  ctx: null },
    analisis:      { label: 'Analítica',    ctx: null },
    configuracion: { label: 'Configuración', ctx: null }
  },

  /* Sugerencias por modulo. Cada rol ve solo las que calcen con lo que puede hacer (filtro en app.js por canQuote/canApprove/canReserve). */
  moduleSuggestions: {
    inicio:        [ '¿Qué puedes hacer?' ],
    cotizaciones:  [ 'Revisa si a esta cotización le falta algo', 'Resume esta cotización para aprobar', '¿Qué puedes hacer?' ],
    proyectos:     [ 'Resume el avance de este proyecto' ],
    reservas:      [ '¿Quién está libre esta semana?', 'Resume la ocupación de mi equipo' ],
    bitacoras:     [ 'Resume las bitácoras de la última semana', '¿Qué lecciones aprendidas hay de proyectos parecidos?' ],
    statusreport:  [ 'Redacta los logros del periodo a partir de las bitácoras', 'Resume las actividades del último informe de servicio', '¿Qué entregables van retrasados?' ],
    cambios:       [ 'Resume los cambios pendientes de decisión', '¿Cuánto tiempo suman los cambios aprobados?' ],
    ejecucion:     [ 'Resume las horas registradas esta semana', '¿Qué fases llevan más horas de lo estimado?' ],
    horasextra:    [ 'Resume las horas extra por aprobar' ],
    analisis:      [ 'Resume el estado de la cartera de proyectos', '¿Qué proyectos tienen mayor riesgo?' ],
    configuracion: [ '¿Qué puedes hacer?' ]
  },

  contexts: {
    'quote:COT-2026-0142': { kind: 'quote',   id: 'COT-2026-0142', label: 'Cotización COT-2026-0142 · Kenvue Colombia', short: 'COT-2026-0142', group: 'Cotizaciones' },
    'quote:COT-2026-0148': { kind: 'quote',   id: 'COT-2026-0148', label: 'Cotización COT-2026-0148 · Kenvue Colombia', short: 'COT-2026-0148', group: 'Cotizaciones' },
    'project:PRJ-0031':    { kind: 'project', id: 'PRJ-0031', label: 'Proyecto Smart Manufacturing · Ficha PRJ-0031', short: 'PRJ-0031', group: 'Proyectos' },
    'project:PRJ-0027':    { kind: 'project', id: 'PRJ-0027', label: 'Proyecto Automation · Ficha PRJ-0027', short: 'PRJ-0027', group: 'Proyectos' },
    'booking:SEM-43':      { kind: 'booking', id: 'SEM-43', label: 'Reservas · Semana 43', short: 'Semana 43', group: 'Reservas' }
  },

  clients: [
    { id: 'CLI-9001', name: 'Kenvue Colombia', plants: ['Planta Yumbo', 'Planta Bogotá'], contact: 'Contacto de producción (Odoo)', odoo: true },
    { id: 'CLI-9002', name: 'Team Foods Colombia', plants: ['Planta Barranquilla'], contact: 'Contacto de planta (Odoo)', odoo: true },
    { id: 'CLI-9003', name: 'Termoemcali', plants: ['Planta Cali'], contact: 'Contacto de ingeniería (Odoo)', odoo: true }
  ],

  businessUnits: ['Smart Manufacturing', 'Automation', 'Consultoría'],
  modalities: { alcance: 'Por alcance', horas: 'Por horas', suministro: 'Suministro' },

  priceList: {
    id: 'PL-DEMO-NAC', name: 'Lista ficticia nacional', currency: 'COP', odoo: true,
    rates: { TC1: 90000, TC2: 115000, E1: 145000, E2: 180000, E3: 225000, E4: 270000, E5: 310000 }
  },
  profiles: [
    { id: 'TC1', desc: 'Técnico junior' }, { id: 'TC2', desc: 'Técnico senior' },
    { id: 'E1', desc: 'Ingeniero junior' }, { id: 'E2', desc: 'Ingeniero' }, { id: 'E3', desc: 'Líder técnico' },
    { id: 'E4', desc: 'Ingeniero senior' }, { id: 'E5', desc: 'Gerente de proyecto' }
  ],

  /* Plantilla que el Estimador propone para «MES en planta». Horas ficticias. */
  quoteTemplate: {
    id: 'COT-2026-0148',
    components: [
      { key: 'alcance', name: 'Implementación MES', modality: 'alcance' },
      { key: 'horas', name: 'Soporte post-arranque', modality: 'horas' },
      { key: 'suministro', name: 'Licencias MES', modality: 'suministro' }
    ],
    phases: [
      { name: 'Levantamiento', activities: [
        { name: 'Kickoff y entendimiento', hours: { E5: 4, E3: 8 } },
        { name: 'Levantamiento en planta', hours: { E3: 16, E2: 16, TC2: 8 } } ] },
      { name: 'Diseño', activities: [
        { name: 'Diseño funcional MES', hours: { E3: 24, E4: 8 } },
        { name: 'Diseño de integración con PLC', hours: { E2: 20, E3: 8 } } ] },
      { name: 'Implementación', activities: [
        { name: 'Configuración del MES', hours: { E2: 60, E1: 40 } },
        { name: 'Integración con PLC de línea', hours: { E2: 32, TC2: 24, TC1: 16 } },
        { name: 'Pruebas FAT', hours: { E2: 16, E1: 16 } } ] },
      { name: 'Puesta en marcha', activities: [
        { name: 'SAT en planta', hours: { E2: 24, TC2: 24 } },
        { name: 'Capacitación a operadores', hours: { E1: 12 } },
        { name: 'Gestión del proyecto', hours: { E5: 40 } } ] }
    ],
    hoursBlock: { profile: 'E2', hours: 40 },
    supply: { desc: 'Licencias MES · 2 estaciones', value: null }
  },

  extraction: {
    image: [ 'Línea de envasado 2 con 3 estaciones', '2 PLC visibles en el tablero', 'Estación de pesaje al final de línea' ],
    file: [ 'Alcance: trazabilidad por lote y OEE', 'Fecha deseada de arranque: marzo 2027', 'Integración con ERP fuera de alcance' ]
  },

  suggestions: {
    none:    [ '¿Qué puedes hacer?' ],
    quote:   [ 'Revisa si a esta cotización le falta algo', 'Resume esta cotización para aprobar', '¿Qué puedes hacer?' ],
    project: [ '¿Qué puedes hacer?' ],
    booking: [ '¿Qué puedes hacer?' ]
  },

  /* Sugerencias asistidas para quien no tiene chat: solo lectura, sin conversación. */
  assisted: {
    'quote:COT-2026-0142': [ { title: 'Sin horas de gestión', text: 'La fase «Puesta en marcha» no tiene horas de E5.', action: 'Ver en Cotizaciones' } ],
    'project:PRJ-0031':    [ { title: 'Hito próximo', text: 'FAT programada para el 28 oct.', action: 'Ver ficha' } ],
    default:               [ { title: 'Nada pendiente', text: 'omnIA no tiene sugerencias para este registro.', action: null } ]
  },

  /* Avisos de ejemplo (visión, fuera del MVP). Un aviso por nivel. */
  alerts: [
    { id: 'ALR-01', level: 'info', ctx: 'project:PRJ-0031', title: 'Avance registrado por debajo de lo planeado', text: 'Semana 43: 62 % registrado contra 70 % planeado.', when: 'hoy 08:10', origin: 'Seguimiento' },
    { id: 'ALR-02', level: 'important', ctx: 'project:PRJ-0027', title: 'Resumen: 2 actividades con horas excedidas', text: 'Integración con PLC (+18 h) y Pruebas FAT (+6 h).', when: 'ayer 17:30', origin: 'Seguimiento' },
    { id: 'ALR-03', level: 'critical', ctx: 'project:PRJ-0031', title: 'Hito FAT vencido hace 2 días', text: 'La FAT de PRJ-0031 debía cerrarse el 21 oct y sigue abierta.', when: 'hoy 11:05', origin: 'Seguimiento' }
  ],

  /* Una conversación de historial por proyecto, más una libre. */
  history: [
    { id: 'TH-1007', ctx: 'project:PRJ-0031', title: 'Estado de la FAT', updated: 'ayer 16:20',
      messages: [
        { who: 'user', text: '¿Cómo va la FAT de este proyecto?' },
        { who: 'bot', origin: 'Seguimiento', text: 'En esta versión no consulto el seguimiento real. Cuando esté disponible verás aquí el estado de la FAT y sus pendientes.' } ] },
    { id: 'TH-1004', ctx: 'project:PRJ-0027', title: 'Horas excedidas en integración', updated: '20 oct',
      messages: [
        { who: 'user', text: 'Resume las horas excedidas.' },
        { who: 'bot', origin: 'Seguimiento', text: 'Ejemplo de conversación de historial. Integración con PLC superó lo estimado en 18 h.' } ] },
    { id: 'TH-1002', ctx: 'quote:COT-2026-0142', title: 'Revisión de horas E5', updated: '18 oct',
      messages: [
        { who: 'user', text: '¿Le falta algo a esta cotización?' },
        { who: 'bot', origin: 'Estimador', text: 'La fase «Puesta en marcha» no tiene horas de E5 (gerencia de proyecto). Revísalo en el módulo antes de enviarla a aprobación.' } ] },
    { id: 'TH-0998', ctx: null, title: 'Qué puede hacer omnIA', updated: '15 oct',
      messages: [
        { who: 'user', text: '¿Qué puedes hacer?' },
        { who: 'bot', text: 'Hoy puedo armar borradores de cotización contigo. Las aprobaciones se hacen en el módulo Cotizaciones.' } ] }
  ],

  /* Cotizaciones que ya existen en el módulo (ficticias). */
  existingQuotes: [
    { id: 'COT-2026-0142', client: 'Kenvue Colombia', unit: 'Automation', status: 'approved', rev: 2, total: 48650000, by: 'Gonzalo Perdomo', when: '19 oct' },
    { id: 'COT-2026-0139', client: 'Team Foods Colombia', unit: 'Consultoría', status: 'draft', rev: 0, total: 12400000, by: '—', when: '17 oct' }
  ],

  limits: { dailyMessages: 50, /* ejemplo; el uso se monitorea (ver contrato §16) */ maxFileMB: 15, accepted: ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg'] },

  rejectReason: 'Las horas de E5 deben ser cerca del 10 % del total. Ajusta Gestión del proyecto.'
};
