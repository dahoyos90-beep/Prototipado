/**
 * modules/M02-Gestion-Empresas/gestion-empresas.ts
 * 
 * Módulo de Gestión de Empresas (CRUD + proceso de eliminación en 30 días hábiles).
 * 
 * @version 2.0.1 (corregido error TS2365 en comparación de días restantes)
 * @since 2026-09-05
 */

import { storageEmpresas, storageUsuarios } from '../../src/storage.js';
import { generarIdUnico, qs, escaparHTML, calcularDiasRestantes, fechaActualISO, limpiarNIT } from '../../src/utils.js';
import { validarEmail, validarRequerido, validarNIT, validarTelefono } from '../../src/validators.js';
import { obtenerUsuarioSesion } from '../../src/auth.js';
import { crearNotificacion } from '../../src/notificaciones.js';
import type { IEmpresa, EstadoEmpresa, EstadoEliminacion } from '../../src/interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** Días hábiles que dura el proceso de eliminación */
const DIAS_ELIMINACION = 30;

// ================================================================
// INICIALIZACIÓN DEL MÓDULO
// ================================================================

export function init(contenedor: HTMLElement): void {
    // Cargar CSS específico del módulo (evita duplicados)
    const cssId = 'modulo-empresas-css';
    if (!document.getElementById(cssId)) {
        const cssLink = document.createElement('link');
        cssLink.id = cssId;
        cssLink.rel = 'stylesheet';
        cssLink.href = 'modules/M02-Gestion-Empresas/gestion-empresas.css';
        document.head.appendChild(cssLink);
    }

    // ================================================================
    // REFERENCIAS AL DOM
    // ================================================================
    const formContainer = qs('#form-empresa-container') as HTMLElement;
    const form = qs('#form-empresa') as HTMLFormElement;
    const formTitulo = qs('#form-empresa-titulo') as HTMLElement;
    const empresaIdInput = qs('#empresa-id') as HTMLInputElement;
    const razonSocialInput = qs('#razon-social') as HTMLInputElement;
    const nitInput = qs('#nit-empresa') as HTMLInputElement;
    const direccionInput = qs('#direccion-empresa') as HTMLInputElement;
    const correoInput = qs('#correo-empresa') as HTMLInputElement;
    const telefonoInput = qs('#telefono-empresa') as HTMLInputElement;
    const representanteInput = qs('#representante-legal') as HTMLInputElement;
    const estadoSelect = qs('#estado-empresa') as HTMLSelectElement;
    const btnNuevo = qs('#btn-nueva-empresa') as HTMLButtonElement;
    const btnCancelar = qs('#btn-cancelar-form') as HTMLButtonElement;
    const tbody = qs('#tbody-empresas') as HTMLElement;
    const mensajeDiv = qs('#mensaje-empresas') as HTMLElement;

    // Verificar elementos esenciales
    if (!formContainer || !form || !tbody || !btnNuevo || !btnCancelar) {
        console.error('❌ Módulo M02: No se encontraron todos los elementos del DOM.');
        return;
    }

    // ================================================================
    // DATOS DEL USUARIO ACTUAL
    // ================================================================
    const usuarioActual = obtenerUsuarioSesion();
    const esRolEmpresa = usuarioActual?.rol === 'Empresa';

    // ================================================================
    // FUNCIONES DE UI
    // ================================================================

    function mostrarMensaje(mensaje: string, tipo: 'success' | 'error'): void {
        if (!mensajeDiv) return;
        mensajeDiv.textContent = mensaje;
        mensajeDiv.className = `alert ${tipo}`;
        mensajeDiv.style.display = 'block';
        setTimeout(() => {
            mensajeDiv.style.display = 'none';
        }, 4000);
    }

    function limpiarFormulario(): void {
        form.reset();
        empresaIdInput.value = '';
        formTitulo.textContent = 'Registrar Empresa';
        formContainer.classList.add('hidden');
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }

    function mostrarFormulario(empresa?: IEmpresa): void {
        formContainer.classList.remove('hidden');
        if (empresa) {
            formTitulo.textContent = 'Editar Empresa';
            empresaIdInput.value = empresa.id;
            razonSocialInput.value = empresa.razonSocial;
            nitInput.value = empresa.nit;
            direccionInput.value = empresa.direccion;
            correoInput.value = empresa.correo;
            telefonoInput.value = empresa.telefono;
            representanteInput.value = empresa.representanteLegal;
            estadoSelect.value = empresa.estado;
        } else {
            formTitulo.textContent = 'Registrar Empresa';
            empresaIdInput.value = '';
            form.reset();
            estadoSelect.value = 'Activa';
        }
    }

    // ================================================================
    // PROCESO DE ELIMINACIÓN (30 DÍAS HÁBILES)
    // ================================================================

    function ejecutarEliminacionesPendientes(): void {
        const empresas = storageEmpresas.obtenerTodos();
        const aEliminar = empresas.filter(e =>
            e.estadoEliminacion === 'EnProceso' &&
            (e.diasRestantes === null || e.diasRestantes === undefined || e.diasRestantes <= 0)
        );

        aEliminar.forEach(empresa => {
            storageEmpresas.eliminar(empresa.id);
            console.info(`🗑️ Empresa "${empresa.razonSocial}" (${empresa.nit}) eliminada definitivamente.`);
        });

        if (aEliminar.length > 0) {
            mostrarMensaje(`${aEliminar.length} empresa(s) eliminada(s) definitivamente.`, 'success');
        }
    }

    function actualizarDiasRestantes(): void {
        const empresas = storageEmpresas.obtenerTodos();
        let cambios = false;

        empresas.forEach(empresa => {
            if (empresa.estadoEliminacion === 'EnProceso' && empresa.fechaEliminacion) {
                const dias = calcularDiasRestantes(empresa.fechaEliminacion);
                if (empresa.diasRestantes !== dias) {
                    storageEmpresas.actualizar(empresa.id, { diasRestantes: dias });
                    cambios = true;

                    if (dias === 10) {
                        crearNotificacion(
                            'AlertaEliminacion',
                            `⚠️ La empresa "${empresa.razonSocial}" será eliminada en 10 días.`,
                            empresa.nit,
                            '10dias'
                        );
                    } else if (dias === 5) {
                        crearNotificacion(
                            'AlertaEliminacion',
                            `⚠️ La empresa "${empresa.razonSocial}" será eliminada en 5 días.`,
                            empresa.nit,
                            '5dias'
                        );
                    } else if (dias === 1) {
                        crearNotificacion(
                            'AlertaEliminacion',
                            `🚨 La empresa "${empresa.razonSocial}" será eliminada en 24 horas. No se podrá recuperar.`,
                            empresa.nit,
                            '24horas'
                        );
                    }
                }
            }
        });

        if (cambios) {
            console.info('✅ Días restantes actualizados.');
        }
    }

    function iniciarEliminacion(empresa: IEmpresa): void {
        const nitIngresado = window.prompt(
            `⚠️ Va a iniciar el proceso de eliminación de la empresa:\n\n"${empresa.razonSocial}"\n\nPara confirmar, ingrese el NIT de la empresa:`
        );

        if (!nitIngresado) {
            console.warn('Eliminación cancelada.');
            return;
        }

        if (limpiarNIT(nitIngresado) !== limpiarNIT(empresa.nit)) {
            mostrarMensaje('❌ El NIT ingresado no coincide. Eliminación cancelada.', 'error');
            return;
        }

        const observacion = window.prompt(
            'Ingrese el motivo de la eliminación (obligatorio):'
        );

        if (!observacion || !observacion.trim()) {
            mostrarMensaje('❌ El motivo de la eliminación es obligatorio.', 'error');
            return;
        }

        const confirmado = window.confirm(
            `⚠️ ¿Está seguro de iniciar la eliminación de "${empresa.razonSocial}"?\n\n` +
            `Tendrá 30 días hábiles para recuperarla. Después de ese plazo, la información se eliminará definitivamente.`
        );

        if (!confirmado) {
            console.warn('Eliminación cancelada por el usuario.');
            return;
        }

        const fechaEliminacion = calcularFechaEliminacion(DIAS_ELIMINACION);

        const actualizado: Partial<IEmpresa> = {
            estadoEliminacion: 'EnProceso',
            fechaEliminacion: fechaEliminacion,
            observacionEliminacion: observacion.trim(),
            diasRestantes: DIAS_ELIMINACION,
            fechaActualizacion: new Date()
        };

        const exito = storageEmpresas.actualizar(empresa.id, actualizado);
        if (exito) {
            mostrarMensaje(`Proceso de eliminación iniciado para "${empresa.razonSocial}".`, 'success');
            renderizarEmpresas();
        } else {
            mostrarMensaje('Error al iniciar el proceso de eliminación.', 'error');
        }
    }

    function calcularFechaEliminacion(diasHabiles: number): string {
        const fecha = new Date();
        let contador = 0;

        while (contador < diasHabiles) {
            fecha.setDate(fecha.getDate() + 1);
            const diaSemana = fecha.getDay();
            if (diaSemana !== 0 && diaSemana !== 6) {
                contador++;
            }
        }

        const anio = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${anio}-${mes}-${dia}`;
    }

    function recuperarEmpresa(empresa: IEmpresa): void {
        const nitIngresado = window.prompt(
            `🔄 Va a recuperar la empresa:\n\n"${empresa.razonSocial}"\n\nIngrese el NIT para confirmar:`
        );

        if (!nitIngresado) {
            return;
        }

        if (limpiarNIT(nitIngresado) !== limpiarNIT(empresa.nit)) {
            mostrarMensaje('❌ El NIT ingresado no coincide.', 'error');
            return;
        }

        const actualizado: Partial<IEmpresa> = {
            estadoEliminacion: 'Activa',
            fechaEliminacion: null,
            observacionEliminacion: null,
            diasRestantes: null,
            fechaActualizacion: new Date()
        };

        const exito = storageEmpresas.actualizar(empresa.id, actualizado);
        if (exito) {
            mostrarMensaje(`Empresa "${empresa.razonSocial}" recuperada correctamente.`, 'success');
            renderizarEmpresas();
        } else {
            mostrarMensaje('Error al recuperar la empresa.', 'error');
        }
    }

    // ================================================================
    // RENDERIZADO DE TABLA
    // ================================================================

    function renderizarEmpresas(): void {
        let empresas = storageEmpresas.obtenerTodos();

        // Filtrar según el rol del usuario
        if (usuarioActual?.rol === 'Empresa') {
            empresas = empresas.filter(e => usuarioActual.empresasVinculadas.includes(e.nit));
        }

        if (empresas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No hay empresas registradas.</td></tr>`;
            return;
        }

        tbody.innerHTML = empresas.map(e => {
            const estadoEliminacion = e.estadoEliminacion || 'Activa';

            // Separar en dos variables: número para lógica, texto para visualización
            const diasNumero: number | null =
                (e.diasRestantes !== null && e.diasRestantes !== undefined) ? e.diasRestantes : null;
            const diasTexto: string = diasNumero !== null ? String(diasNumero) : '—';

            // Badge de estado de eliminación
            let badgeEliminacion = '';
            if (estadoEliminacion === 'EnProceso') {
                let badgeClass = 'badge-info';
                if (diasNumero !== null) {
                    if (diasNumero <= 5) badgeClass = 'badge-danger';
                    else if (diasNumero <= 10) badgeClass = 'badge-warning';
                }
                badgeEliminacion = `<span class="badge ${badgeClass}">En Proceso</span>`;
            } else if (estadoEliminacion === 'Eliminada') {
                badgeEliminacion = `<span class="badge badge-danger">Eliminada</span>`;
            } else {
                badgeEliminacion = `<span class="badge badge-success">Activa</span>`;
            }

            // Columna de días restantes
            const diasHTML = estadoEliminacion === 'EnProceso'
                ? `<strong>${diasTexto}</strong> días`
                : '—';

            // Acciones (ocultas para rol Empresa)
            let accionesHTML = '—';
            if (!esRolEmpresa) {
                const acciones: string[] = [];

                if (estadoEliminacion === 'EnProceso') {
                    acciones.push(`<button class="btn btn-sm btn-success btn-recuperar" data-id="${escaparHTML(e.id)}">🔄 Recuperar</button>`);
                } else {
                    acciones.push(`<button class="btn btn-sm btn-outline btn-editar" data-id="${escaparHTML(e.id)}">✏️</button>`);
                    acciones.push(`<button class="btn btn-sm btn-danger btn-eliminar" data-id="${escaparHTML(e.id)}">🗑️</button>`);
                }

                accionesHTML = `<div class="actions-cell">${acciones.join(' ')}</div>`;
            }

            return `
                <tr>
                    <td>${escaparHTML(e.razonSocial)}</td>
                    <td>${escaparHTML(e.nit)}</td>
                    <td>${escaparHTML(e.correo)}</td>
                    <td>${escaparHTML(e.telefono)}</td>
                    <td>${escaparHTML(e.representanteLegal)}</td>
                    <td><span class="badge ${e.estado === 'Activa' ? 'badge-success' : 'badge-danger'}">${escaparHTML(e.estado)}</span></td>
                    <td>${badgeEliminacion}</td>
                    <td>${diasHTML}</td>
                    <td>${accionesHTML}</td>
                </tr>
            `;
        }).join('');

        // Eventos
        tbody.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const id = (event.currentTarget as HTMLElement).dataset.id;
                if (id) editarEmpresa(id);
            });
        });

        tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const id = (event.currentTarget as HTMLElement).dataset.id;
                if (id) eliminarEmpresa(id);
            });
        });

        tbody.querySelectorAll('.btn-recuperar').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const id = (event.currentTarget as HTMLElement).dataset.id;
                if (id) {
                    const empresa = storageEmpresas.obtenerPorId(id);
                    if (empresa) recuperarEmpresa(empresa);
                }
            });
        });
    }

    // ================================================================
    // CRUD
    // ================================================================

    function editarEmpresa(id: string): void {
        const empresa = storageEmpresas.obtenerPorId(id);
        if (empresa) {
            if (empresa.estadoEliminacion === 'EnProceso') {
                mostrarMensaje('⚠️ No se puede editar una empresa en proceso de eliminación.', 'error');
                return;
            }
            mostrarFormulario(empresa);
        } else {
            mostrarMensaje('Empresa no encontrada.', 'error');
        }
    }

    function eliminarEmpresa(id: string): void {
        const empresa = storageEmpresas.obtenerPorId(id);
        if (empresa) {
            iniciarEliminacion(empresa);
        } else {
            mostrarMensaje('Empresa no encontrada.', 'error');
        }
    }

    // ================================================================
    // VALIDACIÓN
    // ================================================================

    function validarFormularioEmpresa(): boolean {
        let valido = true;
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        const razonSocial = razonSocialInput.value.trim();
        const nit = nitInput.value.trim();
        const direccion = direccionInput.value.trim();
        const correo = correoInput.value.trim();
        const telefono = telefonoInput.value.trim();
        const representante = representanteInput.value.trim();

        if (!validarRequerido(razonSocial)) {
            razonSocialInput.classList.add('is-invalid');
            valido = false;
        }
        if (!validarNIT(nit)) {
            nitInput.classList.add('is-invalid');
            valido = false;
        }
        if (!validarRequerido(direccion)) {
            direccionInput.classList.add('is-invalid');
            valido = false;
        }
        if (!validarEmail(correo)) {
            correoInput.classList.add('is-invalid');
            valido = false;
        }
        if (!validarTelefono(telefono)) {
            telefonoInput.classList.add('is-invalid');
            valido = false;
        }
        if (!validarRequerido(representante)) {
            representanteInput.classList.add('is-invalid');
            valido = false;
        }

        // Validar NIT duplicado
        const nitLimpio = limpiarNIT(nit);
        const empresasExistentes = storageEmpresas.obtenerTodos();
        const idActual = empresaIdInput.value;
        const nitDuplicado = empresasExistentes.some(e =>
            limpiarNIT(e.nit) === nitLimpio && e.id !== idActual
        );

        if (nitDuplicado) {
            nitInput.classList.add('is-invalid');
            mostrarMensaje('❌ Ya existe una empresa con este NIT.', 'error');
            valido = false;
        }

        if (!valido && !nitDuplicado) {
            mostrarMensaje('Por favor corrige los campos marcados.', 'error');
        }

        return valido;
    }

    // ================================================================
    // MANEJO DEL ENVÍO DEL FORMULARIO
    // ================================================================

    function handleSubmitForm(event: Event): void {
        event.preventDefault();
        if (!validarFormularioEmpresa()) return;

        const id = empresaIdInput.value;
        const razonSocial = razonSocialInput.value.trim();
        const nit = nitInput.value.trim();
        const direccion = direccionInput.value.trim();
        const correo = correoInput.value.trim();
        const telefono = telefonoInput.value.trim();
        const representante = representanteInput.value.trim();
        const estado = estadoSelect.value as EstadoEmpresa;

        if (id) {
            const empresaExistente = storageEmpresas.obtenerPorId(id);
            if (!empresaExistente) {
                mostrarMensaje('Empresa no encontrada.', 'error');
                return;
            }
            const actualizado: Partial<IEmpresa> = {
                razonSocial,
                nit,
                direccion,
                correo,
                telefono,
                representanteLegal: representante,
                estado,
                fechaActualizacion: new Date()
            };
            const exito = storageEmpresas.actualizar(id, actualizado);
            if (exito) {
                mostrarMensaje('Empresa actualizada correctamente.', 'success');
                limpiarFormulario();
                renderizarEmpresas();
            } else {
                mostrarMensaje('Error al actualizar la empresa.', 'error');
            }
        } else {
            const nuevaEmpresa: Omit<IEmpresa, 'id' | 'fechaCreacion' | 'fechaActualizacion'> = {
                razonSocial,
                nit,
                direccion,
                correo,
                telefono,
                representanteLegal: representante,
                estado,
                estadoEliminacion: 'Activa' as EstadoEliminacion,
                fechaEliminacion: null,
                observacionEliminacion: null,
                diasRestantes: null
            };
            const empresaCompleta: IEmpresa = {
                id: generarIdUnico(),
                ...nuevaEmpresa,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            };
            const exito = storageEmpresas.guardar(empresaCompleta);
            if (exito) {
                mostrarMensaje('Empresa registrada correctamente.', 'success');
                limpiarFormulario();
                renderizarEmpresas();
            } else {
                mostrarMensaje('Error al guardar la empresa.', 'error');
            }
        }
    }

    // ================================================================
    // INICIALIZACIÓN DEL MÓDULO
    // ================================================================

    ejecutarEliminacionesPendientes();
    actualizarDiasRestantes();

    btnNuevo.addEventListener('click', () => mostrarFormulario());
    btnCancelar.addEventListener('click', limpiarFormulario);
    form.addEventListener('submit', handleSubmitForm);

    if (esRolEmpresa) {
        btnNuevo.style.display = 'none';
    }

    renderizarEmpresas();

    console.info('✅ Módulo M02 – Gestión de Empresas inicializado.');
}