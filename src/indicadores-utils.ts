/**
 * src/indicadores-utils.ts
 * 
 * Utilidades específicas para el módulo M23 - Gestión de Indicadores SG-SST.
 * 
 * Propósito:
 * - Centralizar TODAS las fórmulas matemáticas de indicadores:
 *     * Índices de accidentalidad (IFAT, ISAT, ILIAT, tasa letalidad).
 *     * Enfermedad laboral (prevalencia, incidencia).
 *     * Ausentismo (ALG).
 *     * Proceso (cumplimiento plan, cobertura capacitación, etc.).
 * - Cálculo de Horas Hombre Trabajadas (HHT).
 * - Cálculo del semáforo (Verde/Amarillo/Rojo).
 * - Cálculo de tendencias históricas.
 * - Indicadores mínimos predefinidos (Res. 0312 de 2019).
 * - Generación de IDs y formateo de periodos.
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (art. 2.2.4.6.19)
 * - Resolución 0312 de 2019 (indicadores mínimos)
 * - NTC 3701 (índices de accidentalidad)
 * - NTC 3793 (ausentismo)
 * 
 * @version 1.0.1
 *  - Fix: tipoResultado en crearIndicadorMinimo usa 'Indice' (sin tilde)
 *    y 'Porcentaje' (en lugar de '%') porque el tipo TipoResultado es
 *    una unión estricta. El campo unidadMedida sigue aceptando strings
 *    libres como 'Índice' y '%'.
 * 
 * @since 2026-10-08
 */

import { generarIdUnico, fechaActualISO } from './utils.js';
import type {
    IIndicador,
    IResultadoIndicador,
    ITendenciaIndicador,
    IDatoHistorico,
    ICalculoHHT,
    NivelSemaforo,
    TipoTendencia,
    Periodicidad,
    ClasificacionIndicador,
    TipoIndicadorMinimo,
    TipoResultado,
    TipoMedida,
    TipoCalculoAutomatico,
    DestinatarioIndicador
} from './interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** Constante estándar para índices de accidentalidad (NTC 3701). */
export const K_ACCIDENTALIDAD = 200000;

/** Constante estándar para prevalencia/incidencia (NTC 3793). */
export const K_ENFERMEDAD = 100000;

/** Constante estándar para tasas con poblaciones pequeñas. */
export const K_POBLACION_PEQUENA = 1000;

/** Umbrales de semáforo por defecto (porcentaje de cumplimiento). */
export const UMBRALES_SEMAFORO = {
    VERDE_MIN: 90,
    AMARILLO_MIN: 75,
    ROJO_MAX: 75
} as const;

/** Umbrales de variación para considerar una tendencia "Estable" (%). */
export const UMBRAL_TENDENCIA_ESTABLE = 5;

// ================================================================
// TIPOS AUXILIARES
// ================================================================

/**
 * Datos mínimos para calcular la HHT.
 */
export interface DatosHHT {
    XT: number;
    HTD: number;
    DTM: number;
    NHE: number;
    NHA: number;
}

/**
 * Resultado del cálculo de una fórmula de accidentalidad.
 */
export interface ResultadoIndice {
    valor: number;
    formulaAplicada: string;
    unidad: string;
}

/**
 * Rango de semáforo configurado en un indicador.
 */
export interface RangoSemaforo {
    verde: string;
    amarillo: string;
    rojo: string;
}

// ================================================================
// CÁLCULO DE HORAS HOMBRE TRABAJADAS (HHT)
// ================================================================

/**
 * Calcula las Horas Hombre Trabajadas (HHT) según la NTC 3701.
 * 
 * Fórmula: HHT = (XT × HTD × DTM) + NHE − NHA
 * 
 * @param datos - Datos del cálculo (XT, HTD, DTM, NHE, NHA).
 * @returns {number} - Total de HHT redondeado a 2 decimales.
 */
export function calcularHHT(datos: DatosHHT): number {
    const ordinarias = datos.XT * datos.HTD * datos.DTM;
    const total = ordinarias + datos.NHE - datos.NHA;
    return Math.max(0, redondear(total, 2));
}

