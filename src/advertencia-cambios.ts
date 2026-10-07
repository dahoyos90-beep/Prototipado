/**
 * src/advertencia-cambios.ts
 * 
 * Lógica genérica para detectar y advertir sobre cambios sin guardar.
 * Se utiliza en todos los módulos del sistema para evitar la pérdida de
 * información cuando el usuario intenta salir de un formulario modificado.
 * 
 * Propósito:
 * - Detectar si hay cambios sin guardar (a través de session-manager.ts).
 * - Mostrar una advertencia antes de: cambiar de pestaña, cambiar de empresa,
 *   recargar la página, cerrar la pestaña, cerrar sesión o salir del formulario.
 * - Delegar la presentación visual a un modal personalizado (callback).
 * 
 * @version 1.0.0
 * @since 2026-09-10
 */

import {
    marcarCambiosSinGuardar,
    limpiarCambiosSinGuardar,
    hayCambiosSinGuardar
} from './session-manager.js';

// ================================================================
// TIPOS
// ================================================================

/**
 * Callback para mostrar el modal de advertencia.
 * El modal debe tener dos botones: "Salir sin guardar" y "Cancelar".
 * 
 * @param alConfirmar - Función a ejecutar si el usuario confirma salir sin guardar.
 * @param alCancelar - Función a ejecutar si el usuario cancela y decide quedarse.
 */
export type MostrarModalAdvertencia = (
    alConfirmar: () => void,
    alCancelar: () => void
) => void;

// ================================================================
// ESTADO INTERNO
// ================================================================

/**
 * Referencia al callback que muestra el modal.
 * Se establece una sola vez al inicializar la app (app.ts).
 */
let mostrarModal: MostrarModalAdvertencia | null = null;

// ================================================================
// FUNCIONES DE CONFIGURACIÓN
// ================================================================

/**
 * Establece el callback que muestra el modal personalizado.
 * Debe llamarse una sola vez al inicializar la app.
 * 
 * @param callback - Función que muestra el modal.
 */
export function configurarModalAdvertencia(callback: MostrarModalAdvertencia): void {
    mostrarModal = callback;
    console.info('✅ Modal de advertencia configurado.');
}

// ================================================================
// FUNCIONES DE MARCADO
// ================================================================

/**
 * Marca la sesión como "con cambios sin guardar".
 * Debe llamarse cuando el usuario modifique un formulario.
 */
export function marcarModificado(): void {
    marcarCambiosSinGuardar();
}

/**
 * Limpia el estado de "cambios sin guardar".
 * Debe llamarse después de guardar o descartar cambios.
 */
export function limpiarModificado(): void {
    limpiarCambiosSinGuardar();
}

/**
 * Verifica si hay cambios sin guardar.
 * 
 * @returns {boolean} - true si hay cambios sin guardar.
 */
export function hayModificaciones(): boolean {
    return hayCambiosSinGuardar();
}

// ================================================================
// FUNCIÓN PRINCIPAL DE ADVERTENCIA
// ================================================================

/**
 * Ejecuta una acción, pero antes verifica si hay cambios sin guardar.
 * Si los hay, muestra el modal de advertencia. Si no, ejecuta la acción.
 * 
 * @param accion - Acción a ejecutar si no hay cambios o si el usuario confirma.
 * @param alCancelar - (Opcional) Acción a ejecutar si el usuario cancela.
 */
export function ejecutarConAdvertencia(
    accion: () => void,
    alCancelar?: () => void
): void {
    // Si no hay cambios, ejecuta la acción directamente
    if (!hayCambiosSinGuardar()) {
        accion();
        return;
    }

    // Hay cambios: mostrar modal
    if (!mostrarModal) {
        // Si no hay modal configurado, usar window.confirm como fallback
        console.warn('⚠️ Modal de advertencia no configurado. Usando window.confirm como fallback.');
        const confirmado = window.confirm(
            'No ha guardado la información. ¿Desea salir sin guardar?'
        );
        if (confirmado) {
            limpiarCambiosSinGuardar();
            accion();
        } else {
            if (alCancelar) alCancelar();
        }
        return;
    }

    // Mostrar el modal personalizado
    mostrarModal(
        () => {
            // El usuario confirmó salir sin guardar
            limpiarCambiosSinGuardar();
            accion();
        },
        () => {
            // El usuario canceló (decidió quedarse)
            if (alCancelar) alCancelar();
        }
    );
}

// ================================================================
// CONFIGURACIÓN DE EVENTOS GLOBALES
// ================================================================

/**
 * Configura el evento beforeunload para advertir al usuario
 * antes de recargar o cerrar la pestaña del navegador.
 * 
 * Nota: El navegador no permite personalizar el mensaje; solo
 * muestra un mensaje genérico.
 */
export function configurarBeforeUnload(): void {
    window.addEventListener('beforeunload', (event) => {
        if (hayCambiosSinGuardar()) {
            // Requerido por navegadores modernos
            event.preventDefault();
            // Compatibilidad con navegadores antiguos
            event.returnValue = '';
        }
    });
}

/**
 * Inicializa la configuración global de la advertencia de cambios.
 * Debe llamarse al iniciar la app.
 * 
 * @param callback - Función que muestra el modal personalizado.
 */
export function inicializarAdvertencia(callback: MostrarModalAdvertencia): void {
    configurarModalAdvertencia(callback);
    configurarBeforeUnload();
    console.info('✅ Sistema de advertencia de cambios inicializado.');
}