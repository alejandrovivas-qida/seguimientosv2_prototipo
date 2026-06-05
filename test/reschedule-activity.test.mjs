/**
 * Harness Node para el helper de REAGENDAR actividad (v1.48.5): cambia date_deadline de una
 * mail.activity existente via JSON-RPC directo (/web/dataset/call_kw/mail.activity/write).
 * Mismo patrón que create-activity-v1.44.test.mjs: extrae las funciones PURAS del source real
 * por matching de llaves y las evalúa en aislamiento con `fetch` mockeado.
 *
 *   node test/reschedule-activity.test.mjs
 *
 * Cubre:
 *   - rescheduleOdooActivity: arma el call_kw correcto (model mail.activity, method write,
 *     args [[id], { date_deadline }], kwargs {}).
 *   - date_deadline en formato 'YYYY-MM-DD' (NO ISO datetime, NO timestamp).
 *   - args[0] es lista de un elemento aunque sea un solo id.
 *   - sin activityId / sin newDeadlineISO -> rechaza SIN tocar la red.
 *   - error de Odoo (HTTP 200 + data.error) -> rechaza (dispara el revert del caller).
 *   - asserts a nivel source: botón "📅 Reagendar" gated + handler optimista con revert.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(__dirname, '..', 'qida-widget.v1.js'), 'utf8');

function extractFn(src, name) {
    const start = src.indexOf('function ' + name + '(');
    assert.notEqual(start, -1, 'no se encontró function ' + name);
    let i = src.indexOf('{', start), depth = 0;
    for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
    }
    return src.slice(start, i);
}

// Reconstruye un módulo con SOLO odooCall + rescheduleOdooActivity + stubs (fetch, _baseContext).
//   `fetch` se inyecta por test via __setFetch; las requests quedan registradas en __calls.
const mod = new Function(
    'var __calls = [];\n' +
    'var __fetchImpl = function(){ throw new Error("fetch no seteado"); };\n' +
    'function fetch(u, o){ __calls.push({ url: u, body: JSON.parse(o.body) }); return __fetchImpl(u, o); }\n' +
    'var _baseContext = {};\n' +
    extractFn(SRC, 'odooCall') + '\n' +
    extractFn(SRC, 'rescheduleOdooActivity') + '\n' +
    'return {\n' +
    '  rescheduleOdooActivity,\n' +
    '  __calls: () => __calls,\n' +
    '  __reset: () => { __calls.length = 0; },\n' +
    '  __setFetch: (f) => { __fetchImpl = f; },\n' +
    '  __setBaseContext: (c) => { _baseContext = c; }\n' +
    '};'
)();

function jsonResponse(payload, opts) {
    opts = opts || {};
    return Promise.resolve({
        ok: opts.ok !== false,
        status: opts.status || 200,
        headers: { get: () => (opts.contentType || 'application/json; charset=utf-8') },
        json: () => Promise.resolve(payload)
    });
}
function routedFetch(routes) {
    return function (url) {
        for (const key in routes) {
            if (url.indexOf(key) !== -1) return routes[key]();
        }
        return jsonResponse({ result: null });
    };
}

let passed = 0;
const TESTS = [];
function test(name, fn) { TESTS.push({ name: name, fn: fn }); }
function section(name) { TESTS.push({ section: name }); }

// =====================================================================================
section('v1.48.5 — rescheduleOdooActivity (write de date_deadline)');
// =====================================================================================

test('arma el call_kw correcto: mail.activity/write con args [[id], { date_deadline }] + kwargs {}', async () => {
    mod.__reset();
    mod.__setBaseContext({ lang: 'es_ES', tz: 'Europe/Madrid', uid: 818 });
    mod.__setFetch(routedFetch({ 'mail.activity/write': () => jsonResponse({ result: true }) }));
    const res = await mod.rescheduleOdooActivity(992858, '2026-06-20');
    assert.equal(res, true);
    const call = mod.__calls()[0];
    assert.match(call.url, /\/web\/dataset\/call_kw\/mail\.activity\/write$/);
    assert.equal(call.body.params.model, 'mail.activity');
    assert.equal(call.body.params.method, 'write');
    assert.deepEqual(call.body.params.args[0], [992858]);          // args[0] = lista de ids
    assert.deepEqual(call.body.params.args[1], { date_deadline: '2026-06-20' });
});

test('date_deadline en formato YYYY-MM-DD (no ISO datetime, no timestamp)', async () => {
    mod.__reset();
    mod.__setFetch(routedFetch({ 'mail.activity/write': () => jsonResponse({ result: true }) }));
    await mod.rescheduleOdooActivity(1, '2026-12-31');
    const sent = mod.__calls()[0].body.params.args[1].date_deadline;
    assert.match(sent, /^\d{4}-\d{2}-\d{2}$/);                      // solo fecha
    assert.equal(sent.indexOf('T'), -1, 'no debe llevar componente de hora (T)');
    assert.equal(/^\d+$/.test(sent), false, 'no debe ser un timestamp numérico');
});

test('args[0] es lista de un solo elemento aunque se reagende una sola actividad', async () => {
    mod.__reset();
    mod.__setFetch(routedFetch({ 'mail.activity/write': () => jsonResponse({ result: true }) }));
    await mod.rescheduleOdooActivity(8801, '2026-07-01');
    const ids = mod.__calls()[0].body.params.args[0];
    assert.ok(Array.isArray(ids));
    assert.equal(ids.length, 1);
    assert.equal(ids[0], 8801);
});

test('sin activityId -> rechaza y NO toca la red', async () => {
    mod.__reset();
    mod.__setFetch(routedFetch({ 'mail.activity/write': () => jsonResponse({ result: true }) }));
    await assert.rejects(mod.rescheduleOdooActivity(null, '2026-06-20'), /activityId y newDeadlineISO requeridos/);
    await assert.rejects(mod.rescheduleOdooActivity(0, '2026-06-20'), /requeridos/);
    assert.equal(mod.__calls().length, 0, 'no debe haberse hecho ningún fetch');
});

test('sin newDeadlineISO -> rechaza y NO toca la red', async () => {
    mod.__reset();
    mod.__setFetch(routedFetch({ 'mail.activity/write': () => jsonResponse({ result: true }) }));
    await assert.rejects(mod.rescheduleOdooActivity(992858, null), /requeridos/);
    await assert.rejects(mod.rescheduleOdooActivity(992858, ''), /requeridos/);
    assert.equal(mod.__calls().length, 0, 'no debe haberse hecho ningún fetch');
});

test('error de Odoo (HTTP 200 + data.error) -> rechaza (dispara el revert del caller)', async () => {
    mod.__reset();
    mod.__setFetch(routedFetch({
        'mail.activity/write': () => jsonResponse({ error: { data: { name: 'odoo.exceptions.AccessError', message: 'No permitido' } } })
    }));
    await assert.rejects(
        mod.rescheduleOdooActivity(1, '2026-06-20'),
        (err) => { assert.match(err.message, /No permitido/); return true; }
    );
});

// =====================================================================================
section('v1.48.5 — asserts a nivel source (UI + handler)');
// =====================================================================================

test('renderActivityRow tiene "📅 Reagendar" gated por odooWriteEnabled + id real, con data-current-date', () => {
    const fn = extractFn(SRC, 'renderActivityRow');
    assert.match(fn, /data-action="activity-reschedule"/);
    assert.match(fn, /data-current-date="/);
    assert.match(fn, /state\.odooWriteEnabled/);
    assert.match(fn, /isRealActivityId\(act\.id\)/);
});

test('handleRescheduleSave: optimistic update + write + revert en error (no toca el fetch shape)', () => {
    const fn = extractFn(SRC, 'handleRescheduleSave');
    assert.match(fn, /rescheduleActivityInState/);   // optimistic
    assert.match(fn, /rescheduleOdooActivity/);       // write
    assert.match(fn, /revertReschedule/);             // revert en catch
    assert.match(fn, /odooErrMsg/);                   // toast legible
});

// =====================================================================================
(async () => {
    for (const t of TESTS) {
        if (t.section) {
            console.log('\n' + t.section);
            continue;
        }
        try { await t.fn(); passed++; console.log('  ✓ ' + t.name); }
        catch (e) { console.error('  ✗ ' + t.name + '\n    ' + (e && (e.stack || e.message))); process.exitCode = 1; }
    }
    console.log('\n' + passed + ' passed' + (process.exitCode ? ', con fallos' : ''));
})();
