/**
 * src/utils.ts
 * 
 * Módulo de utilidades generales para el prototipo SG-SST Manager.
 * Contiene funciones auxiliares para formateo, generación de IDs,
 * manipulación de fechas, números, strings y operaciones comunes del DOM.
 * 
 * Propósito:
 * - Centralizar funciones reutilizables que no pertenecen a una capa específica.
 * - Mantener el código limpio y evitar la duplicación de lógica.
 * - Facilitar pruebas unitarias y mantenimiento.
 * 
 * @version 1.1.0 (agregadas funciones de NIT, días restantes, nombre propio, nombre archivo; corregido any en debounce)
 * @since 2026-08-31
 */

// ============================================
// UTILIDADES DE FECHAS
// ============================================

/**
 * Formatea una fecha en formato ISO (YYYY-MM-DD) a una cadena legible
 * en español (DD/MM/YYYY) o con nombre de mes.
 * 
 * @param fecha - Fecha en formato string ISO (YYYY-MM-DD) o Date.
 * @param formato - Formato de salida: 'corta' (DD/MM/YYYY) o 'larga' (DD de Mes de YYYY).
 * @returns {string} - Fecha formateada.
 * 
 * @example
 * formatearFecha('2026-08-31', 'corta') // "31/08/2026"
 * formatearFecha('2026-08-31', 'larga') // "31 de agosto de 2026"
 */
export function formatearFecha(fecha: string | Date, formato: 'corta' | 'larga' = 'corta'): string {
    if (!fecha) return '';

    let fechaObj: Date;
    if (typeof fecha === 'string') {
        fechaObj = new Date(fecha);
    } else {
        fechaObj = fecha;
    }

    if (isNaN(fechaObj.getTime())) {
        console.warn('formatearFecha: Fecha inválida', fecha);
        return '';
    }

    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const anio = fechaObj.getFullYear();

    if (formato === 'corta') {
        return `${dia}/${mes}/${anio}`;
    } else {
        const nombresMeses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        return `${dia} de ${nombresMeses[fechaObj.getMonth()]} de ${anio}`;
    }
}

/**
 * Obtiene la fecha actual en formato ISO (YYYY-MM-DD).
 * 
 * @returns {string} - Fecha actual en formato YYYY-MM-DD.
 */
