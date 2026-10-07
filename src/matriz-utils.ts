/**
 * src/matriz-utils.ts
 * 
 * Helper de cálculos y utilidades para el módulo M13 - Gestión de Matriz
 * de Peligros y Riesgos (GTC 45).
 * 
 * Propósito:
 * - Centralizar TODOS los cálculos de la GTC 45 (NP, NR, interpretaciones,
 *   colores, aceptabilidad) en un solo lugar.
 * - Evitar duplicación de lógica entre matriz-listado.ts y matriz-detalle.ts.
 * - Proporcionar utilidades auxiliares (generación de IDs, formateo de fechas,
 *   cálculo de vigencia).
 * - Proporcionar funciones de estadísticas agregadas (Nivel de Eficiencia
 *   y Evaluación del Riesgo) para el listado.
 * 
 * Referencia: Guía Técnica Colombiana GTC 45 (Tablas 2, 3, 4, 6, 7).
 * 
 * @version 1.0.0
 * @since 2026-09-16
 */

import type {
    IRiesgo,
    NivelDeficiencia,
    NivelExposicion,
    NivelProbabilidad,
    NivelConsecuencia,
    NivelRiesgo,
    ColorRiesgo,
    EstadoRiesgo
} from './interfaces/index.js';

// ================================================================
// CONSTANTES GTC 45
// ================================================================

/**
 * Etiquetas del Nivel de Deficiencia (ND) - GTC 45 Tabla 2.
 */
export const ETIQUETAS_DEFICIENCIA: Record<NivelDeficiencia, string> = {
    10: 'Muy Alto (MA)',
    6: 'Alto (A)',
    2: 'Medio (M)'
};

/**
 * Etiquetas del Nivel de Exposición (NE) - GTC 45 Tabla 3.
 */
export const ETIQUETAS_EXPOSICION: Record<NivelExposicion, string> = {
    4: 'Continua (EC)',
    3: 'Frecuente (EF)',
    2: 'Ocasional (EO)',
    1: 'Esporádica (EE)'
};

/**
 * Etiquetas del Nivel de Consecuencia (NC) - GTC 45 Tabla 6.
 */
export const ETIQUETAS_CONSECUENCIA: Record<NivelConsecuencia, string> = {
    100: 'Mortal o Catastrófico (M)',
    60: 'Muy Grave (MG)',
    25: 'Grave (G)',
    10: 'Leve (L)'
};

/**
 * Mapa de color por Nivel de Riesgo (NR).
 */
export const COLOR_POR_NIVEL_RIESGO: Record<string, ColorRiesgo> = {
    'I': 'Rojo',
    'II': 'Naranja',
    'III': 'Amarillo',
    'IV': 'Verde'
};

/**
 * Mapa de aceptabilidad por Nivel de Riesgo (NR).
 */
export const ACEPTABILIDAD_POR_NIVEL_RIESGO: Record<string, string> = {
    'I': 'No Aceptable',
    'II': 'No Aceptable',
    'III': 'No Aceptable o Aceptable con control',
    'IV': 'Aceptable'
};

/**
 * Mapa de interpretación por Nivel de Riesgo (NR) - GTC 45 Tabla 7.
 */
export const INTERPRETACION_POR_NIVEL_RIESGO: Record<string, string> = {
    'I': 'Situación crítica. Suspender actividades hasta que el riesgo esté bajo control. Intervención urgente.',
    'II': 'Corregir y adoptar medidas de control de inmediato.',
    'III': 'Mejorar si es posible. Sería conveniente justificar la intervención y su rentabilidad.',
    'IV': 'Mantener las medidas de control existentes. No se requiere intervención.'
};

// ================================================================
// CÁLCULOS GTC 45
// ================================================================

/**
 * Calcula el Nivel de Probabilidad (NP) según GTC 45.
 * 
 * Fórmula: NP = ND × NE
 * 
 * @param nd - Nivel de Deficiencia (2, 6, 10).
 * @param ne - Nivel de Exposición (1, 2, 3, 4).
 * @returns {NivelProbabilidad} - Nivel de Probabilidad calculado.
 * 
 * @example
 * calcularNivelProbabilidad(10, 4) // → 40
 * calcularNivelProbabilidad(6, 2)  // → 12
 */
