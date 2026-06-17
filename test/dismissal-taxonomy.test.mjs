/**
 * v1.54.0 (FIX 4): harness Node para la taxonomía de "Dar de baja" un lead.
 * Verifica DISMISSAL_TAXONOMY + el orden + los helpers de cascada (reasonHasSubreasons,
 * findDismissSubreason, dismissShowsDetail). Estilo idéntico al resto de test/ (extrae del
 * source y lo corre en un sandbox; sin deps, sin DOM).
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
    extractVar(SRC, 'DISMISSAL_TAXONOMY') + '\n' +
    extractVar(SRC, 'DISMISSAL_REASON_ORDER') + '\n' +
    extractVar(SRC, 'DISMISSAL_DETAIL_VALUES') + '\n' +
    extractFn(SRC, 'reasonHasSubreasons') + '\n' +
    extractFn(SRC, 'findDismissSubreason') + '\n' +
    extractFn(SRC, 'dismissShowsDetail') + '\n' +
    'return { TAX: DISMISSAL_TAXONOMY, ORDER: DISMISSAL_REASON_ORDER, DETAILS: DISMISSAL_DETAIL_VALUES,' +
    ' reasonHasSubreasons, findDismissSubreason, dismissShowsDetail };'
)();

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  OK ' + name); }
    catch (e) { console.error('  FAIL ' + name + '\n    ' + (e && e.message)); process.exitCode = 1; }
}

test('11 motivos, en orden, y ORDER == keys del mapa', () => {
    assert.equal(mod.ORDER.length, 11);
    assert.deepEqual(mod.ORDER.slice(0, 3), ['Alternativa no At. Dom.', 'Cambio del estado del usuario', 'Cobertura Qida']);
    mod.ORDER.forEach((r) => assert.ok(mod.TAX[r], 'falta en el mapa: ' + r));
    assert.equal(Object.keys(mod.TAX).length, 11);
});

test('Cobertura Qida: catalogo completo v1.58.0 (10 submotivos, nombres exactos de Odoo)', () => {
    const names = mod.TAX['Cobertura Qida'].subreasons.map((s) => s.name);
    // v1.58.0: "Servicio puntual" (NO "Servicios Puntuales" — debe matchear el es_ES de Odoo, id 34).
    assert.ok(names.includes('Servicio puntual'), 'falta Servicio puntual (Odoo id 34)');
    assert.ok(!names.includes('Servicios Puntuales'), 'quedó el nombre viejo "Servicios Puntuales" (no matchea Odoo)');
    assert.ok(names.includes('Derivación a empresa del grupo'), 'falta Derivación a empresa del grupo');
    // v1.58.0: altas de catálogo (no eran gap).
    assert.ok(names.includes('Servicio incompatible con ayudas'), 'falta Servicio incompatible con ayudas (id 39)');
    assert.ok(names.includes('Región sin acreditación'), 'falta Región sin acreditación (id 38)');
    assert.equal(names.length, 10);
});

test('No localizable incluye "No show tras derivación coordinación" (v1.58.0, id 40)', () => {
    const names = mod.TAX['No localizable'].subreasons.map((s) => s.name);
    assert.ok(names.includes('No show tras derivación coordinación'), 'falta No show tras derivación coordinación');
    assert.equal(names.length, 3);
});

test('Error operativo y Faltan datos no tienen submotivos', () => {
    assert.equal(mod.reasonHasSubreasons('Error operativo'), false);
    assert.equal(mod.reasonHasSubreasons('Faltan datos de contacto'), false);
    assert.equal(mod.TAX['Error operativo'].subreasons.length, 0);
});

test('reasonHasSubreasons true para motivos con submotivos', () => {
    assert.equal(mod.reasonHasSubreasons('Competencia At. Dom.'), true);
    assert.equal(mod.reasonHasSubreasons('Cobertura Qida'), true);
    assert.equal(mod.reasonHasSubreasons('Duplicado'), true);
});

test('priceElevated SOLO en Alternativa no At. Dom. (3) + Competencia At. Dom. (4) = 7', () => {
    let pe = 0;
    mod.ORDER.forEach((r) => mod.TAX[r].subreasons.forEach((s) => { if (s.priceElevated) pe++; }));
    assert.equal(pe, 7);
    mod.TAX['Alternativa no At. Dom.'].subreasons.forEach((s) => assert.ok(s.priceElevated, s.name));
    mod.TAX['Competencia At. Dom.'].subreasons.forEach((s) => assert.ok(s.priceElevated, s.name));
});

test('dismissShowsDetail: true en priceElevated, false en el resto', () => {
    assert.equal(mod.dismissShowsDetail('Competencia At. Dom.', 'Mercado negro'), true);
    assert.equal(mod.dismissShowsDetail('Alternativa no At. Dom.', 'Ingreso en residencia privada'), true);
    assert.equal(mod.dismissShowsDetail('Cobertura Qida', 'Horarios'), false);
    assert.equal(mod.dismissShowsDetail('Cambio del estado del usuario', 'Exitus del usuario'), false);
    assert.equal(mod.dismissShowsDetail('Error operativo', ''), false);
    assert.equal(mod.dismissShowsDetail('', ''), false);
});

test('Nivel 3 hoy = solo "Precio elevado"', () => {
    assert.deepEqual(mod.DETAILS, ['Precio elevado']);
});

test('findDismissSubreason resuelve por nombre y null si no existe', () => {
    assert.equal(mod.findDismissSubreason('Competencia At. Dom.', 'Otra empresa').name, 'Otra empresa');
    assert.equal(mod.findDismissSubreason('Competencia At. Dom.', 'inexistente'), null);
    assert.equal(mod.findDismissSubreason('Error operativo', 'x'), null);
});

if (process.exitCode) process.exit(process.exitCode);
console.log('dismissal-taxonomy tests: ' + passed + ' OK');
