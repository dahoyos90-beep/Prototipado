/**
 * modules/M17-Plan-Trabajo-Capacitacion/plan-trabajo.ts
 * 
 * Módulo de Plan de Trabajo.
 * - Selector de año (2022-2026)
 * - Sub-pestañas: Consolidado + Datos Generales + Agregar + 12 meses
 * - Gráfica interactiva (planeadas vs ejecutadas) por mes y anual
 * - Tabla editable con etapa PHVA, programa, actividad, responsable,
 *   total capacitados, estado (P/E/R), % cumplimiento, indicador, evidencias, observaciones
 * - Indicador = (totalCapacitados / totalTrabajadoresActivos) × 100
 * - Evidencias habilitadas solo si estado = "E"
 * - Normalización de datos viejos (compatibilidad con versiones anteriores)
 * - Filtro por empresa activa
 * - Ocultar acciones para rol Empresa
 * 
 * @version 2.1.0 (agregada normalización de actividades para compatibilidad)
 * @since 2026-09-28
 */

import { StorageService } from '../../src/storage.js';
import { qs, escaparHTML, generarIdUnico } from '../../src/utils.js';
import { validarRequerido } from '../../src/validators.js';
import { obtenerUsuarioSesion } from '../../src/auth.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';
import { marcarModificado, limpiarModificado } from '../../src/advertencia-cambios.js';
import type {
    IPlanTrabajo,
    IActividadPlanTrabajo,
    ISociodemografico,
    EtapaPHVA
} from '../../src/interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const MESES_LABEL = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const META_DEFECTO = 90;

/** Storage para el Plan de Trabajo */
const STORAGE_KEY = 'planesTrabajo';
const storagePlanesTrabajo = new StorageService<IPlanTrabajo>(STORAGE_KEY);

/** Storage para los trabajadores (perfil sociodemográfico) */
const STORAGE_KEY_TRABAJADORES = 'sociodemografico';
const storageTrabajadores = new StorageService<ISociodemografico>(STORAGE_KEY_TRABAJADORES);

// ================================================================
// INICIALIZACIÓN
// ================================================================