export function fechaActualISO(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

/**
 * Obtiene la fecha y hora actual en formato ISO completo (YYYY-MM-DDTHH:MM:SS).
 * 
 * @returns {string} - Fecha y hora actual en formato ISO.
 */
export function fechaHoraActualISO(): string {
    return new Date().toISOString();
}

/**
 * Convierte una fecha en formato ISO a un objeto Date.
 * 
 * @param fecha - Fecha en formato string ISO (YYYY-MM-DD).
 * @returns {Date | null} - Objeto Date o null si la fecha es inválida.
 */
export function stringToDate(fecha: string): Date | null {
    if (!fecha) return null;
    const fechaObj = new Date(fecha);
    return isNaN(fechaObj.getTime()) ? null : fechaObj;
}

/**
 * Calcula los días hábiles restantes entre la fecha actual y una fecha límite.
 * Se excluyen sábados y domingos. Si la fecha límite ya pasó, devuelve 0.
 * 
 * @param fechaLimite - Fecha límite en formato ISO (YYYY-MM-DD).
 * @returns {number} - Días hábiles restantes (mínimo 0).
 * 
 * @example
 * calcularDiasRestantes('2026-10-10') // días hábiles entre hoy y esa fecha
 */
export function calcularDiasRestantes(fechaLimite: string): number {
    if (!fechaLimite) return 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const limite = new Date(fechaLimite);
    if (isNaN(limite.getTime())) return 0;
    limite.setHours(0, 0, 0, 0);

    if (limite.getTime() <= hoy.getTime()) return 0;

    let diasHabiles = 0;
    const cursor = new Date(hoy);
    cursor.setDate(cursor.getDate() + 1); // Empezar desde mañana

    while (cursor.getTime() <= limite.getTime()) {
        const diaSemana = cursor.getDay(); // 0 = domingo, 6 = sábado
        if (diaSemana !== 0 && diaSemana !== 6) {
            diasHabiles++;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return diasHabiles;
}

// ============================================
// UTILIDADES DE NÚMEROS
// ============================================

/**
 * Formatea un número con separadores de miles y decimales.
 * 
 * @param numero - Número a formatear.
 * @param decimales - Cantidad de decimales (por defecto 0).
 * @returns {string} - Número formateado con separadores de miles.
 * 
 * @example
 * formatearNumero(1234567.89, 2) // "1,234,567.89"
 * formatearNumero(1234, 0) // "1,234"
 */
export function formatearNumero(numero: number, decimales: number = 0): string {
    if (typeof numero !== 'number' || isNaN(numero)) return '0';
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }).format(numero);
}

/**
 * Formatea un porcentaje (multiplica por 100 y agrega símbolo %).
 * 
 * @param valor - Valor en decimal (ej. 0.85 para 85%).
 * @param decimales - Cantidad de decimales (por defecto 1).
 * @returns {string} - Porcentaje formateado (ej. "85.0%").
 * 
 * @example
 * formatearPorcentaje(0.855, 1) // "85.5%"
 * formatearPorcentaje(0.12345, 2) // "12.35%"
 */
export function formatearPorcentaje(valor: number, decimales: number = 1): string {
    if (typeof valor !== 'number' || isNaN(valor)) return '0%';
    const porcentaje = valor * 100;
    return `${formatearNumero(porcentaje, decimales)}%`;
}

/**
 * Redondea un número a un número específico de decimales.
 * 
 * @param valor - Número a redondear.
 * @param decimales - Cantidad de decimales (por defecto 2).
 * @returns {number} - Número redondeado.
 */
export function redondear(valor: number, decimales: number = 2): number {
    if (typeof valor !== 'number' || isNaN(valor)) return 0;
    const factor = Math.pow(10, decimales);
    return Math.round(valor * factor) / factor;
}

/**
 * Formatea un NIT agregando el guión antes del dígito de verificación.
 * Si el NIT ya tiene guión, lo respeta. Si no es válido, lo devuelve tal cual.
 * 
 * @param nit - NIT sin formato (ej. "9001234567") o con formato (ej. "900123456-7").
 * @returns {string} - NIT formateado (ej. "900123456-7").
 * 
 * @example
 * formatearNIT('9001234567') // "900123456-7"
 * formatearNIT('900123456-7') // "900123456-7"
 */
export function formatearNIT(nit: string): string {
    if (!nit || typeof nit !== 'string') return '';

    // Limpiar todo lo que no sea dígito
    const soloDigitos = nit.replace(/\D/g, '');

    // Si no tiene la longitud esperada (típicamente 10 dígitos en Colombia), devolver tal cual
    if (soloDigitos.length < 9 || soloDigitos.length > 10) {
        return soloDigitos;
    }

    // Insertar guión antes del último dígito
    const base = soloDigitos.slice(0, -1);
    const dv = soloDigitos.slice(-1);
    return `${base}-${dv}`;
}

// ============================================
// UTILIDADES DE STRINGS
// ============================================

/**
 * Capitaliza la primera letra de un string y convierte el resto a minúsculas.
 * 
 * @param texto - Texto a capitalizar.
 * @returns {string} - Texto con primera letra mayúscula.
 * 
 * @example
 * capitalizar('hola mundo') // "Hola mundo"
 * capitalizar('HOLA MUNDO') // "Hola mundo"
 */
export function capitalizar(texto: string): string {
    if (!texto || typeof texto !== 'string') return '';
    return texto.trim().charAt(0).toUpperCase() + texto.trim().slice(1).toLowerCase();
}

/**
 * Capitaliza la primera letra de cada palabra de un string.
 * 
 * @param texto - Texto a capitalizar por palabras.
 * @returns {string} - Texto con cada palabra capitalizada.
 * 
 * @example
 * capitalizarPalabras('hola mundo') // "Hola Mundo"
 * capitalizarPalabras('HOLA MUNDO') // "Hola Mundo"
 */
export function capitalizarPalabras(texto: string): string {
    if (!texto || typeof texto !== 'string') return '';
    return texto
        .trim()
        .split(' ')
        .filter(palabra => palabra.length > 0)
        .map(palabra => capitalizar(palabra))
        .join(' ');
}

/**
 * Capitaliza correctamente nombres propios, respetando partículas como
 * "de", "del", "la", "los", "y", etc. (que van en minúscula excepto al inicio).
 * 
 * @param texto - Nombre propio a capitalizar.
 * @returns {string} - Nombre propio correctamente capitalizado.
 * 
 * @example
 * capitalizarNombrePropio('juan de la cruz') // "Juan de la Cruz"
 * capitalizarNombrePropio('MARÍA DEL CARMEN') // "María del Carmen"
 */
export function capitalizarNombrePropio(texto: string): string {
    if (!texto || typeof texto !== 'string') return '';

    // Partículas que se mantienen en minúscula (excepto al inicio)
    const particulas = ['de', 'del', 'la', 'las', 'los', 'y', 'e', 'o', 'u', 'da', 'das', 'do', 'dos'];

    const palabras = texto.trim().toLowerCase().split(/\s+/).filter(p => p.length > 0);

    return palabras
        .map((palabra, index) => {
            // La primera palabra siempre se capitaliza
            if (index === 0) {
                return palabra.charAt(0).toUpperCase() + palabra.slice(1);
            }
            // Si es una partícula, se mantiene en minúscula
            if (particulas.includes(palabra)) {
                return palabra;
            }
            // Resto se capitaliza
            return palabra.charAt(0).toUpperCase() + palabra.slice(1);
        })
        .join(' ');
}

/**
 * Genera un ID único (UUID v4) usando crypto.randomUUID() si está disponible,
 * o un fallback basado en timestamp y Math.random().
 * 
 * @returns {string} - ID único en formato UUID o similar.
 */
export function generarIdUnico(): string {
    // Usar crypto.randomUUID() si está disponible (navegadores modernos y Node.js)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback: timestamp + número aleatorio + contador
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 9);
    const counterPart = Math.floor(Math.random() * 1000000).toString(36);
    return `${timestamp}-${randomPart}-${counterPart}`;
}

