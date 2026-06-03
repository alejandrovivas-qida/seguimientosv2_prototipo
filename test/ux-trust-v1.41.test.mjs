/**
 * Harness Node para los 3 fixes UX de confianza visual (v1.41.0). Sin test runner (el repo es
 * vanilla ES5 sin pipeline): extrae las funciones/vars PURAS del source real de qida-widget.v1.js
 * por matching de llaves balanceadas y las evalúa en aislamiento (mismo patrón que
 * agent-builder-save.test.mjs). Así el test corre contra el código que se publica, no contra una
 * copia.
 *
 *   node test/ux-trust-v1.41.test.mjs
 *
 * Cubre los asserts pedidos en la tarea:
 *   FIX 1 (loading): el render reacciona al flag _loading (skeleton/spinner, nunca vacío) y el
 *                    flag se activa al empezar el fetch y se desactiva en success/error.
 *   FIX 2 (campos):  LEAD_FIELDS incluye city/cohabitants_number/prescriber_id; mapLead expone
 *                    location/livesAlone/prescriptor; mapCared mapea name->relationship;
 *                    renderCare muestra los dicts traducidos.
 *   FIX 3 (badge):   leadHasPendingActivity + el badge "Pendiente" se renderiza en la columna Estado.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(__dirname, '..', 'qida-widget.v1.js'), 'utf8');

// --- Extractores: aíslan un símbolo del source por matching de llaves balanceadas. ---
function extractFn(src, name) {
    const start = src.indexOf('function ' + name + '(');
    assert.notEqual(start, -1, 'no se encontró function ' + name);
    let i = src.indexOf('{', start);
    let depth = 0;
    for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
    }
    return src.slice(start, i);
}
function extractVar(src, name) {
    const re = new RegExp('var\\s+' + name + '\\s*=.*?;', 's');
    const m = src.match(re);
    assert.ok(m, 'no se encontró var ' + name);
    return m[0];
}
// Extrae el cuerpo de un método de objeto (`name: function (...) { ... }`) por matching de llaves.
function extractMethod(src, name) {
    const start = src.indexOf(name + ': function');
    assert.notEqual(start, -1, 'no se encontró método ' + name);
    let i = src.indexOf('{', start);
    let depth = 0;
    for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
    }
    return src.slice(start, i);
}

// Reconstruye un módulo con SOLO las piezas puras a testear. `icon`/`useRealApi`/`state` se
// estuban (su SVG/flag/scope no afecta los asserts; lo que se valida vive en las funciones reales).
const mod = new Function(
    // --- stubs mínimos ---
    'function icon(name, size){ return "<svg data-icon=\\"" + (name || "") + "\\"></svg>"; }\n' +
    'function useRealApi(){ return false; }\n' +
    'var state = { detailLayoutSwapped: false };\n' +
    // --- helpers puros del source real ---
    extractFn(SRC, 'esc') + '\n' +
    extractFn(SRC, 'tName') + '\n' +
    extractFn(SRC, 'normalizeUrgency') + '\n' +
    extractFn(SRC, 'infoCard') + '\n' +
    extractFn(SRC, 'renderSkeletonLines') + '\n' +
    // --- vars/dicts del source real ---
    extractVar(SRC, 'LEAD_FIELDS') + '\n' +
    extractVar(SRC, 'COHABITANTS_LIVES_ALONE') + '\n' +
    extractVar(SRC, 'MAIN_CONDITION_LABELS') + '\n' +
    extractVar(SRC, 'URGENCY_LABELS') + '\n' +
    extractVar(SRC, 'GENDER_LABELS') + '\n' +
    extractVar(SRC, 'MOCK_CARE_CONTEXT') + '\n' +
    extractVar(SRC, 'MOCK_PLANNED_ACTIVITIES') + '\n' +
    // --- funciones bajo test del source real ---
    extractFn(SRC, 'deriveLivesAlone') + '\n' +
    extractFn(SRC, 'mapLead') + '\n' +
    extractFn(SRC, 'mapCared') + '\n' +
    extractFn(SRC, 'leadHasPendingActivity') + '\n' +
    extractFn(SRC, 'renderEstadoCell') + '\n' +
    extractFn(SRC, 'renderCare') + '\n' +
    extractFn(SRC, 'renderDetailLoading') + '\n' +
    extractFn(SRC, 'renderIaSummary') + '\n' +
    'return { LEAD_FIELDS, COHABITANTS_LIVES_ALONE, deriveLivesAlone, mapLead, mapCared,' +
    ' leadHasPendingActivity, renderEstadoCell, renderCare, renderDetailLoading, renderIaSummary };'
)();

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { console.error('  ✗ ' + name + '\n    ' + (e && e.message)); process.exitCode = 1; }
}

// =====================================================================================
console.log('FIX 2 — Contexto del cuidado: 4 campos vacíos');
// =====================================================================================

test('LEAD_FIELDS incluye los 3 campos nuevos (city, cohabitants_number, prescriber_id)', () => {
    for (const f of ['city', 'cohabitants_number', 'prescriber_id']) {
        assert.ok(mod.LEAD_FIELDS.includes(f), 'LEAD_FIELDS no incluye ' + f);
    }
    // sanity: no se perdió ninguno de los que ya estaban
    assert.ok(mod.LEAD_FIELDS.includes('ai_description'));
    assert.ok(mod.LEAD_FIELDS.includes('gender'));
});

test('COHABITANTS_LIVES_ALONE traduce el enum a vive-solo (Sí/No)', () => {
    assert.equal(mod.COHABITANTS_LIVES_ALONE.without_cohabitants, true);
    assert.equal(mod.COHABITANTS_LIVES_ALONE['1'], false);
    assert.equal(mod.COHABITANTS_LIVES_ALONE['2-3'], false);
    assert.equal(mod.COHABITANTS_LIVES_ALONE['4+'], false);
});

test('deriveLivesAlone: enum conocido -> bool; vacío/desconocido -> null (nunca rompe)', () => {
    assert.equal(mod.deriveLivesAlone('without_cohabitants'), true);
    assert.equal(mod.deriveLivesAlone('2-3'), false);
    assert.equal(mod.deriveLivesAlone(''), null);
    assert.equal(mod.deriveLivesAlone(null), null);
    assert.equal(mod.deriveLivesAlone(undefined), null);
    assert.equal(mod.deriveLivesAlone('valor_raro_no_mapeado'), null);
});

test('mapLead expone location (city), prescriptor (prescriber_id) y livesAlone (cohabitants_number)', () => {
    const lead = mod.mapLead({
        id: 42, name: 'Familia X', city: 'Madrid',
        cohabitants_number: 'without_cohabitants',
        prescriber_id: [7, 'Hospital La Paz']
    });
    assert.equal(lead.location, 'Madrid');
    assert.equal(lead.prescriptor, 'Hospital La Paz');
    assert.equal(lead.livesAlone, true);
});

test('mapLead: sin los campos -> defaults seguros ("" / null), no rompe', () => {
    const lead = mod.mapLead({ id: 43, name: 'Familia Y', cohabitants_number: '2-3' });
    assert.equal(lead.location, '');
    assert.equal(lead.prescriptor, '');
    assert.equal(lead.livesAlone, false);
    const bare = mod.mapLead({ id: 44 });
    assert.equal(bare.livesAlone, null);   // sin cohabitants_number -> "-"
    assert.equal(bare.location, '');
    assert.equal(bare.prescriptor, '');
});

test('mapCared mapea cared_person.name -> relationship ("Relación" texto libre)', () => {
    assert.equal(mod.mapCared({ name: 'madre' }).relationship, 'madre');
    assert.equal(mod.mapCared({ name: '' }).relationship, null);
    assert.equal(mod.mapCared(null), null);
});

test('renderCare muestra los dicts traducidos (condición/urgencia/género) y los campos del lead', () => {
    const lead = mod.mapLead({
        id: 9001, name: 'Familia Z', city: 'Barcelona', gender: 'female',
        urgency: 'very_urgent', cohabitants_number: 'without_cohabitants',
        prescriber_id: [3, 'ESSIP']
    });
    const cared = mod.mapCared({ name: 'Madre de Ana', main_need: 'dependent_person' });
    const html = mod.renderCare(lead, { _loading: false, caredPerson: cared, _errors: [null] }, 9001);
    assert.match(html, /Persona dependiente/);   // MAIN_CONDITION_LABELS[dependent_person]
    assert.match(html, /Muy urgente/);            // URGENCY_LABELS[very_urgent]
    assert.match(html, /Mujer/);                  // GENDER_LABELS[female]
    assert.match(html, /Barcelona/);              // lead.location (city)
    assert.match(html, /ESSIP/);                  // lead.prescriptor (prescriber_id)
    assert.match(html, /Madre de Ana/);           // cared.relationship (cared_person.name)
    // "Vive solo" = Sí (without_cohabitants); que el grid NO quede en "-" para este campo
    assert.match(html, /Vive solo<\/span><span class="qida-context-val">Si</);
});

// =====================================================================================
console.log('FIX 3 — Badge "Pendiente" visible');
// =====================================================================================

test('leadHasPendingActivity: true si el lead tiene 1+ actividad no completada (mock)', () => {
    assert.equal(mod.leadHasPendingActivity({ id: 'L122581' }), true);   // 2 pendientes en el mock
    assert.equal(mod.leadHasPendingActivity({ id: 'L999999' }), false);  // sin actividades
    assert.equal(mod.leadHasPendingActivity(null), false);
});

test('leadHasPendingActivity: respeta el campo explícito del backend (futuro)', () => {
    assert.equal(mod.leadHasPendingActivity({ id: 'L999999', hasPendingActivity: true }), true);
    assert.equal(mod.leadHasPendingActivity({ id: 'L122581', hasPendingActivity: false }), false);
    assert.equal(mod.leadHasPendingActivity({ id: 'L999999', pendingActivitiesCount: 2 }), true);
    assert.equal(mod.leadHasPendingActivity({ id: 'L122581', pendingActivitiesCount: 0 }), false);
});

test('renderEstadoCell renderiza el badge "Pendiente" cuando hay actividad pendiente', () => {
    const html = mod.renderEstadoCell({ id: 'L122581', urgency: 'baja', hasNewMessage: false });
    assert.match(html, /qida-dash-badge-pending/);
    assert.match(html, /Pendiente/);
    assert.match(html, /data-icon="clock"/);   // ícono reloj, no un punto diminuto
});

test('renderEstadoCell NO renderiza "Pendiente" si el lead no tiene actividad pendiente', () => {
    const html = mod.renderEstadoCell({ id: 'L999999', urgency: 'baja', hasNewMessage: false });
    assert.equal(/qida-dash-badge-pending/.test(html), false);
});

test('el badge "Pendiente" coexiste con "Mensaje nuevo" y "Urgente" (apilados)', () => {
    const html = mod.renderEstadoCell({ id: 'L122581', urgency: 'Muy urgente', hasNewMessage: true, unreadMessagesCount: 3 });
    assert.match(html, /qida-dash-badge-new/);
    assert.match(html, /qida-dash-badge-urgent/);
    assert.match(html, /qida-dash-badge-pending/);
});

// =====================================================================================
console.log('FIX 1 — Loading state (spinner/skeleton, nunca vacío)');
// =====================================================================================

test('renderCare: _loading=true -> skeleton (no el grid de datos)', () => {
    const html = mod.renderCare({}, { _loading: true }, 1);
    assert.match(html, /qida-skeleton-line/);
    assert.equal(/qida-context-grid/.test(html), false);
});

test('renderCare: _loading=false -> grid de datos (no skeleton)', () => {
    const lead = mod.mapLead({ id: 1, city: 'Madrid' });
    const html = mod.renderCare(lead, { _loading: false, caredPerson: mod.mapCared({ name: 'x' }), _errors: [null] }, 7777);
    assert.match(html, /qida-context-grid/);
    assert.equal(/qida-skeleton-line/.test(html), false);
});

test('renderIaSummary: _loading=true -> skeleton (no queda en blanco)', () => {
    const html = mod.renderIaSummary({}, 1, { _loading: true });
    assert.match(html, /qida-skeleton-line/);
});

test('renderDetailLoading: spinner ANIMADO + skeleton + 3 paneles (nunca rebota a vacío)', () => {
    const html = mod.renderDetailLoading();
    assert.match(html, /qida-spinner/);          // spinner animado (no icono estático)
    assert.match(html, /qida-skeleton-line/);
    assert.match(html, /qida-detail-body/);
    assert.match(html, /Cargando/);
});

// --- Asserts a nivel source: el flag se activa al empezar el fetch y se desactiva al terminar ---
test('LeadDetailService.fetchAll activa _loading:true al empezar y _loading:false al terminar', () => {
    const fetchAll = extractMethod(SRC, 'fetchAll');
    assert.match(fetchAll, /_loading:\s*true/, 'fetchAll debe activar el loading');
    assert.match(fetchAll, /_loading:\s*false/, 'fetchAll debe desactivar el loading al success');
});

test('loadConversation: _loading true al iniciar, false en success Y en error (.catch)', () => {
    const loadConv = extractFn(SRC, 'loadConversation');
    // 1 activación + 2 desactivaciones (success + catch)
    assert.match(loadConv, /_loading:\s*true/);
    const offs = loadConv.match(/_loading:\s*false/g) || [];
    assert.ok(offs.length >= 2, 'loadConversation debe poner _loading:false en success y en error (encontradas: ' + offs.length + ')');
});

test('renderWhatsAppPane: el loading de la conversación usa el spinner animado (no icono estático)', () => {
    const pane = extractFn(SRC, 'renderWhatsAppPane');
    // La rama _loading debe contener el spinner; ya no el viejo icon("refresh-cw") estático.
    const loadingBranch = pane.slice(pane.indexOf('conv._loading'));
    const firstBit = loadingBranch.slice(0, 400);
    assert.match(firstBit, /qida-spinner/, 'la rama de loading debe usar .qida-spinner');
});

// =====================================================================================
console.log('\n' + passed + ' passed' + (process.exitCode ? ', con fallos' : ''));
