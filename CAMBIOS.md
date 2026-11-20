# Registro de cambios (desde la entrega del 31-oct-2026)

Línea base: prototipo «Kairos Ecosistema» versión 87 y Maestro v0.4 (31-oct-2026).
Cada cambio o decisión nueva se anota aquí, el más reciente arriba, con el formato de `CLAUDE.md`. Este archivo permite devolver el avance y comparar con la línea base.

---

## 2026-11-04 · Cotizaciones · página principal con el estándar de Forecast

**Qué cambió**
- Cabecera: título con explicación, selector de cluster LATAM · COP / North America · USD (Nacional y Latinoamérica pasan a LATAM; Norteamérica y Europa a North America), alcance del perfil y «Nueva cotización».
- 4 KPIs con valor, consolidados en la moneda del cluster con la TRM de hoy:
  - En curso: borrador o en revisión, con las horas estimadas.
  - Por aprobar: cuántas, y cuántas hay en el otro cluster.
  - Con el cliente: lo presentado y la más antigua sin respuesta.
  - Ganadas en el año: valor y tasa de éxito.
- Franja de estados (Borrador → En revisión → Aprobada sin presentar → Presentada → Ganada / No ganada) con cantidad y valor. Cada tramo filtra la grilla.
- Panel de filtros estándar: buscador, Unidad, Regional, Modalidad, Responsable, Agrupar, «Todas / Mías», limpiar con contador y línea de contexto.
- Grilla agrupada por estado por defecto; también por cliente, unidad o responsable.
  - Cada fila muestra cotización (consecutivo, revisión, cliente), unidad, regional, modalidad, horas, valor (USD con su equivalente en COP), estado, responsable con foto y fecha.
  - Bajo el estado va el siguiente paso, que escribe Kairos según lo que le falta a la cotización.
  - Por debajo de 1350 px la unidad pasa bajo el nombre; por debajo de 900 px la grilla pasa a tarjetas.
- Datos generales de la cotización: nuevo campo Regional, obligatorio, con las regionales del cluster.

**Por qué**
Juan: rediseñar Cotizaciones con el lenguaje de Forecast para que el ecosistema sea consistente. Bocetos 38 y 39.

**Archivos**
modulos/cotizaciones.html

**Decisiones nuevas**
- [ACORDADO 04-nov] La cotización lleva regional y se selecciona al armarla.
- [ACORDADO 04-nov] El siguiente paso lo escribe Kairos, no el responsable.
- [ACORDADO 04-nov] La vista por defecto se agrupa por estado.
- [PENDIENTE] Por dentro, la cotización sigue usando Nacional / Latinoamérica / Norteamérica / Europa para la lista de precios y las reglas nacionales (horas extra y dominicales). Falta definir cómo se fijan esas reglas con solo LATAM / North America.

## 2026-11-04 · Horas extra · compensatorio como parte del excedente

**Qué cambió**
- En «Tus horas por distribuir», cada CECO tiene una casilla «Compensar» para toda la semana, junto a D (diurna) y N (nocturna) por día. D + N + Compensar no puede superar el excedente ejecutado de la semana.
- La cabecera de cada semana muestra el desglose por tipo, por ejemplo «2 h dominical diurna · 1 h compensatorio». El pie también lo muestra.
- Al enviar, la hora extra va a aprobación como antes. El compensatorio no se aprueba: queda «Avisado al líder» y al líder del CECO (o a Planeación si quien trabajó lo lidera) le sale un aviso informativo en Inicio, con «Entendido».
- Junto a «Tus horas por distribuir» aparece el saldo «Compensatorio a favor» con las horas ya enviadas a compensatorio. Usar ese saldo se pedirá en Solicitudes (en diseño).
- En la lista de abajo, las filas de compensatorio salen como «Compensatorio · Toda la semana».

**Por qué**
Juan: el compensatorio debe salir del tiempo ejecutado a distribuir, para que nadie pida horas que no trabajó. Bocetos 36 y 37.

**Archivos**
modulos/ejecucion-app.js · modulos/ejecucion.html · index.html

**Decisiones nuevas**
- [ACORDADO 04-nov] El compensatorio se gana en Horas extra, como parte del excedente semanal, con una casilla por CECO y semana. Usarlo se pide en Solicitudes.
- [ACORDADO 04-nov] El compensatorio se avisa al líder; no se aprueba.
- [PENDIENTE · legal] La compensación por domingos y festivos trabajados la define la ley; Gestión Humana indica cómo se refleja.
- [PENDIENTE] Vencimiento y tope del saldo; tipo de nómina del compensatorio.

## 2026-11-03 · Solicitudes y novedades · boceto aparte, fuera del prototipo

**Qué cambió**
- Se retiró del prototipo el módulo «Solicitudes y novedades» que se había agregado al menú (modulos/solicitudes.html y su registro en index.html). El prototipo queda igual que antes.
- El boceto navegable de la iteración 1 vive ahora como artefacto aparte («Boceto Solicitudes y novedades»), con «Ver como» para cambiar entre colaborador, líder y Planeación.

**Por qué**
Juan pidió un boceto, no una implementación en el prototipo. Se implementa solo lo aprobado.

**Archivos**
index.html · modulos/solicitudes.html (eliminado)

**Decisiones nuevas**
- Las reglas del boceto siguen como [PROPUESTA] / [PENDIENTE]; ver claude/kairos-solicitudes-iteracion1.md.

## 2026-11-03 · Horas extra · cada semana con su propio encabezado (v4)

**Qué cambió**
- En «Tus horas por distribuir», cada semana es su propia tarjeta con su cabecera (plegar, semana, barra de distribuidas, plazo, «Enviar W41») y su propio encabezado de días con la fecha real (Lun 5 oct… Dom 11 oct) y D / N. Antes había un solo encabezado arriba, común a todas las semanas.
- El festivo se nombra en el encabezado («12 oct · festivo»).
- Una semana plegada queda en una línea con «n CECO · plegada»; la que vence en 2 semanas o menos lleva un borde naranja a la izquierda.
- El pie (distribuido por tipo y «Enviar las semanas con horas») pasa a tarjeta aparte.
- En celular, la mini grilla muestra el número del día bajo la inicial.

**Por qué**
Comentario de Juan: el encabezado quedaba por fuera del despliegue de la semana y se veía cortado. Boceto: tablero 35.

**Archivos**
modulos/ejecucion-app.js · modulos/ejecucion.html

**Decisiones nuevas**
- [ACORDADO 03-nov] Distribuir v4: una tarjeta por semana con su encabezado de días y fechas.

## 2026-11-03 · Analítica y Forecast · pestaña Forecast y Backlog con los Tableros, y tabla de cambios y alertas

**Qué cambió**
- En Analítica, la pestaña «Forecast y Backlog» ya no salta al módulo. Abre dentro de Analítica los Tableros completos del forecast: cluster, alcance, filtros, KPIs, proyección, facturado por mes y por cliente, cascada, y cambios y alertas.
  - El menú lateral sigue marcando Analítica.
  - Lo ven Dirección, Planeación, líderes y administración.
  - Un botón «Abrir el módulo · grilla, movimientos y cierre» lleva al módulo. Cualquier enlace de los Tableros que necesite otra pestaña también abre el módulo.
- En Tableros, la tabla de «Cambios documentados y alertas» queda con el estándar de grilla: borde, encabezado gris en mayúsculas, columna «Indicador», filas agrupadas en «Movimientos documentados» y «Alertas», y el mes en curso resaltado.
- El enlace «Ver alertas» (pestaña que ya no existe) pasa a «Ver en la grilla los CECO con novedades».

**Por qué**
Juan: desde Analítica, Forecast y Backlog debe llevar a los Tableros para hacer los análisis ahí. Comentario: la tabla de cambios y alertas se veía como un elemento suelto.

**Archivos**
modulos/analitica.html · modulos/forecast.html (tools/forecast-app.js y tools/forecast-body.html)

**Decisiones nuevas**
- [ACORDADO 03-nov] La pestaña Forecast y Backlog de Analítica muestra los Tableros embebidos; la grilla, los movimientos y el cierre siguen en el módulo.

## 2026-11-03 · Horas extra · distribuir en grilla CECO × día

**Qué cambió**
- «Tus horas por distribuir» deja de ser una tarjeta por semana con filas de tres listas (Proyecto, Día, Tipo). Ahora es una grilla con el estilo de la de Forecast:
  - Muestra todas las semanas pendientes de la persona, la más antigua primero.
  - Cada semana es plegable y su cabecera trae lo ejecutado frente a la capacidad, lo que puede solicitar, una barra de lo distribuido, el plazo (resaltado si quedan 2 semanas o menos) y «Enviar W41».
  - Filas: los CECO trabajados en esa semana. Columnas: Lun a Dom, cada día con D (diurna, 6 a. m.–7 p. m.) y N (nocturna, 7 p. m.–6 a. m.). Se escribe directo en la celda.
  - El tipo de hora se deduce: domingo o festivo (columna sombreada) pasa a dominical o festiva. Ya no se elige el tipo.
