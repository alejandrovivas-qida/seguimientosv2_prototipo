/**
 * Harness Node para los helpers de ESCRITURA a Odoo (v1.44.0): crear actividad ([A]) +
 * cerrar actividad ([B]) via JSON-RPC directo (/web/dataset/call_kw). Mismo patrón que
 * ux-trust-v1.41.test.mjs / agent-builder-save.test.mjs: extrae las funciones PURAS del
 * source real por matching de llaves y las evalúa en aislamiento con `fetch` mockeado.
 *
 *   node test/create-activity-v1.44.test.mjs
 *
 * Cubre:
 *   - createOdooActivity: arma el call_kw correcto (model mail.activity, method create,
 *     res_model crm.lead, res_id, activity_type_id, summary, note, date_deadline) y devuelve el id.
 *   - completeOdooActivity: action_feedback con [[id]] + feedback:''.
 *   - verifyOdooWriteCapability: true con [{id,login}], false sin login, rechaza ante error Odoo.
 *   - loadActivityTypes + resolvedActivityTypes: resuelve la whitelist -> ids por nombre + cachea.
 *   - odooErrMsg: mensaje legible (sin JSON crudo). isRealActivityId: filtra mock 'local-*'.
 *   - odooCall: un data.error de Odoo (HTTP 200) se propaga como throw (dispara el revert del caller).
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
function extractVar(src, name) {
    const re = new RegExp('var\\s+' + name + '\\s*=.*?;', 's');
    const m = src.match(re);
    assert.ok(m, 'no se encontró var ' + name);
    return m[0];
}

// Reconstruye un módulo con SOLO las piezas a testear + stubs controlables (fetch, _baseContext,
// _odooUid, _odooActivityTypes). `fetch` se inyecta por test via __setFetch; las requests quedan
// registradas en __calls para los asserts de payload.
const mod = new Function(
    'var __calls = [];\n' +
    'var __fetchImpl = function(){ throw new Error("fetch no seteado"); };\n' +
    'function fetch(u, o){ __calls.push({ url: u, body: JSON.parse(o.body) }); return __fetchImpl(u, o); }\n' +
    'var _baseContext = {};\n' +
    'var _odooUid = null;\n' +
    'var _odooActivityTypes = null;\n' +
    'function log(){}\n' +
    extractVar(SRC, 'ACTIVITY_TYPE_WHITELIST') + '\n' +
    extractFn(SRC, 'odooCall') + '\n' +
    extractFn(SRC, 'verifyOdooWriteCapability') + '\n' +
    extractFn(SRC, '_capOk') + '\n' +
    extractFn(SRC, 'loadActivityTypes') + '\n' +
    extractFn(SRC, 'resolvedActivityTypes') + '\n' +
    extractFn(SRC, 'createOdooActivity') + '\n' +
    extractFn(SRC, 'completeOdooActivity') + '\n' +
    extractFn(SRC, 'odooErrMsg') + '\n' +
    extractFn(SRC, 'isRealActivityId') + '\n' +
    'return {\n' +
    '  verifyOdooWriteCapability, loadActivityTypes, resolvedActivityTypes,\n' +
    '  createOdooActivity, completeOdooActivity, odooErrMsg, isRealActivityId,\n' +
    '  ACTIVITY_TYPE_WHITELIST,\n' +
    '  __calls: () => __calls,\n' +
    '  __reset: () => { __calls.length = 0; },\n' +
    '  __setFetch: (f) => { __fetchImpl = f; },\n' +
    '  __setUid: (u) => { _odooUid = u; },\n' +
    '  __setBaseContext: (c) => { _baseContext = c; },\n' +
    '  __setTypes: (t) => { _odooActivityTypes = t; },\n' +
    '  __getTypes: () => _odooActivityTypes\n' +
    '};'
)();

// Fake fetch: enruta por URL y devuelve un Response-like con la envoltura JSON-RPC de Odoo.
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
const TYPES = [
    { id: 4, name: 'Por hacer' },
    { id: 2, name: 'Llamada' },
    { id: 1, name: 'Correo electrónico' },
    { id: 3, name: 'Reunión' },
    { id: 200, name: 'Otros' }
];

// Registro diferido + ejecución SECUENCIAL: los tests async comparten el estado del módulo
// (fetch/types/calls), así que no pueden correr concurrentes.
let passed = 0;
const TESTS = [];
function test(name, fn) { TESTS.push({ name: name, fn: fn }); }
function section(name) { TESTS.push({ section: name }); }

// =====================================================================================
section('v1.44 — helpers puros');
// =====================================================================================

test('isRealActivityId: enteros/strings numéricos OK; null/mock local-*/pending-* NO', () => {
    assert.equal(mod.isRealActivityId(992858), true);
    assert.equal(mod.isRealActivityId('8801'), true);
    assert.equal(mod.isRealActivityId('local-3'), false);
    assert.equal(mod.isRealActivityId('pending-123'), false);
    assert.equal(mod.isRealActivityId(null), false);
    assert.equal(mod.isRealActivityId(0), false);
    assert.equal(mod.isRealActivityId(-1), false);
});