export function calcularNivelProbabilidad(
    nd: NivelDeficiencia,
    ne: NivelExposicion
): NivelProbabilidad {
    return (nd * ne) as NivelProbabilidad;
}

/**
 * Interpreta el Nivel de Probabilidad (NP) según GTC 45 Tabla 4.
 * 
 * @param np - Nivel de Probabilidad.
 * @returns {string} - Interpretación textual.
 * 
 * @example
 * interpretarNivelProbabilidad(40) // → "Muy Alto"
 * interpretarNivelProbabilidad(12) // → "Alto"
 * interpretarNivelProbabilidad(6)  // → "Medio"
 * interpretarNivelProbabilidad(2)  // → "Bajo"
 */
export function interpretarNivelProbabilidad(np: NivelProbabilidad): string {
    if (np >= 24) return 'Muy Alto';
    if (np >= 10) return 'Alto';
    if (np >= 6) return 'Medio';
    return 'Bajo';
}

/**
 * Calcula el Nivel de Riesgo (NR) según GTC 45.
 * 
 * Fórmula: NR = NP × NC
 * 
 * @param np - Nivel de Probabilidad.
 * @param nc - Nivel de Consecuencia (10, 25, 60, 100).
 * @returns {NivelRiesgo} - Nivel de Riesgo calculado.
 * 
 * @example
 * calcularNivelRiesgo(40, 100) // → 4000
 * calcularNivelRiesgo(12, 25)  // → 300 (no está en el tipo, ver nota)
 * 
 * @nota Algunos productos (ej. 12 × 25 = 300) no están en el tipo NivelRiesgo
 *       porque la GTC 45 Tabla 7 solo lista valores específicos. El valor
 *       calculado se redondea al valor más cercano de la tabla.
 */
export function calcularNivelRiesgo(
    np: NivelProbabilidad,
    nc: NivelConsecuencia
): NivelRiesgo {
    const nr = np * nc;
    return ajustarNivelRiesgoTabla(nr);
}

/**
 * Ajusta un valor de NR al valor más cercano en la tabla de la GTC 45.
 * 
 * @param nr - Valor de NR calculado.
 * @returns {NivelRiesgo} - Valor ajustado al más cercano de la tabla.
 */
function ajustarNivelRiesgoTabla(nr: number): NivelRiesgo {
    const TABLA_NR: number[] = [
        20, 40, 60, 80, 100, 120, 150, 200, 240, 250, 360, 400,
        480, 500, 600, 800, 1000, 1200, 1440, 2000, 2400, 4000
    ];

    let masCercano = TABLA_NR[0];
    let menorDiferencia = Math.abs(nr - masCercano);

    for (const valor of TABLA_NR) {
        const diferencia = Math.abs(nr - valor);
        if (diferencia < menorDiferencia) {
            menorDiferencia = diferencia;
            masCercano = valor;
        }
    }

    return masCercano as NivelRiesgo;
}

/**
 * Interpreta el Nivel de Riesgo (NR) según GTC 45 Tabla 7.
 * 
 * @param nr - Nivel de Riesgo.
 * @returns {string} - Nivel romano: "I", "II", "III" o "IV".
 * 
 * @example
 * interpretarNivelRiesgo(4000) // → "I"
 * interpretarNivelRiesgo(500)  // → "II"
 * interpretarNivelRiesgo(120)  // → "III"
 * interpretarNivelRiesgo(20)   // → "IV"
 */
export function interpretarNivelRiesgo(nr: NivelRiesgo): string {
    if (nr >= 600) return 'I';
    if (nr >= 150) return 'II';
    if (nr >= 40) return 'III';
    return 'IV';
}

/**
 * Obtiene el color asociado al Nivel de Riesgo (NR).
 * 
 * @param nr - Nivel de Riesgo.
 * @returns {ColorRiesgo} - Color: "Rojo", "Naranja", "Amarillo" o "Verde".
 */
export function obtenerColorRiesgo(nr: NivelRiesgo): ColorRiesgo {
    const nivel = interpretarNivelRiesgo(nr);
    return COLOR_POR_NIVEL_RIESGO[nivel];
}

