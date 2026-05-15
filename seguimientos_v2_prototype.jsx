import React, { useState, useMemo } from 'react';
import {
  X, Search, MessageCircle, FileText, Sparkles, BookOpen,
  Clock, ChevronLeft, ChevronRight, Phone, Mail, Calendar,
  Check, Edit2, Flame, ThermometerSun, Snowflake, Pause,
  ArrowRight, MapPin, Users, AlertCircle, ChevronDown
} from 'lucide-react';

/* ============================================================
   PROTOTIPO — Seguimientos v2 (AF / Qida)
   ============================================================
   Mapeo a piezas del MVP del PRD:
     · Pieza 1 (Dashboard)              → DashboardView
     · Pieza 2 (Búsqueda y filtros)     → SearchBar + FilterChips
     · Pieza 3 (Vista unificada lead)   → LeadDetailView (3 paneles)
     · Pieza 4 (Plantillas personales)  → TemplatesPanel
     · Pieza 5 (Material contextual)    → MaterialPanel

   Ideas del research UX/UI incorporadas:
     · #1 Temperatura categórica + motivo auditable  → TemperatureBadge
     · #2 Indicador de abandono                      → DaysWithoutTouch
     · #3 Sección "A retomar" por defecto            → RetomarSection
     · #4 Layout 3 paneles tipo Close/Attio          → LeadDetailView
     · #5 Pop-up next-follow-up al cerrar acción     → NextFollowupModal

   Fuera de scope (post-MVP):
     · Copiloto conversacional
     · Generación de mensajes por IA
     · Envío directo de WhatsApp
   ============================================================ */

// --- MOCK DATA ----------------------------------------------------------

