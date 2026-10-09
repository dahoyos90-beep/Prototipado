/**
 * src/app.ts
 * 
 * Punto de entrada de la aplicación SG-SST Manager.
 * Maneja autenticación, navegación, carga de módulos, selección de empresa,
 * advertencia de cambios sin guardar, notificaciones y control de inactividad.
 * 
 * @version 3.2.8
 *  - A2: reemplazado el placeholder window.prompt/alert por el modal real
 *        de selección de empresa (src/interfaces/modal-seleccion-empresa.ts).
 *        La verificación del NIT ya no se pide al usuario: la empresa se
 *        elige de una lista ya filtrada por rol.
 * 
 * @version 3.2.7
 *  - A1: redirección a login con window.location.replace (forzada).
 *  - A3: actualizarInterfazUsuario construye el DOM con createElement +
 *        textContent (cierra XSS por innerHTML con datos del usuario).
 *  - A4: corregido bug lógico en necesitaSeleccionarEmpresa (|| true).
 *  - A5: imports de advertencia-cambios unificados.
 *  - A6: initApp es async y espera configurarNotificaciones().
 *  - A7: eliminado console.info que exponía datos del usuario.
 * 
 * @version 3.2.6 (agregado M24 al mapa de ARCHIVOS_ESPECIALES)
 * @since 2026-08-31
 */

import { qs, qsa } from './utils.js';
import {
    haySesionActiva,
    cerrarSesion,
    obtenerUsuarioSesion,
    crearUsuarioPorDefecto
} from './auth.js';
import {
    verificarInactividad,
    actualizarActividad,
    obtenerEmpresaActiva,
    establecerEmpresaActiva,
    obtenerEmpresasVinculadas
} from './session-manager.js';
import {
    ejecutarConAdvertencia,
    inicializarAdvertencia
} from './advertencia-cambios.js';
import { mostrarModalAdvertencia } from './interfaces/modal-advertencia.js';
import { abrirModalSeleccionEmpresa } from './interfaces/modal-seleccion-empresa.js';
import { inicializarNotificacionesUI } from './notificaciones-ui.js';
import { verificarAlertasEliminacion } from './notificaciones.js';
import { storageEmpresas } from './storage.js';
import type { IUsuario, IEmpresa } from './interfaces/index.js';

// ================================================================
// CONSTANTES Y SELECTORES
// ================================================================

const MODULE_CONTAINER_SELECTOR = '#module-container';
const NAV_LINK_SELECTOR = '.nav-link';
const USER_AREA_SELECTOR = '#user-area';
const LOGOUT_BTN_SELECTOR = '#logout-btn';
const LOGOUT_NAV_LINK_SELECTOR = '#logout-nav-link';
const EMPRESA_ACTIVA_SELECTOR = '#empresa-activa';
const BTN_CAMBIAR_EMPRESA_SELECTOR = '#btn-cambiar-empresa';

const MODULES_HTML_BASE_PATH = 'modules/';
const MODULES_JS_BASE_PATH = '../modules/';

/**
 * Mapa de excepciones para nombres de archivos especiales.
 * 
 * Se usa cuando el ID del módulo no coincide directamente con el nombre
 * base del archivo HTML/JS, o cuando un módulo tiene múltiples vistas
 * (ej. M13 tiene listado y detalle, pero el menú apunta al listado).
 */
const ARCHIVOS_ESPECIALES: Record<string, string> = {
    'M10-Gestion-Condiciones-Salud': 'condiciones-salud',
    'M11-Gestion-Perfil-Afiliaciones': 'perfil-afiliaciones',
    'M13-Gestion-Matriz-Peligros-Riesgos': 'matriz-listado',
    'M17-Plan-Trabajo-Capacitacion': 'plan-trabajo-capacitacion',
    'M18-Gestion-Comites': 'comites-listado',
    'M21-Gestion-Comite-Convivencia': 'convivencia-listado',
    'M23-Gestion-Indicadores': 'indicadores-dashboard',
    'M24-Gestion-Ausentismo': 'ausentismo'
};

