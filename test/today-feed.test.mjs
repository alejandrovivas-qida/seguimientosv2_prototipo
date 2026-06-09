/**
 * AI-860 — Harness Node para el feed del tab "Hoy".
 * Verifica: (1) merge + tag _kind sin mutar los originales; (2) el dedupe AI-861 (v1.49.2):
 * la Sugerencia de un lead con actividad en ventana se suprime, su Actividad queda; (3) el filtro
 * de actividades (solo hoy + atrasadas activas, NO futuras); (4) el sort jerárquico (v1.49.10):
 * actividades atrasadas -> actividades de hoy -> sugerencias. Mismo patrón que test/dashboard-feed.test.mjs.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(__dirname, '..', 'qida-widget.v1.js'), 'utf8');

function extractFn(src, name) {
    const start = src.indexOf('function ' + name + '(');
    assert.notEqual(start, -1, 'no se encontro function ' + name);
    let i = src.indexOf('{', start);
    let depth = 0;
    for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
    }
    return src.slice(start, i);
}

// v1.49.2: las constantes de la ventana AI-861 son `var` (no funciones) -> extractor aparte
//   (mismo helper que test/dashboard-feed.test.mjs usa para MAX_VISIBLE).
function extractVar(src, name) {
    const re = new RegExp('var\\s+' + name + '\\s*=\\s*[^;]+;');
    const m = src.match(re);
    assert.ok(m, 'no se encontro var ' + name);
    return m[0];
}

const mod = new Function(
    'var state = { dashView: "today", dashSearchQuery: "" };' + '\n' +
    // v1.49.2: buildTodayRows reusa suppressSuggestionsWithActivity, que loguea auditoría y lee dos
    //   constantes de ventana -> stub de log + extracción de las constantes y de toNumericLeadId.
    'function log() {}' + '\n' +
    extractVar(SRC, 'SUGGESTION_ACTIVITY_LOOKBACK_DAYS') + '\n' +
    extractVar(SRC, 'SUGGESTION_ACTIVITY_LOOKAHEAD_DAYS') + '\n' +
    // v1.49.6: buildTodayFeed reusa isCallActivity (en el tie-break llamadas-primero); extraer
    //   la constante de keywords + la función para el harness.
    // v1.49.10: buildTodayFeed además reusa isOverdueActivity (Tier 2: atrasada antes que hoy).
    extractVar(SRC, 'CALL_TYPE_KEYWORDS') + '\n' +
    extractFn(SRC, 'pad2') + '\n' +
    extractFn(SRC, 'todayISO') + '\n' +
    extractFn(SRC, 'addDaysISO') + '\n' +
    extractFn(SRC, 'daysBetween') + '\n' +
    extractFn(SRC, 'toNumericLeadId') + '\n' +
    extractFn(SRC, 'suppressSuggestionsWithActivity') + '\n' +
    extractFn(SRC, 'todayTag') + '\n' +
    extractFn(SRC, 'buildTodayRows') + '\n' +
    extractFn(SRC, 'isTodayOrOverdueActivity') + '\n' +
    extractFn(SRC, 'todayEffectiveDeadline') + '\n' +
    extractFn(SRC, 'isCallActivity') + '\n' +
    extractFn(SRC, 'isOverdueActivity') + '\n' +
    extractFn(SRC, 'buildTodayFeed') + '\n' +
    'return { state, todayISO, addDaysISO, buildTodayRows, suppressSuggestionsWithActivity, isTodayOrOverdueActivity, todayEffectiveDeadline, isCallActivity, buildTodayFeed };'
)();

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  OK ' + name); }
    catch (e) { console.error('  FAIL ' + name + '\n    ' + (e && e.message)); process.exitCode = 1; }
}

const TODAY = mod.todayISO();

test('buildTodayRows taggea _kind y NO muta los objetos originales', () => {
    const sug = { id: 'L100' };
    const act = { id: 9, deadlineDate: TODAY };
    const out = mod.buildTodayRows([sug], [act]);
    assert.equal(out.length, 2);
    assert.equal(out[0]._kind, 'suggestion');
    assert.equal(out[1]._kind, 'activity');
    assert.equal(sug._kind, undefined, 'no debe mutar la sugerencia original');
    assert.equal(act._kind, undefined, 'no debe mutar la actividad original');
});

test('isTodayOrOverdueActivity: sin deadline / futura -> false; hoy / atrasada -> true', () => {
    assert.equal(mod.isTodayOrOverdueActivity({ id: 1 }), false);                                   // sin deadline
    assert.equal(mod.isTodayOrOverdueActivity({ deadlineDate: mod.addDaysISO(5), state: 'planned' }), false); // futura
    assert.equal(mod.isTodayOrOverdueActivity({ deadlineDate: TODAY, state: 'today' }), true);       // hoy
    assert.equal(mod.isTodayOrOverdueActivity({ deadlineDate: mod.addDaysISO(-2), state: 'overdue' }), true);  // atrasada
    assert.equal(mod.isTodayOrOverdueActivity({ deadlineDate: TODAY }), true);                       // hoy por fecha (sin state)
});

test('todayEffectiveDeadline: sugerencia -> hoy; actividad -> su deadlineDate', () => {
    assert.equal(mod.todayEffectiveDeadline({ _kind: 'suggestion' }), TODAY);
    assert.equal(mod.todayEffectiveDeadline({ _kind: 'activity', deadlineDate: mod.addDaysISO(-2) }), mod.addDaysISO(-2));
});

test('buildTodayFeed: excluye actividades futuras; actividades (atrasada -> hoy) antes que sugerencias', () => {
    const rows = mod.buildTodayRows(
        [{ id: 'LA' }, { id: 'LB' }],
        [
            { id: 1, deadlineDate: mod.addDaysISO(-2), state: 'overdue' },  // atrasada -> arriba del todo
            { id: 2, deadlineDate: TODAY, state: 'today' },                // hoy -> tras las atrasadas, antes de sugerencias
            { id: 3, deadlineDate: mod.addDaysISO(5), state: 'planned' }   // futura -> EXCLUIDA
        ]
    );
    const feed = mod.buildTodayFeed(rows);
    // v1.49.10: actividades atrasadas -> actividades de hoy -> sugerencias (todas al final).
    assert.deepEqual(feed.map((r) => r.id), [1, 2, 'LA', 'LB']);
});

test('buildTodayFeed: las sugerencias se muestran aunque no haya actividades', () => {
    const rows = mod.buildTodayRows([{ id: 'LA' }, { id: 'LB' }], []);
    assert.equal(mod.buildTodayFeed(rows).length, 2);
});

// v1.49.2 (AI-861): dedupe en el tab Hoy. La Sugerencia de un lead que YA tiene actividad pendiente
//   en ventana NO entra como tipo Sugerencia; la Actividad de ese lead sí queda (tipo Actividad).
test('buildTodayRows (AI-861): suprime la Sugerencia con actividad en ventana; conserva la Actividad', () => {
    const rows = mod.buildTodayRows(
        [{ id: 'L500' }, { id: 'L501' }],
        [{ id: 77, leadId: 500, deadlineDate: TODAY, state: 'today' }]  // actividad del lead 500, hoy
    );
    const suggestions = rows.filter((r) => r._kind === 'suggestion').map((r) => r.id);
    assert.deepEqual(suggestions, ['L501'], 'L500 debe suprimirse (ya tiene actividad); L501 se mantiene');
    const activities = rows.filter((r) => r._kind === 'activity');
    assert.equal(activities.length, 1, 'la actividad del lead 500 sigue presente');
    assert.equal(activities[0].leadId, 500);
});

test('buildTodayRows (AI-861): actividad fuera de ventana (futura > lookahead) NO suprime la Sugerencia', () => {
    const rows = mod.buildTodayRows(
        [{ id: 'L600' }],
        [{ id: 88, leadId: 600, deadlineDate: mod.addDaysISO(10), state: 'planned' }]  // fuera de [hoy-30, hoy+2]
    );
    const suggestions = rows.filter((r) => r._kind === 'suggestion').map((r) => r.id);
    assert.deepEqual(suggestions, ['L600'], 'actividad fuera de ventana no debe suprimir');
});

if (process.exitCode) process.exit(process.exitCode);
console.log('today-feed tests: ' + passed + ' OK');