/**
 * Calcula las horas ordinarias totales (antes de sumar extras y restar ausentismo).
 */
export function calcularHorasOrdinarias(XT: number, HTD: number, DTM: number): number {
    return Math.max(0, redondear(XT * HTD * DTM, 2));
}

// ================================================================
// FÓRMULAS DE ACCIDENTALIDAD (NTC 3701)
// ================================================================

/**
 * Calcula el Índice de Frecuencia de Accidentes de Trabajo (IFAT).
 * IFAT = (N° AT / HHT) × K
 */
export function calcularIFAT(
    numAT: number,
    hht: number,
    k: number = K_ACCIDENTALIDAD
): ResultadoIndice {
    if (hht <= 0) {
        return {
            valor: 0,
            formulaAplicada: 'IFAT = (N° AT / HHT) × K',
            unidad: 'Índice'
        };
    }
    const valor = redondear((numAT / hht) * k, 2);
    return {
        valor,
        formulaAplicada: 'IFAT = (N° AT / HHT) × K',
        unidad: 'Índice'
    };
}

/**
 * Calcula el Índice de Severidad de Accidentes de Trabajo (ISAT).
 * ISAT = ((Días perdidos + Días cargados) / HHT) × K
 */
export function calcularISAT(
    diasPerdidos: number,
    diasCargados: number,
    hht: number,
    k: number = K_ACCIDENTALIDAD
): ResultadoIndice {
    if (hht <= 0) {
        return {
            valor: 0,
            formulaAplicada: 'ISAT = ((Días perdidos + Días cargados) / HHT) × K',
            unidad: 'Índice'
        };
    }
    const totalDias = diasPerdidos + diasCargados;
    const valor = redondear((totalDias / hht) * k, 2);
    return {
        valor,
        formulaAplicada: 'ISAT = ((Días perdidos + Días cargados) / HHT) × K',
        unidad: 'Índice'
    };
}

/**
 * Calcula el Índice de Lesiones Incapacitantes (ILIAT).
 * ILIAT = (IFAT × ISAT) / 1000
 */
export function calcularILIAT(ifat: number, isat: number): ResultadoIndice {
    const valor = redondear((ifat * isat) / 1000, 2);
    return {
        valor,
        formulaAplicada: 'ILIAT = (IFAT × ISAT) / 1000',
        unidad: 'Índice'
    };
}

/**
 * Calcula la Tasa de Letalidad por Accidentes de Trabajo.
 * Tasa = (N° mortales / Total AT) × 100
 */
export function calcularTasaLetalidad(
    mortales: number,
    totalAT: number
): ResultadoIndice {
    if (totalAT <= 0) {
        return {
            valor: 0,
            formulaAplicada: 'Tasa Letalidad = (N° Mortales / Total AT) × 100',
            unidad: '%'
        };
    }
    const valor = redondear((mortales / totalAT) * 100, 2);
    return {
        valor,
        formulaAplicada: 'Tasa Letalidad = (N° Mortales / Total AT) × 100',
        unidad: '%'
    };
}

/**
 * Calcula el Índice de Frecuencia de Incidentes (IFI).
 * IFI = (N° incidentes / HHT) × K
 */
export function calcularIFI(
    numIncidentes: number,
    hht: number,
    k: number = K_ACCIDENTALIDAD
): ResultadoIndice {
    if (hht <= 0) {
        return {
            valor: 0,
            formulaAplicada: 'IFI = (N° Incidentes / HHT) × K',
            unidad: 'Índice'
        };
    }
    const valor = redondear((numIncidentes / hht) * k, 2);
    return {
        valor,
        formulaAplicada: 'IFI = (N° Incidentes / HHT) × K',
        unidad: 'Índice'
    };
}

// ================================================================
// FÓRMULAS DE ENFERMEDAD LABORAL (NTC 3793)
// ================================================================

/**
 * Calcula la Prevalencia de Enfermedad Laboral.
 * Prevalencia = (Casos totales / Promedio trabajadores) × K
 */
