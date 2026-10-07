/**
 * src/notificaciones-ui.ts
 * 
 * Interfaz de usuario del sistema de notificaciones.
 * Se encarga de:
 * - Inyectar el HTML del sistema de notificaciones (campana, panel, toasts).
 * - Renderizar la lista de notificaciones en el panel.
 * - Actualizar el contador de no leídas.
 * - Mostrar toasts emergentes.
 * 
 * Propósito:
 * - Separar la lógica (notificaciones.ts) de la presentación visual (este archivo).
 * - Ser llamada desde app.ts al inicializar la aplicación.
 * 
 * @version 1.1.0 (campana movida al área de usuario)
 * @since 2026-09-10
 */

import {
    obtenerNotificaciones,
    obtenerNotificacionesNoLeidas,
    contarNotificacionesNoLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    verificarAlertasEliminacion
} from './notificaciones.js';
import { formatearFecha, escaparHTML, qs } from './utils.js';
import type { INotificacion } from './interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** Ruta del fragmento HTML de notificaciones (raíz del proyecto) */
const HTML_PATH = 'notificaciones.html';

/** Duración de un toast en pantalla (5 segundos) */
const TOAST_DURACION_MS = 5000;

/** Indica si el HTML ya fue inyectado */
let htmlCargado = false;

// ================================================================
// CARGA DEL HTML
// ================================================================

/**
 * Carga el fragmento HTML de notificaciones y lo inyecta en el <body>.
 * También mueve la campana al área de usuario (#user-area).
 * Solo se ejecuta una vez.
 * 
 * @returns {Promise<boolean>} - true si se cargó correctamente.
 */
async function cargarHTMLNotificaciones(): Promise<boolean> {
    if (htmlCargado) return true;

    try {
        const response = await fetch(HTML_PATH);
        if (!response.ok) {
            console.error(`notificaciones-ui: Error ${response.status} al cargar ${HTML_PATH}`);
            return false;
        }

        const html = await response.text();
        const contenedor = document.createElement('div');
        contenedor.innerHTML = html;
        document.body.appendChild(contenedor);

        // Mover la campana al área de usuario (si existe)
        inyectarCampanaEnUserArea();

        htmlCargado = true;
        console.info('✅ HTML de notificaciones cargado.');
        return true;
    } catch (error) {
        console.error('notificaciones-ui: Error al cargar el HTML:', error);
        return false;
    }
}

/**
 * Inyecta la campana de notificaciones dentro del contenedor
 * #notificaciones-campana-wrapper (que está dentro de #user-area).
 * Si no encuentra el contenedor, deja la campana donde está.
 */
function inyectarCampanaEnUserArea(): void {
    const wrapper = qs('#notificaciones-campana-wrapper');
    const campana = qs('#notificaciones-campana');

    if (!wrapper || !campana) {
        console.warn('notificaciones-ui: No se encontró el wrapper de la campana o la campana.');
        return;
    }

    // Mover la campana al wrapper dentro del #user-area
    wrapper.appendChild(campana);
    console.info('✅ Campana inyectada en el área de usuario.');
}

// ================================================================
// RENDERIZADO DE LA LISTA
// ================================================================

/**
 * Renderiza la lista de notificaciones dentro del panel.
 */
function renderizarNotificaciones(): void {
    const lista = qs('#notificaciones-lista');
    if (!lista) return;

    const notificaciones = obtenerNotificaciones();

    if (notificaciones.length === 0) {
        lista.innerHTML = `<p class="notificaciones-vacio">No hay notificaciones.</p>`;
        return;
    }

    // Ordenar por fecha descendente (más recientes primero)
    const ordenadas = [...notificaciones].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    lista.innerHTML = ordenadas.map(n => `
        <div 
            class="notificacion-item ${n.leida ? '' : 'no-leida'}" 
            data-id="${escaparHTML(n.id)}"
        >
            <div class="notificacion-icono">${n.tipo === 'AlertaEliminacion' ? '⚠️' : '🔔'}</div>
            <div class="notificacion-contenido">
                <p class="notificacion-mensaje">${escaparHTML(n.mensaje)}</p>
                <span class="notificacion-fecha">${formatearFecha(new Date(n.fecha), 'corta')}</span>
            </div>
            <button 
                type="button" 
                class="btn-eliminar-notificacion" 
                data-id="${escaparHTML(n.id)}"
                aria-label="Eliminar notificación"
            >
                ✕
            </button>
        </div>
    `).join('');

    // Asignar eventos a los items y botones
    lista.querySelectorAll('.notificacion-item').forEach(item => {
        item.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            // Si se hizo clic en el botón eliminar, no marcar como leída
            if (target.classList.contains('btn-eliminar-notificacion')) return;

            const id = (item as HTMLElement).dataset.id;
            if (id) {
                marcarComoLeida(id);
                renderizarNotificaciones();
                actualizarContador();
            }
        });
    });

    lista.querySelectorAll('.btn-eliminar-notificacion').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            const id = (btn as HTMLElement).dataset.id;
            if (id) {
                eliminarNotificacion(id);
                renderizarNotificaciones();
                actualizarContador();
            }
        });
    });
}

// ================================================================
// CONTADOR DE LA CAMPANA
// ================================================================

/**
 * Actualiza el contador de notificaciones no leídas en la campana.
 */
function actualizarContador(): void {
    const contador = qs('#notificaciones-contador');
    if (!contador) return;

    const cantidad = contarNotificacionesNoLeidas();

    if (cantidad > 0) {
        contador.textContent = String(cantidad);
        contador.classList.remove('hidden');
    } else {
        contador.textContent = '0';
        contador.classList.add('hidden');
    }
}

