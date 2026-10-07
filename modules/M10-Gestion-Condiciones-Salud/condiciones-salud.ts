/**
 * modules/M10-Gestion-Condiciones-Salud/condiciones-salud.ts
 * 
 * Módulo de Gestión de Condiciones de Salud (E.M.O., Encuestas, Estadísticas, Alertas).
 * - Filtro por empresa activa
 * - Ocultar acciones para rol Empresa
 * - Modal de cuestionario inyectado dinámicamente (genérico por ahora)
 * 
 * @version 2.0.0
 * @since 2026-09-14
 */

import { storageEMO, storageEncuestas, storageAlertasSalud, storageUsuarios } from '../../src/storage.js';
import { generarIdUnico, qs, escaparHTML, formatearFecha } from '../../src/utils.js';
import { validarFechaISO, validarRequerido } from '../../src/validators.js';
import { obtenerUsuarioSesion } from '../../src/auth.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';
import type {
    IEMO,
    IEncuesta,
    TipoEMO,
    ResultadoEMO,
    TipoEncuesta,
    NivelRiesgoEncuesta
} from '../../src/interfaces/index.js';

// ================================================================
// INICIALIZACIÓN
// ================================================================

export function init(contenedor: HTMLElement): void {
    const cssId = 'modulo-salud-css';
    if (!document.getElementById(cssId)) {
        const cssLink = document.createElement('link');
        cssLink.id = cssId;
        cssLink.rel = 'stylesheet';
        cssLink.href = 'modules/M10-Gestion-Condiciones-Salud/condiciones-salud.css';
        document.head.appendChild(cssLink);
    }

    // ================================================================
    // DATOS DEL USUARIO Y EMPRESA ACTIVA
    // ================================================================

    const usuarioActual = obtenerUsuarioSesion();
    const empresaActivaRaw = obtenerEmpresaActiva();
    const esRolEmpresa = usuarioActual?.rol === 'Empresa';

    if (!empresaActivaRaw) {
        console.warn('⚠️ M10: No hay empresa activa.');
        const container = qs('#modulo-salud') as HTMLElement;
        if (container) {
            container.innerHTML = `<div class="welcome-message"><h2>⚠️ No hay empresa activa</h2><p>Seleccione una empresa primero.</p></div>`;
        }
        return;
    }

    const empresaActiva: string = empresaActivaRaw;

    // ================================================================
    // REFERENCIAS AL DOM
    // ================================================================

    const tabContainer = qs('#tab-container') as HTMLElement;
    const tabButtons = tabContainer?.querySelectorAll('.tab-button') as NodeListOf<HTMLButtonElement>;
    const tabContents = {
        emo: qs('#tab-emo') as HTMLElement,
        encuestas: qs('#tab-encuestas') as HTMLElement,
        estadisticas: qs('#tab-estadisticas') as HTMLElement,
        alertas: qs('#tab-alertas') as HTMLElement,
    };

    if (!tabContainer || !tabButtons.length) {
        console.error('❌ Módulo M10: No se encontraron elementos del DOM.');
        return;
    }

    // ================================================================
    // PESTAÑAS
    // ================================================================

    function mostrarPestana(pestanaId: string): void {
        Object.values(tabContents).forEach(el => el?.classList.add('hidden'));
        const target = tabContents[pestanaId as keyof typeof tabContents];
        if (target) target.classList.remove('hidden');

        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === pestanaId) btn.classList.add('active');
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            if (tabId) mostrarPestana(tabId);
        });
    });

    mostrarPestana('emo');

    // ================================================================
    // GESTIÓN DE E.M.O.
    // ================================================================

    const formEMO = qs('#form-emo') as HTMLFormElement;
    const emoTbody = qs('#tbody-emo') as HTMLElement;
    const mensajeEMO = qs('#mensaje-emo') as HTMLElement;

    function mostrarMensajeEMO(mensaje: string, tipo: 'success' | 'error'): void {
        if (!mensajeEMO) return;
        mensajeEMO.textContent = mensaje;
        mensajeEMO.className = `alert ${tipo}`;
        mensajeEMO.style.display = 'block';
        setTimeout(() => { mensajeEMO.style.display = 'none'; }, 4000);
    }

    function calcularEstadoVigencia(fechaVigencia: string): 'Vigente' | 'PorVencer' | 'Vencido' | 'SinVigencia' {
        if (!fechaVigencia) return 'SinVigencia';
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vigencia = new Date(fechaVigencia);
        const diffDays = Math.ceil((vigencia.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'Vencido';
        if (diffDays <= 30) return 'PorVencer';
        return 'Vigente';
    }

    function renderizarEMO(): void {
        const emos = storageEMO.obtenerTodos().filter(e => e.empresaId === empresaActiva);

        if (emos.length === 0) {
            emoTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No hay exámenes registrados.</td></tr>`;
            return;
        }

        const sorted = [...emos].sort((a, b) => new Date(a.fechaVigencia).getTime() - new Date(b.fechaVigencia).getTime());

        emoTbody.innerHTML = sorted.map(e => {
            const estadoVigencia = e.estadoVigencia || 'SinVigencia';
            const badgeClass =
                estadoVigencia === 'Vigente' ? 'badge-success' :
                estadoVigencia === 'PorVencer' ? 'badge-warning' : 'badge-danger';

            const accionesHTML = esRolEmpresa
                ? '—'
                : `<button class="btn btn-sm btn-danger btn-eliminar-emo" data-id="${escaparHTML(e.id)}">🗑️</button>`;

            return `
                <tr>
                    <td>${escaparHTML(e.trabajadorId)}</td>
                    <td>${escaparHTML(e.tipo)}</td>
                    <td>${formatearFecha(e.fechaRealizacion)}</td>
                    <td>${formatearFecha(e.fechaVigencia)}</td>
                    <td><span class="badge ${badgeClass}">${escaparHTML(estadoVigencia)}</span></td>
                    <td>${accionesHTML}</td>
                </tr>
            `;
        }).join('');

        if (!esRolEmpresa) {
            emoTbody.querySelectorAll('.btn-eliminar-emo').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = (e.currentTarget as HTMLElement).dataset.id;
                    if (id && confirm('¿Eliminar este examen?')) {
                        storageEMO.eliminar(id);
                        renderizarEMO();
                        mostrarMensajeEMO('Examen eliminado.', 'success');
                    }
                });
            });
        }
    }

    function handleEMOSubmit(event: Event): void {
        event.preventDefault();

        const trabajadorId = (qs('#emo-trabajador') as HTMLInputElement).value.trim();
        const tipo = (qs('#emo-tipo') as HTMLSelectElement).value as TipoEMO;
        const fechaRealizacion = (qs('#emo-fecha-realizacion') as HTMLInputElement).value;
        const fechaVigencia = (qs('#emo-fecha-vigencia') as HTMLInputElement).value;
        const institucion = (qs('#emo-institucion') as HTMLInputElement).value.trim();
        const resultado = (qs('#emo-resultado') as HTMLSelectElement).value as ResultadoEMO;

        if (!validarRequerido(trabajadorId) || !validarFechaISO(fechaRealizacion) || !validarFechaISO(fechaVigencia)) {
            mostrarMensajeEMO('Todos los campos son obligatorios.', 'error');
            return;
        }

        const estadoVigencia = calcularEstadoVigencia(fechaVigencia);

        const nuevoEMO: IEMO = {
            id: generarIdUnico(),
            empresaId: empresaActiva,
            trabajadorId,
            tipo,
            fechaRealizacion,
            fechaVigencia,
            institucion,
            resultado,
            restricciones: null,
            archivoPDF: null,
            observaciones: null,
            estadoVigencia,
            fechaCreacion: new Date(),
            fechaActualizacion: new Date()
        };

        const exito = storageEMO.guardar(nuevoEMO);
        if (exito) {
            mostrarMensajeEMO('Examen registrado correctamente.', 'success');
            renderizarEMO();
            if (formEMO) formEMO.reset();
        } else {
            mostrarMensajeEMO('Error al guardar el examen.', 'error');
        }
    }

    if (formEMO) formEMO.addEventListener('submit', handleEMOSubmit);

    // ================================================================
    // GESTIÓN DE ENCUESTAS
    // ================================================================

    const formEncuesta = qs('#form-encuesta') as HTMLFormElement;
    const encuestaTbody = qs('#tbody-encuestas') as HTMLElement;
    const mensajeEncuesta = qs('#mensaje-encuestas') as HTMLElement;
    const btnAplicarEncuesta = qs('#btn-aplicar-encuesta') as HTMLButtonElement;

    function mostrarMensajeEncuesta(mensaje: string, tipo: 'success' | 'error'): void {
        if (!mensajeEncuesta) return;
        mensajeEncuesta.textContent = mensaje;
        mensajeEncuesta.className = `alert ${tipo}`;
        mensajeEncuesta.style.display = 'block';
        setTimeout(() => { mensajeEncuesta.style.display = 'none'; }, 4000);
    }

    function renderizarEncuestas(): void {
        const encuestas = storageEncuestas.obtenerTodos().filter(e => e.empresaId === empresaActiva);

        if (encuestas.length === 0) {
            encuestaTbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No hay encuestas aplicadas.</td></tr>`;
            return;
        }

        encuestaTbody.innerHTML = encuestas.map(e => {
            const accionesHTML = esRolEmpresa
                ? '—'
                : `<button class="btn btn-sm btn-danger btn-eliminar-encuesta" data-id="${escaparHTML(e.id)}">🗑️</button>`;

            return `
                <tr>
                    <td>${escaparHTML(e.trabajadorId)}</td>
                    <td>${escaparHTML(e.tipo)}</td>
                    <td>${formatearFecha(e.fechaAplicacion)}</td>
                    <td><span class="badge ${e.nivelRiesgo === 'Critico' ? 'badge-danger' : 'badge-info'}">${escaparHTML(e.nivelRiesgo)}</span></td>
                    <td>${accionesHTML}</td>
                </tr>
            `;
        }).join('');

        if (!esRolEmpresa) {
            encuestaTbody.querySelectorAll('.btn-eliminar-encuesta').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = (e.currentTarget as HTMLElement).dataset.id;
                    if (id && confirm('¿Eliminar esta encuesta?')) {
                        storageEncuestas.eliminar(id);
                        renderizarEncuestas();
                        mostrarMensajeEncuesta('Encuesta eliminada.', 'success');
                    }
                });
            });
        }
    }

    /**
     * Muestra el modal genérico de cuestionario.
     * ⚠️ PENDIENTE: Reemplazar por cuestionario real (Nordic, Psicosocial).
     */
    function mostrarModalCuestionario(tipo: TipoEncuesta, trabajadorId: string, fechaAplicacion: string): void {
        const modalId = 'modal-cuestionario-m10';
        let modal = document.getElementById(modalId) as HTMLElement;

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal-overlay hidden';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modal-cuestionario-titulo">Cuestionario</h3>
                    </div>
                    <div class="modal-body">
                        <p><strong>Trabajador:</strong> <span id="modal-cuestionario-trabajador">—</span></p>
                        <p><strong>Tipo:</strong> <span id="modal-cuestionario-tipo">—</span></p>
                        <p class="text-muted" style="font-size:0.85rem;">
                            ⚠️ PENDIENTE: Este formulario será reemplazado por el cuestionario real cuando se definan las preguntas.
                        </p>
                        <div class="form-group">
                            <label for="cuestionario-respuesta-1">Pregunta 1</label>
                            <input type="text" id="cuestionario-respuesta-1" class="form-control" placeholder="Respuesta 1" />
                        </div>
                        <div class="form-group">
                            <label for="cuestionario-respuesta-2">Pregunta 2</label>
                            <input type="text" id="cuestionario-respuesta-2" class="form-control" placeholder="Respuesta 2" />
                        </div>
                        <div class="form-group">
                            <label for="cuestionario-respuesta-3">Pregunta 3</label>
                            <input type="text" id="cuestionario-respuesta-3" class="form-control" placeholder="Respuesta 3" />
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="btn-cancelar-cuestionario" class="btn btn-outline">Cancelar</button>
                        <button type="button" id="btn-guardar-cuestionario" class="btn btn-primary">Guardar Encuesta</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Actualizar contenido del modal
        const tituloModal = modal.querySelector('#modal-cuestionario-titulo') as HTMLElement;
        const trabajadorSpan = modal.querySelector('#modal-cuestionario-trabajador') as HTMLElement;
        const tipoSpan = modal.querySelector('#modal-cuestionario-tipo') as HTMLElement;

        if (tituloModal) tituloModal.textContent = `Cuestionario ${tipo}`;
        if (trabajadorSpan) trabajadorSpan.textContent = trabajadorId;
        if (tipoSpan) tipoSpan.textContent = tipo;

        // Abrir modal
        modal.classList.remove('hidden');

        // Configurar botones clonando para evitar listeners duplicados
        const btnCancelar = modal.querySelector('#btn-cancelar-cuestionario') as HTMLButtonElement;
        const btnGuardar = modal.querySelector('#btn-guardar-cuestionario') as HTMLButtonElement;

        const btnCancelarNuevo = btnCancelar.cloneNode(true) as HTMLButtonElement;
        btnCancelar.parentNode?.replaceChild(btnCancelarNuevo, btnCancelar);
        btnCancelarNuevo.addEventListener('click', () => modal.classList.add('hidden'));

        const btnGuardarNuevo = btnGuardar.cloneNode(true) as HTMLButtonElement;
        btnGuardar.parentNode?.replaceChild(btnGuardarNuevo, btnGuardar);
        btnGuardarNuevo.addEventListener('click', () => {
            // Recopilar respuestas (placeholder)
            const r1 = (modal.querySelector('#cuestionario-respuesta-1') as HTMLInputElement).value.trim();
            const r2 = (modal.querySelector('#cuestionario-respuesta-2') as HTMLInputElement).value.trim();
            const r3 = (modal.querySelector('#cuestionario-respuesta-3') as HTMLInputElement).value.trim();

            const respuestas: Record<string, string | number> = {
                pregunta1: r1 || '',
                pregunta2: r2 || '',
                pregunta3: r3 || ''
            };

            const nivelRiesgo = (qs('#encuesta-riesgo') as HTMLSelectElement).value as NivelRiesgoEncuesta;

            const nuevaEncuesta: IEncuesta = {
                id: generarIdUnico(),
                empresaId: empresaActiva,
                trabajadorId,
                tipo,
                fechaAplicacion,
                respuestas,
                resumen: null,
                nivelRiesgo,
                estado: 'Completada',
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            };

            const exito = storageEncuestas.guardar(nuevaEncuesta);
            if (exito) {
                mostrarMensajeEncuesta('Encuesta registrada correctamente.', 'success');
                renderizarEncuestas();
                modal.classList.add('hidden');
                if (formEncuesta) formEncuesta.reset();
            } else {
                mostrarMensajeEncuesta('Error al guardar la encuesta.', 'error');
            }
        });
    }

    function handleEncuestaSubmit(event: Event): void {
        event.preventDefault();
        const trabajadorId = (qs('#encuesta-trabajador') as HTMLInputElement).value.trim();
        const tipo = (qs('#encuesta-tipo') as HTMLSelectElement).value as TipoEncuesta;
        const fechaAplicacion = (qs('#encuesta-fecha') as HTMLInputElement).value;

        if (!validarRequerido(trabajadorId) || !validarFechaISO(fechaAplicacion)) {
            mostrarMensajeEncuesta('Todos los campos son obligatorios.', 'error');
            return;
        }

        mostrarModalCuestionario(tipo, trabajadorId, fechaAplicacion);
    }

    if (formEncuesta) formEncuesta.addEventListener('submit', handleEncuestaSubmit);
    if (btnAplicarEncuesta) {
        btnAplicarEncuesta.addEventListener('click', () => {
            const evt = new Event('submit', { bubbles: true, cancelable: true });
            formEncuesta?.dispatchEvent(evt);
        });
    }

    // ================================================================
    // TABLERO ESTADÍSTICO
    // ================================================================

    function renderizarEstadisticas(): void {
        const usuarios = storageUsuarios.obtenerTodos().filter(u =>
            u.rol === 'Empresa' ? u.empresasVinculadas.includes(empresaActiva) : false
        );
        const emos = storageEMO.obtenerTodos().filter(e => e.empresaId === empresaActiva);
        const encuestas = storageEncuestas.obtenerTodos().filter(e => e.empresaId === empresaActiva);

        const totalUsuarios = usuarios.length;
        const totalExamenes = emos.length;
        const totalEncuestas = encuestas.length;
        const aptos = emos.filter(e => e.resultado === 'Apto').length;
        const noAptos = emos.filter(e => e.resultado === 'NoApto').length;
        const vencidos = emos.filter(e => e.estadoVigencia === 'Vencido').length;

        const stats = {
            totalUsuarios,
            totalExamenes,
            totalEncuestas,
            aptos,
            noAptos,
            vencidos,
            porcentajeAptos: totalExamenes > 0 ? Math.round((aptos / totalExamenes) * 100) : 0,
            porcentajeNoAptos: totalExamenes > 0 ? Math.round((noAptos / totalExamenes) * 100) : 0,
        };

        const statsContainer = qs('#stats-container') as HTMLElement;
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card"><h3>${stats.totalUsuarios}</h3><p>Usuarios</p></div>
                    <div class="stat-card"><h3>${stats.totalExamenes}</h3><p>Exámenes</p></div>
                    <div class="stat-card"><h3>${stats.totalEncuestas}</h3><p>Encuestas</p></div>
                    <div class="stat-card"><h3>${stats.porcentajeAptos}%</h3><p>Aptos</p></div>
                    <div class="stat-card"><h3>${stats.porcentajeNoAptos}%</h3><p>No Aptos</p></div>
                    <div class="stat-card"><h3>${stats.vencidos}</h3><p>Exámenes Vencidos</p></div>
                </div>
            `;
        }
    }

    // ================================================================
    // ALERTAS CRÍTICAS
    // ================================================================

    function renderizarAlertas(): void {
        const alertas = storageAlertasSalud.obtenerTodos().filter(a => a.empresaId === empresaActiva);
        const alertasContainer = qs('#alertas-container') as HTMLElement;
        if (!alertasContainer) return;

        if (alertas.length === 0) {
            alertasContainer.innerHTML = `<p class="text-muted">No hay alertas críticas.</p>`;
            return;
        }

        alertasContainer.innerHTML = alertas.map(a => `
            <div class="alerta-item ${a.estado === 'Pendiente' ? 'alerta-pendiente' : 'alerta-seguimiento'}">
                <div class="alerta-header">
                    <span class="alerta-tipo">${escaparHTML(a.origen)}</span>
                    <span class="alerta-fecha">${formatearFecha(a.fechaDeteccion)}</span>
                    <span class="badge ${a.nivelRiesgo === 'Critico' ? 'badge-danger' : 'badge-warning'}">${escaparHTML(a.nivelRiesgo || '')}</span>
                </div>
                <p>${escaparHTML(a.descripcion)}</p>
                <div class="alerta-actions">
                    <button class="btn btn-sm btn-secondary btn-seguir-alerta" data-id="${escaparHTML(a.id)}">Seguir</button>
                    <button class="btn btn-sm btn-danger btn-cerrar-alerta" data-id="${escaparHTML(a.id)}">Cerrar</button>
                </div>
            </div>
        `).join('');

        alertasContainer.querySelectorAll('.btn-seguir-alerta').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (id) {
                    const exito = storageAlertasSalud.actualizar(id, { estado: 'EnSeguimiento' });
                    if (exito) renderizarAlertas();
                }
            });
        });

        alertasContainer.querySelectorAll('.btn-cerrar-alerta').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLElement).dataset.id;
                if (id && confirm('¿Cerrar esta alerta?')) {
                    const exito = storageAlertasSalud.actualizar(id, { estado: 'Cerrada' });
                    if (exito) renderizarAlertas();
                }
            });
        });
    }

    // ================================================================
    // INICIALIZAR VISTAS
    // ================================================================

    renderizarEMO();
    renderizarEncuestas();
    renderizarEstadisticas();
    renderizarAlertas();

    console.info('✅ Módulo M10 – Gestión de Condiciones de Salud inicializado.');
}