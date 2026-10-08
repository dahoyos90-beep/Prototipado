/**
 * src/comite-utils.ts
 * 
 * Utilidades específicas para el módulo M18 - Gestión de Comités (COPASST / Vigía).
 * 
 * Propósito:
 * - Centralizar la lógica de negocio de los comités:
 *     * Determinación del tipo de órgano (COPASST vs Vigía) según el
 *       número de trabajadores.
 *     * Cálculo de la composición (principales y suplentes por parte)
 *       según los rangos legales de la Resolución 2013 de 1986.
 *     * Cálculo de vigencias (2 años por período).
 *     * Alertas de vencimiento (verde / amarillo / naranja / rojo).
 *     * Generación de IDs para comités, actas, compromisos y capacitaciones.
 *     * Helpers de formateo y validación.
 * - Evitar duplicación de lógica entre comites-listado.ts y comite-detalle.ts.
 * 
 * Referencias legales:
 * - Resolución 2013 de 1986 (arts. 5, 6, 7, 11)
 * - Decreto Ley 1295 de 1994 (art. 63)
 * - Ley 1562 de 2012
 * - Decreto 1072 de 2015
 * - Resolución 0312 de 2019
 * 
 * @version 1.0.0
 * @since 2026-09-30
 */

import { generarIdUnico, fechaActualISO } from './utils.js';
import type {
    TipoComite,
    EstadoPaso,
    IRepresentante,
    RolRepresentante,
    ParteRepresentante
} from './interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** Duración legal de la vigencia de un comité o vigía (en años). */
export const DURACION_VIGENCIA_AÑOS = 2;

/** Duración legal de la vigencia en meses (2 años = 24 meses). */
export const DURACION_VIGENCIA_MESES = DURACION_VIGENCIA_AÑOS * 12;

/** Mínimo de trabajadores para conformar COPASST. */
export const MINIMO_TRABAJADORES_COPASST = 10;

/** Umbrales de alerta de vencimiento (en días). */
export const UMBRALES_ALERTA = {
    VERDE: 90,
    AMARILLO: 60,
    NARANJA: 30,
    ROJO: 0
} as const;

// ================================================================
// TIPOS AUXILIARES
// ================================================================

/**
 * Nivel de alerta de vencimiento.
 * - 'verde':    Sin alerta (más de 90 días).
 * - 'amarillo': Planificar renovación (60-90 días).
 * - 'naranja':  Iniciar renovación (30-60 días).
 * - 'rojo':     Urgente o vencido (< 30 días).
 */
export type NivelAlerta = 'verde' | 'amarillo' | 'naranja' | 'rojo';

/**
 * Composición del comité (cantidad de representantes por parte).
 */
export interface ComposicionComite {
    principales: number;
    suplentes: number;
    totalPorParte: number;
    totalComite: number;
}

/**
 * Detalle de la alerta de vencimiento.
 */
export interface AlertaVencimiento {
    nivel: NivelAlerta;
    diasRestantes: number;
    mensaje: string;
    color: string;
    icono: string;
}

/**
 * Edad del comité (tiempo transcurrido desde la conformación).
 */
export interface EdadComite {
    años: number;
    meses: number;
    dias: number;
    totalDias: number;
}

// ================================================================
// DETERMINACIÓN DEL TIPO DE COMITÉ
// ================================================================

/**
 * Determina el tipo de órgano de participación según el número de trabajadores.
 * 
 * Regla legal (Decreto Ley 1295 de 1994, art. 63):
 * - 1 a 9 trabajadores: Vigía de SST.
 * - 10 o más trabajadores: COPASST.
 * 
 * @param numTrabajadores - Cantidad total de trabajadores de la empresa.
 * @returns {TipoComite} - "Vigia" o "COPASST".
 * 
 * @example
 * determinarTipoComite(5)   // "Vigia"
 * determinarTipoComite(10)  // "COPASST"
 * determinarTipoComite(50)  // "COPASST"
 */
