/**
 * modules/M23-Gestion-Indicadores/indicadores-dashboard.ts
 * 
 * Lógica del dashboard de Indicadores SG-SST.
 * Módulo M23 - Gestión de Indicadores.
 * 
 * Responsabilidades:
 * - Cargar el CSS del módulo dinámicamente.
 * - Sembrar automáticamente los 6 indicadores mínimos obligatorios.
 * - Cargar y filtrar indicadores de la empresa activa.
 * - Renderizar dashboard con stat-cards, clasificación y alertas.
 * - Renderizar la tabla completa de indicadores.
 * - Renderizar resultados por indicador seleccionado.
 * - Gestionar las 4 pestañas (Dashboard / Indicadores / Resultados / Reportes).
 * - Abrir modales para nuevo indicador, nuevo resultado y HHT.
 * - Generar reportes PDF con window.print().
 * - Abrir el detalle en pestaña nueva con localStorage.
 * 
 * Basado en:
 * - Decreto 1072 de 2015
 * - Resolución 0312 de 2019
 * - NTC 3701 / NTC 3793
 * 
 * @version 1.0.0
 * @since 2026-10-08
 */

import {
    qs,
    qsTipo,
    qsa,
    escaparHTML,
    formatearFecha,
    fechaActualISO
} from '../../src/utils.js';
import {
    storageIndicadores,
    storageResultadosIndicadores,
    storageCalculosHHT,
    storagePlanesAccionIndicador,
    storageEmpresas
} from '../../src/storage.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';
import {
    obtenerIndicadoresMinimos,
    calcularHHT,
    calcularHorasOrdinarias,
    calcularSemaforo,
    calcularSemaforoMenorEsMejor,
    obtenerColorSemaforo,
    obtenerIconoSemaforo,
    obtenerEtiquetaSemaforo,
    calcularTendencia,
    obtenerIconoTendencia,
    calcularIndicadorAutomatico,
    calcularPorcentajeCumplimiento,
    generarIdIndicador,
    generarIdResultado,
    formatearPeriodo,
    periodoActual,
    crearCalculoHHT,
    redondear,
    K_ACCIDENTALIDAD,
    K_ENFERMEDAD
} from '../../src/indicadores-utils.js';
import type {
    IIndicador,
    IResultadoIndicador,
    ICalculoHHT,
    NivelSemaforo,
    ClasificacionIndicador,
    Periodicidad,
    TipoResultado,
    TipoMedida,
    TipoCalculoAutomatico,
    TipoIndicadorMinimo,
    DestinatarioIndicador,
    ITendenciaIndicador
} from '../../src/interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** ID del <link> del CSS del módulo (para no duplicarlo). */
const CSS_LINK_ID = 'modulo-indicadores-dashboard-css';

/** Ruta del CSS del módulo. */
const CSS_HREF = 'modules/M23-Gestion-Indicadores/indicadores-dashboard.css';

// ================================================================
// ESTADO DEL MÓDULO
// ================================================================

/** Lista completa de indicadores de la empresa activa. */
let indicadores: IIndicador[] = [];

/** Lista filtrada de indicadores. */
let indicadoresFiltrados: IIndicador[] = [];

/** NIT de la empresa activa. */
let empresaActivaNit: string = '';

/** Nombre de la empresa activa. */
let empresaActivaNombre: string = '';

/** Tab activo. */
let tabActivo: string = 'dashboard';

/** Indicador seleccionado en la pestaña "Resultados". */
let indicadorSeleccionadoId: string = '';

// ================================================================
// INICIALIZACIÓN
// ================================================================

/**
 * Punto de entrada del módulo (lo llama app.ts).
 * 
 * @param container - Contenedor donde se inyectó el HTML del listado.
 */
export function init(container: Element): void {
    console.info('📈 M23: Inicializando dashboard de indicadores...');

    // 0. Cargar el CSS del módulo (evita duplicados)
    cargarCSSModulo();

    // 1. Obtener empresa activa
    empresaActivaNit = obtenerEmpresaActiva() || '';

    if (!empresaActivaNit) {
        console.warn('M23: No hay empresa activa.');
        mostrarErrorSinEmpresa();
        return;
    }

    const empresa = storageEmpresas.obtenerPorId(empresaActivaNit);
    empresaActivaNombre = empresa?.razonSocial || 'Empresa';

    // 2. Sembrar indicadores mínimos si es la primera vez
    sembrarIndicadoresMinimos();

    // 3. Cargar indicadores
    cargarIndicadores();

    // 4. Renderizar todo
    renderizarTabInicial();
    renderizarDashboard();
    renderizarTabla();
    renderizarResultados();
    renderizarReportes();

    // 5. Configurar tabs
    configurarTabs();

    // 6. Configurar botones
    configurarBotones();

    // 7. Escuchar evento de "volver del detalle"
    window.addEventListener('indicador:volver-dashboard', manejarVolverDelDetalle);

    console.info(`✅ M23: ${indicadores.length} indicadores cargados.`);
}

/**
 * Carga el CSS del módulo dinámicamente.
 */
function cargarCSSModulo(): void {
    if (document.getElementById(CSS_LINK_ID)) return;

    const link = document.createElement('link');
    link.id = CSS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    document.head.appendChild(link);

    console.info('M23: CSS del módulo cargado.');
}

/**
 * Muestra un mensaje si no hay empresa activa.
 */
function mostrarErrorSinEmpresa(): void {
    const contenedor = qs('#contenedor-dashboard');
    if (contenedor) {
        contenedor.innerHTML = `
            <p class="text-muted">
                ⚠️ No hay empresa activa. Seleccione una empresa para continuar.
            </p>
        `;
    }
}

// ================================================================
// SEMBRADO DE INDICADORES MÍNIMOS
// ================================================================

/**
 * Siembra los 6 indicadores mínimos obligatorios (Res. 0312 de 2019)
 * si la empresa no los tiene registrados aún.
 */
