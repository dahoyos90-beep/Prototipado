/**
 * src/notificaciones.ts
 * 
 * Lógica de notificaciones para SG-SST Manager.
 * Permite crear, leer, marcar como leída y eliminar notificaciones.
 * También verifica empresas en proceso de eliminación para generar alertas.
 * 
 * Propósito:
 * - Centralizar toda la lógica de notificaciones en un solo lugar.
 * - Ser utilizada por notificaciones-ui.ts y por los módulos que generen avisos.
 * - Garantizar el tipado fuerte con la interfaz INotificacion.
 * 
 * @version 1.0.0
 * @since 2026-09-10
 */

import { storageNotificaciones, storageEmpresas } from './storage.js';
import { generarIdUnico, fechaHoraActualISO } from './utils.js';
import { obtenerSesionCompleta } from './session-manager.js';
import type { INotificacion, TipoNotificacion } from './interfaces/index.js';
import type { IEmpresa } from './interfaces/index.js';

// ================================================================
// FUNCIONES DE CREACIÓN
// ================================================================

/**
 * Crea y guarda una nueva notificación.
 * Antes de guardar, verifica que no exista una notificación idéntica
 * (mismo tipo + empresaId + accion) para evitar duplicados.
 * 
 * @param tipo - Tipo de notificación (AlertaEliminacion, AdvertenciaCambios, Info).
 * @param mensaje - Texto descriptivo de la notificación.
 * @param empresaId - NIT de la empresa asociada.
 * @param accion - Acción asociada (opcional, ej. "10dias", "5dias", "24horas").
 * @returns {boolean} - true si se creó correctamente, false si ya existía o hubo error.
 */
export function crearNotificacion(
    tipo: TipoNotificacion,
    mensaje: string,
    empresaId: string,
    accion: string | null = null
): boolean {
    // Verificar duplicados
    const existentes = storageNotificaciones.obtenerTodos();
    const duplicada = existentes.some(n =>
        n.tipo === tipo &&
        n.empresaId === empresaId &&
        n.accion === accion
    );

    if (duplicada) {
        console.info(`notificaciones: Ya existe una notificación de tipo "${tipo}" para la empresa "${empresaId}".`);
        return false;
    }

    // Crear la nueva notificación
    const notificacion: INotificacion = {
        id: generarIdUnico(),
        tipo,
        mensaje,
        fecha: new Date(),
        leida: false,
        accion,
        empresaId
    };

    const guardado = storageNotificaciones.guardar(notificacion);
    if (guardado) {
        console.info(`✅ Notificación creada: ${mensaje}`);
    } else {
        console.error('❌ Error al guardar la notificación.');
    }
    return guardado;
}

// ================================================================
// FUNCIONES DE LECTURA
// ================================================================

/**
 * Obtiene todas las notificaciones, filtradas según el rol del usuario.
 * - SST (Profesional): ve TODAS las notificaciones.
 * - Empresa: ve SOLO las notificaciones de su NIT.
 * 
 * @returns {INotificacion[]} - Array de notificaciones.
 */
export function obtenerNotificaciones(): INotificacion[] {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return [];

    const todas = storageNotificaciones.obtenerTodos();

    // Filtrar por rol
    if (sesion.rol === 'Empresa') {
        // Usuario Empresa: solo ve notificaciones de su empresa activa o vinculadas
        const empresasPermitidas = [
            ...sesion.empresasVinculadas,
            ...(sesion.empresaIdActiva ? [sesion.empresaIdActiva] : [])
        ];
        return todas.filter(n => empresasPermitidas.includes(n.empresaId));
    }

    // SST ve todas las notificaciones
    return todas;
}

/**
 * Obtiene todas las notificaciones no leídas (filtradas por rol).
 * 
 * @returns {INotificacion[]} - Array de notificaciones no leídas.
 */
export function obtenerNotificacionesNoLeidas(): INotificacion[] {
    return obtenerNotificaciones().filter(n => !n.leida);
}

/**
 * Cuenta las notificaciones no leídas (filtradas por rol).
 * 
 * @returns {number} - Cantidad de notificaciones no leídas.
 */
export function contarNotificacionesNoLeidas(): number {
    return obtenerNotificacionesNoLeidas().length;
}

/**
 * Obtiene una notificación específica por su ID.
 * 
 * @param id - Identificador único de la notificación.
 * @returns {INotificacion | null} - Notificación encontrada o null.
 */
export function obtenerNotificacionPorId(id: string): INotificacion | null {
    return storageNotificaciones.obtenerPorId(id);
}

// ================================================================
// FUNCIONES DE ACTUALIZACIÓN
// ================================================================