export function determinarTipoComite(numTrabajadores: number): TipoComite {
    return numTrabajadores >= MINIMO_TRABAJADORES_COPASST ? 'COPASST' : 'Vigia';
}

/**
 * Calcula la composición del comité según el número de trabajadores.
 * 
 * Regla legal (Resolución 2013 de 1986, art. 6):
 * - 10 a 49:   1 principal + 1 suplente por parte.
 * - 50 a 499:  2 principales + 2 suplentes por parte.
 * - 500 a 999: 3 principales + 3 suplentes por parte.
 * - 1000+:     4 principales + 4 suplentes por parte.
 * 
 * Para Vigía (1-9 trabajadores): siempre 1 principal + 1 suplente.
 * 
 * @param numTrabajadores - Cantidad total de trabajadores.
 * @returns {ComposicionComite} - Composición resultante.
 * 
 * @example
 * calcularComposicion(5)    // { principales: 1, suplentes: 1, totalPorParte: 2, totalComite: 4 }
 * calcularComposicion(25)   // { principales: 1, suplentes: 1, totalPorParte: 2, totalComite: 4 }
 * calcularComposicion(100)  // { principales: 2, suplentes: 2, totalPorParte: 4, totalComite: 8 }
 * calcularComposicion(600)  // { principales: 3, suplentes: 3, totalPorParte: 6, totalComite: 12 }
 * calcularComposicion(1500) // { principales: 4, suplentes: 4, totalPorParte: 8, totalComite: 16 }
 */
export function calcularComposicion(numTrabajadores: number): ComposicionComite {
    let principales: number;

    if (numTrabajadores < MINIMO_TRABAJADORES_COPASST) {
        principales = 1;
    } else if (numTrabajadores <= 49) {
        principales = 1;
    } else if (numTrabajadores <= 499) {
        principales = 2;
    } else if (numTrabajadores <= 999) {
        principales = 3;
    } else {
        principales = 4;
    }

    const suplentes = principales;
    const totalPorParte = principales + suplentes;

    return {
        principales,
        suplentes,
        totalPorParte,
        totalComite: totalPorParte * 2
    };
}

/**
 * Genera una plantilla vacía de representantes (para formularios).
 * 
 * @param composicion - Composición calculada del comité.
 * @param parte - Parte a la que pertenecen ("Empleador" o "Trabajador").
 * @returns {IRepresentante[]} - Array con representantes vacíos.
 * 
 * @example
 * const comp = calcularComposicion(50);
 * const reps = crearPlantillaRepresentantes(comp, 'Empleador');
 * // reps.length === 4 (2 principales + 2 suplentes)
 */
export function crearPlantillaRepresentantes(
    composicion: ComposicionComite,
    parte: ParteRepresentante
): IRepresentante[] {
    const resultado: IRepresentante[] = [];

    for (let i = 0; i < composicion.principales; i++) {
        resultado.push(crearRepresentanteVacio(parte, 'Principal'));
    }
    for (let i = 0; i < composicion.suplentes; i++) {
        resultado.push(crearRepresentanteVacio(parte, 'Suplente'));
    }

    return resultado;
}

/**
 * Crea un representante vacío (para formularios nuevos).
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

// ================================================================
// VIGENCIA Y FECHAS
// ================================================================

/**
 * Calcula la fecha de fin de vigencia a partir de la fecha de inicio.
 * Suma 2 años (24 meses) por defecto.
 * 
 * @param fechaInicio - Fecha de inicio en formato ISO (YYYY-MM-DD).
 * @param años - Duración en años (por defecto 2).
 * @returns {string} - Fecha de fin en formato ISO (YYYY-MM-DD).
 * 
 * @example
 * calcularFechaFinVigencia('2026-09-15')  // "2028-09-15"
 * calcularFechaFinVigencia('2026-09-15', 1) // "2027-09-15"
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
 * Calcula la fecha de inicio de vigencia restando años a una fecha fin.
 * 
 * @param fechaFin - Fecha de fin en formato ISO (YYYY-MM-DD).
 * @param años - Duración en años (por defecto 2).
 * @returns {string} - Fecha de inicio en formato ISO (YYYY-MM-DD).
 */
