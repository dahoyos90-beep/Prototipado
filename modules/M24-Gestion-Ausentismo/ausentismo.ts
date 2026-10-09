/**
 * modules/M24-Gestion-Ausentismo/ausentismo.ts
 * 
 * Módulo de Gestión de Ausentismo (M24).
 * 
 * Funcionalidades:
 * - Pestaña Registro: CRUD de eventos de ausentismo (13 conceptos por horas).
 * - Pestaña Indicadores: cálculo del cierre mensual/anual + envío a M23.
 * - Pestaña Consolidado: consolidado anual de un año específico.
 * - Pestaña Estadísticas: Top 5 conceptos + distribución por área.
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (SG-SST)
 * - Resolución 0312 de 2019 (indicadores mínimos)
 * - NTC 3793 (ausentismo laboral)
 * 
 * @version 1.1.0
 *  - Fix SST: agregado concepto EL (Enfermedad Laboral).
 *  - Fix: modo Mes/Año en Indicadores y Estadísticas.
 *  - Fix: Consolidado usa generarCierresDesdeEventos como fallback.
 *  - Fix: envío a M23 usa bloqueCausaMedica (no el bloqueLey inflado).
 *  - Fix: al enviar a M23 se actualiza cierreActual en memoria.
 *  - Fix: filtros aplicados (con botones Buscar/Limpiar) sin perder el
 *    filtrado reactivo por tecleo.
 * 
 * @version 1.0.2
 *  - Fix: eliminada línea redundante `evento.expideIncapacidad`.
 * 
 * @version 1.0.1
 *  - Fix: `tabButtonsNn` para preservar narrowing en closures.
 * 
 * @since 2026-10-08
 */

import {
    storageEventosAusentismo,
    storageParametrosMes,
    storageCierresMensuales,
    storageConsolidadosAnuales
} from '../../src/storage.js';
import {
    qs,
    qsTipo,
    escaparHTML,
    formatearFecha,
    fechaActualISO,
    generarIdUnico
} from '../../src/utils.js';
import { validarRequerido } from '../../src/validators.js';
import {
    marcarModificado,
    limpiarModificado,
    ejecutarConAdvertencia
} from '../../src/advertencia-cambios.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';
import { mostrarToast } from '../../src/notificaciones-ui.js';
import {
    calcularEstadisticaMensual,
    calcularConsolidadoAnual,
    calcularTop5Conceptos,
    calcularDistribucionPorArea,
    calcularTotalesPorConcepto,
    generarCierresDesdeEventos,
    ETIQUETAS_CONCEPTOS,
    JORNADA_DIARIA_DEFAULT,
    enviarIndicadoresAM23
} from '../../src/ausentismo-utils.js';
import type { IEventoAusentismo } from '../../src/interfaces/IEventoAusentismo.js';
import type { IParametrosMes } from '../../src/interfaces/IParametrosMes.js';
import type { IEstadisticaMensual } from '../../src/interfaces/IEstadisticaMensual.js';
import type { IConsolidadoAnual } from '../../src/interfaces/IConsolidadoAnual.js';

// ================================================================
// CONSTANTES
// ================================================================

const CSS_LINK_ID = 'modulo-ausentismo-css';
const CSS_HREF = 'modules/M24-Gestion-Ausentismo/ausentismo.css';

/** Lista de los 13 códigos de concepto con el campo del formulario asociado. */
const CAMPOS_HORAS: ReadonlyArray<{
    codigo: keyof Pick<
        IEventoAusentismo,
        | 'horasEG' | 'horasAT' | 'horasEL' | 'horasLM' | 'horasLP'
        | 'horasLL' | 'horasLAC' | 'horasVAC' | 'horasLNR'
        | 'horasDP' | 'horasVM' | 'horasES' | 'horasCD'
    >;
    inputId: string;
}> = [
    { codigo: 'horasEG',  inputId: 'evento-horas-eg' },
    { codigo: 'horasAT',  inputId: 'evento-horas-at' },
    { codigo: 'horasEL',  inputId: 'evento-horas-el' },
    { codigo: 'horasLM',  inputId: 'evento-horas-lm' },
    { codigo: 'horasLP',  inputId: 'evento-horas-lp' },
    { codigo: 'horasLL',  inputId: 'evento-horas-ll' },
    { codigo: 'horasLAC', inputId: 'evento-horas-lac' },
    { codigo: 'horasVAC', inputId: 'evento-horas-vac' },
    { codigo: 'horasLNR', inputId: 'evento-horas-lnr' },
    { codigo: 'horasDP',  inputId: 'evento-horas-dp' },
    { codigo: 'horasVM',  inputId: 'evento-horas-vm' },
    { codigo: 'horasES',  inputId: 'evento-horas-es' },
    { codigo: 'horasCD',  inputId: 'evento-horas-cd' }
];

// ================================================================
// INICIALIZACIÓN DEL MÓDULO
// ================================================================