- Sin X para quitar: una celda vacía no se pide. El borrador arranca vacío; ya no se precarga todo el excedente en un viernes.
- Se puede enviar una semana pidiendo menos de lo disponible. Al pie aparecen las horas por tipo y «Enviar las semanas con horas (n)».
- Entre 900 y 1149 px, «Aprueba» va bajo el CECO. En celular hay una tarjeta por semana y, por CECO, una mini grilla de 2 filas (sol / luna) × 7 días con celdas de 40 px.

**Por qué**
Comentario de Juan: arreglar la vista de distribución con el estilo de la grilla de Forecast. Tableros 29 a 34; se descartaron la v1 (filas Diurna/Nocturna con X) y la v2 (desglose dentro de la celda, con más clics).

**Archivos**
modulos/ejecucion-app.js · modulos/ejecucion.html

**Decisiones nuevas**
- [ACORDADO 03-nov] Distribución en grilla CECO × día con columnas Diurna y Nocturna; semanas plegables; todas las semanas pendientes juntas.
- [ACORDADO 03-nov] Se puede enviar pidiendo menos de lo disponible.
- [ACORDADO 03-nov] Solo aparecen los CECO trabajados en esa semana.

## 2026-11-03 · Ejecución y Configuración · Semanas bloqueadas pasan a Configuración

**Qué cambió**
- Ejecución y Horas extra ya no tienen pestañas (Tablero semanal / Horas extra / Semanas bloqueadas): cada una se abre desde su entrada del menú. «Ver en Horas extra» desde el tablero lleva al módulo Horas extra.
- Semanas bloqueadas se mueve a Configuración, como pestaña visible solo para Planeación. Solo Planeación bloquea y reabre (antes también los administradores).
- Cuando Planeación bloquea semanas, todas las personas ven el aviso en Inicio («Planeación bloqueó hasta la semana N · ya no se registran ni cambian horas ni horas extra de esas semanas»). El aviso dura 14 días o hasta tocar «Entendido». En Inicio de Planeación aparece el filtro «Bloqueos».

**Por qué**
Comentario de Juan: la navegación por pestañas en Ejecución sobra; el bloqueo de semanas es configuración de Planeación y debe notificarse a todos.

**Archivos**
modulos/ejecucion-app.js · modulos/ejecucion.html · modulos/configuracion.html · index.html

**Decisiones nuevas**
- [ACORDADO 03-nov] Semanas bloqueadas vive en Configuración y solo la gestiona Planeación.
- [ACORDADO 03-nov] El bloqueo de semanas se avisa a todas las personas en Inicio.
- [PROPUESTA] El aviso dura 14 días o hasta «Entendido»; la reapertura no genera aviso.

## 2026-11-03 · Horas extra · vista Todas / Mías / Me corresponde

**Qué cambió**
- El selector de vista pasa a tres opciones con contador: Todas, Mías (las horas extra que tú solicitas) y Me corresponde (las que debes aprobar). Abre en Me corresponde si tienes algo por aprobar; si no, en Mías si tienes solicitudes; si no, en Todas. Funciona igual en celular.

**Por qué**
Comentario de Juan: el ingeniero líder debe poder pararse solo en lo que él solicita, además de lo que le toca aprobar.

**Archivos**
modulos/ejecucion.html · modulos/ejecucion-app.js

**Decisiones nuevas**
- [ACORDADO 03-nov] Vistas de Horas extra: Todas, Mías y Me corresponde.

## 2026-11-03 · Horas extra · estándar de grilla y filtros; Forecast · el líder entra directo a proponer

**Qué cambió**
- Horas extra (primer módulo de la estandarización): indicadores (Por distribuir, En aprobación con cuántas te corresponden, Aprobadas, Semanas abiertas); la política en una línea; panel de filtros estándar (buscador, Semana, Persona, Aprueba, Estado, «Todas / Me corresponde» —por defecto Me corresponde si tienes algo por aprobar—, limpiar con contador y chips); una sola grilla en lugar de las listas Por aprobar y Seguimiento: bloque por persona y semana (foto, barra ejecutado/capacidad, extra, aviso de vencimiento) y una fila por línea (CECO con ícono y día, tipo de extra como chip de color, horas, quién aprueba con foto, estado o Aprobar/Devolver en la fila). «Aprobar las n» cuando hay varias. Celular: tarjetas por persona con botones de 44 px. Entre 900 y 1150 px el aprobador se muestra solo con foto.
- Sin botón «Recordar»: las horas por distribuir ya le aparecen a cada persona en su Inicio; la fila lo dice.
- El editor «Tus horas por distribuir» se queda arriba para quien trabajó las horas.
- Forecast: el líder con diferencias del cierre por proponer entra directo a la Grilla filtrada en «Con novedades» y con el formulario de propuesta abierto en su CECO.

**Por qué**
Juan aprobó el boceto 27-28 y pidió que el recordatorio sea automático. Además, como líder no encontraba dónde proponer la resolución de la diferencia.

**Archivos**
modulos/ejecucion.html · modulos/ejecucion-app.js · modulos/forecast.html

**Decisiones nuevas**
- [ACORDADO 03-nov] Horas extra sin recordatorio manual; el aviso en Inicio es automático.
- [ACORDADO 03-nov] Horas extra adopta el estándar de filtros y grilla de Forecast.

## 2026-11-03 · Forecast y Backlog y Analítica · «Ver como tabla» con el estándar de grilla

**Qué cambió**
- Las tablas que se abren con «Ver como tabla» (Tableros de Forecast y gráficos de Analítica) ahora usan el estándar de grilla: caja con borde redondeado, encabezado gris en mayúsculas pequeñas y fijo al desplazar, filas con separador y zebra suave, resaltado al pasar el puntero, números alineados a la derecha con cifras tabulares y alto máximo con desplazamiento interno.

**Por qué**
Comentario de Juan: «esto no se ve como una tabla… debe verse como una grilla».

**Archivos**
modulos/forecast.html · modulos/analitica.html

**Decisiones nuevas**
- Ninguna (primer paso de la estandarización de tablas en toda la aplicación).

## 2026-11-03 · Forecast y Backlog · Cierre: pedir actualización y propuestas del líder

**Qué cambió**
- Cierre mensual en 3 pasos: 1 Pedir actualización a los líderes y 2 Diferencias del mes anterior van en paralelo; 3 Tomar y cerrar el snapshot se bloquea solo por diferencias sin resolver (con el motivo visible) y advierte, sin bloquear, si hay líderes que no están listos.
- Paso 1: botón «Pedir actualización» con fecha límite = día 5 calendario (si cae festivo o fin de semana, el siguiente día hábil; festivos de Colombia 2026-2027 en el prototipo). Tabla por líder: Visto (abrió Forecast), Listo (sin proyección incompleta ni de más y todas sus diferencias propuestas) y Diferencias (propuso / falta proponer / resuelta por el analista). «n de 10 lo vieron · n de 10 listos» y «Recordar a los n que faltan» (manual; registra el último recordatorio).
- El líder ve en su Inicio «Isabela abrió el cierre de oct 26: actualiza antes del 5 nov» con lo que le falta, hasta que queda listo.
- En la Grilla, el CECO con diferencia sin resolver muestra «Proponer resolución»: el líder elige qué pasa con la plata (aplazar a un mes / eliminar / pago anticipado) y la razón (ambos obligatorios) y envía. Su CECO queda «Propuesta enviada · esperando aprobación»; puede cambiarla.
- Paso 2: la propuesta aparece con autor y hora, y los botones Aprobar y Cambiar. Al aprobar, el sistema aplica el movimiento (p. ej. +$ 3.000.000 en nov 26) y lo registra con quién propuso y quién aprobó. Se puede resolver sin esperar al líder.
- Al cerrar el snapshot, aviso informativo automático a cada líder («Quedó congelado oct 26: tus compromisos…»). Se quita el paso «Avisar a los líderes» del cambio anterior.

**Por qué**
Juan: avisar después de congelar no pide acción; hay que pedir antes, y una explicación libre puede quedarse sin acción, así que el líder debe proponer la resolución.

**Archivos**
datos/forecast.js (deadline, pedirActualizacion, leaderStatus, proposeDiff, approveProposal, aviso al cerrar) · modulos/forecast.html · index.html (avisos en Inicio) · boceto tableros 24 a 26

**Decisiones nuevas**
- [ACORDADO 03-nov] Orden del cierre: pedir actualización y diferencias en paralelo; snapshot bloqueado solo por diferencias; líderes no listos solo advierten.
- [ACORDADO 03-nov] Fecha límite: día 5 calendario o el siguiente día hábil. Recordatorio manual.
- [ACORDADO 03-nov] El líder propone la resolución de sus diferencias; la analista aprueba o cambia. Reemplaza el «Avisar a los líderes» como paso aparte.

## 2026-11-03 · Forecast y Backlog · responsive en pantallas medianas y cierre del snapshot

