/**
 * ========================================
 * QIDA ASSISTANT v1.5.0
 * ========================================
 * Workspace operativo de Seguimientos para AFs sobre Odoo.
 * Vanilla ES5, sin deps. Single IIFE.
 *
 * Principio rector NO NEGOCIABLE:
 *   El widget NO genera mensajes para el lead.
 *   Solo consolida contexto y agiliza el flujo operativo de la AF.
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
 */
(function (window, document) {
    'use strict';

    if (window.__QIDA_ASSISTANT_LOADED__) {
        console.warn('[QidaAssistant] Already loaded, skipping...');
        return;
    }
    window.__QIDA_ASSISTANT_LOADED__ = true;

    var VERSION = '1.5.0';
    var CONFIG = null;
    var QIDA_LOGO_URL = 'https://strapi-upload-files-production.s3.eu-central-1.amazonaws.com/qida_logo_ba5b1d80b5.png?w=1080';
    var FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap';
    var COVERAGE_TARGET = 68;

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

    var MOCK_TEMPLATES = [
        { id: 't1', name: 'Recordatorio suave - presupuesto enviado', preview: 'Hola {nombre}, pudisteis ver el presupuesto que te envie el {dia}? Cualquier duda me dices.' },
        { id: 't2', name: 'Seguimiento post-llamada',                  preview: 'Hola {nombre}, te resumo lo hablado: {puntos}. Quedo a la espera de tu confirmacion.' },
        { id: 't3', name: 'Reactivacion tras silencio',                 preview: 'Hola {nombre}, hace unos dias que no hablamos. Sigue en pie lo que comentamos o prefieres que lo dejemos por ahora?' },
        { id: 't4', name: 'Cierre calido - aceptacion',                 preview: 'Hola {nombre}, que bien que sigamos adelante. Te confirmo arranque para el {fecha}.' }
    ];

    var MOCK_MATERIAL = [
        { id: 'm1', title: 'Guia: Primeros pasos cuando hay alta hospitalaria', match: '92%', tag: 'Postoperatorio' },
        { id: 'm2', title: 'Video: Como elegimos a las cuidadoras (3 min)',     match: '88%', tag: 'Confianza' },
        { id: 'm3', title: 'PDF: Diferencias entre interna y externa',          match: '74%', tag: 'Comparativa' }
    ];

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
    // MOCKS v1.3 (dashboard v2)
    // ============================================================
    // Sugerencias del dia: 5 elementos exactos. Cada uno apunta a un leadId real.
    // suggestedFollowUpNumber indica si es el 1ro/2do/3ro/4to contacto sugerido
    // (alineado con el OKR de cobertura del 3er msg).
    var MOCK_DAILY_SUGGESTIONS = [
        { id: 'sug-1', leadId: 'L122581', suggestedFollowUpNumber: 4, reason: 'Respondio hoy con dos dudas concretas. Momento ideal para cierre.',   urgent: true,  hint: 'Cierre proximo' },
        { id: 'sug-2', leadId: 'L121399', suggestedFollowUpNumber: 1, reason: 'Alta hospitalaria manana, urgencia operativa. Falta perfilar.',       urgent: true,  hint: 'Alta hospitalaria' },
        { id: 'sug-3', leadId: 'L122131', suggestedFollowUpNumber: 4, reason: 'Confirmar fecha de arranque (25/05). Operativo, deadline 30/05.',     urgent: true,  hint: 'Cierre operativo' },
        { id: 'sug-4', leadId: 'L122613', suggestedFollowUpNumber: 3, reason: 'Hace 4 dias sin respuesta tras presupuesto. Toque 3er msg.',          urgent: false, hint: '3er msg' },
        { id: 'sug-5', leadId: 'L122278', suggestedFollowUpNumber: 3, reason: 'Hace 5 dias del presupuesto. Toque 3er msg para cobertura.',          urgent: false, hint: '3er msg' }
    ];

    // Actividades agendadas globales (vencidas + hoy). El render hace dedupe contra MOCK_DAILY_SUGGESTIONS.
    var MOCK_SCHEDULED_ACTIVITIES = [
        { id: 'act-1', leadId: 'L122613', deadline: '2026-05-10', summary: 'Followup tras presupuesto familiar',    type: 'Por hacer', assignee: 'Patricia V.', done: false }, // overdue
        { id: 'act-2', leadId: 'L122131', deadline: '2026-05-12', summary: 'Llamada con seleccion para cierre',     type: 'Llamada',   assignee: 'Patricia V.', done: false }, // overdue
        { id: 'act-3', leadId: 'L122581', deadline: '2026-05-15', summary: 'Responder dudas fin de semana y arranque', type: 'Por hacer', assignee: 'Patricia V.', done: false }, // today (15-may)
        { id: 'act-4', leadId: 'L121399', deadline: '2026-05-15', summary: 'Llamar a Marta para captar perfil',     type: 'Llamada',   assignee: 'Patricia V.', done: false }  // today
    ];

    // Conversaciones (mensajes WhatsApp) con keywords para el SearchService.
    // Cubre las 3 busquedas tipicas del brief: precio, alta hospitalaria, interno vs externo.
    var MOCK_CONVERSATION_MATCHES = [
        { id: 'conv-1', leadId: 'L121656', leadName: 'Familia Parellada Canals', from: 'lead', text: 'Recibido, lo estamos comparando con dos opciones mas. Te digo manana.',                                          time: 'Hace 6 dias',  keywords: ['precio', 'comparar', 'familia', 'dudaban'] },
        { id: 'conv-2', leadId: 'L122055', leadName: 'Familia Recio del Campo',  from: 'lead', text: 'Estamos dudando entre interna y externa. La interna es mas cara pero quizas mas tranquila.',                       time: 'Hace 12 dias', keywords: ['interno', 'externo', 'interna', 'externa', 'precio'] },
        { id: 'conv-3', leadId: 'L121708', leadName: 'Familia Campos Rivera',    from: 'lead', text: 'Mi madre tuvo el alta hospitalaria la semana pasada y no podemos cubrir solos.',                                   time: 'Hace 11 dias', keywords: ['alta hospitalaria', 'hospitalaria', 'alta'] },
        { id: 'conv-4', leadId: 'L121399', leadName: 'Familia Ortiz Pica',       from: 'lead', text: 'Sale del hospital manana, necesitamos cobertura desde el dia 1. Cuesta mucho?',                                    time: 'Hoy 08:30',    keywords: ['alta hospitalaria', 'hospital', 'precio', 'cuesta'] },
        { id: 'conv-5', leadId: 'L120478', leadName: 'Familia Bertran Casas',    from: 'lead', text: 'El presupuesto se nos va de presupuesto, dudabamos por el precio. Vamos a darle una vuelta en familia.',           time: 'Hace 22 dias', keywords: ['precio', 'dudaban', 'presupuesto', 'familia'] },
        { id: 'conv-6', leadId: 'L121547', leadName: 'Familia Sanchez Tartalo',  from: 'lead', text: 'Mi madre tiene Alzheimer y la queremos en casa, no nos atrevemos con interna. Externa quizas?',                    time: 'Hace 14 dias', keywords: ['interno', 'externo', 'interna', 'externa'] }
    ];

    // Material con descripcion + keywords para el SearchService (el render por defecto sigue
    // usando MOCK_MATERIAL para no romper el panel derecho del detail).
    var MOCK_MATERIAL_SEARCHABLE = [
        { id: 'm1', title: 'Guia: Primeros pasos cuando hay alta hospitalaria',                  match: '92%', tag: 'Postoperatorio', keywords: ['alta hospitalaria', 'hospital', 'postoperatorio', 'alta'] },
        { id: 'm2', title: 'Video: Como elegimos a las cuidadoras (3 min)',                       match: '88%', tag: 'Confianza',      keywords: ['confianza', 'cuidadora', 'eleccion'] },
        { id: 'm3', title: 'PDF: Diferencias entre interna y externa',                            match: '94%', tag: 'Comparativa',    keywords: ['interno', 'externo', 'interna', 'externa', 'comparativa', 'diferencias'] },
        { id: 'm4', title: 'PDF: Como hablar de precio sin cerrar la conversacion',               match: '89%', tag: 'Precio',         keywords: ['precio', 'objecion', 'presupuesto', 'precio'] },
        { id: 'm5', title: 'Caso real: familia que dudaba por precio y termino contratando',      match: '86%', tag: 'Caso real',      keywords: ['precio', 'dudaban', 'caso', 'familia'] },
        { id: 'm6', title: 'Plantilla: explicar coste interna vs externa con ejemplo',            match: '83%', tag: 'Plantilla',      keywords: ['interno', 'externo', 'precio', 'plantilla'] }
    ];

    var TEMP_CONFIG = {
        caliente: { label: 'Caliente', icon: 'flame',     bg: '#ffedd5', color: '#7c2d12', border: '#fdba74', dot: '#f97316' },
        templado: { label: 'Templado', icon: 'thermo',    bg: '#fffbeb', color: '#78350f', border: '#fcd34d', dot: '#f59e0b' },
        // Cambio v1.2: frio pasa de sky-blue a slate (azul-gris, segun brief)
        frio:     { label: 'Frio',     icon: 'snowflake', bg: '#f1f5f9', color: '#1e293b', border: '#94a3b8', dot: '#64748b' },
        pausa:    { label: 'Pausa',    icon: 'pause',     bg: '#f5f5f4', color: '#44403c', border: '#d6d3d1', dot: '#a8a29e' }
    };

    var URGENCY_ORDER = { 'Estandar': 0, 'Urgente': 1, 'Muy urgente': 2 };
    var TEMP_ORDER = { caliente: 0, templado: 1, frio: 2, pausa: 3 };
    var STALE_THRESHOLD = { caliente: 3, templado: 7, frio: 14, pausa: 99 };

    // ============================================================
    // STATE
    // ============================================================
    var state = {
        view: 'dashboard',              // 'dashboard' | 'detail'
        currentLeadId: null,

        // searchQuery se mantiene para uso interno de matchesSearch desde el Asistente.
        coverageBucket: null,           // null | 0 | 1 | 2 | 3 (3 significa "3+")
        searchQuery: '',
        // sortCol = null significa "sort compuesto inteligente" (default v1.4).
        // Cuando la AF clickea un header, se respeta el sort manual.
        sortCol: null,                  // null | 'familia' | 'temp' | 'servicio' | 'urgencia' | 'dias' | 'interacciones' | 'etapa' | 'proximo'
        sortDir: 'desc',                // 'asc' | 'desc'

        // Dashboard v1.4: tabla unificada con toolbar
        activeTypeChip: 'suggestions',  // 'suggestions' | 'activities' | 'leads'
        activeSegmentFilter: null,      // null | 'caliente' | 'templado' | 'frio-reactivar' | 'pausa' | 'urgente' | 'historico'
        filtersExpanded: false,         // toggle del boton "Filtros"

        // Asistente: 3 estados, ahora anclado al header en lugar de flotante
        assistantState: 'closed',       // 'closed' (pill header) | 'expanded' (input header) | 'results' (panel lateral)
        assistantQuery: '',
        assistantLoading: false,
        assistantResults: null,         // { leads: [...], conversations: [...], material: [...] } | null

        // Detail state
        activePanel: 'templates',       // 'templates' | 'material' | 'attachments'
        editingTemp: false,
        editingIaSummary: false,
        addingNote: false,

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
    function getLeadTemperatureReason(lead) {
        // Si la AF edito la temperatura sin tocar el motivo, mantenemos el motivo original.
        return lead.temperatureReason;
    }

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

    function getInteractionCount(lead) {
        return lead.interactionCount;
    }

    // ----- Filtros operacionales -----
    // "Todos" excluye historicos por default (cartera activa). "Historico" es el opuesto explicito.
    // Los demas chips operan sobre cartera activa unicamente.
    function isActive(lead) { return !lead.historico; }

    function matchesOperationalFilter(lead, filter) {
        var t = getLeadTemperature(lead);
        if (filter === 'historico')        return !!lead.historico;
        if (!isActive(lead))               return false; // los demas chips solo sobre activos
        if (filter === 'caliente')         return t === 'caliente';
        if (filter === 'templado')         return t === 'templado';
        if (filter === 'frio-reactivar')   return t === 'frio' && lead.daysWithoutTouch < 21;
        if (filter === 'pausa')            return t === 'pausa';
        if (filter === 'urgente')          return !!lead.urgent;
        return true; // 'todos' sobre cartera activa
    }

    function matchesCoverageBucket(lead, bucket) {
        if (bucket == null) return true;
        if (!isActive(lead)) return false; // cobertura solo sobre cartera activa
        var n = getInteractionCount(lead);
        if (bucket === 3) return n >= 3; // "3+"
        return n === bucket;
    }

    function matchesSearch(lead, q) {
        if (!q) return true;
        var lq = q.toLowerCase();
        return lead.name.toLowerCase().indexOf(lq) !== -1
            || lead.context.toLowerCase().indexOf(lq) !== -1
            || lead.temperatureReason.toLowerCase().indexOf(lq) !== -1
            || lead.location.toLowerCase().indexOf(lq) !== -1
            || (lead.prescriptor && lead.prescriptor.toLowerCase().indexOf(lq) !== -1)
            || (lead.serviceType && lead.serviceType.toLowerCase().indexOf(lq) !== -1);
    }

    function getFilteredLeads() {
        // v1.4: usa state.activeSegmentFilter (nullable). null = todos los segmentos activos.
        var segment = state.activeSegmentFilter || 'todos';
        var out = [];
        for (var i = 0; i < MOCK_LEADS.length; i++) {
            var l = MOCK_LEADS[i];
            if (!matchesOperationalFilter(l, segment)) continue;
            if (!matchesCoverageBucket(l, state.coverageBucket)) continue;
            if (!matchesSearch(l, state.searchQuery.trim())) continue;
            out.push(l);
        }
        return sortLeads(out);
    }

    function sortLeads(arr) {
        var col = state.sortCol, dir = state.sortDir;
        if (!col) return arr;
        var sign = dir === 'asc' ? 1 : -1;
        var copy = arr.slice();
        // nextScheduledFollowUp = null se ordena al final independientemente del sign.
        var BIG = 9999999;
        copy.sort(function (a, b) {
            var av, bv;
            switch (col) {
                case 'familia':       av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
                case 'temp':          av = TEMP_ORDER[getLeadTemperature(a)]; bv = TEMP_ORDER[getLeadTemperature(b)]; break;
                case 'servicio':      av = (a.serviceType || '').toLowerCase(); bv = (b.serviceType || '').toLowerCase(); break;
                case 'urgencia':      av = URGENCY_ORDER[a.urgency] || 0; bv = URGENCY_ORDER[b.urgency] || 0; break;
                case 'dias':          av = a.daysWithoutTouch; bv = b.daysWithoutTouch; break;
                case 'interacciones': av = a.interactionCount; bv = b.interactionCount; break;
                case 'etapa':         av = a.stage.toLowerCase(); bv = b.stage.toLowerCase(); break;
                case 'proximo':
                    av = a.nextScheduledFollowUp ? daysBetween(a.nextScheduledFollowUp) : BIG;
                    bv = b.nextScheduledFollowUp ? daysBetween(b.nextScheduledFollowUp) : BIG;
                    break;
                default:              return 0;
            }
            if (av < bv) return -1 * sign;
            if (av > bv) return 1 * sign;
            return 0;
        });
        return copy;
    }

    // Para la nav del detail
    function getNavLeads() {
        var segment = state.activeSegmentFilter || 'todos';
        var out = [];
        for (var i = 0; i < MOCK_LEADS.length; i++) {
            var l = MOCK_LEADS[i];
            if (!matchesOperationalFilter(l, segment)) continue;
            if (!matchesCoverageBucket(l, state.coverageBucket)) continue;
            if (!matchesSearch(l, state.searchQuery.trim())) continue;
            out.push(l);
        }
        return out;
    }

    function countByOperational(filter) {
        var n = 0;
        for (var i = 0; i < MOCK_LEADS.length; i++) if (matchesOperationalFilter(MOCK_LEADS[i], filter)) n++;
        return n;
    }

    function countByCoverage(bucket) {
        var n = 0;
        for (var i = 0; i < MOCK_LEADS.length; i++) if (matchesCoverageBucket(MOCK_LEADS[i], bucket)) n++;
        return n;
    }

    function coveragePct() {
        // Solo cartera activa (sin historicos), alineado con CoverageService.weeklySync()
        var total = 0;
        for (var i = 0; i < MOCK_LEADS.length; i++) if (isActive(MOCK_LEADS[i])) total++;
        if (total === 0) return 0;
        var n3plus = countByCoverage(3);
        return Math.round((n3plus / total) * 100);
    }

    function activeLeadsCount() {
        var n = 0;
        for (var i = 0; i < MOCK_LEADS.length; i++) if (isActive(MOCK_LEADS[i])) n++;
        return n;
    }

    // Para el sub-info de "Pausados con reactivacion esta semana"
    function pausaReactivacionEstaSemana() {
        var n = 0;
        var today = new Date(); today.setHours(0,0,0,0);
        var weekAhead = new Date(today.getTime() + 7 * 24 * 3600 * 1000);
        for (var i = 0; i < MOCK_LEADS.length; i++) {
            var l = MOCK_LEADS[i];
            if (getLeadTemperature(l) !== 'pausa') continue;
            if (!l.pausaUntil) continue;
            var d = new Date(l.pausaUntil + 'T00:00:00');
            if (d >= today && d <= weekAhead) n++;
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
        // Globales (hoy + vencidas) para la seccion 3 del dashboard.
        listTodayAndOverdueSync: function () {
            // TODO[odoo]: GET /api/me/activities?state=today,overdue
            var out = [];
            for (var i = 0; i < MOCK_SCHEDULED_ACTIVITIES.length; i++) {
                var a = MOCK_SCHEDULED_ACTIVITIES[i];
                if (EDITS.activitiesDone[a.id]) continue;
                out.push(a);
            }
            return out;
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
        },
        // v1.4: feed unificado consumido por la tabla unica del dashboard.
        // TODO[odoo]: GET /api/me/feed?window=15d  (composicion server-side si esta disponible;
        // mientras tanto, hacemos el merge + dedupe + sort compuesto en cliente).
        getUnifiedFeedSync: function (filters) {
            return buildUnifiedFeed(filters || {});
        }
    };

    var SuggestionsService = {
        listSync: function () {
            // TODO[odoo]: GET /api/me/daily-suggestions
            // Filtrar las que la AF ya marco hecho / pospuso a futuro.
            var today = new Date(); today.setHours(0, 0, 0, 0);
            var out = [];
            for (var i = 0; i < MOCK_DAILY_SUGGESTIONS.length; i++) {
                var s = MOCK_DAILY_SUGGESTIONS[i];
                if (EDITS.suggestionsDone[s.id]) continue;
                var pp = EDITS.suggestionsPostponed[s.id];
                if (pp && pp.until) {
                    var d = new Date(pp.until + 'T00:00:00');
                    if (d > today) continue;
                }
                out.push(s);
            }
            return out;
        },
        markDone: function (sugId) { EDITS.suggestionsDone[sugId] = true; return simulateLatency(40, 100); },
        postpone: function (sugId, untilIso) { EDITS.suggestionsPostponed[sugId] = { until: untilIso }; return simulateLatency(40, 100); }
    };

    var CoverageService = {
        // Cobertura: distribucion por interactionCount, scoped a "cartera activa ventana 15d".
        weeklySync: function () {
            // TODO[odoo]: GET /api/me/coverage?window=15d
            var active = LeadService.listSync().filter(function (l) { return !l.historico; });
            var byBucket = { 0: 0, 1: 0, 2: 0, 3: 0 };
            for (var i = 0; i < active.length; i++) {
                var n = active[i].interactionCount;
                if (n >= 3) byBucket[3]++;
                else if (n === 2) byBucket[2]++;
                else if (n === 1) byBucket[1]++;
                else byBucket[0]++;
            }
            var total = active.length;
            var pct = total > 0 ? Math.round((byBucket[3] / total) * 100) : 0;
            return { byBucket: byBucket, total: total, coveragePct: pct, target: COVERAGE_TARGET };
        }
    };

    // ----- Helper interno del feed unificado (v1.4) -----
    // Compone sugerencias + actividades (today + overdue) + leads en una sola lista
    // de filas con shape uniforme. Hace dedupe (la sugerencia gana frente a actividad
    // del mismo lead, pero la fila de sugerencia retiene hasActivity=true para mostrar
    // el microcopy "+ actividad" inline), aplica filtro de tipo + segmento, y ordena
    // con el sort compuesto inteligente cuando state.sortCol === null.
    function buildUnifiedFeed(filters) {
        var typeChip = filters.typeChip || state.activeTypeChip || 'suggestions';
        var segment  = filters.segment  || state.activeSegmentFilter || null;

        var suggestions = SuggestionsService.listSync();   // [{ id, leadId, suggestedFollowUpNumber, reason, urgent, hint }]
        var activities  = ActivityService.listTodayAndOverdueSync(); // [{ id, leadId, deadline, summary, type, assignee }]

        // Indices para dedupe entre sugerencia y actividad del mismo lead
        var sugByLeadId = {};
        for (var i = 0; i < suggestions.length; i++) sugByLeadId[suggestions[i].leadId] = suggestions[i];

        // Filas tipo sugerencia: marcamos hasActivity cuando hay actividad mismo leadId
        var sugRows = [];
        for (var s = 0; s < suggestions.length; s++) {
            var sug = suggestions[s];
            var lead = getLead(sug.leadId);
            if (!lead) continue;
            var hasAct = false;
            for (var aa = 0; aa < activities.length; aa++) {
                if (activities[aa].leadId === sug.leadId) { hasAct = true; break; }
            }
            sugRows.push({
                rowKey: 'sug-' + sug.id,
                type: 'suggestion',
                leadId: sug.leadId,
                lead: lead,
                suggestion: sug,
                hasActivity: hasAct,           // microcopy "+ actividad" si true
                sortPriority: sug.urgent ? 2 : 3
            });
        }

        // Filas tipo actividad: filtrar las que ya estan representadas como sugerencia.
        var actRows = [];
        for (var a = 0; a < activities.length; a++) {
            var act = activities[a];
            if (sugByLeadId[act.leadId]) continue; // dedupe: sugerencia gana
            var aLead = getLead(act.leadId);
            if (!aLead) continue;
            var diff = daysBetween(act.deadline);
            var isOverdue = diff < 0;
            var isToday   = diff === 0;
            actRows.push({
                rowKey: 'act-' + act.id,
                type: 'activity',
                leadId: act.leadId,
                lead: aLead,
                activity: act,
                overdueDays: isOverdue ? Math.abs(diff) : 0,
                isOverdue: isOverdue,
                isToday: isToday,
                sortPriority: isOverdue ? 1 : 4 // vencidas suben al tope (despues van las urgentes)
            });
        }

        // Filas tipo lead: todos los activos NO representados arriba.
        var representedLead = {};
        for (var r = 0; r < sugRows.length; r++) representedLead[sugRows[r].leadId] = true;
        for (var r2 = 0; r2 < actRows.length; r2++) representedLead[actRows[r2].leadId] = true;
        var leadRows = [];
        for (var lL = 0; lL < MOCK_LEADS.length; lL++) {
            var ld = MOCK_LEADS[lL];
            if (representedLead[ld.id]) continue;
            leadRows.push({
                rowKey: 'lead-' + ld.id,
                type: 'lead',
                leadId: ld.id,
                lead: ld,
                sortPriority: 5
            });
        }

        // Concat segun tipo (excluyente)
        var rows;
        if (typeChip === 'suggestions') rows = sugRows.slice();
        else if (typeChip === 'activities') rows = actRows.slice();
        else /* 'leads' */ rows = leadRows.slice();

        // Filtro de segmento (combinable con el chip de tipo)
        if (segment) {
            var filtered = [];
            for (var f = 0; f < rows.length; f++) {
                if (matchesOperationalFilter(rows[f].lead, segment)) filtered.push(rows[f]);
            }
            rows = filtered;
        } else if (typeChip === 'leads') {
            // Default para Leads sin segmento: cartera activa (excluye historicos)
            var fa = [];
            for (var f2 = 0; f2 < rows.length; f2++) {
                if (!rows[f2].lead.historico) fa.push(rows[f2]);
            }
            rows = fa;
        }

        // Sort
        if (state.sortCol) {
            // Sort manual (header clickeado): respetamos ordering por columna del lead.
            var sign = state.sortDir === 'asc' ? 1 : -1;
            rows.sort(function (ra, rb) {
                var av, bv;
                switch (state.sortCol) {
                    case 'familia':       av = ra.lead.name.toLowerCase(); bv = rb.lead.name.toLowerCase(); break;
                    case 'temp':          av = TEMP_ORDER[getLeadTemperature(ra.lead)]; bv = TEMP_ORDER[getLeadTemperature(rb.lead)]; break;
                    case 'servicio':      av = (ra.lead.serviceType || '').toLowerCase(); bv = (rb.lead.serviceType || '').toLowerCase(); break;
                    case 'urgencia':      av = URGENCY_ORDER[ra.lead.urgency] || 0; bv = URGENCY_ORDER[rb.lead.urgency] || 0; break;
                    case 'dias':          av = ra.lead.daysWithoutTouch; bv = rb.lead.daysWithoutTouch; break;
                    case 'interacciones': av = ra.lead.interactionCount; bv = rb.lead.interactionCount; break;
                    case 'etapa':         av = ra.lead.stage.toLowerCase(); bv = rb.lead.stage.toLowerCase(); break;
                    case 'proximo':
                        av = ra.lead.nextScheduledFollowUp ? daysBetween(ra.lead.nextScheduledFollowUp) : 9999999;
                        bv = rb.lead.nextScheduledFollowUp ? daysBetween(rb.lead.nextScheduledFollowUp) : 9999999;
                        break;
                    default: return 0;
                }
                if (av < bv) return -1 * sign;
                if (av > bv) return 1 * sign;
                return 0;
            });
        } else {
            // Sort compuesto inteligente (default v1.4):
            //   1) Actividades vencidas (mas viejas primero)
            //   2) Sugerencias urgentes
            //   3) Sugerencias normales
            //   4) Actividades de hoy
            //   5) Leads por daysWithoutTouch desc
            rows.sort(function (ra, rb) {
                if (ra.sortPriority !== rb.sortPriority) return ra.sortPriority - rb.sortPriority;
                if (ra.type === 'activity' && rb.type === 'activity') {
                    return rb.overdueDays - ra.overdueDays; // mas vencidas primero
                }
                if (ra.type === 'lead' && rb.type === 'lead') {
                    return rb.lead.daysWithoutTouch - ra.lead.daysWithoutTouch;
                }
                return 0;
            });
        }

        return rows;
    }

    // Counts por tipo para los chips de la toolbar (siempre cuentan el universo,
    // no se afectan por el segmento ni por el chip activo).
    function countUnifiedByType(typeChip) {
        return buildUnifiedFeed({ typeChip: typeChip, segment: null }).length;
    }

    function countSegmentInActiveType(segment) {
        return buildUnifiedFeed({ typeChip: state.activeTypeChip, segment: segment }).length;
    }

    var SearchService = {
        // Todo el SearchService corre async. El Asistente flotante (Estado 3) lo consume con loading skeletons.
        // Mock devuelve matches por substring sobre name/context/temperatureReason/keywords.
        all: function (q) {
            // TODO[odoo]: POST /api/search { q } -> { leads, conversations, material }
            return simulateLatency(220, 480).then(function () {
                return {
                    leads: SearchService._leadsSync(q),
                    conversations: SearchService._conversationsSync(q),
                    material: SearchService._materialSync(q)
                };
            });
        },
        _leadsSync: function (q) {
            if (!q) return [];
            var lq = q.toLowerCase();
            var out = [];
            for (var i = 0; i < MOCK_LEADS.length; i++) {
                if (matchesSearch(MOCK_LEADS[i], q)) out.push(MOCK_LEADS[i]);
                if (out.length >= 6) break;
            }
            return out;
        },
        _conversationsSync: function (q) {
            if (!q) return [];
            var lq = q.toLowerCase();
            var out = [];
            for (var i = 0; i < MOCK_CONVERSATION_MATCHES.length; i++) {
                var c = MOCK_CONVERSATION_MATCHES[i];
                var hit = c.text.toLowerCase().indexOf(lq) !== -1
                       || c.leadName.toLowerCase().indexOf(lq) !== -1;
                if (!hit && c.keywords) {
                    for (var k = 0; k < c.keywords.length; k++) {
                        if (lq.indexOf(c.keywords[k]) !== -1 || c.keywords[k].indexOf(lq) !== -1) { hit = true; break; }
                    }
                }
                if (hit) out.push(c);
                if (out.length >= 5) break;
            }
            return out;
        },
        _materialSync: function (q) {
            if (!q) return [];
            var lq = q.toLowerCase();
            var out = [];
            for (var i = 0; i < MOCK_MATERIAL_SEARCHABLE.length; i++) {
                var m = MOCK_MATERIAL_SEARCHABLE[i];
                var hit = m.title.toLowerCase().indexOf(lq) !== -1
                       || (m.tag || '').toLowerCase().indexOf(lq) !== -1;
                if (!hit && m.keywords) {
                    for (var k = 0; k < m.keywords.length; k++) {
                        if (lq.indexOf(m.keywords[k]) !== -1 || m.keywords[k].indexOf(lq) !== -1) { hit = true; break; }
                    }
                }
                if (hit) out.push(m);
                if (out.length >= 5) break;
            }
            return out;
        }
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
        slidersHoriz:'<line x1="4" y1="6" x2="11" y2="6"/><line x1="15" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="9" y2="18"/><line x1="13" y1="18" x2="20" y2="18"/><line x1="4" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="20" y2="12"/><circle cx="13" cy="6" r="2"/><circle cx="11" cy="18" r="2"/><circle cx="8" cy="12" r="2"/>'
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
            '.qida-content{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0;}',

            /* coverage widget */
            /* v1.4: cobertura compactada — padding y margenes reducidos */
            '.qida-coverage{padding:10px 14px;background:linear-gradient(180deg,var(--qg-soft) 0%,#fff 100%);border:1px solid var(--s200);border-radius:10px;}',
            '.qida-coverage-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:6px;gap:12px;}',
            '.qida-coverage-title{font-size:11.5px;font-weight:600;color:var(--s700);display:inline-flex;align-items:center;gap:6px;letter-spacing:.02em;}',
            '.qida-coverage-target{font-size:11px;color:var(--s500);}',
            '.qida-coverage-target strong{color:var(--qg);font-weight:600;}',
            '.qida-coverage-row{display:flex;align-items:stretch;gap:6px;flex-wrap:wrap;}',
            '.qida-cov-chip{flex:1;min-width:120px;display:inline-flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;border-radius:7px;border:1px solid var(--s200);background:#fff;cursor:pointer;font-family:inherit;color:var(--s700);transition:border-color .15s,box-shadow .15s,transform .12s;text-align:left;}',
            '.qida-cov-chip:hover{border-color:var(--s300);transform:translateY(-1px);}',
            '.qida-cov-chip.active{border-color:var(--qg);box-shadow:0 0 0 2px rgba(14,74,58,.12);background:var(--qg-soft);}',
            '.qida-cov-chip-label{display:flex;flex-direction:column;gap:1px;}',
            '.qida-cov-chip-label-main{font-size:11.5px;font-weight:500;color:var(--s700);display:inline-flex;align-items:center;gap:6px;}',
            '.qida-cov-chip-label-sub{font-size:10px;color:var(--s500);}',
            '.qida-cov-chip-num{font-family:"Fraunces",Georgia,serif;font-feature-settings:"ss01";font-size:18px;font-weight:600;color:var(--s900);line-height:1;}',
            '.qida-cov-dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0;}',
            '.qida-cov-chip[data-bucket="0"] .qida-cov-dot{background:#94a3b8;}',
            '.qida-cov-chip[data-bucket="1"] .qida-cov-dot{background:#f59e0b;}',
            '.qida-cov-chip[data-bucket="2"] .qida-cov-dot{background:#84cc16;}',
            '.qida-cov-chip[data-bucket="3"] .qida-cov-dot{background:var(--qg);}',
            '.qida-cov-pct{font-family:"Fraunces",Georgia,serif;font-feature-settings:"ss01";font-size:13px;font-weight:600;color:var(--qg);margin-left:4px;}',

            /* dashboard */
            '.qida-dash{display:flex;flex-direction:column;height:100%;min-height:0;}',
            '.qida-dash-top{padding:16px 24px 12px;border-bottom:1px solid var(--s100);}',
            '.qida-search{position:relative;}',
            '.qida-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--s400);}',
            '.qida-search input{width:100%;padding:10px 220px 10px 38px;background:var(--s50);border:1px solid var(--s200);border-radius:6px;font-size:14px;font-family:inherit;color:var(--s900);outline:none;transition:border-color .15s,background .15s;}',
            '.qida-search input:focus{border-color:var(--qg);background:#fff;}',
            '.qida-search-hint{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:10px;color:var(--s400);display:inline-flex;align-items:center;gap:4px;pointer-events:none;}',
            '.qida-chips{display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap;}',
            '.qida-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:500;border:1px solid var(--s200);background:#fff;color:var(--s700);cursor:pointer;transition:border-color .15s,background .15s;font-family:inherit;}',
            '.qida-chip:hover{border-color:var(--s300);}',
            '.qida-chip-count{font-size:10px;opacity:.6;}',
            '.qida-chip.active{background:var(--qg);color:#fff;border-color:var(--qg);}',
            '.qida-chip.active .qida-chip-count{opacity:.8;}',
            '.qida-chip-extra{font-size:10px;color:var(--s500);font-weight:400;margin-left:4px;}',
            '.qida-chip.active .qida-chip-extra{color:rgba(255,255,255,.75);}',

            '.qida-dash-body{flex:1;overflow-y:auto;padding:16px 24px 24px;}',
            '.qida-table-wrap{background:#fff;border:1px solid var(--s200);border-radius:6px;overflow:hidden;}',
            '.qida-table{width:100%;font-size:14px;border-collapse:collapse;}',
            '.qida-table thead{background:var(--s50);border-bottom:1px solid var(--s200);}',
            '.qida-table th{text-align:left;padding:10px 14px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--s600);white-space:nowrap;}',
            '.qida-th-sortable{cursor:pointer;user-select:none;}',
            '.qida-th-sortable:hover{color:var(--s900);}',
            '.qida-th-sort{display:inline-flex;align-items:center;gap:4px;}',
            '.qida-th-sort .qa-icon{opacity:.4;}',
            '.qida-th-sort.active .qa-icon{opacity:1;color:var(--qg);}',
            '.qida-table tbody tr{border-bottom:1px solid var(--s100);cursor:pointer;transition:background .12s;}',
            '.qida-table tbody tr:hover{background:var(--s50);}',
            '.qida-table tbody tr:last-child{border-bottom:0;}',
            '.qida-table td{padding:12px 14px;vertical-align:top;}',
            '.qida-lead-name{font-weight:500;color:var(--s900);line-height:1.25;}',
            '.qida-lead-meta{font-size:11px;color:var(--s500);margin-top:2px;display:flex;align-items:center;gap:6px;}',
            '.qida-lead-reason{font-size:12px;color:var(--s600);line-height:1.4;max-width:240px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}',
            '.qida-stage{font-size:11px;color:var(--s600);background:var(--s100);padding:2px 6px;border-radius:4px;display:inline-block;}',
            '.qida-empty{padding:48px 16px;text-align:center;font-size:14px;color:var(--s500);}',
            '.qida-dash-footer{display:flex;align-items:center;justify-content:space-between;margin-top:12px;font-size:12px;color:var(--s500);}',

            /* badges util */
            '.qida-temp{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:6px;border:1px solid;font-size:12px;font-weight:500;line-height:1.4;white-space:nowrap;}',
            '.qida-temp.small{padding:1px 6px;font-size:11px;gap:4px;}',
            '.qida-temp .qa-ia{opacity:.5;display:inline-flex;}',
            '.qida-urg{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:500;line-height:1.4;white-space:nowrap;}',
            '.qida-urg.std{background:var(--s100);color:var(--s600);}',
            '.qida-urg.urg{background:#fef3c7;color:#92400e;}',
            '.qida-urg.muy{background:#fee2e2;color:#991b1b;}',
            '.qida-service{font-size:12px;color:var(--s700);}',
            '.qida-days{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--s500);}',
            '.qida-days.stale{color:var(--red600);font-weight:500;}',
            '.qida-days-dot{width:6px;height:6px;border-radius:50%;background:var(--red500);}',

            /* detail layout v1.2 */
            '.qida-detail{display:flex;flex-direction:column;height:100%;min-height:0;}',
            '.qida-detail-head{padding:12px 24px;border-bottom:1px solid var(--s200);background:#fff;display:flex;align-items:center;gap:14px;flex-wrap:wrap;flex-shrink:0;}',
            '.qida-back{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;background:transparent;border:1px solid var(--s200);border-radius:6px;color:var(--s700);font-family:inherit;font-size:12px;cursor:pointer;}',
            '.qida-back:hover{border-color:var(--s400);color:var(--s900);}',
            '.qida-dh-name{font-family:"Fraunces",Georgia,serif;font-feature-settings:"ss01";font-size:18px;font-weight:600;color:var(--s900);line-height:1;}',
            '.qida-dh-id{font-size:11px;color:var(--s400);}',
            '.qida-dh-meta{display:flex;align-items:center;gap:10px;color:var(--s600);font-size:12px;flex-wrap:wrap;}',
            '.qida-dh-meta-item{display:inline-flex;align-items:center;gap:4px;}',
            '.qida-dh-temp{display:inline-flex;align-items:center;gap:6px;}',
            '.qida-temp-toggle{background:transparent;border:0;padding:0;font-size:10px;color:var(--s500);cursor:pointer;display:inline-flex;align-items:center;gap:3px;font-family:inherit;}',
            '.qida-temp-toggle:hover{color:var(--s900);}',
            '.qida-temp-picker{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;}',
            '.qida-temp-opt{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid var(--s200);border-radius:6px;background:#fff;color:var(--s600);font-size:11px;cursor:pointer;font-family:inherit;}',
            '.qida-temp-opt:hover{background:var(--s50);}',
            '.qida-temp-opt.selected{box-shadow:0 0 0 2px var(--s300);}',

            '.qida-detail-body{flex:1;display:flex;min-height:0;overflow:hidden;}',

            /* WhatsApp pane */
            '.qida-pane-wa{width:340px;border-right:1px solid var(--s200);display:flex;flex-direction:column;background:rgba(245,245,244,.4);flex-shrink:0;min-height:0;}',
            '.qida-pane-head{padding:10px 16px;border-bottom:1px solid var(--s200);display:flex;align-items:center;gap:6px;color:var(--s600);flex-shrink:0;}',
            '.qida-pane-head-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}',
            '.qida-pane-head-aux{font-size:10px;color:var(--s400);margin-left:auto;}',
            '.qida-pane-body{flex:1;overflow-y:auto;padding:14px 16px;}',
            '.qida-msgs{display:flex;flex-direction:column;gap:8px;}',
            '.qida-msg{display:flex;}',
            '.qida-msg.from-af{justify-content:flex-end;}',
            '.qida-msg.from-lead{justify-content:flex-start;}',
            '.qida-msg-bubble{max-width:90%;padding:7px 10px;border-radius:10px;}',
            '.qida-msg.from-af .qida-msg-bubble{background:#DCF8C6;color:var(--s800);}',
            '.qida-msg.from-lead .qida-msg-bubble{background:#fff;color:var(--s800);border:1px solid var(--s200);}',
            '.qida-msg-text{font-size:13px;line-height:1.4;margin:0;}',
            '.qida-msg-time{font-size:10px;color:var(--s500);margin-top:3px;text-align:right;}',
            '.qida-empty-msgs{font-size:12px;color:var(--s400);font-style:italic;padding:24px 8px;text-align:center;}',

            /* Center pane */
            '.qida-pane-center{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;}',
            '.qida-center-body{flex:1;overflow-y:auto;padding:18px 24px 80px;}',
            '.qida-block{margin-bottom:20px;}',
            '.qida-block-h{display:flex;align-items:center;gap:8px;margin-bottom:8px;}',
            '.qida-block-h-title{font-size:12px;font-weight:600;color:var(--s700);text-transform:uppercase;letter-spacing:.04em;}',
            '.qida-block-h-aux{font-size:11px;color:var(--s500);margin-left:auto;display:inline-flex;align-items:center;gap:8px;}',
            '.qida-link-btn{background:transparent;border:0;padding:0;color:var(--qg);font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px;}',
            '.qida-link-btn:hover{color:var(--qgH);text-decoration:underline;}',
            '.qida-link-btn.muted{color:var(--s500);font-weight:400;}',
            '.qida-link-btn.muted:hover{color:var(--s700);}',

            /* IA Summary */
            '.qida-ia{background:var(--qg-soft);border:1px solid var(--qg-soft-border);border-radius:8px;padding:14px 16px;}',
            '.qida-ia-text{font-size:13px;line-height:1.55;color:var(--s800);margin:0;white-space:pre-wrap;}',
            '.qida-ia-empty{font-size:12px;color:var(--s500);font-style:italic;}',
            '.qida-ia-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--qg-soft-border);font-size:11px;color:var(--s500);}',
            '.qida-ia-meta-left{display:inline-flex;align-items:center;gap:6px;}',
            '.qida-ia-textarea{width:100%;min-height:120px;padding:10px 12px;border:1px solid var(--qg-soft-border);border-radius:6px;font-family:inherit;font-size:13px;line-height:1.5;color:var(--s800);background:#fff;outline:none;resize:vertical;}',
            '.qida-ia-textarea:focus{border-color:var(--qg);}',
            '.qida-ia-actions{display:flex;gap:8px;margin-top:8px;}',

            /* Care context */
            '.qida-care{background:#fff;border:1px solid var(--s200);border-radius:8px;padding:12px 14px;}',
            '.qida-care-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;}',
            '.qida-care-item{display:flex;flex-direction:column;gap:2px;}',
            '.qida-care-key{font-size:10px;color:var(--s500);text-transform:uppercase;letter-spacing:.04em;font-weight:600;}',
            '.qida-care-val{font-size:13px;color:var(--s800);}',

            /* Notes */
            '.qida-note{background:#fffbeb;border:1px solid #fef3c7;border-radius:6px;padding:10px 12px;}',
            '.qida-note + .qida-note{margin-top:8px;}',
            '.qida-note-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}',
            '.qida-note-author{font-size:12px;font-weight:500;color:var(--s700);}',
            '.qida-note-date{font-size:10px;color:var(--s500);}',
            '.qida-note-text{font-size:12px;color:var(--s700);margin:0;line-height:1.45;}',
            '.qida-add-note{background:#fff;border:1px solid var(--s200);border-radius:6px;padding:10px 12px;margin-top:8px;}',
            '.qida-add-note textarea{width:100%;min-height:64px;border:0;outline:none;font-family:inherit;font-size:12px;color:var(--s800);resize:vertical;background:transparent;}',
            '.qida-add-note-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px;}',
            '.qida-empty-notes{font-size:12px;color:var(--s400);font-style:italic;padding:6px 2px;}',

            /* Activities */
            '.qida-act{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--s200);border-radius:6px;background:#fff;}',
            '.qida-act + .qida-act{margin-top:6px;}',
            '.qida-act.overdue{border-color:#fecaca;background:var(--red50);}',
            '.qida-act.done .qida-act-summary{text-decoration:line-through;color:var(--s500);}',
            '.qida-act-icon{flex-shrink:0;padding:6px;border-radius:6px;background:var(--s100);color:var(--s700);}',
            '.qida-act.overdue .qida-act-icon{background:#fee2e2;color:var(--red600);}',
            '.qida-act-body{flex:1;min-width:0;}',
            '.qida-act-summary{font-size:13px;color:var(--s800);font-weight:500;line-height:1.35;}',
            '.qida-act-meta{font-size:11px;color:var(--s500);margin-top:3px;display:flex;align-items:center;gap:6px;}',
            '.qida-act.overdue .qida-act-meta{color:var(--red600);}',
            '.qida-empty-act{font-size:12px;color:var(--s400);font-style:italic;padding:6px 2px;}',

            /* Followers */
            '.qida-followers{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
            '.qida-follower{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;background:var(--s50);border:1px solid var(--s200);border-radius:999px;cursor:default;}',
            '.qida-follower-avatar{width:22px;height:22px;border-radius:50%;background:var(--qg);color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;font-family:"Manrope";}',
            '.qida-follower-name{font-size:12px;color:var(--s700);}',
            '.qida-follower-role{font-size:10px;color:var(--s500);}',

            /* footer action bar */
            '.qida-pane-center-foot{padding:12px 24px;border-top:1px solid var(--s200);background:#fff;display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-shrink:0;}',
            '.qida-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:var(--qg);color:#fff;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s;}',
            '.qida-btn-primary:hover{background:var(--qgH);}',
            '.qida-btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:transparent;color:var(--s700);border:1px solid var(--s200);border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;}',
            '.qida-btn-ghost:hover{background:var(--s50);border-color:var(--s300);}',

            /* Right pane */
            '.qida-pane-right{width:320px;border-left:1px solid var(--s200);display:flex;flex-direction:column;background:#fff;flex-shrink:0;min-height:0;}',
            '.qida-tabs{display:flex;border-bottom:1px solid var(--s200);flex-shrink:0;}',
            '.qida-tab{flex:1;padding:12px 8px;font-size:12px;font-weight:500;background:transparent;border:0;border-bottom:2px solid transparent;cursor:pointer;color:var(--s600);display:inline-flex;align-items:center;justify-content:center;gap:6px;font-family:inherit;transition:color .15s,border-color .15s;}',
            '.qida-tab:hover{color:var(--s900);}',
            '.qida-tab.active{color:var(--qg);border-bottom-color:var(--qg);}',
            '.qida-aside-body{flex:1;overflow-y:auto;padding:16px;}',

            /* Templates */
            '.qida-tpl-intro{font-size:11px;color:var(--s500);margin:0 0 12px;}',
            '.qida-tpl{border:1px solid var(--s200);border-radius:6px;padding:10px 12px;cursor:pointer;transition:border-color .15s;}',
            '.qida-tpl:hover{border-color:var(--s400);}',
            '.qida-tpl + .qida-tpl{margin-top:8px;}',
            '.qida-tpl-name{font-size:12px;font-weight:600;color:var(--s800);margin-bottom:4px;}',
            '.qida-tpl-preview{font-size:11px;color:var(--s600);line-height:1.4;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}',
            '.qida-tpl-actions{display:flex;align-items:center;justify-content:space-between;margin-top:8px;}',
            '.qida-tpl-copy{font-size:10px;color:var(--qg);font-weight:500;background:transparent;border:0;cursor:pointer;padding:0;font-family:inherit;}',
            '.qida-tpl-edit{font-size:10px;color:var(--s500);background:transparent;border:0;cursor:pointer;padding:0;font-family:inherit;}',
            '.qida-tpl-new{width:100%;font-size:12px;color:var(--s500);padding:8px;border:1px dashed var(--s300);border-radius:6px;background:transparent;cursor:pointer;margin-top:8px;font-family:inherit;}',
            '.qida-tpl-new:hover{color:var(--s900);}',

            /* Material */
            '.qida-mat-intro{font-size:11px;color:var(--s500);margin:0 0 4px;}',
            '.qida-mat-ai{display:inline-flex;align-items:center;gap:3px;font-size:10px;color:var(--s400);margin-bottom:12px;}',
            '.qida-mat{border:1px solid var(--s200);border-radius:6px;padding:10px 12px;cursor:pointer;transition:border-color .15s;}',
            '.qida-mat:hover{border-color:var(--s400);}',
            '.qida-mat + .qida-mat{margin-top:8px;}',
            '.qida-mat-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:4px;}',
            '.qida-mat-title{font-size:12px;font-weight:600;color:var(--s800);flex:1;}',
            '.qida-mat-match{font-size:10px;background:#ecfdf5;color:#047857;padding:2px 6px;border-radius:4px;font-weight:500;flex-shrink:0;}',
            '.qida-mat-tag{font-size:10px;color:var(--s500);background:var(--s100);padding:2px 6px;border-radius:4px;display:inline-block;}',
            '.qida-mat-more{width:100%;font-size:12px;color:var(--s600);padding:8px;border:1px solid var(--s200);border-radius:6px;background:transparent;cursor:pointer;margin-top:8px;font-family:inherit;}',
            '.qida-mat-more:hover{color:var(--s900);}',

            /* Attachments */
            '.qida-att{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--s200);border-radius:6px;cursor:pointer;transition:border-color .15s,background .15s;}',
            '.qida-att:hover{border-color:var(--s400);background:var(--s50);}',
            '.qida-att + .qida-att{margin-top:8px;}',
            '.qida-att-icon{flex-shrink:0;padding:6px;border-radius:6px;background:var(--s100);color:var(--s700);}',
            '.qida-att-body{flex:1;min-width:0;}',
            '.qida-att-name{font-size:12px;font-weight:500;color:var(--s800);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.qida-att-meta{font-size:10px;color:var(--s500);margin-top:2px;}',
            '.qida-att-main{font-size:9px;background:var(--qg);color:#fff;padding:1px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:.04em;font-weight:600;flex-shrink:0;}',
            '.qida-att-empty{font-size:12px;color:var(--s400);font-style:italic;padding:12px 2px;text-align:center;}',

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

            /* ============================================================
               v1.4 DASHBOARD: container + cobertura compacta + tabla unificada + asistente header
               ============================================================ */

            /* Dashboard container centrado (max-width subido + padding lateral reducido) */
            '.qida-dash-v2{flex:1;overflow-y:auto;background:var(--s50);}',
            '.qida-dash-container{max-width:1480px;margin:0 auto;padding:16px 20px 24px;display:flex;flex-direction:column;gap:16px;}',
            '.qida-section{background:#fff;border:1px solid var(--s200);border-radius:10px;}',

            /* Asistente en header - Estado 1 (pill inline) */
            '.qida-asst-anchor{display:inline-flex;align-items:center;}',
            '.qida-asst-pill{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;background:var(--qg);color:#fff;border:0;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 6px rgba(14,74,58,.18);transition:transform .12s,box-shadow .12s,background .12s;}',
            '.qida-asst-pill:hover{background:var(--qgH);transform:translateY(-1px);box-shadow:0 4px 10px rgba(14,74,58,.24);}',
            '.qida-asst-pill kbd{background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.24);border-radius:4px;padding:1px 5px;font-size:10px;font-family:"Manrope",monospace;}',

            /* Asistente en header - Estado 2 (input expandido inline) */
            '.qida-asst-exp-inline{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1.5px solid var(--qg);border-radius:999px;padding:4px 6px 4px 12px;box-shadow:0 4px 12px rgba(14,74,58,.12);color:var(--qg);}',
            '.qida-asst-input{flex:1;min-width:240px;max-width:420px;padding:6px 4px;font-family:inherit;font-size:13px;color:var(--s900);background:transparent;border:0;outline:none;}',
            '.qida-asst-send{padding:6px 10px;background:var(--qg);color:#fff;border:0;border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;}',
            '.qida-asst-send:hover{background:var(--qgH);}',
            '.qida-asst-send:disabled{opacity:.4;cursor:not-allowed;}',
            '.qida-asst-collapse{background:transparent;border:0;color:var(--s500);cursor:pointer;padding:6px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;}',
            '.qida-asst-collapse:hover{background:var(--s100);color:var(--s900);}',

            /* Asistente en header - Estado 3 (chip compacto cuando hay panel de resultados abierto) */
            '.qida-asst-chip{display:inline-flex;align-items:center;gap:6px;background:var(--qg-soft);color:var(--qg);border:1px solid var(--qg-soft-border);border-radius:999px;padding:5px 6px 5px 11px;font-size:12px;font-weight:500;max-width:280px;}',
            '.qida-asst-chip-q{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.qida-asst-chip-x{background:transparent;border:0;color:var(--qg);cursor:pointer;padding:3px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;}',
            '.qida-asst-chip-x:hover{background:rgba(14,74,58,.12);}',

            /* Asistente - Estado 3 (panel lateral 30%) */
            '.qida-asst-panel{display:flex;flex-direction:column;width:30%;min-width:340px;max-width:480px;border-left:1px solid var(--s200);background:#fff;flex-shrink:0;}',
            '.qida-asst-panel-head{padding:14px 16px;border-bottom:1px solid var(--s200);display:flex;align-items:center;gap:8px;}',
            '.qida-asst-panel-q{flex:1;font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:14px;color:var(--s900);line-height:1.3;}',
            '.qida-asst-panel-close{background:transparent;border:0;padding:6px;border-radius:6px;color:var(--s500);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;}',
            '.qida-asst-panel-close:hover{background:var(--s100);color:var(--s900);}',
            '.qida-asst-panel-body{flex:1;overflow-y:auto;padding:14px 16px;background:var(--s50);}',
            '.qida-asst-bloque{margin-bottom:18px;}',
            '.qida-asst-bloque-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}',
            '.qida-asst-bloque-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--s700);display:inline-flex;align-items:center;gap:6px;}',
            '.qida-asst-bloque-count{font-size:10px;color:var(--s500);}',
            '.qida-asst-result{background:#fff;border:1px solid var(--s200);border-radius:8px;padding:10px 12px;margin-bottom:6px;cursor:pointer;transition:border-color .15s;}',
            '.qida-asst-result:hover{border-color:var(--qg);}',
            '.qida-asst-result-name{font-size:12px;font-weight:600;color:var(--s900);line-height:1.3;}',
            '.qida-asst-result-meta{font-size:10px;color:var(--s500);margin-top:2px;display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;}',
            '.qida-asst-result-text{font-size:12px;color:var(--s700);line-height:1.4;margin-top:4px;}',
            '.qida-asst-empty{padding:14px;background:#fff;border:1px dashed var(--s200);border-radius:8px;text-align:center;font-size:11px;color:var(--s500);font-style:italic;}',

            /* ============================================================
               v1.4 TABLA UNIFICADA estilo Odoo Activities
               ============================================================ */
            '.qida-unified{padding:12px 14px 14px;}',
            /* Toolbar (boton Filtros + segment tag activa | chips de tipo) */
            '.qida-unified-toolbar{display:flex;align-items:center;gap:10px;padding:0 0 12px;flex-wrap:wrap;}',
            '.qida-unified-toolbar-left{display:inline-flex;align-items:center;gap:8px;flex:1;min-width:0;}',
            '.qida-unified-toolbar-right{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;}',
            '.qida-filters-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#fff;border:1px solid var(--s200);border-radius:8px;color:var(--s700);font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;transition:border-color .15s,background .15s,color .15s;}',
            '.qida-filters-btn:hover{border-color:var(--s400);color:var(--s900);}',
            '.qida-filters-btn.active{border-color:var(--qg);color:var(--qg);background:var(--qg-soft);}',
            '.qida-filters-btn-count{background:var(--qg);color:#fff;border-radius:999px;padding:0 6px;font-size:10px;font-weight:600;line-height:16px;min-width:16px;text-align:center;}',
            '.qida-active-segment-tag{display:inline-flex;align-items:center;gap:4px;background:var(--qg-soft);color:var(--qg);border:1px solid var(--qg-soft-border);padding:4px 4px 4px 10px;border-radius:999px;font-size:11px;font-weight:600;}',
            '.qida-active-segment-x{background:transparent;border:0;color:var(--qg);cursor:pointer;padding:2px;border-radius:999px;display:inline-flex;}',
            '.qida-active-segment-x:hover{background:rgba(14,74,58,.14);}',
            /* Type chips (right) */
            '.qida-type-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#fff;border:1px solid var(--s200);border-radius:999px;color:var(--s600);font-size:12px;font-weight:500;font-family:inherit;cursor:pointer;transition:border-color .15s,color .15s,background .15s;}',
            '.qida-type-chip:hover{border-color:var(--s400);color:var(--s900);}',
            '.qida-type-chip.active{background:var(--qg);color:#fff;border-color:var(--qg);box-shadow:0 1px 3px rgba(14,74,58,.18);}',
            '.qida-type-chip-count{background:rgba(0,0,0,.06);color:inherit;border-radius:999px;padding:0 6px;font-size:10px;font-weight:600;line-height:16px;min-width:16px;text-align:center;}',
            '.qida-type-chip.active .qida-type-chip-count{background:rgba(255,255,255,.22);color:#fff;}',
            /* Segment chips (expanded row) */
            '.qida-segment-chips{display:flex;align-items:center;gap:6px;padding:0 0 12px;flex-wrap:wrap;border-top:1px dashed var(--s200);margin-top:-6px;padding-top:10px;}',

            /* Tabla unificada */
            '.qida-unified-table-wrap{overflow-x:auto;border:1px solid var(--s200);border-radius:8px;}',
            '.qida-unified-table{width:100%;border-collapse:collapse;font-size:12.5px;background:#fff;}',
            '.qida-unified-table thead th{position:sticky;top:0;background:var(--s50);font-size:11px;font-weight:600;color:var(--s600);text-transform:uppercase;letter-spacing:.04em;padding:8px 10px;text-align:left;border-bottom:1px solid var(--s200);white-space:nowrap;}',
            '.qida-unified-table thead .qida-uth-icon{width:34px;padding-left:14px;}',
            '.qida-unified-table tbody td{padding:8px 10px;border-bottom:1px solid var(--s100);vertical-align:middle;}',
            '.qida-unified-table tbody tr:last-child td{border-bottom:0;}',

            /* Fila base */
            '.qida-urow{cursor:pointer;transition:background .12s;position:relative;}',
            '.qida-urow:hover{background:var(--s50);}',
            '.qida-urow td.qida-urow-icon{padding-left:14px;width:34px;}',
            '.qida-urow-icon-wrap{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:var(--s100);color:var(--s500);}',
            '.qida-urow-icon-wrap.sug{background:var(--qg-soft);color:var(--qg);}',
            '.qida-urow-icon-wrap.act{background:#fef3c7;color:#92400e;}',
            '.qida-urow-icon-wrap.act.overdue{background:#fee2e2;color:var(--red600);}',
            '.qida-urow-icon-wrap.lead{background:var(--s100);color:var(--s500);}',
            '.qida-urow-familia{min-width:220px;}',
            '.qida-urow-name{font-weight:600;color:var(--s900);line-height:1.3;font-size:13px;}',
            '.qida-urow-meta{font-size:11px;color:var(--s500);margin-top:1px;display:inline-flex;align-items:center;gap:5px;}',
            /* v1.5: Tipo y Etapa con cap + ellipsis (180/140) para que el ancho extra vaya a "Por que". */
            '.qida-urow-type{white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;}',
            '.qida-urow-temp{white-space:nowrap;}',
            '.qida-urow-porque{min-width:280px;max-width:320px;color:var(--s700);}',
            '.qida-urow-porque span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.35;}',
            '.qida-urow-dias{white-space:nowrap;}',
            '.qida-urow-proximo{white-space:nowrap;color:var(--s700);}',
            '.qida-urow-etapa{white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;}',
            '.qida-urow-etapa .qida-stage{display:inline-block;background:var(--s100);color:var(--s700);border-radius:4px;font-size:10px;padding:2px 7px;font-weight:500;}',

            /* Tipo badges */
            '.qida-utype-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;letter-spacing:.02em;border:1px solid transparent;}',
            '.qida-utype-badge.sug{background:var(--qg-soft);color:var(--qg);border-color:var(--qg-soft-border);}',
            '.qida-utype-badge.sug.urgent{background:#fff7ed;color:#9a3412;border-color:#fed7aa;}',
            '.qida-utype-badge.act{background:#fef3c7;color:#92400e;border-color:#fde68a;}',
            '.qida-utype-badge.act-overdue{background:#fee2e2;color:#991b1b;border-color:#fecaca;}',
            '.qida-utype-badge.act-today{background:#fef3c7;color:#92400e;border-color:#fde68a;}',
            '.qida-utype-badge.lead{background:var(--s100);color:var(--s600);border-color:var(--s200);}',
            '.qida-utype-sub{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:500;color:var(--s500);margin-left:6px;font-style:italic;}',

            /* Fondos sutiles por tipo de fila (estilo Odoo Activities) */
            '.qida-urow-suggestion{background:rgba(14,74,58,.04);}',
            '.qida-urow-suggestion:hover{background:rgba(14,74,58,.07);}',
            '.qida-urow-suggestion.urgent{box-shadow:inset 3px 0 0 #f97316;}',
            '.qida-urow-activity-overdue{background:rgba(220,38,38,.05);}',
            '.qida-urow-activity-overdue:hover{background:rgba(220,38,38,.08);}',

            /* Estado vacio tabla unificada */
            '.qida-unified-empty{padding:48px 24px;text-align:center;color:var(--s500);display:flex;flex-direction:column;align-items:center;gap:10px;}',
            '.qida-unified-empty p{font-size:13px;color:var(--s600);margin:0;max-width:480px;line-height:1.4;}',

            /* Skeleton loaders */
            '.qida-skel{background:linear-gradient(90deg,#e7e5e4 0%,#f5f5f4 50%,#e7e5e4 100%);background-size:200% 100%;border-radius:6px;animation:qida-skel 1.2s infinite linear;}',
            '@keyframes qida-skel{0%{background-position:200% 0;}100%{background-position:-200% 0;}}',
            '.qida-skel-line{height:10px;margin-bottom:6px;}',
            '.qida-skel-card{padding:10px 12px;background:#fff;border:1px solid var(--s200);border-radius:8px;margin-bottom:6px;}',

            /* Cobertura tooltip refinado */
            '.qida-cov-hint{font-size:10px;color:var(--s500);margin-top:4px;font-style:italic;}',

            /* Responsive */
            '@media (max-width:1100px){.qida-pane-wa{width:280px;}.qida-pane-right{width:280px;}.qida-asst-panel{width:34%;}.qida-asst-input{min-width:180px;max-width:280px;}}',
            '@media (max-width:900px){.qida-pane-wa{width:240px;}.qida-pane-right{display:none;}.qida-asst-panel{width:100%;position:absolute;inset:0;z-index:5;}}',
            '@media (max-width:760px){.qida-pane-wa{display:none;}.qida-search input{padding-right:38px;}.qida-search-hint{display:none;}.qida-care-grid{grid-template-columns:1fr;}.qida-dash-container{padding:12px 14px;gap:12px;}.qida-asst-input{min-width:140px;max-width:200px;}}'
        ].join('');

        var style = document.createElement('style');
        style.id = 'qida-assistant-styles';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    // ============================================================
    // RENDER: small reusable bits
    // ============================================================
    function renderTempBadge(temp, source, small) {
        var cfg = TEMP_CONFIG[temp];
        if (!cfg) return '';
        var styleAttr = 'background:' + cfg.bg + ';color:' + cfg.color + ';border-color:' + cfg.border + ';';
        return '<span class="qida-temp' + (small ? ' small' : '') + '" style="' + styleAttr + '">'
            + icon(cfg.icon, small ? 10 : 12)
            + esc(cfg.label)
            + (source === 'IA' && !small ? '<span class="qa-ia">' + icon('sparkles', 10) + '</span>' : '')
            + '</span>';
    }

    function renderUrg(urgency) {
        var cls = 'std', label = 'Estandar';
        if (urgency === 'Muy urgente') { cls = 'muy'; label = 'Muy urgente'; }
        else if (urgency === 'Urgente') { cls = 'urg'; label = 'Urgente'; }
        return '<span class="qida-urg ' + cls + '">' + esc(label) + '</span>';
    }

    function renderDays(days, temp) {
        if (days === 0) return '<span class="qida-days">Hoy</span>';
        var threshold = STALE_THRESHOLD[temp] || 14;
        var stale = days >= threshold;
        return '<span class="qida-days' + (stale ? ' stale' : '') + '">'
            + (stale ? '<span class="qida-days-dot"></span>' : '')
            + days + 'd sin contacto'
            + '</span>';
    }

    function renderSortHeader(col, label) {
        var active = (state.sortCol === col);
        var arrow = '';
        if (active) {
            arrow = icon(state.sortDir === 'asc' ? 'arrowUp' : 'arrowDown', 11);
        }
        return '<th class="qida-th-sortable" data-action="set-sort" data-id="' + col + '">'
            + '<span class="qida-th-sort' + (active ? ' active' : '') + '">' + esc(label) + ' ' + arrow + '</span>'
            + '</th>';
    }

    // ============================================================
    // RENDER: coverage widget
    // ============================================================
    function renderCoverage() {
        var pct = coveragePct();
        var tooltip = 'El objetivo del proyecto es llevar la cobertura del 3er mensaje del 37% al ' + COVERAGE_TARGET + '%. Scope: cartera activa (entryDate < 15 dias o pausa explicita).';

        function chip(bucket, labelMain, labelSub, extraRight) {
            var n = countByCoverage(bucket);
            var active = (state.coverageBucket === bucket);
            return '<button class="qida-cov-chip' + (active ? ' active' : '') + '" data-action="set-coverage" data-id="' + bucket + '" data-bucket="' + bucket + '">'
                + '<div class="qida-cov-chip-label">'
                    + '<span class="qida-cov-chip-label-main"><span class="qida-cov-dot"></span>' + esc(labelMain) + '</span>'
                    + '<span class="qida-cov-chip-label-sub">' + esc(labelSub) + '</span>'
                + '</div>'
                + '<span class="qida-cov-chip-num">' + n + (extraRight || '') + '</span>'
            + '</button>';
        }

        return '<div class="qida-coverage" title="' + esc(tooltip) + '">'
            + '<div class="qida-coverage-head">'
                + '<span class="qida-coverage-title">' + icon('target', 12) + 'Tu cobertura &mdash; cartera activa (ventana 15 dias)</span>'
                + '<span class="qida-coverage-target">Meta del 3er msg: <strong>' + COVERAGE_TARGET + '%</strong></span>'
            + '</div>'
            + '<div class="qida-coverage-row">'
                + chip(0, 'Sin contactar', '0 mensajes', '')
                + chip(1, '1 contacto',    '1 mensaje',  '')
                + chip(2, '2 contactos',   '2 mensajes', '')
                + chip(3, '3+ contactos',  'Cobertura completa', '<span class="qida-cov-pct">' + pct + '%</span>')
            + '</div>'
            + '<div class="qida-cov-hint">El objetivo del proyecto es llevar la cobertura del 3er mensaje del 37% al ' + COVERAGE_TARGET + '%.</div>'
        + '</div>';
    }

    // ============================================================
    // RENDER: dashboard v1.4 (cobertura compacta + tabla unificada)
    // ============================================================
    function renderDashboard() {
        return '<div class="qida-dash-flex" style="display:flex;flex:1;min-height:0;overflow:hidden;">'
            + '<div class="qida-dash-v2">'
                + '<div class="qida-dash-container">'
                    + renderCoverageSection()
                    + renderUnifiedTable()
                + '</div>'
            + '</div>'
            + (state.assistantState === 'results' ? renderAssistantPanel() : '')
        + '</div>';
    }

    function renderCoverageSection() {
        // El widget de cobertura ya tiene su propio chrome visual (gradient header). En v1.4 lo dejamos
        // como franja plana embebida directamente (sin section card), para compactar.
        return renderCoverage();
    }

    // ============================================================
    // RENDER: tabla unificada estilo Odoo Activities (v1.4 - reemplaza Secciones 2/3/4 de v1.3)
    // ============================================================
    // TODO v1.5: estados especiales en filas (postergado de v1.3 P1, sigue vigente):
    // - Badge "Reactiva en X dias" en fila pausa con pausaUntil < 7d
    // - Badge "Cierra ventana en X dias" en fila lead con entryDate > 12d
    // - Indicador de prescriptor (ESSIP, hospital, organico) como pill suave en col "Familia"
    function renderUnifiedTable() {
        var typeChip = state.activeTypeChip;
        var segment  = state.activeSegmentFilter;

        // Counts para los chips de tipo (universo total por tipo, sin segmento aplicado)
        var nSug  = countUnifiedByType('suggestions');
        var nAct  = countUnifiedByType('activities');
        var nLead = countUnifiedByType('leads');

        // Counts para los segment chips dentro del tipo activo
        var nCaliente   = countSegmentInActiveType('caliente');
        var nTemplado   = countSegmentInActiveType('templado');
        var nFrio       = countSegmentInActiveType('frio-reactivar');
        var nPausa      = countSegmentInActiveType('pausa');
        var nUrgente    = countSegmentInActiveType('urgente');
        var nHistorico  = countSegmentInActiveType('historico');

        var rows = buildUnifiedFeed({ typeChip: typeChip, segment: segment });

        function typeChipBtn(id, label, count) {
            var cls = 'qida-type-chip' + (typeChip === id ? ' active' : '');
            return '<button class="' + cls + '" data-action="set-type-chip" data-id="' + id + '">'
                + esc(label) + '<span class="qida-type-chip-count">' + count + '</span>'
            + '</button>';
        }

        function segmentChip(id, label, count) {
            var cls = 'qida-chip' + (segment === id ? ' active' : '');
            return '<button class="' + cls + '" data-action="set-segment" data-id="' + id + '">'
                + esc(label) + '<span class="qida-chip-count">' + count + '</span>'
            + '</button>';
        }

        var segmentBadgeCount = segment ? 1 : 0;
        var segmentLabelMap = {
            'caliente': 'Calientes', 'templado': 'Templados', 'frio-reactivar': 'Frios a reactivar',
            'pausa': 'Pausados', 'urgente': 'Urgentes', 'historico': 'Historico'
        };

        var toolbar = '<div class="qida-unified-toolbar">'
            + '<div class="qida-unified-toolbar-left">'
                + '<button class="qida-filters-btn' + (state.filtersExpanded ? ' active' : '') + '" data-action="toggle-filters">'
                    + icon('slidersHoriz', 13) + ' Filtros'
                    + (segmentBadgeCount > 0 ? '<span class="qida-filters-btn-count">' + segmentBadgeCount + '</span>' : '')
                + '</button>'
                + (segment
                    ? '<span class="qida-active-segment-tag">' + esc(segmentLabelMap[segment] || segment)
                        + '<button class="qida-active-segment-x" data-action="clear-segment" aria-label="Quitar filtro">' + icon('x', 11) + '</button>'
                      + '</span>'
                    : '')
            + '</div>'
            + '<div class="qida-unified-toolbar-right">'
                + typeChipBtn('suggestions', 'Sugerencias del dia', nSug)
                + typeChipBtn('activities',  'Actividades',         nAct)
                + typeChipBtn('leads',       'Leads',               nLead)
            + '</div>'
        + '</div>'
        + (state.filtersExpanded
            ? '<div class="qida-segment-chips">'
                + segmentChip('caliente',       'Calientes',         nCaliente)
                + segmentChip('templado',       'Templados',         nTemplado)
                + segmentChip('frio-reactivar', 'Frios a reactivar', nFrio)
                + segmentChip('pausa',          'Pausados',          nPausa)
                + segmentChip('urgente',        'Urgentes',          nUrgente)
                + segmentChip('historico',      'Historico',         nHistorico)
              + '</div>'
            : '');

        // Estado vacio contextual
        var bodyHtml;
        if (rows.length === 0) {
            var emptyCopy;
            if (typeChip === 'suggestions') {
                emptyCopy = "Sin seguimientos sugeridos para hoy. Cambia a 'Actividades' o 'Leads' para ver el resto de tu cartera.";
            } else if (typeChip === 'activities') {
                emptyCopy = 'Sin actividades agendadas hoy ni vencidas.';
            } else if (segment) {
                emptyCopy = 'No hay leads que coincidan con este filtro.';
            } else {
                emptyCopy = 'Sin leads en la cartera activa.';
            }
            bodyHtml = '<div class="qida-unified-empty">' + icon('check', 22) + '<p>' + esc(emptyCopy) + '</p></div>';
        } else {
            var trs = '';
            for (var i = 0; i < rows.length; i++) trs += renderUnifiedRow(rows[i]);
            bodyHtml = '<div class="qida-unified-table-wrap">'
                + '<table class="qida-unified-table">'
                    + '<thead><tr>'
                        + '<th class="qida-uth-icon"></th>'
                        + renderSortHeader('familia',  'Familia')
                        + '<th>Tipo</th>'
                        + renderSortHeader('temp',     'Temp.')
                        + '<th>Por que</th>'
                        + renderSortHeader('dias',     'Sin contacto')
                        + renderSortHeader('proximo',  'Vence')
                        + renderSortHeader('etapa',    'Etapa')
                    + '</tr></thead>'
                    + '<tbody>' + trs + '</tbody>'
                + '</table>'
            + '</div>';
        }

        return '<section class="qida-section qida-unified">'
            + toolbar
            + bodyHtml
        + '</section>';
    }

    // Una fila de la tabla unificada. row = { type, leadId, lead, ...payload, hasActivity? }
    function renderUnifiedRow(row) {
        var lead = row.lead;
        var temp = getLeadTemperature(lead);
        var tempSource = getLeadTemperatureSource(lead);

        // Icono identificador segun tipo
        var iconHtml, rowCls, typeBadge, porQue;
        if (row.type === 'suggestion') {
            var sug = row.suggestion;
            var fuLabel = sug.suggestedFollowUpNumber === 1 ? '1er msg'
                        : sug.suggestedFollowUpNumber === 2 ? '2do msg'
                        : sug.suggestedFollowUpNumber === 3 ? '3er msg'
                        : sug.suggestedFollowUpNumber + 'o msg';
            iconHtml = '<span class="qida-urow-icon-wrap sug">' + icon('zap', 13) + '</span>';
            rowCls = 'qida-urow qida-urow-suggestion' + (sug.urgent ? ' urgent' : '');
            typeBadge = '<span class="qida-utype-badge sug' + (sug.urgent ? ' urgent' : '') + '">' + icon('sparkles', 9) + ' Sugerencia ' + esc(fuLabel) + '</span>'
                + (row.hasActivity ? '<span class="qida-utype-sub" title="Este lead tambien tiene una actividad agendada">' + icon('calendar', 9) + ' + actividad</span>' : '');
            porQue = sug.reason;
        } else if (row.type === 'activity') {
            var act = row.activity;
            iconHtml = '<span class="qida-urow-icon-wrap act' + (row.isOverdue ? ' overdue' : '') + '">' + icon('calendar', 13) + '</span>';
            rowCls = 'qida-urow ' + (row.isOverdue ? 'qida-urow-activity-overdue' : (row.isToday ? 'qida-urow-activity-today' : 'qida-urow-activity'));
            if (row.isOverdue) {
                typeBadge = '<span class="qida-utype-badge act-overdue">' + icon('alert', 9) + ' Vencida hace ' + row.overdueDays + 'd</span>';
            } else if (row.isToday) {
                typeBadge = '<span class="qida-utype-badge act-today">' + icon('clock', 9) + ' Actividad hoy</span>';
            } else {
                typeBadge = '<span class="qida-utype-badge act">' + icon('calendar', 9) + ' Actividad</span>';
            }
            porQue = act.summary;
        } else {
            // 'lead'
            iconHtml = '<span class="qida-urow-icon-wrap lead">' + icon('dot', 13) + '</span>';
            rowCls = 'qida-urow qida-urow-lead';
            typeBadge = '<span class="qida-utype-badge lead">Lead activo</span>';
            porQue = lead.temperatureReason;
        }

        // Proximo seg
        var nextLabel = lead.nextScheduledFollowUp ? formatDateEs(lead.nextScheduledFollowUp) : '&mdash;';
        var nextDiff  = lead.nextScheduledFollowUp ? daysBetween(lead.nextScheduledFollowUp) : null;
        var nextStyle = '';
        if (nextDiff != null) {
            if (nextDiff < 0) nextStyle = 'color:var(--red600);font-weight:500;';
            else if (nextDiff === 0) nextStyle = 'color:var(--qg);font-weight:600;';
        }

        // v1.5: sin acciones contextuales. Toda la fila abre el detail del lead.
        return '<tr class="' + rowCls + '" data-action="select-lead" data-id="' + esc(row.leadId) + '">'
            + '<td class="qida-urow-icon">' + iconHtml + '</td>'
            + '<td class="qida-urow-familia">'
                + '<div class="qida-urow-name">' + esc(lead.contact) + ' &middot; ' + esc(lead.location) + '</div>'
                + '<div class="qida-urow-meta">' + esc(lead.relation) + ' ' + esc(lead.caredPersonName) + ', ' + lead.age + ' anos</div>'
            + '</td>'
            + '<td class="qida-urow-type">' + typeBadge + '</td>'
            + '<td class="qida-urow-temp">' + renderTempBadge(temp, tempSource, true) + '</td>'
            + '<td class="qida-urow-porque"><span title="' + esc(porQue) + '">' + esc(porQue) + '</span></td>'
            + '<td class="qida-urow-dias">' + renderDays(lead.daysWithoutTouch, temp) + '</td>'
            + '<td class="qida-urow-proximo"><span style="' + nextStyle + '">' + nextLabel + '</span></td>'
            + '<td class="qida-urow-etapa"><span class="qida-stage">' + esc(lead.stage) + '</span></td>'
        + '</tr>';
    }

    // ============================================================
    // RENDER: Asistente flotante (3 estados)
    // ============================================================
    // Estado 1 (closed): pill bottom-right "Pregunta cualquier cosa..."
    // Estado 2 (expanded): input expandido con sugerencias
    // Estado 3 (results): panel lateral 30% con Leads / Conversaciones / Material
    // Estado 1: pill inline en el header (verde corporativo + Sparkles + texto + "/").
    function renderAssistantPill() {
        return '<button class="qida-asst-pill" data-action="assistant-open">'
            + icon('sparkles', 13) + ' Pregunta cualquier cosa... <kbd>/</kbd>'
        + '</button>';
    }

    // Estado 2: la pill crece a un input field anclado al header (no overlay).
    function renderAssistantExpanded() {
        var q = state.assistantQuery;
        return '<div class="qida-asst-exp-inline" data-stop="1">'
            + icon('sparkles', 13)
            + '<input class="qida-asst-input" type="text" data-input="assistant-q" id="qida-asst-input" value="' + esc(q) + '" placeholder=\'Buscar leads, conversaciones o material...\' />'
            + '<button class="qida-asst-send" data-action="assistant-submit"' + (q.trim() ? '' : ' disabled') + ' title="Buscar">' + icon('send', 13) + '</button>'
            + '<button class="qida-asst-collapse" data-action="assistant-collapse" title="Cerrar busqueda">' + icon('x', 13) + '</button>'
        + '</div>';
    }

    // Estado 3: en el header, chip compacto con la query truncada y X. El panel lateral
    // sigue viviendo dentro de renderDashboard().
    function renderAssistantHeaderChip() {
        var q = state.assistantQuery || 'Busqueda';
        var truncated = q.length > 32 ? q.slice(0, 30) + '...' : q;
        return '<div class="qida-asst-chip" title="' + esc(q) + '">'
            + icon('sparkles', 12)
            + '<span class="qida-asst-chip-q">' + esc(truncated) + '</span>'
            + '<button class="qida-asst-chip-x" data-action="assistant-close" aria-label="Cerrar busqueda">' + icon('x', 12) + '</button>'
        + '</div>';
    }

    function renderAssistantPanel() {
        var q = state.assistantQuery;
        var results = state.assistantResults;
        var loading = state.assistantLoading;

        function skel(n) {
            var s = '';
            for (var i = 0; i < n; i++) {
                s += '<div class="qida-skel-card">'
                    + '<div class="qida-skel qida-skel-line" style="width:70%;"></div>'
                    + '<div class="qida-skel qida-skel-line" style="width:90%;"></div>'
                    + '<div class="qida-skel qida-skel-line" style="width:40%;"></div>'
                + '</div>';
            }
            return s;
        }

        function bloque(title, ico, items, render, totalKey) {
            var count = (results && results[totalKey]) ? results[totalKey].length : 0;
            return '<div class="qida-asst-bloque">'
                + '<div class="qida-asst-bloque-h">'
                    + '<span class="qida-asst-bloque-title">' + icon(ico, 11) + ' ' + esc(title) + '</span>'
                    + '<span class="qida-asst-bloque-count">' + (loading ? '' : count + ' resultado' + (count === 1 ? '' : 's')) + '</span>'
                + '</div>'
                + (loading
                    ? skel(2)
                    : (items.length === 0
                        ? '<div class="qida-asst-empty">Sin resultados para "' + esc(q) + '" en ' + esc(title.toLowerCase()) + '.</div>'
                        : items.map(render).join('')
                    )
                )
            + '</div>';
        }

        var body = '';
        if (loading) {
            body = bloque('Leads', 'users', [], function () {}, 'leads')
                 + bloque('Conversaciones', 'msg', [], function () {}, 'conversations')
                 + bloque('Material', 'book', [], function () {}, 'material');
        } else if (!results || (results.leads.length === 0 && results.conversations.length === 0 && results.material.length === 0)) {
            body = '<div class="qida-asst-empty">Sin resultados para "' + esc(q) + '". Probá con otra busqueda.</div>';
        } else {
            body = bloque('Leads', 'users', results.leads, function (l) {
                return '<div class="qida-asst-result" data-action="assistant-open-lead" data-id="' + esc(l.id) + '">'
                    + '<div class="qida-asst-result-name">' + esc(l.name) + '</div>'
                    + '<div class="qida-asst-result-meta">' + renderTempBadge(getLeadTemperature(l), getLeadTemperatureSource(l), true)
                        + '<span>&middot;</span><span>' + esc(l.location) + '</span>'
                        + '<span>&middot;</span><span>' + esc(l.serviceType || '-') + '</span>'
                    + '</div>'
                + '</div>';
            }, 'leads');

            body += bloque('Conversaciones (WhatsApp)', 'msg', results.conversations, function (c) {
                return '<div class="qida-asst-result" data-action="assistant-open-lead" data-id="' + esc(c.leadId) + '">'
                    + '<div class="qida-asst-result-name">' + esc(c.leadName) + '</div>'
                    + '<div class="qida-asst-result-meta">' + esc(c.from === 'lead' ? 'Lead' : 'AF') + ' &middot; ' + esc(c.time) + '</div>'
                    + '<div class="qida-asst-result-text">"' + esc(c.text) + '"</div>'
                + '</div>';
            }, 'conversations');

            body += bloque('Material', 'book', results.material, function (m) {
                return '<div class="qida-asst-result" data-action="assistant-open-material" data-id="' + esc(m.id) + '">'
                    + '<div class="qida-asst-result-name">' + esc(m.title) + '</div>'
                    + '<div class="qida-asst-result-meta">' + esc(m.tag) + ' &middot; match ' + esc(m.match) + '</div>'
                + '</div>';
            }, 'material');
        }

        return '<aside class="qida-asst-panel">'
            + '<div class="qida-asst-panel-head">'
                + icon('sparkles', 13)
                + '<span class="qida-asst-panel-q">' + esc(q || 'Busqueda asistida') + '</span>'
                + '<button class="qida-asst-panel-close" data-action="assistant-edit" aria-label="Editar busqueda">' + icon('edit', 13) + '</button>'
                + '<button class="qida-asst-panel-close" data-action="assistant-close" aria-label="Cerrar">' + icon('x', 14) + '</button>'
            + '</div>'
            + '<div class="qida-asst-panel-body">' + body + '</div>'
        + '</aside>';
    }

    // ============================================================
    // RENDER: detail blocks
    // ============================================================
    function renderIaSummary(lead) {
        var s = getIaSummary(lead.id);

        if (state.editingIaSummary && s) {
            return '<div class="qida-block"><div class="qida-block-h">'
                + icon('sparkles', 13) + '<span class="qida-block-h-title">Resumen IA</span>'
                + '<span class="qida-block-h-aux">Editando manualmente</span>'
                + '</div>'
                + '<div class="qida-ia">'
                    + '<textarea class="qida-ia-textarea" data-input="ia-summary-edit" id="qida-ia-edit">' + esc(s.text) + '</textarea>'
                    + '<div class="qida-ia-actions">'
                        + '<button class="qida-btn-ghost" data-action="save-ia-summary">' + icon('check', 12) + ' Guardar</button>'
                        + '<button class="qida-btn-ghost" data-action="cancel-ia-summary">Cancelar</button>'
                    + '</div>'
                + '</div>'
            + '</div>';
        }

        var head = '<div class="qida-block-h">'
            + icon('sparkles', 13) + '<span class="qida-block-h-title">Resumen IA</span>'
            + '<span class="qida-block-h-aux">';

        if (s) {
            if (s.editedBy) head += 'Editado por ' + esc(s.editedBy);
            else head += 'Generado hace ' + esc(s.generatedAt ? s.generatedAt.replace(/^Hace\s+/i, '') : '?');
            head += ' &middot; <button class="qida-link-btn" data-action="edit-ia-summary">' + icon('edit', 10) + ' Editar</button>'
                 + ' &middot; <button class="qida-link-btn muted" data-action="regen-ia-summary">' + icon('refresh', 10) + ' Regenerar</button>';
        }
        head += '</span></div>';

        var body;
        if (s) {
            body = '<div class="qida-ia"><p class="qida-ia-text">' + esc(s.text) + '</p></div>';
        } else {
            body = '<div class="qida-ia">'
                + '<p class="qida-ia-empty">Resumen no generado todavia para este lead.</p>'
                + '<div class="qida-ia-actions"><button class="qida-btn-ghost" data-action="regen-ia-summary">' + icon('sparkles', 12) + ' Generar resumen</button></div>'
            + '</div>';
        }

        return '<div class="qida-block">' + head + body + '</div>';
    }

    function renderCare(lead) {
        var c = MOCK_CARE_CONTEXT[lead.id] || {};
        function item(key, val) {
            return '<div class="qida-care-item"><span class="qida-care-key">' + esc(key) + '</span><span class="qida-care-val">' + esc(val || '-') + '</span></div>';
        }
        return '<div class="qida-block">'
            + '<div class="qida-block-h">' + icon('users', 13) + '<span class="qida-block-h-title">Contexto del cuidado</span></div>'
            + '<div class="qida-care"><div class="qida-care-grid">'
                + item('Persona cuidada', lead.relation + ' ' + lead.caredPersonName + ', ' + lead.age + ' anos')
                + item('Relacion',        c.relationship)
                + item('Condicion principal', c.mainCondition)
                + item('Ubicacion',       lead.location)
                + item('Tipo de servicio', lead.serviceType)
                + item('Urgencia',        lead.urgency)
                + item('Vive solo',       c.livesAlone == null ? '-' : (c.livesAlone ? 'Si' : 'No'))
                + item('Prescriptor',     lead.prescriptor)
            + '</div></div>'
        + '</div>';
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

        return '<div class="qida-block">'
            + '<div class="qida-block-h">' + icon('file', 13) + '<span class="qida-block-h-title">Notas internas</span>'
                + '<span class="qida-block-h-aux">'
                + (state.addingNote ? '' : '<button class="qida-link-btn" data-action="start-add-note">' + icon('plus', 11) + ' Anadir nota</button>')
                + '</span>'
            + '</div>'
            + notesHtml
            + add
        + '</div>';
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
                var cls = 'qida-act' + (st === 'overdue' ? ' overdue' : '') + (a.done ? ' done' : '');
                var deadlineLabel = a.deadline ? formatDateEs(a.deadline) : 'sin fecha';
                if (st === 'today') deadlineLabel = 'Hoy';
                else if (st === 'overdue') deadlineLabel = 'Vencida (' + deadlineLabel + ')';
                html += '<div class="' + cls + '">'
                    + '<div class="qida-act-icon">' + icon(a.type === 'Llamada' ? 'phone' : (a.type === 'Recordatorio' ? 'clock' : 'check'), 13) + '</div>'
                    + '<div class="qida-act-body">'
                        + '<div class="qida-act-summary">' + esc(a.summary) + '</div>'
                        + '<div class="qida-act-meta">' + icon('calendar', 10) + ' ' + esc(deadlineLabel) + ' &middot; ' + esc(a.assignee) + '</div>'
                    + '</div>'
                + '</div>';
            }
        }

        return '<div class="qida-block">'
            + '<div class="qida-block-h">' + icon('clock', 13) + '<span class="qida-block-h-title">Actividades planificadas</span></div>'
            + html
        + '</div>';
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
        return '<div class="qida-block">'
            + '<div class="qida-block-h">' + icon('users', 13) + '<span class="qida-block-h-title">Equipo siguiendo</span>'
            + '<span class="qida-block-h-aux">Hover para email</span></div>'
            + '<div class="qida-followers">' + html + '</div>'
        + '</div>';
    }

    function renderTemplatesPanel() {
        var html = '<p class="qida-tpl-intro">Tus plantillas. Copia y pega en WhatsApp adaptandolas.</p>';
        for (var i = 0; i < MOCK_TEMPLATES.length; i++) {
            var t = MOCK_TEMPLATES[i];
            html += '<div class="qida-tpl">'
                + '<div class="qida-tpl-name">' + esc(t.name) + '</div>'
                + '<p class="qida-tpl-preview">' + esc(t.preview) + '</p>'
                + '<div class="qida-tpl-actions"><button class="qida-tpl-copy" data-action="copy-tpl" data-id="' + t.id + '">Copiar</button><button class="qida-tpl-edit">Editar</button></div>'
            + '</div>';
        }
        html += '<button class="qida-tpl-new">+ Nueva plantilla</button>';
        return html;
    }

    function renderMaterialPanel() {
        var html = '<p class="qida-mat-intro">Material de marketing sugerido para este caso.</p>'
            + '<div class="qida-mat-ai">' + icon('sparkles', 9) + ' Sugerencias IA basadas en el contexto del lead</div>';
        for (var i = 0; i < MOCK_MATERIAL.length; i++) {
            var m = MOCK_MATERIAL[i];
            html += '<div class="qida-mat">'
                + '<div class="qida-mat-top"><span class="qida-mat-title">' + esc(m.title) + '</span><span class="qida-mat-match">' + esc(m.match) + '</span></div>'
                + '<span class="qida-mat-tag">' + esc(m.tag) + '</span>'
            + '</div>';
        }
        html += '<button class="qida-mat-more">Ver toda la biblioteca &rarr;</button>';
        return html;
    }

    function renderAttachmentsPanel(lead) {
        var atts = MOCK_ATTACHMENTS[lead.id] || [];
        if (atts.length === 0) {
            return '<p class="qida-att-empty">Sin adjuntos vinculados a este lead.</p>';
        }
        var html = '';
        for (var i = 0; i < atts.length; i++) {
            var a = atts[i];
            var iconName = 'file';
            if (a.mimetype && a.mimetype.indexOf('image') === 0) iconName = 'paperclip';
            html += '<div class="qida-att" data-action="open-attachment" data-id="' + esc(a.name) + '">'
                + '<div class="qida-att-icon">' + icon(iconName, 14) + '</div>'
                + '<div class="qida-att-body">'
                    + '<div class="qida-att-name">' + esc(a.name) + '</div>'
                    + '<div class="qida-att-meta">' + esc(a.mimetype || '') + ' &middot; ' + esc(a.date || '') + '</div>'
                + '</div>'
                + (a.isMain ? '<span class="qida-att-main">Principal</span>' : '')
            + '</div>';
        }
        return html;
    }

    // ============================================================
    // RENDER: detail (full)
    // ============================================================
    function renderDetail() {
        var lead = getLead(state.currentLeadId);
        if (!lead) return renderDashboard();

        var temp = getLeadTemperature(lead);
        var tempSource = getLeadTemperatureSource(lead);

        // Header: temperature display or picker
        var tempUI;
        if (!state.editingTemp) {
            tempUI = '<span class="qida-dh-temp">' + renderTempBadge(temp, tempSource, false)
                + '<button class="qida-temp-toggle" data-action="toggle-edit-temp">' + icon('edit', 9) + ' Cambiar</button>'
                + '</span>';
        } else {
            tempUI = '<div class="qida-temp-picker">';
            var keys = ['caliente', 'templado', 'frio', 'pausa'];
            for (var k = 0; k < keys.length; k++) {
                var key = keys[k];
                var cfg = TEMP_CONFIG[key];
                var selected = (temp === key);
                var styleAttr = selected ? 'background:' + cfg.bg + ';color:' + cfg.color + ';border-color:' + cfg.border + ';' : '';
                tempUI += '<button class="qida-temp-opt' + (selected ? ' selected' : '') + '" style="' + styleAttr + '" data-action="set-temp" data-id="' + key + '">'
                    + icon(cfg.icon, 11) + esc(cfg.label) + '</button>';
            }
            tempUI += '<button class="qida-temp-toggle" data-action="toggle-edit-temp">' + icon('check', 10) + ' Cerrar</button>';
            tempUI += '</div>';
        }

        // WhatsApp pane (left)
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

        // Right pane: tabs
        var tabs = [
            { id: 'templates',   icon: 'file',      label: 'Plantillas' },
            { id: 'material',    icon: 'book',      label: 'Material' },
            { id: 'attachments', icon: 'paperclip', label: 'Adjuntos' }
        ];
        var tabsHtml = '';
        for (var t = 0; t < tabs.length; t++) {
            var tab = tabs[t];
            tabsHtml += '<button class="qida-tab' + (state.activePanel === tab.id ? ' active' : '') + '" data-action="set-panel" data-id="' + tab.id + '">'
                + icon(tab.icon, 13) + esc(tab.label) + '</button>';
        }
        var asideBody = '';
        if (state.activePanel === 'templates')    asideBody = renderTemplatesPanel();
        else if (state.activePanel === 'material') asideBody = renderMaterialPanel();
        else if (state.activePanel === 'attachments') asideBody = renderAttachmentsPanel(lead);

        return '<div class="qida-detail">'
            // Header
            + '<div class="qida-detail-head">'
                + '<button class="qida-back" data-action="back-to-dashboard">' + icon('arrowLeft', 12) + ' Volver al listado</button>'
                + '<span class="qida-dh-name">' + esc(lead.name) + '</span>'
                + '<span class="qida-dh-id">' + esc(lead.id) + '</span>'
                + tempUI
                + '<span class="qida-dh-meta">'
                    + '<span class="qida-dh-meta-item">' + icon('mapPin', 11) + esc(lead.location) + '</span>'
                    + '<span>&middot;</span>'
                    + '<span class="qida-dh-meta-item">' + icon('users', 11) + esc(lead.relation + ' ' + lead.caredPersonName + ', ' + lead.age + ' anos') + '</span>'
                    + '<span>&middot;</span>'
                    + '<span class="qida-dh-meta-item">' + icon('phone', 11) + esc(lead.phone) + '</span>'
                    + '<span>&middot;</span>'
                    + '<span>' + esc(lead.stage) + '</span>'
                + '</span>'
            + '</div>'

            // Body: 3 panes
            + '<div class="qida-detail-body">'
                // Left: WhatsApp
                + '<div class="qida-pane-wa">'
                    + '<div class="qida-pane-head">' + icon('msg', 13) + '<span class="qida-pane-head-label">Conversacion WhatsApp</span><span class="qida-pane-head-aux">read-only</span></div>'
                    + '<div class="qida-pane-body">' + msgsHtml + '</div>'
                + '</div>'

                // Center: rich content
                + '<div class="qida-pane-center">'
                    + '<div class="qida-center-body">'
                        + renderIaSummary(lead)
                        + renderCare(lead)
                        + renderInternalNotes(lead)
                        + renderActivities(lead)
                        + renderFollowers(lead)
                    + '</div>'
                    + '<div class="qida-pane-center-foot">'
                        + '<button class="qida-btn-primary" data-action="open-schedule">' + icon('calendar', 14) + ' Agendar proximo seguimiento</button>'
                    + '</div>'
                + '</div>'

                // Right: tabs
                + '<div class="qida-pane-right">'
                    + '<div class="qida-tabs">' + tabsHtml + '</div>'
                    + '<div class="qida-aside-body">' + asideBody + '</div>'
                + '</div>'
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
    function rerenderContent() {
        var content = document.getElementById('qida-content');
        if (!content) return;
        content.innerHTML = renderContent();
        syncScheduleModal();
        syncAssistantHeader();
        syncToast();
    }

    // v1.4: el asistente ya no flota. Vive en #qida-asst-anchor dentro del header del shell.
    //   - closed   -> pill inline
    //   - expanded -> input field inline (crece in-place a la izquierda gracias al flex del header)
    //   - results  -> chip compacto con la query truncada (el panel lateral 30% sale dentro de
    //                renderDashboard porque shrinkea el content)
    //   En el detail no mostramos nada (no aplica al flujo de detail).
    function syncAssistantHeader() {
        var anchor = document.getElementById('qida-asst-anchor');
        if (!anchor) return;
        if (state.view !== 'dashboard') { anchor.innerHTML = ''; return; }
        if (state.assistantState === 'closed') {
            anchor.innerHTML = renderAssistantPill();
        } else if (state.assistantState === 'expanded') {
            anchor.innerHTML = renderAssistantExpanded();
            setTimeout(function () {
                var inp = document.getElementById('qida-asst-input');
                if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
            }, 30);
        } else if (state.assistantState === 'results') {
            anchor.innerHTML = renderAssistantHeaderChip();
        }
    }

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
        var shouldRerender = false;

        // Click-outside del asistente expandido: colapsar si el click no fue dentro del anchor.
        // El switch debajo procesara la accion del target normalmente (en este flow el siguiente
        // setState() del case ya hace el rerender; si no hay case, el shouldRerender lo dispara).
        if (state.assistantState === 'expanded') {
            var isInsideExp = false;
            var n = e.target;
            while (n && n.nodeType === 1) {
                if (n.id === 'qida-asst-anchor') { isInsideExp = true; break; }
                n = n.parentNode;
            }
            if (!isInsideExp) {
                state.assistantState = 'closed';
                state.assistantQuery = '';
                shouldRerender = true;
            }
        }

        if (!target) {
            if (shouldRerender) rerenderContent();
            return;
        }
        var action = target.getAttribute('data-action');
        var id = target.getAttribute('data-id');

        switch (action) {
            case 'open-modal':       openModal(); return;
            case 'close-modal':      closeModal(); return;
            case 'overlay-backdrop': if (e.target === target) closeModal(); return;

            case 'select-lead':
                setState({ view: 'detail', currentLeadId: id, activePanel: 'templates', editingTemp: false, editingIaSummary: false, addingNote: false });
                return;
            case 'back-to-dashboard':
                setState({ view: 'dashboard', currentLeadId: null, editingTemp: false, editingIaSummary: false, addingNote: false });
                return;

            case 'set-coverage':
                var bucket = parseInt(id, 10);
                var newBucket = (state.coverageBucket === bucket) ? null : bucket;
                setState({ coverageBucket: newBucket });
                return;
            case 'set-sort':
                handleSetSort(id);
                return;

            // --- v1.4: toolbar tabla unificada ---
            case 'toggle-filters':
                setState({ filtersExpanded: !state.filtersExpanded });
                return;
            case 'set-type-chip':
                setState({ activeTypeChip: id });
                return;
            case 'set-segment':
                setState({ activeSegmentFilter: state.activeSegmentFilter === id ? null : id });
                return;
            case 'clear-segment':
                setState({ activeSegmentFilter: null });
                return;

            // v1.5: las acciones "suggestion-done", "suggestion-postpone-*" y "scheduled-done"
            // se eliminaron del hover de las filas. Toda la fila abre el detail del lead.
            // Las funciones openScheduleFromSuggestion / openScheduleFromActivity siguen vivas
            // (ver TODO v1.6+) pero sin invocador en v1.5.0.

            // --- v1.3: asistente flotante ---
            case 'assistant-open':
                setState({ assistantState: 'expanded' });
                return;
            case 'assistant-close':
                setState({ assistantState: 'closed', assistantQuery: '', assistantResults: null, assistantLoading: false });
                return;
            case 'assistant-collapse':
                // X dentro del input expanded: vuelve a la pill (state 'closed') sin perder nada importante.
                setState({ assistantState: 'closed', assistantQuery: '' });
                return;
            case 'assistant-edit':
                setState({ assistantState: 'expanded' });
                return;
            case 'assistant-hint':
                state.assistantQuery = target.getAttribute('data-q') || '';
                runAssistantSearch();
                return;
            case 'assistant-submit':
                // Leemos del input si esta en expanded
                var inp = document.getElementById('qida-asst-input');
                if (inp) state.assistantQuery = inp.value;
                runAssistantSearch();
                return;
            case 'assistant-open-lead':
                setState({ view: 'detail', currentLeadId: id, activePanel: 'templates', assistantState: 'closed', assistantResults: null, assistantQuery: '', editingTemp: false, editingIaSummary: false, addingNote: false });
                return;
            case 'assistant-open-material':
                showToast('Abriendo material "' + id + '" (mock)');
                return;

            case 'set-panel':         setState({ activePanel: id }); return;
            case 'toggle-edit-temp':  setState({ editingTemp: !state.editingTemp }); return;
            case 'set-temp':
                EDITS.temperatures[state.currentLeadId] = { temperature: id, source: 'AF' };
                setState({ editingTemp: false });
                showToast('Temperatura actualizada');
                return;

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

            case 'copy-tpl':
                showToast('Plantilla copiada al portapapeles (mock)');
                return;
            case 'open-attachment':
                showToast('Descargando ' + (id || 'adjunto') + ' (mock)');
                return;

            case 'open-schedule':
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

    function runAssistantSearch() {
        var q = (state.assistantQuery || '').trim();
        if (!q) {
            showToast('Escribi una busqueda primero');
            return;
        }
        setState({ assistantState: 'results', assistantLoading: true, assistantResults: null });
        SearchService.all(q).then(function (results) {
            // Solo aplicar si el usuario sigue en results y la query no cambio
            if (state.assistantState !== 'results') return;
            state.assistantLoading = false;
            state.assistantResults = results;
            rerenderContent();
        });
    }

    function handleSetSort(col) {
        if (state.sortCol !== col) {
            setState({ sortCol: col, sortDir: 'asc' });
        } else if (state.sortDir === 'asc') {
            setState({ sortDir: 'desc' });
        } else {
            // 3er click: vuelve al default v1.4 (sort compuesto inteligente, sortCol=null).
            setState({ sortCol: null, sortDir: 'desc' });
        }
    }

    function handleScheduleConfirm() {
        if (!state.scheduleDate) {
            showToast('Eligi una fecha antes de confirmar.');
            return;
        }
        var leadId = state.scheduleLeadIdOverride || state.currentLeadId;
        var lead = getLead(leadId);
        if (!lead) { showToast('Lead no encontrado.'); return; }

        ActivityService.schedule(lead.id, state.scheduleDate, state.scheduleNote, state.scheduleMarkPause);

        // Si vinimos de Sugerencias del dia o de Actividades agendadas, marcamos hecho.
        if (state.scheduleOrigin === 'suggestion' && state.__pendingSuggestionDoneId) {
            SuggestionsService.markDone(state.__pendingSuggestionDoneId);
        }
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

        // Marcar sugerencia/actividad como hecha si aplica.
        if (state.scheduleOrigin === 'suggestion' && state.__pendingSuggestionDoneId) {
            SuggestionsService.markDone(state.__pendingSuggestionDoneId);
        }
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
        if (input === 'assistant-q') {
            state.assistantQuery = node.value;
            // No re-render completo: solo togglear disabled del send button.
            var sendBtn = document.querySelector('.qida-asst-send');
            if (sendBtn) {
                if (node.value.trim()) sendBtn.removeAttribute('disabled');
                else sendBtn.setAttribute('disabled', '');
            }
        } else if (input === 'schedule-date') {
            state.scheduleDate = node.value || null;
            // Si la fecha custom dispara > 21 dias, auto-tildar Pausa
            var diff = daysBetween(node.value);
            state.scheduleMarkPause = (diff > 21);
            rerenderContent();
        } else if (input === 'schedule-note') {
            state.scheduleNote = node.value;
        } else if (input === 'schedule-mark-pause') {
            state.scheduleMarkPause = !!node.checked;
        }
    }

    // ============================================================
    // MOUNT
    // ============================================================
    function injectBadge() {
        if (document.querySelector('.qida-badge')) return;
        var urgent = countByOperational('urgente');
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
        overlay.innerHTML =
            '<div class="qida-shell" id="qida-shell">'
                + '<div class="qida-shell-header">'
                    + '<div class="qida-shell-title">'
                        + '<div class="qida-shell-mark">' + icon('sparkles', 14) + '</div>'
                        + '<div>'
                            + '<div class="qida-shell-tt-main">Seguimientos</div>'
                            + '<div class="qida-shell-tt-sub">Tu workspace operativo, sobre Odoo</div>'
                        + '</div>'
                    + '</div>'
                    + '<div class="qida-shell-actions">'
                        + '<div id="qida-asst-anchor" class="qida-asst-anchor"></div>'
                        + '<span class="qida-esc">Esc para cerrar</span>'
                        + '<button class="qida-icon-btn" data-action="close-modal" aria-label="Cerrar">' + icon('x', 18) + '</button>'
                    + '</div>'
                + '</div>'
                + '<div id="qida-content" class="qida-content"></div>'
            + '</div>';
        overlay.addEventListener('click', handleClick);
        overlay.addEventListener('input', handleInput);
        overlay.addEventListener('change', handleInput); // para <select> y <input type=date>
        document.body.appendChild(overlay);
        rerenderContent();
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

    // Keyboard global: prioridad schedule modal -> assistant -> main modal.
    // "/" abre el asistente cuando el modal esta abierto y el dashboard activo.
    // "Enter" dentro del input del asistente dispara la busqueda.
    document.addEventListener('keydown', function (e) {
        var overlay = document.querySelector('.qida-overlay.active');
        if (!overlay) return;

        var isEsc   = (e.key === 'Escape' || e.keyCode === 27);
        var isSlash = (e.key === '/' || e.keyCode === 191);
        var isEnter = (e.key === 'Enter' || e.keyCode === 13);

        if (isEsc) {
            if (state.showScheduleModal) {
                closeScheduleModal();
            } else if (state.assistantState === 'results') {
                setState({ assistantState: 'closed', assistantQuery: '', assistantResults: null });
            } else if (state.assistantState === 'expanded') {
                setState({ assistantState: 'closed', assistantQuery: '' });
            } else {
                closeModal();
            }
            return;
        }

        if (isSlash && state.view === 'dashboard' && state.assistantState === 'closed' && !state.showScheduleModal) {
            // Solo si el foco no esta en un input/textarea/etc (para no robar "/" de search en otros campos)
            var tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
            if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
                e.preventDefault();
                setState({ assistantState: 'expanded' });
            }
            return;
        }

        if (isEnter) {
            var inp = document.getElementById('qida-asst-input');
            if (inp && document.activeElement === inp) {
                e.preventDefault();
                state.assistantQuery = inp.value;
                runAssistantSearch();
            }
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
        // Reset transient state. Mantengo filter/sort/coverage por si vuelven al modal.
        state.view = 'dashboard';
        state.currentLeadId = null;
        state.editingTemp = false;
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
        state.assistantState = 'closed';
        state.assistantQuery = '';
        state.assistantResults = null;
        state.assistantLoading = false;
        // v1.4: reset toolbar de la tabla unificada a defaults
        state.activeTypeChip = 'suggestions';
        state.activeSegmentFilter = null;
        state.filtersExpanded = false;
        state.sortCol = null;
        state.sortDir = 'desc';
        state.coverageBucket = null;
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
