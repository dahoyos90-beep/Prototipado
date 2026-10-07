/**
 * src/interfaces/ISiniestro.ts
 * 
 * Interfaz que define la estructura de Siniestralidad en el sistema.
 * Corresponde al módulo M13 - Gestión de Siniestralidad (CU45 al CU48).
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Siniestro.
 * - Permitir el registro de siniestros (CU45), cálculo de indicadores (CU46),
 *   visualización de gráficas evolutivas (CU47) y consolidado anual (CU48).
 * 
 * @version 1.1.0 (agregado empresaId a ISiniestro)
 * @since 2026-08-31
 */

/**
 * Tipo de siniestro según la naturaleza del evento.
 * - AccidenteTrabajo: Accidente ocurrido en el entorno laboral.
 * - Incidente: Evento que pudo haber causado daño pero no lo hizo (casi accidente).
 * - EnfermedadLaboral: Enfermedad causada por factores laborales.
 * - AccidenteComun: Accidente fuera del entorno laboral (registrado para control).
 * - Otro: Cualquier otro tipo de siniestro.
 */
export type TipoSiniestro = "AccidenteTrabajo" | "Incidente" | "EnfermedadLaboral" | "AccidenteComun" | "Otro";

/**
 * Estado de un siniestro en el sistema.
 * - Registrado: Siniestro ingresado, pendiente de investigación.
 * - EnInvestigacion: Siniestro en proceso de investigación.
 * - Cerrado: Siniestro investigado y cerrado.
 * - ReportadoARL: Siniestro reportado a la ARL (para accidentes de trabajo).
 */
export type EstadoSiniestro = "Registrado" | "EnInvestigacion" | "Cerrado" | "ReportadoARL";

/**
 * Gravedad de las lesiones en un siniestro.
 * - Leve: Lesiones menores sin incapacidad.
 * - Moderado: Lesiones con incapacidad temporal.
 * - Grave: Lesiones con incapacidad permanente o secuelas.
 * - Fatal: Lesiones que resultaron en fallecimiento.
 */
export type GravedadLesion = "Leve" | "Moderado" | "Grave" | "Fatal";

/**
 * Interfaz ISiniestro
 * 
 * Define la estructura completa de un siniestro en el prototipo SG-SST Manager.
 * Corresponde al CU45 - Registro de Siniestros.
 * 
 * @property {string} id - Identificador único del siniestro (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el siniestro.
 * @property {string} trabajadorId - ID del trabajador afectado (referencia a IUsuario.id).
 * @property {TipoSiniestro} tipo - Tipo de siniestro (AccidenteTrabajo, Incidente, etc.).
 * @property {string} fechaEvento - Fecha en que ocurrió el siniestro (ISO YYYY-MM-DD).
 * @property {string} fechaRegistro - Fecha de registro del siniestro en el sistema (ISO YYYY-MM-DD).
 * @property {string} horaEvento - Hora aproximada del evento (formato HH:MM).
 * @property {string} lugar - Ubicación donde ocurrió el siniestro.
 * @property {string} descripcion - Descripción detallada del evento y circunstancias.
 * @property {GravedadLesion} gravedad - Gravedad de las lesiones ocasionadas.
 * @property {string} parteAfectada - Descripción de la parte del cuerpo afectada (ej. "Brazo derecho").
 * @property {number} diasPerdidos - Días de incapacidad o ausencia laboral.
 * @property {number} horasPerdidas - Horas de incapacidad o ausencia laboral (si aplica).
 * @property {string | null} informeInvestigacion - URL o nombre del archivo PDF del informe de investigación (puede ser null).
 * @property {string | null} reporteARL - URL o nombre del archivo PDF del reporte a la ARL (puede ser null).
 * @property {EstadoSiniestro} estado - Estado actual del siniestro.
 * @property {Date} fechaCreacion - Fecha y hora de registro del siniestro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface ISiniestro {
    id: string;
    empresaId: string; // NIT de la empresa
    trabajadorId: string;
    tipo: TipoSiniestro;
    fechaEvento: string;          // ISO YYYY-MM-DD
    fechaRegistro: string;        // ISO YYYY-MM-DD
    horaEvento: string;           // HH:MM
    lugar: string;
    descripcion: string;
    gravedad: GravedadLesion;
    parteAfectada: string;
    diasPerdidos: number;
    horasPerdidas: number;
    informeInvestigacion: string | null;
    reporteARL: string | null;
    estado: EstadoSiniestro;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

/**
 * Interfaz IIndicadoresSiniestralidad
 * 
 * Define la estructura de los indicadores calculados para siniestralidad (CU46).
 * Se utiliza para el motor de cálculos y la generación de reportes.
 * 
 * @property {string} periodo - Periodo de análisis (ej. "2026-08" para agosto 2026).
 * @property {number} totalTrabajadores - Número total de trabajadores en el periodo.
 * @property {number} horasHombreTrabajadas - Total de horas-hombre trabajadas en el periodo.
 * @property {number} totalAccidentes - Número total de accidentes de trabajo registrados.
 * @property {number} totalIncidentes - Número total de incidentes registrados.
 * @property {number} totalDiasPerdidos - Total de días perdidos por accidentes.
 * @property {number} indiceFrecuencia - Índice de Frecuencia (IF) calculado.
 * @property {number} indiceSeveridad - Índice de Severidad (IS) calculado.
 * @property {number} tasaAccidentabilidad - Tasa de accidentabilidad (por cada 100 trabajadores).
 * @property {number} porcentajeIncidentes - Porcentaje de incidentes sobre el total de siniestros.
 * @property {Record<TipoSiniestro, number>} distribucionPorTipo - Distribución de siniestros por tipo.
 * @property {Record<GravedadLesion, number>} distribucionPorGravedad - Distribución de siniestros por gravedad.
 * @property {Date} fechaCalculo - Fecha y hora del cálculo.
 */
