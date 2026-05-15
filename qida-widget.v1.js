/**
 * ========================================
 * QIDA ASSISTANT v1.2.0
 * ========================================
 * Workspace operativo de Seguimientos para AFs sobre Odoo.
 * Vanilla ES5, sin deps. Single IIFE.
 *
 * Principio rector NO NEGOCIABLE:
 *   El widget NO genera mensajes para el lead.
 *   Solo consolida contexto y agiliza el flujo operativo de la AF.
 *
 * Cambios v1.2.0:
 *   - Mini-widget de cobertura (OKR 37% -> 68%)
 *   - Filtros operacionales nuevos (Calientes, Templados, Frios a reactivar,
 *     Pausados, Urgentes, Sin contactar)
 *   - Tabla con sort + columnas nuevas (Tipo de servicio, Urgencia)
 *   - Detail con layout redistribuido (header + 3 paneles)
 *   - Resumen IA editable + Care context + Notas + Actividades + Equipo
 *   - Tab "Adjuntos" en panel derecho (reemplaza Notas)
 *   - Modal "Agendar proximo seguimiento" (reemplaza followup)
 *
 * API publica:
 *   QidaAssistant.init(options)
 *   QidaAssistant.openModal()
 *   QidaAssistant.closeModal()
 *   QidaAssistant.showScreen(screenId)
 *   QidaAssistant.version
 */
