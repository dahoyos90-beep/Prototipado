/**
 * src/interfaces/modal-seleccion-empresa.ts
 * 
 * Modal para que el usuario (Profesional) seleccione la empresa activa
 * al iniciar sesión. Reemplaza el placeholder window.prompt() de app.ts.
 * 
 * Características:
 * - Construcción del DOM con createElement + textContent (cero XSS).
 * - Selección por radio buttons accesibles (role="radiogroup").
 * - Verificación obligatoria del NIT de la empresa seleccionada
 *   antes de habilitar el ingreso.
 * - Cancelación por botón, tecla Escape o click fuera del modal.
 * - Cero alert() / prompt() nativos.
 * 
 * @version 1.1.0
 *  - Restaurada la verificación por NIT: al elegir una empresa, el usuario
 *    debe escribir el NIT para confirmar antes de habilitar "Ingresar".
 * 
 * @version 1.0.0
 * @since 2026-10-09
 */

import type { IEmpresa } from './IEmpresa.js';

// ================================================================
// TIPOS
// ================================================================

export interface IModalSeleccionEmpresaOpciones {
    /** Callback ejecutado al confirmar una empresa (ya verificado el NIT). */
    onConfirmar: (empresa: IEmpresa) => void;
    /** Callback opcional ejecutado al cancelar. */
    onCancelar?: () => void;
}

// ================================================================
// ESTADO DEL MÓDULO
// ================================================================

let modalActual: HTMLElement | null = null;
let empresaSeleccionada: IEmpresa | null = null;
let nitCoincide: boolean = false;
let opcionesActuales: IModalSeleccionEmpresaOpciones | null = null;

// ================================================================
// API PÚBLICA
// ================================================================

/**
 * Abre el modal de selección de empresa.
 * Si ya había uno abierto, lo reemplaza.
 * 
 * @param empresas - Lista de empresas disponibles.
 * @param opciones - Callbacks de confirmación y cancelación.
 */
export function abrirModalSeleccionEmpresa(
    empresas: IEmpresa[],
    opciones: IModalSeleccionEmpresaOpciones
): void {
    if (empresas.length === 0) {
        console.warn('abrirModalSeleccionEmpresa: No hay empresas para mostrar.');
        return;
    }

    if (modalActual) {
        cerrarModalSeleccionEmpresa();
    }

    opcionesActuales = opciones;
    empresaSeleccionada = null;
    nitCoincide = false;

    const overlay = construirModal(empresas);
    document.body.appendChild(overlay);
    modalActual = overlay;

    conectarEventos(overlay, empresas);

    const primerRadio = overlay.querySelector<HTMLInputElement>(
        'input[name="empresa-seleccionada"]'
    );
    if (primerRadio) primerRadio.focus();
}

/**
 * Cierra el modal si está abierto. No ejecuta callbacks.
 */
export function cerrarModalSeleccionEmpresa(): void {
    if (!modalActual) return;

    document.removeEventListener('keydown', manejarEscape);
    modalActual.remove();
    modalActual = null;
    empresaSeleccionada = null;
    nitCoincide = false;
    opcionesActuales = null;
}

// ================================================================
// CONSTRUCCIÓN DEL DOM
// ================================================================

function construirModal(empresas: IEmpresa[]): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-seleccion-empresa-titulo');

    const contenido = document.createElement('div');
    contenido.className = 'modal-content modal-seleccion-empresa';

    contenido.appendChild(construirHeader());
    contenido.appendChild(construirBody(empresas));
    contenido.appendChild(construirFooter());

    overlay.appendChild(contenido);
    return overlay;
}

function construirHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titulo = document.createElement('h3');
    titulo.id = 'modal-seleccion-empresa-titulo';
    titulo.textContent = '🏢 Selecciona una empresa';

    header.appendChild(titulo);
    return header;
}

function construirBody(empresas: IEmpresa[]): HTMLElement {
    const body = document.createElement('div');
    body.className = 'modal-body';

    const intro = document.createElement('p');
    intro.className = 'modal-intro';
    intro.textContent = 'Elige la empresa con la que vas a trabajar en esta sesión.';
    body.appendChild(intro);

    const lista = document.createElement('div');
    lista.className = 'empresas-lista';
    lista.setAttribute('role', 'radiogroup');
    lista.setAttribute('aria-label', 'Empresas disponibles');

    empresas.forEach((empresa, indice) => {
        lista.appendChild(construirItemEmpresa(empresa, indice));
    });

    body.appendChild(lista);

    body.appendChild(construirBloqueVerificacionNit());

    const error = document.createElement('p');
    error.className = 'modal-error hidden';
    error.setAttribute('role', 'alert');
    body.appendChild(error);

    return body;
}

function construirItemEmpresa(empresa: IEmpresa, indice: number): HTMLElement {
    const idRadio = `empresa-radio-${indice}`;

    const wrapper = document.createElement('label');
    wrapper.className = 'empresa-item';
    wrapper.setAttribute('for', idRadio);

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'empresa-seleccionada';
    radio.id = idRadio;
    radio.value = empresa.nit;
    radio.className = 'empresa-radio';

    const info = document.createElement('div');
    info.className = 'empresa-info';

    const nombre = document.createElement('span');
    nombre.className = 'empresa-nombre';
    nombre.textContent = empresa.razonSocial;

    const nit = document.createElement('span');
    nit.className = 'empresa-nit';
    nit.textContent = `NIT: ${empresa.nit}`;

    info.appendChild(nombre);
    info.appendChild(nit);

    wrapper.appendChild(radio);
    wrapper.appendChild(info);

    return wrapper;
}

