/**
 * src/interfaces/IAusentismo.ts
 * 
 * Interfaz que define la estructura de Ausentismo en el sistema.
 * Corresponde al módulo M12 - Gestión de Ausentismo (CU41 al CU44).
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Ausentismo.
 * - Permitir el registro de novedades (CU41), categorización de causas (CU42),
 *   visualización de estadísticas (CU43) y generación de reportes (CU44).
 * 
 * @version 1.1.0 (agregado empresaId a IAusentismo e ICausaAusentismo)
 * @since 2026-08-31
 */

/**
 * Causas de ausentismo según la normativa y clasificación interna.
 * - EnfermedadGeneral: Incapacidad por enfermedad no laboral.
 * - AccidenteTrabajo: Lesión o enfermedad derivada del trabajo.
 * - AccidenteComun: Accidente fuera del entorno laboral.
 * - LicenciaMaternidad: Licencia por maternidad/paternidad.
 * - LicenciaRemunerada: Vacaciones, permisos remunerados.
 * - LicenciaNoRemunerada: Permisos sin goce de sueldo.
 * - Suspension: Suspensión de contrato por causas justificadas.
 * - Otro: Cualquier otra causa no clasificada.
 */
export type CausaAusentismo =
  | "EnfermedadGeneral"
  | "AccidenteTrabajo"
  | "AccidenteComun"
  | "LicenciaMaternidad"
  | "LicenciaRemunerada"
  | "LicenciaNoRemunerada"
  | "Suspension"
  | "Otro";

/**
 * Estado de una novedad de ausentismo.
 * - Activo: Novedad vigente, el trabajador aún está ausente.
 * - Cerrado: Novedad finalizada, el trabajador ya regresó.
 * - Anulado: Novedad anulada por error o corrección.
 */
export type EstadoNovedad = "Activo" | "Cerrado" | "Anulado";

/**
 * Tipo de jornada laboral para el cálculo de horas/días.
 * - Diurna: Jornada diurna estándar.
 * - Nocturna: Jornada nocturna.
 * - Mixta: Combinación de diurna y nocturna.
 */
export type TipoJornada = "Diurna" | "Nocturna" | "Mixta";

