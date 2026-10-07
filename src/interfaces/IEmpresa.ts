/**
 * src/interfaces/IEmpresa.ts
 * 
 * Interfaz que define la estructura de una Empresa en el sistema.
 * Corresponde al módulo M02 - Gestión de Empresas (CU5 al CU8).
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Empresa.
 * - Ser utilizada por los servicios de almacenamiento (storage.ts)
 *   y por los módulos de gestión empresarial.
 * 
 * @version 1.1.0 (agregados campos de eliminación)
 * @since 2026-08-31
 */

/**
 * Estados posibles para una empresa.
 * - Activa: Puede operar en el sistema y tener usuarios asignados.
 * - Inactiva: No puede operar (baja lógica), pero se conserva el historial.
 */
export type EstadoEmpresa = "Activa" | "Inactiva";

/**
 * Estados posibles para el proceso de eliminación de una empresa.
 * - Activa: La empresa está operando normalmente (sin proceso de eliminación).
 * - EnProceso: La empresa está en proceso de eliminación (30 días hábiles).
 * - Eliminada: La empresa ha sido eliminada definitivamente (no recuperable).
 */
export type EstadoEliminacion = "Activa" | "EnProceso" | "Eliminada";

/**
 * Interfaz IEmpresa
 * 
 * Define la estructura completa de una empresa en el prototipo SG-SST Manager.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único de la empresa (generado por el sistema, ej. UUID).
 * @property {string} razonSocial - Razón social o nombre legal de la empresa.
 * @property {string} nit - Número de Identificación Tributaria (NIT) - debe ser único.
 * @property {string} direccion - Dirección física de la empresa.
 * @property {string} correo - Correo electrónico de contacto principal.
 * @property {string} telefono - Número de teléfono de contacto.
 * @property {string} representanteLegal - Nombre completo del representante legal.
 * @property {EstadoEmpresa} estado - Estado de la empresa (Activa/Inactiva).
 * @property {EstadoEliminacion} estadoEliminacion - Estado del proceso de eliminación (Activa/EnProceso/Eliminada).
 * @property {string | null} fechaEliminacion - Fecha en que se inició el proceso de eliminación (ISO YYYY-MM-DD, null si no aplica).
 * @property {string | null} observacionEliminacion - Motivo u observación de la eliminación (null si no aplica).
 * @property {number | null} diasRestantes - Días hábiles restantes para la eliminación definitiva (null si no aplica).
 * @property {Date} fechaCreacion - Fecha y hora de registro de la empresa.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación de los datos.
 */
export interface IEmpresa {
    id: string;
    razonSocial: string;
    nit: string;
    direccion: string;
    correo: string;
    telefono: string;
    representanteLegal: string;
    estado: EstadoEmpresa;
    estadoEliminacion: EstadoEliminacion;
    fechaEliminacion: string | null;
    observacionEliminacion: string | null;
    diasRestantes: number | null;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}