export function calcularPrevalenciaEL(
    casosTotales: number,
    promedioTrabajadores: number,
    k: number = K_ENFERMEDAD
): ResultadoIndice {
    if (promedioTrabajadores <= 0) {
        return {
            valor: 0,
            formulaAplicada: 'Prevalencia = (Casos totales / Promedio) × K',
            unidad: 'Tasa'
        };
    }
    const valor = redondear((casosTotales / promedioTrabajadores) * k, 2);
    return {
        valor,
        formulaAplicada: 'Prevalencia = (Casos totales / Promedio) × K',
        unidad: 'Tasa'
    };
}

/**
 * Calcula la Incidencia de Enfermedad Laboral.
 * Incidencia = (Casos nuevos / Promedio trabajadores) × K
 */
export function calcularIncidenciaEL(
    casosNuevos: number,
    promedioTrabajadores: number,
    k: number = K_ENFERMEDAD
): ResultadoIndice {
    if (promedioTrabajadores <= 0) {
        return {
            valor: 0,
            formulaAplicada: 'Incidencia = (Casos nuevos / Promedio) × K',
            unidad: 'Tasa'
        };
    }
    const valor = redondear((casosNuevos / promedioTrabajadores) * k, 2);
    return {
        valor,
        formulaAplicada: 'Incidencia = (Casos nuevos / Promedio) × K',
        unidad: 'Tasa'
    };
}

// ================================================================
// FÓRMULAS DE AUSENTISMO
// ================================================================

/**
 * Calcula el Ausentismo Laboral Global (ALG).
 * ALG = (Tiempo perdido / Tiempo programado) × 100
 */
export function calcularALG(
    tiempoPerdido: number,
    tiempoProgramado: number
): ResultadoIndice {
    if (tiempoProgramado <= 0) {
        return {
            valor: 0,
            formulaAplicada: 'ALG = (Tiempo perdido / Tiempo programado) × 100',
            unidad: '%'
        };
    }
    const valor = redondear((tiempoPerdido / tiempoProgramado) * 100, 2);
    return {
        valor,
        formulaAplicada: 'ALG = (Tiempo perdido / Tiempo programado) × 100',
        unidad: '%'
    };
}

/**
 * Calcula el Índice General de Ausentistas (IGA).
 * IGA = (N° ausentistas / Total trabajadores) × 100
 */
export function calcularIGA(
    numAusentistas: number,
    totalTrabajadores: number
): ResultadoIndice {
    if (totalTrabajadores <= 0) {
        return {
            valor: 0,
            formulaAplicada: 'IGA = (N° ausentistas / Total trabajadores) × 100',
            unidad: '%'
        };
    }
    const valor = redondear((numAusentistas / totalTrabajadores) * 100, 2);
    return {
        valor,
        formulaAplicada: 'IGA = (N° ausentistas / Total trabajadores) × 100',
        unidad: '%'
    };
}

// ================================================================
// FÓRMULAS DE PROCESO
// ================================================================

/**
 * Calcula el Cumplimiento del Plan de Trabajo.
 * (Actividades ejecutadas / Actividades programadas) × 100
 */
export function calcularCumplimientoPlan(
    ejecutadas: number,
    programadas: number
): ResultadoIndice {
    if (programadas <= 0) {
        return {
            valor: 0,
            formulaAplicada: '(Ejecutadas / Programadas) × 100',
            unidad: '%'
        };
    }
    const valor = redondear((ejecutadas / programadas) * 100, 2);
    return {
        valor,
        formulaAplicada: '(Ejecutadas / Programadas) × 100',
        unidad: '%'
    };
}

/**
 * Calcula la Cobertura de Capacitación.
 * (Trabajadores capacitados / Total trabajadores programados) × 100
 */
export function calcularCoberturaCapacitacion(
    capacitados: number,
    programados: number
): ResultadoIndice {
    return {
        valor: redondear(porcentaje(capacitados, programados), 2),
        formulaAplicada: '(Capacitados / Programados) × 100',
        unidad: '%'
    };
}

