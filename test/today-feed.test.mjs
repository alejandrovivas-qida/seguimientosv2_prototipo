/**
 * AI-860 — Harness Node para el feed del tab "Hoy".
 * Verifica: (1) merge + tag _kind sin mutar los originales; (2) el filtro de actividades
 * (solo hoy + atrasadas activas, NO futuras); (3) el sort por fecha límite asc con empate ->
 * Sugerencia antes que Actividad. Mismo patrón que test/dashboard-feed.test.mjs.
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

const mod = new Function(
    'var state = { dashView: "today", dashSearchQuery: "" };' + '\n' +
    extractFn(SRC, 'pad2') + '\n' +
    extractFn(SRC, 'todayISO') + '\n' +
    extractFn(SRC, 'addDaysISO') + '\n' +
    extractFn(SRC, 'daysBetween') + '\n' +
    extractFn(SRC, 'todayTag') + '\n' +
    extractFn(SRC, 'buildTodayRows') + '\n' +
    extractFn(SRC, 'isTodayOrOverdueActivity') + '\n' +
    extractFn(SRC, 'todayEffectiveDeadline') + '\n' +
    extractFn(SRC, 'buildTodayFeed') + '\n' +
    'return { state, todayISO, addDaysISO, buildTodayRows, isTodayOrOverdueActivity, todayEffectiveDeadline, buildTodayFeed };'
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

test('buildTodayFeed: excluye actividades futuras; atrasada primero; empate -> sugerencia antes que actividad', () => {
    const rows = mod.buildTodayRows(
        [{ id: 'LA' }, { id: 'LB' }],
        [
            { id: 1, deadlineDate: mod.addDaysISO(-2), state: 'overdue' },  // atrasada -> arriba
            { id: 2, deadlineDate: TODAY, state: 'today' },                // hoy -> después de las sugerencias
            { id: 3, deadlineDate: mod.addDaysISO(5), state: 'planned' }   // futura -> EXCLUIDA
        ]
    );
    const feed = mod.buildTodayFeed(rows);
    assert.deepEqual(feed.map((r) => r.id), [1, 'LA', 'LB', 2]);
});

test('buildTodayFeed: las sugerencias se muestran aunque no haya actividades', () => {
    const rows = mod.buildTodayRows([{ id: 'LA' }, { id: 'LB' }], []);
    assert.equal(mod.buildTodayFeed(rows).length, 2);
});

if (process.exitCode) process.exit(process.exitCode);
console.log('today-feed tests: ' + passed + ' OK');