/**
 * Marca una notificación como leída.
 * 
 * @param id - Identificador único de la notificación.
 * @returns {boolean} - true si se actualizó correctamente.
 */
export function marcarComoLeida(id: string): boolean {
    const notificacion = storageNotificaciones.obtenerPorId(id);
    if (!notificacion) {
        console.warn(`notificaciones: No se encontró la notificación con ID "${id}".`);
        return false;
    }

    return storageNotificaciones.actualizar(id, { leida: true });
}

/**
 * Marca todas las notificaciones (filtradas por rol) como leídas.
 * 
 * @returns {boolean} - true si se actualizaron correctamente.
 */
export function marcarTodasComoLeidas(): boolean {
    const noLeidas = obtenerNotificacionesNoLeidas();
    let exito = true;

    noLeidas.forEach(n => {
        const actualizado = storageNotificaciones.actualizar(n.id, { leida: true });
        if (!actualizado) exito = false;
    });

    if (exito) {
        console.info(`✅ ${noLeidas.length} notificaciones marcadas como leídas.`);
    } else {
        console.warn('⚠️ Algunas notificaciones no se pudieron marcar como leídas.');
    }
    return exito;
}

// ================================================================
// FUNCIONES DE ELIMINACIÓN
// ================================================================

/**
 * Elimina una notificación por su ID.
 * 
 * @param id - Identificador único de la notificación.
 * @returns {boolean} - true si se eliminó correctamente.
 */
export function eliminarNotificacion(id: string): boolean {
    const eliminado = storageNotificaciones.eliminar(id);
    if (eliminado) {
        console.info(`✅ Notificación "${id}" eliminada.`);
    } else {
        console.warn(`⚠️ No se pudo eliminar la notificación "${id}".`);
    }
    return eliminado;
}

/**
 * Elimina todas las notificaciones de una empresa (NIT).
 * Útil cuando se elimina definitivamente una empresa.
 * 
 * @param nit - NIT de la empresa.
 * @returns {boolean} - true si se eliminaron correctamente.
 */
export function eliminarNotificacionesDeEmpresa(nit: string): boolean {
    const todas = storageNotificaciones.obtenerTodos();
    const aEliminar = todas.filter(n => n.empresaId === nit);

    let exito = true;
    aEliminar.forEach(n => {
        const eliminado = storageNotificaciones.eliminar(n.id);
        if (!eliminado) exito = false;
    });

    if (exito) {
        console.info(`✅ ${aEliminar.length} notificaciones de la empresa "${nit}" eliminadas.`);
    } else {
        console.warn(`⚠️ Algunas notificaciones de la empresa "${nit}" no se pudieron eliminar.`);
    }
    return exito;
}

// ================================================================
// VERIFICACIÓN DE ALERTAS DE ELIMINACIÓN
// ================================================================

/**
 * Recorre todas las empresas con estado "EnProceso" de eliminación
 * y genera notificaciones según los umbrales: 10 días, 5 días y 24 horas.
 * 
 * Esta función debe llamarse:
 * - Al iniciar sesión.
 * - Cada vez que se carga el Dashboard.
 */
export function verificarAlertasEliminacion(): void {
    const empresas = storageEmpresas.obtenerTodos();

    empresas.forEach(empresa => {
        // Solo procesar empresas en proceso de eliminación
        if (empresa.estadoEliminacion !== 'EnProceso') return;
        if (empresa.diasRestantes === null) return;

        const razonSocial = empresa.razonSocial;
        const nit = empresa.nit;

        if (empresa.diasRestantes === 10) {
            crearNotificacion(
                'AlertaEliminacion',
                `⚠️ La empresa "${razonSocial}" será eliminada en 10 días.`,
                nit,
                '10dias'
            );
        } else if (empresa.diasRestantes === 5) {
            crearNotificacion(
                'AlertaEliminacion',
                `⚠️ La empresa "${razonSocial}" será eliminada en 5 días.`,
                nit,
                '5dias'
            );
        } else if (empresa.diasRestantes === 1) {
            crearNotificacion(
                'AlertaEliminacion',
                `🚨 La empresa "${razonSocial}" será eliminada en 24 horas. No se podrá recuperar.`,
                nit,
                '24horas'
            );
        }
    });
}

// ================================================================
// FUNCIONES AUXILIARES
// ================================================================

/**
 * Crea una notificación informativa genérica.
 * 
 * @param mensaje - Texto de la notificación.
 * @param empresaId - NIT de la empresa asociada.
 * @returns {boolean} - true si se creó correctamente.
 */
export function crearNotificacionInfo(mensaje: string, empresaId: string): boolean {
    return crearNotificacion('Info', mensaje, empresaId, null);
}