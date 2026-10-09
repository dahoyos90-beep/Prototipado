/**
 * src/siniestralidad-utils.ts
 * 
 * Utilidades puras del módulo M25 - Gestión de Siniestralidad.
 * 
 * Contiene:
 * - Constantes normativas (K, K_ILI).
 * - Cálculo de HHT (manual / calculada / escenarios 48h-42h).
 * - Cálculo de los 5 indicadores mensuales (IF, IF_inc, IS, ILI, %Inv).
 * - Cálculo del consolidado anual ponderado (recalculado, NO promedio).
 * - Rankings Top 5 (meses por IF/IS, áreas).
 * - Formateo (null → "—", redondeo a 2 decimales).
 * - Validaciones de negocio (∑ATinc ≤ ∑AT, ∑ATmortal ≤ ∑AT).
 * - Motor determinístico de textos interpretativos (plantillas).
 * 
 * IMPORTANTE: Este archivo NO accede al DOM ni al storage.
 * Es 100% puro: entrada → salida. Facilita testing y reutilización.
 * 
 * Basado en:
 * - NTC 3701 (constante K = 240.000, fórmulas IF / IS / ILI)
 * - Resolución 0312 de 2019 (indicadores mínimos del SG-SST)
 * - Ley 2101 de 2021 (jornada laboral de 42 a 48 horas)
 * - Decreto 1072 de 2015 (evaluación de indicadores)
 * 
 * @version 1.0.0
 * @since 2026-10-09
 */

import type { IConfiguracionSiniestralidad } from './interfaces/IConfiguracionSiniestralidad.js';
import type { IRegistroMensualSiniestralidad } from './interfaces/IRegistroMensualSiniestralidad.js';
import type {
    EscenarioJornada,
    IIndicadoresMensualesSiniestralidad
} from './interfaces/IIndicadoresMensualesSiniestralidad.js';
import type {
    IConsolidadoAnualSiniestralidad,
    IResumenMensualSiniestralidad,
    ITopAreaSiniestralidad,
    ITopMesSiniestralidad
} from './interfaces/IConsolidadoAnualSiniestralidad.js';
import type {
    GravedadLesion,
    TipoSiniestro
} from './interfaces/ISiniestro.js';

// ================================================================
// CONSTANTES NORMATIVAS
// ================================================================

/** Constante K de la NTC 3701. 100 trabajadores × 50 semanas × 48 horas. */
export const K_SINIESTRALIDAD = 240_000;

/** Constante divisor del Índice de Lesiones Incapacitantes (ILI). */
export const K_ILI = 1_000;

/** Horas mensuales estándar para jornada de 48 h/semana. */
export const HORAS_MES_48H = 240;

/** Horas mensuales estándar para jornada de 42 h/semana (Ley 2101). */
export const HORAS_MES_42H = 210;

/** Nombres de los meses en español, índice 0 = Enero. */
export const NOMBRES_MESES: readonly string[] = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// ================================================================
// FORMATO
// ================================================================

/**
 * Formatea un número con 2 decimales. Si el valor es `null`, devuelve "—".
 * Se usa en toda la UI de indicadores (decisión 21a).
 * 
 * @param valor - Número o null.
 * @returns {string} - Valor formateado o "—".
 */
export function formatearIndicador(valor: number | null): string {
    if (valor === null || !Number.isFinite(valor)) return "—";
    return valor.toFixed(2);
}

/**
 * Redondea un número a 2 decimales sin convertirlo a string.
 * 
 * @param valor - Número o null.
 * @returns {number | null} - Número redondeado o null.
 */
export function redondear2(valor: number | null): number | null {
    if (valor === null || !Number.isFinite(valor)) return null;
    return Math.round(valor * 100) / 100;
}

/**
 * Nombre del mes a partir del número (1-12).
 * 
 * @param mes - Número de mes (1-12).
 * @returns {string} - Nombre del mes, o "" si el número es inválido.
 */
export function nombreMes(mes: number): string {
    if (mes < 1 || mes > 12) return "";
    return NOMBRES_MESES[mes - 1] ?? "";
}

