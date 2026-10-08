/**
 * modules/M18-Gestion-Comites/comites-listado.ts
 * 
 * Lógica del listado de Comités (COPASST / Vigía).
 * Módulo M18 - Gestión de Comités.
 * 
 * Responsabilidades:
 * - Cargar el CSS del módulo dinámicamente.
 * - Cargar los comités de la empresa activa desde el storage.
 * - Renderizar las tarjetas de comités con badges de estado y alertas.
 * - Renderizar las estadísticas generales.
 * - Gestionar las pestañas (Comités / Estadísticas).
 * - Crear nuevos comités (con modal).
 * - Eliminar comités existentes.
 * - Abrir el detalle del comité en pestaña nueva (localStorage + window.open).
 * - Escuchar el evento "comite:volver-listado".
 * 
 * @version 1.0.3 (agregado CSS loader dinámico; fix estado vacío; quitado import no usado)
 * @since 2026-10-06
 */

import {
    qs,
    qsTipo,
    escaparHTML,
    formatearFecha,
    fechaActualISO
} from '../../src/utils.js';
import {
    storageComites,
    storageActasReunion,
    storageCompromisosComite,
    storageEmpresas
} from '../../src/storage.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';
import {
    calcularAlertaVencimiento,
    formatearPeriodo,
    generarIdComite,
    determinarTipoComite,
    calcularComposicion,
    calcularFechaFinVigencia,
    crearPlantillaRepresentantes,
    calcularProgresoPasos
} from '../../src/comite-utils.js';
import type { IComite, EstadoPaso } from '../../src/interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** ID del <link> del CSS del módulo (para no duplicarlo). */
const CSS_LINK_ID = 'modulo-comites-listado-css';

/** Ruta del CSS del módulo. */
const CSS_HREF = 'modules/M18-Gestion-Comites/comites-listado.css';

// ================================================================
// ESTADO DEL MÓDULO
// ================================================================

/** Lista completa de comités de la empresa activa. */
let comites: IComite[] = [];

/** NIT de la empresa activa (para filtrar). */
let empresaActivaNit: string = '';

/** Nombre de la empresa activa (para mostrar). */
let empresaActivaNombre: string = '';

// ================================================================
// INICIALIZACIÓN
// ================================================================

/**
 * Punto de entrada del módulo (lo llama app.ts).
 * 
 * @param container - Contenedor donde se inyectó el HTML del listado.
 */
export function init(container: Element): void {
    console.info('🗂️ M18: Inicializando listado de comités...');

    // 0. Cargar el CSS del módulo (evita duplicados)
    cargarCSSModulo();

    // 1. Obtener empresa activa
    empresaActivaNit = obtenerEmpresaActiva() || '';

    if (!empresaActivaNit) {
        console.warn('M18: No hay empresa activa.');
        mostrarErrorSinEmpresa();
        return;
    }

    // Obtener nombre de la empresa activa
    const empresa = storageEmpresas.obtenerPorId(empresaActivaNit);
    empresaActivaNombre = empresa?.razonSocial || 'Empresa';

    // 2. Cargar comités
    cargarComites();

    // 3. Renderizar
    renderizarComites();
    renderizarEstadisticas();

    // 4. Configurar tabs
    configurarTabs();

    // 5. Configurar botones
    configurarBotones();

    // 6. Escuchar evento de "volver del detalle"
    window.addEventListener('comite:volver-listado', manejarVolverDelDetalle);

    console.info(`✅ M18: ${comites.length} comités cargados.`);
}

/**
 * Carga el CSS del módulo dinámicamente.
 * Evita duplicar el <link> si ya existe.
 */
function cargarCSSModulo(): void {
    if (document.getElementById(CSS_LINK_ID)) return;

    const link = document.createElement('link');
    link.id = CSS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    document.head.appendChild(link);

    console.info('M18: CSS del módulo cargado.');
}

/**
 * Muestra un mensaje si no hay empresa activa.
 */
function mostrarErrorSinEmpresa(): void {
    const contenedor = qs('#contenedor-comites');
    if (contenedor) {
        contenedor.innerHTML = `
            <p class="text-muted">
                ⚠️ No hay empresa activa. Seleccione una empresa para continuar.
            </p>
        `;
    }
}

/**
 * Carga los comités de la empresa activa desde el storage.
 */
