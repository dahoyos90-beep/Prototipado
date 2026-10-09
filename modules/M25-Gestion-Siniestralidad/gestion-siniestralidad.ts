/**
 * modules/M25-Gestion-Siniestralidad/gestion-siniestralidad.ts
 * 
 * Lógica del módulo principal M25 - Gestión de Siniestralidad.
 * 
 * Responsabilidades:
 * - Cargar el CSS del módulo dinámicamente.
 * - Verificar que exista una empresa activa en la sesión (patrón M24).
 * - Enganchar los 2 botones de acceso a los HTMLs independientes:
 *     • estadistica-accidentalidad.html
 *     • registro-accidentes.html
 * - Pasar el NIT de la empresa activa a los HTMLs vía localStorage.
 * 
 * Este módulo NO abre las vistas en el mismo SPA. Cada vista vive en su
 * propio HTML que se abre en una pestaña nueva, siguiendo el patrón de
 * M13 (matriz-detalle) y M21 (convivencia-detalle).
 * 
 * Basado en:
 * - Resolución 0312 de 2019 (indicadores mínimos del SG-SST)
 * - NTC 3701 (registro de accidentes)
 * - Ley 2101 de 2021 (jornada laboral)
 * - Decreto 1072 de 2015 (evaluación de indicadores)
 * 
 * @version 1.0.2
 *  - Alineado con patrón M24: se elimina el chequeo redundante contra
 *    storageEmpresas (que buscaba por ID cuando el NIT es el identificador
 *    real). Solo se verifica que la sesión tenga empresa activa.
 * 
 * @version 1.0.1
 *  - Quitado export { qs } redundante y el import de qs (no se usaban).
 * 
 * @version 1.0.0
 * @since 2026-10-09
 */

import { qsTipo } from '../../src/utils.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';

// ================================================================
// CONSTANTES
// ================================================================

/** ID del <link> del CSS del módulo (para no duplicarlo). */
const CSS_LINK_ID = 'modulo-siniestralidad-css';

/** Ruta del CSS del módulo. */
const CSS_HREF = 'modules/M25-Gestion-Siniestralidad/gestion-siniestralidad.css';

/** Ruta del HTML de Estadística de Accidentalidad. */
const HTML_ESTADISTICA = 'modules/M25-Gestion-Siniestralidad/estadistica-accidentalidad.html';

/** Ruta del HTML de Registro de Accidentes. */
const HTML_REGISTRO = 'modules/M25-Gestion-Siniestralidad/registro-accidentes.html';

/** Clave de localStorage para pasar la empresa activa a los HTMLs. */
const LS_EMPRESA_NIT = 'siniestralidadEmpresaNit';

// ================================================================
// INICIALIZACIÓN
// ================================================================

/**
 * Punto de entrada del módulo (lo llama app.ts).
 * 
 * @param contenedor - Contenedor donde se inyectó el HTML del módulo.
 */
export function init(contenedor: HTMLElement): void {
    console.info('🚨 M25: Inicializando módulo de Siniestralidad...');

    // 1. Cargar CSS del módulo
    cargarCSSModulo();

    // 2. Verificar empresa activa en la sesión (patrón M24)
    const empresaActivaNit = obtenerEmpresaActiva() || '';
    if (!empresaActivaNit) {
        console.warn('⚠️ M25: No hay empresa activa en la sesión.');
        return;
    }

    // 3. Referencias al DOM
    const btnEstadistica = qsTipo<HTMLButtonElement>('#btn-abrir-estadistica', contenedor);
    const btnRegistro = qsTipo<HTMLButtonElement>('#btn-abrir-registro', contenedor);

    if (!btnEstadistica || !btnRegistro) {
        console.error('❌ M25: No se encontraron los botones de acceso.');
        return;
    }

    // 4. Guardar el NIT en localStorage para que los HTMLs independientes
    //    lo lean al inicializar (patrón M13/M21).
    localStorage.setItem(LS_EMPRESA_NIT, empresaActivaNit);

    // 5. Enganchar botones
    btnEstadistica.addEventListener('click', () => abrirVista(HTML_ESTADISTICA, 'Estadística'));
    btnRegistro.addEventListener('click', () => abrirVista(HTML_REGISTRO, 'Registro'));

    console.info(`✅ M25: Módulo listo para la empresa ${empresaActivaNit}.`);
}

// ================================================================
// HELPERS
// ================================================================

/**
 * Carga el CSS del módulo dinámicamente si no está ya en el <head>.
 */
function cargarCSSModulo(): void {
    if (document.getElementById(CSS_LINK_ID)) return;

    const link = document.createElement('link');
    link.id = CSS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    document.head.appendChild(link);

    console.info('M25: CSS del módulo cargado.');
}

/**
 * Abre una vista en pestaña nueva.
 * 
 * Antes de abrir, refresca el NIT en localStorage por si cambió.
 * 
 * @param url - Ruta del HTML a abrir.
 * @param nombre - Nombre de la vista (para el log).
 */
function abrirVista(url: string, nombre: string): void {
    const nit = obtenerEmpresaActiva() || '';
    if (!nit) {
        console.warn('M25: No hay empresa activa, no se puede abrir la vista.');
        return;
    }

    localStorage.setItem(LS_EMPRESA_NIT, nit);
    window.open(url, '_blank');
    console.info(`M25: Abriendo vista "${nombre}" para la empresa ${nit}.`);
}