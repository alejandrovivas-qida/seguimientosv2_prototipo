/**
 * Harness Node para audios WhatsApp. Extrae funciones puras del widget real para validar:
 * - attachment_mimetype -> attachmentMimetype
 * - audio recibido con URL renderiza <audio controls preload="metadata">
 * - audio sin URL queda como fallback no reproducible
 * - adjuntos no-audio mantienen paperclip
 * - MediaRecorder elige ogg/opus -> ogg -> mpeg y deshabilita si no hay formato compatible
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

function extractArrayVar(src, name) {
    const re = new RegExp('var\\s+' + name + '\\s*=\\s*\\[[\\s\\S]*?\\];');
    const m = src.match(re);
    assert.ok(m, 'no se encontro var ' + name);
    return m[0];
}

function buildMod(envSrc = '') {
    return new Function(
        envSrc + '\n' +
        'function icon(name, size){ return "<svg data-icon=\\"" + (name || "") + "\\"></svg>"; }\n' +
        extractFn(SRC, 'esc') + '\n' +
        extractFn(SRC, 'formatConvTime') + '\n' +
        extractFn(SRC, 'normalizeConversation') + '\n' +
        extractArrayVar(SRC, 'WA_RECORD_MIME_TYPES') + '\n' +
        extractFn(SRC, 'audioBaseMime') + '\n' +
        extractFn(SRC, 'chooseWaRecordMimeType') + '\n' +
        extractFn(SRC, 'waRecordSupport') + '\n' +
        extractFn(SRC, 'voiceFilenameForMime') + '\n' +
        extractFn(SRC, 'isAudioAttachment') + '\n' +
        extractFn(SRC, 'renderMessageAttachment') + '\n' +
        'return { normalizeConversation, chooseWaRecordMimeType, waRecordSupport, voiceFilenameForMime, isAudioAttachment, renderMessageAttachment };'
    )();
}

const mod = buildMod();

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  OK ' + name); }
    catch (e) { console.error('  FAIL ' + name + '\n    ' + (e && e.message)); process.exitCode = 1; }
}

console.log('whatsapp-audio');

test('normalizeConversation mapea attachment_mimetype a attachmentMimetype', () => {
    const out = mod.normalizeConversation({
        messages: [{
            uid: 'm1',
            timestamp: '2026-06-03T09:00:00Z',
            from_me: false,
            text: '',
            has_attachment: true,
            attachment_filename: 'nota.oga',
            attachment_url: 'https://blob/audio.oga',
            attachment_mimetype: 'audio/ogg',
            status: 'delivered'
        }]
    });
    assert.equal(out.length, 1);
    assert.equal(out[0].attachmentMimetype, 'audio/ogg');
});

test('audio con URL renderiza player nativo', () => {
    const html = mod.renderMessageAttachment({
        hasAttachment: true,
        attachmentName: 'nota.oga',
        attachmentUrl: 'https://blob/audio.oga',
        attachmentMimetype: 'audio/ogg'
    });
    assert.match(html, /<audio /);
    assert.match(html, /controls/);
    assert.match(html, /preload="metadata"/);
    assert.match(html, /src="https:\/\/blob\/audio\.oga"/);
});

test('audio sin URL renderiza fallback no reproducible', () => {
    const html = mod.renderMessageAttachment({
        hasAttachment: true,
        attachmentName: 'nota.oga',
        attachmentUrl: null,
        attachmentMimetype: 'audio/ogg'
    });
    assert.equal(/<audio /.test(html), false);
    assert.match(html, /Audio no disponible/);
    assert.match(html, /data-icon="paperclip"/);
});

test('adjunto no-audio mantiene paperclip', () => {
    const html = mod.renderMessageAttachment({
        hasAttachment: true,
        attachmentName: 'contrato.pdf',
        attachmentUrl: 'https://blob/contrato.pdf',
        attachmentMimetype: 'application/pdf'
    });
    assert.equal(/<audio /.test(html), false);
    assert.match(html, /contrato\.pdf/);
    assert.match(html, /data-icon="paperclip"/);
});

test('chooseWaRecordMimeType respeta el orden ogg opus -> ogg -> mpeg', () => {
    const seen = [];
    const Ctor = {
        isTypeSupported(type) {
            seen.push(type);
            return type === 'audio/ogg';
        }
    };
    assert.equal(mod.chooseWaRecordMimeType(Ctor), 'audio/ogg');
    assert.deepEqual(seen, ['audio/ogg;codecs=opus', 'audio/ogg']);
});

test('waRecordSupport deshabilita si no hay formato compatible', () => {
    const unsupported = buildMod(
        'var navigator = { mediaDevices: { getUserMedia: function () {} } };\n' +
        'var window = { MediaRecorder: { isTypeSupported: function () { return false; } } };'
    );
    const support = unsupported.waRecordSupport();
    assert.equal(support.ok, false);
    assert.match(support.reason, /ogg\/oga\/mp3/);
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', con fallos' : ''));
