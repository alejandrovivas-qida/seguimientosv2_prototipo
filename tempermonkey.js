// ==UserScript==
// @name         Qida Assistant — Dev Loader
// @namespace    qida-seguimientos
// @version      1.1
// @description  Carga el widget de Qida en Odoo durante desarrollo
// @match        https://erp.qida.es/*
// @require      https://cdn.jsdelivr.net/npm/dompurify@3.2.0/dist/purify.min.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
  
    // ============ CONFIG (sincronizada con gtm-loader.html) ============
    var WIDGET_URL = 'https://6lrdpudff30zg6ys.public.blob.vercel-storage.com/qida-widget.v1.js';
  
    var WIDGET_CONFIG = {
      launcherLabel: 'Asistente',
      // QA v1.60.0: poné true para FORZAR el estado "WhatsApp desconectado" y ver los 3 placements
      //   (banner en el pane del detalle + banner en el header del dashboard + glyph en el badge) y el
      //   input deshabilitado, SIN tocar las cuentas reales de TimelinesAI ni el backend. Vive solo
      //   acá (en memoria del loader): NO es query param ni localStorage, así que no se propaga a una
      //   AF real ni sobrevive al cierre del browser. Dejar en false para uso normal.
      forceWhatsappDisconnected: false
    };
    // ============ /CONFIG ===========
  
    if (window.__QIDA_LOADER__) return;
    window.__QIDA_LOADER__ = true;
  
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = WIDGET_URL;
    script.crossOrigin = 'anonymous';
  
    script.onload = function () {
      if (window.QidaAssistant && typeof window.QidaAssistant.init === 'function') {
        try {
          window.QidaAssistant.init(WIDGET_CONFIG);
        } catch (e) {
          console.error('[QidaAssistant] init() threw:', e);
        }
      } else {
        console.error('[QidaAssistant] Script loaded but window.QidaAssistant is missing.');
      }
    };
  
    script.onerror = function () {
      console.error('[QidaAssistant] Failed to load widget from ' + WIDGET_URL);
    };
  
    (document.head || document.documentElement).appendChild(script);
  })();