**Qué cambió**
- Cerrar snapshot no hacía nada dentro del artefacto: usaba la confirmación del navegador (confirm), que el artefacto bloquea en silencio. Ahora todas las confirmaciones del módulo son una ventana propia de Kairos (cerrar y volver a tomar snapshot, excluir cuenta, cambiar de cluster con cambios sin guardar, restablecer datos). No queda ningún confirm() en el prototipo.
- Botones del paso 2 con estado y explicación: «Tomar snapshot» inhabilitado muestra debajo «Falta resolver n diferencias del paso 1» (y tooltip); «Cerrar snapshot» y «Volver a tomar» explican qué hacen.
- Puntos de quiebre: por debajo de 900 px (celular y tableta) tarjetas; entre 900 y 1150 px tablas compactas sin desplazamiento lateral: en la Grilla el líder va dentro de la celda del CECO; en Movimientos el mes de registro va con el movimiento y quién registró bajo la razón; en Cierre el líder va con el CECO; en Cumplimiento el pendiente va bajo la barra de cumplimiento.
- Arreglos de desbordes: tarjetas de pasos del cierre, tarjeta de Datos, filtros de Tableros en celular y su tabla de datos.
- Verificado a 390, 768, 1024, 1280, 1366 y 1440 px en todas las pestañas: ninguna página ni tabla se desplaza de lado.

**Por qué**
Comentario de Juan: «no está responsive; garantizar que estas situaciones no alteren el UX». Y no podía cerrar el snapshot.

**Archivos**
modulos/forecast.html

**Decisiones nuevas**
- [ACORDADO 03-nov] Regla del prototipo: nunca usar confirm/alert del navegador; siempre la ventana propia. Revisar cada cambio a 390, 768, 1024, 1280 y 1440 px.

## 2026-11-03 · Forecast y Backlog · 6 pestañas y Paso 3 «Avisar a los líderes»

**Qué cambió**
- Se quitan las pestañas Resumen por líder y Alertas. Quedan Grilla, Tableros, Movimientos, Cierre mensual, Cumplimiento y Datos.
- Alertas: lo cubre el filtro Novedades de la Grilla y la franja «Pendiente en tu alcance». Se suma la novedad «cuenta nueva de Odoo sin forecast». En el Inicio del analista el aviso dice «novedades de Forecast para revisar».
- Cierre mensual tiene un Paso 3 «Avisar a los líderes», habilitado al cerrar el snapshot: muestra con foto a los líderes del snapshot y un solo botón «Avisar a todos los líderes».
- Cada líder recibe el aviso en su Inicio: «Isabela cerró oct 26: revisa tu proyección · Tienes N CECO comprometidos por $ X. Actualiza lo que haga falta: necesitamos la facturación.» con el botón «Ver mis CECO». Al abrir Forecast queda como visto y el aviso desaparece.
- Evidencia: «Avisado por Isabela Tierradentro · fecha · 10 líderes», «Lo vieron · n de 10» con foto y chulo, «Faltan» en gris y «Avisar de nuevo a los n que faltan» (registra el último recordatorio). La tarjeta del paso 3 dice «n de 10 lo vieron». Todo queda en la auditoría.
- Los títulos de los pasos se acortan (Diferencias de sep 26, Snapshot de oct 26, Avisar a los líderes).

**Por qué**
Juan: con un sistema que todos consultan no hace falta mandar el correo del Excel; avisar a todos es mostrar que se hizo la revisión y pedir que actualicen. Es evidencia de gestión del analista. Aceptó el «visto».

**Archivos**
datos/forecast.js (avisoLeaders, avisosOf, avisarLideres, markSeen; novedad de cuenta nueva) · modulos/forecast.html · index.html (aviso en Inicio del líder) · boceto tablero 22 y nota

**Decisiones nuevas**
- [ACORDADO 03-nov] Se quitan Resumen por líder y Alertas; quedan 6 pestañas.
- [ACORDADO 03-nov] Paso 3 del cierre: un solo aviso a todos los líderes del snapshot, con «visto» al abrir Forecast y recordatorio a quienes faltan. Sin correo.
- [PENDIENTE] La campana del encabezado sigue como «próximamente»; el aviso llega por Inicio.

## 2026-11-03 · Forecast y Backlog · corrección: la grilla fallaba después del cierre

**Qué cambió**
- La grilla mostraba «Algo salió mal al armar esta vista · Cannot read properties of null (reading 'slice')» después de resolver una diferencia con Pago anticipado en Cierre mensual. Ese movimiento no tiene mes de origen y el cálculo de novedades intentaba leerlo. Ahora se muestra como dato informativo «pago anticipado en el cierre de sep».
- Probado el flujo completo (resolver las 3 diferencias, tomar y cerrar el snapshot) y luego todas las pestañas.

**Por qué**
Juan reportó el error con captura.

**Archivos**
datos/forecast.js

**Decisiones nuevas**
- Ninguna.

## 2026-11-03 · Forecast y Backlog · Cumplimiento con lo facturado por categoría y factura

**Qué cambió**
- La serie mensual de la derecha sube a una fila de meses (cada mes con %, barra y facturado de comprometido; tocar uno lo selecciona). Se quita el selector de mes. La tabla usa todo el ancho.
- «Facturado en Odoo» se abre en Ingeniería, Viáticos, Equipos y Total, en cada nivel: grupo (líder, cliente, regional o cluster), CECO y factura.
- Cada factura es una fila con su número y fecha; sus líneas caen en la columna de su categoría (FV-14085 ocupa una fila con Ingeniería y Viáticos). Se quita Tipo: las notas crédito restan y van en rojo. Facturas en otra moneda: valor original y debajo el convertido con la TRM de la factura.
- Sale la columna «Mezcla facturada» y la tarjeta de mezcla; la tarjeta Facturado muestra el reparto por categoría.
- Celular: tarjeta por grupo con facturado, pendiente y reparto; al abrir, cada CECO con sus facturas (número, fecha y montos por categoría).
- Reemplaza la tabla de facturas del cambio anterior (03-nov).

**Por qué**
Comentario de Juan: lo más importante es saber que lo facturado viene de Ingeniería y Viáticos y en qué fechas; Tipo sobra.

**Archivos**
modulos/forecast.html · boceto tableros 20 y 21

**Decisiones nuevas**
- [ACORDADO 03-nov] Cumplimiento muestra lo facturado por categoría y por factura; meses arriba en vez de serie lateral.
- [PROPUESTA] North America con las mismas tres columnas.

## 2026-11-03 · Forecast y Backlog · facturas de Odoo como tabla en Cumplimiento

**Qué cambió**
- Al abrir un CECO en Cumplimiento, sus facturas del mes ya no van como chips dentro de la celda: van en una tabla debajo de la fila con columnas Factura (solo el número, p. ej. FV-14085), Fecha, Tipo (Factura de venta / Nota crédito), Categoría y Monto en la moneda del CECO, y el total si hay más de una línea. Notas crédito en rojo.
- En celular, lista con número, fecha · tipo · categoría y monto a la derecha.

**Por qué**
Comentario de Juan en el artefacto: las facturas no se veían bien y son muy importantes; deben leerse como tabla.

**Archivos**
modulos/forecast.html

**Decisiones nuevas**
- Ninguna.

## 2026-11-02 · Forecast y Backlog · Cierre mensual rediseñado

**Qué cambió (diseño; misma regla de cierre)**
- Arriba, la fila de snapshots del cluster (cerrados con candado y número de líneas; el mes en curso «Por tomar», «Abierto» o «Cerrado»).
- Los dos pasos como tarjetas: el activo resaltado, el resuelto con chulo verde; el paso 2 dice «Bloqueado» mientras haya diferencias.
- Indicadores del mes anterior: comprometido (fecha y líneas del snapshot), facturado con barra y %, diferencias por resolver con el neto en la moneda del cluster.
- Tabla con el patrón de la grilla y Movimientos: CECO con icono, nombre, cliente y regional; líder con foto; comprometido → facturado con barra; chip de dirección (Facturó de menos / de más) con el monto. En celular, una tarjeta por diferencia.
- Resolución en palabras: «Aplazar a [mes]» o «Eliminar» para lo que faltó facturar; «Pago anticipado» para lo que sobró. El tipo técnico queda en Movimientos. Razón obligatoria; el botón se activa al escribirla.
- Las resueltas siguen visibles al final, en verde, con la decisión, la razón, el autor y la fecha.
- Paso 2: vista previa de lo que se congela (líneas, CECO y total por moneda) y los botones Tomar snapshot, Volver a tomar y Cerrar snapshot.

**Por qué**
Juan: la pantalla no seguía el diseño de la grilla y Movimientos (fotos, CECO, distribución).

**Archivos**
datos/forecast.js (snapLines, vista previa del snapshot) · modulos/forecast.html · boceto tableros 18 y 19

**Decisiones nuevas**
- [ACORDADO 02-nov] Las diferencias resueltas quedan visibles al final de la tabla hasta cerrar el snapshot.

## 2026-11-02 · Forecast y Backlog · enlace «+ Bitácora» en la grilla

**Qué cambió**
- El contador pequeño junto al código del CECO se reemplaza por un enlace de texto, sin borde, debajo de la novedad: «+ Bitácora» (o «Bitácora · 2» si ya tiene) para el analista; «2 bitácoras» para el líder, solo si hay. Abierto, dice «Cerrar bitácora». Igual en las tarjetas del celular (36 px de alto).

