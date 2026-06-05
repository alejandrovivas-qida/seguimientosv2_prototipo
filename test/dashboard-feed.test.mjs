/**
 * Harness Node para buildDashFeed. Verifica que Sugerencias mantenga el tope
 * visual, pero Leads muestre todos los rows cargados y filtrados.
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

function extractVar(src, name) {
    const re = new RegExp('var\\s+' + name + '\\s*=\\s*[^;]+;');
    const m = src.match(re);
    assert.ok(m, 'no se encontro var ' + name);
    return m[0];
}

const mod = new Function(
    'var state = { dashView: "suggestions", dashSegment: null, dashOnlyNew: false, dashSearchQuery: "" };' + '\n' +
    extractVar(SRC, 'MAX_VISIBLE') + '\n' +
    extractFn(SRC, 'normalizeTemp') + '\n' +
    extractFn(SRC, 'normalizeUrgency') + '\n' +
    extractFn(SRC, 'priorityRank') + '\n' +
    extractFn(SRC, 'leadMatchesSearch') + '\n' +
    extractFn(SRC, 'matchesSegment') + '\n' +
    extractFn(SRC, 'buildDashFeed') + '\n' +
    'return { state: state, buildDashFeed };'
)();

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  OK ' + name); }
    catch (e) { console.error('  FAIL ' + name + '\n    ' + (e && e.message)); process.exitCode = 1; }
}

function rows(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
        out.push({
            id: 'L' + String(120000 + i),
            familyName: i < 20 ? 'Familia Garcia ' + i : 'Familia Test ' + i,
            phone_normalized: '+34 600 000 ' + String(i).padStart(3, '0'),
            temperature: i % 2 === 0 ? 'caliente' : 'templado',
            urgency: 'baja',
            hasNewMessage: i < 15,
            daysWithoutTouch: i
        });
    }
    return out;
}

test('suggestions conserva MAX_VISIBLE=10', () => {
    mod.state.dashView = 'suggestions';
    mod.state.dashSegment = null;
    mod.state.dashOnlyNew = false;
    mod.state.dashSearchQuery = '';
    assert.equal(mod.buildDashFeed(rows(20)).length, 10);
});

test('leads muestra todos los rows cargados', () => {
    mod.state.dashView = 'leads';
    mod.state.dashSegment = null;
    mod.state.dashOnlyNew = false;
    mod.state.dashSearchQuery = '';
    assert.equal(mod.buildDashFeed(rows(58)).length, 58);
});

test('busqueda en leads devuelve todos los matches, no solo 10', () => {
    mod.state.dashView = 'leads';
    mod.state.dashSegment = null;
    mod.state.dashOnlyNew = false;
    mod.state.dashSearchQuery = 'garcia';
    const out = mod.buildDashFeed(rows(58));
    assert.equal(out.length, 20);
    assert.ok(out.every((r) => /Garcia/.test(r.familyName)));
});

test('pill mensaje nuevo en leads devuelve todos los nuevos filtrados', () => {
    mod.state.dashView = 'leads';
    mod.state.dashSegment = null;
    mod.state.dashOnlyNew = true;
    mod.state.dashSearchQuery = '';
    const out = mod.buildDashFeed(rows(58));
    assert.equal(out.length, 15);
    assert.ok(out.every((r) => r.hasNewMessage));
});

if (process.exitCode) process.exit(process.exitCode);
console.log('dashboard-feed tests: ' + passed + ' OK');
