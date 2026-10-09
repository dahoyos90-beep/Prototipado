/**
 * src/ausentismo-utils.ts
 * 
 * Utilidades específicas para el módulo M24 - Gestión de Ausentismo.
 * 
 * Propósito:
 * - Centralizar TODAS las fórmulas del ausentismo en un solo lugar.
 * - Evitar duplicación de lógica entre ausentismo.ts y otros módulos.
 * - Proporcionar utilidades auxiliares (IDs, formateo, helpers).
 * - Integrar el envío automático de resultados a M23 (Indicadores).
 * 
 * Contenido:
 *   - Constantes: conceptos Ley/Permisos/CausaMédica, jornada por defecto.
 *   - Tipos auxiliares: TotalesPorConcepto.
 *   - Cálculos: horas → días, DHM, % días trabajados, % ausentismo.
 *   - Bloques: Ley, Causa Médica, Permisos, Estadística Mensual, Consolidado.
 *   - Top 5 de conceptos y distribución por área.
 *   - Comparación con años anteriores.
 *   - Integración con M23 (enviarIndicadoresAM23).
 *   - Auto-generación de cierres desde eventos (generarCierresDesdeEventos).
 *   - Generación de IDs: AUS-, PAR-, CIE-, CON-.
 *   - Formateo de fechas y periodos.
 *   - Helpers internos: redondear, porcentaje, sumarHorasEvento.
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (SG-SST)
 * - Resolución 0312 de 2019 (indicadores mínimos)
 * - NTC 3793 (ausentismo laboral)
 * 
 * @version 1.1.0
 *  - Fix SST: se agrega el concepto EL (Enfermedad Laboral) al modelo.
 *  - Fix SST: nuevo bloque "Causa Médica" (EG, AT, EL, LM, LP) que es el
 *    que la Res. 0312 exige reportar. Antes se enviaba a M23 el bloque
 *    "Por Ley" completo (inflado con LL, LAC, VAC, LNR).
 *  - Fix: `enviarIndicadoresAM23` usa `bloqueCausaMedica.porcentajeAusentismo`.
 *  - Fix: `enviarIndicadoresAM23` siembra los 6 indicadores mínimos de M23
 *    automáticamente si el indicador "Ausentismo por Causa Médica" no
 *    existe. Esto evita el error "indicador no encontrado" cuando el
 *    usuario nunca abrió M23.
 *  - Fix: nueva función `generarCierresDesdeEventos` que crea cierres
 *    mensuales "en memoria" a partir de los eventos registrados. El
 *    Consolidado la usa como fallback cuando no hay cierres guardados.
 * 
 * @version 1.0.2
 *  - Fix: separación del bloque "Causa Médica" del "Por Ley" completo.
 * 
 * @version 1.0.1
 *  - Fix: eliminada línea errónea `calcularSemaforoMenosEsMejor as _noUsar`.
 * 
 * @since 2026-10-08
 */

import { generarIdUnico, fechaActualISO } from './utils.js';
import {
    storageIndicadores,
    storageResultadosIndicadores
} from './storage.js';
import {
    calcularSemaforoMenorEsMejor,
    generarIdResultado,
    obtenerIndicadoresMinimos
} from './indicadores-utils.js';
import type {
    IEventoAusentismo,
    CodigoConceptoAusentismo,
    CodigoAusentismoLey,
    CodigoPermisoLaboral
} from './interfaces/IEventoAusentismo.js';
import type { IParametrosMes } from './interfaces/IParametrosMes.js';
import type {
    IEstadisticaMensual,
    IBloqueIndicadores,
    DiasPorConcepto,
    CodigoConceptoDias,
    CodigoAusentismoMedico
} from './interfaces/IEstadisticaMensual.js';
import type {
    IConsolidadoAnual,
    IResumenMensualAnual,
    IBloqueAnual,
    IComparacionAnio,
    ITopConceptoAnual
} from './interfaces/IConsolidadoAnual.js';
import type { IResultadoIndicador } from './interfaces/IResultadoIndicador.js';

// ================================================================
// CONSTANTES
// ================================================================

/** Jornada diaria por defecto (horas/día). Configurable por mes. */
export const JORNADA_DIARIA_DEFAULT = 7;

/** Conceptos de ausentismo por Ley (9). */
export const CONCEPTOS_LEY: CodigoAusentismoLey[] = [
    'EG', 'AT', 'EL', 'LM', 'LP', 'LL', 'LAC', 'VAC', 'LNR'
];

/**
 * Conceptos que conforman el indicador legal "Ausentismo por Causa Médica"
 * según la Resolución 0312 de 2019 (Art. 30). SOLO estos 5 conceptos.
 * Los demás conceptos de "Por Ley" (LL, LAC, VAC, LNR) son licencias
 * legales pero NO son causas médicas.
 */
export const CONCEPTOS_CAUSA_MEDICA: CodigoAusentismoMedico[] = [
    'EG', 'AT', 'EL', 'LM', 'LP'
];

