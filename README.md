# Qida Assistant — Seguimientos V2 (prototipo)

Widget Qida (`qida-widget.vN.js`) servido desde Vercel Blob y cargado en sitios externos vía un loader liviano (GTM en producción, Tampermonkey en dev).

## Archivos del repo

| Archivo | Rol |
| --- | --- |
| `qida-widget.v1.js` | El widget. Autocontenido (ES5, sin dependencias, logo embebido en base64). Vive en Vercel Blob. |
| `gtm-loader.html` | Snippet que va dentro de un tag **Custom HTML** de Google Tag Manager. Inyecta el widget desde el Blob y lo inicializa. |
| `tempermonkey.js` | Userscript de Tampermonkey con la misma lógica que el loader de GTM. Scoped a `https://erp.qida.es/*`. Sirve para iterar en Odoo real sin depender de GTM. |
| `index.html` | Página de prueba local. Carga el `qida-widget.v1.js` del repo directo (sin pasar por el Blob). |

## URL actual del widget

```
https://6lrdpudff30zg6ys.public.blob.vercel-storage.com/qida-widget.v1.js
```

Sirve `text/javascript`, acceso público.

## Workflow de deploy (manual)

Cada vez que querés publicar una versión nueva del widget:

1. **Editar y probar local**: tocar `qida-widget.v1.js`, validar abriendo `index.html` (o probarlo en Odoo real con el userscript de Tampermonkey instalado).
2. **Bumpear filename si hay cambios importantes**: renombrar a `qida-widget.v2.js` (o `v1.1.js`, según convención). Versionar por filename evita problemas de caché del CDN (Vercel Blob cachea público ~1 mes por default).
3. **Subir al Blob**: Vercel dashboard → Storage → `google-tag-manger` → tab **Browser** → botón **Upload** (o drag-and-drop). Si reusás filename, confirmar reemplazo.
4. **Bumpear `WIDGET_URL`**: actualizar la constante en `gtm-loader.html` **y** en `tempermonkey.js`. Deben quedar sincronizados.
5. **GTM**: si cambió `gtm-loader.html`, pegar la versión nueva en el tag Custom HTML y republicar el container.
6. **Tampermonkey**: si cambió `tempermonkey.js`, pegar la versión nueva en el userscript en el browser.

## Decisión arquitectónica pendiente

La decisión final GTM vs iframe se cierra el miércoles con el equipo de Odoo de Qida. Mientras tanto, el userscript de Tampermonkey reemplaza a GTM en el browser del dev para poder iterar el widget sobre `erp.qida.es` sin esperar.