(function (window, document) {
    'use strict';

    if (window.__QIDA_ASSISTANT_LOADED__) {
        console.warn('[QidaAssistant] Already loaded, skipping...');
        return;
    }
    window.__QIDA_ASSISTANT_LOADED__ = true;

    var VERSION = '1.2.0';
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
    var MOCK_LEADS = [
        { id: 'L122581', name: 'Familia Martinez Ruiz',     contact: 'Maria Martinez',           location: 'Madrid',                phone: '+34 666 84 34 18', elderly: 'Padre, 87 anos',   context: 'Movilidad reducida tras caida. Vive solo.',                                  temperature: 'caliente', temperatureReason: 'Pidio presupuesto ayer y respondio hoy con preguntas concretas', temperatureSource: 'IA', daysWithoutTouch: 1,  lastInteraction: 'Hoy 09:45',   interactionCount: 5, stage: 'Por aceptar',            urgent: true,  urgency: 'Muy urgente', serviceType: 'Por horas',     prescriptor: 'ESSIP-MUNDO MAYOR' },
        { id: 'L122613', name: 'Familia Vidal Pons',        contact: 'Jordi Vidal',              location: 'Barcelona',             phone: '+34 633 12 88 09', elderly: 'Madre, 82 anos',    context: 'Demencia en fase inicial. Conviven dos hermanos.',                            temperature: 'templado', temperatureReason: 'Pidio pensarlo en familia, han pasado 4 dias',                temperatureSource: 'IA', daysWithoutTouch: 4,  lastInteraction: 'Hace 4 dias', interactionCount: 3, stage: 'Por elaborar propuesta', urgent: false, urgency: 'Estandar',    serviceType: 'Interno',       prescriptor: 'Web organico' },
        { id: 'L122476', name: 'Familia Baena Sanz',        contact: 'Alejandra Baena',          location: 'Madrid',                phone: '+34 622 45 12 03', elderly: 'Suegra, 90 anos',   context: 'Autonoma pero vive sola. Buscan acompanamiento diurno.',                      temperature: 'caliente', temperatureReason: 'Llamada agendada para manana 11:00',                          temperatureSource: 'IA', daysWithoutTouch: 0,  lastInteraction: 'Hoy 11:20',   interactionCount: 4, stage: 'Por aceptar',            urgent: false, urgency: 'Urgente',     serviceType: 'Por horas',     prescriptor: 'Recomendacion cliente' },
        { id: 'L121656', name: 'Familia Parellada Canals',  contact: 'Teresa Parellada',         location: "Sant Sadurni d'Anoia",  phone: '+34 644 78 90 12', elderly: 'Padre, 79 anos',    context: 'Postoperatorio cadera. Necesita ayuda temporal estimada 3-4 meses.',           temperature: 'templado', temperatureReason: 'Familia comparando con otras dos opciones',                   temperatureSource: 'AF', daysWithoutTouch: 6,  lastInteraction: 'Hace 6 dias', interactionCount: 4, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Externo',       prescriptor: 'Hospital Sant Joan de Deu' },
        { id: 'L121708', name: 'Familia Campos Rivera',     contact: 'David Campos',             location: 'Alcala de Henares',     phone: '+34 611 23 45 67', elderly: 'Madre, 84 anos',    context: 'Caida reciente, alta hospitalaria la semana pasada.',                          temperature: 'frio',     temperatureReason: 'Dijo que llamaria, hace 11 dias sin respuesta',               temperatureSource: 'IA', daysWithoutTouch: 11, lastInteraction: 'Hace 11 dias',interactionCount: 2, stage: 'Por aceptar',            urgent: false, urgency: 'Urgente',     serviceType: 'Interno',       prescriptor: 'Hospital Principe de Asturias' },
        { id: 'L121547', name: 'Familia Sanchez Tartalo',   contact: 'Maria Jesus Sanchez',      location: 'Madrid',                phone: '+34 655 90 11 22', elderly: 'Madre, 88 anos',    context: 'Alzheimer fase moderada. Hija quiere relevo de fines de semana.',              temperature: 'frio',     temperatureReason: 'No responde desde la propuesta hace 10 dias',                 temperatureSource: 'IA', daysWithoutTouch: 10, lastInteraction: 'Hace 10 dias',interactionCount: 2, stage: 'Por elaborar propuesta', urgent: false, urgency: 'Estandar',    serviceType: 'Fin de semana', prescriptor: 'Web organico' },
        { id: 'L121749', name: 'Familia Ferreiro Bergino',  contact: 'Maria del Mar Ferreiro',   location: 'Madrid',                phone: '+34 677 88 99 00', elderly: 'Tio, 81 anos',      context: 'Sin familia cercana. Sobrina unica responsable.',                              temperature: 'templado', temperatureReason: 'Esperando que organice visita al domicilio',                  temperatureSource: 'IA', daysWithoutTouch: 2,  lastInteraction: 'Hace 2 dias', interactionCount: 6, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Interno',       prescriptor: 'ESSIP-MUNDO MAYOR' },
        { id: 'L122131', name: 'Familia Roge Barcelo',      contact: 'Conxi Roge',               location: 'Barcelona',             phone: '+34 688 77 66 55', elderly: 'Marido, 76 anos',   context: 'Parkinson avanzado. Cuidadora actual deja en mayo.',                           temperature: 'caliente', temperatureReason: 'Urgencia operativa: necesita cuidadora antes del 30/05',     temperatureSource: 'AF', daysWithoutTouch: 2,  lastInteraction: 'Hace 2 dias', interactionCount: 7, stage: 'Por aceptar',            urgent: true,  urgency: 'Muy urgente', serviceType: 'Interno',       prescriptor: 'Recomendacion AF anterior' },
        { id: 'L122055', name: 'Familia Recio del Campo',   contact: 'Jose Maria Recio',         location: 'Collado Villalba',      phone: '+34 699 11 22 33', elderly: 'Madre, 85 anos',    context: 'Indecision sobre interna vs externa.',                                         temperature: 'frio',     temperatureReason: 'No contesta WhatsApp ni llamadas hace 9 dias',                temperatureSource: 'IA', daysWithoutTouch: 9,  lastInteraction: 'Hace 9 dias', interactionCount: 3, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Externo',       prescriptor: 'Web organico' },
        { id: 'L121843', name: 'Familia Avelino Redondo',   contact: 'Avelino Redondo',          location: 'Madrid',                phone: '+34 600 12 34 56', elderly: 'Mujer, 78 anos',    context: 'Recien derivado, sin contacto inicial todavia.',                               temperature: 'pausa',    temperatureReason: 'Pidio no contactar hasta junio (viaje familiar)',             temperatureSource: 'AF', daysWithoutTouch: 0,  lastInteraction: 'Hace 1 dia', interactionCount: 0, stage: 'Por contactar',          urgent: false, urgency: 'Estandar',    serviceType: 'Por horas',     prescriptor: 'ESSIP-MUNDO MAYOR', pausaUntil: '2026-06-05' },
        { id: 'L122278', name: 'Familia Ruben Garcia',      contact: 'Marina Ruben',             location: 'Madrid',                phone: '+34 622 99 88 77', elderly: 'Padre, 83 anos',    context: 'Diabetes y movilidad limitada. Vive con esposa de 80.',                        temperature: 'templado', temperatureReason: 'Esperando respuesta tras enviarle el presupuesto',            temperatureSource: 'IA', daysWithoutTouch: 5,  lastInteraction: 'Hace 5 dias', interactionCount: 3, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Por horas',     prescriptor: 'Hospital La Paz' },
        { id: 'L121399', name: 'Familia Ortiz Pica',        contact: 'Marta Ortiz',              location: 'Madrid',                phone: '+34 644 55 66 77', elderly: 'Madre, 86 anos',    context: 'Alta hospitalaria reciente. Necesita ayuda al alta inmediata.',                temperature: 'caliente', temperatureReason: 'Urgente: alta hospitalaria manana, sin alguien en casa',     temperatureSource: 'AF', daysWithoutTouch: 0,  lastInteraction: 'Hoy 08:30',   interactionCount: 2, stage: 'Por elaborar propuesta', urgent: true,  urgency: 'Muy urgente', serviceType: 'Interno',       prescriptor: 'Hospital La Paz' },
        // 2 leads adicionales para enriquecer el bucket "Sin contactar" y "Pausados"
        { id: 'L122701', name: 'Familia Lopez Iniesta',     contact: 'Carlos Lopez',             location: 'Madrid',                phone: '+34 611 99 00 11', elderly: 'Madre, 81 anos',    context: 'Derivacion reciente desde hospital. Aun sin primer contacto.',                  temperature: 'pausa',    temperatureReason: 'Sin contactar todavia, lead recien asignado',                 temperatureSource: 'IA', daysWithoutTouch: 1,  lastInteraction: 'Hace 1 dia', interactionCount: 0, stage: 'Por contactar',          urgent: false, urgency: 'Estandar',    serviceType: 'Interno',       prescriptor: 'Hospital Ramon y Cajal' },
        { id: 'L122845', name: 'Familia Mestres Carrasco',  contact: 'Pilar Mestres',            location: 'Sabadell',              phone: '+34 633 78 22 41', elderly: 'Padre, 89 anos',    context: 'Ya tuvo cuidadora anterior, busca relevo por jubilacion.',                     temperature: 'pausa',    temperatureReason: 'Pausa hasta que vuelva del viaje el 20/05',                   temperatureSource: 'AF', daysWithoutTouch: 3,  lastInteraction: 'Hace 3 dias', interactionCount: 2, stage: 'Por aceptar',            urgent: false, urgency: 'Estandar',    serviceType: 'Externo',       prescriptor: 'Recomendacion cliente', pausaUntil: '2026-05-20' }
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
    var MOCK_CARE_CONTEXT = {
        L122581: { caredPerson: 'Padre', caredAge: 87, relationship: 'Padre del contacto Maria', mainCondition: 'Movilidad reducida (post-caida)', livesAlone: true },
        L122613: { caredPerson: 'Madre', caredAge: 82, relationship: 'Madre de Jordi y hermano',  mainCondition: 'Demencia fase inicial', livesAlone: false },
        L122476: { caredPerson: 'Suegra', caredAge: 90, relationship: 'Suegra del contacto Alejandra', mainCondition: 'Autonoma con limitaciones leves', livesAlone: true },
        L121656: { caredPerson: 'Padre', caredAge: 79, relationship: 'Padre de Teresa', mainCondition: 'Postoperatorio cadera', livesAlone: false },
        L121708: { caredPerson: 'Madre', caredAge: 84, relationship: 'Madre de David', mainCondition: 'Caida reciente, alta hospitalaria', livesAlone: true },
        L121547: { caredPerson: 'Madre', caredAge: 88, relationship: 'Madre de Maria Jesus', mainCondition: 'Alzheimer fase moderada', livesAlone: false },
        L121749: { caredPerson: 'Tio',   caredAge: 81, relationship: 'Tio de Maria del Mar', mainCondition: 'Sin condicion grave, vive solo', livesAlone: true },
        L122131: { caredPerson: 'Marido', caredAge: 76, relationship: 'Marido de Conxi', mainCondition: 'Parkinson avanzado', livesAlone: false },
        L122055: { caredPerson: 'Madre', caredAge: 85, relationship: 'Madre de Jose Maria', mainCondition: 'Sin condicion grave reportada', livesAlone: true },
        L121843: { caredPerson: 'Mujer', caredAge: 78, relationship: 'Esposa de Avelino', mainCondition: 'Sin diagnostico aun', livesAlone: false },
        L122278: { caredPerson: 'Padre', caredAge: 83, relationship: 'Padre de Marina', mainCondition: 'Diabetes + movilidad limitada', livesAlone: false },
        L121399: { caredPerson: 'Madre', caredAge: 86, relationship: 'Madre de Marta', mainCondition: 'Alta hospitalaria reciente', livesAlone: true },
        L122701: { caredPerson: 'Madre', caredAge: 81, relationship: 'Madre de Carlos', mainCondition: 'Sin condicion grave reportada', livesAlone: false },
        L122845: { caredPerson: 'Padre', caredAge: 89, relationship: 'Padre de Pilar', mainCondition: 'Sin condicion grave reportada', livesAlone: false }
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
        L122845: []
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

        // Dashboard filtering / search / sort
        activeFilter: 'todos',          // 'todos' | 'caliente' | 'templado' | 'frio-reactivar' | 'pausa' | 'urgente' | 'sin-contactar'
        coverageBucket: null,           // null | 0 | 1 | 2 | 3 (3 significa "3+")
        searchQuery: '',
        sortCol: 'dias',                // 'familia' | 'temp' | 'servicio' | 'urgencia' | 'dias' | 'interacciones' | 'etapa'
        sortDir: 'desc',                // 'asc' | 'desc' (default 'dias' desc)

        // Detail state
        activePanel: 'templates',       // 'templates' | 'material' | 'attachments'
        editingTemp: false,
        editingIaSummary: false,
        addingNote: false,

        // Schedule modal
        showScheduleModal: false,
        scheduleDate: null,             // 'YYYY-MM-DD'
        scheduleNote: '',
        scheduleMarkPause: false,

        // Toast
        toast: null                     // { msg, ts }
    };

    // Edits "vivos" hechos por la AF (sin persistencia).
    var EDITS = {
        iaSummaries: {},      // { leadId: { text, editedBy, generatedAt } }
        temperatures: {},     // { leadId: { temperature, source } }
        notes: {},            // { leadId: [ { author, date, text } ] } (additions)
        scheduledActivities: [] // [ { leadId, deadline, note, markPause, ts } ]
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
    function matchesOperationalFilter(lead, filter) {
        var t = getLeadTemperature(lead);
        if (filter === 'caliente')         return t === 'caliente';
        if (filter === 'templado')         return t === 'templado';
        if (filter === 'frio-reactivar')   return t === 'frio' && lead.daysWithoutTouch < 21;
        if (filter === 'pausa')            return t === 'pausa';
        if (filter === 'urgente')          return !!lead.urgent;
        if (filter === 'sin-contactar')    return getInteractionCount(lead) === 0;
        return true; // 'todos'
    }

    function matchesCoverageBucket(lead, bucket) {
        if (bucket == null) return true;
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
        var out = [];
        for (var i = 0; i < MOCK_LEADS.length; i++) {
            var l = MOCK_LEADS[i];
            if (!matchesOperationalFilter(l, state.activeFilter)) continue;
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
        var out = [];
        for (var i = 0; i < MOCK_LEADS.length; i++) {
            var l = MOCK_LEADS[i];
            if (!matchesOperationalFilter(l, state.activeFilter)) continue;
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
        var total = MOCK_LEADS.length;
        if (total === 0) return 0;
        var n3plus = countByCoverage(3);
        return Math.round((n3plus / total) * 100);
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
        target:      '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'
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
            '.qida-shell-actions{display:flex;align-items:center;gap:8px;}',
            '.qida-esc{font-size:11px;color:var(--s400);}',
            '.qida-icon-btn{background:transparent;border:0;padding:6px;border-radius:6px;cursor:pointer;color:var(--s600);display:inline-flex;align-items:center;justify-content:center;transition:background .15s;}',
            '.qida-icon-btn:hover{background:var(--s100);color:var(--s900);}',
            '.qida-content{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0;}',

            /* coverage widget */
            '.qida-coverage{padding:16px 24px;background:linear-gradient(180deg,var(--qg-soft) 0%,#fff 100%);border-bottom:1px solid var(--s100);}',
            '.qida-coverage-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:10px;gap:12px;}',
            '.qida-coverage-title{font-size:12px;font-weight:600;color:var(--s700);display:inline-flex;align-items:center;gap:6px;letter-spacing:.02em;}',
            '.qida-coverage-target{font-size:11px;color:var(--s500);}',
            '.qida-coverage-target strong{color:var(--qg);font-weight:600;}',
            '.qida-coverage-row{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap;}',
            '.qida-cov-chip{flex:1;min-width:130px;display:inline-flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-radius:8px;border:1px solid var(--s200);background:#fff;cursor:pointer;font-family:inherit;color:var(--s700);transition:border-color .15s,box-shadow .15s,transform .12s;text-align:left;}',
            '.qida-cov-chip:hover{border-color:var(--s300);transform:translateY(-1px);}',
            '.qida-cov-chip.active{border-color:var(--qg);box-shadow:0 0 0 2px rgba(14,74,58,.12);background:var(--qg-soft);}',
            '.qida-cov-chip-label{display:flex;flex-direction:column;gap:2px;}',
            '.qida-cov-chip-label-main{font-size:12px;font-weight:500;color:var(--s700);display:inline-flex;align-items:center;gap:6px;}',
            '.qida-cov-chip-label-sub{font-size:10px;color:var(--s500);}',
            '.qida-cov-chip-num{font-family:"Fraunces",Georgia,serif;font-feature-settings:"ss01";font-size:22px;font-weight:600;color:var(--s900);line-height:1;}',
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

            /* Responsive */
            '@media (max-width:1100px){.qida-pane-wa{width:280px;}.qida-pane-right{width:280px;}}',
            '@media (max-width:900px){.qida-pane-wa{width:240px;}.qida-pane-right{display:none;}}',
            '@media (max-width:760px){.qida-pane-wa{display:none;}.qida-search input{padding-right:38px;}.qida-search-hint{display:none;}.qida-care-grid{grid-template-columns:1fr;}}'
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
            + days + 'd sin tocar'
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
        var tooltip = 'El objetivo del proyecto es llevar la cobertura del 3er mensaje del 37% al ' + COVERAGE_TARGET + '%.';

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
                + '<span class="qida-coverage-title">' + icon('target', 12) + 'Tu cobertura &mdash; esta semana</span>'
                + '<span class="qida-coverage-target">Meta del 3er msg: <strong>' + COVERAGE_TARGET + '%</strong></span>'
            + '</div>'
            + '<div class="qida-coverage-row">'
                + chip(0, 'Sin contactar', '0 mensajes', '')
                + chip(1, '1 contacto',    '1 mensaje',  '')
                + chip(2, '2 contactos',   '2 mensajes', '')
                + chip(3, '3+ contactos',  'Cobertura completa', '<span class="qida-cov-pct">' + pct + '%</span>')
            + '</div>'
        + '</div>';
    }

    // ============================================================
    // RENDER: dashboard table
    // ============================================================
    function renderLeadsRows() {
        var leads = getFilteredLeads();
        if (leads.length === 0) {
            return '<tr><td colspan="8" class="qida-empty">No hay leads que coincidan con este filtro o busqueda.</td></tr>';
        }
        var html = '';
        for (var i = 0; i < leads.length; i++) {
            var l = leads[i];
            var t = getLeadTemperature(l);
            html += '<tr data-action="select-lead" data-id="' + esc(l.id) + '">'
                + '<td><div><div class="qida-lead-name">' + esc(l.name) + '</div>'
                + '<div class="qida-lead-meta"><span style="display:inline-flex;align-items:center;gap:2px;">' + icon('mapPin', 9) + esc(l.location) + '</span>'
                + '<span>&middot;</span><span>' + esc(l.elderly) + '</span></div></div></td>'
                + '<td>' + renderTempBadge(t, getLeadTemperatureSource(l), false) + '</td>'
                + '<td><p class="qida-lead-reason">' + esc(l.temperatureReason) + '</p></td>'
                + '<td><span class="qida-service">' + esc(l.serviceType || '-') + '</span></td>'
                + '<td>' + renderUrg(l.urgency) + '</td>'
                + '<td>' + renderDays(l.daysWithoutTouch, t) + '</td>'
                + '<td><span style="font-size:12px;color:var(--s700);">' + l.interactionCount + '</span></td>'
                + '<td><span class="qida-stage">' + esc(l.stage) + '</span></td>'
                + '</tr>';
        }
        return html;
    }

    // ============================================================
    // RENDER: dashboard
    // ============================================================
    function renderDashboard() {
        var totalLeads = MOCK_LEADS.length;
        var nCaliente = countByOperational('caliente');
        var nTemplado = countByOperational('templado');
        var nFrio = countByOperational('frio-reactivar');
        var nPausa = countByOperational('pausa');
        var nUrgente = countByOperational('urgente');
        var nSinContactar = countByOperational('sin-contactar');
        var nPausaReact = pausaReactivacionEstaSemana();
        var filtered = getFilteredLeads();

        function chip(id, label, count, extra) {
            var cls = 'qida-chip' + (state.activeFilter === id ? ' active' : '');
            return '<button class="' + cls + '" data-action="set-filter" data-id="' + id + '">'
                + esc(label) + '<span class="qida-chip-count">' + count + '</span>'
                + (extra ? '<span class="qida-chip-extra">' + extra + '</span>' : '')
            + '</button>';
        }

        return '<div class="qida-dash">'
            + renderCoverage()
            + '<div class="qida-dash-top">'
                + '<div class="qida-search">'
                    + '<span class="qida-search-icon">' + icon('search', 16) + '</span>'
                    + '<input type="text" data-input="search" value="' + esc(state.searchQuery) + '" placeholder=\'Buscar en tus leads &mdash; p.ej. "familias con dudas de precio" o "alta hospitalaria"\' />'
                    + '<span class="qida-search-hint">' + icon('sparkles', 10) + ' Busqueda inteligente</span>'
                + '</div>'
                + '<div class="qida-chips">'
                    + chip('todos', 'Todos', totalLeads)
                    + chip('caliente', 'Calientes', nCaliente)
                    + chip('templado', 'Templados', nTemplado)
                    + chip('frio-reactivar', 'Frios a reactivar', nFrio)
                    + chip('pausa', 'Pausados', nPausa, nPausaReact > 0 ? '(' + nPausaReact + ' reactivan esta semana)' : '')
                    + chip('urgente', 'Urgentes', nUrgente)
                    + chip('sin-contactar', 'Sin contactar', nSinContactar)
                + '</div>'
            + '</div>'
            + '<div class="qida-dash-body">'
                + '<div class="qida-table-wrap">'
                    + '<table class="qida-table">'
                        + '<thead><tr>'
                            + renderSortHeader('familia',       'Familia')
                            + renderSortHeader('temp',          'Temperatura')
                            + '<th>Por que</th>'
                            + renderSortHeader('servicio',      'Tipo de servicio')
                            + renderSortHeader('urgencia',      'Urgencia')
                            + renderSortHeader('dias',          'Sin tocar')
                            + renderSortHeader('interacciones', 'Interacc.')
                            + renderSortHeader('etapa',         'Etapa')
                        + '</tr></thead>'
                        + '<tbody id="qida-leads-tbody">' + renderLeadsRows() + '</tbody>'
                    + '</table>'
                + '</div>'
                + '<div class="qida-dash-footer">'
                    + '<span id="qida-leads-count">' + filtered.length + ' de ' + totalLeads + ' leads</span>'
                    + '<span>Actualizado hace 2 min &middot; sincronizado con Odoo</span>'
                + '</div>'
            + '</div>'
        + '</div>';
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
                + item('Persona cuidada', (c.caredPerson || lead.elderly) + (c.caredAge ? ', ' + c.caredAge + ' anos' : ''))
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
                    + '<span class="qida-dh-meta-item">' + icon('users', 11) + esc(lead.elderly) + '</span>'
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
        syncToast();
    }

    function rerenderTable() {
        var tbody = document.getElementById('qida-leads-tbody');
        if (tbody) tbody.innerHTML = renderLeadsRows();
        var count = document.getElementById('qida-leads-count');
        if (count) count.textContent = getFilteredLeads().length + ' de ' + MOCK_LEADS.length + ' leads';
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
        if (!target) return;
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

            case 'set-filter':
                setState({ activeFilter: id });
                return;
            case 'set-coverage':
                var bucket = parseInt(id, 10);
                var newBucket = (state.coverageBucket === bucket) ? null : bucket;
                setState({ coverageBucket: newBucket });
                return;
            case 'set-sort':
                handleSetSort(id);
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
                // En mock no cambia nada; en P1 reemplazaria por una llamada real.
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
                var lead = getLead(state.currentLeadId);
                var defaultIso = addDaysISO(7);
                setState({
                    showScheduleModal: true,
                    scheduleDate: defaultIso,
                    scheduleNote: lead ? buildScheduleNote(lead) : '',
                    scheduleMarkPause: false
                });
                return;
            case 'schedule-cancel':
                setState({ showScheduleModal: false, scheduleDate: null, scheduleNote: '', scheduleMarkPause: false });
                return;
            case 'schedule-bg':
                if (e.target === target) setState({ showScheduleModal: false, scheduleDate: null, scheduleNote: '', scheduleMarkPause: false });
                return;
            case 'schedule-shortcut':
                var days = parseInt(id, 10);
                var iso = addDaysISO(days);
                state.scheduleDate = iso;
                state.scheduleMarkPause = (days > 21);
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

    function handleSetSort(col) {
        if (state.sortCol !== col) {
            setState({ sortCol: col, sortDir: 'asc' });
        } else if (state.sortDir === 'asc') {
            setState({ sortDir: 'desc' });
        } else {
            // 3er click: vuelve al default (dias desc).
            setState({ sortCol: 'dias', sortDir: 'desc' });
        }
    }

    function handleScheduleConfirm() {
        if (!state.scheduleDate) {
            showToast('Eligi una fecha antes de confirmar.');
            return;
        }
        var lead = getLead(state.currentLeadId);
        if (!lead) return;

        EDITS.scheduledActivities.push({
            leadId: lead.id,
            deadline: state.scheduleDate,
            note: state.scheduleNote,
            markPause: state.scheduleMarkPause,
            ts: Date.now()
        });

        if (state.scheduleMarkPause) {
            EDITS.temperatures[lead.id] = { temperature: 'pausa', source: 'AF' };
        }

        showToast('Seguimiento agendado para ' + formatDateEs(state.scheduleDate));
        setState({ showScheduleModal: false, scheduleDate: null, scheduleNote: '', scheduleMarkPause: false });
    }

    function handleScheduleCloseApply() {
        var sel = document.querySelector('[data-input="schedule-close-reason"]');
        if (!sel || !sel.value) {
            showToast('Eligi un motivo de cierre.');
            return;
        }
        var labels = { 'perdido': 'Perdido', 'convertido': 'Convertido', 'sin-interes': 'Sin interes', 'otro': 'Otro' };
        showToast('Lead marcado como ' + (labels[sel.value] || sel.value) + ' (mock)');
        setState({ showScheduleModal: false, scheduleDate: null, scheduleNote: '', scheduleMarkPause: false, view: 'dashboard', currentLeadId: null });
    }

    function handleInput(e) {
        var node = e.target;
        if (!node || !node.getAttribute) return;
        var input = node.getAttribute('data-input');
        if (input === 'search') {
            state.searchQuery = node.value;
            rerenderTable();
        } else if (input === 'schedule-date') {
            state.scheduleDate = node.value || null;
            // Si la fecha custom dispara > 21 dias, auto-tildar Pausa
            var diff = daysBetween(node.value);
            state.scheduleMarkPause = (diff > 21);
            // Re-render para que pause toggle refleje
            rerenderContent();
        } else if (input === 'schedule-note') {
            state.scheduleNote = node.value;
        } else if (input === 'schedule-mark-pause') {
            state.scheduleMarkPause = !!node.checked;
        }
        // ia-summary-edit y new-note los leemos del DOM al guardar; no necesitan sync.
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

    // ESC: schedule modal first, then main modal
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' && e.keyCode !== 27) return;
        var overlay = document.querySelector('.qida-overlay.active');
        if (!overlay) return;
        if (state.showScheduleModal) {
            setState({ showScheduleModal: false, scheduleDate: null, scheduleNote: '', scheduleMarkPause: false });
        } else {
            closeModal();
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
        // Reset transient state. Mantengo filter/sort/coverage/search por si vuelven al modal.
        state.view = 'dashboard';
        state.currentLeadId = null;
        state.editingTemp = false;
        state.editingIaSummary = false;
        state.addingNote = false;
        state.showScheduleModal = false;
        state.scheduleDate = null;
        state.scheduleNote = '';
        state.scheduleMarkPause = false;
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