function sembrarIndicadoresMinimos(): void {
    const todos = storageIndicadores.obtenerTodos();
    const deEstaEmpresa = todos.filter(i => i.empresaId === empresaActivaNit);

    // Si ya tiene indicadores, no sembrar
    if (deEstaEmpresa.length > 0) {
        console.info('M23: La empresa ya tiene indicadores. No se siembran los mínimos.');
        return;
    }

    console.info('M23: Sembrando 6 indicadores mínimos...');

    const minimos = obtenerIndicadoresMinimos(empresaActivaNit);
    let guardados = 0;

    minimos.forEach(ind => {
        if (storageIndicadores.guardar(ind)) guardados++;
    });

    console.info(`✅ M23: ${guardados} de 6 indicadores mínimos sembrados.`);
}

// ================================================================
// CARGA DE DATOS
// ================================================================

/**
 * Carga los indicadores de la empresa activa.
 */
function cargarIndicadores(): void {
    const todos = storageIndicadores.obtenerTodos();
    indicadores = todos.filter(i => i.empresaId === empresaActivaNit);

    // Ordenar por clasificación y nombre
    indicadores.sort((a, b) => {
        const ordenClas: Record<ClasificacionIndicador, number> = {
            'Estructura': 1,
            'Proceso': 2,
            'Resultado': 3
        };
        const diff = ordenClas[a.clasificacion] - ordenClas[b.clasificacion];
        if (diff !== 0) return diff;
        return a.nombre.localeCompare(b.nombre);
    });

    indicadoresFiltrados = [...indicadores];

    console.info(`M23: ${indicadores.length} indicadores cargados.`);
}

/**
 * Obtiene los resultados de un indicador, ordenados cronológicamente.
 */
