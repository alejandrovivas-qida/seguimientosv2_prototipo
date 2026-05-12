/**
 * Sube qida-widget.v1.js al Blob Store público de Vercel.
 *
 * Requisitos:
 *   1. npm install
 *   2. Crear un archivo .env.local con:
 *        BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx
 *      (el token lo sacás del dashboard del Blob Store en Vercel)
 *
 * Uso:
 *   npm run publish:widget
 */

import { put } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import { config } from 'dotenv';

config({ path: '.env.local' });

const FILE_PATH = './qida-widget.v1.js';
const BLOB_PATHNAME = 'qida-widget.v1.js';

async function main() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('\n[publish] Falta BLOB_READ_WRITE_TOKEN.');
        console.error('         Creá un archivo .env.local con:');
        console.error('         BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx\n');
        process.exit(1);
    }

    console.log('[publish] Leyendo ' + FILE_PATH + '...');
    const content = await readFile(FILE_PATH);
    console.log('[publish] Tamaño: ' + content.byteLength + ' bytes');

    console.log('[publish] Subiendo a Vercel Blob (' + BLOB_PATHNAME + ')...');
    const blob = await put(BLOB_PATHNAME, content, {
        access: 'public',
        contentType: 'application/javascript; charset=utf-8',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
    });

    console.log('\n[publish] OK. Widget publicado:');
    console.log('  URL:      ' + blob.url);
    console.log('  Pathname: ' + blob.pathname);
    console.log('\nPegá esta URL en tu loader de GTM.\n');
}

main().catch((err) => {
    console.error('\n[publish] Error subiendo el widget:');
    console.error(err);
    process.exit(1);
});
