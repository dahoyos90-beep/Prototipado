/**
 * src/interfaces/INotificacion.ts
 * 
 * Interfaz que define la estructura de una Notificación en el sistema.
 * Se utiliza para mostrar alertas y advertencias al usuario en el Dashboard
 * (eliminación de empresas, cambios sin guardar, información general).
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Notificación.
 * - Ser utilizada por el servicio de notificaciones (notificaciones.ts)
 *   y por los módulos que necesiten mostrar avisos al usuario.
 * 
 * @version 1.0.0
 * @since 2026-09-10
 */

/**
 * Tipos posibles de notificación en el sistema.
 * - AlertaEliminacion: Advertencia sobre una empresa en proceso de eliminación.
 * - AdvertenciaCambios: Aviso sobre cambios sin guardar en un formulario.
 * - Info: Mensaje informativo general para el usuario.
 */
export type TipoNotificacion = "AlertaEliminacion" | "AdvertenciaCambios" | "Info";

/**
 * Interfaz INotificacion
 * 
 * Define la estructura completa de una notificación en el prototipo SG-SST Manager.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único de la notificación (generado por el sistema).
 * @property {TipoNotificacion} tipo - Tipo de notificación (AlertaEliminacion, AdvertenciaCambios, Info).
 * @property {string} mensaje - Texto descriptivo que se muestra al usuario.
 * @property {Date} fecha - Fecha y hora de creación de la notificación.
 * @property {boolean} leida - Indica si el usuario ya leyó la notificación.
 * @property {string | null} accion - Acción asociada a la notificación (opcional, puede ser null).
 * @property {string} empresaId - NIT de la empresa a la que pertenece la notificación (para filtrar por empresa).
 */
export interface INotificacion {
    id: string;
    tipo: TipoNotificacion;
    mensaje: string;
    fecha: Date;
    leida: boolean;
    accion: string | null;
    empresaId: string;
}