**Por qué**
Juan no encontraba cómo adicionar la bitácora (había entrado como Sebastián, que no es el analista de forecast; el analista es Isabela). Aun así, el contador con «+» punteado no se leía como acción. Se probó un botón con borde y quedó muy pesado; se acordó el punto medio: enlace de texto.

**Archivos**
modulos/forecast.html

**Decisiones nuevas**
- Ninguna; ajuste de diseño de la decisión del 02-nov.

## 2026-11-02 · Forecast y Backlog · Bitácora Forecast por CECO en la grilla; se quita Seguimiento

**Qué cambió**
- Se quita la pestaña Seguimiento (antes Reuniones). Menos pestañas: Grilla, Tableros, Movimientos, Cierre mensual, Cumplimiento, Resumen por líder, Alertas y Datos.
- Grilla: filtro nuevo «Novedades» (Con novedades / Sin novedades) junto a Estado, con chip y conteo. Novedad = proyección incompleta, proyectado de más, sin facturar este mes, facturó más de lo vendido, diferencias del cierre sin resolver, movimiento en borrador, forecast vencido sin movimiento o inconsistencia de Odoo. Se recalcula cada mes.
- La novedad se ve en la celda del CECO: baldosa de tipo con borde y punto ámbar y una línea con la novedad. Los anticipados del mes, en gris (informativo).
- Bitácora Forecast por CECO, sin ventana: junto al código, contador azul si el CECO tiene bitácoras o «+» punteado (solo el analista) si no tiene. Al tocarlo se abre una fila debajo con el campo «Observación de oct 26…», el botón de guardar (se activa con 10 caracteres; Enter guarda) y la historia con «Líder entonces». Al guardar: «Guardada como bitácora Forecast · fecha» y el campo queda listo para otra. Igual en las tarjetas del celular.
- La bitácora guarda autor, fecha, CECO, líder del momento y la novedad que tenía. No se edita ni se borra; puede haber varias por mes.
- Los líderes ven la historia de sus CECO, sin campo.
- Las bitácoras de ejemplo pasan a CECO (8). Las guardadas por líder en la versión anterior se reemplazan por esa semilla.

**Por qué**
Juan: la bitácora por líder no era intuitiva ni funcional; debe ser por CECO (proyecto o servicio) y escribirse en la misma grilla, sin ventana. Si se escribe en la grilla, Seguimiento sobra: «menos es más».

**Archivos**
datos/forecast.js · modulos/forecast.html · boceto tableros 14 a 17

**Decisiones nuevas**
- [ACORDADO 02-nov] Bitácora Forecast por CECO (proyecto o servicio), escrita en la grilla por el analista. Reemplaza la bitácora por líder.
- [ACORDADO 02-nov] Se quita la pestaña Seguimiento; la vista por líder queda en el filtro Líder y en Resumen por líder.
- [ACORDADO 02-nov] Los líderes ven las bitácoras de sus CECO, solo lectura.
- [ACORDADO 02-nov] Se mantienen: sin estado pendiente, varias bitácoras por mes y el criterio de novedades (sin la regla de tamaño).

## 2026-11-02 · Forecast y Backlog · Seguimiento a líderes (antes Reuniones)

**Qué cambió**
- La pestaña Reuniones se llama Seguimiento. Ya no hay «Pendiente» ni «Requiere reunión»: cada mes cada líder queda «Con novedades» o «Sin novedades», recalculado solo.
- Novedad = algo que revisar en sus CECO: proyección incompleta, proyectado de más, sin facturar este mes, facturó más de lo vendido, diferencias del cierre sin resolver, movimiento en borrador, forecast vencido sin movimiento o inconsistencia de Odoo. El tamaño del líder (cuentas, proyectos) se muestra pero ya no cuenta.
- Informativo (gris): pagos o forecast anticipados confirmados en el mes. No piden revisión; explican un mes que se ve bien.
- CECO activos: número, una baldosa por CECO con su icono de tipo (borde y punto ámbar si tiene novedad, punto gris si solo hay anticipado; el tooltip dice el CECO y qué tiene) y conteo de proyectos y servicios. El estado resume «1 servicio de 4» y lista cada CECO con su novedad.
- Filtro Con novedades / Sin novedades / Todos; por defecto, Con novedades.
- «+ Bitácora» siempre disponible para el analista, también sin novedades, y se permiten varias por líder en el mismo mes. La bitácora guarda la foto de lo que Kairos ve (CECO con novedades y anticipados) junto con las conclusiones; la historia la muestra.
- Columna Bitácora: fecha de la última del mes y cuántas hay. Escribirla no cambia el estado: la novedad se va al corregirla en la grilla.
- Semilla: pago anticipado de nov a oct en 30032400000 (Santiago Tobar) para mostrar el caso informativo.

**Por qué**
Juan: «Pendiente» es eterno porque nada lo cierra; esto es un seguimiento mensual. Si todo está bien no hace falta bitácora, pero se puede escribir (todo puede estar bien por una gestión anticipada). Quiere ver activos, proyectos y servicios, y cuáles tienen alertas.

**Archivos**
datos/forecast.js · modulos/forecast.html · boceto tableros 12 y 13

**Decisiones nuevas**
- [ACORDADO 02-nov] Sin estado pendiente: con novedades o sin novedades, recalculado cada mes. Reemplaza «La reunión se sugiere cada mes; se cumple al registrar la bitácora Forecast».
- [ACORDADO 02-nov] Se quita la regla «3 cuentas activas o más, o algún proyecto, requiere reunión» (venía del módulo, no del Maestro).
- [ACORDADO 02-nov] Más de una bitácora Forecast por líder en el mismo mes.
- [ACORDADO 02-nov] El filtro abre en «Con novedades».

## 2026-11-02 · Forecast y Backlog · Reuniones sugeridas y Bitácora Forecast

**Qué cambió**
- Reuniones ya no tiene «Programada», «Realizada» ni el campo de notas suelto.
- Kairos sugiere cada mes la reunión de seguimiento por líder y muestra por qué: 3 cuentas activas o más, proyectos, CECO con proyección incompleta o de más, diferencias del cierre.
- Estado del mes por líder: «Pendiente», «Al día · fecha» o «No se sugiere». Indicadores: sugeridas, con bitácora y pendientes.
- El analista registra la **Bitácora tipo Forecast** (solo conclusiones en texto, mínimo 10 caracteres). Se escribe una por líder y queda guardada con la foto de los CECO que el líder tenía activos ese día. No se edita ni se borra; queda en la auditoría.
- Historia: botón «N bitácoras» por líder (historia de sus CECO actuales, incluso de cuando eran de otro líder, con la etiqueta «Líder entonces») e insignia con el número de bitácoras junto al código del CECO en la grilla (escritorio y celular).
- Se conserva «Ver en la grilla». 5 bitácoras de ejemplo (agosto y septiembre).

**Por qué**
Juan: la reunión no se programa ni se marca; el sistema dice que se requiere y el analista deja la bitácora Forecast, que es la historia. Los CECO cambian de líder, así que la historia se consulta por CECO.

**Archivos**
datos/forecast.js · modulos/forecast.html

**Decisiones nuevas**
- [ACORDADO 02-nov] La reunión se sugiere cada mes; se cumple al registrar la bitácora Forecast. Sin estados de programación.
- [ACORDADO 02-nov] Solo el analista de control financiero registra la bitácora. Contenido: solo conclusiones en texto.
- [ACORDADO 02-nov] Una bitácora por líder, guardada en cada CECO activo; la historia sigue al CECO.
- [PROPUESTA] Mostrar las bitácoras Forecast también en Proyectos › Bitácoras.

## 2026-11-02 · Forecast y Backlog · repaso de celular en todas las pestañas
- Qué cambió: en celular, Cumplimiento pasa a tarjetas por líder, cliente, regional o cluster (barra de cumplimiento, comprometido, facturado, pendiente y mezcla; al abrir, sus CECO con facturas); Reuniones pasa a tarjetas (cuentas en proyectos y servicios, interruptores Programada y Realizada, notas y botón a la grilla); en Cierre mensual la resolución queda debajo de la diferencia con selectores y razón a todo el ancho; Tableros ajusta los botones de horizonte; Datos y los selectores ya no se salen de la pantalla; Resumen por líder da más ancho a la descripción. Ninguna pestaña se desplaza de lado a 390 px.
- Por qué: comentario en el artefacto: el módulo no se veía bien en el celular.
- Archivos: modulos/forecast.html.
- Decisiones nuevas: ninguna.

## 2026-11-02 · Forecast y Backlog · Movimientos en celular como tarjetas
- Qué cambió: en celular (menos de 760 px) cada movimiento es una tarjeta: dirección, tipo y categoría, mes de registro y estado arriba; CECO con icono; monto y «de → a»; razón (o campo para escribirla si es borrador); quién lo registró con foto y fecha, y el botón Confirmar. En escritorio sigue la tabla.
- Por qué: comentario en el artefacto: la columna «Registró» se veía mal en el teléfono.
- Archivos: modulos/forecast.html.
- Decisiones nuevas: ninguna.