const DEFAULT_MODULE = 'M03-Dashboard';
const FALLBACK_MODULE = 'M01-Gestion-Usuarios';

/** Intervalo de verificación de inactividad (1 minuto) */
const INTERVALO_INACTIVIDAD_MS = 60 * 1000;

// ================================================================
// ESTADO GLOBAL
// ================================================================

/** ID del intervalo de verificación de inactividad */
let intervaloInactividad: number | null = null;

// ================================================================
// FUNCIÓN PRINCIPAL
// ================================================================

async function initApp(): Promise<void> {
    console.info('🚀 Iniciando SG-SST Manager...');

    // 1. Crear usuario por defecto
    try {
        const creado = crearUsuarioPorDefecto();
        if (creado) {
            console.info('✅ Usuario por defecto creado.');
        }
    } catch (error) {
        console.warn('⚠️ No se pudo crear el usuario por defecto:', error);
    }

    // 2. Verificar sesión activa
    if (!haySesionActiva()) {
        console.info('🔒 No hay sesión activa. Redirigiendo a login...');
        window.location.replace('login.html');
        return;
    }

    // 3. Obtener usuario de la sesión
    const usuario = obtenerUsuarioSesion();
    if (!usuario) {
        console.warn('⚠️ Sesión activa pero no se encontró el usuario. Cerrando sesión...');
        cerrarSesion();
        return;
    }

    // 4. Configurar advertencia de cambios sin guardar
    configurarAdvertencia();

    // 5. Verificar inactividad previa
    if (verificarInactividad()) {
        console.warn('⏰ Sesión expirada por inactividad. Cerrando sesión...');
        cerrarSesion();
        return;
    }

    // 6. Actualizar interfaz de usuario (header)
    // ⚠️ IMPORTANTE: este paso debe ejecutarse ANTES de inicializar notificaciones
    // para que el contenedor #notificaciones-campana-wrapper exista.
    actualizarInterfazUsuario(usuario);

    // 7. Inicializar sistema de notificaciones (campana)
    await configurarNotificaciones();

    // 8. Verificar si necesita seleccionar empresa
    if (necesitaSeleccionarEmpresa(usuario)) {
        console.info('🏢 El usuario debe seleccionar una empresa.');
        mostrarModalSeleccionEmpresa(usuario);
    } else {
        // 9. Cargar módulo por defecto
        void cargarModulo(DEFAULT_MODULE);
    }

    // 10. Configurar navegación
    configurarNavegacion();

    // 11. Configurar logout
    configurarLogout();
    configurarLogoutMenu();

    // 12. Configurar verificación de inactividad periódica
    configurarInactividad();

    // 13. Registrar actividad global (clics, teclado, scroll)
    registrarActividadGlobal();

    // 14. Verificar alertas de eliminación pendientes
    verificarAlertasEliminacion();

    console.info('✅ Aplicación inicializada.');
}

// ================================================================
// CONFIGURACIÓN DE ADVERTENCIA Y NOTIFICACIONES
// ================================================================

/**
 * Configura el sistema de advertencia de cambios sin guardar.
 */
function configurarAdvertencia(): void {
    try {
        inicializarAdvertencia(mostrarModalAdvertencia);
        console.info('✅ Sistema de advertencia configurado.');
    } catch (error) {
        console.warn('⚠️ No se pudo configurar el sistema de advertencia:', error);
    }
}

/**
 * Inicializa el sistema de notificaciones (campana, panel, toasts).
 * Debe llamarse DESPUÉS de actualizarInterfazUsuario() para que el
 * contenedor #notificaciones-campana-wrapper ya exista en el DOM.
 */
async function configurarNotificaciones(): Promise<void> {
    try {
        await inicializarNotificacionesUI();
        console.info('✅ Sistema de notificaciones configurado.');
    } catch (error) {
        console.warn('⚠️ No se pudo configurar el sistema de notificaciones:', error);
    }
}