// ================================================================
// HHT — HORAS HOMBRE TRABAJADAS
// ================================================================

/**
 * Calcula las horas mensuales según la jornada de la configuración.
 * - "48h" → 240 h/mes.
 * - "42h" → 210 h/mes.
 * - "personalizada" → usa config.horasMensuales directamente.
 * 
 * @param config - Configuración anual.
 * @returns {number} - Horas mensuales por trabajador.
 */
export function calcularHorasMensuales(config: IConfiguracionSiniestralidad): number {
    if (config.jornadaReferencia === "48h") return HORAS_MES_48H;
    if (config.jornadaReferencia === "42h") return HORAS_MES_42H;
    return config.horasMensuales;
}

/**
 * Calcula la HHT de un mes. Si el toggle "HHT automática" está activo,
 * usa `numTrabajadores × horasMensuales`. Si no, respeta la HHT manual.
 * 
 * @param registro - Registro mensual.
 * @param config - Configuración anual.
 * @returns {number} - HHT efectiva del mes.
 */
export function calcularHHT(
    registro: IRegistroMensualSiniestralidad,
    config: IConfiguracionSiniestralidad
): number {
    if (config.hhtAutomatica) {
        const horasMes = calcularHorasMensuales(config);
        return registro.numTrabajadores * horasMes;
    }
    return registro.hhtManual;
}

// ================================================================
// INDICADORES MENSUALES
// ================================================================

/**
 * Calcula los 5 indicadores de un mes según NTC 3701.
 * 
 * Fórmulas:
 *   IF      = (∑AT × K) / HHT
 *   IF_inc  = (∑AT_inc × K) / HHT
 *   IS      = (∑DíasPerdidos × K) / HHT
 *   ILI     = (IF × IS) / K_ILI
 *   %Inv    = (Investigaciones / ∑AT) × 100
 *   %Mort   = (∑AT_mortal / ∑AT) × 100
 * 
 * Todas las divisiones por cero devuelven null (decisión 21a).
 * 
 * @param registro - Registro mensual con las variables crudas.
 * @param config - Configuración anual (para constantes y jornada).
 * @param escenario - Escenario de jornada 48h/42h (para el doble cálculo).
 * @returns {IIndicadoresMensualesSiniestralidad} - Indicadores calculados.
 */
export function calcularIndicadoresMensuales(
    registro: IRegistroMensualSiniestralidad,
    config: IConfiguracionSiniestralidad,
    escenario: EscenarioJornada
): IIndicadoresMensualesSiniestralidad {
    const hht = calcularHHT(registro, config);
    const k = config.constK;
    const kIli = config.constKILI;

    const ifAT: number | null = hht > 0
        ? (registro.sumAT * k) / hht
        : null;

    const ifInc: number | null = hht > 0
        ? (registro.sumATinc * k) / hht
        : null;

    const isAT: number | null = hht > 0
        ? (registro.sumDiasPerdidos * k) / hht
        : null;

    const ili: number | null = (ifAT !== null && isAT !== null)
        ? (ifAT * isAT) / kIli
        : null;

    const porcentajeInvestigaciones: number | null = registro.sumAT > 0
        ? (registro.investigaciones / registro.sumAT) * 100
        : null;

    const proporcionMortales: number | null = registro.sumAT > 0
        ? (registro.sumATmortal / registro.sumAT) * 100
        : null;

    const periodo = `${registro.anio}-${String(registro.mes).padStart(2, "0")}`;

    return {
        periodo,
        escenario,
        hht,
        sumAT: registro.sumAT,
        sumATinc: registro.sumATinc,
        sumATmortal: registro.sumATmortal,
        sumDiasPerdidos: registro.sumDiasPerdidos,
        investigaciones: registro.investigaciones,
        if_AT: redondear2(ifAT),
        if_inc: redondear2(ifInc),
        is_AT: redondear2(isAT),
        ili: redondear2(ili),
        porcentajeInvestigaciones: redondear2(porcentajeInvestigaciones),
        proporcionMortales: redondear2(proporcionMortales),
        constK: k,
        constKILI: kIli,
        fechaCalculo: new Date()
    };
}

