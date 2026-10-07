/**
 * modules/M17-Plan-Trabajo-Capacitacion/plan-trabajo-capacitacion.ts
 * 
 * Wrapper del módulo M17 – Planes.
 * Carga dinámicamente uno de los dos submódulos:
 * - plan-capacitacion
 * - plan-trabajo
 * 
 * Al hacer clic en cada pestaña, se carga el HTML y el TS del submódulo
 * correspondiente en el contenedor #wrapper-contenido-planes.
 * 
 * @version 1.0.0
 * @since 2026-09-28
 */

import { qs } from '../../src/utils.js';

// ================================================================
// CONSTANTES
// ================================================================

/** Base de la ruta de los HTML de los submódulos (desde la raíz del servidor) */
const SUBMODULOS_HTML_BASE = 'modules/M17-Plan-Trabajo-Capacitacion/';

/** Prefijo de import dinámico (relativo al JS compilado del wrapper) */
const SUBMODULOS_JS_BASE = './';

/** Submódulo por defecto */
const SUBMODULO_DEFECTO = 'plan-capacitacion';

// ================================================================
// INICIALIZACIÓN DEL WRAPPER
// ================================================================

export function init(contenedor: HTMLElement): void {
    // Cargar CSS del wrapper
    const cssId = 'modulo-planes-wrapper-css';
    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'modules/M17-Plan-Trabajo-Capacitacion/plan-trabajo-capacitacion.css';
        document.head.appendChild(link);
    }

    // ================================================================
    // REFERENCIAS AL DOM
    // ================================================================

    const tabButtons = contenedor.querySelectorAll('.tab-button') as NodeListOf<HTMLButtonElement>;
    const wrapperContenido = qs('#wrapper-contenido-planes') as HTMLElement;

    if (!tabButtons.length || !wrapperContenido) {
        console.error('❌ M17 Wrapper: No se encontraron las pestañas o el contenedor.');
        return;
    }

    // ================================================================
    // ESTADO INTERNO
    // ================================================================

    let submoduloActual: string = '';

    // ================================================================
    // CARGA DINÁMICA DE SUBMÓDULOS
    // ================================================================

    /**
     * Carga un submódulo (HTML + TS) en el contenedor del wrapper.
     * 
     * @param submoduloId - ID del submódulo ("plan-capacitacion" | "plan-trabajo").
     */
    async function cargarSubmodulo(submoduloId: string): Promise<void> {
        if (submoduloActual === submoduloId) return;

        submoduloActual = submoduloId;

        // Mostrar indicador de carga
        wrapperContenido.innerHTML = `
            <div class="loading-spinner">Cargando submódulo...</div>
        `;

        try {
            // 1. Cargar el HTML del submódulo
            const htmlPath = `${SUBMODULOS_HTML_BASE}${submoduloId}.html`;
            const response = await fetch(htmlPath);

            if (!response.ok) {
                throw new Error(`No se pudo cargar el HTML: ${htmlPath} (${response.status})`);
            }

            const htmlContent = await response.text();
            wrapperContenido.innerHTML = htmlContent;

            // 2. Cargar dinámicamente el TS del submódulo
            const jsPath = `${SUBMODULOS_JS_BASE}${submoduloId}.js`;
            const moduleExports = await import(jsPath);

            if (moduleExports && typeof moduleExports.init === 'function') {
                moduleExports.init(wrapperContenido);
                console.info(`✅ Submódulo '${submoduloId}' inicializado correctamente.`);
            } else {
                console.warn(`⚠️ El submódulo '${submoduloId}' no exporta 'init(contenedor)'.`);
            }

        } catch (error) {
            console.error(`Error al cargar el submódulo '${submoduloId}':`, error);
            wrapperContenido.innerHTML = `
                <div class="error-message">
                    <strong>⚠️ Error al cargar el submódulo: ${submoduloId}</strong>
                    <p>Verifica la consola y ejecuta <code>npm run build</code>.</p>
                </div>
            `;
        }
    }

    // ================================================================
    // EVENTOS DE PESTAÑAS
    // ================================================================

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            if (!tabId) return;

            // Actualizar estado visual de las pestañas
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Cargar el submódulo correspondiente
            cargarSubmodulo(tabId);
        });
    });

    // ================================================================
    // INICIALIZACIÓN: cargar el submódulo por defecto
    // ================================================================

    cargarSubmodulo(SUBMODULO_DEFECTO);

    console.info('✅ Módulo M17 – Wrapper de Planes inicializado.');
}