const MOCK_LEADS = [
  {
    id: 'L122581',
    name: 'Familia Martínez Ruiz',
    contact: 'María Martínez',
    location: 'Madrid',
    phone: '+34 666 84 34 18',
    elderly: 'Padre, 87 años',
    context: 'Movilidad reducida tras caída. Vive solo.',
    temperature: 'caliente',
    temperatureReason: 'Pidió presupuesto ayer y respondió hoy con preguntas concretas',
    temperatureSource: 'IA',
    daysWithoutTouch: 1,
    lastInteraction: 'Hoy 09:45',
    interactionCount: 5,
    stage: 'Por aceptar',
    urgent: true,
  },
  {
    id: 'L122613',
    name: 'Familia Vidal Pons',
    contact: 'Jordi Vidal',
    location: 'Barcelona',
    phone: '+34 633 12 88 09',
    elderly: 'Madre, 82 años',
    context: 'Demencia en fase inicial. Conviven dos hermanos.',
    temperature: 'templado',
    temperatureReason: 'Pidió pensarlo en familia, han pasado 4 días',
    temperatureSource: 'IA',
    daysWithoutTouch: 4,
    lastInteraction: 'Hace 4 días',
    interactionCount: 3,
    stage: 'Por elaborar propuesta',
    urgent: false,
  },
  {
    id: 'L122476',
    name: 'Familia Baena Sanz',
    contact: 'Alejandra Baena',
    location: 'Madrid',
    phone: '+34 622 45 12 03',
    elderly: 'Suegra, 90 años',
    context: 'Autónoma pero vive sola. Buscan acompañamiento diurno.',
    temperature: 'caliente',
    temperatureReason: 'Llamada agendada para mañana 11:00',
    temperatureSource: 'IA',
    daysWithoutTouch: 0,
    lastInteraction: 'Hoy 11:20',
    interactionCount: 4,
    stage: 'Por aceptar',
    urgent: false,
  },
  {
    id: 'L121656',
    name: 'Familia Parellada Canals',
    contact: 'Teresa Parellada',
    location: "Sant Sadurní d'Anoia",
    phone: '+34 644 78 90 12',
    elderly: 'Padre, 79 años',
    context: 'Postoperatorio cadera. Necesita ayuda temporal estimada 3-4 meses.',
    temperature: 'templado',
    temperatureReason: 'Familia comparando con otras dos opciones',
    temperatureSource: 'AF',
    daysWithoutTouch: 6,
    lastInteraction: 'Hace 6 días',
    interactionCount: 4,
    stage: 'Por aceptar',
    urgent: false,
  },
  {
    id: 'L121708',
    name: 'Familia Campos Rivera',
    contact: 'David Campos',
    location: 'Alcalá de Henares',
    phone: '+34 611 23 45 67',
    elderly: 'Madre, 84 años',
    context: 'Caída reciente, alta hospitalaria la semana pasada.',
    temperature: 'frio',
    temperatureReason: 'Dijo que llamaría, hace 11 días sin respuesta',
    temperatureSource: 'IA',
    daysWithoutTouch: 11,
    lastInteraction: 'Hace 11 días',
    interactionCount: 2,
    stage: 'Por aceptar',
    urgent: false,
  },
  {
    id: 'L121547',
    name: 'Familia Sánchez Tártalo',
    contact: 'María Jesús Sánchez',
    location: 'Madrid',
    phone: '+34 655 90 11 22',
    elderly: 'Madre, 88 años',
    context: 'Alzheimer fase moderada. Hija quiere relevo de fines de semana.',
    temperature: 'frio',
    temperatureReason: 'No responde desde la propuesta hace 10 días',
    temperatureSource: 'IA',
    daysWithoutTouch: 10,
    lastInteraction: 'Hace 10 días',
    interactionCount: 2,
    stage: 'Por elaborar propuesta',
    urgent: false,
  },
  {
    id: 'L121749',
    name: 'Familia Ferreiro Bergiño',
    contact: 'Maria del Mar Ferreiro',
    location: 'Madrid',
    phone: '+34 677 88 99 00',
    elderly: 'Tío, 81 años',
    context: 'Sin familia cercana. Sobrina única responsable.',
    temperature: 'templado',
    temperatureReason: 'Esperando que organice visita al domicilio',
    temperatureSource: 'IA',
    daysWithoutTouch: 2,
    lastInteraction: 'Hace 2 días',
    interactionCount: 6,
    stage: 'Por aceptar',
    urgent: false,
  },
  {
    id: 'L122131',
    name: 'Familia Rogé Barceló',
    contact: 'Conxi Rogé',
    location: 'Barcelona',
    phone: '+34 688 77 66 55',
    elderly: 'Marido, 76 años',
    context: 'Parkinson avanzado. Cuidadora actual deja en mayo.',
    temperature: 'caliente',
    temperatureReason: 'Urgencia operativa: necesita cuidadora antes del 30/05',
    temperatureSource: 'AF',
    daysWithoutTouch: 2,
    lastInteraction: 'Hace 2 días',
    interactionCount: 7,
    stage: 'Por aceptar',
    urgent: true,
  },
  {
    id: 'L122055',
    name: 'Familia Recio del Campo',
    contact: 'Jose Maria Recio',
    location: 'Collado Villalba',
    phone: '+34 699 11 22 33',
    elderly: 'Madre, 85 años',
    context: 'Indecisión sobre interna vs externa.',
    temperature: 'frio',
    temperatureReason: 'No contesta WhatsApp ni llamadas hace 9 días',
    temperatureSource: 'IA',
    daysWithoutTouch: 9,
    lastInteraction: 'Hace 9 días',
    interactionCount: 3,
    stage: 'Por aceptar',
    urgent: false,
  },
  {
    id: 'L121843',
    name: 'Familia Avelino Redondo',
    contact: 'Avelino Redondo',
    location: 'Madrid',
    phone: '+34 600 12 34 56',
    elderly: 'Mujer, 78 años',
    context: 'Recién derivado, sin contacto inicial todavía.',
    temperature: 'pausa',
    temperatureReason: 'Pidió no contactar hasta junio (viaje familiar)',
    temperatureSource: 'AF',
    daysWithoutTouch: 0,
    lastInteraction: 'Hace 1 día',
    interactionCount: 1,
    stage: 'Por contactar',
    urgent: false,
  },
  {
    id: 'L122278',
    name: 'Familia Rubén García',
    contact: 'Marina Rubén',
    location: 'Madrid',
    phone: '+34 622 99 88 77',
    elderly: 'Padre, 83 años',
    context: 'Diabetes y movilidad limitada. Vive con esposa de 80.',
    temperature: 'templado',
    temperatureReason: 'Esperando respuesta tras enviarle el presupuesto',
    temperatureSource: 'IA',
    daysWithoutTouch: 5,
    lastInteraction: 'Hace 5 días',
    interactionCount: 3,
    stage: 'Por aceptar',
    urgent: false,
  },
  {
    id: 'L121399',
    name: 'Familia Ortiz Pica',
    contact: 'Marta Ortiz',
    location: 'Madrid',
    phone: '+34 644 55 66 77',
    elderly: 'Madre, 86 años',
    context: 'Alta hospitalaria reciente. Necesita ayuda al alta inmediata.',
    temperature: 'caliente',
    temperatureReason: 'Urgente: alta hospitalaria mañana, sin alguien en casa',
    temperatureSource: 'AF',
    daysWithoutTouch: 0,
    lastInteraction: 'Hoy 08:30',
    interactionCount: 2,
    stage: 'Por elaborar propuesta',
    urgent: true,
  },
];

