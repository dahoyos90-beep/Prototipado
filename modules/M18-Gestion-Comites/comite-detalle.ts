/**
 * modules/M18-Gestion-Comites/comite-detalle.ts
 * 
 * Lógica del detalle de un Comité (COPASST / Vigía).
 * Módulo M18 - Gestión de Comités.
 * 
 * Se abre en pestaña nueva desde comites-listado.ts.
 * Lee el comiteIdActiva y comiteEmpresaNit de localStorage.
 * 
 * Responsabilidades:
 * - Cargar el comité desde el storage.
 * - Construir el dashboard completo (encabezado naranja + banner + fases + acciones).
 * - Abrir modales para llenar cada paso de la conformación.
 * - Guardar los cambios del comité en el storage.
 * - Gestionar las actas de reunión y sus compromisos.
 * - Imprimir el comité completo (window.print).
 * - Volver al listado (dispara "comite:volver-listado").
 * 
 * @version 1.0.2
 *  - Vigía: Fase 1 ahora incluye 5 tarjetas (Diagnóstico, Nombramiento,
 *    Capacitación, Actas de Reunión, Participación SG-SST).
 *  - COPASST: Fase 1 con 8 tarjetas + Fase 2 como antes.
 *  - Quitado import no usado (calcularDiasParaVencimiento).
 * 
 * @since 2026-10-06
 */

import { qsTipo, escaparHTML, formatearFecha, fechaActualISO } from '../../src/utils.js';
import {
    storageComites,
    storageActasReunion,
    storageCompromisosComite,
    storageEmpresas
} from '../../src/storage.js';
import {
    calcularAlertaVencimiento,
    formatearPeriodo,
    generarIdActa,
    generarIdCompromiso,
    generarIdCapacitacion,
    calcularProgresoPasos,
    obtenerVisualizacionPaso,
    calcularComposicion
} from '../../src/comite-utils.js';
import type {
    IComite,
    IActaReunion,
    ICompromisoComite,
    IRepresentante,
    ICapacitacionComite,
    EstadoPaso,
    TipoReunion
} from '../../src/interfaces/index.js';

// ================================================================
// ESTADO DEL MÓDULO
// ================================================================

/** Comité actualmente cargado. */
let comiteActual: IComite | null = null;

