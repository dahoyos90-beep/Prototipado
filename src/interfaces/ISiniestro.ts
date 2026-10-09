/**
 * src/interfaces/ISiniestro.ts
 * 
 * Interfaz que define la estructura del Registro Nominal de Accidentes
 * e Incidentes del módulo M25 - Gestión de Siniestralidad.
 * 
 * Corresponde al archivo fuente "Registro Accidentes.xls" del sistema de
 * gestión SG-SST. Cada registro representa un evento individual (accidente
 * o incidente) con su caracterización completa según NTC 3701, análisis
 * causal y plan de acción.
 * 
 * Este registro alimenta automáticamente la matriz mensual consolidada
 * del archivo "APLICATIVO ESTADISTICO DE ACCIDENTALIDAD.xls".
 * 
 * Basado en:
 * - Resolución 0312 de 2019 (estándares mínimos del SG-SST)
 * - Decreto 1072 de 2015 (registro y reporte de accidentes)
 * - NTC 3701 (clasificación, registro y estadística de AT y EL)
 * - Ley 2101 de 2021 (jornada laboral)
 * 
 * @version 2.0.0
 *  - Reescritura completa para M25. Se ajusta a las columnas del Excel
 *    "Registro Accidentes.xls" + metadatos. Se retiran del archivo
 *    IIndicadoresSiniestralidad, ITendenciaSiniestralidad e
 *    IConsolidadoAnualSiniestralidad (los indicadores se calculan al vuelo
 *    y el consolidado vive en su propio archivo).
 * 
 * @version 1.1.0 (agregado empresaId a ISiniestro)
 * @since 2026-08-31
 */

// ================================================================
// TIPOS BÁSICOS
// ================================================================

/**
 * Tipo de siniestro según la naturaleza del evento.
 * 
 * - AccidenteTrabajo:  Accidente ocurrido en el entorno laboral.
 * - Incidente:         Evento que pudo haber causado daño pero no lo hizo
 *                      (casi accidente).
 * - EnfermedadLaboral: Enfermedad causada por factores laborales.
 * - AccidenteComun:    Accidente fuera del entorno laboral (registrado
 *                      para control).
 * - Otro:              Cualquier otro tipo de siniestro.
 */
export type TipoSiniestro =
    | "AccidenteTrabajo"
    | "Incidente"
    | "EnfermedadLaboral"
    | "AccidenteComun"
    | "Otro";

/**
 * Estado de un registro de accidente/incidente en el sistema.
 * 
 * - Registrado:       Evento ingresado, pendiente de investigación.
 * - EnInvestigacion:  Evento en proceso de investigación causal.
 * - Cerrado:          Evento investigado, con plan de acción ejecutado.
 * - ReportadoARL:     Evento reportado a la ARL (solo para AT).
 */
export type EstadoSiniestro =
    | "Registrado"
    | "EnInvestigacion"
    | "Cerrado"
    | "ReportadoARL";

/**
 * Gravedad de las lesiones en un siniestro.
 * 
 * - Leve:      Lesiones menores sin incapacidad.
 * - Moderado:  Lesiones con incapacidad temporal.
 * - Grave:     Lesiones con incapacidad permanente o secuelas.
 * - Fatal:     Lesiones que resultaron en fallecimiento.
 */
export type GravedadLesion = "Leve" | "Moderado" | "Grave" | "Fatal";

/**
 * Sexo del trabajador accidentado.
 * 
 * - H: Hombre.
 * - M: Mujer.
 */
export type SexoTrabajador = "H" | "M";

/**
 * Día de la semana en formato corto (2 letras) según el Excel original.
 * 
 * - Lu: Lunes
 * - Ma: Martes
 * - Mi: Miércoles
 * - Ju: Jueves
 * - Vi: Viernes
 * - Sa: Sábado
 * - Do: Domingo
 */
export type DiaSemana =
    | "Lu"
    | "Ma"
    | "Mi"
    | "Ju"
    | "Vi"
    | "Sa"
    | "Do";

// ================================================================
// INTERFAZ PRINCIPAL: ISiniestro
// ================================================================