const MOCK_WHATSAPP = {
  L122581: [
    { from: 'lead', text: 'Hola, vi su web. Mi padre se cayó la semana pasada y necesita ayuda.', time: 'Lun 17:30' },
    { from: 'af', text: 'Buenas tardes María, gracias por contactarnos. Lamento lo de tu padre. ¿Tienes 10 minutos mañana para que podamos entender mejor la situación?', time: 'Lun 17:42' },
    { from: 'lead', text: 'Sí, mañana a las 10 podemos.', time: 'Lun 17:50' },
    { from: 'af', text: 'Perfecto, te llamo a las 10. Hablamos.', time: 'Lun 17:52' },
    { from: 'lead', text: 'Hola, vi el presupuesto. Quería preguntarte dos cosas: ¿incluye fines de semana? Y ¿se puede empezar la semana que viene?', time: 'Hoy 09:45' },
  ],
  L122613: [
    { from: 'lead', text: 'Buenas, mi madre tiene principio de demencia. Somos dos hermanos.', time: 'Vie 11:20' },
    { from: 'af', text: 'Hola Jordi, entiendo. ¿Podemos hablar 15 minutos esta tarde para entender qué necesitáis exactamente?', time: 'Vie 11:35' },
    { from: 'lead', text: 'Esta tarde sí, sobre las 18:00.', time: 'Vie 11:40' },
    { from: 'af', text: 'Os mando el presupuesto en PDF como hablamos. Cualquier duda me decís.', time: 'Vie 18:55' },
    { from: 'lead', text: 'Gracias. Lo hablo con mi hermano y te digo a principios de semana.', time: 'Vie 19:02' },
  ],
  L122476: [
    { from: 'lead', text: 'Hola, mi suegra vive sola y queremos alguien que la acompañe por las mañanas.', time: 'Mié 10:00' },
    { from: 'af', text: 'Hola Alejandra, claro. ¿Cuántas horas estimas por mañana? ¿Hace falta ayuda con comidas o solo compañía?', time: 'Mié 10:15' },
    { from: 'lead', text: '4 horas, de 9 a 13. Comidas se las prepara ella, solo compañía y acompañamiento a paseos o médico.', time: 'Mié 10:22' },
    { from: 'af', text: 'Hola Alejandra, te llamo mañana a las 11 con los detalles del perfil que hemos identificado. ¿Te va bien?', time: 'Hoy 11:20' },
  ],
};

const MOCK_NOTES = {
  L122581: [
    { author: 'Patricia V.', date: 'Hace 2 días', text: 'Tienen presupuesto aprobado. Decisión rápida si mostramos perfil adecuado.' },
    { author: 'Patricia V.', date: 'Hace 5 días', text: 'Primera llamada con María. Padre lúcido pero con movilidad muy reducida.' },
  ],
  L122613: [
    { author: 'Patricia V.', date: 'Hace 4 días', text: 'Hablan los dos hermanos, decisión conjunta. Hermano mayor más reticente.' },
  ],
};

const MOCK_TEMPLATES = [
  { id: 't1', name: 'Recordatorio suave - presupuesto enviado', preview: 'Hola {nombre}, ¿pudisteis ver el presupuesto que te envié el {día}? Cualquier duda me dices.' },
  { id: 't2', name: 'Seguimiento post-llamada', preview: 'Hola {nombre}, te resumo lo hablado: {puntos}. Quedo a la espera de tu confirmación.' },
  { id: 't3', name: 'Reactivación tras silencio', preview: 'Hola {nombre}, hace unos días que no hablamos. ¿Sigue en pie lo que comentamos o prefieres que lo dejemos por ahora?' },
  { id: 't4', name: 'Cierre cálido - aceptación', preview: 'Hola {nombre}, qué bien que sigamos adelante. Te confirmo arranque para el {fecha}.' },
];

