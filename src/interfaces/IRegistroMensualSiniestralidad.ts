/**
 * src/interfaces/IRegistroMensualSiniestralidad.ts
 * 
 * Interfaz que define la estructura del Registro Mensual del módulo
 * M25 - Gestión de Siniestralidad.
 * 
 * Corresponde a una columna mensual del Excel "APLICATIVO ESTADISTICO
 * DE ACCIDENTALIDAD.xls" (bloque "Datos"). Contiene las 6 variables
 * operativas que alimentan los 5 indicadores calculados.
 * 
 * Una instancia por empresa + año + mes. Clave natural:
 *   `${empresaId}__${anio}__${mes}`.
 * 
 * Los indicadores (IF, IF_inc, IS, ILI, %Inv) NO se persisten aquí.
 * Se calculan al vuelo desde `src/siniestralidad-utils.ts` a partir de
 * los valores crudos de este registro y de la configuración anual.
 * 
 * Basado en:
 * - Resolución 0312 de 2019 (indicadores mínimos)
 * - NTC 3701 (fórmulas de IF, IS, ILI)
 * - Ley 2101 de 2021 (afecta HHT)
 * 
 * @version 1.0.0
 * @since 2026-10-09
 */

// ================================================================
// INTERFAZ PRINCIPAL: IRegistroMensualSiniestralidad
// ================================================================

/**
 * Interfaz IRegistroMensualSiniestralidad
 * 
 * Define las 6 variables operativas de un mes más los campos auxiliares
 * de HHT (manual/calculada) y el vínculo con la configuración anual.
 * 
 * --- Identificación ---
 * @property {string} id         - ID único del registro mensual.
 * @property {string} empresaId  - NIT de la empresa activa.
 * @property {string} configId   - ID de la IConfiguracionSiniestralidad asociada.
 * @property {string} anio       - Año del registro (YYYY).
 * @property {number} mes        - Mes del registro (1-12).
 * 
 * --- HHT (Horas Hombre Trabajadas) ---
 * @property {number} numTrabajadores  - Número de trabajadores activos en el mes.
 *                                     Se usa para calcular la HHT automática.
 * @property {number} hhtManual        - Valor de HHT ingresado manualmente por el usuario.
 *                                     Puede ser 0 si el usuario prefiere cálculo automático.
 * @property {number} hhtCalculada     - HHT calculada automáticamente:
 *                                     numTrabajadores × horasMensuales.
 *                                     Si el toggle "🔒 HHT automática" está activo,
 *                                     este valor es el que se usa para los indicadores.
 * 
 * --- Variables operativas del mes (6) ---
 * @property {number} sumAT                    - ∑AT: accidentes de trabajo ocurridos en el mes.
 * @property {number} sumDiasPerdidos          - ∑Días Perdidos: días de incapacidad acumulados.
 * @property {number} sumATinc                 - ∑AT con incapacidad (subconjunto de sumAT).
 * @property {number} sumATmortal              - ∑AT mortales (subconjunto de sumAT).
 * @property {number} investigaciones          - Total de investigaciones realizadas y enviadas.
 * 
 * --- Estado de edición ---
 * @property {boolean} editadoManualmente - true si el usuario editó algún valor
 *                                          manualmente. Se usa para mostrar el badge
 *                                          de "modificado" y proteger contra
 *                                          sobreescritura silenciosa.
 * @property {string} observaciones       - Observaciones libres del mes (opcional).
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion      - Fecha y hora de creación.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 * @property {string} actualizadoPor   - Nombre o ID del usuario que hizo el último cambio.
 */
export interface IRegistroMensualSiniestralidad {
    // --- Identificación ---
    id: string;
    empresaId: string;
    configId: string;
    anio: string;
    mes: number;

    // --- HHT (Horas Hombre Trabajadas) ---
    numTrabajadores: number;
    hhtManual: number;
    hhtCalculada: number;

    // --- Variables operativas del mes ---
    sumAT: number;
    sumDiasPerdidos: number;
    sumATinc: number;
    sumATmortal: number;
    investigaciones: number;

    // --- Estado de edición ---
    editadoManualmente: boolean;
    observaciones: string;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
    actualizadoPor: string;
}