function obtenerResultadosIndicador(indicadorId: string): IResultadoIndicador[] {
    return storageResultadosIndicadores
        .obtenerTodos()
        .filter(r => r.indicadorId === indicadorId)
        .sort((a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime());
}

// ================================================================
// RENDERIZADO — TAB INICIAL
// ================================================================

/**
 * Establece la pestaña inicial visible.
 */
function renderizarTabInicial(): void {
    const tabs: Record<string, HTMLElement | null> = {
        dashboard: qsTipo<HTMLElement>('#tab-dashboard'),
        indicadores: qsTipo<HTMLElement>('#tab-indicadores'),
        resultados: qsTipo<HTMLElement>('#tab-resultados'),
        reportes: qsTipo<HTMLElement>('#tab-reportes')
    };

    Object.entries(tabs).forEach(([id, el]) => {
        if (!el) return;
        if (id === tabActivo) el.classList.remove('hidden');
        else el.classList.add('hidden');
    });
}

// ================================================================
// RENDERIZADO — DASHBOARD
// ================================================================

/**
 * Renderiza el contenido del dashboard:
 *   - 3 stat-cards (Total, En meta, En alerta, Críticos).
 *   - Gráfico de clasificación.
 *   - Lista de indicadores en alerta.
 */
function renderizarDashboard(): void {
    const contenedor = qs('#contenedor-dashboard');
    const clasificacion = qs('#contenedor-clasificacion');
    const alertas = qs('#contenedor-alertas');

    if (!contenedor || !clasificacion || !alertas) return;

    if (indicadores.length === 0) {
        contenedor.innerHTML = `
            <p class="text-muted">No hay indicadores registrados.</p>
        `;
        clasificacion.innerHTML = '';
        alertas.innerHTML = '';
        return;
    }

    // Contadores por semáforo
    let verdes = 0;
    let amarillos = 0;
    let rojos = 0;
    let sinDatos = 0;

    const tendencias: Record<string, ITendenciaIndicador | null> = {};

    indicadores.forEach(ind => {
        const resultados = obtenerResultadosIndicador(ind.id);
        if (resultados.length === 0) {
            sinDatos++;
            tendencias[ind.id] = null;
            return;
        }

        const ultimo = resultados[resultados.length - 1];
        if (ultimo.semaforo === 'Verde') verdes++;
        else if (ultimo.semaforo === 'Amarillo') amarillos++;
        else if (ultimo.semaforo === 'Rojo') rojos++;

        // Calcular tendencia solo si hay 2+ resultados
        tendencias[ind.id] = resultados.length >= 1
            ? calcularTendencia(resultados, ind.nombre, ind.clasificacion)
            : null;
    });

    const total = indicadores.length;

    // -------- Stat-cards --------
    contenedor.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>${total}</h3>
                <p>Total Indicadores</p>
            </div>
            <div class="stat-card stat-verde">
                <h3>${verdes}</h3>
                <p>🟢 En meta</p>
            </div>
            <div class="stat-card stat-amarillo">
                <h3>${amarillos}</h3>
                <p>🟡 En alerta</p>
            </div>
            <div class="stat-card stat-rojo">
                <h3>${rojos}</h3>
                <p>🔴 Críticos</p>
            </div>
            <div class="stat-card stat-gris">
                <h3>${sinDatos}</h3>
                <p>⏳ Sin datos</p>
            </div>
        </div>
    `;

    // -------- Gráfico de clasificación --------
    const estructuras = indicadores.filter(i => i.clasificacion === 'Estructura').length;
    const procesos = indicadores.filter(i => i.clasificacion === 'Proceso').length;
    const resultadosInd = indicadores.filter(i => i.clasificacion === 'Resultado').length;

    clasificacion.innerHTML = `
        <div class="stats-grafica">
            ${renderizarBarra('Estructura', estructuras, total, 'barra-estructura')}
            ${renderizarBarra('Proceso', procesos, total, 'barra-proceso')}
            ${renderizarBarra('Resultado', resultadosInd, total, 'barra-resultado')}
        </div>
    `;

    // -------- Lista de alertas --------
    const indicadoresAlerta = indicadores.filter(ind => {
        const tend = tendencias[ind.id];
        return tend && tend.nivelSemaforoActual !== 'Verde';
    });

    if (indicadoresAlerta.length === 0) {
        alertas.innerHTML = `
            <p class="text-muted">🎉 Todos los indicadores están en verde. ¡Excelente gestión!</p>
        `;
    } else {
        alertas.innerHTML = `
            <div class="lista-alertas">
                ${indicadoresAlerta.map(ind => {
                    const tend = tendencias[ind.id];
                    if (!tend) return '';
                    const claseAlerta = `alerta-item alerta-${tend.nivelSemaforoActual.toLowerCase()}`;
                    const icono = obtenerIconoSemaforo(tend.nivelSemaforoActual);
                    const iconoTend = obtenerIconoTendencia(tend.estadoTendencia);
                    const colorSemaforo = obtenerColorSemaforo(tend.nivelSemaforoActual);
                    const colorTend = tend.estadoTendencia === 'Positiva' ? '#10B981' :
                                     tend.estadoTendencia === 'Negativa' ? '#DC2626' : '#64748B';

                    return `
                        <div class="${claseAlerta}">
                            <div class="alerta-item-info">
                                <strong>${escaparHTML(ind.nombre)}</strong>
                                <span>${escaparHTML(ind.clasificacion)} · ${escaparHTML(ind.periodicidad)}</span>
                            </div>
                            <div class="alerta-item-valores">
                                <span class="valor-actual" style="color:${colorSemaforo};">
                                    ${icono} ${tend.valorActual} ${escaparHTML(ind.unidadMedida)}
                                </span>
                                <span class="valor-meta">
                                    Meta: ${escaparHTML(ind.limiteEsperado)}
                                </span>
                                <span style="color:${colorTend}; font-weight:700;">
                                    ${iconoTend}
                                </span>
                                <button
                                    class="btn btn-sm btn-outline btn-ver-alerta"
                                    data-indicador-id="${escaparHTML(ind.id)}"
                                    type="button"
                                >Ver detalle</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Configurar botones "Ver detalle"
        alertas.querySelectorAll('.btn-ver-alerta').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const id = target.dataset.indicadorId;
                if (id) abrirDetalleIndicador(id);
            });
        });
    }
}

/**
 * Renderiza una barra de progreso.
 */
function renderizarBarra(
    label: string,
    cantidad: number,
    total: number,
    claseColor: string
): string {
    const pct = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    const texto = pct > 15 ? `${pct}%` : '';
    return `
        <div class="stats-barra-item">
            <span class="stats-barra-label">${escaparHTML(label)}</span>
            <div class="stats-barra-container">
                <div class="stats-barra-fill ${claseColor}" style="width: ${pct}%;">${texto}</div>
            </div>
            <span class="stats-barra-valor">${cantidad}</span>
        </div>
    `;
}

// ================================================================
// RENDERIZADO — TABLA DE INDICADORES
// ================================================================

/**
 * Renderiza la tabla de indicadores.
 */
function renderizarTabla(): void {
    const contenedor = qs('#contenedor-indicadores');
    const estadoVacio = qsTipo<HTMLElement>('#estado-vacio-indicadores');

    if (!contenedor) return;

    if (indicadoresFiltrados.length === 0) {
        contenedor.innerHTML = '';
        if (estadoVacio) estadoVacio.classList.remove('hidden');
        return;
    }

    if (estadoVacio) estadoVacio.classList.add('hidden');

    contenedor.innerHTML = `
        <table class="tabla-datos">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Clasificación</th>
                    <th>Periodicidad</th>
                    <th>Meta</th>
                    <th>Último valor</th>
                    <th>Semáforo</th>
                    <th>Estado</th>
                    <th class="col-acciones">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${indicadoresFiltrados.map(ind => construirFilaTabla(ind)).join('')}
            </tbody>
        </table>
    `;

    // Configurar botones
    contenedor.querySelectorAll('.btn-ver-indicador').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const id = target.dataset.indicadorId;
            if (id) abrirDetalleIndicador(id);
        });
    });

    contenedor.querySelectorAll('.btn-nuevo-resultado').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const id = target.dataset.indicadorId;
            if (id) abrirModalNuevoResultado(id);
        });
    });

    contenedor.querySelectorAll('.btn-eliminar-indicador').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const id = target.dataset.indicadorId;
            if (id) eliminarIndicador(id);
        });
    });
}

/**
 * Construye el HTML de una fila de la tabla.
 */
function construirFilaTabla(ind: IIndicador): string {
    const resultados = obtenerResultadosIndicador(ind.id);
    const tieneResultados = resultados.length > 0;
    const ultimo = tieneResultados ? resultados[resultados.length - 1] : null;

    const badgeClas = obtenerBadgeClasificacion(ind.clasificacion);
    const badgeEstado = obtenerBadgeEstado(ind.estado);

    let badgeSemaforo = '<span class="badge badge-semaforo badge-semaforo-amarillo">⏳ Sin datos</span>';
    let valorMostrado = '—';

    if (ultimo) {
        valorMostrado = `${ultimo.valor} ${ind.unidadMedida}`;
        const claseSem = `badge badge-semaforo badge-semaforo-${ultimo.semaforo.toLowerCase()}`;
        badgeSemaforo = `<span class="${claseSem}">${obtenerIconoSemaforo(ultimo.semaforo)} ${ultimo.semaforo}</span>`;
    }

    const badgePredef = ind.esPredefinido
        ? '<span class="badge badge-predefinido">Res. 0312</span>'
        : '';

    return `
        <tr data-indicador-id="${escaparHTML(ind.id)}">
            <td>
                ${escaparHTML(ind.nombre)}
                ${badgePredef}
            </td>
            <td>${badgeClas}</td>
            <td>${escaparHTML(ind.periodicidad)}</td>
            <td>${escaparHTML(ind.limiteEsperado)}</td>
            <td class="celda-centro">${valorMostrado}</td>
            <td class="celda-centro">${badgeSemaforo}</td>
            <td>${badgeEstado}</td>
            <td class="col-acciones">
                <button
                    class="btn btn-sm btn-primary btn-nuevo-resultado"
                    data-indicador-id="${escaparHTML(ind.id)}"
                    title="Registrar resultado"
                    type="button"
                >➕</button>
                <button
                    class="btn btn-sm btn-outline btn-ver-indicador"
                    data-indicador-id="${escaparHTML(ind.id)}"
                    title="Ver detalle"
                    type="button"
                >👁️</button>
                <button
                    class="btn btn-sm btn-danger btn-eliminar-indicador"
                    data-indicador-id="${escaparHTML(ind.id)}"
                    title="Eliminar indicador"
                    type="button"
                >🗑️</button>
            </td>
        </tr>
    `;
}

/**
 * Devuelve el HTML de un badge según la clasificación.
 */
function obtenerBadgeClasificacion(clas: ClasificacionIndicador): string {
    const clases: Record<ClasificacionIndicador, string> = {
        'Estructura': 'badge badge-estructura',
        'Proceso': 'badge badge-proceso',
        'Resultado': 'badge badge-resultado'
    };
    return `<span class="${clases[clas]}">${clas}</span>`;
}

/**
 * Devuelve el HTML de un badge según el estado.
 */
function obtenerBadgeEstado(estado: IIndicador['estado']): string {
    switch (estado) {
        case 'Activo':
            return '<span class="badge badge-activo">Activo</span>';
        case 'Inactivo':
            return '<span class="badge badge-inactivo">Inactivo</span>';
        case 'EnConfiguracion':
            return '<span class="badge badge-config">En config.</span>';
    }
}

// ================================================================
// RENDERIZADO — RESULTADOS
// ================================================================

/**
 * Renderiza la pestaña de resultados.
 */
function renderizarResultados(): void {
    const filtro = qsTipo<HTMLSelectElement>('#filtro-indicador-resultados');
    const contenedor = qs('#contenedor-resultados');
    const estadoVacio = qsTipo<HTMLElement>('#estado-vacio-resultados');

    if (!filtro || !contenedor) return;

    // Poblar el select con todos los indicadores
    filtro.innerHTML = `
        <option value="">Seleccionar indicador...</option>
        ${indicadores.map(i => `
            <option value="${escaparHTML(i.id)}" ${indicadorSeleccionadoId === i.id ? 'selected' : ''}>
                ${escaparHTML(i.nombre)}
            </option>
        `).join('')}
    `;

    // Si no hay indicador seleccionado
    if (!indicadorSeleccionadoId) {
        contenedor.innerHTML = '';
        if (estadoVacio) estadoVacio.style.display = 'flex';
        return;
    }

    if (estadoVacio) estadoVacio.style.display = 'none';

    const indicador = indicadores.find(i => i.id === indicadorSeleccionadoId);
    if (!indicador) {
        contenedor.innerHTML = `<p class="text-muted">Indicador no encontrado.</p>`;
        return;
    }

    const resultados = obtenerResultadosIndicador(indicador.id);

    if (resultados.length === 0) {
        contenedor.innerHTML = `
            <p class="text-muted">Este indicador aún no tiene resultados registrados.</p>
            <button
                class="btn btn-primary btn-nuevo-resultado"
                data-indicador-id="${escaparHTML(indicador.id)}"
                type="button"
            >➕ Registrar primer resultado</button>
        `;
    } else {
        contenedor.innerHTML = `
            <div class="lista-resultados">
                ${resultados.map(r => construirItemResultado(r, indicador)).join('')}
            </div>
        `;
    }

    // Configurar botón "Registrar resultado"
    contenedor.querySelectorAll('.btn-nuevo-resultado').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const id = target.dataset.indicadorId;
            if (id) abrirModalNuevoResultado(id);
        });
    });
}

/**
 * Construye el HTML de un resultado.
 */
function construirItemResultado(r: IResultadoIndicador, ind: IIndicador): string {
    const claseAlerta = `alerta-${r.semaforo.toLowerCase()}`;
    const icono = obtenerIconoSemaforo(r.semaforo);
    const colorSem = obtenerColorSemaforo(r.semaforo);

    return `
        <div class="resultado-item" style="border-left-color:${colorSem};">
            <div class="resultado-item-info">
                <h4>${escaparHTML(r.periodo)}</h4>
                <p><strong>Meta:</strong> ${r.metaPeriodo} ${escaparHTML(ind.unidadMedida)}</p>
                <p><strong>Cumplimiento:</strong> ${r.porcentajeCumplimiento}%</p>
                <p><strong>Registrado:</strong> ${formatearFecha(new Date(r.fechaCreacion))}</p>
                ${r.observaciones ? `<p><em>${escaparHTML(r.observaciones)}</em></p>` : ''}
            </div>
            <div class="resultado-item-valor" style="color:${colorSem};">
                ${icono} ${r.valor}
                <span style="font-size:0.7rem; color:#64748B; display:block; text-align:center;">
                    ${escaparHTML(ind.unidadMedida)}
                </span>
            </div>
            <button
                class="btn btn-sm btn-danger btn-eliminar-resultado"
                data-resultado-id="${escaparHTML(r.id)}"
                type="button"
            >🗑️</button>
        </div>
    `;
}

// ================================================================
// RENDERIZADO — REPORTES
// ================================================================

/**
 * Renderiza la pestaña de reportes.
 */
function renderizarReportes(): void {
    const periodoSelect = qsTipo<HTMLSelectElement>('#reporte-periodo');
    const contenedor = qs('#contenedor-reportes');

    if (!periodoSelect || !contenedor) return;

    // Poblar select de periodos únicos
    const periodosSet = new Set<string>();
    storageResultadosIndicadores
        .obtenerTodos()
        .filter(r => indicadores.some(i => i.id === r.indicadorId))
        .forEach(r => periodosSet.add(r.periodo));

    const periodos = Array.from(periodosSet).sort().reverse();

    periodoSelect.innerHTML = `
        <option value="">Todos los periodos</option>
        ${periodos.map(p => `<option value="${escaparHTML(p)}">${escaparHTML(p)}</option>`).join('')}
    `;

    // Vista previa inicial
    contenedor.innerHTML = `
        <div class="vista-previa-reporte">
            <h4>📄 Vista Previa del Reporte</h4>
            <p>Configure los filtros y presione "Generar Reporte PDF".</p>
            <p><strong>Total de indicadores:</strong> ${indicadores.length}</p>
            <p><strong>Total de resultados registrados:</strong> ${storageResultadosIndicadores.obtenerTodos().length}</p>
        </div>
    `;
}

// ================================================================
// CONFIGURACIÓN DE TABS
// ================================================================

/**
 * Configura las pestañas principales.
 */
function configurarTabs(): void {
    const tabNav = qs('#tab-container-indicadores');
    if (!tabNav) return;

    const botones = tabNav.querySelectorAll('.tab-button');
    const tabs: Record<string, HTMLElement | null> = {
        dashboard: qsTipo<HTMLElement>('#tab-dashboard'),
        indicadores: qsTipo<HTMLElement>('#tab-indicadores'),
        resultados: qsTipo<HTMLElement>('#tab-resultados'),
        reportes: qsTipo<HTMLElement>('#tab-reportes')
    };

    botones.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = (btn as HTMLElement).dataset.tab;
            if (!tabId) return;

            tabActivo = tabId;

            Object.values(tabs).forEach(t => t?.classList.add('hidden'));
            tabs[tabId]?.classList.remove('hidden');

            botones.forEach(b => b.classList.toggle('active', b === btn));

            // Re-renderizar según tab
            if (tabId === 'dashboard') renderizarDashboard();
            if (tabId === 'indicadores') renderizarTabla();
            if (tabId === 'resultados') renderizarResultados();
            if (tabId === 'reportes') renderizarReportes();
        });
    });
}

// ================================================================
// CONFIGURACIÓN DE BOTONES
// ================================================================

/**
 * Configura los botones generales.
 */
function configurarBotones(): void {
    // Botón "Nuevo Indicador"
    const btnNuevo = qs('#btn-nuevo-indicador');
    if (btnNuevo) btnNuevo.addEventListener('click', abrirModalNuevoIndicador);

    // Botón "Nuevo Indicador" (estado vacío)
    const btnNuevoVacio = qs('#btn-nuevo-indicador-vacio');
    if (btnNuevoVacio) btnNuevoVacio.addEventListener('click', abrirModalNuevoIndicador);

    // Filtros de la tabla
    const filtroClas = qsTipo<HTMLSelectElement>('#filtro-clasificacion');
    if (filtroClas) filtroClas.addEventListener('change', aplicarFiltros);

    const filtroSem = qsTipo<HTMLSelectElement>('#filtro-semaforo');
    if (filtroSem) filtroSem.addEventListener('change', aplicarFiltros);

    const filtroEst = qsTipo<HTMLSelectElement>('#filtro-estado');
    if (filtroEst) filtroEst.addEventListener('change', aplicarFiltros);

    // Filtro de resultados
    const filtroInd = qsTipo<HTMLSelectElement>('#filtro-indicador-resultados');
    if (filtroInd) {
        filtroInd.addEventListener('change', () => {
            indicadorSeleccionadoId = filtroInd.value;
            renderizarResultados();
        });
    }

    // Botones de reportes
    const btnReporte = qs('#btn-generar-reporte');
    if (btnReporte) btnReporte.addEventListener('click', () => generarReporte(false));

    const btnReporteAnual = qs('#btn-generar-reporte-anual');
    if (btnReporteAnual) btnReporteAnual.addEventListener('click', () => generarReporte(true));
}

// ================================================================
// FILTROS
// ================================================================

/**
 * Aplica los filtros de la tabla.
 */
function aplicarFiltros(): void {
    const filtroClas = (qsTipo<HTMLSelectElement>('#filtro-clasificacion')?.value || '') as ClasificacionIndicador | '';
    const filtroSem = qsTipo<HTMLSelectElement>('#filtro-semaforo')?.value || '';
    const filtroEst = qsTipo<HTMLSelectElement>('#filtro-estado')?.value || '';

    indicadoresFiltrados = indicadores.filter(ind => {
        if (filtroClas && ind.clasificacion !== filtroClas) return false;
        if (filtroEst && ind.estado !== filtroEst) return false;

        if (filtroSem) {
            const resultados = obtenerResultadosIndicador(ind.id);
            if (resultados.length === 0) return false;
            const ultimo = resultados[resultados.length - 1];
            if (ultimo.semaforo !== filtroSem) return false;
        }

        return true;
    });

    renderizarTabla();
}

// ================================================================
// MODAL — NUEVO INDICADOR
// ================================================================

/**
 * Abre el modal para crear un nuevo indicador (personalizado).
 */
function abrirModalNuevoIndicador(): void {
    let modal: HTMLElement | null = qsTipo<HTMLElement>('#modal-nuevo-indicador');
    if (!modal) {
        const nuevoModal = document.createElement('div');
        nuevoModal.id = 'modal-nuevo-indicador';
        nuevoModal.className = 'modal-overlay';
        document.body.appendChild(nuevoModal);
        modal = nuevoModal;
    }

    const contenido = `
        <div class="modal-contenido modal-lg" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h2>➕ Nuevo Indicador</h2>
                <button id="modal-cerrar" class="btn-cerrar" type="button" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body">
                <div class="info-box">
                    <strong>Ficha técnica obligatoria</strong><br>
                    Complete los 7 campos del Decreto 1072 art. 2.2.4.6.19.
                </div>

                <div class="form-grid">
                    <div class="form-group ancho-completo">
                        <label>Nombre del Indicador <span class="required">*</span></label>
                        <input type="text" id="ind-nombre" placeholder="Ej: Cumplimiento del Plan de Trabajo" />
                    </div>

                    <div class="form-group">
                        <label>Clasificación <span class="required">*</span></label>
                        <select id="ind-clasificacion">
                            <option value="Estructura">Estructura (Planear)</option>
                            <option value="Proceso" selected>Proceso (Hacer)</option>
                            <option value="Resultado">Resultado (Verificar)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Periodicidad <span class="required">*</span></label>
                        <select id="ind-periodicidad">
                            <option value="Mensual" selected>Mensual</option>
                            <option value="Trimestral">Trimestral</option>
                            <option value="Semestral">Semestral</option>
                            <option value="Anual">Anual</option>
                        </select>
                    </div>

                    <div class="form-group ancho-completo">
                        <label>Definición <span class="required">*</span></label>
                        <textarea id="ind-definicion" placeholder="Definición detallada del indicador y su propósito..."></textarea>
                    </div>

                    <div class="form-group ancho-completo">
                        <label>Fórmula de Cálculo <span class="required">*</span></label>
                        <input type="text" id="ind-formula" placeholder="Ej: (Ejecutadas / Programadas) × 100" />
                    </div>

                    <div class="form-group">
                        <label>Tipo de Resultado <span class="required">*</span></label>
                        <select id="ind-tipo-resultado">
                            <option value="Porcentaje">Porcentaje (%)</option>
                            <option value="Numero">Número</option>
                            <option value="Tasa">Tasa</option>
                            <option value="Indice">Índice</option>
                            <option value="Dias">Días</option>
                            <option value="Booleano">Booleano</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Unidad de Medida</label>
                        <input type="text" id="ind-unidad" value="%" />
                    </div>

                    <div class="form-group">
                        <label>Meta o Límite Esperado <span class="required">*</span></label>
                        <input type="text" id="ind-meta" placeholder="Ej: >= 90% o < 2.0" />
                    </div>

                    <div class="form-group">
                        <label>Tipo de Medición</label>
                        <select id="ind-tipo-medida">
                            <option value="Formula">Fórmula</option>
                            <option value="CumpleNoCumple">Cumple / No Cumple</option>
                            <option value="Manual">Manual</option>
                        </select>
                    </div>

                    <div class="form-group ancho-completo">
                        <label>Fuente de Información</label>
                        <input type="text" id="ind-fuente" placeholder="Ej: Cronograma y actas de ejecución" />
                    </div>

                    <div class="form-group">
                        <label>Responsable de Medición</label>
                        <input type="text" id="ind-responsable" placeholder="Ej: Responsable del SG-SST" />
                    </div>

                    <div class="form-group">
                        <label>Interpretación</label>
                        <input type="text" id="ind-interpretacion" placeholder="Ej: Alto cumplimiento del plan" />
                    </div>

                    <div class="form-group ancho-completo">
                        <label>Destinatarios del Reporte</label>
                        <select id="ind-destinatarios" multiple size="4">
                            <option value="AltaDireccion" selected>Alta Dirección</option>
                            <option value="Copasst" selected>COPASST / Vigía</option>
                            <option value="ARL">ARL</option>
                            <option value="MinisterioTrabajo">Ministerio del Trabajo</option>
                            <option value="Trabajadores">Trabajadores</option>
                        </select>
                        <small>Mantenga presionado Ctrl para seleccionar varios.</small>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="modal-cancelar" class="btn btn-outline" type="button">Cancelar</button>
                <button id="modal-guardar" class="btn btn-success" type="button">💾 Crear Indicador</button>
            </div>
        </div>
    `;

    modal.innerHTML = contenido;
    modal.style.display = 'flex';

    // Configurar botones
    const btnCerrar = qs('#modal-cerrar');
    const btnCancelar = qs('#modal-cancelar');
    const btnGuardar = qs('#modal-guardar');

    const cerrar = (): void => { modal!.style.display = 'none'; };

    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrar);
    if (btnGuardar) btnGuardar.addEventListener('click', () => {
        guardarNuevoIndicador();
        cerrar();
    });
}

/**
 * Guarda el nuevo indicador.
 */
function guardarNuevoIndicador(): void {
    const nombre = qsTipo<HTMLInputElement>('#ind-nombre')?.value.trim() || '';
    const clasificacion = qsTipo<HTMLSelectElement>('#ind-clasificacion')?.value as ClasificacionIndicador;
    const periodicidad = qsTipo<HTMLSelectElement>('#ind-periodicidad')?.value as Periodicidad;
    const definicion = qsTipo<HTMLTextAreaElement>('#ind-definicion')?.value.trim() || '';
    const formula = qsTipo<HTMLInputElement>('#ind-formula')?.value.trim() || '';
    const tipoResultado = qsTipo<HTMLSelectElement>('#ind-tipo-resultado')?.value as TipoResultado;
    const unidadMedida = qsTipo<HTMLInputElement>('#ind-unidad')?.value.trim() || '';
    const meta = qsTipo<HTMLInputElement>('#ind-meta')?.value.trim() || '';
    const tipoMedida = qsTipo<HTMLSelectElement>('#ind-tipo-medida')?.value as TipoMedida;
    const fuente = qsTipo<HTMLInputElement>('#ind-fuente')?.value.trim() || '';
    const responsable = qsTipo<HTMLInputElement>('#ind-responsable')?.value.trim() || '';
    const interpretacion = qsTipo<HTMLInputElement>('#ind-interpretacion')?.value.trim() || '';

    // Destinatarios (multiple select)
    const selectDest = qsTipo<HTMLSelectElement>('#ind-destinatarios');
    const destinatarios: DestinatarioIndicador[] = [];
    if (selectDest) {
        Array.from(selectDest.selectedOptions).forEach(opt => {
            destinatarios.push(opt.value as DestinatarioIndicador);
        });
    }

    // Validaciones
    if (!nombre) { alert('⚠️ Debe ingresar el nombre del indicador.'); return; }
    if (!definicion) { alert('⚠️ Debe ingresar la definición.'); return; }
    if (!formula) { alert('⚠️ Debe ingresar la fórmula.'); return; }
    if (!meta) { alert('⚠️ Debe ingresar la meta.'); return; }

    const nuevo: IIndicador = {
        id: generarIdIndicador(),
        empresaId: empresaActivaNit,
        nombre,
        clasificacion,
        tipoMinimo: 'Personalizado' as TipoIndicadorMinimo,
        esPredefinido: false,

        definicion,
        interpretacion: interpretacion || definicion,
        limiteEsperado: meta,
        formula,
        fuenteInformacion: fuente || 'Registros internos',
        responsables: responsable || 'Responsable del SG-SST',
        periodicidad,

        tipoMedida,
        tipoCalculo: 'Manual' as TipoCalculoAutomatico,
        constanteK: null,
        variablesFormula: [],
        tipoResultado,
        unidadMedida,
        metaEsperada: 0,

        rangoVerde: 'Cumple la meta',
        rangoAmarillo: 'Cerca de la meta',
        rangoRojo: 'Incumple la meta',

        destinatarios: destinatarios.length > 0 ? destinatarios : ['AltaDireccion'],
        estado: 'Activo',
        descripcion: definicion,

        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    const ok = storageIndicadores.guardar(nuevo);
    if (ok) {
        alert(`✅ Indicador "${nombre}" creado exitosamente.`);
        cargarIndicadores();
        renderizarDashboard();
        renderizarTabla();
        renderizarResultados();
    } else {
        alert('❌ No se pudo crear el indicador.');
    }
}

// ================================================================
// MODAL — NUEVO RESULTADO
// ================================================================

/**
 * Abre el modal para registrar un resultado de un indicador.
 */
function abrirModalNuevoResultado(indicadorId: string): void {
    const ind = indicadores.find(i => i.id === indicadorId);
    if (!ind) {
        alert('⚠️ Indicador no encontrado.');
        return;
    }

    let modal: HTMLElement | null = qsTipo<HTMLElement>('#modal-nuevo-resultado');
    if (!modal) {
        const nuevoModal = document.createElement('div');
        nuevoModal.id = 'modal-nuevo-resultado';
        nuevoModal.className = 'modal-overlay';
        document.body.appendChild(nuevoModal);
        modal = nuevoModal;
    }

    const periodo = periodoActual(ind.periodicidad);

    modal.innerHTML = `
        <div class="modal-contenido" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h2>📅 Registrar Resultado</h2>
                <button id="modal-cerrar" class="btn-cerrar" type="button" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body">
                <div class="info-box">
                    <strong>${escaparHTML(ind.nombre)}</strong><br>
                    Clasificación: ${escaparHTML(ind.clasificacion)} · Periodicidad: ${escaparHTML(ind.periodicidad)}<br>
                    Fórmula: ${escaparHTML(ind.formula)}<br>
                    Meta: ${escaparHTML(ind.limiteEsperado)}
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Periodo <span class="required">*</span></label>
                        <input type="text" id="res-periodo" value="${periodo}" placeholder="YYYY-MM" />
                        <small>Formato según periodicidad: ${ind.periodicidad}</small>
                    </div>

                    <div class="form-group">
                        <label>Meta del Periodo</label>
                        <input type="number" id="res-meta" value="${ind.metaEsperada || 0}" step="0.01" />
                    </div>

                    <div class="form-group">
                        <label>Valor Medido <span class="required">*</span></label>
                        <input type="number" id="res-valor" step="0.01" placeholder="Ej: 85.5" />
                        <small>Unidad: ${escaparHTML(ind.unidadMedida)}</small>
                    </div>

                    <div class="form-group ancho-completo">
                        <label>Observaciones</label>
                        <textarea id="res-observaciones" placeholder="Observaciones sobre el resultado..."></textarea>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="modal-cancelar" class="btn btn-outline" type="button">Cancelar</button>
                <button id="modal-guardar" class="btn btn-success" type="button">💾 Guardar Resultado</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const btnCerrar = qs('#modal-cerrar');
    const btnCancelar = qs('#modal-cancelar');
    const btnGuardar = qs('#modal-guardar');

    const cerrar = (): void => { modal!.style.display = 'none'; };

    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrar);
    if (btnGuardar) btnGuardar.addEventListener('click', () => {
        guardarNuevoResultado(ind);
        cerrar();
    });
}

/**
 * Guarda el nuevo resultado.
 */
function guardarNuevoResultado(ind: IIndicador): void {
    const periodo = qsTipo<HTMLInputElement>('#res-periodo')?.value.trim() || '';
    const metaPeriodo = parseFloat(qsTipo<HTMLInputElement>('#res-meta')?.value || '0');
    const valor = parseFloat(qsTipo<HTMLInputElement>('#res-valor')?.value || '0');
    const observaciones = qsTipo<HTMLTextAreaElement>('#res-observaciones')?.value.trim() || '';

    if (!periodo) { alert('⚠️ Debe ingresar el periodo.'); return; }
    if (isNaN(valor)) { alert('⚠️ Debe ingresar el valor medido.'); return; }

    // Calcular semáforo y cumplimiento
    const porcentajeCumplimiento = metaPeriodo > 0
        ? calcularPorcentajeCumplimiento(valor, metaPeriodo)
        : 0;

    const semaforo = ind.clasificacion === 'Resultado'
        ? calcularSemaforoMenorEsMejor(valor, metaPeriodo)
        : calcularSemaforo(porcentajeCumplimiento);

    const alertaGenerada = semaforo !== 'Verde';

    const nuevo: IResultadoIndicador = {
        id: generarIdResultado(),
        empresaId: empresaActivaNit,
        indicadorId: ind.id,
        periodo,
        valor,
        metaPeriodo,
        porcentajeCumplimiento,
        semaforo,
        alertaGenerada,
        planAccionId: null,
        evidencias: [],
        observaciones: observaciones || null,
        validado: false,
        validadoPor: null,
        fechaValidacion: null,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    const ok = storageResultadosIndicadores.guardar(nuevo);

    if (ok) {
        // Si está en rojo, abrir plan de acción automáticamente
        if (semaforo === 'Rojo') {
            const confirmar = confirm(
                `🔴 El resultado está en ROJO. ¿Desea abrir un plan de acción ahora?`
            );
            if (confirmar) {
                console.info(`M23: Se debe abrir plan de acción para el resultado ${nuevo.id}.`);
                // TODO: abrirModalNuevoPlanAccion(nuevo.id);
            }
        }

        alert(`✅ Resultado guardado. Semáforo: ${semaforo}`);
        renderizarDashboard();
        renderizarTabla();
        renderizarResultados();
    } else {
        alert('❌ No se pudo guardar el resultado.');
    }
}

// ================================================================
// GENERAR REPORTE
// ================================================================

/**
 * Genera un reporte de indicadores usando window.print().
 * 
 * @param anual - Si es true, genera un reporte anual completo.
 */
function generarReporte(anual: boolean): void {
    const contenedor = qs('#contenedor-reportes');
    if (!contenedor) return;

    const periodoFiltro = qsTipo<HTMLSelectElement>('#reporte-periodo')?.value || '';
    const clasFiltro = qsTipo<HTMLSelectElement>('#reporte-clasificacion')?.value || '';
    const destFiltro = qsTipo<HTMLSelectElement>('#reporte-destinatario')?.value || '';

    const indicadoresReporte = indicadores.filter(ind => {
        if (clasFiltro && ind.clasificacion !== clasFiltro) return false;
        if (destFiltro && !ind.destinatarios.includes(destFiltro as DestinatarioIndicador)) return false;
        return true;
    });

    const filasReporte = indicadoresReporte.map(ind => {
        const resultados = obtenerResultadosIndicador(ind.id);
        const filtrados = periodoFiltro
            ? resultados.filter(r => r.periodo === periodoFiltro)
            : resultados;

        const ultimo = filtrados.length > 0 ? filtrados[filtrados.length - 1] : null;
        const valorMostrado = ultimo ? `${ultimo.valor} ${ind.unidadMedida}` : '—';
        const semaforoMostrado = ultimo
            ? `${obtenerIconoSemaforo(ultimo.semaforo)} ${ultimo.semaforo}`
            : '⏳ Sin datos';

        return `
            <tr>
                <td>${escaparHTML(ind.nombre)}</td>
                <td>${escaparHTML(ind.clasificacion)}</td>
                <td>${escaparHTML(ind.periodicidad)}</td>
                <td>${escaparHTML(ind.limiteEsperado)}</td>
                <td>${valorMostrado}</td>
                <td>${semaforoMostrado}</td>
            </tr>
        `;
    }).join('');

    contenedor.innerHTML = `
        <div class="vista-previa-reporte">
            <h4>📄 Reporte de Indicadores ${anual ? 'Anual' : ''}</h4>
            <p><strong>Empresa:</strong> ${escaparHTML(empresaActivaNombre)}</p>
            <p><strong>NIT:</strong> ${escaparHTML(empresaActivaNit)}</p>
            <p><strong>Fecha:</strong> ${formatearFecha(new Date())}</p>
            <p><strong>Total indicadores:</strong> ${indicadoresReporte.length}</p>
            <hr style="margin: 1rem 0; border: none; border-top: 1px solid #e2e8f0;">
            <div class="tabla-scroll">
                <table class="tabla-datos">
                    <thead>
                        <tr>
                            <th>Indicador</th>
                            <th>Clasificación</th>
                            <th>Periodicidad</th>
                            <th>Meta</th>
                            <th>Último valor</th>
                            <th>Semáforo</th>
                        </tr>
                    </thead>
                    <tbody>${filasReporte}</tbody>
                </table>
            </div>
        </div>
    `;

    // Abrir diálogo de impresión después de un pequeño delay
    setTimeout(() => window.print(), 300);
}

// ================================================================
// ABRIR DETALLE EN PESTAÑA NUEVA
// ================================================================

/**
 * Abre el detalle de un indicador en pestaña nueva.
 */
function abrirDetalleIndicador(indicadorId: string): void {
    const ind = storageIndicadores.obtenerPorId(indicadorId);
    if (!ind) {
        alert('⚠️ No se encontró el indicador.');
        return;
    }

    localStorage.setItem('indicadorIdActiva', indicadorId);
    localStorage.setItem('indicadorEmpresaNit', ind.empresaId);

    const url = 'modules/M23-Gestion-Indicadores/indicador-detalle.html';
    window.open(url, '_blank');

    console.info(`M23: Abriendo detalle del indicador ${indicadorId}.`);
}

// ================================================================
// ELIMINAR INDICADOR
// ================================================================

/**
 * Elimina un indicador y todos sus resultados.
 */
function eliminarIndicador(indicadorId: string): void {
    const ind = storageIndicadores.obtenerPorId(indicadorId);
    if (!ind) {
        alert('⚠️ No se encontró el indicador.');
        return;
    }

    if (ind.esPredefinido) {
        alert('⚠️ No se pueden eliminar indicadores mínimos obligatorios (Res. 0312).');
        return;
    }

    const confirmar = confirm(
        `¿Está seguro de eliminar el indicador "${ind.nombre}"?\n\n` +
        `También se eliminarán todos sus resultados registrados.`
    );

    if (!confirmar) return;

    // Eliminar resultados
    const resultados = obtenerResultadosIndicador(indicadorId);
    resultados.forEach(r => storageResultadosIndicadores.eliminar(r.id));

    // Eliminar indicador
    const ok = storageIndicadores.eliminar(indicadorId);

    if (ok) {
        alert(`✅ Indicador "${ind.nombre}" eliminado.`);
        cargarIndicadores();
        renderizarDashboard();
        renderizarTabla();
        renderizarResultados();
    } else {
        alert('❌ No se pudo eliminar el indicador.');
    }
}

// ================================================================
// VOLVER DEL DETALLE
// ================================================================

/**
 * Maneja el evento "indicador:volver-dashboard".
 */
function manejarVolverDelDetalle(): void {
    localStorage.removeItem('indicadorIdActiva');
    localStorage.removeItem('indicadorEmpresaNit');
    localStorage.removeItem('indicadorImprimir');

    cargarIndicadores();
    renderizarDashboard();
    renderizarTabla();
    renderizarResultados();

    console.info('M23: Volviendo al dashboard (recargado).');
}