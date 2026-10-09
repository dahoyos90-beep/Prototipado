/**
 * src/convivencia-utils.ts
 * 
 * Utilidades específicas para el módulo M21 - Gestión del Comité de
 * Convivencia Laboral (CCL).
 * 
 * Propósito:
 * - Determinar la composición del CCL según el número de trabajadores
 *   (Resolución 3461 de 2025 — escala oficial).
 * - Calcular plazos legales del trámite de quejas.
 * - Calcular alertas de vencimiento (vigencias y plazos).
 * - Calcular los indicadores de gestión del comité.
 * - Generar IDs únicos para cada entidad.
 * - Formatear números de radicado.
 * 
 * Referencias legales:
 * - Resolución 3461 de 2025 (MinTrabajo)
 * - Ley 2365 de 2024 (Acoso Sexual Laboral)
 * - Ley 1010 de 2006 (Acoso Laboral)
 * - Decreto 1072 de 2015 (SG-SST)
 * 
 * @version 1.0.0
 * @since 2026-10-07
 */

import { generarIdUnico, fechaActualISO } from './utils.js';
import type {
    IRepresentante,
    ParteRepresentante,
    RolRepresentante,
    EstadoPaso,
    EstadoQueja,
    RutaQueja
} from './interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** Duración legal de la vigencia del CCL (en años). */
export const DURACION_VIGENCIA_AÑOS = 2;

/** Duración legal de la vigencia en meses (2 años = 24 meses). */
export const DURACION_VIGENCIA_MESES = DURACION_VIGENCIA_AÑOS * 12;

/** Umbrales de alerta de vencimiento (en días). */
export const UMBRALES_ALERTA = {
    VERDE: 90,
    AMARILLO: 60,
    NARANJA: 30,
    ROJO: 0
} as const;

/**
 * Plazos legales del trámite de quejas (en días calendario).
 * Fuente: Resolución 3461 de 2025.
 */
export const PLAZOS_QUEJA = {
    ACUSE_RECIBO_LABORAL: 5,
    ACUSE_RECIBO_SEXUAL_HORAS: 48,
    EXAMEN_INICIAL: 5,
    EXAMEN_INICIAL_PRORROGA: 10,
    MEDIDAS_PROTECCION_ASL: 5,
    ENTREVISTAS: 5,
    MESA_DIALOGO_MIN: 5,
    MESA_DIALOGO_MAX: 15
} as const;

// ================================================================
// TIPOS AUXILIARES
// ================================================================

/**
 * Nivel de alerta de vencimiento.
 * - 'verde':    Sin alerta (más de 90 días).
 * - 'amarillo': Planificar (60-90 días).
 * - 'naranja':  Iniciar (30-60 días).
 * - 'rojo':     Urgente o vencido (< 30 días).
 */
export type NivelAlerta = 'verde' | 'amarillo' | 'naranja' | 'rojo';

/**
 * Composición del comité (cantidad de representantes por parte).
 */
export interface ComposicionCCL {
    principalesEmpleador: number;
    suplentesEmpleador: number;
    principalesTrabajadores: number;
    suplentesTrabajadores: number;
    totalPorParte: number;
    totalComite: number;
}

/**
 * Detalle de una alerta de vencimiento.
 */
export interface AlertaVencimiento {
    nivel: NivelAlerta;
    diasRestantes: number;
    mensaje: string;
    color: string;
    icono: string;
}

/**
 * Resultado de cálculo de plazos de una queja.
 */
export interface PlazosQueja {
    fechaLimiteAcuse: string;
    fechaLimiteExamen: string;
    fechaLimiteMedidas: string | null;
    fechaLimiteEntrevistas: string;
    fechaLimiteMesaDialogo: string;
    fechaLimiteCierreTotal: string;
}

/**
 * Indicadores de gestión del comité.
 */
export interface IndicadoresCCL {
    coberturaReuniones: number;
    eficaciaCierre: number;
    cumplimientoPrevencion: number;
}