/** Conceptos de permiso laboral (4). */
export const CONCEPTOS_PERMISO: CodigoPermisoLaboral[] = [
    'DP', 'VM', 'ES', 'CD'
];

/**
 * Conceptos que aparecen en el módulo de días (12).
 * Coincide con la captura del Excel: NO incluye 'LNR'.
 */
export const CONCEPTOS_DIAS: CodigoConceptoDias[] = [
    'EG', 'AT', 'EL', 'LM', 'LP', 'LL', 'LAC', 'VAC',
    'DP', 'VM', 'ES', 'CD'
];

/** Etiquetas legibles para cada concepto. */
export const ETIQUETAS_CONCEPTOS: Record<CodigoConceptoAusentismo, string> = {
    EG: 'Enfermedad General',
    AT: 'Accidente de Trabajo',
    EL: 'Enfermedad Laboral',
    LM: 'Licencia de Maternidad',
    LP: 'Licencia de Paternidad',
    LL: 'Licencia por Luto',
    LAC: 'Lactancia',
    VAC: 'Vacaciones',
    LNR: 'Licencia No Remunerada',
    DP: 'Diligencias Personales',
    VM: 'Visita Médica',
    ES: 'Estudio',
    CD: 'Calamidad Doméstica'
};

/** Umbral de variación (%) para considerar una tendencia "Estable". */
export const UMBRAL_TENDENCIA_ESTABLE = 5;

/** Nombres de los meses (para consolidados). */
export const NOMBRES_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// ================================================================
// TIPOS AUXILIARES
// ================================================================

/** Mapa de totales por concepto (13 claves). */
export type TotalesPorConcepto = Record<CodigoConceptoAusentismo, number>;

// ================================================================
// HELPERS INTERNOS
// ================================================================

/**
 * Redondea un número a N decimales.
 */
export function redondear(valor: number, decimales: number = 2): number {
    if (isNaN(valor) || !isFinite(valor)) return 0;
    const factor = Math.pow(10, decimales);
    return Math.round(valor * factor) / factor;
}

/**
 * Calcula el porcentaje de "parte" sobre "total".
 */
export function porcentaje(parte: number, total: number): number {
    if (total <= 0) return 0;
    return (parte / total) * 100;
}

/**
 * Suma las horas de un evento (13 conceptos).
 */
export function sumarHorasEvento(evento: IEventoAusentismo): number {
    return (evento.horasEG || 0) + (evento.horasAT || 0) + (evento.horasEL || 0) +
        (evento.horasLM || 0) + (evento.horasLP || 0) + (evento.horasLL || 0) +
        (evento.horasLAC || 0) + (evento.horasVAC || 0) + (evento.horasLNR || 0) +
        (evento.horasDP || 0) + (evento.horasVM || 0) + (evento.horasES || 0) +
        (evento.horasCD || 0);
}

/**
 * Formatea una fecha a ISO "YYYY-MM-DD".
 */