export interface IIndicadoresSiniestralidad {
    periodo: string;              // "YYYY-MM"
    totalTrabajadores: number;
    horasHombreTrabajadas: number;
    totalAccidentes: number;
    totalIncidentes: number;
    totalDiasPerdidos: number;
    indiceFrecuencia: number;     // IF = (N° Accidentes / HH Trabajadas) * 1,000,000
    indiceSeveridad: number;      // IS = (Días Perdidos / HH Trabajadas) * 1,000,000
    tasaAccidentabilidad: number; // (N° Accidentes / Total Trabajadores) * 100
    porcentajeIncidentes: number; // (Incidentes / Total Siniestros) * 100
    distribucionPorTipo: Record<TipoSiniestro, number>;
    distribucionPorGravedad: Record<GravedadLesion, number>;
    fechaCalculo: Date;
}

/**
 * Interfaz ITendenciaSiniestralidad
 * 
 * Define la estructura de los datos procesados para las gráficas evolutivas (CU47).
 * Se genera a partir de los indicadores históricos.
 * 
 * @property {string} periodo - Periodo de análisis (ej. "2026-08").
 * @property {Array<{mes: string, indiceFrecuencia: number, indiceSeveridad: number}>} datosMensuales - Datos mensuales de IF e IS.
 * @property {Array<{mes: string, tasaAccidentabilidad: number}>} datosTasa - Datos mensuales de tasa de accidentabilidad.
 * @property {number} variacionAnualIF - Variación porcentual del IF comparado con el año anterior.
 * @property {number} variacionAnualIS - Variación porcentual del IS comparado con el año anterior.
 * @property {string} tendenciaGeneral - "Mejora" | "Deterioro" | "Estable" (indicador de dirección).
 * @property {Date} fechaActualizacion - Fecha de la última actualización de la tendencia.
 */
export interface ITendenciaSiniestralidad {
    periodo: string;              // "YYYY-MM"
    datosMensuales: Array<{
        mes: string;             // "YYYY-MM"
        indiceFrecuencia: number;
        indiceSeveridad: number;
    }>;
    datosTasa: Array<{
        mes: string;             // "YYYY-MM"
        tasaAccidentabilidad: number;
    }>;
    variacionAnualIF: number;
    variacionAnualIS: number;
    tendenciaGeneral: "Mejora" | "Deterioro" | "Estable";
    fechaActualizacion: Date;
}

/**
 * Interfaz IConsolidadoAnualSiniestralidad
 * 
 * Define la estructura del cierre anual de siniestralidad (CU48).
 * Incluye el resumen ejecutivo y los datos consolidados.
 * 
 * @property {string} anio - Año del cierre (ej. "2026").
 * @property {string} empresaNombre - Nombre de la empresa para el encabezado.
 * @property {string} empresaNit - NIT de la empresa.
 * @property {Array<ISiniestro>} siniestrosAnuales - Lista de todos los siniestros del año.
 * @property {IIndicadoresSiniestralidad} indicadoresAnuales - Indicadores consolidados del año.
 * @property {number} promedioMensualAccidentes - Promedio mensual de accidentes.
 * @property {number} promedioMensualIncidentes - Promedio mensual de incidentes.
 * @property {string} estadoCierre - Estado del cierre ("Abierto" | "Cerrado").
 * @property {string | null} fechaCierre - Fecha de cierre del periodo (ISO YYYY-MM-DD, puede ser null).
 * @property {string | null} firmadoPor - Nombre de quien firma el reporte (puede ser null).
 * @property {Date} fechaGeneracion - Fecha y hora de generación del consolidado.
 */
export interface IConsolidadoAnualSiniestralidad {
    anio: string;                 // "YYYY"
    empresaNombre: string;
    empresaNit: string;
    siniestrosAnuales: ISiniestro[];
    indicadoresAnuales: IIndicadoresSiniestralidad;
    promedioMensualAccidentes: number;
    promedioMensualIncidentes: number;
    estadoCierre: "Abierto" | "Cerrado";
    fechaCierre: string | null;   // ISO YYYY-MM-DD
    firmadoPor: string | null;
    fechaGeneracion: Date;
}