function cargarComites(): void {
    const todos = storageComites.obtenerTodos();
    comites = todos.filter(c => c.empresaId === empresaActivaNit);

    // Ordenar por fecha de creación descendente
    comites.sort((a, b) => {
        const fa = new Date(a.fechaCreacion).getTime();
        const fb = new Date(b.fechaCreacion).getTime();
        return fb - fa;
    });

    console.info(`M18: ${comites.length} comités cargados para empresa ${empresaActivaNit}.`);
}

// ================================================================
// RENDERIZADO DEL LISTADO
// ================================================================

/**
 * Renderiza las tarjetas de comités en el contenedor.
 */
function renderizarComites(): void {
    const contenedor = qs('#contenedor-comites');
    const estadoVacio = qsTipo<HTMLElement>('#estado-vacio-comites');

    if (!contenedor) return;

    if (comites.length === 0) {
        contenedor.innerHTML = '';
        if (estadoVacio) estadoVacio.classList.remove('hidden');
        return;
    }

    if (estadoVacio) estadoVacio.classList.add('hidden');

    contenedor.innerHTML = comites
        .map(c => construirTarjetaComite(c))
        .join('');

    configurarBotonesTarjetas();
}

/**
 * Construye el HTML de una tarjeta de comité.
 * 
 * @param c - Comité a renderizar.
 * @returns {string} - HTML de la tarjeta.
 */
function construirTarjetaComite(c: IComite): string {
    const alerta = calcularAlertaVencimiento(c.fechaFinVigencia);

    const pasos: EstadoPaso[] = [
        c.pasoConvocatoria,
        c.pasoDesignacion,
        c.pasoVotacion,
        c.pasoConstitucion,
        c.pasoCapacitacion,
        c.pasoActas,
        c.pasoSgSst
    ];
    const progreso = calcularProgresoPasos(pasos);

    let claseTarjeta = 'comite-item';
    if (alerta.nivel === 'rojo') claseTarjeta += ' comite-vencido';
    else if (alerta.nivel === 'naranja' || alerta.nivel === 'amarillo') claseTarjeta += ' comite-por-vencer';
    else claseTarjeta += ' comite-vigente';

    const badgeTipo = c.tipo === 'COPASST'
        ? `<span class="badge badge-tipo-copasst">COPASST</span>`
        : `<span class="badge badge-tipo-vigia">Vigía</span>`;

    let badgeEstado = '';
    if (c.estado === 'Activo') {
        badgeEstado = `<span class="badge badge-activo">Activo</span>`;
    } else if (c.estado === 'Inactivo') {
        badgeEstado = `<span class="badge badge-inactivo">Inactivo</span>`;
    } else {
        badgeEstado = `<span class="badge badge-formalizacion">En formalización</span>`;
    }

    const claseAlerta = `badge-alerta badge-alerta-${alerta.nivel}`;
    const textoAlerta = alerta.diasRestantes >= 0
        ? `Vence en ${alerta.diasRestantes}d`
        : `Vencido hace ${Math.abs(alerta.diasRestantes)}d`;
    const badgeAlerta = `<span class="${claseAlerta}">${alerta.icono} ${textoAlerta}</span>`;

    const periodo = formatearPeriodo(c.fechaInicioVigencia, c.fechaFinVigencia);

    return `
        <div class="${claseTarjeta}" data-id="${escaparHTML(c.id)}">
            <div class="comite-item-info">
                <h4>
                    🏢 ${escaparHTML(empresaActivaNombre)}
                    ${badgeTipo}
                    ${badgeEstado}
                </h4>
                <p><strong>Nombre:</strong> ${escaparHTML(c.nombre || 'Sin nombre')}</p>
                <p><strong>Ciudad:</strong> ${escaparHTML(c.ciudad || 'Sin ciudad')}</p>
                <p><strong>Trabajadores:</strong> ${c.numeroTrabajadores}</p>
                <p><strong>Periodo:</strong> ${periodo}</p>
                <p><strong>Progreso:</strong> ${progreso.completados}/${progreso.total} pasos (${progreso.porcentaje}%)</p>
                <div class="alerta-vencimiento ${alerta.nivel}">
                    ${badgeAlerta}
                    <span>${escaparHTML(alerta.mensaje)}</span>
                </div>
            </div>
            <div class="comite-item-acciones">
                <button
                    class="btn btn-sm btn-outline btn-editar"
                    data-id="${escaparHTML(c.id)}"
                    title="Editar / Abrir detalle"
                    type="button"
                >✏️ Editar</button>
                <button
                    class="btn btn-sm btn-outline btn-imprimir"
                    data-id="${escaparHTML(c.id)}"
                    title="Imprimir comité completo"
                    type="button"
                >🖨️ Imprimir</button>
                <button
                    class="btn btn-sm btn-danger btn-eliminar"
                    data-id="${escaparHTML(c.id)}"
                    title="Eliminar comité"
                    type="button"
                >🗑️</button>
            </div>
        </div>
    `;
}

