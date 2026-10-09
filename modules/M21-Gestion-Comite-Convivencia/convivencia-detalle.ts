/**
 * modules/M21-Gestion-Comite-Convivencia/convivencia-detalle.ts
 * 
 * Lógica del detalle del Comité de Convivencia Laboral (CCL).
 * Módulo M21 - Gestión del Comité de Convivencia.
 * 
 * Se abre en pestaña nueva desde convivencia-listado.ts.
 * Lee comiteIdActiva y comiteEmpresaNit de localStorage.
 * 
 * Responsabilidades:
 * - Cargar el CSS del módulo dinámicamente.
 * - Construir el dashboard completo (encabezado + banner + fases + acciones).
 * - Abrir modales para llenar cada paso de la conformación.
 * - Gestionar quejas, casos, actas, compromisos, informes y reglamento.
 * - Guardar cambios en los storages correspondientes.
 * - Imprimir el comité (window.print).
 * - Volver al listado (dispatchEvent "comite:volver-listado").
 * 
 * Basado en:
 * - Resolución 3461 de 2025
 * - Ley 2365 de 2024
 * - Ley 1010 de 2006
 * - Decreto 1072 de 2015
 * 
 * @version 1.0.0
 * @since 2026-10-07
 */

import {
    qsTipo,
    escaparHTML,
    formatearFecha,
    fechaActualISO
} from '../../src/utils.js';
import {
    storageConvivencia,
    storageQuejasConvivencia,
    storageCasosConvivencia,
    storageActasConvivencia,
    storageEntrevistasConvivencia,
    storagePlanesMejoraConvivencia,
    storageCompromisosConfidencialidad,
    storageInformesConvivencia,
    storageReglamentosCCL,
    storageEmpresas
} from '../../src/storage.js';
import {
    calcularAlertaVencimiento,
    formatearPeriodo,
    calcularComposicionCCL,
    calcularProgresoPasos,
    obtenerVisualizacionPaso,
    obtenerVisualizacionEstadoQueja,
    generarIdQueja,
    generarIdCaso,
    generarIdActaConvivencia,
    generarIdConfidencialidad,
    generarIdInforme,
    generarIdEntrevista,
    generarIdPlanMejora,
    formatearRadicado,
    formatearNumeroActa,
    calcularPlazosQueja,
    obtenerEstadoEtapa,
    permiteConciliacion,
    calcularIndicadoresCCL
} from '../../src/convivencia-utils.js';
import type {
    IConvivencia,
    IQuejaConvivencia,
    ICasoConvivencia,
    IActaConvivencia,
    IEntrevistaConvivencia,
    IPlanMejoraConvivencia,
    ICompromisoConfidencialidad,
    IInformeConvivencia,
    IReglamentoInternoCCL,
    IRepresentante,
    EstadoPaso,
    RutaQueja,
    TipoQueja,
    TipoReunionConvivencia
} from '../../src/interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** ID del <link> del CSS del módulo. */
const CSS_LINK_ID = 'modulo-convivencia-detalle-css';

/** Ruta del CSS del módulo. */
const CSS_HREF = 'modules/M21-Gestion-Comite-Convivencia/convivencia-detalle.css';

// ================================================================
// ESTADO DEL MÓDULO
// ================================================================

/** Comité actualmente cargado. */
let comiteActual: IConvivencia | null = null;

/** Nombre de la empresa activa. */
let empresaNombre: string = 'Empresa';

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
    const contenedor = document.querySelector('#convivencia-detalle-container') as HTMLElement | null;

    if (!contenedor) {
        console.error('❌ M21 Detalle: No se encontró #convivencia-detalle-container.');
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
    console.info('🤝 M21 Detalle: Inicializando...');

    // 0. Cargar CSS del módulo
    cargarCSSModulo();

    // 1. Leer localStorage
    const comiteId = localStorage.getItem('comiteIdActiva') || '';
    const nit = localStorage.getItem('comiteEmpresaNit') || '';
    debeImprimir = localStorage.getItem('comiteImprimir') === 'true';

    if (!comiteId) {
        contenedor.innerHTML = `<div class="card"><p>⚠️ No se especificó un comité.</p></div>`;
        console.error('M21 Detalle: No hay comiteIdActiva.');
        return;
    }

    if (!nit) {
        contenedor.innerHTML = `<div class="card"><p>⚠️ No se especificó la empresa.</p></div>`;
        console.error('M21 Detalle: No hay comiteEmpresaNit.');
        return;
    }

    // 2. Cargar comité
    const comite = storageConvivencia.obtenerPorId(comiteId);
    if (!comite) {
        contenedor.innerHTML = `<div class="card"><p>⚠️ Comité no encontrado.</p></div>`;
        console.error(`M21 Detalle: No existe comité con ID ${comiteId}.`);
        return;
    }

    comiteActual = comite;

    // 3. Obtener nombre de la empresa
    const empresa = storageEmpresas.obtenerPorId(nit);
    empresaNombre = empresa?.razonSocial || 'Empresa';

    // 4. Construir dashboard
    construirDashboard(contenedor);

    // 5. beforeunload
    window.addEventListener('beforeunload', (e) => {
        if (hayCambios) e.preventDefault();
    });

    // 6. Si se debe imprimir, ejecutar después de renderizar
    if (debeImprimir) {
        setTimeout(() => window.print(), 600);
    }

    console.info(`✅ M21 Detalle: Comité "${comite.nombre}" cargado.`);
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

    console.info('M21 Detalle: CSS del módulo cargado.');
}

// ================================================================
// CONSTRUCCIÓN DEL DASHBOARD
// ================================================================

/**
 * Construye todo el HTML del dashboard.
 */
function construirDashboard(contenedor: HTMLElement): void {
    if (!comiteActual) return;

    const c = comiteActual;
    const alerta = calcularAlertaVencimiento(c.fechaFinVigencia);

    contenedor.innerHTML = `
        ${construirBotonVolver()}
        ${construirBannerAlerta(alerta)}
        ${construirEncabezado()}
        ${construirFase1()}
        ${construirFase2()}
        ${construirAccionesInferiores()}
    `;

    configurarEventos();
}

/**
 * Construye el botón "Volver al listado".
 */
function construirBotonVolver(): string {
    return `
        <div class="card" style="padding: 0.75rem 1rem;">
            <button id="btn-volver-listado" class="btn btn-outline btn-sm" type="button">
                ← Volver al Listado
            </button>
        </div>
    `;
}

/**
 * Construye el banner de alerta de vencimiento.
 */
function construirBannerAlerta(alerta: ReturnType<typeof calcularAlertaVencimiento>): string {
    if (!comiteActual) return '';

    const dias = alerta.diasRestantes;
    let titulo = '';

    if (dias < 0) {
        titulo = `🔴 Comité VENCIDO hace ${Math.abs(dias)} días`;
    } else if (alerta.nivel === 'rojo') {
        titulo = `⚠️ El comité vence en ${dias} días`;
    } else if (alerta.nivel === 'naranja') {
        titulo = `Vence en ${dias} días`;
    } else if (alerta.nivel === 'amarillo') {
        titulo = `Vence en ${dias} días`;
    } else {
        titulo = `Comité vigente`;
    }

    return `
        <div class="banner-vencimiento ${alerta.nivel}">
            <div class="banner-icono">${alerta.icono}</div>
            <div class="banner-texto">
                <strong>${titulo}</strong>
                <span>${escaparHTML(alerta.mensaje)}</span>
            </div>
        </div>
    `;
}

/**
 * Construye el encabezado naranja.
 */
function construirEncabezado(): string {
    if (!comiteActual) return '';

    const c = comiteActual;
    const periodo = formatearPeriodo(c.fechaInicioVigencia, c.fechaFinVigencia);

    return `
        <div class="comite-encabezado">
            <div class="comite-encabezado-titulo">
                COMITÉ DE CONVIVENCIA LABORAL (CCL)
            </div>
            <div class="comite-encabezado-subtitulo">
                CONFORMACIÓN SEGÚN RESOLUCIÓN 3461 DE 2025 · LEY 2365 DE 2024 · LEY 1010 DE 2006
            </div>
            <div class="comite-encabezado-grid">
                <div class="comite-campo">
                    <label for="enc-empresa">Empresa</label>
                    <input type="text" id="enc-empresa" value="${escaparHTML(empresaNombre)}" readonly />
                </div>
                <div class="comite-campo">
                    <label for="enc-nit">NIT</label>
                    <input type="text" id="enc-nit" value="${escaparHTML(c.empresaId)}" readonly />
                </div>
                <div class="comite-campo">
                    <label for="enc-nombre">Nombre del Comité</label>
                    <input type="text" id="enc-nombre" value="${escaparHTML(c.nombre)}" />
                </div>
                <div class="comite-campo">
                    <label for="enc-ciudad">Ciudad / Centro de Trabajo</label>
                    <input type="text" id="enc-ciudad" value="${escaparHTML(c.ciudad)}" />
                </div>
                <div class="comite-campo">
                    <label for="enc-trabajadores">No. de Trabajadores</label>
                    <input type="number" id="enc-trabajadores" value="${c.numeroTrabajadores}" min="1" />
                </div>
                <div class="comite-campo">
                    <label for="enc-periodo">Periodo</label>
                    <input type="text" id="enc-periodo" value="${periodo}" readonly />
                </div>
                <div class="comite-campo">
                    <label for="enc-canal">Correo Oficial CCL</label>
                    <input type="email" id="enc-canal" value="${escaparHTML(c.canalQuejas)}" />
                </div>
                <div class="comite-campo">
                    <label for="enc-buzon">Buzón Físico</label>
                    <input type="text" id="enc-buzon" value="${escaparHTML(c.buzonFisico)}" />
                </div>
            </div>
        </div>
    `;
}

/**
 * Construye la Fase 1: Conformación (6 tarjetas).
 */
function construirFase1(): string {
    if (!comiteActual) return '';
    const c = comiteActual;

    const tarjetas: { id: string; icono: string; titulo: string; descripcion: string; estado: EstadoPaso }[] = [
        {
            id: 'diagnostico',
            icono: '📋',
            titulo: 'Diagnóstico de Personal',
            descripcion: 'Composición automática del CCL según trabajadores.',
            estado: 'Completado'
        },
        {
            id: 'convocatoria',
            icono: '📢',
            titulo: 'Convocatoria e Inscripción',
            descripcion: 'Comunicado oficial y postulaciones de candidatos.',
            estado: c.pasoConvocatoria
        },
        {
            id: 'eleccion',
            icono: '🗳️',
            titulo: 'Elección de Trabajadores',
            descripcion: 'Votación y acta de escrutinio.',
            estado: c.pasoEleccion
        },
        {
            id: 'designacion',
            icono: '👔',
            titulo: 'Designación Empleador',
            descripcion: 'Acta de designación de representantes del empleador.',
            estado: c.pasoDesignacion
        },
        {
            id: 'constitucion',
            icono: '🏛️',
            titulo: 'Constitución (Acta No. 01)',
            descripcion: 'Acta de instalación y elección de Presidente y Secretario.',
            estado: c.pasoConstitucion
        },
        {
            id: 'capacitacion',
            icono: '🎓',
            titulo: 'Capacitación Inicial',
            descripcion: 'Programa anual de prevención y capacitación.',
            estado: c.pasoCapacitacion
        }
    ];

    const estados = tarjetas.map(t => t.estado);
    const progreso = calcularProgresoPasos(estados);

    const tarjetasHTML = tarjetas
        .map(t => construirTarjetaPaso(t.id, t.icono, t.titulo, t.descripcion, t.estado))
        .join('');

    return `
        <div class="card">
            <div class="fase-header">
                <h2>📋 Fase 1: Conformación del CCL</h2>
                <div class="fase-progreso">
                    <span>${progreso.completados}/${progreso.total} pasos</span>
                    <div class="fase-progreso-barra">
                        <div class="fase-progreso-relleno" style="width: ${progreso.porcentaje}%;"></div>
                    </div>
                    <span>${progreso.porcentaje}%</span>
                </div>
            </div>
            <div class="tarjetas-pasos-grid">
                ${tarjetasHTML}
            </div>
        </div>
    `;
}

