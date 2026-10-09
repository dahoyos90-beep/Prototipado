/**
 * modules/M21-Gestion-Comite-Convivencia/convivencia-listado.ts
 * 
 * Lógica del listado del Comité de Convivencia Laboral (CCL).
 * Módulo M21 - Gestión del Comité de Convivencia.
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
 * Basado en:
 * - Resolución 3461 de 2025
 * - Ley 2365 de 2024
 * - Ley 1010 de 2006
 * 
 * @version 1.0.0
 * @since 2026-10-07
 */

import {
    qs,
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
    storageEmpresas
} from '../../src/storage.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';
import {
    calcularAlertaVencimiento,
    formatearPeriodo,
    generarIdComite,
    calcularComposicionCCL,
    calcularFechaFinVigencia,
    crearPlantillaRepresentantes,
    calcularProgresoPasos
} from '../../src/convivencia-utils.js';
import type { IConvivencia, EstadoPaso } from '../../src/interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** ID del <link> del CSS del módulo (para no duplicarlo). */
const CSS_LINK_ID = 'modulo-convivencia-listado-css';

/** Ruta del CSS del módulo. */
const CSS_HREF = 'modules/M21-Gestion-Comite-Convivencia/convivencia-listado.css';

// ================================================================
// ESTADO DEL MÓDULO
// ================================================================