const MOCK_MATERIAL = [
  { id: 'm1', title: 'Guía: Primeros pasos cuando hay alta hospitalaria', match: '92%', tag: 'Postoperatorio' },
  { id: 'm2', title: 'Vídeo: Cómo elegimos a las cuidadoras (3 min)', match: '88%', tag: 'Confianza' },
  { id: 'm3', title: 'PDF: Diferencias entre interna y externa', match: '74%', tag: 'Comparativa' },
];

// --- HELPERS ------------------------------------------------------------

const TEMP_CONFIG = {
  caliente: { label: 'Caliente', color: 'bg-orange-100 text-orange-900 border-orange-300', dot: 'bg-orange-500', icon: Flame },
  templado: { label: 'Templado', color: 'bg-amber-50 text-amber-900 border-amber-300', dot: 'bg-amber-500', icon: ThermometerSun },
  frio: { label: 'Frío', color: 'bg-sky-50 text-sky-900 border-sky-300', dot: 'bg-sky-500', icon: Snowflake },
  pausa: { label: 'Pausa', color: 'bg-stone-100 text-stone-700 border-stone-300', dot: 'bg-stone-400', icon: Pause },
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap');
  .font-display { font-family: 'Fraunces', Georgia, serif; font-feature-settings: 'ss01'; }
  .font-body { font-family: 'Manrope', system-ui, sans-serif; }
`;

// --- COMPONENTS ---------------------------------------------------------

const TemperatureBadge = ({ temperature, source, small = false }) => {
  const cfg = TEMP_CONFIG[temperature];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 ${small ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'} rounded-md border font-medium ${cfg.color}`}>
      <Icon size={small ? 10 : 12} />
      {cfg.label}
      {source === 'IA' && !small && <Sparkles size={10} className="opacity-60" />}
    </span>
  );
};

