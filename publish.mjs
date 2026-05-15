/**
 * Publica qida-widget.v1.js al Blob Store publico de Vercel.
 *
 * Modos:
 *   npm run publish:widget   -> publica una vez y termina
 *   npm run publish:watch    -> publica una vez y se queda escuchando
 *                               cambios en el archivo. Cada save -> re-publish.
 *
 * Requiere BLOB_READ_WRITE_TOKEN en .env.local.
 */

import { put } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const FILE_PATH = resolve('./qida-widget.v1.js');
const BLOB_PATHNAME = 'qida-widget.v1.js';
const DEBOUNCE_MS = 300;

function ts() {
    return new Date().toLocaleTimeString('es-AR', { hour12: false });
}

async function publishOnce() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('[publish] Falta BLOB_READ_WRITE_TOKEN en .env.local.');
        process.exit(1);
    }

    const content = await readFile(FILE_PATH);
    const blob = await put(BLOB_PATHNAME, content, {
        access: 'public',
        contentType: 'application/javascript; charset=utf-8',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
    });

    console.log(
        '[publish] ' + ts() + '  ' + content.byteLength + ' bytes  ->  ' + blob.url
    );
}

async function main() {
    const isWatch = process.argv.includes('--watch');

    await publishOnce();

    if (!isWatch) return;

    console.log('[publish] Watch activo sobre ' + FILE_PATH + '. Ctrl+C para salir.');

    let timer = null;
    let publishing = false;

    const watcher = watch(dirname(FILE_PATH), { persistent: true });

    watcher.on('change', (_eventType, filename) => {
        if (!filename) return;
        if (basename(filename) !== basename(FILE_PATH)) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
            if (publishing) return;
            publishing = true;
            try {
                await publishOnce();
            } catch (err) {
                console.error('[publish] ' + ts() + '  ERROR  ' + (err && err.message ? err.message : err));
            } finally {
                publishing = false;
            }
        }, DEBOUNCE_MS);
    });

    watcher.on('error', (err) => {
        console.error('[publish] Watcher error:', err);
        process.exit(1);
    });
}

main().catch((err) => {
    console.error('[publish] Fatal:', err);
    process.exit(1);
});
