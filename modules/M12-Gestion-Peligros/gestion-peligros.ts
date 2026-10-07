/**
 * modules/M12-Gestion-Peligros/gestion-peligros.ts
 * 
 * Módulo de Gestión de Peligros (Encuesta de Auto-Reporte GTC 45).
 * - Vista 1: Listado de trabajadores activos con estado de encuesta.
 * - Vista 2: Formulario de encuesta con 28 preguntas (8 bloques).
 * - Filtro por empresa activa.
 * - Ocultar acciones para rol Empresa.
 * 
 * @version 1.0.0
 * @since 2026-09-16
 */

import { StorageService, storageReportesPeligro } from '../../src/storage.js';
import { qs, escaparHTML, formatearFecha, generarIdUnico, fechaActualISO } from '../../src/utils.js';
import { validarRequerido } from '../../src/validators.js';
import { obtenerUsuarioSesion } from '../../src/auth.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';
import type { ISociodemografico, EstadoTrabajador } from '../../src/interfaces/index.js';
import type { 
    IReportePeligro, 
    IRespuestaPeligro, 
    PreguntaPeligroId,
    EstadoReportePeligro 
} from '../../src/interfaces/IPeligro.js';

// ================================================================
// CONSTANTES Y STORAGE
// ================================================================

const STORAGE_KEY_TRABAJADORES = 'sociodemografico';
const storageTrabajadores = new StorageService<ISociodemografico>(STORAGE_KEY_TRABAJADORES);

/** Lista de todas las 28 preguntas con su ID */
const PREGUNTAS: PreguntaPeligroId[] = [
    "1.1", "1.2", "1.3",
    "2.1", "2.2", "2.3", "2.4", "2.5",
    "3.1", "3.2", "3.3",
    "4.1", "4.2", "4.3", "4.4",
    "5.1", "5.2", "5.3",
    "6.1", "6.2", "6.3", "6.4", "6.5", "6.6",
    "7.1",
    "8.1", "8.2", "8.3"
];

/** Preguntas que tienen campo extra adicional */
const PREGUNTAS_CON_EXTRA: PreguntaPeligroId[] = ["5.2", "8.1", "8.3"];

// ================================================================
// INICIALIZACIÓN
// ================================================================