/**
 * Construye una tarjeta de paso.
 */
function construirTarjetaPaso(
    id: string,
    icono: string,
    titulo: string,
    descripcion: string,
    estado: EstadoPaso
): string {
    const visual = obtenerVisualizacionPaso(estado);
    const claseEstado = estado.toLowerCase().replace('enprogreso', 'en-progreso');
    const claseTarjeta = `tarjeta-paso estado-${claseEstado}`;
    const claseBadge = `tarjeta-paso-estado ${claseEstado}`;

    let textoBoton = 'Iniciar';
    if (estado === 'Completado') textoBoton = 'Ver / Editar';
    else if (estado === 'EnProgreso') textoBoton = 'Continuar';

    return `
        <div class="${claseTarjeta}" data-paso="${id}">
            <div class="tarjeta-paso-header">
                <div class="tarjeta-paso-icono">${icono}</div>
                <div class="tarjeta-paso-titulo">
                    <h3>${escaparHTML(titulo)}</h3>
                    <p>${escaparHTML(descripcion)}</p>
                </div>
            </div>
            <span class="${claseBadge}">
                ${visual.icono} ${visual.texto}
            </span>
            <div class="tarjeta-paso-acciones">
                <button
                    class="btn btn-sm btn-primary btn-abrir-paso"
                    data-paso="${id}"
                    type="button"
                >${textoBoton}</button>
            </div>
        </div>
    `;
}

/**
 * Construye la Fase 2: Operación (6 tarjetas).
 */