/**
 * Limpia un string eliminando espacios al inicio y final, y reduciendo
 * múltiples espacios a uno solo.
 * 
 * @param texto - Texto a limpiar.
 * @returns {string} - Texto limpio.
 */
export function limpiarEspacios(texto: string): string {
    if (!texto || typeof texto !== 'string') return '';
    return texto.trim().replace(/\s+/g, ' ');
}

/**
 * Limpia un NIT eliminando guiones, espacios y cualquier carácter no numérico.
 * Se usa para guardar y comparar NITs de forma uniforme.
 * 
 * @param nit - NIT con o sin formato.
 * @returns {string} - NIT solo con dígitos.
 * 
 * @example
 * limpiarNIT('900123456-7') // "9001234567"
 * limpiarNIT('900.123.456-7') // "9001234567"
 */
export function limpiarNIT(nit: string): string {
    if (!nit || typeof nit !== 'string') return '';
    return nit.replace(/\D/g, '');
}

/**
 * Verifica si un texto contiene únicamente dígitos (sin espacios, sin guiones).
 * 
 * @param texto - Texto a verificar.
 * @returns {boolean} - true si solo contiene dígitos y no está vacío.
 * 
 * @example
 * validarSoloNumeros('1234567') // true
 * validarSoloNumeros('900123456-7') // false
 * validarSoloNumeros('') // false
 */
export function validarSoloNumeros(texto: string): boolean {
    if (!texto || typeof texto !== 'string') return false;
    return /^\d+$/.test(texto.trim());
}

/**
 * Genera el nombre de un archivo de exportación en formato estándar.
 * Formato: MODULO_NIT_YYYY-MM-DD.xls
 * 
 * @param tituloModulo - Título del módulo (ej. "M11 – Gestión de Perfil y Afiliaciones").
 * @param nit - NIT de la empresa (con o sin formato).
 * @returns {string} - Nombre de archivo listo para descargar.
 * 
 * @example
 * generarNombreArchivoExportacion('M11 - Perfil', '900123456-7')
 * // "M11_PERFIL_9001234567_2026-09-10.xls"
 */