export function init(contenedor: HTMLElement): void {
    // Cargar CSS específico del módulo
    const cssId = 'modulo-peligros-css';
    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'modules/M12-Gestion-Peligros/gestion-peligros.css';
        document.head.appendChild(link);
    }

    // ================================================================
    // DATOS DEL USUARIO Y EMPRESA ACTIVA
    // ================================================================

    const usuarioActual = obtenerUsuarioSesion();
    const empresaActivaRaw = obtenerEmpresaActiva();
    const esRolEmpresa = usuarioActual?.rol === 'Empresa';

    if (!empresaActivaRaw) {
        const tbodyErr = qs('#tbody-trabajadores-peligros') as HTMLElement;
        if (tbodyErr) {
            tbodyErr.innerHTML = `<tr><td colspan="4" class="text-center text-muted">⚠️ No hay empresa activa. Seleccione una empresa primero.</td></tr>`;
        }
        console.warn('⚠️ M12: No hay empresa activa.');
        return;
    }

    const empresaActiva: string = empresaActivaRaw;

    // ================================================================
    // REFERENCIAS AL DOM
    // ================================================================

    const vistaTrabajadores = qs('#vista-trabajadores') as HTMLElement;
    const vistaEncuesta = qs('#vista-encuesta') as HTMLElement;
    const tbodyTrabajadores = qs('#tbody-trabajadores-peligros') as HTMLElement;
    const buscarInput = qs('#buscar-trabajador-peligros') as HTMLInputElement;
    const formEncuesta = qs('#form-encuesta-peligros') as HTMLFormElement;
    const encuestaTitulo = qs('#encuesta-titulo') as HTMLElement;
    const encuestaTrabajadorInfo = qs('#encuesta-trabajador-info') as HTMLElement;
    const mensajeEncuesta = qs('#mensaje-encuesta-peligros') as HTMLElement;
    const btnGuardarEncuesta = qs('#btn-guardar-encuesta') as HTMLButtonElement;
    const btnCancelarEncuesta = qs('#btn-cancelar-encuesta') as HTMLButtonElement;

    // Verificar elementos esenciales
    if (!vistaTrabajadores || !vistaEncuesta || !tbodyTrabajadores || !formEncuesta) {
        console.error('❌ M12: No se encontraron los elementos del DOM.');
        return;
    }

    // ================================================================
    // ESTADO INTERNO
    // ================================================================

    let modoEdicion: boolean = false; // true = editar, false = solo lectura
    let trabajadorActualId: string = '';

    // ================================================================
    // FUNCIONES DE UI
    // ================================================================

    /**
     * Muestra la vista de trabajadores y oculta la encuesta.
     */
    function mostrarVistaTrabajadores(): void {
        vistaTrabajadores.classList.remove('hidden');
        vistaEncuesta.classList.add('hidden');
        renderizarTrabajadores();
    }

    /**
     * Muestra la vista de encuesta y oculta la de trabajadores.
     */
    function mostrarVistaEncuesta(): void {
        vistaTrabajadores.classList.add('hidden');
        vistaEncuesta.classList.remove('hidden');
    }

    /**
     * Muestra un mensaje de alerta.
     */
    function mostrarMensaje(msg: string, tipo: 'success' | 'error'): void {
        if (!mensajeEncuesta) return;
        mensajeEncuesta.textContent = msg;
        mensajeEncuesta.className = `alert ${tipo}`;
        mensajeEncuesta.style.display = 'block';
        setTimeout(() => { mensajeEncuesta.style.display = 'none'; }, 4000);
    }

    /**
     * Obtiene el estado de un trabajador.
     */
    function getEstadoTrabajador(t: ISociodemografico): EstadoTrabajador {
        return t.estadoTrabajador || (t.fechaRetiro ? 'Retirado' : 'Activo');
    }

    /**
     * Obtiene los trabajadores activos de la empresa actual.
     */
    function obtenerTrabajadoresActivos(): ISociodemografico[] {
        return storageTrabajadores.obtenerTodos()
            .filter(t => t.empresaId === empresaActiva)
            .filter(t => getEstadoTrabajador(t) === 'Activo');
    }

    /**
     * Busca si un trabajador ya tiene encuesta aplicada.
     */
    function obtenerReportePorTrabajador(trabajadorId: string): IReportePeligro | null {
        const reportes = storageReportesPeligro.obtenerTodos()
            .filter(r => r.empresaId === empresaActiva && r.trabajadorId === trabajadorId);
        return reportes.length > 0 ? reportes[0] : null;
    }

    // ================================================================
    // VISTA 1: LISTADO DE TRABAJADORES
    // ================================================================

    function renderizarTrabajadores(): void {
        const busqueda = buscarInput?.value.toLowerCase().trim() || '';
        let trabajadores = obtenerTrabajadoresActivos();

        if (busqueda) {
            trabajadores = trabajadores.filter(t =>
                t.id.includes(busqueda) || t.nombreCompleto.toLowerCase().includes(busqueda)
            );
        }

        if (trabajadores.length === 0) {
            tbodyTrabajadores.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No hay trabajadores activos registrados.</td></tr>`;
            return;
        }

        tbodyTrabajadores.innerHTML = trabajadores.map(t => {
            const reporte = obtenerReportePorTrabajador(t.id);
            const tieneEncuesta = reporte !== null;

            // Columna "Encuesta Aplicada"
            const encuestaHTML = tieneEncuesta
                ? `<span class="badge badge-success">✅ Sí</span>`
                : `<span class="badge badge-danger">❌ No</span>`;

            // Columna "Acciones"
            let accionesHTML = '—';
            if (!esRolEmpresa) {
                if (tieneEncuesta) {
                    // Ver + Editar
                    accionesHTML = `
                        <div class="actions-cell">
                            <button class="btn btn-sm btn-outline btn-ver-encuesta" data-id="${escaparHTML(t.id)}" title="Ver encuesta">👁️</button>
                            <button class="btn btn-sm btn-outline btn-editar-encuesta" data-id="${escaparHTML(t.id)}" title="Editar encuesta">✏️</button>
                        </div>
                    `;
                } else {
                    // Aplicar
                    accionesHTML = `
                        <div class="actions-cell">
                            <button class="btn btn-sm btn-primary btn-aplicar-encuesta" data-id="${escaparHTML(t.id)}" title="Aplicar encuesta">📝 Aplicar</button>
                        </div>
                    `;
                }
            }

            return `
                <tr>
                    <td>${escaparHTML(t.id)}</td>
                    <td>${escaparHTML(t.nombreCompleto)}</td>
                    <td>${encuestaHTML}</td>
                    <td>${accionesHTML}</td>
                </tr>
            `;
        }).join('');

        asignarEventosTabla();
    }

    function asignarEventosTabla(): void {
        // Botón "Aplicar Encuesta"
        tbodyTrabajadores.querySelectorAll('.btn-aplicar-encuesta').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) aplicarEncuesta(id);
            });
        });

        // Botón "Ver Encuesta"
        tbodyTrabajadores.querySelectorAll('.btn-ver-encuesta').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) verEncuesta(id);
            });
        });

        // Botón "Editar Encuesta"
        tbodyTrabajadores.querySelectorAll('.btn-editar-encuesta').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) editarEncuesta(id);
            });
        });
    }

    // ================================================================
    // VISTA 2: FORMULARIO DE ENCUESTA
    // ================================================================

    /**
     * Llena los datos generales del trabajador en el formulario.
     */
    function llenarDatosGenerales(trabajador: ISociodemografico): void {
        const set = (sel: string, val: string) => {
            const el = qs(sel) as HTMLInputElement | null;
            if (el) el.value = val;
        };

        set('#encuesta-trabajador-id', trabajador.id);
        set('#encuesta-nombre', trabajador.nombreCompleto);
        set('#encuesta-cedula', trabajador.id);
        set('#encuesta-cargo', trabajador.oficio || '');
        set('#encuesta-area', '');
        set('#encuesta-antiguedad', trabajador.antiguedadOficio || '');
    }

    /**
     * Llena las 28 respuestas de la encuesta desde un reporte existente.
     */
    function llenarRespuestas(reporte: IReportePeligro): void {
        PREGUNTAS.forEach(preguntaId => {
            const respuesta = reporte.respuestas[preguntaId];
            if (!respuesta) return;

            // Marcar radio
            const radioSi = qs(`input[name="p${preguntaId}"][value="si"]`) as HTMLInputElement | null;
            const radioNo = qs(`input[name="p${preguntaId}"][value="no"]`) as HTMLInputElement | null;
            if (radioSi) radioSi.checked = respuesta.si === true;
            if (radioNo) radioNo.checked = respuesta.si === false;

            // Descripción
            const descripcion = qs(`#desc-${preguntaId}`) as HTMLTextAreaElement | null;
            if (descripcion) descripcion.value = respuesta.descripcion || '';

            // Extra (si aplica)
            if (PREGUNTAS_CON_EXTRA.includes(preguntaId)) {
                const extra = qs(`#extra-${preguntaId}`) as HTMLInputElement | null;
                if (extra) extra.value = respuesta.extra || '';
            }

            // Mostrar/ocultar descripción
            const preguntaItem = qs(`.pregunta-item[data-pregunta="${preguntaId}"]`) as HTMLElement | null;
            const descDiv = preguntaItem?.querySelector('.pregunta-descripcion') as HTMLElement | null;
            if (descDiv) {
                if (respuesta.si === true) {
                    descDiv.classList.remove('hidden');
                } else {
                    descDiv.classList.add('hidden');
                }
            }
        });
    }

    /**
     * Activa o desactiva el modo lectura.
     */
    function setModoLectura(soloLectura: boolean): void {
        // Radios, textareas e inputs
        const elementos = formEncuesta.querySelectorAll('input, textarea, select');
        elementos.forEach(el => {
            (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).disabled = soloLectura;
        });

        // Botón guardar
        if (btnGuardarEncuesta) {
            btnGuardarEncuesta.style.display = soloLectura ? 'none' : 'inline-block';
        }
    }

    /**
     * Limpia el formulario.
     */
    function limpiarFormularioEncuesta(): void {
        formEncuesta.reset();
        const idInput = qs('#encuesta-trabajador-id') as HTMLInputElement | null;
        const reporteIdInput = qs('#encuesta-reporte-id') as HTMLInputElement | null;
        if (idInput) idInput.value = '';
        if (reporteIdInput) reporteIdInput.value = '';

        // Ocultar todas las descripciones
        formEncuesta.querySelectorAll('.pregunta-descripcion').forEach(div => {
            div.classList.add('hidden');
        });
    }

    // ================================================================
    // ACCIONES DE LA ENCUESTA
    // ================================================================

    /**
     * Aplica una encuesta nueva a un trabajador.
     */
    function aplicarEncuesta(trabajadorId: string): void {
        const trabajador = storageTrabajadores.obtenerPorId(trabajadorId);
        if (!trabajador) {
            alert('Trabajador no encontrado.');
            return;
        }

        // Verificar que no tenga encuesta ya
        const reporteExistente = obtenerReportePorTrabajador(trabajadorId);
        if (reporteExistente) {
            alert('Este trabajador ya tiene una encuesta aplicada.');
            return;
        }

        modoEdicion = true;
        trabajadorActualId = trabajadorId;

        // Limpiar formulario
        limpiarFormularioEncuesta();

        // Llenar datos generales
        llenarDatosGenerales(trabajador);

        // Actualizar título e info
        if (encuestaTitulo) encuestaTitulo.textContent = 'Nueva Encuesta de Auto-Reporte';
        if (encuestaTrabajadorInfo) encuestaTrabajadorInfo.textContent = `Trabajador: ${trabajador.nombreCompleto} (${trabajador.id})`;

        // Modo edición (no solo lectura)
        setModoLectura(false);

        // Mostrar vista
        mostrarVistaEncuesta();
    }

    /**
     * Ver una encuesta existente en modo lectura.
     */
    function verEncuesta(trabajadorId: string): void {
        const trabajador = storageTrabajadores.obtenerPorId(trabajadorId);
        if (!trabajador) {
            alert('Trabajador no encontrado.');
            return;
        }

        const reporte = obtenerReportePorTrabajador(trabajadorId);
        if (!reporte) {
            alert('Este trabajador no tiene encuesta aplicada.');
            return;
        }

        modoEdicion = false;
        trabajadorActualId = trabajadorId;

        // Limpiar formulario
        limpiarFormularioEncuesta();

        // Llenar datos generales
        llenarDatosGenerales(trabajador);

        // Llenar ID del reporte
        const reporteIdInput = qs('#encuesta-reporte-id') as HTMLInputElement | null;
        if (reporteIdInput) reporteIdInput.value = reporte.id;

        // Llenar respuestas
        llenarRespuestas(reporte);

        // Actualizar título e info
        if (encuestaTitulo) encuestaTitulo.textContent = 'Ver Encuesta de Auto-Reporte';
        if (encuestaTrabajadorInfo) encuestaTrabajadorInfo.textContent = `Trabajador: ${trabajador.nombreCompleto} (${trabajador.id})`;

        // Modo lectura
        setModoLectura(true);

        // Mostrar vista
        mostrarVistaEncuesta();
    }

    /**
     * Editar una encuesta existente.
     */
    function editarEncuesta(trabajadorId: string): void {
        const trabajador = storageTrabajadores.obtenerPorId(trabajadorId);
        if (!trabajador) {
            alert('Trabajador no encontrado.');
            return;
        }

        const reporte = obtenerReportePorTrabajador(trabajadorId);
        if (!reporte) {
            alert('Este trabajador no tiene encuesta aplicada.');
            return;
        }

        modoEdicion = true;
        trabajadorActualId = trabajadorId;

        // Limpiar formulario
        limpiarFormularioEncuesta();

        // Llenar datos generales
        llenarDatosGenerales(trabajador);

        // Llenar ID del reporte
        const reporteIdInput = qs('#encuesta-reporte-id') as HTMLInputElement | null;
        if (reporteIdInput) reporteIdInput.value = reporte.id;

        // Llenar respuestas
        llenarRespuestas(reporte);

        // Actualizar título e info
        if (encuestaTitulo) encuestaTitulo.textContent = 'Editar Encuesta de Auto-Reporte';
        if (encuestaTrabajadorInfo) encuestaTrabajadorInfo.textContent = `Trabajador: ${trabajador.nombreCompleto} (${trabajador.id})`;

        // Modo edición
        setModoLectura(false);

        // Mostrar vista
        mostrarVistaEncuesta();
    }

    /**
     * Guarda (crea o actualiza) la encuesta.
     */
    function guardarEncuesta(event: Event): void {
        event.preventDefault();

        if (!modoEdicion) {
            mostrarMensaje('No está en modo edición.', 'error');
            return;
        }

        // Validar campos generales
        const nombre = (qs('#encuesta-nombre') as HTMLInputElement).value.trim();
        const cargo = (qs('#encuesta-cargo') as HTMLInputElement).value.trim();
        const area = (qs('#encuesta-area') as HTMLInputElement).value.trim();
        const antiguedad = (qs('#encuesta-antiguedad') as HTMLInputElement).value.trim();

        if (!validarRequerido(nombre) || !validarRequerido(cargo) || !validarRequerido(area) || !validarRequerido(antiguedad)) {
            mostrarMensaje('Todos los campos de datos generales son obligatorios.', 'error');
            return;
        }

        // Recopilar respuestas
        const respuestas: Record<PreguntaPeligroId, IRespuestaPeligro> = {} as Record<PreguntaPeligroId, IRespuestaPeligro>;
        let validacionOk = true;

        PREGUNTAS.forEach(preguntaId => {
            const radioSi = qs(`input[name="p${preguntaId}"][value="si"]`) as HTMLInputElement | null;
            const radioNo = qs(`input[name="p${preguntaId}"][value="no"]`) as HTMLInputElement | null;

            let si = false;
            if (radioSi?.checked) si = true;
            else if (radioNo?.checked) si = false;
            else {
                // No hay respuesta
                validacionOk = false;
            }

            const descripcion = (qs(`#desc-${preguntaId}`) as HTMLTextAreaElement | null)?.value.trim() || '';
            const extra = PREGUNTAS_CON_EXTRA.includes(preguntaId)
                ? ((qs(`#extra-${preguntaId}`) as HTMLInputElement | null)?.value.trim() || '')
                : undefined;

            respuestas[preguntaId] = {
                si,
                descripcion,
                extra: extra || undefined
            };
        });

        if (!validacionOk) {
            mostrarMensaje('Por favor responda todas las preguntas (Sí/No).', 'error');
            return;
        }

        // Buscar si existe el reporte (editar) o crear uno nuevo
        const reporteIdInput = qs('#encuesta-reporte-id') as HTMLInputElement | null;
        const reporteId = reporteIdInput?.value || '';
        const trabajador = storageTrabajadores.obtenerPorId(trabajadorActualId);

        if (!trabajador) {
            mostrarMensaje('Trabajador no encontrado.', 'error');
            return;
        }

        if (reporteId) {
            // Actualizar existente
            const exito = storageReportesPeligro.actualizar(reporteId, {
                nombreApellidos: nombre,
                cedula: trabajador.id,
                cargo,
                areaSeccion: area,
                antiguedadCargo: antiguedad,
                respuestas,
                fechaActualizacion: new Date()
            });
            if (exito) {
                mostrarMensaje('Encuesta actualizada correctamente.', 'success');
                setTimeout(() => mostrarVistaTrabajadores(), 1500);
            } else {
                mostrarMensaje('Error al actualizar la encuesta.', 'error');
            }
        } else {
            // Crear nuevo
            const nuevoReporte: IReportePeligro = {
                id: generarIdUnico(),
                empresaId: empresaActiva,
                trabajadorId: trabajador.id,
                nombreApellidos: nombre,
                cedula: trabajador.id,
                cargo,
                areaSeccion: area,
                antiguedadCargo: antiguedad,
                respuestas,
                peligroId: null,
                estadoReporte: 'Pendiente' as EstadoReportePeligro,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            };

            const exito = storageReportesPeligro.guardar(nuevoReporte);
            if (exito) {
                mostrarMensaje('Encuesta aplicada correctamente.', 'success');
                setTimeout(() => mostrarVistaTrabajadores(), 1500);
            } else {
                mostrarMensaje('Error al guardar la encuesta.', 'error');
            }
        }
    }

    /**
     * Cancela la encuesta y vuelve al listado.
     */
    function cancelarEncuesta(): void {
        if (confirm('¿Está seguro de cancelar? Los cambios no guardados se perderán.')) {
            limpiarFormularioEncuesta();
            mostrarVistaTrabajadores();
        }
    }

    // ================================================================
    // EVENTOS DE MOSTRAR/OCULTAR DESCRIPCIONES
    // ================================================================

    /**
     * Configura los eventos para mostrar/ocultar las descripciones
     * según se seleccione "Sí" en cada pregunta.
     */
    function configurarEventosPreguntas(): void {
        PREGUNTAS.forEach(preguntaId => {
            const radioSi = qs(`input[name="p${preguntaId}"][value="si"]`) as HTMLInputElement | null;
            const radioNo = qs(`input[name="p${preguntaId}"][value="no"]`) as HTMLInputElement | null;

            const preguntaItem = qs(`.pregunta-item[data-pregunta="${preguntaId}"]`) as HTMLElement | null;
            const descDiv = preguntaItem?.querySelector('.pregunta-descripcion') as HTMLElement | null;

            if (radioSi && descDiv) {
                radioSi.addEventListener('change', () => {
                    if (radioSi.checked) {
                        descDiv.classList.remove('hidden');
                    }
                });
            }
            if (radioNo && descDiv) {
                radioNo.addEventListener('change', () => {
                    if (radioNo.checked) {
                        descDiv.classList.add('hidden');
                    }
                });
            }
        });
    }

    // ================================================================
    // INICIALIZACIÓN
    // ================================================================

    // Configurar eventos de preguntas
    configurarEventosPreguntas();

    // Configurar eventos de búsqueda
    if (buscarInput) {
        buscarInput.addEventListener('input', renderizarTrabajadores);
    }

    // Configurar submit del formulario
    formEncuesta.addEventListener('submit', guardarEncuesta);

    // Configurar botón cancelar
    if (btnCancelarEncuesta) {
        btnCancelarEncuesta.addEventListener('click', cancelarEncuesta);
    }

    // Renderizar vista inicial
    renderizarTrabajadores();

    console.info('✅ Módulo M12 – Gestión de Peligros inicializado.');
}