/** Nombre de la empresa activa (para mostrar). */
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
    const contenedor = document.querySelector('#comite-detalle-container') as HTMLElement | null;

    if (!contenedor) {
        console.error('❌ M18 Detalle: No se encontró #comite-detalle-container.');
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
 * 
 * @param contenedor - Contenedor donde se construirá todo.
 */
function init(contenedor: HTMLElement): void {
    console.info('🗂️ M18 Detalle: Inicializando...');

    // 1. Leer datos de localStorage
    const comiteId = localStorage.getItem('comiteIdActiva') || '';
    const nit = localStorage.getItem('comiteEmpresaNit') || '';
    debeImprimir = localStorage.getItem('comiteImprimir') === 'true';

    if (!comiteId) {
        contenedor.innerHTML = `
            <div class="card">
                <p>⚠️ No se especificó un comité.</p>
            </div>
        `;
        console.error('M18 Detalle: No hay comiteIdActiva en localStorage.');
        return;
    }

    if (!nit) {
        contenedor.innerHTML = `
            <div class="card">
                <p>⚠️ No se especificó la empresa.</p>
            </div>
        `;
        console.error('M18 Detalle: No hay comiteEmpresaNit en localStorage.');
        return;
    }

    // 2. Cargar comité
    const comite = storageComites.obtenerPorId(comiteId);
    if (!comite) {
        contenedor.innerHTML = `
            <div class="card">
                <p>⚠️ Comité no encontrado.</p>
            </div>
        `;
        console.error(`M18 Detalle: No se encontró comité con ID ${comiteId}.`);
        return;
    }

    comiteActual = comite;

    // 3. Obtener nombre de la empresa
    const empresa = storageEmpresas.obtenerPorId(nit);
    empresaNombre = empresa?.razonSocial || 'Empresa';

    // 4. Construir dashboard
    construirDashboard(contenedor);

    // 5. Configurar evento beforeunload
    window.addEventListener('beforeunload', (e) => {
        if (hayCambios) e.preventDefault();
    });

    // 6. Si se debe imprimir, ejecutar impresión
    if (debeImprimir) {
        setTimeout(() => window.print(), 600);
    }

    console.info(`✅ M18 Detalle: Comité "${comiteActual.nombre}" cargado.`);
}

// ================================================================
// CONSTRUCCIÓN DEL DASHBOARD
// ================================================================

/**
 * Construye todo el HTML del dashboard dentro del contenedor.
 * 
 * Reglas:
 * - COPASST: Fase 1 (8 tarjetas) + Fase 2 (Operación).
 * - Vigía: Fase 1 (5 tarjetas: Diagnóstico, Nombramiento, Capacitación,
 *           Actas de Reunión, Participación SG-SST) SIN Fase 2.
 * 
 * @param contenedor - Contenedor raíz.
 */
function construirDashboard(contenedor: HTMLElement): void {
    if (!comiteActual) return;

    const c = comiteActual;
    const alerta = calcularAlertaVencimiento(c.fechaFinVigencia);
    const esVigia = c.tipo === 'Vigia';

    contenedor.innerHTML = `
        ${construirBotonVolver()}
        ${construirBannerAlerta(alerta)}
        ${construirEncabezado()}
        ${construirFase1(esVigia)}
        ${esVigia ? '' : construirFase2()}
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
 * Construye el encabezado naranja con los datos del comité.
 */
function construirEncabezado(): string {
    if (!comiteActual) return '';

    const c = comiteActual;
    const periodo = formatearPeriodo(c.fechaInicioVigencia, c.fechaFinVigencia);

    return `
        <div class="comite-encabezado">
            <div class="comite-encabezado-titulo">
                COMITÉ DE SEGURIDAD Y SALUD EN EL TRABAJO
            </div>
            <div class="comite-encabezado-subtitulo">
                CONFORMACIÓN SEGÚN RESOLUCIÓN 2013 DE 1986 · DECRETO 1072 DE 2015 · RESOLUCIÓN 0312 DE 2019
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
                    <label for="enc-ciudad">Ciudad / Municipio</label>
                    <input type="text" id="enc-ciudad" value="${escaparHTML(c.ciudad)}" />
                </div>
                <div class="comite-campo">
                    <label for="enc-tipo">Tipo</label>
                    <input type="text" id="enc-tipo" value="${c.tipo}" readonly />
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
                    <label for="enc-fecha-fin">Fin de Vigencia</label>
                    <input type="date" id="enc-fecha-fin" value="${escaparHTML(c.fechaFinVigencia)}" readonly />
                </div>
            </div>
        </div>
    `;
}

/**
 * Construye la Fase 1: Conformación del comité.
 * 
 * - COPASST: 8 tarjetas (Diagnóstico, Convocatoria, Designación, Votación,
 *            Constitución, Capacitación, Actas, SG-SST).
 * - Vigía: 5 tarjetas (Diagnóstico, Nombramiento, Capacitación, Actas, SG-SST).
 */
function construirFase1(esVigia: boolean): string {
    if (!comiteActual) return '';
    const c = comiteActual;

    const tarjetas: { id: string; icono: string; titulo: string; descripcion: string; estado: EstadoPaso }[] = esVigia
        ? [
            {
                id: 'diagnostico',
                icono: '📋',
                titulo: 'Diagnóstico de Personal',
                descripcion: 'Verificación del número de trabajadores y activación del Vigía.',
                estado: 'Completado'
            },
            {
                id: 'nombramiento',
                icono: '📝',
                titulo: 'Acta de Nombramiento',
                descripcion: 'Designación formal del Vigía y su suplente.',
                estado: c.pasoDesignacion
            },
            {
                id: 'capacitacion',
                icono: '🎓',
                titulo: 'Capacitación y Funciones',
                descripcion: 'Plan de capacitación inicial y continuada.',
                estado: c.pasoCapacitacion
            },
            {
                id: 'actas',
                icono: '📄',
                titulo: 'Actas de Reunión',
                descripcion: 'Actas mensuales ordinarias y extraordinarias.',
                estado: c.pasoActas
            },
            {
                id: 'sgsst',
                icono: '🤝',
                titulo: 'Participación SG-SST',
                descripcion: 'Política, investigación de accidentes, auditoría.',
                estado: c.pasoSgSst
            }
        ]
        : [
            {
                id: 'diagnostico',
                icono: '📋',
                titulo: 'Diagnóstico de Personal',
                descripcion: 'Verificación del número de trabajadores y activación del COPASST.',
                estado: 'Completado'
            },
            {
                id: 'convocatoria',
                icono: '📢',
                titulo: 'Convocatoria Pública',
                descripcion: 'Comunicado oficial y cronograma electoral.',
                estado: c.pasoConvocatoria
            },
            {
                id: 'designacion',
                icono: '👔',
                titulo: 'Designación Empleador',
                descripcion: 'Acta de designación de los representantes del empleador.',
                estado: c.pasoDesignacion
            },
            {
                id: 'votacion',
                icono: '🗳️',
                titulo: 'Inscripción + Votación',
                descripcion: 'Formato de inscripción y acta de escrutinio.',
                estado: c.pasoVotacion
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
                titulo: 'Plan de Capacitación',
                descripcion: 'Cronograma y registros de asistencia.',
                estado: c.pasoCapacitacion
            },
            {
                id: 'actas',
                icono: '📄',
                titulo: 'Actas de Reunión',
                descripcion: 'Actas mensuales ordinarias y extraordinarias.',
                estado: c.pasoActas
            },
            {
                id: 'sgsst',
                icono: '🤝',
                titulo: 'Participación SG-SST',
                descripcion: 'Política, investigación de accidentes, auditoría.',
                estado: c.pasoSgSst
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
                <h2>📋 Fase 1: Conformación del ${esVigia ? 'Vigía' : 'Comité'}</h2>
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
 * Construye una tarjeta de paso individual.
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
 * Construye la Fase 2: Operación del comité (solo COPASST).
 * 
 * Para el Vigía, estas tarjetas ya están dentro de Fase 1.
 */
function construirFase2(): string {
    if (!comiteActual) return '';

    const actas = storageActasReunion.obtenerTodos().filter(a => a.comiteId === comiteActual!.id);
    const totalActas = actas.length;
    const ultimaActa = actas.length > 0
        ? actas.sort((a, b) => b.numeroActa - a.numeroActa)[0]
        : null;

    const todosCompromisos = storageCompromisosComite.obtenerTodos();
    const compromisosPendientes = todosCompromisos.filter(c => {
        const acta = actas.find(a => a.id === c.actaId);
        return acta && c.estado !== 'Completado';
    }).length;

    const infoUltima = ultimaActa
        ? `Acta No. ${String(ultimaActa.numeroActa).padStart(2, '0')} · ${formatearFecha(ultimaActa.fechaReunion)}`
        : 'Sin actas registradas';

    return `
        <div class="card">
            <div class="fase-header">
                <h2>⚙️ Fase 2: Operación del Comité</h2>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="tarjeta-operacion">
                    <div class="tarjeta-operacion-info">
                        <h3>📄 Actas de Reunión Mensual</h3>
                        <p><strong>Total de actas:</strong> ${totalActas}</p>
                        <p><strong>Última acta:</strong> ${infoUltima}</p>
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

                <div class="tarjeta-operacion">
                    <div class="tarjeta-operacion-info">
                        <h3>🤝 Participación SG-SST</h3>
                        <p><strong>Compromisos pendientes:</strong> ${compromisosPendientes}</p>
                        <p>Informes, auditoría y revisión por la alta dirección.</p>
                    </div>
                    <div class="tarjeta-operacion-acciones">
                        <button id="btn-ver-participacion" class="btn btn-sm btn-primary" type="button">
                            Ver detalles
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Construye los botones inferiores (guardar / imprimir).
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

    const btnVolver = contenedorRaiz.querySelector('#btn-volver-listado');
    if (btnVolver) {
        btnVolver.addEventListener('click', confirmarVolver);
    }

    const btnGuardar = contenedorRaiz.querySelector('#btn-guardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarComite);
    }

    const btnImprimir = contenedorRaiz.querySelector('#btn-imprimir');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', () => window.print());
    }

    const inputsEncabezado = contenedorRaiz.querySelectorAll(
        '#enc-nombre, #enc-ciudad, #enc-trabajadores'
    );
    inputsEncabezado.forEach(input => {
        input.addEventListener('input', () => { hayCambios = true; });
    });

    const botonesPasos = contenedorRaiz.querySelectorAll('.btn-abrir-paso');
    botonesPasos.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const paso = target.dataset.paso;
            if (paso) abrirModalPaso(paso);
        });
    });

    const btnNuevaActa = contenedorRaiz.querySelector('#btn-nueva-acta');
    if (btnNuevaActa) {
        btnNuevaActa.addEventListener('click', abrirModalNuevaActa);
    }

    const btnVerActas = contenedorRaiz.querySelector('#btn-ver-actas');
    if (btnVerActas) {
        btnVerActas.addEventListener('click', abrirModalListaActas);
    }

    const btnVerParticipacion = contenedorRaiz.querySelector('#btn-ver-participacion');
    if (btnVerParticipacion) {
        btnVerParticipacion.addEventListener('click', abrirModalParticipacion);
    }
}