// ================================================================
// COMPOSICIÓN DEL COMITÉ
// ================================================================

/**
 * Calcula la composición del CCL según el número de trabajadores.
 * 
 * Escala oficial — Resolución 3461 de 2025 (Versión B):
 * - < 5:        1 principal / 0 suplente por parte.
 * - 5 a 20:     1 principal + 1 suplente por parte.
 * - 21 a 500:   2 principales + 2 suplentes por parte.
 * - 501 a 1000: 3 principales + 3 suplentes por parte.
 * - 1001+:      4 principales + 4 suplentes por parte.
 * 
 * @param numTrabajadores - Cantidad total de trabajadores.
 * @returns {ComposicionCCL} - Composición resultante.
 * 
 * @example
 * calcularComposicionCCL(3)    // { principalesEmpleador: 1, suplentesEmpleador: 0, ... }
 * calcularComposicionCCL(15)   // { principalesEmpleador: 1, suplentesEmpleador: 1, ... }
 * calcularComposicionCCL(100)  // { principalesEmpleador: 2, suplentesEmpleador: 2, ... }
 * calcularComposicionCCL(750)  // { principalesEmpleador: 3, suplentesEmpleador: 3, ... }
 * calcularComposicionCCL(2000) // { principalesEmpleador: 4, suplentesEmpleador: 4, ... }
 */
export function calcularComposicionCCL(numTrabajadores: number): ComposicionCCL {
    let principales: number;
    let suplentes: number;

    if (numTrabajadores < 5) {
        principales = 1;
        suplentes = 0;
    } else if (numTrabajadores <= 20) {
        principales = 1;
        suplentes = 1;
    } else if (numTrabajadores <= 500) {
        principales = 2;
        suplentes = 2;
    } else if (numTrabajadores <= 1000) {
        principales = 3;
        suplentes = 3;
    } else {
        principales = 4;
        suplentes = 4;
    }

    const totalPorParte = principales + suplentes;

    return {
        principalesEmpleador: principales,
        suplentesEmpleador: suplentes,
        principalesTrabajadores: principales,
        suplentesTrabajadores: suplentes,
        totalPorParte,
        totalComite: totalPorParte * 2
    };
}

/**
 * Crea un representante vacío.
 * 
 * @param parte - Parte ("Empleador" o "Trabajador").
 * @param rol - Rol ("Principal" o "Suplente").
 * @returns {IRepresentante} - Representante vacío.
 */
function crearRepresentanteVacio(
    parte: ParteRepresentante,
    rol: RolRepresentante
): IRepresentante {
    return {
        nombre: '',
        cedula: '',
        cargo: '',
        rol,
        parte
    };
}

/**
 * Genera una plantilla de representantes vacíos (para formularios).
 * 
 * @param composicion - Composición calculada del comité.
 * @param parte - Parte a la que pertenecen ("Empleador" o "Trabajador").
 * @returns {IRepresentante[]} - Array de representantes vacíos.
 * 
 * @example
 * const comp = calcularComposicionCCL(100);
 * const reps = crearPlantillaRepresentantes(comp, 'Empleador');
 * // reps.length === 4 (2 principales + 2 suplentes)
 */
export function crearPlantillaRepresentantes(
    composicion: ComposicionCCL,
    parte: ParteRepresentante
): IRepresentante[] {
    const resultado: IRepresentante[] = [];

    const numPrincipales = parte === 'Empleador'
        ? composicion.principalesEmpleador
        : composicion.principalesTrabajadores;

    const numSuplentes = parte === 'Empleador'
        ? composicion.suplentesEmpleador
        : composicion.suplentesTrabajadores;

    for (let i = 0; i < numPrincipales; i++) {
        resultado.push(crearRepresentanteVacio(parte, 'Principal'));
    }
    for (let i = 0; i < numSuplentes; i++) {
        resultado.push(crearRepresentanteVacio(parte, 'Suplente'));
    }

    return resultado;
}

