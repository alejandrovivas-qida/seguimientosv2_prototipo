/**
 * Harness Node para el botón "Material marketing" cableado al backend real (v1.51).
 *
 * Dos niveles:
 *   1. materialPayloadFromResp (PURA): mapeo de la response de /materials -> payload del render.
 *   2. Asserts a nivel source: el wiring (handleAiChip -> startMaterialFlow, fetchMaterials pega a
 *      /materials, dispatch de ai-material-search / ai-retry-material) está presente y no regresó.
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
    extractFn(SRC, 'materialPayloadFromResp') + '\n' +
    'return { materialPayloadFromResp };'
)();

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  OK ' + name); }
    catch (e) { console.error('  FAIL ' + name + '\n    ' + (e && e.message)); process.exitCode = 1; }
}

const sampleMats = [
    { id: 'a1', type: 'article', title: 'Guía Alzheimer', snippet: 'Resumen.', reason: 'Encaja por X', url: 'https://www.qida.es/guia' },
    { id: 'a2', type: 'pdf', title: 'Tarifas', snippet: 'PDF de precios.', reason: 'El lead dudó por precio', url: 'https://www.qida.es/tarifas' }
];

// ---- 1. materialPayloadFromResp (pura) -------------------------------------

test('mapea materials a items {title,desc,reason,action,url} con kind:material', () => {
    const p = mod.materialPayloadFromResp({ materials: sampleMats, query_source: 'lead_analysis' });
    assert.equal(p.kind, 'material');
    assert.equal(p.materialSearch, true);
    assert.equal(p.items.length, 2);
    assert.equal(p.items[0].title, 'Guía Alzheimer');
    assert.equal(p.items[0].desc, 'Resumen.');          // snippet -> desc
    assert.equal(p.items[0].reason, 'Encaja por X');
    assert.equal(p.items[0].url, 'https://www.qida.es/guia');
    assert.equal(p.items[0].action, 'Compartir con el lead');
});

test('intro varía por query_source: explicit', () => {
    const p = mod.materialPayloadFromResp({ materials: sampleMats, query_source: 'explicit' });
    assert.equal(p.intro, 'Material para tu búsqueda:');
});

test('intro varía por query_source: lead_analysis', () => {
    const p = mod.materialPayloadFromResp({ materials: sampleMats, query_source: 'lead_analysis' });
    assert.equal(p.intro, 'Material útil para este caso:');
});

test('intro varía por query_source: generic', () => {
    const p = mod.materialPayloadFromResp({ materials: sampleMats, query_source: 'generic' });
    assert.equal(p.intro, 'Material general de Qida:');
});

test('sin resultados: items vacío pero materialSearch sigue activo (req on-demand)', () => {
    const p = mod.materialPayloadFromResp({ materials: [], query_source: 'lead_analysis' });
    assert.equal(p.kind, 'material');
    assert.equal(p.items.length, 0);
    assert.equal(p.materialSearch, true);
    assert.match(p.intro, /específica/);  // copy de "no encontré, probá algo más específico"
});

test('response vacía/parcial no rompe (defaults seguros)', () => {
    const p = mod.materialPayloadFromResp({});
    assert.equal(p.kind, 'material');
    assert.equal(p.items.length, 0);
    const p2 = mod.materialPayloadFromResp({ materials: [{}], query_source: 'explicit' });
    assert.equal(p2.items[0].title, 'Material');  // fallback de title
    assert.equal(p2.items[0].url, '');
});

// ---- 2. Asserts a nivel source (wiring no-regresión) -----------------------

test('handleAiChip rutea material-marketing a startMaterialFlow solo con useRealApi()', () => {
    assert.match(SRC, /promptId === 'material-marketing' && useRealApi\(\)/);
    assert.match(SRC, /startMaterialFlow\(lead, null\)/);
});

test('fetchMaterials pega a POST /api/leads/{id}/materials', () => {
    const fn = extractFn(SRC, 'fetchMaterials');
    assert.match(fn, /\/api\/leads\/'\s*\+\s*numericId\s*\+\s*'\/materials/);
    assert.match(fn, /method:\s*'POST'/);
    // query opcional: solo se manda si hay texto (sin query -> backend deriva del lead).
    assert.match(fn, /if \(q\) body\.query = q;/);
});

test('dispatch tiene ai-material-search y ai-retry-material', () => {
    assert.match(SRC, /case 'ai-material-search':/);
    assert.match(SRC, /case 'ai-retry-material':/);
});

test('el buscador usa data-input=ai-material-search (Enter) + data-action (click)', () => {
    assert.match(SRC, /data-input="ai-material-search"/);
    assert.match(SRC, /data-action="ai-material-search"/);
    // Enter handler en handleKeyDownInModal.
    const kd = extractFn(SRC, 'handleKeyDownInModal');
    assert.match(kd, /input === 'ai-material-search'/);
});

test('compartir reusa ai-share-material (no auto-envía — principio rector)', () => {
    // El item mapeado se comparte con el chip de adjunto existente, no con un envío directo.
    assert.match(SRC, /data-action="ai-share-material"/);
});

if (process.exitCode) process.exit(process.exitCode);
console.log('material-button tests: ' + passed + ' OK');