export function formatearFechaISO(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

// ================================================================
// CÁLCULOS DE TOTALES POR CONCEPTO
// ================================================================

/**
 * Suma las horas de todos los eventos por cada concepto (13 claves).
 */
export function calcularTotalesPorConcepto(eventos: IEventoAusentismo[]): TotalesPorConcepto {
    const totales: TotalesPorConcepto = {
        EG: 0, AT: 0, EL: 0, LM: 0, LP: 0, LL: 0, LAC: 0, VAC: 0, LNR: 0,
        DP: 0, VM: 0, ES: 0, CD: 0
    };

    eventos.forEach(e => {
        totales.EG  += e.horasEG  || 0;
        totales.AT  += e.horasAT  || 0;
        totales.EL  += e.horasEL  || 0;
        totales.LM  += e.horasLM  || 0;
        totales.LP  += e.horasLP  || 0;
        totales.LL  += e.horasLL  || 0;
        totales.LAC += e.horasLAC || 0;
        totales.VAC += e.horasVAC || 0;
        totales.LNR += e.horasLNR || 0;
        totales.DP  += e.horasDP  || 0;
        totales.VM  += e.horasVM  || 0;
        totales.ES  += e.horasES  || 0;
        totales.CD  += e.horasCD  || 0;
    });

    return totales;
}

/**
 * Convierte los totales de horas a días por concepto (12 claves, sin LNR).
 */
export function calcularDiasPorConcepto(
    totales: TotalesPorConcepto,
    jornada: number = JORNADA_DIARIA_DEFAULT
): DiasPorConcepto {
    const j = jornada > 0 ? jornada : JORNADA_DIARIA_DEFAULT;
    return {
        EG:  redondear(totales.EG  / j, 2),
        AT:  redondear(totales.AT  / j, 2),
        EL:  redondear(totales.EL  / j, 2),
        LM:  redondear(totales.LM  / j, 2),
        LP:  redondear(totales.LP  / j, 2),
        LL:  redondear(totales.LL  / j, 2),
        LAC: redondear(totales.LAC / j, 2),
        VAC: redondear(totales.VAC / j, 2),
        DP:  redondear(totales.DP  / j, 2),
        VM:  redondear(totales.VM  / j, 2),
        ES:  redondear(totales.ES  / j, 2),
        CD:  redondear(totales.CD  / j, 2)
    };
}

/**
 * Calcula el total de horas del grupo "Por Ley" completo (9 conceptos).
 * Nota: es informativo. NO es el indicador legal.
 */
export function calcularHorasLey(totales: TotalesPorConcepto): number {
    return redondear(
        CONCEPTOS_LEY.reduce((sum, c) => sum + totales[c], 0),
        2
    );
}

/**
 * Calcula el total de horas del grupo "Ausentismo por Causa Médica"
 * (EG, AT, EL, LM, LP). Este es el indicador legal obligatorio Res. 0312.
 */
export function calcularHorasCausaMedica(totales: TotalesPorConcepto): number {
    return redondear(
        CONCEPTOS_CAUSA_MEDICA.reduce((sum, c) => sum + totales[c], 0),
        2
    );
}

/**
 * Calcula el total de horas del grupo "Permisos".
 */
export function calcularHorasPermisos(totales: TotalesPorConcepto): number {
    return redondear(
        CONCEPTOS_PERMISO.reduce((sum, c) => sum + totales[c], 0),
        2
    );
}

/**
 * Convierte horas del grupo "Por Ley" a días.
 */
export function calcularDiasLey(
    horasLey: number,
    jornada: number = JORNADA_DIARIA_DEFAULT
): number {
    const j = jornada > 0 ? jornada : JORNADA_DIARIA_DEFAULT;
    return redondear(horasLey / j, 2);
}

/**
 * Convierte horas del grupo "Causa Médica" a días.
 */
export function calcularDiasCausaMedica(
    horasCausaMedica: number,
    jornada: number = JORNADA_DIARIA_DEFAULT
): number {
    const j = jornada > 0 ? jornada : JORNADA_DIARIA_DEFAULT;
    return redondear(horasCausaMedica / j, 2);
}

/**
 * Convierte horas del grupo "Permisos" a días.
 */
export function calcularDiasPermisos(
    horasPermisos: number,
    jornada: number = JORNADA_DIARIA_DEFAULT
): number {
    const j = jornada > 0 ? jornada : JORNADA_DIARIA_DEFAULT;
    return redondear(horasPermisos / j, 2);
}

// ================================================================
// CÁLCULOS DE INDICADORES
// ================================================================

/**
 * Calcula los Días Hombre Mes (DHM) = numEmpleados × diasMes.
 */
export function calcularDiasHombreMes(numEmpleados: number, diasMes: number): number {
    return numEmpleados * diasMes;
}

/**
 * Calcula los días trabajados = DHM − días de ausentismo.
 */
export function calcularDiasTrabajados(dhm: number, dias: number): number {
    return redondear(Math.max(0, dhm - dias), 2);
}

/**
 * Calcula el porcentaje de días trabajados.
 */
export function calcularPorcentajeDiasTrabajados(diasTrab: number, dhm: number): number {
    if (dhm <= 0) return 0;
    return redondear((diasTrab / dhm) * 100, 2);
}

/**
 * Calcula el porcentaje de ausentismo.
 */
export function calcularPorcentajeAusentismo(dias: number, dhm: number): number {
    if (dhm <= 0) return 0;
    return redondear((dias / dhm) * 100, 2);
}

/**
 * Calcula un bloque de indicadores completo.
 */
export function calcularBloqueIndicadores(
    horas: number,
    jornada: number,
    numEmpleados: number,
    diasMes: number
): IBloqueIndicadores {
    const totalDias = horas / (jornada > 0 ? jornada : JORNADA_DIARIA_DEFAULT);
    const dhm = calcularDiasHombreMes(numEmpleados, diasMes);
    const diasTrab = calcularDiasTrabajados(dhm, totalDias);

    return {
        totalHoras: redondear(horas, 2),
        totalDias: redondear(totalDias, 2),
        diasHombreMes: dhm,
        diasTrabajados: diasTrab,
        porcentajeDiasTrabajados: calcularPorcentajeDiasTrabajados(diasTrab, dhm),
        porcentajeAusentismo: calcularPorcentajeAusentismo(totalDias, dhm)
    };
}

// ================================================================
// CÁLCULO DE ESTADÍSTICA MENSUAL
// ================================================================

/**
 * Calcula el cierre mensual completo a partir de los eventos y parámetros.
 */
export function calcularEstadisticaMensual(
    eventos: IEventoAusentismo[],
    parametros: IParametrosMes
): IEstadisticaMensual {
    const totales = calcularTotalesPorConcepto(eventos);
    const jornada = parametros.jornadaDiaria > 0
        ? parametros.jornadaDiaria
        : JORNADA_DIARIA_DEFAULT;

    const diasPorConcepto = calcularDiasPorConcepto(totales, jornada);
    const horasLey = calcularHorasLey(totales);
    const horasCausaMedica = calcularHorasCausaMedica(totales);
    const horasPermisos = calcularHorasPermisos(totales);

    const bloqueLey = calcularBloqueIndicadores(
        horasLey, jornada, parametros.numEmpleados, parametros.diasMes
    );
    const bloqueCausaMedica = calcularBloqueIndicadores(
        horasCausaMedica, jornada, parametros.numEmpleados, parametros.diasMes
    );
    const bloquePermisos = calcularBloqueIndicadores(
        horasPermisos, jornada, parametros.numEmpleados, parametros.diasMes
    );

    const horasLeyRecord: Record<CodigoAusentismoLey, number> = {
        EG: redondear(totales.EG, 2),
        AT: redondear(totales.AT, 2),
        EL: redondear(totales.EL, 2),
        LM: redondear(totales.LM, 2),
        LP: redondear(totales.LP, 2),
        LL: redondear(totales.LL, 2),
        LAC: redondear(totales.LAC, 2),
        VAC: redondear(totales.VAC, 2),
        LNR: redondear(totales.LNR, 2)
    };
    const horasCausaMedicaRecord: Record<CodigoAusentismoMedico, number> = {
        EG: redondear(totales.EG, 2),
        AT: redondear(totales.AT, 2),
        EL: redondear(totales.EL, 2),
        LM: redondear(totales.LM, 2),
        LP: redondear(totales.LP, 2)
    };
    const horasPermisosRecord: Record<CodigoPermisoLaboral, number> = {
        DP: redondear(totales.DP, 2),
        VM: redondear(totales.VM, 2),
        ES: redondear(totales.ES, 2),
        CD: redondear(totales.CD, 2)
    };

    const ahora = new Date();

    return {
        id: generarIdCierreMensual(),
        empresaId: parametros.empresaId,
        periodo: parametros.periodo,
        parametros,
        diasPorConcepto,
        bloqueLey,
        horasLey: horasLeyRecord,
        bloqueCausaMedica,
        horasCausaMedica: horasCausaMedicaRecord,
        bloquePermisos,
        horasPermisos: horasPermisosRecord,
        observaciones: null,
        elaboradoPor: '',
        estado: 'Borrador',
        fechaCierre: null,
        enviadoAM23: false,
        fechaEnvioM23: null,
        fechaCreacion: ahora,
        fechaActualizacion: ahora
    };
}

// ================================================================
// CÁLCULO DE CONSOLIDADO ANUAL
// ================================================================

/**
 * Construye un resumen mensual vacío (mes sin cierre).
 */
function construirResumenVacio(periodo: string): IResumenMensualAnual {
    const mesIndex = parseInt(periodo.substring(5, 7), 10) - 1;
    return {
        periodo,
        nombreMes: NOMBRES_MESES[mesIndex] || periodo,
        diasMes: 0,
        numEmpleados: 0,
        horasPorConcepto: {
            EG: 0, AT: 0, EL: 0, LM: 0, LP: 0, LL: 0, LAC: 0, VAC: 0, LNR: 0,
            DP: 0, VM: 0, ES: 0, CD: 0
        },
        totalHorasLey: 0,
        totalHorasCausaMedica: 0,
        totalHorasPermisos: 0,
        totalDiasLey: 0,
        totalDiasCausaMedica: 0,
        totalDiasPermisos: 0,
        porcentajeAusentismoLey: 0,
        porcentajeAusentismoCausaMedica: 0,
        porcentajeAusentismoPermisos: 0,
        tieneCierre: false
    };
}

/**
 * Construye un resumen mensual a partir de un cierre existente.
 */
function construirResumenDesdeCierre(cierre: IEstadisticaMensual): IResumenMensualAnual {
    const mesIndex = parseInt(cierre.periodo.substring(5, 7), 10) - 1;

    const horasPorConcepto: TotalesPorConcepto = {
        EG: cierre.horasLey.EG || 0,
        AT: cierre.horasLey.AT || 0,
        EL: cierre.horasLey.EL || 0,
        LM: cierre.horasLey.LM || 0,
        LP: cierre.horasLey.LP || 0,
        LL: cierre.horasLey.LL || 0,
        LAC: cierre.horasLey.LAC || 0,
        VAC: cierre.horasLey.VAC || 0,
        LNR: cierre.horasLey.LNR || 0,
        DP: cierre.horasPermisos.DP || 0,
        VM: cierre.horasPermisos.VM || 0,
        ES: cierre.horasPermisos.ES || 0,
        CD: cierre.horasPermisos.CD || 0
    };

    return {
        periodo: cierre.periodo,
        nombreMes: NOMBRES_MESES[mesIndex] || cierre.periodo,
        diasMes: cierre.parametros.diasMes,
        numEmpleados: cierre.parametros.numEmpleados,
        horasPorConcepto,
        totalHorasLey: cierre.bloqueLey.totalHoras,
        totalHorasCausaMedica: cierre.bloqueCausaMedica.totalHoras,
        totalHorasPermisos: cierre.bloquePermisos.totalHoras,
        totalDiasLey: cierre.bloqueLey.totalDias,
        totalDiasCausaMedica: cierre.bloqueCausaMedica.totalDias,
        totalDiasPermisos: cierre.bloquePermisos.totalDias,
        porcentajeAusentismoLey: cierre.bloqueLey.porcentajeAusentismo,
        porcentajeAusentismoCausaMedica: cierre.bloqueCausaMedica.porcentajeAusentismo,
        porcentajeAusentismoPermisos: cierre.bloquePermisos.porcentajeAusentismo,
        tieneCierre: true
    };
}

/**
 * Calcula el consolidado anual completo de un año.
 */
export function calcularConsolidadoAnual(
    cierres: IEstadisticaMensual[],
    anio: string,
    empresaId: string
): IConsolidadoAnual {
    const horasTotalesPorConcepto: TotalesPorConcepto = {
        EG: 0, AT: 0, EL: 0, LM: 0, LP: 0, LL: 0, LAC: 0, VAC: 0, LNR: 0,
        DP: 0, VM: 0, ES: 0, CD: 0
    };
    const diasTotalesPorConcepto: TotalesPorConcepto = {
        EG: 0, AT: 0, EL: 0, LM: 0, LP: 0, LL: 0, LAC: 0, VAC: 0, LNR: 0,
        DP: 0, VM: 0, ES: 0, CD: 0
    };

    const meses: IResumenMensualAnual[] = [];

    for (let i = 1; i <= 12; i++) {
        const periodoMes = `${anio}-${String(i).padStart(2, '0')}`;
        const cierre = cierres.find(c =>
            c.periodo === periodoMes && c.empresaId === empresaId
        );

        if (!cierre) {
            meses.push(construirResumenVacio(periodoMes));
            continue;
        }

        const resumen = construirResumenDesdeCierre(cierre);
        meses.push(resumen);

        (Object.keys(horasTotalesPorConcepto) as CodigoConceptoAusentismo[])
            .forEach(codigo => {
                horasTotalesPorConcepto[codigo] += resumen.horasPorConcepto[codigo];
            });

        CONCEPTOS_DIAS.forEach(codigo => {
            diasTotalesPorConcepto[codigo] += (cierre.diasPorConcepto[codigo] || 0);
        });
    }

    (Object.keys(horasTotalesPorConcepto) as CodigoConceptoAusentismo[])
        .forEach(c => {
            horasTotalesPorConcepto[c] = redondear(horasTotalesPorConcepto[c], 2);
            diasTotalesPorConcepto[c] = redondear(diasTotalesPorConcepto[c], 2);
        });

    // --- Totales anuales por grupo ---
    const totalHorasLeyAnio = CONCEPTOS_LEY.reduce(
        (s, c) => s + horasTotalesPorConcepto[c], 0
    );
    const totalHorasCausaMedicaAnio = CONCEPTOS_CAUSA_MEDICA.reduce(
        (s, c) => s + horasTotalesPorConcepto[c], 0
    );
    const totalHorasPermisosAnio = CONCEPTOS_PERMISO.reduce(
        (s, c) => s + horasTotalesPorConcepto[c], 0
    );
    const totalDiasLeyAnio = CONCEPTOS_LEY.reduce(
        (s, c) => s + diasTotalesPorConcepto[c], 0
    );
    const totalDiasCausaMedicaAnio = CONCEPTOS_CAUSA_MEDICA.reduce(
        (s, c) => s + diasTotalesPorConcepto[c], 0
    );
    const totalDiasPermisosAnio = CONCEPTOS_PERMISO.reduce(
        (s, c) => s + diasTotalesPorConcepto[c], 0
    );

    const mesesConCierre = meses.filter(m => m.tieneCierre).length;
    const divisor = mesesConCierre > 0 ? mesesConCierre : 1;

    const promAusentismoLey = mesesConCierre > 0
        ? redondear(
            meses.filter(m => m.tieneCierre)
                .reduce((s, m) => s + m.porcentajeAusentismoLey, 0) / mesesConCierre,
            2
        )
        : 0;
    const promAusentismoCausaMedica = mesesConCierre > 0
        ? redondear(
            meses.filter(m => m.tieneCierre)
                .reduce((s, m) => s + m.porcentajeAusentismoCausaMedica, 0) / mesesConCierre,
            2
        )
        : 0;
    const promAusentismoPermisos = mesesConCierre > 0
        ? redondear(
            meses.filter(m => m.tieneCierre)
                .reduce((s, m) => s + m.porcentajeAusentismoPermisos, 0) / mesesConCierre,
            2
        )
        : 0;

    const bloqueAnualLey: IBloqueAnual = {
        totalHorasAnio: redondear(totalHorasLeyAnio, 2),
        totalDiasAnio: redondear(totalDiasLeyAnio, 2),
        promedioHorasMensuales: redondear(totalHorasLeyAnio / divisor, 2),
        promedioDiasMensuales: redondear(totalDiasLeyAnio / divisor, 2),
        promedioAusentismoMensual: promAusentismoLey,
        porcentajeAusentismoAnual: promAusentismoLey
    };
    const bloqueAnualCausaMedica: IBloqueAnual = {
        totalHorasAnio: redondear(totalHorasCausaMedicaAnio, 2),
        totalDiasAnio: redondear(totalDiasCausaMedicaAnio, 2),
        promedioHorasMensuales: redondear(totalHorasCausaMedicaAnio / divisor, 2),
        promedioDiasMensuales: redondear(totalDiasCausaMedicaAnio / divisor, 2),
        promedioAusentismoMensual: promAusentismoCausaMedica,
        porcentajeAusentismoAnual: promAusentismoCausaMedica
    };
    const bloqueAnualPermisos: IBloqueAnual = {
        totalHorasAnio: redondear(totalHorasPermisosAnio, 2),
        totalDiasAnio: redondear(totalDiasPermisosAnio, 2),
        promedioHorasMensuales: redondear(totalHorasPermisosAnio / divisor, 2),
        promedioDiasMensuales: redondear(totalDiasPermisosAnio / divisor, 2),
        promedioAusentismoMensual: promAusentismoPermisos,
        porcentajeAusentismoAnual: promAusentismoPermisos
    };

    const cierresEnviadosAM23 = cierres.filter(c =>
        c.empresaId === empresaId &&
        c.periodo.startsWith(anio) &&
        c.enviadoAM23
    ).length;

    const ahora = new Date();

    return {
        id: generarIdConsolidadoAnual(),
        empresaId,
        anio,
        meses,
        horasTotalesPorConcepto,
        diasTotalesPorConcepto,
        bloqueAnualLey,
        bloqueAnualCausaMedica,
        bloqueAnualPermisos,
        comparacionAnios: [],
        top5Conceptos: calcularTop5Conceptos(horasTotalesPorConcepto),
        mesesConCierre,
        cierresEnviadosAM23,
        fechaCreacion: ahora,
        fechaActualizacion: ahora
    };
}

// ================================================================
// GENERACIÓN DE CIERRES DESDE EVENTOS (fallback)
// ================================================================

/**
 * Genera cierres mensuales "en memoria" a partir de los eventos
 * registrados en un año específico. Se usa como fallback en el
 * Consolidado cuando no hay cierres guardados todavía.
 * 
 * @param eventos - Todos los eventos de la empresa.
 * @param parametrosExistentes - Parámetros ya guardados (opcional).
 * @param anio - Año a procesar ("YYYY").
 * @param empresaId - NIT de la empresa.
 * @returns {IEstadisticaMensual[]} - Cierres mensuales generados.
 */
export function generarCierresDesdeEventos(
    eventos: IEventoAusentismo[],
    parametrosExistentes: IParametrosMes[],
    anio: string,
    empresaId: string
): IEstadisticaMensual[] {
    const eventosAnio = eventos.filter(e =>
        e.empresaId === empresaId && e.fechaInicio.startsWith(anio)
    );

    if (eventosAnio.length === 0) return [];

    const periodos = new Set<string>();
    eventosAnio.forEach(e => periodos.add(e.fechaInicio.substring(0, 7)));

    const cierres: IEstadisticaMensual[] = [];

    periodos.forEach(periodo => {
        const eventosMes = eventosAnio.filter(e => e.fechaInicio.startsWith(periodo));

        // Buscar parámetros guardados
        let params = parametrosExistentes.find(
            p => p.empresaId === empresaId && p.periodo === periodo
        );

        // Si no hay parámetros, calcular defaults
        if (!params) {
            const [anioStr, mesStr] = periodo.split('-');
            const diasDelMes = new Date(
                parseInt(anioStr, 10),
                parseInt(mesStr, 10),
                0
            ).getDate();

            const empleadosUnicos = new Set(
                eventosMes.map(e => e.nombre.trim().toLowerCase())
            );
            const numEmpleados = Math.max(1, empleadosUnicos.size);

            params = {
                id: `PAR-${generarIdUnico().substring(0, 12)}`,
                empresaId,
                periodo,
                diasMes: diasDelMes,
                numEmpleados,
                jornadaDiaria: JORNADA_DIARIA_DEFAULT,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            };
        }

        cierres.push(calcularEstadisticaMensual(eventosMes, params));
    });

    return cierres;
}

// ================================================================
// TOP 5 DE CONCEPTOS
// ================================================================

/**
 * Obtiene el Top 5 de conceptos con más horas, ordenado descendente.
 */
export function calcularTop5Conceptos(totales: TotalesPorConcepto): ITopConceptoAnual[] {
    const totalGeneral = Object.values(totales).reduce((s, v) => s + v, 0);

    const items: ITopConceptoAnual[] =
        (Object.keys(totales) as CodigoConceptoAusentismo[]).map(codigo => ({
            codigo,
            etiqueta: ETIQUETAS_CONCEPTOS[codigo],
            totalHoras: redondear(totales[codigo], 2),
            porcentaje: totalGeneral > 0
                ? redondear((totales[codigo] / totalGeneral) * 100, 2)
                : 0
        }));

    return items
        .sort((a, b) => b.totalHoras - a.totalHoras)
        .slice(0, 5);
}

// ================================================================
// DISTRIBUCIÓN POR ÁREA
// ================================================================

/**
 * Calcula la distribución de horas de ausentismo por área.
 */
export function calcularDistribucionPorArea(
    eventos: IEventoAusentismo[]
): Record<string, number> {
    const distribucion: Record<string, number> = {};

    eventos.forEach(e => {
        const area = (e.area || 'Sin área').trim() || 'Sin área';
        const totalHoras = sumarHorasEvento(e);
        distribucion[area] = redondear((distribucion[area] || 0) + totalHoras, 2);
    });

    return distribucion;
}

// ================================================================
// COMPARACIÓN CON AÑOS ANTERIORES
// ================================================================

/**
 * Compara un consolidado anual con consolidados de años anteriores.
 */
export function compararAnios(
    actual: IConsolidadoAnual,
    anteriores: IConsolidadoAnual[]
): IComparacionAnio[] {
    const totalHorasActual =
        actual.bloqueAnualLey.totalHorasAnio + actual.bloqueAnualPermisos.totalHorasAnio;
    const totalDiasActual =
        actual.bloqueAnualLey.totalDiasAnio + actual.bloqueAnualPermisos.totalDiasAnio;

    return anteriores.map(ant => {
        const totalHorasAnt =
            ant.bloqueAnualLey.totalHorasAnio + ant.bloqueAnualPermisos.totalHorasAnio;
        const totalDiasAnt =
            ant.bloqueAnualLey.totalDiasAnio + ant.bloqueAnualPermisos.totalDiasAnio;

        const varHoras = totalHorasAnt > 0
            ? redondear(((totalHorasActual - totalHorasAnt) / totalHorasAnt) * 100, 2)
            : 0;
        const varDias = totalDiasAnt > 0
            ? redondear(((totalDiasActual - totalDiasAnt) / totalDiasAnt) * 100, 2)
            : 0;

        let tendencia: 'Mejora' | 'Deterioro' | 'Estable' = 'Estable';
        const absVar = Math.abs(varHoras);
        if (absVar >= UMBRAL_TENDENCIA_ESTABLE) {
            tendencia = varHoras < 0 ? 'Mejora' : 'Deterioro';
        }

        return {
            anio: parseInt(ant.anio, 10),
            totalHorasLey: ant.bloqueAnualLey.totalHorasAnio,
            totalDiasLey: ant.bloqueAnualLey.totalDiasAnio,
            totalHorasPermisos: ant.bloqueAnualPermisos.totalHorasAnio,
            totalDiasPermisos: ant.bloqueAnualPermisos.totalDiasAnio,
            variacionPorcentualHoras: varHoras,
            variacionPorcentualDias: varDias,
            tendencia
        };
    });
}

// ================================================================
// INTEGRACIÓN CON M23 (INDICADORES)
// ================================================================

/**
 * Envía (o actualiza) el resultado del indicador mínimo "Ausentismo por
 * Causa Médica" en M23 usando los datos de un cierre mensual.
 * 
 * ⚠️ IMPORTANTE: usa `bloqueCausaMedica.porcentajeAusentismo`, que SOLO
 * incluye EG, AT, EL, LM, LP. NO usa el bloque "Por Ley" completo.
 * 
 * Reglas:
 *  - Si el indicador no existe en M23 → se siembran los 6 mínimos
 *    automáticamente (vía `obtenerIndicadoresMinimos`).
 *  - Si ya existe un resultado para el mismo indicador y periodo → se
 *    actualiza.
 *  - Si no → se crea.
 * 
 * El ausentismo es un indicador donde "menor es mejor":
 *   - Cumplimiento = (meta / valor) × 100
 *   - Si valor es 0 → cumplimiento 100%.
 * 
 * @param cierre - Cierre mensual calculado.
 * @returns {{ exito: boolean; mensaje: string; resultadoId?: string }} - Resultado.
 */
export function enviarIndicadoresAM23(
    cierre: IEstadisticaMensual
): { exito: boolean; mensaje: string; resultadoId?: string } {
    // 1. Buscar el indicador en M23
    let indicadores = storageIndicadores
        .obtenerTodos()
        .filter(i => i.empresaId === cierre.empresaId);

    let indicadorALG = indicadores.find(
        i => i.tipoMinimo === 'AusentismoCausaMedica'
    );

    // 2. Fallback: si no existe, sembrar los 6 mínimos automáticamente
    if (!indicadorALG) {
        console.info('M24→M23: No existe el indicador "Ausentismo por Causa Médica". Sembrando los 6 mínimos...');

        const minimos = obtenerIndicadoresMinimos(cierre.empresaId);
        minimos.forEach(ind => storageIndicadores.guardar(ind));

        // Recargar y buscar de nuevo
        indicadores = storageIndicadores
            .obtenerTodos()
            .filter(i => i.empresaId === cierre.empresaId);

        indicadorALG = indicadores.find(
            i => i.tipoMinimo === 'AusentismoCausaMedica'
        );
    }

    if (!indicadorALG) {
        return {
            exito: false,
            mensaje: 'No se pudo crear ni encontrar el indicador "Ausentismo por Causa Médica" en M23.'
        };
    }

    // 3. Calcular valor, meta, cumplimiento y semáforo
    //    ⚠️ Usar bloqueCausaMedica, NO bloqueLey.
    const valor = cierre.bloqueCausaMedica.porcentajeAusentismo;
    const meta = indicadorALG.metaEsperada > 0 ? indicadorALG.metaEsperada : 3;

    const porcentajeCumplimiento = valor > 0
        ? redondear((meta / valor) * 100, 2)
        : 100;

    const semaforo = calcularSemaforoMenorEsMejor(valor, meta);

    // 4. Buscar resultado existente
    const existentes = storageResultadosIndicadores
        .obtenerTodos()
        .filter(r => r.indicadorId === indicadorALG!.id && r.periodo === cierre.periodo);

    if (existentes.length > 0) {
        const existente = existentes[0];
        const ok = storageResultadosIndicadores.actualizar(existente.id, {
            valor,
            metaPeriodo: meta,
            porcentajeCumplimiento,
            semaforo,
            alertaGenerada: semaforo !== 'Verde',
            observaciones: `Actualizado automáticamente desde M24 (${cierre.periodo}) — Causa Médica (EG+AT+EL+LM+LP).`,
            fechaActualizacion: new Date()
        });

        return ok
            ? {
                exito: true,
                mensaje: `Resultado actualizado en M23 para el periodo ${cierre.periodo}.`,
                resultadoId: existente.id
            }
            : {
                exito: false,
                mensaje: 'Error al actualizar el resultado en M23.'
            };
    }

    // 5. Crear nuevo resultado
    const nuevo: IResultadoIndicador = {
        id: generarIdResultado(),
        empresaId: cierre.empresaId,
        indicadorId: indicadorALG.id,
        periodo: cierre.periodo,
        valor,
        metaPeriodo: meta,
        porcentajeCumplimiento,
        semaforo,
        alertaGenerada: semaforo !== 'Verde',
        planAccionId: null,
        evidencias: [],
        observaciones: `Generado automáticamente desde M24 (${cierre.periodo}) — Causa Médica (EG+AT+EL+LM+LP).`,
        validado: false,
        validadoPor: null,
        fechaValidacion: null,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    const ok = storageResultadosIndicadores.guardar(nuevo);

    return ok
        ? {
            exito: true,
            mensaje: `Resultado enviado a M23 para el periodo ${cierre.periodo}.`,
            resultadoId: nuevo.id
        }
        : {
            exito: false,
            mensaje: 'Error al guardar el resultado en M23.'
        };
}

// ================================================================
// GENERACIÓN DE IDs
// ================================================================

/**
 * Genera un ID único para un evento de ausentismo.
 * Formato: "AUS-XXXXXXXXXXXX"
 */
export function generarIdEventoAusentismo(): string {
    return `AUS-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para los parámetros de un mes.
 * Formato: "PAR-XXXXXXXXXXXX"
 */
export function generarIdParametrosMes(): string {
    return `PAR-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un cierre mensual.
 * Formato: "CIE-XXXXXXXXXXXX"
 */
export function generarIdCierreMensual(): string {
    return `CIE-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un consolidado anual.
 * Formato: "CON-XXXXXXXXXXXX"
 */
export function generarIdConsolidadoAnual(): string {
    return `CON-${generarIdUnico().substring(0, 12)}`;
}

// ================================================================
// FORMATEO DE PERIODOS
// ================================================================

/**
 * Formatea un periodo "YYYY-MM" a partir de mes y año numéricos.
 */
export function formatearPeriodoAusentismo(mes: number, anio: number): string {
    return `${anio}-${String(mes).padStart(2, '0')}`;
}

/**
 * Obtiene el nombre legible de un mes a partir del periodo "YYYY-MM".
 */
export function obtenerNombreMes(periodo: string): string {
    if (/^\d{4}-\d{2}$/.test(periodo)) {
        const mes = parseInt(periodo.substring(5, 7), 10) - 1;
        if (mes >= 0 && mes < 12) return NOMBRES_MESES[mes];
    }
    return periodo;
}

/**
 * Obtiene el año de un periodo "YYYY-MM".
 */
export function obtenerAnioDePeriodo(periodo: string): string {
    return periodo.substring(0, 4);
}