## 2026-11-02 · Forecast y Backlog · alcance obligatorio por perfil y entrada según obligaciones
- Qué cambió: el módulo aplica un alcance fijo por persona que no se puede quitar ni ampliar desde el módulo, y se muestra arriba con candado («Regional Col_North y tus CECO», «Cluster LATAM», «Tus CECO como líder», «Todo el forecast (analista)»). Todo: analista de forecast, Planeación, Administrativo (solo lectura) y Dirección sin grupo asignado. Líder de cluster: su cluster. Responsable de regional: su regional y sus propios CECO. Líder: sus CECO. Solo aparecen los clusters donde la persona tiene CECO (sin botón de cambio si es uno). El alcance se aplica en todas las pestañas: grilla, tableros, movimientos, cumplimiento, resumen por líder (antes mostraba a todos los líderes), reuniones (solo líderes del alcance) y alertas (solo de CECO del alcance). Quien no ve todo el cluster ya no ve la capacidad del cluster en el carrusel de meses: ve lo proyectado en su alcance. Entrada según perfil: Dirección y líderes de cluster entran a Tableros; el analista entra a Cierre mensual si hay diferencias por resolver; los demás a la Grilla. Quien edita entra con el filtro «Estado: Falta proyectar» si tiene CECO incompletos (este sí se puede quitar). Nueva franja «Pendiente en tu alcance» con botones a cada obligación: diferencias del cierre, proyección incompleta, proyectado de más y movimientos en borrador; si no hay, «Al día».
- Por qué: pedido de Juan del 02-nov: nadie debe ver lo que no le corresponde; prefiltrar por regional, perfil y obligaciones, también por estado.
- Archivos: datos/forecast.js (scopeOf, seesAccount, leaderSummary), modulos/forecast.html.
- Decisiones nuevas: [ACORDADO 02-nov] el alcance es un permiso, no un filtro: no se quita ni se amplía desde el módulo. [ACORDADO 02-nov] Dirección y líderes de cluster entran a Tableros. [ACORDADO 02-nov] quien edita entra filtrado por «Falta proyectar». [PROPUESTA] Planeación y Administrativo ven todo; Dirección sin grupo (CEO, COO, Gerencia comercial) ve todo.

## 2026-11-02 · Shell · menú de usuario con rol, cargo e ID en líneas
- Qué cambió: el encabezado del menú de usuario muestra tres líneas sin etiquetas: rol (con PM o Admin si aplica), cargo (de Entra ID) e ID; el menú pasa de 260 a 300 px y el ID no se parte.
- Por qué: comentario en el artefacto.
- Archivos: index.html.
- Decisiones nuevas: ninguna.

## 2026-11-01 · Configuración · cargos simulados desde Entra ID
- Qué cambió: todas las personas traen un cargo (job title) simulado de Microsoft Entra ID (por ejemplo «Analista de control financiero», «Ingeniero líder de proyectos», «Ingeniera MES»). Se ve en la lista y la ficha de Usuarios y acceso y en el menú de usuario (rol · cargo), pero no se edita en Kairos; la ficha aclara que se cambia en Microsoft 365 / Entra y llega al sincronizar. El «Responsable Col_North» de Iván deja de ser cargo (es una asignación de Kairos y ya se muestra en Inicio); su cargo es «Coordinador regional de proyectos».
- Por qué: pregunta de Juan del 01-nov; se confirma que el cargo viene de Entra ID.
- Archivos: index.html (ENTRA_JOB), modulos/configuracion.html.
- Decisiones nuevas: [ACORDADO 01-nov] el cargo viene de Microsoft Entra ID y no se edita en Kairos.

## 2026-11-01 · Forecast y Backlog · «Mezcla por categoría» reemplaza las donas
- Qué cambió: las dos donas se reemplazan por un panel «Mezcla por categoría»: dos barras 100 % apiladas alineadas (facturado del año y proyectado del horizonte, con su total) y una tabla de tres filas (Ingeniería, Viáticos, Equipos) con el % y el valor facturado, el % y el valor proyectado y el cambio de participación en puntos porcentuales (▲ verde, ▼ naranja). La categoría elegida en los filtros resalta su fila y atenúa las otras partes de las barras.
- Por qué: comentario en el artefacto: con solo 3 categorías y una que domina (~93 %), la dona no se leía; las barras alineadas y la tabla permiten comparar facturado contra proyectado de un vistazo.
- Archivos: modulos/forecast.html.
- Decisiones nuevas: ninguna.

## 2026-11-01 · Forecast y Backlog · Tableros: filtro por categoría y distribución
- Qué cambió: los filtros de Tableros suman «Categoría» (Todas, Ingeniería, Equipos, Viáticos) como botón segmentado con el color de cada una. Aplica a la proyección de facturación y a lo facturado por mes y por cliente (la cascada y los cambios documentados no se separan por categoría). Lo facturado se separa con las facturas de Odoo; la proyección usa el forecast de la categoría. En LATAM los viáticos se proyectan dentro de Ingeniería, así que «Viáticos» muestra solo lo facturado y la proyección de Ingeniería los incluye (se avisa en pantalla). Nuevo panel «Distribución por categoría» al lado del gráfico de proyección: dona de lo facturado en el año y dona de lo proyectado en el horizonte, con porcentajes; responden a los filtros y la categoría elegida se resalta. El filtro de CECO se rotula «CECO».
- Por qué: pedido de Juan del 01-nov: segmentar Ingeniería, Equipos y Viáticos y ver rápido su distribución.
- Archivos: modulos/forecast.html.
- Decisiones nuevas: [PROPUESTA] la dona no se filtra por categoría (sería 100 %); la categoría elegida solo se resalta.

## 2026-11-01 · Forecast y Backlog · Tableros: proyección de facturación y filtros por ingeniero y CECO
- Qué cambió: nuevo gráfico principal «Proyección de facturación» al inicio de Tableros: línea sólida con lo facturado en Odoo mes a mes (todo el histórico disponible), línea punteada con el forecast de los próximos meses, zona sombreada desde «Hoy» y punto naranja con lo facturado a la fecha del mes en curso. Horizonte por defecto 3 meses, con opción de 6, 12 o todo el forecast. Indicadores: total proyectado del horizonte, promedio mensual proyectado, promedio facturado de los últimos 3 meses cerrados y la diferencia entre ambos. Tooltip por mes y vista de tabla. Los filtros de Tableros pasan al panel agrupado con Regional, Líder, Ingeniero (CECO donde la persona lidera o está en el equipo según Proyectos y Reservas) y Proyecto o servicio (un CECO), con botón de limpiar filtros; aplican a todos los gráficos.
- Por qué: comentario en el artefacto: el gráfico más importante del forecast para mostrar a la compañía lo proyectado; filtrar por ingeniero y por proyecto.
- Archivos: modulos/forecast.html.
- Decisiones nuevas: [PROPUESTA] «Ingeniero» filtra por equipo del CECO (líder o integrante), no por horas reservadas del mes.

## 2026-11-01 · Forecast y Backlog · facturas del CECO en Cumplimiento
- Qué cambió: al abrir un grupo en Cumplimiento, cada CECO muestra sus facturas del mes como etiquetas legibles: «Factura FV-14082 · 25 sep · $ 9.000.000 · Ingeniería», con el título «Facturas de Odoo en sep 26»; las notas crédito salen en rojo y restan. Se corrige además el detalle por CECO, que se descuadraba porque la fila usaba la misma clase que las subpestañas.
- Por qué: comentario en el artefacto: no se entendía qué era la línea de 9 millones.
- Archivos: modulos/forecast.html.
- Decisiones nuevas: ninguna.

## 2026-11-01 · Forecast y Backlog · Cumplimiento con mezcla de lo facturado
- Qué cambió: las tarjetas de Cumplimiento quedan solo con el valor (sin texto debajo) y se quita la fila de total de la tabla, porque repetía las tarjetas. Nueva tarjeta «Mezcla de lo facturado» con barra apilada y porcentaje de Ingeniería, Viáticos y Equipos del mes, y nueva columna «Mezcla facturada» por líder, cliente, regional o cluster y por CECO (barra con el % de Ingeniería; el detalle va en el tooltip). Se calcula con las facturas de Odoo del mes por categoría, en la moneda del cluster; en LATAM los viáticos se separan aquí aunque en la grilla se suman a Ingeniería.
- Por qué: comentario en el artefacto: saber rápido si se está vendiendo Ingeniería, el core.
- Archivos: modulos/forecast.html.
- Decisiones nuevas: [PROPUESTA] la mezcla se mide sobre lo facturado del mes (no sobre lo comprometido, que en LATAM no separa viáticos).