/** Lista completa de comités de la empresa activa. */
let comites: IConvivencia[] = [];

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
    console.info('🤝 M21: Inicializando listado de comités de convivencia...');

    // 0. Cargar el CSS del módulo (evita duplicados)
    cargarCSSModulo();

    // 1. Obtener empresa activa
    empresaActivaNit = obtenerEmpresaActiva() || '';

    if (!empresaActivaNit) {
        console.warn('M21: No hay empresa activa.');
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

    console.info(`✅ M21: ${comites.length} comités cargados.`);
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

    console.info('M21: CSS del módulo cargado.');
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
    const todos = storageConvivencia.obtenerTodos();
    comites = todos.filter(c => c.empresaId === empresaActivaNit);

    // Ordenar por fecha de creación descendente
    comites.sort((a, b) => {
        const fa = new Date(a.fechaCreacion).getTime();
        const fb = new Date(b.fechaCreacion).getTime();
        return fb - fa;
    });

    console.info(`M21: ${comites.length} comités cargados para empresa ${empresaActivaNit}.`);
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
function construirTarjetaComite(c: IConvivencia): string {
    // Calcular alerta de vencimiento
    const alerta = calcularAlertaVencimiento(c.fechaFinVigencia);

    // Calcular progreso de pasos
    const pasos: EstadoPaso[] = [
        c.pasoConvocatoria,
        c.pasoEleccion,
        c.pasoDesignacion,
        c.pasoConstitucion,
        c.pasoCapacitacion,
        c.pasoReglamento
    ];
    const progreso = calcularProgresoPasos(pasos);

    // Clase de la tarjeta según alerta
    let claseTarjeta = 'comite-item';
    if (alerta.nivel === 'rojo') claseTarjeta += ' comite-vencido';
    else if (alerta.nivel === 'naranja' || alerta.nivel === 'amarillo') claseTarjeta += ' comite-por-vencer';
    else claseTarjeta += ' comite-vigente';

    // Badge tipo (siempre es CCL en M21)
    const badgeTipo = `<span class="badge badge-tipo-ccl">CCL</span>`;

    // Badge estado
    let badgeEstado = '';
    if (c.estado === 'Activo') {
        badgeEstado = `<span class="badge badge-activo">Activo</span>`;
    } else if (c.estado === 'Inactivo') {
        badgeEstado = `<span class="badge badge-inactivo">Inactivo</span>`;
    } else {
        badgeEstado = `<span class="badge badge-formalizacion">En formalización</span>`;
    }

    // Badge alerta
    const claseAlerta = `badge-alerta badge-alerta-${alerta.nivel}`;
    const textoAlerta = alerta.diasRestantes >= 0
        ? `Vence en ${alerta.diasRestantes}d`
        : `Vencido hace ${Math.abs(alerta.diasRestantes)}d`;
    const badgeAlerta = `<span class="${claseAlerta}">${alerta.icono} ${textoAlerta}</span>`;

    // Periodo
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
    const contenedor = qs('#contenedor-estadisticas-convivencia');
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

    // Alertas
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

    // Quejas por tipo (todos los comités de la empresa)
    const todosLosComitesIds = comites.map(c => c.id);
    const todasLasQuejas = storageQuejasConvivencia
        .obtenerTodos()
        .filter(q => todosLosComitesIds.includes(q.comiteId));

    const quejasAcosoLaboral = todasLasQuejas.filter(q => q.tipo === 'AcosoLaboral').length;
    const quejasAcosoSexual = todasLasQuejas.filter(q => q.tipo === 'AcosoSexual').length;
    const quejasConflicto = todasLasQuejas.filter(q =>
        q.tipo === 'Otro' || q.tipo === 'Discriminacion' ||
        q.tipo === 'Hostigamiento' || q.tipo === 'Violencia'
    ).length;

    const totalQuejas = todasLasQuejas.length;

    // Casos cerrados
    const casos = storageCasosConvivencia.obtenerTodos();
    const casosCerrados = casos.filter(c => c.estado === 'Cerrada').length;

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
            <h4>📬 Quejas por Tipo</h4>
            ${totalQuejas > 0 ? `
                <div class="stats-grafica">
                    ${renderizarBarra('Acoso Laboral', quejasAcosoLaboral, totalQuejas, 'barra-acoso-laboral')}
                    ${renderizarBarra('Acoso Sexual', quejasAcosoSexual, totalQuejas, 'barra-acoso-sexual')}
                    ${renderizarBarra('Conflicto / Otro', quejasConflicto, totalQuejas, 'barra-conflicto')}
                </div>
                <table class="stats-tabla">
                    <thead>
                        <tr>
                            <th>Tipo de Queja</th>
                            <th>Cantidad</th>
                            <th>Porcentaje</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>🟠 Acoso Laboral</td><td>${quejasAcosoLaboral}</td><td>${calcularPorcentaje(quejasAcosoLaboral, totalQuejas)}%</td></tr>
                        <tr><td>🔴 Acoso Sexual</td><td>${quejasAcosoSexual}</td><td>${calcularPorcentaje(quejasAcosoSexual, totalQuejas)}%</td></tr>
                        <tr><td>🔵 Conflicto / Otro</td><td>${quejasConflicto}</td><td>${calcularPorcentaje(quejasConflicto, totalQuejas)}%</td></tr>
                        <tr class="stats-total"><td>Total Quejas</td><td>${totalQuejas}</td><td>100%</td></tr>
                    </tbody>
                </table>
                <p class="text-muted" style="margin-top:1rem;">
                    <strong>Casos cerrados:</strong> ${casosCerrados} de ${totalQuejas}
                </p>
            ` : `
                <p class="text-muted">
                    No hay quejas registradas en los comités activos.
                </p>
            `}
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
 * 
 * @param label - Texto de la etiqueta.
 * @param cantidad - Cantidad a representar.
 * @param total - Total para calcular el porcentaje.
 * @param claseColor - Clase CSS del color de la barra.
 * @returns {string} - HTML de la barra.
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
 * 
 * @param cantidad - Cantidad.
 * @param total - Total.
 * @returns {number} - Porcentaje redondeado.
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
    const tabNav = qs('#tab-container-convivencia');
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
 * Abre el modal para crear un nuevo comité de convivencia.
 */
function abrirModalNuevoComite(): void {
    let modal: HTMLElement | null = qsTipo<HTMLElement>('#modal-nuevo-comite-convivencia');

    if (!modal) {
        const nuevoModal = document.createElement('div');
        nuevoModal.id = 'modal-nuevo-comite-convivencia';
        nuevoModal.className = 'modal-overlay';
        document.body.appendChild(nuevoModal);
        modal = nuevoModal;
    }

    const hoy = fechaActualISO();

    modal.innerHTML = `
        <div class="modal-contenido" role="dialog" aria-modal="true">
            <h2 class="modal-titulo">➕ Nuevo Comité de Convivencia</h2>
            <p class="modal-descripcion">
                Complete los datos básicos. La composición se calculará
                automáticamente según el número de trabajadores (Res. 3461 de 2025).
            </p>

            <div class="modal-form">
                <div class="form-group">
                    <label for="input-nombre">Nombre del Comité (opcional)</label>
                    <input type="text" id="input-nombre"
                        placeholder="Ej: Comité de Convivencia - Sede Principal" />
                </div>

                <div class="form-group">
                    <label for="input-ciudad">Ciudad / Municipio <span style="color:#DC2626">*</span></label>
                    <input type="text" id="input-ciudad"
                        placeholder="Ej: Bogotá D.C." />
                </div>

                <div class="form-group">
                    <label for="input-trabajadores">Número de Trabajadores <span style="color:#DC2626">*</span></label>
                    <input type="number" id="input-trabajadores" min="1" value="10" />
                    <small>Determina la composición: &lt;5 → 2 miembros | 5-20 → 4 | 21-500 → 8 | 501-1000 → 12 | 1001+ → 16</small>
                </div>

                <div class="form-group">
                    <label for="input-canal">Correo oficial del CCL</label>
                    <input type="email" id="input-canal"
                        placeholder="Ej: convivencia@empresa.com" />
                </div>

                <div class="form-group">
                    <label for="input-buzon">Buzón físico (opcional)</label>
                    <input type="text" id="input-buzon"
                        placeholder="Ej: Oficina de Talento Humano - Piso 2" />
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
    const modal = qsTipo<HTMLElement>('#modal-nuevo-comite-convivencia');
    if (modal) modal.style.display = 'none';
}

/**
 * Confirma la creación del comité (validando datos).
 */
function confirmarCrearComite(): void {
    const inputNombre = qsTipo<HTMLInputElement>('#input-nombre');
    const inputCiudad = qsTipo<HTMLInputElement>('#input-ciudad');
    const inputTrabajadores = qsTipo<HTMLInputElement>('#input-trabajadores');
    const inputCanal = qsTipo<HTMLInputElement>('#input-canal');
    const inputBuzon = qsTipo<HTMLInputElement>('#input-buzon');
    const inputFecha = qsTipo<HTMLInputElement>('#input-fecha');

    if (!inputCiudad || !inputTrabajadores || !inputFecha) return;

    const nombre = (inputNombre?.value || '').trim();
    const ciudad = inputCiudad.value.trim();
    const numTrabajadores = parseInt(inputTrabajadores.value, 10) || 0;
    const canal = (inputCanal?.value || '').trim();
    const buzon = (inputBuzon?.value || '').trim();
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
    crearNuevoComite(nombre, ciudad, numTrabajadores, canal, buzon, fechaInicio);
}

// ================================================================
// CREAR NUEVO COMITÉ
// ================================================================

/**
 * Crea un nuevo comité con los datos básicos y los estados iniciales.
 * 
 * @param nombre - Nombre del comité (puede estar vacío).
 * @param ciudad - Ciudad o municipio.
 * @param numTrabajadores - Número total de trabajadores.
 * @param canal - Correo oficial del CCL.
 * @param buzon - Buzón físico de quejas.
 * @param fechaInicio - Fecha de inicio en formato ISO (YYYY-MM-DD).
 */
function crearNuevoComite(
    nombre: string,
    ciudad: string,
    numTrabajadores: number,
    canal: string,
    buzon: string,
    fechaInicio: string
): void {
    if (!empresaActivaNit) {
        alert('⚠️ No hay empresa activa.');
        return;
    }

    const composicion = calcularComposicionCCL(numTrabajadores);
    const fechaFin = calcularFechaFinVigencia(fechaInicio);

    const nombreFinal = nombre || `CCL - ${empresaActivaNombre}`;

    // Crear representantes vacíos según composición
    const representantesEmpleador = crearPlantillaRepresentantes(composicion, 'Empleador');
    const representantesTrabajadores = crearPlantillaRepresentantes(composicion, 'Trabajador');

    const nuevoComite: IConvivencia = {
        id: generarIdComite(),
        empresaId: empresaActivaNit,
        nombre: nombreFinal,
        ciudad,
        numeroTrabajadores: numTrabajadores,

        fechaInicioVigencia: fechaInicio,
        fechaFinVigencia: fechaFin,
        estado: 'EnFormalizacion',

        representantesEmpleador,
        representantesTrabajadores,

        presidenteId: null,
        secretarioId: null,

        canalQuejas: canal,
        buzonFisico: buzon,

        fechaPublicacionConvocatoria: null,
        fechaAperturaInscripciones: null,
        fechaCierreInscripciones: null,
        fechaVotacion: null,

        votosValidos: 0,
        votosBlancos: 0,
        votosNulos: 0,
        totalHabilitados: numTrabajadores,
        totalEmitidos: 0,

        pasoConvocatoria: 'Pendiente',
        pasoEleccion: 'Pendiente',
        pasoDesignacion: 'Pendiente',
        pasoConstitucion: 'Pendiente',
        pasoCapacitacion: 'Pendiente',
        pasoReglamento: 'Pendiente',

        actaEleccion: '',
        miembros: [],

        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    const guardado = storageConvivencia.guardar(nuevoComite);
    if (!guardado) {
        alert('❌ No se pudo crear el comité.');
        return;
    }

    console.info(`M21: Comité creado con ID ${nuevoComite.id}.`);

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
 * 
 * @param comiteId - ID del comité a abrir.
 */
function abrirDetalleComite(comiteId: string): void {
    const comite = storageConvivencia.obtenerPorId(comiteId);
    if (!comite) {
        alert('⚠️ No se encontró el comité.');
        return;
    }

    localStorage.setItem('comiteIdActiva', comiteId);
    localStorage.setItem('comiteEmpresaNit', comite.empresaId);

    const url = 'modules/M21-Gestion-Comite-Convivencia/convivencia-detalle.html';
    window.open(url, '_blank');

    console.info(`M21: Abriendo detalle del comité ${comiteId}.`);
}

// ================================================================
// IMPRIMIR COMITÉ
// ================================================================

/**
 * Imprime el comité completo en una pestaña nueva.
 * 
 * @param comiteId - ID del comité a imprimir.
 */
function imprimirComite(comiteId: string): void {
    const comite = storageConvivencia.obtenerPorId(comiteId);
    if (!comite) {
        alert('⚠️ No se encontró el comité.');
        return;
    }

    localStorage.setItem('comiteIdActiva', comiteId);
    localStorage.setItem('comiteEmpresaNit', comite.empresaId);
    localStorage.setItem('comiteImprimir', 'true');

    const url = 'modules/M21-Gestion-Comite-Convivencia/convivencia-detalle.html';
    window.open(url, '_blank');

    console.info(`M21: Imprimiendo comité ${comiteId}.`);
}

// ================================================================
// ELIMINAR COMITÉ
// ================================================================

/**
 * Elimina un comité con confirmación previa.
 * También elimina sus quejas, casos y actas asociadas.
 * 
 * @param comiteId - ID del comité a eliminar.
 */
function eliminarComite(comiteId: string): void {
    const comite = storageConvivencia.obtenerPorId(comiteId);
    if (!comite) {
        alert('⚠️ No se encontró el comité.');
        return;
    }

    const confirmar = confirm(
        `¿Está seguro de eliminar el comité "${comite.nombre}"?\n\n` +
        `Esto también eliminará las quejas, casos y actas asociadas. ` +
        `Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    // Eliminar casos (y sus dependencias)
    const casos = storageCasosConvivencia.obtenerTodos().filter(c => c.comiteId === comiteId);
    casos.forEach(caso => storageCasosConvivencia.eliminar(caso.id));

    // Eliminar quejas
    const quejas = storageQuejasConvivencia.obtenerTodos().filter(q => q.comiteId === comiteId);
    quejas.forEach(queja => storageQuejasConvivencia.eliminar(queja.id));

    // Eliminar actas
    const actas = storageActasConvivencia.obtenerTodos().filter(a => a.comiteId === comiteId);
    actas.forEach(acta => storageActasConvivencia.eliminar(acta.id));

    // Eliminar el comité
    const eliminado = storageConvivencia.eliminar(comiteId);

    if (!eliminado) {
        alert('❌ No se pudo eliminar el comité.');
        return;
    }

    console.info(`M21: Comité ${comiteId} eliminado (${quejas.length} quejas, ${casos.length} casos, ${actas.length} actas).`);

    cargarComites();
    renderizarComites();
    renderizarEstadisticas();
}

// ================================================================
// EVENTO: VOLVER DEL DETALLE
// ================================================================

/**
 * Maneja el evento "comite:volver-listado" disparado por convivencia-detalle.ts.
 */
function manejarVolverDelDetalle(): void {
    localStorage.removeItem('comiteIdActiva');
    localStorage.removeItem('comiteEmpresaNit');
    localStorage.removeItem('comiteImprimir');

    cargarComites();
    renderizarComites();
    renderizarEstadisticas();

    console.info('M21: Volviendo al listado (recargado).');
}