// ================================================================
// APERTURA Y CIERRE DEL PANEL
// ================================================================

/**
 * Abre el panel lateral de notificaciones.
 */
function abrirPanel(): void {
    const panel = qs('#notificaciones-panel');
    const overlay = qs('#notificaciones-overlay');
    if (panel) panel.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');

    renderizarNotificaciones();
    actualizarContador();
}

/**
 * Cierra el panel lateral de notificaciones.
 */
function cerrarPanel(): void {
    const panel = qs('#notificaciones-panel');
    const overlay = qs('#notificaciones-overlay');
    if (panel) panel.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
}

// ================================================================
// CONFIGURACIÓN DE EVENTOS
// ================================================================

/**
 * Configura los eventos de la campana, panel, overlay y botones.
 */
function configurarEventos(): void {
    // Botón campana → abrir/cerrar panel
    const btnCampana = qs('#btn-notificaciones');
    if (btnCampana) {
        btnCampana.addEventListener('click', () => {
            const panel = qs('#notificaciones-panel');
            if (panel && !panel.classList.contains('hidden')) {
                cerrarPanel();
            } else {
                abrirPanel();
            }
        });
    }

    // Botón cerrar panel
    const btnCerrar = qs('#btn-cerrar-panel-notificaciones');
    if (btnCerrar) {
        btnCerrar.addEventListener('click', cerrarPanel);
    }

    // Overlay → cerrar panel
    const overlay = qs('#notificaciones-overlay');
    if (overlay) {
        overlay.addEventListener('click', cerrarPanel);
    }

    // Botón marcar todas como leídas
    const btnMarcarTodas = qs('#btn-marcar-todas-leidas');
    if (btnMarcarTodas) {
        btnMarcarTodas.addEventListener('click', () => {
            marcarTodasComoLeidas();
            renderizarNotificaciones();
            actualizarContador();
        });
    }

    // Tecla Escape → cerrar panel
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const panel = qs('#notificaciones-panel');
            if (panel && !panel.classList.contains('hidden')) {
                cerrarPanel();
            }
        }
    });
}

// ================================================================
// TOASTS
// ================================================================

/**
 * Muestra un toast emergente en la esquina superior derecha.
 * 
 * @param mensaje - Texto del toast.
 * @param tipo - Tipo de toast ("alerta" | "info").
 */
export function mostrarToast(mensaje: string, tipo: 'alerta' | 'info' = 'info'): void {
    const contenedor = qs('#notificaciones-toasts');
    const template = document.getElementById('template-toast-notificacion') as HTMLTemplateElement | null;

    if (!contenedor || !template) {
        console.warn('notificaciones-ui: No se encontró el contenedor de toasts o el template.');
        return;
    }

    // Clonar el template
    const clon = template.content.cloneNode(true) as DocumentFragment;
    const toast = clon.querySelector('.toast-notificacion') as HTMLElement;
    const mensajeEl = clon.querySelector('.toast-mensaje') as HTMLElement;
    const btnCerrar = clon.querySelector('.toast-cerrar') as HTMLButtonElement;

    if (!toast || !mensajeEl) return;

    // Aplicar clase según tipo
    toast.classList.add(tipo === 'alerta' ? 'toast-alerta' : 'toast-info');

    // Asignar mensaje
    mensajeEl.textContent = mensaje;

    // Evento del botón cerrar
    if (btnCerrar) {
        btnCerrar.addEventListener('click', () => {
            toast.classList.add('toast-salida');
            setTimeout(() => toast.remove(), 300);
        });
    }

    // Insertar en el contenedor
    contenedor.appendChild(clon);

    // Auto-eliminar después de X segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('toast-salida');
            setTimeout(() => toast.remove(), 300);
        }
    }, TOAST_DURACION_MS);
}

/**
 * Muestra un toast para una notificación específica.
 * 
 * @param notificacion - Notificación a mostrar como toast.
 */
export function mostrarToastDeNotificacion(notificacion: INotificacion): void {
    const tipo = notificacion.tipo === 'AlertaEliminacion' ? 'alerta' : 'info';
    mostrarToast(notificacion.mensaje, tipo);
}

// ================================================================
// FUNCIÓN PRINCIPAL (llamada desde app.ts)
// ================================================================

/**
 * Inicializa el sistema de notificaciones (UI).
 * - Carga el HTML.
 * - Inyecta la campana en el área de usuario.
 * - Configura eventos.
 * - Verifica alertas de eliminación pendientes.
 * - Muestra toasts de alertas no leídas.
 */
export async function inicializarNotificacionesUI(): Promise<void> {
    const cargado = await cargarHTMLNotificaciones();
    if (!cargado) return;

    // Mostrar la campana (quitar la clase hidden inicial)
    const campana = qs('#notificaciones-campana');
    if (campana) campana.classList.remove('hidden');

    // Configurar eventos
    configurarEventos();

    // Verificar alertas de eliminación pendientes
    verificarAlertasEliminacion();

    // Actualizar contador y renderizar
    actualizarContador();
    renderizarNotificaciones();

    // Mostrar toasts de alertas no leídas (máximo 3 al inicio)
    const noLeidas = obtenerNotificacionesNoLeidas();
    const aMostrar = noLeidas.slice(0, 3);
    aMostrar.forEach(n => mostrarToastDeNotificacion(n));

    console.info('✅ Sistema de notificaciones inicializado.');
}