/**
 * src/register.ts
 * 
 * Lógica de UI para la página de registro.
 * Maneja validaciones, eventos del formulario, alertas y redirecciones.
 * 
 * @version 1.0.1 (corrección de 'this' implícito)
 * @since 2026-09-03
 */

import {
    registrarUsuario,
    haySesionActiva,
    emailYaRegistrado,
    crearUsuarioPorDefecto,
    cerrarSesion,
    obtenerUsuarioSesion
} from './auth.js';

import { validarPasswordSegura } from './validators.js';

// ================================================================
// ELEMENTOS DEL DOM
// ================================================================

const form = document.querySelector('#register-form') as HTMLFormElement | null;
const nombreInput = document.querySelector('#nombre') as HTMLInputElement | null;
const emailInput = document.querySelector('#email') as HTMLInputElement | null;
const passwordInput = document.querySelector('#password') as HTMLInputElement | null;
const passwordConfirmInput = document.querySelector('#password-confirm') as HTMLInputElement | null;
const documentoInput = document.querySelector('#documento') as HTMLInputElement | null;
const telefonoInput = document.querySelector('#telefono') as HTMLInputElement | null;
const licenciaInput = document.querySelector('#licencia') as HTMLInputElement | null;

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

    // Resetear clases de error
    document.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));

    // 1. Nombre
    if (!nombreInput || !nombreInput.value.trim()) {
        if (nombreInput) nombreInput.classList.add('is-invalid');
        valido = false;
    }

    // 2. Email
    if (emailInput) {
        const email = emailInput.value.trim();
        if (!email || !email.includes('@')) {
            emailInput.classList.add('is-invalid');
            valido = false;
        } else if (emailYaRegistrado(email)) {
            emailInput.classList.add('is-invalid');
            const feedback = emailInput.parentElement?.querySelector('.invalid-feedback') as HTMLElement | null;
            if (feedback) feedback.textContent = 'Este correo ya está registrado.';
            valido = false;
        } else {
            const feedback = emailInput.parentElement?.querySelector('.invalid-feedback') as HTMLElement | null;
            if (feedback) feedback.textContent = 'Ingresa un correo válido.';
        }
    }

    // 3. Contraseña
    if (passwordInput) {
        const password = passwordInput.value;
        if (!validarPasswordSegura(password)) {
            passwordInput.classList.add('is-invalid');
            valido = false;
        }
    }

    // 4. Confirmar contraseña
    if (passwordConfirmInput && passwordInput) {
        if (passwordConfirmInput.value !== passwordInput.value) {
            passwordConfirmInput.classList.add('is-invalid');
            valido = false;
        }
    }

    // 5. Documento
    if (!documentoInput || !documentoInput.value.trim()) {
        if (documentoInput) documentoInput.classList.add('is-invalid');
        valido = false;
    }

    // 6. Teléfono
    if (!telefonoInput || !telefonoInput.value.trim()) {
        if (telefonoInput) telefonoInput.classList.add('is-invalid');
        valido = false;
    }

    if (!valido) {
        mostrarError('Por favor, corrige los campos marcados en rojo.');
    }

    return valido;
}

// ================================================================
// MANEJO DEL ENVÍO
// ================================================================

async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (!validarFormulario()) return;

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const documento = documentoInput ? documentoInput.value.trim() : '';
    const telefono = telefonoInput ? telefonoInput.value.trim() : '';
    const licencia = licenciaInput ? licenciaInput.value.trim() : '';

    try {
        const resultado = registrarUsuario(
            nombre,
            email,
            password,
            documento,
            telefono,
            licencia
        );

        if (!resultado.exito) {
            mostrarError(resultado.mensaje);
            if (resultado.mensaje.includes('correo') && emailInput) {
                emailInput.classList.add('is-invalid');
            }
            return;
        }

        mostrarExito(resultado.mensaje);

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);

    } catch (error) {
        console.error('Error durante el registro:', error);
        mostrarError('Ocurrió un error inesperado. Intenta de nuevo.');
    }
}

// ================================================================
// VALIDACIÓN EN TIEMPO REAL (corregida con event.target)
// ================================================================

function configurarValidacionTiempoReal(): void {
    document.querySelectorAll('.form-control').forEach(input => {
        input.addEventListener('input', function(event) {
            // Usamos event.target para acceder al elemento sin 'this'
            const target = event.target as HTMLInputElement;
            target.classList.remove('is-invalid');
            limpiarAlertas();
        });
    });

    if (passwordConfirmInput && passwordInput) {
        passwordConfirmInput.addEventListener('input', function() {
            if (this.value !== passwordInput.value) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            if (this.value && !validarPasswordSegura(this.value)) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    }
}

// ================================================================
// INICIALIZACIÓN
// ================================================================

function initRegister(): void {
    // 1. Crear usuario por defecto
    try {
        crearUsuarioPorDefecto();
    } catch (e) {
        // silenciar
    }

    // 2. Verificar sesión activa
    if (haySesionActiva()) {
        const usuario = obtenerUsuarioSesion();
        if (usuario) {
            console.info(`🔓 Sesión activa encontrada: ${usuario.nombreCompleto}`);
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

    configurarValidacionTiempoReal();
    console.info('✅ Página de registro inicializada (mostrando formulario).');
}

// ================================================================
// EJECUTAR CUANDO EL DOM ESTÉ LISTO
// ================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRegister);
} else {
    initRegister();
}