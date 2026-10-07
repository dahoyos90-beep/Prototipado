/**
 * src/interfaces/IConvivencia.ts
 * 
 * Interfaz que define la estructura del Comité de Convivencia en el sistema.
 * Corresponde al módulo M10 - Gestión del Comité de Convivencia (CU34 al CU37).
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Comité de Convivencia.
 * - Permitir la conformación oficial (CU34), canal de quejas (CU35),
 *   gestión de casos (CU36) y repositorio de actas (CU37).
 * 
 * @version 1.1.0 (agregado empresaId a las 4 interfaces)
 * @since 2026-08-31
 */

/**
 * Estado del Comité de Convivencia.
 * - Activo: Comité funcionando correctamente.
 * - Inactivo: Comité suspendido o disuelto.
 * - EnFormalizacion: Comité en proceso de conformación (falta documentación).
 */
export type EstadoConvivencia = "Activo" | "Inactivo" | "EnFormalizacion";

/**
 * Estado de una queja radicada en el Comité de Convivencia.
 * - Radicada: Queja ingresada, pendiente de revisión.
 * - EnInvestigacion: Comité en proceso de investigación.
 * - Citacion: Se han citado a las partes involucradas.
 * - EnConciliacion: Proceso de conciliación en curso.
 * - Cerrada: Caso resuelto y cerrado.
 * - Trasladada: Caso trasladado a entidad externa (ej. Ministerio de Trabajo).
 */
export type EstadoQueja = "Radicada" | "EnInvestigacion" | "Citacion" | "EnConciliacion" | "Cerrada" | "Trasladada";

/**
 * Tipo de queja según la naturaleza del incidente.
 * - AcosoLaboral: Acoso en el entorno laboral.
 * - Discriminacion: Discriminación por género, raza, religión, etc.
 * - Hostigamiento: Hostigamiento o intimidación.
 * - Violencia: Violencia física o verbal.
 * - Otro: Cualquier otro tipo de queja.
 */
export type TipoQueja = "AcosoLaboral" | "Discriminacion" | "Hostigamiento" | "Violencia" | "Otro";

