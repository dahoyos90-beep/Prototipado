/**
 * src/validators.ts
 * 
 * Módulo de validaciones comunes para el prototipo SG-SST Manager.
 * Contiene funciones puras y reutilizables para validar datos de entrada
 * en formularios, APIs y procesos de negocio.
 * 
 * Propósito:
 * - Centralizar las reglas de validación en un solo lugar.
 * - Garantizar la consistencia en la verificación de datos en toda la aplicación.
 * - Facilitar la prueba unitaria de las validaciones.
 * 
 * @version 1.1.0 (corregido comentario de validarPasswordSegura)
 * @since 2026-08-31
 */

// ============================================
// VALIDACIONES BÁSICAS
// ============================================

/**
 * Valida que un valor no sea nulo, indefinido o vacío.
 * Para strings, también verifica que no sea solo espacios en blanco.
 * 
 * @param valor - El valor a validar (cualquier tipo).
 * @returns {boolean} - true si el valor es válido (no vacío), false en caso contrario.
 * 
 * @example
 * validarRequerido('texto') // true
 * validarRequerido('') // false
 * validarRequerido(null) // false
 * validarRequerido([]) // false (array vacío)
 */
export function validarRequerido(valor: unknown): boolean {
    if (valor === null || valor === undefined) return false;
    if (typeof valor === 'string') return valor.trim().length > 0;
    if (Array.isArray(valor)) return valor.length > 0;
    if (typeof valor === 'object') return Object.keys(valor).length > 0;
    return true;
}

/**
 * Valida que un string no esté vacío y no contenga solo espacios.
 * 
 * @param texto - El texto a validar.
 * @returns {boolean} - true si el texto tiene contenido, false en caso contrario.
 */
export function validarTextoNoVacio(texto: string): boolean {
    return typeof texto === 'string' && texto.trim().length > 0;
}

// ============================================
// VALIDACIONES DE FORMATO
// ============================================

/**
 * Valida un correo electrónico usando una expresión regular estándar.
 * Permite dominios con subdominios y caracteres especiales comunes.
 * 
 * @param email - El correo a validar.
 * @returns {boolean} - true si el formato es válido, false en caso contrario.
 * 
 * @example
 * validarEmail('usuario@dominio.com') // true
 * validarEmail('usuario@dominio') // false (falta TLD)
 * validarEmail('usuario@.com') // false
 */
export function validarEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    // Regex más permisiva pero robusta para correos electrónicos
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return regex.test(email.trim());
}

/**
 * Valida que una fecha esté en formato ISO (YYYY-MM-DD) y sea una fecha real.
 * 
 * @param fecha - La fecha en formato string (YYYY-MM-DD).
 * @returns {boolean} - true si la fecha es válida, false en caso contrario.
 * 
 * @example
 * validarFechaISO('2026-08-31') // true
 * validarFechaISO('2026-02-30') // false (día inválido)
 * validarFechaISO('31-08-2026') // false (formato incorrecto)
 */
export function validarFechaISO(fecha: string): boolean {
    if (!fecha || typeof fecha !== 'string') return false;
    // Verificar formato YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fecha)) return false;

    const partes = fecha.split('-').map(Number);
    const anio = partes[0];
    const mes = partes[1] - 1; // Mes en JS es 0-indexado
    const dia = partes[2];

    const fechaObj = new Date(anio, mes, dia);
    // Verificar que la fecha sea válida y coincida con los valores ingresados
    return (
        fechaObj.getFullYear() === anio &&
        fechaObj.getMonth() === mes &&
        fechaObj.getDate() === dia
    );
}

/**
 * Valida que una fecha sea mayor o igual a la fecha actual.
 * Útil para fechas de inicio o vigencia que no pueden ser pasadas.
 * 
 * @param fecha - La fecha en formato ISO (YYYY-MM-DD).
 * @returns {boolean} - true si la fecha es hoy o futura, false en caso contrario.
 */
export function validarFechaFutura(fecha: string): boolean {
    if (!validarFechaISO(fecha)) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    const fechaComparar = new Date(fecha);
    return fechaComparar >= hoy;
}