/**
 * Obtiene la aceptabilidad del Nivel de Riesgo (NR).
 * 
 * @param nr - Nivel de Riesgo.
 * @returns {string} - "No Aceptable", "No Aceptable o Aceptable con control", "Aceptable".
 */
export function obtenerAceptabilidad(nr: NivelRiesgo): string {
    const nivel = interpretarNivelRiesgo(nr);
    return ACEPTABILIDAD_POR_NIVEL_RIESGO[nivel];
}

/**
 * Obtiene la interpretación textual del Nivel de Riesgo (NR).
 * 
 * @param nr - Nivel de Riesgo.
 * @returns {string} - Interpretación según GTC 45 Tabla 7.
 */
export function obtenerInterpretacionRiesgo(nr: NivelRiesgo): string {
    const nivel = interpretarNivelRiesgo(nr);
    return INTERPRETACION_POR_NIVEL_RIESGO[nivel];
}

/**
 * Calcula NP y NR en un solo paso (helper conveniente).
 * 
 * @param nd - Nivel de Deficiencia.
 * @param ne - Nivel de Exposición.
 * @param nc - Nivel de Consecuencia.
 * @returns {Object} - { np, nr, interpretacionNP, interpretacionNR, color, aceptabilidad }.
 */
export function calcularTodo(
    nd: NivelDeficiencia,
    ne: NivelExposicion,
    nc: NivelConsecuencia
): {
    np: NivelProbabilidad;
    nr: NivelRiesgo;
    interpretacionNP: string;
    interpretacionNR: string;
    color: ColorRiesgo;
    aceptabilidad: string;
} {
    const np = calcularNivelProbabilidad(nd, ne);
    const nr = calcularNivelRiesgo(np, nc);

    return {
        np,
        nr,
        interpretacionNP: interpretarNivelProbabilidad(np),
        interpretacionNR: interpretarNivelRiesgo(nr),
        color: obtenerColorRiesgo(nr),
        aceptabilidad: obtenerAceptabilidad(nr)
    };
}

// ================================================================
// ESTADÍSTICAS PARA EL LISTADO
// ================================================================

/**
 * Resultado de las estadísticas de un conjunto de riesgos.
 */
export interface IEstadisticasMatriz {
    /** Distribución de riesgos por nivel (I, II, III, IV). */
    evaluacionRiesgo: {
        nivelI: number;
        nivelII: number;
        nivelIII: number;
        nivelIV: number;
        total: number;
    };
    /** Nivel de eficiencia: % de riesgos controlados o en intervención. */
    nivelEficiencia: {
        controlados: number;
        enIntervencion: number;
        activos: number;
        total: number;
        porcentaje: number; // 0 a 100
    };
}

/**
 * Calcula las estadísticas agregadas de un conjunto de riesgos.
 * 
 * Devuelve DOS estadísticas para el listado:
 * 1. **Evaluación del Riesgo**: distribución por nivel (I, II, III, IV).
 * 2. **Nivel de Eficiencia**: % de riesgos controlados o en intervención.
 * 
 * @param riesgos - Array de riesgos a analizar.
 * @returns {IEstadisticasMatriz} - Objeto con ambas estadísticas.
 * 
 * @example
 * const stats = calcularEstadisticas(riesgos);
 * // stats.evaluacionRiesgo.nivelI → 2
 * // stats.nivelEficiencia.porcentaje → 50
 */
