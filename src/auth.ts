/**
 * src/auth.ts
 * 
 * Módulo de autenticación para SG-SST Manager.
 * Maneja registro, inicio de sesión, cierre de sesión y gestión de sesión
 * utilizando localStorage como almacenamiento persistente.
 * 
 * @version 1.6.0 (soporte para rol "Empresa", uso de session-manager, sesión completa)
 * @since 2026-08-31
 */

import { storageUsuarios } from './storage.js';
import { generarIdUnico } from './utils.js';
import { validarEmail, validarPasswordSegura, validarRequerido } from './validators.js';
import {
    crearSesionDesdeUsuario,
    guardarSesionCompleta,
    obtenerSesionCompleta,
    eliminarSesion
} from './session-manager.js';
import type { IUsuario, RolUsuario, EstadoUsuario, ISession } from './interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

const SESSION_KEY = 'session';

const DEFAULT_USER: Omit<IUsuario, 'fechaCreacion' | 'fechaActualizacion'> = {
    id: 'admin-default',
    nombreCompleto: 'Administrador del Sistema',
    email: 'admin@sgsst.com',
    documento: '0000000000',
    telefono: '3000000000',
    licenciaSST: 'SST-ADMIN-001',
    rol: 'Profesional' as RolUsuario,
    password: 'Admin123!',
    estado: 'Activo' as EstadoUsuario,
    cc: null,
    empresasVinculadas: []
};

// ================================================================
// FUNCIONES DE AUTENTICACIÓN
// ================================================================

/**
 * Registra un nuevo usuario en el sistema.
 * 
 * @param nombreCompleto - Nombre completo del usuario.
 * @param email - Correo electrónico (debe ser único).
 * @param password - Contraseña del usuario.
 * @param documento - Número de documento.
 * @param telefono - Número de teléfono.
 * @param licenciaSST - Número de licencia SST (opcional).
 * @param rol - Rol del usuario (por defecto 'Profesional').
 * @param cc - Cédula del representante legal (solo para rol "Empresa").
 * @param empresasVinculadas - Lista de NITs vinculados (solo para rol "Empresa").
 * @returns {Object} - Resultado con exito, mensaje y usuario creado.
 */