// ================================================================
// CONSOLIDADO ANUAL
// ================================================================

/**
 * Calcula el consolidado anual a partir de los 12 registros mensuales.
 * Los indicadores anuales se recalculan con los totales brutos del año
 * (NO se promedian los IF/IS mensuales — regla NTC 3701).
 * 
 * @param registros - Array de registros mensuales (puede tener menos de 12).
 * @param config - Configuración anual.
 * @param escenario - Escenario de jornada a usar.
 * @param generadoPor - Nombre/ID del usuario que genera el consolidado.
 * @returns {IConsolidadoAnualSiniestralidad} - Consolidado calculado.
 */
export function calcularConsolidadoAnual(
    registros: IRegistroMensualSiniestralidad[],
    config: IConfiguracionSiniestralidad,
    escenario: EscenarioJornada,
    generadoPor: string
): IConsolidadoAnualSiniestralidad {
    // --- Totales brutos ---
    let totalHHT = 0;
    let totalAT = 0;
    let totalATinc = 0;
    let totalATmortal = 0;
    let totalDiasPerdidos = 0;
    let totalInvestigaciones = 0;

    const resumenMensual: IResumenMensualSiniestralidad[] = [];

    // Ordenar por mes para que el resumen quede consistente.
    const ordenados = [...registros].sort((a, b) => a.mes - b.mes);

    for (const r of ordenados) {
        const hhtMes = calcularHHT(r, config);

        totalHHT += hhtMes;
        totalAT += r.sumAT;
        totalATinc += r.sumATinc;
        totalATmortal += r.sumATmortal;
        totalDiasPerdidos += r.sumDiasPerdidos;
        totalInvestigaciones += r.investigaciones;

        resumenMensual.push({
            mes: r.mes,
            nombreMes: nombreMes(r.mes),
            hht: hhtMes,
            sumAT: r.sumAT,
            sumATinc: r.sumATinc,
            sumATmortal: r.sumATmortal,
            sumDiasPerdidos: r.sumDiasPerdidos,
            investigaciones: r.investigaciones
        });
    }

    // --- Indicadores anuales ponderados ---
    const k = config.constK;
    const kIli = config.constKILI;

    const ifATAnual: number | null = totalHHT > 0
        ? (totalAT * k) / totalHHT
        : null;

    const ifIncAnual: number | null = totalHHT > 0
        ? (totalATinc * k) / totalHHT
        : null;

    const isATAnual: number | null = totalHHT > 0
        ? (totalDiasPerdidos * k) / totalHHT
        : null;

    const iliAnual: number | null = (ifATAnual !== null && isATAnual !== null)
        ? (ifATAnual * isATAnual) / kIli
        : null;

    const porcentajeInvestigacionesAnual: number | null = totalAT > 0
        ? (totalInvestigaciones / totalAT) * 100
        : null;

    const proporcionMortalesAnual: number | null = totalAT > 0
        ? (totalATmortal / totalAT) * 100
        : null;

    return {
        id: `${config.empresaId}__${config.anio}__consolidado`,
        empresaId: config.empresaId,
        configId: config.id,
        anio: config.anio,
        escenario,
        totalHHT,
        totalAT,
        totalATinc,
        totalATmortal,
        totalDiasPerdidos,
        totalInvestigaciones,
        mesesConDatos: registros.length,
        if_AT_anual: redondear2(ifATAnual),
        if_inc_anual: redondear2(ifIncAnual),
        is_AT_anual: redondear2(isATAnual),
        ili_anual: redondear2(iliAnual),
        porcentajeInvestigaciones_anual: redondear2(porcentajeInvestigacionesAnual),
        proporcionMortales_anual: redondear2(proporcionMortalesAnual),
        resumenMensual,
        top5MesesPorIF: [],
        top5MesesPorIS: [],
        top5Areas: [],
        distribucionPorGravedad: {
            Leve: 0,
            Moderado: 0,
            Grave: 0,
            Fatal: 0
        },
        distribucionPorTipo: {
            AccidenteTrabajo: 0,
            Incidente: 0,
            EnfermedadLaboral: 0,
            AccidenteComun: 0,
            Otro: 0
        },
        constK: k,
        constKILI: kIli,
        fechaGeneracion: new Date(),
        fechaActualizacion: new Date(),
        generadoPor
    };
}

