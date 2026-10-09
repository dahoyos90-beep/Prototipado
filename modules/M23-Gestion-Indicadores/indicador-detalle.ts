/**
 * modules/M23-Gestion-Indicadores/indicador-detalle.ts
 * 
 * Lógica del detalle de un Indicador SG-SST.
 * Módulo M23 - Gestión de Indicadores.
 * 
 * Se abre en pestaña nueva desde indicadores-dashboard.ts.
 * Lee indicadorIdActiva y indicadorEmpresaNit de localStorage.
 * 
 * Responsabilidades:
 * - Cargar el CSS del módulo dinámicamente.
 * - Construir el dashboard completo (encabezado + banner + ficha + resultados + tendencia).
 * - Gestionar resultados (registrar / eliminar).
 * - Mostrar plan de acción si existe.
 * - Mostrar sección HHT si aplica.
 * - Imprimir el detalle con window.print().
 * - Volver al dashboard (disparar evento).
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (art. 2.2.4.6.19 — Ficha técnica)
 * - Resolución 0312 de 2019
 * - NTC 3701 / NTC 3793
 * 
 * @version 1.0.0
 * @since 2026-10-08
 */

import {
    qsTipo,
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
import {
    obtenerIconoSemaforo,
    obtenerColorSemaforo,
    obtenerEtiquetaSemaforo,
    obtenerIconoTendencia,
    obtenerEtiquetaTendencia,
    obtenerColorTendencia,
    calcularSemaforo,
    calcularSemaforoMenorEsMejor,
    calcularTendencia,
    calcularPorcentajeCumplimiento,
    calcularHHT,
    calcularHorasOrdinarias,
    generarIdResultado,
    generarIdCalculoHHT,
    redondear
} from '../../src/indicadores-utils.js';
import type {
    IIndicador,
    IResultadoIndicador,
    ICalculoHHT,
    IPlanAccionIndicador,
    ITendenciaIndicador
} from '../../src/interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** ID del <link> del CSS del módulo (para no duplicarlo). */
const CSS_LINK_ID = 'modulo-indicador-detalle-css';

/** Ruta del CSS del módulo. */
const CSS_HREF = 'modules/M23-Gestion-Indicadores/indicador-detalle.css';

// ================================================================
// ESTADO DEL MÓDULO
// ================================================================

/** Indicador actualmente cargado. */
let indicadorActual: IIndicador | null = null;

/** Resultados del indicador (ordenados cronológicamente). */
let resultadosActuales: IResultadoIndicador[] = [];

/** Tendencia calculada. */
let tendenciaActual: ITendenciaIndicador | null = null;

/** Nombre de la empresa. */
let empresaNombre: string = 'Empresa';

/** NIT de la empresa. */
let empresaNit: string = '';

/** Bandera: hay cambios sin guardar. */
let hayCambios = false;

/** Bandera: se debe imprimir al cargar. */
let debeImprimir = false;

/** Contenedor raíz. */
let contenedorRaiz: HTMLElement | null = null;

// ================================================================
// ARRANQUE
// ================================================================

/**
 * Arranca el módulo (busca el contenedor y llama a init).
 */
function arrancar(): void {
    const contenedor = document.querySelector('#indicador-detalle-container') as HTMLElement | null;

    if (!contenedor) {
        console.error('❌ M23 Detalle: No se encontró #indicador-detalle-container.');
        return;
    }

    contenedorRaiz = contenedor;
    init(contenedor);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
} else {
    arrancar();
}

// ================================================================
// INICIALIZACIÓN
// ================================================================

/**
 * Punto de entrada del módulo.
 */
function init(contenedor: HTMLElement): void {
    console.info('📈 M23 Detalle: Inicializando...');

    // 0. Cargar CSS del módulo
    cargarCSSModulo();

    // 1. Leer localStorage
    const indicadorId = localStorage.getItem('indicadorIdActiva') || '';
    const nit = localStorage.getItem('indicadorEmpresaNit') || '';
    debeImprimir = localStorage.getItem('indicadorImprimir') === 'true';

    if (!indicadorId) {
        contenedor.innerHTML = `<div class="card"><p>⚠️ No se especificó un indicador.</p></div>`;
        console.error('M23 Detalle: No hay indicadorIdActiva.');
        return;
    }

    if (!nit) {
        contenedor.innerHTML = `<div class="card"><p>⚠️ No se especificó la empresa.</p></div>`;
        console.error('M23 Detalle: No hay indicadorEmpresaNit.');
        return;
    }

    empresaNit = nit;

    // 2. Cargar indicador
    const indicador = storageIndicadores.obtenerPorId(indicadorId);
    if (!indicador) {
        contenedor.innerHTML = `<div class="card"><p>⚠️ Indicador no encontrado.</p></div>`;
        console.error(`M23 Detalle: No existe indicador con ID ${indicadorId}.`);
        return;
    }

    indicadorActual = indicador;

    // 3. Cargar empresa
    const empresa = storageEmpresas.obtenerPorId(nit);
    empresaNombre = empresa?.razonSocial || 'Empresa';

    // 4. Cargar resultados
    cargarResultados();

    // 5. Calcular tendencia
    if (indicadorActual) {
        tendenciaActual = calcularTendencia(
            resultadosActuales,
            indicadorActual.nombre,
            indicadorActual.clasificacion
        );
    }

    // 6. Construir dashboard
    construirDashboard(contenedor);

    // 7. beforeunload
    window.addEventListener('beforeunload', (e) => {
        if (hayCambios) e.preventDefault();
    });

    // 8. Si se debe imprimir
    if (debeImprimir) {
        setTimeout(() => window.print(), 600);
    }

    console.info(`✅ M23 Detalle: Indicador "${indicador.nombre}" cargado.`);
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

    console.info('M23 Detalle: CSS del módulo cargado.');
}

/**
 * Carga los resultados del indicador.
 */
function cargarResultados(): void {
    if (!indicadorActual) return;

    resultadosActuales = storageResultadosIndicadores
        .obtenerTodos()
        .filter(r => r.indicadorId === indicadorActual!.id)
        .sort((a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime());
}

// ================================================================
// CONSTRUCCIÓN DEL DASHBOARD
// ================================================================

/**
 * Construye todo el HTML del dashboard del detalle.
 */
function construirDashboard(contenedor: HTMLElement): void {
    if (!indicadorActual) return;

    contenedor.innerHTML = `
        ${construirBotonVolver()}
        ${construirBannerSemaforo()}
        ${construirEncabezado()}
        ${construirFichaTecnica()}
        ${construirSeccionResultados()}
        ${construirSeccionTendencia()}
        ${construirSeccionPlanAccion()}
        ${construirSeccionHHT()}
        ${construirAccionesInferiores()}
    `;

    configurarEventos();
}

/**
 * Construye el botón "Volver al Dashboard".
 */
function construirBotonVolver(): string {
    return `
        <div class="card" style="padding: 0.75rem 1rem;">
            <button id="btn-volver-dashboard" class="btn btn-outline btn-sm" type="button">
                ← Volver al Dashboard
            </button>
        </div>
    `;
}

/**
 * Construye el banner de estado (semáforo actual).
 */
function construirBannerSemaforo(): string {
    if (!indicadorActual) return '';

    let semaforo: 'verde' | 'amarillo' | 'rojo' | 'sin-datos' = 'sin-datos';
    let valorMostrado = '—';
    let metaMostrada = indicadorActual.limiteEsperado;

    if (resultadosActuales.length > 0) {
        const ultimo = resultadosActuales[resultadosActuales.length - 1];
        semaforo = ultimo.semaforo.toLowerCase() as 'verde' | 'amarillo' | 'rojo';
        valorMostrado = `${ultimo.valor} ${indicadorActual.unidadMedida}`;
    }

    const titulos: Record<string, string> = {
        'verde': '🟢 Indicador en estado ÓPTIMO',
        'amarillo': '🟡 Indicador en ALERTA',
        'rojo': '🔴 Indicador CRÍTICO — requiere acción inmediata',
        'sin-datos': '⏳ Sin datos registrados'
    };

    const titulo = titulos[semaforo] || titulos['sin-datos'];
    const mensaje = semaforo === 'sin-datos'
        ? 'Registre el primer resultado para ver el estado del indicador.'
        : `Valor actual: ${valorMostrado} | Meta: ${metaMostrada}`;

    return `
        <div class="banner-semaforo ${semaforo}">
            <div class="banner-icono">${semaforo === 'sin-datos' ? '⏳' : obtenerIconoSemaforo(semaforo === 'verde' ? 'Verde' : semaforo === 'amarillo' ? 'Amarillo' : 'Rojo')}</div>
            <div class="banner-texto">
                <strong>${titulo}</strong>
                <span>${escaparHTML(mensaje)}</span>
            </div>
        </div>
    `;
}

/**
 * Construye el encabezado naranja con los datos del indicador.
 */
function construirEncabezado(): string {
    if (!indicadorActual) return '';
    const ind = indicadorActual;

    return `
        <div class="indicador-encabezado">
            <div class="indicador-encabezado-titulo">
                FICHA TÉCNICA DEL INDICADOR
            </div>
            <div class="indicador-encabezado-subtitulo">
                DECRETO 1072 DE 2015 · ARTÍCULO 2.2.4.6.19 · RESOLUCIÓN 0312 DE 2019
            </div>
            <div class="indicador-encabezado-grid">
                <div class="indicador-campo">
                    <label>Empresa</label>
                    <input type="text" value="${escaparHTML(empresaNombre)}" readonly />
                </div>
                <div class="indicador-campo">
                    <label>NIT</label>
                    <input type="text" value="${escaparHTML(empresaNit)}" readonly />
                </div>
                <div class="indicador-campo">
                    <label>Clasificación</label>
                    <input type="text" value="${escaparHTML(ind.clasificacion)}" readonly />
                </div>
                <div class="indicador-campo">
                    <label>Periodicidad</label>
                    <input type="text" value="${escaparHTML(ind.periodicidad)}" readonly />
                </div>
                <div class="indicador-campo">
                    <label>Unidad de Medida</label>
                    <input type="text" value="${escaparHTML(ind.unidadMedida)}" readonly />
                </div>
                <div class="indicador-campo">
                    <label>Meta / Límite Esperado</label>
                    <input type="text" value="${escaparHTML(ind.limiteEsperado)}" readonly />
                </div>
                <div class="indicador-campo">
                    <label>¿Predefinido?</label>
                    <input type="text" value="${ind.esPredefinido ? 'Sí (Res. 0312)' : 'No (Personalizado)'}" readonly />
                </div>
                <div class="indicador-campo">
                    <label>Estado</label>
                    <input type="text" value="${escaparHTML(ind.estado)}" readonly />
                </div>
            </div>
        </div>
    `;
}

/**
 * Construye la sección de la ficha técnica (7 campos Decreto 1072).
 */
function construirFichaTecnica(): string {
    if (!indicadorActual) return '';
    const ind = indicadorActual;

    return `
        <div class="card">
            <div class="seccion-header">
                <h2>📋 Ficha Técnica</h2>
                <div class="seccion-acciones">
                    <button id="btn-editar-indicador" class="btn btn-sm btn-outline" type="button">
                        ✏️ Editar
                    </button>
                </div>
            </div>

            <div class="ficha-tecnica">
                <div class="ficha-campo ancho-completo">
                    <label>1. Nombre del Indicador</label>
                    <div class="ficha-valor">${escaparHTML(ind.nombre)}</div>
                </div>
                <div class="ficha-campo ancho-completo">
                    <label>2. Definición</label>
                    <div class="ficha-valor">${escaparHTML(ind.definicion)}</div>
                </div>
                <div class="ficha-campo ancho-completo">
                    <label>3. Interpretación</label>
                    <div class="ficha-valor">${escaparHTML(ind.interpretacion)}</div>
                </div>
                <div class="ficha-campo">
                    <label>4. Límite o Valor Esperado</label>
                    <div class="ficha-valor">${escaparHTML(ind.limiteEsperado)}</div>
                </div>
                <div class="ficha-campo">
                    <label>5. Método de Cálculo</label>
                    <div class="ficha-valor formula">${escaparHTML(ind.formula)}</div>
                </div>
                <div class="ficha-campo">
                    <label>6. Fuente de Información</label>
                    <div class="ficha-valor">${escaparHTML(ind.fuenteInformacion)}</div>
                </div>
                <div class="ficha-campo">
                    <label>7. Periodicidad y Responsables</label>
                    <div class="ficha-valor">
                        <strong>Periodicidad:</strong> ${escaparHTML(ind.periodicidad)}<br>
                        <strong>Responsable:</strong> ${escaparHTML(ind.responsables)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Construye la sección de resultados.
 */
function construirSeccionResultados(): string {
    return `
        <div class="card">
            <div class="seccion-header">
                <h2>📅 Resultados por Periodo</h2>
                <div class="seccion-acciones">
                    <button id="btn-nuevo-resultado" class="btn btn-sm btn-success" type="button">
                        ➕ Nuevo Resultado
                    </button>
                </div>
            </div>

            ${resultadosActuales.length === 0 ? `
                <div class="estado-vacio">
                    <div class="estado-vacio-icono">📅</div>
                    <h3>Sin resultados registrados</h3>
                    <p>Comience registrando el primer resultado para este indicador.</p>
                    <button id="btn-nuevo-resultado-vacio" class="btn btn-primary" type="button">
                        ➕ Registrar primer resultado
                    </button>
                </div>
            ` : `
                <div class="tabla-scroll">
                    <table class="tabla-resultados">
                        <thead>
                            <tr>
                                <th>Periodo</th>
                                <th>Valor</th>
                                <th>Meta</th>
                                <th>% Cumpl.</th>
                                <th>Semáforo</th>
                                <th class="col-acciones">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${resultadosActuales.map(r => construirFilaResultado(r)).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
}

/**
 * Construye una fila de resultado.
 */
function construirFilaResultado(r: IResultadoIndicador): string {
    const claseSem = `badge badge-semaforo badge-semaforo-${r.semaforo.toLowerCase()}`;
    const icono = obtenerIconoSemaforo(r.semaforo);

    return `
        <tr data-resultado-id="${escaparHTML(r.id)}">
            <td><strong>${escaparHTML(r.periodo)}</strong></td>
            <td class="celda-centro">${r.valor}</td>
            <td class="celda-centro">${r.metaPeriodo}</td>
            <td class="celda-centro">${r.porcentajeCumplimiento}%</td>
            <td class="celda-centro">
                <span class="${claseSem}">${icono} ${r.semaforo}</span>
            </td>
            <td class="col-acciones">
                <button
                    class="btn btn-sm btn-danger btn-eliminar-resultado"
                    data-resultado-id="${escaparHTML(r.id)}"
                    title="Eliminar resultado"
                    type="button"
                >🗑️</button>
            </td>
        </tr>
    `;
}

/**
 * Construye la sección de tendencia histórica.
 */
function construirSeccionTendencia(): string {
    if (!indicadorActual || !tendenciaActual || tendenciaActual.totalPeriodos === 0) {
        return `
            <div class="card">
                <div class="seccion-header">
                    <h2>📈 Tendencia Histórica</h2>
                </div>
                <div class="estado-vacio">
                    <div class="estado-vacio-icono">📈</div>
                    <h3>Sin datos suficientes</h3>
                    <p>Registre al menos un resultado para ver la tendencia.</p>
                </div>
            </div>
        `;
    }

    const tend = tendenciaActual;
    const iconoTend = obtenerIconoTendencia(tend.estadoTendencia);
    const colorTend = obtenerColorTendencia(tend.estadoTendencia);
    const etiqueta = obtenerEtiquetaTendencia(tend.estadoTendencia);

    // Calcular altura máxima para escalar las barras
    const valoresMax = Math.max(...tend.datosHistoricos.map(d => d.valor), tend.peorValor);
    const alturaMax = valoresMax > 0 ? valoresMax : 1;

    const barrasHTML = tend.datosHistoricos.map(d => {
        const alturaPct = redondear((d.valor / alturaMax) * 100, 1);
        const claseColor = d.semaforo.toLowerCase();
        return `
            <div class="tendencia-barra">
                <span class="barra-valor">${d.valor}</span>
                <div class="barra-cuerpo ${claseColor}" style="height: ${Math.max(8, alturaPct * 1.5)}px;">
                    <div class="barra-meta"></div>
                </div>
                <span class="barra-periodo">${escaparHTML(d.periodo)}</span>
            </div>
        `;
    }).join('');

    return `
        <div class="card">
            <div class="seccion-header">
                <h2>📈 Tendencia Histórica</h2>
                <div style="color:${colorTend}; font-weight:700; font-size:0.9rem;">
                    ${iconoTend} ${etiqueta}
                </div>
            </div>

            <div class="tendencia-grafica">
                ${barrasHTML}
            </div>

            <div class="tendencia-stats">
                <div class="tendencia-stat">
                    <div class="stat-label">Valor Actual</div>
                    <div class="stat-valor">${tend.valorActual}</div>
                </div>
                <div class="tendencia-stat">
                    <div class="stat-label">Variación</div>
                    <div class="stat-valor" style="color:${colorTend};">
                        ${tend.variacionPorcentual > 0 ? '+' : ''}${tend.variacionPorcentual}%
                    </div>
                </div>
                <div class="tendencia-stat">
                    <div class="stat-label">Mejor Valor</div>
                    <div class="stat-valor">${tend.mejorValor}</div>
                </div>
                <div class="tendencia-stat">
                    <div class="stat-label">Peor Valor</div>
                    <div class="stat-valor">${tend.peorValor}</div>
                </div>
                <div class="tendencia-stat">
                    <div class="stat-label">Promedio</div>
                    <div class="stat-valor">${tend.promedioHistorico}</div>
                </div>
                <div class="tendencia-stat">
                    <div class="stat-label">Periodos</div>
                    <div class="stat-valor">${tend.totalPeriodos}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Construye la sección de Plan de Acción (si existe).
 */
function construirSeccionPlanAccion(): string {
    if (!indicadorActual) return '';

    const planes = storagePlanesAccionIndicador
        .obtenerTodos()
        .filter(p => p.indicadorId === indicadorActual!.id);

    if (planes.length === 0) return '';

    const plan = planes[planes.length - 1];

    return `
        <div class="card">
            <div class="seccion-header">
                <h2>⚠️ Plan de Acción</h2>
                <div class="seccion-acciones">
                    <span class="badge badge-semaforo badge-semaforo-rojo" style="padding:0.375rem 0.75rem;">
                        Estado: ${escaparHTML(plan.estado)}
                    </span>
                </div>
            </div>

            <div class="info-box info-box-critica">
                <strong>Objetivo del plan</strong><br>
                ${escaparHTML(plan.objetivo)}
            </div>

            <div class="accion-item-meta" style="margin-bottom: 1rem;">
                <span><strong>Responsable:</strong> ${escaparHTML(plan.responsablePlan)}</span>
                <span><strong>Apertura:</strong> ${formatearFecha(plan.fechaApertura)}</span>
                <span><strong>Compromiso:</strong> ${formatearFecha(plan.fechaCompromiso)}</span>
                <span><strong>Avance:</strong> ${plan.avanceGeneral}%</span>
            </div>

            ${plan.acciones.length > 0 ? `
                <div class="lista-acciones">
                    ${plan.acciones.map(a => `
                        <div class="accion-item estado-${a.estado.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase()}">
                            <div class="accion-item-header">
                                <h4>${escaparHTML(a.descripcion)}</h4>
                                <span class="badge badge-semaforo badge-semaforo-${a.estado === 'Completada' ? 'verde' : a.estado === 'Atrasada' ? 'rojo' : 'amarillo'}">
                                    ${escaparHTML(a.estado)}
                                </span>
                            </div>
                            <div class="accion-item-meta">
                                <span><strong>Responsable:</strong> ${escaparHTML(a.responsable)}</span>
                                <span><strong>Límite:</strong> ${formatearFecha(a.fechaLimite)}</span>
                                <span><strong>Avance:</strong> ${a.avancePorcentaje}%</span>
                            </div>
                            <div class="accion-progreso">
                                <div class="accion-progreso-relleno" style="width: ${a.avancePorcentaje}%;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <p class="text-muted">Aún no se han definido acciones para este plan.</p>
            `}
        </div>
    `;
}

/**
 * Construye la sección HHT (si aplica).
 */
function construirSeccionHHT(): string {
    if (!indicadorActual) return '';

    // Solo mostrar si el tipo de cálculo es IFAT, ISAT o ILIAT
    const tiposConHHT = ['IFAT', 'ISAT', 'ILIAT'];
    if (!tiposConHHT.includes(indicadorActual.tipoCalculo)) return '';

    const calculos = storageCalculosHHT
        .obtenerTodos()
        .filter(c => c.empresaId === empresaNit)
        .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());

    const ultimoCalculo = calculos.length > 0 ? calculos[0] : null;

    return `
        <div class="card">
            <div class="seccion-header">
                <h2>🧮 Cálculo de HHT (Horas Hombre Trabajadas)</h2>
                <div class="seccion-acciones">
                    <button id="btn-nuevo-hht" class="btn btn-sm btn-success" type="button">
                        ➕ Calcular HHT
                    </button>
                </div>
            </div>

            <div class="info-box">
                <strong>Fórmula:</strong> HHT = (XT × HTD × DTM) + NHE − NHA<br>
                <small>XT: trabajadores · HTD: horas/día · DTM: días/mes · NHE: horas extras · NHA: ausentismo</small>
            </div>

            ${ultimoCalculo ? `
                <div class="hht-resultado">
                    <div class="hht-label">Última HHT calculada</div>
                    <div class="hht-valor">${ultimoCalculo.hhtTotal}</div>
                    <div class="hht-formula">Periodo: ${escaparHTML(ultimoCalculo.periodo)}</div>
                </div>
            ` : `
                <div class="estado-vacio" style="padding: 1.5rem 1rem;">
                    <div class="estado-vacio-icono">🧮</div>
                    <p>No hay cálculos de HHT registrados. Use el botón para crear uno.</p>
                </div>
            `}
        </div>
    `;
}

/**
 * Construye las acciones inferiores.
 */
function construirAccionesInferiores(): string {
    return `
        <div class="acciones-inferiores">
            <button id="btn-volver-inferior" class="btn btn-outline" type="button">
                ← Volver sin guardar
            </button>
            <button id="btn-imprimir-detalle" class="btn btn-outline" type="button">
                🖨️ Imprimir
            </button>
            <button id="btn-guardar-detalle" class="btn btn-success" type="button">
                💾 Guardar Cambios
            </button>
        </div>
    `;
}

// ================================================================
// CONFIGURACIÓN DE EVENTOS
// ================================================================

/**
 * Configura todos los eventos del detalle.
 */
function configurarEventos(): void {
    if (!contenedorRaiz) return;

    // Botones volver
    const btnVolver = contenedorRaiz.querySelector('#btn-volver-dashboard');
    if (btnVolver) btnVolver.addEventListener('click', confirmarVolver);

    const btnVolverInf = contenedorRaiz.querySelector('#btn-volver-inferior');
    if (btnVolverInf) btnVolverInf.addEventListener('click', confirmarVolver);

    // Botón imprimir
    const btnImprimir = contenedorRaiz.querySelector('#btn-imprimir-detalle');
    if (btnImprimir) btnImprimir.addEventListener('click', () => window.print());

    // Botón guardar
    const btnGuardar = contenedorRaiz.querySelector('#btn-guardar-detalle');
    if (btnGuardar) btnGuardar.addEventListener('click', guardarCambios);

    // Botón editar indicador
    const btnEditar = contenedorRaiz.querySelector('#btn-editar-indicador');
    if (btnEditar) btnEditar.addEventListener('click', abrirModalEditarIndicador);

    // Botones nuevo resultado
    const btnNuevoRes = contenedorRaiz.querySelector('#btn-nuevo-resultado');
    if (btnNuevoRes) btnNuevoRes.addEventListener('click', abrirModalNuevoResultado);

    const btnNuevoResVacio = contenedorRaiz.querySelector('#btn-nuevo-resultado-vacio');
    if (btnNuevoResVacio) btnNuevoResVacio.addEventListener('click', abrirModalNuevoResultado);

    // Botones eliminar resultado
    contenedorRaiz.querySelectorAll('.btn-eliminar-resultado').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const id = target.dataset.resultadoId;
            if (id) eliminarResultado(id);
        });
    });

    // Botón nuevo HHT
    const btnHHT = contenedorRaiz.querySelector('#btn-nuevo-hht');
    if (btnHHT) btnHHT.addEventListener('click', abrirModalHHT);
}

// ================================================================
// MODAL — EDITAR INDICADOR
// ================================================================

/**
 * Abre el modal para editar los datos del indicador.
 */
function abrirModalEditarIndicador(): void {
    if (!indicadorActual) return;
    const ind = indicadorActual;

    let modal: HTMLElement | null = qsTipo<HTMLElement>('#modal-editar-indicador');
    if (!modal) {
        const nuevoModal = document.createElement('div');
        nuevoModal.id = 'modal-editar-indicador';
        nuevoModal.className = 'modal-overlay';
        document.body.appendChild(nuevoModal);
        modal = nuevoModal;
    }

    modal.innerHTML = `
        <div class="modal-contenido modal-lg" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h2>✏️ Editar Indicador</h2>
                <button id="modal-cerrar" class="btn-cerrar" type="button" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-grid">
                    <div class="form-group ancho-completo">
                        <label>Nombre del Indicador</label>
                        <input type="text" id="edit-nombre" value="${escaparHTML(ind.nombre)}" />
                    </div>
                    <div class="form-group">
                        <label>Clasificación</label>
                        <select id="edit-clasificacion">
                            <option value="Estructura" ${ind.clasificacion === 'Estructura' ? 'selected' : ''}>Estructura</option>
                            <option value="Proceso" ${ind.clasificacion === 'Proceso' ? 'selected' : ''}>Proceso</option>
                            <option value="Resultado" ${ind.clasificacion === 'Resultado' ? 'selected' : ''}>Resultado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Periodicidad</label>
                        <select id="edit-periodicidad">
                            <option value="Mensual" ${ind.periodicidad === 'Mensual' ? 'selected' : ''}>Mensual</option>
                            <option value="Trimestral" ${ind.periodicidad === 'Trimestral' ? 'selected' : ''}>Trimestral</option>
                            <option value="Semestral" ${ind.periodicidad === 'Semestral' ? 'selected' : ''}>Semestral</option>
                            <option value="Anual" ${ind.periodicidad === 'Anual' ? 'selected' : ''}>Anual</option>
                        </select>
                    </div>
                    <div class="form-group ancho-completo">
                        <label>Definición</label>
                        <textarea id="edit-definicion">${escaparHTML(ind.definicion)}</textarea>
                    </div>
                    <div class="form-group ancho-completo">
                        <label>Interpretación</label>
                        <textarea id="edit-interpretacion">${escaparHTML(ind.interpretacion)}</textarea>
                    </div>
                    <div class="form-group ancho-completo">
                        <label>Fórmula</label>
                        <input type="text" id="edit-formula" value="${escaparHTML(ind.formula)}" />
                    </div>
                    <div class="form-group">
                        <label>Meta / Límite Esperado</label>
                        <input type="text" id="edit-meta" value="${escaparHTML(ind.limiteEsperado)}" />
                    </div>
                    <div class="form-group">
                        <label>Unidad de Medida</label>
                        <input type="text" id="edit-unidad" value="${escaparHTML(ind.unidadMedida)}" />
                    </div>
                    <div class="form-group ancho-completo">
                        <label>Fuente de Información</label>
                        <input type="text" id="edit-fuente" value="${escaparHTML(ind.fuenteInformacion)}" />
                    </div>
                    <div class="form-group ancho-completo">
                        <label>Responsable</label>
                        <input type="text" id="edit-responsable" value="${escaparHTML(ind.responsables)}" />
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="modal-cancelar" class="btn btn-outline" type="button">Cancelar</button>
                <button id="modal-guardar" class="btn btn-success" type="button">💾 Guardar Cambios</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const btnCerrar = qsTipo<HTMLElement>('#modal-cerrar');
    const btnCancelar = qsTipo<HTMLElement>('#modal-cancelar');
    const btnGuardar = qsTipo<HTMLElement>('#modal-guardar');

    const cerrar = (): void => { modal!.style.display = 'none'; };

    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrar);
    if (btnGuardar) btnGuardar.addEventListener('click', () => {
        guardarEdicionIndicador();
        cerrar();
    });
}

/**
 * Guarda los cambios del indicador.
 */
function guardarEdicionIndicador(): void {
    if (!indicadorActual) return;

    const nombre = qsTipo<HTMLInputElement>('#edit-nombre')?.value.trim() || '';
    const clasificacion = qsTipo<HTMLSelectElement>('#edit-clasificacion')?.value || '';
    const periodicidad = qsTipo<HTMLSelectElement>('#edit-periodicidad')?.value || '';
    const definicion = qsTipo<HTMLTextAreaElement>('#edit-definicion')?.value.trim() || '';
    const interpretacion = qsTipo<HTMLTextAreaElement>('#edit-interpretacion')?.value.trim() || '';
    const formula = qsTipo<HTMLInputElement>('#edit-formula')?.value.trim() || '';
    const meta = qsTipo<HTMLInputElement>('#edit-meta')?.value.trim() || '';
    const unidad = qsTipo<HTMLInputElement>('#edit-unidad')?.value.trim() || '';
    const fuente = qsTipo<HTMLInputElement>('#edit-fuente')?.value.trim() || '';
    const responsable = qsTipo<HTMLInputElement>('#edit-responsable')?.value.trim() || '';

    if (!nombre || !definicion || !formula || !meta) {
        alert('⚠️ Los campos nombre, definición, fórmula y meta son obligatorios.');
        return;
    }

    const ok = storageIndicadores.actualizar(indicadorActual.id, {
        nombre,
        clasificacion: clasificacion as IIndicador['clasificacion'],
        periodicidad: periodicidad as IIndicador['periodicidad'],
        definicion,
        interpretacion,
        formula,
        limiteEsperado: meta,
        unidadMedida: unidad,
        fuenteInformacion: fuente,
        responsables: responsable,
        fechaActualizacion: new Date()
    });

    if (ok) {
        alert('✅ Indicador actualizado.');
        recargar();
    } else {
        alert('❌ No se pudo actualizar el indicador.');
    }
}

// ================================================================
// MODAL — NUEVO RESULTADO
// ================================================================

/**
 * Abre el modal para registrar un resultado.
 */
function abrirModalNuevoResultado(): void {
    if (!indicadorActual) return;

    let modal: HTMLElement | null = qsTipo<HTMLElement>('#modal-nuevo-resultado-det');
    if (!modal) {
        const nuevoModal = document.createElement('div');
        nuevoModal.id = 'modal-nuevo-resultado-det';
        nuevoModal.className = 'modal-overlay';
        document.body.appendChild(nuevoModal);
        modal = nuevoModal;
    }

    modal.innerHTML = `
        <div class="modal-contenido" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h2>📅 Nuevo Resultado</h2>
                <button id="modal-cerrar" class="btn-cerrar" type="button" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body">
                <div class="info-box">
                    <strong>${escaparHTML(indicadorActual.nombre)}</strong><br>
                    Meta: ${escaparHTML(indicadorActual.limiteEsperado)} · Unidad: ${escaparHTML(indicadorActual.unidadMedida)}
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Periodo <span class="required">*</span></label>
                        <input type="text" id="res-periodo" placeholder="YYYY-MM" />
                    </div>
                    <div class="form-group">
                        <label>Meta del Periodo</label>
                        <input type="number" id="res-meta" step="0.01" value="0" />
                    </div>
                    <div class="form-group">
                        <label>Valor Medido <span class="required">*</span></label>
                        <input type="number" id="res-valor" step="0.01" />
                    </div>
                    <div class="form-group ancho-completo">
                        <label>Observaciones</label>
                        <textarea id="res-observaciones" placeholder="Observaciones..."></textarea>
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

    const btnCerrar = qsTipo<HTMLElement>('#modal-cerrar');
    const btnCancelar = qsTipo<HTMLElement>('#modal-cancelar');
    const btnGuardar = qsTipo<HTMLElement>('#modal-guardar');

    const cerrar = (): void => { modal!.style.display = 'none'; };

    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrar);
    if (btnGuardar) btnGuardar.addEventListener('click', () => {
        guardarNuevoResultado();
        cerrar();
    });
}

/**
 * Guarda el nuevo resultado.
 */
function guardarNuevoResultado(): void {
    if (!indicadorActual) return;

    const periodo = qsTipo<HTMLInputElement>('#res-periodo')?.value.trim() || '';
    const metaPeriodo = parseFloat(qsTipo<HTMLInputElement>('#res-meta')?.value || '0');
    const valor = parseFloat(qsTipo<HTMLInputElement>('#res-valor')?.value || '0');
    const observaciones = qsTipo<HTMLTextAreaElement>('#res-observaciones')?.value.trim() || '';

    if (!periodo) { alert('⚠️ Debe ingresar el periodo.'); return; }
    if (isNaN(valor)) { alert('⚠️ Debe ingresar el valor medido.'); return; }

    const porcentajeCumplimiento = metaPeriodo > 0
        ? calcularPorcentajeCumplimiento(valor, metaPeriodo)
        : 0;

    const semaforo = indicadorActual.clasificacion === 'Resultado'
        ? calcularSemaforoMenorEsMejor(valor, metaPeriodo)
        : calcularSemaforo(porcentajeCumplimiento);

    const nuevo: IResultadoIndicador = {
        id: generarIdResultado(),
        empresaId: empresaNit,
        indicadorId: indicadorActual.id,
        periodo,
        valor,
        metaPeriodo,
        porcentajeCumplimiento,
        semaforo,
        alertaGenerada: semaforo !== 'Verde',
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
        alert(`✅ Resultado guardado. Semáforo: ${semaforo}`);
        recargar();
    } else {
        alert('❌ No se pudo guardar el resultado.');
    }
}

// ================================================================
// ELIMINAR RESULTADO
// ================================================================

/**
 * Elimina un resultado con confirmación.
 */
function eliminarResultado(resultadoId: string): void {
    const resultado = storageResultadosIndicadores.obtenerPorId(resultadoId);
    if (!resultado) {
        alert('⚠️ No se encontró el resultado.');
        return;
    }

    const confirmar = confirm(
        `¿Está seguro de eliminar el resultado del periodo ${resultado.periodo}?`
    );

    if (!confirmar) return;

    const ok = storageResultadosIndicadores.eliminar(resultadoId);

    if (ok) {
        alert('✅ Resultado eliminado.');
        recargar();
    } else {
        alert('❌ No se pudo eliminar el resultado.');
    }
}

// ================================================================
// MODAL — HHT
// ================================================================

/**
 * Abre el modal para crear un cálculo de HHT.
 */
function abrirModalHHT(): void {
    let modal: HTMLElement | null = qsTipo<HTMLElement>('#modal-hht');
    if (!modal) {
        const nuevoModal = document.createElement('div');
        nuevoModal.id = 'modal-hht';
        nuevoModal.className = 'modal-overlay';
        document.body.appendChild(nuevoModal);
        modal = nuevoModal;
    }

    modal.innerHTML = `
        <div class="modal-contenido" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h2>🧮 Calcular HHT</h2>
                <button id="modal-cerrar" class="btn-cerrar" type="button" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body">
                <div class="info-box">
                    <strong>Fórmula:</strong> HHT = (XT × HTD × DTM) + NHE − NHA
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Periodo <span class="required">*</span></label>
                        <input type="text" id="hht-periodo" placeholder="YYYY-MM" />
                    </div>
                    <div class="form-group">
                        <label>XT — Trabajadores promedio <span class="required">*</span></label>
                        <input type="number" id="hht-xt" min="0" step="1" value="0" />
                    </div>
                    <div class="form-group">
                        <label>HTD — Horas/día <span class="required">*</span></label>
                        <input type="number" id="hht-htd" min="0" step="0.5" value="8" />
                    </div>
                    <div class="form-group">
                        <label>DTM — Días/mes <span class="required">*</span></label>
                        <input type="number" id="hht-dtm" min="0" step="1" value="30" />
                    </div>
                    <div class="form-group">
                        <label>NHE — Horas extras</label>
                        <input type="number" id="hht-nhe" min="0" step="0.5" value="0" />
                    </div>
                    <div class="form-group">
                        <label>NHA — Horas ausentismo</label>
                        <input type="number" id="hht-nha" min="0" step="0.5" value="0" />
                    </div>
                </div>

                <div id="hht-preview" class="hht-resultado" style="margin-top: 1rem; display: none;">
                    <div class="hht-label">HHT Calculada</div>
                    <div class="hht-valor" id="hht-preview-valor">0</div>
                    <div class="hht-formula" id="hht-preview-detalle">—</div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="modal-cancelar" class="btn btn-outline" type="button">Cancelar</button>
                <button id="modal-guardar" class="btn btn-success" type="button">💾 Guardar Cálculo</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    // Vista previa en vivo
    const inputs = ['#hht-xt', '#hht-htd', '#hht-dtm', '#hht-nhe', '#hht-nha'];
    const actualizarPreview = (): void => {
        const xt = parseFloat(qsTipo<HTMLInputElement>('#hht-xt')?.value || '0');
        const htd = parseFloat(qsTipo<HTMLInputElement>('#hht-htd')?.value || '0');
        const dtm = parseFloat(qsTipo<HTMLInputElement>('#hht-dtm')?.value || '0');
        const nhe = parseFloat(qsTipo<HTMLInputElement>('#hht-nhe')?.value || '0');
        const nha = parseFloat(qsTipo<HTMLInputElement>('#hht-nha')?.value || '0');

        const hht = calcularHHT({ XT: xt, HTD: htd, DTM: dtm, NHE: nhe, NHA: nha });
        const ordinarias = calcularHorasOrdinarias(xt, htd, dtm);

        const preview = qsTipo<HTMLElement>('#hht-preview');
        const valorEl = qsTipo<HTMLElement>('#hht-preview-valor');
        const detalleEl = qsTipo<HTMLElement>('#hht-preview-detalle');

        if (preview) preview.style.display = 'block';
        if (valorEl) valorEl.textContent = String(hht);
        if (detalleEl) {
            detalleEl.textContent = `(${xt} × ${htd} × ${dtm}) = ${ordinarias} + ${nhe} − ${nha}`;
        }
    };

    inputs.forEach(sel => {
        const input = qsTipo<HTMLInputElement>(sel);
        if (input) input.addEventListener('input', actualizarPreview);
    });
    actualizarPreview();

    const btnCerrar = qsTipo<HTMLElement>('#modal-cerrar');
    const btnCancelar = qsTipo<HTMLElement>('#modal-cancelar');
    const btnGuardar = qsTipo<HTMLElement>('#modal-guardar');

    const cerrar = (): void => { modal!.style.display = 'none'; };

    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrar);
    if (btnGuardar) btnGuardar.addEventListener('click', () => {
        guardarHHT();
        cerrar();
    });
}

/**
 * Guarda el cálculo de HHT.
 */
function guardarHHT(): void {
    const periodo = qsTipo<HTMLInputElement>('#hht-periodo')?.value.trim() || '';
    const xt = parseFloat(qsTipo<HTMLInputElement>('#hht-xt')?.value || '0');
    const htd = parseFloat(qsTipo<HTMLInputElement>('#hht-htd')?.value || '0');
    const dtm = parseFloat(qsTipo<HTMLInputElement>('#hht-dtm')?.value || '0');
    const nhe = parseFloat(qsTipo<HTMLInputElement>('#hht-nhe')?.value || '0');
    const nha = parseFloat(qsTipo<HTMLInputElement>('#hht-nha')?.value || '0');

    if (!periodo) { alert('⚠️ Debe ingresar el periodo.'); return; }
    if (xt <= 0 || htd <= 0 || dtm <= 0) {
        alert('⚠️ XT, HTD y DTM deben ser mayores a 0.');
        return;
    }

    const calculo = crearCalculoHHTHelper(periodo, { XT: xt, HTD: htd, DTM: dtm, NHE: nhe, NHA: nha });
    const ok = storageCalculosHHT.guardar(calculo);

    if (ok) {
        alert(`✅ HHT calculada y guardada: ${calculo.hhtTotal}`);
        recargar();
    } else {
        alert('❌ No se pudo guardar el cálculo de HHT.');
    }
}

/**
 * Helper para crear el objeto ICalculoHHT.
 */
function crearCalculoHHTHelper(
    periodo: string,
    datos: { XT: number; HTD: number; DTM: number; NHE: number; NHA: number }
): ICalculoHHT {
    const ahora = new Date();
    const hht = calcularHHT(datos);
    const ordinarias = calcularHorasOrdinarias(datos.XT, datos.HTD, datos.DTM);

    return {
        id: generarIdCalculoHHT(),
        empresaId: empresaNit,
        periodo,
        fechaInicioPeriodo: fechaActualISO(),
        fechaFinPeriodo: fechaActualISO(),
        XT: datos.XT,
        HTD: datos.HTD,
        DTM: datos.DTM,
        NHE: datos.NHE,
        NHA: datos.NHA,
        horasOrdinariasTotales: ordinarias,
        hhtTotal: hht,
        origen: 'Manual',
        estado: 'Borrador',
        observaciones: null,
        calculadoPor: null,
        validadoPor: null,
        fechaValidacion: null,
        fechaCreacion: ahora,
        fechaActualizacion: ahora
    };
}

// ================================================================
// GUARDAR CAMBIOS
// ================================================================

/**
 * Guarda el encabezado del indicador (por si se editó en línea).
 */
function guardarCambios(): void {
    if (!indicadorActual) return;

    hayCambios = false;
    alert('✅ Cambios guardados correctamente.');
    console.info('M23 Detalle: Cambios guardados.');
}

// ================================================================
// VOLVER AL DASHBOARD
// ================================================================

/**
 * Confirma y vuelve al dashboard.
 */
function confirmarVolver(): void {
    if (hayCambios) {
        const confirmar = confirm('⚠️ Hay cambios sin guardar. ¿Desea salir sin guardar?');
        if (!confirmar) return;
    }

    localStorage.removeItem('indicadorIdActiva');
    localStorage.removeItem('indicadorEmpresaNit');
    localStorage.removeItem('indicadorImprimir');

    window.dispatchEvent(new CustomEvent('indicador:volver-dashboard'));

    window.close();

    setTimeout(() => {
        window.location.href = 'modules/M23-Gestion-Indicadores/indicadores-dashboard.html';
    }, 200);
}

// ================================================================
// RECARGAR
// ================================================================

/**
 * Recarga el detalle (después de guardar cambios).
 */
function recargar(): void {
    if (!contenedorRaiz || !indicadorActual) return;

    const id = indicadorActual.id;
    const ind = storageIndicadores.obtenerPorId(id);

    if (!ind) return;

    indicadorActual = ind;
    cargarResultados();

    tendenciaActual = calcularTendencia(
        resultadosActuales,
        indicadorActual.nombre,
        indicadorActual.clasificacion
    );

    construirDashboard(contenedorRaiz);
}