// ================================================================
// RENDERIZADO DE ESTADÍSTICAS
// ================================================================

/**
 * Renderiza las estadísticas generales.
 */
function renderizarEstadisticas(): void {
    const contenedor = qs('#contenedor-estadisticas-comites');
    if (!contenedor) return;

    if (comites.length === 0) {
        contenedor.innerHTML = `
            <p class="text-muted">
                No hay comités registrados para mostrar estadísticas.
            </p>
        `;
        return;
    }

    const total = comites.length;
    const activos = comites.filter(c => c.estado === 'Activo').length;
    const inactivos = comites.filter(c => c.estado === 'Inactivo').length;
    const enFormalizacion = comites.filter(c => c.estado === 'EnFormalizacion').length;

    const copasst = comites.filter(c => c.tipo === 'COPASST').length;
    const vigia = comites.filter(c => c.tipo === 'Vigia').length;

    let alertaVerde = 0;
    let alertaAmarillo = 0;
    let alertaNaranja = 0;
    let alertaRojo = 0;

    comites.forEach(c => {
        const alerta = calcularAlertaVencimiento(c.fechaFinVigencia);
        if (alerta.nivel === 'verde') alertaVerde++;
        else if (alerta.nivel === 'amarillo') alertaAmarillo++;
        else if (alerta.nivel === 'naranja') alertaNaranja++;
        else alertaRojo++;
    });

    contenedor.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>${total}</h3>
                <p>Total Comités</p>
            </div>
            <div class="stat-card">
                <h3 style="color: #10B981;">${activos}</h3>
                <p>Activos</p>
            </div>
            <div class="stat-card">
                <h3 style="color: #F59E0B;">${enFormalizacion}</h3>
                <p>En Formalización</p>
            </div>
            <div class="stat-card">
                <h3 style="color: #94A3B8;">${inactivos}</h3>
                <p>Inactivos</p>
            </div>
        </div>

        <div class="stats-bloque">
            <h4>📋 Distribución por Tipo</h4>
            <div class="stats-grafica">
                ${renderizarBarra('COPASST', copasst, total, 'barra-copasst')}
                ${renderizarBarra('Vigía', vigia, total, 'barra-vigia')}
            </div>
        </div>

        <div class="stats-bloque">
            <h4>🔔 Estado de Vencimiento</h4>
            <div class="stats-grafica">
                ${renderizarBarra('Vigente', alertaVerde, total, 'barra-verde')}
                ${renderizarBarra('Por vencer', alertaAmarillo, total, 'barra-amarillo')}
                ${renderizarBarra('Urgente', alertaNaranja, total, 'barra-naranja')}
                ${renderizarBarra('Vencido', alertaRojo, total, 'barra-rojo')}
            </div>
            <table class="stats-tabla">
                <thead>
                    <tr>
                        <th>Nivel</th>
                        <th>Cantidad</th>
                        <th>Porcentaje</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>🟢 Vigente (&gt;90 días)</td><td>${alertaVerde}</td><td>${calcularPorcentaje(alertaVerde, total)}%</td></tr>
                    <tr><td>🟡 Por vencer (60-90 días)</td><td>${alertaAmarillo}</td><td>${calcularPorcentaje(alertaAmarillo, total)}%</td></tr>
                    <tr><td>🟠 Urgente (30-60 días)</td><td>${alertaNaranja}</td><td>${calcularPorcentaje(alertaNaranja, total)}%</td></tr>
                    <tr><td>🔴 Vencido / crítico (&lt;30 días)</td><td>${alertaRojo}</td><td>${calcularPorcentaje(alertaRojo, total)}%</td></tr>
                    <tr class="stats-total"><td>Total</td><td>${total}</td><td>100%</td></tr>
                </tbody>
            </table>
        </div>

        <div class="stats-bloque">
            <h4>⚙️ Estado del Comité</h4>
            <div class="stats-grafica">
                ${renderizarBarra('Activos', activos, total, 'barra-activo')}
                ${renderizarBarra('En Formalización', enFormalizacion, total, 'barra-formalizacion')}
                ${renderizarBarra('Inactivos', inactivos, total, 'barra-inactivo')}
            </div>
        </div>
    `;
}

/**
 * Renderiza una barra de progreso con etiqueta.
 */
function renderizarBarra(
    label: string,
    cantidad: number,
    total: number,
    claseColor: string
): string {
    const porcentaje = calcularPorcentaje(cantidad, total);
    const mostrarTexto = porcentaje > 15 ? `${porcentaje}%` : '';
    return `
        <div class="stats-barra-item">
            <span class="stats-barra-label">${escaparHTML(label)}</span>
            <div class="stats-barra-container">
                <div class="stats-barra-fill ${claseColor}" style="width: ${porcentaje}%;">
                    ${mostrarTexto}
                </div>
            </div>
            <span class="stats-barra-valor">${cantidad}</span>
        </div>
    `;
}

/**
 * Calcula el porcentaje de una cantidad sobre un total.
 */
function calcularPorcentaje(cantidad: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((cantidad / total) * 100);
}

// ================================================================
// CONFIGURACIÓN DE TABS
// ================================================================

/**
 * Configura las pestañas principales (Comités / Estadísticas).
 */
function configurarTabs(): void {
    const tabNav = qs('#tab-container-comites');
    if (!tabNav) return;

    const botones = tabNav.querySelectorAll('.tab-button');
    const tabs: Record<string, HTMLElement | null> = {
        comites: qsTipo<HTMLElement>('#tab-comites'),
        estadistica: qsTipo<HTMLElement>('#tab-estadistica')
    };

    botones.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = (btn as HTMLElement).dataset.tab;
            if (!tabId) return;

            Object.values(tabs).forEach(t => t?.classList.add('hidden'));
            tabs[tabId]?.classList.remove('hidden');

            botones.forEach(b => b.classList.toggle('active', b === btn));

            if (tabId === 'estadistica') {
                renderizarEstadisticas();
            }
        });
    });
}

// ================================================================
// CONFIGURACIÓN DE BOTONES
// ================================================================

/**
 * Configura los botones generales del listado.
 */
function configurarBotones(): void {
    const btnNuevo = qs('#btn-nuevo-comite');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', abrirModalNuevoComite);
    }

    const btnNuevoVacio = qs('#btn-nuevo-comite-vacio');
    if (btnNuevoVacio) {
        btnNuevoVacio.addEventListener('click', abrirModalNuevoComite);
    }
}

/**
 * Configura los botones de cada tarjeta de comité.
 */
function configurarBotonesTarjetas(): void {
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = (btn as HTMLElement).dataset.id;
            if (id) abrirDetalleComite(id);
        });
    });

    document.querySelectorAll('.btn-imprimir').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = (btn as HTMLElement).dataset.id;
            if (id) imprimirComite(id);
        });
    });

    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = (btn as HTMLElement).dataset.id;
            if (id) eliminarComite(id);
        });
    });
}

// ================================================================
// MODAL: NUEVO COMITÉ
// ================================================================

/**
 * Abre el modal para crear un nuevo comité.
 */
function abrirModalNuevoComite(): void {
    let modal: HTMLElement | null = qsTipo<HTMLElement>('#modal-nuevo-comite');

    if (!modal) {
        const nuevoModal = document.createElement('div');
        nuevoModal.id = 'modal-nuevo-comite';
        nuevoModal.className = 'modal-overlay';
        document.body.appendChild(nuevoModal);
        modal = nuevoModal;
    }

    const hoy = fechaActualISO();

    modal.innerHTML = `
        <div class="modal-contenido" role="dialog" aria-modal="true">
            <h2 class="modal-titulo">➕ Nuevo Comité</h2>
            <p class="modal-descripcion">
                Complete los datos básicos. El tipo de comité y la composición
                se calcularán automáticamente según el número de trabajadores.
            </p>

            <div class="modal-form">
                <div class="form-group">
                    <label for="input-nombre">Nombre del Comité (opcional)</label>
                    <input type="text" id="input-nombre"
                        placeholder="Ej: COPASST - Planta Norte" />
                </div>

                <div class="form-group">
                    <label for="input-ciudad">Ciudad / Municipio <span style="color:#DC2626">*</span></label>
                    <input type="text" id="input-ciudad"
                        placeholder="Ej: Bogotá D.C." />
                </div>

                <div class="form-group">
                    <label for="input-trabajadores">Número de Trabajadores <span style="color:#DC2626">*</span></label>
                    <input type="number" id="input-trabajadores" min="1" value="10" />
                </div>

                <div class="form-group">
                    <label for="input-fecha">Fecha de Inicio de Vigencia <span style="color:#DC2626">*</span></label>
                    <input type="date" id="input-fecha" value="${hoy}" />
                </div>
            </div>

            <div class="modal-acciones">
                <button id="btn-modal-cancelar" class="btn btn-outline" type="button">Cancelar</button>
                <button id="btn-modal-aceptar" class="btn btn-primary" type="button">Crear Comité</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    const btnCancelar = qs('#btn-modal-cancelar');
    const btnAceptar = qs('#btn-modal-aceptar');

    if (btnCancelar) {
        btnCancelar.addEventListener('click', cerrarModalNuevoComite);
    }

    if (btnAceptar) {
        btnAceptar.addEventListener('click', confirmarCrearComite);
    }

    setTimeout(() => {
        const inputNombre = qsTipo<HTMLInputElement>('#input-nombre');
        if (inputNombre) inputNombre.focus();
    }, 100);
}

