/**
 * src/login.ts
 * 
 * Lógica de UI para la página de inicio de sesión.
 * Maneja validaciones, eventos del formulario, alertas y redirecciones.
 * 
 * @version 1.0.0
 * @since 2026-09-03
 */

import {
    iniciarSesion,
    haySesionActiva,
    crearUsuarioPorDefecto,
    obtenerUsuarioSesion,
    cerrarSesion
} from './auth.js';

// ================================================================
// ELEMENTOS DEL DOM
// ================================================================

const form = document.querySelector('#login-form') as HTMLFormElement | null;
const emailInput = document.querySelector('#email') as HTMLInputElement | null;
const passwordInput = document.querySelector('#password') as HTMLInputElement | null;
const alertError = document.querySelector('#alert-error') as HTMLElement | null;
const alertSuccess = document.querySelector('#alert-success') as HTMLElement | null;
const errorMessage = document.querySelector('#error-message') as HTMLElement | null;
const successMessage = document.querySelector('#success-message') as HTMLElement | null;

// ================================================================
// FUNCIONES DE UI
// ================================================================

function mostrarError(mensaje: string): void {
    if (alertError) alertError.classList.add('show');
    if (alertSuccess) alertSuccess.classList.remove('show');
    if (errorMessage) errorMessage.textContent = mensaje;
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function mostrarExito(mensaje: string): void {
    if (alertSuccess) alertSuccess.classList.add('show');
    if (alertError) alertError.classList.remove('show');
    if (successMessage) successMessage.textContent = mensaje;
    if (form) {
        const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        if (btn) btn.disabled = true;
    }
}

function limpiarAlertas(): void {
    if (alertError) alertError.classList.remove('show');
    if (alertSuccess) alertSuccess.classList.remove('show');
}

// ================================================================
// VALIDACIÓN DEL FORMULARIO
// ================================================================

function validarFormulario(): boolean {
    limpiarAlertas();
    let valido = true;

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!email) {
        if (emailInput) emailInput.classList.add('is-invalid');
        valido = false;
    } else {
        if (emailInput) emailInput.classList.remove('is-invalid');
    }

    if (!password) {
        if (passwordInput) passwordInput.classList.add('is-invalid');
        valido = false;
    } else {
        if (passwordInput) passwordInput.classList.remove('is-invalid');
    }

    if (!valido) {
        mostrarError('Por favor completa todos los campos obligatorios.');
    }

    return valido;
}

// ================================================================
// MANEJO DEL ENVÍO
// ================================================================

async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (!validarFormulario()) return;

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    try {
        const resultado = iniciarSesion(email, password);

        if (!resultado.exito) {
            mostrarError(resultado.mensaje);
            return;
        }

        mostrarExito(`¡Bienvenido, ${resultado.usuario?.nombreCompleto || 'Usuario'}!`);

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error('Error durante el login:', error);
        mostrarError('Ocurrió un error inesperado. Intenta de nuevo.');
    }
}

// ================================================================
// INICIALIZACIÓN
// ================================================================

function initLogin(): void {
    // 1. Crear usuario por defecto
    try {
        const creado = crearUsuarioPorDefecto();
        if (creado) {
            console.info('👤 Usuario por defecto creado.');
        }
    } catch (error) {
        console.warn('No se pudo crear el usuario por defecto:', error);
    }

    // 2. Verificar sesión activa (con validación de existencia)
    if (haySesionActiva()) {
        const usuario = obtenerUsuarioSesion();
        if (usuario) {
            console.info(`🔓 Sesión activa encontrada para: ${usuario.nombreCompleto}`);
            window.location.href = 'index.html';
            return;
        } else {
            console.warn('⚠️ Sesión activa pero usuario no encontrado. Cerrando sesión...');
            cerrarSesion();
            return;
        }
    }

    // 3. Mostrar formulario
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    if (emailInput) {
        emailInput.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            limpiarAlertas();
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            this.classList.remove('is-invalid');
            limpiarAlertas();
        });
    }

    console.info('✅ Página de login inicializada (mostrando formulario).');
}

// ================================================================
// EJECUTAR CUANDO EL DOM ESTÉ LISTO
// ================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
} else {
    initLogin();
}