// ================================================================
// RANKINGS Y DISTRIBUCIONES
// ================================================================

/**
 * Calcula el Top 5 de meses por un indicador específico.
 * 
 * @param indicadores - Indicadores mensuales (uno por mes).
 * @param campo - Campo numérico a rankear (if_AT o is_AT).
 * @param etiqueta - Nombre para mostrar (ej. "IF").
 * @returns {ITopMesSiniestralidad[]} - Top 5 ordenado descendente.
 */
export function calcularTop5Meses(
    indicadores: IIndicadoresMensualesSiniestralidad[],
    campo: "if_AT" | "is_AT",
    etiqueta: string
): ITopMesSiniestralidad[] {
    return indicadores
        .filter(i => i[campo] !== null)
        .map(i => {
            const mes = parseInt(i.periodo.split("-")[1] ?? "0", 10);
            return {
                mes,
                nombreMes: nombreMes(mes),
                valor: i[campo] ?? 0,
                indicador: etiqueta
            };
        })
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);
}

/**
 * Calcula el Top 5 de áreas con más accidentes a partir del registro
 * nominal (ISiniestro[]).
 * 
 * @param areas - Mapa { area: conteo } previamente agregado.
 * @returns {ITopAreaSiniestralidad[]} - Top 5 ordenado descendente.
 */
export function calcularTop5Areas(
    areas: Record<string, number>
): ITopAreaSiniestralidad[] {
    const entradas = Object.entries(areas);
    const totalGeneral = entradas.reduce((sum, [, n]) => sum + n, 0);

    return entradas
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([area, total]) => ({
            area,
            total,
            porcentaje: totalGeneral > 0
                ? redondear2((total / totalGeneral) * 100) ?? 0
                : 0
        }));
}

/**
 * Cuenta la distribución de gravedades en un array de valores.
 * 
 * @param gravedades - Array de gravedades.
 * @returns {Record<GravedadLesion, number>} - Conteo por nivel.
 */
export function contarGravedades(
    gravedades: GravedadLesion[]
): Record<GravedadLesion, number> {
    const conteo: Record<GravedadLesion, number> = {
        Leve: 0,
        Moderado: 0,
        Grave: 0,
        Fatal: 0
    };
    for (const g of gravedades) {
        conteo[g] += 1;
    }
    return conteo;
}

/**
 * Cuenta la distribución de tipos de siniestro en un array.
 * 
 * @param tipos - Array de tipos de siniestro.
 * @returns {Record<TipoSiniestro, number>} - Conteo por tipo.
 */
export function contarTiposSiniestro(
    tipos: TipoSiniestro[]
): Record<TipoSiniestro, number> {
    const conteo: Record<TipoSiniestro, number> = {
        AccidenteTrabajo: 0,
        Incidente: 0,
        EnfermedadLaboral: 0,
        AccidenteComun: 0,
        Otro: 0
    };
    for (const t of tipos) {
        conteo[t] += 1;
    }
    return conteo;
}

// ================================================================
// VALIDACIONES DE NEGOCIO
// ================================================================

/**
 * Resultado de una validación de negocio.
 */
export interface IResultadoValidacion {
    ok: boolean;
    mensaje: string;
}

/**
 * Valida las reglas de negocio de un registro mensual.
 * 
 * Reglas:
 * - sumATinc ≤ sumAT.
 * - sumATmortal ≤ sumAT.
 * - sumATmortal ≤ sumATinc (los mortales son un subconjunto de los incapacitantes).
 * - sumDiasPerdidos ≥ 0.
 * - numTrabajadores ≥ 0.
 * - hhtManual ≥ 0.
 * - investigaciones ≥ 0.
 * 
 * @param registro - Registro mensual a validar.
 * @returns {IResultadoValidacion} - Resultado con mensaje si falla.
 */