export function calcularEstadisticas(riesgos: IRiesgo[]): IEstadisticasMatriz {
    const total = riesgos.length;

    // --- Estadística 1: Evaluación del Riesgo (distribución por nivel) ---
    const evaluacionRiesgo = {
        nivelI: 0,
        nivelII: 0,
        nivelIII: 0,
        nivelIV: 0,
        total
    };

    // --- Estadística 2: Nivel de Eficiencia ---
    const nivelEficiencia = {
        controlados: 0,
        enIntervencion: 0,
        activos: 0,
        total,
        porcentaje: 0
    };

    for (const riesgo of riesgos) {
        // Distribución por nivel
        const nivel = interpretarNivelRiesgo(riesgo.nivelRiesgo);
        if (nivel === 'I') evaluacionRiesgo.nivelI++;
        else if (nivel === 'II') evaluacionRiesgo.nivelII++;
        else if (nivel === 'III') evaluacionRiesgo.nivelIII++;
        else if (nivel === 'IV') evaluacionRiesgo.nivelIV++;

        // Estado
        const estado: EstadoRiesgo = riesgo.estado;
        if (estado === 'Controlado') nivelEficiencia.controlados++;
        else if (estado === 'EnIntervencion') nivelEficiencia.enIntervencion++;
        else if (estado === 'Activo') nivelEficiencia.activos++;
    }

    // Calcular porcentaje de eficiencia
    if (total > 0) {
        const controladosOEnIntervencion =
            nivelEficiencia.controlados + nivelEficiencia.enIntervencion;
        nivelEficiencia.porcentaje = Math.round(
            (controladosOEnIntervencion / total) * 100
        );
    }

    return { evaluacionRiesgo, nivelEficiencia };
}

// ================================================================
// UTILIDADES AUXILIARES
// ================================================================

/**
 * Genera un ID único para una matriz.
 * 
 * @returns {string} - ID con formato "MAT-YYYYMMDD-HHMMSS-XXX".
 */
export function generarIdMatriz(): string {
    return generarIdConPrefijo('MAT');
}

/**
 * Genera un ID único para un riesgo.
 * 
 * @returns {string} - ID con formato "RIE-YYYYMMDD-HHMMSS-XXX".
 */
export function generarIdRiesgo(): string {
    return generarIdConPrefijo('RIE');
}

/**
 * Genera un ID único con un prefijo dado.
 * 
 * @param prefijo - Prefijo del ID (ej. "MAT", "RIE").
 * @returns {string} - ID único.
 */
function generarIdConPrefijo(prefijo: string): string {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const hora = String(ahora.getHours()).padStart(2, '0');
    const min = String(ahora.getMinutes()).padStart(2, '0');
    const seg = String(ahora.getSeconds()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');

    return `${prefijo}-${año}${mes}${dia}-${hora}${min}${seg}-${random}`;
}

/**
 * Convierte un objeto Date a string ISO "YYYY-MM-DD".
 * 
 * @param fecha - Fecha a formatear.
 * @returns {string} - Fecha en formato "YYYY-MM-DD".
 */
export function formatearFechaISO(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

/**
 * Obtiene la fecha actual en formato ISO "YYYY-MM-DD".
 * 
 * @returns {string} - Fecha actual.
 */
export function fechaActualISO(): string {
    return formatearFechaISO(new Date());
}

/**
 * Suma meses a una fecha ISO y devuelve el resultado en ISO.
 * Útil para calcular la vigencia de la matriz (ej. 12 meses).
 * 
 * @param fechaISO - Fecha base en formato "YYYY-MM-DD".
 * @param meses - Número de meses a sumar.
 * @returns {string} - Fecha resultante en formato "YYYY-MM-DD".
 * 
 * @example
 * calcularFechaVencimiento('2026-09-16', 12) // → '2027-09-16'
 */
export function calcularFechaVencimiento(
    fechaISO: string,
    meses: number
): string {
    const fecha = new Date(fechaISO + 'T00:00:00');
    if (isNaN(fecha.getTime())) {
        console.warn(`calcularFechaVencimiento: fecha inválida "${fechaISO}"`);
        return fechaISO;
    }
    fecha.setMonth(fecha.getMonth() + meses);
    return formatearFechaISO(fecha);
}

/**
 * Calcula los días restantes entre hoy y una fecha ISO.
 * 
 * @param fechaISO - Fecha objetivo en formato "YYYY-MM-DD".
 * @returns {number} - Días restantes (puede ser negativo si ya venció).
 */
export function diasRestantes(fechaISO: string): number {
    const objetivo = new Date(fechaISO + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diffMs = objetivo.getTime() - hoy.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Valida si una fecha ISO está vencida (anterior a hoy).
 * 
 * @param fechaISO - Fecha en formato "YYYY-MM-DD".
 * @returns {boolean} - true si ya venció.
 */
export function estaVencida(fechaISO: string): boolean {
    return diasRestantes(fechaISO) < 0;
}