/**
 * Cierra el modal de creación.
 */
function cerrarModalNuevoComite(): void {
    const modal = qsTipo<HTMLElement>('#modal-nuevo-comite');
    if (modal) modal.style.display = 'none';
}

/**
 * Confirma la creación del comité (validando datos).
 */
function confirmarCrearComite(): void {
    const inputNombre = qsTipo<HTMLInputElement>('#input-nombre');
    const inputCiudad = qsTipo<HTMLInputElement>('#input-ciudad');
    const inputTrabajadores = qsTipo<HTMLInputElement>('#input-trabajadores');
    const inputFecha = qsTipo<HTMLInputElement>('#input-fecha');

    if (!inputCiudad || !inputTrabajadores || !inputFecha) return;

    const nombre = (inputNombre?.value || '').trim();
    const ciudad = inputCiudad.value.trim();
    const numTrabajadores = parseInt(inputTrabajadores.value, 10) || 0;
    const fechaInicio = inputFecha.value;

    if (!ciudad) {
        alert('⚠️ Debe ingresar la ciudad.');
        return;
    }
    if (numTrabajadores < 1) {
        alert('⚠️ El número de trabajadores debe ser mayor a 0.');
        return;
    }
    if (!fechaInicio) {
        alert('⚠️ Debe ingresar la fecha de inicio.');
        return;
    }

    cerrarModalNuevoComite();
    crearNuevoComite(nombre, ciudad, numTrabajadores, fechaInicio);
}

