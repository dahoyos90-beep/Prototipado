/**
 * src/interfaces/modal-advertencia.ts
 * 
 * Lógica del modal de advertencia de cambios sin guardar.
 * Se conecta con advertencia-cambios.ts mediante configurarModalAdvertencia().
 * 
 * Propósito:
 * - Cargar dinámicamente el HTML del modal (modal-advertencia.html).
 * - Mostrar y ocultar el modal.
 * - Gestionar los callbacks de confirmación y cancelación.
 * 
 * @version 1.0.0
 * @since 2026-09-10
 */

// ================================================================
// CONSTANTES
// ================================================================

/** Ruta del fragmento HTML del modal (raíz del proyecto) */
const MODAL_HTML_PATH = 'modal-advertencia.html';

/** ID del contenedor del modal en el DOM */
const MODAL_ID = 'modal-advertencia';

// ================================================================
// ESTADO INTERNO
// ================================================================

/** Indica si el HTML del modal ya fue inyectado en el DOM */
let modalCargado = false;

/** Callback actual de confirmación (salir sin guardar) */
let callbackConfirmar: (() => void) | null = null;

/** Callback actual de cancelación (quedarse) */
let callbackCancelar: (() => void) | null = null;

// ================================================================
// CARGA DEL HTML
// ================================================================

/**
 * Carga el HTML del modal desde el archivo modal-advertencia.html
 * y lo inyecta en el <body> del documento. Solo se ejecuta una vez.
 * 
 * @returns {Promise<boolean>} - true si el modal se cargó correctamente.
 */
async function cargarModalHTML(): Promise<boolean> {
    if (modalCargado) return true;

    try {
        const response = await fetch(MODAL_HTML_PATH);
        if (!response.ok) {
            console.error(`modal-advertencia: Error ${response.status} al cargar ${MODAL_HTML_PATH}`);
            return false;
        }

        const html = await response.text();
        const contenedor = document.createElement('div');
        contenedor.innerHTML = html;
        document.body.appendChild(contenedor);

        modalCargado = true;
        console.info('✅ Modal de advertencia cargado en el DOM.');
        return true;
    } catch (error) {
        console.error('modal-advertencia: Error al cargar el HTML del modal:', error);
        return false;
    }
}

// ================================================================
// APERTURA Y CIERRE DEL MODAL
// ================================================================

/**
 * Abre el modal (quita la clase .hidden).
 */
function abrirModal(): void {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
        modal.classList.remove('hidden');
        // Enfocar el botón Cancelar por accesibilidad
        const btnCancelar = document.getElementById('modal-advertencia-cancelar');
        if (btnCancelar) {
            (btnCancelar as HTMLButtonElement).focus();
        }
    }
}

/**
 * Cierra el modal (agrega la clase .hidden).
 */
function cerrarModal(): void {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// ================================================================
// CONFIGURACIÓN DE EVENTOS
// ================================================================

/**
 * Configura los eventos del modal: botones y tecla Escape.
 * Se llama cada vez que se abre el modal para asegurar que los
 * callbacks actuales estén vinculados.
 */
function configurarEventos(): void {
    const btnConfirmar = document.getElementById('modal-advertencia-confirmar');
    const btnCancelar = document.getElementById('modal-advertencia-cancelar');

    // Remover listeners previos (clonando los botones)
    if (btnConfirmar) {
        const nuevo = btnConfirmar.cloneNode(true) as HTMLButtonElement;
        btnConfirmar.parentNode?.replaceChild(nuevo, btnConfirmar);
        nuevo.addEventListener('click', () => {
            cerrarModal();
            if (callbackConfirmar) callbackConfirmar();
        });
    }

    if (btnCancelar) {
        const nuevo = btnCancelar.cloneNode(true) as HTMLButtonElement;
        btnCancelar.parentNode?.replaceChild(nuevo, btnCancelar);
        nuevo.addEventListener('click', () => {
            cerrarModal();
            if (callbackCancelar) callbackCancelar();
        });
    }

    // Cerrar con tecla Escape (equivale a Cancelar)
    document.addEventListener('keydown', manejarEscape);
}

/**
 * Maneja la tecla Escape para cerrar el modal como "Cancelar".
 * 
 * @param event - Evento de teclado.
 */
function manejarEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
        const modal = document.getElementById(MODAL_ID);
        if (modal && !modal.classList.contains('hidden')) {
            cerrarModal();
            document.removeEventListener('keydown', manejarEscape);
            if (callbackCancelar) callbackCancelar();
        }
    }
}

// ================================================================
// FUNCIÓN PRINCIPAL (llamada desde advertencia-cambios.ts)
// ================================================================

/**
 * Muestra el modal de advertencia con los callbacks proporcionados.
 * 
 * @param alConfirmar - Función a ejecutar si el usuario confirma salir sin guardar.
 * @param alCancelar - Función a ejecutar si el usuario cancela y decide quedarse.
 */
export async function mostrarModalAdvertencia(
    alConfirmar: () => void,
    alCancelar: () => void
): Promise<void> {
    // Guardar callbacks actuales
    callbackConfirmar = alConfirmar;
    callbackCancelar = alCancelar;

    // Asegurar que el HTML esté cargado
    const cargado = await cargarModalHTML();
    if (!cargado) {
        // Si falla la carga del modal, ejecutar fallback con window.confirm
        console.warn('⚠️ No se pudo cargar el modal. Usando window.confirm como fallback.');
        const confirmado = window.confirm(
            'No ha guardado la información. ¿Desea salir sin guardar?'
        );
        if (confirmado) {
            alConfirmar();
        } else {
            alCancelar();
        }
        return;
    }

    // Configurar eventos de los botones con los callbacks actuales
    configurarEventos();

    // Abrir el modal
    abrirModal();
}