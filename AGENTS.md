# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Qué es este repo

Prototipo del widget **Qida Assistant — Seguimientos V2**: una capa operativa para Asesoras Familiares (AFs) que se inyecta sobre Odoo (`erp.qida.es`). El widget se sirve desde Vercel Blob (CDN público) y se carga en la página objetivo desde un loader externo (GTM en prod, Tampermonkey en dev).

**Principio rector NO NEGOCIABLE** (declarado en el header de `qida-widget.v1.js`):

> El widget NO genera mensajes para el lead. Solo consolida contexto y agiliza el flujo operativo de la AF.

Cualquier feature que cruce esa línea (autoresponder, redacción IA del mensaje saliente, envío directo) está fuera de scope.

## Comandos

```powershell
npm run publish:widget   # publica qida-widget.v1.js a Vercel Blob una vez
npm run publish:watch    # publica y re-publica en cada save (debounce 300ms)
```

Requiere `BLOB_READ_WRITE_TOKEN` en `.env.local` (ver `.env.local.example`). No hay build, lint, ni test runner — el widget es vanilla ES5 sin pipeline. Test = abrir `index.html` o probar con Tampermonkey en Odoo real.

## Arquitectura

Cuatro piezas que se mueven juntas y deben quedar **sincronizadas**:

| Pieza | Rol |
| --- | --- |
| [qida-widget.v1.js](qida-widget.v1.js) | El widget. ES5, sin deps, un único IIFE. Expone `window.QidaAssistant` con `init/openModal/closeModal/showScreen/version`. ~2700 líneas. |
| [publish.mjs](publish.mjs) | Sube el archivo del widget al Blob (`access: public`, `allowOverwrite: true`, `cacheControlMaxAge: 60`). |
| [gtm-loader.html](gtm-loader.html) | Snippet Custom HTML para GTM. Inyecta `WIDGET_URL` y llama `QidaAssistant.init(WIDGET_CONFIG)` en `onload`. |
| [tempermonkey.js](tempermonkey.js) | Userscript con la misma lógica que el loader de GTM, scoped a `https://erp.qida.es/*`. Para iterar en Odoo real sin tocar GTM. |

**Sincronización crítica**: `WIDGET_URL` aparece duplicada en `gtm-loader.html` y `tempermonkey.js`. Si cambia (bump de versión), ambos archivos tienen que actualizarse a la vez — no hay nada que lo enforce.

**Versionado por filename, no por query string**: Vercel Blob cachea público ~1 mes por defecto. Para cambios incompatibles renombrar a `qida-widget.v2.js`, actualizar `FILE_PATH`/`BLOB_PATHNAME` en `publish.mjs` y `WIDGET_URL` en ambos loaders. Para iterar dentro de la misma versión, `publish:watch` aprovecha el `cacheControlMaxAge: 60` para refrescar rápido.

**Guard contra doble carga**: el loader setea `window.__QIDA_LOADER__` y el widget setea `window.__QIDA_ASSISTANT_LOADED__`. Si Tampermonkey y GTM coexisten en la misma página, el primero gana — útil saberlo si algo aparece "stale" en Odoo.

### Interna del widget (qida-widget.v1.js)

Todo vive en un solo IIFE `(function (window, document) { ... })(window, document)`. Estructura por bloques:

1. **MOCK_** *(líneas ~140–390)*: data de demo. `MOCK_LEADS` es el set base; `MOCK_WHATSAPP`, `MOCK_NOTES`, `MOCK_IA_SUMMARIES`, `MOCK_CARE_CONTEXT`, `MOCK_ATTACHMENTS`, `MOCK_PLANNED_ACTIVITIES`, `MOCK_FOLLOWERS`, `MOCK_DAILY_SUGGESTIONS`, `MOCK_SCHEDULED_ACTIVITIES`, `MOCK_CONVERSATION_MATCHES`, `MOCK_MATERIAL_SEARCHABLE` son mapas indexados por `leadId`. Las fechas mock asumen `hoy = 2026-05-15`.
2. **`state`** *(~líneas 400–445)*: objeto único mutable. Re-render = mutar `state` y llamar `render()`. No hay diffing — `innerHTML` completo.
3. **Service layer** *(~líneas 680–1015)*: `LeadService`, `ActivityService`, `SuggestionsService`, `CoverageService`, `SearchService`. Hoy leen de los mocks; son el punto de extensión natural cuando se conecte a Odoo. `buildUnifiedFeed(filters)` (línea 803) es el dedupe/sort/filter del feed unificado de la tabla principal — es la pieza más cargada de la lógica de negocio.
4. **Render** *(~líneas 1517–2340)*: funciones `render*` que devuelven strings de HTML. Dos vistas top-level: `renderDashboard` y `renderDetail` (las "3 paneles tipo Close/Attio"). El asistente tiene 3 estados: `closed` (pill) / `expanded` (input) / `results` (panel lateral 30%).
5. **Event handling** *(~línea 2427+)*: delegación desde el contenedor raíz, dispatch por `data-action` + `data-id`.

Cada bump de versión (`v1.3` → `v1.4` → `v1.5`) está documentado en el comment header con los cambios y los "defaults que tomé" (decisiones de UX que no estaban explícitas en el brief). **Cuando bumpees versión, mantené ese patrón** — es la única fuente de verdad sobre por qué algo está como está.

### Archivos sueltos no operativos

- [seguimientos_v2_prototype.jsx](seguimientos_v2_prototype.jsx) — prototipo React previo. **No se deploya, no se importa, no se buildea**. Queda como referencia de UI/research. No tocarlo a menos que se esté re-arquitecturando.
- `lead_data.json`, `lead_data_filterAF.json` — exports/snapshots de data. No están cableados a nada del widget actual.

## Flujo de deploy (manual, sin CI)

1. Editar `qida-widget.v1.js`, validar en `index.html` o con Tampermonkey en `erp.qida.es`.
2. Si el cambio rompe consumidores existentes, **bumpear el filename** (`v1.js` → `v2.js`) y actualizar `publish.mjs` + ambos loaders.
3. `npm run publish:widget` (o dejar `publish:watch` activo durante la sesión).
4. Si tocaste `gtm-loader.html`: pegar el contenido en el tag Custom HTML de GTM y republicar el container.
5. Si tocaste `tempermonkey.js`: pegar la versión nueva en el userscript del browser.

## Contexto open

La decisión arquitectónica GTM vs iframe está **pendiente** (per README) y se resuelve con el equipo de Odoo de Qida. Mientras tanto Tampermonkey reemplaza GTM para iteración local sobre Odoo real. Tener esto presente antes de proponer cambios estructurales en cómo se carga el widget.
