/**
 * Harness Node para "Armá tu asistente" (v1.36.0). Sin test runner (el repo es vanilla ES5 sin
 * pipeline): extrae las funciones PURAS del source real de qida-widget.v1.js por matching de llaves
 * y las evalúa en aislamiento. Así el test corre contra el código que se publica, no contra una
 * copia — si alguien regresa buildSaveVariants a mandar labels, o rompe el surfacing del 422,
 * este harness falla.
 *
 *   node test/agent-builder-save.test.mjs
 *
 * Cubre los dos asserts pedidos en la tarea:
 *   1) el body del save contiene los ENUM (short/medium, neutral/direct/empathic), NUNCA los labels.
 *   2) el handler de error 422 muestra el detail del backend, no el genérico.
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

// Reconstruye un módulo con solo las piezas puras que queremos testear.
const mod = new Function(
    extractVar(SRC, 'API_FIELD_LABELS') + '\n' +
    extractVar(SRC, 'DRAFT_LENGTHS') + '\n' +
    extractVar(SRC, 'TONE_STYLES') + '\n' +
    extractVar(SRC, 'LENGTH_LABELS') + '\n' +
    extractVar(SRC, 'TONE_LABELS') + '\n' +
    extractFn(SRC, 'buildSaveVariants') + '\n' +
    extractFn(SRC, 'format422Detail') + '\n' +
    extractFn(SRC, 'apiErrorCopy') + '\n' +
    'return { buildSaveVariants, format422Detail, apiErrorCopy, DRAFT_LENGTHS, TONE_STYLES, LENGTH_LABELS, TONE_LABELS };'
)();

// Contrato del backend (app/schemas.py:DraftVariantSpec). El widget DEBE coincidir.
const BACKEND_LENGTHS = ['short', 'medium'];
const BACKEND_TONES = ['neutral', 'direct', 'empathic'];

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  ✓ ' + name); }
    catch (e) { console.error('  ✗ ' + name + '\n    ' + (e && e.message)); process.exitCode = 1; }
}

console.log('agent-builder-save (v1.36.0)');

// === 1) El save body contiene los enum, no los labels ===
test('los enum del form coinciden EXACTO con los Literal del backend', () => {
    assert.deepEqual(mod.DRAFT_LENGTHS, BACKEND_LENGTHS);
    assert.deepEqual(mod.TONE_STYLES, BACKEND_TONES);
});

test('los labels en español NO son enums válidos (value !== label)', () => {
    for (const label of Object.values(mod.TONE_LABELS)) {
        assert.equal(BACKEND_TONES.includes(label), false, 'label "' + label + '" no debe ser enum');
    }
    for (const label of Object.values(mod.LENGTH_LABELS)) {
        assert.equal(BACKEND_LENGTHS.includes(label), false, 'label "' + label + '" no debe ser enum');
    }
    // Sanity: los labels son los del screenshot reportado.
    assert.equal(mod.TONE_LABELS.empathic, 'Empático');
    assert.equal(mod.LENGTH_LABELS.short, 'Corto');
});

test('buildSaveVariants manda los enum + trimea el name (NUNCA labels)', () => {
    const formState = [
        { name: '  saludo_breve ', length: 'short', tone_style: 'empathic' },
        { name: 'cierre', length: 'medium', tone_style: 'direct' }
    ];
    const body = mod.buildSaveVariants(formState);
    assert.deepEqual(body, [
        { name: 'saludo_breve', length: 'short', tone_style: 'empathic' },
        { name: 'cierre', length: 'medium', tone_style: 'direct' }
    ]);
    // Cada length/tone_style del body debe ser un enum válido del backend.
    for (const v of body) {
        assert.ok(BACKEND_LENGTHS.includes(v.length), 'length inválido en body: ' + v.length);
        assert.ok(BACKEND_TONES.includes(v.tone_style), 'tone_style inválido en body: ' + v.tone_style);
    }
});

// === 2) El handler de error 422 muestra el detail del backend, no genérico ===
test('format422Detail traduce el campo y conserva el msg del backend', () => {
    const data = { detail: [{
        type: 'literal_error',
        loc: ['body', 'variants', 0, 'tone_style'],
        msg: "Input should be 'neutral', 'direct' or 'empathic'"
    }] };
    const msg = mod.format422Detail(data);
    assert.match(msg, /^Tono: Input should be 'neutral'/);
});

test('format422Detail mapea length->Largo y acepta múltiples errores', () => {
    const data = { detail: [
        { loc: ['body', 'variants', 1, 'length'], msg: 'bad length' },
        { loc: ['body', 'variants', 1, 'name'], msg: 'string too long' }
    ] };
    const msg = mod.format422Detail(data);
    assert.match(msg, /Largo: bad length/);
    assert.match(msg, /Nombre: string too long/);
});

test('format422Detail acepta detail como string', () => {
    assert.equal(mod.format422Detail({ detail: 'AF inactiva' }), 'AF inactiva');
});

test('format422Detail devuelve null si no hay detail parseable', () => {
    assert.equal(mod.format422Detail({}), null);
    assert.equal(mod.format422Detail(null), null);
    assert.equal(mod.format422Detail({ detail: [] }), null);
});

test('apiErrorCopy(422) PRIORIZA el detail del backend sobre el genérico', () => {
    const serverMsg = "Tono: Input should be 'neutral', 'direct' or 'empathic'";
    const out = mod.apiErrorCopy(422, serverMsg, 'tu configuración del asistente');
    assert.equal(out, serverMsg);
    assert.equal(out.includes('La petición no es válida'), false);
});

test('apiErrorCopy(422) cae al genérico SOLO si no hay detail', () => {
    const out = mod.apiErrorCopy(422, null, 'tu configuración del asistente');
    assert.equal(out, 'La petición no es válida (tu configuración del asistente).');
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', con fallos' : ''));