## 2026-11-01 · Forecast y Backlog · rediseño de Movimientos, Cumplimiento, Resumen por líder, Reuniones y Alertas
- Qué cambió (solo diseño, misma funcionalidad): las cinco vistas siguen el patrón de la grilla. Filtros agrupados en un panel con botón de limpiar filtros; tablas con encabezados en mayúsculas pequeñas, CECO con icono de tipo, nombre y cliente, personas con foto y valores con signo y separador de miles. Movimientos: chip por dirección (Anticipado azul, Aplazado naranja, Eliminado gris) con «Pago» o «Proyección» y la categoría; columna «De → a»; resumen de montos por dirección; borradores resaltados. Cumplimiento: tabla agrupable con barra de cumplimiento por fila, detalle por CECO con facturas, serie mensual a la derecha (clic cambia el mes) y lista de facturado no comprometido. Resumen por líder: una tarjeta por líder con foto, clientes y CECO con icono, categorías con nombre completo (el correo copiado no cambia). Reuniones: indicadores (requieren, programadas, realizadas), cuentas separadas en proyectos y servicios, interruptores para programada y realizada, y botón con icono para ver la grilla del líder. Alertas: indicadores por nivel, chips por tipo, filas con color e icono por nivel, CECO con icono y destinatario con foto. En la grilla, el backlog ahora muestra cuánto se ha facturado: «$ 10.500.000 facturado · 105 %» y «de $ 10.000.000 vendido».
- Por qué: pedido de Juan del 01-nov y comentario en el artefacto sobre la información de facturado.
- Archivos: modulos/forecast.html.
- Decisiones nuevas: ninguna.

## 2026-11-01 · Ecosistema · iconos de tipo de CECO, botón de limpiar filtros, volver a hoy y engranajes
- Qué cambió: nuevo datos/tipos.js (KairosTipos) con los iconos de tipo del boceto 11: Proyecto (bandera, azul), y servicios Mantenimiento (llave, verde azulado), Suministro (caja, ocre), Bolsa de horas (reloj de arena, violeta) y Puntual (rayo, gris; Urgencia = Puntual con punto rojo). Glifo + color + tooltip corto («Proyecto», «Servicio · Mantenimiento»), con variantes para modo oscuro. Se usan en Forecast (grilla y tarjetas de celular), Proyectos (tarjetas, lista, ficha y filtros), Reservas (columna Proyecto / CECO), Ejecución (líneas por proyecto), Analítica (Proyectos y Servicios y selector de tipo) e Inicio (Mis proyectos y servicios). Los selectores de tipo solo distinguen Proyectos y Servicios (bandera y los 4 colores de servicio). Botón de limpiar filtros con icono de embudo tachado, tooltip «Limpiar filtros (n)», contador y apagado sin filtros, en Forecast, Proyectos, Reservas y Analítica (Proyectos y Servicios, Por regional). En Forecast, «Volver a hoy» pasa a ser un botón con icono de deshacer y tooltip. El icono de Configuración pasa a dos engranajes. «Arranque anticipado» deja la bandera (ahora significa Proyecto) y usa un reloj.
- Por qué: pedido de Juan con boceto 11 aprobado y comentarios en el artefacto del 01-nov.
- Archivos: datos/tipos.js (nuevo), datos/kairos-maestros.js (subtipos: 30311053600 y 30901001400 Suministro; 30313002700 Urgencia), index.html, modulos/forecast.html, modulos/proyectos.html, modulos/reservas.html, modulos/ejecucion-app.js, modulos/analitica.html.
- Decisiones nuevas: [ACORDADO 01-nov] subtipos de servicio: Mantenimiento, Suministro, Bolsa de horas y Puntual; Urgencia es una marca del Puntual. [ACORDADO 01-nov] el subtipo es un atributo del CECO en Kairos (Odoo no lo trae). [CAMBIA MAESTRO §tipos de servicio] Suministro pasa a ser subtipo de servicio del CECO, además de modalidad de cotización.

## 2026-11-01 · Menú · icono de Forecast y salida de Seguimiento
- Qué cambió: «Forecast y Backlog» usa el icono de línea de tendencia que tenía «Seguimiento» (ya no repite el de Analítica). La entrada «Seguimiento» (marcada «Próx.») sale del menú.
- Por qué: comentario en el artefacto: el avance y las desviaciones ya viven en omnIA (alertas de seguimiento), Proyectos y Analítica.
- Archivos: index.html (MODS).
- Decisiones nuevas: [CAMBIA MAESTRO §módulos] Seguimiento deja de ser un módulo propio del menú; su contenido queda repartido en omnIA, Proyectos y Analítica.

## 2026-11-01 · Forecast y Backlog · chip de «Por proyectar» en dos líneas
- Qué cambió: los chips «Falta» y «Sobra» se muestran en dos líneas (la palabra arriba, el valor abajo) y la columna se angosta de 136 a 122 px; «Completo» sigue en una línea.
- Por qué: comentario en el artefacto: evitar que la columna crezca.
- Archivos: modulos/forecast.html.
- Decisiones nuevas: ninguna.

## 2026-11-01 · Forecast y Backlog · grilla rediseñada (boceto 9 y 10)
- Qué cambió: la grilla de escritorio se rehízo al estilo de Reservas. Arriba, un carrusel de meses con ventana fija de 3 meses (por defecto el mes en curso y los 2 siguientes); ‹ › mueven la ventana un mes atrás o adelante, tocar un mes la deja empezando ahí y «Volver a hoy» regresa. Cada chip de mes futuro muestra la capacidad (ingenieros · ocupación) y reemplaza las 3 tarjetas; los meses cerrados salen con candado y su cumplimiento y, al entrar en la ventana, se ven en solo consulta (facturado en Odoo, comprometido en el snapshot y %; «Sin compromiso» o «no comprometido» cuando aplica). Filtros agrupados en un panel: buscador, Regional, Líder, Cliente y Estado; Tipo como botón con iconos (Proyectos, Servicios); filtros activos como chips con X y LIMPIAR FILTROS. Grilla: CECO con icono de tipo, nombre, cliente y regional (columna fija al desplazar); líder con foto; una subfila por categoría con nombre completo (Ingeniería, Equipos, Viáticos) solo si tiene valores; backlog con barra «Facturado N % de $ vendido» y lápiz del analista para ajustarlo; «Por proyectar» como chip (Completo, Falta $ X, Sobra $ X) que se recalcula al editar y marca «sin guardar»; valores con signo y separador de miles ($, US$, €). Un bloque por moneda con sus totales por mes y, al final, el total consolidado en la moneda del cluster. Barra de guardado oscura abajo solo con cambios. Enter baja en el mismo mes y pegar desde Excel sigue funcionando. En celular se mantiene la vista por tarjetas con el nuevo panel de filtros.
- Por qué: pedido de Juan con boceto aprobado el 01-nov.
- Archivos: modulos/forecast.html.
- Decisiones nuevas: [ACORDADO 01-nov] vendido y facturado van dentro de la barra del backlog; los meses cerrados se pueden ver pero no se editan; siempre ventana de 3 meses que se desplaza adelante y atrás.

## 2026-11-01 · Inicio · bloque compacto de regionales para líderes de cluster
- Qué cambió: «Tus regionales» pasa de tarjetas sueltas a un solo bloque con fondo propio, alineado al ancho del lienzo: encabezado con el número de regionales, franja de resumen (CECO activos, vendido, facturado, por facturar) y una fila por regional (responsable, CECO y líderes, barra de facturado, por facturar, ocupación y alertas). Cada fila abre Analítica en esa regional. En celular cada fila se apila en dos o tres líneas. Sirve igual para 2 regionales (North America) que para 5 (LATAM).
- Por qué: comentario en el artefacto: más compacto y sin desordenar la vista.
- Archivos: index.html (regionalSection, estilos .rg-box y .rg-row).
- Decisiones nuevas: ninguna.

## 2026-11-01 · Inicio · «Tu regional» en la columna derecha
- Qué cambió: para quien es responsable de una sola regional (p. ej. Iván Paternina en Col_North), la tarjeta «Tu regional» deja de ser una sección suelta a todo el ancho y pasa a la columna derecha, arriba de «Mis reservas»; Pendientes queda a la izquierda. Los líderes de cluster (varias regionales) siguen viendo la vista ancha con resumen y una tarjeta por regional.
- Por qué: comentario en el artefacto: la tarjeta aislada desperdiciaba espacio.
- Archivos: index.html (regionalSection, inicioView, estilos .rg-side).
- Decisiones nuevas: ninguna.

## 2026-10-31 · Forecast y Backlog · Tableros y vista de celular
- Qué cambió: subpestaña nueva «Tableros» con cuatro gráficos y su tabla equivalente: Facturado por mes (ene–oct, con la marca de lo comprometido en cada snapshot y el % de cumplimiento), Facturado por cliente (consolidado en la moneda del cluster y valor en moneda original al tocar), Cascada de movimientos del mes cerrado (comprometido + facturado de más + no comprometido − aplazado − eliminado − sin resolver = facturado, filtrable por cliente) y Cambios documentados y alertas mes a mes (anticipado arriba, aplazado y eliminado abajo; tabla con movimientos, % con razón, proyección vencida sin documentar, mes proyectado sin factura y proyección incompleta). Filtros por regional y líder; cada usuario ve solo los CECO que le corresponden. En celular (menos de 760 px): filtros plegables, subpestañas en una fila deslizable, la grilla pasa a una tarjeta por CECO con un mes a la vez (selector de mes fijo arriba, campos de 44 px, detalle desplegable con vendido, facturado, pendiente, backlog y meses con valor), barra de guardado fija abajo solo cuando hay cambios, tablas de Movimientos, Cierre, Cumplimiento y Reuniones leídas como tarjetas y ventanas como hoja inferior. Los totales por regional quedan solo en escritorio.
- Por qué: la vista de celular era incómoda; y faltaban los gráficos de facturado, cascada y cambios documentados con alertas que pide el levantamiento (D-23, D-24, RF-25, RF-26).
- Archivos: datos/forecast.js (billedByMonth, billedByClient, cascade, changesByMonth), modulos/forecast.html.
- Decisiones nuevas: [PROPUESTA] paleta de gráficos: azul para lo que suma, naranja para lo que resta y gris para totales (validada en claro y oscuro); el eliminado lleva trama para no depender del color. [PROPUESTA] la cascada usa eje recortado («escala desde…») porque los movimientos son pequeños frente al total. [PROPUESTA] las alertas de meses cerrados se reconstruyen con el snapshot y lo facturado; las del mes en curso son las vivas.

