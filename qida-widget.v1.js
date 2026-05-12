/**
 * ========================================
 * QIDA WIDGET v1.0.0
 * ========================================
 * Template base. Estructura tipo Intercom/Hotjar.
 * ES5 compatible (no const/let, no arrow fn, no async/await)
 * para máxima compatibilidad con sitios viejos del cliente.
 *
 * Uso desde GTM loader:
 *   window.QidaWidget.init({ autoOpen: false });
 *
 * API pública:
 *   QidaWidget.init(options)
 *   QidaWidget.openModal()
 *   QidaWidget.closeModal()
 *   QidaWidget.showScreen(screenId)
 *   QidaWidget.version
 */
(function (window, document) {
    'use strict';

    if (window.__QIDA_WIDGET_LOADED__) {
        console.warn('[QidaWidget] Already loaded, skipping...');
        return;
    }
    window.__QIDA_WIDGET_LOADED__ = true;

    var VERSION = '1.0.0';
    var CONFIG = null;

    // Logo Qida embebido (base64) — fuente única, sin dependencias externas
    var QIDA_LOGO = 'data:image/png;base64,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';

    function log(msg, data) {
        if (data !== undefined) console.log('[QidaWidget] ' + msg, data);
        else console.log('[QidaWidget] ' + msg);
    }

    // ========================================
    // STYLES
    // ========================================
    function injectStyles() {
        if (document.getElementById('qida-widget-styles')) return;
        var css =
            '.qida-badge{' +
                'position:fixed;bottom:24px;right:24px;z-index:2147483000;' +
                'width:60px;height:60px;border-radius:50%;cursor:pointer;' +
                'background:#fff;display:flex;align-items:center;justify-content:center;' +
                'box-shadow:0 8px 24px rgba(15,61,58,.18),0 2px 4px rgba(15,61,58,.08);' +
                'transition:transform .18s ease,box-shadow .18s ease;' +
                'user-select:none;-webkit-tap-highlight-color:transparent;' +
            '}' +
            '.qida-badge:hover{' +
                'transform:translateY(-2px);' +
                'box-shadow:0 14px 32px rgba(15,61,58,.22),0 4px 8px rgba(15,61,58,.1);' +
            '}' +
            '.qida-badge img{width:36px;height:auto;display:block;pointer-events:none;}' +
            '.qida-modal{' +
                'position:fixed;inset:0;z-index:2147483001;display:none;' +
                'align-items:center;justify-content:center;' +
                'background:rgba(15,61,58,.45);backdrop-filter:blur(4px);' +
                '-webkit-backdrop-filter:blur(4px);' +
                'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
            '}' +
            '.qida-modal.active{display:flex;}' +
            '.qida-modal-card{' +
                'background:#fff;border-radius:16px;padding:48px 32px;' +
                'min-width:320px;max-width:480px;width:90%;' +
                'box-shadow:0 24px 60px rgba(0,0,0,.25);' +
                'position:relative;text-align:center;' +
            '}' +
            '.qida-modal-close{' +
                'position:absolute;top:12px;right:12px;width:32px;height:32px;' +
                'border:0;background:transparent;cursor:pointer;color:#94a3b8;' +
                'font-size:24px;line-height:1;border-radius:50%;' +
                'display:flex;align-items:center;justify-content:center;' +
            '}' +
            '.qida-modal-close:hover{background:#f1f5f9;color:#0f172a;}' +
            '.qida-modal-body{' +
                'font-size:48px;font-weight:700;color:#0f3d3a;' +
                'letter-spacing:-0.02em;padding:24px 0;' +
            '}';
        var style = document.createElement('style');
        style.id = 'qida-widget-styles';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    // ========================================
    // BADGE
    // ========================================
    function injectBadge() {
        if (document.querySelector('.qida-badge')) return;
        var badge = document.createElement('div');
        badge.className = 'qida-badge';
        badge.setAttribute('role', 'button');
        badge.setAttribute('aria-label', 'Abrir Qida');
        badge.innerHTML = '<img src="' + QIDA_LOGO + '" alt="Qida">';
        badge.onclick = function () { api.openModal(); };
        document.body.appendChild(badge);
    }

    // ========================================
    // MODAL
    // ========================================
    function injectModal() {
        if (document.querySelector('.qida-modal')) return;
        var modal = document.createElement('div');
        modal.className = 'qida-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML =
            '<div class="qida-modal-card">' +
                '<button class="qida-modal-close" aria-label="Cerrar">&times;</button>' +
                '<div class="qida-modal-body">TODO</div>' +
            '</div>';

        // Click en backdrop cierra
        modal.onclick = function (e) {
            if (e.target === modal) api.closeModal();
        };
        // Click en X cierra
        modal.querySelector('.qida-modal-close').onclick = function () {
            api.closeModal();
        };

        document.body.appendChild(modal);
    }

    // ========================================
    // MOUNT
    // ========================================
    function mountWhenReady() {
        if (document.body) {
            injectStyles();
            injectBadge();
            injectModal();
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                injectStyles();
                injectBadge();
                injectModal();
            });
        }
    }

    // ESC cierra modal
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            var modal = document.querySelector('.qida-modal');
            if (modal && modal.className.indexOf('active') !== -1) {
                api.closeModal();
            }
        }
    });

    // ========================================
    // PUBLIC API
    // ========================================
    var api = {
        init: function (options) {
            CONFIG = options || {};
            log('init() called', CONFIG);
            mountWhenReady();
            if (CONFIG.autoOpen) {
                var delay = CONFIG.autoOpenDelay || 0;
                setTimeout(function () { api.openModal(); }, delay);
            }
            return api;
        },
        openModal: function () {
            var modal = document.querySelector('.qida-modal');
            if (modal) modal.className = 'qida-modal active';
            log('openModal()');
        },
        closeModal: function () {
            var modal = document.querySelector('.qida-modal');
            if (modal) modal.className = 'qida-modal';
            log('closeModal()');
        },
        showScreen: function (screenId) {
            log('showScreen(' + screenId + ')');
            // Pendiente: routing entre pantallas internas del modal
        },
        version: VERSION
    };

    window.QidaWidget = api;
    log('Widget loaded (v' + VERSION + '). Call QidaWidget.init() to start.');

})(window, document);