const DaysWithoutTouch = ({ days, temperature }) => {
  const threshold = { caliente: 3, templado: 7, frio: 14, pausa: 99 }[temperature];
  const isStale = days >= threshold;
  if (days === 0) return <span className="text-xs text-stone-500">Hoy</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${isStale ? 'text-red-600 font-medium' : 'text-stone-500'}`}>
      {isStale && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
      {days}d sin tocar
    </span>
  );
};

// --- ODOO BACKGROUND ----------------------------------------------------

const OdooBackground = ({ onOpenWidget }) => (
  <div className="min-h-screen bg-stone-100 font-body">
    {/* Odoo top bar simulado */}
    <div className="bg-[#714B67] text-white px-4 py-2.5 flex items-center justify-between text-sm">
      <div className="flex items-center gap-6">
        <div className="grid grid-cols-3 gap-0.5 w-4 h-4 opacity-70">
          {[...Array(9)].map((_, i) => <div key={i} className="bg-white rounded-sm" />)}
        </div>
        <span className="font-semibold">CRM</span>
        <span className="opacity-80">Ventas</span>
        <span className="opacity-80">Informes</span>
      </div>
      <div className="flex items-center gap-3 text-xs opacity-90">
        <span>Caring Well S.L.</span>
        <span className="px-2 py-0.5 bg-white/20 rounded">alejandro viva</span>
      </div>
    </div>

    {/* Flujo header con CTA de seguimientos prominente */}
    <div className="bg-white border-b border-stone-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-lg font-semibold text-stone-800">Flujo</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-sm text-stone-600 hover:text-stone-900">Filtros</button>
          <button className="text-sm text-stone-600 hover:text-stone-900">Agrupar por</button>
          <button className="text-sm text-stone-600 hover:text-stone-900">Favoritos</button>
          <div className="w-px h-5 bg-stone-300 mx-2" />
          {/* TRIGGER DEL WIDGET — visible, prominente */}
          <button
            onClick={onOpenWidget}
            className="group relative inline-flex items-center gap-2 px-4 py-2 bg-[#0E4A3A] hover:bg-[#0a3a2d] text-white rounded-md text-sm font-semibold shadow-sm transition-all hover:shadow-md"
          >
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full">3</span>
            <Sparkles size={15} />
            Seguimientos
          </button>
        </div>
      </div>
    </div>

    {/* Kanban placeholder simplificado */}
    <div className="p-6 grid grid-cols-6 gap-3 max-w-[1600px] mx-auto opacity-60">
      {['Por asignar', 'Por contactar', 'Por elaborar', 'Por aceptar', 'Por revisar', 'Aceptado'].map((col, i) => (
        <div key={col} className="bg-white rounded border border-stone-200 p-3 min-h-[300px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-700">{col}</span>
            <span className="text-[10px] text-stone-400">{[4, 98, 6816, 19610, 2, 8800][i]}</span>
          </div>
          {[...Array(3)].map((_, j) => (
            <div key={j} className="bg-stone-50 rounded p-2 mb-2 border border-stone-100">
              <div className="h-2 bg-stone-200 rounded w-3/4 mb-1.5" />
              <div className="h-1.5 bg-stone-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ))}
    </div>

    <div className="text-center text-xs text-stone-400 py-4">
      Vista simulada de Odoo. El widget de Seguimientos se inyecta como modal sobre esta capa.
    </div>
  </div>
);

// --- DASHBOARD VIEW -----------------------------------------------------

const DashboardView = ({ leads, onSelectLead, activeFilter, setActiveFilter, searchQuery, setSearchQuery }) => {
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (activeFilter === 'a-retomar') {
      result = result.filter(l => l.interactionCount < 3 && l.temperature !== 'pausa');
    } else if (activeFilter === 'caliente') {
      result = result.filter(l => l.temperature === 'caliente');
    } else if (activeFilter === 'sin-respuesta') {
      result = result.filter(l => l.daysWithoutTouch >= 7);
    } else if (activeFilter === 'urgente') {
      result = result.filter(l => l.urgent);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.context.toLowerCase().includes(q) ||
        l.temperatureReason.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, activeFilter, searchQuery]);

  const retomarLeads = leads.filter(l => l.interactionCount < 3 && l.temperature !== 'pausa');

  const filters = [
    { id: 'todos', label: 'Todos', count: leads.length },
    { id: 'a-retomar', label: 'A retomar', count: retomarLeads.length, highlight: true },
    { id: 'caliente', label: 'Calientes', count: leads.filter(l => l.temperature === 'caliente').length },
    { id: 'sin-respuesta', label: 'Sin respuesta 7+ días', count: leads.filter(l => l.daysWithoutTouch >= 7).length },
    { id: 'urgente', label: 'Marcados urgentes', count: leads.filter(l => l.urgent).length },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-6 pt-6 pb-3 border-b border-stone-100">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Buscar en tus leads — p.ej. "familias con dudas de precio" o "alta hospitalaria"'
            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-md text-sm focus:outline-none focus:border-[#0E4A3A] focus:bg-white transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 inline-flex items-center gap-1">
            <Sparkles size={10} /> Búsqueda inteligente
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                activeFilter === f.id
                  ? 'bg-[#0E4A3A] text-white border-[#0E4A3A]'
                  : f.highlight
                    ? 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
              }`}
            >
              {f.label}
              <span className={`text-[10px] ${activeFilter === f.id ? 'opacity-80' : 'opacity-60'}`}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de leads */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeFilter === 'todos' && retomarLeads.length > 0 && !searchQuery && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-orange-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-900">A retomar — {retomarLeads.length} leads sin 3º contacto</h3>
            </div>
            <p className="text-xs text-stone-500 mb-3">Leads con menos de 3 interacciones que aún no están en pausa.</p>
          </div>
        )}

        <div className="bg-white border border-stone-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600">Familia</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600">Temperatura</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600">Por qué</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600">Sin tocar</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600">Interacc.</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-stone-600">Etapa</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLeads.map(lead => (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="hover:bg-stone-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {lead.urgent && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" title="Marcado urgente" />}
                      <div>
                        <div className="font-medium text-stone-900 leading-tight">{lead.name}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                          <span className="inline-flex items-center gap-0.5"><MapPin size={9} />{lead.location}</span>
                          <span>·</span>
                          <span>{lead.elderly}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TemperatureBadge temperature={lead.temperature} source={lead.temperatureSource} />
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-xs text-stone-600 leading-snug line-clamp-2">{lead.temperatureReason}</p>
                  </td>
                  <td className="px-4 py-3">
                    <DaysWithoutTouch days={lead.daysWithoutTouch} temperature={lead.temperature} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-stone-700">{lead.interactionCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">{lead.stage}</span>
                  </td>
                  <td className="px-2 py-3 text-stone-300">
                    <ChevronRight size={14} />
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-stone-500">
                    No hay leads que coincidan con este filtro o búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resumen abajo */}
        <div className="flex items-center justify-between mt-3 text-xs text-stone-500">
          <span>{filteredLeads.length} de {leads.length} leads</span>
          <span>Actualizado hace 2 min · sincronizado con Odoo</span>
        </div>
      </div>
    </div>
  );
};