test('odooErrMsg: quita el prefijo "Odoo model/method:" y trunca; sin message -> fallback', () => {
    assert.equal(mod.odooErrMsg(new Error('Odoo mail.activity/create: Campo requerido')), 'Campo requerido');
    assert.equal(mod.odooErrMsg(null), 'Error de Odoo');
    const long = mod.odooErrMsg(new Error('x'.repeat(300)));
    assert.ok(long.length <= 160 && long.endsWith('...'));
});

// =====================================================================================
section('v1.44 — createOdooActivity ([A])');
// =====================================================================================

test('createOdooActivity: arma el call_kw correcto y devuelve el id (result numérico)', async () => {
    mod.__reset();
    mod.__setBaseContext({ lang: 'es_ES', tz: 'Europe/Madrid', uid: 818 });
    mod.__setFetch(routedFetch({ 'mail.activity/create': () => jsonResponse({ result: 992858 }) }));
    const id = await mod.createOdooActivity({ resId: 125040, activityTypeId: 4, summary: 'Llamar', note: 'nota', deadline: '2026-06-10' });
    assert.equal(id, 992858);
    const call = mod.__calls()[0];
    assert.match(call.url, /\/web\/dataset\/call_kw\/mail\.activity\/create$/);
    assert.equal(call.body.params.model, 'mail.activity');
    assert.equal(call.body.params.method, 'create');
    const vals = call.body.params.args[0];
    assert.equal(vals.res_model, 'crm.lead');
    assert.equal(vals.res_id, 125040);
    assert.equal(vals.activity_type_id, 4);
    assert.equal(vals.summary, 'Llamar');
    assert.equal(vals.note, 'nota');
    assert.equal(vals.date_deadline, '2026-06-10');
});

test('createOdooActivity: result como [id] (algunas versiones) -> devuelve el primer id', async () => {
    mod.__reset();
    mod.__setFetch(routedFetch({ 'mail.activity/create': () => jsonResponse({ result: [777] }) }));
    const id = await mod.createOdooActivity({ resId: 1, activityTypeId: 2, summary: 's', note: '', deadline: '2026-06-10' });
    assert.equal(id, 777);
});

test('createOdooActivity: nota vacía -> manda note:"" (no undefined)', async () => {
    mod.__reset();
    mod.__setFetch(routedFetch({ 'mail.activity/create': () => jsonResponse({ result: 1 }) }));
    await mod.createOdooActivity({ resId: 1, activityTypeId: 2, summary: 's', note: '', deadline: '2026-06-10' });
    assert.equal(mod.__calls()[0].body.params.args[0].note, '');
});

test('createOdooActivity: error de Odoo (HTTP 200 + data.error) -> rechaza (dispara revert del caller)', async () => {
    mod.__reset();
    mod.__setFetch(routedFetch({
        'mail.activity/create': () => jsonResponse({ error: { data: { name: 'odoo.exceptions.ValidationError', message: 'Fecha inválida' } } })
    }));
    await assert.rejects(
        mod.createOdooActivity({ resId: 1, activityTypeId: 2, summary: 's', note: '', deadline: 'bad' }),
        (err) => { assert.match(err.message, /Fecha inválida/); return true; }
    );
});

// =====================================================================================
section('v1.44 — completeOdooActivity ([B])');
// =====================================================================================

test('completeOdooActivity: action_feedback con [[id]] + feedback:""', async () => {
    mod.__reset();
    mod.__setFetch(routedFetch({ 'mail.activity/action_feedback': () => jsonResponse({ result: false }) }));
    await mod.completeOdooActivity(8801);
    const call = mod.__calls()[0];
    assert.match(call.url, /\/web\/dataset\/call_kw\/mail\.activity\/action_feedback$/);
    assert.equal(call.body.params.method, 'action_feedback');
    assert.deepEqual(call.body.params.args[0], [8801]);
    assert.equal(call.body.params.kwargs.feedback, '');
});

// =====================================================================================
section('v1.44 — verifyOdooWriteCapability (probe same-origin)');
// =====================================================================================