// ================================================================
// SELECCIÓN DE EMPRESA
// ================================================================

/**
 * Determina si el usuario necesita seleccionar una empresa.
 * 
 * @param usuario - Usuario autenticado.
 * @returns {boolean} - true si necesita seleccionar empresa.
 */
function necesitaSeleccionarEmpresa(usuario: IUsuario): boolean {
    if (obtenerEmpresaActiva()) return false;

    if (usuario.rol === 'Profesional') {
        return true;
    }

    if (usuario.rol === 'Empresa') {
        return usuario.empresasVinculadas.length > 0;
    }

    return false;
}

/**
 * Muestra el modal de selección de empresa.
 * 
 * Si el usuario no tiene empresas vinculadas, muestra un empty state
 * con un botón para ir a Gestión de Empresas. En caso contrario, abre
 * el modal real (src/interfaces/modal-seleccion-empresa.ts) que gestiona
 * la selección, validación y callbacks.
 * 
 * @param usuario - Usuario autenticado.
 */
function mostrarModalSeleccionEmpresa(usuario: IUsuario): void {
    const empresasDisponibles = obtenerEmpresasDisponibles(usuario);

    if (empresasDisponibles.length === 0) {
        const container = qs(MODULE_CONTAINER_SELECTOR);
        if (container) {
            container.innerHTML = `
                <div class="welcome-message">
                    <h2>⚠️ No tiene empresas vinculadas</h2>
                    <p>Para comenzar, debe crear una empresa primero.</p>
                    <button id="btn-ir-empresas" class="btn btn-primary">Ir a Gestión de Empresas</button>
                </div>
            `;
            const btn = qs('#btn-ir-empresas');
            if (btn) {
                btn.addEventListener('click', () => {
                    void cargarModulo('M02-Gestion-Empresas');
                });
            }
        }
        return;
    }

    abrirModalSeleccionEmpresa(empresasDisponibles, {
        onConfirmar: (empresa: IEmpresa) => {
            establecerEmpresaActiva(empresa.nit);
            console.info(`✅ Empresa activa: ${empresa.razonSocial} (${empresa.nit})`);

            actualizarEmpresaActivaEnHeader(empresa);
            void cargarModulo(DEFAULT_MODULE);
        },
        onCancelar: () => {
            console.warn('Selección de empresa cancelada por el usuario.');
        }
    });
}

/**
 * Obtiene las empresas disponibles para el usuario según su rol.
 * 
 * @param usuario - Usuario autenticado.
 * @returns {IEmpresa[]} - Empresas disponibles.
 */
function obtenerEmpresasDisponibles(usuario: IUsuario): IEmpresa[] {
    const todasEmpresas = storageEmpresas.obtenerTodos();

    if (usuario.rol === 'Profesional') {
        return todasEmpresas.filter(e => e.estadoEliminacion === 'Activa' || !e.estadoEliminacion);
    }

    if (usuario.rol === 'Empresa') {
        return todasEmpresas.filter(e => usuario.empresasVinculadas.includes(e.nit));
    }

    return [];
}

// ================================================================
// ACTUALIZACIÓN DE INTERFAZ DE USUARIO
// ================================================================

/**
 * Actualiza el header con la información del usuario y la empresa activa.
 * 
 * ⚠️ IMPORTANTE: La campana de notificaciones se inyecta en el contenedor
 * #notificaciones-campana-wrapper, que se crea aquí. Por eso, este método
 * debe llamarse ANTES de inicializarNotificacionesUI().
 * 
 * Construye el DOM con createElement + textContent para evitar XSS por
 * inyección de datos del usuario (nombre, rol, razón social).
 * 
 * @param usuario - Usuario autenticado.
 */