export function generarNombreArchivoExportacion(tituloModulo: string, nit: string): string {
    const moduloLimpio = (tituloModulo || 'MODULO')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toUpperCase()
        .substring(0, 30);

    const nitLimpio = limpiarNIT(nit) || 'SIN_NIT';

    const fecha = fechaActualISO();

    return `${moduloLimpio}_${nitLimpio}_${fecha}.xls`;
}

// ============================================
// UTILIDADES DE DOM
// ============================================

/**
 * Selector de elementos del DOM con tipado.
 * 
 * @param selector - Selector CSS (ej. '#mi-id', '.mi-clase').
 * @param contexto - Elemento padre opcional (por defecto document).
 * @returns {Element | null} - Elemento encontrado o null.
 */
export function qs(selector: string, contexto: Document | Element = document): Element | null {
    return contexto.querySelector(selector);
}

/**
 * Selector de múltiples elementos del DOM con tipado.
 * 
 * @param selector - Selector CSS (ej. '.mi-clase').
 * @param contexto - Elemento padre opcional (por defecto document).
 * @returns {NodeListOf<Element>} - Lista de elementos encontrados.
 */
export function qsa(selector: string, contexto: Document | Element = document): NodeListOf<Element> {
    return contexto.querySelectorAll(selector);
}

/**
 * Obtiene un elemento del DOM con tipado específico (ej. HTMLInputElement).
 * 
 * @param selector - Selector CSS.
 * @param contexto - Elemento padre opcional.
 * @returns {T | null} - Elemento tipado o null.
 * 
 * @example
 * const input = qsTipo<HTMLInputElement>('#email');
 * if (input) {
 *   console.log(input.value);
 * }
 */
export function qsTipo<T extends HTMLElement>(
    selector: string,
    contexto: Document | Element = document
): T | null {
    return contexto.querySelector(selector) as T | null;
}

/**
 * Escapa caracteres especiales HTML para prevenir XSS.
 * 
 * @param texto - Texto a escapar.
 * @returns {string} - Texto escapado.
 */
export function escaparHTML(texto: string): string {
    if (!texto) return '';
    const mapa: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return texto.replace(/[&<>"']/g, function (match: string) {
        return mapa[match];
    });
}

/**
 * Debounce para limitar la frecuencia de ejecución de una función.
 * Útil para eventos de input, resize, scroll.
 * 
 * @param fn - Función a ejecutar.
 * @param delay - Retraso en milisegundos.
 * @returns {(...args: unknown[]) => void} - Función con debounce.
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return function (...args: Parameters<T>) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delay);
    };
}

// ============================================
// UTILIDADES DE CONTROL DE FLUJO (OPCIONAL)
// ============================================

/**
 * Espera un número específico de milisegundos (útil para simular latencia).
 * 
 * @param ms - Milisegundos a esperar.
 * @returns {Promise<void>} - Promesa que se resuelve después del tiempo.
 */
export function esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verifica si un valor es un objeto plano (no array, no Date, no null).
 * 
 * @param valor - Valor a verificar.
 * @returns {boolean} - true si es un objeto plano.
 */
export function esObjetoPlano(valor: unknown): boolean {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor) && !(valor instanceof Date);
}

/**
 * Clona profundamente un objeto o array.
 * 
 * @param valor - Valor a clonar.
 * @returns {T} - Copia profunda del valor.
 */
export function clonarProfundo<T>(valor: T): T {
    if (valor === null || typeof valor !== 'object') {
        return valor;
    }
    if (Array.isArray(valor)) {
        return valor.map(item => clonarProfundo(item)) as T;
    }
    if (valor instanceof Date) {
        return new Date(valor) as T;
    }
    if (esObjetoPlano(valor)) {
        const copia: Record<string, unknown> = {};
        for (const clave in valor) {
            if (Object.prototype.hasOwnProperty.call(valor, clave)) {
                copia[clave] = clonarProfundo((valor as Record<string, unknown>)[clave]);
            }
        }
        return copia as T;
    }
    return valor;
}