test('verify: con uid -> read([uid],[id,login]); [{id,login}] => true', async () => {
    mod.__reset();
    mod.__setUid(818);
    mod.__setFetch(routedFetch({ 'res.users/read': () => jsonResponse({ result: [{ id: 818, login: 'af@qida.es' }] }) }));
    const ok = await mod.verifyOdooWriteCapability();
    assert.equal(ok, true);
    const call = mod.__calls()[0];
    assert.match(call.url, /res\.users\/read$/);
    assert.deepEqual(call.body.params.args, [[818], ['id', 'login']]);
});

test('verify: sin login en la fila => false (no rompe)', async () => {
    mod.__reset();
    mod.__setUid(818);
    mod.__setFetch(routedFetch({ 'res.users/read': () => jsonResponse({ result: [{ id: 818 }] }) }));
    assert.equal(await mod.verifyOdooWriteCapability(), false);
});

test('verify: sin uid -> fallback search_read(limit 1)', async () => {
    mod.__reset();
    mod.__setUid(null);
    mod.__setBaseContext({});
    mod.__setFetch(routedFetch({ 'res.users/search_read': () => jsonResponse({ result: [{ id: 5, login: 'x' }] }) }));
    const ok = await mod.verifyOdooWriteCapability();
    assert.equal(ok, true);
    assert.match(mod.__calls()[0].url, /res\.users\/search_read$/);
});

test('verify: respuesta no-JSON (login screen / CORS) -> rechaza (caller deja capability=false)', async () => {
    mod.__reset();
    mod.__setUid(818);
    mod.__setFetch(routedFetch({ 'res.users/read': () => jsonResponse({ result: [] }, { contentType: 'text/html' }) }));
    await assert.rejects(mod.verifyOdooWriteCapability(), /no-JSON|sesion expirada/);
});

// =====================================================================================
section('v1.44 — loadActivityTypes + resolvedActivityTypes (whitelist)');
// =====================================================================================

test('loadActivityTypes: search_read mail.activity.type fields [id,name] + cachea', async () => {
    mod.__reset();
    mod.__setTypes(null);
    mod.__setFetch(routedFetch({ 'mail.activity.type/search_read': () => jsonResponse({ result: TYPES }) }));
    const rows = await mod.loadActivityTypes();
    assert.equal(rows.length, TYPES.length);
    const call = mod.__calls()[0];
    assert.match(call.url, /mail\.activity\.type\/search_read$/);
    assert.deepEqual(call.body.params.kwargs.fields, ['id', 'name']);
    // segunda llamada -> cache (no nuevo fetch)
    mod.__reset();
    await mod.loadActivityTypes();
    assert.equal(mod.__calls().length, 0, 'la 2da llamada debe servir del cache');
});

test('resolvedActivityTypes: mapea la whitelist a los ids reales por nombre (insensible a idioma)', () => {
    mod.__setTypes(TYPES);
    const r = mod.resolvedActivityTypes();
    const byLabel = {};
    r.forEach((x) => { byLabel[x.label] = x.id; });
    assert.equal(byLabel['Por hacer'], 4);
    assert.equal(byLabel['Llamada'], 2);
    assert.equal(byLabel['Email'], 1);      // matchea "Correo electrónico"
    assert.equal(byLabel['Reunión'], 3);
    // solo los 4 de la whitelist (no incluye "Otros")
    assert.equal(r.length, 4);
});

test('resolvedActivityTypes: sin tipos cargados -> [] (el modal valida el submit)', () => {
    mod.__setTypes(null);
    assert.deepEqual(mod.resolvedActivityTypes(), []);
    mod.__setTypes([]);
    assert.deepEqual(mod.resolvedActivityTypes(), []);
});

// =====================================================================================
section('v1.44 — render del modal/confirm (UI, sin browser)');
// =====================================================================================
// Segundo módulo: render del modal + confirm en aislamiento (esc real; icon/fechas stub).
//   Valida la estructura del form de [A] y del confirm de [B] que en index.html se ven con mocks.
const rmod = new Function(
    'function icon(n){ return "<svg data-icon=\\"" + (n||"") + "\\"></svg>"; }\n' +
    'function todayISO(){ return "2026-06-03"; }\n' +
    'function addDaysISO(n){ return "2026-06-0" + (3 + (n%6)); }\n' +
    'var _odooActivityTypes = null;\n' +
    'var state = { activityModal: null, activityConfirm: null };\n' +
    extractFn(SRC, 'esc') + '\n' +
    extractVar(SRC, 'ACTIVITY_TYPE_WHITELIST') + '\n' +
    extractFn(SRC, 'resolvedActivityTypes') + '\n' +
    extractFn(SRC, 'renderActivityModal') + '\n' +
    extractFn(SRC, 'renderActivityConfirm') + '\n' +
    'return { renderActivityModal, renderActivityConfirm,' +
    '  __set: (s, t) => { state = s; _odooActivityTypes = t; } };'
)();

