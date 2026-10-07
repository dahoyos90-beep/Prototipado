/**
 * modules/M17-Plan-Trabajo-Capacitacion/plan-capacitacion.ts
 * 
 * Módulo de Plan de Capacitación.
 * - Selector de año (2022-2026)
 * - Sub-pestañas: Consolidado + Datos Generales + Agregar + 12 meses
 * - Gráfica interactiva (planeadas vs ejecutadas) por mes y anual
 * - Tabla editable con total capacitados, estado (P/E/R), % cumplimiento, indicador
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
    ICapacitacion,
    IActividadCapacitacion,
    ISociodemografico,
    TipoActividad,
    EstadoEjecucion,
    FrecuenciaActividad
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

/** Storage para el Plan de Capacitación */
const STORAGE_KEY = 'capacitaciones';
const storagePlanesCapacitacion = new StorageService<ICapacitacion>(STORAGE_KEY);

/** Storage para los trabajadores (perfil sociodemográfico) */
const STORAGE_KEY_TRABAJADORES = 'sociodemografico';
const storageTrabajadores = new StorageService<ISociodemografico>(STORAGE_KEY_TRABAJADORES);

// ================================================================
// INICIALIZACIÓN
// ================================================================

export function init(contenedor: HTMLElement): void {
    // Cargar CSS específico del módulo
    const cssId = 'modulo-capacitacion-css';
    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'modules/M17-Plan-Trabajo-Capacitacion/plan-capacitacion.css';
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

    const selectAnio = qs('#select-anio-capacitacion') as HTMLSelectElement;
    const subtabsPrimary = qs('#subtabs-primary-capacitacion') as HTMLElement;
    const subtabsMonths = qs('#subtabs-months-capacitacion') as HTMLElement;
    const subtabContenido = qs('#subtab-contenido-capacitacion') as HTMLElement;

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
     * Calcula el indicador de cumplimiento de capacitación:
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
     * requeridos por la interfaz IActividadCapacitacion actual.
     * 
     * Corrige datos viejos que puedan tener "asistentes" en lugar de
     * "totalCapacitados", o que no tengan "indicador", "meses", etc.
     */
    function normalizarActividad(act: Partial<IActividadCapacitacion>): IActividadCapacitacion {
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

        // Migrar asistentes (array viejo) a totalCapacitados (number nuevo)
        let totalCapacitados = 0;
        if (typeof act.totalCapacitados === 'number') {
            totalCapacitados = act.totalCapacitados;
        } else if (Array.isArray((act as unknown as { asistentes?: unknown[] }).asistentes)) {
            totalCapacitados = (act as unknown as { asistentes: unknown[] }).asistentes.length;
        }

        return {
            id: act.id || generarIdUnico(),
            nombre: act.nombre || '',
            descripcion: act.descripcion || '',
            facilitador: act.facilitador || '',
            poblacionObjetivo: act.poblacionObjetivo || '',
            tipo: act.tipo || 'Capacitacion',
            frecuencia: act.frecuencia || 'Anual',
            estado: act.estado || 'Programada',
            fechaInicio: act.fechaInicio || `${anioActual}-01-01`,
            fechaFin: act.fechaFin || `${anioActual}-12-31`,
            fechaEjecucionReal: act.fechaEjecucionReal || null,
            totalCapacitados,
            documentosSoporte: Array.isArray(act.documentosSoporte) ? act.documentosSoporte : [],
            observaciones: act.observaciones || null,
            meses,
            porcentajeCumplimiento: typeof act.porcentajeCumplimiento === 'number' ? act.porcentajeCumplimiento : 0,
            indicador: typeof act.indicador === 'number' ? act.indicador : 0,
            horasCapacitacion: typeof act.horasCapacitacion === 'number' ? act.horasCapacitacion : 0,
            fechaCreacion: act.fechaCreacion ? new Date(act.fechaCreacion) : new Date(),
            fechaActualizacion: act.fechaActualizacion ? new Date(act.fechaActualizacion) : new Date()
        };
    }

    /**
     * Obtiene el plan de capacitación de la empresa activa para el año actual.
     * Si no existe, crea uno nuevo con valores por defecto.
     * Normaliza las actividades para asegurar compatibilidad con datos viejos.
     */
    function obtenerPlan(): ICapacitacion {
        const planes = storagePlanesCapacitacion.obtenerTodos().filter(p =>
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
     * Guarda o actualiza el plan de capacitación en localStorage.
     */
    function guardarPlan(plan: ICapacitacion): boolean {
        plan.fechaActualizacion = new Date();
        const existe = storagePlanesCapacitacion.obtenerPorId(plan.id);
        if (existe) {
            return storagePlanesCapacitacion.actualizar(plan.id, plan);
        }
        return storagePlanesCapacitacion.guardar(plan);
    }

    // ================================================================
    // RENDERIZADO DE SUB-PESTAÑAS (DOS FILAS)
    // ================================================================

    function renderizarSubtabs(): void {
        // Fila 1: Consolidado / Datos Generales / Agregar
        const tabsPrimary = [
            { id: 'consolidado', label: '📊 Consolidado' },
            { id: 'datos-generales', label: '📋 Datos Generales' },
            { id: 'agregar-capacitacion', label: '➕ Agregar Capacitación' }
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
        } else if (subtabActual === 'agregar-capacitacion') {
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

            plan.actividades.forEach((act: IActividadCapacitacion) => {
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
                    <canvas id="grafica-consolidado" width="900" height="300"></canvas>
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
        const canvas = qs('#grafica-consolidado') as HTMLCanvasElement;
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

        plan.actividades.forEach((act: IActividadCapacitacion) => {
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
                    <canvas id="grafica-mes" width="600" height="300"></canvas>
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
                                <th>Actividad</th>
                                <th>Total Capacitados</th>
                                <th>Estado (P/E/R)</th>
                                <th>% Cumplimiento</th>
                                <th>Indicador</th>
                                <th>Horas</th>
                                <th>Evidencias</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-actividades-mes">
                            ${plan.actividades.length === 0
                                ? `<tr><td colspan="8" class="text-center text-muted">No hay actividades registradas.</td></tr>`
                                : plan.actividades.map((act: IActividadCapacitacion) => {
                                    const estado = act.meses[mes] || '';
                                    const indicadorActividad = estado === 'E' ? calcularIndicador(act.totalCapacitados) : 0;
                                    const cumplimientoActividad = estado === 'E' ? 100 : 0;
                                    const evidenciasHabilitadas = estado === 'E';
                                    const tieneEvidencia = act.documentosSoporte.length > 0;

                                    return `
                                        <tr data-id="${escaparHTML(act.id)}">
                                            <td><strong>${escaparHTML(act.nombre)}</strong></td>
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
                                            <td>${act.horasCapacitacion || '—'}</td>
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
                        <button type="button" id="btn-guardar-mes" class="btn btn-primary">💾 Guardar Cambios</button>
                    </div>
                ` : ''}

                <div id="mensaje-mes" class="alert" style="display:none;"></div>
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
        const canvas = qs('#grafica-mes') as HTMLCanvasElement;
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

    function configurarEventosMes(mes: string, plan: ICapacitacion): void {
        const btnGuardar = qs('#btn-guardar-mes') as HTMLButtonElement;
        const mensajeDiv = qs('#mensaje-mes') as HTMLElement;
        const tbody = qs('#tbody-actividades-mes') as HTMLElement;

        if (!tbody) return;

        tbody.querySelectorAll('.select-estado-mes').forEach(sel => {
            (sel as HTMLSelectElement).addEventListener('change', (event) => {
                const select = event.currentTarget as HTMLSelectElement;
                const row = select.closest('tr') as HTMLElement | null;
                const id = row?.dataset.id;
                if (!id) return;

                const actividad = plan.actividades.find((a: IActividadCapacitacion) => a.id === id);
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

                const actividad = plan.actividades.find((a: IActividadCapacitacion) => a.id === id);
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
                plan.actividades.forEach((a: IActividadCapacitacion) => {
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
    // FORMULARIO AGREGAR CAPACITACIÓN
    // ================================================================

    function renderizarFormularioAgregar(): void {
        subtabContenido.innerHTML = `
            <div class="subtab-panel">
                <form id="form-agregar-capacitacion" novalidate>
                    <fieldset>
                        <legend>➕ Nueva Capacitación</legend>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="cap-nombre">Nombre <span class="required">*</span></label>
                                <input type="text" id="cap-nombre" class="form-control" placeholder="Ej. Inducción SST" required />
                            </div>
                            <div class="form-group">
                                <label for="cap-facilitador">Facilitador <span class="required">*</span></label>
                                <input type="text" id="cap-facilitador" class="form-control" placeholder="Nombre del facilitador" required />
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="cap-descripcion">Descripción</label>
                            <textarea id="cap-descripcion" class="form-control" rows="3" placeholder="Descripción de la actividad"></textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="cap-poblacion">Población Objetivo <span class="required">*</span></label>
                                <input type="text" id="cap-poblacion" class="form-control" placeholder="Ej. Todo el personal" required />
                            </div>
                            <div class="form-group">
                                <label for="cap-frecuencia">Frecuencia <span class="required">*</span></label>
                                <select id="cap-frecuencia" class="form-control" required>
                                    <option value="Unica">Única</option>
                                    <option value="Mensual">Mensual</option>
                                    <option value="Trimestral">Trimestral</option>
                                    <option value="Semestral">Semestral</option>
                                    <option value="Anual" selected>Anual</option>
                                    <option value="Continua">Continua</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="cap-mes">Mes Programado <span class="required">*</span></label>
                                <select id="cap-mes" class="form-control" required>
                                    ${MESES.map((mes, i) => `
                                        <option value="${mes}">${MESES_LABEL[i]}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="cap-horas">Horas de Capacitación</label>
                                <input type="number" id="cap-horas" class="form-control" placeholder="Ej. 2" min="0" step="0.5" />
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="cap-observaciones">Observaciones</label>
                            <textarea id="cap-observaciones" class="form-control" rows="2" placeholder="Observaciones adicionales"></textarea>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">💾 Agregar Capacitación</button>
                            <button type="button" id="btn-cancelar-capacitacion" class="btn btn-outline">Cancelar</button>
                        </div>
                    </fieldset>
                </form>
                <div id="mensaje-agregar" class="alert" style="display:none;"></div>
            </div>
        `;

        const form = qs('#form-agregar-capacitacion') as HTMLFormElement;
        const btnCancelar = qs('#btn-cancelar-capacitacion') as HTMLButtonElement;
        const mensajeDiv = qs('#mensaje-agregar') as HTMLElement;

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();

                const nombre = (qs('#cap-nombre') as HTMLInputElement).value.trim();
                const facilitador = (qs('#cap-facilitador') as HTMLInputElement).value.trim();
                const descripcion = (qs('#cap-descripcion') as HTMLTextAreaElement).value.trim();
                const poblacion = (qs('#cap-poblacion') as HTMLInputElement).value.trim();
                const frecuencia = (qs('#cap-frecuencia') as HTMLSelectElement).value as FrecuenciaActividad;
                const mes = (qs('#cap-mes') as HTMLSelectElement).value;
                const horas = parseFloat((qs('#cap-horas') as HTMLInputElement).value) || 0;
                const observaciones = (qs('#cap-observaciones') as HTMLTextAreaElement).value.trim();

                if (!validarRequerido(nombre) || !validarRequerido(facilitador) || !validarRequerido(poblacion)) {
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

                const nuevaActividad: IActividadCapacitacion = {
                    id: generarIdUnico(),
                    nombre,
                    descripcion,
                    facilitador,
                    poblacionObjetivo: poblacion,
                    tipo: 'Capacitacion' as TipoActividad,
                    frecuencia,
                    estado: 'Programada' as EstadoEjecucion,
                    fechaInicio: `${anioActual}-01-01`,
                    fechaFin: `${anioActual}-12-31`,
                    fechaEjecucionReal: null,
                    totalCapacitados: 0,
                    documentosSoporte: [],
                    observaciones: observaciones || null,
                    meses,
                    porcentajeCumplimiento: 0,
                    indicador: 0,
                    horasCapacitacion: horas,
                    fechaCreacion: new Date(),
                    fechaActualizacion: new Date()
                };

                plan.actividades.push(nuevaActividad);

                if (guardarPlan(plan)) {
                    if (mensajeDiv) {
                        mensajeDiv.textContent = '✅ Capacitación agregada correctamente.';
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
                        mensajeDiv.textContent = '❌ Error al guardar la capacitación.';
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
                <form id="form-datos-generales" novalidate>
                    <fieldset>
                        <legend>📋 Información General del Plan</legend>

                        <div class="form-group">
                            <label for="dg-objetivo">Objetivo</label>
                            <textarea id="dg-objetivo" class="form-control" rows="3" ${esRolEmpresa ? 'disabled' : ''}>${escaparHTML(plan.objetivo)}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="dg-alcance">Alcance</label>
                            <textarea id="dg-alcance" class="form-control" rows="2" ${esRolEmpresa ? 'disabled' : ''}>${escaparHTML(plan.alcance)}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="dg-metas">Metas (una por línea)</label>
                            <textarea id="dg-metas" class="form-control" rows="5" ${esRolEmpresa ? 'disabled' : ''}>${plan.metas.join('\n')}</textarea>
                        </div>

                        <div class="form-group">
                            <label for="dg-plazo">Plazo de Cumplimiento</label>
                            <input type="text" id="dg-plazo" class="form-control" value="${escaparHTML(plan.plazoCumplimiento)}" ${esRolEmpresa ? 'disabled' : ''} />
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>💰 Recursos Asignados</legend>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="dg-rec-humanos">Humanos</label>
                                <input type="text" id="dg-rec-humanos" class="form-control" value="${escaparHTML(plan.recursos.humanos)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                            <div class="form-group">
                                <label for="dg-rec-tecnicos">Técnicos</label>
                                <input type="text" id="dg-rec-tecnicos" class="form-control" value="${escaparHTML(plan.recursos.tecnicos)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="dg-rec-financieros">Financieros</label>
                                <input type="text" id="dg-rec-financieros" class="form-control" value="${escaparHTML(plan.recursos.financieros)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                            <div class="form-group">
                                <label for="dg-rec-locativos">Locativos</label>
                                <input type="text" id="dg-rec-locativos" class="form-control" value="${escaparHTML(plan.recursos.locativos)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>📊 Medición y Seguimiento</legend>

                        <div class="form-group">
                            <label for="dg-med-formula">Fórmula</label>
                            <input type="text" id="dg-med-formula" class="form-control" value="${escaparHTML(plan.medicion.formula)}" ${esRolEmpresa ? 'disabled' : ''} />
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="dg-med-meta">Meta (%)</label>
                                <input type="number" id="dg-med-meta" class="form-control" value="${plan.medicion.meta}" min="0" max="100" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                            <div class="form-group">
                                <label for="dg-med-analisis">Análisis</label>
                                <input type="text" id="dg-med-analisis" class="form-control" value="${escaparHTML(plan.medicion.analisis)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>👤 Datos del Encabezado</legend>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="dg-resp-nombre">Nombre del Responsable SG-SST</label>
                                <input type="text" id="dg-resp-nombre" class="form-control" value="${escaparHTML(plan.nombreResponsable)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                            <div class="form-group">
                                <label for="dg-resp-resolucion">Resolución de Licencia</label>
                                <input type="text" id="dg-resp-resolucion" class="form-control" value="${escaparHTML(plan.resolucionLicencia)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="dg-resp-certificado">Certificado del Curso (50/20 horas)</label>
                            <input type="text" id="dg-resp-certificado" class="form-control" value="${escaparHTML(plan.certificadoCurso)}" ${esRolEmpresa ? 'disabled' : ''} />
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="dg-rep-legal">Representante Legal</label>
                                <input type="text" id="dg-rep-legal" class="form-control" value="${escaparHTML(plan.representanteLegal)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                            <div class="form-group">
                                <label for="dg-rep-cedula">Cédula del Representante</label>
                                <input type="text" id="dg-rep-cedula" class="form-control" value="${escaparHTML(plan.cedulaRepresentante)}" ${esRolEmpresa ? 'disabled' : ''} />
                            </div>
                        </div>
                    </fieldset>

                    ${!esRolEmpresa ? `
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">💾 Guardar Datos Generales</button>
                        </div>
                    ` : ''}
                </form>
                <div id="mensaje-datos" class="alert" style="display:none;"></div>
            </div>
        `;

        const form = qs('#form-datos-generales') as HTMLFormElement;
        const mensajeDiv = qs('#mensaje-datos') as HTMLElement;

        if (form && !esRolEmpresa) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();

                plan.objetivo = (qs('#dg-objetivo') as HTMLTextAreaElement).value.trim();
                plan.alcance = (qs('#dg-alcance') as HTMLTextAreaElement).value.trim();
                plan.metas = (qs('#dg-metas') as HTMLTextAreaElement).value
                    .split('\n')
                    .map(m => m.trim())
                    .filter(m => m.length > 0);
                plan.plazoCumplimiento = (qs('#dg-plazo') as HTMLInputElement).value.trim();

                plan.recursos = {
                    humanos: (qs('#dg-rec-humanos') as HTMLInputElement).value.trim(),
                    tecnicos: (qs('#dg-rec-tecnicos') as HTMLInputElement).value.trim(),
                    financieros: (qs('#dg-rec-financieros') as HTMLInputElement).value.trim(),
                    locativos: (qs('#dg-rec-locativos') as HTMLInputElement).value.trim()
                };

                plan.medicion = {
                    formula: (qs('#dg-med-formula') as HTMLInputElement).value.trim(),
                    meta: parseFloat((qs('#dg-med-meta') as HTMLInputElement).value) || META_DEFECTO,
                    analisis: (qs('#dg-med-analisis') as HTMLInputElement).value.trim()
                };

                plan.nombreResponsable = (qs('#dg-resp-nombre') as HTMLInputElement).value.trim();
                plan.resolucionLicencia = (qs('#dg-resp-resolucion') as HTMLInputElement).value.trim();
                plan.certificadoCurso = (qs('#dg-resp-certificado') as HTMLInputElement).value.trim();
                plan.representanteLegal = (qs('#dg-rep-legal') as HTMLInputElement).value.trim();
                plan.cedulaRepresentante = (qs('#dg-rep-cedula') as HTMLInputElement).value.trim();

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

    console.info(`✅ Módulo M17 – Plan de Capacitación inicializado. Trabajadores activos: ${totalTrabajadoresActivos}`);
}