/**
 * Interfaz IAusentismo
 * 
 * Define la estructura completa de una novedad de ausentismo (CU41).
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único de la novedad (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece la novedad.
 * @property {string} trabajadorId - ID del trabajador ausente (referencia a IUsuario.id).
 * @property {string} fechaInicio - Fecha de inicio del ausentismo (ISO YYYY-MM-DD).
 * @property {string} fechaFin - Fecha de finalización del ausentismo (ISO YYYY-MM-DD).
 * @property {number} diasTotales - Total de días de ausentismo (calculado automáticamente).
 * @property {number} horasTotales - Total de horas de ausentismo (calculado automáticamente, si aplica).
 * @property {CausaAusentismo} causa - Causa del ausentismo (seleccionada del catálogo).
 * @property {string} descripcion - Descripción detallada del motivo o situación.
 * @property {string | null} soporteMedico - URL o nombre del archivo PDF de la incapacidad o soporte (puede ser null).
 * @property {EstadoNovedad} estado - Estado de la novedad.
 * @property {TipoJornada} tipoJornada - Tipo de jornada laboral del trabajador.
 * @property {string | null} observaciones - Observaciones adicionales (puede ser null).
 * @property {Date} fechaCreacion - Fecha y hora de registro de la novedad.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IAusentismo {
    id: string;
    empresaId: string; // NIT de la empresa
    trabajadorId: string;
    fechaInicio: string;          // ISO YYYY-MM-DD
    fechaFin: string;             // ISO YYYY-MM-DD
    diasTotales: number;
    horasTotales: number;
    causa: CausaAusentismo;
    descripcion: string;
    soporteMedico: string | null;
    estado: EstadoNovedad;
    tipoJornada: TipoJornada;
    observaciones: string | null;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

/**
 * Interfaz ICausaAusentismo
 * 
 * Define la estructura de un registro en la matriz de causas (CU42).
 * Permite categorizar y organizar las causas de ausentismo de forma estructurada.
 * 
 * @property {string} id - Identificador único de la causa (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece la causa.
 * @property {CausaAusentismo} causa - Tipo de causa (EnfermedadGeneral, AccidenteTrabajo, etc.).
 * @property {string} sigla - Sigla de la causa (ej. "EG" para Enfermedad General).
 * @property {string} descripcionCorta - Descripción breve de la causa.
 * @property {string} descripcionLarga - Descripción detallada de la causa.
 * @property {boolean} requiereSoporte - Indica si la causa requiere soporte médico o documento.
 * @property {string[]} rolesAplicables - Roles a los que aplica la causa (ej. "Todos", "Trabajador", "Profesional").
 * @property {Date} fechaCreacion - Fecha y hora de registro de la causa.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface ICausaAusentismo {
    id: string;
    empresaId: string; // NIT de la empresa
    causa: CausaAusentismo;
    sigla: string;               // Ej. "EG", "AT", "LM"
    descripcionCorta: string;
    descripcionLarga: string;
    requiereSoporte: boolean;
    rolesAplicables: string[];
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

/**
 * Interfaz IEstadisticaAusentismo
 * 
 * Define la estructura de las estadísticas de ausentismo (CU43).
 * Se utiliza para el panel de indicadores clave.
 * 
 * @property {string} periodo - Periodo de análisis (ej. "2026-08" para agosto 2026).
 * @property {number} totalTrabajadores - Número total de trabajadores en el periodo.
 * @property {number} totalNovedades - Número total de novedades registradas en el periodo.
 * @property {number} porcentajeAusentismo - Porcentaje de ausentismo calculado (total días perdidos / total días laborales * 100).
 * @property {number} totalDiasPerdidos - Total de días perdidos por ausentismo.
 * @property {number} totalHorasPerdidas - Total de horas perdidas por ausentismo.
 * @property {Record<CausaAusentismo, number>} distribucionPorCausa - Distribución de novedades por causa (objeto clave-valor).
 * @property {Record<string, number>} distribucionPorArea - Distribución de novedades por área (objeto clave-valor).
 * @property {number} tendenciaMensual - Variación porcentual con respecto al mes anterior.
 * @property {Date} fechaActualizacion - Fecha de la última actualización de las estadísticas.
 */
export interface IEstadisticaAusentismo {
    periodo: string;              // "YYYY-MM"
    totalTrabajadores: number;
    totalNovedades: number;
    porcentajeAusentismo: number; // 0-100
    totalDiasPerdidos: number;
    totalHorasPerdidas: number;
    distribucionPorCausa: Record<CausaAusentismo, number>;
    distribucionPorArea: Record<string, number>;
    tendenciaMensual: number;      // Variación porcentual
    fechaActualizacion: Date;
}

/**
 * Interfaz IReporteAusentismo
 * 
 * Define la estructura de un informe mensual de ausentismo (CU44).
 * Incluye los datos consolidados para la generación del reporte oficial.
 * 
 * @property {string} periodo - Mes y año del reporte (ej. "2026-08").
 * @property {string} empresaNombre - Nombre de la empresa para el encabezado.
 * @property {string} empresaNit - NIT de la empresa.
 * @property {Array<IAusentismo>} novedades - Lista de novedades del periodo.
 * @property {IEstadisticaAusentismo} estadisticas - Estadísticas consolidadas del periodo.
 * @property {string} estadoCierre - Estado del cierre del periodo ("Abierto" | "Cerrado").
 * @property {string | null} fechaCierre - Fecha de cierre del periodo (ISO YYYY-MM-DD, puede ser null).
 * @property {string | null} firmadoPor - Nombre de quien firma el reporte (puede ser null).
 * @property {Date} fechaGeneracion - Fecha y hora de generación del reporte.
 */
export interface IReporteAusentismo {
    periodo: string;              // "YYYY-MM"
    empresaNombre: string;
    empresaNit: string;
    novedades: IAusentismo[];
    estadisticas: IEstadisticaAusentismo;
    estadoCierre: "Abierto" | "Cerrado";
    fechaCierre: string | null;   // ISO YYYY-MM-DD
    firmadoPor: string | null;
    fechaGeneracion: Date;
}