export function init(contenedor: HTMLElement): void {
    cargarCSSModulo();

    // ================================================================
    // REFERENCIAS AL DOM (frescas en cada init)
    // ================================================================

    const tabContainer = qs('#tab-container', contenedor);
    const tabButtons = tabContainer
        ? (tabContainer.querySelectorAll('.tab-button') as NodeListOf<HTMLButtonElement>)
        : null;

    const tabContents: Record<string, HTMLElement | null> = {
        registro: qsTipo<HTMLElement>('#tab-registro', contenedor),
        indicadores: qsTipo<HTMLElement>('#tab-indicadores', contenedor),
        consolidado: qsTipo<HTMLElement>('#tab-consolidado', contenedor),
        estadisticas: qsTipo<HTMLElement>('#tab-estadisticas', contenedor)
    };

    // --- Registro ---
    const tbodyEventos = qsTipo<HTMLElement>('#tbody-eventos', contenedor);
    const filtroPeriodo = qsTipo<HTMLInputElement>('#filtro-periodo', contenedor);
    const filtroArea = qsTipo<HTMLInputElement>('#filtro-area', contenedor);
    const filtroEmpleado = qsTipo<HTMLInputElement>('#filtro-empleado', contenedor);
    const btnBuscarEventos = qsTipo<HTMLButtonElement>('#btn-buscar-eventos', contenedor);
    const btnLimpiarFiltros = qsTipo<HTMLButtonElement>('#btn-limpiar-filtros', contenedor);
    const btnNuevoEvento = qsTipo<HTMLButtonElement>('#btn-nuevo-evento', contenedor);
    const mensajeRegistro = qsTipo<HTMLElement>('#mensaje-registro', contenedor);

    // --- Modal evento ---
    const modalEvento = qsTipo<HTMLElement>('#modal-evento', contenedor);
    const modalEventoTitulo = qsTipo<HTMLElement>('#modal-evento-titulo', contenedor);
    const formEvento = qsTipo<HTMLFormElement>('#form-evento', contenedor);
    const btnCancelarEvento = qsTipo<HTMLButtonElement>('#btn-cancelar-evento', contenedor);

    // --- Parámetros + indicadores ---
    const parametrosModo = qsTipo<HTMLSelectElement>('#parametros-modo', contenedor);
    const parametrosPeriodo = qsTipo<HTMLInputElement>('#parametros-periodo', contenedor);
    const parametrosAnio = qsTipo<HTMLInputElement>('#parametros-anio', contenedor);
    const parametrosAnioGroup = qsTipo<HTMLElement>('#parametros-anio-group', contenedor);
    const parametrosDiasMes = qsTipo<HTMLInputElement>('#parametros-dias-mes', contenedor);
    const parametrosEmpleados = qsTipo<HTMLInputElement>('#parametros-empleados', contenedor);
    const parametrosJornada = qsTipo<HTMLInputElement>('#parametros-jornada', contenedor);
    const btnCalcularCierre = qsTipo<HTMLButtonElement>('#btn-calcular-cierre', contenedor);
    const indicadoresContainer = qsTipo<HTMLElement>('#indicadores-container', contenedor);
    const btnEnviarM23 = qsTipo<HTMLButtonElement>('#btn-enviar-m23', contenedor);
    const mensajeParametros = qsTipo<HTMLElement>('#mensaje-parametros', contenedor);
    const mensajeEnvioM23 = qsTipo<HTMLElement>('#mensaje-envio-m23', contenedor);

    // --- Consolidado ---
    const consolidadoAnio = qsTipo<HTMLInputElement>('#consolidado-anio', contenedor);
    const btnGenerarConsolidado = qsTipo<HTMLButtonElement>('#btn-generar-consolidado', contenedor);
    const consolidadoContainer = qsTipo<HTMLElement>('#consolidado-container', contenedor);
    const mensajeConsolidado = qsTipo<HTMLElement>('#mensaje-consolidado', contenedor);

    // --- Estadísticas ---
    const estadisticasModo = qsTipo<HTMLSelectElement>('#estadisticas-modo', contenedor);
    const estadisticasPeriodo = qsTipo<HTMLInputElement>('#estadisticas-periodo', contenedor);
    const estadisticasAnio = qsTipo<HTMLInputElement>('#estadisticas-anio', contenedor);
    const estadisticasPeriodoGroup = qsTipo<HTMLElement>('#estadisticas-periodo-group', contenedor);
    const estadisticasAnioGroup = qsTipo<HTMLElement>('#estadisticas-anio-group', contenedor);
    const estadisticasArea = qsTipo<HTMLInputElement>('#estadisticas-area', contenedor);
    const btnGenerarEstadisticas = qsTipo<HTMLButtonElement>('#btn-generar-estadisticas', contenedor);
    const estadisticasContainer = qsTipo<HTMLElement>('#estadisticas-container', contenedor);
    const mensajeEstadisticas = qsTipo<HTMLElement>('#mensaje-estadisticas', contenedor);

    if (!tabContainer || !tabButtons || !tbodyEventos || !formEvento || !modalEvento) {
        console.error('❌ M24: No se encontraron los elementos esenciales del DOM.');
        return;
    }

    // ✅ Capturar narrowing para closures
    const tabButtonsNn: NodeListOf<HTMLButtonElement> = tabButtons;

    // ================================================================
    // ESTADO LOCAL DEL MÓDULO
    // ================================================================

    /** Cierre mensual calculado actualmente (modo mes). */
    let cierreActual: IEstadisticaMensual | null = null;

    /** Consolidado anual calculado actualmente (modo año). */
    let consolidadoActual: IConsolidadoAnual | null = null;

    /** Modo del cálculo de indicadores ("mes" | "anio"). */
    let modoIndicadores: 'mes' | 'anio' = 'mes';

    /** Filtros aplicados en el Registro. */
    let filtrosAplicados: { periodo: string; area: string; empleado: string } = {
        periodo: '',
        area: '',
        empleado: ''
    };

    // ================================================================
    // HELPERS
    // ================================================================

    function cargarCSSModulo(): void {
        if (!document.getElementById(CSS_LINK_ID)) {
            const link = document.createElement('link');
            link.id = CSS_LINK_ID;
            link.rel = 'stylesheet';
            link.href = CSS_HREF;
            document.head.appendChild(link);
        }
    }

    function mostrarMensaje(
        elemento: HTMLElement | null,
        mensaje: string,
        tipo: 'success' | 'error'
    ): void {
        if (!elemento) return;
        elemento.textContent = mensaje;
        elemento.className = `alert ${tipo}`;
        elemento.style.display = 'block';
        window.setTimeout(() => {
            elemento.style.display = 'none';
        }, 4000);
    }

    function limpiarMensaje(elemento: HTMLElement | null): void {
        if (!elemento) return;
        elemento.style.display = 'none';
        elemento.textContent = '';
    }

    function obtenerNitActivo(): string {
        const nit = obtenerEmpresaActiva();
        return nit || '';
    }

    // ================================================================
    // GESTIÓN DE PESTAÑAS
    // ================================================================

    function mostrarPestana(tabId: string): void {
        Object.values(tabContents).forEach(el => {
            if (el) el.classList.add('hidden');
        });
        const target = tabContents[tabId];
        if (target) target.classList.remove('hidden');

        tabButtonsNn.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabId) btn.classList.add('active');
        });

        if (tabId === 'registro') renderizarEventos();
        if (tabId === 'indicadores') precargarParametros();
        if (tabId === 'consolidado' && consolidadoAnio && !consolidadoAnio.value) {
            consolidadoAnio.value = String(new Date().getFullYear());
        }
        if (tabId === 'estadisticas') {
            if (estadisticasPeriodo && !estadisticasPeriodo.value) {
                estadisticasPeriodo.value = fechaActualISO().substring(0, 7);
            }
            if (estadisticasAnio && !estadisticasAnio.value) {
                estadisticasAnio.value = String(new Date().getFullYear());
            }
        }
    }

    tabButtonsNn.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            if (tabId) mostrarPestana(tabId);
        });
    });

    // ================================================================
    // FORMULARIO DEL EVENTO — Lectura y escritura
    // ================================================================

    function leerHorasDesdeFormulario(contexto: HTMLElement): Pick<
        IEventoAusentismo,
        | 'horasEG' | 'horasAT' | 'horasEL' | 'horasLM' | 'horasLP'
        | 'horasLL' | 'horasLAC' | 'horasVAC' | 'horasLNR'
        | 'horasDP' | 'horasVM' | 'horasES' | 'horasCD'
    > {
        const resultado: Record<string, number> = {};
        CAMPOS_HORAS.forEach(campo => {
            const input = qsTipo<HTMLInputElement>(`#${campo.inputId}`, contexto);
            const valor = input ? Number(input.value) : 0;
            resultado[campo.codigo] = isNaN(valor) || valor < 0 ? 0 : valor;
        });
        return resultado as Pick<
            IEventoAusentismo,
            | 'horasEG' | 'horasAT' | 'horasEL' | 'horasLM' | 'horasLP'
            | 'horasLL' | 'horasLAC' | 'horasVAC' | 'horasLNR'
            | 'horasDP' | 'horasVM' | 'horasES' | 'horasCD'
        >;
    }

    function escribirHorasEnFormulario(
        contexto: HTMLElement,
        evento: IEventoAusentismo
    ): void {
        CAMPOS_HORAS.forEach(campo => {
            const input = qsTipo<HTMLInputElement>(`#${campo.inputId}`, contexto);
            if (input) input.value = String(evento[campo.codigo] ?? 0);
        });
    }

    function construirEventoDesdeFormulario(contexto: HTMLElement): IEventoAusentismo | null {
        const fechaInicio = qsTipo<HTMLInputElement>('#evento-fecha-inicio', contexto)?.value || '';
        const fechaFin = qsTipo<HTMLInputElement>('#evento-fecha-fin', contexto)?.value || '';
        const nombre = qsTipo<HTMLInputElement>('#evento-nombre', contexto)?.value.trim() || '';
        const area = qsTipo<HTMLInputElement>('#evento-area', contexto)?.value.trim() || '';
        const soporteContingencia = qsTipo<HTMLInputElement>('#evento-soporte', contexto)?.value.trim() || '';
        const enfermedadCodigo = qsTipo<HTMLInputElement>('#evento-cie10', contexto)?.value.trim() || '';
        const entidadExpideIncapacidad = qsTipo<HTMLInputElement>('#evento-entidad', contexto)?.value.trim() || '';
        const otorgadoPor = qsTipo<HTMLInputElement>('#evento-otorgado', contexto)?.value.trim() || '';
        const observacionesRaw = qsTipo<HTMLTextAreaElement>('#evento-observaciones', contexto)?.value.trim() || '';

        const nit = obtenerNitActivo();
        if (!nit) {
            mostrarMensaje(mensajeRegistro, 'No hay empresa activa.', 'error');
            return null;
        }

        if (!validarRequerido(fechaInicio) || !validarRequerido(fechaFin) ||
            !validarRequerido(nombre) || !validarRequerido(area)) {
            mostrarMensaje(
                mensajeRegistro,
                'Los campos marcados con * son obligatorios.',
                'error'
            );
            return null;
        }

        if (fechaFin < fechaInicio) {
            mostrarMensaje(
                mensajeRegistro,
                'La fecha fin no puede ser anterior a la fecha inicio.',
                'error'
            );
            return null;
        }

        const horas = leerHorasDesdeFormulario(contexto);
        const idExistente = qsTipo<HTMLInputElement>('#evento-id', contexto)?.value || '';
        const eventoExistente = idExistente
            ? storageEventosAusentismo.obtenerPorId(idExistente)
            : null;

        const ahora = new Date();

        const evento: IEventoAusentismo = {
            id: idExistente || `AUS-${generarIdUnico().substring(0, 12)}`,
            empresaId: nit,
            fechaInicio,
            fechaFin,
            nombre,
            area,
            soporteContingencia,
            enfermedadCodigo,
            entidadExpideIncapacidad,
            otorgadoPor,
            observaciones: observacionesRaw || null,
            horasEG: horas.horasEG,
            horasAT: horas.horasAT,
            horasEL: horas.horasEL,
            horasLM: horas.horasLM,
            horasLP: horas.horasLP,
            horasLL: horas.horasLL,
            horasLAC: horas.horasLAC,
            horasVAC: horas.horasVAC,
            horasLNR: horas.horasLNR,
            horasDP: horas.horasDP,
            horasVM: horas.horasVM,
            horasES: horas.horasES,
            horasCD: horas.horasCD,
            fechaCreacion: eventoExistente ? eventoExistente.fechaCreacion : ahora,
            fechaActualizacion: ahora
        };

        return evento;
    }

    function limpiarFormularioEvento(contexto: HTMLElement): void {
        formEvento?.reset();
        const idInput = qsTipo<HTMLInputElement>('#evento-id', contexto);
        if (idInput) idInput.value = '';
        CAMPOS_HORAS.forEach(campo => {
            const input = qsTipo<HTMLInputElement>(`#${campo.inputId}`, contexto);
            if (input) input.value = '0';
        });
        if (modalEventoTitulo) modalEventoTitulo.textContent = 'Nuevo Evento de Ausentismo';
        limpiarModificado();
    }

    function cargarEventoEnFormulario(contexto: HTMLElement, evento: IEventoAusentismo): void {
        const idInput = qsTipo<HTMLInputElement>('#evento-id', contexto);
        if (idInput) idInput.value = evento.id;

        const setV = (sel: string, val: string): void => {
            const el = qsTipo<HTMLInputElement>(sel, contexto);
            if (el) el.value = val;
        };
        const setTa = (sel: string, val: string): void => {
            const el = qsTipo<HTMLTextAreaElement>(sel, contexto);
            if (el) el.value = val;
        };

        setV('#evento-fecha-inicio', evento.fechaInicio);
        setV('#evento-fecha-fin', evento.fechaFin);
        setV('#evento-nombre', evento.nombre);
        setV('#evento-area', evento.area);
        setV('#evento-soporte', evento.soporteContingencia);
        setV('#evento-cie10', evento.enfermedadCodigo);
        setV('#evento-entidad', evento.entidadExpideIncapacidad);
        setV('#evento-otorgado', evento.otorgadoPor);
        setTa('#evento-observaciones', evento.observaciones || '');

        escribirHorasEnFormulario(contexto, evento);

        if (modalEventoTitulo) modalEventoTitulo.textContent = 'Editar Evento de Ausentismo';
    }

    // ================================================================
    // MODAL DEL EVENTO
    // ================================================================

    function abrirModal(): void {
        if (modalEvento) modalEvento.classList.remove('hidden');
        marcarModificado();
    }

    function cerrarModal(): void {
        if (modalEvento) modalEvento.classList.add('hidden');
        limpiarModificado();
    }

    // ================================================================
    // CRUD DE EVENTOS
    // ================================================================

    function renderizarEventos(): void {
        const nit = obtenerNitActivo();
        if (!nit) {
            if (tbodyEventos) {
                tbodyEventos.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay empresa activa.</td></tr>`;
            }
            return;
        }

        let eventos = storageEventosAusentismo.obtenerTodos().filter(e => e.empresaId === nit);

        const periodoFiltro = filtrosAplicados.periodo;
        const areaFiltro = filtrosAplicados.area;
        const empleadoFiltro = filtrosAplicados.empleado;

        if (periodoFiltro) {
            eventos = eventos.filter(e => e.fechaInicio.startsWith(periodoFiltro));
        }
        if (areaFiltro) {
            eventos = eventos.filter(e => e.area.toLowerCase().includes(areaFiltro));
        }
        if (empleadoFiltro) {
            eventos = eventos.filter(e =>
                e.nombre.toLowerCase().includes(empleadoFiltro) ||
                e.enfermedadCodigo.toLowerCase().includes(empleadoFiltro)
            );
        }

        eventos.sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));

        if (!tbodyEventos) return;

        if (eventos.length === 0) {
            tbodyEventos.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay eventos registrados.</td></tr>`;
            return;
        }

        tbodyEventos.innerHTML = eventos.map(e => {
            const totalHoras =
                (e.horasEG || 0) + (e.horasAT || 0) + (e.horasEL || 0) +
                (e.horasLM || 0) + (e.horasLP || 0) + (e.horasLL || 0) +
                (e.horasLAC || 0) + (e.horasVAC || 0) + (e.horasLNR || 0) +
                (e.horasDP || 0) + (e.horasVM || 0) + (e.horasES || 0) +
                (e.horasCD || 0);

            return `
                <tr>
                    <td>${escaparHTML(formatearFecha(e.fechaInicio, 'corta'))}</td>
                    <td>${escaparHTML(formatearFecha(e.fechaFin, 'corta'))}</td>
                    <td>${escaparHTML(e.nombre)}</td>
                    <td>${escaparHTML(e.area)}</td>
                    <td>${escaparHTML(e.enfermedadCodigo)}</td>
                    <td class="text-right">${totalHoras.toFixed(2)}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn btn-sm btn-outline btn-editar-evento" data-id="${escaparHTML(e.id)}">✏️</button>
                            <button class="btn btn-sm btn-danger btn-eliminar-evento" data-id="${escaparHTML(e.id)}">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbodyEventos.querySelectorAll('.btn-editar-evento').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) abrirEditarEvento(id);
            });
        });

        tbodyEventos.querySelectorAll('.btn-eliminar-evento').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) eliminarEvento(id);
            });
        });
    }

    function abrirNuevoEvento(): void {
        if (!modalEvento) return;
        limpiarFormularioEvento(modalEvento);
        if (modalEventoTitulo) modalEventoTitulo.textContent = 'Nuevo Evento de Ausentismo';
        abrirModal();
    }

    function abrirEditarEvento(id: string): void {
        const evento = storageEventosAusentismo.obtenerPorId(id);
        if (!evento) {
            mostrarMensaje(mensajeRegistro, 'Evento no encontrado.', 'error');
            return;
        }
        if (!modalEvento) return;
        limpiarFormularioEvento(modalEvento);
        cargarEventoEnFormulario(modalEvento, evento);
        abrirModal();
    }

    function eliminarEvento(id: string): void {
        if (!confirm('¿Eliminar este evento de ausentismo?')) return;
        const ok = storageEventosAusentismo.eliminar(id);
        if (ok) {
            mostrarMensaje(mensajeRegistro, 'Evento eliminado.', 'success');
            renderizarEventos();
        } else {
            mostrarMensaje(mensajeRegistro, 'Error al eliminar el evento.', 'error');
        }
    }

    function onSubmitEvento(event: Event): void {
        event.preventDefault();
        if (!modalEvento) return;

        const evento = construirEventoDesdeFormulario(modalEvento);
        if (!evento) return;

        const idExistente = qsTipo<HTMLInputElement>('#evento-id', modalEvento)?.value || '';
        let ok: boolean;
        if (idExistente) {
            ok = storageEventosAusentismo.actualizar(idExistente, evento);
        } else {
            ok = storageEventosAusentismo.guardar(evento);
        }

        if (ok) {
            mostrarMensaje(mensajeRegistro, 'Evento guardado correctamente.', 'success');
            cerrarModal();
            renderizarEventos();
        } else {
            mostrarMensaje(mensajeRegistro, 'Error al guardar el evento.', 'error');
        }
    }

    // ================================================================
    // FILTROS APLICADOS (con botones)
    // ================================================================

    function aplicarFiltros(): void {
        filtrosAplicados = {
            periodo: filtroPeriodo?.value || '',
            area: (filtroArea?.value || '').trim().toLowerCase(),
            empleado: (filtroEmpleado?.value || '').trim().toLowerCase()
        };
        renderizarEventos();
    }

    function limpiarFiltros(): void {
        if (filtroPeriodo) filtroPeriodo.value = '';
        if (filtroArea) filtroArea.value = '';
        if (filtroEmpleado) filtroEmpleado.value = '';
        filtrosAplicados = { periodo: '', area: '', empleado: '' };
        renderizarEventos();
    }

    // ================================================================
    // INDICADORES / CIERRE (MES / AÑO)
    // ================================================================

    function actualizarVisibilidadModo(): void {
        const modo = (parametrosModo?.value || 'mes') as 'mes' | 'anio';
        modoIndicadores = modo;

        if (parametrosAnioGroup) {
            if (modo === 'anio') parametrosAnioGroup.classList.remove('hidden');
            else parametrosAnioGroup.classList.add('hidden');
        }
    }

    function precargarParametros(): void {
        actualizarVisibilidadModo();

        if (!parametrosPeriodo || !parametrosDiasMes || !parametrosEmpleados) return;

        if (!parametrosPeriodo.value) {
            const periodo = (filtroPeriodo?.value) || fechaActualISO().substring(0, 7);
            parametrosPeriodo.value = periodo;
        }

        const nit = obtenerNitActivo();
        if (!nit) return;

        const existente = storageParametrosMes
            .obtenerTodos()
            .find(p => p.empresaId === nit && p.periodo === parametrosPeriodo?.value);

        if (existente) {
            parametrosDiasMes.value = String(existente.diasMes);
            parametrosEmpleados.value = String(existente.numEmpleados);
            if (parametrosJornada) parametrosJornada.value = String(existente.jornadaDiaria);
        }
    }

    function calcularCierre(): void {
        limpiarMensaje(mensajeParametros);
        actualizarVisibilidadModo();

        if (modoIndicadores === 'anio') {
            calcularCierreAnio();
        } else {
            calcularCierreMes();
        }
    }

    function calcularCierreMes(): void {
        const nit = obtenerNitActivo();
        if (!nit) {
            mostrarMensaje(mensajeParametros, 'No hay empresa activa.', 'error');
            return;
        }

        const periodo = parametrosPeriodo?.value || '';
        const diasMes = Number(parametrosDiasMes?.value || 0);
        const numEmpleados = Number(parametrosEmpleados?.value || 0);
        const jornadaDiaria = Number(parametrosJornada?.value || JORNADA_DIARIA_DEFAULT);

        if (!validarRequerido(periodo) || diasMes <= 0 || numEmpleados <= 0 || jornadaDiaria <= 0) {
            mostrarMensaje(
                mensajeParametros,
                'Complete todos los parámetros correctamente.',
                'error'
            );
            return;
        }

        const ahora = new Date();
        const parametrosExistente = storageParametrosMes
            .obtenerTodos()
            .find(p => p.empresaId === nit && p.periodo === periodo);

        const parametros: IParametrosMes = {
            id: parametrosExistente ? parametrosExistente.id : `PAR-${generarIdUnico().substring(0, 12)}`,
            empresaId: nit,
            periodo,
            diasMes,
            numEmpleados,
            jornadaDiaria,
            fechaCreacion: parametrosExistente ? parametrosExistente.fechaCreacion : ahora,
            fechaActualizacion: ahora
        };

        if (parametrosExistente) {
            storageParametrosMes.actualizar(parametros.id, parametros);
        } else {
            storageParametrosMes.guardar(parametros);
        }

        const eventosPeriodo = storageEventosAusentismo
            .obtenerTodos()
            .filter(e => e.empresaId === nit && e.fechaInicio.startsWith(periodo));

        const cierre = calcularEstadisticaMensual(eventosPeriodo, parametros);

        const cierreExistente = storageCierresMensuales
            .obtenerTodos()
            .find(c => c.empresaId === nit && c.periodo === periodo);

        if (cierreExistente) {
            cierre.id = cierreExistente.id;
            cierre.fechaCreacion = cierreExistente.fechaCreacion;
            cierre.estado = cierreExistente.estado;
            cierre.enviadoAM23 = cierreExistente.enviadoAM23;
            cierre.fechaEnvioM23 = cierreExistente.fechaEnvioM23;
            storageCierresMensuales.actualizar(cierre.id, cierre);
        } else {
            storageCierresMensuales.guardar(cierre);
        }

        cierreActual = cierre;
        consolidadoActual = null;
        renderizarIndicadores(cierre);
        if (btnEnviarM23) btnEnviarM23.disabled = false;

        mostrarMensaje(mensajeParametros, `Cierre de ${periodo} calculado correctamente.`, 'success');
    }

    function calcularCierreAnio(): void {
        const nit = obtenerNitActivo();
        if (!nit) {
            mostrarMensaje(mensajeParametros, 'No hay empresa activa.', 'error');
            return;
        }

        const anio = (parametrosAnio?.value || '').trim();
        if (!/^\d{4}$/.test(anio)) {
            mostrarMensaje(mensajeParametros, 'Ingrese un año válido (YYYY).', 'error');
            return;
        }

        // Cierres existentes del año
        let cierres = storageCierresMensuales
            .obtenerTodos()
            .filter(c => c.empresaId === nit && c.periodo.startsWith(anio));

        // Fallback: si no hay cierres, generarlos desde eventos
        if (cierres.length === 0) {
            const eventos = storageEventosAusentismo.obtenerTodos();
            const parametros = storageParametrosMes.obtenerTodos();
            cierres = generarCierresDesdeEventos(eventos, parametros, anio, nit);
        }

        if (cierres.length === 0) {
            mostrarMensaje(
                mensajeParametros,
                `No hay eventos ni cierres registrados para el año ${anio}.`,
                'error'
            );
            return;
        }

        const consolidado = calcularConsolidadoAnual(cierres, anio, nit);

        // Guardar / actualizar consolidado anual
        const existente = storageConsolidadosAnuales
            .obtenerTodos()
            .find(c => c.empresaId === nit && c.anio === anio);

        if (existente) {
            consolidado.id = existente.id;
            consolidado.fechaCreacion = existente.fechaCreacion;
            storageConsolidadosAnuales.actualizar(consolidado.id, consolidado);
        } else {
            storageConsolidadosAnuales.guardar(consolidado);
        }

        consolidadoActual = consolidado;
        cierreActual = null;
        renderizarIndicadoresAnio(consolidado);
        if (btnEnviarM23) btnEnviarM23.disabled = false;

        mostrarMensaje(mensajeParametros, `Consolidado del año ${anio} calculado correctamente.`, 'success');
    }

    // ================================================================
    // RENDERIZADO DE INDICADORES
    // ================================================================

    function renderizarIndicadores(cierre: IEstadisticaMensual): void {
        if (!indicadoresContainer) return;

        const totales = calcularTotalesPorConcepto(
            storageEventosAusentismo
                .obtenerTodos()
                .filter(e => e.empresaId === cierre.empresaId && e.fechaInicio.startsWith(cierre.periodo))
        );

        const filasDias = Object.entries(cierre.diasPorConcepto)
            .map(([codigo, valor]) => `
                <tr>
                    <td>${escaparHTML(codigo)} — ${escaparHTML(ETIQUETAS_CONCEPTOS[codigo as keyof typeof ETIQUETAS_CONCEPTOS] || codigo)}</td>
                    <td class="text-right">${valor.toFixed(2)}</td>
                </tr>
            `)
            .join('');

        const totalHorasPorConcepto = Object.entries(totales)
            .map(([codigo, valor]) => `
                <tr>
                    <td>${escaparHTML(codigo)} — ${escaparHTML(ETIQUETAS_CONCEPTOS[codigo as keyof typeof ETIQUETAS_CONCEPTOS] || codigo)}</td>
                    <td class="text-right">${valor.toFixed(2)} h</td>
                </tr>
            `)
            .join('');

        indicadoresContainer.innerHTML = `
            <div class="card">
                <h3>🏥 Bloque Ausentismo por Causa Médica (Indicador Res. 0312)</h3>
                <p class="text-muted" style="font-size:0.85rem; margin:0 0 0.75rem 0;">
                    Suma de EG + AT + EL + LM + LP. Este es el valor legal exigido por la Resolución 0312 de 2019.
                </p>
                <div class="bloque-indicadores bloque-causa-medica">
                    <div class="grid-indicadores">
                        <div class="indicador-item">
                            <span class="label">Total Horas</span>
                            <span class="value">${cierre.bloqueCausaMedica.totalHoras.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Total Días</span>
                            <span class="value">${cierre.bloqueCausaMedica.totalDias.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">DHM</span>
                            <span class="value">${cierre.bloqueCausaMedica.diasHombreMes.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Días Trabajados</span>
                            <span class="value">${cierre.bloqueCausaMedica.diasTrabajados.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">% Días Trabajados</span>
                            <span class="value">${cierre.bloqueCausaMedica.porcentajeDiasTrabajados.toFixed(2)}%</span>
                        </div>
                        <div class="indicador-item indicador-item-destacado">
                            <span class="label">% Ausentismo</span>
                            <span class="value">${cierre.bloqueCausaMedica.porcentajeAusentismo.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>📅 Ausentismo en Días (por concepto)</h3>
                <div class="stats-tabla-ausentismo">
                    <table>
                        <thead>
                            <tr><th>Concepto</th><th class="text-right">Días</th></tr>
                        </thead>
                        <tbody>${filasDias}</tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <h3>⚖️ Bloque Por Ley (informativo)</h3>
                <div class="bloque-indicadores">
                    <div class="grid-indicadores">
                        <div class="indicador-item">
                            <span class="label">Total Horas</span>
                            <span class="value">${cierre.bloqueLey.totalHoras.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Total Días</span>
                            <span class="value">${cierre.bloqueLey.totalDias.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">DHM</span>
                            <span class="value">${cierre.bloqueLey.diasHombreMes.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Días Trabajados</span>
                            <span class="value">${cierre.bloqueLey.diasTrabajados.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">% Días Trabajados</span>
                            <span class="value">${cierre.bloqueLey.porcentajeDiasTrabajados.toFixed(2)}%</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">% Ausentismo</span>
                            <span class="value">${cierre.bloqueLey.porcentajeAusentismo.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>📋 Bloque Permisos</h3>
                <div class="bloque-indicadores">
                    <div class="grid-indicadores">
                        <div class="indicador-item">
                            <span class="label">Total Horas</span>
                            <span class="value">${cierre.bloquePermisos.totalHoras.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Total Días</span>
                            <span class="value">${cierre.bloquePermisos.totalDias.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">DHM</span>
                            <span class="value">${cierre.bloquePermisos.diasHombreMes.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Días Trabajados</span>
                            <span class="value">${cierre.bloquePermisos.diasTrabajados.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">% Días Trabajados</span>
                            <span class="value">${cierre.bloquePermisos.porcentajeDiasTrabajados.toFixed(2)}%</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">% Ausentismo</span>
                            <span class="value">${cierre.bloquePermisos.porcentajeAusentismo.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>📊 Horas Totales por Concepto</h3>
                <div class="stats-tabla-ausentismo">
                    <table>
                        <thead>
                            <tr><th>Concepto</th><th class="text-right">Horas</th></tr>
                        </thead>
                        <tbody>${totalHorasPorConcepto}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderizarIndicadoresAnio(consolidado: IConsolidadoAnual): void {
        if (!indicadoresContainer) return;

        const totalesHoras = Object.entries(consolidado.horasTotalesPorConcepto)
            .map(([codigo, valor]) => `
                <tr>
                    <td>${escaparHTML(codigo)} — ${escaparHTML(ETIQUETAS_CONCEPTOS[codigo as keyof typeof ETIQUETAS_CONCEPTOS] || codigo)}</td>
                    <td class="text-right">${valor.toFixed(2)} h</td>
                </tr>
            `)
            .join('');

        indicadoresContainer.innerHTML = `
            <div class="card">
                <h3>🏥 Bloque Anual — Ausentismo por Causa Médica (Res. 0312)</h3>
                <p class="text-muted" style="font-size:0.85rem; margin:0 0 0.75rem 0;">
                    Suma anual de EG + AT + EL + LM + LP. ${consolidado.mesesConCierre} de 12 meses con cierre.
                </p>
                <div class="bloque-indicadores bloque-causa-medica">
                    <div class="grid-indicadores">
                        <div class="indicador-item">
                            <span class="label">Total Horas Año</span>
                            <span class="value">${consolidado.bloqueAnualCausaMedica.totalHorasAnio.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Total Días Año</span>
                            <span class="value">${consolidado.bloqueAnualCausaMedica.totalDiasAnio.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Prom. Horas/Mes</span>
                            <span class="value">${consolidado.bloqueAnualCausaMedica.promedioHorasMensuales.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Prom. Días/Mes</span>
                            <span class="value">${consolidado.bloqueAnualCausaMedica.promedioDiasMensuales.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Prom. % Ausent./Mes</span>
                            <span class="value">${consolidado.bloqueAnualCausaMedica.promedioAusentismoMensual.toFixed(2)}%</span>
                        </div>
                        <div class="indicador-item indicador-item-destacado">
                            <span class="label">% Ausentismo Anual</span>
                            <span class="value">${consolidado.bloqueAnualCausaMedica.porcentajeAusentismoAnual.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>⚖️ Bloque Anual Por Ley (informativo)</h3>
                <div class="bloque-indicadores">
                    <div class="grid-indicadores">
                        <div class="indicador-item">
                            <span class="label">Total Horas Año</span>
                            <span class="value">${consolidado.bloqueAnualLey.totalHorasAnio.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Total Días Año</span>
                            <span class="value">${consolidado.bloqueAnualLey.totalDiasAnio.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Prom. Horas/Mes</span>
                            <span class="value">${consolidado.bloqueAnualLey.promedioHorasMensuales.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Prom. Días/Mes</span>
                            <span class="value">${consolidado.bloqueAnualLey.promedioDiasMensuales.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Prom. % Ausent./Mes</span>
                            <span class="value">${consolidado.bloqueAnualLey.promedioAusentismoMensual.toFixed(2)}%</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">% Ausentismo Anual</span>
                            <span class="value">${consolidado.bloqueAnualLey.porcentajeAusentismoAnual.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>📋 Bloque Anual Permisos</h3>
                <div class="bloque-indicadores">
                    <div class="grid-indicadores">
                        <div class="indicador-item">
                            <span class="label">Total Horas Año</span>
                            <span class="value">${consolidado.bloqueAnualPermisos.totalHorasAnio.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Total Días Año</span>
                            <span class="value">${consolidado.bloqueAnualPermisos.totalDiasAnio.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Prom. Horas/Mes</span>
                            <span class="value">${consolidado.bloqueAnualPermisos.promedioHorasMensuales.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Prom. Días/Mes</span>
                            <span class="value">${consolidado.bloqueAnualPermisos.promedioDiasMensuales.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Prom. % Ausent./Mes</span>
                            <span class="value">${consolidado.bloqueAnualPermisos.promedioAusentismoMensual.toFixed(2)}%</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">% Ausentismo Anual</span>
                            <span class="value">${consolidado.bloqueAnualPermisos.porcentajeAusentismoAnual.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>📊 Horas Totales por Concepto (Año ${escaparHTML(consolidado.anio)})</h3>
                <div class="stats-tabla-ausentismo">
                    <table>
                        <thead>
                            <tr><th>Concepto</th><th class="text-right">Horas</th></tr>
                        </thead>
                        <tbody>${totalesHoras}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ================================================================
    // ENVÍO A M23
    // ================================================================

    function enviarM23(): void {
        limpiarMensaje(mensajeEnvioM23);

        if (modoIndicadores === 'mes') {
            if (!cierreActual) {
                mostrarMensaje(mensajeEnvioM23, 'Primero calcule el cierre mensual.', 'error');
                return;
            }

            const resultado = enviarIndicadoresAM23(cierreActual);

            if (resultado.exito) {
                const fecha = fechaActualISO();
                storageCierresMensuales.actualizar(cierreActual.id, {
                    enviadoAM23: true,
                    fechaEnvioM23: fecha
                });
                // ✅ Sincronizar el estado en memoria para evitar doble envío
                cierreActual = { ...cierreActual, enviadoAM23: true, fechaEnvioM23: fecha };
                if (btnEnviarM23) btnEnviarM23.disabled = true;

                mostrarMensaje(mensajeEnvioM23, resultado.mensaje, 'success');
                mostrarToast(resultado.mensaje, 'info');
            } else {
                mostrarMensaje(mensajeEnvioM23, resultado.mensaje, 'error');
            }
            return;
        }

        // Modo Año
        if (!consolidadoActual) {
            mostrarMensaje(mensajeEnvioM23, 'Primero calcule el consolidado anual.', 'error');
            return;
        }

        // Sintetizar un pseudo-cierre mensual con periodo = año
        const pseudoCierre: IEstadisticaMensual = {
            id: consolidadoActual.id,
            empresaId: consolidadoActual.empresaId,
            periodo: consolidadoActual.anio,
            parametros: {
                id: `PAR-ANUAL-${consolidadoActual.anio}`,
                empresaId: consolidadoActual.empresaId,
                periodo: consolidadoActual.anio,
                diasMes: 365,
                numEmpleados: 0,
                jornadaDiaria: JORNADA_DIARIA_DEFAULT,
                fechaCreacion: consolidadoActual.fechaCreacion,
                fechaActualizacion: consolidadoActual.fechaActualizacion
            },
            diasPorConcepto: {
                EG: consolidadoActual.diasTotalesPorConcepto.EG,
                AT: consolidadoActual.diasTotalesPorConcepto.AT,
                EL: consolidadoActual.diasTotalesPorConcepto.EL,
                LM: consolidadoActual.diasTotalesPorConcepto.LM,
                LP: consolidadoActual.diasTotalesPorConcepto.LP,
                LL: consolidadoActual.diasTotalesPorConcepto.LL,
                LAC: consolidadoActual.diasTotalesPorConcepto.LAC,
                VAC: consolidadoActual.diasTotalesPorConcepto.VAC,
                DP: consolidadoActual.diasTotalesPorConcepto.DP,
                VM: consolidadoActual.diasTotalesPorConcepto.VM,
                ES: consolidadoActual.diasTotalesPorConcepto.ES,
                CD: consolidadoActual.diasTotalesPorConcepto.CD
            },
            bloqueLey: {
                totalHoras: consolidadoActual.bloqueAnualLey.totalHorasAnio,
                totalDias: consolidadoActual.bloqueAnualLey.totalDiasAnio,
                diasHombreMes: 0,
                diasTrabajados: 0,
                porcentajeDiasTrabajados: 0,
                porcentajeAusentismo: consolidadoActual.bloqueAnualLey.porcentajeAusentismoAnual
            },
            horasLey: {
                EG: consolidadoActual.horasTotalesPorConcepto.EG,
                AT: consolidadoActual.horasTotalesPorConcepto.AT,
                EL: consolidadoActual.horasTotalesPorConcepto.EL,
                LM: consolidadoActual.horasTotalesPorConcepto.LM,
                LP: consolidadoActual.horasTotalesPorConcepto.LP,
                LL: consolidadoActual.horasTotalesPorConcepto.LL,
                LAC: consolidadoActual.horasTotalesPorConcepto.LAC,
                VAC: consolidadoActual.horasTotalesPorConcepto.VAC,
                LNR: consolidadoActual.horasTotalesPorConcepto.LNR
            },
            bloqueCausaMedica: {
                totalHoras: consolidadoActual.bloqueAnualCausaMedica.totalHorasAnio,
                totalDias: consolidadoActual.bloqueAnualCausaMedica.totalDiasAnio,
                diasHombreMes: 0,
                diasTrabajados: 0,
                porcentajeDiasTrabajados: 0,
                porcentajeAusentismo: consolidadoActual.bloqueAnualCausaMedica.porcentajeAusentismoAnual
            },
            horasCausaMedica: {
                EG: consolidadoActual.horasTotalesPorConcepto.EG,
                AT: consolidadoActual.horasTotalesPorConcepto.AT,
                EL: consolidadoActual.horasTotalesPorConcepto.EL,
                LM: consolidadoActual.horasTotalesPorConcepto.LM,
                LP: consolidadoActual.horasTotalesPorConcepto.LP
            },
            bloquePermisos: {
                totalHoras: consolidadoActual.bloqueAnualPermisos.totalHorasAnio,
                totalDias: consolidadoActual.bloqueAnualPermisos.totalDiasAnio,
                diasHombreMes: 0,
                diasTrabajados: 0,
                porcentajeDiasTrabajados: 0,
                porcentajeAusentismo: consolidadoActual.bloqueAnualPermisos.porcentajeAusentismoAnual
            },
            horasPermisos: {
                DP: consolidadoActual.horasTotalesPorConcepto.DP,
                VM: consolidadoActual.horasTotalesPorConcepto.VM,
                ES: consolidadoActual.horasTotalesPorConcepto.ES,
                CD: consolidadoActual.horasTotalesPorConcepto.CD
            },
            observaciones: null,
            elaboradoPor: '',
            estado: 'Cerrado',
            fechaCierre: fechaActualISO(),
            enviadoAM23: false,
            fechaEnvioM23: null,
            fechaCreacion: consolidadoActual.fechaCreacion,
            fechaActualizacion: new Date()
        };

        const resultado = enviarIndicadoresAM23(pseudoCierre);

        if (resultado.exito) {
            mostrarMensaje(mensajeEnvioM23, resultado.mensaje, 'success');
            mostrarToast(resultado.mensaje, 'info');
            if (btnEnviarM23) btnEnviarM23.disabled = true;
        } else {
            mostrarMensaje(mensajeEnvioM23, resultado.mensaje, 'error');
        }
    }

    // ================================================================
    // CONSOLIDADO ANUAL (pestaña)
    // ================================================================

    function generarConsolidado(): void {
        limpiarMensaje(mensajeConsolidado);

        const nit = obtenerNitActivo();
        if (!nit) {
            mostrarMensaje(mensajeConsolidado, 'No hay empresa activa.', 'error');
            return;
        }

        const anio = (consolidadoAnio?.value || '').trim();
        if (!/^\d{4}$/.test(anio)) {
            mostrarMensaje(mensajeConsolidado, 'Ingrese un año válido (YYYY).', 'error');
            return;
        }

        let cierres = storageCierresMensuales
            .obtenerTodos()
            .filter(c => c.empresaId === nit && c.periodo.startsWith(anio));

        // Fallback: si no hay cierres guardados, generarlos desde eventos
        if (cierres.length === 0) {
            const eventos = storageEventosAusentismo.obtenerTodos();
            const parametros = storageParametrosMes.obtenerTodos();
            cierres = generarCierresDesdeEventos(eventos, parametros, anio, nit);
        }

        if (cierres.length === 0) {
            mostrarMensaje(
                mensajeConsolidado,
                `No hay eventos ni cierres registrados para el año ${anio}.`,
                'error'
            );
            return;
        }

        const consolidado = calcularConsolidadoAnual(cierres, anio, nit);

        const existente = storageConsolidadosAnuales
            .obtenerTodos()
            .find(c => c.empresaId === nit && c.anio === anio);

        if (existente) {
            consolidado.id = existente.id;
            consolidado.fechaCreacion = existente.fechaCreacion;
            storageConsolidadosAnuales.actualizar(consolidado.id, consolidado);
        } else {
            storageConsolidadosAnuales.guardar(consolidado);
        }

        renderizarConsolidado(consolidado);
        mostrarMensaje(mensajeConsolidado, `Consolidado ${anio} generado con ${cierres.length} mes(es) de datos.`, 'success');
    }

    function renderizarConsolidado(consolidado: IConsolidadoAnual): void {
        if (!consolidadoContainer) return;

        const totalConceptos = Object.keys(consolidado.horasTotalesPorConcepto);

        const headerConceptos = totalConceptos
            .map(c => `<th>${escaparHTML(c)}</th>`)
            .join('');

        const filasMeses = consolidado.meses.map(m => {
            const celdas = totalConceptos
                .map(c => `<td>${(m.horasPorConcepto[c as keyof typeof m.horasPorConcepto] || 0).toFixed(2)}</td>`)
                .join('');
            return `
                <tr>
                    <td>${escaparHTML(m.nombreMes)}</td>
                    ${celdas}
                </tr>
            `;
        }).join('');

        const filaTotal = totalConceptos
            .map(c => `<td>${(consolidado.horasTotalesPorConcepto[c as keyof typeof consolidado.horasTotalesPorConcepto] || 0).toFixed(2)}</td>`)
            .join('');

        const top5Html = consolidado.top5Conceptos.map(t => `
            <tr>
                <td>${escaparHTML(t.etiqueta)}</td>
                <td class="text-right">${t.totalHoras.toFixed(2)} h</td>
                <td class="text-right">${t.porcentaje.toFixed(2)}%</td>
            </tr>
        `).join('');

        consolidadoContainer.innerHTML = `
            <div class="card">
                <h3>🏥 Bloque Anual — Causa Médica (Res. 0312)</h3>
                <div class="bloque-indicadores bloque-causa-medica">
                    <div class="grid-indicadores">
                        <div class="indicador-item">
                            <span class="label">Total Horas Año</span>
                            <span class="value">${consolidado.bloqueAnualCausaMedica.totalHorasAnio.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item">
                            <span class="label">Total Días Año</span>
                            <span class="value">${consolidado.bloqueAnualCausaMedica.totalDiasAnio.toFixed(2)}</span>
                        </div>
                        <div class="indicador-item indicador-item-destacado">
                            <span class="label">% Ausentismo Anual</span>
                            <span class="value">${consolidado.bloqueAnualCausaMedica.porcentajeAusentismoAnual.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>📈 Matriz ${escaparHTML(consolidado.anio)} — Horas por Mes y Concepto</h3>
                <div class="table-container">
                    <table class="tabla-matriz-anual">
                        <thead>
                            <tr>
                                <th>Mes</th>
                                ${headerConceptos}
                            </tr>
                        </thead>
                        <tbody>${filasMeses}</tbody>
                        <tfoot>
                            <tr>
                                <td>Total</td>
                                ${filaTotal}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div class="card">
                <h3>🏆 Top 5 Conceptos del Año</h3>
                <div class="stats-tabla-ausentismo">
                    <table>
                        <thead>
                            <tr>
                                <th>Concepto</th>
                                <th class="text-right">Horas</th>
                                <th class="text-right">%</th>
                            </tr>
                        </thead>
                        <tbody>${top5Html}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ================================================================
    // ESTADÍSTICAS (MES / AÑO)
    // ================================================================

    function actualizarVisibilidadEstadisticas(): void {
        const modo = (estadisticasModo?.value || 'mes') as 'mes' | 'anio';
        if (estadisticasPeriodoGroup) {
            if (modo === 'anio') estadisticasPeriodoGroup.classList.add('hidden');
            else estadisticasPeriodoGroup.classList.remove('hidden');
        }
        if (estadisticasAnioGroup) {
            if (modo === 'anio') estadisticasAnioGroup.classList.remove('hidden');
            else estadisticasAnioGroup.classList.add('hidden');
        }
    }

    function generarEstadisticas(): void {
        limpiarMensaje(mensajeEstadisticas);
        actualizarVisibilidadEstadisticas();

        const nit = obtenerNitActivo();
        if (!nit) {
            mostrarMensaje(mensajeEstadisticas, 'No hay empresa activa.', 'error');
            return;
        }

        const modo = (estadisticasModo?.value || 'mes') as 'mes' | 'anio';
        const areaFiltro = (estadisticasArea?.value || '').trim().toLowerCase();

        let eventos = storageEventosAusentismo
            .obtenerTodos()
            .filter(e => e.empresaId === nit);

        if (modo === 'mes') {
            const periodo = estadisticasPeriodo?.value || '';
            if (periodo) {
                eventos = eventos.filter(e => e.fechaInicio.startsWith(periodo));
            }
        } else {
            const anio = (estadisticasAnio?.value || '').trim();
            if (!/^\d{4}$/.test(anio)) {
                mostrarMensaje(mensajeEstadisticas, 'Ingrese un año válido (YYYY).', 'error');
                return;
            }
            eventos = eventos.filter(e => e.fechaInicio.startsWith(anio));
        }

        if (areaFiltro) {
            eventos = eventos.filter(e => e.area.toLowerCase().includes(areaFiltro));
        }

        if (eventos.length === 0) {
            if (estadisticasContainer) {
                estadisticasContainer.innerHTML = `<p class="text-muted">No hay eventos para los filtros seleccionados.</p>`;
            }
            return;
        }

        const totales = calcularTotalesPorConcepto(eventos);
        const top5 = calcularTop5Conceptos(totales);
        const distribucion = calcularDistribucionPorArea(eventos);

        const top5Html = top5.map(t => `
            <tr>
                <td>${escaparHTML(t.etiqueta)}</td>
                <td class="text-right">${t.totalHoras.toFixed(2)} h</td>
                <td class="text-right">${t.porcentaje.toFixed(2)}%</td>
            </tr>
        `).join('');

        const distribucionHtml = Object.entries(distribucion)
            .sort((a, b) => b[1] - a[1])
            .map(([area, horas]) => `
                <tr>
                    <td>${escaparHTML(area)}</td>
                    <td class="text-right">${horas.toFixed(2)} h</td>
                </tr>
            `).join('');

        if (estadisticasContainer) {
            estadisticasContainer.innerHTML = `
                <div class="card">
                    <h3>🏆 Top 5 Conceptos</h3>
                    <div class="stats-tabla-ausentismo">
                        <table>
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th class="text-right">Horas</th>
                                    <th class="text-right">%</th>
                                </tr>
                            </thead>
                            <tbody>${top5Html}</tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <h3>🏢 Distribución por Área</h3>
                    <div class="stats-tabla-ausentismo">
                        <table>
                            <thead>
                                <tr>
                                    <th>Área</th>
                                    <th class="text-right">Horas</th>
                                </tr>
                            </thead>
                            <tbody>${distribucionHtml}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        mostrarMensaje(mensajeEstadisticas, 'Estadísticas generadas.', 'success');
    }

    // ================================================================
    // EVENTOS
    // ================================================================

    if (btnNuevoEvento) {
        btnNuevoEvento.addEventListener('click', () => abrirNuevoEvento());
    }

    if (btnBuscarEventos) {
        btnBuscarEventos.addEventListener('click', () => aplicarFiltros());
    }

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', () => limpiarFiltros());
    }

    if (formEvento) {
        formEvento.addEventListener('submit', onSubmitEvento);

        formEvento.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('input', () => marcarModificado());
            el.addEventListener('change', () => marcarModificado());
        });
    }

    if (btnCancelarEvento) {
        btnCancelarEvento.addEventListener('click', () => {
            ejecutarConAdvertencia(() => {
                cerrarModal();
            });
        });
    }

    if (modalEvento) {
        modalEvento.addEventListener('click', (event) => {
            if (event.target === modalEvento) {
                ejecutarConAdvertencia(() => cerrarModal());
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modalEvento && !modalEvento.classList.contains('hidden')) {
            ejecutarConAdvertencia(() => cerrarModal());
        }
    });

    [filtroPeriodo, filtroArea, filtroEmpleado].forEach(el => {
        if (el) el.addEventListener('input', () => aplicarFiltros());
    });

    if (parametrosModo) {
        parametrosModo.addEventListener('change', () => actualizarVisibilidadModo());
    }

    if (btnCalcularCierre) {
        btnCalcularCierre.addEventListener('click', () => calcularCierre());
    }

    if (btnEnviarM23) {
        btnEnviarM23.addEventListener('click', () => enviarM23());
    }

    if (btnGenerarConsolidado) {
        btnGenerarConsolidado.addEventListener('click', () => generarConsolidado());
    }

    if (estadisticasModo) {
        estadisticasModo.addEventListener('change', () => actualizarVisibilidadEstadisticas());
    }

    if (btnGenerarEstadisticas) {
        btnGenerarEstadisticas.addEventListener('click', () => generarEstadisticas());
    }

    // ================================================================
    // ARRANQUE
    // ================================================================

    mostrarPestana('registro');
    renderizarEventos();

    console.info('✅ Módulo M24 – Gestión de Ausentismo inicializado.');
}