export function init(contenedor: HTMLElement): void {
    // Cargar CSS específico del módulo
    const cssId = 'modulo-plan-trabajo-css';
    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'modules/M17-Plan-Trabajo-Capacitacion/plan-trabajo.css';
        document.head.appendChild(link);
    }

    // ================================================================
    // DATOS DEL USUARIO Y EMPRESA ACTIVA
    // ================================================================

    const usuarioActual = obtenerUsuarioSesion();
    const empresaActivaRaw = obtenerEmpresaActiva();
    const esRolEmpresa = usuarioActual?.rol === 'Empresa';

    if (!empresaActivaRaw) {
        console.warn('⚠️ M17: No hay empresa activa.');
        contenedor.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏢</div>
                <div class="empty-title">No hay empresa activa</div>
                <div class="empty-text">Seleccione una empresa primero.</div>
            </div>
        `;
        return;
    }

    const empresaActiva: string = empresaActivaRaw;

    // ================================================================
    // REFERENCIAS AL DOM
    // ================================================================

    const selectAnio = qs('#select-anio-plan-trabajo') as HTMLSelectElement;
    const subtabsPrimary = qs('#subtabs-primary-plan-trabajo') as HTMLElement;
    const subtabsMonths = qs('#subtabs-months-plan-trabajo') as HTMLElement;
    const subtabContenido = qs('#subtab-contenido-plan-trabajo') as HTMLElement;

    if (!selectAnio || !subtabsPrimary || !subtabsMonths || !subtabContenido) {
        console.error('❌ M17: No se encontraron los elementos del DOM.');
        return;
    }

    // ================================================================
    // ESTADO INTERNO
    // ================================================================

    let anioActual: number = parseInt(selectAnio.value, 10) || 2024;
    let subtabActual: string = 'consolidado';

    /** Total de trabajadores activos de la empresa (para el indicador) */
    let totalTrabajadoresActivos: number = 0;

    // ================================================================
    // FUNCIONES AUXILIARES
    // ================================================================

    /**
     * Calcula el total de trabajadores activos de la empresa activa.
     * Se usa para el cálculo del indicador.
     */
    function calcularTotalTrabajadoresActivos(): number {
        return storageTrabajadores.obtenerTodos().filter(t =>
            t.empresaId === empresaActiva &&
            (t.estadoTrabajador === 'Activo' || !t.estadoTrabajador)
        ).length;
    }

    /**
     * Calcula el indicador de cumplimiento:
     * Indicador = (totalCapacitados / totalTrabajadoresActivos) × 100.
     * 
     * @param totalCapacitados - Total de trabajadores capacitados en la actividad.
     * @returns {number} - Indicador redondeado a 1 decimal (0 si no hay trabajadores).
     */
    function calcularIndicador(totalCapacitados: number): number {
        if (totalTrabajadoresActivos <= 0) return 0;
        const resultado = (totalCapacitados / totalTrabajadoresActivos) * 100;
        return Math.round(resultado * 10) / 10;
    }

    /**
     * Normaliza una actividad para asegurar que tenga todos los campos
     * requeridos por la interfaz IActividadPlanTrabajo actual.
     * 
     * Corrige datos viejos que puedan tener "semanas" en lugar de "meses",
     * o que no tengan "totalCapacitados", "indicador", "documentosSoporte", etc.
     */
    function normalizarActividad(act: Partial<IActividadPlanTrabajo>): IActividadPlanTrabajo {
        const meses: Record<string, 'P' | 'E' | 'R' | null> = {};
        MESES.forEach(m => { meses[m] = null; });

        // Copiar meses válidos si existen
        if (act.meses && typeof act.meses === 'object') {
            MESES.forEach(m => {
                const valor = act.meses![m];
                if (valor === 'P' || valor === 'E' || valor === 'R') {
                    meses[m] = valor;
                }
            });
        }

        return {
            id: act.id || generarIdUnico(),
            etapa: act.etapa || 'Planear',
            programa: act.programa || '',
            actividad: act.actividad || '',
            responsable: act.responsable || '',
            meses,
            porcentajeCumplimiento: typeof act.porcentajeCumplimiento === 'number' ? act.porcentajeCumplimiento : 0,
            totalCapacitados: typeof act.totalCapacitados === 'number' ? act.totalCapacitados : 0,
            indicador: typeof act.indicador === 'number' ? act.indicador : 0,
            documentosSoporte: Array.isArray(act.documentosSoporte) ? act.documentosSoporte : [],
            observaciones: act.observaciones || '',
            fechaCreacion: act.fechaCreacion ? new Date(act.fechaCreacion) : new Date(),
            fechaActualizacion: act.fechaActualizacion ? new Date(act.fechaActualizacion) : new Date()
        };
    }

    /**
     * Obtiene el plan de trabajo de la empresa activa para el año actual.
     * Si no existe, crea uno nuevo con valores por defecto.
     * Normaliza las actividades para asegurar compatibilidad con datos viejos.
     */
    function obtenerPlan(): IPlanTrabajo {
        const planes = storagePlanesTrabajo.obtenerTodos().filter(p =>
            p.empresaId === empresaActiva && p.anio === anioActual
        );

        if (planes.length > 0) {
            const plan = planes[0];
            // Normalizar actividades para asegurar compatibilidad con datos viejos
            plan.actividades = (plan.actividades || []).map(normalizarActividad);
            return plan;
        }

        return {
            id: generarIdUnico(),
            empresaId: empresaActiva,
            anio: anioActual,
            objetivo: '',
            alcance: '',
            metas: [],
            plazoCumplimiento: '',
            actividades: [],
            recursos: { humanos: '', tecnicos: '', financieros: '', locativos: '' },
            medicion: {
                formula: 'Actividades ejecutadas * 100 / Actividades programadas',
                meta: META_DEFECTO,
                analisis: ''
            },
            nombreResponsable: '',
            resolucionLicencia: '',
            certificadoCurso: '',
            representanteLegal: '',
            cedulaRepresentante: '',
            fechaCreacion: new Date(),
            fechaActualizacion: new Date()
        };
    }

    /**
     * Guarda o actualiza el plan de trabajo en localStorage.
     */
    function guardarPlan(plan: IPlanTrabajo): boolean {
        plan.fechaActualizacion = new Date();
        const existe = storagePlanesTrabajo.obtenerPorId(plan.id);
        if (existe) {
            return storagePlanesTrabajo.actualizar(plan.id, plan);
        }
        return storagePlanesTrabajo.guardar(plan);
    }

    // ================================================================
    // RENDERIZADO DE SUB-PESTAÑAS (DOS FILAS)
    // ================================================================

    function renderizarSubtabs(): void {
        // Fila 1: Consolidado / Datos Generales / Agregar Actividad
        const tabsPrimary = [
            { id: 'consolidado', label: '📊 Consolidado' },
            { id: 'datos-generales', label: '📋 Datos Generales' },
            { id: 'agregar-actividad', label: '➕ Agregar Actividad' }
        ];

        subtabsPrimary.innerHTML = tabsPrimary.map(tab => `
            <button 
                class="subtab-button subtab-primary ${subtabActual === tab.id ? 'active' : ''}" 
                data-subtab="${tab.id}"
            >
                ${escaparHTML(tab.label)}
            </button>
        `).join('');

        // Fila 2: Meses
        subtabsMonths.innerHTML = MESES.map((mes, i) => `
            <button 
                class="subtab-button ${subtabActual === mes ? 'active' : ''}" 
                data-subtab="${mes}"
            >
                ${escaparHTML(MESES_LABEL[i])}
            </button>
        `).join('');

        // Asignar eventos a AMBAS filas
        [subtabsPrimary, subtabsMonths].forEach(container => {
            container.querySelectorAll('.subtab-button').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = (btn as HTMLElement).dataset.subtab;
                    if (id) {
                        subtabActual = id;
                        renderizarSubtabs();
                        renderizarContenido();
                    }
                });
            });
        });
    }

    // ================================================================
    // RENDERIZADO DEL CONTENIDO
    // ================================================================

    function renderizarContenido(): void {
        if (subtabActual === 'consolidado') {
            renderizarConsolidado();
        } else if (MESES.includes(subtabActual)) {
            renderizarMes(subtabActual);
        } else if (subtabActual === 'agregar-actividad') {
            renderizarFormularioAgregar();
        } else if (subtabActual === 'datos-generales') {
            renderizarDatosGenerales();
        }
    }

    // ================================================================
    // CONSOLIDADO GENERAL
    // ================================================================

    function renderizarConsolidado(): void {
        const plan = obtenerPlan();

        const datosPorMes = MESES.map(mes => {
            let programadas = 0;
            let ejecutadas = 0;
            let totalCapacitadosMes = 0;

            plan.actividades.forEach((act: IActividadPlanTrabajo) => {
                const estado = act.meses[mes];
                if (estado === 'P' || estado === 'E' || estado === 'R') programadas++;
                if (estado === 'E') {
                    ejecutadas++;
                    totalCapacitadosMes += act.totalCapacitados;
                }
            });

            const cumplimiento = programadas > 0
                ? Math.round((ejecutadas / programadas) * 100)
                : 0;

            return { mes, programadas, ejecutadas, cumplimiento, totalCapacitadosMes };
        });

        const totalProgramadas = datosPorMes.reduce((s, d) => s + d.programadas, 0);
        const totalEjecutadas = datosPorMes.reduce((s, d) => s + d.ejecutadas, 0);
        const totalCapacitadosAnio = datosPorMes.reduce((s, d) => s + d.totalCapacitadosMes, 0);
        const cumplimientoAnual = totalProgramadas > 0
            ? Math.round((totalEjecutadas / totalProgramadas) * 100)
            : 0;
        const indicadorAnual = calcularIndicador(totalCapacitadosAnio);
        const pendientes = totalProgramadas - totalEjecutadas;

        subtabContenido.innerHTML = `
            <div class="subtab-panel">
                <div class="consolidado-header">
                    <h3>📊 Consolidado Anual ${anioActual}</h3>
                    <p>Resumen de todas las actividades programadas y ejecutadas por mes</p>
                </div>

                <div class="consolidado-resumen">
                    <div class="resumen-card resumen-programadas">
                        <span class="resumen-label">Total Programadas</span>
                        <span class="resumen-valor">${totalProgramadas}</span>
                        <span class="resumen-detalle">actividades en el año</span>
                    </div>
                    <div class="resumen-card resumen-ejecutadas">
                        <span class="resumen-label">Total Ejecutadas</span>
                        <span class="resumen-valor">${totalEjecutadas}</span>
                        <span class="resumen-detalle">actividades completadas</span>
                    </div>
                    <div class="resumen-card resumen-pendientes">
                        <span class="resumen-label">Pendientes</span>
                        <span class="resumen-valor">${pendientes}</span>
                        <span class="resumen-detalle">por ejecutar</span>
                    </div>
                    <div class="resumen-card resumen-cumplimiento">
                        <span class="resumen-label">% Cumplimiento Anual</span>
                        <span class="resumen-valor">${cumplimientoAnual}%</span>
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${Math.min(cumplimientoAnual, 100)}%"></div>
                        </div>
                        <span class="resumen-detalle">Meta: ${plan.medicion.meta}%</span>
                    </div>
                </div>

                <div class="resumen-card" style="margin-bottom: var(--spacing-lg);">
                    <span class="resumen-label">🎯 Indicador de Capacitación Anual</span>
                    <span class="resumen-valor">${indicadorAnual}%</span>
                    <span class="resumen-detalle">
                        ${totalCapacitadosAnio} capacitados / ${totalTrabajadoresActivos} trabajadores activos
                    </span>
                </div>

                <div class="grafica-container">
                    <h4>📈 Comparativo Mensual: Programadas vs Ejecutadas</h4>
                    <canvas id="grafica-consolidado-pt" width="900" height="300"></canvas>
                </div>

                <div class="tabla-actividades-container">
                    <table class="tabla-actividades">
                        <thead>
                            <tr>
                                <th>Mes</th>
                                <th>Programadas</th>
                                <th>Ejecutadas</th>
                                <th>Pendientes</th>
                                <th>% Cumplimiento</th>
                                <th>Total Capacitados</th>
                                <th>Meta</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${datosPorMes.map(d => `
                                <tr>
                                    <td><strong>${escaparHTML(MESES_LABEL[MESES.indexOf(d.mes)])}</strong></td>
                                    <td>${d.programadas}</td>
                                    <td>${d.ejecutadas}</td>
                                    <td>${d.programadas - d.ejecutadas}</td>
                                    <td class="porcentaje-cell">${d.cumplimiento}%</td>
                                    <td>${d.totalCapacitadosMes}</td>
                                    <td>${plan.medicion.meta}%</td>
                                </tr>
                            `).join('')}
                            <tr style="background-color: var(--color-gray-100); font-weight: 700;">
                                <td>TOTAL AÑO</td>
                                <td>${totalProgramadas}</td>
                                <td>${totalEjecutadas}</td>
                                <td>${pendientes}</td>
                                <td class="porcentaje-cell">${cumplimientoAnual}%</td>
                                <td>${totalCapacitadosAnio}</td>
                                <td>${plan.medicion.meta}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        dibujarGraficaConsolidado(datosPorMes);
    }

    // ================================================================
    // GRÁFICA ANUAL (CONSOLIDADO)
    // ================================================================

    function dibujarGraficaConsolidado(datosPorMes: Array<{ mes: string; programadas: number; ejecutadas: number }>): void {
        const canvas = qs('#grafica-consolidado-pt') as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const ancho = canvas.width;
        const alto = canvas.height;
        const margenIzq = 40;
        const margenDer = 20;
        const margenSup = 30;
        const margenInf = 50;
        const anchoGrafica = ancho - margenIzq - margenDer;
        const altoGrafica = alto - margenSup - margenInf;

        const maxValor = Math.max(
            1,
            ...datosPorMes.map(d => Math.max(d.programadas, d.ejecutadas))
        );

        ctx.clearRect(0, 0, ancho, alto);

        ctx.strokeStyle = '#E5E9F0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = margenSup + (altoGrafica / 4) * i;
            ctx.beginPath();
            ctx.moveTo(margenIzq, y);
            ctx.lineTo(ancho - margenDer, y);
            ctx.stroke();
        }

        const anchoGrupo = anchoGrafica / 12;
        const anchoBarra = anchoGrupo / 3;

        datosPorMes.forEach((d, i) => {
            const xGrupo = margenIzq + i * anchoGrupo;

            const alturaProg = (altoGrafica * d.programadas) / maxValor;
            ctx.fillStyle = '#284B7D';
            ctx.fillRect(
                xGrupo + anchoGrupo / 2 - anchoBarra - 2,
                margenSup + altoGrafica - alturaProg,
                anchoBarra,
                alturaProg
            );

            const alturaEjec = (altoGrafica * d.ejecutadas) / maxValor;
            ctx.fillStyle = '#10B981';
            ctx.fillRect(
                xGrupo + anchoGrupo / 2 + 2,
                margenSup + altoGrafica - alturaEjec,
                anchoBarra,
                alturaEjec
            );

            ctx.fillStyle = '#64748B';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                MESES_LABEL[i].substring(0, 3),
                xGrupo + anchoGrupo / 2,
                alto - margenInf + 15
            );
        });

        ctx.fillStyle = '#284B7D';
        ctx.fillRect(margenIzq, 5, 12, 12);
        ctx.fillStyle = '#1E293B';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Programadas', margenIzq + 18, 15);

        ctx.fillStyle = '#10B981';
        ctx.fillRect(margenIzq + 110, 5, 12, 12);
        ctx.fillStyle = '#1E293B';
        ctx.fillText('Ejecutadas', margenIzq + 128, 15);
    }

    // ================================================================
    // RENDERIZADO DE UN MES
    // ================================================================

    function renderizarMes(mes: string): void {
        const plan = obtenerPlan();
        const indiceMes = MESES.indexOf(mes);
        const labelMes = MESES_LABEL[indiceMes];

        let totalProgramados = 0;
        let totalEjecutados = 0;
        let totalCapacitadosMes = 0;

        plan.actividades.forEach((act: IActividadPlanTrabajo) => {
            const estado = act.meses[mes];
            if (estado === 'P' || estado === 'E' || estado === 'R') totalProgramados++;
            if (estado === 'E') {
                totalEjecutados++;
                totalCapacitadosMes += act.totalCapacitados;
            }
        });

        const porcentajeMes = totalProgramados > 0
            ? Math.round((totalEjecutados / totalProgramados) * 100)
            : 0;
        const indicadorMes = calcularIndicador(totalCapacitadosMes);

        subtabContenido.innerHTML = `
            <div class="subtab-panel">
                <div class="grafica-container">
                    <h4>📊 Actividades Programadas vs Ejecutadas - ${labelMes}</h4>
                    <canvas id="grafica-mes-pt" width="600" height="300"></canvas>
                </div>

                <div class="totales-mes">
                    <div class="total-item">
                        <span class="total-label">Programadas</span>
                        <span class="total-valor">${totalProgramados}</span>
                    </div>
                    <div class="total-item">
                        <span class="total-label">Ejecutadas</span>
                        <span class="total-valor">${totalEjecutados}</span>
                    </div>
                    <div class="total-item">
                        <span class="total-label">% Cumplimiento</span>
                        <span class="total-valor">${porcentajeMes}%</span>
                    </div>
                    <div class="total-item">
                        <span class="total-label">Indicador</span>
                        <span class="total-valor">${indicadorMes}%</span>
                    </div>
                </div>

                <div class="tabla-actividades-container">
                    <table class="tabla-actividades">
                        <thead>
                            <tr>
                                <th>Etapa PHVA</th>
                                <th>Programa</th>
                                <th>Actividad</th>
                                <th>Responsable</th>
                                <th>Total Capacitados</th>
                                <th>Estado (P/E/R)</th>
                                <th>% Cumplimiento</th>
                                <th>Indicador</th>
                                <th>Evidencias</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-actividades-mes-pt">
                            ${plan.actividades.length === 0
                                ? `<tr><td colspan="10" class="text-center text-muted">No hay actividades registradas.</td></tr>`
                                : plan.actividades.map((act: IActividadPlanTrabajo) => {
                                    const estado = act.meses[mes] || '';
                                    const indicadorActividad = estado === 'E' ? calcularIndicador(act.totalCapacitados) : 0;
                                    const cumplimientoActividad = estado === 'E' ? 100 : 0;
                                    const evidenciasHabilitadas = estado === 'E';
                                    const tieneEvidencia = act.documentosSoporte.length > 0;

                                    const etapaClase =
                                        act.etapa === 'Planear' ? 'etapa-planear' :
                                        act.etapa === 'Hacer' ? 'etapa-hacer' :
                                        act.etapa === 'Verificar' ? 'etapa-verificar' :
                                        'etapa-actuar';

                                    return `
                                        <tr data-id="${escaparHTML(act.id)}">
                                            <td class="${etapaClase}">${escaparHTML(act.etapa)}</td>
                                            <td>${escaparHTML(act.programa)}</td>
                                            <td><strong>${escaparHTML(act.actividad)}</strong></td>
                                            <td>${escaparHTML(act.responsable)}</td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    class="input-total-capacitados" 
                                                    value="${act.totalCapacitados}" 
                                                    min="0"
                                                    ${esRolEmpresa || !evidenciasHabilitadas ? 'disabled' : ''}
                                                />
                                            </td>
                                            <td>
                                                <select class="select-estado-mes" ${esRolEmpresa ? 'disabled' : ''}>
                                                    <option value="" ${estado === '' ? 'selected' : ''}>—</option>
                                                    <option value="P" ${estado === 'P' ? 'selected' : ''}>P (Planeado)</option>
                                                    <option value="E" ${estado === 'E' ? 'selected' : ''}>E (Ejecutado)</option>
                                                    <option value="R" ${estado === 'R' ? 'selected' : ''}>R (Reprogramado)</option>
                                                </select>
                                            </td>
                                            <td class="porcentaje-cell">${cumplimientoActividad}%</td>
                                            <td class="indicador-cell">${indicadorActividad}%</td>
                                            <td>
                                                <div class="evidencia-upload">
                                                    <input 
                                                        type="file" 
                                                        class="input-evidencia"
                                                        accept=".pdf,.jpg,.png,.jpeg,.doc,.docx"
                                                        ${esRolEmpresa || !evidenciasHabilitadas ? 'disabled' : ''}
                                                    />
                                                    ${evidenciasHabilitadas
                                                        ? (tieneEvidencia
                                                            ? `<span class="evidencia-hint">✅ ${act.documentosSoporte.length} archivo(s)</span>`
                                                            : `<span class="evidencia-hint">Cargar soporte</span>`)
                                                        : `<span class="evidencia-hint bloqueado">Solo cuando estado = E</span>`
                                                    }
                                                </div>
                                            </td>
                                            <td>${escaparHTML(act.observaciones || '—')}</td>
                                        </tr>
                                    `;
                                }).join('')
                            }
                        </tbody>
                    </table>
                </div>

                ${!esRolEmpresa ? `
                    <div class="form-actions">
                        <button type="button" id="btn-guardar-mes-pt" class="btn btn-primary">💾 Guardar Cambios</button>
                    </div>
                ` : ''}

                <div id="mensaje-mes-pt" class="alert" style="display:none;"></div>
            </div>
        `;

        dibujarGrafica(totalProgramados, totalEjecutados, labelMes);

        if (!esRolEmpresa) {
            configurarEventosMes(mes, plan);
        }
    }

    // ================================================================
    // GRÁFICA DEL MES
    // ================================================================

    function dibujarGrafica(programadas: number, ejecutadas: number, labelMes: string): void {
        const canvas = qs('#grafica-mes-pt') as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const ancho = canvas.width;
        const alto = canvas.height;
        const margen = 50;
        const anchoBarra = 80;
        const maxValor = Math.max(programadas, ejecutadas, 1);

        ctx.clearRect(0, 0, ancho, alto);

        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margen, margen);
        ctx.lineTo(margen, alto - margen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(margen, alto - margen);
        ctx.lineTo(ancho - margen, alto - margen);
        ctx.stroke();

        const alturaProg = ((alto - 2 * margen) * programadas) / maxValor;
        ctx.fillStyle = '#284B7D';
        ctx.fillRect(margen + 50, alto - margen - alturaProg, anchoBarra, alturaProg);

        const alturaEjec = ((alto - 2 * margen) * ejecutadas) / maxValor;
        ctx.fillStyle = '#10B981';
        ctx.fillRect(margen + 180, alto - margen - alturaEjec, anchoBarra, alturaEjec);

        ctx.fillStyle = '#1E293B';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';

        ctx.fillText('Programadas', margen + 90, alto - margen + 20);
        ctx.fillText('Ejecutadas', margen + 220, alto - margen + 20);

        ctx.fillText(String(programadas), margen + 90, alto - margen - alturaProg - 10);
        ctx.fillText(String(ejecutadas), margen + 220, alto - margen - alturaEjec - 10);

        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#1B365D';
        ctx.fillText(labelMes, ancho / 2, 25);
    }

    // ================================================================
    // EVENTOS DEL MES
    // ================================================================

    function configurarEventosMes(mes: string, plan: IPlanTrabajo): void {
        const btnGuardar = qs('#btn-guardar-mes-pt') as HTMLButtonElement;
        const mensajeDiv = qs('#mensaje-mes-pt') as HTMLElement;
        const tbody = qs('#tbody-actividades-mes-pt') as HTMLElement;

        if (!tbody) return;

        tbody.querySelectorAll('.select-estado-mes').forEach(sel => {
            (sel as HTMLSelectElement).addEventListener('change', (event) => {
                const select = event.currentTarget as HTMLSelectElement;
                const row = select.closest('tr') as HTMLElement | null;
                const id = row?.dataset.id;
                if (!id) return;

                const actividad = plan.actividades.find((a: IActividadPlanTrabajo) => a.id === id);
                if (!actividad) return;

                const valor = select.value as 'P' | 'E' | 'R' | '';
                actividad.meses[mes] = valor === '' ? null : valor;

                guardarPlan(plan);
                subtabActual = mes;
                renderizarContenido();
            });
        });

        tbody.querySelectorAll('.input-total-capacitados').forEach(inp => {
            (inp as HTMLInputElement).addEventListener('change', (event) => {
                const input = event.currentTarget as HTMLInputElement;
                const row = input.closest('tr') as HTMLElement | null;
                const id = row?.dataset.id;
                if (!id) return;

                const actividad = plan.actividades.find((a: IActividadPlanTrabajo) => a.id === id);
                if (!actividad) return;

                const num = parseInt(input.value, 10) || 0;
                actividad.totalCapacitados = num;

                guardarPlan(plan);

                const indicadorCell = row?.querySelector('.indicador-cell') as HTMLElement;
                if (indicadorCell) {
                    const estado = actividad.meses[mes];
                    const indicador = estado === 'E' ? calcularIndicador(num) : 0;
                    indicadorCell.textContent = `${indicador}%`;
                }

                let totalCapacitadosMes = 0;
                plan.actividades.forEach((a: IActividadPlanTrabajo) => {
                    if (a.meses[mes] === 'E') totalCapacitadosMes += a.totalCapacitados;
                });
                const indicadorMes = calcularIndicador(totalCapacitadosMes);
                const totalItems = subtabContenido.querySelectorAll('.totales-mes .total-valor');
                if (totalItems.length >= 4) {
                    (totalItems[3] as HTMLElement).textContent = `${indicadorMes}%`;
                }
            });
        });

        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => {
                if (guardarPlan(plan)) {
                    limpiarModificado();
                    if (mensajeDiv) {
                        mensajeDiv.textContent = '✅ Cambios guardados correctamente.';
                        mensajeDiv.className = 'alert alert-success';
                        mensajeDiv.style.display = 'block';
                        setTimeout(() => { mensajeDiv.style.display = 'none'; }, 4000);
                    }
                    renderizarContenido();
                } else {
                    if (mensajeDiv) {
                        mensajeDiv.textContent = '❌ Error al guardar los cambios.';
                        mensajeDiv.className = 'alert alert-error';
                        mensajeDiv.style.display = 'block';
                    }
                }
            });
        }
    }

    // ================================================================
    // FORMULARIO AGREGAR ACTIVIDAD
    // ================================================================

    function renderizarFormularioAgregar(): void {
        subtabContenido.innerHTML = `
            <div class="subtab-panel">
                <form id="form-agregar-actividad" novalidate>
                    <fieldset>
                        <legend>➕ Nueva Actividad del Plan de Trabajo</legend>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="pt-etapa">Etapa PHVA <span class="required">*</span></label>
                                <select id="pt-etapa" class="form-control" required>
                                    <option value="Planear">Planear</option>
                                    <option value="Hacer">Hacer</option>
                                    <option value="Verificar">Verificar</option>
                                    <option value="Actuar">Actuar</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="pt-programa">Programa / Componente <span class="required">*</span></label>
                                <input type="text" id="pt-programa" class="form-control" placeholder="Ej. Copasst, Convivencia Laboral" required />
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="pt-actividad">Actividad Programada <span class="required">*</span></label>
                            <textarea id="pt-actividad" class="form-control" rows="3" placeholder="Descripción detallada de la actividad" required></textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="pt-responsable">Responsable(s) <span class="required">*</span></label>
                                <input type="text" id="pt-responsable" class="form-control" placeholder="Ej. Asesor SST" required />
                            </div>
                            <div class="form-group">
                                <label for="pt-mes">Mes Programado <span class="required">*</span></label>
                                <select id="pt-mes" class="form-control" required>
                                    ${MESES.map((mes, i) => `
                                        <option value="${mes}">${MESES_LABEL[i]}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="pt-observaciones">Observaciones</label>
                            <textarea id="pt-observaciones" class="form-control" rows="2" placeholder="Observaciones adicionales"></textarea>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">💾 Agregar Actividad</button>
                            <button type="button" id="btn-cancelar-actividad" class="btn btn-outline">Cancelar</button>
                        </div>
                    </fieldset>
                </form>
                <div id="mensaje-agregar-pt" class="alert" style="display:none;"></div>
            </div>
        `;

        const form = qs('#form-agregar-actividad') as HTMLFormElement;
        const btnCancelar = qs('#btn-cancelar-actividad') as HTMLButtonElement;
        const mensajeDiv = qs('#mensaje-agregar-pt') as HTMLElement;

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();

                const etapa = (qs('#pt-etapa') as HTMLSelectElement).value as EtapaPHVA;
                const programa = (qs('#pt-programa') as HTMLInputElement).value.trim();
                const actividad = (qs('#pt-actividad') as HTMLTextAreaElement).value.trim();
                const responsable = (qs('#pt-responsable') as HTMLInputElement).value.trim();
                const mes = (qs('#pt-mes') as HTMLSelectElement).value;
                const observaciones = (qs('#pt-observaciones') as HTMLTextAreaElement).value.trim();

                if (!validarRequerido(programa) || !validarRequerido(actividad) || !validarRequerido(responsable)) {
                    if (mensajeDiv) {
                        mensajeDiv.textContent = '⚠️ Los campos marcados con * son obligatorios.';
                        mensajeDiv.className = 'alert alert-error';
                        mensajeDiv.style.display = 'block';
                    }
                    return;
                }

                const plan = obtenerPlan();

                const meses: Record<string, 'P' | 'E' | 'R' | null> = {};
                MESES.forEach(m => { meses[m] = null; });
                meses[mes] = 'P';

                const nuevaActividad: IActividadPlanTrabajo = {
                    id: generarIdUnico(),
                    etapa,
                    programa,
                    actividad,
                    responsable,
                    meses,
                    porcentajeCumplimiento: 0,
                    totalCapacitados: 0,
                    indicador: 0,
                    documentosSoporte: [],
                    observaciones,
                    fechaCreacion: new Date(),
                    fechaActualizacion: new Date()
                };

                plan.actividades.push(nuevaActividad);

                if (guardarPlan(plan)) {
                    if (mensajeDiv) {
                        mensajeDiv.textContent = '✅ Actividad agregada correctamente.';
                        mensajeDiv.className = 'alert alert-success';
                        mensajeDiv.style.display = 'block';
                    }
                    form.reset();
                    setTimeout(() => {
                        subtabActual = mes;
                        renderizarSubtabs();
                        renderizarContenido();
                    }, 1500);
                } else {
                    if (mensajeDiv) {
                        mensajeDiv.textContent = '❌ Error al guardar la actividad.';
                        mensajeDiv.className = 'alert alert-error';
                        mensajeDiv.style.display = 'block';
                    }
                }
            });
        }

        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                subtabActual = 'datos-generales';
                renderizarSubtabs();
                renderizarContenido();
            });
        }
    }

    // ================================================================
    // DATOS GENERALES
    // ================================================================

    function renderizarDatosGenerales(): void {
        const plan = obtenerPlan();

        subtabContenido.innerHTML = `
            <div class="subtab-panel datos-generales">
                <form id="form-datos-generales-pt" novalidate>
                    <fieldset>
                        <legend>📋 Información General del Plan</legend>

                        <div class="form-group">
                            <label for="pt-objetivo">Objetivo</label>
                            <textarea id="pt-objetivo" class="form-control" rows="3" ${esRolEmpresa ? 'disabled' : ''}>${escaparHTML(plan.objetivo)}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="pt-alcance">Alcance</label>
                            <textarea id="pt-alcance" class="form-control" rows="2" ${esRolEmpresa ? 'disabled' : ''}>${escaparHTML(plan.alcance)}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="pt-metas">Metas (una por línea)</label>
                            <textarea id="pt-metas" class="form-control" rows="5" ${esRolEmpresa ? 'disabled' : ''}>${plan.metas.join('\n')}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="pt-plazo">Plazo de Cumplimiento</label>
                            <input type="text" id="pt-plazo" class="form-control" value="${escaparHTML(plan.plazoCumplimiento)}" ${esRolEmpresa ? 'disabled' : ''} />
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>💰 Recursos Asignados</legend>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="pt-rec-humanos">Humanos</label>
                                <input type="text" id="pt-rec-humanos" class="form-control" value="${escaparHTML(plan.recursos.humanos)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                            <div class="form-group">
                                <label for="pt-rec-tecnicos">Técnicos</label>
                                <input type="text" id="pt-rec-tecnicos" class="form-control" value="${escaparHTML(plan.recursos.tecnicos)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="pt-rec-financieros">Financieros</label>
                                <input type="text" id="pt-rec-financieros" class="form-control" value="${escaparHTML(plan.recursos.financieros)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                            <div class="form-group">
                                <label for="pt-rec-locativos">Locativos</label>
                                <input type="text" id="pt-rec-locativos" class="form-control" value="${escaparHTML(plan.recursos.locativos)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>📊 Medición y Seguimiento</legend>

                        <div class="form-group">
                            <label for="pt-med-formula">Fórmula</label>
                            <input type="text" id="pt-med-formula" class="form-control" value="${escaparHTML(plan.medicion.formula)}" ${esRolEmpresa ? 'disabled' : ''} />
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="pt-med-meta">Meta (%)</label>
                                <input type="number" id="pt-med-meta" class="form-control" value="${plan.medicion.meta}" min="0" max="100" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                            <div class="form-group">
                                <label for="pt-med-analisis">Análisis</label>
                                <input type="text" id="pt-med-analisis" class="form-control" value="${escaparHTML(plan.medicion.analisis)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>👤 Datos del Encabezado</legend>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="pt-resp-nombre">Nombre del Responsable SG-SST</label>
                                <input type="text" id="pt-resp-nombre" class="form-control" value="${escaparHTML(plan.nombreResponsable)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                            <div class="form-group">
                                <label for="pt-resp-resolucion">Resolución de Licencia</label>
                                <input type="text" id="pt-resp-resolucion" class="form-control" value="${escaparHTML(plan.resolucionLicencia)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="pt-resp-certificado">Certificado del Curso (50/20 horas)</label>
                            <input type="text" id="pt-resp-certificado" class="form-control" value="${escaparHTML(plan.certificadoCurso)}" ${esRolEmpresa ? 'disabled' : ''} />
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="pt-rep-legal">Representante Legal</label>
                                <input type="text" id="pt-rep-legal" class="form-control" value="${escaparHTML(plan.representanteLegal)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                            <div class="form-group">
                                <label for="pt-rep-cedula">Cédula del Representante</label>
                                <input type="text" id="pt-rep-cedula" class="form-control" value="${escaparHTML(plan.cedulaRepresentante)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                        </div>
                    </fieldset>

                    ${!esRolEmpresa ? `
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">💾 Guardar Datos Generales</button>
                        </div>
                    ` : ''}
                </form>
                <div id="mensaje-datos-pt" class="alert" style="display:none;"></div>
            </div>
        `;

        const form = qs('#form-datos-generales-pt') as HTMLFormElement;
        const mensajeDiv = qs('#mensaje-datos-pt') as HTMLElement;

        if (form && !esRolEmpresa) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();

                plan.objetivo = (qs('#pt-objetivo') as HTMLTextAreaElement).value.trim();
                plan.alcance = (qs('#pt-alcance') as HTMLTextAreaElement).value.trim();
                plan.metas = (qs('#pt-metas') as HTMLTextAreaElement).value
                    .split('\n')
                    .map(m => m.trim())
                    .filter(m => m.length > 0);
                plan.plazoCumplimiento = (qs('#pt-plazo') as HTMLInputElement).value.trim();

                plan.recursos = {
                    humanos: (qs('#pt-rec-humanos') as HTMLInputElement).value.trim(),
                    tecnicos: (qs('#pt-rec-tecnicos') as HTMLInputElement).value.trim(),
                    financieros: (qs('#pt-rec-financieros') as HTMLInputElement).value.trim(),
                    locativos: (qs('#pt-rec-locativos') as HTMLInputElement).value.trim()
                };

                plan.medicion = {
                    formula: (qs('#pt-med-formula') as HTMLInputElement).value.trim(),
                    meta: parseFloat((qs('#pt-med-meta') as HTMLInputElement).value) || META_DEFECTO,
                    analisis: (qs('#pt-med-analisis') as HTMLInputElement).value.trim()
                };

                plan.nombreResponsable = (qs('#pt-resp-nombre') as HTMLInputElement).value.trim();
                plan.resolucionLicencia = (qs('#pt-resp-resolucion') as HTMLInputElement).value.trim();
                plan.certificadoCurso = (qs('#pt-resp-certificado') as HTMLInputElement).value.trim();
                plan.representanteLegal = (qs('#pt-rep-legal') as HTMLInputElement).value.trim();
                plan.cedulaRepresentante = (qs('#pt-rep-cedula') as HTMLInputElement).value.trim();

                if (guardarPlan(plan)) {
                    limpiarModificado();
                    if (mensajeDiv) {
                        mensajeDiv.textContent = '✅ Datos generales guardados correctamente.';
                        mensajeDiv.className = 'alert alert-success';
                        mensajeDiv.style.display = 'block';
                        setTimeout(() => { mensajeDiv.style.display = 'none'; }, 4000);
                    }
                } else {
                    if (mensajeDiv) {
                        mensajeDiv.textContent = '❌ Error al guardar los datos.';
                        mensajeDiv.className = 'alert alert-error';
                        mensajeDiv.style.display = 'block';
                    }
                }
            });
        }
    }

    // ================================================================
    // EVENTOS GLOBALES
    // ================================================================

    selectAnio.addEventListener('change', () => {
        anioActual = parseInt(selectAnio.value, 10) || 2024;
        subtabActual = 'consolidado';
        renderizarSubtabs();
        renderizarContenido();
    });

    // ================================================================
    // INICIALIZACIÓN
    // ================================================================

    totalTrabajadoresActivos = calcularTotalTrabajadoresActivos();

    renderizarSubtabs();
    renderizarContenido();

    console.info(`✅ Módulo M17 – Plan de Trabajo inicializado. Trabajadores activos: ${totalTrabajadoresActivos}`);
}