export function calcularFechaInicioVigencia(
    fechaFin: string,
    años: number = DURACION_VIGENCIA_AÑOS
): string {
    if (!fechaFin) return '';

    const fecha = new Date(fechaFin + 'T00:00:00');
    if (isNaN(fecha.getTime())) return '';

    fecha.setFullYear(fecha.getFullYear() - años);
    return formatearFechaISO(fecha);
}

/**
 * Calcula los días restantes hasta la fecha de vencimiento.
 * Si ya venció, devuelve un número negativo.
 * 
 * @param fechaFin - Fecha de fin en formato ISO (YYYY-MM-DD).
 * @returns {number} - Días restantes (negativo si ya venció).
 * 
 * @example
 * calcularDiasParaVencimiento('2028-09-15')  // ej. 720
 * calcularDiasParaVencimiento('2024-01-01')  // ej. -300 (vencido)
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

/**
 * Calcula la edad del comité (tiempo transcurrido desde el inicio).
 * 
 * @param fechaInicio - Fecha de inicio en formato ISO (YYYY-MM-DD).
 * @returns {EdadComite} - Edad del comité desglosada.
 * 
 * @example
 * const edad = calcularEdadComite('2026-09-15');
 * // { años: 0, meses: 0, dias: 15, totalDias: 15 }
 */