function construirFase2(): string {
    if (!comiteActual) return '';

    const comiteId = comiteActual.id;

    // Quejas
    const quejas = storageQuejasConvivencia.obtenerTodos().filter(q => q.comiteId === comiteId);
    const quejasAbiertas = quejas.filter(q => q.estado !== 'Cerrada' && q.estado !== 'Trasladada').length;

    // Casos
    const casos = storageCasosConvivencia.obtenerTodos().filter(c => c.comiteId === comiteId);
    const casosAbiertos = casos.filter(c => c.estado !== 'Cerrada').length;

    // Actas
    const actas = storageActasConvivencia.obtenerTodos().filter(a => a.comiteId === comiteId);

    // Compromisos de confidencialidad
    const compromisos = storageCompromisosConfidencialidad.obtenerTodos().filter(c => c.comiteId === comiteId);
    const firmados = compromisos.filter(c => c.firmado).length;

    // Informes
    const informes = storageInformesConvivencia.obtenerTodos().filter(i => i.comiteId === comiteId);

    // Reglamento
    const reglamentos = storageReglamentosCCL.obtenerTodos().filter(r => r.comiteId === comiteId);
    const reglamentoAprobado = reglamentos.some(r => r.estado === 'Aprobado');

    return `
        <div class="card">
            <div class="fase-header">
                <h2>⚙️ Fase 2: Operación del Comité</h2>
            </div>

            <div class="tarjeta-operacion ${quejasAbiertas > 0 ? 'tarjeta-operacion-critica' : 'tarjeta-operacion-ok'}">
                <div class="tarjeta-operacion-info">
                    <h3>📬 Buzón de Quejas</h3>
                    <p><strong>Total de quejas:</strong> ${quejas.length}</p>
                    <p><strong>Quejas abiertas:</strong> ${quejasAbiertas}</p>
                    <p>Canal oficial: ${escaparHTML(comiteActual.canalQuejas || 'No configurado')}</p>
                </div>
                <div class="tarjeta-operacion-acciones">
                    <button id="btn-nueva-queja" class="btn btn-sm btn-success" type="button">
                        ➕ Nueva Queja
                    </button>
                    <button id="btn-ver-quejas" class="btn btn-sm btn-outline" type="button">
                        📋 Ver todas
                    </button>
                </div>
            </div>

            <div class="tarjeta-operacion ${casosAbiertos > 0 ? 'tarjeta-operacion-critica' : 'tarjeta-operacion-ok'}">
                <div class="tarjeta-operacion-info">
                    <h3>📁 Gestión de Casos</h3>
                    <p><strong>Total de casos:</strong> ${casos.length}</p>
                    <p><strong>Casos abiertos:</strong> ${casosAbiertos}</p>
                    <p>Seguimiento a entrevistas, mesas de diálogo y planes de mejora.</p>
                </div>
                <div class="tarjeta-operacion-acciones">
                    <button id="btn-ver-casos" class="btn btn-sm btn-primary" type="button">
                        Ver casos
                    </button>
                </div>
            </div>

            <div class="tarjeta-operacion">
                <div class="tarjeta-operacion-info">
                    <h3>📄 Actas de Reunión</h3>
                    <p><strong>Total de actas:</strong> ${actas.length}</p>
                    <p>Reuniones mensuales ordinarias y extraordinarias.</p>
                </div>
                <div class="tarjeta-operacion-acciones">
                    <button id="btn-nueva-acta" class="btn btn-sm btn-success" type="button">
                        ➕ Nueva Acta
                    </button>
                    <button id="btn-ver-actas" class="btn btn-sm btn-outline" type="button">
                        📋 Ver todas
                    </button>
                </div>
            </div>

            <div class="tarjeta-operacion ${firmados === compromisos.length && compromisos.length > 0 ? 'tarjeta-operacion-ok' : ''}">
                <div class="tarjeta-operacion-info">
                    <h3>✍️ Compromisos de Confidencialidad</h3>
                    <p><strong>Firmados:</strong> ${firmados} de ${compromisos.length}</p>
                    <p>Reserva y confidencialidad obligatoria (Ley 1010 de 2006).</p>
                </div>
                <div class="tarjeta-operacion-acciones">
                    <button id="btn-ver-confidencialidad" class="btn btn-sm btn-primary" type="button">
                        Gestionar
                    </button>
                </div>
            </div>

            <div class="tarjeta-operacion">
                <div class="tarjeta-operacion-info">
                    <h3>📊 Informes de Gestión</h3>
                    <p><strong>Total de informes:</strong> ${informes.length}</p>
                    <p>Reportes trimestrales internos y semestrales al Ministerio.</p>
                </div>
                <div class="tarjeta-operacion-acciones">
                    <button id="btn-nuevo-informe" class="btn btn-sm btn-success" type="button">
                        ➕ Nuevo Informe
                    </button>
                    <button id="btn-ver-informes" class="btn btn-sm btn-outline" type="button">
                        📋 Ver todos
                    </button>
                </div>
            </div>

            <div class="tarjeta-operacion ${reglamentoAprobado ? 'tarjeta-operacion-ok' : 'tarjeta-operacion-critica'}">
                <div class="tarjeta-operacion-info">
                    <h3>📖 Reglamento Interno del CCL</h3>
                    <p><strong>Estado:</strong> ${reglamentoAprobado ? 'Aprobado' : 'Pendiente'}</p>
                    <p>Documento obligatorio con reglas de funcionamiento interno.</p>
                </div>
                <div class="tarjeta-operacion-acciones">
                    <button id="btn-ver-reglamento" class="btn btn-sm btn-primary" type="button">
                        ${reglamentoAprobado ? 'Ver / Editar' : 'Crear Reglamento'}
                    </button>
                </div>
            </div>

            <div class="tarjeta-operacion">
                <div class="tarjeta-operacion-info">
                    <h3>📈 Indicadores de Gestión</h3>
                    <p>Cobertura de reuniones, eficacia de cierre y cumplimiento del plan.</p>
                </div>
                <div class="tarjeta-operacion-acciones">
                    <button id="btn-ver-indicadores" class="btn btn-sm btn-primary" type="button">
                        Ver indicadores
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Construye los botones inferiores.
 */
function construirAccionesInferiores(): string {
    return `
        <div class="acciones-inferiores">
            <button id="btn-imprimir" class="btn btn-outline" type="button">
                🖨️ Imprimir Comité Completo
            </button>
            <button id="btn-guardar" class="btn btn-success" type="button">
                💾 Guardar Cambios
            </button>
        </div>
    `;
}

// ================================================================
// EVENTOS PRINCIPALES
// ================================================================

/**
 * Configura todos los eventos del dashboard.
 */
function configurarEventos(): void {
    if (!contenedorRaiz) return;

    // Volver
    const btnVolver = contenedorRaiz.querySelector('#btn-volver-listado');
    if (btnVolver) btnVolver.addEventListener('click', confirmarVolver);

    // Guardar / Imprimir
    const btnGuardar = contenedorRaiz.querySelector('#btn-guardar');
    if (btnGuardar) btnGuardar.addEventListener('click', guardarComite);

    const btnImprimir = contenedorRaiz.querySelector('#btn-imprimir');
    if (btnImprimir) btnImprimir.addEventListener('click', () => window.print());

    // Inputs del encabezado → marcar cambios
    const inputsEnc = contenedorRaiz.querySelectorAll(
        '#enc-nombre, #enc-ciudad, #enc-trabajadores, #enc-canal, #enc-buzon'
    );
    inputsEnc.forEach(input => {
        input.addEventListener('input', () => { hayCambios = true; });
    });

    // Botones de pasos (Fase 1)
    const botonesPasos = contenedorRaiz.querySelectorAll('.btn-abrir-paso');
    botonesPasos.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const paso = target.dataset.paso;
            if (paso) abrirModalPaso(paso);
        });
    });

    // Fase 2 — Quejas
    const btnNuevaQueja = contenedorRaiz.querySelector('#btn-nueva-queja');
    if (btnNuevaQueja) btnNuevaQueja.addEventListener('click', abrirModalNuevaQueja);

    const btnVerQuejas = contenedorRaiz.querySelector('#btn-ver-quejas');
    if (btnVerQuejas) btnVerQuejas.addEventListener('click', abrirModalListaQuejas);

    // Fase 2 — Casos
    const btnVerCasos = contenedorRaiz.querySelector('#btn-ver-casos');
    if (btnVerCasos) btnVerCasos.addEventListener('click', abrirModalListaCasos);

    // Fase 2 — Actas
    const btnNuevaActa = contenedorRaiz.querySelector('#btn-nueva-acta');
    if (btnNuevaActa) btnNuevaActa.addEventListener('click', abrirModalNuevaActa);

    const btnVerActas = contenedorRaiz.querySelector('#btn-ver-actas');
    if (btnVerActas) btnVerActas.addEventListener('click', abrirModalListaActas);

    // Fase 2 — Confidencialidad
    const btnVerConf = contenedorRaiz.querySelector('#btn-ver-confidencialidad');
    if (btnVerConf) btnVerConf.addEventListener('click', abrirModalConfidencialidad);

    // Fase 2 — Informes
    const btnNuevoInforme = contenedorRaiz.querySelector('#btn-nuevo-informe');
    if (btnNuevoInforme) btnNuevoInforme.addEventListener('click', abrirModalNuevoInforme);

    const btnVerInformes = contenedorRaiz.querySelector('#btn-ver-informes');
    if (btnVerInformes) btnVerInformes.addEventListener('click', abrirModalListaInformes);

    // Fase 2 — Reglamento
    const btnVerReglamento = contenedorRaiz.querySelector('#btn-ver-reglamento');
    if (btnVerReglamento) btnVerReglamento.addEventListener('click', abrirModalReglamento);

    // Fase 2 — Indicadores
    const btnVerIndicadores = contenedorRaiz.querySelector('#btn-ver-indicadores');
    if (btnVerIndicadores) btnVerIndicadores.addEventListener('click', abrirModalIndicadores);
}

// ================================================================
// MODAL GENÉRICO
// ================================================================

/**
 * Abre un modal genérico.
 */
function abrirModal(
    titulo: string,
    contenidoHTML: string,
    onGuardar?: () => void,
    textoGuardar: string = 'Guardar'
): void {
    let overlay: HTMLElement | null = qsTipo<HTMLElement>('#modal-m21-overlay');
    if (!overlay) {
        const nuevoOverlay = document.createElement('div');
        nuevoOverlay.id = 'modal-m21-overlay';
        nuevoOverlay.className = 'modal-overlay';
        document.body.appendChild(nuevoOverlay);
        overlay = nuevoOverlay;
    }

    overlay.innerHTML = `
        <div class="modal-contenido" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h2>${titulo}</h2>
                <button id="modal-cerrar" class="btn-cerrar" type="button" aria-label="Cerrar">✕</button>
            </div>
            <div class="modal-body">${contenidoHTML}</div>
            <div class="modal-footer">
                <button id="modal-cancelar" class="btn btn-outline" type="button">Cerrar</button>
                ${onGuardar ? `<button id="modal-guardar" class="btn btn-success" type="button">${textoGuardar}</button>` : ''}
            </div>
        </div>
    `;

    overlay.style.display = 'flex';

    const btnCerrar = qsTipo<HTMLElement>('#modal-cerrar');
    const btnCancelar = qsTipo<HTMLElement>('#modal-cancelar');
    const btnGuardar = qsTipo<HTMLElement>('#modal-guardar');

    if (btnCerrar) btnCerrar.addEventListener('click', cerrarModal);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarModal);
    if (btnGuardar && onGuardar) btnGuardar.addEventListener('click', onGuardar);

    const manejarEscape = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
            cerrarModal();
            document.removeEventListener('keydown', manejarEscape);
        }
    };
    document.addEventListener('keydown', manejarEscape);
}

/**
 * Cierra el modal genérico.
 */
function cerrarModal(): void {
    const overlay = qsTipo<HTMLElement>('#modal-m21-overlay');
    if (overlay) overlay.style.display = 'none';
}

/**
 * Redirige al modal correspondiente al paso.
 */
function abrirModalPaso(paso: string): void {
    switch (paso) {
        case 'diagnostico':     abrirModalDiagnostico(); break;
        case 'convocatoria':    abrirModalConvocatoria(); break;
        case 'eleccion':        abrirModalEleccion(); break;
        case 'designacion':     abrirModalDesignacion(); break;
        case 'constitucion':    abrirModalConstitucion(); break;
        case 'capacitacion':    abrirModalCapacitacion(); break;
        default:
            console.warn(`M21 Detalle: Paso desconocido "${paso}".`);
    }
}

// ================================================================
// MODALES DE FASE 1
// ================================================================

/**
 * Modal: Diagnóstico de Personal (informativo).
 */
function abrirModalDiagnostico(): void {
    if (!comiteActual) return;
    const c = comiteActual;
    const composicion = calcularComposicionCCL(c.numeroTrabajadores);

    const contenido = `
        <div class="info-box">
            <strong>ℹ️ Diagnóstico automático</strong><br>
            El sistema calcula la composición del CCL según el número de trabajadores
            (Resolución 3461 de 2025).
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label>No. de Trabajadores</label>
                <input type="text" value="${c.numeroTrabajadores}" readonly />
            </div>
            <div class="form-group">
                <label>Principales por parte</label>
                <input type="text" value="${composicion.principalesEmpleador}" readonly />
            </div>
            <div class="form-group">
                <label>Suplentes por parte</label>
                <input type="text" value="${composicion.suplentesEmpleador}" readonly />
            </div>
            <div class="form-group">
                <label>Total de miembros</label>
                <input type="text" value="${composicion.totalComite}" readonly />
            </div>
            <div class="form-group">
                <label>Periodo</label>
                <input type="text" value="${formatearPeriodo(c.fechaInicioVigencia, c.fechaFinVigencia)}" readonly />
            </div>
        </div>
    `;

    abrirModal('📋 Diagnóstico de Personal', contenido);
}

/**
 * Modal: Convocatoria e Inscripción.
 */
function abrirModalConvocatoria(): void {
    if (!comiteActual) return;
    const c = comiteActual;

    const contenido = `
        <div class="info-box">
            <strong>Comunicado de Convocatoria</strong><br>
            Difundir el cronograma y abrir inscripciones (8 a 15 días hábiles).
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label>Fecha de Publicación <span class="required">*</span></label>
                <input type="date" id="conv-fecha-publicacion"
                    value="${c.fechaPublicacionConvocatoria || fechaActualISO()}" />
            </div>
            <div class="form-group">
                <label>Apertura de Inscripciones <span class="required">*</span></label>
                <input type="date" id="conv-fecha-apertura"
                    value="${c.fechaAperturaInscripciones || ''}" />
            </div>
            <div class="form-group">
                <label>Cierre de Inscripciones <span class="required">*</span></label>
                <input type="date" id="conv-fecha-cierre"
                    value="${c.fechaCierreInscripciones || ''}" />
            </div>
            <div class="form-group">
                <label>Fecha de Votación <span class="required">*</span></label>
                <input type="date" id="conv-fecha-votacion"
                    value="${c.fechaVotacion || ''}" />
            </div>
        </div>
    `;

    abrirModal('📢 Convocatoria e Inscripción', contenido, () => {
        guardarDatosConvocatoria();
    }, '💾 Guardar Convocatoria');
}

/**
 * Guarda convocatoria.
 */
function guardarDatosConvocatoria(): void {
    if (!comiteActual) return;

    const fechaPublicacion = qsTipo<HTMLInputElement>('#conv-fecha-publicacion')?.value || '';
    const fechaApertura = qsTipo<HTMLInputElement>('#conv-fecha-apertura')?.value || '';
    const fechaCierre = qsTipo<HTMLInputElement>('#conv-fecha-cierre')?.value || '';
    const fechaVotacion = qsTipo<HTMLInputElement>('#conv-fecha-votacion')?.value || '';

    if (!fechaPublicacion || !fechaApertura || !fechaCierre || !fechaVotacion) {
        alert('⚠️ Complete todas las fechas.');
        return;
    }

    const ok = storageConvivencia.actualizar(comiteActual.id, {
        fechaPublicacionConvocatoria: fechaPublicacion,
        fechaAperturaInscripciones: fechaApertura,
        fechaCierreInscripciones: fechaCierre,
        fechaVotacion,
        pasoConvocatoria: 'Completado',
        fechaActualizacion: new Date()
    });

    if (ok) {
        alert('✅ Convocatoria guardada.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar.');
    }
}

/**
 * Modal: Elección de Trabajadores (con escrutinio).
 */
function abrirModalEleccion(): void {
    if (!comiteActual) return;
    const c = comiteActual;
    const composicion = calcularComposicionCCL(c.numeroTrabajadores);

    const filasTrabajadores = c.representantesTrabajadores
        .map((r, i) => `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td><input type="text" data-trabajador-index="${i}" data-campo="nombre"
                    value="${escaparHTML(r.nombre)}" /></td>
                <td><input type="text" data-trabajador-index="${i}" data-campo="cedula"
                    value="${escaparHTML(r.cedula)}" /></td>
                <td><input type="text" data-trabajador-index="${i}" data-campo="cargo"
                    value="${escaparHTML(r.cargo)}" /></td>
                <td><input type="number" data-trabajador-index="${i}" data-campo="votos"
                    value="${r.votos || 0}" min="0" /></td>
                <td style="text-align:center; font-weight:600;">${r.rol}</td>
            </tr>
        `)
        .join('');

    const contenido = `
        <div class="info-box">
            <strong>Acta de Escrutinio y Elección</strong><br>
            Registre los representantes electos por votación y los totales del escrutinio.
            Composición esperada: <strong>${composicion.principalesTrabajadores} principales + ${composicion.suplentesTrabajadores} suplentes</strong>.
        </div>

        <div class="tabla-scroll">
            <table class="tabla-representantes">
                <thead>
                    <tr>
                        <th style="width:40px;">#</th>
                        <th>Nombre Completo</th>
                        <th style="width:130px;">Cédula</th>
                        <th style="width:150px;">Cargo</th>
                        <th style="width:90px;">Votos</th>
                        <th style="width:90px;">Rol</th>
                    </tr>
                </thead>
                <tbody>${filasTrabajadores}</tbody>
            </table>
        </div>

        <div class="form-grid" style="margin-top:1rem;">
            <div class="form-group">
                <label>Total Habilitados</label>
                <input type="number" id="elec-habilitados" value="${c.totalHabilitados}" min="0" />
            </div>
            <div class="form-group">
                <label>Total Emitidos</label>
                <input type="number" id="elec-emitidos" value="${c.totalEmitidos}" min="0" />
            </div>
            <div class="form-group">
                <label>Votos Válidos</label>
                <input type="number" id="elec-validos" value="${c.votosValidos}" min="0" />
            </div>
            <div class="form-group">
                <label>Votos en Blanco</label>
                <input type="number" id="elec-blancos" value="${c.votosBlancos}" min="0" />
            </div>
            <div class="form-group">
                <label>Votos Nulos</label>
                <input type="number" id="elec-nulos" value="${c.votosNulos}" min="0" />
            </div>
        </div>
    `;

    abrirModal('🗳️ Elección de Representantes', contenido, () => {
        guardarDatosEleccion();
    }, '💾 Guardar Escrutinio');
}

/**
 * Guarda elección.
 */
function guardarDatosEleccion(): void {
    if (!comiteActual) return;

    const habilitados = parseInt(qsTipo<HTMLInputElement>('#elec-habilitados')?.value || '0', 10) || 0;
    const emitidos = parseInt(qsTipo<HTMLInputElement>('#elec-emitidos')?.value || '0', 10) || 0;
    const validos = parseInt(qsTipo<HTMLInputElement>('#elec-validos')?.value || '0', 10) || 0;
    const blancos = parseInt(qsTipo<HTMLInputElement>('#elec-blancos')?.value || '0', 10) || 0;
    const nulos = parseInt(qsTipo<HTMLInputElement>('#elec-nulos')?.value || '0', 10) || 0;

    const nuevosReps: IRepresentante[] = [];
    comiteActual.representantesTrabajadores.forEach((r, i) => {
        const nombre = qsTipo<HTMLInputElement>(`[data-trabajador-index="${i}"][data-campo="nombre"]`)?.value || '';
        const cedula = qsTipo<HTMLInputElement>(`[data-trabajador-index="${i}"][data-campo="cedula"]`)?.value || '';
        const cargo = qsTipo<HTMLInputElement>(`[data-trabajador-index="${i}"][data-campo="cargo"]`)?.value || '';
        const votos = parseInt(qsTipo<HTMLInputElement>(`[data-trabajador-index="${i}"][data-campo="votos"]`)?.value || '0', 10) || 0;

        nuevosReps.push({ nombre, cedula, cargo, rol: r.rol, parte: 'Trabajador', votos });
    });

    const ok = storageConvivencia.actualizar(comiteActual.id, {
        representantesTrabajadores: nuevosReps,
        totalHabilitados: habilitados,
        totalEmitidos: emitidos,
        votosValidos: validos,
        votosBlancos: blancos,
        votosNulos: nulos,
        pasoEleccion: 'Completado',
        fechaActualizacion: new Date()
    });

    if (ok) {
        alert('✅ Escrutinio guardado.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar.');
    }
}

/**
 * Modal: Designación Empleador.
 */
function abrirModalDesignacion(): void {
    if (!comiteActual) return;
    const c = comiteActual;
    const composicion = calcularComposicionCCL(c.numeroTrabajadores);

    const filasPrincipales = c.representantesEmpleador
        .filter(r => r.rol === 'Principal')
        .map((r, i) => filaRepresentanteHTML(r, i, 'empleador-principal'))
        .join('');

    const filasSuplentes = c.representantesEmpleador
        .filter(r => r.rol === 'Suplente')
        .map((r, i) => filaRepresentanteHTML(r, i, 'empleador-suplente'))
        .join('');

    const contenido = `
        <div class="info-box">
            <strong>Acta de Designación del Empleador</strong><br>
            El Representante Legal designa directamente a sus representantes.
            Composición: <strong>${composicion.principalesEmpleador} principal(es) + ${composicion.suplentesEmpleador} suplente(s)</strong>.
        </div>

        <h3 style="color:#1B365D; font-size:0.95rem; margin-bottom:0.5rem;">Representantes Principales</h3>
        <div class="tabla-scroll">
            <table class="tabla-representantes">
                <thead>
                    <tr>
                        <th style="width:40px;">#</th>
                        <th>Nombre Completo</th>
                        <th style="width:130px;">Cédula</th>
                        <th style="width:150px;">Cargo</th>
                    </tr>
                </thead>
                <tbody>${filasPrincipales}</tbody>
            </table>
        </div>

        <h3 style="color:#1B365D; font-size:0.95rem; margin-bottom:0.5rem; margin-top:1rem;">Representantes Suplentes</h3>
        <div class="tabla-scroll">
            <table class="tabla-representantes">
                <thead>
                    <tr>
                        <th style="width:40px;">#</th>
                        <th>Nombre Completo</th>
                        <th style="width:130px;">Cédula</th>
                        <th style="width:150px;">Cargo</th>
                    </tr>
                </thead>
                <tbody>${filasSuplentes}</tbody>
            </table>
        </div>
    `;

    abrirModal('👔 Designación del Empleador', contenido, () => {
        guardarDatosDesignacion();
    }, '💾 Guardar Designación');
}

/**
 * Fila HTML de representante.
 */
function filaRepresentanteHTML(r: IRepresentante, index: number, prefijo: string): string {
    return `
        <tr>
            <td style="text-align:center;">${index + 1}</td>
            <td><input type="text" data-prefijo="${prefijo}" data-campo="nombre"
                value="${escaparHTML(r.nombre)}" placeholder="Nombre completo" /></td>
            <td><input type="text" data-prefijo="${prefijo}" data-campo="cedula"
                value="${escaparHTML(r.cedula)}" placeholder="Cédula" /></td>
            <td><input type="text" data-prefijo="${prefijo}" data-campo="cargo"
                value="${escaparHTML(r.cargo)}" placeholder="Cargo" /></td>
        </tr>
    `;
}

/**
 * Guarda designación del empleador.
 */
function guardarDatosDesignacion(): void {
    if (!comiteActual) return;

    const inputs = document.querySelectorAll('[data-prefijo^="empleador-"]');
    const principales: IRepresentante[] = [];
    const suplentes: IRepresentante[] = [];

    inputs.forEach(input => {
        const el = input as HTMLInputElement;
        const prefijo = el.dataset.prefijo || '';
        const campo = el.dataset.campo || '';
        const rol: 'Principal' | 'Suplente' = prefijo.includes('principal') ? 'Principal' : 'Suplente';

        const fila = el.closest('tr');
        if (!fila) return;
        const filas = Array.from(fila.parentElement?.children || []);
        const index = filas.indexOf(fila);

        const lista = rol === 'Principal' ? principales : suplentes;
        if (!lista[index]) {
            lista[index] = { nombre: '', cedula: '', cargo: '', rol, parte: 'Empleador' };
        }

        if (campo === 'nombre') lista[index].nombre = el.value;
        else if (campo === 'cedula') lista[index].cedula = el.value;
        else if (campo === 'cargo') lista[index].cargo = el.value;
    });

    const representantes = [...principales, ...suplentes];

    const ok = storageConvivencia.actualizar(comiteActual.id, {
        representantesEmpleador: representantes,
        pasoDesignacion: 'Completado',
        fechaActualizacion: new Date()
    });

    if (ok) {
        alert('✅ Designación guardada.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar.');
    }
}

/**
 * Modal: Constitución (Acta No. 01).
 */
function abrirModalConstitucion(): void {
    if (!comiteActual) return;
    const c = comiteActual;

    const todosReps = [...c.representantesEmpleador, ...c.representantesTrabajadores];

    const opcionesPresidente = todosReps
        .map(r => `<option value="${escaparHTML(r.cedula)}" ${c.presidenteId === r.cedula ? 'selected' : ''}>${escaparHTML(r.nombre)} (${r.parte} - ${r.rol})</option>`)
        .join('');

    const opcionesSecretario = todosReps
        .map(r => `<option value="${escaparHTML(r.cedula)}" ${c.secretarioId === r.cedula ? 'selected' : ''}>${escaparHTML(r.nombre)} (${r.parte} - ${r.rol})</option>`)
        .join('');

    const contenido = `
        <div class="info-box">
            <strong>Acta de Constitución (No. 01)</strong><br>
            Según Res. 3461 de 2025, Presidente y Secretario se eligen por <strong>mutuo acuerdo</strong>.
        </div>

        <div class="form-grid">
            <div class="form-group ancho-completo">
                <label>Presidente(a) del CCL <span class="required">*</span></label>
                <select id="const-presidente">
                    <option value="">-- Seleccionar --</option>
                    ${opcionesPresidente}
                </select>
            </div>
            <div class="form-group ancho-completo">
                <label>Secretario(a) del CCL <span class="required">*</span></label>
                <select id="const-secretario">
                    <option value="">-- Seleccionar --</option>
                    ${opcionesSecretario}
                </select>
            </div>
        </div>

        <div style="margin-top:1rem; padding:1rem; background:#f0fdf4; border-left:4px solid #10B981; border-radius:0.375rem;">
            <strong style="color:#065F46;">✅ Al guardar, el comité quedará constituido oficialmente.</strong>
        </div>
    `;

    abrirModal('🏛️ Constitución del Comité (Acta No. 01)', contenido, () => {
        guardarDatosConstitucion();
    }, '✅ Constituir Comité');
}

/**
 * Guarda constitución.
 */
function guardarDatosConstitucion(): void {
    if (!comiteActual) return;

    const presidente = qsTipo<HTMLSelectElement>('#const-presidente')?.value || '';
    const secretario = qsTipo<HTMLSelectElement>('#const-secretario')?.value || '';

    if (!presidente || !secretario) {
        alert('⚠️ Debe seleccionar Presidente y Secretario.');
        return;
    }

    const ok = storageConvivencia.actualizar(comiteActual.id, {
        presidenteId: presidente,
        secretarioId: secretario,
        pasoConstitucion: 'Completado',
        estado: 'Activo',
        fechaActualizacion: new Date()
    });

    if (ok) {
        alert('✅ Comité constituido oficialmente.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar.');
    }
}

/**
 * Modal: Capacitación Inicial.
 */
function abrirModalCapacitacion(): void {
    if (!comiteActual) return;

    const contenido = `
        <div class="info-box">
            <strong>Programa Anual de Prevención y Capacitación</strong><br>
            Registre las actividades preventivas del año en curso.
        </div>

        <div class="form-grid">
            <div class="form-group ancho-completo">
                <label>Capacitación 1: Prevención de Acoso Laboral y Sexual</label>
                <input type="date" id="cap-fecha-1" value="${fechaActualISO()}" />
            </div>
            <div class="form-group ancho-completo">
                <label>Capacitación 2: Comunicación Asertiva y Manejo de Conflictos</label>
                <input type="date" id="cap-fecha-2" value="${fechaActualISO()}" />
            </div>
            <div class="form-group ancho-completo">
                <label>Divulgación de Política de Cero Tolerancia</label>
                <textarea id="cap-politica" placeholder="Evidencias y fecha de divulgación..."></textarea>
            </div>
        </div>
    `;

    abrirModal('🎓 Capacitación Inicial', contenido, () => {
        if (!comiteActual) return;
        const ok = storageConvivencia.actualizar(comiteActual.id, {
            pasoCapacitacion: 'Completado',
            fechaActualizacion: new Date()
        });
        if (ok) {
            alert('✅ Capacitación registrada.');
            cerrarModal();
            recargar();
        }
    }, '💾 Guardar Capacitación');
}

// ================================================================
// MODALES DE FASE 2 — QUEJAS
// ================================================================

/**
 * Modal: Nueva Queja.
 */
function abrirModalNuevaQueja(): void {
    if (!comiteActual) return;

    const contenido = `
        <div class="info-box">
            <strong>Registro de Queja</strong><br>
            Diligencie los datos del incidente. La información será tratada con reserva.
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label>Tipo de Situación <span class="required">*</span></label>
                <select id="queja-tipo">
                    <option value="">-- Seleccionar --</option>
                    <option value="AcosoLaboral">Acoso Laboral (Ley 1010)</option>
                    <option value="AcosoSexual">Acoso Sexual Laboral (Ley 2365)</option>
                    <option value="Discriminacion">Discriminación</option>
                    <option value="Hostigamiento">Hostigamiento</option>
                    <option value="Violencia">Violencia</option>
                    <option value="Otro">Otro / Conflicto de Convivencia</option>
                </select>
            </div>

            <div class="form-group">
                <label>¿Queja Anónima?</label>
                <select id="queja-anonima">
                    <option value="no">No (identificada)</option>
                    <option value="si">Sí (anónima)</option>
                </select>
            </div>

            <div class="form-group">
                <label>Fecha de Radicación <span class="required">*</span></label>
                <input type="date" id="queja-fecha" value="${fechaActualISO()}" />
            </div>

            <div class="form-group">
                <label>Nombre del Quejoso</label>
                <input type="text" id="queja-quejoso-nombre" placeholder="Nombre completo" />
            </div>
            <div class="form-group">
                <label>Cargo del Quejoso</label>
                <input type="text" id="queja-quejoso-cargo" placeholder="Cargo" />
            </div>
            <div class="form-group">
                <label>Área del Quejoso</label>
                <input type="text" id="queja-quejoso-area" placeholder="Área" />
            </div>
            <div class="form-group">
                <label>Correo del Quejoso</label>
                <input type="email" id="queja-quejoso-correo" placeholder="correo@empresa.com" />
            </div>
            <div class="form-group">
                <label>Teléfono del Quejoso</label>
                <input type="text" id="queja-quejoso-telefono" placeholder="Teléfono" />
            </div>

            <div class="form-group ancho-completo">
                <label>Nombre del Presunto Agresor <span class="required">*</span></label>
                <input type="text" id="queja-denunciado-nombre" placeholder="Nombre completo" />
            </div>
            <div class="form-group">
                <label>Cargo del Presunto Agresor</label>
                <input type="text" id="queja-denunciado-cargo" placeholder="Cargo" />
            </div>
            <div class="form-group">
                <label>Área del Presunto Agresor</label>
                <input type="text" id="queja-denunciado-area" placeholder="Área" />
            </div>
            <div class="form-group">
                <label>Relación Jerárquica</label>
                <select id="queja-relacion">
                    <option value="">-- Seleccionar --</option>
                    <option value="Superior">Superior Inmediato</option>
                    <option value="Par">Compañero de Par</option>
                    <option value="Subalterno">Subalterno</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>

            <div class="form-group ancho-completo">
                <label>Descripción Detallada de los Hechos <span class="required">*</span></label>
                <textarea id="queja-descripcion" placeholder="Fechas, lugares, descripción cronológica..."></textarea>
            </div>
        </div>
    `;

    abrirModal('📬 Registrar Nueva Queja', contenido, () => {
        guardarNuevaQueja();
    }, '💾 Radicar Queja');
}

/**
 * Guarda nueva queja.
 */
function guardarNuevaQueja(): void {
    if (!comiteActual) return;

    const tipo = (qsTipo<HTMLSelectElement>('#queja-tipo')?.value || '') as TipoQueja;
    const esAnonima = (qsTipo<HTMLSelectElement>('#queja-anonima')?.value || 'no') === 'si';
    const fecha = qsTipo<HTMLInputElement>('#queja-fecha')?.value || '';
    const denunciadoNombre = qsTipo<HTMLInputElement>('#queja-denunciado-nombre')?.value || '';
    const descripcion = qsTipo<HTMLTextAreaElement>('#queja-descripcion')?.value || '';

    if (!tipo || !fecha || !denunciadoNombre || !descripcion) {
        alert('⚠️ Complete los campos obligatorios (tipo, fecha, agresor, descripción).');
        return;
    }

    // Determinar ruta
    let ruta: RutaQueja = 'ConflictoConvivencia';
    if (tipo === 'AcosoLaboral') ruta = 'AcosoLaboral';
    else if (tipo === 'AcosoSexual') ruta = 'AcosoSexual';

    // Generar número de radicado
    const quejas = storageQuejasConvivencia.obtenerTodos().filter(q => q.comiteId === comiteActual!.id);
    const año = new Date(fecha).getFullYear();
    const numeroRadicado = formatearRadicado(quejas.length + 1, año);

    const nuevaQueja: IQuejaConvivencia = {
        id: generarIdQueja(),
        empresaId: comiteActual.empresaId,
        comiteId: comiteActual.id,
        numeroRadicado,

        esAnonimo: esAnonima,
        quejosoId: null,
        quejosoNombre: esAnonima ? null : (qsTipo<HTMLInputElement>('#queja-quejoso-nombre')?.value || null),
        quejosoCargo: esAnonima ? null : (qsTipo<HTMLInputElement>('#queja-quejoso-cargo')?.value || null),
        quejosoArea: esAnonima ? null : (qsTipo<HTMLInputElement>('#queja-quejoso-area')?.value || null),
        quejosoCorreo: esAnonima ? null : (qsTipo<HTMLInputElement>('#queja-quejoso-correo')?.value || null),
        quejosoTelefono: esAnonima ? null : (qsTipo<HTMLInputElement>('#queja-quejoso-telefono')?.value || null),

        denunciadoNombre,
        denunciadoCargo: qsTipo<HTMLInputElement>('#queja-denunciado-cargo')?.value || '',
        denunciadoArea: qsTipo<HTMLInputElement>('#queja-denunciado-area')?.value || '',
        relacionJerarquica: qsTipo<HTMLSelectElement>('#queja-relacion')?.value || '',

        tipo,
        ruta,
        descripcion,
        evidencias: [],

        fechaRadicacion: fecha,
        fechaAcuseRecibo: null,
        fechaExamenInicial: null,
        fechaMedidasProteccion: null,
        fechaEntrevistas: null,
        fechaMesaDialogo: null,
        fechaCierre: null,
        fechaTraslado: null,

        medidasProteccion: [],
        casoId: null,
        entrevistas: [],
        observaciones: null,
        estado: 'Radicada',

        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    const ok = storageQuejasConvivencia.guardar(nuevaQueja);

    if (ok) {
        alert(`✅ Queja radicada: ${numeroRadicado}`);
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo radicar la queja.');
    }
}

/**
 * Modal: Lista de quejas.
 */
function abrirModalListaQuejas(): void {
    if (!comiteActual) return;

    const quejas = storageQuejasConvivencia
        .obtenerTodos()
        .filter(q => q.comiteId === comiteActual!.id)
        .sort((a, b) => new Date(b.fechaRadicacion).getTime() - new Date(a.fechaRadicacion).getTime());

    const filas = quejas.length > 0
        ? quejas.map(q => {
            const visual = obtenerVisualizacionEstadoQueja(q.estado);
            return `
                <tr>
                    <td style="font-family:monospace; font-size:0.75rem;">${escaparHTML(q.numeroRadicado)}</td>
                    <td>${formatearFecha(q.fechaRadicacion)}</td>
                    <td><span class="badge-tipo-queja tipo-${q.tipo.toLowerCase()}">${escaparHTML(q.tipo)}</span></td>
                    <td><span class="badge-estado ${visual.clase}">${visual.texto}</span></td>
                    <td style="text-align:center;">
                        <button class="btn btn-sm btn-outline btn-ver-queja" data-queja-id="${escaparHTML(q.id)}" type="button">
                            Ver
                        </button>
                    </td>
                </tr>
            `;
        }).join('')
        : `<tr><td colspan="5" class="estado-vacio"><p>No hay quejas registradas.</p></td></tr>`;

    const contenido = `
        <div class="info-box">
            <strong>Quejas Radicadas</strong><br>
            Resolución 3461 de 2025: plazos de 5 a 15 días calendario por etapa.
        </div>

        <div class="tabla-scroll">
            <table class="tabla-representantes">
                <thead>
                    <tr>
                        <th>Radicado</th>
                        <th style="width:110px;">Fecha</th>
                        <th style="width:130px;">Tipo</th>
                        <th style="width:130px;">Estado</th>
                        <th style="width:70px;">Ver</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;

    abrirModal('📬 Quejas Radicadas', contenido);

    document.querySelectorAll('.btn-ver-queja').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const id = target.dataset.quejaId;
            if (id) abrirModalVerQueja(id);
        });
    });
}