## 2026-10-31 · Forecast y Backlog (módulo nuevo en el mundo de Analítica)
- Qué cambió: módulo «Forecast y Backlog» (menú Gestión y pestaña en Analítica) que reemplaza el Excel con macros. Subpestañas: Grilla (15 meses × 2 categorías, vendido, facturado, pendiente, backlog, «por proyectar» ✓ ✗ ▲, edición tipo hoja de cálculo con Tab, Enter, pegar desde Excel y deshacer, totales por regional y mes, capacidad M, M+1 y M+2, historial por celda), Movimientos (filtros, borradores, alta manual), Cierre mensual (paso 1 diferencias del mes anterior con Payment - Anticipated / Delayed / Deleted, paso 2 snapshot abierto/cerrado), Cumplimiento (por líder, cliente, regional o cluster, serie mensual, facturado no comprometido, facturas por CECO), Resumen por líder (bloques @Líder → cliente, Notificar a Inicio, Copiar para correo en HTML), Reuniones, Alertas y Datos (sincronizar, simular factura, exportar CSV, restablecer). Parámetros de capacidad y tolerancia en Configuración › Analítica. Alertas en Inicio para líderes y analista.
- Por qué: prompt de Forecast con los ajustes acordados el 31-oct.
- Archivos: datos/forecast.js (nuevo: FxService, ForecastCalculator, MovementEngine, repositorio `kairos-forecast`, semilla), modulos/forecast.html (nuevo), index.html (módulo, capacidad, acceso, pendientes), modulos/analitica.html (pestaña), modulos/configuracion.html (parámetros).
- Decisiones nuevas: [CAMBIA MAESTRO §13.1] capacidad nueva «Forecast y Backlog» (analista de control financiero), por defecto a Isabela Tierradentro (Planeación). [ACORDADO 31-oct] cuenta = CECO; región = cluster; la TRM es la de Odoo (lo facturado con la de su fecha; forecast y backlog con la última), sin tasa de planeación propia. [PROPUESTA] líder y responsables de su grupo editan el forecast de sus CECO; Dirección, Planeación y Administrativo lo ven completo; el ajuste de backlog, el cierre y la sincronización son solo del analista. [PROPUESTA] el alta manual de movimientos no cambia la grilla.
- Pendiente: Tableros (gráficos de facturado, cascada de movimientos, cambios por mes) no se construyeron; la vista «Por regional» de Analítica cubre parte. El analista no está limitado por región.
- Verificado: 30312001900 pasa de ✗ (falta 3.887.400) a ✓ al proyectar en noviembre; viáticos 23.000.000 / 6.000.000 / 17.000.000; mover 10.904.000 EQ de dic a nov en 30311053600 propone Forecast - Anticipated y no guarda sin razón; 30701006700 con backlog 0 queda ✓ y el líder no ve «Ajustar»; capacidad 608.333.271 COP → 29 ingenieros, 56,6 %; cierre no avanza con diferencias, snapshot de oct tomado y cerrado; simular una factura de 50 M sube el cumplimiento de oct de 60 % a 69 % sin recargar; reuniones (3 cuentas o un Project); inconsistencia «Unclassified» y sobrefacturación en Alertas; Brainer (líder y responsable Col_West), Gonzalo a 390 px oscuro, ida y vuelta desde Analítica; sin errores.

## 2026-10-31 · Inicio y Analítica · vista rápida por cluster y regional
- Qué cambió: en Inicio, el líder de cluster ve «Tus regionales» (totales del cluster y una tarjeta por regional) y el responsable de regional ve «Tu regional». Cada tarjeta: responsable, CECO activos y líderes, avance de facturación, pendiente por facturar, alertas de seguimiento y ocupación del equipo; clic abre Analítica filtrada. Analítica tiene la pestaña «Por regional»: filtros por cluster, regional, líder y cliente; «Agrupar por» regional, líder o cliente; tabla que se despliega grupo → líder (o cliente) → CECO. El botón de Configuración en Inicio es un engranaje con tooltip.
- Por qué: boceto 7 y 8 aprobados por Juan el 31-oct (indicadores: facturación, pendiente, alertas, ocupación; el responsable de regional también ve su tarjeta).
- Archivos: datos/vista-regional.js (nuevo, cálculo único `KairosRegional`), index.html, modulos/analitica.html.
- Reglas: vendido con la TRM de hoy y facturado con la TRM de cada factura (Odoo simulado), consolidados en COP (LATAM) o USD (North America o todos los clusters). Ocupación = horas reservadas esta semana en esos CECO / capacidad de las personas de sus equipos; sin reservas se muestra «—». Alcance: Dirección, Planeación y Administrativo ven todo; los demás, lo que lideran más su grupo.
- Pendiente: la ocupación de los CECO nuevos sale «—» hasta conectar Reservas a los datos compartidos (paso 5).
- Verificado: Gonzalo (5 regionales, totales LATAM, clic a Col_West filtrado, despliegue Col_Andean East → Ernesto Osorio → CECO, agrupar por líder, todos los clusters en USD), Iván (solo Col_North en Inicio y Analítica), Rafael a 390 px oscuro, Juan Dueñas sin sección; sin errores.

## 2026-10-31 · Inicio y Proyectos · identidad de grupo
- Qué cambió: bajo «Hola, …» en Inicio aparece «Líder de cluster LATAM / North America» o «Responsable de la regional …»; el líder de cluster tiene el botón «Cambiar responsables en Configuración», que abre esa pestaña. En Proyectos el filtro se llama «Mi cluster» (líder de cluster) o «Mi regional» (responsable de regional).
- Por qué: pedido de Juan el 31-oct.
- Archivos: index.html, modulos/configuracion.html (abre la pestaña pedida), modulos/proyectos.html.
- Decisiones nuevas: [PROPUESTA] boceto 7 y 8 («Vista rápida por cluster y regional»): tarjetas por regional en Inicio del líder de cluster y segmentación «Agrupar por» en Analítica. Pendiente de aprobación.

## 2026-10-31 · Proyectos y Configuración · «Mi grupo» opcional y asignación por líder de cluster
- Qué cambió: en Proyectos cada persona ve por defecto solo lo que lidera o donde participa; el grupo del responsable aparece solo al activar «Mi grupo», con un filtro por líder. El filtro sale para cualquier perfil que sea responsable (también Dirección). En Configuración, el líder de cluster ve «Clusters y regionales» y asigna el responsable de las regionales de su cluster; los responsables de cluster y los márgenes los cambia solo Administrar. Reasignar el líder de un CECO sigue en la ficha (Settings).
- Por qué: aclaración de Juan el 31-oct.
- Archivos: modulos/proyectos.html, modulos/configuracion.html.
- Decisiones nuevas: [ACORDADO 31-oct, Juan] el grupo es un filtro opcional, no la vista por defecto; asignar responsables es solo en Configuración; el líder de cluster asigna los responsables de sus regionales; el responsable de regional no asigna responsables; la reasignación de líder de CECO queda en la ficha (Planeación y responsables del grupo).
- Verificado: Iván Paternina (3 por defecto, 4 con «Mi grupo», filtro por Juan Dueñas, sin pestaña de configuración), Gonzalo Perdomo (Mi grupo 24, asigna Col_North a otra persona), Rafael de Vega (solo US_South y Corporate Program, márgenes en lectura), Administrar (todo editable); sin errores.