export function validarRegistroMensual(
    registro: IRegistroMensualSiniestralidad
): IResultadoValidacion {
    if (registro.sumATinc > registro.sumAT) {
        return {
            ok: false,
            mensaje: "Los accidentes con incapacidad no pueden ser mayores que el total de accidentes."
        };
    }
    if (registro.sumATmortal > registro.sumAT) {
        return {
            ok: false,
            mensaje: "Los accidentes mortales no pueden ser mayores que el total de accidentes."
        };
    }
    if (registro.sumATmortal > registro.sumATinc) {
        return {
            ok: false,
            mensaje: "Los accidentes mortales son un subconjunto de los accidentes con incapacidad."
        };
    }
    if (registro.sumDiasPerdidos < 0) {
        return { ok: false, mensaje: "Los días perdidos no pueden ser negativos." };
    }
    if (registro.numTrabajadores < 0) {
        return { ok: false, mensaje: "El número de trabajadores no puede ser negativo." };
    }
    if (registro.hhtManual < 0) {
        return { ok: false, mensaje: "Las horas hombre trabajadas no pueden ser negativas." };
    }
    if (registro.investigaciones < 0) {
        return { ok: false, mensaje: "El número de investigaciones no puede ser negativo." };
    }
    return { ok: true, mensaje: "" };
}

/**
 * Valida un registro nominal (ISiniestro) básico.
 * 
 * Reglas:
 * - fechaEvento no vacía y con formato ISO.
 * - nombreAccidentado no vacío.
 * - totalDiasPerdidos ≥ 0.
 * - ausentismoMesAccidente ≥ 0.
 * - ausentismoMesSiguiente ≥ 0.
 * 
 * @param fechaEvento - Fecha ISO del evento.
 * @param nombreAccidentado - Nombre del accidentado.
 * @param diasMesAccidente - Días de ausentismo del mes del evento.
 * @param diasMesSiguiente - Días de ausentismo del mes siguiente.
 * @returns {IResultadoValidacion} - Resultado con mensaje si falla.
 */
export function validarRegistroNominal(
    fechaEvento: string,
    nombreAccidentado: string,
    diasMesAccidente: number,
    diasMesSiguiente: number
): IResultadoValidacion {
    if (!fechaEvento || !/^\d{4}-\d{2}-\d{2}$/.test(fechaEvento)) {
        return { ok: false, mensaje: "La fecha del evento es obligatoria (YYYY-MM-DD)." };
    }
    if (!nombreAccidentado || nombreAccidentado.trim().length === 0) {
        return { ok: false, mensaje: "El nombre del accidentado es obligatorio." };
    }
    if (diasMesAccidente < 0) {
        return { ok: false, mensaje: "Los días de ausentismo del mes no pueden ser negativos." };
    }
    if (diasMesSiguiente < 0) {
        return { ok: false, mensaje: "Los días de ausentismo del mes siguiente no pueden ser negativos." };
    }
    return { ok: true, mensaje: "" };
}

// ================================================================
// MOTOR DETERMINÍSTICO DE TEXTOS (INTERPRETACIÓN)
// ================================================================

/**
 * Genera un texto interpretativo del desempeño anual del módulo.
 * Es un motor determinístico (decisión 24a): cero IA externa, cero LLM.
 * 
 * Reglas:
 * - Compara el IF anual con la meta.
 * - Compara el IS anual con la meta.
 * - Menciona el Top 1 área si existe.
 * - Menciona el % de cumplimiento de investigaciones.
 * 
 * @param consolidado - Consolidado anual calculado.
 * @param metas - Metas de la configuración.
 * @returns {string} - Texto de 3-5 oraciones listo para el análisis trimestral.
 */