/**
 * Modal: Ver queja.
 */
function abrirModalVerQueja(quejaId: string): void {
    const queja = storageQuejasConvivencia.obtenerPorId(quejaId);
    if (!queja) {
        alert('⚠️ No se encontró la queja.');
        return;
    }

    const visual = obtenerVisualizacionEstadoQueja(queja.estado);
    const plazos = calcularPlazosQueja(queja.fechaRadicacion, queja.ruta);

    const etapa1 = obtenerEstadoEtapa(plazos.fechaLimiteAcuse, queja.fechaAcuseRecibo);
    const etapa2 = obtenerEstadoEtapa(plazos.fechaLimiteExamen, queja.fechaExamenInicial);
    const etapa3 = obtenerEstadoEtapa(plazos.fechaLimiteEntrevistas, queja.fechaEntrevistas);
    const etapa4 = queja.ruta === 'AcosoSexual'
        ? obtenerEstadoEtapa(plazos.fechaLimiteMedidas || '', queja.fechaMedidasProteccion)
        : obtenerEstadoEtapa(plazos.fechaLimiteMesaDialogo, queja.fechaMesaDialogo);

    const permiteConc = permiteConciliacion(queja.ruta);

    const contenido = `
        <div class="info-box ${queja.ruta === 'AcosoSexual' ? 'info-box-critica' : ''}">
            <strong>Radicado: ${escaparHTML(queja.numeroRadicado)}</strong><br>
            Estado actual: <span class="badge-estado ${visual.clase}">${visual.texto}</span>
        </div>

        ${queja.ruta === 'AcosoSexual' ? `
            <div class="info-box info-box-critica">
                <strong>🔴 ATENCIÓN — Acoso Sexual Laboral (Ley 2365 de 2024)</strong><br>
                NO se permite conciliación ni careo. Se deben activar medidas de protección inmediatas.
            </div>
        ` : ''}

        <div class="form-grid">
            <div class="form-group"><label>Tipo</label><input type="text" value="${escaparHTML(queja.tipo)}" readonly /></div>
            <div class="form-group"><label>Fecha Radicación</label><input type="text" value="${formatearFecha(queja.fechaRadicacion)}" readonly /></div>
            <div class="form-group"><label>¿Anónima?</label><input type="text" value="${queja.esAnonimo ? 'Sí' : 'No'}" readonly /></div>
            <div class="form-group"><label>Ruta</label><input type="text" value="${escaparHTML(queja.ruta)}" readonly /></div>
            <div class="form-group ancho-completo"><label>Descripción</label><textarea readonly>${escaparHTML(queja.descripcion)}</textarea></div>
        </div>

        <h4 style="color:#1B365D; font-size:0.9rem; margin:1rem 0 0.5rem 0;">Plazos del Trámite (Res. 3461)</h4>
        <div class="pasos-tramite-lista">
            <div class="paso-tramite-item">
                <span class="paso-tramite-label">1. Acuse de recibo</span>
                <span class="paso-tramite-fecha">${plazos.fechaLimiteAcuse}</span>
                <span class="paso-tramite-estado" style="color:${etapa1.color};">${etapa1.icono} ${etapa1.texto}</span>
            </div>
            <div class="paso-tramite-item">
                <span class="paso-tramite-label">2. Examen inicial</span>
                <span class="paso-tramite-fecha">${plazos.fechaLimiteExamen}</span>
                <span class="paso-tramite-estado" style="color:${etapa2.color};">${etapa2.icono} ${etapa2.texto}</span>
            </div>
            ${queja.ruta === 'AcosoSexual' ? `
            <div class="paso-tramite-item">
                <span class="paso-tramite-label">3. Medidas de protección</span>
                <span class="paso-tramite-fecha">${plazos.fechaLimiteMedidas || '-'}</span>
                <span class="paso-tramite-estado" style="color:${etapa4.color};">${etapa4.icono} ${etapa4.texto}</span>
            </div>
            ` : ''}
            <div class="paso-tramite-item">
                <span class="paso-tramite-label">${queja.ruta === 'AcosoSexual' ? '4' : '3'}. Entrevistas</span>
                <span class="paso-tramite-fecha">${plazos.fechaLimiteEntrevistas}</span>
                <span class="paso-tramite-estado" style="color:${etapa3.color};">${etapa3.icono} ${etapa3.texto}</span>
            </div>
            ${permiteConc ? `
            <div class="paso-tramite-item">
                <span class="paso-tramite-label">4. Mesa de diálogo</span>
                <span class="paso-tramite-fecha">${plazos.fechaLimiteMesaDialogo}</span>
                <span class="paso-tramite-estado" style="color:${etapa4.color};">${etapa4.icono} ${etapa4.texto}</span>
            </div>
            ` : ''}
        </div>

        <h4 style="color:#1B365D; font-size:0.9rem; margin:1rem 0 0.5rem 0;">Cambiar Estado</h4>
        <div class="form-grid">
            <div class="form-group ancho-completo">
                <label>Nuevo Estado</label>
                <select id="queja-nuevo-estado">
                    <option value="">-- Sin cambio --</option>
                    <option value="Radicada" ${queja.estado === 'Radicada' ? 'selected' : ''}>Radicada</option>
                    <option value="EnInvestigacion" ${queja.estado === 'EnInvestigacion' ? 'selected' : ''}>En Investigación</option>
                    <option value="Citacion" ${queja.estado === 'Citacion' ? 'selected' : ''}>Citación</option>
                    ${permiteConc ? `<option value="EnConciliacion" ${queja.estado === 'EnConciliacion' ? 'selected' : ''}>En Conciliación</option>` : ''}
                    <option value="Cerrada" ${queja.estado === 'Cerrada' ? 'selected' : ''}>Cerrada</option>
                    <option value="Trasladada" ${queja.estado === 'Trasladada' ? 'selected' : ''}>Trasladada</option>
                </select>
            </div>
        </div>
    `;

    abrirModal(`📬 Queja ${escaparHTML(queja.numeroRadicado)}`, contenido, () => {
        const nuevoEstado = qsTipo<HTMLSelectElement>('#queja-nuevo-estado')?.value;
        if (nuevoEstado) {
            const actualizado = storageQuejasConvivencia.actualizar(quejaId, {
                estado: nuevoEstado as IQuejaConvivencia['estado'],
                fechaActualizacion: new Date()
            });
            if (actualizado) {
                alert('✅ Estado actualizado.');
                cerrarModal();
                recargar();
            }
        } else {
            cerrarModal();
        }
    }, '💾 Actualizar Estado');
}