// ================================================================
// CREAR NUEVO COMITÉ
// ================================================================

/**
 * Crea un nuevo comité con los datos básicos y los estados iniciales.
 */
function crearNuevoComite(
    nombre: string,
    ciudad: string,
    numTrabajadores: number,
    fechaInicio: string
): void {
    if (!empresaActivaNit) {
        alert('⚠️ No hay empresa activa.');
        return;
    }

    const tipo = determinarTipoComite(numTrabajadores);
    const composicion = calcularComposicion(numTrabajadores);
    const fechaFin = calcularFechaFinVigencia(fechaInicio);

    const nombreFinal = nombre || `${tipo} - ${empresaActivaNombre}`;

    const representantesEmpleador = crearPlantillaRepresentantes(composicion, 'Empleador');
    const representantesTrabajadores = crearPlantillaRepresentantes(composicion, 'Trabajador');

    const nuevoComite: IComite = {
        id: generarIdComite(),
        empresaId: empresaActivaNit,
        tipo,
        nombre: nombreFinal,
        ciudad,
        numeroTrabajadores: numTrabajadores,

        fechaInicioVigencia: fechaInicio,
        fechaFinVigencia: fechaFin,
        estado: 'EnFormalizacion',

        representantesEmpleador,
        representantesTrabajadores,

        votosBlancos: 0,
        votosNulos: 0,
        totalHabilitados: numTrabajadores,
        totalEmitidos: 0,

        presidenteId: null,
        secretarioId: null,

        fechaPublicacionConvocatoria: null,
        fechaAperturaInscripciones: null,
        fechaCierreInscripciones: null,
        fechaVotacion: null,

        capacitaciones: [],

        pasoConvocatoria: 'Pendiente',
        pasoDesignacion: 'Pendiente',
        pasoVotacion: 'Pendiente',
        pasoConstitucion: 'Pendiente',
        pasoCapacitacion: 'Pendiente',
        pasoActas: 'Pendiente',
        pasoSgSst: 'Pendiente',

        actaEleccion: '',
        miembros: [],

        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    const guardado = storageComites.guardar(nuevoComite);
    if (!guardado) {
        alert('❌ No se pudo crear el comité.');
        return;
    }

    console.info(`M18: Comité creado con ID ${nuevoComite.id} (${tipo}).`);

    cargarComites();
    renderizarComites();
    renderizarEstadisticas();

    abrirDetalleComite(nuevoComite.id);
}

// ================================================================
// ABRIR DETALLE
// ================================================================

/**
 * Abre el detalle del comité en una pestaña nueva.
 */
function abrirDetalleComite(comiteId: string): void {
    const comite = storageComites.obtenerPorId(comiteId);
    if (!comite) {
        alert('⚠️ No se encontró el comité.');
        return;
    }

    localStorage.setItem('comiteIdActiva', comiteId);
    localStorage.setItem('comiteEmpresaNit', comite.empresaId);

    const url = 'modules/M18-Gestion-Comites/comite-detalle.html';
    window.open(url, '_blank');

    console.info(`M18: Abriendo detalle del comité ${comiteId}.`);
}

// ================================================================
// IMPRIMIR COMITÉ
// ================================================================

/**
 * Imprime el comité completo en una pestaña nueva.
 */
function imprimirComite(comiteId: string): void {
    const comite = storageComites.obtenerPorId(comiteId);
    if (!comite) {
        alert('⚠️ No se encontró el comité.');
        return;
    }

    localStorage.setItem('comiteIdActiva', comiteId);
    localStorage.setItem('comiteEmpresaNit', comite.empresaId);
    localStorage.setItem('comiteImprimir', 'true');

    const url = 'modules/M18-Gestion-Comites/comite-detalle.html';
    window.open(url, '_blank');

    console.info(`M18: Imprimiendo comité ${comiteId}.`);
}

// ================================================================
// ELIMINAR COMITÉ
// ================================================================

/**
 * Elimina un comité con confirmación previa.
 */
function eliminarComite(comiteId: string): void {
    const comite = storageComites.obtenerPorId(comiteId);
    if (!comite) {
        alert('⚠️ No se encontró el comité.');
        return;
    }

    const confirmar = confirm(
        `¿Está seguro de eliminar el comité "${comite.nombre}"?\n\n` +
        `Esto también eliminará las actas de reunión y compromisos asociados. ` +
        `Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    const actas = storageActasReunion.obtenerTodos().filter(a => a.comiteId === comiteId);
    actas.forEach(acta => {
        const compromisos = storageCompromisosComite.obtenerTodos().filter(c => c.actaId === acta.id);
        compromisos.forEach(c => storageCompromisosComite.eliminar(c.id));
        storageActasReunion.eliminar(acta.id);
    });

    const eliminado = storageComites.eliminar(comiteId);

    if (!eliminado) {
        alert('❌ No se pudo eliminar el comité.');
        return;
    }

    console.info(`M18: Comité ${comiteId} eliminado (junto con ${actas.length} actas).`);

    cargarComites();
    renderizarComites();
    renderizarEstadisticas();
}

// ================================================================
// EVENTO: VOLVER DEL DETALLE
// ================================================================

/**
 * Maneja el evento "comite:volver-listado" disparado por comite-detalle.ts.
 */
function manejarVolverDelDetalle(): void {
    localStorage.removeItem('comiteIdActiva');
    localStorage.removeItem('comiteEmpresaNit');
    localStorage.removeItem('comiteImprimir');

    cargarComites();
    renderizarComites();
    renderizarEstadisticas();

    console.info('M18: Volviendo al listado (recargado).');
}