export function registrarUsuario(
    nombreCompleto: string,
    email: string,
    password: string,
    documento: string,
    telefono: string,
    licenciaSST: string = '',
    rol: RolUsuario = 'Profesional',
    cc: string | null = null,
    empresasVinculadas: string[] = []
): { exito: boolean; mensaje: string; usuario?: IUsuario } {
    if (!validarRequerido(nombreCompleto)) {
        return { exito: false, mensaje: 'El nombre completo es obligatorio.' };
    }
    if (!validarEmail(email)) {
        return { exito: false, mensaje: 'El correo electrónico no tiene un formato válido.' };
    }
    if (!validarPasswordSegura(password)) {
        return {
            exito: false,
            mensaje: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.'
        };
    }
    if (!validarRequerido(documento)) {
        return { exito: false, mensaje: 'El número de documento es obligatorio.' };
    }
    if (!validarRequerido(telefono)) {
        return { exito: false, mensaje: 'El número de teléfono es obligatorio.' };
    }

    // Validar que si el rol es "Empresa", tenga CC y al menos una empresa vinculada
    if (rol === 'Empresa') {
        if (!validarRequerido(cc)) {
            return { exito: false, mensaje: 'La cédula del representante legal es obligatoria para el rol Empresa.' };
        }
        if (empresasVinculadas.length === 0) {
            return { exito: false, mensaje: 'Debe vincular al menos una empresa (NIT) al usuario Empresa.' };
        }
    }

    const usuariosExistentes = storageUsuarios.obtenerTodos();
    const emailExiste = usuariosExistentes.some(u =>
        u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (emailExiste) {
        return { exito: false, mensaje: 'Ya existe un usuario con este correo electrónico.' };
    }

    const nuevoUsuario: IUsuario = {
        id: generarIdUnico(),
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim().toLowerCase(),
        documento: documento.trim(),
        telefono: telefono.trim(),
        licenciaSST: licenciaSST.trim() || 'No registrada',
        rol: rol,
        password: password,
        estado: 'Activo' as EstadoUsuario,
        cc: cc ? cc.trim() : null,
        empresasVinculadas: empresasVinculadas,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    const guardado = storageUsuarios.guardar(nuevoUsuario);
    if (!guardado) {
        return { exito: false, mensaje: 'Error al guardar el usuario en el sistema.' };
    }

    return {
        exito: true,
        mensaje: 'Usuario registrado exitosamente.',
        usuario: nuevoUsuario
    };
}

/**
 * Inicia sesión de un usuario.
 * 
 * @param email - Correo electrónico.
 * @param password - Contraseña.
 * @returns {Object} - Resultado con exito, mensaje y usuario autenticado.
 */
export function iniciarSesion(
    email: string,
    password: string
): { exito: boolean; mensaje: string; usuario?: IUsuario } {
    if (!validarEmail(email)) {
        return { exito: false, mensaje: 'El correo electrónico no es válido.' };
    }
    if (!validarRequerido(password)) {
        return { exito: false, mensaje: 'La contraseña es obligatoria.' };
    }

    const usuarios = storageUsuarios.obtenerTodos();
    const usuarioEncontrado = usuarios.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!usuarioEncontrado) {
        return { exito: false, mensaje: 'No existe un usuario con este correo.' };
    }

    if (usuarioEncontrado.password !== password) {
        return { exito: false, mensaje: 'Contraseña incorrecta.' };
    }

    if (usuarioEncontrado.estado !== 'Activo') {
        return { exito: false, mensaje: 'El usuario está inactivo. Contacta al administrador.' };
    }

    // Crear la sesión completa usando session-manager
    const sesion = crearSesionDesdeUsuario(usuarioEncontrado);
    guardarSesionCompleta(sesion);

    return {
        exito: true,
        mensaje: 'Inicio de sesión exitoso.',
        usuario: usuarioEncontrado
    };
}

/**
 * Cierra la sesión del usuario actual y redirige al login.
 * 
 * @param redirect - Si es true (default), redirige a login.html.
 */
export function cerrarSesion(redirect: boolean = true): void {
    eliminarSesion();
    console.info('👋 Sesión cerrada. Clave eliminada.');
    if (redirect) {
        console.info('🔀 Redirigiendo a login con replace...');
        window.location.replace('login.html');
    }
}

/**
 * Obtiene la sesión activa (completa).
 * 
 * @returns {ISession | null} - Sesión completa o null.
 */
export function obtenerSesion(): ISession | null {
    return obtenerSesionCompleta();
}

/**
 * Verifica si hay una sesión activa Y si el usuario existe.
 * 
 * @returns {boolean} - true si hay sesión válida.
 */
export function haySesionActiva(): boolean {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return false;

    const usuario = storageUsuarios.obtenerPorId(sesion.usuarioId);
    if (!usuario) {
        console.warn('⚠️ Sesión activa pero usuario no encontrado. Limpiando sesión...');
        eliminarSesion();
        return false;
    }

    return true;
}

/**
 * Obtiene el usuario completo de la sesión activa.
 * 
 * @returns {IUsuario | null} - Usuario o null.
 */
export function obtenerUsuarioSesion(): IUsuario | null {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return null;
    const usuario = storageUsuarios.obtenerPorId(sesion.usuarioId);
    return usuario;
}

/**
 * Crea el usuario por defecto (admin) si no existe.
 * 
 * @returns {boolean} - true si se creó.
 */
export function crearUsuarioPorDefecto(): boolean {
    const usuarios = storageUsuarios.obtenerTodos();
    const adminExiste = usuarios.some(u => u.email.toLowerCase() === DEFAULT_USER.email.toLowerCase());

    if (adminExiste) {
        console.info('✅ Usuario por defecto ya existe.');
        return false;
    }

    const resultado = registrarUsuario(
        DEFAULT_USER.nombreCompleto,
        DEFAULT_USER.email,
        DEFAULT_USER.password,
        DEFAULT_USER.documento,
        DEFAULT_USER.telefono,
        DEFAULT_USER.licenciaSST,
        DEFAULT_USER.rol,
        DEFAULT_USER.cc,
        DEFAULT_USER.empresasVinculadas
    );

    if (resultado.exito) {
        console.info('✅ Usuario por defecto creado exitosamente.');
        console.info(`   Email: ${DEFAULT_USER.email}`);
        console.info(`   Contraseña: ${DEFAULT_USER.password}`);
        return true;
    } else {
        console.error('❌ Error al crear usuario por defecto:', resultado.mensaje);
        return false;
    }
}

/**
 * Valida credenciales (envuelve iniciarSesion para uso directo en formularios).
 * 
 * @param email - Correo electrónico.
 * @param password - Contraseña.
 * @returns {Object} - Resultado con valido, mensaje y usuario.
 */
export function validarCredenciales(
    email: string,
    password: string
): { valido: boolean; mensaje: string; usuario?: IUsuario } {
    const resultado = iniciarSesion(email, password);
    return {
        valido: resultado.exito,
        mensaje: resultado.mensaje,
        usuario: resultado.usuario
    };
}

/**
 * Verifica si un email ya está registrado.
 * 
 * @param email - Correo a verificar.
 * @returns {boolean} - true si ya existe.
 */
export function emailYaRegistrado(email: string): boolean {
    if (!validarEmail(email)) return false;
    const usuarios = storageUsuarios.obtenerTodos();
    return usuarios.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
}

export type { IUsuario, RolUsuario, EstadoUsuario, ISession };