/**
 * Valida que una fecha sea menor o igual a la fecha actual.
 * Útil para fechas de eventos pasados (ej. fecha de inspección).
 * 
 * @param fecha - La fecha en formato ISO (YYYY-MM-DD).
 * @returns {boolean} - true si la fecha es hoy o pasada, false en caso contrario.
 */
export function validarFechaPasada(fecha: string): boolean {
    if (!validarFechaISO(fecha)) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaComparar = new Date(fecha);
    return fechaComparar <= hoy;
}

// ============================================
// VALIDACIONES DE LONGITUD Y RANGO
// ============================================

/**
 * Valida que un string tenga una longitud dentro de un rango específico.
 * 
 * @param texto - El texto a validar.
 * @param min - Longitud mínima permitida (incluida).
 * @param max - Longitud máxima permitida (incluida).
 * @returns {boolean} - true si la longitud está en el rango, false en caso contrario.
 * 
 * @example
 * validarLongitud('hola', 2, 10) // true
 * validarLongitud('hola', 5, 10) // false (muy corto)
 * validarLongitud('hola mundo', 1, 5) // false (muy largo)
 */
export function validarLongitud(texto: string, min: number, max: number): boolean {
    if (!texto || typeof texto !== 'string') return false;
    const longitud = texto.trim().length;
    return longitud >= min && longitud <= max;
}

/**
 * Valida que un número esté dentro de un rango específico.
 * 
 * @param valor - El número a validar.
 * @param min - Valor mínimo permitido (incluido).
 * @param max - Valor máximo permitido (incluido).
 * @returns {boolean} - true si el número está en el rango, false en caso contrario.
 * 
 * @example
 * validarRangoNumero(5, 1, 10) // true
 * validarRangoNumero(15, 1, 10) // false
 */
export function validarRangoNumero(valor: number, min: number, max: number): boolean {
    if (typeof valor !== 'number' || isNaN(valor)) return false;
    return valor >= min && valor <= max;
}

// ============================================
// VALIDACIONES DE COINCIDENCIA Y PERTENENCIA
// ============================================

/**
 * Valida que dos strings coincidan exactamente (útiles para contraseñas y confirmaciones).
 * 
 * @param valor1 - Primer valor a comparar.
 * @param valor2 - Segundo valor a comparar.
 * @returns {boolean} - true si son idénticos, false en caso contrario.
 */
export function validarCoincidencia(valor1: string, valor2: string): boolean {
    return valor1 === valor2;
}

/**
 * Valida que un valor esté incluido en un conjunto de opciones válidas.
 * Útil para selects y enumeraciones.
 * 
 * @param valor - El valor a validar (puede ser string o número).
 * @param opcionesValidas - Array de valores permitidos.
 * @returns {boolean} - true si el valor está en la lista, false en caso contrario.
 * 
 * @example
 * validarSelect('Activo', ['Activo', 'Inactivo']) // true
 * validarSelect('Pendiente', ['Activo', 'Inactivo']) // false
 */
export function validarSelect(valor: string | number, opcionesValidas: (string | number)[]): boolean {
    return opcionesValidas.includes(valor);
}

// ============================================
// VALIDACIONES ESPECÍFICAS DEL DOMINIO (SG-SST)
// ============================================

/**
 * Valida un número de documento de identidad colombiano (cédula).
 * Solo verifica que sea numérico y tenga entre 6 y 10 dígitos.
 * (No implementa validación por dígito verificador).
 * 
 * @param documento - El número de documento a validar.
 * @returns {boolean} - true si el formato es válido, false en caso contrario.
 */
export function validarDocumento(documento: string): boolean {
    if (!documento || typeof documento !== 'string') return false;
    const limpio = documento.trim();
    // Solo dígitos, entre 6 y 10 caracteres
    return /^\d{6,10}$/.test(limpio);
}