export function calcularEdadComite(fechaInicio: string): EdadComite {
    if (!fechaInicio) {
        return { años: 0, meses: 0, dias: 0, totalDias: 0 };
    }

    const inicio = new Date(fechaInicio + 'T00:00:00');
    if (isNaN(inicio.getTime())) {
        return { años: 0, meses: 0, dias: 0, totalDias: 0 };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const totalDias = Math.floor(
        (hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
    );

    let años = hoy.getFullYear() - inicio.getFullYear();
    let meses = hoy.getMonth() - inicio.getMonth();
    let dias = hoy.getDate() - inicio.getDate();

    if (dias < 0) {
        meses--;
        const diasMesAnterior = new Date(
            hoy.getFullYear(),
            hoy.getMonth(),
            0
        ).getDate();
        dias += diasMesAnterior;
    }

    if (meses < 0) {
        años--;
        meses += 12;
    }

    return { años, meses, dias, totalDias };
}

// ================================================================
// ALERTAS DE VENCIMIENTO
// ================================================================

/**
 * Obtiene el nivel de alerta según los días restantes.
 * 
 * @param dias - Días restantes hasta el vencimiento.
 * @returns {NivelAlerta} - Nivel de alerta.
 * 
 * @example
 * obtenerNivelAlerta(120)  // "verde"
 * obtenerNivelAlerta(75)   // "amarillo"
 * obtenerNivelAlerta(45)   // "naranja"
 * obtenerNivelAlerta(15)   // "rojo"
 * obtenerNivelAlerta(-30)  // "rojo" (vencido)
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
 * Genera el detalle completo de la alerta de vencimiento.
 * 
 * @param fechaFin - Fecha de fin de vigencia en formato ISO.
 * @returns {AlertaVencimiento} - Detalle de la alerta con mensaje.
 * 
 * @example
 * const alerta = calcularAlertaVencimiento('2028-09-15');
 * // { nivel: 'verde', diasRestantes: 720, mensaje: '...', ... }
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

    return {
        nivel,
        diasRestantes: dias,
        mensaje,
        color,
        icono
    };
}

// ================================================================
// GENERACIÓN DE IDs
// ================================================================

/**
 * Genera un ID único para un comité.
 * Formato: "COM-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único del comité.
 */
export function generarIdComite(): string {
    return `COM-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un acta de reunión.
 * Formato: "ACT-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único del acta.
 */
export function generarIdActa(): string {
    return `ACT-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para un compromiso.
 * Formato: "CMP-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único del compromiso.
 */
export function generarIdCompromiso(): string {
    return `CMP-${generarIdUnico().substring(0, 12)}`;
}

/**
 * Genera un ID único para una capacitación.
 * Formato: "CAP-XXXXXXXXXXXX"
 * 
 * @returns {string} - ID único de la capacitación.
 */
export function generarIdCapacitacion(): string {
    return `CAP-${generarIdUnico().substring(0, 12)}`;
}

// ================================================================
// HELPERS DE FORMATEO
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
    return calcularEdadComite(fechaInicio).años;
}

// ================================================================
// ESTADOS DE PASOS
// ================================================================

/**
 * Cuenta cuántos pasos están completados de un total.
 * 
 * @param pasos - Array de estados de pasos.
 * @returns {object} - Objeto con conteo y porcentaje.
 * 
 * @example
 * const pasos: EstadoPaso[] = ['Completado', 'Completado', 'EnProgreso', 'Pendiente'];
 * const resultado = calcularProgresoPasos(pasos);
 * // { completados: 2, enProgreso: 1, pendientes: 1, total: 4, porcentaje: 50 }
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
 * Obtiene el icono y color de un estado de paso.
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
// VALIDACIONES
// ================================================================

/**
 * Valida si una composición de comité es correcta según los datos.
 * 
 * @param representantes - Array de representantes.
 * @param composicion - Composición esperada.
 * @returns {object} - { valido, errores }.
 */
export function validarComposicionComite(
    representantes: IRepresentante[],
    composicion: ComposicionComite
): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    const principalesEmpleador = representantes.filter(
        r => r.parte === 'Empleador' && r.rol === 'Principal'
    ).length;

    const suplentesEmpleador = representantes.filter(
        r => r.parte === 'Empleador' && r.rol === 'Suplente'
    ).length;

    const principalesTrabajador = representantes.filter(
        r => r.parte === 'Trabajador' && r.rol === 'Principal'
    ).length;

    const suplentesTrabajador = representantes.filter(
        r => r.parte === 'Trabajador' && r.rol === 'Suplente'
    ).length;

    if (principalesEmpleador !== composicion.principales) {
        errores.push(
            `Representantes principales del empleador: se esperaban ${composicion.principales}, hay ${principalesEmpleador}`
        );
    }
    if (suplentesEmpleador !== composicion.suplentes) {
        errores.push(
            `Representantes suplentes del empleador: se esperaban ${composicion.suplentes}, hay ${suplentesEmpleador}`
        );
    }
    if (principalesTrabajador !== composicion.principales) {
        errores.push(
            `Representantes principales de trabajadores: se esperaban ${composicion.principales}, hay ${principalesTrabajador}`
        );
    }
    if (suplentesTrabajador !== composicion.suplentes) {
        errores.push(
            `Representantes suplentes de trabajadores: se esperaban ${composicion.suplentes}, hay ${suplentesTrabajador}`
        );
    }

    return { valido: errores.length === 0, errores };
}

/**
 * Valida que un representante tenga los datos mínimos requeridos.
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

// ================================================================
// HELPERS DE CÁLCULO
// ================================================================

/**
 * Calcula la fecha del próximo vencimiento después de la actual.
 * Útil cuando un comité ya venció y hay que renovarlo.
 * 
 * @param fechaFinActual - Fecha de fin actual en ISO.
 * @returns {string} - Fecha de fin del siguiente período en ISO.
 */
export function calcularProximoVencimiento(fechaFinActual: string): string {
    if (!fechaFinActual) return '';

    const hoy = fechaActualISO();
    const base = fechaFinActual > hoy ? fechaFinActual : hoy;
    return calcularFechaFinVigencia(base);
}

/**
 * Calcula cuántos días han pasado desde una fecha hasta hoy.
 * 
 * @param fecha - Fecha en ISO (YYYY-MM-DD).
 * @returns {number} - Días transcurridos.
 */
export function diasTranscurridos(fecha: string): number {
    if (!fecha) return 0;

    const objetivo = new Date(fecha + 'T00:00:00');
    if (isNaN(objetivo.getTime())) return 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return Math.floor(
        (hoy.getTime() - objetivo.getTime()) / (1000 * 60 * 60 * 24)
    );
}