// ================================================================
// VIGENCIA Y FECHAS
// ================================================================

/**
 * Formatea una fecha a ISO (YYYY-MM-DD).
 * Helper interno para evitar dependencia circular con utils.ts.
 * 
 * @param fecha - Fecha a formatear.
 * @returns {string} - Fecha en ISO.
 */
function formatearFechaISO(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

/**
 * Suma días a una fecha ISO.
 * 
 * @param fechaISO - Fecha base en formato "YYYY-MM-DD".
 * @param dias - Número de días a sumar (puede ser negativo).
 * @returns {string} - Fecha resultante en formato "YYYY-MM-DD".
 */
export function sumarDias(fechaISO: string, dias: number): string {
    const fecha = new Date(fechaISO + 'T00:00:00');
    if (isNaN(fecha.getTime())) return fechaISO;
    fecha.setDate(fecha.getDate() + dias);
    return formatearFechaISO(fecha);
}

/**
 * Calcula la fecha de fin de vigencia a partir de la fecha de inicio.
 * Suma 2 años por defecto.
 * 
 * @param fechaInicio - Fecha de inicio en formato ISO (YYYY-MM-DD).
 * @param años - Duración en años (por defecto 2).
 * @returns {string} - Fecha de fin en formato ISO.
 */
export function calcularFechaFinVigencia(
    fechaInicio: string,
    años: number = DURACION_VIGENCIA_AÑOS
): string {
    if (!fechaInicio) return '';

    const fecha = new Date(fechaInicio + 'T00:00:00');
    if (isNaN(fecha.getTime())) {
        console.warn('calcularFechaFinVigencia: fecha inválida', fechaInicio);
        return '';
    }

    fecha.setFullYear(fecha.getFullYear() + años);
    return formatearFechaISO(fecha);
}

/**
 * Calcula los días restantes hasta una fecha de vencimiento.
 * Si ya venció, devuelve un número negativo.
 * 
 * @param fechaFin - Fecha de fin en formato ISO (YYYY-MM-DD).
 * @returns {number} - Días restantes (negativo si ya venció).
 */
export function calcularDiasParaVencimiento(fechaFin: string): number {
    if (!fechaFin) return 0;

    const fin = new Date(fechaFin + 'T00:00:00');
    if (isNaN(fin.getTime())) return 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diffMs = fin.getTime() - hoy.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ================================================================
// ALERTAS DE VENCIMIENTO
// ================================================================

/**
 * Obtiene el nivel de alerta según los días restantes.
 * 
 * @param dias - Días restantes hasta el vencimiento.
 * @returns {NivelAlerta} - Nivel de alerta.
 */
export function obtenerNivelAlerta(dias: number): NivelAlerta {
    if (dias < UMBRALES_ALERTA.NARANJA) return 'rojo';
    if (dias < UMBRALES_ALERTA.AMARILLO) return 'naranja';
    if (dias < UMBRALES_ALERTA.VERDE) return 'amarillo';
    return 'verde';
}

/**
 * Obtiene el color hex asociado a un nivel de alerta.
 * 
 * @param nivel - Nivel de alerta.
 * @returns {string} - Color en hex.
 */
export function obtenerColorAlerta(nivel: NivelAlerta): string {
    switch (nivel) {
        case 'verde': return '#10B981';
        case 'amarillo': return '#FCD34D';
        case 'naranja': return '#F59E0B';
        case 'rojo': return '#DC2626';
    }
}

/**
 * Obtiene el icono representativo del nivel de alerta.
 * 
 * @param nivel - Nivel de alerta.
 * @returns {string} - Emoji representativo.
 */
export function obtenerIconoAlerta(nivel: NivelAlerta): string {
    switch (nivel) {
        case 'verde': return '🟢';
        case 'amarillo': return '🟡';
        case 'naranja': return '🟠';
        case 'rojo': return '🔴';
    }
}

/**
 * Genera el detalle completo de la alerta de vencimiento del comité.
 * 
 * @param fechaFin - Fecha de fin de vigencia en formato ISO.
 * @returns {AlertaVencimiento} - Detalle de la alerta.
 */
export function calcularAlertaVencimiento(fechaFin: string): AlertaVencimiento {
    const dias = calcularDiasParaVencimiento(fechaFin);
    const nivel = obtenerNivelAlerta(dias);
    const color = obtenerColorAlerta(nivel);
    const icono = obtenerIconoAlerta(nivel);

    let mensaje: string;
    if (dias < 0) {
        mensaje = `🔴 Comité VENCIDO hace ${Math.abs(dias)} días. Renovación obligatoria.`;
    } else if (nivel === 'rojo') {
        mensaje = `⚠️ Vence en ${dias} días. ¡URGENTE!`;
    } else if (nivel === 'naranja') {
        mensaje = `Vence en ${dias} días. Inicie el proceso de renovación.`;
    } else if (nivel === 'amarillo') {
        mensaje = `Vence en ${dias} días. Planifique la renovación.`;
    } else {
        mensaje = `Vigente. Vence en ${dias} días.`;
    }

    return { nivel, diasRestantes: dias, mensaje, color, icono };
}

// ================================================================
// PLAZOS DEL TRÁMITE DE QUEJAS (Res. 3461 de 2025)
// ================================================================

/**
 * Calcula las fechas límite del trámite de una queja según su ruta.
 * 
 * Plazos:
 *   - Acoso Laboral / Convivencia: acuse 5d, examen 5d, entrevistas 5d, mesa 5-15d.
 *   - Acoso Sexual: acuse 48h, examen 5d, medidas protección 5d, entrevistas 5d.
 * 
 * @param fechaRadicacion - Fecha de radicación (ISO YYYY-MM-DD).
 * @param ruta - Ruta del trámite.
 * @returns {PlazosQueja} - Fechas límite para cada etapa.
 */
export function calcularPlazosQueja(
    fechaRadicacion: string,
    ruta: RutaQueja
): PlazosQueja {
    const esASL = ruta === 'AcosoSexual';

    // Acuse de recibo
    const diasAcuse = esASL ? 2 : PLAZOS_QUEJA.ACUSE_RECIBO_LABORAL;
    const fechaLimiteAcuse = sumarDias(fechaRadicacion, diasAcuse);

    // Examen inicial (siempre 5 días)
    const fechaLimiteExamen = sumarDias(fechaLimiteAcuse, PLAZOS_QUEJA.EXAMEN_INICIAL);

    // Medidas de protección (solo ASL — 5 días hábiles)
    const fechaLimiteMedidas = esASL
        ? sumarDias(fechaLimiteExamen, PLAZOS_QUEJA.MEDIDAS_PROTECCION_ASL)
        : null;

    // Entrevistas (5 días)
    const baseEntrevistas = esASL ? fechaLimiteExamen : fechaLimiteExamen;
    const fechaLimiteEntrevistas = sumarDias(baseEntrevistas, PLAZOS_QUEJA.ENTREVISTAS);

    // Mesa de diálogo (solo aplica a Laboral / Convivencia)
    const fechaLimiteMesaDialogo = esASL
        ? fechaLimiteEntrevistas // ASL no tiene mesa
        : sumarDias(fechaLimiteEntrevistas, PLAZOS_QUEJA.MESA_DIALOGO_MAX);

    // Cierre total
    const fechaLimiteCierreTotal = esASL
        ? sumarDias(fechaLimiteMedidas || fechaLimiteEntrevistas, 10)
        : fechaLimiteMesaDialogo;

    return {
        fechaLimiteAcuse,
        fechaLimiteExamen,
        fechaLimiteMedidas,
        fechaLimiteEntrevistas,
        fechaLimiteMesaDialogo,
        fechaLimiteCierreTotal
    };
}

/**
 * Valida si una etapa del trámite está vencida.
 * 
 * @param fechaLimite - Fecha límite (ISO YYYY-MM-DD).
 * @param fechaRealizada - Fecha en que se realizó (ISO) o null si no se ha hecho.
 * @returns {boolean} - true si está vencida y sin realizar.
 */
export function esEtapaVencida(
    fechaLimite: string,
    fechaRealizada: string | null
): boolean {
    if (fechaRealizada) return false;
    if (!fechaLimite) return false;
    return calcularDiasParaVencimiento(fechaLimite) < 0;
}

/**
 * Obtiene el estado visual de una etapa del trámite.
 * 
 * @param fechaLimite - Fecha límite (ISO).
 * @param fechaRealizada - Fecha en que se realizó (ISO) o null.
 * @returns {object} - { icono, color, texto }.
 */
export function obtenerEstadoEtapa(
    fechaLimite: string,
    fechaRealizada: string | null
): { icono: string; color: string; texto: string } {
    if (fechaRealizada) {
        return { icono: '✅', color: '#10B981', texto: 'Completado' };
    }
    if (!fechaLimite) {
        return { icono: '⬜', color: '#94A3B8', texto: 'Pendiente' };
    }

    const dias = calcularDiasParaVencimiento(fechaLimite);

    if (dias < 0) {
        return { icono: '🔴', color: '#DC2626', texto: `Vencido hace ${Math.abs(dias)}d` };
    }
    if (dias <= 2) {
        return { icono: '🟠', color: '#F59E0B', texto: `Vence en ${dias}d` };
    }
    return { icono: '⏳', color: '#FCD34D', texto: `Vence en ${dias}d` };
}

// ================================================================
// INDICADORES DE GESTIÓN
// ================================================================

/**
 * Calcula los 3 indicadores de gestión del comité.
 * 
 * Fórmulas:
 *   - Cobertura Reuniones:    (realizadas / 12) × 100
 *   - Eficacia Cierre Casos:  (cerradas / recibidas) × 100
 *   - Cumplimiento Prevención: (ejecutadas / planificadas) × 100
 * 
 * @param reunionesRealizadas - Reuniones efectivamente realizadas.
 * @param quejasCerradas - Quejas cerradas en el periodo.
 * @param quejasRecibidas - Quejas recibidas en el periodo.
 * @param capacitacionesEjecutadas - Actividades preventivas ejecutadas.
 * @param capacitacionesPlanificadas - Actividades preventivas planificadas.
 * @returns {IndicadoresCCL} - Los 3 indicadores en porcentaje.
 */
export function calcularIndicadoresCCL(
    reunionesRealizadas: number,
    quejasCerradas: number,
    quejasRecibidas: number,
    capacitacionesEjecutadas: number,
    capacitacionesPlanificadas: number
): IndicadoresCCL {
    const coberturaReuniones = Math.round((reunionesRealizadas / 12) * 100);

    const eficaciaCierre = quejasRecibidas > 0
        ? Math.round((quejasCerradas / quejasRecibidas) * 100)
        : 0;

    const cumplimientoPrevencion = capacitacionesPlanificadas > 0
        ? Math.round((capacitacionesEjecutadas / capacitacionesPlanificadas) * 100)
        : 0;

    return {
        coberturaReuniones: Math.min(100, coberturaReuniones),
        eficaciaCierre: Math.min(100, eficaciaCierre),
        cumplimientoPrevencion: Math.min(100, cumplimientoPrevencion)
    };
}

// ================================================================
// PROGRESO DE PASOS
// ================================================================

/**
 * Cuenta cuántos pasos están completados de un total.
 * 
 * @param pasos - Array de estados de pasos.
 * @returns {object} - Conteo y porcentaje.
 */
export function calcularProgresoPasos(pasos: EstadoPaso[]): {
    completados: number;
    enProgreso: number;
    pendientes: number;
    total: number;
    porcentaje: number;
} {
    const total = pasos.length;
    const completados = pasos.filter(p => p === 'Completado').length;
    const enProgreso = pasos.filter(p => p === 'EnProgreso').length;
    const pendientes = pasos.filter(p => p === 'Pendiente').length;
    const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

    return { completados, enProgreso, pendientes, total, porcentaje };
}

/**
 * Obtiene icono y color de un estado de paso.
 * 
 * @param paso - Estado del paso.
 * @returns {object} - { icono, color, texto }.
 */
export function obtenerVisualizacionPaso(paso: EstadoPaso): {
    icono: string;
    color: string;
    texto: string;
} {
    switch (paso) {
        case 'Completado':
            return { icono: '✅', color: '#10B981', texto: 'Completado' };
        case 'EnProgreso':
            return { icono: '⏳', color: '#F59E0B', texto: 'En progreso' };
        case 'Pendiente':
            return { icono: '⬜', color: '#94A3B8', texto: 'Pendiente' };
    }
}

// ================================================================
// ESTADOS DE QUEJA
// ================================================================

/**
 * Obtiene el color y etiqueta de un estado de queja.
 * 
 * @param estado - Estado de la queja.
 * @returns {object} - { color, texto, clase }.
 */
export function obtenerVisualizacionEstadoQueja(estado: EstadoQueja): {
    color: string;
    texto: string;
    clase: string;
} {
    switch (estado) {
        case 'Radicada':
            return { color: '#3B82F6', texto: 'Radicada', clase: 'estado-radicada' };
        case 'EnInvestigacion':
            return { color: '#F59E0B', texto: 'En Investigación', clase: 'estado-investigacion' };
        case 'Citacion':
            return { color: '#8B5CF6', texto: 'Citación', clase: 'estado-citacion' };
        case 'EnConciliacion':
            return { color: '#EC4899', texto: 'En Conciliación', clase: 'estado-conciliacion' };
        case 'Cerrada':
            return { color: '#10B981', texto: 'Cerrada', clase: 'estado-cerrada' };
        case 'Trasladada':
            return { color: '#DC2626', texto: 'Trasladada', clase: 'estado-trasladada' };
    }
}

/**
 * Verifica si una queja permite conciliación / mesa de diálogo.
 * NO se permite en casos de Acoso Sexual Laboral (Ley 2365 de 2024).
 * 
 * @param ruta - Ruta de la queja.
 * @returns {boolean} - true si permite mesa de diálogo.
 */
export function permiteConciliacion(ruta: RutaQueja): boolean {
    return ruta !== 'AcosoSexual';
}

// ================================================================
// GENERACIÓN DE IDs
// ================================================================

/**
 * Genera un ID único para un comité.
 * Formato: "CCL-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único del comité.
 */
export function generarIdComite(): string {
    return `CCL-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para una queja.
 * Formato: "QUE-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único de la queja.
 */
export function generarIdQueja(): string {
    return `QUE-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un caso.
 * Formato: "CAS-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único del caso.
 */
export function generarIdCaso(): string {
    return `CAS-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un acta.
 * Formato: "ACT-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único del acta.
 */
export function generarIdActaConvivencia(): string {
    return `ACT-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para una entrevista.
 * Formato: "ENT-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único de la entrevista.
 */
export function generarIdEntrevista(): string {
    return `ENT-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un plan de mejora.
 * Formato: "PLA-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único del plan.
 */
export function generarIdPlanMejora(): string {
    return `PLA-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un compromiso de confidencialidad.
 * Formato: "CON-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único del compromiso.
 */
export function generarIdConfidencialidad(): string {
    return `CON-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un informe.
 * Formato: "INF-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único del informe.
 */
export function generarIdInforme(): string {
    return `INF-${generarIdUnico().substring(0, 12)}`;
}

// ================================================================
// FORMATEO DE RADICADOS Y PERIODOS
// ================================================================

/**
 * Formatea el número de radicado de una queja.
 * Formato: "CCL-Q-XXX-YYYY"
 * 
 * @param numero - Número consecutivo (1, 2, 3...).
 * @param año - Año del radicado (ej. 2026).
 * @returns {string} - Número formateado.
 * 
 * @example
 * formatearRadicado(5, 2026) // "CCL-Q-005-2026"
 */
export function formatearRadicado(numero: number, año: number): string {
    const numeroStr = String(numero).padStart(3, '0');
    return `CCL-Q-${numeroStr}-${año}`;
}

/**
 * Formatea el número de acta del CCL.
 * Formato: "XXX-YYYY"
 * 
 * @param numero - Número consecutivo.
 * @param año - Año.
 * @returns {string} - Número formateado.
 */
export function formatearNumeroActa(numero: number, año: number): string {
    const numeroStr = String(numero).padStart(3, '0');
    return `${numeroStr}-${año}`;
}

/**
 * Formatea un período de vigencia para mostrar en UI.
 * 
 * @param fechaInicio - Fecha de inicio en ISO.
 * @param fechaFin - Fecha de fin en ISO.
 * @returns {string} - Texto formateado (ej. "2026 - 2028").
 */
export function formatearPeriodo(fechaInicio: string, fechaFin: string): string {
    if (!fechaInicio || !fechaFin) return '';
    const añoInicio = fechaInicio.substring(0, 4);
    const añoFin = fechaFin.substring(0, 4);
    return `${añoInicio} - ${añoFin}`;
}

/**
 * Cuenta los años completos transcurridos desde una fecha.
 * 
 * @param fechaInicio - Fecha de inicio en ISO.
 * @returns {number} - Años completos.
 */
export function contarAñosTranscurridos(fechaInicio: string): number {
    if (!fechaInicio) return 0;
    const inicio = new Date(fechaInicio + 'T00:00:00');
    if (isNaN(inicio.getTime())) return 0;
    const hoy = new Date();
    let años = hoy.getFullYear() - inicio.getFullYear();
    const mes = hoy.getMonth() - inicio.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < inicio.getDate())) {
        años--;
    }
    return Math.max(0, años);
}

// ================================================================
// VALIDACIONES
// ================================================================

/**
 * Valida que un representante tenga los datos mínimos.
 * 
 * @param r - Representante a validar.
 * @returns {boolean} - true si tiene nombre, cédula y cargo.
 */
export function validarRepresentante(r: IRepresentante): boolean {
    return Boolean(
        r.nombre && r.nombre.trim() &&
        r.cedula && r.cedula.trim() &&
        r.cargo && r.cargo.trim()
    );
}

/**
 * Valida si una composición es correcta según los datos.
 * 
 * @param representantes - Array con todos los representantes.
 * @param composicion - Composición esperada.
 * @returns {object} - { valido, errores }.
 */
export function validarComposicionCCL(
    representantes: IRepresentante[],
    composicion: ComposicionCCL
): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    const pEmp = representantes.filter(r => r.parte === 'Empleador' && r.rol === 'Principal').length;
    const sEmp = representantes.filter(r => r.parte === 'Empleador' && r.rol === 'Suplente').length;
    const pTra = representantes.filter(r => r.parte === 'Trabajador' && r.rol === 'Principal').length;
    const sTra = representantes.filter(r => r.parte === 'Trabajador' && r.rol === 'Suplente').length;

    if (pEmp !== composicion.principalesEmpleador) {
        errores.push(`Principales empleador: esperados ${composicion.principalesEmpleador}, hay ${pEmp}`);
    }
    if (sEmp !== composicion.suplentesEmpleador) {
        errores.push(`Suplentes empleador: esperados ${composicion.suplentesEmpleador}, hay ${sEmp}`);
    }
    if (pTra !== composicion.principalesTrabajadores) {
        errores.push(`Principales trabajadores: esperados ${composicion.principalesTrabajadores}, hay ${pTra}`);
    }
    if (sTra !== composicion.suplentesTrabajadores) {
        errores.push(`Suplentes trabajadores: esperados ${composicion.suplentesTrabajadores}, hay ${sTra}`);
    }

    return { valido: errores.length === 0, errores };
}