test('renderActivityModal: form completo (tipo/resumen/nota/fecha) + principio rector + acciones', () => {
    rmod.__set({ activityModal: {
        leadName: 'Familia Test', typeId: 4, summary: 'Llamar', note: '', deadline: '2026-06-04', submitting: false, error: null
    } }, [{ id: 4, name: 'Por hacer' }, { id: 2, name: 'Llamada' }, { id: 1, name: 'Correo electrónico' }, { id: 3, name: 'Reunión' }]);
    const html = rmod.renderActivityModal();
    assert.match(html, /Nueva actividad/);
    assert.match(html, /No es un mensaje al lead/);           // principio rector
    assert.match(html, /data-input="activity-type"/);
    assert.match(html, /data-input="activity-summary"/);
    assert.match(html, /data-input="activity-note"/);
    assert.match(html, /data-input="activity-deadline"/);
    assert.match(html, /min="2026-06-03"/);                    // min = hoy
    assert.match(html, /data-action="activity-submit"/);
    assert.match(html, /data-action="activity-cancel"/);
    assert.match(html, /data-action="activity-bg"/);           // click fuera cierra
    assert.match(html, /Familia Test/);                        // lead fijo
    for (const lbl of ['Por hacer', 'Llamada', 'Email', 'Reunión']) assert.match(html, new RegExp(lbl));
});

test('renderActivityModal: submit deshabilitado si el resumen está vacío', () => {
    rmod.__set({ activityModal: { leadName: 'X', typeId: 4, summary: '', note: '', deadline: '2026-06-04', submitting: false, error: null } }, [{ id: 4, name: 'Por hacer' }]);
    assert.match(rmod.renderActivityModal(), /qida-activity-submit" data-action="activity-submit" disabled/);
});

test('renderActivityModal: muestra el error de Odoo si lo hay (sin JSON crudo)', () => {
    rmod.__set({ activityModal: { leadName: 'X', typeId: 4, summary: 'ok', note: '', deadline: '2026-06-04', submitting: false, error: 'Fecha inválida' } }, [{ id: 4, name: 'Por hacer' }]);
    assert.match(rmod.renderActivityModal(), /qida-actv-error[\s\S]*Fecha inválida/);
});

test('renderActivityConfirm: pregunta + preview + irreversible + acciones', () => {
    rmod.__set({ activityConfirm: { activityId: 8801, summary: 'Llamar a la familia', submitting: false } }, null);
    const html = rmod.renderActivityConfirm();
    assert.match(html, /¿Cerrar esta actividad\?/);
    assert.match(html, /No se puede deshacer/);
    assert.match(html, /Llamar a la familia/);                 // preview del summary
    assert.match(html, /data-action="activity-confirm-yes"/);
    assert.match(html, /data-action="activity-confirm-cancel"/);
});

// =====================================================================================
section('v1.44 — asserts a nivel source (botones gated por odooWriteEnabled)');
// =====================================================================================

test('renderActivityRow (tab dashboard) tiene "✓ Hecho" gated por state.odooWriteEnabled + id real', () => {
    const fn = extractFn(SRC, 'renderActivityRow');
    assert.match(fn, /data-action="activity-complete"/);
    assert.match(fn, /state\.odooWriteEnabled/);
    assert.match(fn, /isRealActivityId\(act\.id\)/);
    assert.match(fn, /qida-actv-badge-pending/);               // badge optimista
});

test('renderActivities (detalle) tiene "+ Nueva actividad" + "✓ Hecho" gated por odooWriteEnabled', () => {
    const fn = extractFn(SRC, 'renderActivities');
    assert.match(fn, /data-action="activity-new"/);
    assert.match(fn, /data-action="activity-complete"/);
    assert.match(fn, /state\.odooWriteEnabled/);
});

test('NO confundir niveles: el handler activity-complete NO toca markFollowupDone (v1.43, nivel lead)', () => {
    const fn = extractFn(SRC, 'handleActivityComplete');
    assert.match(fn, /completeOdooActivity/);
    assert.equal(/markFollowupDone|completedTodayIds|followup-actions/.test(fn), false);
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
