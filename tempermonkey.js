// ==UserScript==
// @name         Qida Assistant — Dev Loader
// @namespace    qida-seguimientos
// @version      1.0
// @description  Carga el widget de Qida en Odoo durante desarrollo
// @match        https://erp.qida.es/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
  
    // ============ CONFIG (sincronizada con gtm-loader.html) ============
    var WIDGET_URL = 'https://6lrdpudff30zg6ys.public.blob.vercel-storage.com/qida-widget.v1.js';
  
    var WIDGET_CONFIG = {
      launcherLabel: 'Asistente'
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