/**
 * Valida un NIT (Número de Identificación Tributaria) colombiano.
 * Solo verifica que sea numérico y tenga entre 8 y 12 dígitos.
 * (No implementa validación por dígito verificador).
 * 
 * @param nit - El NIT a validar.
 * @returns {boolean} - true si el formato es válido, false en caso contrario.
 */
export function validarNIT(nit: string): boolean {
    if (!nit || typeof nit !== 'string') return false;
    const limpio = nit.trim().replace(/-/g, ''); // Permitir guiones opcionales
    return /^\d{8,12}$/.test(limpio);
}

/**
 * Valida un número de teléfono colombiano (fijo o celular).
 * Permite formato con o sin indicativo de país, y con o sin guiones.
 * 
 * @param telefono - El número de teléfono a validar.
 * @returns {boolean} - true si el formato es válido, false en caso contrario.
 */
export function validarTelefono(telefono: string): boolean {
    if (!telefono || typeof telefono !== 'string') return false;
    const limpio = telefono.trim().replace(/[\s-+()]/g, ''); // Eliminar espacios, guiones, paréntesis y +
    // Para Colombia: 10 dígitos (celular) o 7 dígitos (fijo con indicativo) - simplificado
    return /^\d{7,12}$/.test(limpio);
}

// ============================================
// VALIDACIONES DE OBJETOS COMPUESTOS (OPCIONAL)
// ============================================

/**
 * Interfaz para definir reglas de validación de un campo.
 */
interface IReglaValidacion {
    campo: string;
    validar: (valor: unknown) => boolean;
    mensaje: string;
}

/**
 * Valida un objeto contra un conjunto de reglas y devuelve los errores encontrados.
 * Útil para validar formularios completos antes de guardar.
 * 
 * @param datos - Objeto con los datos a validar (clave-valor).
 * @param reglas - Array de reglas de validación (cada regla tiene campo, función validadora y mensaje).
 * @returns {Record<string, string>} - Objeto con los errores (clave = campo, valor = mensaje de error).
 * 
 * @example
 * const errores = validarObjeto(
 *   { nombre: '', email: 'invalido' },
 *   [
 *     { campo: 'nombre', validar: validarRequerido, mensaje: 'El nombre es obligatorio' },
 *     { campo: 'email', validar: validarEmail, mensaje: 'El email no es válido' }
 *   ]
 * );
 * // resultado: { nombre: 'El nombre es obligatorio', email: 'El email no es válido' }
 */
export function validarObjeto(
    datos: Record<string, unknown>,
    reglas: IReglaValidacion[]
): Record<string, string> {
    const errores: Record<string, string> = {};

    for (const regla of reglas) {
        const valor = datos[regla.campo];
        if (!regla.validar(valor)) {
            // Si el campo ya tiene un error, no sobrescribir (primer error encontrado)
            if (!errores[regla.campo]) {
                errores[regla.campo] = regla.mensaje;
            }
        }
    }

    return errores;
}

// ============================================
// VALIDACIONES DE SEGURIDAD (OPCIONAL)
// ============================================

/**
 * Valida una contraseña según criterios de seguridad básicos:
 * - Longitud mínima de 8 caracteres.
 * - Al menos una letra mayúscula.
 * - Al menos una letra minúscula.
 * - Al menos un número.
 * - Al menos un carácter especial (!@#$%^&*(),.?":{}|<>).
 * 
 * @param password - La contraseña a validar.
 * @returns {boolean} - true si cumple con los criterios, false en caso contrario.
 */
export function validarPasswordSegura(password: string): boolean {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8) return false;
    // Al menos una mayúscula, una minúscula, un número y un carácter especial
    const tieneMayuscula = /[A-Z]/.test(password);
    const tieneMinuscula = /[a-z]/.test(password);
    const tieneNumero = /\d/.test(password);
    const tieneEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return tieneMayuscula && tieneMinuscula && tieneNumero && tieneEspecial;
}

// ============================================
// EXPORTACIÓN DE FUNCIONES (ya están exportadas individualmente)
// ============================================

// Todas las funciones ya están exportadas con 'export function'.
// No es necesario un export adicional.