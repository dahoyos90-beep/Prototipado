/**
 * modules/M01-Gestion-Usuarios/gestion-usuarios.ts
 * 
 * Módulo de Gestión de Usuarios (CRUD completo con roles Profesional/Empresa).
 * 
 * @version 2.0.0 (agregados: rol, CC, empresas vinculadas, filtro por empresa, ocultar acciones)
 * @since 2026-09-03
 */

import { storageUsuarios, storageEmpresas } from '../../src/storage.js';
import { generarIdUnico, qs, escaparHTML, validarSoloNumeros } from '../../src/utils.js';
import { validarEmail, validarPasswordSegura, validarRequerido } from '../../src/validators.js';
import { registrarUsuario, obtenerUsuarioSesion } from '../../src/auth.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';
import type { IUsuario, RolUsuario, EstadoUsuario } from '../../src/interfaces/index.js';

// ================================================================
// INICIALIZACIÓN DEL MÓDULO
// ================================================================

export function init(contenedor: HTMLElement): void {
    // Cargar CSS específico del módulo (evita duplicados)
    const cssId = 'modulo-usuarios-css';
    if (!document.getElementById(cssId)) {
        const cssLink = document.createElement('link');
        cssLink.id = cssId;
        cssLink.rel = 'stylesheet';
        cssLink.href = 'modules/M01-Gestion-Usuarios/gestion-usuarios.css';
        document.head.appendChild(cssLink);
    }

    // ================================================================
    // REFERENCIAS AL DOM (frescas cada vez que se carga el módulo)
    // ================================================================
    const formContainer = qs('#form-usuario-container') as HTMLElement;
    const form = qs('#form-usuario') as HTMLFormElement;
    const formTitulo = qs('#form-usuario-titulo') as HTMLElement;
    const usuarioIdInput = qs('#usuario-id') as HTMLInputElement;
    const nombreInput = qs('#nombre-completo') as HTMLInputElement;
    const emailInput = qs('#email-usuario') as HTMLInputElement;
    const documentoInput = qs('#documento-usuario') as HTMLInputElement;
    const telefonoInput = qs('#telefono-usuario') as HTMLInputElement;
    const licenciaInput = qs('#licencia-usuario') as HTMLInputElement;
    const passwordInput = qs('#password-usuario') as HTMLInputElement;
    const rolSelect = qs('#rol-usuario') as HTMLSelectElement;
    const grupoCC = qs('#grupo-cc-usuario') as HTMLElement;
    const ccInput = qs('#cc-usuario') as HTMLInputElement;
    const grupoEmpresas = qs('#grupo-empresas-vinculadas-usuario') as HTMLElement;
    const empresasSelect = qs('#empresas-vinculadas-usuario') as HTMLSelectElement;
    const estadoSelect = qs('#estado-usuario') as HTMLSelectElement;
    const btnNuevo = qs('#btn-nuevo-usuario') as HTMLButtonElement;
    const btnCancelar = qs('#btn-cancelar-form') as HTMLButtonElement;
    const tbody = qs('#tbody-usuarios') as HTMLElement;
    const mensajeDiv = qs('#mensaje-usuarios') as HTMLElement;

    // Verificar que todos los elementos existan
    if (!formContainer || !form || !tbody || !btnNuevo || !btnCancelar) {
        console.error('❌ Módulo M01: No se encontraron todos los elementos del DOM.');
        return;
    }

    // ================================================================
    // OBTENER USUARIO ACTUAL Y EMPRESA ACTIVA
    // ================================================================
    const usuarioActual = obtenerUsuarioSesion();
    const empresaActiva = obtenerEmpresaActiva();
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
        usuarioIdInput.value = '';
        formTitulo.textContent = 'Registrar Usuario';
        formContainer.classList.add('hidden');
        grupoCC.classList.add('hidden');
        grupoEmpresas.classList.add('hidden');
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }

    /**
     * Llena el select múltiple de empresas con las empresas disponibles del SST.
     */
    function cargarEmpresasEnSelect(): void {
        const todasEmpresas = storageEmpresas.obtenerTodos();
        empresasSelect.innerHTML = todasEmpresas
            .filter(e => e.estadoEliminacion === 'Activa' || !e.estadoEliminacion)
            .map(e => `<option value="${escaparHTML(e.nit)}">${escaparHTML(e.razonSocial)} (${escaparHTML(e.nit)})</option>`)
            .join('');
    }

    /**
     * Muestra u oculta los campos de CC y empresas vinculadas según el rol.
     */
    function actualizarVisibilidadCamposRol(): void {
        const rol = rolSelect.value;
        if (rol === 'Empresa') {
            grupoCC.classList.remove('hidden');
            grupoEmpresas.classList.remove('hidden');
            ccInput.required = true;
        } else {
            grupoCC.classList.add('hidden');
            grupoEmpresas.classList.add('hidden');
            ccInput.required = false;
        }
    }

    function mostrarFormulario(usuario?: IUsuario): void {
        formContainer.classList.remove('hidden');
        cargarEmpresasEnSelect();

        if (usuario) {
            formTitulo.textContent = 'Editar Usuario';
            usuarioIdInput.value = usuario.id;
            nombreInput.value = usuario.nombreCompleto;
            emailInput.value = usuario.email;
            documentoInput.value = usuario.documento;
            telefonoInput.value = usuario.telefono;
            licenciaInput.value = usuario.licenciaSST || '';
            passwordInput.value = usuario.password;
            passwordInput.required = false;
            rolSelect.value = usuario.rol;
            estadoSelect.value = usuario.estado;

            // Cargar CC si aplica
            if (usuario.rol === 'Empresa') {
                ccInput.value = usuario.cc || '';
                // Marcar empresas vinculadas
                const opciones = empresasSelect.querySelectorAll('option');
                opciones.forEach(op => {
                    const opt = op as HTMLOptionElement;
                    opt.selected = usuario.empresasVinculadas.includes(opt.value);
                });
            } else {
                ccInput.value = '';
                // Desseleccionar todas
                empresasSelect.querySelectorAll('option').forEach(op => {
                    (op as HTMLOptionElement).selected = false;
                });
            }

            actualizarVisibilidadCamposRol();
        } else {
            formTitulo.textContent = 'Registrar Usuario';
            usuarioIdInput.value = '';
            form.reset();
            passwordInput.required = true;
            estadoSelect.value = 'Activo';
            rolSelect.value = 'Profesional';
            actualizarVisibilidadCamposRol();
        }
    }

    function validarFormulario(): boolean {
        let valido = true;
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        const nombre = nombreInput.value.trim();
        const email = emailInput.value.trim();
        const documento = documentoInput.value.trim();
        const telefono = telefonoInput.value.trim();
        const password = passwordInput.value;
        const rol = rolSelect.value as RolUsuario;
        const cc = ccInput.value.trim();

        if (!validarRequerido(nombre)) {
            nombreInput.classList.add('is-invalid');
            valido = false;
        }
        if (!validarEmail(email)) {
            emailInput.classList.add('is-invalid');
            valido = false;
        }
        if (!validarRequerido(documento)) {
            documentoInput.classList.add('is-invalid');
            valido = false;
        }
        if (!validarRequerido(telefono)) {
            telefonoInput.classList.add('is-invalid');
            valido = false;
        }
        if (passwordInput.required && !validarPasswordSegura(password)) {
            passwordInput.classList.add('is-invalid');
            valido = false;
        }
        if (rol === 'Empresa') {
            if (!validarRequerido(cc) || !validarSoloNumeros(cc)) {
                ccInput.classList.add('is-invalid');
                valido = false;
            }
            const seleccionadas = obtenerEmpresasSeleccionadas();
            if (seleccionadas.length === 0) {
                empresasSelect.classList.add('is-invalid');
                valido = false;
            }
        }

        if (!valido) {
            mostrarMensaje('Por favor corrige los campos marcados.', 'error');
        }
        return valido;
    }

    function obtenerEmpresasSeleccionadas(): string[] {
        const seleccionadas: string[] = [];
        empresasSelect.querySelectorAll('option').forEach(op => {
            if ((op as HTMLOptionElement).selected) {
                seleccionadas.push((op as HTMLOptionElement).value);
            }
        });
        return seleccionadas;
    }

    function handleSubmit(event: Event): void {
        event.preventDefault();
        if (!validarFormulario()) return;

        const id = usuarioIdInput.value;
        const nombre = nombreInput.value.trim();
        const email = emailInput.value.trim();
        const documento = documentoInput.value.trim();
        const telefono = telefonoInput.value.trim();
        const licencia = licenciaInput.value.trim();
        const password = passwordInput.value;
        const rol = rolSelect.value as RolUsuario;
        const cc = rol === 'Empresa' ? ccInput.value.trim() : null;
        const empresasVinculadas = rol === 'Empresa' ? obtenerEmpresasSeleccionadas() : [];
        const estado = estadoSelect.value as EstadoUsuario;

        if (id) {
            // Actualizar usuario existente
            const usuarioExistente = storageUsuarios.obtenerPorId(id);
            if (!usuarioExistente) {
                mostrarMensaje('Usuario no encontrado.', 'error');
                return;
            }
            const actualizado: Partial<IUsuario> = {
                nombreCompleto: nombre,
                email,
                documento,
                telefono,
                licenciaSST: licencia || 'No registrada',
                rol,
                cc,
                empresasVinculadas,
                estado,
                fechaActualizacion: new Date()
            };
            if (password && validarPasswordSegura(password)) {
                actualizado.password = password;
            }
            const exito = storageUsuarios.actualizar(id, actualizado);
            if (exito) {
                mostrarMensaje('Usuario actualizado correctamente.', 'success');
                limpiarFormulario();
                renderizarUsuarios();
            } else {
                mostrarMensaje('Error al actualizar el usuario.', 'error');
            }
        } else {
            // Crear nuevo usuario usando registrarUsuario de auth.ts
            const resultado = registrarUsuario(
                nombre,
                email,
                password,
                documento,
                telefono,
                licencia || '',
                rol,
                cc,
                empresasVinculadas
            );
            if (resultado.exito) {
                // Actualizar el estado si es diferente de Activo
                if (estado !== 'Activo' && resultado.usuario) {
                    storageUsuarios.actualizar(resultado.usuario.id, { estado });
                }
                mostrarMensaje('Usuario registrado correctamente.', 'success');
                limpiarFormulario();
                renderizarUsuarios();
            } else {
                mostrarMensaje(resultado.mensaje, 'error');
            }
        }
    }

    function renderizarUsuarios(): void {
        // Filtrar usuarios según el rol del usuario actual
        let usuarios = storageUsuarios.obtenerTodos();

        if (usuarioActual?.rol === 'Empresa') {
            // Usuario Empresa: solo se ve a sí mismo
            usuarios = usuarios.filter(u => u.id === usuarioActual.id);
        } else if (usuarioActual?.rol === 'Profesional' && empresaActiva) {
            // SST: ve usuarios vinculados a la empresa activa o sin vinculación
            usuarios = usuarios.filter(u =>
                u.rol === 'Empresa'
                    ? u.empresasVinculadas.includes(empresaActiva)
                    : true // Los profesionales no están vinculados a empresa
            );
        }

        if (usuarios.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay usuarios registrados.</td></tr>`;
            return;
        }

        tbody.innerHTML = usuarios.map(u => {
            // Obtener nombres de empresas vinculadas
            const empresasNombres = u.empresasVinculadas.length > 0
                ? u.empresasVinculadas.map(nit => {
                    const emp = storageEmpresas.obtenerPorId(nit);
                    return emp ? emp.razonSocial : nit;
                }).join(', ')
                : '—';

            // Ocultar botones de acción para rol Empresa
            const accionesHTML = esRolEmpresa
                ? '—'
                : `
                    <div class="actions-cell">
                        <button class="btn btn-sm btn-outline btn-editar" data-id="${escaparHTML(u.id)}">✏️</button>
                        <button class="btn btn-sm btn-danger btn-eliminar" data-id="${escaparHTML(u.id)}">🗑️</button>
                    </div>
                `;

            return `
                <tr>
                    <td>${escaparHTML(u.nombreCompleto)}</td>
                    <td>${escaparHTML(u.email)}</td>
                    <td>${escaparHTML(u.documento)}</td>
                    <td><span class="badge badge-info">${escaparHTML(u.rol)}</span></td>
                    <td>${escaparHTML(empresasNombres)}</td>
                    <td><span class="badge ${u.estado === 'Activo' ? 'badge-success' : 'badge-danger'}">${escaparHTML(u.estado)}</span></td>
                    <td>${accionesHTML}</td>
                </tr>
            `;
        }).join('');

        // Eventos para botones de editar/eliminar
        tbody.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (id) editarUsuario(id);
            });
        });

        tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (id) eliminarUsuario(id);
            });
        });
    }

    function editarUsuario(id: string): void {
        const usuario = storageUsuarios.obtenerPorId(id);
        if (usuario) {
            mostrarFormulario(usuario);
        } else {
            mostrarMensaje('Usuario no encontrado.', 'error');
        }
    }

    function eliminarUsuario(id: string): void {
        if (confirm('¿Estás seguro de eliminar este usuario?')) {
            const exito = storageUsuarios.eliminar(id);
            if (exito) {
                mostrarMensaje('Usuario eliminado correctamente.', 'success');
                renderizarUsuarios();
            } else {
                mostrarMensaje('Error al eliminar el usuario.', 'error');
            }
        }
    }

    // ================================================================
    // ASIGNAR EVENTOS
    // ================================================================
    btnNuevo.addEventListener('click', () => mostrarFormulario());
    btnCancelar.addEventListener('click', limpiarFormulario);
    form.addEventListener('submit', handleSubmit);
    rolSelect.addEventListener('change', actualizarVisibilidadCamposRol);

    // Ocultar botón "Nuevo" si es rol Empresa
    if (esRolEmpresa) {
        btnNuevo.style.display = 'none';
    }

    // Renderizar tabla
    renderizarUsuarios();

    console.info('✅ Módulo M01 – Gestión de Usuarios inicializado.');
}