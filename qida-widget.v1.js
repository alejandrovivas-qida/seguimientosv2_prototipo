/**
 * ========================================
 * QIDA ASSISTANT v1.10.0
 * ========================================
 * Workspace operativo de Seguimientos para AFs sobre Odoo.
 * Vanilla ES5, sin deps. Single IIFE.
 *
 * Principio rector NO NEGOCIABLE:
 *   El widget NO genera mensajes para el lead.
 *   Solo consolida contexto y agiliza el flujo operativo de la AF.
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

    var VERSION = '1.10.0';
    var CONFIG = null;
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
    var MOCK_COOLING_LEADS_RESPONSE = [
        { leadId: 'L121399', contact: 'Marta Ortiz',          location: 'Madrid',                relation: 'Madre', caredPersonName: 'Concepcion', age: 86, serviceType: 'Interno',       daysWithoutTouch: 22, lastMessageDate: '27-abr', reason: 'Pidio pensarlo en familia, sin respuesta' },
        { leadId: 'L121547', contact: 'Maria Jesus Sanchez',  location: 'Madrid',                relation: 'Madre', caredPersonName: 'Dolores',    age: 88, serviceType: 'Fin de semana', daysWithoutTouch: 17, lastMessageDate: '02-may', reason: 'No responde desde la propuesta hace 17 dias' },
        { leadId: 'L121708', contact: 'David Campos',         location: 'Alcala de Henares',     relation: 'Madre', caredPersonName: 'Pilar',      age: 84, serviceType: 'Interno',       daysWithoutTouch: 11, lastMessageDate: '08-may', reason: 'Dijo que llamaria, hace 11 dias sin respuesta' },
        { leadId: 'L122055', contact: 'Jose Maria Recio',     location: 'Collado Villalba',      relation: 'Madre', caredPersonName: 'Mercedes',   age: 85, serviceType: 'Externo',       daysWithoutTouch: 9,  lastMessageDate: '10-may', reason: 'No contesta WhatsApp ni llamadas hace 9 dias' },
        { leadId: 'L122278', contact: 'Marina Ruben',         location: 'Madrid',                relation: 'Padre', caredPersonName: 'Manuel',     age: 83, serviceType: 'Por horas',     daysWithoutTouch: 5,  lastMessageDate: '14-may', reason: 'Esperando respuesta tras enviarle el presupuesto' },
        { leadId: 'L121656', contact: 'Teresa Parellada',     location: "Sant Sadurni d'Anoia",  relation: 'Padre', caredPersonName: 'Joan',       age: 79, serviceType: 'Externo',       daysWithoutTouch: 6,  lastMessageDate: '13-may', reason: 'Familia comparando con otras dos opciones' },
        { leadId: 'L122613', contact: 'Jordi Vidal',          location: 'Barcelona',             relation: 'Madre', caredPersonName: 'Carmen',     age: 82, serviceType: 'Interno',       daysWithoutTouch: 4,  lastMessageDate: '15-may', reason: 'Pidio pensarlo en familia, han pasado 4 dias' }
    ];

    // Tope visual del dashboard. El backend ya devuelve la cohorte priorizada;
    // el frontend muestra como mucho MAX_VISIBLE filas para no abrumar a la AF.
    var MAX_VISIBLE = 5;

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

    // v1.10: TEMP_CONFIG, URGENCY_ORDER, TEMP_ORDER, STALE_THRESHOLD eliminados.
    //   Solo los consumian renderTempBadge / renderUrg / renderDays / sortLeads /
    //   buildUnifiedFeed (todos eliminados con el dashboard nuevo).

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
        __waNeedsScroll: false,         // flag para auto-scroll al fondo del pane WhatsApp post-rerender
        __aiNeedsScroll: false,         // v1.9.1: flag para auto-scroll al fondo del pane Chat IA post-rerender

        // v1.8: toggle de orden de columnas del detalle (info vs IA en centro/derecha).
        //   false (default) -> WA | Info | IA   (orden actual de v1.7).
        //   true            -> WA | IA   | Info (swap entre centro y derecha).
        // Persiste en sesion del modal (no se resetea al navegar entre leads). Se resetea
        // a false en closeModal.
        detailLayoutSwapped: true,

        // Schedule modal (reutilizado desde Detail Y desde "Marcar hecho" de sugerencias/actividades)
        showScheduleModal: false,
        scheduleDate: null,             // 'YYYY-MM-DD'
        scheduleNote: '',
        scheduleMarkPause: false,
        scheduleOrigin: 'detail',       // 'detail' | 'suggestion' | 'activity' (afecta el callback de confirm)
        scheduleLeadIdOverride: null,   // leadId target cuando origin !== 'detail'

        // Toast
        toast: null                     // { msg, ts }
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
        },

        // v1.10: lista de leads enfriandose. El backend devuelve la cohorte ya filtrada
        // y priorizada (ver TODOs al final del archivo). El frontend solo filtra los que
        // la AF marco hechos en sesion (state.completedTodayIds).
        //
        // getCoolingLeadsSync: version sincrona, consumida por renderDashboard.
        getCoolingLeadsSync: function () {
            var out = [];
            for (var i = 0; i < MOCK_COOLING_LEADS_RESPONSE.length; i++) {
                var row = MOCK_COOLING_LEADS_RESPONSE[i];
                if (state.completedTodayIds && state.completedTodayIds.has(row.leadId)) continue;
                out.push(row);
            }
            return out;
        },
        // TODO[odoo]: GET /api/me/leads/cooling. Cuando se cablee, getCoolingLeadsSync
        // pasa a leer state.coolingLeads (cacheado) y este getCoolingLeads dispara el
        // fetch + setea el cache. En v1.10 ambos comparten el mismo mock.
        getCoolingLeads: function () {
            var self = this;
            return simulateLatency(120, 280).then(function () { return self.getCoolingLeadsSync(); });
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
        'alert-triangle':'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
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
            '.qida-shell *{box-sizing:border-box;}',

            /* shell header */
            '.qida-shell-header{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-bottom:1px solid var(--s200);flex-shrink:0;}',
            '.qida-shell-title{display:flex;align-items:center;gap:12px;}',
            '.qida-shell-mark{width:28px;height:28px;border-radius:6px;background:var(--qg);color:#fff;display:flex;align-items:center;justify-content:center;}',
            '.qida-shell-tt-main{font-family:"Fraunces",Georgia,serif;font-feature-settings:"ss01";font-weight:600;font-size:16px;line-height:1;color:var(--s900);}',
            '.qida-shell-tt-sub{font-size:11px;color:var(--s500);margin-top:2px;}',
            '.qida-shell-actions{display:flex;align-items:center;gap:10px;}',
            '.qida-esc{font-size:11px;color:var(--s400);}',
            '.qida-icon-btn{background:transparent;border:0;padding:6px;border-radius:6px;cursor:pointer;color:var(--s600);display:inline-flex;align-items:center;justify-content:center;transition:background .15s;}',
            '.qida-icon-btn:hover{background:var(--s100);color:var(--s900);}',
            /* v1.8: toggle swap layout en el shell header del detail */
            '.qida-shell-swap{background:transparent;border:0.5px solid var(--s300);border-radius:6px;padding:4px 8px;font-size:11px;color:var(--s600);cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:inherit;transition:background .15s,color .15s,border-color .15s;}',
            '.qida-shell-swap:hover{background:var(--s100);}',
            '.qida-shell-swap.active{background:#E1F5EE;color:#0F6E56;border-color:#c5e8dc;}',
            '.qida-content{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0;}',

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

            /* v1.10: bloque "v1.4 DASHBOARD" (container + cobertura + tabla unificada +
               asistente header) ELIMINADO. Se reemplaza por el bloque del dashboard nuevo
               (qida-cooling-*). */

            /* ============================================================
               v1.10 DASHBOARD: lista priorizada de leads enfriandose
               ============================================================ */
            '.qida-cooling-dashboard{padding:16px;position:relative;flex:1;overflow-y:auto;background:#fff;}',
            '.qida-cooling-header{display:grid;grid-template-columns:2fr 1fr 2.5fr 1fr 0fr;gap:16px;padding:8px 16px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--s500);font-weight:500;border-bottom:0.5px solid var(--s100);}',
            '.qida-cooling-list{display:flex;flex-direction:column;gap:4px;margin-top:8px;}',
            '.qida-cooling-row{display:grid;grid-template-columns:2fr 1fr 2.5fr 1fr 0fr;gap:16px;padding:12px 16px;border-radius:8px;cursor:pointer;align-items:center;transition:background-color 120ms;position:relative;}',
            '.qida-cooling-row:hover{background:var(--s50);}',
            '.qida-cooling-row:hover .qida-cooling-row-actions{opacity:1;}',
            '.qida-cooling-row-actions{opacity:0;transition:opacity 120ms;}',

            /* Bandas de urgencia (background sutil sobre fondo blanco del dashboard) */
            '.qida-cooling-lvl-warn   {background:rgba(245,158,11,0.05);}',
            '.qida-cooling-lvl-orange {background:rgba(234,88,12,0.07);}',
            '.qida-cooling-lvl-stale  {background:rgba(220,38,38,0.06);}',
            '.qida-cooling-lvl-danger {background:rgba(220,38,38,0.10);}',

            /* Celdas */
            '.qida-cell-familia .qida-cell-line1{font-weight:500;font-size:13px;color:var(--s900);}',
            '.qida-cell-familia .qida-cell-line2{font-size:12px;color:var(--s700);}',
            '.qida-cell-tipo{font-size:13px;color:var(--s900);}',
            '.qida-cell-porque{font-size:13px;color:var(--s700);line-height:1.4;}',
            '.qida-cell-sincontacto .qida-cell-days{font-size:22px;font-weight:500;color:var(--s900);line-height:1.1;display:inline-flex;align-items:center;gap:4px;}',
            '.qida-cell-sincontacto .qida-cell-date{font-size:11px;color:var(--s500);margin-top:2px;}',
            '.qida-cooling-lvl-danger .qida-cell-days{color:var(--red600);}',

            /* Boton "Marcar hecho" (hover) */
            '.qida-mark-done-btn{background:#fff;border:0.5px solid var(--s200);border-radius:8px;padding:6px 10px;font-size:12px;color:#0F6E56;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-family:inherit;white-space:nowrap;}',
            '.qida-mark-done-btn:hover{border-color:#0F6E56;background:#F7FAF8;}',

            /* Boton Refrescar abajo de la lista */
            '.qida-cooling-actions{display:flex;justify-content:center;margin-top:16px;}',
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
            '@media (max-width:760px){.qida-detail-body > *:nth-child(1){display:none;}.qida-context-grid{grid-template-columns:1fr;}.qida-dsh-meta{display:none;}.qida-cooling-header{grid-template-columns:2fr 1fr 1.5fr 0.8fr 0fr;}.qida-cooling-row{grid-template-columns:2fr 1fr 1.5fr 0.8fr 0fr;}}'
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
    function renderDashboard() {
        var feed = LeadService.getCoolingLeadsSync();
        var visible = feed.slice(0, MAX_VISIBLE);

        // El estado vacio y el toast de undo son mutuamente compatibles (el toast puede
        // estar visible incluso si la lista esta vacia, ej. la AF marco hecha la ultima fila).
        if (visible.length === 0) {
            return '<div class="qida-cooling-dashboard">'
                + renderEmptyState()
                + renderUndoToast()
            + '</div>';
        }

        var rowsHtml = '';
        for (var i = 0; i < visible.length; i++) rowsHtml += renderCoolingRow(visible[i]);

        return '<div class="qida-cooling-dashboard">'
            + renderCoolingHeader()
            + '<div class="qida-cooling-list">' + rowsHtml + '</div>'
            + '<div class="qida-cooling-actions">'
                + '<button class="qida-refresh-btn" data-action="refresh-cooling">'
                    + icon('refresh-cw', 14) + ' Refrescar'
                + '</button>'
            + '</div>'
            + renderUndoToast()
        + '</div>';
    }

    // Header de columnas (sticky a la lista pero sin sticky CSS).
    function renderCoolingHeader() {
        return '<div class="qida-cooling-header">'
            + '<div>Familia</div>'
            + '<div>Tipo</div>'
            + '<div>Por que</div>'
            + '<div>Sin contacto</div>'
            + '<div></div>'
        + '</div>';
    }

    // Una fila del dashboard. row es la shape del response del backend
    // (NO un MOCK_LEADS lead): contact, location, relation, caredPersonName, age,
    // serviceType, daysWithoutTouch, lastMessageDate, reason, leadId.
    function renderCoolingRow(row) {
        var level = daysWithoutTouchLevel(row.daysWithoutTouch);
        var dangerIcon = (row.daysWithoutTouch >= 21)
            ? icon('alert-triangle', 14) + ' '
            : '';

        return '<div class="qida-cooling-row qida-cooling-' + level + '" '
            +   'data-action="select-lead" data-id="' + esc(row.leadId) + '">'

            + '<div class="qida-cooling-cell qida-cell-familia">'
                + '<div class="qida-cell-line1">' + esc(row.contact) + ' &middot; ' + esc(row.location) + '</div>'
                + '<div class="qida-cell-line2">' + esc(row.relation) + ' ' + esc(row.caredPersonName) + ', ' + row.age + ' anos</div>'
            + '</div>'

            + '<div class="qida-cooling-cell qida-cell-tipo">'
                + esc(row.serviceType)
            + '</div>'

            + '<div class="qida-cooling-cell qida-cell-porque">'
                + esc(row.reason || 'Sin actividad reciente')
            + '</div>'

            + '<div class="qida-cooling-cell qida-cell-sincontacto">'
                + '<div class="qida-cell-days">' + dangerIcon + row.daysWithoutTouch + '</div>'
                + '<div class="qida-cell-date">' + esc(row.lastMessageDate) + '</div>'
            + '</div>'

            + '<div class="qida-cooling-row-actions">'
                + '<button class="qida-mark-done-btn" data-action="mark-done" data-id="' + esc(row.leadId) + '" data-stop>'
                    + icon('check', 14) + ' Marcar hecho'
                + '</button>'
            + '</div>'
        + '</div>';
    }

    function renderEmptyState() {
        return '<div class="qida-empty-state">'
            + 'Estás al día. No hay leads enfriándose.'
        + '</div>';
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

    function renderCare(lead) {
        var c = MOCK_CARE_CONTEXT[lead.id] || {};
        function item(key, val, urgent) {
            var valCls = 'qida-context-val' + (urgent ? ' urgent' : '');
            return '<div class="qida-context-item"><span class="qida-context-key">' + esc(key) + '</span><span class="' + valCls + '">' + esc(val || '-') + '</span></div>';
        }
        var urgencyUrgent = lead.urgency && /muy\s+urgente/i.test(lead.urgency);
        var grid = '<div class="qida-context-grid">'
            + item('Persona cuidada', lead.relation + ' ' + lead.caredPersonName + ', ' + lead.age + ' anos')
            + item('Relacion', c.relationship)
            + item('Condicion principal', c.mainCondition)
            + item('Ubicacion', lead.location)
            + item('Tipo de servicio', lead.serviceType)
            + item('Urgencia', lead.urgency, urgencyUrgent)
            + item('Vive solo', c.livesAlone == null ? '-' : (c.livesAlone ? 'Si' : 'No'))
            + item('Prescriptor', lead.prescriptor)
        + '</div>';
        return infoCard(icon('users', 12) + ' Contexto del cuidado', '', grid);
    }

    function renderInternalNotes(lead) {
        var notes = getNotes(lead.id);
        var notesHtml = '';
        if (notes.length === 0) {
            notesHtml = '<p class="qida-empty-notes">Aun no hay notas guardadas para este lead.</p>';
        } else {
            for (var i = 0; i < notes.length; i++) {
                var n = notes[i];
                notesHtml += '<div class="qida-note">'
                    + '<div class="qida-note-head"><span class="qida-note-author">' + esc(n.author) + '</span><span class="qida-note-date">' + esc(n.date) + '</span></div>'
                    + '<p class="qida-note-text">' + esc(n.text) + '</p>'
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
        return infoCard(icon('file', 12) + ' Notas internas', actions, notesHtml + add);
    }

    function renderActivities(lead) {
        var acts = MOCK_PLANNED_ACTIVITIES[lead.id] || [];
        // Sumar las que la AF haya programado en sesion via schedule modal
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

        return infoCard(icon('clock', 12) + ' Proximas actividades', '', html);
    }

    function renderFollowers(lead) {
        var f = MOCK_FOLLOWERS[lead.id] || DEFAULT_FOLLOWERS;
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
        return infoCard(icon('users', 12) + ' Equipo siguiendo', 'Hover para email', '<div class="qida-followers">' + html + '</div>');
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

    // Adjuntos colapsable (reemplaza el panel derecho v1.5). Vive dentro del .qida-center-body.
    function renderAttachmentsCollapsable(lead) {
        var atts = MOCK_ATTACHMENTS[lead.id] || [];
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
                    bodyHtml += '<div class="qida-att" data-action="open-attachment" data-id="' + esc(a.name) + '">'
                        + '<div class="qida-att-icon">' + icon(iconName, 14) + '</div>'
                        + '<div class="qida-att-body">'
                            + '<div class="qida-att-name">' + esc(a.name) + '</div>'
                            + '<div class="qida-att-meta">' + esc(a.mimetype || '') + ' &middot; ' + esc(a.date || '') + '</div>'
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
        return infoCard(icon('paperclip', 12) + ' Adjuntos', '', collapse);
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
            for (var i = 0; i < payload.variants.length; i++) {
                var v = payload.variants[i];
                var resolved = resolveAiPlaceholders(v.text, lead);
                html += '<div class="qida-aichat-variant">'
                    + '<div class="qida-aichat-variant-label">' + esc(v.label) + '</div>'
                    + '<p class="qida-aichat-variant-text">' + esc(resolved) + '</p>'
                    + '<button class="qida-aichat-variant-action" data-action="ai-pick-variant" data-label="' + esc(v.label) + '" data-text="' + esc(resolved) + '">' + icon('arrowRight', 11) + ' Esta me gusta mas</button>'
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
            html += '<div class="qida-aichat-refine">'
                + '<div class="qida-aichat-refine-text">' + esc(payload.text) + '</div>'
                + '<button class="qida-aichat-copy-wa" data-action="ai-copy-to-wa" data-text="' + esc(payload.text) + '">' + icon('check', 11) + ' Copiar al WhatsApp</button>'
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
    function pushAiPickVariant(leadId, label, text) {
        if (!leadId || !text) return;
        var userMsg = (label ? label + ' - ' : '') + 'esta me gusta mas';
        var refinePayload = {
            kind: 'refine',
            intro: 'Genial. Te gusta asi o quieres ajustar algo? (mas corto, otro tono, agregar algo especifico).',
            text: text
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

    function renderCenterPane(lead) {
        return ''
            + renderIaSummary(lead)
            + renderCare(lead)
            + renderInternalNotes(lead)
            + renderActivities(lead)
            + renderFollowers(lead)
            + renderAttachmentsCollapsable(lead);
    }

    function renderDetail() {
        var lead = getLead(state.currentLeadId);
        if (!lead) return renderDashboard();

        // v1.8: el toggle "Swap" del shell header intercambia el orden centro/derecha.
        //   false -> WA | Info | IA   (default)
        //   true  -> WA | IA   | Info
        var centerHtml = '<div class="qida-pane-center">' + renderCenterPane(lead) + '</div>';
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
    // RENDER: content dispatcher
    // ============================================================
    function renderContent() {
        return state.view === 'detail' ? renderDetail() : renderDashboard();
    }

    // ============================================================
    // RERENDER + side overlays
    // ============================================================
    function syncShellSizing() {
        var shell = document.getElementById('qida-shell');
        if (!shell) return;
        if (state.view === 'detail') shell.classList.add('qida-view-detail');
        else shell.classList.remove('qida-view-detail');
    }

    function rerenderContent() {
        var content = document.getElementById('qida-content');
        if (!content) return;
        content.innerHTML = renderContent();
        syncShellSizing();
        syncShellHeader();
        syncScheduleModal();
        // v1.10: syncAssistantHeader eliminada (junto con todo el bloque del asistente).
        syncToast();
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
    function syncShellHeader() {
        var header = document.querySelector('.qida-shell-header');
        if (!header) return;
        if (state.view === 'detail') {
            var lead = getLead(state.currentLeadId);
            var titleHtml = '';
            if (lead) {
                var days = lead.daysWithoutTouch;
                var lvl = daysWithoutTouchLevel(days);
                var daysLabel = (days === 0) ? 'Hoy' : ('Sin contacto: ' + days + 'd');
                titleHtml = '<div class="qida-detail-shell-head">'
                    + '<button class="qida-back" data-action="back-to-dashboard" aria-label="Volver al listado">' + icon('arrowLeft', 12) + ' Volver</button>'
                    + '<span class="qida-dsh-name">' + esc(lead.name) + '</span>'
                    + '<span class="qida-dsh-id">' + esc(lead.id) + '</span>'
                    + '<span class="qida-dsh-days ' + lvl + '">' + icon('clock', 11) + ' ' + esc(daysLabel) + '</span>'
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
            // v1.8: boton swap entre el qida-asst-anchor y qida-esc. Active feedback cuando swapped.
            var swapActiveCls = state.detailLayoutSwapped ? ' active' : '';
            var swapIcons = icon('arrowLeft', 11) + icon('arrowRight', 11);
            header.innerHTML = titleHtml
                + '<div class="qida-shell-actions">'
                    + '<div id="qida-asst-anchor" class="qida-asst-anchor"></div>'
                    + '<button class="qida-shell-swap' + swapActiveCls + '" data-action="toggle-detail-layout" title="Cambiar orden de columnas">' + swapIcons + ' Swap</button>'
                    + '<span class="qida-esc">Esc para cerrar</span>'
                    + '<button class="qida-icon-btn" data-action="close-modal" aria-label="Cerrar">' + icon('x', 18) + '</button>'
                + '</div>';
        } else {
            // v1.10: shell header minimo en dashboard. Sin Sparkles + titulo + sub, sin
            // anchor del asistente. Solo "Esc para cerrar" + X. Toda la atencion va a la
            // lista de leads enfriandose en el contenido.
            header.innerHTML = ''
                + '<div class="qida-shell-actions">'
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

            case 'select-lead':
                // v1.6: inicializamos draftMessage='' y attachmentsExpanded=false. NO tocar aiChatHistory.
                state.__waNeedsScroll = true;
                state.__aiNeedsScroll = true;  // v1.9.1: scroll inicial al fondo del chat IA si hay historial.
                setState({ view: 'detail', currentLeadId: id, draftMessage: '', attachmentsExpanded: false, editingIaSummary: false, addingNote: false });
                return;
            case 'back-to-dashboard':
                // v1.6: limpiamos currentLeadId, draftMessage, attachmentsExpanded. NO tocar aiChatHistory.
                setState({ view: 'dashboard', currentLeadId: null, draftMessage: '', attachmentsExpanded: false, editingIaSummary: false, addingNote: false });
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
            case 'refresh-cooling': {
                // Re-render llama a getCoolingLeadsSync() nuevamente. Los completados
                // en sesion quedan filtrados naturalmente. Cuando esto se cablee a Odoo,
                // este handler dispara LeadService.getCoolingLeads().then(...) y refresca
                // el cache.
                rerenderContent();
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
                pushAiPickVariant(state.currentLeadId, pickLabel, pickText);
                state.aiChatDraft = '';
                rerenderContent();
                return;
            // v1.8: copia el texto refinado al textarea de WhatsApp. La AF revisa, edita si
            //   quiere, y clickea send. Principio rector: IA propone, AF envia.
            case 'ai-copy-to-wa':
                var msgText = target.getAttribute('data-text') || '';
                state.draftMessage = msgText;
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
            // v1.8: toggle del orden de columnas centro/derecha en el detail.
            case 'toggle-detail-layout':
                setState({ detailLayoutSwapped: !state.detailLayoutSwapped });
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
        var resp = getAiPromptResponse(promptId);
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

    // Keyboard global: prioridad schedule modal -> main modal.
    // v1.10: el atajo "/" para abrir el asistente y el branch Enter del input del
    //   asistente fueron eliminados (el asistente del dashboard ya no existe).
    document.addEventListener('keydown', function (e) {
        var overlay = document.querySelector('.qida-overlay.active');
        if (!overlay) return;

        var isEsc = (e.key === 'Escape' || e.keyCode === 27);

        if (isEsc) {
            if (state.showScheduleModal) closeScheduleModal();
            else closeModal();
            return;
        }
    });

    // ============================================================
    // PUBLIC API
    // ============================================================
    function openModal() {
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
        // v1.10: limpieza del dashboard de leads enfriandose.
        //   completedTodayIds PERSISTE durante toda la sesion del page load (NO se vacia
        //   aqui). Solo limpiamos el toast de undo y cancelamos cualquier timeout activo.
        state.undoToast = null;
        if (state.undoTimeoutId) {
            clearTimeout(state.undoTimeoutId);
            state.undoTimeoutId = null;
        }
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

    var api = {
        init: function (options) {
            CONFIG = options || {};
            log('init() called', CONFIG);
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