/**
 * Interfaz ISiniestro
 * 
 * Define la estructura completa de un registro de accidente o incidente
 * del módulo M25 - Gestión de Siniestralidad. Cada registro equivale a
 * una fila del Excel "Registro Accidentes.xls".
 * 
 * --- Bloque 0: Identificación y metadatos ---
 * @property {string}  id                 - ID único del registro (generado por el sistema).
 * @property {string}  empresaId          - NIT de la empresa activa.
 * @property {number}  item               - Consecutivo incremental (columna ITEM del Excel).
 * @property {string}  anio               - Año del registro (YYYY). Va en el encabezado del Excel.
 * @property {Date}    fechaCreacion      - Fecha y hora de creación del registro.
 * @property {Date}    fechaActualizacion - Fecha y hora de la última modificación.
 * 
 * --- Bloque 1: Ocurrencia del evento ---
 * @property {string}     fechaEvento - Fecha exacta del evento (ISO YYYY-MM-DD).
 * @property {number}     mes         - Mes del evento (1-12). Derivado de fechaEvento.
 * @property {number}     dia         - Día del mes del evento (1-31). Derivado de fechaEvento.
 * @property {string}     hora        - Hora del evento (formato libre: "13h10", "17:30").
 * @property {DiaSemana}  diaSemana   - Día de la semana corto. Derivado de fechaEvento.
 * 
 * --- Bloque 2: Ausentismo e incapacidades ---
 * @property {number} ausentismoMesAccidente  - Días de incapacidad en el mes del evento.
 * @property {number} ausentismoMesSiguiente  - Días de incapacidad prorrogados al mes siguiente.
 * @property {number} totalDiasPerdidos       - Suma de los dos anteriores. Derivado.
 * 
 * --- Bloque 3: Datos generales del trabajador ---
 * @property {string}          nombreAccidentado - Nombre completo del accidentado.
 * @property {string}          cedula            - Cédula de ciudadanía (o "eventual" si es contratista).
 * @property {SexoTrabajador}  sexo              - Sexo (H/M).
 * @property {number}          edad              - Edad en años al momento del evento.
 * @property {string}          tiempoTrabajo     - Antigüedad (string libre: "2m", "1a", "3sem").
 * @property {boolean}         tareaHabitual     - ¿Realizaba su labor habitual al momento del evento?
 * @property {boolean}         usoEPP            - ¿Portaba los Elementos de Protección Personal?
 * 
 * --- Bloque 4: Ubicación y puesto de trabajo ---
 * @property {string} area   - Área u obra donde ocurrió (ej. "Sistemas", "Despacho").
 * @property {string} puesto - Cargo o puesto de trabajo (ej. "Chofer", "Estibador").
 * 
 * --- Bloque 5: Caracterización de la lesión (NTC 3701) ---
 * @property {string} naturalezaLesion  - Clasificación normalizada (ej. "Herida cortante", "Caída").
 * @property {string} parteCuerpo       - Ubicación anatómica (ej. "Rodilla derecha", "Cabeza").
 * @property {string} descripcionLesion - Detalle clínico u operativo corto.
 * @property {string} agente            - Objeto o elemento que causó la lesión.
 * @property {string} fuente            - Entorno u operación específica.
 * @property {string} tipoContacto      - Mecanismo del evento (ej. "Caída al mismo nivel").
 * 
 * --- Bloque 6: Análisis causal ---
 * @property {string} condicionSubestandar - Condición física o ambiental insegura presente.
 * @property {string} actoSubestandar      - Acción u omisión insegura del trabajador o terceros.
 * @property {string} factoresTrabajo      - Fallas en mantenimiento, supervisión o procedimientos.
 * @property {string} factoresPersonales   - Exceso de confianza, fatiga, falta de capacitación.
 * 
 * --- Bloque 7: Relato detallado ---
 * @property {string} descripcionDetallada - Descripción narrativa completa del evento.
 * 
 * --- Bloque 8: Acciones y medidas correctivas ---
 * @property {string}  medidasCumplidas         - Plan de acción formulado y estado de ejecución.
 * @property {boolean} actividadCapacitacion    - ¿Se aplicó capacitación como medida?
 * @property {boolean} actividadMantenimiento   - ¿Se aplicó mantenimiento como medida?
 * @property {boolean} actividadAseo            - ¿Se aplicó aseo / orden y limpieza como medida?
 * @property {boolean} actividadAjusteHoras     - ¿Se ajustaron horas de trabajo como medida?
 * 
 * --- Estado y clasificación (derivados / de control) ---
 * @property {EstadoSiniestro} estado   - Estado del evento (Registrado, EnInvestigacion, Cerrado, ReportadoARL).
 * @property {GravedadLesion}  gravedad - Gravedad de las lesiones ocasionadas.
 * @property {TipoSiniestro}   tipo     - Tipo de siniestro (AccidenteTrabajo, Incidente, etc.).
 */
export interface ISiniestro {
    // --- Bloque 0: Identificación y metadatos ---
    id: string;
    empresaId: string;
    item: number;
    anio: string;
    fechaCreacion: Date;
    fechaActualizacion: Date;

    // --- Bloque 1: Ocurrencia del evento ---
    fechaEvento: string;
    mes: number;
    dia: number;
    hora: string;
    diaSemana: DiaSemana;

    // --- Bloque 2: Ausentismo e incapacidades ---
    ausentismoMesAccidente: number;
    ausentismoMesSiguiente: number;
    totalDiasPerdidos: number;

    // --- Bloque 3: Datos generales del trabajador ---
    nombreAccidentado: string;
    cedula: string;
    sexo: SexoTrabajador;
    edad: number;
    tiempoTrabajo: string;
    tareaHabitual: boolean;
    usoEPP: boolean;

    // --- Bloque 4: Ubicación y puesto de trabajo ---
    area: string;
    puesto: string;

    // --- Bloque 5: Caracterización de la lesión (NTC 3701) ---
    naturalezaLesion: string;
    parteCuerpo: string;
    descripcionLesion: string;
    agente: string;
    fuente: string;
    tipoContacto: string;

    // --- Bloque 6: Análisis causal ---
    condicionSubestandar: string;
    actoSubestandar: string;
    factoresTrabajo: string;
    factoresPersonales: string;

    // --- Bloque 7: Relato detallado ---
    descripcionDetallada: string;

    // --- Bloque 8: Acciones y medidas correctivas ---
    medidasCumplidas: string;
    actividadCapacitacion: boolean;
    actividadMantenimiento: boolean;
    actividadAseo: boolean;
    actividadAjusteHoras: boolean;

    // --- Estado y clasificación ---
    estado: EstadoSiniestro;
    gravedad: GravedadLesion;
    tipo: TipoSiniestro;
}