/**
 * Calcula la Cobertura de Exámenes Médicos Ocupacionales (EMO).
 * (Trabajadores con EMO / Total trabajadores requeridos) × 100
 */
export function calcularCoberturaEMO(
    conEMO: number,
    requeridos: number
): ResultadoIndice {
    return {
        valor: redondear(porcentaje(conEMO, requeridos), 2),
        formulaAplicada: '(Con EMO / Requeridos) × 100',
        unidad: '%'
    };
}

/**
 * Calcula la Intervención de Peligros.
 * (Puestos intervenidos / Riesgos prioritarios identificados) × 100
 */
export function calcularIntervencionPeligros(
    intervenidos: number,
    prioritarios: number
): ResultadoIndice {
    return {
        valor: redondear(porcentaje(intervenidos, prioritarios), 2),
        formulaAplicada: '(Puestos intervenidos / Riesgos prioritarios) × 100',
        unidad: '%'
    };
}

/**
 * Calcula el porcentaje de Investigación de Accidentes/Incidentes.
 * (Investigados / Total ocurridos) × 100
 */
export function calcularInvestigacionAT(
    investigados: number,
    ocurridos: number
): ResultadoIndice {
    return {
        valor: redondear(porcentaje(investigados, ocurridos), 2),
        formulaAplicada: '(Investigados / Ocurridos) × 100',
        unidad: '%'
    };
}

/**
 * Calcula la Ejecución de Inspecciones de Seguridad.
 * (Realizadas / Programadas) × 100
 */
export function calcularEjecucionInspecciones(
    realizadas: number,
    programadas: number
): ResultadoIndice {
    return {
        valor: redondear(porcentaje(realizadas, programadas), 2),
        formulaAplicada: '(Realizadas / Programadas) × 100',
        unidad: '%'
    };
}

// ================================================================
// CÁLCULO DE SEMÁFORO
// ================================================================

/**
 * Determina el nivel de semáforo según el porcentaje de cumplimiento.
 * 
 * Criterios por defecto:
 *   - Verde:    >= 90%
 *   - Amarillo: 75% - 89%
 *   - Rojo:     < 75%
 */
export function calcularSemaforo(porcentajeCumplimiento: number): NivelSemaforo {
    if (porcentajeCumplimiento >= UMBRALES_SEMAFORO.VERDE_MIN) return 'Verde';
    if (porcentajeCumplimiento >= UMBRALES_SEMAFORO.AMARILLO_MIN) return 'Amarillo';
    return 'Rojo';
}

/**
 * Calcula el semáforo para indicadores donde un valor menor es mejor.
 */
export function calcularSemaforoMenorEsMejor(valor: number, meta: number): NivelSemaforo {
    if (valor <= meta) return 'Verde';
    const porcentaje = meta > 0 ? (meta / valor) * 100 : (valor === 0 ? 100 : 0);
    return calcularSemaforo(porcentaje);
}

/**
 * Obtiene el color hex asociado a un nivel de semáforo.
 */
export function obtenerColorSemaforo(nivel: NivelSemaforo): string {
    switch (nivel) {
        case 'Verde': return '#10B981';
        case 'Amarillo': return '#FCD34D';
        case 'Rojo': return '#DC2626';
    }
}

/**
 * Obtiene el icono asociado a un nivel de semáforo.
 */
export function obtenerIconoSemaforo(nivel: NivelSemaforo): string {
    switch (nivel) {
        case 'Verde': return '🟢';
        case 'Amarillo': return '🟡';
        case 'Rojo': return '🔴';
    }
}

/**
 * Obtiene la etiqueta descriptiva de un nivel de semáforo.
 */
export function obtenerEtiquetaSemaforo(nivel: NivelSemaforo): string {
    switch (nivel) {
        case 'Verde': return 'Satisfactorio (mantener controles)';
        case 'Amarillo': return 'Alerta (monitoreo estrecho)';
        case 'Rojo': return 'Crítico (acción correctiva inmediata)';
    }
}

// ================================================================
// CÁLCULO DE TENDENCIA
// ================================================================