/**
 * Interfaz IConvivencia
 * 
 * Define la estructura completa del Comité de Convivencia.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único del comité (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el comité.
 * @property {string} nombre - Nombre descriptivo del comité (ej. "Comité de Convivencia - Sede Principal").
 * @property {string[]} miembrosEmpleador - IDs de los usuarios que representan a la parte empleadora.
 * @property {string[]} miembrosTrabajadores - IDs de los usuarios que representan a la parte trabajadora.
 * @property {string} actaEleccion - URL o nombre del archivo PDF del acta de elección (documento legal).
 * @property {string} fechaInicioVigencia - Fecha de inicio del periodo de vigencia (ISO YYYY-MM-DD).
 * @property {string} fechaFinVigencia - Fecha de fin del periodo de vigencia (ISO YYYY-MM-DD).
 * @property {EstadoConvivencia} estado - Estado del comité.
 * @property {Date} fechaCreacion - Fecha y hora de registro del comité.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IConvivencia {
    id: string;
    empresaId: string; // NIT de la empresa
    nombre: string;
    miembrosEmpleador: string[];
    miembrosTrabajadores: string[];
    actaEleccion: string;          // Nombre de archivo PDF
    fechaInicioVigencia: string;   // ISO YYYY-MM-DD
    fechaFinVigencia: string;      // ISO YYYY-MM-DD
    estado: EstadoConvivencia;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

/**
 * Interfaz IQuejaConvivencia
 * 
 * Define la estructura de una queja radicada en el Comité de Convivencia (CU35).
 * La queja puede ser anónima o con identificación del quejoso.
 * 
 * @property {string} id - Identificador único de la queja (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece la queja.
 * @property {string} comiteId - ID del comité al que pertenece.
 * @property {string | null} quejosoId - ID del usuario que radica la queja (puede ser null si es anónimo).
 * @property {string | null} quejosoNombre - Nombre del quejoso (si se proporciona, para casos anónimos se omite).
 * @property {TipoQueja} tipo - Tipo de queja según la naturaleza del incidente.
 * @property {string} descripcion - Descripción detallada del incidente.
 * @property {string | null} pruebasAdjuntas - URLs o nombres de archivos de pruebas (puede ser null).
 * @property {boolean} esAnonimo - Indica si la queja es anónima.
 * @property {string} fechaRadicacion - Fecha de radicación de la queja (ISO YYYY-MM-DD).
 * @property {string | null} fechaInvestigacion - Fecha de inicio de investigación (puede ser null).
 * @property {string} numeroRadicado - Número de radicado único generado por el sistema.
 * @property {EstadoQueja} estado - Estado actual de la queja.
 * @property {Date} fechaCreacion - Fecha y hora de registro de la queja.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IQuejaConvivencia {
    id: string;
    empresaId: string; // NIT de la empresa
    comiteId: string;
    quejosoId: string | null;
    quejosoNombre: string | null;
    tipo: TipoQueja;
    descripcion: string;
    pruebasAdjuntas: string | null;
    esAnonimo: boolean;
    fechaRadicacion: string;       // ISO YYYY-MM-DD
    fechaInvestigacion: string | null; // ISO YYYY-MM-DD
    numeroRadicado: string;
    estado: EstadoQueja;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

/**
 * Interfaz ICasoConvivencia
 * 
 * Define la estructura de un caso asociado a una queja (CU36).
 * Representa el ciclo de vida completo de la queja: citaciones, acuerdos, cierre.
 * 
 * @property {string} id - Identificador único del caso (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el caso.
 * @property {string} quejaId - ID de la queja asociada.
 * @property {string} comiteId - ID del comité que gestiona el caso.
 * @property {string[]} citaciones - Descripciones de las citaciones realizadas (ej. "Citación a quejoso - 15/08/2026").
 * @property {string | null} acuerdos - Acuerdos logrados en las reuniones (puede ser null).
 * @property {string | null} actaCompromiso - URL o nombre del archivo PDF del acta de compromiso (puede ser null).
 * @property {string | null} trasladoExterno - Descripción del traslado a entidad externa (puede ser null).
 * @property {EstadoQueja} estado - Estado actual del caso (debe coincidir con el estado de la queja).
 * @property {string | null} fechaCierre - Fecha de cierre del caso (ISO YYYY-MM-DD, puede ser null si no está cerrado).
 * @property {Date} fechaCreacion - Fecha y hora de registro del caso.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface ICasoConvivencia {
    id: string;
    empresaId: string; // NIT de la empresa
    quejaId: string;
    comiteId: string;
    citaciones: string[];
    acuerdos: string | null;
    actaCompromiso: string | null;
    trasladoExterno: string | null;
    estado: EstadoQueja;
    fechaCierre: string | null;    // ISO YYYY-MM-DD
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

/**
 * Interfaz IActaConvivencia
 * 
 * Define la estructura de un acta de reunión del Comité de Convivencia (CU37).
 * Incluye restricciones de acceso para proteger la información sensible.
 * 
 * @property {string} id - Identificador único del acta (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el acta.
 * @property {string} comiteId - ID del comité al que pertenece.
 * @property {string} fechaReunion - Fecha de la reunión (ISO YYYY-MM-DD).
 * @property {string} tipoReunion - "Ordinaria" | "Extraordinaria".
 * @property {string} resumen - Resumen del contenido del acta.
 * @property {string} archivoPDF - URL o nombre del archivo PDF del acta.
 * @property {string[]} asistentes - IDs de los miembros que asistieron.
 * @property {string[]} permisosAcceso - IDs de usuarios o roles con permiso para acceder al acta (ej. "Comite", "Empresa", "Auditor").
 * @property {Date} fechaCreacion - Fecha y hora de registro del acta.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IActaConvivencia {
    id: string;
    empresaId: string; // NIT de la empresa
    comiteId: string;
    fechaReunion: string;          // ISO YYYY-MM-DD
    tipoReunion: "Ordinaria" | "Extraordinaria";
    resumen: string;
    archivoPDF: string;            // Nombre de archivo PDF
    asistentes: string[];          // IDs de usuarios
    permisosAcceso: string[];      // IDs de usuarios o roles autorizados
    fechaCreacion: Date;
    fechaActualizacion: Date;
}