// ================================================================
// MODALES DE FASE 2 — CASOS
// ================================================================

/**
 * Modal: Lista de casos.
 */
function abrirModalListaCasos(): void {
    if (!comiteActual) return;

    const casos = storageCasosConvivencia
        .obtenerTodos()
        .filter(c => c.comiteId === comiteActual!.id);

    const filas = casos.length > 0
        ? casos.map(c => {
            const queja = storageQuejasConvivencia.obtenerPorId(c.quejaId);
            const radicado = queja?.numeroRadicado || '-';
            const visual = obtenerVisualizacionEstadoQueja(c.estado);
            return `
                <tr>
                    <td>${escaparHTML(radicado)}</td>
                    <td><span class="badge-estado ${visual.clase}">${visual.texto}</span></td>
                    <td>${c.seguimientos.length} seguimiento(s)</td>
                    <td>${c.fechaCierre ? formatearFecha(c.fechaCierre) : 'Abierto'}</td>
                </tr>
            `;
        }).join('')
        : `<tr><td colspan="4" class="estado-vacio"><p>No hay casos registrados.</p></td></tr>`;

    abrirModal('📁 Gestión de Casos', `
        <div class="info-box">
            <strong>Casos del Comité</strong><br>
            Seguimiento a entrevistas, mesas de diálogo y planes de mejora.
        </div>
        <div class="tabla-scroll">
            <table class="tabla-representantes">
                <thead>
                    <tr>
                        <th>Radicado</th>
                        <th style="width:150px;">Estado</th>
                        <th style="width:130px;">Seguimientos</th>
                        <th style="width:110px;">Cierre</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `);
}

