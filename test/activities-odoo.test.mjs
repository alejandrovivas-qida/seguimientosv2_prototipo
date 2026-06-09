/**
 * Harness Node para el tab Actividades v1.47.0 (Odoo directo + rediseño tabla). Sin test runner:
 * extrae las funciones PURAS del source real de qida-widget.v1.js por matching de llaves y las
 * evalúa en aislamiento, para correr contra el código que se publica (no contra una copia).
 *
 *   node test/activities-odoo.test.mjs
 *
 * Cubre:
 *   1) mapOdooActivity: normaliza false->'', preserva note HTML crudo, desarma tuplas Odoo, res_id->leadId.
 *   2) parseLeadName: "L##### Familia (...)" -> { ref, name }, y el caso sin prefijo.
 *   3) stripHtml: HTML -> texto plano (en node cae al fallback regex; determinista).
 *   4) buildActivitiesFeed: atrasadas SIEMPRE arriba (asc), resto hoy<próxima (asc); chips + buscador.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(__dirname, '..', 'qida-widget.v1.js'), 'utf8');

// --- Extractor: aísla un símbolo del source por matching de llaves balanceadas. ---
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
// v1.49.6: extractor para `var <NAME> = ...;` (idéntico al de today-feed.test.mjs).
function extractVar(src, name) {
    const re = new RegExp('var\\s+' + name + '\\s*=\\s*[^;]+;');
    const m = src.match(re);
    assert.ok(m, 'no se encontró var ' + name);
    return m[0];
}

// Reconstruye un módulo con solo las piezas puras + un `state` controlado por el test.
//   `var document = undefined` fuerza a stripHtml al fallback regex (en node no hay DOM) -> determinista.
const mod = new Function(
    'var document = undefined;' + '\n' +
    'var state = { dashSearchQuery: "", dashDateRange: "all", leadById: null };' + '\n' +
    // v1.49.6: buildActivitiesFeed sortea con byCallFirstThenDeadline (que lee isCallActivity +
    //   las keywords). Extracción del helper y la constante para no romper el harness.
    extractVar(SRC, 'CALL_TYPE_KEYWORDS') + '\n' +
    extractFn(SRC, 'daysBetween') + '\n' +
    extractFn(SRC, 'activityStateFromDeadline') + '\n' +
    extractFn(SRC, 'tName') + '\n' +
    extractFn(SRC, 'tId') + '\n' +
    extractFn(SRC, 'toNumericLeadId') + '\n' +
    extractFn(SRC, 'stripHtml') + '\n' +
    extractFn(SRC, 'mapOdooActivity') + '\n' +
    extractFn(SRC, 'parseLeadName') + '\n' +
    extractFn(SRC, 'leadDataForActivity') + '\n' +
    extractFn(SRC, 'activityMatchesSearch') + '\n' +
    extractFn(SRC, 'isOverdueActivity') + '\n' +
    extractFn(SRC, 'activityStateRank') + '\n' +
    extractFn(SRC, 'byDeadlineAsc') + '\n' +
    extractFn(SRC, 'isCallActivity') + '\n' +
    extractFn(SRC, 'byCallFirstThenDeadline') + '\n' +
    extractFn(SRC, 'activityInRange') + '\n' +
    extractFn(SRC, 'buildActivitiesFeed') + '\n' +
    'return { state: state, mapOdooActivity, parseLeadName, stripHtml, buildActivitiesFeed, isCallActivity };'
)();

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { console.error('  ✗ ' + name + '\n    ' + (e && e.message)); process.exitCode = 1; }
}

console.log('activities-odoo (v1.47.0)');

// === 1) mapOdooActivity ===
test('mapOdooActivity: false->"" , note HTML CRUDO, tuplas, res_id->leadId', () => {
    const rec = {
        id: 9101, res_id: 122581, res_name: 'L122581 Martinez Ruiz (jueves 13,30)',
        activity_type_id: [3, 'Llamada'], summary: false, note: '<p>x</p>',
        date_deadline: '2026-06-02', state: 'overdue', user_id: [557, 'Ana Pinilla'],
        create_date: '2026-05-28 09:12:00'
    };
    const m = mod.mapOdooActivity(rec);
    assert.equal(m.id, 9101);
    assert.equal(m.leadId, 122581);                 // res_id (numérico) -> "Ir al lead" + cruce
    assert.equal(m.leadName, 'L122581 Martinez Ruiz (jueves 13,30)');
    assert.equal(m.typeLabel, 'Llamada');           // tupla [id, label] -> label
    assert.equal(m.summary, '');                     // Odoo manda false en char vacío
    assert.equal(m.note, '<p>x</p>');                // CRUDO: el strip ocurre al render, no acá
    assert.equal(m.deadlineDate, '2026-06-02');
    assert.equal(m.state, 'overdue');
    assert.equal(m.assigneeId, 557);
    assert.equal(m.assigneeName, 'Ana Pinilla');
});

test('mapOdooActivity: state ausente -> derivado del deadline; tuplas false -> vacío', () => {
    const m = mod.mapOdooActivity({ id: 1, res_id: 5, res_name: false, activity_type_id: false, user_id: false, summary: 'x', note: false, date_deadline: false });
    assert.equal(m.leadName, '');
    assert.equal(m.typeLabel, '');
    assert.equal(m.assigneeId, null);
    assert.equal(m.note, '');
    assert.equal(m.deadlineDate, null);
    assert.equal(m.state, 'planned');               // activityStateFromDeadline(null) -> 'planned'
});

// === 2) parseLeadName ===
test('parseLeadName: separa ref L##### del resto', () => {
    assert.deepEqual(mod.parseLeadName('L125118 Mariona (jueves 13,30)'), { ref: 'L125118', name: 'Mariona (jueves 13,30)' });
});
test('parseLeadName: sin prefijo L##### -> ref vacío, name completo; null -> vacíos', () => {
    assert.deepEqual(mod.parseLeadName('Solo nombre'), { ref: '', name: 'Solo nombre' });
    assert.deepEqual(mod.parseLeadName(null), { ref: '', name: '' });
    assert.deepEqual(mod.parseLeadName(false), { ref: '', name: '' });
});

// === 3) stripHtml ===
test('stripHtml: tags fuera, colapsa espacios; vacío y texto plano', () => {
    assert.equal(mod.stripHtml('<p>Prefiere por la tarde, despues de las 17h</p>'), 'Prefiere por la tarde, despues de las 17h');
    assert.equal(mod.stripHtml('<div>uno</div>  <div>dos</div>'), 'uno dos');
    assert.equal(mod.stripHtml(''), '');
    assert.equal(mod.stripHtml('plano'), 'plano');
});

// === 4) buildActivitiesFeed ===
// Fechas futuras en hoy/próxima -> daysBetween>0 (NO overdue) sin importar la fecha real -> determinista.
function feedFixture() {
    return [
        { leadId: 1, leadName: 'L1 Alfa',  state: 'planned', deadlineDate: '2099-01-10' },
        { leadId: 2, leadName: 'L2 Bravo',  state: 'overdue', deadlineDate: '2020-01-05' },
        { leadId: 3, leadName: 'L3 Carlo',  state: 'today',   deadlineDate: '2099-01-02' },
        { leadId: 4, leadName: 'L4 Delta',  state: 'overdue', deadlineDate: '2020-01-03' }
    ];
}
function ids(rows) { return rows.map(function (r) { return r.leadId; }); }

test('buildActivitiesFeed: atrasadas arriba (asc), luego hoy<próxima (asc)', () => {
    mod.state.dashSearchQuery = ''; mod.state.dashDateRange = 'all'; mod.state.leadById = null;
    const out = mod.buildActivitiesFeed(feedFixture());
    // overdue por deadline asc: Delta(2020-01-03) antes que Bravo(2020-01-05); luego today(Carlo), planned(Alfa).
    assert.deepEqual(ids(out), [4, 2, 3, 1]);
});

test('buildActivitiesFeed: chip "today" filtra SOLO el resto; las atrasadas siguen arriba', () => {
    mod.state.dashSearchQuery = ''; mod.state.dashDateRange = 'today'; mod.state.leadById = null;
    const out = mod.buildActivitiesFeed(feedFixture());
    // Ninguna no-atrasada cae en "hoy" (fechas 2099) -> solo quedan las 2 atrasadas (asc).
    assert.deepEqual(ids(out), [4, 2]);
    mod.state.dashDateRange = 'all';
});

test('buildActivitiesFeed: buscador por nombre de familia (case-insensitive, contains)', () => {
    mod.state.dashSearchQuery = 'bravo'; mod.state.dashDateRange = 'all'; mod.state.leadById = null;
    const out = mod.buildActivitiesFeed(feedFixture());
    assert.deepEqual(ids(out), [2]);
    mod.state.dashSearchQuery = '';
});

test('buildActivitiesFeed: buscador por ref L##### parseada de res_name', () => {
    mod.state.dashSearchQuery = 'l3'; mod.state.dashDateRange = 'all'; mod.state.leadById = null;
    const out = mod.buildActivitiesFeed(feedFixture());
    assert.deepEqual(ids(out), [3]);
    mod.state.dashSearchQuery = '';
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', con fallos' : ''));