## 2026-10-31 · Datos compartidos · paso 2 (Configuración y Proyectos)
- Qué cambió: el shell carga `datos/kairos-maestros.js` y `datos/odoo-simulado.js`. Configuración tiene la pestaña «Clusters y regionales» (solo Administrar): clusters y regionales de Odoo con su número de CECO, responsable de cada uno (selector) y margen mínimo por modalidad y cluster. Proyectos se arma desde los datos compartidos: cada registro es un CECO (30 vigentes + 2 cerrados + ANT-0003 por adjudicar), con cliente, sitio, regional, cluster y moneda de Odoo y la sombrilla como agrupador; filtros por cluster y regional; el responsable de la regional o del cluster ve su grupo («Mi grupo»), edita como el líder y puede reasignar el líder. Iván Paternina entra como Líder.
- Por qué: paso 2 del plan de migración (doc «Kairos · Maestros de datos de ejemplo»).
- Archivos: index.html (scripts y persona nueva), datos/kairos-maestros.js (asignaciones vigentes, márgenes, `grupos`, `gestiona`), modulos/configuracion.html, modulos/proyectos.html (semilla v2, permisos de grupo, filtros, datos del CECO), omnia/seguimiento-seed.js (corte regenerado).
- Datos: `kairos-proyectos-v1-real` sube a versión interna 2 y se vuelve a sembrar; `kairos-organizacion` guarda responsables y márgenes.
- Decisiones nuevas: [PROPUESTA] el «suministro adicional» deja de vivir dentro del proyecto: es otro CECO de la misma sombrilla (p01 ya no es multi-CECO). [PROPUESTA] ANT-0003 pasa a Luis Lara (Laura Posso es Ejecutor).
- Pendiente: Cotizaciones, Reservas y Ejecución, Analítica y omnIA aún usan sus datos propios (pasos 3 a 7).
- Verificado: Planeación (30 CECO, filtros NA y US_South), Iván Paternina (4 CECO de Col_North, «Mi grupo», reasigna líder en un CECO de Juan Dueñas), Juan Dueñas (solo el suyo), Rafael de Vega a 390 px oscuro (6 CECO de North America), Administrar (responsable y margen guardados); todos los módulos abren sin errores con 5 perfiles.

## 2026-10-31 · Datos compartidos · paso 1 (archivos, aún sin conectar)
- Qué cambió: dos fuentes únicas de datos ficticios. `datos/odoo-simulado.js` (OdooSim: clientes con país y cluster, clusters, 7 regionales, monedas, TRM diaria ene–oct 2026, 31 cuentas analíticas = CECO, pedidos y 121 facturas, `searchRead` con forma de JSON-RPC). `datos/kairos-maestros.js` (KairosMaestros: responsables de cluster y regional, 24 sombrillas, líder y datos operativos por CECO, margen mínimo configurable, mapeo del cluster viejo). Ningún módulo los usa todavía.
- Por qué: reorganizar los datos de ejemplo con la estructura acordada antes de construir Forecast y Backlog.
- Archivos: datos/odoo-simulado.js, datos/kairos-maestros.js (nuevos).
- Decisiones nuevas: [CAMBIA MAESTRO §3.2 y §10] la cuenta analítica de Odoo es cada CECO; la sombrilla solo agrupa CECO. [CAMBIA MAESTRO §13.1] cluster = LATAM y North America, lo define el país del cliente; la regional es atributo del CECO y se elige dentro del cluster del cliente; Nacional y Latinoamérica pasan a LATAM, Norteamérica y Europa a North America. [CAMBIA MAESTRO §13.1] responsables de cluster (Gonzalo Perdomo LATAM, Rafael de Vega NA) y de regional (Iván Paternina Col_North; resto propuesta) son asignaciones: filtran y dan edición sobre los CECO de su grupo, incluida la reasignación de líder. [ACORDADO] margen mínimo configurable por modalidad y cluster; valores iniciales de propuesta. [ACORDADO] la TRM, lo vendido y lo facturado son de Odoo; Kairos solo lee. [ACORDADO] Forecast y Backlog va dentro de Analítica; el analista es Planeación con acceso al módulo.
- Verificado: los 10 casos de prueba del prompt de Forecast cuadran (vendido, facturado, nota crédito, línea sin categoría, sobrefacturación, USD y EUR); TRM USD→COP 3.910–4.191, EUR→USD 1,052–1,146.

## 2026-10-31 · omnIA · Modo consulta para perfiles sin Chat
- Qué cambió: quien no tiene la capacidad Chat ya no ve «Sin permiso». El panel abre en «Avisos de tus proyectos» y «Para ti» (sugerencias por reglas: completar horas de la semana anterior, registrar la semana en curso, próxima semana sin reserva). Estado «Avisos», orbe normal, sin nueva conversación, historial ni cuadro de texto. El Administrativo sin Chat y sin nada que mostrar no ve el lanzador ni la entrada del menú.
- Por qué: boceto aprobado por Juan el 31-oct (tableros 5 y 6 del boceto de Alertas). Maestro 13, punto 3: el Ejecutor y el Administrativo ven avisos y sugerencias asistidas.
- Archivos: omnia/app.js, omnia/omnia.css.
- Decisiones nuevas: [ACORDADO 31-oct, Juan] modo consulta para perfiles sin Chat; ocultar omnIA al Administrativo mientras no tenga nada que mostrar. El modo consulta no usa el modelo ni cuenta para el límite de uso. Las sugerencias de ejemplo de `omnia/data.js` (assisted) ya no se muestran en este modo.
- Verificado: Ejecutor con avisos (escritorio y 390 px oscuro), Ejecutor sin avisos, Ejecutor con horas pendientes, Administrativo (sin lanzador); Líder, Dirección y Solution Design sin cambios; sin errores de consola.

## 2026-10-31 · omnIA · Capacidades Chat y Cotizar alineadas con el Maestro
- Qué cambió: el Líder recibe Cotizar por defecto; el Ejecutor deja de tener Chat (ve avisos y sugerencias asistidas). omnIA lee las capacidades de la persona desde el shell (`KAIROS_SHELL.caps`), así que lo que asigne Administrar en Configuración aplica también en omnIA. Textos de «tu rol» pasan a «capacidad asignada»; el alcance del saludo menciona los avisos solo a quien los recibe.
- Por qué: el prototipo contradecía el Maestro 13, puntos 1 a 3 (aprobado por Juan el 31-oct).
- Archivos: index.html (ROLE_CAPS), omnia/app.js (CAPS de respaldo, role(), textos).
- Decisiones nuevas: ninguna; se aplica lo ya acordado.
- Verificado: Ejecutor sin chat a 390 px con avisos visibles; Líder arma una cotización con omnIA; Solution Design y Dirección sin cambios; sin errores de consola.

## 2026-10-31 · omnIA · Alertas de seguimiento (implementado)
- Qué cambió: la pestaña Avisos de omnIA deja de ser ejemplo y calcula alertas reales del prototipo con regla fija (horas vs avance, semana sin reporte). El líder del proyecto y Dirección registran explicación con causas; entra a la Bitácora del proyecto como «Explicación de alerta». Aviso crítico inmediato al entrar; pill de alerta en Proyectos; umbrales en Configuración › omnIA (solo Administrar, validados).
- Por qué: boceto aprobado por Juan el 31-oct (Maestro 13, punto 15).
- Archivos: omnia/seguimiento.js (nuevo, motor), omnia/seguimiento-seed.js (nuevo, corte de referencia), omnia/app.js, omnia/omnia.css, index.html, modulos/proyectos.html, modulos/configuracion.html.
- Datos: Proyectos publica `kairos-seguimiento-corte` (8 semanas de horas y avance por proyecto activo); explicaciones en `kairos-seguimiento`; umbrales en `kairos-omnia-alertas`.
- Decisiones nuevas: [ACORDADO 31-oct, Juan] las cuatro propuestas del boceto (sin reporte importante y crítica a la segunda semana; cierre tras 2 cortes bajo el umbral; resumen lunes 7:00 a líder y Dirección; servicios fuera de la regla de horas). [ACORDADO] visibilidad: Dirección y Planeación todo, líder sus proyectos, ejecutor los de su equipo, Solution Design y Administrativo no reciben alertas. Explican: líder del proyecto y Dirección.
- Desviación del boceto: la pregunta de omnIA y el formulario de causas están dentro de la tarjeta de Avisos y no en el hilo del proyecto, porque omnIA aún no recibe el registro abierto en Proyectos (usa un contexto fijo de demo).
- Verificado: Líder, Dirección, Ejecutor (390 px, oscuro), Solution Design y Administrar; sin errores de consola.

## 2026-10-31 · omnIA · Alertas de seguimiento (boceto)
- Qué cambió: boceto de 4 tableros (Avisos para Dirección, explicación del líder, umbrales en Configuración, Ejecutor a 390 px) en claude.ai/artifact/P4t185ZGFqSnyrFTnbzigD. Sin código.
- Por qué: Maestro 13 punto 15; se eligió empezar por Alertas antes que el Estimador.
- Archivos: ninguno del prototipo.
- Decisiones nuevas: [PROPUESTA] semana sin reporte = Importante, Crítica a la segunda seguida; cierre tras 2 cortes bajo el umbral; resumen de importantes lunes 7:00 a líder y Dirección; servicios sin % de avance quedan fuera de la regla horas vs avance; causas predefinidas en la explicación.

## 2026-10-31 · Publicacion del prototipo
- Qué cambió: prototipo v87 publicado como artefacto propio (claude.ai/artifact/9mrdrQQar8Q6yJV5muh7AF), con capacidad de descargas. Sin cambios de codigo.
- Por qué: el artefacto original es de otra cuenta.
- Archivos: index.html + modulos/, omnia/, lib/, assets/ (26 archivos).
- Decisiones nuevas: ninguna. Pendiente: el enlace LINKS.omnia de index.html sigue apuntando al artefacto original.

## 2026-10-31 · Entrega inicial
- Qué cambió: paquete armado para continuar con omnIA.
- Por qué: traspaso a un segundo desarrollador.
- Archivos: todo el paquete.
- Decisiones nuevas: ninguna (las vigentes están en el Maestro, sección 13).
