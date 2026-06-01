/**
 * ========================================
 * QIDA ASSISTANT v1.17.0
 * ========================================
 * Workspace operativo de Seguimientos para AFs sobre Odoo.
 * Vanilla ES5, sin deps. Single IIFE.
 *
 * Principio rector NO NEGOCIABLE:
 *   El widget NO genera mensajes para el lead.
 *   Solo consolida contexto y agiliza el flujo operativo de la AF.
 *
 * Cambios v1.17.0 (2 fixes UX en el modal del lead):
 *   - CAMBIO 1 — sufijo "días" en "Sin contacto":
 *       * Dashboard (renderDiasCell): el número grande lleva un <span> "días" más chico
 *         (.qida-cell-days-unit, 11px/opacity .7) que no compite; la fecha pequeña se conserva.
 *       * Header del detalle (syncShellHeader): pill "Sin contacto: N d" -> "Sin contacto: N días".
 *   - CAMBIO 2 — temperatura visible y editable en el header del detalle:
 *       * Botón "Swap" ELIMINADO (y el anchor vestigial qida-asst-anchor + el handler
 *         toggle-detail-layout). El layout queda fijo en el default (detailLayoutSwapped sigue
 *         true: IA al centro, info a la derecha; renderDetail sin cambios).
 *       * Pill de temperatura en .qida-dsh-meta (alineado con el resto de referencias del lead):
 *         barrita monocroma (colores admin rojo/ámbar/azul/gris) + label (Caliente/Templado/
 *         Frío/Pausa) + lápiz. Lee getLeadTemperature(lead) (override de sesión EDITS.temperatures).
 *       * Click -> dropdown compacto anclado al pill (position:absolute) + backdrop fixed para
 *         click-fuera; Esc lo cierra. Opciones: Caliente/Templado/Frío/Pausa. set-temp escribe
 *         EDITS.temperatures[leadId]={temperature,source:'AF'} (persiste en sesión; al reabrir el
 *         lead se mantiene) + showToast "Temperatura actualizada". // TODO[odoo]: PUT
 *         /api/leads/{id}/temperature. Sin backend por ahora.
 *       * State nuevo: tempEditorOpen (transitorio; reset en closeModal/select-lead/back).
 *   - Nota: las filas del dashboard vienen de otro mock (MOCK_*_RESPONSE) y NO se re-tiñen con el
 *     cambio del pill (fuera de alcance de estos 2 cambios). El override afecta el lead (MOCK_LEADS).
 *   - NO se toca: dashboard cerrado (v1.14.1), agent-builder (v1.15.0), bloques v1.16.0.
 *
 * Cambios v1.16.0 (3 fixes UX en el modal del lead, quirúrgicos e independientes):
 *   - CAMBIO 1 — Bloque "Análisis IA" en la columna del detalle, JUSTO debajo de "Resumen IA"
 *     (renderCenterPane: renderIaSummary -> renderIaAnalysis -> renderCare ...). Mismo patrón
 *     visual que Resumen IA (infoCard + header ✨ + acción + "Generado hace X" + body / vacío).
 *     SIN backend ni edición inline: Generar/Regenerar hacen console.log + toast (preparación de
 *     UI). Mock MOCK_IA_ANALYSIS (mismo shape que MOCK_IA_SUMMARIES): algunos leads con análisis,
 *     otros vacíos. El texto junta dos contenidos: por qué se sugiere seguimiento + contexto.
 *     Funciones nuevas: getIaAnalysis, renderIaAnalysis. Handler nuevo: regen-ia-analysis.
 *   - CAMBIO 2 — Scroll del chat WhatsApp. overflow-y:auto ya existía (.qida-pane-wa-body) y el
 *     scroll-al-fondo ya se disparaba al abrir el lead (select-lead) y al enviar (sendWhatsAppMock).
 *     Se agrega el caso del botón Swap: toggle-detail-layout ahora setea __waNeedsScroll (y
 *     __aiNeedsScroll) para re-posicionar ambos panes al fondo tras el rerender.
 *   - CAMBIO 3 — Cruz "Cerrar" siempre a la derecha del header en TODAS las vistas
 *     (dashboard/detail/leadersDashboard/agentBuilder). Causa: .qida-shell-header es flex
 *     space-between y en vistas sin título a la izquierda el bloque de acciones quedaba a la
 *     izquierda. Fix de 1 línea: .qida-shell-actions{margin-left:auto}. Orden interno ya correcto
 *     ([acciones][Esc][✕]), sin tocar el markup de ninguna vista.
 *   - NO se toca: dashboard cerrado (v1.14.1), lógica del agent-builder (v1.15.0, solo hereda la
 *     cruz a la derecha), endpoints. El bloque Análisis IA es UI con mock.
 *
 * Cambios v1.15.0 (Asistente IA configurable por AF - drafts dinámicos + "Armá tu asistente"):
 *   Principio rector intacto: la IA propone, la AF edita y envía (copy-to-WA editable).
 *   - PIEZA A — "Sugerir mensaje" pasa de 2 variantes hardcoded (MOCK_AI_RESPONSES) a las
 *     variantes configuradas por la AF vía DraftService.getRecommendation(leadId).getRecommendation
 *     devuelve drafts:[{name,length,tone_style,text}]. Header de cada card = humanizeVariantName
 *     (corto_directo -> "Corto directo"). El flujo posterior ("Esta me gusta más" -> refine ->
 *     "Copiar al WhatsApp") NO cambia. Casos edge: should_followup_today:false / fallback:true /
 *     drafts:[] -> burbuja IA con copy específico. AISLADO con un if explícito en handleAiChip:
 *     'material-marketing' y 'reactivar-sin-presionar' quedan EXACTAMENTE igual (sin regresión).
 *   - PIEZA B — pantalla "Armá tu asistente" (state.view==='agentBuilder', precedente Panel de
 *     Líderes). Acceso: botón chico en el shell header del dashboard (al lado de "Esc para
 *     cerrar"), visible para todas las AFs. 1-3 variantes; cada una = name + length + tone_style.
 *     Validación live (1-3; name <40, único, no vacío; enums cerrados) gatea "Guardar". Tooltips
 *     en length/tone. Dropdowns .qida-leader-select, botones .qida-btn-primary/ghost, showToast.
 *     Cambios sin guardar + Volver/Esc -> confirm "¿Descartar cambios?".
 *   - PIEZA C — sendAssistantEvent(eventType, payload): wrapper PII-ESTRICTO (solo metadata,
 *     nunca el texto del draft/lead) con try/catch silencioso (F2.9 puede no existir). Dispara
 *     draft_copied al copiar un draft al WhatsApp. thumbs_explicit: el wrapper lo acepta pero la
 *     UI de 👍/👎 NO se agrega todavía (decisión de producto). draft_sent lo emite el backend.
 *   - Mocks nuevos: DRAFT_LENGTHS/TONE_STYLES (+labels/tooltips), MOCK_ACTIVE_AFS (email->af_key,
 *     espejo de ACTIVE_AFS_JSON), MOCK_DRAFT_VARIANTS_DEFAULT/_BY_AF, TONE_TEMPLATES,
 *     MOCK_RECOMMENDATION_OVERRIDES (QA de edge cases). af_key se deriva de _currentUserEmail
 *     vía resolveAfKey() (dev: fallback al primer AF activo). DraftService centraliza el mapeo
 *     (cuando llegue el spec real, swap = 1 función). NINGÚN endpoint real cableado aún.
 *   - State nuevo: draftVariants/draftVariantsSaved/draftVariantsLoaded/agentBuilderConfirmDiscard/
 *     recommendationCache. Persisten en sesión (salvo el confirm, transitorio en closeModal).
 *   - NO se toca: dashboard de Seguimientos (otra feature), Panel de Líderes, detalle del lead
 *     más allá de Pieza A, loaders, WIDGET_URL.
 *
 * DEFAULTS QUE TOME EN v1.15.0:
 *   - Anexo del spec del backend llegó vacío: shapes inferidas del cuerpo del prompt (enums
 *     length{short,medium}/tone{neutral,direct,empathic}, /recommendation con drafts). Copy de
 *     fallback = placeholder marcado // TODO[spec]. Todo centralizado en DraftService.
 *   - draft_copied scoped SOLO a drafts (source==='draft'); reactivar/material NO lo disparan.
 *   - Botón "Armá tu asistente" visible para todas las AFs (sin flag por rol en MVP).
 *
 * Cambios v1.14.1 (fixes visuales para igualar la estética .qida-leader-table):
 *   - FIX alineación header vs filas: la última columna (Acción) pasa de 'auto' a ancho FIJO
 *     (132px). Con 'auto' el header (celda vacía=0) y la fila (botón "Marcar hecho") daban
 *     distinto ancho a esa pista, y al haber columnas fr el reparto cambiaba -> todo se corría.
 *     grid-template idéntico en .qida-dash-header y .qida-dash-row en TODOS los breakpoints.
 *   - Header de tabla con fondo gris #f3f4f6 + color s700 (antes se veía blanco como otra fila).
 *   - Tabla encapsulada en card con borde redondeado (.qida-dash-table-card) + header-bar con
 *     título por vista ("Sugerencias para hoy"/"Actividades programadas"/"Todos los leads") y
 *     contador de leads. Replica el patrón .qida-leader-table-card de admin.
 *   - Columna "Días" renombrada a "Sin contacto" (vocabulario que la AF ya conocía). Valor
 *     (número + fecha) sin cambios. Ancho de columna ajustado (84px) para el header de 2 palabras.
 *
 * Cambios v1.14.0 (rediseño visual del dashboard AF - porta el sistema del Panel de Líderes):
 *   Motivo: la v1.13 superponía 5 sistemas de señalización en la fila (color de fondo por
 *   temperatura + rail izquierdo + badges inline + tinte verde + punto rojo), con colores que
 *   se contradecían. Se pasa de "codificar en colores de fila" a "explicitar en columnas".
 *   - Fila SIN color de fondo por temperatura, SIN rail, SIN tinte, SIN punto de urgencia media,
 *     SIN badges/iconos inline en el nombre. Fondo blanco + border-bottom sutil + hover #fafafa
 *     (estética .qida-leader-table de admin). Se mantiene el grid (no se migra a <table> real).
 *   - Tabla pasa de 5 a 7 columnas: Familia · Tipo · Por qué · Temperatura (NUEVA) · Días (NUEVA
 *     semántica) · Estado (NUEVA) · Acción.
 *       * Temperatura: barrita sólida monocroma + texto (Caliente/Templado/Frío/Pausa), patrón
 *         badge-localidad de admin. Colores admin: #EF4444/#F59E0B/#3B82F6/gris(pausa).
 *       * Días desde último contacto (renombre de "Sin contacto"): número coloreado por gravedad
 *         (texto, no fondo): 0-3 neutro / 4-7 ámbar / 8-14 ámbar fuerte / 15+ rojo. Fecha corta
 *         debajo (se oculta @980px). Sin icono de alerta. CAPEO: si urgency==='alta', el máximo
 *         es ámbar fuerte (nunca rojo) -> el único rojo de la fila es el badge "Urgente".
 *       * Estado: badges admin apilados. Verde "Mensaje nuevo" (+contador si unread>1, paleta
 *         #ECFDF5/#047857) y/o rojo "Urgente" (solo urgency alta, #FEF2F2/#991B1B). Vacía si no.
 *   - Cards superiores reestilizadas con estética .qida-leader-kpi (label arriba / valor Fraunces
 *     28px / sub) y agrupadas en dos bloques con label: "Tu impacto" (Convertidos, display-only)
 *     y "Cartera activa" (Calientes/Templados/Fríos, clicables ≡ chips de segmento). El número de
 *     las cards de temperatura toma el color de su temperatura; activo = borde inferior + fondo.
 *   - Leyenda explícita debajo de la tabla: Caliente · Templado · Frío · Pausa | Mensaje nuevo ·
 *     Urgente (dots + label, colores admin). Una columna de 4 valores -> leyenda de 4.
 *   - Bug de filtros resuelto: botón "Quitar filtros" (data-action dash-clear-filters) visible
 *     solo con filtro activo, limpia segmento + pill de una. Se mantiene click-en-activa-desactiva.
 *   - Divider entre "mensajes nuevos" y resto: ELIMINADO (el badge "Mensaje nuevo" en Estado lo
 *     reemplaza). El sort "mensajes nuevos al tope" se MANTIENE.
 *   - Responsive: @1100 oculta "Tipo" (6 cols); @980 oculta la fecha-sub de Días y apila cards;
 *     @760 compacta la grilla. Verificado en el modal AF real (max-width 1400px, NO el de 1600
 *     de líderes) a 1400/1280/1100/980/760.
 *   - NO se toca: Panel de Líderes, detalle del lead, mocks/endpoints (shape intacto), loaders,
 *     WIDGET_URL (bump interno).
 *
 * DEFAULTS QUE TOME EN v1.14.0:
 *   - Urgencia 'media' deja de tener señal propia en el dashboard (antes punto rojo): la columna
 *     Estado solo expone "Mensaje nuevo" y "Urgente" (alta). Coherente con "un rojo = urgencia alta".
 *   - Pausa: barra gris neutra + texto "Pausa", incluida en la leyenda (4 valores -> 4 explicaciones).
 *   - "Tu impacto"/"Cartera activa" como labels de grupo (fallback documentado: barra vertical).
 *   - Verde de "Mensaje nuevo" = verde admin (#047857), no el verde de marca WhatsApp.
 *
 * Cambios v1.13.0 (reconstruccion del dashboard AF - reemplaza la vista "cooling" de v1.10):
 *   - La vista state.view==='dashboard' deja de ser la lista plana "cooling" (4 cols, color
 *     por dias). Ahora es: banda de 4 cards arriba + toolbar (Filtros/pill WhatsApp/chips de
 *     vista) + tabla con color por TEMPERATURA + señales de WhatsApp/urgencia por fila.
 *   - 3 vistas = 3 endpoints separados (mocks): cada chip Sugerencias/Actividades/Leads hace
 *     un "fetch" distinto (DashboardService.fetchView), NO un re-filtro client-side.
 *       GET /api/me/leads/suggestions  -> MOCK_SUGGESTIONS_RESPONSE (~6 items)
 *       GET /api/me/leads/activities   -> MOCK_ACTIVITIES_RESPONSE  (~9 items)
 *       GET /api/me/leads/leads        -> MOCK_LEADS_RESPONSE       (16 items, cartera completa)
 *     Los 3 comparten shape comun nuevo (familyName, city, caregiverInfo{name,relation,age},
 *     serviceType, reason, daysWithoutTouch, lastTouchDate ISO, temperature, urgency,
 *     hasNewMessage, unreadMessagesCount). Los ids reusan MOCK_LEADS para que el detalle resuelva.
 *   - Banda superior: 4 cards mismo tamaño. [Convertidos este mes (hardcoded 7, display-only)]
 *     [Calientes][Templados][Fríos]. Las 3 de temperatura son clicables y escriben el MISMO
 *     state.dashSegment que los chips de Filtros (cards ≡ chips). Sin donut/grafico.
 *   - Toolbar: izquierda boton "Filtros" -> chips de segmento (caliente|templado|frio|pausa|
 *     urgente|historico); centro pill "N leads con mensaje nuevo" (rojo, filtra hasNewMessage,
 *     AND con el segmento); derecha 3 chips de vista. Filtros y pill son client-side; los chips
 *     de vista re-fetchean.
 *   - Tabla: color de fila por temperatura (caliente rojo suave / templado ambar / frio gris-azul
 *     / pausa neutro). Filas con mensaje nuevo van AL TOPE (sort interno por urgencia desc +
 *     dias desc), separadas del resto por un divider sutil. Señal WhatsApp = rail izquierdo
 *     verde (#25D366 via box-shadow inset, sin layout shift) + icono 💬 antes del nombre +
 *     tinte verde sutil sobre el color de temperatura. Urgencia alta = rail rojo + badge
 *     "Urgente" en Familia; urgencia media = punto rojo DESPUES del nombre (distinto del 💬,
 *     que va antes). unreadMessagesCount>1 = badge pequeño con la cantidad junto al 💬.
 *   - Conflicto WhatsApp+urgencia alta en la misma fila: gana el rail ROJO (urgencia es prioridad
 *     operativa); el WhatsApp queda señalado por el icono 💬 + tinte verde. Rail dividido
 *     descartado por fragilidad visual/CSS dentro de Odoo (documentado en renderDashRow).
 *   - Refresh manual: boton Refrescar re-fetchea la vista activa (refresca el badge WhatsApp).
 *     Sin polling ni push en este sprint (TODO documentado en handleClick/DashboardService).
 *   - Marcar hecho + toast Deshacer: SIN cambios (state.completedTodayIds global por id, undo 4s).
 *   - MAX_VISIBLE: 5 -> 10 (hay mas altura disponible con cards + toolbar).
 *   - normalizeUrgency() acepta vocabulario nuevo (alta/media/baja) Y el del detalle
 *     (Muy urgente/Urgente/Estandar). TODO: unificar cuando aterrice el backend F3.
 *   - State nuevo: dashView, dashRows, dashLoading, dashSegment, dashFiltersExpanded, dashOnlyNew.
 *     Se resetean en closeModal. Funciones nuevas: renderDash..., buildDashFeed, DashboardService.
 *   - NO se toca: Panel de Lideres (ApexCharts/mountLeaderCharts), detalle del lead, loaders
 *     (gtm-loader.html/tempermonkey.js), WIDGET_URL (bump interno, mismo filename).
 *
 * DEFAULTS QUE TOME EN v1.13.0 (no especificados explicitamente):
 *   - cards ≡ chips de segmento (resolucion §6.1): la card "Calientes/Templados/Fríos" escribe
 *     state.dashSegment = 'caliente'/'templado'/'frio'. El chip de Filtros para frio se rotula
 *     "Frío · reactivar" pero usa el mismo id 'frio' (un solo estado de frio, no dos).
 *   - El pill WhatsApp muestra cantidad de LEADS ("N leads con mensaje nuevo"), no suma de
 *     mensajes (§6.2). La cantidad individual de mensajes va como badge en la fila si >1.
 *   - Counts de cards y del pill se calculan sobre el dataset de la vista activa MENOS los
 *     completados en sesion, pero ANTES de aplicar segmento/pill (asi no se "vacian" al filtrar).
 *   - Cambio de vista (chip): resetea dashSegment y dashOnlyNew (los segmentos difieren por vista).
 *     Refrescar NO resetea filtros (re-fetch en sitio).
 *   - Loading entre vistas (resolucion ajuste #1): se mantiene la tabla previa atenuada
 *     (opacity .5 + pointer-events:none) hasta que vuelve el fetch. No skeleton, no spinner,
 *     nunca tabla vacia.
 *   - rail via box-shadow inset (no border-left) para no desplazar el grid de la fila.
 *   - urgencia 'Urgente' (sin "Muy") del vocabulario viejo mapea a 'media'; 'Muy urgente' a 'alta'.
 *
 * Cambios v1.12.1 (fixes pre-demo del martes - 7 ajustes al panel de lideres):
 *   - Modal de lideres mas grande: .qida-shell.qida-view-leaders (max-width:1600px,
 *     width:98vw, height:98vh, max-height:98vh). Aplicado SOLO en view=leadersDashboard
 *     via syncShellSizing (branch nuevo + class qida-view-leaders). Modal AF y detail
 *     intactos. Scroll vertical del contenido del dashboard funciona via .qida-leader-dash
 *     {height:100%;overflow-y:auto} (no cambia, solo gana espacio con el modal mas grande).
 *   - Toolbar en una sola fila: locSelector + search + Exportar (Exportar con margin-left:auto).
 *     Eliminados los wrappers .qida-leader-toolbar-left/right. Ancho razonable de selectors
 *     y search (~220px). Eliminado el filtro team-lead (el mock nuevo no tiene teamLead).
 *   - KPIs sin deltas. 4 cards nuevas con metricas correctas para lider de equipo:
 *       1. "Leads totales en cartera"        valor=totalCartera        sub="snapshot actual"
 *       2. "% cartera con <3 seguimientos"   valor=bajoSegPct%         sub=bajoSegCount + " leads"
 *       3. "Conversion del equipo"           valor=convTeam% (weighted) sub="ultimos 30 dias"
 *       4. "AFs en zona de riesgo"           valor=N de M              sub="Sobrecarga o bajo seguimiento"
 *     Todos los valores se derivan del array filtrado de AFs. Conversion del equipo es promedio
 *     ponderado por cartera (no promedio simple) para que reflieje la realidad operativa.
 *   - Filtros se RESETEAN al abrir el modal (locFilter='all', search='', sortCol=null,
 *     sortDir='asc'). trendMetric SI persiste (preserva la metrica elegida la ultima vez).
 *     Resuelve el bug reportado de "arranca en Cataluna" por persistencia entre aperturas.
 *   - Mock MOCK_LEADER_AFS reemplazado: 19 AFs con nombres reales del proyecto (Ana Pinilla,
 *     Maria Aridane Asiain, Graciela Mateos, Mariluz Guerrero, Inma Juarez Lopez, Ana Bezares,
 *     Maria Diaz, Paloma Galvez, Alba Alvarez Rubio, Natalia Narro, Asun Herrera Teixido,
 *     Pilar Comyn, Natalia Godoy, Sandra Casol, Marina Costa, Ruben Fernandez, Sandra Muro,
 *     Maylan Almeida, Andrea Mahia). Schema cambia keys a espanol:
 *       { nombre, localidad, cartera, calientes, templados, frios, bajoSeg, intPorLead,
 *         conversion, estado }
 *     estado en espanol: 'OK' | 'Atencion' | 'Sobrecarga'. Marina Costa con conversion 1.4%
 *     es un outlier real conocido (es coach, no AF de campo - dejarla asi).
 *   - 5 localidades en el filtro: Todas, MAD, CAT, BIL, VAL, COR. Cada una con su badge CSS:
 *       MAD #EFF6FF/#1D4ED8 azul, CAT #FEF3C7/#92400E ambar, BIL #F0FDF4/#166534 verde,
 *       VAL #FFF1F2/#9F1239 rosa, COR #F5F3FF/#5B21B6 violeta.
 *   - Tabla con 8 columnas (era 10): AF, Localidad, Cartera, Temperatura (bar apilada),
 *     Bajo seg, Int/lead, Conversion, Estado. Eliminadas: Aceptados, En curso, Rechazados,
 *     Team lead. La barra apilada de temperatura usa calientes/templados/frios proporcional
 *     al total de la AF. Estado en espanol.
 *   - Grafica de tendencia replanteada (Fix #7):
 *       * 6 meses en eje X (Dic 25 -> May 26) en lugar de 14 dias.
 *       * Toggle entre dos metricas con pills "Conversion / Cobertura" en el header del card:
 *           - Conversion: data [6.8, 7.1, 7.4, 7.8, 8.0, 8.2], target 8%, yMax 12.
 *           - Cobertura:  data [37, 42, 48, 54, 61, 66], target 68%, yMax 100.
 *       * NO se filtran por localidad (son metricas globales del equipo, no del subset).
 *       * El toggle usa chart.updateOptions + chart.updateSeries SIN destruir el donut
 *         (function updateLeaderAreaChart). Si las refs no estan vivas, fallback a rerender.
 *       * Estado nuevo: state.leaderDash.trendMetric = 'conversion' | 'coverage'. Persiste
 *         en sesion (NO se resetea en openLeadersDashboard).
 *   - filterAndSortAfs adaptado: keys en espanol (af.nombre, af.localidad, af.cartera,
 *     af.calientes para sort temperatura, mapeo estado OK/Atencion/Sobrecarga).
 *   - NO se tocan: whitelist, lazy ApexCharts, donut (solo cambia el origen de la data:
 *     calientes/templados/frios), modal AF, modal detail, tampermonkey, GTM, index.html.
 *
 * DEFAULTS QUE TOME EN v1.12.1:
 *   - Keys del mock en espanol (no traduccion interna): nombre/localidad/cartera/etc.
 *     Mas consistente con el resto del mock real y reduce magic mapping.
 *   - Conversion del equipo = promedio ponderado por cartera (no simple avg).
 *   - "AFs en zona de riesgo" = count(estado!=='OK') de count total filtrado (N de M dinamico).
 *   - Persistencia: trendMetric SI persiste entre aperturas; locFilter/search/sortCol NO.
 *   - Paleta de badges de localidad nuevos: BIL verde, VAL rosa, COR violeta.
 *   - Tabla 8 columnas: temperatura como bar apilada (no 3 cols numericas separadas).
 *   - openModal (badge AF) si state quedo en 'leadersDashboard', vuelve a 'dashboard'.
 *     Comportamiento ya cubierto en v1.12.0 (sin cambios).
 *
 * Cambios v1.12.0 (Panel de lideres - segunda seccion del widget para managers de AFs):
 *   - Segundo boton flotante (.qida-leader-badge) visible SOLO a usuarios en whitelist
 *     LEADER_EMAILS (Eva, Mariluz, Jordi, Alejandro). Se posiciona apilado encima del
 *     badge AF existente (bottom:110px;left:24px, 60x60, bg #1F2937, icono bar-chart-2).
 *     El badge AF queda intacto - los dos botones coexisten en la misma pagina.
 *   - Tercer valor de state.view: 'leadersDashboard' (suma a 'dashboard' | 'detail').
 *     Modal mutuamente excluyente con el AF: reusa .qida-overlay / .qida-shell. El handler
 *     'open-leaders-dashboard' setea state.view + abre overlay; ESC y X global cierran.
 *     rerenderContent y syncShellHeader tienen rama nueva para el panel de lideres.
 *   - Deteccion de leader en init():
 *       * Modo Odoo (IS_ODOO_MODE === true): se lee sess.username de odooSession y se
 *         compara contra LEADER_EMAILS. Si la session falla y estabamos en modo Odoo,
 *         _isLeader queda FALSE explicito (NUNCA true por fallback - evita exponer el
 *         dashboard a una AF si Odoo tiene un hiccup). Se loggea console.error.
 *       * Modo dev local (!IS_ODOO_MODE desde el inicio): _isLeader = true automatico
 *         para poder iterar / demo sin Odoo. Documentado en DEFAULTS.
 *     Tras setear _isLeader, si true, se dispara injectApexCharts() (lazy) e
 *     injectLeaderBadge() en paralelo con mountWhenReady().
 *   - Lazy load de ApexCharts via CDN (jsdelivr): injectExternalScript con guard por id,
 *     onload / onerror. Solo se inyecta si _isLeader === true. mountLeaderCharts chequea
 *     typeof window.ApexCharts !== 'undefined' antes de instanciar - si falla la carga,
 *     los divs muestran microcopy "Las gráficas no se cargaron correctamente. Recargá
 *     la página para reintentarlo." en lugar de quedar en blanco.
 *   - Mocks nuevos: MOCK_LEADER_KPIS (4 cards), MOCK_LEADER_TEMPERATURE (donut 3 segmentos),
 *     MOCK_LEADER_TREND (area chart 14 dias con annotation 68%), MOCK_LEADER_AFS (8 filas
 *     con name, location, leadTotal, leadAccepted, leadInProgress, leadRejected, conversion,
 *     temperature {hot, warm, cold}, status {ok, attention, overload}, teamLead).
 *   - state.leaderDash = { locFilter, leadFilter, search, sortCol, sortDir, __charts }.
 *     Persiste durante la sesion del page load (igual que aiChatHistory) - NO se vacia en
 *     closeModal. Los charts se destroyean antes de re-instanciar para evitar memory leaks.
 *   - Filtros (localidad, team-lead, search) afectan KPIs + charts + tabla en simultaneo:
 *     filterAndSortAfs(MOCK_LEADER_AFS, leaderDash) devuelve el array filtrado, y todos los
 *     renderers (KPIs, donut, area, tabla) derivan totales y series desde ese mismo array.
 *     Si Mariluz filtra MAD, todo el dashboard refleja solo MAD (no solo la tabla).
 *   - Tabla AFs: 10 columnas (AF, Localidad, Total, Aceptados, En curso, Rechazados,
 *     Conversion, Temperatura, Estado, Team lead). Sort por click en header (toggle asc/desc).
 *     Search input filtra por nombre - el handler actualiza SOLO innerHTML de la tabla (NO
 *     rerendea el modal entero) para no destruir las instancias ApexCharts. Selectores
 *     localidad/team-lead SI rerendean (mas barato: charts se rebuilden con la data filtrada).
 *   - CSS namespaced .qida-leader-* (badge, dashboard, kpis-grid, kpi-card, charts-row,
 *     chart-card, table, table-header, table-row, badge-mad/cat, status-ok/att/overload).
 *     Paleta acento: #3B82F6 azul, #EF4444 rojo, #F59E0B ambar, #10B981 verde, #1F2937
 *     gris oscuro (badge leader).
 *   - Boton "Exportar" en la toolbar visual (handler leader-export -> showToast placeholder).
 *   - 2 console.info debug logs al final del init para verificar leader mode en prod:
 *       [QidaAssistant] Leader mode: <bool>, <email>
 *       [QidaAssistant] ApexCharts loaded: <bool>
 *   - tempermonkey.js / gtm-loader.html: SIN cambios. Si Odoo bloquea jsdelivr por CSP,
 *     se agregaria @require en tempermonkey.js (igual patron que DOMPurify en v1.11.0).
 *   - NO se tocan: vista 'dashboard' AF, vista 'detail', mocks AF, LeadDetailService, WA pane,
 *     IA chat, Schedule modal, integracion Odoo (Fase A) ni handlers existentes. El AF flow
 *     queda 100% intacto.
 *
 * DEFAULTS QUE TOME EN v1.12.0:
 *   - Icono del badge leader: 'bar-chart-2' (lucide). Se agrega al objeto I.
 *   - Tamano badge leader: 60x60. Posicion bottom:110px;left:24px (24 base + 78 badge AF + 8 gap).
 *   - state.leaderDash NO se vacia en closeModal (sesion del page load). Se vacia en reload.
 *   - Sort por defecto de la tabla: ninguno (orden del MOCK_LEADER_AFS).
 *   - Selectores localidad/team-lead afectan KPIs + charts + tabla (todo el dashboard).
 *   - Botón cerrar del modal leader reusa data-action="close-modal" global.
 *   - state.leaderDash.__charts NO serializable (instancias ApexCharts).
 *   - Whitelist hardcodeada en el codigo (LEADER_EMAILS). Bump + republish para cambiar.
 *     Aceptable para MVP demo. Cambio futuro: leer de un campo Odoo del user (res.users.is_leader).
 *   - Modo dev local: !IS_ODOO_MODE desde el inicio implica _isLeader = true automatico
 *     (para demo sin Odoo). En modo Odoo real, SOLO la whitelist habilita el badge.
 *   - Fallback explicito si odooSession falla en modo Odoo: _isLeader = false (no true).
 *     Se loggea console.error y NO se inyecta ni el badge ni ApexCharts.
 *   - Microcopy de fallo de ApexCharts: "Las gráficas no se cargaron correctamente.
 *     Recargá la página para reintentarlo." (en los dos divs de chart).
 *
 * Cambios v1.11.0 (Fase A - cablear datos reales del detalle del lead desde Odoo):
 *   - Feature flag automatico por host: IS_ODOO_MODE = (location.host === 'erp.qida.es').
 *     Cuando true, el detalle del lead se hidrata desde Odoo via JSON-RPC same-origin
 *     (/web/dataset/call_kw/...). Cuando false (index.html, dev local), comportamiento
 *     identico a v1.10.0 (datos mock). El feature flag se evalua una vez en init() y
 *     se hace fallback graceful a modo mock si odooSession() falla.
 *   - Helpers Odoo nuevos: odooCall(model, method, args, kwargs) (POST JSON-RPC con
 *     manejo de 401/403/no-JSON/error en payload), odooSession() (GET session_info para
 *     hidratar _baseContext con uid/lang/etc), sanitizeOdooHtml(rawHtml) (DOMPurify con
 *     allowlist conservadora + fallback defensivo template-based si DOMPurify no esta
 *     cargado), tName(tuple) / tId(tuple) (helpers para los tuples [id, "Name"] | false
 *     que Odoo devuelve para campos relacionales).
 *   - Constantes nuevas con listas explicitas de fields para evitar el anti-pattern
 *     fields:[] (que descarga todo y es lento + frangil): LEAD_FIELDS, CARED_FIELDS,
 *     NOTES_FIELDS, ACTIVITY_FIELDS, ATTACHMENT_FIELDS, FOLLOWER_FIELDS. CARED_FIELDS
 *     incluye 'chronich_illness' (typo del modelo Odoo - sic).
 *   - Service nuevo: LeadDetailService.fetchAll(leadId) orquesta 1+5 llamadas a Odoo
 *     en paralelo. El primer fetch es crm.lead.read; si falla, error global. Si ok,
 *     dispara los 5 secundarios con Promise.allSettled (no Promise.all) para que un
 *     fallo parcial no tire los 4 restantes. Los datasets fallidos quedan marcados en
 *     cached._errors[idx] (idx: 0=cared, 1=notes, 2=activities, 3=attachments, 4=followers).
 *     LeadDetailService.getFromCache(leadId) devuelve el entry o null.
 *   - Mappers Odoo -> shape interno del widget: mapLead, mapCared, mapNote, mapActivity,
 *     mapAttachment, mapFollower. Preservan los keys que ya consumen los renderers actuales
 *     (lead.contact, lead.location, lead.phone, c.relationship, etc.) para no tocar UI.
 *     Notas pasan por sanitizeOdooHtml y se marcan con isHtml:true (los renderers usan
 *     innerHTML controlado SOLO para notas con ese flag; el resto via esc() texto plano).
 *   - Funcion nueva: mockHydrate(leadId). En modo mock, popula state.leadDetailCache[leadId]
 *     con el MISMO shape que en modo Odoo (claves: lead, caredPerson, notes, activities,
 *     attachments, followers, _loadedAt, _loading, _error, _errors). Asi los renderers
 *     funcionan identicos en ambos modos. El handler select-lead llama SIEMPRE a
 *     LeadDetailService.fetchAll(leadIdNum) (incluso en modo mock - el service detecta
 *     IS_ODOO_MODE false y hace mockHydrate sync), para que el cache siempre tenga la
 *     entrada del lead activo.
 *   - State nuevo: state.leadDetailCache = {} { [leadId]: { lead, caredPerson, notes,
 *     activities, attachments, followers, _loadedAt, _loading, _error, _errors } }. Persiste
 *     durante la sesion del page load (no se vacia en closeModal, igual politica que
 *     aiChatHistory).
 *   - Renderers del detalle (renderCare, renderInternalNotes, renderActivities,
 *     renderFollowers, renderAttachmentsCollapsable) reciben segundo arg opcional `cached`
 *     y dibujan skeleton si cached._loading === true. Si cached.<dataset> === null se
 *     muestra microcopy local "No se pudo cargar esta sección" en la card. Si no hay cache
 *     aun (cached === null), fallback a lectura directa de mocks (compat con dev local
 *     antes de que fetchAll corra). renderCenterPane recibe `cached` y lo propaga.
 *     renderDetail tambien lee de cache (var lead = cached.lead || getLead(leadId)).
 *   - Handler select-lead: normaliza leadId a number cuando es numerico (parseInt antes
 *     del setState), llama LeadDetailService.fetchAll(leadIdNum) fire-and-forget si no
 *     hay cache aun (o esta en error). Race-guard en .then() compara state.currentLeadId
 *     === leadId con === exacto (sin coercion) antes de rerenderear.
 *   - MOCK_COOLING_LEADS_RESPONSE: todos los leadIds cambiados a 123333 (number) para
 *     apuntar al unico lead validado en prod (Jeronimo Goyarrola Ugalde). El resto del
 *     row (nombres, ubicaciones, fechas, reasons) se mantiene como mock visual - sirve
 *     para testear el flow end-to-end con un lead real. Estructura HTML/CSS y handlers
 *     del dashboard NO se tocan.
 *   - Skeleton CSS nuevo en injectStyles: .qida-skeleton-line con shimmer animation
 *     (1.4s ease-in-out infinite). Cada card de info en estado loading muestra 3 lineas.
 *   - tempermonkey.js: @require DOMPurify (jsdelivr CDN, v3.2.0) + bump @version 1.0 -> 1.1.
 *     gtm-loader.html NO se toca todavia (se actualiza cuando Pablo cablee DOMPurify en
 *     GTM o desde el sitio Odoo).
 *   - NO se tocan: WhatsApp pane (Fase B), Resumen IA / Chat IA (Fase E), dashboard
 *     cooling estructura/handlers/MAX_VISIBLE (solo cambian los leadIds del mock),
 *     Schedule modal, MOCK_LEADS / MOCK_WHATSAPP / MOCK_IA_SUMMARIES / MOCK_AI_RESPONSES
 *     (siguen siendo fuente de verdad en modo mock + fallback). EDITS sigue siendo
 *     overrides locales mergeados sobre datos reales (sync a Odoo es Fase B/C).
 *
 * Cambios v1.10.0 (rediseno del dashboard, solo UI - el detalle NO se toca):
 *   - Pivote del dashboard de "workspace multi-pieza" a una vista unica: lista
 *     priorizada de leads enfriandose. La AF entra y ve maximo 5 filas con la
 *     info mas operativa, sin tabs ni filtros ni asistente.
 *   - Eliminado: tabs "Actividades"/"Leads", bloque "Tu cobertura", boton
 *     "Filtros", pill "Pregunta cualquier cosa..." y todo el bloque del
 *     asistente del dashboard (renderAssistantPill/Expanded/HeaderChip/Panel,
 *     syncAssistantHeader, SearchService entero, atajo "/"), buildUnifiedFeed
 *     y la tabla unificada (renderUnifiedTable/renderUnifiedRow/countUnifiedByType/
 *     countSegmentInActiveType), renderCoverage/renderCoverageSection,
 *     renderSortHeader/handleSetSort, ActivityService.getUnifiedFeedSync,
 *     SuggestionsService entera, CoverageService entera.
 *   - Header del shell en dashboard: minimo (Esc para cerrar + X). El bloque
 *     Sparkles + "Seguimientos" + sub queda solo en la rama del detail.
 *   - Tabla de 4 columnas: Familia (contacto + ubicacion / relacion + cuidado +
 *     edad), Tipo (serviceType), Por que (reason del enfriamiento), Sin
 *     contacto (dias grande + fecha del ultimo mensaje pequeno).
 *   - Tope visual: MAX_VISIBLE = 5 leads. Filas que exceden se ocultan client-side.
 *   - Boton "Refrescar" debajo de la lista: re-renderiza, los completados en
 *     sesion (state.completedTodayIds) quedan filtrados naturalmente.
 *   - Estado vacio: "Estás al día. No hay leads enfriándose." Sin emojis, sin
 *     copy motivacional.
 *   - Degradacion de color por urgencia: 0-3 normal, 4-7 amarillo sutil, 8-14
 *     naranja sutil, 15-20 rojo sutil, 21+ rojo + icono warning. daysWithoutTouchLevel
 *     extendido de 4 niveles a 6 (lvl-today / lvl-fresh / lvl-warn / lvl-orange /
 *     lvl-stale / lvl-danger).
 *   - Acciones por fila: click en celda (excepto boton) abre el detail; hover
 *     muestra "Marcar hecho" que filtra la fila + toast inferior "Marcado como
 *     hecho · Deshacer" durante 4s. Deshacer revierte; pasados los 4s el
 *     filtrado es permanente en sesion (no hay localStorage).
 *   - Mock estatico MOCK_COOLING_LEADS_RESPONSE simula el GET /api/me/leads/cooling
 *     que devuelve la cohorte ya filtrada y priorizada por backend. El frontend
 *     NO aplica criterios de negocio (umbrales, ventana, exclusion de leads con
 *     seguimiento futuro): solo el filtro local de "completados en sesion".
 *   - LeadService.getCoolingLeadsSync (nuevo) lo consume sincronamente desde
 *     renderDashboard. La version async LeadService.getCoolingLeads queda como
 *     TODO[odoo] (para cuando se cablee al endpoint real).
 *   - Mocks eliminados: MOCK_DAILY_SUGGESTIONS, MOCK_SCHEDULED_ACTIVITIES,
 *     MOCK_MATERIAL_SEARCHABLE, MOCK_CONVERSATION_MATCHES (solo lo consumia
 *     SearchService). MOCK_LEADS se conserva (lo consume el detalle al abrir).
 *   - State: eliminados activeTypeChip, activeSegmentFilter, filtersExpanded,
 *     sortCol, sortDir, searchQuery, assistant*, coverageBucket, __pendingSuggestionDoneId,
 *     __pendingActivityDoneId. Agregados completedTodayIds (Set), undoToast
 *     (objeto o null) y undoTimeoutId (ID del setTimeout activo).
 *   - Handlers eliminados: toggle-filters, set-type-chip, set-segment, clear-segment,
 *     set-coverage, set-sort, assistant-* (open/close/collapse/edit/submit/hint/
 *     open-lead/open-material). Handlers nuevos: mark-done, undo-mark-done,
 *     refresh-cooling.
 *   - Iconos nuevos: refresh-cw (lucide RefreshCw), alert-triangle (lucide AlertTriangle).
 *   - CSS nuevo: bloque .qida-cooling-* (dashboard / header / list / row / cells /
 *     row-actions / mark-done-btn / refresh-btn / undo-toast / empty-state /
 *     niveles lvl-*). CSS eliminado: cobertura, toolbar unificada, type-chips,
 *     segment-chips, asistente (pill/exp/chip/panel), tabla unificada (qida-urow*),
 *     filas con fondos sutiles, skeletons.
 *   - Conservado intacto: TODO el detalle (renderDetail, panes WA/center/ai,
 *     chat IA, schedule modal, swap, scroll WA/AI, etc.). syncShellHeader rama
 *     view==='detail' intacta. EDITS.temperatures y getters relacionados.
 *
 * Cambios v1.4.0 (iteracion layout AF-like, modelo Odoo Activities):
 *   - Asistente pasa del bottom-right flotante al header del modal (inline).
 *     3 estados preservados (closed -> pill / expanded -> input / results -> panel lateral 30%).
 *     En estado "results" la pill se vuelve chip compacto "Sparkles + query truncada + X".
 *   - Cobertura compactada (menos padding/margen) sin perder legibilidad.
 *   - Container del dashboard mas ancho: max-width 1480px, padding 20px, gap 16px.
 *   - Las 3 secciones anteriores (Sugerencias del dia / Actividades agendadas / Tabla) se
 *     CONSOLIDAN en una unica tabla unificada estilo Odoo Activities con:
 *       Toolbar -> izquierda: boton "Filtros" toggleable + segment chips.
 *                  derecha: chips de tipo excluyentes (Sugerencias/Actividades/Leads).
 *       Tabla: filas tipo sugerencia (fondo verde sutil) / actividad vencida (fondo rojo sutil) /
 *              actividad hoy (sin fondo) / lead (sin fondo). Hover muestra acciones contextuales
 *              en filas tipo sugerencia y actividad. Filas tipo lead: click abre detail, sin acciones extra.
 *       Microcopy "+ actividad" en filas tipo sugerencia cuando el lead tambien tiene actividad
 *       agendada (preservacion del indicador inline de v1.3.0).
 *   - Copy: "Sin tocar" -> "Sin contacto" en toda la UI.
 *   - Nuevo metodo en el service layer: ActivityService.getUnifiedFeedSync(filters) con buildUnifiedFeed
 *     interno (dedupe + filtro tipo + filtro segmento + sort compuesto inteligente).
 *   - Servicios y mocks de v1.3.0 intactos (LeadService/ActivityService/SearchService/Coverage/
 *     Suggestions). Solo se agrega un metodo.
 *
 * Cambios v1.5.0 (refinamientos UX, sin re-arquitectura):
 *   - Eliminadas las acciones contextuales en hover de filas tipo Sugerencia y Actividad
 *     (Marcar hecho + Posponer). Ahora TODAS las filas se comportan igual: click abre el
 *     detail del lead, sin atajos. Justificacion: forzar el flujo correcto (ver detalle ->
 *     accion real) para no "limpiar" sugerencias sin seguimiento real.
 *   - Columna "Familia" enriquecida con dos lineas: linea 1 = "<Contacto> · <Ubicacion>"
 *     (medium/principal), linea 2 = "<Relacion> <NombrePaciente>, <Edad> anos" (secundario).
 *   - Mocks: eliminado lead.elderly. Agregados lead.relation, lead.age, lead.caredPersonName
 *     con nombres realistas espanoles/catalanes. MOCK_CARE_CONTEXT pierde caredPerson y
 *     caredAge (info migrada al lead).
 *   - Header de columna "Proximo seg." renombrado a "Vence" (vocabulario Odoo Activities).
 *     Sort key se mantiene como "proximo" para no romper state.sortCol.
 *   - Columna "Por que" mas ancha (min 280 / max 320) para reducir truncado agresivo.
 *     "Tipo" y "Etapa" con max-width + ellipsis como red de seguridad ante contenido extremo.
 *   - openScheduleFromSuggestion / openScheduleFromActivity preservadas vivas con TODO v1.6+:
 *     se reconectaran desde el detail del lead como "marcar hecha sin agendar" en proxima
 *     iteracion. Por ahora son dead-code intencional, no se invocan desde ningun handler.
 *
 * API publica:
 *   QidaAssistant.init(options)
 *   QidaAssistant.openModal()
 *   QidaAssistant.closeModal()
 *   QidaAssistant.showScreen(screenId)
 *   QidaAssistant.version
 *
 * ============================================================
 * DEFAULTS QUE TOME EN v1.4.0 (no especificados explicitamente):
 * ============================================================
 *   1. Container del dashboard: max-width 1480px, padding lateral 20px,
 *      gap entre secciones 16px (reducido desde 24px en v1.3.0).
 *   2. Asistente en header: la pill conserva el estilo verde corporativo
 *      con Sparkles + texto + "/" kbd. Se reubica del bottom-right del overlay
 *      al header arriba a la derecha, antes de "Esc para cerrar" + "X".
 *   3. Boton "Filtros": ghost button con icono funnel/slidersHorizontal.
 *      Cuando hay segmento activo, muestra count "(1)".
 *   4. Chips de tipo (derecha): estilo pill con count. Activo en verde primary.
 *      Default: 'suggestions'.
 *   5. Filas estilo Odoo: altura compacta 44-48px, borders sutiles, hover sutil.
 *   6. Click vs acciones contextuales: click en cualquier celda no-accion abre
 *      detail. Botones de accion son ghost al hover, al final de la fila,
 *      con event.stopPropagation() para no propagar.
 *   7. Estado default de la toolbar: chip 'Sugerencias del dia' activo,
 *      filtros embudo cerrados.
 *   8. Persistencia: dentro de la sesion del modal, se mantiene el chip activo y el
 *      estado de filtros desplegados. Al cerrar y reabrir, vuelve a defaults.
 *   9. Schedule modal reuse: sin cambios. La opcion "Cerrar lead sin agendar"
 *      sigue disponible cuando se invoca desde "Marcar hecho" de sugerencias/actividades.
 *  10. Animaciones: ninguna nueva. Cambio instantaneo al cambiar filtro.
 *  11. state.activeTypeChip: 'suggestions' | 'activities' | 'leads'. Default 'suggestions'.
 *  12. state.activeSegmentFilter: null | 'caliente' | 'templado' | 'frio-reactivar' |
 *      'pausa' | 'urgente' | 'historico'. Default null (todos los segmentos).
 *  13. state.filtersExpanded: bool. Default false.
 *  14. Por que en filas tipo Actividad: act.summary (lo agendado concretamente).
 *      Sugerencias usan sug.reason. Leads usan lead.temperatureReason.
 *  15. Hover en filas tipo Lead: ninguna accion contextual. La fila entera abre detail.
 *  16. Indicador "+ actividad" en filas tipo Sugerencia: cuando el dedupe oculta una
 *      actividad del mismo lead, la fila de sugerencia muestra un sub-tag sutil junto
 *      al badge "Sugerencia [ordinal]" con icono calendar + texto "+ actividad".
 *
 * ============================================================
 * DEFAULTS QUE TOME EN v1.5.0 (no especificados explicitamente):
 * ============================================================
 *   1. Opcion A pura para los mocks: descompongo lead.elderly en lead.relation (string),
 *      lead.age (number) y agrego lead.caredPersonName (string). El campo elderly se
 *      ELIMINA del lead. Tocan solo 3 puntos del render -> refactor minimo.
 *   2. Reutilizo el campo lead.contact existente (ej "Maria Martinez", "Jordi Vidal") como
 *      "nombre del contacto que llamo". NO creo lead.contactName para no inflar el diff;
 *      el campo se trata como contactName en toda la UI.
 *   3. MOCK_CARE_CONTEXT pierde caredPerson y caredAge en los 16 registros (info migrada al
 *      lead). Mantiene relationship, mainCondition, livesAlone que son info propia.
 *   4. Ancho "Por que": max-width 260px -> 320px (~+23% sobre el cap) + min-width 280px.
 *      Recortes en columnas adyacentes con max-width + ellipsis como red de seguridad:
 *      "Tipo" 180px (cubre "Sugerencia 4o msg" + sub-tag "+ actividad"), "Etapa" 140px.
 *   5. "Proximo seg." -> "Vence" solo en el header de la tabla. data-id="proximo" intacto
 *      para no romper state.sortCol.
 *   6. La tabla unificada pasa de 9 a 8 columnas (eliminada la columna de acciones).
 *   7. openScheduleFromSuggestion / openScheduleFromActivity preservadas con comentario
 *      TODO v1.6+ pero sin invocador en v1.5.0. La rama del Schedule modal que las consume
 *      (state.scheduleOrigin === 'suggestion'/'activity') tambien queda viva por la misma
 *      razon.
 *   8. postponeOpenFor eliminado del state, del closeModal y del bloque "auto-cerrar
 *      dropdown" de handleClick (solo lo usaba el hover de la fila tipo sugerencia).
 *   9. caredPersonName usa nombres realistas espanoles/catalanes segun la ubicacion del
 *      lead (Barcelona/Sabadell/Sant Sadurni -> nombres catalanes; resto Madrid/castellano).
 *  10. Gap conocido: queda sin cubrir "marcar hecha sin agendar" cuando la AF hizo el
 *      seguimiento por via externa (llamada celular, presencial). Se resuelve en v1.6+ con
 *      banner en el detail del lead.
 *
 * Cambios v1.9.1 (auto-scroll del pane Chat IA):
 *   - Pane Chat IA scrollea al fondo automaticamente cuando se agrega un mensaje (chip, texto
 *     libre, pick-variant, refine). Replica el patron de __waNeedsScroll usado para WhatsApp:
 *     flag state.__aiNeedsScroll consumido en rerenderContent con requestAnimationFrame.
 *   - Se setea en pushAiChat (cubre todos los puntos de append: chips, query libre y la rama
 *     pick-variant que va via pushAiChat). Tambien al entrar al detalle (select-lead /
 *     assistant-open-lead) para que si hay historial previo se vea el ultimo mensaje primero.
 *   - Funcion nueva: scrollAiToBottom (mirror de scrollWaToBottom). closeModal resetea el flag.
 *
 * Cambios v1.9.0 (default del toggle de layout invertido + textarea WA auto-expande al copiar):
 *   - Default de state.detailLayoutSwapped pasa a true: chat IA al CENTRO (columna ancha) y
 *     detalle del lead a la DERECHA (columna estrecha). El boton Swap en el shell header
 *     vuelve al layout v1.8.0 (info al centro, chat IA a la derecha). closeModal resetea a true.
 *   - Anchos de columnas pasan a depender de la posicion estructural, no de la clase:
 *     col 1 (siempre pane-wa) = 28%, col 2 (variable) = flex 1, col 3 (variable) = 32%.
 *     Asi el swap intercambia tanto el ORDEN como los ANCHOS (la columna del medio siempre
 *     es la ancha; la de la derecha siempre la estrecha).
 *   - Handler ai-copy-to-wa ahora invoca autoResizeTextarea(ta) en el mismo setTimeout que
 *     hace focus, asi el textarea WhatsApp se expande inmediatamente para mostrar el mensaje
 *     copiado en lugar de quedarse con altura 1 linea + scroll oculto.
 *   - Media queries del detalle migran a selectores estructurales (.qida-detail-body > *:nth-child(N))
 *     en linea con la nueva semantica posicional. @980px oculta la 3ra columna (la estrecha),
 *     @760px oculta la 1ra (WhatsApp).
 *
 * Cambios v1.8.0 (refinamientos visuales y de flujo del chat IA del detalle, sin tocar dashboard):
 *   - Fondo del pane central pasa de #FAFAF9 a verde menta sutil #DBE9D5. Border de
 *     .qida-info-card sube de var(--s200) a var(--s300) para preservar separacion contra
 *     el verde (default que tome para no perder definicion visual).
 *   - Toggle de layout en el shell header del detail: boton "Swap" intercambia el orden
 *     centro/derecha entre pane info y pane IA. State nuevo state.detailLayoutSwapped (bool)
 *     persiste en sesion del modal: NO se resetea al navegar entre leads, SI se resetea al
 *     cerrar el modal con X (closeModal). Default false (info al centro, IA a la derecha).
 *   - Los borders verticales del .qida-detail-body se gestionan por selector estructural
 *     (.qida-detail-body > *:not(:last-child)) para no romper con el swap. Se eliminan los
 *     border-right hardcodeados de .qida-pane-wa y .qida-pane-center.
 *   - Chat IA con sistema visual ampliado:
 *       * Avatar usuario .qida-aichat-bubble.user .qida-aichat-bubble-icon -> bg #143C32
 *         (verde oscuro Qida) + color #FFEFDA (crema). Muestra "T" como inicial.
 *       * Avatar IA .qida-aichat-bubble.ai .qida-aichat-bubble-icon -> bg #E1F5EE +
 *         color #0F6E56 (Qida solido).
 *       * Burbuja usuario -> bg #F1F8EE, border-radius 12 12 4 12 (cola al avatar).
 *       * Burbuja IA -> bg #FAFAF9, border-radius 12 12 12 4 (cola al avatar).
 *       * Cards internas (.qida-aichat-variant, .qida-aichat-mat-card) -> bg #fff con border
 *         sutil 0.5px var(--s200) para destacarse contra el fondo de la burbuja.
 *   - Chips fijos del chat IA (Material marketing / Sugerir mensaje / Reactivar sin presionar)
 *     ahora SIEMPRE visibles debajo del input, en fila (flex-wrap), estilo Gemini. La AF
 *     puede re-invocar quick prompts durante la conversacion. Microcopy del estado vacio
 *     actualizado a "Pregunta sobre este lead o usa uno de los atajos."
 *   - Flujo nuevo "Esta me gusta mas" (reemplaza "Usar este mensaje"):
 *       Aplica a Sugerir mensaje (variants) Y Reactivar sin presionar (approaches).
 *       Material marketing queda intacto (Adjuntar / Compartir link sin cambio).
 *       1. Click variante -> push al chat como user message "<label> - esta me gusta mas".
 *       2. IA responde con payload kind: 'refine' (intro + texto propuesto en card + boton
 *          "Copiar al WhatsApp").
 *       3. AF puede iterar escribiendo texto libre en el input del chat: mockAIResponse
 *          detecta contexto refine y devuelve otro refine con prefijo "[Mock: ajuste pedido
 *          aplicado] ..." (TODO[ai]: cuando este conectado al LLM, ajustar de verdad).
 *       4. Click "Copiar al WhatsApp" -> textarea WA se llena con el texto. La AF revisa,
 *          edita si quiere, y clickea send. Principio rector: IA propone, AF envia.
 *   - Funciones nuevas: pushAiPickVariant.
 *   - Handlers nuevos: ai-pick-variant, ai-copy-to-wa, toggle-detail-layout.
 *   - Handler eliminado: ai-use-message (reemplazado por el flujo conversacional).
 *
 * Cambios v1.7.0 (rediseño visual del detalle — 3 columnas, sin tocar dashboard):
 *   - Detalle pasa de 2 a 3 columnas: WhatsApp (28%) + Informacion del lead (flex) + Chat IA (32%).
 *   - Modal en vista detalle: 96vw x 96vh (.qida-view-detail). Dashboard conserva dimensiones previas.
 *   - Chat IA deja el pie del pane central y vive en columna dedicada (.qida-pane-ai).
 *   - Pane central con cards independientes (.qida-info-card) sobre fondo #FAFAF9.
 *   - Sistema visual unificado: paleta blanco/grises/verde Qida, pesos 400/500, sin multicolor.
 *   - WhatsApp mantiene fondo crema #ECE5DD en su columna. Resumen IA con highlight #E1F5EE.
 *
 * Cambios v1.6.0 (rediseno del detalle del lead, sin tocar dashboard):
 *   - Detalle pasa de 3 paneles a 2: pane WhatsApp (40%) + pane central (60%).
 *     Se elimina el pane derecho (Plantillas/Material/Adjuntos en tabs) y se elimina la
 *     temperatura editable inline (ya queda fija desde el dashboard).
 *   - Shell header del modal condicional por vista: en dashboard mantiene el bloque
 *     "Seguimientos / Tu workspace operativo + Sparkles + asistente"; en detail se
 *     reemplaza por una fila con [Volver] + nombre + ID + badge "Sin contacto: Nd"
 *     (umbrales: Hoy=verde vivo / 1-3=verde sutil / 4-7=naranja / 8+=rojo) + datos
 *     compactos (persona cuidada, ubicacion, telefono, tipo de servicio) + [X].
 *     Implementado con syncShellHeader() siguiendo el patron de syncAssistantHeader.
 *   - Eliminado el qida-detail-head inline. renderDetail() arranca directo con el body.
 *   - Pane WhatsApp incorpora envio estilo WhatsApp Web: clip (visual) + textarea
 *     auto-expandible (1-5 lineas) + boton send. Enter envia, Shift+Enter agrega linea.
 *     Auto-scroll al fondo al abrir el detalle y despues de cada envio. sendWhatsAppMock
 *     agrega el mensaje al MOCK_WHATSAPP del lead, resetea daysWithoutTouch=0 y actualiza
 *     lastInteraction. Eliminado el label "read-only" del header del pane.
 *   - Pane central reordenado: Resumen IA, Contexto, Notas internas, Actividades,
 *     Followers, Adjuntos colapsable (renderAttachmentsCollapsable, default colapsado),
 *     y al pie el Chat IA (renderAiChat). El boton "Agendar proximo seguimiento" se
 *     elimina del footer del detalle (Schedule modal queda vivo como reserva v1.7+).
 *   - Chat IA nuevo al pie del pane central. Estado inicial: input grande "Preguntale
 *     a la IA sobre este lead..." + 3 chips fijos: Material marketing, Sugerir mensaje,
 *     Reactivar sin presionar. Estado con conversacion: chips desaparecen, historial
 *     visible arriba del input. "Usar este mensaje" copia el texto (con placeholders
 *     resueltos contra el lead activo) al textarea del pane WhatsApp para que la AF
 *     edite y envie. Principio rector: la IA propone, la AF edita y envia.
 *   - state.aiChatHistory persiste por leadId durante toda la sesion del widget (vida
 *     del page load). NO se resetea al transicionar entre vistas ni al cerrar el modal.
 *     Esto permite volver al detalle de un lead y ver la conversacion previa con la IA.
 *   - Eliminados: state.activePanel, state.editingTemp, handlers set-panel/toggle-edit-temp/
 *     set-temp, MOCK_TEMPLATES, MOCK_MATERIAL, renderTemplatesPanel/MaterialPanel/
 *     AttachmentsPanel, CSS del pane-right/tabs/aside-body, qida-detail-head, media query
 *     @900px que ocultaba el pane-right. Media query @1100px ajustada al layout 40/60.
 *   - Conservados vivos sin invocador (reserva v1.7+): openScheduleFromDetail,
 *     openScheduleFromSuggestion, openScheduleFromActivity, todas las ramas
 *     scheduleOrigin === 'detail'/'suggestion'/'activity' en handleScheduleConfirm y
 *     handleScheduleCloseApply, Schedule modal completo, asistente del shell header
 *     (renderAssistantPill/Expanded/HeaderChip/Panel + syncAssistantHeader) y
 *     MOCK_MATERIAL_SEARCHABLE (lo usa SearchService del dashboard, distinto a MOCK_MATERIAL).
 *   - EDITS.temperatures se preserva: lo siguen leyendo getLeadTemperature/Source y lo
 *     escribe ActivityService.schedule cuando markPause=true (rama viva del Schedule modal).
 *
 * ============================================================
 * DEFAULTS QUE TOME EN v1.6.0 (no especificados explicitamente):
 * ============================================================
 *   1. Badge "Sin contacto" del shell header en detail: 4 umbrales sobre lead.daysWithoutTouch.
 *        0       -> "Hoy" sobre verde vivo (#16a34a / #ecfdf5).
 *        1-3     -> "Nd sin contacto" sobre verde sutil corporativo (qg-soft + texto qg).
 *        4-7     -> "Nd sin contacto" sobre naranja (#fed7aa / #9a3412).
 *        8+      -> "Nd sin contacto" sobre rojo (#fecaca / #991b1b).
 *      Mismo lenguaje visual que las temperatures pero centrado en el dato operativo "dias".
 *   2. Layout horizontal del detail: pane-wa = flex 0 0 40%, pane-center = flex 1 (60% efectivo).
 *      Sustituye los anchos fijos previos (340/auto/320). En @1100px se reduce a 38/62. En @760px
 *      el pane-wa se oculta (igual que antes).
 *   3. Container del input WhatsApp: bg blanco, border-radius 22px (pill), border 1px var(--s200),
 *      padding 6px 8px, sombra ligera (0 1px 2px rgba(0,0,0,.04)). Textarea sin borde propio,
 *      auto-resize via JS (min 1 linea ~36px, max 5 lineas ~120px). Boton send circular 32px,
 *      color qg, disabled cuando draftMessage.trim() === ''. Atajos: Enter envia,
 *      Shift+Enter agrega salto de linea.
 *   4. Auto-scroll WhatsApp: requestAnimationFrame -> setear scrollTop = scrollHeight del
 *      .qida-pane-body. Se dispara en (a) entrada al detalle (handler select-lead via
 *      scheduleAutoScroll), (b) post envio en sendWhatsAppMock, (c) cualquier rerender que
 *      mute la lista de mensajes. Estrategia: setear flag state.__waNeedsScroll y consumir
 *      en rerenderContent despues del innerHTML swap.
 *   5. Chat IA al pie: 3 chips fijos cuando aiChatHistory[leadId] esta vacio o ausente.
 *      Cuando hay conversacion, chips desaparecen y se muestra el historial dentro de un
 *      contenedor scrolleable maximo ~50% de la altura del pane central (max-height
 *      calc via clamp 220-400px). Click en chip dispara la respuesta mock directamente
 *      (no abre input). Click en input + Enter envia query libre con mockAIResponse.
 *   6. "Usar este mensaje" copia el texto al state.draftMessage del pane WhatsApp.
 *      Reemplaza el contenido del textarea (no concatena). Coloca el cursor al final tras
 *      el rerender. Resuelve placeholders {contactName} -> lead.contact, {relation} -> lead.relation,
 *      {caredPersonName} -> lead.caredPersonName antes de copiar.
 *   7. Adjuntos colapsable: header clickeable con icono paperclip + "Adjuntos (N)" + chevron.
 *      Estado expanded reusa el formato de tarjetas de attachments (mismo que antes en el
 *      pane derecho). Default colapsado al entrar a detalle. Resetear attachmentsExpanded=false
 *      en los 2 puntos de reset (select-lead y assistant-open-lead) y en back-to-dashboard /
 *      close-modal.
 *   8. Shell header en detail: una sola fila. Volver (ghost button), nombre (semibold 15px),
 *      ID (gris s500 11px), badge dias, separador, datos compactos en gris s600 12px con
 *      "&middot;" entre items. Asistente del header (qida-asst-anchor) sigue presente en el
 *      DOM pero vacio (lo maneja syncAssistantHeader). X de cerrar siempre presente al
 *      extremo derecho.
 *   9. Persistencia de aiChatHistory: inicializado UNA SOLA VEZ en el state inicial como
 *      objeto vacio. NO se resetea en select-lead, back-to-dashboard, close-modal ni
 *      assistant-open-lead. Solo se vacia con un page reload.
 *  10. Modal del detail: NO se sobre-escribe la regla 90vh original (decidi no inflar el
 *      diff). El detalle vive dentro de las dimensiones existentes del .qida-shell
 *      (max-width 1400px, max-height 90vh). La redistribucion ocurre dentro de
 *      .qida-detail-body (flex row 40/60). Si en QA visual se ve apretado, ajustar
 *      .qida-shell solo cuando state.view === 'detail' es trivial; no lo hago en v1.6
 *      sin senal de la AF.
 *  11. EDITS.temperatures NO se elimina aunque el set-temp manual se haya borrado: lo siguen
 *      leyendo los getters globales (getLeadTemperature/Source) y lo escribe la rama
 *      markPause de ActivityService.schedule (preservada vista por Schedule modal v1.7+).
 *
 * ============================================================
 * DEFAULTS QUE TOME EN v1.7.0 (no especificados explicitamente):
 * ============================================================
 *   1. Modal detalle 96vw x 96vh via clase .qida-view-detail en #qida-shell (syncShellSizing).
 *      Dashboard sin clase: max-width 1400px, max-height 90vh (corrige typo previo 100%px).
 *   2. Proporciones columnas: WA flex 0 0 28%, centro flex 1 1 auto, IA flex 0 0 32%.
 *   3. Variables CSS del prompt (--color-text-*) mapeadas a la paleta existente (--s500, etc.)
 *      y hex explicitos del brief (#0F6E56, #E1F5EE, #FAFAF9, #ECE5DD).
 *   4. Border radius cards 12px, chips/badges 8px (equivalente a border-radius-lg/md del brief).
 *   5. Chips IA arriba del input en el footer del pane (orden invertido vs v1.6).
 *   6. Titulo seccion actividades: "Proximas actividades" (antes "Actividades planificadas").
 *   7. Variantes IA muestran solo v.label ("Mas calida") sin prefijo "Variante N -".
 *   8. Shell header en detail: padding 10px 16px, nombre lead 14px/500, se restaura "Esc para cerrar".
 *   9. Followers se mantiene como card info (el mock no lo muestra pero el brief dice "si aplica").
 *  10. Media queries: <980px oculta pane-ai; <760px oculta pane-wa (igual espiritu v1.6).
 *
 * ============================================================
 * DEFAULTS QUE TOME EN v1.11.0 (no especificados explicitamente):
 * ============================================================
 *   1. Estrategia de cache: state.leadDetailCache es un objeto plano indexado por leadId
 *      (no Map). Persiste durante toda la sesion del page load (igual politica que
 *      aiChatHistory). NO se resetea en closeModal, NO tiene TTL ni invalidacion
 *      automatica. La unica forma de refrescar es page reload. Justificacion: la AF
 *      iterando sobre el mismo lead (abrir, leer, cerrar, reabrir) NO debe pagar
 *      6 round-trips a Odoo cada vez. Cuando la integracion crezca (Fase B - writes
 *      desde el widget), se agregara invalidacion selectiva en el handler de write.
 *   2. Manejo de tuples Odoo: tName/tId solo aceptan arrays length-2 con [id, "Name"].
 *      Para `false` (Odoo devuelve `false` cuando el campo es vacio, no `null`), ambos
 *      helpers devuelven null. Los mappers nunca acceden a o.partner_id[1] directo
 *      para no romper con false. Aplicado consistente en mapLead, mapCared, mapNote,
 *      mapActivity, mapAttachment, mapFollower.
 *   3. Politica de `location` vacio: crm.lead NO tiene un campo directo "ciudad". Tres
 *      opciones evaluadas: (a) leer res.partner.city via partner_id - 1 fetch extra,
 *      (b) heredar del row del dashboard cooling - acopla detalle a dashboard, (c) dejar
 *      vacio en Fase A. Elegida (c). mapLead pone location: '' y la UI del shell header
 *      del detalle muestra cadena vacia (queda como "A · · C" con un separador huerfano
 *      visible). Se evalua mejora en Fase C cuando se cablee tambien la persona cuidada
 *      con datos completos de Odoo.
 *   4. Orden de _errors: Promise.allSettled preserva el orden de los jobs. Constante
 *      documental: [0]=caredPerson, [1]=notes, [2]=activities, [3]=attachments, [4]=followers.
 *      Documentado en el comment encima del array. El primer fetch (crm.lead.read) NO
 *      esta en _errors - si falla, todo el detail queda en _error global.
 *   5. Race-guard: comparacion estricta state.currentLeadId === leadId. Si la AF saltó
 *      de Lead A a Lead B durante el fetch del A, cuando llegue la respuesta de A NO se
 *      rerendera (el cache de A se hidrata igual para hits futuros, pero la UI queda
 *      apuntando a B). El handler select-lead normaliza leadId a number ANTES del
 *      setState (parseInt si /^\d+$/.test(id), o id tal cual si ya viene como number/
 *      string no-numerico). Asi state.currentLeadId queda como number desde el inicio
 *      y la comparacion === con el leadId int de Odoo funciona sin coercion.
 *   6. Fallback a mock cuando IS_ODOO_MODE === false: LeadDetailService.fetchAll detecta
 *      el flag y, en modo mock, llama mockHydrate(leadId) sincronicamente y devuelve
 *      Promise.resolve(entry). El comportamiento en index.html (dev local) es 100%
 *      identico a v1.10.0 (sin loading visible, render instantaneo).
 *   7. fetchAll se llama SIEMPRE en select-lead (incluso modo mock), no solo cuando
 *      IS_ODOO_MODE es true. Justificacion: el cache siempre tiene la entrada del lead
 *      activo y los renderers reciben `cached` siempre populado. Mas limpio que tener
 *      dos paths (mock = leer mocks directos, odoo = leer cache).
 *   8. Renderer fallback cuando cached === null: si el handler aun no llamo a fetchAll
 *      (defensivo - no deberia pasar en el flujo normal), los renderers tratan TODO
 *      como "modo mock crudo" y leen directo de los mocks como en v1.10.0. Esto preserva
 *      el comportamiento de v1.10.0 si por alguna razon entras al detalle sin pasar
 *      por select-lead (ej. via API publica QidaAssistant.showScreen o test manual).
 *   9. Skeleton: 3 lineas por card en estado loading (anchos w90/w70/w50 para variar
 *      visualmente). Shimmer 1.4s ease-in-out infinite sobre gradiente eef0ee/f5f7f5.
 *      NO se muestra spinner ni texto "Cargando..." - solo las lineas grises. En modo
 *      mock el skeleton es invisible (mockHydrate sync, sin _loading: true intermedio).
 *  10. Granularidad de error: dos niveles. Global (cached._error) cuando crm.lead.read
 *      falla - sin lead base no hidratamos nada. Acciones: 401/403 o no-JSON -> toast
 *      "Sesion expirada en Odoo. Recarga la pagina." + cierre del detail. Otro error ->
 *      toast con mensaje + permitir reintentar. Parcial (cached._errors[idx] no-null
 *      + cached.<dataset> === null) - allSettled capturo fallo en uno de los 5 secundarios.
 *      Sin toast global. La card del dataset fallido muestra microcopy local "No se pudo
 *      cargar esta seccion". Los otros 4 datasets se hidratan normal.
 *  11. _baseContext: hidratado UNA SOLA VEZ en init via odooSession(). Si la AF cambia
 *      de lang o uid en otra pestana sin recargar, el widget seguira usando el contexto
 *      viejo (uid/lang/tz). Aceptable para Fase A (lectura). En Fase B (writes) se
 *      evaluara re-fetch del session_info antes de cada write.
 *  12. DOMPurify: cargado via @require en tempermonkey.js (Fase A solo en dev). El widget
 *      tiene fallback defensivo en sanitizeOdooHtml (template-based parse, eliminacion de
 *      script/style/iframe/object/embed/link/meta + atributos on* y javascript:href/src).
 *      Si DOMPurify no esta presente, el fallback aplica con lista mas conservadora. NO
 *      bloquea el render: peor caso, las notas sin sanitizar via DOMPurify pasan por el
 *      fallback. gtm-loader.html actualiza despues (cuando Pablo cablee DOMPurify en
 *      GTM o desde el sitio Odoo).
 *  13. Promise.allSettled: ES6+ pero soportado en Chrome 76+/Firefox 71+/Safari 13+/
 *      Edge 79+. Sin polyfill - el target real (Chrome/Firefox/Edge sobre erp.qida.es,
 *      lo mismo en dev local) lo soporta nativo. fetch idem (Chrome 42+). NO entra en
 *      contradiccion con "vanilla ES5" del resto del archivo: son APIs runtime, no
 *      sintaxis (no hay let/const, arrow functions, template literals, async/await).
 *  14. MOCK_COOLING_LEADS_RESPONSE: 7 filas, todas con leadId: 123333 (number). El row
 *      del dashboard sigue mostrando los 7 contactos / ubicaciones / razones distintas
 *      (vienen del cooling, no del detail). Clicks en cualquier fila abren el mismo lead
 *      real de prueba en Odoo. Tradeoff explicito: visualmente confunde un poco (7 filas
 *      "distintas" abren el mismo lead) pero permite testear el flow end-to-end Fase A
 *      sin necesidad de cablear cooling a Odoo (eso es Fase D). Cuando Fase D corra, el
 *      mock se reemplaza por GET al endpoint real. Side-effect conocido: si la AF marca
 *      "hecho" en una fila, el filtro de getCoolingLeadsSync compara state.completedTodayIds
 *      (string "123333" desde el DOM) vs row.leadId (number 123333) - mismatch, no filtra.
 *      Se acepta para Fase A (todas las filas son la misma de todos modos). Cuando Fase D
 *      cablee leadIds reales, esto deja de ser un edge case y la coercion natural del
 *      Set funciona como antes.
 *  15. EDITS conservadas: notas/scheduledActivities/iaSummaries siguen siendo overrides
 *      UX-locales. Se merge sobre cached.<dataset> en cada render. Sync a Odoo es
 *      Fase B/C. Justificacion: la AF iterando en modo Odoo puede agregar notas locales
 *      durante una sesion sin perderlas si la red se cae o si el endpoint de write aun
 *      no existe.
 *  16. Endpoint policy estricta: SOLO /web/dataset/call_kw/{model}/{method} y
 *      /web/session/get_session_info. Endpoints custom de Qida (/agency/*) NO se llaman -
 *      estan fuera de servicio segun el ultimo brief con Pablo. Si en Fase B aparecen
 *      endpoints custom, se agregaran al helper layer (no inline en el service).
 *  17. CORS: en modo Odoo (host === 'erp.qida.es') las llamadas son same-origin y la
 *      sesion (cookie session_id) viaja sola. En index.html / dev local el feature flag
 *      queda false y no hay llamadas - asi NO hay CORS issue.
 *  18. Bloque "Cambios v1.11.0" + DEFAULTS en orden descendente (mas reciente arriba),
 *      respetando el patron del archivo.
 *
 * ============================================================
 * DEFAULTS QUE TOME EN v1.10.0 (no especificados explicitamente):
 * ============================================================
 *   1. VERSION = '1.10.0' (no '1.8.0' como dice el prompt original). El prompt
 *      se escribio asumiendo v1.7.0 como base; el archivo ya estaba en v1.9.1
 *      con varias iteraciones sobre el detalle. Seguimos la convencion minor
 *      del archivo: refinamientos del detalle bumpean patch (1.9.0 -> 1.9.1),
 *      una iteracion grande de UI del dashboard bumpea minor (1.9.1 -> 1.10.0).
 *   2. daysWithoutTouchLevel pasa de 4 a 6 niveles (no 5 como dice el prompt
 *      en su titulo, pero coherente con sus 5 rangos de color + el caso
 *      especial lvl-today). Niveles: lvl-today (0) / lvl-fresh (1-3) / lvl-warn
 *      (4-7) / lvl-orange (8-14) / lvl-stale (15-20) / lvl-danger (21+). El
 *      shell header del detalle solo usa today/fresh/warn/stale (no cambia); los
 *      nuevos orange y danger los consume EXCLUSIVAMENTE la lista del dashboard.
 *      No agrego clases CSS .qida-dsh-days.lvl-orange/danger porque el detalle no
 *      los usa hoy (un lead con 22d nunca abre con esa categoria propia: solo se
 *      muestra como rojo via lvl-stale, que ya cubre 8+).
 *   3. getCoolingLeads se expone como getCoolingLeadsSync (sincrono, lee mock
 *      directo) + getCoolingLeads (async con simulateLatency, TODO[odoo]). El
 *      render del dashboard es sincrono (rerenderContent llama renderDashboard
 *      en el mismo tick) asi que usamos la version Sync. Cuando se cablee a
 *      Odoo, renderDashboard pasa a leer state.coolingLeads (cacheado) y se
 *      dispara fetch en mount / refresh. No me adelanto a esa logica.
 *   4. state.completedTodayIds usa Set() global (ES2015). Justificacion: todos
 *      los navegadores objetivo (Odoo erp.qida.es / Chrome/Firefox/Edge modernos)
 *      soportan Set nativo desde 2014. No vale la pena polyfillar con un objeto
 *      indexado por leadId para un Set efimero de sesion.
 *   5. data-stop en el boton "Marcar hecho" NO requiere handler extra:
 *      findActionTarget sube por el DOM hasta encontrar el primer ancestro con
 *      data-action. El boton "Marcar hecho" tiene su propio data-action="mark-done";
 *      el switch lo ejecuta y devuelve antes de propagar al data-action="select-lead"
 *      del row. data-stop queda como semantica documental (no funcional) por si
 *      mas adelante hay listeners que necesiten respetarlo. Esto evita modificar
 *      el patron de event delegation existente.
 *   6. Race condition de undoToast: si la AF clickea Marcar hecho en una fila A
 *      y antes de 4s clickea en una fila B, el timeout previo se cancela
 *      (clearTimeout) y se programa uno nuevo apuntando a B. El toast se
 *      reemplaza visualmente (queda apuntando al ultimo). Deshacer entonces
 *      solo revierte B (intentional: la AF ve "Marcado como hecho · Deshacer"
 *      y entiende que afecta al ultimo). A queda permanentemente marcado en
 *      sesion. Compromiso aceptable para no inflar UX con multi-undo.
 *   7. completedTodayIds NO se resetea en closeModal: persiste durante toda
 *      la sesion del page load (la AF puede cerrar el modal y volver a abrirlo
 *      y los marcados siguen filtrados). Solo se vacian undoToast + undoTimeoutId.
 *      Justificacion: la AF puede estar trabajando otros leads en Odoo entre
 *      apertura y apertura del widget, y no queremos que aparezcan leads ya
 *      "completados hoy" cada vez que reabre.
 *   8. Iconos refresh-cw y alert-triangle agregados al set I (lucide). No reutilizo
 *      'refresh' (que es RefreshCcw) ni 'alert' (que es AlertCircle) para
 *      respetar la semantica del prompt y los pesos visuales correctos.
 *   9. CSS del prompt usa --color-text-tertiary / --color-border-secondary /
 *      --color-background-secondary / --border-radius-md, variables que no
 *      existen en este archivo. Mapeo:
 *        --color-text-primary    -> var(--s900)
 *        --color-text-secondary  -> var(--s700)
 *        --color-text-tertiary   -> var(--s500)
 *        --color-background-secondary -> var(--s50)
 *        --color-border-secondary -> var(--s200)
 *        --color-border-tertiary -> var(--s100)
 *        --border-radius-md      -> 8px (consistente con qida-aichat-chip y similares)
 *      No invento variables nuevas. El sistema cromatico del archivo (paleta
 *      qg / s-scale) ya tenia esas equivalencias.
 *  10. Numeros grandes en columna "Sin contacto": font-size 22px (no 18px como
 *      el prompt) para que sea claramente la unidad de informacion principal
 *      de la fila. La fecha pequena abajo queda en 11px var(--s500). Margen
 *      tight para reforzar que son un par.
 *  11. Toast de undo: bottom 24px (no 20px) para alinear con la posicion del
 *      .qida-toast existente. Mismo estilo visual base (fondo oscuro, sombra)
 *      pero color verde menta en el boton "Deshacer" para diferenciarlo
 *      semanticamente de los toasts neutros (informacion vs accion reversible).
 *  12. Boton "Marcar hecho": color #0F6E56 (verde Qida) sobre fondo blanco.
 *      Aparece SOLO en hover (opacity 0 -> 1 con transicion 120ms) para no
 *      saturar visualmente las 5 filas. En mobile / sin hover, se podria
 *      ajustar mas adelante (gap conocido).
 *  13. closeModal: limpia undoToast + undoTimeoutId pero NO completedTodayIds.
 *      tambien limpia state legacy que ya no existe en initial state (defensive,
 *      por si quedan referencias en algun branch).
 *  14. Keyboard handler global: eliminado el atajo "/" y el branch isEnter
 *      del asistente. Solo queda Esc para cerrar (con el guard del schedule modal).
 *      Esc en dashboard cierra el modal directamente (sin estados intermedios
 *      del asistente que ya no existen).
 *
 * ============================================================
 * DEFAULTS QUE TOME EN v1.9.0 (no especificados explicitamente):
 * ============================================================
 *   1. detailLayoutSwapped default = true (chat IA al centro). closeModal resetea a true (no
 *      a false): el reset preserva el default operativo nuevo. Si la AF queria volver al
 *      layout v1.8.0, lo logra con el boton Swap.
 *   2. Anchos por posicion estructural en lugar de por clase:
 *        .qida-detail-body > *:nth-child(1) { flex: 0 0 28%; min-width: 0; }   // siempre pane-wa
 *        .qida-detail-body > *:nth-child(2) { flex: 1 1 auto; min-width: 0; }  // centro variable
 *        .qida-detail-body > *:nth-child(3) { flex: 0 0 32%; min-width: 0; }   // derecha variable
 *      Se eliminan los flex hardcodeados de .qida-pane-wa, .qida-pane-center y .qida-pane-ai
 *      (el resto del CSS de cada clase queda intacto). Las media queries siguen el mismo
 *      patron posicional. Implicancia visual: cuando se hace swap, no solo cambia el ORDEN
 *      sino tambien los ANCHOS (la columna del medio siempre es la ancha).
 *   3. Auto-resize del textarea WhatsApp tras ai-copy-to-wa: se invoca autoResizeTextarea(ta)
 *      dentro del mismo setTimeout que hace ta.focus(). Asi cuando la AF clickea "Copiar al
 *      WhatsApp" con un mensaje de 3-4 lineas, el textarea se expande hasta el max (5 lineas
 *      = 120px) en vez de quedar a min-height 24px con el contenido oculto.
 *   4. Bloque "Cambios v1.9.0" en orden descendente con los previos (mas reciente arriba).
 *
 * ============================================================
 * DEFAULTS QUE TOME EN v1.8.0 (no especificados explicitamente):
 * ============================================================
 *   1. Paleta del chat IA (hex exactos del plan, sin ajustes):
 *        Avatar Tu      -> bg #143C32 (verde oscuro Qida) / color #FFEFDA (crema calido).
 *        Avatar IA      -> bg #E1F5EE / color #0F6E56.
 *        Burbuja Tu     -> bg #F1F8EE (verde-blanco muy sutil).
 *        Burbuja IA     -> bg #FAFAF9 (off-white).
 *        Cards internas -> bg #fff con border 0.5px var(--s200).
 *      Las 3 capas (avatar / burbuja / card interna) tienen contraste claro entre si sin
 *      caer en multicolor: dos tonos verdes (oscuro/sutil) + dos neutros calidos (cream/off-white).
 *   2. Avatar usuario muestra "T" como inicial (no hay datos del usuario logueado todavia).
 *      Cuando se conecte a Odoo, reemplazar por primera letra del nombre de la AF.
 *   3. Mock de refine usa prefijo literal "[Mock: ajuste pedido aplicado] " concatenado al
 *      texto previo (no genera nada nuevo). Esta marcado con TODO[ai] arriba de mockAIResponse.
 *      Justificacion: simular el flujo conversacional sin requerir LLM, dejando claro al
 *      mirar el resultado que es mock y no algo "real".
 *   4. Border de .qida-info-card sube de var(--s200) a var(--s300) porque var(--s200) sobre
 *      el nuevo fondo verde menta #DBE9D5 queda apenas perceptible. Se evaluo box-shadow pero
 *      el cambio de variable es menor diff y consistente con el resto del archivo.
 *   5. Borders entre paneles del detail: selector estructural
 *      .qida-detail-body > *:not(:last-child) { border-right: 0.5px solid var(--s300); }
 *      garantiza que la columna mas a la derecha NUNCA tenga border-right, sin importar el
 *      orden con/sin swap. Se eliminan los border-right hardcodeados de .qida-pane-wa y
 *      .qida-pane-center.
 *   6. Boton swap en el shell header del detail: ubicado entre el qida-asst-anchor (vacio en
 *      detail) y el qida-esc, dentro del .qida-shell-actions. Estilo discreto: border 0.5px,
 *      transparent fill, hover var(--s100). Cuando active (swapped=true) usa fondo #E1F5EE
 *      + color #0F6E56 + border #c5e8dc para feedback visual sin agresividad.
 *   7. Icono del boton swap: combinacion "arrowLeft + arrowRight" como dos iconos consecutivos
 *      (no existe un solo icono "shuffle" en el set I; agregarlo solo para esto seria over-
 *      engineering). El label "Swap" se mantiene corto y descriptivo.
 *   8. Chips del chat IA en fila usan flex-wrap: wrap. En pane-ai estrecho (32% de 96vw) los
 *      3 chips pueden no entrar en una sola linea con anchos chicos -> wrap natural, sin
 *      breakpoint adicional.
 *   9. showToast ya existia en v1.6+: lo reutilizamos en ai-copy-to-wa con el mensaje
 *      "Mensaje copiado al campo de WhatsApp. Editalo y envialo." (consistente con el toast
 *      anterior de ai-use-message). NO se crea un nuevo sistema de feedback.
 *  10. pushAiPickVariant siempre crea el par user/ai en aiChatHistory (mismo patron que
 *      pushAiChat + handleAiChip). El texto del user-message visible es
 *      "<label> - esta me gusta mas" (ej "Mas calida - esta me gusta mas") para que en el
 *      historial quede claro que variante eligio.
 *  11. mockAIResponse en contexto refine recibe lead pero ignora el query (no analiza nada,
 *      solo prepende prefijo). El TODO[ai] marca el punto exacto a reemplazar con LLM real.
 *  12. detailLayoutSwapped se inicializa UNA SOLA VEZ en el state inicial. NO se toca en
 *      select-lead, back-to-dashboard ni assistant-open-lead (persiste durante toda la
 *      navegacion intra-sesion del modal). Solo se vuelve a false en closeModal.
 */
(function (window, document) {
    'use strict';

    if (window.__QIDA_ASSISTANT_LOADED__) {
        console.warn('[QidaAssistant] Already loaded, skipping...');
        return;
    }
    window.__QIDA_ASSISTANT_LOADED__ = true;

    var VERSION = '1.17.0';
    var CONFIG = null;
    // v1.11: feature flag automatico por host. true SOLO cuando el widget corre dentro
    //   de Odoo real (Tampermonkey/GTM sobre erp.qida.es). En index.html / dev local
    //   queda false y el detalle se hidrata via mockHydrate. Se setea en init() y puede
    //   degradar a false si odooSession() falla (fallback graceful a modo mock).
    var IS_ODOO_MODE = false;
    var _baseContext = {};
    // v1.12: whitelist de emails con acceso al panel de lideres. _isLeader se setea en
    //   init() comparando sess.username (modo Odoo) contra LEADER_EMAILS. En modo dev
    //   local (!IS_ODOO_MODE desde el inicio) se setea true automatico para iterar la UI.
    //   NUNCA degrada a true por fallback de session (eso expondria el dashboard a una AF).
    //   TODO[whitelist]: mover a campo Odoo del user (res.users.is_leader) en proxima iteracion.
    var LEADER_EMAILS = {
        'alejandro.vivas@qida.es': 1,
        'eva.fernandez.arratia@qida.es': 1,
        'jordi.castillo@qida.es': 1,
        'mariluz.guerrero@qida.es': 1
    };
    var _currentUserEmail = null;
    var _isLeader = false;
    var APEXCHARTS_URL = 'https://cdn.jsdelivr.net/npm/apexcharts';
    var QIDA_LOGO_URL = 'https://strapi-upload-files-production.s3.eu-central-1.amazonaws.com/qida_logo_ba5b1d80b5.png?w=1080';
    var FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap';
    // v1.10: COVERAGE_TARGET eliminado (lo consumia renderCoverage / CoverageService).

    function log(msg, data) {
        if (data !== undefined) console.log('[QidaAssistant] ' + msg, data);
        else console.log('[QidaAssistant] ' + msg);
    }

    // ============================================================
    // MOCK DATA
    // ============================================================
    // 12 leads de base + campos nuevos exigidos por el brief:
    //   serviceType, urgency, prescriptor, careContext, pausaUntil
    // Mocks de iaSummary, attachments, plannedActivities, followers
    // viven en mapas aparte indexados por leadId.
    // NOTA v1.3: agregamos entryDate (fecha de llamada inicial), nextScheduledFollowUp
    // (ISO o null) y historico (bool). historico=true significa entryDate > ventana_15d
    // sin pausa explicita. Sirve para el chip "Historico" y para detectar leads que se
    // fueron de la ventana operativa sin cerrar.
    // Mocks construidos asumiendo "hoy" = 2026-05-15. Las fechas son ISO YYYY-MM-DD.
    var MOCK_LEADS = [
        { id: 'L122581', name: 'Familia Martinez Ruiz',     contact: 'Maria Martinez',           location: 'Madrid',                phone: '+34 666 84 34 18', relation: 'Padre',   age: 87, caredPersonName: 'Juan Antonio', context: 'Movilidad reducida tras caida. Vive solo.',                                  temperature: 'caliente', temperatureReason: 'Pidio presupuesto ayer y respondio hoy con preguntas concretas', temperatureSource: 'IA', daysWithoutTouch: 1,  lastInteraction: 'Hoy 09:45',   interactionCount: 5, stage: 'Por aceptar',            urgent: true,  urgency: 'Muy urgente', serviceType: 'Por horas',     prescriptor: 'ESSIP-MUNDO MAYOR',            entryDate: '2026-05-04', nextScheduledFollowUp: '2026-05-16', historico: false },
        { id: 'L122613', name: 'Familia Vidal Pons',        contact: 'Jordi Vidal',              location: 'Barcelona',             phone: '+34 633 12 88 09', relation: 'Madre',   age: 82, caredPersonName: 'Carmen',       context: 'Demencia en fase inicial. Conviven dos hermanos.',                            temperature: 'templado', temperatureReason: 'Pidio pensarlo en familia, han pasado 4 dias',                temperatureSource: 'IA', daysWithoutTouch: 4,  lastInteraction: 'Hace 4 dias', interactionCount: 3, stage: 'Por elaborar propuesta', urgent: false, urgency: 'Estandar',    serviceType: 'Interno',       prescriptor: 'Web organico',                 entryDate: '2026-05-06', nextScheduledFollowUp: '2026-05-19', historico: false },
        { id: 'L122476', name: 'Familia Baena Sanz',        contact: 'Alejandra Baena',          location: 'Madrid',                phone: '+34 622 45 12 03', relation: 'Suegra',  age: 90, caredPersonName: 'Antonia',      context: 'Autonoma pero vive sola. Buscan acompanamiento diurno.',                      temperature: 'caliente', temperatureReason: 'Llamada agendada para manana 11:00',                          temperatureSource: 'IA', daysWithoutTouch: 0,  lastInteraction: 'Hoy 11:20',   interactionCount: 4, stage: 'Por aceptar',            urgent: false, urgency: 'Urgente',     serviceType: 'Por horas',     prescriptor: 'Recomendacion cliente',        entryDate: '2026-05-08', nextScheduledFollowUp: '2026-05-16', historico: false },
        { id: 'L121656', name: 'Familia Parellada Canals',  contact: 'Teresa Parellada',         location: "Sant Sadurni d'Anoia",  phone: '+34 644 78 90 12', relation: 'Padre',   age: 79, caredPersonName: 'Joan',         context: 'Postoperatorio cadera. Necesita ayuda temporal estimada 3-4 meses.',           temperature: 'templado', temperatureReason: 'Familia comparando con otras dos opciones',                   temperatureSource: 'AF', daysWithoutTouch: 6,  lastInteraction: 'Hace 6 dias', interactionCount: 4, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Externo',       prescriptor: 'Hospital Sant Joan de Deu',    entryDate: '2026-05-05', nextScheduledFollowUp: '2026-05-18', historico: false },
        { id: 'L121708', name: 'Familia Campos Rivera',     contact: 'David Campos',             location: 'Alcala de Henares',     phone: '+34 611 23 45 67', relation: 'Madre',   age: 84, caredPersonName: 'Pilar',        context: 'Caida reciente, alta hospitalaria la semana pasada.',                          temperature: 'frio',     temperatureReason: 'Dijo que llamaria, hace 11 dias sin respuesta',               temperatureSource: 'IA', daysWithoutTouch: 11, lastInteraction: 'Hace 11 dias',interactionCount: 2, stage: 'Por aceptar',            urgent: false, urgency: 'Urgente',     serviceType: 'Interno',       prescriptor: 'Hospital Principe de Asturias',entryDate: '2026-05-02', nextScheduledFollowUp: null,         historico: false },
        { id: 'L121547', name: 'Familia Sanchez Tartalo',   contact: 'Maria Jesus Sanchez',      location: 'Madrid',                phone: '+34 655 90 11 22', relation: 'Madre',   age: 88, caredPersonName: 'Dolores',      context: 'Alzheimer fase moderada. Hija quiere relevo de fines de semana.',              temperature: 'frio',     temperatureReason: 'No responde desde la propuesta hace 10 dias',                 temperatureSource: 'IA', daysWithoutTouch: 10, lastInteraction: 'Hace 10 dias',interactionCount: 2, stage: 'Por elaborar propuesta', urgent: false, urgency: 'Estandar',    serviceType: 'Fin de semana', prescriptor: 'Web organico',                 entryDate: '2026-05-03', nextScheduledFollowUp: null,         historico: false },
        { id: 'L121749', name: 'Familia Ferreiro Bergino',  contact: 'Maria del Mar Ferreiro',   location: 'Madrid',                phone: '+34 677 88 99 00', relation: 'Tio',     age: 81, caredPersonName: 'Francisco',    context: 'Sin familia cercana. Sobrina unica responsable.',                              temperature: 'templado', temperatureReason: 'Esperando que organice visita al domicilio',                  temperatureSource: 'IA', daysWithoutTouch: 2,  lastInteraction: 'Hace 2 dias', interactionCount: 6, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Interno',       prescriptor: 'ESSIP-MUNDO MAYOR',            entryDate: '2026-05-07', nextScheduledFollowUp: '2026-05-20', historico: false },
        { id: 'L122131', name: 'Familia Roge Barcelo',      contact: 'Conxi Roge',               location: 'Barcelona',             phone: '+34 688 77 66 55', relation: 'Marido',  age: 76, caredPersonName: 'Albert',       context: 'Parkinson avanzado. Cuidadora actual deja en mayo.',                           temperature: 'caliente', temperatureReason: 'Urgencia operativa: necesita cuidadora antes del 30/05',     temperatureSource: 'AF', daysWithoutTouch: 2,  lastInteraction: 'Hace 2 dias', interactionCount: 7, stage: 'Por aceptar',            urgent: true,  urgency: 'Muy urgente', serviceType: 'Interno',       prescriptor: 'Recomendacion AF anterior',    entryDate: '2026-05-04', nextScheduledFollowUp: '2026-05-15', historico: false },
        { id: 'L122055', name: 'Familia Recio del Campo',   contact: 'Jose Maria Recio',         location: 'Collado Villalba',      phone: '+34 699 11 22 33', relation: 'Madre',   age: 85, caredPersonName: 'Mercedes',     context: 'Indecision sobre interna vs externa.',                                         temperature: 'frio',     temperatureReason: 'No contesta WhatsApp ni llamadas hace 9 dias',                temperatureSource: 'IA', daysWithoutTouch: 9,  lastInteraction: 'Hace 9 dias', interactionCount: 3, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Externo',       prescriptor: 'Web organico',                 entryDate: '2026-05-05', nextScheduledFollowUp: null,         historico: false },
        { id: 'L121843', name: 'Familia Avelino Redondo',   contact: 'Avelino Redondo',          location: 'Madrid',                phone: '+34 600 12 34 56', relation: 'Mujer',   age: 78, caredPersonName: 'Rosa',         context: 'Recien derivado, sin contacto inicial todavia.',                               temperature: 'pausa',    temperatureReason: 'Pidio no contactar hasta junio (viaje familiar)',             temperatureSource: 'AF', daysWithoutTouch: 0,  lastInteraction: 'Hace 1 dia', interactionCount: 0, stage: 'Por contactar',          urgent: false, urgency: 'Estandar',    serviceType: 'Por horas',     prescriptor: 'ESSIP-MUNDO MAYOR',            entryDate: '2026-05-10', nextScheduledFollowUp: '2026-06-05', historico: false, pausaUntil: '2026-06-05' },
        { id: 'L122278', name: 'Familia Ruben Garcia',      contact: 'Marina Ruben',             location: 'Madrid',                phone: '+34 622 99 88 77', relation: 'Padre',   age: 83, caredPersonName: 'Manuel',       context: 'Diabetes y movilidad limitada. Vive con esposa de 80.',                        temperature: 'templado', temperatureReason: 'Esperando respuesta tras enviarle el presupuesto',            temperatureSource: 'IA', daysWithoutTouch: 5,  lastInteraction: 'Hace 5 dias', interactionCount: 3, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Por horas',     prescriptor: 'Hospital La Paz',              entryDate: '2026-05-06', nextScheduledFollowUp: null,         historico: false },
        { id: 'L121399', name: 'Familia Ortiz Pica',        contact: 'Marta Ortiz',              location: 'Madrid',                phone: '+34 644 55 66 77', relation: 'Madre',   age: 86, caredPersonName: 'Concepcion',   context: 'Alta hospitalaria reciente. Necesita ayuda al alta inmediata.',                temperature: 'caliente', temperatureReason: 'Urgente: alta hospitalaria manana, sin alguien en casa',     temperatureSource: 'AF', daysWithoutTouch: 0,  lastInteraction: 'Hoy 08:30',   interactionCount: 2, stage: 'Por elaborar propuesta', urgent: true,  urgency: 'Muy urgente', serviceType: 'Interno',       prescriptor: 'Hospital La Paz',              entryDate: '2026-05-13', nextScheduledFollowUp: '2026-05-15', historico: false },
        // Pausados sin contactar todavia
        { id: 'L122701', name: 'Familia Lopez Iniesta',     contact: 'Carlos Lopez',             location: 'Madrid',                phone: '+34 611 99 00 11', relation: 'Madre',   age: 81, caredPersonName: 'Isabel',       context: 'Derivacion reciente desde hospital. Aun sin primer contacto.',                  temperature: 'pausa',    temperatureReason: 'Sin contactar todavia, lead recien asignado',                 temperatureSource: 'IA', daysWithoutTouch: 1,  lastInteraction: 'Hace 1 dia', interactionCount: 0, stage: 'Por contactar',          urgent: false, urgency: 'Estandar',    serviceType: 'Interno',       prescriptor: 'Hospital Ramon y Cajal',       entryDate: '2026-05-12', nextScheduledFollowUp: null,         historico: false },
        { id: 'L122845', name: 'Familia Mestres Carrasco',  contact: 'Pilar Mestres',            location: 'Sabadell',              phone: '+34 633 78 22 41', relation: 'Padre',   age: 89, caredPersonName: 'Jordi',        context: 'Ya tuvo cuidadora anterior, busca relevo por jubilacion.',                     temperature: 'pausa',    temperatureReason: 'Pausa hasta que vuelva del viaje el 20/05',                   temperatureSource: 'AF', daysWithoutTouch: 3,  lastInteraction: 'Hace 3 dias', interactionCount: 2, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Externo',       prescriptor: 'Recomendacion cliente',        entryDate: '2026-05-09', nextScheduledFollowUp: '2026-05-20', historico: false, pausaUntil: '2026-05-20' },
        // ----- Leads HISTORICOS (entryDate > 15 dias sin pausa explicita) -----
        { id: 'L120912', name: 'Familia Heredia Solis',     contact: 'Adriana Heredia',          location: 'Madrid',                phone: '+34 666 77 88 99', relation: 'Madre',   age: 84, caredPersonName: 'Lucia',        context: 'Lead derivado hace casi un mes, sin movimiento.',                              temperature: 'frio',     temperatureReason: 'Sin respuesta hace 18 dias. Quedo fuera de ventana operativa.', temperatureSource: 'IA', daysWithoutTouch: 18, lastInteraction: 'Hace 18 dias',interactionCount: 1, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Por horas',     prescriptor: 'Web organico',                 entryDate: '2026-04-22', nextScheduledFollowUp: null,         historico: true },
        { id: 'L120478', name: 'Familia Bertran Casas',     contact: 'Joana Bertran',            location: 'Barcelona',             phone: '+34 622 11 22 33', relation: 'Padre',   age: 92, caredPersonName: 'Marc',         context: 'Familia indecisa por precio, pidio reflexion larga.',                          temperature: 'frio',     temperatureReason: 'Sin respuesta hace 22 dias tras envio presupuesto.',          temperatureSource: 'IA', daysWithoutTouch: 22, lastInteraction: 'Hace 22 dias',interactionCount: 4, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Externo',       prescriptor: 'Recomendacion cliente',        entryDate: '2026-04-15', nextScheduledFollowUp: null,         historico: true }
    ];

    var MOCK_WHATSAPP = {
        L122581: [
            { from: 'lead', text: 'Hola, vi su web. Mi padre se cayo la semana pasada y necesita ayuda.', time: 'Lun 17:30' },
            { from: 'af',   text: 'Buenas tardes Maria, gracias por contactarnos. Lamento lo de tu padre. Tienes 10 minutos manana para que podamos entender mejor la situacion?', time: 'Lun 17:42' },
            { from: 'lead', text: 'Si, manana a las 10 podemos.', time: 'Lun 17:50' },
            { from: 'af',   text: 'Perfecto, te llamo a las 10. Hablamos.', time: 'Lun 17:52' },
            { from: 'lead', text: 'Hola, vi el presupuesto. Queria preguntarte dos cosas: incluye fines de semana? Y se puede empezar la semana que viene?', time: 'Hoy 09:45' }
        ],
        L122613: [
            { from: 'lead', text: 'Buenas, mi madre tiene principio de demencia. Somos dos hermanos.', time: 'Vie 11:20' },
            { from: 'af',   text: 'Hola Jordi, entiendo. Podemos hablar 15 minutos esta tarde para entender que necesitais exactamente?', time: 'Vie 11:35' },
            { from: 'lead', text: 'Esta tarde si, sobre las 18:00.', time: 'Vie 11:40' },
            { from: 'af',   text: 'Os mando el presupuesto en PDF como hablamos. Cualquier duda me decis.', time: 'Vie 18:55' },
            { from: 'lead', text: 'Gracias. Lo hablo con mi hermano y te digo a principios de semana.', time: 'Vie 19:02' }
        ],
        L122476: [
            { from: 'lead', text: 'Hola, mi suegra vive sola y queremos alguien que la acompane por las mananas.', time: 'Mie 10:00' },
            { from: 'af',   text: 'Hola Alejandra, claro. Cuantas horas estimas por manana? Hace falta ayuda con comidas o solo compania?', time: 'Mie 10:15' },
            { from: 'lead', text: '4 horas, de 9 a 13. Comidas se las prepara ella, solo compania y acompanamiento a paseos o medico.', time: 'Mie 10:22' },
            { from: 'af',   text: 'Hola Alejandra, te llamo manana a las 11 con los detalles del perfil que hemos identificado. Te va bien?', time: 'Hoy 11:20' }
        ],
        L121656: [
            { from: 'lead', text: 'Buenos dias, mi padre sale del hospital y necesitamos ayuda urgente en domicilio.', time: 'Hace 8 dias' },
            { from: 'af',   text: 'Hola Teresa, entiendo. Te mando el presupuesto con dos opciones para que valoreis en familia.', time: 'Hace 7 dias' },
            { from: 'lead', text: 'Recibido, lo estamos comparando con dos opciones mas. Te digo manana.', time: 'Hace 6 dias' }
        ],
        L122131: [
            { from: 'lead', text: 'Hola, la cuidadora actual de mi marido nos deja a final de mes. Necesitamos relevo URGENTE.', time: 'Hace 5 dias' },
            { from: 'af',   text: 'Conxi, lo manejo con prioridad. Te mando dos perfiles esta tarde.', time: 'Hace 5 dias' },
            { from: 'lead', text: 'Gracias. Es Parkinson avanzado, necesitamos alguien con experiencia.', time: 'Hace 5 dias' },
            { from: 'af',   text: 'Perfectos los dos perfiles que te envio. Ambos con +5 anos en Parkinson.', time: 'Hace 3 dias' },
            { from: 'lead', text: 'Nos gusta el segundo. Puede empezar el 25?', time: 'Hace 2 dias' }
        ]
    };

    var MOCK_NOTES = {
        L122581: [
            { author: 'Patricia V.', date: 'Hace 2 dias', text: 'Tienen presupuesto aprobado. Decision rapida si mostramos perfil adecuado.' },
            { author: 'Patricia V.', date: 'Hace 5 dias', text: 'Primera llamada con Maria. Padre lucido pero con movilidad muy reducida.' }
        ],
        L122613: [
            { author: 'Patricia V.', date: 'Hace 4 dias', text: 'Hablan los dos hermanos, decision conjunta. Hermano mayor mas reticente.' }
        ],
        L122131: [
            { author: 'Patricia V.', date: 'Hace 5 dias', text: 'Urgencia real, hay deadline operativo el 30/05. Coordinar con seleccion.' }
        ]
    };

    // v1.6: MOCK_TEMPLATES y MOCK_MATERIAL eliminados. El pane derecho del detalle desaparece
    // (Plantillas / Material / Adjuntos en tabs).
    // v1.10: MOCK_MATERIAL_SEARCHABLE tambien eliminado (lo consumia SearchService).

    // Resumenes IA (texto + autor + timestamp). Si un lead no esta en este mapa,
    // se muestra el placeholder "Resumen no generado todavia".
    var MOCK_IA_SUMMARIES = {
        L122581: { text: 'Familia con padre de 87 anos que tuvo caida hace 8 dias. Vive solo. Maria (hija) es el contacto, decision suya. Presupuesto enviado el lunes con servicio Por horas (4-5h diarias). Hoy respondio con dos preguntas concretas: cobertura fin de semana y disponibilidad para empezar la proxima semana -> senal de cierre proximo. Patron: misma franja horaria todas las interacciones (manana). Probabilidad alta de conversion si cubrimos fin de semana.', generatedAt: 'Hace 2h', editedBy: null },
        L122613: { text: 'Madre con principio de demencia. Familia conviven dos hermanos, decision conjunta. Hermano mayor mas reticente (segun nota Patricia). Presupuesto enviado el viernes, dijeron que decidirian a principios de semana. Han pasado 4 dias sin respuesta. Sugerencia: hablar primero con Jordi para confirmar que el hermano sigue dentro, antes de presionar con seguimiento del presupuesto.', generatedAt: 'Hace 1d', editedBy: null },
        L122476: { text: 'Suegra autonoma de 90 anos. Quieren acompanamiento mananas (9-13h, 4h dia). Solo compania, no tareas. Llamada agendada manana 11:00 para confirmar perfil identificado.', generatedAt: 'Hace 30 min', editedBy: null },
        L121656: { text: 'Padre 79 anos, postoperatorio cadera, ayuda temporal 3-4 meses. Familia esta comparando con otras dos opciones. Presupuesto enviado hace una semana. Riesgo medio de perder por precio si las otras opciones son mas baratas.', generatedAt: 'Hace 3d', editedBy: 'Patricia V.' },
        L122131: { text: 'Caso urgente operativo: cuidadora actual deja antes del 30/05, hay deadline real. Marido con Parkinson avanzado. Ya enviamos dos perfiles con experiencia en Parkinson, familia eligio el segundo y pregunto si puede empezar el 25. Cerrar fechas y arranque ASAP.', generatedAt: 'Hace 1d', editedBy: null },
        L121399: { text: 'Madre 86 anos, alta hospitalaria manana. Urgencia muy alta. Familia necesita cobertura desde el dia 1. Solo 2 interacciones, faltan datos basicos. Llamar hoy para captar perfil y enviar propuesta esta tarde.', generatedAt: 'Hace 1h', editedBy: null }
    };

    // v1.16: "Análisis IA" del detalle (preparación de UI, sin backend). Mismo shape que
    //   MOCK_IA_SUMMARIES. Un solo bloque que junta DOS contenidos: por qué se sugiere
    //   seguimiento + contexto adicional del lead. Algunos leads CON análisis (estado generado),
    //   el resto SIN (estado vacío) -> ambos estados visibles en QA.
    //   TODO[backend]: reemplazar por el endpoint de análisis cuando exista.
    var MOCK_IA_ANALYSIS = {
        L122581: { text: 'Sugerimos seguimiento HOY: respondió esta mañana con dos preguntas concretas (cobertura fin de semana y fecha de inicio) tras el presupuesto del lunes — señal clara de cierre próximo. Contexto: padre de 87 años que vive solo post-caída; Maria (hija) decide. Patrón: siempre contesta por la mañana. Buen momento para confirmar cobertura de fin de semana antes de cerrar.', generatedAt: 'Hace 2h', editedBy: null },
        L122613: { text: 'Sugerimos seguimiento: pasaron 4 días sin respuesta tras el presupuesto del viernes, dentro del patrón de decisión familiar pendiente (señalado en notas internas). Contexto: conviven dos hermanos y deciden en conjunto; el hermano mayor es el más reticente. Conviene confirmar con Jordi que el hermano sigue dentro antes de presionar con el presupuesto.', generatedAt: 'Hace 1d', editedBy: null },
        L121399: { text: 'Sugerimos seguimiento URGENTE hoy: alta hospitalaria mañana y la familia necesita cobertura desde el día 1. Contexto: solo 2 interacciones y faltan datos básicos del perfil. Llamar hoy para captar el perfil y enviar la propuesta esta tarde.', generatedAt: 'Hace 1h', editedBy: null }
    };

    // Care context estructurado (la AF lo necesita resumido para no abrir Odoo).
    // v1.5: caredPerson y caredAge migrados a MOCK_LEADS (lead.relation, lead.age).
    // Aqui queda solo info propia del care context que no esta en el lead base.
    var MOCK_CARE_CONTEXT = {
        L122581: { relationship: 'Padre del contacto Maria',        mainCondition: 'Movilidad reducida (post-caida)', livesAlone: true  },
        L122613: { relationship: 'Madre de Jordi y hermano',         mainCondition: 'Demencia fase inicial',           livesAlone: false },
        L122476: { relationship: 'Suegra del contacto Alejandra',   mainCondition: 'Autonoma con limitaciones leves', livesAlone: true  },
        L121656: { relationship: 'Padre de Teresa',                  mainCondition: 'Postoperatorio cadera',           livesAlone: false },
        L121708: { relationship: 'Madre de David',                   mainCondition: 'Caida reciente, alta hospitalaria', livesAlone: true  },
        L121547: { relationship: 'Madre de Maria Jesus',             mainCondition: 'Alzheimer fase moderada',         livesAlone: false },
        L121749: { relationship: 'Tio de Maria del Mar',             mainCondition: 'Sin condicion grave, vive solo',  livesAlone: true  },
        L122131: { relationship: 'Marido de Conxi',                  mainCondition: 'Parkinson avanzado',              livesAlone: false },
        L122055: { relationship: 'Madre de Jose Maria',              mainCondition: 'Sin condicion grave reportada',   livesAlone: true  },
        L121843: { relationship: 'Esposa de Avelino',                mainCondition: 'Sin diagnostico aun',             livesAlone: false },
        L122278: { relationship: 'Padre de Marina',                  mainCondition: 'Diabetes + movilidad limitada',   livesAlone: false },
        L121399: { relationship: 'Madre de Marta',                   mainCondition: 'Alta hospitalaria reciente',      livesAlone: true  },
        L122701: { relationship: 'Madre de Carlos',                  mainCondition: 'Sin condicion grave reportada',   livesAlone: false },
        L122845: { relationship: 'Padre de Pilar',                   mainCondition: 'Sin condicion grave reportada',   livesAlone: false },
        L120912: { relationship: 'Madre de Adriana',                 mainCondition: 'Sin diagnostico reportado',       livesAlone: true  },
        L120478: { relationship: 'Padre de Joana',                   mainCondition: 'Demencia avanzada',               livesAlone: false }
    };

    // Adjuntos (segun shape Odoo: id, name, mimetype, type, date, isMain).
    var MOCK_ATTACHMENTS = {
        L122581: [
            { id: 583761, name: 'Presupuesto personalizado - Familia Martinez.pdf', mimetype: 'application/pdf', date: 'Hace 2 dias', isMain: true },
            { id: 583762, name: 'Informe medico padre.pdf', mimetype: 'application/pdf', date: 'Hace 5 dias', isMain: false }
        ],
        L122613: [
            { id: 583770, name: 'Presupuesto personalizado - Familia Vidal.pdf', mimetype: 'application/pdf', date: 'Hace 4 dias', isMain: true }
        ],
        L122476: [],
        L121656: [
            { id: 583780, name: 'Presupuesto v1 - Familia Parellada.pdf', mimetype: 'application/pdf', date: 'Hace 7 dias', isMain: true },
            { id: 583781, name: 'Foto informe alta hospitalaria.jpg', mimetype: 'image/jpeg', date: 'Hace 8 dias', isMain: false }
        ],
        L121708: [],
        L121547: [
            { id: 583790, name: 'Propuesta fin de semana - Sanchez.pdf', mimetype: 'application/pdf', date: 'Hace 10 dias', isMain: true }
        ],
        L121749: [],
        L122131: [
            { id: 583800, name: 'Perfil cuidadora #1 - Maria L.pdf', mimetype: 'application/pdf', date: 'Hace 3 dias', isMain: false },
            { id: 583801, name: 'Perfil cuidadora #2 - Susana R.pdf', mimetype: 'application/pdf', date: 'Hace 3 dias', isMain: true }
        ],
        L122055: [],
        L121843: [],
        L122278: [
            { id: 583810, name: 'Presupuesto Por horas - Ruben.pdf', mimetype: 'application/pdf', date: 'Hace 5 dias', isMain: true }
        ],
        L121399: [
            { id: 583820, name: 'Presupuesto urgente alta - Ortiz.pdf', mimetype: 'application/pdf', date: 'Hoy 08:00', isMain: true }
        ],
        L122701: [],
        L122845: [],
        L120912: [],
        L120478: [
            { id: 583830, name: 'Presupuesto v1 - Familia Bertran.pdf', mimetype: 'application/pdf', date: 'Hace 24 dias', isMain: true }
        ]
    };

    // Actividades planificadas. Mismo shape que el endpoint Odoo (date_deadline,
    // user_id, summary, state) pero aplanado para mock.
    var MOCK_PLANNED_ACTIVITIES = {
        L122581: [
            { id: 959001, type: 'Por hacer', summary: 'Responder dudas sobre fin de semana y arranque', deadline: '2026-05-13', state: 'today',    assignee: 'Patricia V.', done: false },
            { id: 959002, type: 'Llamada',   summary: 'Llamada de cierre con Maria',                    deadline: '2026-05-14', state: 'planned',  assignee: 'Patricia V.', done: false }
        ],
        L122613: [
            { id: 959010, type: 'Por hacer', summary: 'Followup tras presupuesto familiar',             deadline: '2026-05-10', state: 'overdue',  assignee: 'Patricia V.', done: false }
        ],
        L122131: [
            { id: 959020, type: 'Por hacer', summary: 'Confirmar fecha de arranque (25/05)',             deadline: '2026-05-14', state: 'planned',  assignee: 'Patricia V.', done: false },
            { id: 959021, type: 'Llamada',   summary: 'Llamada con seleccion para cierre operativo',    deadline: '2026-05-12', state: 'overdue',  assignee: 'Patricia V.', done: false }
        ],
        L121399: [
            { id: 959030, type: 'Llamada',   summary: 'Llamar a Marta para captar perfil',              deadline: '2026-05-13', state: 'today',    assignee: 'Patricia V.', done: false }
        ],
        L122845: [
            { id: 959040, type: 'Recordatorio', summary: 'Retomar al volver del viaje',                  deadline: '2026-05-20', state: 'planned',  assignee: 'Patricia V.', done: false }
        ]
    };

    // Followers (estilo Odoo: name, role, email). Roles inferidos del JSON real.
    var DEFAULT_FOLLOWERS = [
        { name: 'Patricia V.',  role: 'AF responsable', email: 'patricia.v@qida.es' },
        { name: 'Asun Herrera', role: 'Coordinadora AF', email: 'asuncion.herrera@qida.es' }
    ];
    var MOCK_FOLLOWERS = {
        L122581: [{ name: 'Patricia V.', role: 'AF responsable', email: 'patricia.v@qida.es' }, { name: 'Alba Moya', role: 'Coordinadora AF', email: 'alba.moya@qida.es' }, { name: 'Maria Martinez', role: 'Contacto cliente', email: 'maria.martinez@gmail.com' }],
        L122613: [{ name: 'Patricia V.', role: 'AF responsable', email: 'patricia.v@qida.es' }, { name: 'Alba Moya', role: 'Coordinadora AF', email: 'alba.moya@qida.es' }],
        L122131: [{ name: 'Patricia V.', role: 'AF responsable', email: 'patricia.v@qida.es' }, { name: 'Natalia Narro', role: 'Coordinadora AF', email: 'natalia.narro@qida.es' }, { name: 'Marina Rodriguez', role: 'Seleccion', email: 'marina.rodriguez@qida.es' }],
        L121399: [{ name: 'Patricia V.', role: 'AF responsable', email: 'patricia.v@qida.es' }, { name: 'Asun Herrera', role: 'Coordinadora AF', email: 'asuncion.herrera@qida.es' }]
    };

    // ============================================================
    // MOCK v1.10 (dashboard de leads enfriandose)
    // ============================================================
    // TODO[odoo]: cuando este el endpoint real GET /api/me/leads/cooling, este mock
    // se reemplaza por la llamada al backend. Especificacion del endpoint al final
    // del archivo (comentario "TODOs para backend").
    // El array YA esta filtrado (solo enfriandose), YA priorizado (orden por urgencia),
    // y YA excluye leads con seguimiento agendado futuro (lógica del backend).
    // Cubre los 5 rangos de urgencia: warn (4-7), orange (8-14), stale (15-20), danger (21+).
    // v1.13: 3 respuestas mock, una por vista del dashboard. Shape comun (ver header):
    //   { id, familyName, city, caregiverInfo:{name,relation,age}, serviceType, reason,
    //     daysWithoutTouch, lastTouchDate (ISO), temperature, urgency, hasNewMessage,
    //     unreadMessagesCount, historico? }.
    //   Los ids reusan MOCK_LEADS para que select-lead -> detalle resuelva contra datos reales.
    //   urgency: las suggestions usan vocabulario NUEVO (alta/media/baja); activities/leads usan
    //   el del detalle (Muy urgente/Urgente/Estandar) -> ambos los normaliza normalizeUrgency().
    //   Fechas asumen hoy = 2026-05-15 (igual que el resto del mock).
    //   TODO[odoo]: reemplazar por GET /api/me/leads/{suggestions|activities|leads}.

    // Sugerencias del dia (~6). 3 caliente / 1 templado / 2 frio. EDGE CASE: L122581 con
    //   WhatsApp nuevo + urgencia alta + caliente (render visual extremo).
    var MOCK_SUGGESTIONS_RESPONSE = [
        { id: 'L122581', familyName: 'Familia Martinez Ruiz',    city: 'Madrid',               caregiverInfo: { name: 'Juan Antonio', relation: 'Padre',  age: 87 }, serviceType: 'Por horas',     reason: 'Pidio presupuesto ayer y respondio hoy con preguntas concretas', daysWithoutTouch: 1,  lastTouchDate: '2026-05-14', temperature: 'caliente', urgency: 'alta',  hasNewMessage: true,  unreadMessagesCount: 3 },
        { id: 'L121399', familyName: 'Familia Ortiz Pica',       city: 'Madrid',               caregiverInfo: { name: 'Concepcion',   relation: 'Madre',  age: 86 }, serviceType: 'Interno',       reason: 'Alta hospitalaria manana, sin alguien en casa',                  daysWithoutTouch: 0,  lastTouchDate: '2026-05-15', temperature: 'caliente', urgency: 'alta',  hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122131', familyName: 'Familia Roge Barcelo',     city: 'Barcelona',            caregiverInfo: { name: 'Albert',       relation: 'Marido', age: 76 }, serviceType: 'Interno',       reason: 'Necesita cuidadora antes del 30/05',                             daysWithoutTouch: 2,  lastTouchDate: '2026-05-13', temperature: 'caliente', urgency: 'media', hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122613', familyName: 'Familia Vidal Pons',       city: 'Barcelona',            caregiverInfo: { name: 'Carmen',       relation: 'Madre',  age: 82 }, serviceType: 'Interno',       reason: 'Pidio pensarlo en familia, han pasado 4 dias',                   daysWithoutTouch: 4,  lastTouchDate: '2026-05-11', temperature: 'templado', urgency: 'media', hasNewMessage: true,  unreadMessagesCount: 1 },
        { id: 'L121708', familyName: 'Familia Campos Rivera',    city: 'Alcala de Henares',    caregiverInfo: { name: 'Pilar',        relation: 'Madre',  age: 84 }, serviceType: 'Interno',       reason: 'Dijo que llamaria, hace 11 dias sin respuesta',                  daysWithoutTouch: 11, lastTouchDate: '2026-05-04', temperature: 'frio',     urgency: 'media', hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122055', familyName: 'Familia Recio del Campo',  city: 'Collado Villalba',     caregiverInfo: { name: 'Mercedes',     relation: 'Madre',  age: 85 }, serviceType: 'Externo',       reason: 'No contesta WhatsApp ni llamadas hace 9 dias',                   daysWithoutTouch: 9,  lastTouchDate: '2026-05-06', temperature: 'frio',     urgency: 'baja',  hasNewMessage: false, unreadMessagesCount: 0 }
    ];

    // Actividades programadas (~9). Vocabulario urgency del detalle. Temperatura mixta.
    var MOCK_ACTIVITIES_RESPONSE = [
        { id: 'L122476', familyName: 'Familia Baena Sanz',       city: 'Madrid',               caregiverInfo: { name: 'Antonia',      relation: 'Suegra', age: 90 }, serviceType: 'Por horas',     reason: 'Llamada agendada hoy 11:00',                                     daysWithoutTouch: 0,  lastTouchDate: '2026-05-15', temperature: 'caliente', urgency: 'Urgente',     hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122131', familyName: 'Familia Roge Barcelo',     city: 'Barcelona',            caregiverInfo: { name: 'Albert',       relation: 'Marido', age: 76 }, serviceType: 'Interno',       reason: 'Cierre operativo: cuidadora antes del 30/05',                    daysWithoutTouch: 2,  lastTouchDate: '2026-05-13', temperature: 'caliente', urgency: 'Muy urgente', hasNewMessage: true,  unreadMessagesCount: 2 },
        { id: 'L121656', familyName: 'Familia Parellada Canals', city: "Sant Sadurni d'Anoia", caregiverInfo: { name: 'Joan',         relation: 'Padre',  age: 79 }, serviceType: 'Externo',       reason: 'Visita a domicilio pendiente de confirmar',                      daysWithoutTouch: 6,  lastTouchDate: '2026-05-09', temperature: 'templado', urgency: 'Estandar',    hasNewMessage: true,  unreadMessagesCount: 1 },
        { id: 'L121749', familyName: 'Familia Ferreiro Bergino', city: 'Madrid',               caregiverInfo: { name: 'Francisco',    relation: 'Tio',    age: 81 }, serviceType: 'Interno',       reason: 'Followup tras enviar info de servicio',                          daysWithoutTouch: 2,  lastTouchDate: '2026-05-13', temperature: 'templado', urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122278', familyName: 'Familia Ruben Garcia',     city: 'Madrid',               caregiverInfo: { name: 'Manuel',       relation: 'Padre',  age: 83 }, serviceType: 'Por horas',     reason: 'Recordatorio: confirmar fecha de arranque',                      daysWithoutTouch: 5,  lastTouchDate: '2026-05-10', temperature: 'templado', urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L121547', familyName: 'Familia Sanchez Tartalo',  city: 'Madrid',               caregiverInfo: { name: 'Dolores',      relation: 'Madre',  age: 88 }, serviceType: 'Fin de semana', reason: 'Reintento de contacto programado',                               daysWithoutTouch: 10, lastTouchDate: '2026-05-05', temperature: 'frio',     urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122845', familyName: 'Familia Mestres Carrasco', city: 'Sabadell',             caregiverInfo: { name: 'Jordi',        relation: 'Padre',  age: 89 }, serviceType: 'Externo',       reason: 'Retomar al volver del viaje (20/05)',                            daysWithoutTouch: 3,  lastTouchDate: '2026-05-12', temperature: 'pausa',    urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122701', familyName: 'Familia Lopez Iniesta',    city: 'Madrid',               caregiverInfo: { name: 'Isabel',       relation: 'Madre',  age: 81 }, serviceType: 'Interno',       reason: 'Primer contacto pendiente',                                      daysWithoutTouch: 1,  lastTouchDate: '2026-05-14', temperature: 'pausa',    urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122055', familyName: 'Familia Recio del Campo',  city: 'Collado Villalba',     caregiverInfo: { name: 'Mercedes',     relation: 'Madre',  age: 85 }, serviceType: 'Externo',       reason: 'Llamada de reactivacion agendada',                               daysWithoutTouch: 9,  lastTouchDate: '2026-05-06', temperature: 'frio',     urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 }
    ];

    // Todos los leads del AF (cartera completa, 16). Vocabulario urgency del detalle. Incluye
    //   pausa e historico. WhatsApp nuevo repartido por temperaturas (caliente, pausa, frio).
    var MOCK_LEADS_RESPONSE = [
        { id: 'L122581', familyName: 'Familia Martinez Ruiz',    city: 'Madrid',               caregiverInfo: { name: 'Juan Antonio', relation: 'Padre',  age: 87 }, serviceType: 'Por horas',     reason: 'Pidio presupuesto ayer y respondio hoy con preguntas concretas', daysWithoutTouch: 1,  lastTouchDate: '2026-05-14', temperature: 'caliente', urgency: 'Muy urgente', hasNewMessage: true,  unreadMessagesCount: 2 },
        { id: 'L122613', familyName: 'Familia Vidal Pons',       city: 'Barcelona',            caregiverInfo: { name: 'Carmen',       relation: 'Madre',  age: 82 }, serviceType: 'Interno',       reason: 'Pidio pensarlo en familia, han pasado 4 dias',                   daysWithoutTouch: 4,  lastTouchDate: '2026-05-11', temperature: 'templado', urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122476', familyName: 'Familia Baena Sanz',       city: 'Madrid',               caregiverInfo: { name: 'Antonia',      relation: 'Suegra', age: 90 }, serviceType: 'Por horas',     reason: 'Llamada agendada para manana 11:00',                             daysWithoutTouch: 0,  lastTouchDate: '2026-05-15', temperature: 'caliente', urgency: 'Urgente',     hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L121656', familyName: 'Familia Parellada Canals', city: "Sant Sadurni d'Anoia", caregiverInfo: { name: 'Joan',         relation: 'Padre',  age: 79 }, serviceType: 'Externo',       reason: 'Familia comparando con otras dos opciones',                      daysWithoutTouch: 6,  lastTouchDate: '2026-05-09', temperature: 'templado', urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L121708', familyName: 'Familia Campos Rivera',    city: 'Alcala de Henares',    caregiverInfo: { name: 'Pilar',        relation: 'Madre',  age: 84 }, serviceType: 'Interno',       reason: 'Dijo que llamaria, hace 11 dias sin respuesta',                  daysWithoutTouch: 11, lastTouchDate: '2026-05-04', temperature: 'frio',     urgency: 'Urgente',     hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L121547', familyName: 'Familia Sanchez Tartalo',  city: 'Madrid',               caregiverInfo: { name: 'Dolores',      relation: 'Madre',  age: 88 }, serviceType: 'Fin de semana', reason: 'No responde desde la propuesta hace 10 dias',                    daysWithoutTouch: 10, lastTouchDate: '2026-05-05', temperature: 'frio',     urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L121749', familyName: 'Familia Ferreiro Bergino', city: 'Madrid',               caregiverInfo: { name: 'Francisco',    relation: 'Tio',    age: 81 }, serviceType: 'Interno',       reason: 'Esperando que organice visita al domicilio',                     daysWithoutTouch: 2,  lastTouchDate: '2026-05-13', temperature: 'templado', urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122131', familyName: 'Familia Roge Barcelo',     city: 'Barcelona',            caregiverInfo: { name: 'Albert',       relation: 'Marido', age: 76 }, serviceType: 'Interno',       reason: 'Urgencia operativa: necesita cuidadora antes del 30/05',         daysWithoutTouch: 2,  lastTouchDate: '2026-05-13', temperature: 'caliente', urgency: 'Muy urgente', hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122055', familyName: 'Familia Recio del Campo',  city: 'Collado Villalba',     caregiverInfo: { name: 'Mercedes',     relation: 'Madre',  age: 85 }, serviceType: 'Externo',       reason: 'No contesta WhatsApp ni llamadas hace 9 dias',                   daysWithoutTouch: 9,  lastTouchDate: '2026-05-06', temperature: 'frio',     urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L121843', familyName: 'Familia Avelino Redondo',  city: 'Madrid',               caregiverInfo: { name: 'Rosa',         relation: 'Mujer',  age: 78 }, serviceType: 'Por horas',     reason: 'Pidio no contactar hasta junio (viaje familiar)',                daysWithoutTouch: 0,  lastTouchDate: '2026-05-15', temperature: 'pausa',    urgency: 'Estandar',    hasNewMessage: true,  unreadMessagesCount: 1 },
        { id: 'L122278', familyName: 'Familia Ruben Garcia',     city: 'Madrid',               caregiverInfo: { name: 'Manuel',       relation: 'Padre',  age: 83 }, serviceType: 'Por horas',     reason: 'Esperando respuesta tras enviarle el presupuesto',               daysWithoutTouch: 5,  lastTouchDate: '2026-05-10', temperature: 'templado', urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L121399', familyName: 'Familia Ortiz Pica',       city: 'Madrid',               caregiverInfo: { name: 'Concepcion',   relation: 'Madre',  age: 86 }, serviceType: 'Interno',       reason: 'Urgente: alta hospitalaria manana, sin alguien en casa',         daysWithoutTouch: 0,  lastTouchDate: '2026-05-15', temperature: 'caliente', urgency: 'Muy urgente', hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122701', familyName: 'Familia Lopez Iniesta',    city: 'Madrid',               caregiverInfo: { name: 'Isabel',       relation: 'Madre',  age: 81 }, serviceType: 'Interno',       reason: 'Sin contactar todavia, lead recien asignado',                    daysWithoutTouch: 1,  lastTouchDate: '2026-05-14', temperature: 'pausa',    urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L122845', familyName: 'Familia Mestres Carrasco', city: 'Sabadell',             caregiverInfo: { name: 'Jordi',        relation: 'Padre',  age: 89 }, serviceType: 'Externo',       reason: 'Pausa hasta que vuelva del viaje el 20/05',                      daysWithoutTouch: 3,  lastTouchDate: '2026-05-12', temperature: 'pausa',    urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0 },
        { id: 'L120912', familyName: 'Familia Heredia Solis',    city: 'Madrid',               caregiverInfo: { name: 'Lucia',        relation: 'Madre',  age: 84 }, serviceType: 'Por horas',     reason: 'Sin respuesta hace 18 dias. Quedo fuera de ventana operativa.',  daysWithoutTouch: 18, lastTouchDate: '2026-04-27', temperature: 'frio',     urgency: 'Estandar',    hasNewMessage: true,  unreadMessagesCount: 1, historico: true },
        { id: 'L120478', familyName: 'Familia Bertran Casas',    city: 'Barcelona',            caregiverInfo: { name: 'Marc',         relation: 'Padre',  age: 92 }, serviceType: 'Externo',       reason: 'Sin respuesta hace 22 dias tras envio presupuesto.',             daysWithoutTouch: 22, lastTouchDate: '2026-04-23', temperature: 'frio',     urgency: 'Estandar',    hasNewMessage: false, unreadMessagesCount: 0, historico: true }
    ];

    // Tope visual del dashboard. v1.13: 5 -> 10 (mas altura disponible con cards + toolbar).
    var MAX_VISIBLE = 10;

    // ============================================================
    // MOCKS v1.6 (chat IA del pane central del detalle)
    // ============================================================
    // 3 respuestas mock fijas, una por chip. Los placeholders {contactName}, {relation},
    // {caredPersonName} se resuelven en el render contra el lead activo.
    var MOCK_AI_RESPONSES = {
        'material-marketing': {
            intro: 'Material util para este caso:',
            items: [
                { title: 'Guia: cuidados post-alta hospitalaria', desc: 'PDF · 8 paginas · util para familias con familiar recien operado.', action: 'Adjuntar al proximo mensaje' },
                { title: 'Testimonio: familia Madrid', desc: 'Video · 3 min · caso similar de cuidados a largo plazo.', action: 'Compartir link' },
                { title: 'Tarifas y opciones de servicio', desc: 'PDF · 2 paginas · para casos en evaluacion de presupuesto.', action: 'Adjuntar al proximo mensaje' }
            ]
        },
        'sugerir-mensaje': {
            intro: 'Te propongo dos opciones:',
            variants: [
                { label: 'Mas calida',  text: 'Hola {contactName}, como esta {relation} {caredPersonName}? Queria retomar lo que hablamos la semana pasada cuando tengas un momento. Sin prisa.' },
                { label: 'Mas directa', text: 'Hola {contactName}, sigo a la espera de tu confirmacion sobre el presupuesto que enviamos. Tienes alguna duda que pueda ayudarte a resolver?' }
            ]
        },
        'reactivar-sin-presionar': {
            intro: 'Para reactivar sin presionar, te sugiero:',
            approaches: [
                { title: 'Acercamiento humano, sin agenda', rationale: 'El lead lleva varios dias sin responder. Un mensaje sin pedirle nada concreto baja la friccion.', example: 'Hola {contactName}, pensaba en {relation} {caredPersonName} estos dias. Como van las cosas en casa? Sin presion, solo queria saber.' },
                { title: 'Compartir valor primero',         rationale: 'En lugar de pedir respuesta, ofrecer algo util. Crea reciprocidad sin obligacion.',          example: 'Hola {contactName}, te paso un articulo que escribio una colega sobre cuidados a domicilio. Por si os sirve. Cualquier cosa, aqui estoy.' }
            ]
        }
    };

    // ============================================================
    // v1.15: ASISTENTE IA CONFIGURABLE (drafts por AF) - mocks + servicio
    // ============================================================
    // Enums cerrados (asunción del plan §5; confirmar contra spec real cuando llegue).
    var DRAFT_LENGTHS = ['short', 'medium'];
    var TONE_STYLES = ['neutral', 'direct', 'empathic'];
    var LENGTH_LABELS = { short: 'Corto', medium: 'Medio' };
    var TONE_LABELS = { neutral: 'Neutral', direct: 'Directo', empathic: 'Empático' };
    var LENGTH_TOOLTIP = 'short = ~100-200 chars. medium = ~200-450 chars.';
    var TONE_TOOLTIP = 'neutral = balanceado. direct = al punto. empathic = empático y cálido.';
    // TODO[spec]: copy real de fallback cuando llegue el Anexo del backend.
    var DRAFT_FALLBACK_COPY = 'No pude generar un borrador automático para este caso. Redactá el mensaje manualmente con el contexto del lead.';

    // Espejo de ACTIVE_AFS_JSON del backend: email del AF logueado -> af_key.
    //   af_key se deriva de _currentUserEmail (sess.username). NO se hardcodea por lead.
    var MOCK_ACTIVE_AFS = {
        'patricia.vega@qida.es':    'patricia_vega',
        'alejandro.vivas@qida.es':  'alejandro_vivas',
        'eva.martin@qida.es':       'eva_martin'
    };

    // Config de variantes por AF (mock de GET/PUT /draft-variants). saveDraftVariants muta este
    //   mapa. Si un af_key no está, getDraftVariantsSync devuelve los defaults (is_default:true).
    var MOCK_DRAFT_VARIANTS_DEFAULT = [
        { name: 'corto_directo', length: 'short',  tone_style: 'direct' },
        { name: 'calido_medio',  length: 'medium', tone_style: 'empathic' }
    ];
    var MOCK_DRAFT_VARIANTS_BY_AF = {
        // Ejemplo de AF con config custom (3 variantes).
        'patricia_vega': [
            { name: 'saludo_breve',        length: 'short',  tone_style: 'neutral' },
            { name: 'seguimiento_calido',  length: 'medium', tone_style: 'empathic' },
            { name: 'cierre_directo',      length: 'short',  tone_style: 'direct' }
        ]
    };

    // Plantillas mock de texto por tono × largo (placeholders {contactName}/{relation}/
    //   {caredPersonName} se resuelven contra el lead). Mientras no haya LLM real.
    var TONE_TEMPLATES = {
        neutral: {
            short:  'Hola {contactName}, queria retomar el tema de {relation} {caredPersonName}. Cuando puedas, me decis y seguimos.',
            medium: 'Hola {contactName}, espero que esten bien. Queria retomar lo que hablamos sobre el cuidado de {relation} {caredPersonName} y ver como seguimos. Cuando tengas un momento me escribis y coordinamos los proximos pasos.'
        },
        direct: {
            short:  'Hola {contactName}, sigo a la espera de tu confirmacion. Tienes alguna duda que pueda resolver?',
            medium: 'Hola {contactName}, te escribo para cerrar el tema del cuidado de {relation} {caredPersonName}. Necesito tu confirmacion para avanzar. Si quedo alguna duda con el presupuesto o el servicio, decime y lo resolvemos hoy mismo.'
        },
        empathic: {
            short:  'Hola {contactName}, pensaba en {relation} {caredPersonName} estos dias. Como estan en casa? Sin prisa.',
            medium: 'Hola {contactName}, espero que {relation} {caredPersonName} este lo mejor posible. Se que son momentos delicados, asi que sin ninguna prisa: cuando esten listos para retomar, aca estoy para ayudarles con lo que necesiten.'
        }
    };

    // Overrides de escenario para QA de /recommendation (edge cases del plan).
    var MOCK_RECOMMENDATION_OVERRIDES = {
        'L120478': { should_followup_today: true,  fallback: false, drafts: [] },   // drafts vacíos
        'L120912': { should_followup_today: true,  fallback: true,  drafts: [] }    // fallback
        // (lead en 'pausa' -> should_followup_today:false, resuelto dinámicamente abajo)
    };

    // v1.10: TEMP_CONFIG, URGENCY_ORDER, TEMP_ORDER, STALE_THRESHOLD eliminados.
    //   Solo los consumian renderTempBadge / renderUrg / renderDays / sortLeads /
    //   buildUnifiedFeed (todos eliminados con el dashboard nuevo).

    // ============================================================
    // MOCK DATA - PANEL DE LIDERES (v1.12)
    // ============================================================
    // v1.12.1: schema en espanol (nombre/localidad/cartera/calientes/templados/frios/bajoSeg/
    //   intPorLead/conversion/estado). 19 AFs con nombres reales del proyecto. Marina Costa
    //   tiene conversion 1.4% como outlier real (es coach, no AF de campo).
    //   Las cifras de KPIs y donut se DERIVAN del array filtrado de AFs en runtime
    //   (buildLeaderKpis / buildLeaderTemperature). La grafica de tendencia NO se filtra
    //   (es metrica global del equipo - decision #2 del plan v1.12.1).
    var MOCK_LEADER_AFS = [
        { nombre: 'Ana Pinilla',           localidad: 'MAD', cartera: 82, calientes: 18, templados: 28, frios: 36, bajoSeg: 24, intPorLead: 3.1, conversion: 10.4, estado: 'OK' },
        { nombre: 'María Aridane Asiaín',  localidad: 'MAD', cartera: 74, calientes: 16, templados: 25, frios: 33, bajoSeg: 27, intPorLead: 2.9, conversion: 9.7,  estado: 'OK' },
        { nombre: 'Graciela Mateos',       localidad: 'MAD', cartera: 71, calientes: 12, templados: 25, frios: 34, bajoSeg: 35, intPorLead: 2.4, conversion: 8.9,  estado: 'OK' },
        { nombre: 'Mariluz Guerrero',      localidad: 'MAD', cartera: 38, calientes: 10, templados: 14, frios: 14, bajoSeg: 18, intPorLead: 3.2, conversion: 9.5,  estado: 'OK' },
        { nombre: 'Inma Juárez López',     localidad: 'CAT', cartera: 65, calientes: 13, templados: 22, frios: 30, bajoSeg: 32, intPorLead: 2.5, conversion: 8.4,  estado: 'OK' },
        { nombre: 'Ana Bezares',           localidad: 'BIL', cartera: 58, calientes: 11, templados: 19, frios: 28, bajoSeg: 34, intPorLead: 2.3, conversion: 8.1,  estado: 'Atención' },
        { nombre: 'María Díaz',            localidad: 'MAD', cartera: 68, calientes: 11, templados: 24, frios: 33, bajoSeg: 38, intPorLead: 2.1, conversion: 8.0,  estado: 'Atención' },
        { nombre: 'Paloma Gálvez',         localidad: 'CAT', cartera: 49, calientes: 8,  templados: 15, frios: 26, bajoSeg: 48, intPorLead: 1.6, conversion: 6.8,  estado: 'Atención' },
        { nombre: 'Alba Álvarez Rubio',    localidad: 'CAT', cartera: 62, calientes: 18, templados: 22, frios: 22, bajoSeg: 18, intPorLead: 3.2, conversion: 11.2, estado: 'OK' },
        { nombre: 'Natalia Narro',         localidad: 'MAD', cartera: 45, calientes: 14, templados: 16, frios: 15, bajoSeg: 15, intPorLead: 3.4, conversion: 12.3, estado: 'OK' },
        { nombre: 'Asun Herrera Teixidó',  localidad: 'CAT', cartera: 53, calientes: 9,  templados: 18, frios: 26, bajoSeg: 41, intPorLead: 1.9, conversion: 7.2,  estado: 'Atención' },
        { nombre: 'Pilar Comyn',           localidad: 'MAD', cartera: 47, calientes: 7,  templados: 16, frios: 24, bajoSeg: 45, intPorLead: 1.7, conversion: 6.5,  estado: 'Atención' },
        { nombre: 'Natalia Godoy',         localidad: 'MAD', cartera: 78, calientes: 14, templados: 24, frios: 40, bajoSeg: 42, intPorLead: 1.8, conversion: 7.4,  estado: 'Atención' },
        { nombre: 'Sandra Casol',          localidad: 'CAT', cartera: 89, calientes: 9,  templados: 20, frios: 60, bajoSeg: 58, intPorLead: 1.4, conversion: 5.2,  estado: 'Sobrecarga' },
        { nombre: 'Marina Costa',          localidad: 'CAT', cartera: 42, calientes: 12, templados: 14, frios: 16, bajoSeg: 19, intPorLead: 2.8, conversion: 1.4,  estado: 'OK' },
        { nombre: 'Rubén Fernández',       localidad: 'MAD', cartera: 56, calientes: 12, templados: 19, frios: 25, bajoSeg: 30, intPorLead: 2.6, conversion: 8.7,  estado: 'OK' },
        { nombre: 'Sandra Muro',           localidad: 'VAL', cartera: 51, calientes: 10, templados: 18, frios: 23, bajoSeg: 35, intPorLead: 2.2, conversion: 7.6,  estado: 'Atención' },
        { nombre: 'Maylan Almeida',        localidad: 'MAD', cartera: 44, calientes: 9,  templados: 15, frios: 20, bajoSeg: 36, intPorLead: 2.0, conversion: 7.0,  estado: 'Atención' },
        { nombre: 'Andrea Mahia',          localidad: 'COR', cartera: 39, calientes: 7,  templados: 13, frios: 19, bajoSeg: 38, intPorLead: 1.9, conversion: 6.9,  estado: 'Atención' }
    ];

    // v1.12.1: dos series mensuales fijas (6 meses) para el area chart, toggleable con pills.
    //   NO se filtran por localidad (decision #2): son metricas globales del equipo. El target
    //   line se anota como linea horizontal punteada al valor target de cada metrica.
    var MOCK_LEADER_TREND = {
        categories: ['Dic 25', 'Ene 26', 'Feb 26', 'Mar 26', 'Abr 26', 'May 26'],
        conversion: {
            data: [6.8, 7.1, 7.4, 7.8, 8.0, 8.2],
            target: 8,
            title: 'Conversión mensual del equipo',
            yMax: 12
        },
        coverage: {
            data: [37, 42, 48, 54, 61, 66],
            target: 68,
            title: '% cartera con ≥3 seguimientos',
            yMax: 100
        }
    };

    // ============================================================
    // STATE
    // ============================================================
    var state = {
        view: 'dashboard',              // 'dashboard' | 'detail'
        currentLeadId: null,

        // v1.10: dashboard "lista de leads enfriandose".
        //   completedTodayIds: Set<leadId>. Filas que la AF marco como hechas en esta sesion.
        //   Persiste durante toda la sesion del page load (NO se vacia en closeModal).
        //   undoToast / undoTimeoutId: estado del toast inferior "Marcado como hecho · Deshacer".
        //   Solo el ultimo "Marcar hecho" tiene undo activo (los anteriores quedan permanentes en sesion).
        completedTodayIds: new Set(),
        undoToast: null,                // { leadId, expiresAt } | null
        undoTimeoutId: null,            // ID del setTimeout activo (o null)

        // v1.13: dashboard AF reconstruido (3 vistas + filtros + señales WhatsApp/urgencia).
        //   dashView: 'suggestions' | 'activities' | 'leads' (cada una = un endpoint).
        //   dashRows: filas de la vista activa (cache de la "respuesta"). null = sin cargar.
        //   dashLoading: true mientras vuelve el fetch de cambio de vista (atenua la tabla previa).
        //   dashSegment: filtro de segmento client-side (compartido entre cards y chips de Filtros).
        //   dashFiltersExpanded: bool del panel de chips de segmento.
        //   dashOnlyNew: filtro del pill WhatsApp (hasNewMessage), se combina (AND) con dashSegment.
        //   Se resetean en closeModal.
        dashView: 'suggestions',
        dashRows: null,
        dashLoading: false,
        dashSegment: null,              // null | 'caliente' | 'templado' | 'frio' | 'pausa' | 'urgente' | 'historico'
        dashFiltersExpanded: false,
        dashOnlyNew: false,

        // Detail state
        // v1.6: state.activePanel y state.editingTemp eliminados (no hay tabs ni temp editable
        // en el detalle). Se agregan draftMessage (textarea WhatsApp), attachmentsExpanded
        // (colapsable de adjuntos en el pane central) y aiChatHistory (chat IA por leadId,
        // persiste durante toda la sesion del page load).
        editingIaSummary: false,
        addingNote: false,
        draftMessage: '',               // texto vivo del textarea de WhatsApp del pane izquierdo
        attachmentsExpanded: false,     // colapsable de adjuntos en el pane central
        aiChatHistory: {},              // { leadId: [{ from: 'user'|'ai', payload }] } - PERSISTENTE en sesion
        aiChatDraft: '',                // texto vivo del input del chat IA del pane central

        // v1.11: cache del detalle por leadId. En modo Odoo lo popula LeadDetailService.fetchAll;
        //   en modo mock lo popula mockHydrate (sync, sin loading visible). Persiste durante toda
        //   la sesion del page load (igual politica que aiChatHistory - NO se vacia en closeModal).
        //   Shape: { [leadId]: { lead, caredPerson, notes, activities, attachments, followers,
        //                        _loadedAt, _loading, _error, _errors[5] } }
        //   _errors indices: [0]=caredPerson, [1]=notes, [2]=activities, [3]=attachments, [4]=followers.
        leadDetailCache: {},
        __waNeedsScroll: false,         // flag para auto-scroll al fondo del pane WhatsApp post-rerender
        __aiNeedsScroll: false,         // v1.9.1: flag para auto-scroll al fondo del pane Chat IA post-rerender

        // v1.15: pantalla "Armá tu asistente" (state.view==='agentBuilder') + drafts dinámicos.
        //   draftVariants: copia de trabajo en edición. draftVariantsSaved: último snapshot guardado
        //   (dirty-check + descartar). draftVariantsLoaded: lazy. agentBuilderConfirmDiscard: modal.
        //   recommendationCache: respuesta de /recommendation por lead (evita re-pedir por render).
        //   Persisten en sesión (igual política que aiChatHistory); se resetea solo lo transitorio.
        draftVariants: [],
        draftVariantsSaved: [],
        draftVariantsLoaded: false,
        agentBuilderConfirmDiscard: false,
        recommendationCache: {},

        // v1.8: toggle de orden de columnas del detalle (info vs IA en centro/derecha).
        //   false (default) -> WA | Info | IA   (orden actual de v1.7).
        //   true            -> WA | IA   | Info (swap entre centro y derecha).
        // Persiste en sesion del modal (no se resetea al navegar entre leads). Se resetea
        // a false en closeModal.
        detailLayoutSwapped: true,

        // v1.17: dropdown de temperatura del header del detalle abierto/cerrado (transitorio).
        tempEditorOpen: false,

        // Schedule modal (reutilizado desde Detail Y desde "Marcar hecho" de sugerencias/actividades)
        showScheduleModal: false,
        scheduleDate: null,             // 'YYYY-MM-DD'
        scheduleNote: '',
        scheduleMarkPause: false,
        scheduleOrigin: 'detail',       // 'detail' | 'suggestion' | 'activity' (afecta el callback de confirm)
        scheduleLeadIdOverride: null,   // leadId target cuando origin !== 'detail'

        // Toast
        toast: null,                    // { msg, ts }

        // v1.12: state del panel de lideres. Persiste durante la sesion del page load.
        //   v1.12.1: filtros/sort/search se RESETEAN al abrir el modal (openLeadersDashboard).
        //   trendMetric SI persiste entre aperturas (preserva la metrica elegida).
        //   __charts guarda las instancias ApexCharts (donut + area) para destroy/recrear
        //   en cada rerender. NO serializable - no usar en JSON.stringify.
        leaderDash: {
            locFilter: 'all',           // 'all' | 'MAD' | 'CAT' | 'BIL' | 'VAL' | 'COR'
            search: '',
            sortCol: null,              // 'nombre' | 'localidad' | 'cartera' | ... | null
            sortDir: 'asc',             // 'asc' | 'desc'
            trendMetric: 'conversion',  // v1.12.1: 'conversion' | 'coverage'. PERSISTE.
            __charts: null              // { donut: ApexCharts, area: ApexCharts } | null
        }
    };

    // Edits "vivos" hechos por la AF (sin persistencia).
    var EDITS = {
        iaSummaries: {},                // { leadId: { text, editedBy, generatedAt } }
        temperatures: {},               // { leadId: { temperature, source } }
        notes: {},                      // { leadId: [ { author, date, text } ] } (additions)
        scheduledActivities: [],        // [ { leadId, deadline, note, markPause, ts } ]
        suggestionsDone: {},            // { sugId: true } -> ocultar de la lista
        suggestionsPostponed: {},       // { sugId: { until: ISO } }
        activitiesDone: {}              // { actId: true } -> ocultar de la seccion 3
    };

    // ============================================================
    // HELPERS
    // ============================================================
    function esc(s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function getLead(id) {
        for (var i = 0; i < MOCK_LEADS.length; i++) if (MOCK_LEADS[i].id === id) return MOCK_LEADS[i];
        return null;
    }

    function getLeadTemperature(lead) {
        var ed = EDITS.temperatures[lead.id];
        return ed ? ed.temperature : lead.temperature;
    }
    function getLeadTemperatureSource(lead) {
        var ed = EDITS.temperatures[lead.id];
        return ed ? ed.source : lead.temperatureSource;
    }
    // v1.10: getLeadTemperatureReason eliminado (sin consumidores tras la limpieza del dashboard).

    function getIaSummary(leadId) {
        if (EDITS.iaSummaries[leadId]) return EDITS.iaSummaries[leadId];
        return MOCK_IA_SUMMARIES[leadId] || null;
    }

    // v1.16: análisis IA (preparación de UI, sin backend ni edición). Solo lectura del mock.
    function getIaAnalysis(leadId) {
        return MOCK_IA_ANALYSIS[leadId] || null;
    }

    function getNotes(leadId) {
        var base = (MOCK_NOTES[leadId] || []).slice();
        var added = EDITS.notes[leadId] || [];
        // Las nuevas notas van arriba (mas recientes primero)
        return added.concat(base);
    }

    // ----- Helpers de cartera (solo lo que sigue vivo en v1.10) -----
    // countLeadsUrgent: contador para el badge del bottom-right (numero rojo).
    // Se mantiene como simple count de lead.urgent sobre cartera activa.
    function countLeadsUrgent() {
        var n = 0;
        for (var i = 0; i < MOCK_LEADS.length; i++) {
            var l = MOCK_LEADS[i];
            if (!l.historico && l.urgent) n++;
        }
        return n;
    }

    // ----- Fechas helpers para schedule modal -----
    function formatDateEs(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr + 'T00:00:00');
        if (isNaN(d.getTime())) return dateStr;
        var months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        return d.getDate() + ' de ' + months[d.getMonth()];
    }
    function todayISO() {
        var d = new Date();
        return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
    }
    function addDaysISO(days) {
        var d = new Date();
        d.setDate(d.getDate() + days);
        return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
    }
    function pad2(n) { return n < 10 ? '0' + n : '' + n; }
    function daysBetween(iso) {
        if (!iso) return 0;
        var a = new Date(iso + 'T00:00:00');
        var b = new Date(); b.setHours(0,0,0,0);
        return Math.round((a - b) / (24 * 3600 * 1000));
    }

    // Activity state derivado de la fecha actual
    function activityStateFromDeadline(iso) {
        if (!iso) return 'planned';
        var diff = daysBetween(iso);
        if (diff < 0) return 'overdue';
        if (diff === 0) return 'today';
        return 'planned';
    }

    // ============================================================
    // SOFT HYBRID SERVICE LAYER
    // ============================================================
    // Patron service-like sobre los mocks. Decision arquitectonica (15-may):
    //   - Single-file con bloques marcados. Cero cambio al workflow de deploy.
    //   - Cada servicio expone dos variantes:
    //       getSync(): version sincrona usada por las render functions (devuelve mocks ya cargados).
    //       get():    version asincrona con simulateLatency para flujos nuevos (Asistente flotante).
    //   - Migrar a multi-file real es decision post-Rollout.
    //
    // TODOs explicitos: cuando Pablo Rodrigo (PM Odoo) y Adriana Barro (Tech) cierren los
    // endpoints reales, reemplazar los cuerpos por fetch() preservando la API publica.
    //
    function simulateLatency(min, max) {
        var ms = Math.floor(min + Math.random() * (max - min));
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    var LeadService = {
        listSync: function () { return MOCK_LEADS.slice(); },
        list: function () {
            // TODO[odoo]: GET /api/me/leads?window=15d
            return simulateLatency(80, 200).then(function () { return MOCK_LEADS.slice(); });
        },
        getSync: function (id) { return getLead(id); },
        get: function (id) {
            // TODO[odoo]: GET /api/leads/:id
            return simulateLatency(60, 140).then(function () { return getLead(id); });
        },
        updateTemperature: function (id, temperature) {
            // TODO[odoo]: PATCH /api/leads/:id { temperature, source: 'AF' }
            EDITS.temperatures[id] = { temperature: temperature, source: 'AF' };
            return simulateLatency(60, 140).then(function () { return true; });
        },
        close: function (id, reason) {
            // TODO[odoo]: POST /api/leads/:id/close { reason }
            return simulateLatency(80, 180).then(function () { return { ok: true, reason: reason }; });
        }
        // v1.13: getCoolingLeadsSync/getCoolingLeads ELIMINADOS. El dashboard ahora consume
        //   DashboardService (3 vistas = 3 endpoints), ver abajo.
    };

    // v1.13: capa de servicio del dashboard AF. 3 vistas = 3 endpoints separados, mismo shape.
    //   fetchViewSync(view) -> lectura sincrona del mock (primer paint y refresh sin flash).
    //   fetchView(view)     -> version async (simulateLatency) que usan el cambio de vista y el
    //                          Refrescar. TODO[odoo]: reemplazar el cuerpo por fetch() real a
    //                          GET /api/me/leads/{view} preservando esta API.
    var DASH_MOCKS = {
        suggestions: MOCK_SUGGESTIONS_RESPONSE,
        activities:  MOCK_ACTIVITIES_RESPONSE,
        leads:       MOCK_LEADS_RESPONSE
    };
    var DashboardService = {
        fetchViewSync: function (view) {
            return (DASH_MOCKS[view] || MOCK_SUGGESTIONS_RESPONSE).slice();
        },
        fetchView: function (view) {
            var self = this;
            return simulateLatency(180, 360).then(function () { return self.fetchViewSync(view); });
        }
    };

    var ActivityService = {
        listByLeadSync: function (leadId) {
            var base = (MOCK_PLANNED_ACTIVITIES[leadId] || []).slice();
            for (var i = 0; i < EDITS.scheduledActivities.length; i++) {
                var sa = EDITS.scheduledActivities[i];
                if (sa.leadId === leadId) {
                    base.push({
                        id: 'local-' + i,
                        type: 'Por hacer',
                        summary: sa.note ? (sa.note.split('\n')[0].slice(0, 60) + (sa.note.length > 60 ? '...' : '')) : 'Proximo seguimiento',
                        deadline: sa.deadline,
                        state: activityStateFromDeadline(sa.deadline),
                        assignee: 'Patricia V.',
                        done: false
                    });
                }
            }
            return base;
        },
        schedule: function (leadId, deadline, note, markPause) {
            // TODO[odoo]: POST /api/activities { lead_id, date_deadline, note, type='todo' }
            EDITS.scheduledActivities.push({
                leadId: leadId, deadline: deadline, note: note,
                markPause: markPause, ts: Date.now()
            });
            if (markPause) EDITS.temperatures[leadId] = { temperature: 'pausa', source: 'AF' };
            return simulateLatency(70, 160).then(function () { return true; });
        },
        markDone: function (actId) {
            // TODO[odoo]: PATCH /api/activities/:id { state: 'done' }
            EDITS.activitiesDone[actId] = true;
            return simulateLatency(50, 120).then(function () { return true; });
        }
        // v1.10: getUnifiedFeedSync, listTodayAndOverdueSync, SuggestionsService entera y
        // CoverageService entera ELIMINADAS. El dashboard ya no consume sugerencias,
        // actividades globales ni cobertura.
    };

    // ============================================================
    // ODOO INTEGRATION (Fase A - v1.11)
    // ============================================================
    // Helpers + constantes + mappers + service layer para hidratar el detalle del lead
    // desde Odoo via JSON-RPC same-origin. Solo lectura. Endpoints validos:
    //   POST /web/dataset/call_kw/{model}/{method}
    //   POST /web/session/get_session_info
    // Endpoints custom (/agency/*) estan FUERA de servicio - no se llaman desde aqui.

    // ---- Helpers para tuples Odoo: campos relacionales devuelven [id, "Name"] o false ----
    function tName(f) { return (f && typeof f === 'object' && f.length === 2) ? f[1] : null; }
    function tId(f)   { return (f && typeof f === 'object' && f.length === 2) ? f[0] : null; }

    // ---- Llamada generica JSON-RPC a Odoo via /web/dataset/call_kw ----
    // Merge de _baseContext (session) + kwargs.context (caller-specific). Maneja 401/403,
    // respuestas no-JSON (login screen redirect = sesion expirada), y data.error de Odoo.
    function odooCall(model, method, args, kwargs) {
        args = args || [];
        kwargs = kwargs || {};
        var url = '/web/dataset/call_kw/' + model + '/' + method;
        var mergedContext = {};
        var k;
        for (k in _baseContext) {
            if (Object.prototype.hasOwnProperty.call(_baseContext, k)) {
                mergedContext[k] = _baseContext[k];
            }
        }
        if (kwargs.context) {
            for (k in kwargs.context) {
                if (Object.prototype.hasOwnProperty.call(kwargs.context, k)) {
                    mergedContext[k] = kwargs.context[k];
                }
            }
        }
        var finalKwargs = {};
        for (k in kwargs) {
            if (Object.prototype.hasOwnProperty.call(kwargs, k)) {
                finalKwargs[k] = kwargs[k];
            }
        }
        finalKwargs.context = mergedContext;

        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                params: { model: model, method: method, args: args, kwargs: finalKwargs }
            })
        }).then(function (res) {
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new Error('Odoo session expired (HTTP ' + res.status + ')');
                }
                throw new Error('Odoo ' + model + '/' + method + ': HTTP ' + res.status);
            }
            var ct = res.headers.get('content-type') || '';
            if (ct.indexOf('application/json') === -1) {
                throw new Error('Odoo ' + model + '/' + method + ': respuesta no-JSON (sesion expirada)');
            }
            return res.json();
        }).then(function (data) {
            if (data && data.error) {
                var msg = (data.error.data && data.error.data.message) || data.error.message || 'Unknown Odoo error';
                throw new Error('Odoo ' + model + '/' + method + ': ' + msg);
            }
            return data.result;
        });
    }

    // ---- Hidratar _baseContext desde /web/session/get_session_info ----
    function odooSession() {
        return fetch('/web/session/get_session_info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} })
        }).then(function (res) {
            if (!res.ok) throw new Error('Odoo session_info HTTP ' + res.status);
            return res.json();
        }).then(function (data) { return data && data.result; });
    }

    // ---- Sanitizacion de HTML pre-renderizado de Odoo (mail.message.body) ----
    // Si DOMPurify esta cargado (via @require en tempermonkey.js o desde GTM/sitio Odoo
    // mas adelante), usar su sanitizer con allowlist conservadora. Si no, fallback
    // defensivo: parse en template detached, eliminar scripts/style/iframe/etc + atributos
    // peligrosos (on*, javascript:href/src).
    function sanitizeOdooHtml(rawHtml) {
        if (!rawHtml) return '';
        if (typeof window.DOMPurify !== 'undefined' && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
            return window.DOMPurify.sanitize(rawHtml, {
                ALLOWED_TAGS: ['p','br','b','strong','i','em','u','a','ul','ol','li','span','div'],
                ALLOWED_ATTR: ['href','target','rel'],
                ALLOW_DATA_ATTR: false
            });
        }
        // Fallback defensivo.
        try {
            var tpl = document.createElement('template');
            tpl.innerHTML = rawHtml;
            var bad = tpl.content.querySelectorAll('script, style, iframe, object, embed, link, meta');
            var i;
            for (i = 0; i < bad.length; i++) {
                if (bad[i].parentNode) bad[i].parentNode.removeChild(bad[i]);
            }
            var all = tpl.content.querySelectorAll('*');
            for (i = 0; i < all.length; i++) {
                var attrs = all[i].attributes;
                for (var j = attrs.length - 1; j >= 0; j--) {
                    var n = attrs[j].name.toLowerCase();
                    var v = (attrs[j].value || '').toLowerCase();
                    if (n.indexOf('on') === 0) {
                        all[i].removeAttribute(attrs[j].name);
                        continue;
                    }
                    if ((n === 'href' || n === 'src') && v.indexOf('javascript:') === 0) {
                        all[i].removeAttribute(attrs[j].name);
                    }
                }
            }
            return tpl.innerHTML;
        } catch (e) {
            // Worst case: si el parse falla, devolver texto plano escapado para no inyectar HTML.
            return esc(rawHtml);
        }
    }

    // ---- Listas explicitas de fields (NUNCA usar fields:[] que descarga todo) ----
    // NOTA sobre 'chronich_illness': typo del modelo Odoo (sic). NO corregir.
    var LEAD_FIELDS = ['id','name','partner_id','user_id','team_id','company_id','email_from','phone','mobile','stage_id','active','probability','type','priority','tag_ids','create_date','write_date','date_deadline','description','message_follower_ids','cared_person_ids','family_unit_id','urgency','urgency_helper','urgent_service','vip_service','original_service_id','service_duration','service_goal','principal_activity_ids','recurring_plan','planned_start_date','default_whatsapp_template_id'];
    var CARED_FIELDS = ['id','name','main_need','reduced_mobility','cognitive_decline','behavioral_disorder','chronich_illness','requires_trained_caregivers','support_type','has_support_material','weight','complex_treatment_ids'];
    var NOTES_FIELDS = ['id','author_id','date','body','message_type','subject'];
    var ACTIVITY_FIELDS = ['id','activity_type_id','summary','note','date_deadline','state','user_id'];
    var ATTACHMENT_FIELDS = ['id','name','mimetype','file_size','create_date','create_uid'];
    var FOLLOWER_FIELDS = ['id','partner_id','subtype_ids'];

    // ---- Mappers Odoo -> shape interno (preserva keys que ya consumen los renderers) ----
    function mapLead(o) {
        return {
            id: o.id,
            odooId: o.id,
            name: o.name || tName(o.partner_id) || '',
            contact: tName(o.partner_id) || o.name || '',
            location: '',  // crm.lead no tiene campo directo "ciudad" - ver DEFAULTS v1.11 #3
            phone: o.mobile || o.phone || '',
            email: o.email_from || '',
            stage: tName(o.stage_id) || '',
            serviceType: tName(o.original_service_id) || '',
            urgency: o.urgency || '',
            urgent: !!o.urgent_service,
            responsableAf: tName(o.user_id) || '',
            plannedStartDate: o.planned_start_date || null,
            createdAt: o.create_date || null,
            followersIds: o.message_follower_ids || [],
            caredPersonIds: o.cared_person_ids || [],
            // Campos que NO existen en Odoo (los completa mapCared o futuras fases):
            relation: null,
            age: null,
            caredPersonName: null,
            // Preservados para compat con renders existentes:
            daysWithoutTouch: 0,  // Fase D lo provee desde cooling
            lastInteraction: '',
            interactionCount: 0,
            historico: false,
            prescriptor: ''
        };
    }

    function mapCared(o) {
        if (!o) return null;
        return {
            name: o.name || '',
            relationship: null,        // no existe en Odoo (Fase C)
            age: null,                 // no existe en Odoo
            relation: null,            // idem
            mainCondition: o.main_need || '',
            livesAlone: null,          // no hay flag directo
            reducedMobility: !!o.reduced_mobility,
            cognitiveDecline: !!o.cognitive_decline,
            behavioralDisorder: !!o.behavioral_disorder,
            chronicIllness: !!o.chronich_illness,  // typo Odoo respetado (sic)
            requiresTrainedCaregivers: !!o.requires_trained_caregivers,
            supportType: o.support_type || '',
            hasSupportMaterial: !!o.has_support_material,
            weight: o.weight,
            complexTreatmentIds: o.complex_treatment_ids || []
        };
    }

    function mapNote(o) {
        return {
            id: o.id,
            author: tName(o.author_id) || 'Sin autor',
            date: o.date || '',
            text: sanitizeOdooHtml(o.body || ''),
            isHtml: true,  // flag para que renderInternalNotes use innerHTML controlado
            messageType: o.message_type,
            subject: o.subject || ''
        };
    }

    function mapActivity(o) {
        return {
            id: o.id,
            type: tName(o.activity_type_id) || '',
            summary: o.summary || '',
            note: sanitizeOdooHtml(o.note || ''),
            deadline: o.date_deadline || null,
            state: o.state || 'planned',
            responsable: tName(o.user_id) || '',
            assignee: tName(o.user_id) || '',
            done: false
        };
    }

    function mapAttachment(o) {
        return {
            id: o.id,
            name: o.name || '',
            mimetype: o.mimetype || '',
            fileSize: o.file_size || 0,
            createdAt: o.create_date || '',
            date: o.create_date || '',
            author: tName(o.create_uid) || '',
            downloadUrl: '/web/content/' + o.id + '?download=true',
            isMain: false
        };
    }

    function mapFollower(o) {
        return {
            id: o.id,
            name: tName(o.partner_id) || '',
            partnerId: tId(o.partner_id),
            role: '',
            email: ''
        };
    }

    // ---- Modo mock: hidrata el cache desde los MOCKS existentes con el MISMO shape ----
    // que en modo Odoo, para que los renderers funcionen identicos en ambos modos.
    function mockHydrate(leadId) {
        var lead = getLead(leadId);
        if (!lead) {
            return {
                lead: null,
                caredPerson: null,
                notes: null,
                activities: null,
                attachments: null,
                followers: null,
                _loadedAt: Date.now(),
                _loading: false,
                _error: 'Lead not found in mock',
                _errors: [null, null, null, null, null]
            };
        }
        var notesRaw = (MOCK_NOTES[leadId] || []);
        var notes = [];
        for (var i = 0; i < notesRaw.length; i++) {
            var n = notesRaw[i];
            notes.push({ author: n.author, date: n.date, text: n.text, isHtml: false });
        }
        return {
            lead: lead,  // mocks ya tienen el shape interno
            caredPerson: MOCK_CARE_CONTEXT[leadId] || null,
            notes: notes,
            activities: (MOCK_PLANNED_ACTIVITIES[leadId] || []).slice(),
            attachments: (MOCK_ATTACHMENTS[leadId] || []).slice(),
            followers: (MOCK_FOLLOWERS[leadId] || DEFAULT_FOLLOWERS).slice(),
            _loadedAt: Date.now(),
            _loading: false,
            _error: null,
            _errors: [null, null, null, null, null]
        };
    }

    // ---- LeadDetailService: orquesta los 6 fetchs (1 lead + 5 secundarios) ----
    // Indices del array _errors (orden de Promise.allSettled):
    //   [0]=caredPerson, [1]=notes, [2]=activities, [3]=attachments, [4]=followers.
    var LeadDetailService = {
        fetchAll: function (leadId) {
            // Modo mock: hidratar sync desde MOCK_* y devolver Promise.resolve.
            if (!IS_ODOO_MODE) {
                state.leadDetailCache[leadId] = mockHydrate(leadId);
                return Promise.resolve(state.leadDetailCache[leadId]);
            }

            // Marcar loading inmediatamente para que los skeletons aparezcan.
            state.leadDetailCache[leadId] = {
                lead: null,
                caredPerson: null,
                notes: null,
                activities: null,
                attachments: null,
                followers: null,
                _loading: true,
                _loadedAt: null,
                _error: null,
                _errors: [null, null, null, null, null]
            };

            // El cambio a loading no dispara rerender automatico - el handler ya hizo
            // setState con view=detail y eso ya renderizo. Forzamos un rerender extra
            // para mostrar el skeleton mientras corren los fetchs.
            if (state.currentLeadId === leadId) {
                rerenderContent();
            }

            var p1 = odooCall('crm.lead', 'read', [[leadId]], { fields: LEAD_FIELDS });
            return p1.then(function (leadArr) {
                if (!leadArr || !leadArr.length) {
                    throw new Error('Lead not found');
                }
                var rawLead = leadArr[0];

                var jobs = [];
                // [0] caredPerson
                jobs.push(rawLead.cared_person_ids && rawLead.cared_person_ids.length
                    ? odooCall('crm.lead.cared.person', 'read', [rawLead.cared_person_ids], { fields: CARED_FIELDS })
                    : Promise.resolve([]));
                // [1] notes (mail.message con subtype interno)
                jobs.push(odooCall('mail.message', 'search_read', [], {
                    domain: [['model','=','crm.lead'], ['res_id','=',leadId], ['subtype_id.internal','=',true]],
                    fields: NOTES_FIELDS,
                    order: 'date desc',
                    limit: 50
                }));
                // [2] activities (mail.activity)
                jobs.push(odooCall('mail.activity', 'search_read', [], {
                    domain: [['res_model','=','crm.lead'], ['res_id','=',leadId]],
                    fields: ACTIVITY_FIELDS,
                    order: 'date_deadline asc',
                    limit: 50
                }));
                // [3] attachments
                jobs.push(odooCall('ir.attachment', 'search_read', [], {
                    domain: [['res_model','=','crm.lead'], ['res_id','=',leadId]],
                    fields: ATTACHMENT_FIELDS,
                    order: 'create_date desc'
                }));
                // [4] followers
                jobs.push(rawLead.message_follower_ids && rawLead.message_follower_ids.length
                    ? odooCall('mail.followers', 'read', [rawLead.message_follower_ids], { fields: FOLLOWER_FIELDS })
                    : Promise.resolve([]));

                return Promise.allSettled(jobs).then(function (results) {
                    function pluck(idx, mapper) {
                        if (results[idx].status !== 'fulfilled') return null;
                        var val = results[idx].value;
                        return mapper ? mapper(val) : val;
                    }
                    function errMsg(r) {
                        if (r.status !== 'rejected') return null;
                        return (r.reason && r.reason.message) ? r.reason.message : String(r.reason);
                    }

                    state.leadDetailCache[leadId] = {
                        lead: mapLead(rawLead),
                        caredPerson: pluck(0, function (arr) { return mapCared(arr && arr[0]); }),
                        notes: pluck(1, function (arr) { return (arr || []).map(mapNote); }),
                        activities: pluck(2, function (arr) { return (arr || []).map(mapActivity); }),
                        attachments: pluck(3, function (arr) { return (arr || []).map(mapAttachment); }),
                        followers: pluck(4, function (arr) { return (arr || []).map(mapFollower); }),
                        _errors: [errMsg(results[0]), errMsg(results[1]), errMsg(results[2]), errMsg(results[3]), errMsg(results[4])],
                        _loadedAt: Date.now(),
                        _loading: false,
                        _error: null
                    };

                    // Race-guard: solo rerender si el lead activo sigue siendo este.
                    if (state.currentLeadId === leadId) {
                        rerenderContent();
                    }
                    return state.leadDetailCache[leadId];
                });
            }).catch(function (err) {
                // Error en crm.lead.read - todo el detail queda en error global.
                state.leadDetailCache[leadId] = {
                    lead: null,
                    caredPerson: null,
                    notes: null,
                    activities: null,
                    attachments: null,
                    followers: null,
                    _loading: false,
                    _loadedAt: null,
                    _error: err && err.message ? err.message : String(err),
                    _errors: [null, null, null, null, null]
                };
                if (state.currentLeadId === leadId) {
                    rerenderContent();
                    var msg = err && err.message ? err.message : 'Error desconocido';
                    if (msg.indexOf('session expired') >= 0 || msg.indexOf('sesion expirada') >= 0) {
                        showToast('Sesion expirada en Odoo. Recarga la pagina.');
                    } else if (msg.indexOf('Lead not found') >= 0) {
                        showToast('Lead no encontrado en Odoo');
                    } else {
                        showToast('Error cargando lead: ' + msg);
                    }
                }
                log('LeadDetailService.fetchAll error', err);
                // No re-throw: ya quedo registrado en cache._error y notificado al usuario.
            });
        },

        getFromCache: function (leadId) {
            return state.leadDetailCache[leadId] || null;
        }
    };

    // ============================================================
    // LEADER DASHBOARD SERVICE (v1.12, v1.12.1)
    // ============================================================
    // v1.12.1: schema en espanol (nombre/localidad/cartera/calientes/templados/frios/bajoSeg/
    //   intPorLead/conversion/estado). Filtro team-lead eliminado (mock real no tiene teamLead).
    //   Devuelve un nuevo array sin mutar el mock. KPIs, donut y tabla derivan de este array.
    //   La grafica de tendencia NO se filtra (es metrica global del equipo).
    function filterAndSortAfs(afs, ld) {
        var locFilter = (ld && ld.locFilter) || 'all';
        var search = ((ld && ld.search) || '').trim().toLowerCase();
        var sortCol = ld && ld.sortCol;
        var sortDir = (ld && ld.sortDir) || 'asc';

        var out = [];
        for (var i = 0; i < afs.length; i++) {
            var af = afs[i];
            if (locFilter !== 'all' && af.localidad !== locFilter) continue;
            if (search && af.nombre.toLowerCase().indexOf(search) === -1) continue;
            out.push(af);
        }

        if (sortCol) {
            var dirMul = (sortDir === 'desc') ? -1 : 1;
            out.sort(function (a, b) {
                var av, bv;
                if (sortCol === 'temperatura') {
                    // v1.12.1: proxy de orden por temperatura -> usa calientes.
                    av = a.calientes; bv = b.calientes;
                } else if (sortCol === 'estado') {
                    var ord = { 'OK': 0, 'Atención': 1, 'Sobrecarga': 2 };
                    av = ord[a.estado]; bv = ord[b.estado];
                } else {
                    av = a[sortCol]; bv = b[sortCol];
                }
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                if (typeof av === 'string') return av.localeCompare(bv) * dirMul;
                return (av - bv) * dirMul;
            });
        }
        return out;
    }

    // v1.12.1: KPIs del lider. Conversion del equipo es PROMEDIO PONDERADO por cartera
    //   (no avg simple) para reflejar la realidad operativa - AFs con mas cartera pesan mas.
    //   bajoSegPct = (sum bajoSeg) / (sum cartera) * 100. riesgoCount = count(estado != 'OK').
    function buildLeaderKpis(afs) {
        var totalCartera = 0, bajoSegSum = 0, convWeighted = 0, riesgo = 0;
        for (var i = 0; i < afs.length; i++) {
            var a = afs[i];
            totalCartera += a.cartera;
            bajoSegSum   += a.bajoSeg;
            convWeighted += a.conversion * a.cartera;
            if (a.estado !== 'OK') riesgo++;
        }
        var bajoSegPct = totalCartera ? Math.round(bajoSegSum / totalCartera * 100) : 0;
        var convTeam   = totalCartera ? Math.round((convWeighted / totalCartera) * 10) / 10 : 0;
        return {
            totalCartera: totalCartera,
            bajoSegPct: bajoSegPct,
            bajoSegCount: bajoSegSum,
            convTeam: convTeam,
            riesgoCount: riesgo,
            afCount: afs.length
        };
    }

    // v1.12.1: agregado por temperatura para el donut. Renombre simple de hot/warm/cold ->
    //   calientes/templados/frios (mock nuevo).
    function buildLeaderTemperature(afs) {
        var hot = 0, warm = 0, cold = 0;
        for (var i = 0; i < afs.length; i++) {
            hot  += afs[i].calientes;
            warm += afs[i].templados;
            cold += afs[i].frios;
        }
        return { hot: hot, warm: warm, cold: cold, total: hot + warm + cold };
    }

    // v1.12.1: serie del area chart segun state.leaderDash.trendMetric. Series FIJAS (no se
    //   filtran por localidad - son metricas globales del equipo). targetValue es el valor
    //   absoluto del target (8 para conversion, 68 para coverage), sirve para la annotation.
    function buildLeaderTrendSeries() {
        var key = (state.leaderDash && state.leaderDash.trendMetric) || 'conversion';
        var m = MOCK_LEADER_TREND[key] || MOCK_LEADER_TREND.conversion;
        return {
            categories: MOCK_LEADER_TREND.categories.slice(),
            data: m.data.slice(),
            target: m.target,
            title: m.title,
            yMax: m.yMax,
            metric: key
        };
    }

    // ============================================================
    // SVG ICONS (lucide-style)
    // ============================================================
    var I = {
        x:           '<path d="M18 6 6 18M6 6l12 12"/>',
        search:      '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        sparkles:    '<path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/>',
        msg:         '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>',
        file:        '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
        book:        '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
        chevLeft:    '<path d="m15 18-6-6 6-6"/>',
        chevRight:   '<path d="m9 18 6-6-6-6"/>',
        chevDown:    '<path d="m6 9 6 6 6-6"/>',
        arrowLeft:   '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
        arrowUp:     '<polyline points="18 15 12 9 6 15"/>',
        arrowDown:   '<polyline points="6 9 12 15 18 9"/>',
        phone:       '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>',
        mapPin:      '<path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
        users:       '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        check:       '<path d="M20 6 9 17l-5-5"/>',
        edit:        '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
        alert:       '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
        clock:       '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        plus:        '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
        refresh:     '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
        paperclip:   '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
        calendar:    '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
        flame:       '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        thermo:      '<path d="M12 9a4 4 0 0 0-2 7.5"/><path d="M12 3v2"/><path d="M6.6 18.4l-1.4 1.4"/><path d="M18 2a4 4 0 0 0-4 4v10.5a4 4 0 1 0 4 0z"/>',
        snowflake:   '<line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>',
        pause:       '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
        target:      '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        chevUp:      '<path d="m18 15-6-6-6 6"/>',
        arrowRight:  '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
        history:     '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><path d="M12 7v5l3 1.5"/>',
        send:        '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
        listOrdered: '<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
        briefcase:   '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
        moreHoriz:   '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
        zap:         '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
        dot:         '<circle cx="12" cy="12" r="3"/>',
        slidersHoriz:'<line x1="4" y1="6" x2="11" y2="6"/><line x1="15" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="9" y2="18"/><line x1="13" y1="18" x2="20" y2="18"/><line x1="4" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="20" y2="12"/><circle cx="13" cy="6" r="2"/><circle cx="11" cy="18" r="2"/><circle cx="8" cy="12" r="2"/>',
        // v1.10: lucide RefreshCw (rotation horario, dos arrows) - distinto a "refresh" que es RefreshCcw.
        'refresh-cw':'<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
        // v1.10: lucide AlertTriangle (triangulo con !) - distinto a "alert" que es AlertCircle.
        'alert-triangle':'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        // v1.12: lucide BarChart2 - icono del badge leader.
        'bar-chart-2':'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
        // v1.12: lucide Search (alias del existente; agrego download/external para boton exportar).
        'download':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
        'filter':'<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'
    };
    function icon(name, size) {
        var path = I[name] || '';
        var s = size || 14;
        return '<svg class="qa-icon" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
    }

    // ============================================================
    // STYLES
    // ============================================================
    function injectStyles() {
        if (document.getElementById('qida-assistant-styles')) return;

        if (!document.querySelector('link[data-qida-fonts]')) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = FONTS_HREF;
            link.setAttribute('data-qida-fonts', '');
            document.head.appendChild(link);
        }

        var css = [
            ':root{',
                '--qg:#0E4A3A;--qgH:#0a3a2d;--qg-soft:#f0f7f3;--qg-soft-border:#cfe5d8;',
                '--s50:#fafaf9;--s100:#f5f5f4;--s200:#e7e5e4;--s300:#d6d3d1;',
                '--s400:#a8a29e;--s500:#78716c;--s600:#57534e;--s700:#44403c;--s800:#292524;--s900:#1c1917;',
                '--red500:#ef4444;--red600:#dc2626;--red50:#fef2f2;',
                '--amber50:#fffbeb;',
            '}',

            /* badge */
            '.qida-badge{position:fixed;bottom:24px;left:24px;z-index:2147483000;width:78px;height:78px;border-radius:50%;cursor:pointer;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(15,61,58,.18),0 2px 4px rgba(15,61,58,.08);transition:transform .18s ease,box-shadow .18s ease;user-select:none;-webkit-tap-highlight-color:transparent;font-family:"Manrope",system-ui,sans-serif;}',
            '.qida-badge:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(15,61,58,.22),0 4px 8px rgba(15,61,58,.1);}',
            '.qida-badge img{width:47px;height:auto;display:block;pointer-events:none;}',
            '.qida-badge-count{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;padding:0 7px;border-radius:11px;background:#f97316;color:#fff;font-size:12px;font-weight:700;line-height:22px;text-align:center;box-shadow:0 2px 6px rgba(249,115,22,.4);pointer-events:none;}',

            /* overlay + shell */
            '.qida-overlay{position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;justify-content:center;background:rgba(28,25,23,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);font-family:"Manrope",system-ui,sans-serif;color:var(--s900);padding:16px;box-sizing:border-box;}',
            '.qida-overlay.active{display:flex;}',
            '.qida-shell{background:#fff;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,.3);width:100%;max-width:1400px;height:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;position:relative;}',
            '.qida-shell.qida-view-detail{max-width:none;max-height:none;width:96vw;height:96vh;}',
            /* v1.12.1: modal mas grande para el panel de lideres (95vw x 92vh, max 1600px). */
            '.qida-shell.qida-view-leaders{max-width:1600px;max-height:92vh;width:95vw;height:92vh;}',
            '.qida-shell *{box-sizing:border-box;}',

            /* shell header */
            '.qida-shell-header{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-bottom:1px solid var(--s200);flex-shrink:0;}',
            '.qida-shell-title{display:flex;align-items:center;gap:12px;}',
            '.qida-shell-mark{width:28px;height:28px;border-radius:6px;background:var(--qg);color:#fff;display:flex;align-items:center;justify-content:center;}',
            '.qida-shell-tt-main{font-family:"Fraunces",Georgia,serif;font-feature-settings:"ss01";font-weight:600;font-size:16px;line-height:1;color:var(--s900);}',
            '.qida-shell-tt-sub{font-size:11px;color:var(--s500);margin-top:2px;}',
            '.qida-shell-actions{display:flex;align-items:center;gap:10px;margin-left:auto;}',
            '.qida-esc{font-size:11px;color:var(--s400);}',
            '.qida-icon-btn{background:transparent;border:0;padding:6px;border-radius:6px;cursor:pointer;color:var(--s600);display:inline-flex;align-items:center;justify-content:center;transition:background .15s;}',
            '.qida-icon-btn:hover{background:var(--s100);color:var(--s900);}',
            /* v1.8: toggle swap layout en el shell header del detail */
            '.qida-shell-swap{background:transparent;border:0.5px solid var(--s300);border-radius:6px;padding:4px 8px;font-size:11px;color:var(--s600);cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:inherit;transition:background .15s,color .15s,border-color .15s;}',
            '.qida-shell-swap:hover{background:var(--s100);}',
            '.qida-shell-swap.active{background:#E1F5EE;color:#0F6E56;border-color:#c5e8dc;}',
            '.qida-content{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0;}',
            '.qida-shell.qida-view-leaders .qida-content{overflow-y:auto;overflow-x:hidden;display:block;}',

            /* v1.10: coverage widget, dashboard search/chips/table, badges util ELIMINADOS.
               Vivian con renderCoverage / renderUnifiedTable / renderTempBadge / renderUrg /
               renderDays (todos eliminados con el dashboard nuevo). */

            /* detail layout v1.7 - 3 panes (28 / flex / 32), shell header dinamico */
            '.qida-shell.qida-view-detail .qida-shell-header{padding:10px 16px;}',
            '.qida-detail{display:flex;flex-direction:column;height:100%;min-height:0;}',
            '.qida-back{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;background:transparent;border:0.5px solid var(--s300);border-radius:8px;color:var(--s700);font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;}',
            '.qida-back:hover{border-color:var(--s400);color:var(--s900);}',
            '.qida-detail-body{flex:1;display:flex;min-height:0;overflow:hidden;}',

            /* Shell header dinamico - vista detail */
            '.qida-detail-shell-head{display:flex;align-items:center;gap:14px;flex:1;min-width:0;}',
            '.qida-dsh-name{font-size:14px;font-weight:500;color:var(--s900);line-height:1;white-space:nowrap;}',
            '.qida-dsh-id{font-size:12px;font-weight:400;color:var(--s500);}',
            '.qida-dsh-meta{display:flex;align-items:center;gap:8px;color:var(--s600);font-size:12px;font-weight:400;flex-wrap:wrap;min-width:0;overflow:hidden;}',
            '.qida-dsh-meta-item{display:inline-flex;align-items:center;gap:4px;white-space:nowrap;}',
            '.qida-dsh-sep{color:var(--s300);}',
            '.qida-dsh-days{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:8px;font-size:11px;font-weight:500;border:0.5px solid transparent;line-height:1.2;white-space:nowrap;}',
            '.qida-dsh-days.lvl-today{background:#ecfdf5;color:#15803d;border-color:#86efac;}',
            '.qida-dsh-days.lvl-fresh{background:#E1F5EE;color:#0F6E56;border-color:#c5e8dc;}',
            '.qida-dsh-days.lvl-warn{background:#fff7ed;color:#9a3412;border-color:#fed7aa;}',
            '.qida-dsh-days.lvl-stale{background:#fef2f2;color:#991b1b;border-color:#fecaca;}',

            /* v1.17: pill de temperatura editable en el header del detalle + selector */
            '.qida-tbar{display:inline-block;width:16px;height:8px;border-radius:4px;flex-shrink:0;background:var(--s300);}',
            '.qida-tbar-caliente{background:#EF4444;}',
            '.qida-tbar-templado{background:#F59E0B;}',
            '.qida-tbar-frio{background:#3B82F6;}',
            '.qida-tbar-pausa{background:var(--s400);}',
            '.qida-dsh-temp-wrap{position:relative;display:inline-flex;}',
            '.qida-dsh-temp{display:inline-flex;align-items:center;gap:6px;background:#fff;border:0.5px solid var(--s300);border-radius:8px;padding:3px 8px;font-size:11px;font-weight:500;color:var(--s700);cursor:pointer;font-family:inherit;line-height:1.2;white-space:nowrap;}',
            '.qida-dsh-temp:hover{border-color:var(--s400);background:var(--s50);}',
            '.qida-dsh-temp .qa-icon{color:var(--s400);}',
            '.qida-temp-backdrop{position:fixed;inset:0;z-index:60;}',
            '.qida-temp-menu{position:absolute;top:100%;left:0;margin-top:4px;background:#fff;border:0.5px solid var(--s200);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.16);padding:4px;z-index:61;min-width:160px;display:flex;flex-direction:column;gap:2px;}',
            '.qida-temp-opt{display:flex;align-items:center;gap:8px;background:transparent;border:0;border-radius:6px;padding:7px 10px;font-size:12.5px;color:var(--s800);cursor:pointer;font-family:inherit;text-align:left;}',
            '.qida-temp-opt:hover{background:var(--s50);}',
            '.qida-temp-opt.active{background:var(--qg-soft);color:var(--qg);font-weight:500;}',

            /* WhatsApp pane */
            '.qida-pane-wa{background:#ECE5DD;display:flex;flex-direction:column;min-height:0;min-width:0;}',
            '.qida-pane-wa-head{padding:10px 14px;background:rgba(255,255,255,.6);border-bottom:0.5px solid var(--s300);display:flex;align-items:center;gap:6px;color:var(--s600);flex-shrink:0;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;}',
            '.qida-pane-wa-body{flex:1;overflow-y:auto;padding:14px 12px;min-height:0;}',
            '.qida-wa-input-wrap{padding:10px 12px;border-top:0.5px solid var(--s300);background:rgba(255,255,255,.35);flex-shrink:0;}',
            '.qida-wa-input{display:flex;align-items:flex-end;gap:8px;background:#fff;border:0.5px solid var(--s300);border-radius:18px;padding:6px 8px 6px 10px;}',
            '.qida-wa-input:focus-within{border-color:#0F6E56;}',
            '.qida-wa-clip{background:transparent;border:0;padding:6px;color:var(--s500);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;}',
            '.qida-wa-clip:hover{color:var(--s900);}',
            '.qida-wa-textarea{flex:1;min-height:24px;max-height:120px;padding:6px 4px;border:0;outline:none;background:transparent;font-family:inherit;font-size:12.5px;font-weight:400;line-height:1.4;color:var(--s900);resize:none;overflow-y:auto;}',
            '.qida-wa-textarea::placeholder{color:var(--s400);}',
            '.qida-wa-send{flex-shrink:0;width:34px;height:34px;border-radius:50%;background:#0F6E56;color:#fff;border:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .12s;}',
            '.qida-wa-send:hover:not(:disabled){background:var(--qgH);}',
            '.qida-wa-send:disabled{background:var(--s300);cursor:not-allowed;}',
            '.qida-msgs{display:flex;flex-direction:column;gap:8px;}',
            '.qida-msg{display:flex;}',
            '.qida-msg.from-af{justify-content:flex-end;}',
            '.qida-msg.from-lead{justify-content:flex-start;}',
            '.qida-msg-bubble{max-width:90%;padding:8px 11px;}',
            '.qida-msg.from-af .qida-msg-bubble{background:#DCF8C6;color:var(--s800);border-radius:8px 0 8px 8px;}',
            '.qida-msg.from-lead .qida-msg-bubble{background:#fff;color:var(--s800);border:0.5px solid var(--s300);border-radius:0 8px 8px 8px;}',
            '.qida-msg-text{font-size:12.5px;font-weight:400;line-height:1.4;margin:0;}',
            '.qida-msg-time{font-size:10px;font-weight:400;color:var(--s500);margin-top:3px;text-align:right;}',
            '.qida-empty-msgs{font-size:12px;color:var(--s500);font-style:italic;padding:24px 8px;text-align:center;}',

            /* Center pane - cards sobre fondo neutro */
            '.qida-pane-center{background:#DBE9D5;padding:14px 12px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;min-height:0;min-width:0;}',
            '.qida-detail-body > *:not(:last-child){border-right:0.5px solid var(--s300);}',
            '.qida-detail-body > *:last-child{border-right:0;}',
            '.qida-info-card{background:#fff;border:0.5px solid var(--s300);border-radius:12px;padding:12px 14px;}',
            '.qida-info-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;}',
            '.qida-info-card-title{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--s600);display:inline-flex;align-items:center;gap:6px;}',
            '.qida-info-card-actions{font-size:11px;font-weight:400;color:var(--s500);display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;}',
            '.qida-info-card-body{font-size:13px;font-weight:400;line-height:1.55;color:var(--s800);}',
            '.qida-info-card-highlight{background:#E1F5EE;border-radius:8px;padding:10px 12px;color:#143C32;font-size:13px;font-weight:400;line-height:1.55;}',

            /* v1.11: Skeleton lines para cards en estado loading mientras Odoo responde */
            '.qida-skeleton-line{display:block;height:12px;background:linear-gradient(90deg,#eef0ee 0%,#f5f7f5 50%,#eef0ee 100%);background-size:200% 100%;border-radius:4px;animation:qida-skel-shimmer 1.4s ease-in-out infinite;}',
            '.qida-skeleton-line + .qida-skeleton-line{margin-top:6px;}',
            '.qida-skeleton-line.w90{width:90%;}',
            '.qida-skeleton-line.w70{width:70%;}',
            '.qida-skeleton-line.w50{width:50%;}',
            '@keyframes qida-skel-shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}',
            '.qida-link-btn{background:transparent;border:0;padding:0;color:#0F6E56;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px;}',
            '.qida-link-btn:hover{color:var(--qgH);text-decoration:underline;}',
            '.qida-link-btn.muted{color:var(--s500);font-weight:400;}',
            '.qida-link-btn.muted:hover{color:var(--s700);}',
            '.qida-ia-text{margin:0;white-space:pre-wrap;}',
            '.qida-ia-empty{font-size:12px;color:var(--s500);font-style:italic;margin:0;}',
            '.qida-ia-textarea{width:100%;min-height:120px;padding:10px 12px;border:0.5px solid var(--s300);border-radius:8px;font-family:inherit;font-size:13px;font-weight:400;line-height:1.5;color:var(--s800);background:#fff;outline:none;resize:vertical;}',
            '.qida-ia-textarea:focus{border-color:#0F6E56;}',
            '.qida-ia-actions{display:flex;gap:8px;margin-top:8px;}',
            '.qida-context-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;font-size:12.5px;}',
            '.qida-context-item{display:flex;flex-direction:column;gap:2px;}',
            '.qida-context-key{font-size:11px;font-weight:400;color:var(--s500);}',
            '.qida-context-val{font-size:12.5px;font-weight:400;color:var(--s800);}',
            '.qida-context-val.urgent{color:#993C1D;}',
            '.qida-note{padding:8px 0;border-bottom:0.5px solid var(--s100);}',
            '.qida-note:last-child{border-bottom:0;padding-bottom:0;}',
            '.qida-note-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}',
            '.qida-note-author{font-size:12px;font-weight:500;color:var(--s700);}',
            '.qida-note-date{font-size:10px;font-weight:400;color:var(--s500);}',
            '.qida-note-text{font-size:12.5px;font-weight:400;color:var(--s700);margin:0;line-height:1.45;}',
            '.qida-add-note{background:var(--s50);border:0.5px solid var(--s200);border-radius:8px;padding:10px 12px;margin-top:8px;}',
            '.qida-add-note textarea{width:100%;min-height:64px;border:0;outline:none;font-family:inherit;font-size:12.5px;font-weight:400;color:var(--s800);resize:vertical;background:transparent;}',
            '.qida-add-note-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px;}',
            '.qida-empty-notes{font-size:12px;color:var(--s500);font-style:italic;padding:2px 0;margin:0;}',
            '.qida-act-row{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:400;color:var(--s800);padding:6px 0;}',
            '.qida-act-row + .qida-act-row{border-top:0.5px solid var(--s100);}',
            '.qida-act-row.done .qida-act-row-text{text-decoration:line-through;color:var(--s500);}',
            '.qida-act-row.overdue .qida-act-row-text{color:#993C1D;}',
            '.qida-act-dot{width:6px;height:6px;border-radius:50%;background:#0F6E56;flex-shrink:0;}',
            '.qida-act-row.overdue .qida-act-dot{background:#993C1D;}',
            '.qida-act-row-text{flex:1;min-width:0;line-height:1.35;}',
            '.qida-act-row-when{font-size:11px;font-weight:400;color:var(--s500);margin-left:auto;white-space:nowrap;}',
            '.qida-act-row.overdue .qida-act-row-when{color:#993C1D;}',
            '.qida-empty-act{font-size:12px;color:var(--s500);font-style:italic;padding:2px 0;margin:0;}',
            '.qida-followers{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
            '.qida-follower{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;background:var(--s50);border:0.5px solid var(--s200);border-radius:999px;cursor:default;}',
            '.qida-follower-avatar{width:22px;height:22px;border-radius:50%;background:#E1F5EE;color:#0F6E56;font-size:10px;font-weight:500;display:flex;align-items:center;justify-content:center;font-family:"Manrope";}',
            '.qida-follower-name{font-size:12px;font-weight:400;color:var(--s700);}',
            '.qida-follower-role{font-size:10px;font-weight:400;color:var(--s500);}',

            /* footer / buttons */
            '.qida-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:var(--qg);color:#fff;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s;}',
            '.qida-btn-primary:hover{background:var(--qgH);}',
            '.qida-btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:transparent;color:var(--s700);border:1px solid var(--s200);border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;}',
            '.qida-btn-ghost:hover{background:var(--s50);border-color:var(--s300);}',

            /* Attachments (reusados desde el pane derecho v1.5 -> ahora viven dentro del colapsable del pane central) */
            '.qida-att{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--s200);border-radius:6px;cursor:pointer;transition:border-color .15s,background .15s;background:#fff;}',
            '.qida-att:hover{border-color:var(--s400);background:var(--s50);}',
            '.qida-att + .qida-att{margin-top:8px;}',
            '.qida-att-icon{flex-shrink:0;padding:6px;border-radius:6px;background:var(--s100);color:var(--s700);}',
            '.qida-att-body{flex:1;min-width:0;}',
            '.qida-att-name{font-size:12px;font-weight:500;color:var(--s800);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.qida-att-meta{font-size:10px;color:var(--s500);margin-top:2px;}',
            '.qida-att-main{font-size:9px;background:var(--qg);color:#fff;padding:1px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:.04em;font-weight:600;flex-shrink:0;}',
            '.qida-att-empty{font-size:12px;color:var(--s400);font-style:italic;padding:12px 2px;text-align:center;}',

            /* v1.6: Adjuntos colapsable (header clickeable + cuerpo desplegable) */
            '.qida-att-collapse{border:1px solid var(--s200);border-radius:8px;background:#fff;overflow:hidden;}',
            '.qida-att-collapse-head{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;background:#fff;color:var(--s700);font-size:12px;font-weight:600;border:0;width:100%;text-align:left;font-family:inherit;transition:background .12s;}',
            '.qida-att-collapse-head:hover{background:var(--s50);}',
            '.qida-att-collapse-head-title{flex:1;display:inline-flex;align-items:center;gap:8px;}',
            '.qida-att-collapse-count{font-size:11px;color:var(--s500);font-weight:500;}',
            '.qida-att-collapse-body{padding:8px 12px 12px;border-top:1px solid var(--s100);background:var(--s50);}',

            /* v1.7: Chat IA - columna dedicada */
            '.qida-pane-ai{background:#fff;display:flex;flex-direction:column;min-height:0;min-width:0;}',
            /* v1.9: anchos por posicion estructural (siempre col 1 = pane-wa). El swap intercambia col 2 / col 3. */
            '.qida-detail-body > *:nth-child(1){flex:0 0 28%;min-width:0;}',
            '.qida-detail-body > *:nth-child(2){flex:1 1 auto;min-width:0;}',
            '.qida-detail-body > *:nth-child(3){flex:0 0 32%;min-width:0;}',
            '.qida-pane-ai-head{background:#F7FAF8;border-bottom:0.5px solid var(--s200);padding:10px 14px;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:#0F6E56;display:flex;align-items:center;gap:6px;flex-shrink:0;}',
            '.qida-pane-ai-body{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:12px;min-height:0;}',
            '.qida-pane-ai-empty{font-size:12px;font-weight:400;color:var(--s500);line-height:1.45;margin:0;}',
            '.qida-pane-ai-foot{padding:10px 14px 14px;border-top:0.5px solid var(--s200);background:#fff;flex-shrink:0;display:flex;flex-direction:column;gap:10px;}',
            '.qida-aichat-bubble{display:flex;gap:8px;align-items:flex-start;}',
            /* v1.8: paleta sutil del chat IA - 3 capas (avatar / burbuja / card interna) */
            '.qida-aichat-bubble-icon{flex-shrink:0;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;}',
            '.qida-aichat-bubble.ai .qida-aichat-bubble-icon{background:#E1F5EE;color:#0F6E56;}',
            '.qida-aichat-bubble.user .qida-aichat-bubble-icon{background:#143C32;color:#FFEFDA;}',
            '.qida-aichat-bubble-body{flex:1;min-width:0;font-size:12.5px;font-weight:400;line-height:1.5;color:var(--s800);}',
            '.qida-aichat-bubble-label{font-size:11px;font-weight:500;color:var(--s600);margin-bottom:3px;}',
            '.qida-aichat-bubble-content{padding:8px 12px;}',
            '.qida-aichat-bubble.user .qida-aichat-bubble-content{background:#F1F8EE;border-radius:12px 12px 4px 12px;}',
            '.qida-aichat-bubble.ai .qida-aichat-bubble-content{background:#FAFAF9;border-radius:12px 12px 12px 4px;}',
            '.qida-aichat-bubble-text{margin:0;font-size:12.5px;font-weight:400;}',
            '.qida-aichat-bubble-intro{margin:0 0 8px;color:var(--s700);font-size:12.5px;font-weight:400;}',
            '.qida-aichat-variant{margin-top:8px;padding:10px 12px;border:0.5px solid var(--s200);border-radius:10px;background:#fff;}',
            '.qida-aichat-variant + .qida-aichat-variant{margin-top:8px;}',
            '.qida-aichat-variant-label{font-size:11px;font-weight:500;color:#0F6E56;margin-bottom:4px;}',
            '.qida-aichat-variant-text{font-size:12.5px;font-weight:400;color:var(--s800);line-height:1.5;margin:0 0 8px;white-space:pre-wrap;}',
            '.qida-aichat-variant-action{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#fff;color:#0F6E56;border:0.5px solid var(--s300);border-radius:8px;font-size:11px;font-weight:400;cursor:pointer;font-family:inherit;}',
            '.qida-aichat-variant-action:hover{background:var(--s50);}',
            /* v1.8: estado refine del flujo "Esta me gusta mas" */
            '.qida-aichat-refine{margin-top:6px;}',
            '.qida-aichat-refine-text{background:#F1F8EE;border-radius:8px;padding:8px 10px;font-size:12.5px;color:var(--s800);margin:6px 0 8px;line-height:1.5;white-space:pre-wrap;}',
            '.qida-aichat-copy-wa{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;background:#0F6E56;color:#fff;border:0;border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;transition:background .15s;}',
            '.qida-aichat-copy-wa:hover{background:#143C32;}',
            '.qida-aichat-rationale{font-size:12px;font-weight:400;color:var(--s600);font-style:italic;margin:0 0 8px;}',
            '.qida-aichat-mat-card{margin-top:6px;padding:10px 12px;border:0.5px solid var(--s200);border-radius:10px;background:#fff;}',
            '.qida-aichat-mat-title{font-size:12.5px;font-weight:500;color:var(--s800);margin-bottom:3px;}',
            '.qida-aichat-mat-desc{font-size:12px;font-weight:400;color:var(--s600);margin-bottom:6px;line-height:1.45;}',
            '.qida-aichat-mat-action{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:#fff;color:#0F6E56;border:0.5px solid var(--s300);border-radius:8px;font-size:11px;font-weight:400;cursor:pointer;font-family:inherit;}',
            '.qida-aichat-mat-action:hover{background:var(--s50);}',
            '.qida-aichat-input{display:flex;align-items:center;gap:8px;background:var(--s50);border:0.5px solid var(--s300);border-radius:8px;padding:8px 12px;}',
            '.qida-aichat-input:focus-within{border-color:#0F6E56;}',
            '.qida-aichat-input-icon{color:#0F6E56;flex-shrink:0;display:inline-flex;}',
            '.qida-aichat-input-field{flex:1;min-width:0;border:0;outline:none;background:transparent;font-family:inherit;font-size:12.5px;font-weight:400;color:var(--s900);padding:4px 0;}',
            '.qida-aichat-input-field::placeholder{color:var(--s500);}',
            '.qida-aichat-send{flex-shrink:0;width:30px;height:30px;border-radius:50%;background:#0F6E56;color:#fff;border:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;}',
            '.qida-aichat-send:hover:not(:disabled){background:var(--qgH);}',
            '.qida-aichat-send:disabled{background:var(--s300);cursor:not-allowed;}',
            /* v1.8: chips siempre visibles, en fila estilo Gemini */
            '.qida-aichat-chips{display:flex;flex-direction:row;flex-wrap:wrap;gap:6px;margin-top:4px;}',
            '.qida-aichat-chip{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;padding:5px 10px;background:#dbe9d5;border:0.5px solid var(--s300);border-radius:8px;color:var(--s800);font-size:11px;font-weight:400;cursor:pointer;font-family:inherit;transition:border-color .12s,background .12s;}',
            '.qida-aichat-chip:hover{border-color:#0F6E56;background:#F7FAF8;}',

            /* Schedule modal */
            '.qida-schedule-bg{position:absolute;inset:0;z-index:5;background:rgba(28,25,23,.45);display:flex;align-items:center;justify-content:center;padding:16px;}',
            '.qida-schedule{background:#fff;border-radius:10px;box-shadow:0 24px 60px rgba(0,0,0,.3);width:100%;max-width:560px;max-height:90%;display:flex;flex-direction:column;overflow:hidden;}',
            '.qida-schedule-head{padding:16px 20px;border-bottom:1px solid var(--s100);}',
            '.qida-schedule-title{font-family:"Fraunces",Georgia,serif;font-size:18px;font-weight:600;color:var(--s900);margin:0;}',
            '.qida-schedule-sub{font-size:12px;color:var(--s600);margin:4px 0 0;}',
            '.qida-schedule-body{padding:16px 20px;overflow-y:auto;}',
            '.qida-sb-section{margin-bottom:18px;}',
            '.qida-sb-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--s600);margin-bottom:8px;}',
            '.qida-sb-shortcuts{display:flex;gap:6px;flex-wrap:wrap;}',
            '.qida-sb-short{padding:6px 12px;border:1px solid var(--s200);border-radius:6px;font-size:12px;background:#fff;cursor:pointer;font-family:inherit;color:var(--s700);transition:border-color .15s,background .15s;}',
            '.qida-sb-short:hover{border-color:var(--s400);}',
            '.qida-sb-short.active{border-color:var(--qg);background:var(--qg-soft);color:var(--qg);font-weight:600;}',
            '.qida-sb-custom{margin-top:8px;display:flex;align-items:center;gap:8px;}',
            '.qida-sb-custom label{font-size:11px;color:var(--s500);}',
            '.qida-sb-custom input{padding:6px 8px;font-size:13px;font-family:inherit;border:1px solid var(--s200);border-radius:6px;outline:none;color:var(--s900);}',
            '.qida-sb-custom input:focus{border-color:var(--qg);}',
            '.qida-sb-note-hint{font-size:11px;color:var(--s500);margin-bottom:6px;display:inline-flex;align-items:center;gap:4px;}',
            '.qida-sb-note{width:100%;min-height:120px;padding:10px 12px;font-family:inherit;font-size:13px;line-height:1.5;color:var(--s800);border:1px solid var(--s200);border-radius:6px;outline:none;resize:vertical;}',
            '.qida-sb-note:focus{border-color:var(--qg);}',
            '.qida-sb-toggle{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--s50);border:1px solid var(--s200);border-radius:6px;}',
            '.qida-sb-toggle input{margin:0;}',
            '.qida-sb-toggle-label{font-size:13px;color:var(--s800);font-weight:500;}',
            '.qida-sb-toggle-hint{font-size:11px;color:var(--s500);margin-top:2px;display:block;}',
            '.qida-schedule-foot{padding:14px 20px;border-top:1px solid var(--s100);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}',
            '.qida-sb-close-wrap{display:inline-flex;align-items:center;gap:6px;}',
            '.qida-sb-close{padding:8px 10px;border:1px solid var(--s200);border-radius:6px;background:#fff;font-size:12px;font-family:inherit;cursor:pointer;color:var(--s700);}',
            '.qida-sb-close:hover{border-color:var(--s400);}',
            '.qida-sb-close-apply{background:transparent;border:0;font-size:12px;color:var(--s500);cursor:pointer;font-family:inherit;}',
            '.qida-sb-close-apply:hover{color:var(--s900);}',
            '.qida-sb-actions{display:flex;align-items:center;gap:8px;margin-left:auto;}',
            '.qida-sb-cancel{background:transparent;border:0;font-size:12px;color:var(--s500);cursor:pointer;padding:8px 10px;font-family:inherit;}',
            '.qida-sb-cancel:hover{color:var(--s900);}',

            /* Toast */
            '.qida-toast{position:absolute;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--s900);color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;box-shadow:0 8px 20px rgba(0,0,0,.25);z-index:6;opacity:0;transition:opacity .2s,transform .2s;display:inline-flex;align-items:center;gap:8px;font-family:"Manrope",system-ui,sans-serif;pointer-events:none;}',
            '.qida-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}',

            /* v1.13: el bloque del dashboard "cooling" (v1.10, .qida-cooling-*) fue reemplazado
               por el bloque .qida-dash-* de abajo (cards + toolbar + tabla por temperatura). */

            /* ============================================================
               v1.14 DASHBOARD AF: cards (2 grupos) + toolbar + tabla por columnas
               (Temperatura / Días coloreado / Estado con badges) + leyenda. Sistema visual
               portado del Panel de Líderes. Sin color de fila / rail / tinte.
               ============================================================ */
            '.qida-dash-dashboard{padding:16px;position:relative;flex:1;overflow-y:auto;background:#fff;}',

            /* Banda superior: 2 grupos con label (estética .qida-leader-kpi de admin) */
            '.qida-dash-cards{display:flex;align-items:stretch;gap:20px;margin-bottom:14px;}',
            '.qida-dash-cardgroup{display:flex;flex-direction:column;gap:6px;}',
            '.qida-dash-cardgroup-grow{flex:1;}',
            '.qida-dash-cardgroup-label{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--s400);padding-left:2px;}',
            '.qida-dash-cardgroup-cards{display:flex;gap:12px;flex:1;}',
            '.qida-dash-cardgroup-temps{display:grid;grid-template-columns:repeat(3,1fr);}',
            '.qida-dash-card{display:flex;flex-direction:column;gap:3px;padding:12px 16px;border:0.5px solid var(--s200);border-radius:10px;background:#fff;font-family:inherit;text-align:left;min-width:118px;}',
            '.qida-dash-card-label{font-size:11px;font-weight:500;color:var(--s500);text-transform:uppercase;letter-spacing:.05em;}',
            '.qida-dash-card-num{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:28px;line-height:1.1;color:var(--s900);}',
            '.qida-dash-card-sub{font-size:11px;color:var(--s500);}',
            '.qida-dash-card-conv{background:var(--qg-soft);border-color:var(--qg-soft-border);}',
            '.qida-dash-card-conv .qida-dash-card-num{color:var(--qg);}',
            /* Cards de temperatura: clicables, acento de color en el numero, estado activo */
            '.qida-dash-card-temp{cursor:pointer;transition:background-color .12s;border-bottom-width:3px;border-bottom-color:var(--s200);}',
            '.qida-dash-card-temp:hover{background:var(--s50);}',
            '.qida-card-caliente .qida-dash-card-num{color:#EF4444;}',
            '.qida-card-templado .qida-dash-card-num{color:#F59E0B;}',
            '.qida-card-frio .qida-dash-card-num{color:#3B82F6;}',
            '.qida-dash-card-temp.active .qida-dash-card-label{font-weight:600;color:var(--s800);}',
            '.qida-card-caliente.active{border-bottom-color:#EF4444;background:#fef2f2;}',
            '.qida-card-templado.active{border-bottom-color:#F59E0B;background:#fffbeb;}',
            '.qida-card-frio.active{border-bottom-color:#3B82F6;background:#eff6ff;}',

            /* Toolbar */
            '.qida-dash-toolbar{display:flex;align-items:center;gap:12px;padding:2px 2px 10px;border-bottom:0.5px solid var(--s100);}',
            '.qida-dash-toolbar-left{display:flex;align-items:center;}',
            '.qida-dash-toolbar-center{flex:1;display:flex;justify-content:center;}',
            '.qida-dash-toolbar-right{display:flex;align-items:center;gap:6px;margin-left:auto;}',
            '.qida-dash-filter-btn{display:inline-flex;align-items:center;gap:5px;background:#fff;border:0.5px solid var(--s200);border-radius:8px;padding:6px 12px;font-size:13px;color:var(--s700);cursor:pointer;font-family:inherit;}',
            '.qida-dash-filter-btn:hover{border-color:var(--s400);}',
            '.qida-dash-filter-btn.active{border-color:var(--qg);color:var(--qg);background:var(--qg-soft);}',
            '.qida-dash-clear-btn{display:inline-flex;align-items:center;gap:4px;background:transparent;border:0;color:var(--s500);cursor:pointer;font-family:inherit;font-size:12px;margin-left:8px;}',
            '.qida-dash-clear-btn:hover{color:var(--s800);}',
            '.qida-dash-segments{display:flex;flex-wrap:wrap;gap:6px;padding:10px 2px 2px;}',
            '.qida-seg-chip{background:#fff;border:0.5px solid var(--s200);border-radius:999px;padding:5px 12px;font-size:12px;color:var(--s700);cursor:pointer;font-family:inherit;}',
            '.qida-seg-chip:hover{border-color:var(--s400);}',
            '.qida-seg-chip.active{background:var(--qg);border-color:var(--qg);color:#fff;}',
            '.qida-view-chip{background:#fff;border:0.5px solid var(--s200);border-radius:8px;padding:6px 12px;font-size:13px;color:var(--s700);cursor:pointer;font-family:inherit;}',
            '.qida-view-chip:hover{border-color:var(--s400);}',
            '.qida-view-chip.active{background:var(--qg);border-color:var(--qg);color:#fff;}',
            /* Pill WhatsApp (centro): rojo de alerta, mismo rojo que el badge de urgencia */
            '.qida-wa-pill{display:inline-flex;align-items:center;gap:7px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:999px;padding:5px 14px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;}',
            '.qida-wa-pill:hover{background:#fee2e2;}',
            '.qida-wa-pill.active{background:#dc2626;border-color:#dc2626;color:#fff;}',
            '.qida-wa-pill-dot{width:8px;height:8px;border-radius:50%;background:#dc2626;display:inline-block;}',
            '.qida-wa-pill.active .qida-wa-pill-dot{background:#fff;}',

            /* Tabla (estética admin: fondo blanco, border-bottom sutil, th gris, hover #fafafa).
               grid-template IDENTICO en header y fila (7 cols). El rediseño v1.14 quita color
               de fila / rail / tinte: temperatura, días y estado viven en columnas propias. */
            /* Card contenedor de la tabla (patrón .qida-leader-table-card de admin) */
            '.qida-dash-table-card{margin-top:8px;border:0.5px solid var(--s200);border-radius:10px;overflow:hidden;background:#fff;transition:opacity 160ms;}',
            '.qida-dash-table-card.qida-dash-loading{opacity:.5;pointer-events:none;}',  /* atenuacion entre vistas (no vaciar) */
            '.qida-dash-table-bar{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:0.5px solid var(--s200);}',
            '.qida-dash-table-title{font-size:13px;font-weight:600;color:var(--s800);}',
            '.qida-dash-table-count{font-size:11px;color:var(--s500);}',
            /* IMPORTANTE: grid-template IDENTICO en header y fila. La ultima columna (Acción) es
               FIJA (no auto): si fuera auto, el header (vacío=0) y la fila (botón) repartirían
               distinto los fr y se desalinearían. */
            '.qida-dash-header{display:grid;grid-template-columns:minmax(170px,2fr) 88px minmax(150px,2.2fr) 128px 84px 140px 132px;gap:14px;padding:9px 14px;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--s700);font-weight:500;background:#f3f4f6;border-bottom:0.5px solid var(--s200);}',
            '.qida-dash-list{display:block;}',
            '.qida-dash-row{display:grid;grid-template-columns:minmax(170px,2fr) 88px minmax(150px,2.2fr) 128px 84px 140px 132px;gap:14px;padding:11px 14px;cursor:pointer;align-items:center;transition:background-color .12s;background:#fff;border-bottom:0.5px solid #f3f4f6;}',
            '.qida-dash-row:last-child{border-bottom:0;}',
            '.qida-dash-row:hover{background:#fafafa;}',
            '.qida-dash-row:hover .qida-dash-row-actions{opacity:1;}',
            '.qida-dash-row-actions{opacity:0;transition:opacity .12s;text-align:right;}',

            /* Celda Familia */
            '.qida-cell-familia .qida-cell-line1{display:flex;align-items:center;}',
            '.qida-cell-familia .qida-cell-name{font-weight:500;font-size:13px;color:var(--s900);}',
            '.qida-cell-familia .qida-cell-line2{font-size:12px;color:var(--s600);margin-top:2px;}',
            '.qida-cell-tipo{font-size:12.5px;color:var(--s800);}',
            /* "Por qué" con ellipsis + tooltip (title) para no romper el ancho del modal AF */
            '.qida-cell-porque{font-size:12.5px;color:var(--s700);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',

            /* Columna Temperatura: barrita sólida monocroma + texto (colores admin) */
            '.qida-dash-temp{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--s700);white-space:nowrap;}',
            '.qida-dash-temp-bar{display:inline-block;width:18px;height:8px;border-radius:4px;background:var(--s300);flex-shrink:0;}',
            '.qida-dash-temp-caliente .qida-dash-temp-bar{background:#EF4444;}',
            '.qida-dash-temp-templado .qida-dash-temp-bar{background:#F59E0B;}',
            '.qida-dash-temp-frio .qida-dash-temp-bar{background:#3B82F6;}',
            '.qida-dash-temp-pausa .qida-dash-temp-bar{background:var(--s400);}',

            /* Columna Días: número coloreado por gravedad (texto, no fondo) + fecha corta */
            '.qida-cell-dias .qida-cell-days{font-size:20px;font-weight:500;line-height:1.1;color:var(--s700);}',
            '.qida-cell-days-unit{font-size:11px;font-weight:400;margin-left:3px;opacity:.7;}',
            '.qida-cell-dias .qida-cell-date{font-size:11px;color:var(--s500);margin-top:2px;}',
            '.qida-dash-dias-normal{color:var(--s700);}',
            '.qida-dash-dias-amber{color:#92400E;}',
            '.qida-dash-dias-amber-strong{color:#92400E;font-weight:600;}',
            '.qida-dash-dias-red{color:#991B1B;font-weight:600;}',

            /* Columna Estado: badges admin (apilados). Mismas paletas que .qida-leader-status */
            '.qida-cell-estado{display:flex;flex-direction:column;gap:4px;align-items:flex-start;}',
            '.qida-dash-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:8px;font-size:10.5px;font-weight:500;white-space:nowrap;}',
            '.qida-dash-badge-dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0;}',
            '.qida-dash-badge-new{background:#ECFDF5;color:#047857;}',
            '.qida-dash-badge-urgent{background:#FEF2F2;color:#991B1B;}',

            /* Leyenda explícita debajo de la tabla */
            '.qida-dash-legend{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:12px 12px 0;font-size:11.5px;color:var(--s600);}',
            '.qida-dash-legend-item{display:inline-flex;align-items:center;gap:6px;}',
            '.qida-dash-legend-dot{width:8px;height:8px;border-radius:50%;display:inline-block;}',
            '.qida-dash-legend-sep{width:1px;height:14px;background:var(--s200);display:inline-block;}',
            '.qida-dash-legdot-caliente{background:#EF4444;}',
            '.qida-dash-legdot-templado{background:#F59E0B;}',
            '.qida-dash-legdot-frio{background:#3B82F6;}',
            '.qida-dash-legdot-pausa{background:var(--s400);}',
            '.qida-dash-legdot-new{background:#047857;}',
            '.qida-dash-legdot-urgent{background:#991B1B;}',

            /* Boton "Marcar hecho" (hover) */
            '.qida-mark-done-btn{background:#fff;border:0.5px solid var(--s200);border-radius:8px;padding:6px 10px;font-size:12px;color:#0F6E56;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-family:inherit;white-space:nowrap;}',
            '.qida-mark-done-btn:hover{border-color:#0F6E56;background:#F7FAF8;}',

            /* Boton Refrescar abajo de la lista */
            '.qida-dash-actions{display:flex;justify-content:center;margin-top:16px;}',
            '.qida-refresh-btn{background:transparent;border:0.5px solid var(--s200);border-radius:8px;padding:8px 14px;font-size:13px;color:var(--s900);cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;}',
            '.qida-refresh-btn:hover{border-color:var(--s400);background:var(--s50);}',

            /* Toast de undo (inferior, distinto al toast neutro del shell) */
            '.qida-undo-toast{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);background:#1F2937;color:#fff;padding:10px 16px;border-radius:8px;display:flex;align-items:center;gap:6px;font-size:13px;z-index:10;box-shadow:0 8px 20px rgba(0,0,0,.25);}',
            '.qida-undo-btn{background:transparent;border:0;color:#6EE7B7;cursor:pointer;font-weight:500;padding:0 4px;font-family:inherit;font-size:13px;}',
            '.qida-undo-btn:hover{color:#A7F3D0;}',

            /* Estado vacio */
            '.qida-empty-state{display:flex;align-items:center;justify-content:center;height:200px;color:var(--s700);font-size:14px;}',

            /* Responsive */
            /* Detalle: anchos por posicion estructural. En 760px se oculta la 1ra columna (WA). */
            '@media (max-width:1200px){.qida-detail-body > *:nth-child(1){flex:0 0 26%;}.qida-detail-body > *:nth-child(3){flex:0 0 30%;}}',
            '@media (max-width:980px){.qida-detail-body > *:nth-child(3){display:none;}}',
            '@media (max-width:760px){.qida-detail-body > *:nth-child(1){display:none;}.qida-context-grid{grid-template-columns:1fr;}.qida-dsh-meta{display:none;}}',
            /* v1.14 dashboard AF responsive: a 1100px se oculta "Tipo" (6 cols); a 980px se oculta
               la fecha-sub de Días y las cards apilan; a 760px se compacta la grilla. */
            '@media (max-width:1100px){.qida-dash-header,.qida-dash-row{grid-template-columns:minmax(150px,2fr) minmax(140px,2fr) 116px 80px 132px 124px;}.qida-dash-header > div:nth-child(2){display:none;}.qida-cell-tipo{display:none;}}',
            '@media (max-width:980px){.qida-cell-dias .qida-cell-date{display:none;}.qida-dash-cards{flex-direction:column;gap:10px;}}',
            '@media (max-width:760px){.qida-dash-header,.qida-dash-row{grid-template-columns:minmax(110px,1.6fr) minmax(100px,1.5fr) 86px 64px 110px 112px;gap:10px;}}',

            /* ============================================================ */
            /* v1.12: PANEL DE LIDERES                                       */
            /* ============================================================ */
            /* Badge leader (apilado encima del badge AF) */
            '.qida-leader-badge{position:fixed;bottom:110px;left:24px;z-index:2147483000;width:60px;height:60px;border-radius:50%;cursor:pointer;background:#1F2937;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(31,41,55,.32),0 2px 4px rgba(31,41,55,.16);transition:transform .18s ease,box-shadow .18s ease;user-select:none;-webkit-tap-highlight-color:transparent;font-family:"Manrope",system-ui,sans-serif;}',
            '.qida-leader-badge:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(31,41,55,.38),0 4px 8px rgba(31,41,55,.18);}',

            /* Dashboard layout */
            /* Dashboard layout */
            '.qida-leader-dash{display:flex;flex-direction:column;flex:1;max-height:calc(92vh - 70px)!important;min-height:0;overflow-y:auto!important;background:#f9fafb;padding:20px 24px;gap:18px;}',
            '.qida-shell.qida-view-leaders .qida-leader-dash{min-height:100%;max-height:none!important;overflow:visible!important;}',
            /* v1.12.1: toolbar plano en una sola fila. Exportar a la derecha via margin-left:auto. */
            '.qida-leader-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}',
            '.qida-leader-select{background:#fff;border:0.5px solid var(--s300);border-radius:8px;padding:7px 10px;font-family:inherit;font-size:13px;color:var(--s800);cursor:pointer;outline:none;max-width:240px;}',
            '.qida-leader-select:focus{border-color:#3B82F6;}',
            '.qida-leader-search-wrap{position:relative;display:inline-flex;align-items:center;flex:0 0 auto;}',
            '.qida-leader-search-wrap .qa-icon{position:absolute;left:10px;color:var(--s500);pointer-events:none;}',
            '.qida-leader-search{background:#fff;border:0.5px solid var(--s300);border-radius:8px;padding:7px 10px 7px 32px;font-family:inherit;font-size:13px;color:var(--s800);outline:none;min-width:220px;max-width:260px;}',
            '.qida-leader-search:focus{border-color:#3B82F6;}',
            '.qida-leader-export-btn{background:#1F2937;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;margin-left:auto;}',
            '.qida-leader-export-btn:hover{background:#111827;}',

            /* KPI cards */
            '.qida-leader-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}',
            '.qida-leader-kpi{background:#fff;border:0.5px solid var(--s200);border-radius:10px;padding:14px 16px;}',
            '.qida-leader-kpi-label{font-size:11px;font-weight:500;color:var(--s500);text-transform:uppercase;letter-spacing:.05em;}',
            '.qida-leader-kpi-value{font-family:"Fraunces",Georgia,serif;font-feature-settings:"ss01";font-weight:600;font-size:28px;color:var(--s900);margin-top:4px;line-height:1.1;}',
            /* v1.12.1: kpi-sub reemplaza al kpi-delta. Sin colores up/down/flat, solo gris. */
            '.qida-leader-kpi-sub{font-size:11px;color:var(--s500);margin-top:4px;}',

            /* Charts row */
            '.qida-leader-charts{display:grid;grid-template-columns:1fr 1.6fr;gap:12px;}',
            '.qida-leader-chart-card{background:#fff;border:0.5px solid var(--s200);border-radius:10px;padding:14px 16px;min-height:280px;display:flex;flex-direction:column;}',
            /* v1.12.1: head del chart card con titulo a la izq + pills a la derecha */
            '.qida-leader-chart-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;}',
            '.qida-leader-chart-title{font-size:13px;font-weight:600;color:var(--s800);}',
            '.qida-leader-chart-sub{font-size:11px;color:var(--s500);margin-bottom:8px;}',
            '.qida-leader-chart-mount{flex:1;min-height:220px;display:flex;align-items:center;justify-content:center;}',
            '.qida-leader-chart-fallback{font-size:12px;color:var(--s500);text-align:center;padding:16px;line-height:1.5;}',
            /* v1.12.1: pills toggle metrica de tendencia */
            '.qida-leader-pills{display:inline-flex;gap:2px;background:var(--s100);padding:3px;border-radius:8px;}',
            '.qida-leader-pill{background:transparent;border:0;padding:4px 10px;border-radius:6px;font-family:inherit;font-size:11px;font-weight:500;color:var(--s700);cursor:pointer;transition:background .12s,color .12s;}',
            '.qida-leader-pill:hover{color:var(--s900);}',
            '.qida-leader-pill.active{background:#3B82F6;color:#fff;}',

            /* Tabla AFs */
            '.qida-leader-table-card{background:#fff;border:0.5px solid var(--s200);border-radius:10px;overflow:hidden;}',
            '.qida-leader-table-head-bar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:0.5px solid var(--s200);}',
            '.qida-leader-table-title{font-size:13px;font-weight:600;color:var(--s800);}',
            '.qida-leader-table-count{font-size:11px;color:var(--s500);}',
            '.qida-leader-table-wrap{overflow-x:auto;}',
            '.qida-leader-table{width:100%;border-collapse:collapse;font-size:12.5px;}',
            '.qida-leader-table th{background:#f3f4f6;color:var(--s700);font-weight:500;text-transform:uppercase;font-size:10.5px;letter-spacing:.04em;padding:9px 12px;text-align:left;border-bottom:0.5px solid var(--s200);white-space:nowrap;cursor:pointer;user-select:none;}',
            '.qida-leader-table th:hover{background:#e5e7eb;}',
            '.qida-leader-table th.qida-leader-th-sorted{color:#3B82F6;}',
            '.qida-leader-table th .qa-icon{margin-left:4px;vertical-align:middle;}',
            '.qida-leader-table td{padding:10px 12px;border-bottom:0.5px solid #f3f4f6;color:var(--s800);vertical-align:middle;}',
            '.qida-leader-table tr:last-child td{border-bottom:0;}',
            '.qida-leader-table tr:hover td{background:#fafafa;}',
            '.qida-leader-af-cell{display:flex;align-items:center;gap:8px;}',
            '.qida-leader-avatar{width:28px;height:28px;border-radius:50%;background:var(--s100);color:var(--s700);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;}',
            '.qida-leader-af-name{font-weight:500;color:var(--s900);}',
            '.qida-leader-loc-badge{display:inline-block;padding:2px 7px;border-radius:6px;font-size:10.5px;font-weight:600;letter-spacing:.02em;}',
            '.qida-leader-loc-MAD{background:#EFF6FF;color:#1D4ED8;}',
            '.qida-leader-loc-CAT{background:#FEF3C7;color:#92400E;}',
            /* v1.12.1: 3 localidades nuevas */
            '.qida-leader-loc-BIL{background:#F0FDF4;color:#166534;}',
            '.qida-leader-loc-VAL{background:#FFF1F2;color:#9F1239;}',
            '.qida-leader-loc-COR{background:#F5F3FF;color:#5B21B6;}',
            '.qida-leader-temp-bar{display:flex;width:88px;height:8px;border-radius:4px;overflow:hidden;background:var(--s100);}',
            '.qida-leader-temp-hot{background:#EF4444;}',
            '.qida-leader-temp-warm{background:#F59E0B;}',
            '.qida-leader-temp-cold{background:#3B82F6;}',
            '.qida-leader-temp-cell{display:flex;align-items:center;gap:8px;}',
            '.qida-leader-temp-nums{font-size:10.5px;color:var(--s500);white-space:nowrap;}',
            '.qida-leader-status{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:8px;font-size:10.5px;font-weight:500;}',
            '.qida-leader-status-ok{background:#ECFDF5;color:#047857;}',
            '.qida-leader-status-attention{background:#FFFBEB;color:#92400E;}',
            '.qida-leader-status-overload{background:#FEF2F2;color:#991B1B;}',
            '.qida-leader-status-dot{width:6px;height:6px;border-radius:50%;background:currentColor;}',
            '.qida-leader-conv{font-variant-numeric:tabular-nums;font-weight:500;}',
            '.qida-leader-empty-row{padding:24px 16px;text-align:center;color:var(--s500);font-size:13px;}',

            /* Responsive panel de lideres */
            '@media (max-width:980px){.qida-leader-kpis{grid-template-columns:repeat(2,1fr);}.qida-leader-charts{grid-template-columns:1fr;}}',
            '@media (max-width:680px){.qida-leader-search{min-width:140px;}.qida-leader-kpis{grid-template-columns:1fr;}}',

            /* ============================================================ */
            /* v1.15: ASISTENTE CONFIGURABLE — "Armá tu asistente"           */
            /* ============================================================ */
            /* Botón de acceso en el shell header (dashboard) */
            '.qida-ab-open-btn{display:inline-flex;align-items:center;gap:5px;background:transparent;border:0.5px solid var(--s200);border-radius:8px;padding:5px 10px;font-size:12px;color:var(--qg);cursor:pointer;font-family:inherit;font-weight:500;}',
            '.qida-ab-open-btn:hover{border-color:var(--qg);background:var(--qg-soft);}',
            /* Pantalla */
            '.qida-ab{position:relative;flex:1;overflow-y:auto;background:#fff;padding:20px 16px;}',
            '.qida-ab-inner{max-width:720px;margin:0 auto;}',
            '.qida-ab-lead{font-size:13px;color:var(--s600);line-height:1.5;margin:0 0 16px;}',
            '.qida-ab-list{display:flex;flex-direction:column;gap:10px;}',
            '.qida-ab-row{border:0.5px solid var(--s200);border-radius:10px;padding:12px;background:#fff;}',
            '.qida-ab-row.has-error{border-color:#fca5a5;}',
            '.qida-ab-fields{display:grid;grid-template-columns:1fr 140px 150px auto;gap:10px;align-items:end;}',
            '.qida-ab-field{display:flex;flex-direction:column;gap:4px;}',
            '.qida-ab-label{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--s500);display:inline-flex;align-items:center;gap:3px;}',
            '.qida-ab-label .qa-icon{color:var(--s400);cursor:help;}',
            '.qida-ab-input{background:#fff;border:0.5px solid var(--s300);border-radius:8px;padding:7px 10px;font-family:inherit;font-size:13px;color:var(--s900);outline:none;width:100%;box-sizing:border-box;}',
            '.qida-ab-input:focus{border-color:var(--qg);}',
            '.qida-ab-select{max-width:none;width:100%;}',
            '.qida-ab-remove{background:transparent;border:0.5px solid var(--s200);border-radius:8px;padding:7px;color:var(--s500);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;height:34px;}',
            '.qida-ab-remove:hover:not([disabled]){border-color:#fca5a5;color:#991B1B;background:#FEF2F2;}',
            '.qida-ab-remove[disabled]{opacity:.4;cursor:not-allowed;}',
            '.qida-ab-error{font-size:11.5px;color:#991B1B;margin:8px 0 0;}',
            '.qida-ab-general-error{font-size:12px;color:#991B1B;margin:12px 0 0;}',
            '.qida-ab-add{margin-top:12px;}',
            '.qida-ab-add[disabled]{opacity:.5;cursor:not-allowed;}',
            '.qida-ab-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:16px;border-top:0.5px solid var(--s100);}',
            '.qida-btn-primary[disabled]{opacity:.5;cursor:not-allowed;}',
            /* Confirm "¿Descartar cambios?" */
            '.qida-ab-confirm-overlay{position:absolute;inset:0;background:rgba(28,25,23,.35);display:flex;align-items:center;justify-content:center;z-index:20;}',
            '.qida-ab-confirm{background:#fff;border-radius:12px;padding:20px;max-width:320px;width:90%;box-shadow:0 16px 40px rgba(0,0,0,.25);}',
            '.qida-ab-confirm-title{font-size:15px;font-weight:600;color:var(--s900);margin:0 0 6px;}',
            '.qida-ab-confirm-sub{font-size:12.5px;color:var(--s600);margin:0 0 16px;}',
            '.qida-ab-confirm-actions{display:flex;justify-content:flex-end;gap:8px;}',
            '.qida-ab-discard-btn{background:#dc2626;}',
            '.qida-ab-discard-btn:hover{background:#b91c1c;}',
            '@media (max-width:680px){.qida-ab-fields{grid-template-columns:1fr 1fr auto;}.qida-ab-field-name{grid-column:1 / -1;}}'
        ].join('');

        var style = document.createElement('style');
        style.id = 'qida-assistant-styles';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    // ============================================================
    // RENDER: dashboard v1.10 (lista de leads enfriandose - vista unica)
    // ============================================================
    // v1.10: renderCoverage / renderCoverageSection / renderUnifiedTable /
    //   renderUnifiedRow / renderSortHeader / renderDays / renderTempBadge / renderUrg /
    //   renderAssistant{Pill,Expanded,HeaderChip,Panel} ELIMINADAS.
    //   El dashboard pasa a una vista unica enfocada: maximo 5 leads enfriandose,
    //   sin tabs, sin filtros, sin asistente.
    // ============================================================
    // v1.13: helpers del dashboard AF
    // ============================================================
    var MONTHS_ES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    // Normaliza temperatura a 'caliente'|'templado'|'frio'|'pausa' (acepta 'frío' con acento).
    function normalizeTemp(t) {
        if (!t) return '';
        var s = String(t).toLowerCase();
        if (s.indexOf('cali') > -1) return 'caliente';
        if (s.indexOf('templ') > -1) return 'templado';
        if (s.indexOf('fr') > -1) return 'frio';   // frio / frío
        if (s.indexOf('paus') > -1) return 'pausa';
        return s;
    }

    // Normaliza urgencia a 'alta'|'media'|'baja'|null. Acepta el vocabulario nuevo
    //   (alta/media/baja) Y el del detalle (Muy urgente/Urgente/Estandar).
    //   TODO: unificar vocabulario de urgencia con el detalle cuando aterrice el backend F3.
    function normalizeUrgency(u) {
        if (!u) return null;
        var s = String(u).toLowerCase();
        if (s === 'alta' || s.indexOf('muy urgente') > -1) return 'alta';
        if (s === 'media' || s === 'urgente') return 'media';
        if (s === 'baja' || s.indexOf('estandar') > -1 || s.indexOf('estándar') > -1) return 'baja';
        return null;
    }

    function priorityRank(row) {
        var u = normalizeUrgency(row.urgency);
        return u === 'alta' ? 3 : u === 'media' ? 2 : u === 'baja' ? 1 : 0;
    }

    function formatShortDate(iso) {
        if (!iso) return '';
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
        if (!m) return iso;
        return parseInt(m[3], 10) + ' ' + (MONTHS_ES_SHORT[parseInt(m[2], 10) - 1] || '');
    }

    // Vista activa menos los completados en sesion (state.completedTodayIds es global por id).
    function liveDashRows() {
        var rows = state.dashRows || [];
        var out = [];
        for (var i = 0; i < rows.length; i++) {
            if (state.completedTodayIds && state.completedTodayIds.has(rows[i].id)) continue;
            out.push(rows[i]);
        }
        return out;
    }

    function matchesSegment(row, seg) {
        if (!seg) return true;
        switch (seg) {
            case 'caliente':
            case 'templado':
            case 'frio':
            case 'pausa':     return normalizeTemp(row.temperature) === seg;
            case 'urgente':   return normalizeUrgency(row.urgency) === 'alta';
            case 'historico': return !!row.historico;
            default: return true;
        }
    }

    function countByTemp(rows, temp) {
        var n = 0;
        for (var i = 0; i < rows.length; i++) if (normalizeTemp(rows[i].temperature) === temp) n++;
        return n;
    }

    // Filtros client-side (segmento AND pill WhatsApp) + agrupado "mensajes nuevos al tope"
    //   (sort por urgencia desc + dias desc) + resto en orden del endpoint + slice MAX_VISIBLE.
    function buildDashFeed(base) {
        var filtered = [];
        for (var i = 0; i < base.length; i++) {
            var r = base[i];
            if (!matchesSegment(r, state.dashSegment)) continue;
            if (state.dashOnlyNew && !r.hasNewMessage) continue;
            filtered.push(r);
        }
        var news = [], rest = [];
        for (var j = 0; j < filtered.length; j++) {
            if (filtered[j].hasNewMessage) news.push(filtered[j]); else rest.push(filtered[j]);
        }
        news.sort(function (a, b) {
            var pr = priorityRank(b) - priorityRank(a);
            if (pr !== 0) return pr;
            return b.daysWithoutTouch - a.daysWithoutTouch;
        });
        return news.concat(rest).slice(0, MAX_VISIBLE);
    }

    // Cambio de vista (chip) o Refrescar. resetFilters=true solo en cambio de vista.
    //   MVP: refresh manual del badge WhatsApp (boton Refrescar o cambio de vista).
    //   TODO: evaluar polling cada 30-60s o push (SignalR/SSE) en iteracion siguiente.
    //   La logica de marcar como leido la maneja el backend al abrir el detalle del lead.
    function loadDashView(view, resetFilters) {
        state.dashView = view;
        if (resetFilters) {
            state.dashSegment = null;
            state.dashOnlyNew = false;
        }
        state.dashLoading = true;
        rerenderContent();  // mantiene la tabla previa atenuada mientras vuelve el fetch
        DashboardService.fetchView(view).then(function (rows) {
            if (state.dashView !== view) return;  // race guard: cambio de vista mientras cargaba
            state.dashRows = rows;
            state.dashLoading = false;
            rerenderContent();
        });
    }

    // ============================================================
    // v1.13: render del dashboard AF
    // ============================================================
    function renderDashboard() {
        // Primer paint sincrono: si la vista activa no tiene datos y no estamos cargando,
        //   leemos el mock sync para no mostrar tabla vacia en el primer render.
        if (state.dashRows === null && !state.dashLoading) {
            state.dashRows = DashboardService.fetchViewSync(state.dashView);
        }

        var base = liveDashRows();          // vista activa menos completados en sesion
        var ordered = buildDashFeed(base);  // filtros + nuevos al tope + sort + slice

        var listHtml;
        if (ordered.length === 0) {
            listHtml = renderEmptyState();
        } else {
            listHtml = '';
            // v1.14: el sort "mensajes nuevos al tope" se mantiene; el divider visual se elimina
            //   (la columna Estado con el badge "Mensaje nuevo" ya cumple esa función).
            for (var i = 0; i < ordered.length; i++) listHtml += renderDashRow(ordered[i]);
        }

        // v1.14.1: tabla encapsulada en card con borde (patrón .qida-leader-table-card).
        var DASH_VIEW_TITLES = { suggestions: 'Sugerencias para hoy', activities: 'Actividades programadas', leads: 'Todos los leads' };
        var tableTitle = DASH_VIEW_TITLES[state.dashView] || 'Leads';
        var countLabel = ordered.length + (ordered.length === 1 ? ' lead' : ' leads');
        var cardCls = 'qida-dash-table-card' + (state.dashLoading ? ' qida-dash-loading' : '');

        return '<div class="qida-dash-dashboard">'
            + renderDashCards(base)
            + renderDashToolbar(base)
            + '<div class="' + cardCls + '">'
                + '<div class="qida-dash-table-bar">'
                    + '<span class="qida-dash-table-title">' + esc(tableTitle) + '</span>'
                    + '<span class="qida-dash-table-count">' + countLabel + '</span>'
                + '</div>'
                + renderDashHeader()
                + '<div class="qida-dash-list">' + listHtml + '</div>'
            + '</div>'
            + renderDashLegend()
            + '<div class="qida-dash-actions">'
                + '<button class="qida-refresh-btn" data-action="dash-refresh">'
                    + icon('refresh-cw', 14) + ' Refrescar'
                + '</button>'
            + '</div>'
            + renderUndoToast()
        + '</div>';
    }

    // Banda superior: 2 grupos con label (estética .qida-leader-kpi del Panel de Líderes).
    //   "TU IMPACTO" = Convertidos (display-only, no filtra). "CARTERA ACTIVA" = 3 cards de
    //   temperatura clicables (escriben state.dashSegment, igual que los chips de Filtros).
    function renderDashCards(base) {
        // "Convertidos": valor mock, display-only.
        // TODO: conectar con endpoint cuando esté disponible (GET /api/me/leads/converted?period=current_month).
        var convertidos = 7;
        return '<div class="qida-dash-cards">'
            + '<div class="qida-dash-cardgroup">'
                + '<div class="qida-dash-cardgroup-label">Tu impacto</div>'
                + '<div class="qida-dash-cardgroup-cards">'
                    + '<div class="qida-dash-card qida-dash-card-conv">'
                        + '<div class="qida-dash-card-label">Convertidos</div>'
                        + '<div class="qida-dash-card-num">' + convertidos + '</div>'
                        + '<div class="qida-dash-card-sub">este mes</div>'
                    + '</div>'
                + '</div>'
            + '</div>'
            + '<div class="qida-dash-cardgroup qida-dash-cardgroup-grow">'
                + '<div class="qida-dash-cardgroup-label">Cartera activa</div>'
                + '<div class="qida-dash-cardgroup-cards qida-dash-cardgroup-temps">'
                    + renderDashCard('caliente', 'Calientes', countByTemp(base, 'caliente'))
                    + renderDashCard('templado', 'Templados', countByTemp(base, 'templado'))
                    + renderDashCard('frio',     'Fríos',     countByTemp(base, 'frio'))
                + '</div>'
            + '</div>'
        + '</div>';
    }

    function renderDashCard(seg, label, count) {
        var active = (state.dashSegment === seg);
        return '<button class="qida-dash-card qida-dash-card-temp qida-card-' + seg + (active ? ' active' : '') + '" '
            + 'data-action="dash-set-temp" data-id="' + seg + '" aria-pressed="' + (active ? 'true' : 'false') + '">'
            + '<div class="qida-dash-card-label">' + esc(label) + '</div>'
            + '<div class="qida-dash-card-num">' + count + '</div>'
        + '</button>';
    }

    function renderDashToolbar(base) {
        var segActive = !!state.dashSegment;
        var anyFilter = segActive || state.dashOnlyNew;
        var filterBtn = '<button class="qida-dash-filter-btn' + (state.dashFiltersExpanded || segActive ? ' active' : '') + '" data-action="dash-toggle-filters">'
            + icon('filter', 13) + ' Filtros' + (segActive ? ' (1)' : '') + '</button>';
        // v1.14: affordance explicita para limpiar filtros (resuelve el bug de "no se puede
        //   quitar el filtro"). Solo visible cuando hay algun filtro activo (segmento o pill).
        var clearBtn = anyFilter
            ? '<button class="qida-dash-clear-btn" data-action="dash-clear-filters">' + icon('x', 12) + ' Quitar filtros</button>'
            : '';
        return '<div class="qida-dash-toolbar">'
            + '<div class="qida-dash-toolbar-left">' + filterBtn + clearBtn + '</div>'
            + '<div class="qida-dash-toolbar-center">' + renderWhatsappPill(base) + '</div>'
            + '<div class="qida-dash-toolbar-right">' + renderViewChips() + '</div>'
        + '</div>'
        + (state.dashFiltersExpanded ? '<div class="qida-dash-segments">' + renderFilterChips() + '</div>' : '');
    }

    // Chips de segmento (recuperados de 7f052fc). El chip de frio usa el mismo id 'frio' que la
    //   card "Fríos" (un solo estado de frio; el rotulo "reactivar" es solo UX).
    function renderFilterChips() {
        var chips = [
            { id: 'caliente',  label: 'Caliente' },
            { id: 'templado',  label: 'Templado' },
            { id: 'frio',      label: 'Frío · reactivar' },
            { id: 'pausa',     label: 'Pausa' },
            { id: 'urgente',   label: 'Urgente' },
            { id: 'historico', label: 'Histórico' }
        ];
        var html = '';
        for (var i = 0; i < chips.length; i++) {
            var active = (state.dashSegment === chips[i].id);
            html += '<button class="qida-seg-chip' + (active ? ' active' : '') + '" data-action="dash-set-segment" data-id="' + chips[i].id + '">' + esc(chips[i].label) + '</button>';
        }
        return html;
    }

    // Pill central de WhatsApp. N = cantidad de LEADS con mensaje nuevo (no suma de mensajes).
    //   Solo visible si N>0. Filtra la tabla a esos leads (AND con el segmento activo).
    function renderWhatsappPill(base) {
        var n = 0;
        for (var i = 0; i < base.length; i++) if (base[i].hasNewMessage) n++;
        if (n === 0) return '';
        var label = n + (n === 1 ? ' lead con mensaje nuevo' : ' leads con mensaje nuevo');
        return '<button class="qida-wa-pill' + (state.dashOnlyNew ? ' active' : '') + '" data-action="dash-toggle-new">'
            + '<span class="qida-wa-pill-dot"></span> ' + label + '</button>';
    }

    // 3 chips de vista. Al cambiar = fetch al endpoint correspondiente (no re-filtro client-side).
    function renderViewChips() {
        var views = [
            { id: 'suggestions', label: 'Sugerencias' },
            { id: 'activities',  label: 'Actividades' },
            { id: 'leads',       label: 'Leads' }
        ];
        var html = '';
        for (var i = 0; i < views.length; i++) {
            var active = (state.dashView === views[i].id);
            html += '<button class="qida-view-chip' + (active ? ' active' : '') + '" data-action="dash-set-view" data-id="' + views[i].id + '">' + esc(views[i].label) + '</button>';
        }
        return html;
    }

    function renderDashHeader() {
        return '<div class="qida-dash-header">'
            + '<div>Familia</div>'
            + '<div>Tipo</div>'
            + '<div>Por que</div>'
            + '<div>Temp</div>'
            + '<div>Sin contacto</div>'
            + '<div>Estado</div>'
            + '<div></div>'
        + '</div>';
    }

    // v1.14: metadata de temperatura (label + clase). Incluye 'pausa' (gris neutro).
    var TEMP_META = {
        caliente: { label: 'Caliente', cls: 'caliente' },
        templado: { label: 'Templado', cls: 'templado' },
        frio:     { label: 'Frío',     cls: 'frio' },
        pausa:    { label: 'Pausa',    cls: 'pausa' }
    };

    // Columna Temperatura: barrita sólida monocroma + texto (patrón badge-localidad de admin).
    function renderTempCell(temp) {
        var meta = TEMP_META[normalizeTemp(temp)];
        if (!meta) return '<div class="qida-dash-cell qida-cell-temp"></div>';
        return '<div class="qida-dash-cell qida-cell-temp">'
            + '<span class="qida-dash-temp qida-dash-temp-' + meta.cls + '">'
                + '<i class="qida-dash-temp-bar"></i>' + esc(meta.label)
            + '</span>'
        + '</div>';
    }

    // Nivel de color para "Días". Capeo: si urgencia alta, el máximo es ámbar-fuerte (nunca rojo)
    //   -> el único rojo de la fila es el badge "Urgente" de la columna Estado.
    function diasLevel(days, urg) {
        var lvl = (days <= 3) ? 'normal' : (days <= 7) ? 'amber' : (days <= 14) ? 'amber-strong' : 'red';
        if (urg === 'alta' && lvl === 'red') lvl = 'amber-strong';
        return lvl;
    }

    // Columna Días desde último contacto: número coloreado por gravedad (texto, no fondo) +
    //   fecha corta debajo (se oculta en @980px). Sin icono de alerta (el color comunica).
    function renderDiasCell(row) {
        var lvl = diasLevel(row.daysWithoutTouch, normalizeUrgency(row.urgency));
        return '<div class="qida-dash-cell qida-cell-dias">'
            + '<div class="qida-cell-days qida-dash-dias-' + lvl + '">' + row.daysWithoutTouch + '<span class="qida-cell-days-unit">' + (row.daysWithoutTouch === 1 ? 'día' : 'días') + '</span></div>'
            + '<div class="qida-cell-date">' + esc(formatShortDate(row.lastTouchDate)) + '</div>'
        + '</div>';
    }

    // Columna Estado: badges admin (apilados). Verde "Mensaje nuevo" (+contador si >1) y/o rojo
    //   "Urgente" (solo urgency alta). Vacía si no aplica ninguno.
    function renderEstadoCell(row) {
        var badges = '';
        if (row.hasNewMessage) {
            var cnt = (row.unreadMessagesCount > 1) ? ' ' + row.unreadMessagesCount : '';
            badges += '<span class="qida-dash-badge qida-dash-badge-new"><span class="qida-dash-badge-dot"></span>Mensaje nuevo' + cnt + '</span>';
        }
        if (normalizeUrgency(row.urgency) === 'alta') {
            badges += '<span class="qida-dash-badge qida-dash-badge-urgent"><span class="qida-dash-badge-dot"></span>Urgente</span>';
        }
        return '<div class="qida-dash-cell qida-cell-estado">' + badges + '</div>';
    }

    // Leyenda explícita debajo de la tabla (4 temperaturas + 2 estados). Reusa el patrón
    //   dot+label de admin con los colores exactos del sistema visual del Panel de Líderes.
    function renderDashLegend() {
        function item(cls, label) {
            return '<span class="qida-dash-legend-item"><span class="qida-dash-legend-dot qida-dash-legdot-' + cls + '"></span>' + esc(label) + '</span>';
        }
        return '<div class="qida-dash-legend">'
            + item('caliente', 'Caliente') + item('templado', 'Templado') + item('frio', 'Frío') + item('pausa', 'Pausa')
            + '<span class="qida-dash-legend-sep"></span>'
            + item('new', 'Mensaje nuevo') + item('urgent', 'Urgente')
        + '</div>';
    }

    // Una fila del dashboard. row es la shape comun de los 3 endpoints (id, familyName, city,
    //   caregiverInfo, serviceType, reason, daysWithoutTouch, lastTouchDate, temperature,
    //   urgency, hasNewMessage, unreadMessagesCount). Los ids reusan MOCK_LEADS -> el detalle
    //   (select-lead) resuelve contra datos reales.
    // v1.14: paradigma "explicitar en columnas". La fila ya NO codifica con fondo/rail/tinte;
    //   temperatura, días y estado viven en columnas propias. Fondo blanco (estética admin).
    function renderDashRow(row) {
        var cg = row.caregiverInfo || {};
        var line2 = esc(((cg.relation || '') + ' ' + (cg.name || '')).trim()) + (cg.age != null ? ', ' + cg.age + ' anos' : '');
        var reason = row.reason || 'Sin actividad reciente';

        return '<div class="qida-dash-row" data-action="select-lead" data-id="' + esc(row.id) + '">'

            + '<div class="qida-dash-cell qida-cell-familia">'
                + '<div class="qida-cell-line1"><span class="qida-cell-name">' + esc(row.familyName) + ' &middot; ' + esc(row.city) + '</span></div>'
                + '<div class="qida-cell-line2">' + line2 + '</div>'
            + '</div>'

            + '<div class="qida-dash-cell qida-cell-tipo">' + esc(row.serviceType) + '</div>'

            // "Por qué" con ellipsis + tooltip (title) para no romper el ancho del modal AF.
            + '<div class="qida-dash-cell qida-cell-porque" title="' + esc(reason) + '">' + esc(reason) + '</div>'

            + renderTempCell(row.temperature)
            + renderDiasCell(row)
            + renderEstadoCell(row)

            + '<div class="qida-dash-row-actions">'
                + '<button class="qida-mark-done-btn" data-action="mark-done" data-id="' + esc(row.id) + '" data-stop>'
                    + icon('check', 14) + ' Marcar hecho'
                + '</button>'
            + '</div>'
        + '</div>';
    }

    function renderEmptyState() {
        // v1.13: el copy depende del filtro activo (segmento/pill) vs vista vacia.
        var msg = (state.dashSegment || state.dashOnlyNew)
            ? 'No hay leads que coincidan con el filtro.'
            : 'Estás al día. No hay leads en esta vista.';
        return '<div class="qida-empty-state">' + msg + '</div>';
    }

    function renderUndoToast() {
        if (!state.undoToast) return '';
        return '<div class="qida-undo-toast">'
            + icon('check', 16) + ' Marcado como hecho &middot; '
            + '<button data-action="undo-mark-done" class="qida-undo-btn">Deshacer</button>'
        + '</div>';
    }

    // ============================================================
    // RENDER: detail blocks (v1.7 cards)
    // ============================================================
    // v1.11: helper de skeleton para cards en loading. Anchos w90/w70/w50 alternan para
    //   romper el patron visual. n por defecto = 3.
    function renderSkeletonLines(n) {
        var count = n || 3;
        var widths = ['w90', 'w70', 'w50', 'w90', 'w70'];
        var out = '';
        for (var i = 0; i < count; i++) {
            out += '<span class="qida-skeleton-line ' + widths[i % widths.length] + '"></span>';
        }
        return out;
    }

    function infoCard(title, actionsHtml, bodyHtml) {
        return '<div class="qida-info-card">'
            + '<div class="qida-info-card-head">'
                + '<span class="qida-info-card-title">' + title + '</span>'
                + (actionsHtml ? '<span class="qida-info-card-actions">' + actionsHtml + '</span>' : '')
            + '</div>'
            + (bodyHtml ? '<div class="qida-info-card-body">' + bodyHtml + '</div>' : '')
        + '</div>';
    }

    function renderIaSummary(lead) {
        var s = getIaSummary(lead.id);
        var title = icon('sparkles', 12) + ' Resumen IA';

        if (state.editingIaSummary && s) {
            return infoCard(title, 'Editando manualmente',
                '<textarea class="qida-ia-textarea" data-input="ia-summary-edit" id="qida-ia-edit">' + esc(s.text) + '</textarea>'
                + '<div class="qida-ia-actions">'
                    + '<button class="qida-btn-ghost" data-action="save-ia-summary">' + icon('check', 12) + ' Guardar</button>'
                    + '<button class="qida-btn-ghost" data-action="cancel-ia-summary">Cancelar</button>'
                + '</div>'
            );
        }

        var actions = '';
        if (s) {
            if (s.editedBy) actions += 'Editado por ' + esc(s.editedBy);
            else actions += 'Generado hace ' + esc(s.generatedAt ? s.generatedAt.replace(/^Hace\s+/i, '') : '?');
            actions += ' &middot; <button class="qida-link-btn" data-action="edit-ia-summary">' + icon('edit', 10) + ' Editar</button>'
                     + ' &middot; <button class="qida-link-btn muted" data-action="regen-ia-summary">' + icon('refresh', 10) + ' Regenerar</button>';
        }

        var body;
        if (s) {
            body = '<div class="qida-info-card-highlight"><p class="qida-ia-text">' + esc(s.text) + '</p></div>';
        } else {
            body = '<p class="qida-ia-empty">Resumen no generado todavia para este lead.</p>'
                + '<div class="qida-ia-actions"><button class="qida-btn-ghost" data-action="regen-ia-summary">' + icon('sparkles', 12) + ' Generar resumen</button></div>';
        }

        return infoCard(title, actions, body);
    }

    // v1.16: "Análisis IA". Mismo patrón visual que renderIaSummary (header ✨ + acción
    //   Generar/Regenerar + "Generado hace X" + body). Sin edición inline ni backend:
    //   Generar/Regenerar hacen console.log (preparación de UI; se conectará después).
    function renderIaAnalysis(lead) {
        var a = getIaAnalysis(lead.id);
        var title = icon('sparkles', 12) + ' Análisis IA';

        var actions = '';
        if (a) {
            if (a.editedBy) actions += 'Editado por ' + esc(a.editedBy);
            else actions += 'Generado hace ' + esc(a.generatedAt ? a.generatedAt.replace(/^Hace\s+/i, '') : '?');
            actions += ' &middot; <button class="qida-link-btn muted" data-action="regen-ia-analysis">' + icon('refresh', 10) + ' Regenerar</button>';
        }

        var body;
        if (a) {
            body = '<div class="qida-info-card-highlight"><p class="qida-ia-text">' + esc(a.text) + '</p></div>';
        } else {
            body = '<p class="qida-ia-empty">Análisis no generado todavía para este lead.</p>'
                + '<div class="qida-ia-actions"><button class="qida-btn-ghost" data-action="regen-ia-analysis">' + icon('sparkles', 12) + ' Generar análisis</button></div>';
        }

        return infoCard(title, actions, body);
    }

    function renderCare(lead, cached) {
        var title = icon('users', 12) + ' Contexto del cuidado';

        // v1.11: skeleton si _loading.
        if (cached && cached._loading) {
            return infoCard(title, '', renderSkeletonLines(4));
        }
        // v1.11: error parcial (allSettled fallo en este dataset).
        if (cached && cached._errors && cached._errors[0] && cached.caredPerson === null) {
            return infoCard(title, '', '<p class="qida-empty-notes" title="' + esc(cached._errors[0]) + '">No se pudo cargar esta seccion.</p>');
        }

        // v1.11: leer del cache si esta; fallback al mock crudo si cached === null (modo
        //   dev defensivo: si por alguna razon nunca corrio fetchAll, comportamiento v1.10.0).
        var c = (cached && cached.caredPerson) || MOCK_CARE_CONTEXT[lead.id] || {};

        function item(key, val, urgent) {
            var valCls = 'qida-context-val' + (urgent ? ' urgent' : '');
            return '<div class="qida-context-item"><span class="qida-context-key">' + esc(key) + '</span><span class="' + valCls + '">' + esc(val || '-') + '</span></div>';
        }
        var urgencyUrgent = lead.urgency && /muy\s+urgente/i.test(lead.urgency);
        // Persona cuidada line: usa lead fields si estan (modo mock); si vienen null
        //   (modo Odoo - no existen en crm.lead), cae al name del caredPerson.
        var personaLine;
        if (lead.relation && lead.caredPersonName && lead.age != null) {
            personaLine = lead.relation + ' ' + lead.caredPersonName + ', ' + lead.age + ' anos';
        } else if (c && c.name) {
            personaLine = c.name;
        } else {
            personaLine = '-';
        }
        var grid = '<div class="qida-context-grid">'
            + item('Persona cuidada', personaLine)
            + item('Relacion', c.relationship)
            + item('Condicion principal', c.mainCondition)
            + item('Ubicacion', lead.location)
            + item('Tipo de servicio', lead.serviceType)
            + item('Urgencia', lead.urgency, urgencyUrgent)
            + item('Vive solo', c.livesAlone == null ? '-' : (c.livesAlone ? 'Si' : 'No'))
            + item('Prescriptor', lead.prescriptor)
        + '</div>';
        return infoCard(title, '', grid);
    }

    function renderInternalNotes(lead, cached) {
        var title = icon('file', 12) + ' Notas internas';

        if (cached && cached._loading) {
            return infoCard(title, '', renderSkeletonLines(3));
        }
        if (cached && cached._errors && cached._errors[1] && cached.notes === null) {
            return infoCard(title, '', '<p class="qida-empty-notes" title="' + esc(cached._errors[1]) + '">No se pudo cargar esta seccion.</p>');
        }

        // v1.11: cached.notes ya viene sanitizada (cuando Odoo) o con isHtml:false (cuando mock).
        //   EDITS.notes se mergea siempre arriba (mas recientes primero) como en v1.10.
        var baseNotes;
        if (cached && cached.notes) {
            baseNotes = cached.notes.slice();
        } else {
            // Fallback dev defensivo: leer mocks directo (comportamiento v1.10.0).
            baseNotes = (MOCK_NOTES[lead.id] || []).slice().map(function (n) {
                return { author: n.author, date: n.date, text: n.text, isHtml: false };
            });
        }
        var added = EDITS.notes[lead.id] || [];
        // EDITS son siempre texto plano (isHtml:false). Las nuevas notas van arriba.
        var notes = added.concat(baseNotes);

        var notesHtml = '';
        if (notes.length === 0) {
            notesHtml = '<p class="qida-empty-notes">Aun no hay notas guardadas para este lead.</p>';
        } else {
            for (var i = 0; i < notes.length; i++) {
                var n = notes[i];
                // v1.11: si n.isHtml === true (notas Odoo), text ya esta sanitizado y va
                //   por innerHTML (envuelto en un span con la clase). Si false (mock + EDITS),
                //   pasa por esc() texto plano.
                var textHtml = n.isHtml ? n.text : esc(n.text);
                notesHtml += '<div class="qida-note">'
                    + '<div class="qida-note-head"><span class="qida-note-author">' + esc(n.author) + '</span><span class="qida-note-date">' + esc(n.date) + '</span></div>'
                    + '<div class="qida-note-text">' + textHtml + '</div>'
                + '</div>';
            }
        }

        var add = '';
        if (state.addingNote) {
            add = '<div class="qida-add-note">'
                + '<textarea data-input="new-note" placeholder="Escribe una nota interna sobre este lead..."></textarea>'
                + '<div class="qida-add-note-actions">'
                    + '<button class="qida-btn-ghost" data-action="cancel-add-note">Cancelar</button>'
                    + '<button class="qida-btn-primary" data-action="save-new-note" style="padding:6px 12px;font-size:12px;">Guardar nota</button>'
                + '</div>'
            + '</div>';
        }

        var actions = state.addingNote ? '' : '<button class="qida-link-btn" data-action="start-add-note">' + icon('plus', 11) + ' Anadir nota</button>';
        return infoCard(title, actions, notesHtml + add);
    }

    function renderActivities(lead, cached) {
        var title = icon('clock', 12) + ' Proximas actividades';

        if (cached && cached._loading) {
            return infoCard(title, '', renderSkeletonLines(3));
        }
        if (cached && cached._errors && cached._errors[2] && cached.activities === null) {
            return infoCard(title, '', '<p class="qida-empty-act" title="' + esc(cached._errors[2]) + '">No se pudo cargar esta seccion.</p>');
        }

        // v1.11: leer del cache; fallback al mock crudo si cached === null.
        var acts;
        if (cached && cached.activities) {
            acts = cached.activities.slice();
        } else {
            acts = (MOCK_PLANNED_ACTIVITIES[lead.id] || []).slice();
        }
        // Sumar las que la AF haya programado en sesion via schedule modal (overrides locales).
        for (var i = 0; i < EDITS.scheduledActivities.length; i++) {
            var sa = EDITS.scheduledActivities[i];
            if (sa.leadId === lead.id) {
                acts = acts.concat([{
                    id: 'local-' + i,
                    type: 'Por hacer',
                    summary: sa.note ? (sa.note.split('\n')[0].slice(0, 60) + (sa.note.length > 60 ? '...' : '')) : 'Proximo seguimiento',
                    deadline: sa.deadline,
                    state: activityStateFromDeadline(sa.deadline),
                    assignee: 'Patricia V.',
                    done: false
                }]);
            }
        }

        var html;
        if (acts.length === 0) {
            html = '<p class="qida-empty-act">Sin actividades planificadas para este lead.</p>';
        } else {
            html = '';
            for (var j = 0; j < acts.length; j++) {
                var a = acts[j];
                var st = a.state || activityStateFromDeadline(a.deadline);
                var cls = 'qida-act-row' + (st === 'overdue' ? ' overdue' : '') + (a.done ? ' done' : '');
                var deadlineLabel = a.deadline ? formatDateEs(a.deadline) : 'sin fecha';
                if (st === 'today') deadlineLabel = 'Hoy';
                else if (st === 'overdue') deadlineLabel = 'Vencida (' + deadlineLabel + ')';
                html += '<div class="' + cls + '">'
                    + '<span class="qida-act-dot"></span>'
                    + '<span class="qida-act-row-text">' + esc(a.summary) + '</span>'
                    + '<span class="qida-act-row-when">' + esc(deadlineLabel) + '</span>'
                + '</div>';
            }
        }

        return infoCard(title, '', html);
    }

    function renderFollowers(lead, cached) {
        var title = icon('users', 12) + ' Equipo siguiendo';

        if (cached && cached._loading) {
            return infoCard(title, '', renderSkeletonLines(2));
        }
        if (cached && cached._errors && cached._errors[4] && cached.followers === null) {
            return infoCard(title, '', '<p class="qida-empty-notes" title="' + esc(cached._errors[4]) + '">No se pudo cargar esta seccion.</p>');
        }

        // v1.11: leer del cache; fallback al mock crudo si cached === null.
        var f;
        if (cached && cached.followers) {
            f = cached.followers;
        } else {
            f = MOCK_FOLLOWERS[lead.id] || DEFAULT_FOLLOWERS;
        }
        var html = '';
        for (var i = 0; i < f.length; i++) {
            var p = f[i];
            var initials = (p.name || '?').split(' ').slice(0, 2).map(function (s) { return s.charAt(0); }).join('').toUpperCase();
            html += '<span class="qida-follower" title="' + esc(p.email || '') + (p.role ? ' - ' + esc(p.role) : '') + '">'
                + '<span class="qida-follower-avatar">' + esc(initials) + '</span>'
                + '<span class="qida-follower-name">' + esc(p.name) + '</span>'
                + (p.role ? '<span class="qida-follower-role">&middot; ' + esc(p.role) + '</span>' : '')
            + '</span>';
        }
        return infoCard(title, 'Hover para email', '<div class="qida-followers">' + html + '</div>');
    }

    // v1.6: renderTemplatesPanel/renderMaterialPanel eliminadas. Plantillas y Material como
    // tabs del pane derecho ya no existen. renderAttachmentsPanel se reemplaza por
    // renderAttachmentsCollapsable (mas abajo en la seccion v1.6) que migra al pane central.

    // ============================================================
    // v1.6: helpers nuevos para el detail
    // ============================================================

    // Resuelve placeholders {contactName}/{relation}/{caredPersonName} contra el lead activo.
    function resolveAiPlaceholders(text, lead) {
        if (!text || !lead) return text || '';
        return text
            .replace(/\{contactName\}/g, lead.contact || '')
            .replace(/\{relation\}/g, lead.relation || '')
            .replace(/\{caredPersonName\}/g, lead.caredPersonName || '');
    }

    // Pad fecha HH:MM al estilo de los timestamps de MOCK_WHATSAPP.
    function nowHHMM() {
        var d = new Date();
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    // TODO[whatsapp]: replace with real WhatsAppService.send(leadId, text) call.
    // Mock que agrega un mensaje WhatsApp saliente y actualiza los contadores del lead.
    function sendWhatsAppMock(leadId, text) {
        var trimmed = (text || '').trim();
        if (!trimmed) return;
        var timestamp = 'Hoy ' + nowHHMM();
        if (!MOCK_WHATSAPP[leadId]) MOCK_WHATSAPP[leadId] = [];
        MOCK_WHATSAPP[leadId].push({ from: 'af', text: trimmed, time: timestamp });

        var lead = getLead(leadId);
        if (lead) {
            lead.daysWithoutTouch = 0;
            lead.lastInteraction = timestamp;
            lead.interactionCount = (lead.interactionCount || 0) + 1;
        }

        state.draftMessage = '';
        state.__waNeedsScroll = true;
        rerenderContent();
        showToast('Mensaje enviado (mock)');
    }

    // TODO[ai]: replace with real AIService.chat(leadId, prompt) call.
    // Mock catch-all para queries libres del chat IA.
    // v1.8: detecta contexto refine leyendo el ultimo mensaje IA del historial. Si el ultimo
    //   payload IA es kind:'refine', devuelve otro refine con prefijo "[Mock: ajuste pedido
    //   aplicado] " sobre el texto previo (simula iteracion). En cualquier otro caso devuelve
    //   el free-text generico de v1.7.
    function mockAIResponse(query, lead) {
        var leadId = lead && lead.id;
        var history = (leadId && state.aiChatHistory && state.aiChatHistory[leadId]) || [];
        // Buscar el ultimo mensaje IA del historial (sin .find/.reverse mutating).
        var lastAi = null;
        for (var i = history.length - 1; i >= 0; i--) {
            if (history[i] && history[i].from === 'ai') { lastAi = history[i]; break; }
        }
        if (lastAi && lastAi.payload && lastAi.payload.kind === 'refine') {
            // Estamos iterando un mensaje propuesto. Devolvemos otro refine con texto "ajustado" mock.
            return {
                kind: 'refine',
                intro: 'Aca va una version ajustada:',
                text: '[Mock: ajuste pedido aplicado] ' + lastAi.payload.text
            };
        }
        return {
            kind: 'free',
            intro: 'Entiendo. Para este caso de ' + (lead ? lead.name : 'este lead') + ', basado en el contexto:',
            text: 'Aun estoy en mock. Cuando este conectado al LLM, voy a poder responder a "' + query + '" basandome en el resumen del caso, las conversaciones previas y el contexto de la familia. Por ahora, prueba con uno de los chips de arriba.'
        };
    }

    // Resuelve la respuesta mock para un chip-prompt.
    // TODO[ai]: replace with AIService.suggestMessage/findMaterial/suggestReactivation calls.
    function getAiPromptResponse(promptId) {
        var raw = MOCK_AI_RESPONSES[promptId];
        if (!raw) return null;
        // Devolvemos una copia con kind para que el renderer sepa que formato dibujar.
        if (promptId === 'material-marketing') return { kind: 'material', intro: raw.intro, items: raw.items.slice() };
        if (promptId === 'sugerir-mensaje')    return { kind: 'variants', intro: raw.intro, variants: raw.variants.slice() };
        if (promptId === 'reactivar-sin-presionar') return { kind: 'approaches', intro: raw.intro, approaches: raw.approaches.slice() };
        return null;
    }

    // ============================================================
    // v1.15: DraftService + telemetría + helpers del asistente configurable
    // ============================================================
    // af_key derivado del email del AF logueado (_currentUserEmail, set en init via sess.username)
    //   contra MOCK_ACTIVE_AFS (espejo de ACTIVE_AFS_JSON). Dev (email null) -> primer AF activo.
    function resolveAfKey() {
        if (_currentUserEmail && MOCK_ACTIVE_AFS[_currentUserEmail]) return MOCK_ACTIVE_AFS[_currentUserEmail];
        // Fallback dev/no-mapeado: primer af_key del mock + aviso. TODO[odoo]: cablear identidad real.
        for (var email in MOCK_ACTIVE_AFS) {
            if (Object.prototype.hasOwnProperty.call(MOCK_ACTIVE_AFS, email)) {
                if (!_currentUserEmail) log('resolveAfKey: sin email de sesion, usando fallback', MOCK_ACTIVE_AFS[email]);
                return MOCK_ACTIVE_AFS[email];
            }
        }
        return 'default';
    }

    // 'corto_directo' -> 'Corto directo'. Robusto a snake_case / espacios / vacío.
    function humanizeVariantName(name) {
        var s = String(name || '').replace(/_/g, ' ').trim();
        if (!s) return '(sin nombre)';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // Validación de la config (1-3 variantes; name <40, único, no vacío; enums cerrados).
    //   Devuelve { ok, errors: { '<idx>': 'msg' } , general: 'msg'|null }.
    function validateVariants(variants) {
        var errors = {}, general = null;
        if (!variants || !variants.length) { general = 'Agregá al menos 1 variante.'; return { ok: false, errors: errors, general: general }; }
        if (variants.length > 3) general = 'Máximo 3 variantes.';
        var seen = {};
        for (var i = 0; i < variants.length; i++) {
            var v = variants[i];
            var nm = (v.name || '').trim();
            if (!nm) errors[i] = 'El nombre no puede estar vacío.';
            else if (nm.length >= 40) errors[i] = 'El nombre debe tener menos de 40 caracteres.';
            else if (seen[nm.toLowerCase()]) errors[i] = 'Nombre duplicado.';
            else if (DRAFT_LENGTHS.indexOf(v.length) === -1) errors[i] = 'Largo inválido.';
            else if (TONE_STYLES.indexOf(v.tone_style) === -1) errors[i] = 'Tono inválido.';
            seen[nm.toLowerCase()] = true;
        }
        var ok = !general && !hasOwnKeys(errors);
        return { ok: ok, errors: errors, general: general };
    }
    function hasOwnKeys(o) { for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) return true; } return false; }

    // Wrapper de telemetría. PII-ESTRICTA: solo metadata, NUNCA el texto del draft ni del lead.
    //   try/catch silencioso (el endpoint F2.9 puede no existir todavía).
    function sendAssistantEvent(eventType, payload) {
        try {
            var p = payload || {};
            var body = { event_type: eventType, ts: Date.now() };
            if (p.lead_id != null) body.lead_id = p.lead_id;
            if (p.variant_name) body.variant_name = p.variant_name;
            if (p.length) body.length = p.length;
            if (p.tone_style) body.tone_style = p.tone_style;
            // TODO[odoo]: POST /api/leads/{lead_id}/assistant/events (F2.9). Por ahora no-op + log.
            log('assistant event', body);
            // thumbs_explicit: el wrapper ya lo acepta; la UI de 👍/👎 queda para cuando exista F2.9.
        } catch (e) { /* silencioso a proposito */ }
    }

    // Texto mock de un draft segun (tone_style, length), con placeholders resueltos.
    function buildDraftText(variant, lead) {
        var byTone = TONE_TEMPLATES[variant.tone_style] || TONE_TEMPLATES.neutral;
        var raw = (variant.length === 'short') ? byTone.short : byTone.medium;
        return resolveAiPlaceholders(raw, lead);
    }

    var DraftService = {
        // GET /api/admin/afs/{af_key}/draft-variants (mock).
        getDraftVariantsSync: function (afKey) {
            var custom = MOCK_DRAFT_VARIANTS_BY_AF[afKey];
            var src = custom || MOCK_DRAFT_VARIANTS_DEFAULT;
            // Copia profunda simple para no mutar el mock al editar.
            var variants = [];
            for (var i = 0; i < src.length; i++) variants.push({ name: src[i].name, length: src[i].length, tone_style: src[i].tone_style });
            return { af_key: afKey, is_default: !custom, variants: variants };
        },
        getDraftVariants: function (afKey) {
            var self = this;
            return simulateLatency(80, 180).then(function () { return self.getDraftVariantsSync(afKey); });
        },
        // PUT /api/admin/afs/{af_key}/draft-variants (mock). La validación 422 se cubre client-side
        //   (no se puede invocar con config inválida). Persiste en MOCK_DRAFT_VARIANTS_BY_AF.
        saveDraftVariants: function (afKey, variants) {
            var v = validateVariants(variants);
            if (!v.ok) return simulateLatency(60, 120).then(function () { return { ok: false, status: 422, error: v }; });
            var copy = [];
            for (var i = 0; i < variants.length; i++) copy.push({ name: variants[i].name.trim(), length: variants[i].length, tone_style: variants[i].tone_style });
            MOCK_DRAFT_VARIANTS_BY_AF[afKey] = copy;
            return simulateLatency(80, 180).then(function () { return { ok: true }; });
        },
        // POST /api/leads/{lead_id}/recommendation (mock). Devuelve drafts derivados de la config
        //   de la AF. Edge cases: pausa -> sin seguimiento; overrides -> vacío / fallback.
        getRecommendationSync: function (leadId) {
            var override = MOCK_RECOMMENDATION_OVERRIDES[leadId];
            if (override) return override;
            var lead = getLead(leadId);
            if (lead && normalizeTemp(lead.temperature) === 'pausa') {
                return { should_followup_today: false, fallback: false, drafts: [] };
            }
            var cfg = this.getDraftVariantsSync(resolveAfKey()).variants;
            var drafts = [];
            for (var i = 0; i < cfg.length; i++) {
                drafts.push({ name: cfg[i].name, length: cfg[i].length, tone_style: cfg[i].tone_style, text: buildDraftText(cfg[i], lead) });
            }
            return { should_followup_today: true, fallback: false, drafts: drafts };
        },
        getRecommendation: function (leadId) {
            var self = this;
            return simulateLatency(120, 280).then(function () { return self.getRecommendationSync(leadId); });
        }
    };


    // Adjuntos colapsable (reemplaza el panel derecho v1.5). Vive dentro del .qida-center-body.
    function renderAttachmentsCollapsable(lead, cached) {
        var title = icon('paperclip', 12) + ' Adjuntos';

        if (cached && cached._loading) {
            return infoCard(title, '', renderSkeletonLines(2));
        }
        if (cached && cached._errors && cached._errors[3] && cached.attachments === null) {
            return infoCard(title, '', '<p class="qida-att-empty" title="' + esc(cached._errors[3]) + '">No se pudo cargar esta seccion.</p>');
        }

        // v1.11: leer del cache; fallback al mock crudo si cached === null.
        var atts;
        if (cached && cached.attachments) {
            atts = cached.attachments;
        } else {
            atts = MOCK_ATTACHMENTS[lead.id] || [];
        }
        var count = atts.length;
        var expanded = !!state.attachmentsExpanded;

        var bodyHtml = '';
        if (expanded) {
            if (count === 0) {
                bodyHtml = '<p class="qida-att-empty">Sin adjuntos vinculados a este lead.</p>';
            } else {
                for (var i = 0; i < atts.length; i++) {
                    var a = atts[i];
                    var iconName = 'file';
                    if (a.mimetype && a.mimetype.indexOf('image') === 0) iconName = 'paperclip';
                    // v1.11: el handler open-attachment recibe el id (numero Odoo o nombre en mock).
                    //   Para adjuntos Odoo, el handler usa downloadUrl si esta disponible.
                    var dataId = a.id != null ? a.id : a.name;
                    bodyHtml += '<div class="qida-att" data-action="open-attachment" data-id="' + esc(dataId) + '">'
                        + '<div class="qida-att-icon">' + icon(iconName, 14) + '</div>'
                        + '<div class="qida-att-body">'
                            + '<div class="qida-att-name">' + esc(a.name) + '</div>'
                            + '<div class="qida-att-meta">' + esc(a.mimetype || '') + ' &middot; ' + esc(a.date || a.createdAt || '') + '</div>'
                        + '</div>'
                        + (a.isMain ? '<span class="qida-att-main">Principal</span>' : '')
                    + '</div>';
                }
            }
        }

        var chevIcon = expanded ? 'chevDown' : 'chevRight';
        var collapse = '<div class="qida-att-collapse">'
            + '<button class="qida-att-collapse-head" data-action="toggle-attachments" aria-expanded="' + (expanded ? 'true' : 'false') + '">'
                + '<span class="qida-att-collapse-head-title">' + icon('paperclip', 12)
                    + '<span>Adjuntos</span>'
                    + '<span class="qida-att-collapse-count">(' + count + ')</span>'
                + '</span>'
                + icon(chevIcon, 14)
            + '</button>'
            + (expanded ? '<div class="qida-att-collapse-body">' + bodyHtml + '</div>' : '')
        + '</div>';
        return infoCard(title, '', collapse);
    }

    // v1.7: Chat IA en columna dedicada (.qida-pane-ai).
    // v1.8: chips siempre visibles debajo del input (fila estilo Gemini). Avatars con icono
    //   propio (Tu = inicial "T", IA = sparkles). Contenido de las burbujas envuelto en
    //   .qida-aichat-bubble-content para aplicar el fondo sutil por rol.
    function renderAiChat(lead) {
        var history = (state.aiChatHistory && state.aiChatHistory[lead.id]) || [];
        var hasConversation = history.length > 0;
        var draft = state.aiChatDraft || '';

        var bodyHtml = '';
        if (hasConversation) {
            for (var i = 0; i < history.length; i++) {
                var item = history[i];
                if (item.from === 'user') {
                    bodyHtml += '<div class="qida-aichat-bubble user">'
                        + '<div class="qida-aichat-bubble-icon">T</div>'
                        + '<div class="qida-aichat-bubble-body">'
                            + '<div class="qida-aichat-bubble-label">Tu</div>'
                            + '<div class="qida-aichat-bubble-content">'
                                + '<p class="qida-aichat-bubble-text">' + esc(item.payload && item.payload.text || '') + '</p>'
                            + '</div>'
                        + '</div>'
                    + '</div>';
                } else {
                    bodyHtml += '<div class="qida-aichat-bubble ai">'
                        + '<div class="qida-aichat-bubble-icon">' + icon('sparkles', 12) + '</div>'
                        + '<div class="qida-aichat-bubble-body">'
                            + '<div class="qida-aichat-bubble-label">IA</div>'
                            + '<div class="qida-aichat-bubble-content">'
                                + renderAiPayload(item.payload, lead)
                            + '</div>'
                        + '</div>'
                    + '</div>';
                }
            }
        } else {
            bodyHtml = '<p class="qida-pane-ai-empty">Pregunta sobre este lead o usa uno de los atajos.</p>';
        }

        // v1.8: chips SIEMPRE visibles (no se ocultan al haber conversacion).
        var chipsHtml = '<div class="qida-aichat-chips">'
            + '<button class="qida-aichat-chip" data-action="ai-chip" data-id="material-marketing">' + icon('book', 12) + ' Material marketing</button>'
            + '<button class="qida-aichat-chip" data-action="ai-chip" data-id="sugerir-mensaje">' + icon('msg', 12) + ' Sugerir mensaje</button>'
            + '<button class="qida-aichat-chip" data-action="ai-chip" data-id="reactivar-sin-presionar">' + icon('refresh', 12) + ' Reactivar sin presionar</button>'
        + '</div>';

        var placeholder = hasConversation ? 'Pregunta de seguimiento...' : 'Pregunta sobre este lead...';
        var sendDisabled = draft.trim() ? '' : ' disabled';

        return ''
            + '<div class="qida-pane-ai-head">' + icon('sparkles', 12) + ' Asistente IA</div>'
            + '<div class="qida-pane-ai-body" id="qida-pane-ai-body">' + bodyHtml + '</div>'
            + '<div class="qida-pane-ai-foot">'
                + '<div class="qida-aichat-input">'
                    + '<span class="qida-aichat-input-icon">' + icon('sparkles', 14) + '</span>'
                    + '<input type="text" class="qida-aichat-input-field" id="qida-aichat-input" data-input="ai-chat-input" placeholder="' + esc(placeholder) + '" value="' + esc(draft) + '" />'
                    + '<button class="qida-aichat-send" data-action="ai-chat-send"' + sendDisabled + ' aria-label="Enviar">' + icon('arrowRight', 14) + '</button>'
                + '</div>'
                + chipsHtml
            + '</div>';
    }
    // Render del payload de un mensaje IA segun su tipo (variants / material / approaches / free / refine).
    // v1.8: el boton de variantes y approaches pasa de "Usar este mensaje" (data-action="ai-use-message")
    //   a "Esta me gusta mas" (data-action="ai-pick-variant" + data-label) para activar el flujo
    //   conversacional refine. Material marketing queda intacto.
    function renderAiPayload(payload, lead) {
        if (!payload) return '';
        var html = '';
        if (payload.intro) html += '<p class="qida-aichat-bubble-intro">' + esc(payload.intro) + '</p>';

        if (payload.kind === 'variants' && payload.variants) {
            // v1.15: las variantes pueden venir de MOCK_AI_RESPONSES (label) o de /recommendation
            //   (name/length/tone_style -> draft). Header = label || humanize(name). Si es draft
            //   (source==='draft'), threadeamos metadata al boton para la telemetría draft_copied.
            var isDraft = (payload.source === 'draft');
            for (var i = 0; i < payload.variants.length; i++) {
                var v = payload.variants[i];
                var resolved = resolveAiPlaceholders(v.text, lead);
                var headLabel = v.label || humanizeVariantName(v.name);
                var metaAttrs = isDraft
                    ? ' data-source="draft" data-variant-name="' + esc(v.name || '') + '" data-length="' + esc(v.length || '') + '" data-tone="' + esc(v.tone_style || '') + '"'
                    : '';
                html += '<div class="qida-aichat-variant">'
                    + '<div class="qida-aichat-variant-label">' + esc(headLabel) + '</div>'
                    + '<p class="qida-aichat-variant-text">' + esc(resolved) + '</p>'
                    + '<button class="qida-aichat-variant-action" data-action="ai-pick-variant" data-label="' + esc(headLabel) + '" data-text="' + esc(resolved) + '"' + metaAttrs + '>' + icon('arrowRight', 11) + ' Esta me gusta mas</button>'
                + '</div>';
            }
        } else if (payload.kind === 'material' && payload.items) {
            for (var j = 0; j < payload.items.length; j++) {
                var it = payload.items[j];
                html += '<div class="qida-aichat-mat-card">'
                    + '<div class="qida-aichat-mat-title">' + esc(it.title) + '</div>'
                    + '<div class="qida-aichat-mat-desc">' + esc(it.desc) + '</div>'
                    + '<button class="qida-aichat-mat-action" data-action="ai-material-action" data-title="' + esc(it.title) + '">' + icon('paperclip', 10) + ' ' + esc(it.action) + '</button>'
                + '</div>';
            }
        } else if (payload.kind === 'approaches' && payload.approaches) {
            for (var k = 0; k < payload.approaches.length; k++) {
                var ap = payload.approaches[k];
                var resolvedEx = resolveAiPlaceholders(ap.example, lead);
                html += '<div class="qida-aichat-variant">'
                    + '<div class="qida-aichat-variant-label">' + icon('sparkles', 10) + ' ' + esc(ap.title) + '</div>'
                    + '<p class="qida-aichat-rationale">' + esc(ap.rationale) + '</p>'
                    + '<p class="qida-aichat-variant-text">' + esc(resolvedEx) + '</p>'
                    + '<button class="qida-aichat-variant-action" data-action="ai-pick-variant" data-label="' + esc(ap.title) + '" data-text="' + esc(resolvedEx) + '">' + icon('arrowRight', 11) + ' Esta me gusta mas</button>'
                + '</div>';
            }
        } else if (payload.kind === 'refine' && payload.text) {
            // v1.8: respuesta IA al elegir una variante. Muestra el texto propuesto en una card
            //   destacada y ofrece el boton final "Copiar al WhatsApp". La AF puede iterar
            //   escribiendo texto libre en el input del chat (mockAIResponse detecta el contexto).
            // v1.15: si el refine vino de un draft (payload.meta.source==='draft'), threadeamos la
            //   metadata al boton para emitir draft_copied PII-safe al copiar.
            var m = payload.meta || {};
            var copyMeta = (m.source === 'draft')
                ? ' data-source="draft" data-variant-name="' + esc(m.name || '') + '" data-length="' + esc(m.length || '') + '" data-tone="' + esc(m.tone_style || '') + '"'
                : '';
            html += '<div class="qida-aichat-refine">'
                + '<div class="qida-aichat-refine-text">' + esc(payload.text) + '</div>'
                + '<button class="qida-aichat-copy-wa" data-action="ai-copy-to-wa" data-text="' + esc(payload.text) + '"' + copyMeta + '>' + icon('check', 11) + ' Copiar al WhatsApp</button>'
            + '</div>';
        } else if (payload.kind === 'free' && payload.text) {
            html += '<p class="qida-aichat-bubble-text">' + esc(payload.text) + '</p>';
        }

        return html;
    }

    // Empuja un par user/ai a aiChatHistory para el lead activo.
    function pushAiChat(leadId, userText, aiPayload) {
        if (!state.aiChatHistory[leadId]) state.aiChatHistory[leadId] = [];
        if (userText) state.aiChatHistory[leadId].push({ from: 'user', payload: { text: userText } });
        if (aiPayload) state.aiChatHistory[leadId].push({ from: 'ai', payload: aiPayload });
        // v1.9.1: cualquier append al historial dispara scroll al fondo post-rerender.
        if (userText || aiPayload) state.__aiNeedsScroll = true;
    }

    // v1.8: la AF elige una variante propuesta por la IA (sugerir mensaje o reactivar). Empujamos
    //   al historial como par user("<label> - esta me gusta mas") -> ai(kind: 'refine', text).
    //   La burbuja IA con kind:'refine' muestra el texto propuesto + boton "Copiar al WhatsApp"
    //   y permite iterar via texto libre en el input del chat (mockAIResponse detecta el contexto).
    function pushAiPickVariant(leadId, label, text, meta) {
        if (!leadId || !text) return;
        var userMsg = (label ? label + ' - ' : '') + 'esta me gusta mas';
        var refinePayload = {
            kind: 'refine',
            intro: 'Genial. Te gusta asi o quieres ajustar algo? (mas corto, otro tono, agregar algo especifico).',
            text: text,
            // v1.15: arrastra la metadata del draft (si aplica) para la telemetría al copiar.
            meta: meta || null
        };
        pushAiChat(leadId, userMsg, refinePayload);
    }

    // ============================================================
    // RENDER: detail (full) - v1.7: 3 paneles (WA / info / IA)
    // ============================================================
    function renderWhatsAppPane(lead) {
        var msgs = MOCK_WHATSAPP[lead.id] || [];
        var msgsHtml;
        if (msgs.length === 0) {
            msgsHtml = '<div class="qida-empty-msgs">Sin mensajes de WhatsApp para este lead.</div>';
        } else {
            msgsHtml = '<div class="qida-msgs">';
            for (var i = 0; i < msgs.length; i++) {
                var m = msgs[i];
                msgsHtml += '<div class="qida-msg from-' + m.from + '">'
                    + '<div class="qida-msg-bubble">'
                        + '<p class="qida-msg-text">' + esc(m.text) + '</p>'
                        + '<p class="qida-msg-time">' + esc(m.time) + '</p>'
                    + '</div>'
                + '</div>';
            }
            msgsHtml += '</div>';
        }

        var draft = state.draftMessage || '';
        var sendDisabled = draft.trim() ? '' : ' disabled';

        return ''
            + '<div class="qida-pane-wa-head">' + icon('msg', 12) + ' Conversacion</div>'
            + '<div class="qida-pane-wa-body" id="qida-wa-body">' + msgsHtml + '</div>'
            + '<div class="qida-wa-input-wrap">'
                + '<div class="qida-wa-input">'
                    + '<button class="qida-wa-clip" data-action="wa-clip" aria-label="Adjuntar">' + icon('paperclip', 15) + '</button>'
                    + '<textarea class="qida-wa-textarea" id="qida-wa-textarea" data-input="wa-draft" rows="1" placeholder="Escribe un mensaje...">' + esc(draft) + '</textarea>'
                    + '<button class="qida-wa-send" data-action="wa-send"' + sendDisabled + ' aria-label="Enviar">' + icon('send', 14) + '</button>'
                + '</div>'
            + '</div>';
    }

    // v1.11: renderCenterPane recibe cached y lo propaga a los renderers de paneles
    //   del detalle. renderIaSummary y renderAiChat NO se tocan en Fase A (Fase E).
    function renderCenterPane(lead, cached) {
        return ''
            + renderIaSummary(lead)
            + renderIaAnalysis(lead)
            + renderCare(lead, cached)
            + renderInternalNotes(lead, cached)
            + renderActivities(lead, cached)
            + renderFollowers(lead, cached)
            + renderAttachmentsCollapsable(lead, cached);
    }

    function renderDetail() {
        var leadId = state.currentLeadId;
        // v1.11: leer del cache; fallback al mock crudo si cached === null (modo dev
        //   defensivo: si por alguna razon entras al detalle sin pasar por select-lead).
        var cached = LeadDetailService.getFromCache(leadId);
        var lead = (cached && cached.lead) || getLead(leadId);
        if (!lead) {
            // v1.11: error global - el primer fetch (crm.lead.read) fallo. Volvemos al
            //   dashboard. El toast con el mensaje ya lo disparo fetchAll en su .catch.
            return renderDashboard();
        }

        // v1.8: el toggle "Swap" del shell header intercambia el orden centro/derecha.
        //   false -> WA | Info | IA   (default)
        //   true  -> WA | IA   | Info
        // v1.11: renderWhatsAppPane y renderAiChat reciben lead pero NO cached (no se
        //   tocan en Fase A - Fase B y Fase E respectivamente).
        var centerHtml = '<div class="qida-pane-center">' + renderCenterPane(lead, cached) + '</div>';
        var aiHtml = '<div class="qida-pane-ai">' + renderAiChat(lead) + '</div>';
        var middleAndRight = state.detailLayoutSwapped ? (aiHtml + centerHtml) : (centerHtml + aiHtml);

        return '<div class="qida-detail">'
            + '<div class="qida-detail-body">'
                + '<div class="qida-pane-wa">' + renderWhatsAppPane(lead) + '</div>'
                + middleAndRight
            + '</div>'
        + '</div>';
    }
    // ============================================================
    // RENDER: schedule modal
    // ============================================================
    function buildScheduleNote(lead) {
        var s = getIaSummary(lead.id);
        var lastMsg = (MOCK_WHATSAPP[lead.id] || [])[(MOCK_WHATSAPP[lead.id] || []).length - 1];
        var lastMsgStr = lastMsg ? '"' + (lastMsg.text.length > 90 ? lastMsg.text.slice(0, 90) + '...' : lastMsg.text) + '" (' + lastMsg.time + ')' : 'sin registros recientes';

        var lines = [
            'Ultima interaccion: WhatsApp ' + lastMsgStr,
            'Pendiente: ' + (s ? s.text.split('. ')[0] + '.' : 'revisar contexto del lead.'),
            'Proximo movimiento sugerido: pregunta abierta antes de cualquier CTA. NO redactar mensaje al cliente desde aqui.'
        ];
        return lines.join('\n');
    }

    function renderSchedule() {
        var lead = getLead(state.currentLeadId);
        if (!lead) return '';

        var shortcuts = [
            { id: 'd1',  label: 'Manana',      days: 1 },
            { id: 'd3',  label: 'En 3 dias',   days: 3 },
            { id: 'd7',  label: 'En 1 semana', days: 7 },
            { id: 'd14', label: 'En 2 semanas',days: 14 },
            { id: 'd30', label: 'En 1 mes',    days: 30 },
            { id: 'd42', label: 'En 6 semanas',days: 42 }
        ];

        var pickedIso = state.scheduleDate;
        var pickedShortcut = '';
        for (var i = 0; i < shortcuts.length; i++) {
            if (pickedIso === addDaysISO(shortcuts[i].days)) {
                pickedShortcut = shortcuts[i].id;
                break;
            }
        }

        var shortcutsHtml = '';
        for (var j = 0; j < shortcuts.length; j++) {
            var sc = shortcuts[j];
            var active = (sc.id === pickedShortcut);
            shortcutsHtml += '<button class="qida-sb-short' + (active ? ' active' : '') + '" data-action="schedule-shortcut" data-id="' + sc.days + '">'
                + esc(sc.label) + '</button>';
        }

        return '<div class="qida-schedule-bg" data-action="schedule-bg">'
            + '<div class="qida-schedule">'
                + '<div class="qida-schedule-head">'
                    + '<h3 class="qida-schedule-title">Agendar proximo seguimiento</h3>'
                    + '<p class="qida-schedule-sub">Para <strong>' + esc(lead.name) + '</strong> &middot; se crea como actividad "Por hacer" en Odoo.</p>'
                + '</div>'
                + '<div class="qida-schedule-body">'

                    + '<div class="qida-sb-section">'
                        + '<div class="qida-sb-label">Fecha</div>'
                        + '<div class="qida-sb-shortcuts">' + shortcutsHtml + '</div>'
                        + '<div class="qida-sb-custom">'
                            + '<label for="qida-sb-custom-date">o elegi otra fecha:</label>'
                            + '<input id="qida-sb-custom-date" type="date" data-input="schedule-date" value="' + esc(pickedIso || '') + '" min="' + esc(todayISO()) + '" />'
                            + (pickedIso ? '<span style="font-size:11px;color:var(--s500);">(' + esc(formatDateEs(pickedIso)) + ')</span>' : '')
                        + '</div>'
                    + '</div>'

                    + '<div class="qida-sb-section">'
                        + '<div class="qida-sb-label">Nota de referencia</div>'
                        + '<div class="qida-sb-note-hint">' + icon('sparkles', 11) + ' Pre-poblada por IA. Editable. <strong>NO es un mensaje al lead</strong>, es un brief para vos (o la AF que tome el lead).</div>'
                        + '<textarea class="qida-sb-note" data-input="schedule-note" placeholder="Brief operativo para la proxima vez que abras este lead...">' + esc(state.scheduleNote) + '</textarea>'
                    + '</div>'

                    + '<div class="qida-sb-section">'
                        + '<label class="qida-sb-toggle">'
                            + '<input type="checkbox" data-input="schedule-mark-pause"' + (state.scheduleMarkPause ? ' checked' : '') + ' />'
                            + '<span><span class="qida-sb-toggle-label">Marcar lead como Pausa al confirmar</span>'
                            + '<span class="qida-sb-toggle-hint">Auto-tildado si la fecha elegida es &gt; 3 semanas. Cambia la temperatura del lead a "Pausa".</span></span>'
                        + '</label>'
                    + '</div>'

                + '</div>'
                + '<div class="qida-schedule-foot">'
                    + '<div class="qida-sb-close-wrap">'
                        + '<select class="qida-sb-close" data-input="schedule-close-reason">'
                            + '<option value="">Cerrar lead sin agendar...</option>'
                            + '<option value="perdido">Perdido</option>'
                            + '<option value="convertido">Convertido</option>'
                            + '<option value="sin-interes">Sin interes</option>'
                            + '<option value="otro">Otro</option>'
                        + '</select>'
                        + '<button class="qida-sb-close-apply" data-action="schedule-close-apply">Aplicar</button>'
                    + '</div>'
                    + '<div class="qida-sb-actions">'
                        + '<button class="qida-sb-cancel" data-action="schedule-cancel">Cancelar</button>'
                        + '<button class="qida-btn-primary" data-action="schedule-confirm">' + icon('check', 13) + ' Confirmar</button>'
                    + '</div>'
                + '</div>'
            + '</div>'
        + '</div>';
    }

    // ============================================================
    // RENDER: PANEL DE LIDERES (v1.12)
    // ============================================================
    // Devuelve las iniciales (1-2 letras) para el avatar de la tabla.
    function leaderInitials(name) {
        if (!name) return '?';
        var parts = name.split(/\s+/);
        var a = (parts[0] && parts[0].charAt(0)) || '';
        var b = (parts[1] && parts[1].charAt(0)) || '';
        return (a + b).toUpperCase();
    }

    // v1.12.1: toolbar en una sola fila (sin wrappers left/right). Filtro team-lead eliminado.
    //   Selectores con 6 opciones de localidad (Todas + MAD/CAT/BIL/VAL/COR). Exportar va a la
    //   derecha via margin-left:auto en CSS.
    function renderLeaderToolbar() {
        var ld = state.leaderDash;
        var locSel = ''
            + '<select class="qida-leader-select" data-input="leader-filter-loc">'
                + '<option value="all"' + (ld.locFilter === 'all' ? ' selected' : '') + '>Todas las localidades</option>'
                + '<option value="MAD"' + (ld.locFilter === 'MAD' ? ' selected' : '') + '>Madrid</option>'
                + '<option value="CAT"' + (ld.locFilter === 'CAT' ? ' selected' : '') + '>Cataluña</option>'
                + '<option value="BIL"' + (ld.locFilter === 'BIL' ? ' selected' : '') + '>Bilbao</option>'
                + '<option value="VAL"' + (ld.locFilter === 'VAL' ? ' selected' : '') + '>Valencia</option>'
                + '<option value="COR"' + (ld.locFilter === 'COR' ? ' selected' : '') + '>Coruña</option>'
            + '</select>';
        var search = ''
            + '<span class="qida-leader-search-wrap">'
                + icon('search', 13)
                + '<input type="text" class="qida-leader-search" data-input="leader-search" placeholder="Buscar AF…" value="' + esc(ld.search) + '"/>'
            + '</span>';
        var exportBtn = '<button class="qida-leader-export-btn" data-action="leader-export">' + icon('download', 13) + ' Exportar</button>';
        return '<div class="qida-leader-toolbar">' + locSel + search + exportBtn + '</div>';
    }

    // v1.12.1: KPIs sin deltas. 4 cards con valor grande + subtitulo descriptivo en gris.
    function renderLeaderKpis(kpis) {
        function kpi(label, value, subText) {
            return '<div class="qida-leader-kpi">'
                + '<div class="qida-leader-kpi-label">' + esc(label) + '</div>'
                + '<div class="qida-leader-kpi-value">' + value + '</div>'
                + '<div class="qida-leader-kpi-sub">' + esc(subText) + '</div>'
            + '</div>';
        }
        return '<div class="qida-leader-kpis">'
            + kpi('Leads totales en cartera',     kpis.totalCartera,                       'snapshot actual')
            + kpi('% cartera con <3 seguimientos', kpis.bajoSegPct + '%',                  kpis.bajoSegCount + ' leads')
            + kpi('Conversión del equipo',        kpis.convTeam + '%',                    'últimos 30 días')
            + kpi('AFs en zona de riesgo',        kpis.riesgoCount + ' de ' + kpis.afCount, 'Sobrecarga o bajo seguimiento')
        + '</div>';
    }

    // v1.12.1: card de tendencia con pills "Conversion / Cobertura" en el header. Titulo
    //   dinamico segun state.leaderDash.trendMetric. Donut card sin cambios estructurales.
    function renderLeaderChartsRow(temp, trend) {
        var donutSub = temp.total + ' leads totales · 3 estados';
        var trendKey = (state.leaderDash && state.leaderDash.trendMetric) || 'conversion';
        var pillConv = '<button class="qida-leader-pill' + (trendKey === 'conversion' ? ' active' : '') + '" data-action="leader-trend-metric" data-id="conversion">Conversión</button>';
        var pillCov  = '<button class="qida-leader-pill' + (trendKey === 'coverage'   ? ' active' : '') + '" data-action="leader-trend-metric" data-id="coverage">Cobertura</button>';
        var trendSub = 'últimos 6 meses · target ' + trend.target + '%';
        return '<div class="qida-leader-charts">'
            + '<div class="qida-leader-chart-card">'
                + '<div class="qida-leader-chart-head">'
                    + '<div class="qida-leader-chart-title">Temperatura de leads</div>'
                + '</div>'
                + '<div class="qida-leader-chart-sub">' + esc(donutSub) + '</div>'
                + '<div class="qida-leader-chart-mount" id="qida-leader-donut"></div>'
            + '</div>'
            + '<div class="qida-leader-chart-card">'
                + '<div class="qida-leader-chart-head">'
                    + '<div class="qida-leader-chart-title" id="qida-leader-trend-title">' + esc(trend.title) + '</div>'
                    + '<div class="qida-leader-pills">' + pillConv + pillCov + '</div>'
                + '</div>'
                + '<div class="qida-leader-chart-sub" id="qida-leader-trend-sub">' + esc(trendSub) + '</div>'
                + '<div class="qida-leader-chart-mount" id="qida-leader-area"></div>'
            + '</div>'
        + '</div>';
    }

    // v1.12.1: tabla con 8 columnas. Schema en espanol. Eliminadas: Aceptados, En curso,
    //   Rechazados, Team lead. Sort temperatura usa "calientes" como proxy.
    function renderLeaderAfsTable(afs) {
        var ld = state.leaderDash;
        function th(label, col, alignRight) {
            var sorted = (ld.sortCol === col);
            var arrow = sorted ? (ld.sortDir === 'desc' ? icon('arrowDown', 10) : icon('arrowUp', 10)) : '';
            var cls = sorted ? ' qida-leader-th-sorted' : '';
            var style = alignRight ? ' style="text-align:right;"' : '';
            return '<th class="' + cls + '" data-action="leader-sort" data-id="' + col + '"' + style + '>' + esc(label) + arrow + '</th>';
        }

        var headers = ''
            + '<tr>'
                + th('AF',          'nombre',     false)
                + th('Localidad',   'localidad',  false)
                + th('Cartera',     'cartera',    true)
                + th('Temperatura', 'temperatura',false)
                + th('Bajo seg',    'bajoSeg',    true)
                + th('Int/lead',    'intPorLead', true)
                + th('Conversión',  'conversion', true)
                + th('Estado',      'estado',     false)
            + '</tr>';

        var rows = '';
        if (!afs.length) {
            rows = '<tr><td colspan="8" class="qida-leader-empty-row">No hay AFs que coincidan con los filtros aplicados.</td></tr>';
        } else {
            for (var i = 0; i < afs.length; i++) {
                var af = afs[i];
                var tHot = af.calientes, tWarm = af.templados, tCold = af.frios;
                var tTotal = tHot + tWarm + tCold || 1;
                var pctHot  = (tHot  / tTotal * 100);
                var pctWarm = (tWarm / tTotal * 100);
                var pctCold = (tCold / tTotal * 100);

                // Status en espanol: usar el valor directo del mock como label + map a CSS class.
                var statusKey = af.estado === 'OK' ? 'ok' : (af.estado === 'Atención' ? 'attention' : 'overload');

                rows += '<tr>'
                    + '<td><div class="qida-leader-af-cell"><span class="qida-leader-avatar">' + esc(leaderInitials(af.nombre)) + '</span><span class="qida-leader-af-name">' + esc(af.nombre) + '</span></div></td>'
                    + '<td><span class="qida-leader-loc-badge qida-leader-loc-' + esc(af.localidad) + '">' + esc(af.localidad) + '</span></td>'
                    + '<td style="text-align:right;">' + af.cartera + '</td>'
                    + '<td>'
                        + '<div class="qida-leader-temp-cell">'
                            + '<div class="qida-leader-temp-bar">'
                                + '<div class="qida-leader-temp-hot"  style="width:' + pctHot  + '%;"></div>'
                                + '<div class="qida-leader-temp-warm" style="width:' + pctWarm + '%;"></div>'
                                + '<div class="qida-leader-temp-cold" style="width:' + pctCold + '%;"></div>'
                            + '</div>'
                            + '<span class="qida-leader-temp-nums">' + tHot + '/' + tWarm + '/' + tCold + '</span>'
                        + '</div>'
                    + '</td>'
                    + '<td style="text-align:right;">' + af.bajoSeg + '</td>'
                    + '<td style="text-align:right;">' + (Math.round(af.intPorLead * 10) / 10) + '</td>'
                    + '<td style="text-align:right;" class="qida-leader-conv">' + (Math.round(af.conversion * 10) / 10) + '%</td>'
                    + '<td><span class="qida-leader-status qida-leader-status-' + statusKey + '"><span class="qida-leader-status-dot"></span>' + esc(af.estado) + '</span></td>'
                + '</tr>';
            }
        }

        return ''
            + '<div class="qida-leader-table-card">'
                + '<div class="qida-leader-table-head-bar">'
                    + '<span class="qida-leader-table-title">AFs del equipo</span>'
                    + '<span class="qida-leader-table-count">' + afs.length + ' AF' + (afs.length === 1 ? '' : 's') + '</span>'
                + '</div>'
                + '<div class="qida-leader-table-wrap">'
                    + '<table class="qida-leader-table" id="qida-leader-afs-table">'
                        + '<thead>' + headers + '</thead>'
                        + '<tbody>' + rows + '</tbody>'
                    + '</table>'
                + '</div>'
            + '</div>';
    }

    function renderLeadersDashboard() {
        var afs = filterAndSortAfs(MOCK_LEADER_AFS, state.leaderDash);
        var kpis = buildLeaderKpis(afs);
        var temp = buildLeaderTemperature(afs);
        var trend = buildLeaderTrendSeries();   // v1.12.1: ya no recibe filteredAfs (series globales)
        return '<div class="qida-leader-dash">'
            + renderLeaderToolbar()
            + renderLeaderKpis(kpis)
            + renderLeaderChartsRow(temp, trend)
            + renderLeaderAfsTable(afs)
        + '</div>';
    }

    // Mount / destroy ApexCharts post-innerHTML. Guarda refs en state.leaderDash.__charts
    //   para destroyear antes de re-instanciar en el proximo rerender.
    function destroyLeaderCharts() {
        var ch = state.leaderDash.__charts;
        if (!ch) return;
        try { if (ch.donut && ch.donut.destroy) ch.donut.destroy(); } catch (e) {}
        try { if (ch.area  && ch.area.destroy)  ch.area.destroy();  } catch (e) {}
        state.leaderDash.__charts = null;
    }

    // v1.12.1: helper para construir las options del area chart segun el trend struct.
    //   Centralizado para que mountLeaderCharts y updateLeaderAreaChart usen el mismo shape.
    function buildLeaderAreaOptions(trend) {
        return {
            chart: { type: 'area', height: 240, fontFamily: 'Manrope, system-ui, sans-serif', toolbar: { show: false }, zoom: { enabled: false } },
            series: [{ name: trend.title, data: trend.data }],
            xaxis: { categories: trend.categories, labels: { style: { fontSize: '10px', colors: '#78716c' } } },
            yaxis: { min: 0, max: trend.yMax, labels: { style: { fontSize: '10px', colors: '#78716c' }, formatter: function (v) { return v + '%'; } } },
            colors: ['#3B82F6'],
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 0.4, opacityFrom: 0.4, opacityTo: 0.05 } },
            dataLabels: { enabled: false },
            grid: { borderColor: '#e7e5e4', strokeDashArray: 3 },
            annotations: {
                yaxis: [{
                    y: trend.target,
                    borderColor: '#10B981',
                    strokeDashArray: 4,
                    label: { borderColor: '#10B981', style: { color: '#fff', background: '#10B981', fontSize: '10px' }, text: 'Target ' + trend.target + '%' }
                }]
            },
            tooltip: { y: { formatter: function (v) { return v + '%'; } } }
        };
    }

    function mountLeaderCharts() {
        var donutEl = document.getElementById('qida-leader-donut');
        var areaEl  = document.getElementById('qida-leader-area');
        if (!donutEl || !areaEl) return;

        if (typeof window.ApexCharts === 'undefined') {
            var fallback = '<div class="qida-leader-chart-fallback">Las gráficas no se cargaron correctamente.<br/>Recargá la página para reintentarlo.</div>';
            donutEl.innerHTML = fallback;
            areaEl.innerHTML  = fallback;
            return;
        }

        var afs = filterAndSortAfs(MOCK_LEADER_AFS, state.leaderDash);
        var temp = buildLeaderTemperature(afs);
        var trend = buildLeaderTrendSeries();   // v1.12.1: globales

        var donutOptions = {
            chart: { type: 'donut', height: 240, fontFamily: 'Manrope, system-ui, sans-serif', toolbar: { show: false } },
            series: [temp.hot, temp.warm, temp.cold],
            labels: ['Calientes', 'Templados', 'Fríos'],
            colors: ['#EF4444', '#F59E0B', '#3B82F6'],
            legend: { position: 'bottom', fontSize: '12px' },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            plotOptions: {
                pie: {
                    donut: {
                        size: '70%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Leads totales',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: '#78716c',
                                formatter: function () { return String(temp.total); }
                            },
                            value: { fontSize: '22px', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, color: '#1c1917' }
                        }
                    }
                }
            },
            tooltip: { y: { formatter: function (v) { return v + ' leads'; } } }
        };

        var areaOptions = buildLeaderAreaOptions(trend);

        try {
            var donut = new window.ApexCharts(donutEl, donutOptions);
            donut.render();
            var area = new window.ApexCharts(areaEl, areaOptions);
            area.render();
            state.leaderDash.__charts = { donut: donut, area: area };
        } catch (e) {
            log('mountLeaderCharts failed', e && e.message);
            var fallback2 = '<div class="qida-leader-chart-fallback">Las gráficas no se cargaron correctamente.<br/>Recargá la página para reintentarlo.</div>';
            donutEl.innerHTML = fallback2;
            areaEl.innerHTML = fallback2;
        }
    }

    // v1.12.1: toggle de metrica de tendencia sin destruir el donut. Si las refs de chart no
    //   estan vivas (caso raro: ApexCharts no cargo), fallback a rerender completo. updateOptions
    //   + updateSeries son APIs de ApexCharts v3.x+.
    function updateLeaderAreaChart() {
        var ch = state.leaderDash.__charts;
        if (!ch || !ch.area || typeof window.ApexCharts === 'undefined') {
            rerenderContent();
            return;
        }
        var trend = buildLeaderTrendSeries();
        try {
            ch.area.updateOptions(buildLeaderAreaOptions(trend), false, true);
        } catch (e) {
            log('updateLeaderAreaChart failed, falling back to full rerender', e && e.message);
            rerenderContent();
            return;
        }

        // Actualizar titulo + sub + estado activo de las pills sin rerender total.
        var titleEl = document.getElementById('qida-leader-trend-title');
        if (titleEl) titleEl.textContent = trend.title;
        var subEl = document.getElementById('qida-leader-trend-sub');
        if (subEl) subEl.textContent = 'últimos 6 meses · target ' + trend.target + '%';
        var pills = document.querySelectorAll('.qida-leader-pills .qida-leader-pill');
        for (var i = 0; i < pills.length; i++) {
            var k = pills[i].getAttribute('data-id');
            if (k === trend.metric) pills[i].classList.add('active');
            else pills[i].classList.remove('active');
        }
    }

    // ============================================================
    // v1.15: RENDER "Armá tu asistente" (state.view === 'agentBuilder')
    // ============================================================
    function deepCopyVariants(arr) {
        var out = [];
        for (var i = 0; i < (arr || []).length; i++) out.push({ name: arr[i].name, length: arr[i].length, tone_style: arr[i].tone_style });
        return out;
    }
    function agentBuilderDirty() {
        return JSON.stringify(state.draftVariants) !== JSON.stringify(state.draftVariantsSaved);
    }

    function renderAgentBuilder() {
        var variants = state.draftVariants || [];
        var v = validateVariants(variants);
        var dirty = agentBuilderDirty();
        var saveDisabled = (!v.ok || !dirty) ? ' disabled' : '';

        var rowsHtml = '';
        for (var i = 0; i < variants.length; i++) rowsHtml += renderVariantRow(variants[i], i, v.errors[i]);

        var addDisabled = (variants.length >= 3) ? ' disabled' : '';
        var generalErr = v.general ? '<p class="qida-ab-general-error">' + esc(v.general) + '</p>' : '';

        return '<div class="qida-ab">'
            + '<div class="qida-ab-inner">'
                + '<p class="qida-ab-lead">Configurá de 1 a 3 variantes de borrador. Cuando uses "Sugerir mensaje" en un lead, el asistente propondrá una opción por cada variante. La IA propone; vos editás y enviás.</p>'
                + '<div class="qida-ab-list">' + rowsHtml + '</div>'
                + generalErr
                + '<button class="qida-btn-ghost qida-ab-add" data-action="ab-add-variant"' + addDisabled + '>' + icon('plus', 13) + ' Agregar variante</button>'
                + '<div class="qida-ab-foot">'
                    + '<button class="qida-btn-ghost" data-action="ab-back">Cancelar</button>'
                    + '<button class="qida-btn-primary" data-action="ab-save"' + saveDisabled + '>' + icon('check', 13) + ' Guardar</button>'
                + '</div>'
            + '</div>'
            + (state.agentBuilderConfirmDiscard ? renderDiscardConfirm() : '')
        + '</div>';
    }

    function renderVariantRow(variant, idx, errMsg) {
        function opt(val, label, selected) { return '<option value="' + esc(val) + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>'; }
        var lenOpts = '', toneOpts = '';
        for (var i = 0; i < DRAFT_LENGTHS.length; i++) lenOpts += opt(DRAFT_LENGTHS[i], LENGTH_LABELS[DRAFT_LENGTHS[i]], variant.length === DRAFT_LENGTHS[i]);
        for (var j = 0; j < TONE_STYLES.length; j++) toneOpts += opt(TONE_STYLES[j], TONE_LABELS[TONE_STYLES[j]], variant.tone_style === TONE_STYLES[j]);
        var removeDisabled = (state.draftVariants.length <= 1) ? ' disabled' : '';

        return '<div class="qida-ab-row' + (errMsg ? ' has-error' : '') + '">'
            + '<div class="qida-ab-fields">'
                + '<div class="qida-ab-field qida-ab-field-name">'
                    + '<label class="qida-ab-label">Nombre</label>'
                    + '<input type="text" class="qida-ab-input" data-input="ab-name" data-idx="' + idx + '" maxlength="60" value="' + esc(variant.name || '') + '" placeholder="ej. corto_directo" />'
                + '</div>'
                + '<div class="qida-ab-field">'
                    + '<label class="qida-ab-label" title="' + esc(LENGTH_TOOLTIP) + '">Largo ' + icon('alert', 10) + '</label>'
                    + '<select class="qida-leader-select qida-ab-select" data-input="ab-length" data-idx="' + idx + '">' + lenOpts + '</select>'
                + '</div>'
                + '<div class="qida-ab-field">'
                    + '<label class="qida-ab-label" title="' + esc(TONE_TOOLTIP) + '">Tono ' + icon('alert', 10) + '</label>'
                    + '<select class="qida-leader-select qida-ab-select" data-input="ab-tone" data-idx="' + idx + '">' + toneOpts + '</select>'
                + '</div>'
                + '<button class="qida-ab-remove" data-action="ab-remove-variant" data-idx="' + idx + '" aria-label="Quitar variante" title="Quitar"' + removeDisabled + '>' + icon('x', 14) + '</button>'
            + '</div>'
            + (errMsg ? '<p class="qida-ab-error">' + esc(errMsg) + '</p>' : '')
        + '</div>';
    }

    function renderDiscardConfirm() {
        return '<div class="qida-ab-confirm-overlay">'
            + '<div class="qida-ab-confirm">'
                + '<p class="qida-ab-confirm-title">¿Descartar cambios?</p>'
                + '<p class="qida-ab-confirm-sub">Tenés cambios sin guardar en tu asistente.</p>'
                + '<div class="qida-ab-confirm-actions">'
                    + '<button class="qida-btn-ghost" data-action="ab-discard-cancel">Seguir editando</button>'
                    + '<button class="qida-btn-primary qida-ab-discard-btn" data-action="ab-discard-confirm">Descartar</button>'
                + '</div>'
            + '</div>'
        + '</div>';
    }

    // ============================================================
    // RENDER: content dispatcher
    // ============================================================
    function renderContent() {
        if (state.view === 'leadersDashboard') return renderLeadersDashboard();
        if (state.view === 'agentBuilder') return renderAgentBuilder();
        return state.view === 'detail' ? renderDetail() : renderDashboard();
    }

    // ============================================================
    // RERENDER + side overlays
    // ============================================================
    function syncShellSizing() {
        var shell = document.getElementById('qida-shell');
        if (!shell) return;
        // v1.12.1: tercera class para el modal de lideres (mas grande). Mutuamente excluyente
        //   con qida-view-detail. Cuando view='dashboard', se quitan ambas.
        if (state.view === 'leadersDashboard') {
            shell.classList.add('qida-view-leaders');
            shell.classList.remove('qida-view-detail');
        } else if (state.view === 'detail') {
            shell.classList.add('qida-view-detail');
            shell.classList.remove('qida-view-leaders');
        } else {
            shell.classList.remove('qida-view-detail');
            shell.classList.remove('qida-view-leaders');
        }
    }

    function rerenderContent() {
        var content = document.getElementById('qida-content');
        if (!content) return;
        // v1.12: destroyear charts del panel de lideres ANTES de innerHTML swap para evitar
        //   memory leaks. Las instancias quedan en state.leaderDash.__charts.
        if (state.leaderDash && state.leaderDash.__charts) {
            destroyLeaderCharts();
        }
        content.innerHTML = renderContent();
        syncShellSizing();
        syncShellHeader();
        syncScheduleModal();
        // v1.10: syncAssistantHeader eliminada (junto con todo el bloque del asistente).
        syncToast();
        // v1.12: mount ApexCharts post-innerHTML solo si estamos en la vista leaders.
        if (state.view === 'leadersDashboard') {
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(mountLeaderCharts);
            } else {
                setTimeout(mountLeaderCharts, 16);
            }
        }
        // v1.6: auto-scroll del pane WhatsApp post-rerender si el flag esta seteado.
        if (state.__waNeedsScroll) {
            state.__waNeedsScroll = false;
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(scrollWaToBottom);
            } else {
                setTimeout(scrollWaToBottom, 16);
            }
        }
        // v1.9.1: idem para el pane Chat IA. Se setea en pushAiChat y al entrar al detalle.
        if (state.__aiNeedsScroll) {
            state.__aiNeedsScroll = false;
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(scrollAiToBottom);
            } else {
                setTimeout(scrollAiToBottom, 16);
            }
        }
    }

    function scrollWaToBottom() {
        var body = document.getElementById('qida-wa-body');
        if (body) body.scrollTop = body.scrollHeight;
    }

    function scrollAiToBottom() {
        var body = document.getElementById('qida-pane-ai-body');
        if (body) body.scrollTop = body.scrollHeight;
    }

    // v1.6: helper de nivel para colores degradados por "dias sin contacto".
    // v1.10: extendido de 4 a 6 niveles para soportar las 5 bandas del dashboard nuevo
    //   (warn / orange / stale / danger) + el caso especial today + el caso fresh.
    //   El shell header del detalle solo lee today/fresh/warn/stale (los CSS existentes).
    //   El dashboard nuevo (qida-cooling-*) consume las 6 bandas.
    function daysWithoutTouchLevel(days) {
        if (days === 0) return 'lvl-today';
        if (days <= 3)  return 'lvl-fresh';
        if (days <= 7)  return 'lvl-warn';
        if (days <= 14) return 'lvl-orange';
        if (days <= 20) return 'lvl-stale';
        return 'lvl-danger';
    }

    // v1.6: shell header dinamico. En dashboard mantiene el bloque Sparkles + Seguimientos +
    // sub. En detail lo reemplaza por Volver + nombre + ID + badge dias + datos compactos.
    // El asistente del header (qida-asst-anchor) se preserva en el DOM aunque vacio en detail.
    // v1.17: selector compacto de temperatura (dropdown anclado al pill + backdrop click-fuera).
    function renderTempEditor(current) {
        var opts = ['caliente', 'templado', 'frio', 'pausa'];
        var items = '';
        for (var i = 0; i < opts.length; i++) {
            var k = opts[i], m = TEMP_META[k];
            items += '<button class="qida-temp-opt' + (k === current ? ' active' : '') + '" data-action="set-temp" data-id="' + k + '">'
                + '<i class="qida-tbar qida-tbar-' + m.cls + '"></i>' + esc(m.label)
            + '</button>';
        }
        return '<div class="qida-temp-backdrop" data-action="close-temp-editor"></div>'
            + '<div class="qida-temp-menu">' + items + '</div>';
    }

    function syncShellHeader() {
        var header = document.querySelector('.qida-shell-header');
        if (!header) return;
        if (state.view === 'detail') {
            var lead = getLead(state.currentLeadId);
            var titleHtml = '';
            if (lead) {
                var days = lead.daysWithoutTouch;
                var lvl = daysWithoutTouchLevel(days);
                var daysLabel = (days === 0) ? 'Hoy' : ('Sin contacto: ' + days + (days === 1 ? ' día' : ' días'));
                // v1.17: pill de temperatura editable (lee el override de sesión EDITS.temperatures).
                var tempKey = normalizeTemp(getLeadTemperature(lead));
                var tMeta = TEMP_META[tempKey] || { label: '—', cls: '' };
                var tempPill = '<span class="qida-dsh-temp-wrap">'
                    + '<button class="qida-dsh-temp" data-action="open-temp-editor" title="Cambiar temperatura" aria-haspopup="true">'
                        + '<i class="qida-tbar qida-tbar-' + tMeta.cls + '"></i>' + esc(tMeta.label) + ' ' + icon('edit', 10)
                    + '</button>'
                    + (state.tempEditorOpen ? renderTempEditor(tempKey) : '')
                + '</span>';
                titleHtml = '<div class="qida-detail-shell-head">'
                    + '<button class="qida-back" data-action="back-to-dashboard" aria-label="Volver al listado">' + icon('arrowLeft', 12) + ' Volver</button>'
                    + '<span class="qida-dsh-name">' + esc(lead.name) + '</span>'
                    + '<span class="qida-dsh-id">' + esc(lead.id) + '</span>'
                    + '<span class="qida-dsh-days ' + lvl + '">' + icon('clock', 11) + ' ' + esc(daysLabel) + '</span>'
                    + '<span class="qida-dsh-sep">&middot;</span>'
                    // v1.17: pill de temperatura como hijo directo del head (NO dentro de .qida-dsh-meta,
                    //   que tiene overflow:hidden y cliparía el dropdown). Queda alineado con las referencias.
                    + tempPill
                    + '<span class="qida-dsh-sep">&middot;</span>'
                    + '<span class="qida-dsh-meta">'
                        + '<span class="qida-dsh-meta-item">' + icon('users', 11) + ' ' + esc(lead.relation + ' ' + lead.caredPersonName + ', ' + lead.age + ' anos') + '</span>'
                        + '<span class="qida-dsh-sep">&middot;</span>'
                        + '<span class="qida-dsh-meta-item">' + icon('mapPin', 11) + ' ' + esc(lead.location) + '</span>'
                        + '<span class="qida-dsh-sep">&middot;</span>'
                        + '<span class="qida-dsh-meta-item">' + icon('phone', 11) + ' ' + esc(lead.phone) + '</span>'
                        + '<span class="qida-dsh-sep">&middot;</span>'
                        + '<span class="qida-dsh-meta-item">' + icon('briefcase', 11) + ' ' + esc(lead.serviceType || '-') + '</span>'
                    + '</span>'
                + '</div>';
            } else {
                titleHtml = '<div class="qida-detail-shell-head">'
                    + '<button class="qida-back" data-action="back-to-dashboard">' + icon('arrowLeft', 12) + ' Volver</button>'
                + '</div>';
            }
            // v1.17: botón "Swap" eliminado. El layout queda fijo en el default (detailLayoutSwapped
            //   sigue true: IA al centro, info a la derecha). Solo Esc + X a la derecha.
            header.innerHTML = titleHtml
                + '<div class="qida-shell-actions">'
                    + '<span class="qida-esc">Esc para cerrar</span>'
                    + '<button class="qida-icon-btn" data-action="close-modal" aria-label="Cerrar">' + icon('x', 18) + '</button>'
                + '</div>';
        } else if (state.view === 'leadersDashboard') {
            // v1.12: header del panel de lideres. Titulo a la izquierda + Esc/X a la derecha.
            header.innerHTML = ''
                + '<div class="qida-shell-title">'
                    + '<div class="qida-shell-mark">' + icon('bar-chart-2', 16) + '</div>'
                    + '<div>'
                        + '<div class="qida-shell-tt-main">Seguimientos v2 · Panel de líderes</div>'
                        + '<div class="qida-shell-tt-sub">Operativo del equipo · ' + (_currentUserEmail || 'modo dev') + '</div>'
                    + '</div>'
                + '</div>'
                + '<div class="qida-shell-actions">'
                    + '<span class="qida-esc">Esc para cerrar</span>'
                    + '<button class="qida-icon-btn" data-action="close-modal" aria-label="Cerrar">' + icon('x', 18) + '</button>'
                + '</div>';
        } else if (state.view === 'agentBuilder') {
            // v1.15: header de "Armá tu asistente". Volver a la izquierda + Esc/X a la derecha.
            header.innerHTML = ''
                + '<div class="qida-detail-shell-head">'
                    + '<button class="qida-back" data-action="ab-back" aria-label="Volver">' + icon('arrowLeft', 12) + ' Volver</button>'
                    + '<span class="qida-dsh-name">Armá tu asistente</span>'
                + '</div>'
                + '<div class="qida-shell-actions">'
                    + '<span class="qida-esc">Esc para cerrar</span>'
                    + '<button class="qida-icon-btn" data-action="close-modal" aria-label="Cerrar">' + icon('x', 18) + '</button>'
                + '</div>';
        } else {
            // v1.10: shell header minimo en dashboard. v1.15: + boton chico "Armá tu asistente"
            //   a la derecha, antes de "Esc para cerrar". Visible para todas las AFs (sin flag).
            header.innerHTML = ''
                + '<div class="qida-shell-actions">'
                    + '<button class="qida-ab-open-btn" data-action="open-agent-builder">' + icon('sparkles', 13) + ' Armá tu asistente</button>'
                    + '<span class="qida-esc">Esc para cerrar</span>'
                    + '<button class="qida-icon-btn" data-action="close-modal" aria-label="Cerrar">' + icon('x', 18) + '</button>'
                + '</div>';
        }
    }

    // v1.10: syncAssistantHeader ELIMINADA junto con todo el bloque del asistente del
    //   dashboard. El anchor qida-asst-anchor sigue vivo SOLO en la rama detail de
    //   syncShellHeader (queda como hueco vacio para no romper la geometria de la fila
    //   del header del detalle - mantiene el espaciado entre el meta del lead y el boton
    //   swap). No hay renderAssistantPill/Expanded/HeaderChip/Panel ya.

    function syncScheduleModal() {
        var shell = document.getElementById('qida-shell');
        if (!shell) return;
        var existing = document.getElementById('qida-schedule-root');
        if (state.showScheduleModal && state.view === 'detail') {
            if (existing) existing.parentNode.removeChild(existing);
            var div = document.createElement('div');
            div.id = 'qida-schedule-root';
            div.innerHTML = renderSchedule();
            shell.appendChild(div);
        } else {
            if (existing) existing.parentNode.removeChild(existing);
        }
    }

    function syncToast() {
        var shell = document.getElementById('qida-shell');
        if (!shell) return;
        var existing = document.getElementById('qida-toast-root');
        if (existing) existing.parentNode.removeChild(existing);
        if (!state.toast) return;
        var div = document.createElement('div');
        div.id = 'qida-toast-root';
        div.className = 'qida-toast';
        div.innerHTML = icon('check', 14) + ' ' + esc(state.toast.msg);
        shell.appendChild(div);
        // Force reflow then add .show
        void div.offsetWidth;
        div.className = 'qida-toast show';
    }

    function showToast(msg) {
        state.toast = { msg: msg, ts: Date.now() };
        syncToast();
        setTimeout(function () {
            if (state.toast && Date.now() - state.toast.ts >= 2900) {
                state.toast = null;
                syncToast();
            }
        }, 3000);
    }

    function setState(patch) {
        for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) state[k] = patch[k];
        rerenderContent();
    }

    // ============================================================
    // EVENT DELEGATION
    // ============================================================
    function findActionTarget(node) {
        while (node && node.nodeType === 1) {
            if (node.hasAttribute && node.hasAttribute('data-action')) return node;
            node = node.parentNode;
        }
        return null;
    }

    function handleClick(e) {
        var target = findActionTarget(e.target);

        // v1.10: el click-outside del asistente expandido se elimino junto con el bloque
        //   del asistente del dashboard. No quedan estados intermedios que cerrar.

        if (!target) return;
        var action = target.getAttribute('data-action');
        var id = target.getAttribute('data-id');

        switch (action) {
            case 'open-modal':       openModal(); return;
            case 'close-modal':      closeModal(); return;
            case 'overlay-backdrop': if (e.target === target) closeModal(); return;

            // v1.12: panel de lideres
            case 'open-leaders-dashboard':
                openLeadersDashboard();
                return;

            // v1.15: "Armá tu asistente"
            case 'open-agent-builder':
                openAgentBuilder();
                return;
            case 'ab-back':
                abBack();
                return;
            case 'ab-discard-cancel':
                setState({ agentBuilderConfirmDiscard: false });
                return;
            case 'ab-discard-confirm':
                abDiscardAndLeave();
                return;
            case 'ab-add-variant':
                if (state.draftVariants.length < 3) {
                    state.draftVariants.push({ name: '', length: 'medium', tone_style: 'neutral' });
                    rerenderContent();
                }
                return;
            case 'ab-remove-variant': {
                var rmIdx = parseInt(target.getAttribute('data-idx'), 10);
                if (state.draftVariants.length > 1 && rmIdx >= 0 && rmIdx < state.draftVariants.length) {
                    state.draftVariants.splice(rmIdx, 1);
                    rerenderContent();
                }
                return;
            }
            case 'ab-save': {
                var val = validateVariants(state.draftVariants);
                if (!val.ok) { rerenderContent(); return; }   // botón ya debería estar disabled
                var afKey = resolveAfKey();
                var working = deepCopyVariants(state.draftVariants);
                DraftService.saveDraftVariants(afKey, working).then(function (res) {
                    if (res && res.ok) {
                        state.draftVariantsSaved = deepCopyVariants(working);
                        showToast('Asistente guardado.');
                        rerenderContent();
                    } else {
                        showToast('No se pudo guardar (revisá los campos).');
                        rerenderContent();
                    }
                });
                return;
            }

            case 'leader-sort': {
                var col = id;
                var ld = state.leaderDash;
                if (ld.sortCol === col) {
                    ld.sortDir = (ld.sortDir === 'asc') ? 'desc' : 'asc';
                } else {
                    ld.sortCol = col;
                    ld.sortDir = 'asc';
                }
                rerenderContent();
                return;
            }
            case 'leader-export':
                showToast('Exportar: pendiente de cablear');
                return;
            case 'leader-trend-metric':
                // v1.12.1: toggle entre conversion/coverage en el area chart. Update in-place
                //   sin destruir el donut (mejor UX, evita flicker).
                if (!id || id === state.leaderDash.trendMetric) return;
                state.leaderDash.trendMetric = id;
                updateLeaderAreaChart();
                return;

            case 'select-lead':
                // v1.6: inicializamos draftMessage='' y attachmentsExpanded=false. NO tocar aiChatHistory.
                state.__waNeedsScroll = true;
                state.__aiNeedsScroll = true;  // v1.9.1: scroll inicial al fondo del chat IA si hay historial.
                // v1.11: normalizamos leadId a number cuando es numerico (los data-id del DOM
                //   son siempre strings; los leadIds de Odoo son int). Lo hacemos UNA vez aca,
                //   antes del setState, para que state.currentLeadId quede como number desde el
                //   inicio y el race-guard de LeadDetailService.fetchAll compare con ===
                //   estricto sin coercion.
                var leadIdNum = (typeof id === 'string' && /^\d+$/.test(id)) ? parseInt(id, 10) : id;
                setState({ view: 'detail', currentLeadId: leadIdNum, draftMessage: '', attachmentsExpanded: false, editingIaSummary: false, addingNote: false, tempEditorOpen: false });
                // v1.11: SIEMPRE llamamos a fetchAll (incluso en modo mock - el service lo
                //   detecta y hace mockHydrate sync, sin loading visible). Solo skipeamos si
                //   ya hay cache valido (sin _error) para evitar fetchs redundantes en cache hits.
                var existing = LeadDetailService.getFromCache(leadIdNum);
                if (!existing || existing._error) {
                    LeadDetailService.fetchAll(leadIdNum);
                }
                return;
            case 'back-to-dashboard':
                // v1.6: limpiamos currentLeadId, draftMessage, attachmentsExpanded. NO tocar aiChatHistory.
                setState({ view: 'dashboard', currentLeadId: null, draftMessage: '', attachmentsExpanded: false, editingIaSummary: false, addingNote: false, tempEditorOpen: false });
                return;

            // --- v1.10: dashboard de leads enfriandose ---
            case 'mark-done': {
                // Marca el lead como "hecho hoy" en sesion y programa un toast de undo
                // por 4 segundos. Si la AF ya tenia un undo activo de OTRA fila, lo
                // sobreescribimos (clearTimeout previo + asignacion nueva). El lead
                // anterior queda permanentemente marcado en sesion.
                if (!id) return;
                state.completedTodayIds.add(id);
                state.undoToast = { leadId: id, expiresAt: Date.now() + 4000 };
                if (state.undoTimeoutId) clearTimeout(state.undoTimeoutId);
                state.undoTimeoutId = setTimeout(function () {
                    // Si el toast cambio de fila desde que se programo, no hacemos nada
                    // (el setTimeout nuevo ya escribio sobre el state).
                    state.undoToast = null;
                    state.undoTimeoutId = null;
                    rerenderContent();
                }, 4000);
                rerenderContent();
                return;
            }
            case 'undo-mark-done': {
                if (state.undoToast) {
                    state.completedTodayIds["delete"](state.undoToast.leadId);
                    state.undoToast = null;
                    if (state.undoTimeoutId) {
                        clearTimeout(state.undoTimeoutId);
                        state.undoTimeoutId = null;
                    }
                }
                rerenderContent();
                return;
            }
            // v1.13: cambio de vista (chip) -> fetch al endpoint correspondiente. resetea filtros.
            case 'dash-set-view': {
                if (!id || id === state.dashView) return;
                loadDashView(id, true);
                return;
            }
            // Refrescar: re-fetch de la vista activa (refresca el badge WhatsApp). NO resetea filtros.
            //   MVP: refresh manual del badge WhatsApp (boton Refrescar o cambio de vista).
            //   TODO: evaluar polling cada 30-60s o push (SignalR/SSE) en iteracion siguiente.
            //   La logica de marcar como leido la maneja el backend al abrir el detalle del lead.
            case 'dash-refresh': {
                loadDashView(state.dashView, false);
                return;
            }
            case 'dash-toggle-filters': {
                setState({ dashFiltersExpanded: !state.dashFiltersExpanded });
                return;
            }
            // Chips de Filtros: toggle del segmento (re-click limpia). Client-side.
            case 'dash-set-segment': {
                setState({ dashSegment: (state.dashSegment === id) ? null : id });
                return;
            }
            // Cards de temperatura: escriben el MISMO state.dashSegment que los chips (cards ≡ chips).
            //   Re-click sobre la card activa limpia el filtro.
            case 'dash-set-temp': {
                setState({ dashSegment: (state.dashSegment === id) ? null : id });
                return;
            }
            // Pill WhatsApp: toggle del filtro hasNewMessage (AND con el segmento). Client-side.
            case 'dash-toggle-new': {
                setState({ dashOnlyNew: !state.dashOnlyNew });
                return;
            }
            // v1.14: limpia todos los filtros client-side de una (segmento + pill).
            case 'dash-clear-filters': {
                setState({ dashSegment: null, dashOnlyNew: false });
                return;
            }

            // v1.6: handlers set-panel / toggle-edit-temp / set-temp / copy-tpl eliminados.
            // El pane derecho (tabs) ya no existe y la temperatura del lead deja de ser editable
            // desde el detalle (queda fija desde el dashboard).

            case 'edit-ia-summary':   setState({ editingIaSummary: true }); return;
            case 'cancel-ia-summary': setState({ editingIaSummary: false }); return;
            case 'save-ia-summary':
                var ta = document.getElementById('qida-ia-edit');
                if (ta) {
                    var orig = MOCK_IA_SUMMARIES[state.currentLeadId] || { generatedAt: 'recien' };
                    EDITS.iaSummaries[state.currentLeadId] = { text: ta.value, editedBy: 'Patricia V.', generatedAt: orig.generatedAt };
                }
                setState({ editingIaSummary: false });
                showToast('Resumen editado');
                return;
            case 'regen-ia-summary':
                showToast('Regenerando resumen IA... (mock)');
                return;
            // v1.16: Análisis IA. Preparación de UI: por ahora solo console.log (sin backend).
            //   TODO[backend]: disparar la generación real cuando exista el endpoint.
            case 'regen-ia-analysis':
                console.log('[QidaAssistant] regen-ia-analysis (mock, sin backend)', state.currentLeadId);
                showToast('Generando análisis IA... (mock)');
                return;

            case 'start-add-note':    setState({ addingNote: true }); return;
            case 'cancel-add-note':   setState({ addingNote: false }); return;
            case 'save-new-note':
                var nt = document.querySelector('[data-input="new-note"]');
                if (nt && nt.value.trim()) {
                    var lid = state.currentLeadId;
                    if (!EDITS.notes[lid]) EDITS.notes[lid] = [];
                    EDITS.notes[lid].unshift({ author: 'Patricia V.', date: 'Justo ahora', text: nt.value.trim() });
                }
                setState({ addingNote: false });
                showToast('Nota guardada');
                return;

            case 'open-attachment':
                showToast('Descargando ' + (id || 'adjunto') + ' (mock)');
                return;

            // v1.6: WhatsApp send mock + clip visual
            case 'wa-send':
                var waTa = document.getElementById('qida-wa-textarea');
                if (waTa) state.draftMessage = waTa.value;
                sendWhatsAppMock(state.currentLeadId, state.draftMessage);
                return;
            case 'wa-clip':
                showToast('Adjuntar archivo (mock)');
                return;

            // v1.6: Adjuntos colapsable en pane central
            case 'toggle-attachments':
                setState({ attachmentsExpanded: !state.attachmentsExpanded });
                return;

            // v1.6: Chat IA al pie del pane central
            case 'ai-chip':
                handleAiChip(id);
                return;
            case 'ai-chat-send':
                var aiInp = document.getElementById('qida-aichat-input');
                handleAiChatSend(aiInp ? aiInp.value : (state.aiChatDraft || ''));
                return;
            // v1.8: la AF elige una variante (sugerir mensaje o reactivar) -> push al chat
            //   como user message + respuesta IA tipo refine. Material marketing mantiene su
            //   propio handler ai-material-action (sin tocar).
            case 'ai-pick-variant':
                var pickLabel = target.getAttribute('data-label') || 'Esta opcion';
                var pickText = target.getAttribute('data-text') || '';
                // v1.15: si es un draft configurado, arrastramos la metadata (PII-safe) para la
                //   telemetría posterior al copiar. material/reactivar no traen estos data-*.
                var pickMeta = (target.getAttribute('data-source') === 'draft')
                    ? { source: 'draft', name: target.getAttribute('data-variant-name') || '', length: target.getAttribute('data-length') || '', tone_style: target.getAttribute('data-tone') || '' }
                    : null;
                pushAiPickVariant(state.currentLeadId, pickLabel, pickText, pickMeta);
                state.aiChatDraft = '';
                rerenderContent();
                return;
            // v1.8: copia el texto refinado al textarea de WhatsApp. La AF revisa, edita si
            //   quiere, y clickea send. Principio rector: IA propone, AF envia.
            case 'ai-copy-to-wa':
                var msgText = target.getAttribute('data-text') || '';
                state.draftMessage = msgText;
                // v1.15 (Pieza C): draft_copied al momento del rellenado, SOLO si vino de un draft
                //   configurado (data-source="draft"). PII-safe (solo metadata, nunca el texto).
                if (target.getAttribute('data-source') === 'draft') {
                    sendAssistantEvent('draft_copied', {
                        lead_id: state.currentLeadId,
                        variant_name: target.getAttribute('data-variant-name') || '',
                        length: target.getAttribute('data-length') || '',
                        tone_style: target.getAttribute('data-tone') || ''
                    });
                }
                rerenderContent();
                // Focus al textarea de WhatsApp y cursor al final.
                setTimeout(function () {
                    var ta = document.getElementById('qida-wa-textarea');
                    if (ta) {
                        ta.focus();
                        try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (err) {}
                        // v1.9: expandir el textarea para mostrar el mensaje completo (3-5 lineas)
                        // sin obligar a scrollear. El input handler de wa-draft no se dispara
                        // cuando seteamos draftMessage por codigo.
                        autoResizeTextarea(ta);
                    }
                }, 30);
                showToast('Mensaje copiado al campo de WhatsApp. Editalo y envialo.');
                return;
            case 'ai-material-action':
                var matTitle = target.getAttribute('data-title') || 'material';
                showToast('"' + matTitle + '" listo (mock)');
                return;
            // v1.17: temperatura editable en el header del detalle.
            case 'open-temp-editor':
                setState({ tempEditorOpen: !state.tempEditorOpen });
                return;
            case 'close-temp-editor':
                if (state.tempEditorOpen) setState({ tempEditorOpen: false });
                return;
            case 'set-temp':
                if (id) {
                    // TODO[odoo]: PUT /api/leads/{lead_id}/temperature { temperature: id }. Por ahora
                    //   solo override local en sesión (EDITS.temperatures, que getLeadTemperature lee).
                    EDITS.temperatures[state.currentLeadId] = { temperature: id, source: 'AF' };
                    state.tempEditorOpen = false;
                    rerenderContent();
                    showToast('Temperatura actualizada');
                }
                return;

            case 'open-schedule':
                // v1.6: el invocador desde el footer del detalle se elimino. Se preserva el
                // handler para reactivacion v1.7+ desde otros puntos de entrada (ej. detalle
                // del lead con boton "marcar hecha sin agendar").
                openScheduleFromDetail();
                return;
            case 'schedule-cancel':
                closeScheduleModal();
                return;
            case 'schedule-bg':
                if (e.target === target) closeScheduleModal();
                return;
            case 'schedule-shortcut':
                var days2 = parseInt(id, 10);
                var iso2 = addDaysISO(days2);
                state.scheduleDate = iso2;
                state.scheduleMarkPause = (days2 > 21);
                rerenderContent();
                return;
            case 'schedule-confirm':
                handleScheduleConfirm();
                return;
            case 'schedule-close-apply':
                handleScheduleCloseApply();
                return;
        }
    }

    function openScheduleFromDetail() {
        var lead = getLead(state.currentLeadId);
        var defaultIso = addDaysISO(7);
        setState({
            showScheduleModal: true,
            scheduleDate: defaultIso,
            scheduleNote: lead ? buildScheduleNote(lead) : '',
            scheduleMarkPause: false,
            scheduleOrigin: 'detail',
            scheduleLeadIdOverride: null
        });
    }

    // TODO v1.6+: agregar "marcar hecha sin agendar" como accion desde el detalle del lead.
    // Caso: AF hizo el seguimiento por via externa (llamada celular, presencial, etc.) y quiere
    // limpiar la sugerencia/actividad sin agendar proximo. Hoy queda como gap conocido: el
    // dashboard v1.5 ya no invoca estas funciones. Se preservan para reconectarlas desde el
    // detail del lead en proxima iteracion. Tambien se preservan __pendingSuggestionDoneId /
    // __pendingActivityDoneId en state y las ramas correspondientes en handleScheduleConfirm
    // y handleScheduleCloseApply por el mismo motivo.
    //
    // Reuse del Schedule modal desde "Marcar hecho" de Sugerencias del dia.
    // Mantiene la opcion "Cerrar lead sin agendar" (Perdido / Convertido / Sin interes / Otro)
    // segun ajuste del 15-may.
    function openScheduleFromSuggestion(sugId, leadId) {
        var lead = getLead(leadId);
        var defaultIso = addDaysISO(7);
        setState({
            showScheduleModal: true,
            scheduleDate: defaultIso,
            scheduleNote: lead ? buildScheduleNote(lead) : '',
            scheduleMarkPause: false,
            scheduleOrigin: 'suggestion',
            scheduleLeadIdOverride: leadId
        });
        state.__pendingSuggestionDoneId = sugId;
    }

    // TODO v1.6+: ver nota arriba sobre openScheduleFromSuggestion. Misma logica de reserva.
    function openScheduleFromActivity(actId, leadId) {
        var lead = getLead(leadId);
        var defaultIso = addDaysISO(7);
        setState({
            showScheduleModal: true,
            scheduleDate: defaultIso,
            scheduleNote: lead ? buildScheduleNote(lead) : '',
            scheduleMarkPause: false,
            scheduleOrigin: 'activity',
            scheduleLeadIdOverride: leadId
        });
        state.__pendingActivityDoneId = actId;
    }

    function closeScheduleModal() {
        state.__pendingSuggestionDoneId = null;
        state.__pendingActivityDoneId = null;
        setState({
            showScheduleModal: false,
            scheduleDate: null,
            scheduleNote: '',
            scheduleMarkPause: false,
            scheduleOrigin: 'detail',
            scheduleLeadIdOverride: null
        });
    }

    // v1.10: runAssistantSearch y handleSetSort ELIMINADAS junto con sus consumidores
    //   (asistente del dashboard y headers sorteables de la tabla unificada).

    function handleScheduleConfirm() {
        if (!state.scheduleDate) {
            showToast('Eligi una fecha antes de confirmar.');
            return;
        }
        var leadId = state.scheduleLeadIdOverride || state.currentLeadId;
        var lead = getLead(leadId);
        if (!lead) { showToast('Lead no encontrado.'); return; }

        ActivityService.schedule(lead.id, state.scheduleDate, state.scheduleNote, state.scheduleMarkPause);

        // v1.10: las ramas scheduleOrigin === 'suggestion' / 'activity' quedaron sin
        //   invocador despues de eliminar el dashboard de sugerencias y la tabla unificada.
        //   Solo subsiste scheduleOrigin === 'detail' (Schedule modal viva como reserva
        //   v1.7+ desde el detalle del lead). Si en alguna iteracion futura se vuelven a
        //   activar, hay que reintroducir SuggestionsService.markDone() y la rama activity.
        if (state.scheduleOrigin === 'activity' && state.__pendingActivityDoneId) {
            ActivityService.markDone(state.__pendingActivityDoneId);
        }

        showToast('Seguimiento agendado para ' + formatDateEs(state.scheduleDate));
        closeScheduleModal();
    }

    function handleScheduleCloseApply() {
        var sel = document.querySelector('[data-input="schedule-close-reason"]');
        if (!sel || !sel.value) {
            showToast('Eligi un motivo de cierre.');
            return;
        }
        var labels = { 'perdido': 'Perdido', 'convertido': 'Convertido', 'sin-interes': 'Sin interes', 'otro': 'Otro' };
        var leadId = state.scheduleLeadIdOverride || state.currentLeadId;
        LeadService.close(leadId, sel.value);

        // v1.10: idem comentario en handleScheduleConfirm. Rama 'suggestion' sin invocador.
        if (state.scheduleOrigin === 'activity' && state.__pendingActivityDoneId) {
            ActivityService.markDone(state.__pendingActivityDoneId);
        }

        showToast('Lead marcado como ' + (labels[sel.value] || sel.value) + ' (mock)');

        // Si veniamos del detail, volver al dashboard. Si veniamos del dashboard (sugerencias/actividades), mantener vista.
        var goingBack = (state.scheduleOrigin === 'detail');
        closeScheduleModal();
        if (goingBack) setState({ view: 'dashboard', currentLeadId: null });
    }

    function handleInput(e) {
        var node = e.target;
        if (!node || !node.getAttribute) return;
        var input = node.getAttribute('data-input');
        // v1.10: branch 'assistant-q' eliminado junto con el asistente del dashboard.
        if (input === 'schedule-date') {
            state.scheduleDate = node.value || null;
            // Si la fecha custom dispara > 21 dias, auto-tildar Pausa
            var diff = daysBetween(node.value);
            state.scheduleMarkPause = (diff > 21);
            rerenderContent();
        } else if (input === 'schedule-note') {
            state.scheduleNote = node.value;
        } else if (input === 'schedule-mark-pause') {
            state.scheduleMarkPause = !!node.checked;
        } else if (input === 'wa-draft') {
            // v1.6: textarea de WhatsApp. Sin rerender completo: solo togglear send + auto-resize.
            state.draftMessage = node.value;
            var sendBtnWa = document.querySelector('.qida-wa-send');
            if (sendBtnWa) {
                if (node.value.trim()) sendBtnWa.removeAttribute('disabled');
                else sendBtnWa.setAttribute('disabled', '');
            }
            autoResizeTextarea(node);
        } else if (input === 'ai-chat-input') {
            // v1.6: input del chat IA. Tambien evitamos rerender completo.
            state.aiChatDraft = node.value;
            var sendBtnAi = document.querySelector('.qida-aichat-send');
            if (sendBtnAi) {
                if (node.value.trim()) sendBtnAi.removeAttribute('disabled');
                else sendBtnAi.setAttribute('disabled', '');
            }
        } else if (input === 'leader-search') {
            // v1.12: search del panel de lideres. NO rerender completo - solo se reescribe
            //   el tbody y el contador, asi las instancias ApexCharts no se destruyen y la
            //   busqueda es instantanea. KPIs y charts mantienen el resultado del ultimo
            //   filtro de localidad (search es mas granular y solo afecta la tabla).
            state.leaderDash.search = node.value;
            var afsFiltered = filterAndSortAfs(MOCK_LEADER_AFS, state.leaderDash);
            var tableCard = document.querySelector('.qida-leader-table-card');
            if (tableCard) {
                tableCard.outerHTML = renderLeaderAfsTable(afsFiltered);
            }
            // Reposicionar foco en el search tras el outerHTML swap. El search NO esta en
            //   tableCard - vive en la toolbar (intacta), asi que el caret se mantiene.
        } else if (input === 'leader-filter-loc') {
            // v1.12: filtro localidad. Rerender completo - KPIs/donut/tabla se rebuilden con
            //   la data filtrada. v1.12.1: el area chart (tendencia) NO se filtra (es serie
            //   global del equipo) pero el rerender la re-mounta con la misma metrica activa.
            state.leaderDash.locFilter = node.value || 'all';
            rerenderContent();
        } else if (input === 'ab-name') {
            // v1.15: nombre de variante. Update en cada keystroke SIN rerender (no perder foco);
            //   rerender solo en 'change' (blur) para refrescar validación/errores/Guardar.
            var iName = parseInt(node.getAttribute('data-idx'), 10);
            if (state.draftVariants[iName]) state.draftVariants[iName].name = node.value;
            if (e.type === 'change') rerenderContent();
        } else if (input === 'ab-length') {
            var iLen = parseInt(node.getAttribute('data-idx'), 10);
            if (state.draftVariants[iLen]) state.draftVariants[iLen].length = node.value;
            rerenderContent();
        } else if (input === 'ab-tone') {
            var iTone = parseInt(node.getAttribute('data-idx'), 10);
            if (state.draftVariants[iTone]) state.draftVariants[iTone].tone_style = node.value;
            rerenderContent();
        }
    }

    // v1.6: auto-resize del textarea de WhatsApp (1-5 lineas).
    function autoResizeTextarea(ta) {
        if (!ta) return;
        ta.style.height = 'auto';
        var max = 120;
        var newH = Math.min(ta.scrollHeight, max);
        ta.style.height = newH + 'px';
    }

    // v1.6: chip del chat IA -> respuesta mock + persistencia en aiChatHistory.
    function handleAiChip(promptId) {
        var lead = getLead(state.currentLeadId);
        if (!lead) return;

        // v1.15 (Pieza A): SOLO 'sugerir-mensaje' cambia su origen -> /recommendation (drafts
        //   configurados por la AF). 'material-marketing' y 'reactivar-sin-presionar' quedan
        //   EXACTAMENTE igual (mismo pipeline getAiPromptResponse). If explícito para aislar.
        var resp;
        if (promptId === 'sugerir-mensaje') {
            resp = buildSuggestPayload(lead.id);
        } else {
            resp = getAiPromptResponse(promptId);
        }
        if (!resp) return;

        // El "user message" del chip usa la label del chip como texto visible.
        var label = (promptId === 'material-marketing') ? 'Material marketing'
                  : (promptId === 'sugerir-mensaje') ? 'Sugerir mensaje'
                  : (promptId === 'reactivar-sin-presionar') ? 'Reactivar sin presionar'
                  : promptId;
        pushAiChat(lead.id, label, resp);
        state.aiChatDraft = '';
        rerenderContent();
    }

    // v1.15: construye el payload IA para "Sugerir mensaje" desde DraftService.getRecommendation.
    //   Maneja los casos edge del plan. Cachea la respuesta por lead para no re-pedir en cada render.
    function buildSuggestPayload(leadId) {
        var rec = DraftService.getRecommendationSync(leadId);
        if (state.recommendationCache) state.recommendationCache[leadId] = rec;

        if (rec.should_followup_today === false) {
            return { kind: 'free', text: 'Para este lead no hay un seguimiento sugerido para hoy.' };
        }
        if (rec.fallback) {
            return { kind: 'free', text: DRAFT_FALLBACK_COPY };
        }
        if (!rec.drafts || !rec.drafts.length) {
            return { kind: 'free', text: 'Sin borrador automático sugerido. Redactá manualmente.' };
        }
        // kind:'variants' con source:'draft' (telemetría draft_copied scoped a drafts reales).
        return { kind: 'variants', source: 'draft', intro: 'Te propongo estas opciones:', variants: rec.drafts.slice() };
    }

    // v1.6: envio de query libre al chat IA. Si esta vacio, no hace nada.
    function handleAiChatSend(text) {
        var lead = getLead(state.currentLeadId);
        if (!lead) return;
        var trimmed = (text || '').trim();
        if (!trimmed) return;
        var resp = mockAIResponse(trimmed, lead);
        pushAiChat(lead.id, trimmed, resp);
        state.aiChatDraft = '';
        rerenderContent();
    }

    // ============================================================
    // MOUNT
    // ============================================================
    function injectBadge() {
        if (document.querySelector('.qida-badge')) return;
        var urgent = countLeadsUrgent();
        var badge = document.createElement('div');
        badge.className = 'qida-badge';
        badge.setAttribute('data-action', 'open-modal');
        badge.setAttribute('role', 'button');
        badge.setAttribute('aria-label', 'Abrir Qida Seguimientos');
        badge.innerHTML = '<img src="' + QIDA_LOGO_URL + '" alt="Qida">'
            + (urgent > 0 ? '<span class="qida-badge-count">' + urgent + '</span>' : '');
        badge.addEventListener('click', handleClick);
        document.body.appendChild(badge);
    }

    function injectModal() {
        if (document.querySelector('.qida-overlay')) return;
        var overlay = document.createElement('div');
        overlay.className = 'qida-overlay';
        overlay.setAttribute('data-action', 'overlay-backdrop');
        // v1.6: el shell header se llena dinamicamente desde syncShellHeader segun state.view.
        // En el HTML estatico dejamos solo el wrapper para evitar duplicacion.
        overlay.innerHTML =
            '<div class="qida-shell" id="qida-shell">'
                + '<div class="qida-shell-header"></div>'
                + '<div id="qida-content" class="qida-content"></div>'
            + '</div>';
        overlay.addEventListener('click', handleClick);
        overlay.addEventListener('input', handleInput);
        overlay.addEventListener('change', handleInput); // para <select> y <input type=date>
        overlay.addEventListener('keydown', handleKeyDownInModal);
        document.body.appendChild(overlay);
        rerenderContent();
    }

    // v1.6: keydown a nivel overlay para capturar Enter en el textarea de WhatsApp y en el
    // input del chat IA, ANTES que el keydown global (que solo se ocupa de Esc / '/' / Enter
    // del asistente). Ambos handlers conviven: el global se dispara solo si este no detuvo
    // la propagacion. Shift+Enter en el textarea agrega salto de linea (default browser).
    function handleKeyDownInModal(e) {
        var isEnter = (e.key === 'Enter' || e.keyCode === 13);
        if (!isEnter) return;
        var node = e.target;
        if (!node || !node.getAttribute) return;
        var input = node.getAttribute('data-input');
        if (input === 'wa-draft') {
            if (e.shiftKey) return; // newline
            e.preventDefault();
            e.stopPropagation();
            var leadId = state.currentLeadId;
            var text = node.value;
            state.draftMessage = text;
            sendWhatsAppMock(leadId, text);
        } else if (input === 'ai-chat-input') {
            e.preventDefault();
            e.stopPropagation();
            handleAiChatSend(node.value);
        }
    }

    function mountWhenReady() {
        if (document.body) {
            injectStyles();
            injectBadge();
            injectModal();
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                injectStyles();
                injectBadge();
                injectModal();
            });
        }
    }

    // v1.12: lazy load de ApexCharts via CDN. Guard por id para no duplicar el script.
    //   Devuelve una Promise que resuelve con typeof window.ApexCharts. NO rechaza nunca -
    //   en caso de error de red, resuelve con false y mountLeaderCharts muestra fallback.
    function injectApexCharts() {
        return new Promise(function (resolve) {
            if (typeof window.ApexCharts !== 'undefined') {
                resolve(true);
                return;
            }
            var existing = document.getElementById('qida-apexcharts-script');
            if (existing) {
                // Otro init() en curso. Esperar a que cargue el existente.
                existing.addEventListener('load', function () { resolve(typeof window.ApexCharts !== 'undefined'); });
                existing.addEventListener('error', function () { resolve(false); });
                return;
            }
            var script = document.createElement('script');
            script.id = 'qida-apexcharts-script';
            script.src = APEXCHARTS_URL;
            script.async = true;
            script.onload = function () {
                log('ApexCharts loaded');
                resolve(typeof window.ApexCharts !== 'undefined');
            };
            script.onerror = function () {
                log('ApexCharts failed to load from CDN');
                resolve(false);
            };
            document.head.appendChild(script);
        });
    }

    // v1.12: badge flotante apilado encima del badge AF. Solo se inyecta si _isLeader === true.
    function injectLeaderBadge() {
        if (document.querySelector('.qida-leader-badge')) return;
        var badge = document.createElement('div');
        badge.className = 'qida-leader-badge';
        badge.setAttribute('data-action', 'open-leaders-dashboard');
        badge.setAttribute('role', 'button');
        badge.setAttribute('aria-label', 'Abrir panel de lideres');
        badge.setAttribute('title', 'Panel de líderes');
        badge.innerHTML = icon('bar-chart-2', 24);
        badge.addEventListener('click', handleClick);
        document.body.appendChild(badge);
    }

    // v1.12: abrir el panel de lideres. Reusa el overlay/shell global, solo cambia state.view
    //   y rerendea. Si el modal AF estaba abierto en otra vista, el rerender la sobreescribe.
    // v1.12.1: reset de filtros (locFilter, search, sortCol/Dir) en cada apertura. trendMetric
    //   SI persiste (la metrica de la grafica de tendencia es preferencia de visualizacion).
    function openLeadersDashboard() {
        if (!_isLeader) {
            log('openLeadersDashboard ignored: user is not a leader');
            return;
        }
        state.leaderDash.locFilter = 'all';
        state.leaderDash.search = '';
        state.leaderDash.sortCol = null;
        state.leaderDash.sortDir = 'asc';
        state.view = 'leadersDashboard';
        var overlay = document.querySelector('.qida-overlay');
        if (overlay) overlay.className = 'qida-overlay active';
        rerenderContent();
        log('openLeadersDashboard()');
    }

    // v1.15: abre "Armá tu asistente". Carga la config (lazy) en la copia de trabajo + snapshot.
    function openAgentBuilder() {
        if (!state.draftVariantsLoaded) {
            var cfg = DraftService.getDraftVariantsSync(resolveAfKey());
            state.draftVariantsSaved = deepCopyVariants(cfg.variants);
            state.draftVariants = deepCopyVariants(cfg.variants);
            state.draftVariantsLoaded = true;
        }
        state.agentBuilderConfirmDiscard = false;
        state.view = 'agentBuilder';
        rerenderContent();
        log('openAgentBuilder()');
    }

    // Salida de agentBuilder hacia el dashboard. Con cambios sin guardar -> confirm.
    function abBack() {
        if (agentBuilderDirty()) {
            state.agentBuilderConfirmDiscard = true;
            rerenderContent();
            return;
        }
        state.view = 'dashboard';
        rerenderContent();
    }
    function abDiscardAndLeave() {
        state.draftVariants = deepCopyVariants(state.draftVariantsSaved);
        state.agentBuilderConfirmDiscard = false;
        state.view = 'dashboard';
        rerenderContent();
    }

    // Keyboard global: prioridad schedule modal -> main modal.
    // v1.10: el atajo "/" para abrir el asistente y el branch Enter del input del
    //   asistente fueron eliminados (el asistente del dashboard ya no existe).
    document.addEventListener('keydown', function (e) {
        var overlay = document.querySelector('.qida-overlay.active');
        if (!overlay) return;

        var isEsc = (e.key === 'Escape' || e.keyCode === 27);

        if (isEsc) {
            if (state.showScheduleModal) { closeScheduleModal(); return; }
            // v1.17: si el dropdown de temperatura está abierto, Esc lo cierra (no cierra el modal).
            if (state.view === 'detail' && state.tempEditorOpen) { setState({ tempEditorOpen: false }); return; }
            // v1.15: si el confirm de descartar está abierto, Esc lo cierra (sigue editando).
            if (state.view === 'agentBuilder' && state.agentBuilderConfirmDiscard) {
                setState({ agentBuilderConfirmDiscard: false });
                return;
            }
            // v1.15: en agentBuilder con cambios sin guardar, Esc dispara el confirm (no cierra).
            if (state.view === 'agentBuilder' && agentBuilderDirty()) {
                state.agentBuilderConfirmDiscard = true;
                rerenderContent();
                return;
            }
            closeModal();
            return;
        }
    });

    // ============================================================
    // PUBLIC API
    // ============================================================
    function openModal() {
        // v1.12: si el usuario habia abierto el panel de lideres y vuelve por el badge AF,
        //   normalizamos a la vista AF. closeModal ya resetea a 'dashboard', pero hacemos
        //   esto explicito por si algo dejara view en 'leadersDashboard'.
        if (state.view === 'leadersDashboard' || state.view === 'agentBuilder') {
            state.view = 'dashboard';
            state.agentBuilderConfirmDiscard = false;
            rerenderContent();
        }
        var overlay = document.querySelector('.qida-overlay');
        if (overlay) overlay.className = 'qida-overlay active';
        log('openModal()');
    }

    function closeModal() {
        var overlay = document.querySelector('.qida-overlay');
        if (overlay) overlay.className = 'qida-overlay';
        // Reset transient state.
        state.view = 'dashboard';
        state.currentLeadId = null;
        state.editingIaSummary = false;
        state.addingNote = false;
        state.showScheduleModal = false;
        state.scheduleDate = null;
        state.scheduleNote = '';
        state.scheduleMarkPause = false;
        state.scheduleOrigin = 'detail';
        state.scheduleLeadIdOverride = null;
        state.__pendingSuggestionDoneId = null;
        state.__pendingActivityDoneId = null;
        // v1.15: reset transitorio del agent builder. draftVariants/Saved/Loaded y
        //   recommendationCache PERSISTEN en sesión (igual política que aiChatHistory).
        state.agentBuilderConfirmDiscard = false;
        // v1.17: cierra el dropdown de temperatura. EDITS.temperatures (el override real) PERSISTE.
        state.tempEditorOpen = false;
        // v1.10: limpieza del dashboard de leads enfriandose.
        //   completedTodayIds PERSISTE durante toda la sesion del page load (NO se vacia
        //   aqui). Solo limpiamos el toast de undo y cancelamos cualquier timeout activo.
        state.undoToast = null;
        if (state.undoTimeoutId) {
            clearTimeout(state.undoTimeoutId);
            state.undoTimeoutId = null;
        }
        // v1.13: reset del dashboard AF (vista, filtros y datos cacheados). completedTodayIds
        //   PERSISTE en sesion (igual que antes). dashRows se re-primea en el proximo render.
        state.dashView = 'suggestions';
        state.dashRows = null;
        state.dashLoading = false;
        state.dashSegment = null;
        state.dashFiltersExpanded = false;
        state.dashOnlyNew = false;
        // v1.6: limpiamos draft del WhatsApp y del chat IA, y attachmentsExpanded.
        // aiChatHistory PERSISTE durante toda la sesion del page load: NO se vacia aqui.
        state.draftMessage = '';
        state.aiChatDraft = '';
        state.attachmentsExpanded = false;
        state.__waNeedsScroll = false;
        state.__aiNeedsScroll = false;  // v1.9.1
        // v1.9: reset del toggle al default operativo (chat IA al centro, info a la derecha).
        state.detailLayoutSwapped = true;
        rerenderContent();
        log('closeModal()');
    }

    // v1.12: helper que dispara la inyeccion del badge leader + lazy load de ApexCharts.
    //   Se llama desde dos puntos (rama Odoo OK / rama dev local) - asi evitamos duplicar
    //   logs y la decision de cuando inyectar queda centralizada.
    function activateLeaderUi() {
        if (!_isLeader) return;
        injectApexCharts().then(function (loaded) {
            console.info('[QidaAssistant] ApexCharts loaded:', !!loaded);
        });
        // El badge se inyecta sync (no depende de ApexCharts).
        if (document.body) {
            injectLeaderBadge();
        } else {
            document.addEventListener('DOMContentLoaded', injectLeaderBadge);
        }
    }

    var api = {
        init: function (options) {
            CONFIG = options || {};
            log('init() called', CONFIG);

            // v1.11: feature flag automatico por host. Si estamos en erp.qida.es, activamos
            //   modo Odoo y disparamos session_info para hidratar _baseContext. Si la sesion
            //   falla (logout, network), degradamos a modo mock para no romper el widget.
            // v1.12: en el .then() de odooSession se setea _currentUserEmail (sess.username) y
            //   se compara contra LEADER_EMAILS para habilitar el panel de lideres. En el .catch()
            //   _isLeader queda EXPLICITAMENTE false (NUNCA degrada a true por fallback - eso
            //   expondria el dashboard de manager a una AF si Odoo tiene un hiccup). En modo dev
            //   local (!IS_ODOO_MODE desde el inicio) _isLeader = true automatico para iterar.
            IS_ODOO_MODE = (typeof window.location !== 'undefined' && window.location.host === 'erp.qida.es');
            if (IS_ODOO_MODE) {
                odooSession().then(function (sess) {
                    _baseContext = (sess && sess.user_context) || {};
                    _currentUserEmail = (sess && sess.username) || null;
                    _isLeader = !!(_currentUserEmail && LEADER_EMAILS[_currentUserEmail]);
                    log('Odoo session ready', { uid: sess && sess.uid, lang: _baseContext.lang, isLeader: _isLeader });
                    if (_isLeader) activateLeaderUi();
                    console.info('[QidaAssistant] Leader mode:', _isLeader, _currentUserEmail);
                }).catch(function (err) {
                    log('Odoo session failed, falling back to mock mode for AF detail', err && err.message);
                    IS_ODOO_MODE = false;  // graceful fallback para el detalle de leads.
                    // v1.12: en modo Odoo con session fallida, _isLeader queda FALSE explicito.
                    //   No inyectamos el badge ni ApexCharts. console.error para alertar.
                    _isLeader = false;
                    _currentUserEmail = null;
                    console.error('[QidaAssistant] Odoo session failed - leader UI disabled for safety');
                    console.info('[QidaAssistant] Leader mode:', false, null);
                    console.info('[QidaAssistant] ApexCharts loaded:', typeof window.ApexCharts !== 'undefined');
                });
            } else {
                // Modo dev local: habilitamos panel de lideres para demo / iteracion.
                _isLeader = true;
                _currentUserEmail = 'dev@local';
                activateLeaderUi();
                console.info('[QidaAssistant] Leader mode:', true, '(dev local)');
            }

            mountWhenReady();
            if (CONFIG.autoOpen) {
                var delay = CONFIG.autoOpenDelay || 0;
                setTimeout(function () { openModal(); }, delay);
            }
            return api;
        },
        openModal: openModal,
        closeModal: closeModal,
        showScreen: function (screenId) {
            log('showScreen(' + screenId + ')');
        },
        version: VERSION
    };

    window.QidaAssistant = api;
    log('Assistant loaded (v' + VERSION + '). Call QidaAssistant.init() to start.');

})(window, document);
