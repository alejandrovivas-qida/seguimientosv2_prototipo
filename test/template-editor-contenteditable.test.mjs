/**
 * Harness Node para el editor contenteditable de plantillas.
 *
 * No introduce dependencias: extrae helpers puros del widget real y valida el
 * contrato que usa el contenteditable para sanitizar, reparsear y serializar.
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
    const re = new RegExp('var\\s+' + name + '\\s*=.*?;', 's');
    const m = src.match(re);
    assert.ok(m, 'no se encontro var ' + name);
    return m[0];
}

const mod = new Function(
    extractFn(SRC, 'esc') + '\n' +
    extractVar(SRC, 'TEMPLATE_VARS') + '\n' +
    extractVar(SRC, 'TEMPLATE_VAR_BY_TOKEN') + '\n' +
    'for (var tvi = 0; tvi < TEMPLATE_VARS.length; tvi++) TEMPLATE_VAR_BY_TOKEN[TEMPLATE_VARS[tvi].token] = TEMPLATE_VARS[tvi];\n' +
    extractFn(SRC, 'normalizeAgencyLevel') + '\n' +
    extractFn(SRC, 'templateTokenizeText') + '\n' +
    extractFn(SRC, 'templateTokensToText') + '\n' +
    extractFn(SRC, 'sanitizeTemplatePasteText') + '\n' +
    extractFn(SRC, 'templateTextToEditorHtml') + '\n' +
    extractFn(SRC, 'templateDeleteTokenBefore') + '\n' +
    extractFn(SRC, 'templateMoveCaretAcrossChip') + '\n' +
    extractFn(SRC, 'templateDoubleClickChip') + '\n' +
    'var state = { tplFull: { inicial: { variables: ["nombre"], lang: "es" }, cierre: null }, tplDraft: { inicial: "Hola {nombre}", cierre: "Ciao" }, tplAgencyDraft: { inicial: 8, cierre: 2 } };\n' +
    extractFn(SRC, 'buildTemplatesPayload') + '\n' +
    'return { TEMPLATE_VARS, templateTokenizeText, templateTokensToText, sanitizeTemplatePasteText, templateTextToEditorHtml, templateDeleteTokenBefore, templateMoveCaretAcrossChip, templateDoubleClickChip, buildTemplatesPayload };'
)();

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  OK ' + name); }
    catch (e) { console.error('  FAIL ' + name + '\n    ' + (e && e.message)); process.exitCode = 1; }
}

console.log('template-editor-contenteditable');

test('paste externo se trata como texto plano y no inyecta HTML activo', () => {
    const pasted = mod.sanitizeTemplatePasteText('Hola <span style="color:red">Ana</span>\r\n<font>Qida</font>');
    const html = mod.templateTextToEditorHtml(pasted);
    assert.equal(html.includes('<span style='), false);
    assert.equal(html.includes('<font>'), false);
    assert.ok(html.includes('&lt;span style=&quot;color:red&quot;&gt;Ana&lt;/span&gt;'));
    assert.ok(html.includes('&lt;font&gt;Qida&lt;/font&gt;'));
});

test('backspace al borde derecho borra chip como unidad atomica', () => {
    const tokens = mod.templateTokenizeText('Hola {nombre}');
    const result = mod.templateDeleteTokenBefore(tokens, 2);
    assert.equal(mod.templateTokensToText(result.tokens), 'Hola ');
    assert.equal(mod.templateTokensToText(result.tokens).includes('{nom'), false);
});

test('flechas izquierda/derecha saltan el chip entero en el modelo de caret', () => {
    const tokens = mod.templateTokenizeText('Hola {nombre}, soy Ana');
    const left = mod.templateMoveCaretAcrossChip(tokens, 2, 'left');
    const right = mod.templateMoveCaretAcrossChip(tokens, 1, 'right');
    assert.equal(left.caretIndex, 1);
    assert.equal(right.caretIndex, 2);
});

test('pegar {nombre} literal se reparsea como chip al render', () => {
    const tokens = mod.templateTokenizeText('Hola {nombre}');
    assert.equal(tokens[1].type, 'var');
    assert.equal(tokens[1].value, '{nombre}');
    const html = mod.templateTextToEditorHtml('Hola {nombre}');
    assert.ok(html.includes('qida-tpl-var-chip'));
    assert.ok(html.includes('Nombre del contacto'));
});

test('doble click sobre chip tiene salida definida y no muta tokens', () => {
    const tokens = mod.templateTokenizeText('Hola {nombre}');
    const result = mod.templateDoubleClickChip(tokens, 1);
    assert.deepEqual(result.tokens, tokens);
    assert.equal(result.selectedChipIndex, 1);
});

test('placeholder desconocido queda como texto literal y se conserva', () => {
    const tokens = mod.templateTokenizeText('Hola {direccion}');
    assert.deepEqual(tokens, [{ type: 'text', value: 'Hola {direccion}' }]);
    assert.equal(mod.templateTokensToText(tokens), 'Hola {direccion}');
    assert.equal(mod.templateTextToEditorHtml('Hola {direccion}').includes('qida-tpl-var-chip'), false);
});

test('buildTemplatesPayload persiste agency_level por plantilla', () => {
    const payload = mod.buildTemplatesPayload();
    assert.equal(payload.inicial.text, 'Hola {nombre}');
    assert.equal(payload.inicial.agency_level, 8);
    assert.equal(payload.cierre.agency_level, 2);
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', con fallos' : ''));
