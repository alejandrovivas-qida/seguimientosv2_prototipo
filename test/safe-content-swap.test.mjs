/**
 * Harness Node para safeSetContentHtml. Simula el NotFoundError observado en
 * Odoo cuando un input enfocado es removido durante un evento input/change.
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
    extractFn(SRC, 'safeSetContentHtml') + '\n' +
    'return { safeSetContentHtml };'
)();

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  OK ' + name); }
    catch (e) { console.error('  FAIL ' + name + '\n    ' + (e && e.message)); process.exitCode = 1; }
}

function makeDoc(active) {
    return {
        activeElement: active,
        createElement(name) {
            assert.equal(name, 'template');
            return {
                html: '',
                set innerHTML(value) { this.html = value; },
                get innerHTML() { return this.html; },
                content: {
                    cloneNode() {
                        return { cloned: true };
                    }
                }
            };
        }
    };
}

console.log('safe-content-swap');

test('safeSetContentHtml desenfoca el input activo antes del swap normal', () => {
    const active = { blurred: false, blur() { this.blurred = true; } };
    const content = {
        ownerDocument: makeDoc(active),
        contains(node) { return node === active; },
        set innerHTML(value) { this.html = value; },
        get innerHTML() { return this.html; }
    };

    mod.safeSetContentHtml(content, '<p>ok</p>');

    assert.equal(active.blurred, true);
    assert.equal(content.html, '<p>ok</p>');
});

test('safeSetContentHtml usa template fallback si innerHTML lanza NotFoundError', () => {
    const active = { blurred: false, blur() { this.blurred = true; } };
    const content = {
        ownerDocument: makeDoc(active),
        contains(node) { return node === active; },
        replaceChildren(node) { this.replaced = node; },
        set innerHTML(value) {
            const err = new Error("Failed to set the 'innerHTML' property on 'Element': The node to be removed is no longer a child of this node.");
            err.name = 'NotFoundError';
            throw err;
        }
    };

    mod.safeSetContentHtml(content, '<p>ok</p>');

    assert.equal(active.blurred, true);
    assert.deepEqual(content.replaced, { cloned: true });
});

test('safeSetContentHtml no oculta errores no relacionados', () => {
    const content = {
        ownerDocument: makeDoc(null),
        contains() { return false; },
        set innerHTML(value) {
            throw new TypeError('boom');
        }
    };

    assert.throws(() => mod.safeSetContentHtml(content, '<p>ok</p>'), TypeError);
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', con fallos' : ''));