export function generarTextoInterpretativo(
    consolidado: IConsolidadoAnualSiniestralidad,
    metas: IConfiguracionSiniestralidad["metas"]
): string {
    const partes: string[] = [];

    const ifAnual = consolidado.if_AT_anual;
    const isAnual = consolidado.is_AT_anual;
    const iliAnual = consolidado.ili_anual;
    const pctInv = consolidado.porcentajeInvestigaciones_anual;
    const totalMeses = 12;
    const meses = consolidado.mesesConDatos;

    partes.push(
        `Durante el año ${consolidado.anio} se consolidaron ${meses} de ${totalMeses} meses con datos. ` +
        `Se registraron ${consolidado.totalAT} accidentes de trabajo, ` +
        `${consolidado.totalATinc} con incapacidad y ${consolidado.totalATmortal} mortales.`
    );

    if (ifAnual !== null && metas.metaIF !== null) {
        const comparacion = ifAnual <= metas.metaIF ? "por debajo" : "por encima";
        partes.push(
            `El Índice de Frecuencia anual fue de ${ifAnual.toFixed(2)} ` +
            `(${comparacion} de la meta de ${metas.metaIF.toFixed(2)}).`
        );
    } else if (ifAnual !== null) {
        partes.push(`El Índice de Frecuencia anual fue de ${ifAnual.toFixed(2)}.`);
    }

    if (isAnual !== null && metas.metaIS !== null) {
        const comparacion = isAnual <= metas.metaIS ? "por debajo" : "por encima";
        partes.push(
            `El Índice de Severidad anual fue de ${isAnual.toFixed(2)} ` +
            `(${comparacion} de la meta de ${metas.metaIS.toFixed(2)}).`
        );
    } else if (isAnual !== null) {
        partes.push(`El Índice de Severidad anual fue de ${isAnual.toFixed(2)}.`);
    }

    if (iliAnual !== null) {
        partes.push(`El Índice de Lesiones Incapacitantes (ILI) anual fue de ${iliAnual.toFixed(2)}.`);
    }

    if (pctInv !== null) {
        const estado = pctInv >= 95 ? "cumplimiento óptimo" :
                       pctInv >= 75 ? "cumplimiento aceptable" :
                                      "cumplimiento insuficiente";
        partes.push(
            `El porcentaje de investigaciones realizadas y enviadas fue del ${pctInv.toFixed(2)}% (${estado}).`
        );
    }

    const topArea = consolidado.top5Areas[0];
    if (topArea) {
        partes.push(
            `El área con mayor concentración de accidentes fue "${topArea.area}" ` +
            `con ${topArea.total} evento(s) (${topArea.porcentaje.toFixed(2)}% del total).`
        );
    }

    return partes.join(" ");
}

/**
 * Sugiere un enfoque de análisis causal según el indicador con mayor desviación.
 * Motor determinístico: no usa IA externa.
 * 
 * @param consolidado - Consolidado anual.
 * @param metas - Metas de la configuración.
 * @returns {string} - Sugerencia breve para el análisis trimestral.
 */
export function sugerirEnfoqueAnalisis(
    consolidado: IConsolidadoAnualSiniestralidad,
    metas: IConfiguracionSiniestralidad["metas"]
): string {
    const ifFuera = consolidado.if_AT_anual !== null &&
                    metas.metaIF !== null &&
                    consolidado.if_AT_anual > metas.metaIF;

    const isFuera = consolidado.is_AT_anual !== null &&
                    metas.metaIS !== null &&
                    consolidado.is_AT_anual > metas.metaIS;

    if (ifFuera) {
        return "Sugerencia: Aplicar metodología 5 Porqués o Diagrama Ishikawa " +
               "para analizar los factores que incrementaron la frecuencia de accidentes. " +
               "Priorizar inspecciones en las áreas del Top 5.";
    }
    if (isFuera) {
        return "Sugerencia: Revisar la severidad de los eventos ocurridos. " +
               "Verificar cumplimiento de medidas de protección, EPP y plan de emergencias.";
    }
    return "Sugerencia: Mantener las medidas de control existentes y continuar el " +
           "seguimiento trimestral para conservar el desempeño actual.";
}