function construirBloqueVerificacionNit(): HTMLElement {
    const bloque = document.createElement('div');
    bloque.className = 'empresa-verificacion-nit hidden';

    const label = document.createElement('label');
    label.className = 'empresa-verificacion-nit-label';
    label.setAttribute('for', 'empresa-nit-input');
    label.textContent = 'Para confirmar, escribe el NIT de la empresa seleccionada';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'empresa-nit-input';
    input.className = 'form-control empresa-nit-input';
    input.autocomplete = 'off';
    input.inputMode = 'numeric';
    input.placeholder = 'Ej. 900123456';
    input.setAttribute('aria-describedby', 'empresa-nit-feedback');

    const feedback = document.createElement('p');
    feedback.id = 'empresa-nit-feedback';
    feedback.className = 'empresa-nit-feedback';
    feedback.textContent = '';

    bloque.appendChild(label);
    bloque.appendChild(input);
    bloque.appendChild(feedback);

    return bloque;
}

function construirFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'btn btn-outline btn-cancelar-modal';
    btnCancelar.textContent = 'Cancelar';

    const btnConfirmar = document.createElement('button');
    btnConfirmar.type = 'button';
    btnConfirmar.className = 'btn btn-primary btn-confirmar-modal';
    btnConfirmar.textContent = '✓ Ingresar';
    btnConfirmar.disabled = true;

    footer.appendChild(btnCancelar);
    footer.appendChild(btnConfirmar);

    return footer;
}

// ================================================================
// EVENTOS
// ================================================================

function conectarEventos(overlay: HTMLElement, empresas: IEmpresa[]): void {
    const btnConfirmar = overlay.querySelector<HTMLButtonElement>('.btn-confirmar-modal');
    const btnCancelar = overlay.querySelector<HTMLButtonElement>('.btn-cancelar-modal');
    const radios = overlay.querySelectorAll<HTMLInputElement>(
        'input[name="empresa-seleccionada"]'
    );
    const error = overlay.querySelector<HTMLParagraphElement>('.modal-error');
    const bloqueNit = overlay.querySelector<HTMLElement>('.empresa-verificacion-nit');
    const inputNit = overlay.querySelector<HTMLInputElement>('#empresa-nit-input');
    const feedbackNit = overlay.querySelector<HTMLParagraphElement>('#empresa-nit-feedback');

    const actualizarBotonConfirmar = (): void => {
        if (!btnConfirmar) return;
        btnConfirmar.disabled = !(empresaSeleccionada && nitCoincide);
    };

    radios.forEach((radio) => {
        radio.addEventListener('change', () => {
            const empresa = empresas.find(e => e.nit === radio.value) || null;
            empresaSeleccionada = empresa;
            nitCoincide = false;

            if (error) {
                error.classList.add('hidden');
                error.textContent = '';
            }

            overlay.querySelectorAll('.empresa-item').forEach((item) => {
                item.classList.remove('empresa-item-seleccionada');
            });
            const itemPadre = radio.closest('.empresa-item');
            if (itemPadre) itemPadre.classList.add('empresa-item-seleccionada');

            if (bloqueNit) {
                bloqueNit.classList.remove('hidden');
            }
            if (inputNit) {
                inputNit.value = '';
                inputNit.classList.remove('is-valid', 'is-invalid');
            }
            if (feedbackNit) {
                feedbackNit.textContent = '';
                feedbackNit.classList.remove('feedback-ok', 'feedback-error');
            }

            actualizarBotonConfirmar();

            if (inputNit) inputNit.focus();
        });
    });

    if (inputNit && feedbackNit) {
        inputNit.addEventListener('input', () => {
            if (!empresaSeleccionada) return;

            const ingresado = inputNit.value.replace(/\D/g, '');
            const esperado = empresaSeleccionada.nit.replace(/\D/g, '');

            if (ingresado.length === 0) {
                nitCoincide = false;
                inputNit.classList.remove('is-valid', 'is-invalid');
                feedbackNit.textContent = '';
                feedbackNit.classList.remove('feedback-ok', 'feedback-error');
            } else if (ingresado === esperado) {
                nitCoincide = true;
                inputNit.classList.remove('is-invalid');
                inputNit.classList.add('is-valid');
                feedbackNit.textContent = '✓ NIT verificado';
                feedbackNit.classList.remove('feedback-error');
                feedbackNit.classList.add('feedback-ok');
            } else {
                nitCoincide = false;
                inputNit.classList.remove('is-valid');
                inputNit.classList.add('is-invalid');
                feedbackNit.textContent = 'El NIT no coincide con la empresa seleccionada.';
                feedbackNit.classList.remove('feedback-ok');
                feedbackNit.classList.add('feedback-error');
            }

            actualizarBotonConfirmar();
        });
    }

    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', () => {
            if (!empresaSeleccionada || !nitCoincide) {
                if (error) {
                    error.textContent = 'Debes seleccionar una empresa y verificar su NIT.';
                    error.classList.remove('hidden');
                }
                return;
            }
            const empresa = empresaSeleccionada;
            const cb = opcionesActuales?.onConfirmar;
            cerrarModalSeleccionEmpresa();
            if (cb) cb(empresa);
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            const cb = opcionesActuales?.onCancelar;
            cerrarModalSeleccionEmpresa();
            if (cb) cb();
        });
    }

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            const cb = opcionesActuales?.onCancelar;
            cerrarModalSeleccionEmpresa();
            if (cb) cb();
        }
    });

    document.removeEventListener('keydown', manejarEscape);
    document.addEventListener('keydown', manejarEscape);
}

function manejarEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !modalActual) return;

    const cb = opcionesActuales?.onCancelar;
    cerrarModalSeleccionEmpresa();
    if (cb) cb();
}