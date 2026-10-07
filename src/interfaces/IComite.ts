/**
 * src/interfaces/IComite.ts
 * 
 * Interfaz que define la estructura de un Comité COPASST o Vigía en el sistema.
 * Corresponde al módulo M09 - Gestión de Comités (COPASST/Vigía) (CU30 al CU33).
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Comité.
 * - Permitir la conformación legal (CU30), gestión de actas (CU31),
 *   plan de acción (CU32) y alertas de reuniones (CU33).
 * 
 * @version 1.1.0 (agregado empresaId a las 3 interfaces)
 * @since 2026-08-31
 */

/**
 * Tipo de comité según el tamaño de la empresa.
 * - COPASST: Comité Paritario de Seguridad y Salud en el Trabajo (empresas con ≥ 10 trabajadores).
 * - Vigia: Vigía de Seguridad y Salud en el Trabajo (empresas con < 10 trabajadores).
 */
export type TipoComite = "COPASST" | "Vigia";

/**
 * Estado del comité.
 * - Activo: Comité funcionando correctamente.
 * - Inactivo: Comité suspendido o disuelto.
 * - EnFormalizacion: Comité en proceso de conformación (falta documentación).
 */
export type EstadoComite = "Activo" | "Inactivo" | "EnFormalizacion";

/**
 * Estado de un compromiso del plan de acción.
 * - Pendiente: Aún no se ha iniciado.
 * - EnProgreso: En ejecución.
 * - Completado: Finalizado exitosamente.
 * - Vencido: No se completó en plazo.
 */
export type EstadoCompromiso = "Pendiente" | "EnProgreso" | "Completado" | "Vencido";

/**
 * Interfaz IComite
 * 
 * Define la estructura completa de un comité en el prototipo SG-SST Manager.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único del comité (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el comité.
 * @property {TipoComite} tipo - Tipo de comité (COPASST o Vigia).
 * @property {string} nombre - Nombre descriptivo del comité (ej. "COPASST - Planta Norte").
 * @property {string[]} miembros - IDs de los usuarios que integran el comité (representantes empleador y trabajadores).
 * @property {string} actaEleccion - URL o nombre del archivo PDF del acta de elección (documento legal).
 * @property {string} fechaInicioVigencia - Fecha de inicio del periodo de vigencia del comité (ISO YYYY-MM-DD).
 * @property {string} fechaFinVigencia - Fecha de fin del periodo de vigencia (ISO YYYY-MM-DD).
 * @property {EstadoComite} estado - Estado del comité.
 * @property {Date} fechaCreacion - Fecha y hora de registro del comité.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IComite {
    id: string;
    empresaId: string; // NIT de la empresa
    tipo: TipoComite;
    nombre: string;
    miembros: string[];
    actaEleccion: string;          // Nombre de archivo PDF
    fechaInicioVigencia: string;   // ISO YYYY-MM-DD
    fechaFinVigencia: string;      // ISO YYYY-MM-DD
    estado: EstadoComite;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

/**
 * Interfaz IActaReunion
 * 
 * Define la estructura de un acta de reunión del comité (CU31).
 * Se almacena como un documento independiente vinculado al comité por su ID.
 * 
 * @property {string} id - Identificador único del acta.
 * @property {string} empresaId - NIT de la empresa a la que pertenece el acta.
 * @property {string} comiteId - ID del comité al que pertenece.
 * @property {string} fechaReunion - Fecha de la reunión (ISO YYYY-MM-DD).
 * @property {string} tipoReunion - "Ordinaria" | "Extraordinaria".
 * @property {string} resumen - Resumen del contenido del acta.
 * @property {string} archivoPDF - URL o nombre del archivo PDF del acta.
 * @property {string[]} asistentes - IDs de los miembros que asistieron.
 * @property {Date} fechaCreacion - Fecha y hora de registro del acta.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IActaReunion {
    id: string;
    empresaId: string; // NIT de la empresa
    comiteId: string;
    fechaReunion: string;          // ISO YYYY-MM-DD
    tipoReunion: "Ordinaria" | "Extraordinaria";
    resumen: string;
    archivoPDF: string;            // Nombre de archivo PDF
    asistentes: string[];          // IDs de usuarios
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

/**
 * Interfaz ICompromisoComite
 * 
 * Define la estructura de un compromiso o tarea derivada de una reunión (CU32).
 * 
 * @property {string} id - Identificador único del compromiso.
 * @property {string} empresaId - NIT de la empresa a la que pertenece el compromiso.
 * @property {string} actaId - ID del acta de reunión a la que pertenece.
 * @property {string} descripcion - Descripción del compromiso.
 * @property {string} responsableId - ID del usuario responsable de ejecutar el compromiso.
 * @property {string} fechaLimite - Fecha límite para el cumplimiento (ISO YYYY-MM-DD).
 * @property {EstadoCompromiso} estado - Estado del compromiso.
 * @property {string | null} observaciones - Observaciones adicionales (puede ser null).
 * @property {Date} fechaCreacion - Fecha y hora de registro del compromiso.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface ICompromisoComite {
    id: string;
    empresaId: string; // NIT de la empresa
    actaId: string;
    descripcion: string;
    responsableId: string;
    fechaLimite: string;           // ISO YYYY-MM-DD
    estado: EstadoCompromiso;
    observaciones: string | null;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}