function actualizarInterfazUsuario(usuario: IUsuario): void {
    let userArea = qs(USER_AREA_SELECTOR);
    if (!userArea) {
        const header = qs('#app-header');
        if (!header) {
            console.warn('No se encontró #app-header.');
            return;
        }
        userArea = document.createElement('div');
        userArea.id = 'user-area';
        userArea.className = 'user-area';
        header.appendChild(userArea);
    }

    userArea.innerHTML = '';

    const empresaActivaNit = obtenerEmpresaActiva();
    const empresa = empresaActivaNit
        ? storageEmpresas.obtenerPorId(empresaActivaNit)
        : null;

    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';

    const spanNombre = document.createElement('span');
    spanNombre.className = 'user-name';
    spanNombre.textContent = usuario.nombreCompleto;
    userInfo.appendChild(spanNombre);

    const spanRol = document.createElement('span');
    spanRol.className = 'user-role';
    spanRol.textContent = usuario.rol;
    userInfo.appendChild(spanRol);

    if (empresa) {
        const spanEmpresa = document.createElement('span');
        spanEmpresa.id = 'empresa-activa';
        spanEmpresa.className = 'empresa-activa';
        spanEmpresa.textContent = `🏢 ${empresa.razonSocial}`;
        userInfo.appendChild(spanEmpresa);
    }

    userArea.appendChild(userInfo);

    const campanaWrapper = document.createElement('div');
    campanaWrapper.id = 'notificaciones-campana-wrapper';
    campanaWrapper.className = 'notificaciones-campana-wrapper';
    userArea.appendChild(campanaWrapper);

    if (usuario.rol === 'Profesional') {
        const btnCambiar = document.createElement('button');
        btnCambiar.id = 'btn-cambiar-empresa';
        btnCambiar.className = 'btn btn-outline btn-sm';
        btnCambiar.style.display = 'none';
        btnCambiar.textContent = '🔄 Cambiar empresa';
        userArea.appendChild(btnCambiar);
    }

    const btnLogout = document.createElement('button');
    btnLogout.id = 'logout-btn';
    btnLogout.className = 'btn btn-outline btn-sm';
    btnLogout.textContent = '🚪 Cerrar sesión';
    userArea.appendChild(btnLogout);

    configurarBotonCambiarEmpresa(usuario);
}

/**
 * Actualiza el indicador de empresa activa en el header.
 * 
 * @param empresa - Empresa activa.
 */
function actualizarEmpresaActivaEnHeader(empresa: IEmpresa): void {
    const empresaActivaEl = qs(EMPRESA_ACTIVA_SELECTOR);
    if (empresaActivaEl) {
        empresaActivaEl.textContent = `🏢 ${empresa.razonSocial}`;
    } else {
        const usuario = obtenerUsuarioSesion();
        if (usuario) actualizarInterfazUsuario(usuario);
    }

    const btnCambiar = qs(BTN_CAMBIAR_EMPRESA_SELECTOR) as HTMLButtonElement | null;
    if (btnCambiar) {
        btnCambiar.style.display = 'inline-block';
    }
}

/**
 * Configura el botón "Cambiar empresa" en el header.
 * 
 * @param usuario - Usuario autenticado.
 */
function configurarBotonCambiarEmpresa(usuario: IUsuario): void {
    const btnCambiar = qs(BTN_CAMBIAR_EMPRESA_SELECTOR) as HTMLButtonElement | null;

    if (!btnCambiar) return;

    if (usuario.rol === 'Profesional') {
        btnCambiar.style.display = 'inline-block';
    }

    btnCambiar.addEventListener('click', () => {
        ejecutarConAdvertencia(() => {
            mostrarModalSeleccionEmpresa(usuario);
        });
    });
}

// ================================================================
// NAVEGACIÓN
// ================================================================

/**
 * Configura los eventos de navegación en el menú.
 */