// ================================================================
// MODALES DE FASE 2 — ACTAS
// ================================================================

/**
 * Modal: Lista de actas.
 */
function abrirModalListaActas(): void {
    if (!comiteActual) return;

    const actas = storageActasConvivencia
        .obtenerTodos()
        .filter(a => a.comiteId === comiteActual!.id)
        .sort((a, b) => b.numeroActa - a.numeroActa);

    const filas = actas.length > 0
        ? actas.map(a => `
            <tr>
                <td style="text-align:center; font-weight:700;">No. ${String(a.numeroActa).padStart(3, '0')}</td>
                <td>${formatearFecha(a.fechaReunion)}</td>
                <td>${escaparHTML(a.tipoReunion)}</td>
                <td>${escaparHTML(a.lugar || '—')}</td>
                <td style="text-align:center;">
                    <button class="btn btn-sm btn-outline btn-ver-acta" data-acta-id="${escaparHTML(a.id)}" type="button">
                        Ver
                    </button>
                </td>
            </tr>
        `).join('')
        : `<tr><td colspan="5" class="estado-vacio"><p>No hay actas registradas.</p></td></tr>`;

    abrirModal('📄 Actas de Reunión', `
        <div class="info-box">
            <strong>Actas de Reunión Mensual</strong><br>
            Reuniones ordinarias mensuales y extraordinarias (Res. 3461).
        </div>
        <div class="tabla-scroll">
            <table class="tabla-representantes">
                <thead>
                    <tr>
                        <th style="width:80px;">Acta</th>
                        <th style="width:120px;">Fecha</th>
                        <th style="width:120px;">Tipo</th>
                        <th>Lugar</th>
                        <th style="width:70px;">Ver</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
        <button id="btn-crear-acta-modal" class="btn btn-sm btn-success" type="button" style="margin-top:0.5rem;">
            ➕ Nueva Acta de Reunión
        </button>
    `);

    document.querySelectorAll('.btn-ver-acta').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const id = target.dataset.actaId;
            if (id) abrirModalVerActa(id);
        });
    });

    const btnCrear = qsTipo<HTMLElement>('#btn-crear-acta-modal');
    if (btnCrear) btnCrear.addEventListener('click', abrirModalNuevaActa);
}

/**
 * Modal: Nueva Acta.
 */
function abrirModalNuevaActa(): void {
    if (!comiteActual) return;

    const actas = storageActasConvivencia.obtenerTodos().filter(a => a.comiteId === comiteActual!.id);
    const siguienteNumero = actas.length + 1;
    const año = new Date().getFullYear();

    const miembros = [...comiteActual.representantesEmpleador, ...comiteActual.representantesTrabajadores];
    const checkboxes = miembros
        .map((m) => `
            <label style="display:flex; align-items:center; gap:0.5rem; padding:0.25rem 0; font-size:0.85rem;">
                <input type="checkbox" class="chk-asistente" data-nombre="${escaparHTML(m.nombre)}" />
                <span>${escaparHTML(m.nombre)} <small style="color:#64748B;">(${m.parte} - ${m.rol})</small></span>
            </label>
        `)
        .join('');

    const contenido = `
        <div class="info-box">
            <strong>Acta No. ${formatearNumeroActa(siguienteNumero, año)}</strong>
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label>Fecha <span class="required">*</span></label>
                <input type="date" id="acta-fecha" value="${fechaActualISO()}" />
            </div>
            <div class="form-group">
                <label>Hora Inicio</label>
                <input type="time" id="acta-hora-inicio" value="09:00" />
            </div>
            <div class="form-group">
                <label>Hora Cierre</label>
                <input type="time" id="acta-hora-cierre" value="10:30" />
            </div>
            <div class="form-group">
                <label>Tipo</label>
                <select id="acta-tipo">
                    <option value="Ordinaria">Ordinaria</option>
                    <option value="Extraordinaria">Extraordinaria</option>
                </select>
            </div>
            <div class="form-group ancho-completo">
                <label>Lugar <span class="required">*</span></label>
                <input type="text" id="acta-lugar" placeholder="Ej: Sala de juntas" />
            </div>
            <div class="form-group ancho-completo">
                <label>Asistentes</label>
                <div style="border:1px solid #e2e8f0; border-radius:0.375rem; padding:0.5rem 0.75rem; max-height:180px; overflow-y:auto;">
                    ${checkboxes || '<p class="text-muted">No hay miembros registrados.</p>'}
                </div>
            </div>
            <div class="form-group ancho-completo">
                <label>Orden del Día <span class="required">*</span></label>
                <textarea id="acta-orden" placeholder="1. Verificación del quórum&#10;2. Lectura del acta anterior&#10;3. Revisión del buzón&#10;4. ..."></textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>Desarrollo / Hallazgos</label>
                <textarea id="acta-desarrollo" placeholder="Descripción de los temas tratados..."></textarea>
            </div>
        </div>
    `;

    abrirModal('📄 Nueva Acta de Reunión', contenido, () => {
        guardarNuevaActa(siguienteNumero, año);
    }, '💾 Guardar Acta');
}

/**
 * Guarda nueva acta.
 */