// ================================================================
// MODAL GENÉRICO
// ================================================================

/**
 * Abre un modal genérico con el contenido dado.
 */
function abrirModal(
    titulo: string,
    contenidoHTML: string,
    onGuardar?: () => void,
    textoGuardar: string = 'Guardar'
): void {
    let overlay: HTMLElement | null = qsTipo<HTMLElement>('#modal-comite-overlay');
    if (!overlay) {
        const nuevoOverlay = document.createElement('div');
        nuevoOverlay.id = 'modal-comite-overlay';
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
            <div class="modal-body">
                ${contenidoHTML}
            </div>
            <div class="modal-footer">
                <button id="modal-cancelar" class="btn btn-outline" type="button">Cancelar</button>
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

    if (btnGuardar && onGuardar) {
        btnGuardar.addEventListener('click', () => {
            onGuardar();
        });
    }

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
    const overlay = qsTipo<HTMLElement>('#modal-comite-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ================================================================
// MODALES POR PASO
// ================================================================

/**
 * Abre el modal correspondiente al paso.
 */
function abrirModalPaso(paso: string): void {
    switch (paso) {
        case 'diagnostico':     abrirModalDiagnostico(); break;
        case 'convocatoria':    abrirModalConvocatoria(); break;
        case 'designacion':     abrirModalDesignacion(); break;
        case 'votacion':        abrirModalVotacion(); break;
        case 'constitucion':    abrirModalConstitucion(); break;
        case 'capacitacion':    abrirModalCapacitacion(); break;
        case 'nombramiento':    abrirModalNombramientoVigia(); break;
        case 'actas':           abrirModalListaActas(); break;
        case 'sgsst':           abrirModalParticipacion(); break;
        default:
            console.warn(`M18 Detalle: Paso desconocido "${paso}".`);
    }
}

/**
 * Modal: Diagnóstico de Personal (informativo).
 */
function abrirModalDiagnostico(): void {
    if (!comiteActual) return;
    const c = comiteActual;
    const composicion = calcularComposicion(c.numeroTrabajadores);

    const contenido = `
        <div class="info-box">
            <strong>ℹ️ Diagnóstico automático</strong><br>
            El sistema calcula el tipo de órgano según el número de trabajadores
            (Decreto Ley 1295 de 1994, art. 63).
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label>No. de Trabajadores</label>
                <input type="text" value="${c.numeroTrabajadores}" readonly />
            </div>
            <div class="form-group">
                <label>Tipo de Órgano</label>
                <input type="text" value="${c.tipo}" readonly />
            </div>
            <div class="form-group">
                <label>Principales por parte</label>
                <input type="text" value="${composicion.principales}" readonly />
            </div>
            <div class="form-group">
                <label>Suplentes por parte</label>
                <input type="text" value="${composicion.suplentes}" readonly />
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
 * Modal: Convocatoria Pública.
 */
function abrirModalConvocatoria(): void {
    if (!comiteActual) return;
    const c = comiteActual;

    const contenido = `
        <div class="info-box">
            <strong>Plantilla 1: Comunicado de Convocatoria</strong><br>
            Difundir por comunicado interno, correo y carteleras la apertura del proceso electoral.
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label>Empresa</label>
                <input type="text" value="${escaparHTML(empresaNombre)}" readonly />
            </div>
            <div class="form-group">
                <label>NIT</label>
                <input type="text" value="${escaparHTML(c.empresaId)}" readonly />
            </div>
            <div class="form-group">
                <label>Periodo</label>
                <input type="text" value="${formatearPeriodo(c.fechaInicioVigencia, c.fechaFinVigencia)}" readonly />
            </div>
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

    abrirModal('📢 Convocatoria Pública', contenido, () => {
        guardarDatosConvocatoria();
    }, '💾 Guardar Convocatoria');
}

/**
 * Guarda los datos de la convocatoria.
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

    const actualizado = storageComites.actualizar(comiteActual.id, {
        fechaPublicacionConvocatoria: fechaPublicacion,
        fechaAperturaInscripciones: fechaApertura,
        fechaCierreInscripciones: fechaCierre,
        fechaVotacion,
        pasoConvocatoria: 'Completado',
        fechaActualizacion: new Date()
    });

    if (actualizado) {
        alert('✅ Convocatoria guardada.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar la convocatoria.');
    }
}

/**
 * Modal: Designación de Representantes del Empleador.
 */
function abrirModalDesignacion(): void {
    if (!comiteActual) return;
    const c = comiteActual;
    const composicion = calcularComposicion(c.numeroTrabajadores);

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
            <strong>Plantilla 3: Acta de Designación del Empleador</strong><br>
            El Representante Legal designa a sus representantes (Art. 11, Res. 2013/1986).
            Composición: <strong>${composicion.principales} principal(es) + ${composicion.suplentes} suplente(s)</strong>.
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

    abrirModal('👔 Designación Empleador', contenido, () => {
        guardarDatosDesignacion();
    }, '💾 Guardar Designación');
}

/**
 * Genera una fila HTML de representante.
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
 * Guarda los datos de designación del empleador.
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
            lista[index] = {
                nombre: '',
                cedula: '',
                cargo: '',
                rol,
                parte: 'Empleador'
            };
        }

        if (campo === 'nombre') lista[index].nombre = el.value;
        else if (campo === 'cedula') lista[index].cedula = el.value;
        else if (campo === 'cargo') lista[index].cargo = el.value;
    });

    const representantes: IRepresentante[] = [...principales, ...suplentes];

    const actualizado = storageComites.actualizar(comiteActual.id, {
        representantesEmpleador: representantes,
        pasoDesignacion: 'Completado',
        fechaActualizacion: new Date()
    });

    if (actualizado) {
        alert('✅ Designación del empleador guardada.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar.');
    }
}

/**
 * Modal: Inscripción + Votación.
 */
function abrirModalVotacion(): void {
    if (!comiteActual) return;
    const c = comiteActual;
    const composicion = calcularComposicion(c.numeroTrabajadores);

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
            <strong>Plantilla 2 + 4: Inscripción y Escrutinio</strong><br>
            Registre los representantes electos por votación y los totales del escrutinio.
        </div>

        <h3 style="color:#1B365D; font-size:0.95rem; margin-bottom:0.5rem;">
            Representantes Electos (${composicion.principales} principales + ${composicion.suplentes} suplentes)
        </h3>

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
                <input type="number" id="vot-habilitados" value="${c.totalHabilitados}" min="0" />
            </div>
            <div class="form-group">
                <label>Total Emitidos</label>
                <input type="number" id="vot-emitidos" value="${c.totalEmitidos}" min="0" />
            </div>
            <div class="form-group">
                <label>Votos en Blanco</label>
                <input type="number" id="vot-blancos" value="${c.votosBlancos}" min="0" />
            </div>
            <div class="form-group">
                <label>Votos Nulos</label>
                <input type="number" id="vot-nulos" value="${c.votosNulos}" min="0" />
            </div>
        </div>
    `;

    abrirModal('🗳️ Inscripción y Votación', contenido, () => {
        guardarDatosVotacion();
    }, '💾 Guardar Votación');
}

/**
 * Guarda los datos de votación.
 */
function guardarDatosVotacion(): void {
    if (!comiteActual) return;

    const totalHabilitados = parseInt(qsTipo<HTMLInputElement>('#vot-habilitados')?.value || '0', 10) || 0;
    const totalEmitidos = parseInt(qsTipo<HTMLInputElement>('#vot-emitidos')?.value || '0', 10) || 0;
    const votosBlancos = parseInt(qsTipo<HTMLInputElement>('#vot-blancos')?.value || '0', 10) || 0;
    const votosNulos = parseInt(qsTipo<HTMLInputElement>('#vot-nulos')?.value || '0', 10) || 0;

    const nuevosReps: IRepresentante[] = [];
    comiteActual.representantesTrabajadores.forEach((r, i) => {
        const nombre = qsTipo<HTMLInputElement>(`[data-trabajador-index="${i}"][data-campo="nombre"]`)?.value || '';
        const cedula = qsTipo<HTMLInputElement>(`[data-trabajador-index="${i}"][data-campo="cedula"]`)?.value || '';
        const cargo = qsTipo<HTMLInputElement>(`[data-trabajador-index="${i}"][data-campo="cargo"]`)?.value || '';
        const votos = parseInt(qsTipo<HTMLInputElement>(`[data-trabajador-index="${i}"][data-campo="votos"]`)?.value || '0', 10) || 0;

        nuevosReps.push({
            nombre,
            cedula,
            cargo,
            rol: r.rol,
            parte: 'Trabajador',
            votos
        });
    });

    const actualizado = storageComites.actualizar(comiteActual.id, {
        representantesTrabajadores: nuevosReps,
        totalHabilitados,
        totalEmitidos,
        votosBlancos,
        votosNulos,
        pasoVotacion: 'Completado',
        fechaActualizacion: new Date()
    });

    if (actualizado) {
        alert('✅ Votación guardada.');
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
        .filter(r => r.parte === 'Empleador')
        .map(r => `<option value="${escaparHTML(r.cedula)}" ${c.presidenteId === r.cedula ? 'selected' : ''}>${escaparHTML(r.nombre)} (${r.rol})</option>`)
        .join('');

    const opcionesSecretario = todosReps
        .map(r => `<option value="${escaparHTML(r.cedula)}" ${c.secretarioId === r.cedula ? 'selected' : ''}>${escaparHTML(r.nombre)} (${r.parte} - ${r.rol})</option>`)
        .join('');

    const contenido = `
        <div class="info-box">
            <strong>Plantilla 5: Acta de Elección y Constitución (Acta No. 01)</strong><br>
            El empleador designa al Presidente; el comité elige al Secretario (Res. 2013/1986, arts. 6-8).
        </div>

        <div class="form-grid">
            <div class="form-group ancho-completo">
                <label>Presidente del Comité (designado por el empleador) <span class="required">*</span></label>
                <select id="const-presidente">
                    <option value="">-- Seleccionar --</option>
                    ${opcionesPresidente}
                </select>
            </div>
            <div class="form-group ancho-completo">
                <label>Secretario del Comité (elegido por votación interna) <span class="required">*</span></label>
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
 * Guarda los datos de constitución.
 */
function guardarDatosConstitucion(): void {
    if (!comiteActual) return;

    const presidente = qsTipo<HTMLSelectElement>('#const-presidente')?.value || '';
    const secretario = qsTipo<HTMLSelectElement>('#const-secretario')?.value || '';

    if (!presidente || !secretario) {
        alert('⚠️ Debe seleccionar Presidente y Secretario.');
        return;
    }

    const actualizado = storageComites.actualizar(comiteActual.id, {
        presidenteId: presidente,
        secretarioId: secretario,
        pasoConstitucion: 'Completado',
        estado: 'Activo',
        fechaActualizacion: new Date()
    });

    if (actualizado) {
        alert('✅ Comité constituido oficialmente.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar.');
    }
}

/**
 * Modal: Plan de Capacitación.
 */
function abrirModalCapacitacion(): void {
    if (!comiteActual) return;
    const c = comiteActual;

    const filas = c.capacitaciones.length > 0
        ? c.capacitaciones.map(cap => filaCapacitacionHTML(cap)).join('')
        : '';

    const contenido = `
        <div class="info-box">
            <strong>Plan de Capacitación Inicial y Continuada</strong><br>
            Registre las capacitaciones brindadas a los miembros del comité.
        </div>

        <div class="tabla-scroll">
            <table class="tabla-representantes">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tema</th>
                        <th>Instructor</th>
                        <th style="width:70px;">Acciones</th>
                    </tr>
                </thead>
                <tbody id="tbody-capacitaciones">
                    ${filas}
                </tbody>
            </table>
        </div>

        <button id="btn-agregar-capacitacion" class="btn btn-sm btn-outline" type="button" style="margin-top:0.5rem;">
            ➕ Agregar Capacitación
        </button>
    `;

    abrirModal('🎓 Plan de Capacitación', contenido, () => {
        guardarDatosCapacitacion();
    }, '💾 Guardar Capacitaciones');

    const btnAgregar = qsTipo<HTMLElement>('#btn-agregar-capacitacion');
    if (btnAgregar) {
        btnAgregar.addEventListener('click', () => agregarFilaCapacitacion());
    }
}

/**
 * Genera una fila HTML de capacitación.
 */
function filaCapacitacionHTML(cap?: ICapacitacionComite): string {
    const id = cap?.id || '';
    const fecha = cap?.fecha || fechaActualISO();
    const tema = cap?.tema || '';
    const instructor = cap?.instructor || '';

    return `
        <tr data-cap-id="${escaparHTML(id)}">
            <td><input type="date" data-cap-campo="fecha" value="${escaparHTML(fecha)}" /></td>
            <td><input type="text" data-cap-campo="tema" value="${escaparHTML(tema)}" placeholder="Tema" /></td>
            <td><input type="text" data-cap-campo="instructor" value="${escaparHTML(instructor)}" placeholder="Instructor" /></td>
            <td style="text-align:center;">
                <button class="btn btn-sm btn-danger btn-eliminar-cap" type="button">🗑️</button>
            </td>
        </tr>
    `;
}

/**
 * Agrega una fila vacía de capacitación.
 */
function agregarFilaCapacitacion(): void {
    const tbody = qsTipo<HTMLElement>('#tbody-capacitaciones');
    if (!tbody) return;

    const fila = document.createElement('tr');
    fila.innerHTML = `
        <td><input type="date" data-cap-campo="fecha" value="${fechaActualISO()}" /></td>
        <td><input type="text" data-cap-campo="tema" placeholder="Tema" /></td>
        <td><input type="text" data-cap-campo="instructor" placeholder="Instructor" /></td>
        <td style="text-align:center;">
            <button class="btn btn-sm btn-danger btn-eliminar-cap" type="button">🗑️</button>
        </td>
    `;
    tbody.appendChild(fila);

    const btnEliminar = fila.querySelector('.btn-eliminar-cap');
    if (btnEliminar) {
        btnEliminar.addEventListener('click', () => fila.remove());
    }
}

/**
 * Guarda los datos de capacitación.
 */
function guardarDatosCapacitacion(): void {
    if (!comiteActual) return;

    const filas = document.querySelectorAll('#tbody-capacitaciones tr');
    const capacitaciones: ICapacitacionComite[] = [];

    filas.forEach(fila => {
        const fecha = (fila.querySelector('[data-cap-campo="fecha"]') as HTMLInputElement)?.value || '';
        const tema = (fila.querySelector('[data-cap-campo="tema"]') as HTMLInputElement)?.value || '';
        const instructor = (fila.querySelector('[data-cap-campo="instructor"]') as HTMLInputElement)?.value || '';

        if (fecha && tema) {
            capacitaciones.push({
                id: generarIdCapacitacion(),
                fecha,
                tema,
                instructor,
                asistentes: [],
                observaciones: null
            });
        }
    });

    const actualizado = storageComites.actualizar(comiteActual.id, {
        capacitaciones,
        pasoCapacitacion: capacitaciones.length > 0 ? 'Completado' : 'EnProgreso',
        fechaActualizacion: new Date()
    });

    if (actualizado) {
        alert('✅ Capacitaciones guardadas.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar.');
    }
}

/**
 * Modal: Nombramiento del Vigía (solo para Vigía).
 */
function abrirModalNombramientoVigia(): void {
    if (!comiteActual) return;
    const c = comiteActual;

    const principal = c.representantesTrabajadores.find(r => r.rol === 'Principal');
    const suplente = c.representantesTrabajadores.find(r => r.rol === 'Suplente');

    const contenido = `
        <div class="info-box">
            <strong>Acta de Nombramiento del Vigía de SST y su Suplente</strong><br>
            Designación según Decreto Ley 1295 de 1994 (art. 63) y Resolución 2013 de 1986.
        </div>

        <h3 style="color:#1B365D; font-size:0.95rem; margin-bottom:0.5rem;">Vigía Principal</h3>
        <div class="form-grid">
            <div class="form-group">
                <label>Nombre Completo <span class="required">*</span></label>
                <input type="text" id="vigia-principal-nombre" value="${escaparHTML(principal?.nombre || '')}" />
            </div>
            <div class="form-group">
                <label>Cédula <span class="required">*</span></label>
                <input type="text" id="vigia-principal-cedula" value="${escaparHTML(principal?.cedula || '')}" />
            </div>
            <div class="form-group">
                <label>Cargo <span class="required">*</span></label>
                <input type="text" id="vigia-principal-cargo" value="${escaparHTML(principal?.cargo || '')}" />
            </div>
        </div>

        <h3 style="color:#1B365D; font-size:0.95rem; margin-bottom:0.5rem; margin-top:1rem;">Vigía Suplente</h3>
        <div class="form-grid">
            <div class="form-group">
                <label>Nombre Completo <span class="required">*</span></label>
                <input type="text" id="vigia-suplente-nombre" value="${escaparHTML(suplente?.nombre || '')}" />
            </div>
            <div class="form-group">
                <label>Cédula <span class="required">*</span></label>
                <input type="text" id="vigia-suplente-cedula" value="${escaparHTML(suplente?.cedula || '')}" />
            </div>
            <div class="form-group">
                <label>Cargo <span class="required">*</span></label>
                <input type="text" id="vigia-suplente-cargo" value="${escaparHTML(suplente?.cargo || '')}" />
            </div>
        </div>
    `;

    abrirModal('📝 Nombramiento del Vigía de SST', contenido, () => {
        guardarDatosNombramientoVigia();
    }, '💾 Guardar Nombramiento');
}

/**
 * Guarda los datos del nombramiento del Vigía.
 */
function guardarDatosNombramientoVigia(): void {
    if (!comiteActual) return;

    const pNombre = qsTipo<HTMLInputElement>('#vigia-principal-nombre')?.value || '';
    const pCedula = qsTipo<HTMLInputElement>('#vigia-principal-cedula')?.value || '';
    const pCargo = qsTipo<HTMLInputElement>('#vigia-principal-cargo')?.value || '';

    const sNombre = qsTipo<HTMLInputElement>('#vigia-suplente-nombre')?.value || '';
    const sCedula = qsTipo<HTMLInputElement>('#vigia-suplente-cedula')?.value || '';
    const sCargo = qsTipo<HTMLInputElement>('#vigia-suplente-cargo')?.value || '';

    if (!pNombre || !pCedula || !sNombre || !sCedula) {
        alert('⚠️ Complete los datos mínimos (nombre y cédula) de ambos vigías.');
        return;
    }

    const representantes: IRepresentante[] = [
        { nombre: pNombre, cedula: pCedula, cargo: pCargo, rol: 'Principal', parte: 'Trabajador' },
        { nombre: sNombre, cedula: sCedula, cargo: sCargo, rol: 'Suplente', parte: 'Trabajador' }
    ];

    const actualizado = storageComites.actualizar(comiteActual.id, {
        representantesTrabajadores: representantes,
        pasoDesignacion: 'Completado',
        estado: 'Activo',
        fechaActualizacion: new Date()
    });

    if (actualizado) {
        alert('✅ Nombramiento del Vigía guardado.');
        cerrarModal();
        recargar();
    } else {
        alert('❌ No se pudo guardar.');
    }
}

// ================================================================
// MODALES DE OPERACIÓN (Fase 2)
// ================================================================

/**
 * Modal: Lista de actas de reunión.
 */
function abrirModalListaActas(): void {
    if (!comiteActual) return;
    const actas = storageActasReunion
        .obtenerTodos()
        .filter(a => a.comiteId === comiteActual!.id)
        .sort((a, b) => b.numeroActa - a.numeroActa);

    const filas = actas.length > 0
        ? actas.map(a => `
            <tr>
                <td style="text-align:center; font-weight:700;">No. ${String(a.numeroActa).padStart(2, '0')}</td>
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

    const contenido = `
        <div class="info-box">
            <strong>Actas de Reunión Mensual</strong><br>
            El comité debe reunirse una vez al mes (Res. 2013/1986, art. 7).
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

        <button id="btn-crear-acta" class="btn btn-sm btn-success" type="button" style="margin-top:0.5rem;">
            ➕ Nueva Acta de Reunión
        </button>
    `;

    abrirModal('📄 Actas de Reunión', contenido);

    document.querySelectorAll('.btn-ver-acta').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const actaId = target.dataset.actaId;
            if (actaId) abrirModalVerActa(actaId);
        });
    });

    const btnCrear = qsTipo<HTMLElement>('#btn-crear-acta');
    if (btnCrear) {
        btnCrear.addEventListener('click', abrirModalNuevaActa);
    }
}

/**
 * Modal: Nueva acta de reunión.
 */
function abrirModalNuevaActa(): void {
    if (!comiteActual) return;

    const actas = storageActasReunion.obtenerTodos().filter(a => a.comiteId === comiteActual!.id);
    const siguienteNumero = actas.length + 1;

    const miembros = [...comiteActual.representantesEmpleador, ...comiteActual.representantesTrabajadores];
    const checkboxesAsistentes = miembros
        .map((m) => `
            <label style="display:flex; align-items:center; gap:0.5rem; padding:0.25rem 0; font-size:0.85rem;">
                <input type="checkbox" class="chk-asistente" data-nombre="${escaparHTML(m.nombre)}" />
                <span>${escaparHTML(m.nombre)} <small style="color:#64748B;">(${m.parte} - ${m.rol})</small></span>
            </label>
        `)
        .join('');

    const contenido = `
        <div class="info-box">
            <strong>Plantilla 6: Acta de Reunión Mensual No. ${String(siguienteNumero).padStart(2, '0')}</strong>
        </div>

        <div class="form-grid">
            <div class="form-group">
                <label>Fecha de Reunión <span class="required">*</span></label>
                <input type="date" id="acta-fecha" value="${fechaActualISO()}" />
            </div>
            <div class="form-group">
                <label>Hora Inicio <span class="required">*</span></label>
                <input type="time" id="acta-hora-inicio" value="08:00" />
            </div>
            <div class="form-group">
                <label>Hora Cierre <span class="required">*</span></label>
                <input type="time" id="acta-hora-cierre" value="10:00" />
            </div>
            <div class="form-group">
                <label>Tipo <span class="required">*</span></label>
                <select id="acta-tipo">
                    <option value="Ordinaria">Ordinaria</option>
                    <option value="Extraordinaria">Extraordinaria</option>
                </select>
            </div>
            <div class="form-group ancho-completo">
                <label>Lugar <span class="required">*</span></label>
                <input type="text" id="acta-lugar" value="" placeholder="Ej: Sala de juntas principal" />
            </div>
            <div class="form-group ancho-completo">
                <label>Asistentes</label>
                <div style="border:1px solid #e2e8f0; border-radius:0.375rem; padding:0.5rem 0.75rem; max-height:180px; overflow-y:auto;">
                    ${checkboxesAsistentes || '<p class="text-muted">No hay miembros registrados.</p>'}
                </div>
            </div>
            <div class="form-group ancho-completo">
                <label>Orden del Día <span class="required">*</span></label>
                <textarea id="acta-orden" placeholder="1. Llamado a lista&#10;2. Lectura del acta anterior&#10;3. ..."></textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>Desarrollo / Hallazgos</label>
                <textarea id="acta-desarrollo" placeholder="Descripción de los temas tratados..."></textarea>
            </div>
        </div>

        <div style="margin-top:1rem;">
            <h4 style="color:#1B365D; font-size:0.9rem; margin-bottom:0.5rem;">Compromisos</h4>
            <div id="compromisos-container">
                <div class="fila-compromiso" style="display:grid; grid-template-columns: 2fr 1fr 130px 40px; gap:0.375rem; margin-bottom:0.375rem;">
                    <input type="text" class="cmp-descripcion" placeholder="Descripción del compromiso" />
                    <input type="text" class="cmp-responsable" placeholder="Responsable" />
                    <input type="date" class="cmp-fecha" value="${fechaActualISO()}" />
                    <button type="button" class="btn btn-sm btn-danger btn-eliminar-compromiso">🗑️</button>
                </div>
            </div>
            <button id="btn-agregar-compromiso" class="btn btn-sm btn-outline" type="button" style="margin-top:0.5rem;">
                ➕ Agregar Compromiso
            </button>
        </div>
    `;

    abrirModal('📄 Nueva Acta de Reunión', contenido, () => {
        guardarNuevaActa(siguienteNumero);
    }, '💾 Guardar Acta');

    const btnAgregarComp = qsTipo<HTMLElement>('#btn-agregar-compromiso');
    if (btnAgregarComp) {
        btnAgregarComp.addEventListener('click', agregarFilaCompromiso);
    }

    document.querySelectorAll('.btn-eliminar-compromiso').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fila = (e.currentTarget as HTMLElement).closest('.fila-compromiso');
            if (fila) fila.remove();
        });
    });
}

/**
 * Agrega una fila vacía de compromiso.
 */
function agregarFilaCompromiso(): void {
    const container = qsTipo<HTMLElement>('#compromisos-container');
    if (!container) return;

    const fila = document.createElement('div');
    fila.className = 'fila-compromiso';
    fila.style.cssText = 'display:grid; grid-template-columns: 2fr 1fr 130px 40px; gap:0.375rem; margin-bottom:0.375rem;';
    fila.innerHTML = `
        <input type="text" class="cmp-descripcion" placeholder="Descripción del compromiso" />
        <input type="text" class="cmp-responsable" placeholder="Responsable" />
        <input type="date" class="cmp-fecha" value="${fechaActualISO()}" />
        <button type="button" class="btn btn-sm btn-danger btn-eliminar-compromiso">🗑️</button>
    `;
    container.appendChild(fila);

    const btnEliminar = fila.querySelector('.btn-eliminar-compromiso');
    if (btnEliminar) {
        btnEliminar.addEventListener('click', () => fila.remove());
    }
}

/**
 * Guarda una nueva acta de reunión.
 */
function guardarNuevaActa(numero: number): void {
    if (!comiteActual) return;

    const fecha = qsTipo<HTMLInputElement>('#acta-fecha')?.value || '';
    const horaInicio = qsTipo<HTMLInputElement>('#acta-hora-inicio')?.value || '';
    const horaCierre = qsTipo<HTMLInputElement>('#acta-hora-cierre')?.value || '';
    const tipo = (qsTipo<HTMLSelectElement>('#acta-tipo')?.value || 'Ordinaria') as TipoReunion;
    const lugar = qsTipo<HTMLInputElement>('#acta-lugar')?.value || '';
    const orden = qsTipo<HTMLTextAreaElement>('#acta-orden')?.value || '';
    const desarrollo = qsTipo<HTMLTextAreaElement>('#acta-desarrollo')?.value || '';

    if (!fecha || !lugar || !orden) {
        alert('⚠️ Complete los campos obligatorios (fecha, lugar, orden del día).');
        return;
    }

    const asistentes: string[] = [];
    document.querySelectorAll('.chk-asistente').forEach(chk => {
        const el = chk as HTMLInputElement;
        if (el.checked) {
            const nombre = el.dataset.nombre;
            if (nombre) asistentes.push(nombre);
        }
    });

    const nuevaActa: IActaReunion = {
        id: generarIdActa(),
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
        ordenDelDia: orden,
        desarrollo,
        resumen: desarrollo.substring(0, 200),
        archivoPDF: '',
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    if (!storageActasReunion.guardar(nuevaActa)) {
        alert('❌ No se pudo guardar el acta.');
        return;
    }

    const filas = document.querySelectorAll('.fila-compromiso');
    let compromisosGuardados = 0;

    filas.forEach(fila => {
        const descripcion = (fila.querySelector('.cmp-descripcion') as HTMLInputElement)?.value || '';
        const responsable = (fila.querySelector('.cmp-responsable') as HTMLInputElement)?.value || '';
        const fechaLimite = (fila.querySelector('.cmp-fecha') as HTMLInputElement)?.value || '';

        if (descripcion && responsable && fechaLimite) {
            const compromiso: ICompromisoComite = {
                id: generarIdCompromiso(),
                empresaId: comiteActual!.empresaId,
                actaId: nuevaActa.id,
                descripcion,
                responsable,
                fechaLimite,
                estado: 'Pendiente',
                observaciones: null,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            };

            if (storageCompromisosComite.guardar(compromiso)) {
                compromisosGuardados++;
            }
        }
    });

    storageComites.actualizar(comiteActual.id, {
        pasoActas: 'EnProgreso',
        fechaActualizacion: new Date()
    });

    console.info(`M18: Acta No. ${numero} guardada con ${compromisosGuardados} compromisos.`);

    alert(`✅ Acta No. ${numero} guardada. ${compromisosGuardados} compromiso(s).`);
    cerrarModal();
    recargar();
}

/**
 * Modal: Ver acta existente.
 */
function abrirModalVerActa(actaId: string): void {
    const acta = storageActasReunion.obtenerPorId(actaId);
    if (!acta) {
        alert('⚠️ No se encontró el acta.');
        return;
    }

    const compromisos = storageCompromisosComite
        .obtenerTodos()
        .filter(c => c.actaId === actaId);

    const compromisosHTML = compromisos.length > 0
        ? compromisos.map(c => `
            <tr>
                <td>${escaparHTML(c.descripcion)}</td>
                <td>${escaparHTML(c.responsable)}</td>
                <td>${formatearFecha(c.fechaLimite)}</td>
                <td>${escaparHTML(c.estado)}</td>
            </tr>
        `).join('')
        : `<tr><td colspan="4" style="text-align:center; color:#64748B; padding:1rem;">Sin compromisos.</td></tr>`;

    const contenido = `
        <div class="info-box">
            <strong>Acta No. ${String(acta.numeroActa).padStart(2, '0')}</strong>
        </div>

        <div class="form-grid">
            <div class="form-group"><label>Fecha</label><input type="text" value="${formatearFecha(acta.fechaReunion)}" readonly /></div>
            <div class="form-group"><label>Tipo</label><input type="text" value="${escaparHTML(acta.tipoReunion)}" readonly /></div>
            <div class="form-group"><label>Hora Inicio</label><input type="text" value="${escaparHTML(acta.horaInicio)}" readonly /></div>
            <div class="form-group"><label>Hora Cierre</label><input type="text" value="${escaparHTML(acta.horaCierre)}" readonly /></div>
            <div class="form-group ancho-completo"><label>Lugar</label><input type="text" value="${escaparHTML(acta.lugar)}" readonly /></div>
            <div class="form-group ancho-completo">
                <label>Orden del Día</label>
                <textarea readonly style="min-height:80px;">${escaparHTML(acta.ordenDelDia)}</textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>Desarrollo</label>
                <textarea readonly style="min-height:100px;">${escaparHTML(acta.desarrollo)}</textarea>
            </div>
        </div>

        <h4 style="color:#1B365D; font-size:0.9rem; margin:1rem 0 0.5rem 0;">Compromisos</h4>
        <div class="tabla-scroll">
            <table class="tabla-representantes">
                <thead>
                    <tr><th>Descripción</th><th>Responsable</th><th>Fecha Límite</th><th>Estado</th></tr>
                </thead>
                <tbody>${compromisosHTML}</tbody>
            </table>
        </div>
    `;

    abrirModal(`📄 Acta No. ${String(acta.numeroActa).padStart(2, '0')}`, contenido);
}

/**
 * Modal: Participación SG-SST.
 */
function abrirModalParticipacion(): void {
    if (!comiteActual) return;

    const contenido = `
        <div class="info-box">
            <strong>Participación del Comité en el SG-SST</strong><br>
            El comité interviene en hitos críticos (Decreto 1072 de 2015, arts. 2.2.4.6.8, 29, 31, 32).
        </div>

        <div class="form-grid">
            <div class="form-group ancho-completo">
                <label>1. Comunicación de la Política de SST</label>
                <textarea id="sgsst-politica" placeholder="Fecha de socialización y evidencias..."></textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>2. Investigación de Accidentes</label>
                <textarea id="sgsst-investigacion" placeholder="Participación en investigaciones..."></textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>3. Auditoría Anual</label>
                <textarea id="sgsst-auditoria" placeholder="Participación en la planificación de auditoría..."></textarea>
            </div>
            <div class="form-group ancho-completo">
                <label>4. Revisión por la Alta Dirección</label>
                <textarea id="sgsst-revision" placeholder="Conocimiento de resultados y actualización del plan..."></textarea>
            </div>
        </div>
    `;

    abrirModal('🤝 Participación SG-SST', contenido, () => {
        guardarParticipacionSgSst();
    }, '💾 Guardar');
}

/**
 * Guarda los datos de participación SG-SST.
 */
function guardarParticipacionSgSst(): void {
    if (!comiteActual) return;

    storageComites.actualizar(comiteActual.id, {
        pasoSgSst: 'EnProgreso',
        fechaActualizacion: new Date()
    });

    alert('✅ Participación SG-SST guardada.');
    cerrarModal();
    recargar();
}

// ================================================================
// GUARDAR COMITÉ
// ================================================================

/**
 * Guarda los cambios del encabezado del comité.
 */
function guardarComite(): void {
    if (!comiteActual) return;

    const nombre = qsTipo<HTMLInputElement>('#enc-nombre')?.value || '';
    const ciudad = qsTipo<HTMLInputElement>('#enc-ciudad')?.value || '';
    const trabajadores = parseInt(qsTipo<HTMLInputElement>('#enc-trabajadores')?.value || '0', 10) || 0;

    if (trabajadores < 1) {
        alert('⚠️ El número de trabajadores debe ser mayor a 0.');
        return;
    }

    const actualizado = storageComites.actualizar(comiteActual.id, {
        nombre,
        ciudad,
        numeroTrabajadores: trabajadores,
        fechaActualizacion: new Date()
    });

    if (actualizado) {
        hayCambios = false;
        alert('✅ Comité guardado correctamente.');
        console.info('M18: Comité actualizado.');
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
        window.location.href = 'modules/M18-Gestion-Comites/comites-listado.html';
    }, 200);
}

// ================================================================
// RECARGAR
// ================================================================

/**
 * Recarga la vista completa (después de guardar datos).
 */
function recargar(): void {
    if (!contenedorRaiz) return;

    const comiteId = localStorage.getItem('comiteIdActiva');
    if (!comiteId) return;

    const comite = storageComites.obtenerPorId(comiteId);
    if (comite) {
        comiteActual = comite;
        construirDashboard(contenedorRaiz);
    }
}