// --- LEAD DETAIL VIEW (3 paneles) ---------------------------------------

const LeadDetailView = ({ leads, currentLead, onSelectLead, onBack, onMarkDone }) => {
  const [activePanel, setActivePanel] = useState('templates'); // templates | whatsapp | material | notes
  const [editingTemp, setEditingTemp] = useState(false);

  const messages = MOCK_WHATSAPP[currentLead.id] || [];
  const notes = MOCK_NOTES[currentLead.id] || [];

  return (
    <div className="flex h-full">
      {/* Panel izquierdo: lista navegable */}
      <div className="w-72 border-r border-stone-200 flex flex-col bg-stone-50/50">
        <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-2">
          <button onClick={onBack} className="p-1 hover:bg-stone-200 rounded">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">Tus leads</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {leads.map(lead => {
            const isActive = lead.id === currentLead.id;
            return (
              <button
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={`w-full text-left px-4 py-3 border-b border-stone-100 transition-colors ${
                  isActive ? 'bg-white border-l-2 border-l-[#0E4A3A]' : 'hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-stone-900 leading-tight">{lead.name}</span>
                  <TemperatureBadge temperature={lead.temperature} source={lead.temperatureSource} small />
                </div>
                <div className="text-[11px] text-stone-500 mt-1 line-clamp-1">{lead.temperatureReason}</div>
                <div className="text-[10px] text-stone-400 mt-1">{lead.lastInteraction}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel central: lead + timeline */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header del lead */}
        <div className="px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-display text-xl text-stone-900 leading-none">{currentLead.name}</h2>
                <span className="text-xs text-stone-400">{currentLead.id}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-600 mb-3">
                <span className="inline-flex items-center gap-1"><MapPin size={11} />{currentLead.location}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Phone size={11} />{currentLead.phone}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Users size={11} />{currentLead.elderly}</span>
              </div>
              <p className="text-xs text-stone-600 bg-stone-50 px-3 py-2 rounded border border-stone-100">{currentLead.context}</p>
            </div>
          </div>

          {/* Temperatura editable */}
          <div className="mt-3 flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Temperatura</span>
                {currentLead.temperatureSource === 'IA' && (
                  <span className="text-[10px] text-stone-400 inline-flex items-center gap-0.5">
                    <Sparkles size={9} /> Sugerida por IA
                  </span>
                )}
                <button
                  onClick={() => setEditingTemp(!editingTemp)}
                  className="text-[10px] text-stone-500 hover:text-stone-900 inline-flex items-center gap-0.5"
                >
                  <Edit2 size={9} /> {editingTemp ? 'Cerrar' : 'Cambiar'}
                </button>
              </div>
              {!editingTemp ? (
                <div className="flex items-center gap-2">
                  <TemperatureBadge temperature={currentLead.temperature} source={currentLead.temperatureSource} />
                  <span className="text-xs text-stone-600">— {currentLead.temperatureReason}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(TEMP_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${
                        currentLead.temperature === key
                          ? cfg.color + ' ring-2 ring-offset-1 ring-stone-300'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <cfg.icon size={11} />
                      {cfg.label}
                    </button>
                  ))}
                  <button className="text-[10px] text-stone-500 ml-2">Editar motivo</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-stone-50/30">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={14} className="text-stone-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">Conversación WhatsApp</span>
            <span className="text-[10px] text-stone-400">(read-only)</span>
          </div>

          {messages.length === 0 ? (
            <div className="text-xs text-stone-400 italic">Sin mensajes de WhatsApp.</div>
          ) : (
            <div className="space-y-2.5">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'af' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md px-3 py-2 rounded-lg ${
                    m.from === 'af' ? 'bg-[#DCF8C6] text-stone-800' : 'bg-white text-stone-800 border border-stone-200'
                  }`}>
                    <p className="text-sm leading-snug">{m.text}</p>
                    <p className="text-[10px] text-stone-500 mt-1 text-right">{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {notes.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-stone-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">Notas internas</span>
              </div>
              <div className="space-y-2">
                {notes.map((n, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-100 rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-stone-700">{n.author}</span>
                      <span className="text-[10px] text-stone-500">{n.date}</span>
                    </div>
                    <p className="text-xs text-stone-700">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="px-6 py-3 border-t border-stone-200 bg-white flex items-center justify-between">
          <div className="text-xs text-stone-500">
            <span className="font-medium text-stone-700">{currentLead.interactionCount}</span> interacciones · última: {currentLead.lastInteraction}
          </div>
          <button
            onClick={onMarkDone}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0E4A3A] hover:bg-[#0a3a2d] text-white rounded-md text-sm font-medium transition-colors"
          >
            <Check size={14} />
            Marcar seguimiento como hecho
          </button>
        </div>
      </div>

      {/* Panel derecho: acciones */}
      <div className="w-80 border-l border-stone-200 flex flex-col bg-white">
        {/* Tabs */}
        <div className="border-b border-stone-200 flex">
          {[
            { id: 'templates', icon: FileText, label: 'Plantillas' },
            { id: 'material', icon: BookOpen, label: 'Material' },
            { id: 'notes', icon: Edit2, label: 'Notas' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`flex-1 px-3 py-3 text-xs font-medium border-b-2 transition-colors inline-flex items-center justify-center gap-1.5 ${
                activePanel === tab.id
                  ? 'border-[#0E4A3A] text-[#0E4A3A]'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activePanel === 'templates' && (
            <div className="space-y-2">
              <p className="text-[11px] text-stone-500 mb-3">Tus plantillas. Copia y pega en WhatsApp adaptándolas.</p>
              {MOCK_TEMPLATES.map(t => (
                <div key={t.id} className="border border-stone-200 rounded-md p-3 hover:border-stone-400 cursor-pointer transition-colors">
                  <div className="text-xs font-semibold text-stone-800 mb-1">{t.name}</div>
                  <p className="text-[11px] text-stone-600 leading-snug line-clamp-3">{t.preview}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <button className="text-[10px] text-[#0E4A3A] font-medium">Copiar</button>
                    <button className="text-[10px] text-stone-500">Editar</button>
                  </div>
                </div>
              ))}
              <button className="w-full text-xs text-stone-500 hover:text-stone-900 py-2 border border-dashed border-stone-300 rounded-md">
                + Nueva plantilla
              </button>
            </div>
          )}

          {activePanel === 'material' && (
            <div className="space-y-3">
              <p className="text-[11px] text-stone-500">Material de marketing sugerido para este caso.</p>
              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                <Sparkles size={9} /> Sugerencias IA basadas en el contexto del lead
              </div>
              {MOCK_MATERIAL.map(m => (
                <div key={m.id} className="border border-stone-200 rounded-md p-3 hover:border-stone-400 cursor-pointer">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-xs font-semibold text-stone-800 flex-1">{m.title}</div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">{m.match}</span>
                  </div>
                  <span className="text-[10px] text-stone-500 inline-block bg-stone-100 px-1.5 py-0.5 rounded mt-1">{m.tag}</span>
                </div>
              ))}
              <button className="w-full text-xs text-stone-600 hover:text-stone-900 py-2 border border-stone-200 rounded-md">
                Ver toda la biblioteca →
              </button>
            </div>
          )}

          {activePanel === 'notes' && (
            <div className="space-y-3">
              <textarea
                placeholder="Añade una nota interna sobre este lead..."
                className="w-full text-xs p-3 border border-stone-200 rounded-md min-h-[80px] focus:outline-none focus:border-[#0E4A3A]"
              />
              <button className="w-full text-xs bg-stone-100 hover:bg-stone-200 py-2 rounded-md font-medium text-stone-700">
                Guardar nota
              </button>
              <div className="pt-2 border-t border-stone-100 space-y-2">
                {notes.length === 0 ? (
                  <p className="text-[11px] text-stone-400 italic">Aún no hay notas guardadas.</p>
                ) : (
                  notes.map((n, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-100 rounded p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-stone-700">{n.author}</span>
                        <span className="text-[10px] text-stone-500">{n.date}</span>
                      </div>
                      <p className="text-[11px] text-stone-700">{n.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- NEXT FOLLOWUP MODAL ------------------------------------------------

const NextFollowupModal = ({ lead, onClose }) => {
  const options = [
    { label: 'Mañana', detail: 'Vuelvo a verlo en mi cola mañana' },
    { label: 'En 3 días', detail: 'Para no presionar pero no perder el hilo' },
    { label: 'En 1 semana', detail: 'Dejar reposar y reactivar' },
    { label: 'Custom', detail: 'Elegir fecha específica' },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-stone-900/40 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-display text-lg text-stone-900">Seguimiento marcado como hecho</h3>
          <p className="text-xs text-stone-600 mt-1">¿Cuándo querés volver a ver a <span className="font-medium">{lead.name}</span> en tu cola?</p>
        </div>
        <div className="p-3 space-y-1.5">
          {options.map(opt => (
            <button
              key={opt.label}
              onClick={onClose}
              className="w-full text-left px-3 py-2.5 rounded-md hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors"
            >
              <div className="text-sm font-medium text-stone-800">{opt.label}</div>
              <div className="text-[11px] text-stone-500">{opt.detail}</div>
            </button>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-stone-100 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs text-stone-500 hover:text-stone-900 px-2 py-1">
            Saltar
          </button>
        </div>
      </div>
    </div>
  );
};

// --- WIDGET MODAL (container) -------------------------------------------

const WidgetModal = ({ onClose }) => {
  const [view, setView] = useState('dashboard'); // dashboard | detail
  const [currentLead, setCurrentLead] = useState(null);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFollowupModal, setShowFollowupModal] = useState(false);

  const handleSelectLead = (lead) => {
    setCurrentLead(lead);
    setView('detail');
  };

  const handleBack = () => {
    setView('dashboard');
    setCurrentLead(null);
  };

  const handleMarkDone = () => {
    setShowFollowupModal(true);
  };

  const handleFollowupClose = () => {
    setShowFollowupModal(false);
    handleBack();
  };

  // Lista filtrada para mostrar en el panel izquierdo del detalle
  const filteredForNav = useMemo(() => {
    if (activeFilter === 'a-retomar') return MOCK_LEADS.filter(l => l.interactionCount < 3 && l.temperature !== 'pausa');
    if (activeFilter === 'caliente') return MOCK_LEADS.filter(l => l.temperature === 'caliente');
    if (activeFilter === 'sin-respuesta') return MOCK_LEADS.filter(l => l.daysWithoutTouch >= 7);
    if (activeFilter === 'urgente') return MOCK_LEADS.filter(l => l.urgent);
    return MOCK_LEADS;
  }, [activeFilter]);

  return (
    <div className="fixed inset-0 z-40 bg-stone-900/60 flex items-center justify-center p-4 md:p-8" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl w-full h-full max-w-[1400px] max-h-[90vh] flex flex-col overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="px-6 py-3 border-b border-stone-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[#0E4A3A] text-white flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <div>
              <h2 className="font-display text-base text-stone-900 leading-none">Seguimientos</h2>
              <p className="text-[11px] text-stone-500 mt-0.5">Tu workspace operativo, sobre Odoo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400 hidden md:inline">Esc para cerrar</span>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-stone-100 rounded-md transition-colors"
            >
              <X size={18} className="text-stone-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden">
          {view === 'dashboard' ? (
            <DashboardView
              leads={MOCK_LEADS}
              onSelectLead={handleSelectLead}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          ) : (
            <LeadDetailView
              leads={filteredForNav}
              currentLead={currentLead}
              onSelectLead={handleSelectLead}
              onBack={handleBack}
              onMarkDone={handleMarkDone}
            />
          )}
        </div>

        {/* Next followup modal */}
        {showFollowupModal && currentLead && (
          <NextFollowupModal lead={currentLead} onClose={handleFollowupClose} />
        )}
      </div>
    </div>
  );
};

// --- ROOT ---------------------------------------------------------------

export default function SeguimientosPrototype() {
  const [widgetOpen, setWidgetOpen] = useState(false);

  // Listener para tecla Esc
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setWidgetOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <style>{FONTS}</style>
      <div className="font-body text-stone-900">
        <OdooBackground onOpenWidget={() => setWidgetOpen(true)} />
        {widgetOpen && <WidgetModal onClose={() => setWidgetOpen(false)} />}
      </div>
    </>
  );
}