function guardarNuevaActa(numero: number, año: number): void {
    if (!comiteActual) return;

    const fecha = qsTipo<HTMLInputElement>('#acta-fecha')?.value || '';
    const horaInicio = qsTipo<HTMLInputElement>('#acta-hora-inicio')?.value || '';
    const horaCierre = qsTipo<HTMLInputElement>('#acta-hora-cierre')?.value || '';
    const tipo = (qsTipo<HTMLSelectElement>('#acta-tipo')?.value || 'Ordinaria') as TipoReunionConvivencia;
    const lugar = qsTipo<HTMLInputElement>('#acta-lugar')?.value || '';
    const orden = qsTipo<HTMLTextAreaElement>('#acta-orden')?.value || '';
    const desarrollo = qsTipo<HTMLTextAreaElement>('#acta-desarrollo')?.value || '';

    if (!fecha || !lugar || !orden) {
        alert('⚠️ Complete fecha, lugar y orden del día.');
        return;
    }

    const asistentes: string[] = [];
    document.querySelectorAll('.chk-asistente').forEach(chk => {
        const el = chk as HTMLInputElement;
        if (el.checked && el.dataset.nombre) asistentes.push(el.dataset.nombre);
    });

    const nuevaActa: IActaConvivencia = {
        id: generarIdActaConvivencia(),
        empresaId: comiteActual.empresaId,
        comiteId: comiteActual.id,
        numeroActa: numero,
        fechaReunion: fecha,
        horaInicio,
        horaCierre,
        tipoReunion: tipo,
        lugar,
        asistentes,
        ausentes: [],
        quorumValido: asistentes.length >= 2,
        ordenDelDia: orden,
        desarrollo,
        resumen: desarrollo.substring(0, 200),
        compromisos: [],
        archivoPDF: '',
        permisosAcceso: ['Comite', 'Empresa'],
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    const ok = storageActasConvivencia.guardar(nuevaActa);

    if (ok) {
        console.info(`M21: Acta No. ${formatearNumeroActa(numero, año)} guardada.`);
        alert(`✅ Acta No. ${formatearNumeroActa(numero, año)} guardada.`);
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar el acta.');
    }
}

/**
 * Modal: Ver acta.
 */
function abrirModalVerActa(actaId: string): void {
    const acta = storageActasConvivencia.obtenerPorId(actaId);
    if (!acta) {
        alert('⚠️ No se encontró el acta.');
        return;
    }

    const contenido = `
        <div class="form-grid">
            <div class="form-group"><label>Fecha</label><input type="text" value="${formatearFecha(acta.fechaReunion)}" readonly /></div>
            <div class="form-group"><label>Tipo</label><input type="text" value="${escaparHTML(acta.tipoReunion)}" readonly /></div>
            <div class="form-group"><label>Hora Inicio</label><input type="text" value="${escaparHTML(acta.horaInicio)}" readonly /></div>
            <div class="form-group"><label>Hora Cierre</label><input type="text" value="${escaparHTML(acta.horaCierre)}" readonly /></div>
            <div class="form-group ancho-completo"><label>Lugar</label><input type="text" value="${escaparHTML(acta.lugar)}" readonly /></div>
            <div class="form-group ancho-completo"><label>Orden del Día</label><textarea readonly style="min-height:80px;">${escaparHTML(acta.ordenDelDia)}</textarea></div>
            <div class="form-group ancho-completo"><label>Desarrollo</label><textarea readonly style="min-height:100px;">${escaparHTML(acta.desarrollo)}</textarea></div>
        </div>
    `;

    abrirModal(`📄 Acta No. ${String(acta.numeroActa).padStart(3, '0')}`, contenido);
}

// ================================================================
// MODALES DE FASE 2 — CONFIDENCIALIDAD
// ================================================================

/**
 * Modal: Compromisos de Confidencialidad.
 */
function abrirModalConfidencialidad(): void {
    if (!comiteActual) return;

    const compromisos = storageCompromisosConfidencialidad
        .obtenerTodos()
        .filter(c => c.comiteId === comiteActual!.id);

    const filas = compromisos.length > 0
        ? compromisos.map(c => `
            <tr>
                <td>${escaparHTML(c.nombre)}</td>
                <td>${escaparHTML(c.cedula)}</td>
                <td>${escaparHTML(c.parte)} - ${escaparHTML(c.tipo)}</td>
                <td>${c.firmado ? '✅ Firmado' : '⬜ Pendiente'}</td>
            </tr>
        `).join('')
        : `<tr><td colspan="4" class="estado-vacio"><p>No hay compromisos registrados. Use el botón de abajo para generarlos.</p></td></tr>`;

    const contenido = `
        <div class="info-box">
            <strong>Compromisos de Confidencialidad</strong><br>
            Cada miembro del CCL debe firmar el compromiso de reserva (Ley 1010 de 2006).
        </div>

        <div class="tabla-scroll">
            <table class="tabla-representantes">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th style="width:120px;">Cédula</th>
                        <th style="width:180px;">Parte / Tipo</th>
                        <th style="width:110px;">Estado</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>

        <button id="btn-generar-compromisos" class="btn btn-sm btn-success" type="button" style="margin-top:0.5rem;">
            ➕ Generar Compromisos para Todos los Miembros
        </button>
    `;

    abrirModal('✍️ Compromisos de Confidencialidad', contenido);

    const btnGenerar = qsTipo<HTMLElement>('#btn-generar-compromisos');
    if (btnGenerar) {
        btnGenerar.addEventListener('click', () => {
            generarCompromisosConfidencialidad();
        });
    }
}

/**
 * Genera compromisos de confidencialidad para todos los miembros.
 */
function generarCompromisosConfidencialidad(): void {
    if (!comiteActual) return;

    const todosReps = [...comiteActual.representantesEmpleador, ...comiteActual.representantesTrabajadores];
    const existentes = storageCompromisosConfidencialidad
        .obtenerTodos()
        .filter(c => c.comiteId === comiteActual!.id);

    let generados = 0;

    todosReps.forEach(rep => {
        // Evitar duplicados (mismo nombre y cédula)
        const yaExiste = existentes.some(c => c.cedula === rep.cedula && c.cedula !== '');
        if (yaExiste || !rep.nombre || !rep.cedula) return;

        const esPresidente = comiteActual!.presidenteId === rep.cedula;
        const esSecretario = comiteActual!.secretarioId === rep.cedula;

        const nuevo: ICompromisoConfidencialidad = {
            id: generarIdConfidencialidad(),
            empresaId: comiteActual!.empresaId,
            comiteId: comiteActual!.id,

            nombre: rep.nombre,
            cedula: rep.cedula,
            cargo: rep.cargo,
            parte: rep.parte,
            tipo: rep.rol,
            rol: esPresidente ? 'Presidente' : (esSecretario ? 'Secretario' : 'Integrante'),

            alcance: 'Me comprometo a mantener en estricta reserva, confidencialidad y secreto la totalidad de las informaciones, hechos, testimonios, pruebas, expedientes y datos personales de las partes involucradas.',
            prohibiciones: 'Me abstendré de revelar, divulgar o transmitir por cualquier medio el contenido de las quejas; hacer copias no autorizadas; o usar la información para beneficio propio o represalia.',
            vigencia: 'El deber de confidencialidad y reserva no finaliza al culminar mi período de nombramiento en el CCL, ni tras la terminación de mi contrato de trabajo, manteniéndose vigente de manera indefinida.',
            consecuencias: 'Declaro conocer que el incumplimiento del presente compromiso constituye falta grave y puede dar lugar a sanciones disciplinarias, terminación del contrato con justa causa y acciones legales.',

            ciudadFirma: comiteActual!.ciudad,
            fechaFirma: fechaActualISO(),
            firmado: false,
            archivoPDF: '',

            fechaCreacion: new Date(),
            fechaActualizacion: new Date()
        };

        if (storageCompromisosConfidencialidad.guardar(nuevo)) {
            generados++;
        }
    });

    alert(`✅ ${generados} compromiso(s) generado(s).`);
    cerrarModal();
    abrirModalConfidencialidad();
}

// ================================================================
// MODALES DE FASE 2 — INFORMES
// ================================================================

/**
 * Modal: Nuevo Informe.
 */
function abrirModalNuevoInforme(): void {
    if (!comiteActual) return;

    const contenido = `
        <div class="info-box">
            <strong>Informe de Gestión</strong><br>
            Trimestral (interno) o Semestral (Ministerio - 31 julio / 31 enero).
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label>Tipo <span class="required">*</span></label>
                <select id="inf-tipo">
                    <option value="Trimestral">Trimestral (interno)</option>
                    <option value="Semestral">Semestral (Ministerio)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Periodo <span class="required">*</span></label>
                <select id="inf-periodo">
                    <option value="T1">T1 - Primer trimestre</option>
                    <option value="T2">T2 - Segundo trimestre</option>
                    <option value="T3">T3 - Tercer trimestre</option>
                    <option value="T4">T4 - Cuarto trimestre</option>
                    <option value="S1">S1 - Primer semestre</option>
                    <option value="S2">S2 - Segundo semestre</option>
                </select>
            </div>
            <div class="form-group">
                <label>Año</label>
                <input type="number" id="inf-año" value="${new Date().getFullYear()}" min="2020" />
            </div>
            <div class="form-group">
                <label>Quejas Recibidas</label>
                <input type="number" id="inf-quejas" value="0" min="0" />
            </div>
            <div class="form-group">
                <label>Casos Cerrados con Acuerdo</label>
                <input type="number" id="inf-cerrados-acuerdo" value="0" min="0" />
            </div>
            <div class="form-group">
                <label>Casos Trasladados</label>
                <input type="number" id="inf-trasladados" value="0" min="0" />
            </div>
            <div class="form-group">
                <label>Capacitaciones Realizadas</label>
                <input type="number" id="inf-capacitaciones" value="0" min="0" />
            </div>
            <div class="form-group ancho-completo">
                <label>Observaciones</label>
                <textarea id="inf-obs" placeholder="Observaciones adicionales..."></textarea>
            </div>
        </div>
    `;

    abrirModal('📊 Nuevo Informe de Gestión', contenido, () => {
        guardarNuevoInforme();
    }, '💾 Guardar Informe');
}

/**
 * Guarda nuevo informe.
 */
function guardarNuevoInforme(): void {
    if (!comiteActual) return;

    const tipo = (qsTipo<HTMLSelectElement>('#inf-tipo')?.value || 'Trimestral') as IInformeConvivencia['tipo'];
    const periodo = (qsTipo<HTMLSelectElement>('#inf-periodo')?.value || 'T1') as IInformeConvivencia['periodo'];
    const año = parseInt(qsTipo<HTMLInputElement>('#inf-año')?.value || '2026', 10);
    const quejas = parseInt(qsTipo<HTMLInputElement>('#inf-quejas')?.value || '0', 10);
    const cerradosAcuerdo = parseInt(qsTipo<HTMLInputElement>('#inf-cerrados-acuerdo')?.value || '0', 10);
    const trasladados = parseInt(qsTipo<HTMLInputElement>('#inf-trasladados')?.value || '0', 10);
    const capacitaciones = parseInt(qsTipo<HTMLInputElement>('#inf-capacitaciones')?.value || '0', 10);
    const obs = qsTipo<HTMLTextAreaElement>('#inf-obs')?.value || '';

    const nuevos: IInformeConvivencia = {
        id: generarIdInforme(),
        empresaId: comiteActual.empresaId,
        comiteId: comiteActual.id,
        tipo,
        periodo,
        año,

        quejasRecibidas: quejas,
        quejasAcosoLaboral: 0,
        quejasAcosoSexual: 0,
        quejasConflictoConvivencia: 0,
        casosCerradosConAcuerdo: cerradosAcuerdo,
        casosCerradosSinAcuerdo: 0,
        casosTrasladados: trasladados,
        casosEnTramite: 0,

        capacitacionesRealizadas: capacitaciones,
        temasCapacitacion: [],
        actividadesPreventivas: '',

        indicadores: {
            reunionesProgramadas: tipo === 'Trimestral' ? 3 : 6,
            reunionesRealizadas: 0,
            coberturaReuniones: 0,
            quejasRecibidas: quejas,
            quejasCerradas: cerradosAcuerdo,
            eficaciaCierre: quejas > 0 ? Math.round((cerradosAcuerdo / quejas) * 100) : 0,
            capacitacionesPlanificadas: capacitaciones,
            capacitacionesEjecutadas: capacitaciones,
            cumplimientoPrevencion: 100
        },

        estado: 'Borrador',
        fechaRadicacion: null,
        entidadReceptora: tipo === 'Semestral' ? 'Ministerio del Trabajo' : null,
        numeroRadicado: null,
        archivoPDF: '',

        observaciones: obs || null,
        elaboradoPor: '',
        aprobadoPor: '',

        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    const ok = storageInformesConvivencia.guardar(nuevos);

    if (ok) {
        alert('✅ Informe guardado.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar el informe.');
    }
}

/**
 * Modal: Lista de informes.
 */
function abrirModalListaInformes(): void {
    if (!comiteActual) return;

    const informes = storageInformesConvivencia
        .obtenerTodos()
        .filter(i => i.comiteId === comiteActual!.id)
        .sort((a, b) => b.año - a.año);

    const filas = informes.length > 0
        ? informes.map(i => `
            <tr>
                <td>${escaparHTML(i.tipo)}</td>
                <td>${escaparHTML(i.periodo)} - ${i.año}</td>
                <td>${i.quejasRecibidas}</td>
                <td>${escaparHTML(i.estado)}</td>
            </tr>
        `).join('')
        : `<tr><td colspan="4" class="estado-vacio"><p>No hay informes registrados.</p></td></tr>`;

    abrirModal('📊 Informes de Gestión', `
        <div class="info-box">
            <strong>Informes Obligatorios</strong><br>
            Reportes trimestrales internos y semestrales al Ministerio.
        </div>
        <div class="tabla-scroll">
            <table class="tabla-representantes">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Periodo</th>
                        <th>Quejas</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `);
}

// ================================================================
// MODALES DE FASE 2 — REGLAMENTO
// ================================================================

/**
 * Modal: Reglamento Interno.
 */
function abrirModalReglamento(): void {
    if (!comiteActual) return;

    const reglamentos = storageReglamentosCCL
        .obtenerTodos()
        .filter(r => r.comiteId === comiteActual!.id);

    const reglamento = reglamentos.length > 0 ? reglamentos[0] : null;

    const contenido = `
        <div class="info-box">
            <strong>Reglamento Interno del CCL</strong><br>
            Documento obligatorio con reglas internas de funcionamiento.
        </div>

        <div class="form-grid">
            <div class="form-group ancho-completo">
                <label>Objeto</label>
                <textarea id="reg-objeto">${escaparHTML(reglamento?.objeto || 'Definir las reglas internas de funcionamiento del Comité de Convivencia Laboral.')}</textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>Marco Legal</label>
                <textarea id="reg-marco">${escaparHTML(reglamento?.marcoLegal || 'Resolución 3461 de 2025, Ley 2365 de 2024, Ley 1010 de 2006, Decreto 1072 de 2015.')}</textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>Funciones del Presidente</label>
                <textarea id="reg-presidente">${escaparHTML(reglamento?.funcionesPresidente || 'Convocar a sesiones, presidir reuniones, tramitar recomendaciones ante la alta dirección.')}</textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>Funciones del Secretario</label>
                <textarea id="reg-secretario">${escaparHTML(reglamento?.funcionesSecretario || 'Recibir y tramitar quejas, citar a las partes, elaborar actas, custodiar el archivo confidencial.')}</textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>Protocolo de Confidencialidad</label>
                <textarea id="reg-confidencialidad">${escaparHTML(reglamento?.protocoloConfidencialidad || 'Toda la información, pruebas, testimonios y actas son de carácter reservado.')}</textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>Régimen de Sanciones</label>
                <textarea id="reg-sanciones">${escaparHTML(reglamento?.regimenSanciones || 'La violación de la reserva constituye falta grave según el Reglamento Interno de Trabajo.')}</textarea>
            </div>
        </div>
    `;

    abrirModal('📖 Reglamento Interno del CCL', contenido, () => {
        guardarReglamento();
    }, '💾 Guardar Reglamento');
}

/**
 * Guarda reglamento.
 */
function guardarReglamento(): void {
    if (!comiteActual) return;

    const existentes = storageReglamentosCCL
        .obtenerTodos()
        .filter(r => r.comiteId === comiteActual!.id);

    const datos = {
        empresaId: comiteActual.empresaId,
        comiteId: comiteActual.id,
        version: existentes.length > 0 ? `1.${existentes.length}.0` : '1.0.0',
        objeto: qsTipo<HTMLTextAreaElement>('#reg-objeto')?.value || '',
        marcoLegal: qsTipo<HTMLTextAreaElement>('#reg-marco')?.value || '',
        conformacion: 'Paritaria: representantes del empleador y de los trabajadores.',
        funcionesPresidente: qsTipo<HTMLTextAreaElement>('#reg-presidente')?.value || '',
        funcionesSecretario: qsTipo<HTMLTextAreaElement>('#reg-secretario')?.value || '',
        funcionesIntegrantes: 'Asistir a sesiones, guardar reserva, participar en investigaciones.',
        impedimentos: 'Declararse impedido ante conflicto de interés, enemistad o parentesco.',
        protocoloConfidencialidad: qsTipo<HTMLTextAreaElement>('#reg-confidencialidad')?.value || '',
        regimenSanciones: qsTipo<HTMLTextAreaElement>('#reg-sanciones')?.value || '',
        vigencia: '2 años desde el acta de constitución.',
        fechaAprobacion: fechaActualISO(),
        ciudadAprobacion: comiteActual.ciudad,
        estado: 'Aprobado' as const,
        firmantes: [],
        archivoPDF: '',
        fechaActualizacion: new Date()
    };

    let ok = false;
    if (existentes.length > 0) {
        ok = storageReglamentosCCL.actualizar(existentes[0].id, datos);
    } else {
        const nuevo: IReglamentoInternoCCL = {
            id: `REG-${Date.now()}`,
            ...datos,
            fechaCreacion: new Date()
        };
        ok = storageReglamentosCCL.guardar(nuevo);
    }

    if (ok) {
        alert('✅ Reglamento guardado.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar el reglamento.');
    }
}

// ================================================================
// MODALES DE FASE 2 — INDICADORES
// ================================================================

/**
 * Modal: Indicadores de Gestión.
 */
function abrirModalIndicadores(): void {
    if (!comiteActual) return;

    const actas = storageActasConvivencia.obtenerTodos().filter(a => a.comiteId === comiteActual!.id);
    const quejas = storageQuejasConvivencia.obtenerTodos().filter(q => q.comiteId === comiteActual!.id);
    const quejasCerradas = quejas.filter(q => q.estado === 'Cerrada').length;
    const informes = storageInformesConvivencia.obtenerTodos().filter(i => i.comiteId === comiteActual!.id);

    const capacitacionesEjecutadas = informes.reduce((sum, i) => sum + i.capacitacionesRealizadas, 0);

    const indicadores = calcularIndicadoresCCL(
        actas.length,
        quejasCerradas,
        quejas.length,
        capacitacionesEjecutadas,
        12
    );

    const contenido = `
        <div class="info-box">
            <strong>Indicadores de Gestión del CCL</strong><br>
            Fórmulas según Info 21: cobertura de reuniones, eficacia de cierre y cumplimiento del plan.
        </div>

        <div class="indicadores-grid">
            <div class="indicador-card">
                <div class="indicador-valor">${indicadores.coberturaReuniones}%</div>
                <div class="indicador-label">Cobertura de Reuniones</div>
                <div class="indicador-descripcion">${actas.length} de 12 reuniones realizadas</div>
            </div>
            <div class="indicador-card">
                <div class="indicador-valor">${indicadores.eficaciaCierre}%</div>
                <div class="indicador-label">Eficacia de Cierre</div>
                <div class="indicador-descripcion">${quejasCerradas} de ${quejas.length} quejas cerradas</div>
            </div>
            <div class="indicador-card">
                <div class="indicador-valor">${indicadores.cumplimientoPrevencion}%</div>
                <div class="indicador-label">Cumplimiento Prevención</div>
                <div class="indicador-descripcion">${capacitacionesEjecutadas} de 12 capacitaciones</div>
            </div>
        </div>
    `;

    abrirModal('📈 Indicadores de Gestión', contenido);
}

// ================================================================
// GUARDAR COMITÉ (Encabezado)
// ================================================================

/**
 * Guarda el encabezado del comité.
 */
function guardarComite(): void {
    if (!comiteActual) return;

    const nombre = qsTipo<HTMLInputElement>('#enc-nombre')?.value || '';
    const ciudad = qsTipo<HTMLInputElement>('#enc-ciudad')?.value || '';
    const trabajadores = parseInt(qsTipo<HTMLInputElement>('#enc-trabajadores')?.value || '0', 10) || 0;
    const canal = qsTipo<HTMLInputElement>('#enc-canal')?.value || '';
    const buzon = qsTipo<HTMLInputElement>('#enc-buzon')?.value || '';

    if (trabajadores < 1) {
        alert('⚠️ El número de trabajadores debe ser mayor a 0.');
        return;
    }

    const ok = storageConvivencia.actualizar(comiteActual.id, {
        nombre,
        ciudad,
        numeroTrabajadores: trabajadores,
        canalQuejas: canal,
        buzonFisico: buzon,
        fechaActualizacion: new Date()
    });

    if (ok) {
        hayCambios = false;
        alert('✅ Comité guardado correctamente.');
    } else {
        alert('❌ No se pudo guardar.');
    }
}

// ================================================================
// VOLVER AL LISTADO
// ================================================================

/**
 * Confirma y vuelve al listado.
 */
function confirmarVolver(): void {
    if (hayCambios) {
        const confirmar = confirm('⚠️ Hay cambios sin guardar. ¿Desea salir sin guardar?');
        if (!confirmar) return;
    }

    localStorage.removeItem('comiteIdActiva');
    localStorage.removeItem('comiteEmpresaNit');
    localStorage.removeItem('comiteImprimir');

    window.dispatchEvent(new CustomEvent('comite:volver-listado'));

    window.close();

    setTimeout(() => {
        window.location.href = 'modules/M21-Gestion-Comite-Convivencia/convivencia-listado.html';
    }, 200);
}

// ================================================================
// RECARGAR
// ================================================================

/**
 * Recarga el dashboard (después de guardar datos).
 */
function recargar(): void {
    if (!contenedorRaiz) return;

    const comiteId = localStorage.getItem('comiteIdActiva');
    if (!comiteId) return;

    const comite = storageConvivencia.obtenerPorId(comiteId);
    if (comite) {
        comiteActual = comite;
        construirDashboard(contenedorRaiz);
    }
}