/**
 * Calcula la tendencia de un indicador a partir de sus resultados históricos.
 */
export function calcularTendencia(
    resultados: IResultadoIndicador[],
    nombreIndicador: string,
    clasificacion: string
): ITendenciaIndicador | null {
    if (resultados.length === 0) return null;

    const ordenados = [...resultados].sort(
        (a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime()
    );

    const datosHistoricos: IDatoHistorico[] = ordenados.map(r => ({
        periodo: r.periodo,
        valor: r.valor,
        meta: r.metaPeriodo,
        semaforo: r.semaforo,
        fechaRegistro: new Date(r.fechaCreacion).toISOString()
    }));

    const ultimo = ordenados[ordenados.length - 1];
    const penultimo = ordenados.length >= 2 ? ordenados[ordenados.length - 2] : null;

    let variacionPorcentual = 0;
    if (penultimo && penultimo.valor !== 0) {
        variacionPorcentual = redondear(
            ((ultimo.valor - penultimo.valor) / Math.abs(penultimo.valor)) * 100,
            2
        );
    }

    const estadoTendencia = determinarEstadoTendencia(
        ultimo.valor,
        penultimo?.valor ?? null,
        clasificacion
    );

    const valores = ordenados.map(r => r.valor);
    const promedioHistorico = redondear(
        valores.reduce((s, v) => s + v, 0) / valores.length,
        2
    );
    const mejorValor = Math.min(...valores);
    const peorValor = Math.max(...valores);

    const semaforoPorPeriodo = ordenados.map(r => r.semaforo);
    const periodosVerde = semaforoPorPeriodo.filter(s => s === 'Verde').length;
    const periodosAmarillo = semaforoPorPeriodo.filter(s => s === 'Amarillo').length;
    const periodosRojo = semaforoPorPeriodo.filter(s => s === 'Rojo').length;

    const proyeccionProximoPeriodo = valores.length >= 2
        ? redondear(promedioHistorico, 2)
        : null;

    const requiereAccionInmediata = ultimo.semaforo === 'Rojo' || periodosRojo >= 3;

    return {
        indicadorId: ultimo.indicadorId,
        nombreIndicador,
        clasificacion,
        datosHistoricos,
        totalPeriodos: ordenados.length,
        valorActual: ultimo.valor,
        metaActual: ultimo.metaPeriodo,
        nivelSemaforoActual: ultimo.semaforo,
        variacionPorcentual,
        estadoTendencia,
        promedioHistorico,
        mejorValor,
        peorValor,
        semaforoPorPeriodo,
        periodosVerde,
        periodosAmarillo,
        periodosRojo,
        proyeccionProximoPeriodo,
        requiereAccionInmediata,
        fechaActualizacion: new Date()
    };
}

/**
 * Determina el estado de la tendencia comparando el último valor con el anterior.
 */
function determinarEstadoTendencia(
    valorActual: number,
    valorAnterior: number | null,
    clasificacion: string
): TipoTendencia {
    if (valorAnterior === null) return 'SinDatos';
    if (valorAnterior === valorActual) return 'Estable';

    const variacion = valorAnterior !== 0
        ? Math.abs((valorActual - valorAnterior) / valorAnterior) * 100
        : 100;

    if (variacion < UMBRAL_TENDENCIA_ESTABLE) return 'Estable';

    const menorEsMejor = clasificacion === 'Resultado';

    if (menorEsMejor) {
        return valorActual < valorAnterior ? 'Positiva' : 'Negativa';
    } else {
        return valorActual > valorAnterior ? 'Positiva' : 'Negativa';
    }
}

/**
 * Obtiene el color hex de una tendencia.
 */
export function obtenerColorTendencia(tendencia: TipoTendencia): string {
    switch (tendencia) {
        case 'Positiva': return '#10B981';
        case 'Negativa': return '#DC2626';
        case 'Estable': return '#64748B';
        case 'SinDatos': return '#94A3B8';
    }
}

/**
 * Obtiene el icono de una tendencia.
 */
export function obtenerIconoTendencia(tendencia: TipoTendencia): string {
    switch (tendencia) {
        case 'Positiva': return '📈';
        case 'Negativa': return '📉';
        case 'Estable': return '➡️';
        case 'SinDatos': return '⏳';
    }
}

/**
 * Obtiene la etiqueta de una tendencia.
 */
export function obtenerEtiquetaTendencia(tendencia: TipoTendencia): string {
    switch (tendencia) {
        case 'Positiva': return 'Mejorando';
        case 'Negativa': return 'Empeorando';
        case 'Estable': return 'Estable';
        case 'SinDatos': return 'Sin datos suficientes';
    }
}

// ================================================================
// INDICADORES MÍNIMOS PREDEFINIDOS (Resolución 0312 de 2019)
// ================================================================

/**
 * Obtiene los 6 indicadores mínimos obligatorios del SG-SST.
 */
export function obtenerIndicadoresMinimos(empresaId: string): IIndicador[] {
    const ahora = new Date();

    return [
        crearIndicadorMinimo(
            empresaId,
            'Frecuencia de Accidentalidad',
            'FrecuenciaAccidentalidad',
            'Resultado',
            'Mide qué tan seguido ocurren los accidentes de trabajo en el periodo.',
            'IFAT = (N° AT / HHT) × 200000',
            'Índice',
            'Mensual',
            '< 2.0',
            'Indice',
            'IFAT',
            K_ACCIDENTALIDAD,
            ahora
        ),
        crearIndicadorMinimo(
            empresaId,
            'Severidad de Accidentalidad',
            'SeveridadAccidentalidad',
            'Resultado',
            'Mide el impacto o la gravedad de los accidentes según los días de trabajo perdidos.',
            'ISAT = ((Días perdidos + Días cargados) / HHT) × 200000',
            'Índice',
            'Mensual',
            '< 50',
            'Indice',
            'ISAT',
            K_ACCIDENTALIDAD,
            ahora
        ),
        crearIndicadorMinimo(
            empresaId,
            'Proporción de Accidentes Mortales',
            'ProporcionMortales',
            'Resultado',
            'Cuántos accidentes con resultado de muerte se presentaron frente al total de accidentes.',
            'Tasa = (N° Mortales / Total AT) × 100',
            '%',
            'Anual',
            '0%',
            'Porcentaje',
            'TasaLetalidad',
            null,
            ahora
        ),
        crearIndicadorMinimo(
            empresaId,
            'Prevalencia de Enfermedad Laboral',
            'PrevalenciaEnfermedadLaboral',
            'Resultado',
            'Número total de casos de enfermedad laboral (nuevos + antiguos) en el periodo.',
            'Prevalencia = (Casos totales / Promedio) × 100000',
            'Tasa',
            'Anual',
            '< 1',
            'Tasa',
            'PrevalenciaEL',
            K_ENFERMEDAD,
            ahora
        ),
        crearIndicadorMinimo(
            empresaId,
            'Incidencia de Enfermedad Laboral',
            'IncidenciaEnfermedadLaboral',
            'Resultado',
            'Aparición de nuevos casos de enfermedad laboral en el periodo.',
            'Incidencia = (Casos nuevos / Promedio) × 100000',
            'Tasa',
            'Anual',
            '< 1',
            'Tasa',
            'IncidenciaEL',
            K_ENFERMEDAD,
            ahora
        ),
        crearIndicadorMinimo(
            empresaId,
            'Ausentismo por Causa Médica',
            'AusentismoCausaMedica',
            'Resultado',
            'Porcentaje de días u horas de trabajo perdidos por incapacidades médicas.',
            'ALG = (Tiempo perdido / Tiempo programado) × 100',
            '%',
            'Mensual',
            '< 3%',
            'Porcentaje',
            'ALG',
            null,
            ahora
        )
    ];
}

/**
 * Helper para crear un indicador mínimo predefinido.
 */
function crearIndicadorMinimo(
    empresaId: string,
    nombre: string,
    tipoMinimo: TipoIndicadorMinimo,
    clasificacion: ClasificacionIndicador,
    definicion: string,
    formula: string,
    unidadMedida: string,
    periodicidad: Periodicidad,
    limiteEsperado: string,
    tipoResultado: TipoResultado,
    tipoCalculo: TipoCalculoAutomatico,
    constanteK: number | null,
    fecha: Date
): IIndicador {
    const destinatarios: DestinatarioIndicador[] = ['AltaDireccion', 'Copasst'];

    return {
        id: generarIdIndicador(),
        empresaId,
        nombre,
        clasificacion,
        tipoMinimo,
        esPredefinido: true,

        definicion,
        interpretacion: 'Indicador mínimo obligatorio Res. 0312 de 2019.',
        limiteEsperado,
        formula,
        fuenteInformacion: 'Registros internos de SST, nómina y ausentismo.',
        responsables: 'Responsable del SG-SST',
        periodicidad,

        tipoMedida: 'Formula' as TipoMedida,
        tipoCalculo,
        constanteK,
        variablesFormula: [],
        tipoResultado,
        unidadMedida,
        metaEsperada: 0,

        rangoVerde: 'Cumple la meta',
        rangoAmarillo: 'Cerca de la meta',
        rangoRojo: 'Incumple la meta',

        destinatarios,
        estado: 'Activo',
        descripcion: definicion,

        fechaCreacion: fecha,
        fechaActualizacion: fecha
    };
}

// ================================================================
// GENERACIÓN DE IDs
// ================================================================

/**
 * Genera un ID único para un indicador.
 * Formato: "IND-XXXXXXXXXXXX"
 */
export function generarIdIndicador(): string {
    return `IND-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un resultado de indicador.
 * Formato: "RES-XXXXXXXXXXXX"
 */
export function generarIdResultado(): string {
    return `RES-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un cálculo de HHT.
 * Formato: "HHT-XXXXXXXXXXXX"
 */
export function generarIdCalculoHHT(): string {
    return `HHT-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un plan de acción.
 * Formato: "PLA-XXXXXXXXXXXX"
 */
export function generarIdPlanAccion(): string {
    return `PLA-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para una acción individual.
 * Formato: "ACC-XXXXXXXXXXXX"
 */
export function generarIdAccionPlan(): string {
    return `ACC-${generarIdUnico().substring(0, 12)}`;
}

// ================================================================
// UTILIDADES DE PERIODO
// ================================================================

/**
 * Formatea un identificador de periodo según la periodicidad.
 */
export function formatearPeriodo(
    fecha: Date = new Date(),
    periodicidad: Periodicidad = 'Mensual'
): string {
    const año = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;

    switch (periodicidad) {
        case 'Mensual':
            return `${año}-${String(mes).padStart(2, '0')}`;
        case 'Trimestral': {
            const trimestre = Math.ceil(mes / 3);
            return `${año}-Q${trimestre}`;
        }
        case 'Semestral': {
            const semestre = Math.ceil(mes / 6);
            return `${año}-S${semestre}`;
        }
        case 'Anual':
            return `${año}`;
    }
}

/**
 * Obtiene el nombre legible de un periodo.
 */
export function nombrePeriodo(periodo: string): string {
    const MESES = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (/^\d{4}-\d{2}$/.test(periodo)) {
        const [año, mes] = periodo.split('-');
        const mesIdx = parseInt(mes, 10) - 1;
        return `${MESES[mesIdx]} ${año}`;
    }
    if (/^\d{4}-Q\d$/.test(periodo)) {
        const [año, q] = periodo.split('-');
        const trimestres = ['Primer', 'Segundo', 'Tercer', 'Cuarto'];
        return `${trimestres[parseInt(q.replace('Q', ''), 10) - 1]} trimestre ${año}`;
    }
    if (/^\d{4}-S\d$/.test(periodo)) {
        const [año, s] = periodo.split('-');
        const semestres = ['Primer', 'Segundo'];
        return `${semestres[parseInt(s.replace('S', ''), 10) - 1]} semestre ${año}`;
    }
    if (/^\d{4}$/.test(periodo)) {
        return `Año ${periodo}`;
    }
    return periodo;
}

/**
 * Obtiene el periodo actual formateado según la periodicidad.
 */
export function periodoActual(periodicidad: Periodicidad): string {
    return formatearPeriodo(new Date(), periodicidad);
}

// ================================================================
// UTILIDADES AUXILIARES
// ================================================================

/**
 * Redondea un número a N decimales.
 */
export function redondear(valor: number, decimales: number = 2): number {
    if (isNaN(valor)) return 0;
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
 * Calcula el porcentaje de cumplimiento de una meta.
 */
export function calcularPorcentajeCumplimiento(valor: number, meta: number): number {
    if (meta <= 0) return valor === 0 ? 100 : 0;
    return redondear((valor / meta) * 100, 2);
}

/**
 * Aplica una función de cálculo automático a los datos proporcionados.
 */
export function calcularIndicadorAutomatico(
    tipoCalculo: TipoCalculoAutomatico,
    datos: {
        numAT?: number;
        diasPerdidos?: number;
        diasCargados?: number;
        hht?: number;
        mortales?: number;
        totalAT?: number;
        casosTotales?: number;
        casosNuevos?: number;
        promedioTrabajadores?: number;
        tiempoPerdido?: number;
        tiempoProgramado?: number;
        ejecutadas?: number;
        programadas?: number;
        capacitados?: number;
    }
): ResultadoIndice | null {
    switch (tipoCalculo) {
        case 'IFAT':
            return calcularIFAT(datos.numAT ?? 0, datos.hht ?? 0);
        case 'ISAT':
            return calcularISAT(datos.diasPerdidos ?? 0, datos.diasCargados ?? 0, datos.hht ?? 0);
        case 'ILIAT': {
            const ifat = calcularIFAT(datos.numAT ?? 0, datos.hht ?? 0).valor;
            const isat = calcularISAT(datos.diasPerdidos ?? 0, datos.diasCargados ?? 0, datos.hht ?? 0).valor;
            return calcularILIAT(ifat, isat);
        }
        case 'TasaLetalidad':
            return calcularTasaLetalidad(datos.mortales ?? 0, datos.totalAT ?? 0);
        case 'PrevalenciaEL':
            return calcularPrevalenciaEL(datos.casosTotales ?? 0, datos.promedioTrabajadores ?? 0);
        case 'IncidenciaEL':
            return calcularIncidenciaEL(datos.casosNuevos ?? 0, datos.promedioTrabajadores ?? 0);
        case 'ALG':
            return calcularALG(datos.tiempoPerdido ?? 0, datos.tiempoProgramado ?? 0);
        case 'CumplimientoPlan':
            return calcularCumplimientoPlan(datos.ejecutadas ?? 0, datos.programadas ?? 0);
        case 'CoberturaCapacitacion':
            return calcularCoberturaCapacitacion(datos.capacitados ?? 0, datos.programadas ?? 0);
        case 'Manual':
            return null;
        default:
            return null;
    }
}

/**
 * Crea un cálculo de HHT a partir de datos básicos.
 */
export function crearCalculoHHT(
    empresaId: string,
    periodo: string,
    datos: DatosHHT
): ICalculoHHT {
    const ahora = new Date();
    const hht = calcularHHT(datos);
    const ordinarias = calcularHorasOrdinarias(datos.XT, datos.HTD, datos.DTM);

    return {
        id: generarIdCalculoHHT(),
        empresaId,
        periodo,
        fechaInicioPeriodo: fechaActualISO(),
        fechaFinPeriodo: fechaActualISO(),
        XT: datos.XT,
        HTD: datos.HTD,
        DTM: datos.DTM,
        NHE: datos.NHE,
        NHA: datos.NHA,
        horasOrdinariasTotales: ordinarias,
        hhtTotal: hht,
        origen: 'Manual',
        estado: 'Borrador',
        observaciones: null,
        calculadoPor: null,
        validadoPor: null,
        fechaValidacion: null,
        fechaCreacion: ahora,
        fechaActualizacion: ahora
    };
}