function configurarNavegacion(): void {
    const navLinks = qsa(NAV_LINK_SELECTOR);
    if (navLinks.length === 0) {
        console.warn('No se encontraron enlaces de navegación.');
        return;
    }

    navLinks.forEach((link) => {
        const anchor = link as HTMLAnchorElement;
        if (anchor.id === 'logout-nav-link') return;

        anchor.addEventListener('click', (event: MouseEvent) => {
            event.preventDefault();
            const moduleId = anchor.dataset.modulo;
            if (!moduleId) {
                console.warn('El enlace no tiene data-modulo:', anchor);
                return;
            }

            if (verificarInactividad()) {
                console.warn('⏰ Sesión expirada por inactividad.');
                cerrarSesion();
                return;
            }

            ejecutarConAdvertencia(() => {
                actualizarNavegacionActiva(anchor);
                void cargarModulo(moduleId);
            });
        });
    });

    console.info(`✅ Navegación configurada (${navLinks.length} enlaces).`);
}

/**
 * Actualiza el enlace activo en la navegación.
 * 
 * @param activeLink - Enlace activo.
 */
function actualizarNavegacionActiva(activeLink: HTMLAnchorElement): void {
    const navLinks = qsa(NAV_LINK_SELECTOR);
    navLinks.forEach((link) => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

// ================================================================
// CIERRE DE SESIÓN
// ================================================================

/**
 * Configura el botón de cerrar sesión del header.
 */
function configurarLogout(): void {
    const logoutBtn = qs(LOGOUT_BTN_SELECTOR) as HTMLButtonElement | null;
    if (!logoutBtn) {
        console.warn('Botón de cerrar sesión no encontrado.');
        return;
    }

    logoutBtn.addEventListener('click', () => {
        ejecutarConAdvertencia(() => {
            detenerVerificacionInactividad();
            cerrarSesion();
            console.info('👋 Sesión cerrada desde el header.');
        });
    });
}

/**
 * Configura el enlace de cerrar sesión del menú.
 */
function configurarLogoutMenu(): void {
    const logoutLink = qs(LOGOUT_NAV_LINK_SELECTOR) as HTMLAnchorElement | null;
    if (!logoutLink) {
        console.warn('Enlace de cerrar sesión en el menú no encontrado.');
        return;
    }

    logoutLink.addEventListener('click', (event: MouseEvent) => {
        event.preventDefault();
        ejecutarConAdvertencia(() => {
            detenerVerificacionInactividad();
            cerrarSesion();
            console.info('👋 Sesión cerrada desde el menú.');
        });
    });
}

// ================================================================
// INACTIVIDAD
// ================================================================

/**
 * Configura el intervalo que verifica la inactividad cada minuto.
 */
function configurarInactividad(): void {
    detenerVerificacionInactividad();

    intervaloInactividad = window.setInterval(() => {
        if (verificarInactividad()) {
            console.warn('⏰ Sesión expirada por inactividad. Cerrando sesión...');
            detenerVerificacionInactividad();
            cerrarSesion();
        }
    }, INTERVALO_INACTIVIDAD_MS);

    console.info('✅ Verificación de inactividad activada (30 min).');
}

/**
 * Detiene el intervalo de verificación de inactividad.
 */
function detenerVerificacionInactividad(): void {
    if (intervaloInactividad !== null) {
        clearInterval(intervaloInactividad);
        intervaloInactividad = null;
    }
}

/**
 * Registra actividad del usuario (clics, teclado, scroll) para
 * mantener la sesión activa.
 */
function registrarActividadGlobal(): void {
    const registrar = (): void => {
        actualizarActividad();
    };

    document.addEventListener('click', registrar);
    document.addEventListener('keydown', registrar);
    document.addEventListener('scroll', registrar, { passive: true });

    console.info('✅ Registro de actividad global activado.');
}

// ================================================================
// CARGA DE MÓDULOS
// ================================================================

/**
 * Carga un módulo (HTML + lógica).
 * 
 * @param moduleId - ID del módulo a cargar.
 */
async function cargarModulo(moduleId: string): Promise<void> {
    const container = qs(MODULE_CONTAINER_SELECTOR);
    if (!container) {
        console.error(`Contenedor '${MODULE_CONTAINER_SELECTOR}' no encontrado.`);
        return;
    }

    mostrarCarga(container);

    try {
        const htmlPath = construirRutaHTML(moduleId);
        const htmlContent = await fetchHTML(htmlPath);

        if (!htmlContent) {
            throw new Error(`No se pudo cargar el HTML del módulo: ${moduleId}`);
        }

        container.innerHTML = htmlContent;

        const modulePath = construirRutaJS(moduleId);
        try {
            const moduleExports = await import(modulePath);
            if (moduleExports && typeof moduleExports.init === 'function') {
                moduleExports.init(container);
                console.info(`✅ Módulo '${moduleId}' inicializado correctamente.`);
            } else {
                console.warn(`⚠️ El módulo '${moduleId}' no exporta 'init(container)'.`);
            }
        } catch (jsError) {
            console.error(`Error al cargar la lógica del módulo '${moduleId}':`, jsError);
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = '⚠️ Error al cargar la lógica del módulo. Ver consola.';
            container.prepend(errorMsg);
        }

    } catch (error) {
        console.error(`Error al cargar el módulo '${moduleId}':`, error);
        mostrarError(container, moduleId);
        if (moduleId !== FALLBACK_MODULE) {
            console.warn(`Intentando módulo de respaldo: ${FALLBACK_MODULE}`);
            await cargarModulo(FALLBACK_MODULE);
        }
    }
}

/**
 * Construye la ruta al HTML del módulo.
 * 
 * @param moduleId - ID del módulo.
 * @returns {string} - Ruta al HTML.
 */
function construirRutaHTML(moduleId: string): string {
    const nombreArchivo = moduleIdToFileName(moduleId);
    return `${MODULES_HTML_BASE_PATH}${moduleId}/${nombreArchivo}.html`;
}

/**
 * Construye la ruta al JS del módulo.
 * 
 * @param moduleId - ID del módulo.
 * @returns {string} - Ruta al JS.
 */
function construirRutaJS(moduleId: string): string {
    const nombreArchivo = moduleIdToFileName(moduleId);
    return `${MODULES_JS_BASE_PATH}${moduleId}/${nombreArchivo}.js`;
}

/**
 * Convierte un ID de módulo a nombre de archivo.
 * Usa el mapa de excepciones si aplica.
 * 
 * @param moduleId - ID del módulo.
 * @returns {string} - Nombre base del archivo.
 */
function moduleIdToFileName(moduleId: string): string {
    if (ARCHIVOS_ESPECIALES[moduleId]) {
        return ARCHIVOS_ESPECIALES[moduleId];
    }

    const partes = moduleId.split('-');
    if (partes.length > 1) {
        return partes.slice(1).join('-').toLowerCase();
    }
    return moduleId.toLowerCase();
}

/**
 * Realiza un fetch para obtener el HTML de un módulo.
 * 
 * @param url - URL del HTML.
 * @returns {Promise<string | null>} - HTML o null.
 */
async function fetchHTML(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error ${response.status} al cargar ${url}`);
            return null;
        }
        return await response.text();
    } catch (error) {
        console.error(`Error de red al cargar ${url}:`, error);
        return null;
    }
}

/**
 * Muestra un indicador de carga en el contenedor.
 * 
 * @param container - Contenedor.
 */
function mostrarCarga(container: Element): void {
    container.innerHTML = `
        <div class="loading-spinner">
            Cargando módulo...
        </div>
    `;
}

/**
 * Muestra un mensaje de error en el contenedor.
 * 
 * @param container - Contenedor.
 * @param moduleId - ID del módulo.
 */
function mostrarError(container: Element, moduleId: string): void {
    container.innerHTML = `
        <div class="error-message">
            <strong>⚠️ Error al cargar el módulo: ${moduleId}</strong>
            <p>Verifica la consola y ejecuta <code>npm run build</code>.</p>
        </div>
    `;
}

// ================================================================
// INICIO
// ================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        void initApp();
    });
} else {
    void initApp();
}

export {
    initApp,
    cargarModulo,
    configurarNavegacion,
    actualizarNavegacionActiva,
    moduleIdToFileName,
    actualizarInterfazUsuario,
    configurarLogout,
    configurarLogoutMenu
};