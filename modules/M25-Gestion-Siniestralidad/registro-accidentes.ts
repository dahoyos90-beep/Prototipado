/**
 * modules/M25-Gestion-Siniestralidad/registro-accidentes.ts
 * 
 * Lógica del HTML independiente "Registro de Accidentes" del módulo
 * M25 - Gestión de Siniestralidad.
 * 
 * Se abre en pestaña nueva desde gestion-siniestralidad.ts.
 * Lee la empresa activa desde localStorage ('siniestralidadEmpresaNit').
 * 
 * Responsabilidades:
 * - Cargar el CSS del módulo dinámicamente.
 * - Verificar empresa activa (patrón M21: <p class="text-muted"> dentro del contenedor).
 * - Renderizar encabezado naranja estilo Excel (año + título).
 * - KPI cards (total eventos, con incapacidad, días perdidos, %).
 * - Toolbar (buscador + filtros por área/mes/gravedad).
 * - DataGrid con las columnas del Excel "Registro Accidentes.xls".
 * - Estado vacío cuando no hay registros.
 * - Wizard modal de 4 pasos para crear / editar / ver.
 * - Exportar a Excel (.xls) con el helper reutilizable exportar-excel.ts.
 * - Imprimir (window.print).
 * - Volver al módulo principal (dispatchEvent 'siniestralidad:volver').
 * 
 * Basado en:
 * - NTC 3701 (caracterización del accidente)
 * - Resolución 0312 de 2019 (registro mínimo)
 * - Decreto 1072 de 2015 (registro y reporte)
 * 
 * @version 1.0.3
 *  - Quitado import * as XLSX from 'xlsx' (no resuelve en navegador).
 *  - Exportación de Excel vía exportarModulo() de src/exportar-excel.ts.
 *  - Guardado empresaNombre en variable de módulo para el encabezado.
 * 
 * @version 1.0.2
 *  - Chequeo de empresa con <p class="text-muted"> (patrón M21).
 *  - Tarea habitual y uso EPP como radios Sí/No.
 *  - Agregado botón "Ver detalle" (modo lectura del wizard).
 *  - volverAlModulo() dispara CustomEvent 'siniestralidad:volver'.
 * 
 * @version 1.0.1
 *  - Conexión del wizard dentro de construirInterfaz().
 * 
 * @version 1.0.0
 * @since 2026-10-09
 */

import { escaparHTML } from '../../src/utils.js';
import {
    storageEmpresas,
    storageSiniestros
} from '../../src/storage.js';
import { validarRegistroNominal } from '../../src/siniestralidad-utils.js';
import { exportarModulo } from '../../src/exportar-excel.js';
import { obtenerUsuarioSesion } from '../../src/auth.js';
import type {
    ISiniestro,
    TipoSiniestro,
    EstadoSiniestro,
    GravedadLesion,
    SexoTrabajador,
    DiaSemana
} from '../../src/interfaces/ISiniestro.js';

// ================================================================
// CONSTANTES
// ================================================================

const CSS_LINK_ID = 'modulo-siniestralidad-registro-css';
const CSS_HREF = 'modules/M25-Gestion-Siniestralidad/registro-accidentes.css';
const LS_EMPRESA_NIT = 'siniestralidadEmpresaNit';

const NOMBRES_MESES_CORTOS: readonly string[] = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const NOMBRES_MESES_LARGOS: readonly string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA: readonly DiaSemana[] = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

const TIPOS_SINIESTRO: readonly TipoSiniestro[] = [
    'AccidenteTrabajo', 'Incidente', 'EnfermedadLaboral', 'AccidenteComun', 'Otro'
];

const GRAVEDADES: readonly GravedadLesion[] = ['Leve', 'Moderado', 'Grave', 'Fatal'];

const ESTADOS: readonly EstadoSiniestro[] = [
    'Registrado', 'EnInvestigacion', 'Cerrado', 'ReportadoARL'
];

/** Modo de apertura del wizard. */
type ModoWizard = 'nuevo' | 'editar' | 'ver';

// ================================================================
// ESTADO
// ================================================================

let contenedorRaiz: HTMLElement | null = null;
let nit = '';
let empresaNombre = '';
let anio = String(new Date().getFullYear());
let registros: ISiniestro[] = [];
let filtros: { texto: string; area: string; mes: string; gravedad: string } = {
    texto: '', area: '', mes: '', gravedad: ''
};
let pasoWizard = 1;
let registroEditandoId: string | null = null;
let modoWizard: ModoWizard = 'nuevo';

// ================================================================
// ARRANQUE
// ================================================================

function arrancar(): void {
    const contenedor = document.getElementById('registro-accidentes-container');
    if (!contenedor) {
        console.error('❌ M25 Registro: No se encontró #registro-accidentes-container.');
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

function init(contenedor: HTMLElement): void {
    console.info('📋 M25 Registro: Inicializando...');

    cargarCSSModulo();

    nit = localStorage.getItem(LS_EMPRESA_NIT) || '';
    if (!nit) {
        mostrarErrorEnContenedor(contenedor, 'No se especificó la empresa.');
        console.error('M25 Registro: No hay siniestralidadEmpresaNit en localStorage.');
        return;
    }

    const empresa = storageEmpresas.obtenerPorId(nit);
    if (empresa) {
        empresaNombre = empresa.razonSocial;
    } else {
        // Buscar por NIT si el ID no coincide (patrón M24)
        const empresaPorNit = storageEmpresas
            .obtenerTodos()
            .find(e => e.nit === nit);
        empresaNombre = empresaPorNit ? empresaPorNit.razonSocial : 'Empresa';
    }

    cargarRegistros();
    construirInterfaz(contenedor);

    console.info(`✅ M25 Registro: ${registros.length} accidentes cargados.`);
}

/**
 * Muestra un mensaje discreto dentro del contenedor (patrón M21).
 * NO usa div.card con alert rojo.
 * 
 * @param contenedor - Contenedor raíz.
 * @param mensaje - Texto del mensaje.
 */
function mostrarErrorEnContenedor(contenedor: HTMLElement, mensaje: string): void {
    contenedor.innerHTML = `<p class="text-muted">⚠️ ${escaparHTML(mensaje)}</p>`;
}

function cargarRegistros(): void {
    registros = storageSiniestros
        .obtenerTodos()
        .filter(s => s.empresaId === nit && s.anio === anio)
        .sort((a, b) => b.fechaEvento.localeCompare(a.fechaEvento));
}

function cargarCSSModulo(): void {
    if (document.getElementById(CSS_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = CSS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    document.head.appendChild(link);
}

// ================================================================
// CONSTRUCCIÓN DE LA INTERFAZ
// ================================================================

function construirInterfaz(contenedor: HTMLElement): void {
    contenedor.innerHTML = `
        ${construirBarraSuperior()}
        ${construirEncabezado()}
        <div id="kpi-registro"></div>
        ${construirToolbar()}
        <div id="grid-registro"></div>
        <div id="mensaje-registro" class="alert hidden"></div>
        ${construirModalWizard()}
    `;

    conectarEventos();
    conectarEventosWizard();
    limpiarFormulario();
    renderizarKPIs();
    renderizarGrid();
}

function construirBarraSuperior(): string {
    return `
        <div class="barra-acciones-superior">
            <div class="grupo-izq">
                <button id="btn-volver" class="btn btn-outline btn-sm" type="button">
                    ← Volver al módulo
                </button>
            </div>
            <div class="grupo-der">
                <button id="btn-exportar-excel" class="btn btn-outline btn-sm" type="button">
                    📊 Exportar Excel
                </button>
                <button id="btn-imprimir" class="btn btn-outline btn-sm" type="button">
                    🖨️ Imprimir
                </button>
            </div>
        </div>
    `;
}

function construirEncabezado(): string {
    return `
        <div class="encabezado-excel">
            <div class="encabezado-excel-titulo">REGISTRO DE ACCIDENTES E INCIDENTES</div>
            <div class="encabezado-excel-subtitulo">
                Caracterización según NTC 3701 · Resolución 0312 de 2019
            </div>
            <div class="encabezado-excel-grid">
                <div class="encabezado-campo">
                    <label for="reg-anio">Año</label>
                    <input type="text" id="reg-anio" value="${escaparHTML(anio)}" readonly />
                </div>
                <div class="encabezado-campo">
                    <label for="reg-nit">NIT</label>
                    <input type="text" id="reg-nit" value="${escaparHTML(nit)}" readonly />
                </div>
                <div class="encabezado-campo">
                    <label for="reg-total">Total de eventos</label>
                    <input type="text" id="reg-total" value="${registros.length}" readonly />
                </div>
                <div class="encabezado-campo">
                    <label for="reg-ultimo-item">Último ITEM</label>
                    <input type="text" id="reg-ultimo-item" value="${calcularUltimoItem()}" readonly />
                </div>
            </div>
        </div>
    `;
}

function construirToolbar(): string {
    return `
        <div class="toolbar">
            <div class="grupo-campo">
                <label for="filtro-texto">Buscar</label>
                <input type="text" id="filtro-texto" placeholder="Nombre o cédula..." />
            </div>
            <div class="grupo-campo">
                <label for="filtro-area">Área</label>
                <input type="text" id="filtro-area" placeholder="Filtrar por área" />
            </div>
            <div class="grupo-campo">
                <label for="filtro-mes">Mes</label>
                <select id="filtro-mes">
                    <option value="">Todos</option>
                    ${NOMBRES_MESES_CORTOS.map((n, i) => `
                        <option value="${i + 1}">${escaparHTML(n)}</option>
                    `).join('')}
                </select>
            </div>
            <div class="grupo-campo">
                <label for="filtro-gravedad">Gravedad</label>
                <select id="filtro-gravedad">
                    <option value="">Todas</option>
                    ${GRAVEDADES.map(g => `
                        <option value="${g}">${g}</option>
                    `).join('')}
                </select>
            </div>
            <div class="grupo-acciones">
                <button id="btn-limpiar-filtros" class="btn btn-outline btn-sm" type="button">
                    🧹 Limpiar
                </button>
                <button id="btn-nuevo-accidente" class="btn btn-success" type="button">
                    ➕ Registrar Accidente
                </button>
            </div>
        </div>
    `;
}

// ================================================================
// KPI CARDS
// ================================================================

function renderizarKPIs(): void {
    const cont = contenedorRaiz?.querySelector('#kpi-registro');
    if (!cont) return;

    const totalEventos = registros.length;
    const conIncapacidad = registros.filter(r => r.totalDiasPerdidos > 0).length;
    const totalDias = registros.reduce((sum, r) => sum + r.totalDiasPerdidos, 0);
    const conMedidas = registros.filter(r => r.medidasCumplidas && r.medidasCumplidas.trim().length > 0).length;
    const pctMedidas = totalEventos > 0 ? Math.round((conMedidas / totalEventos) * 100) : 0;

    cont.innerHTML = `
        <div class="kpi-grid">
            <div class="kpi-card kpi-total">
                <div class="kpi-valor">${totalEventos}</div>
                <div class="kpi-etiqueta">Total de eventos</div>
            </div>
            <div class="kpi-card kpi-incap">
                <div class="kpi-valor">${conIncapacidad}</div>
                <div class="kpi-etiqueta">Con incapacidad</div>
            </div>
            <div class="kpi-card kpi-dias">
                <div class="kpi-valor">${totalDias}</div>
                <div class="kpi-etiqueta">Días perdidos</div>
            </div>
            <div class="kpi-card kpi-med">
                <div class="kpi-valor">${pctMedidas}%</div>
                <div class="kpi-etiqueta">Con medidas correctivas</div>
            </div>
        </div>
    `;
}

// ================================================================
// DATAGRID
// ================================================================

function registrosFiltrados(): ISiniestro[] {
    const texto = filtros.texto.trim().toLowerCase();
    const area = filtros.area.trim().toLowerCase();
    const mes = filtros.mes ? parseInt(filtros.mes, 10) : 0;
    const gravedad = filtros.gravedad;

    return registros.filter(r => {
        if (texto && !r.nombreAccidentado.toLowerCase().includes(texto)
            && !r.cedula.toLowerCase().includes(texto)) return false;
        if (area && !r.area.toLowerCase().includes(area)) return false;
        if (mes && r.mes !== mes) return false;
        if (gravedad && r.gravedad !== gravedad) return false;
        return true;
    });
}

function renderizarGrid(): void {
    const cont = contenedorRaiz?.querySelector('#grid-registro');
    if (!cont) return;

    const lista = registrosFiltrados();

    if (lista.length === 0) {
        cont.innerHTML = `
            <div class="estado-vacio">
                <div class="estado-vacio-icono">📭</div>
                <h4>No hay accidentes registrados</h4>
                <p>
                    ${registros.length === 0
                        ? 'Comience registrando el primer accidente o incidente.'
                        : 'Ningún registro coincide con los filtros aplicados.'}
                </p>
                <button class="btn btn-success" type="button" id="btn-nuevo-vacio">
                    ➕ ${registros.length === 0 ? 'Registrar el primero' : 'Registrar nuevo accidente'}
                </button>
            </div>
        `;

        const btnVacio = cont.querySelector('#btn-nuevo-vacio');
        if (btnVacio) btnVacio.addEventListener('click', () => abrirWizard(null, 'nuevo'));
        return;
    }

    cont.innerHTML = `
        <div class="grid-scroll">
            <table class="tabla-registro">
                <thead>
                    <tr class="grupos">
                        <th class="th-grupo-item sticky-col col-item" colspan="1">ITEM</th>
                        <th class="th-grupo-fecha sticky-col col-mes" colspan="1">Mes</th>
                        <th class="th-grupo-fecha sticky-col col-dia" colspan="1">Día</th>
                        <th class="th-grupo-fecha sticky-col col-hora" colspan="1">Hora</th>
                        <th class="th-grupo-fecha" colspan="1">Sem.</th>
                        <th class="th-grupo-ausent" colspan="3">Ausentismo</th>
                        <th class="th-grupo-datos sticky-col col-nombre" colspan="7">Datos generales</th>
                        <th class="th-grupo-area" colspan="2">Área y puesto</th>
                        <th class="th-grupo-lesion" colspan="3">Tipo de lesión</th>
                        <th class="th-grupo-caract" colspan="6">Caracterización del accidente</th>
                        <th class="th-grupo-desc" colspan="1">Descripción</th>
                        <th class="th-grupo-acciones" colspan="1">Medidas</th>
                        <th class="th-grupo-actividad" colspan="4">Actividad</th>
                        <th class="th-grupo-item col-acciones" colspan="1">Acciones</th>
                    </tr>
                    <tr class="columnas">
                        <th class="sticky-col col-item">#</th>
                        <th class="sticky-col col-mes">Mes</th>
                        <th class="sticky-col col-dia">Día</th>
                        <th class="sticky-col col-hora">Hora</th>
                        <th>Sem.</th>
                        <th>Aus. mes</th>
                        <th>Aus. sig.</th>
                        <th>Total días</th>
                        <th class="sticky-col col-nombre">Nombre</th>
                        <th>Cédula</th>
                        <th>Sexo</th>
                        <th>Edad</th>
                        <th>Tiempo</th>
                        <th>Tarea habitual</th>
                        <th>Uso EPP</th>
                        <th>Área</th>
                        <th>Puesto</th>
                        <th>Naturaleza</th>
                        <th>Parte del cuerpo</th>
                        <th>Descripción lesión</th>
                        <th>Agente</th>
                        <th>Fuente</th>
                        <th>Tipo de contacto</th>
                        <th>Condición subest.</th>
                        <th>Acto subest.</th>
                        <th>Fact. trabajo</th>
                        <th>Fact. personales</th>
                        <th>Descripción detallada</th>
                        <th>Medidas cumplidas</th>
                        <th>Capacit.</th>
                        <th>Mant.</th>
                        <th>Aseo</th>
                        <th>Horas trab.</th>
                        <th class="col-acciones sticky-col">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(r => construirFila(r)).join('')}
                </tbody>
            </table>
        </div>
    `;

    conectarEventosGrid();
}

function construirFila(r: ISiniestro): string {
    const badgeDias = r.totalDiasPerdidos > 0
        ? `<span class="badge badge-dias-si">${r.totalDiasPerdidos} días</span>`
        : `<span class="badge badge-dias-no">0 días</span>`;

    const badgeEPP = r.usoEPP
        ? `<span class="badge badge-epp-si">Sí</span>`
        : `<span class="badge badge-epp-no">No</span>`;

    const badgeTarea = r.tareaHabitual
        ? `<span class="badge badge-tarea-si">Sí</span>`
        : `<span class="badge badge-tarea-no">No</span>`;

    return `
        <tr data-id="${escaparHTML(r.id)}">
            <td class="sticky-col col-item celda-num">${r.item}</td>
            <td class="sticky-col col-mes">${escaparHTML(NOMBRES_MESES_CORTOS[r.mes - 1] ?? '')}</td>
            <td class="sticky-col col-dia celda-num">${r.dia}</td>
            <td class="sticky-col col-hora">${escaparHTML(r.hora || '—')}</td>
            <td>${escaparHTML(r.diaSemana)}</td>
            <td class="celda-num">${r.ausentismoMesAccidente}</td>
            <td class="celda-num">${r.ausentismoMesSiguiente}</td>
            <td>${badgeDias}</td>
            <td class="sticky-col col-nombre">${escaparHTML(r.nombreAccidentado)}</td>
            <td>${escaparHTML(r.cedula)}</td>
            <td>${escaparHTML(r.sexo)}</td>
            <td class="celda-num">${r.edad || '—'}</td>
            <td>${escaparHTML(r.tiempoTrabajo || '—')}</td>
            <td>${badgeTarea}</td>
            <td>${badgeEPP}</td>
            <td>${escaparHTML(r.area)}</td>
            <td>${escaparHTML(r.puesto || '—')}</td>
            <td>${escaparHTML(r.naturalezaLesion || '—')}</td>
            <td>${escaparHTML(r.parteCuerpo || '—')}</td>
            <td class="celda-descripcion">${escaparHTML(r.descripcionLesion || '—')}</td>
            <td>${escaparHTML(r.agente || '—')}</td>
            <td>${escaparHTML(r.fuente || '—')}</td>
            <td>${escaparHTML(r.tipoContacto || '—')}</td>
            <td class="celda-descripcion">${escaparHTML(r.condicionSubestandar || '—')}</td>
            <td class="celda-descripcion">${escaparHTML(r.actoSubestandar || '—')}</td>
            <td class="celda-descripcion">${escaparHTML(r.factoresTrabajo || '—')}</td>
            <td class="celda-descripcion">${escaparHTML(r.factoresPersonales || '—')}</td>
            <td class="celda-descripcion">${escaparHTML(r.descripcionDetallada || '—')}</td>
            <td class="celda-descripcion">${escaparHTML(r.medidasCumplidas || '—')}</td>
            <td>${r.actividadCapacitacion ? '✓' : '—'}</td>
            <td>${r.actividadMantenimiento ? '✓' : '—'}</td>
            <td>${r.actividadAseo ? '✓' : '—'}</td>
            <td>${r.actividadAjusteHoras ? '✓' : '—'}</td>
            <td class="sticky-col col-acciones">
                <button class="btn btn-sm btn-outline btn-ver-registro" data-id="${escaparHTML(r.id)}" type="button" title="Ver detalle">👁️</button>
                <button class="btn btn-sm btn-outline btn-editar-registro" data-id="${escaparHTML(r.id)}" type="button" title="Editar">✏️</button>
                <button class="btn btn-sm btn-danger btn-eliminar-registro" data-id="${escaparHTML(r.id)}" type="button" title="Eliminar">🗑️</button>
            </td>
        </tr>
    `;
}

// ================================================================
// EVENTOS
// ================================================================

function conectarEventos(): void {
    if (!contenedorRaiz) return;

    const btnVolver = contenedorRaiz.querySelector('#btn-volver');
    if (btnVolver) btnVolver.addEventListener('click', volverAlModulo);

    const btnImprimir = contenedorRaiz.querySelector('#btn-imprimir');
    if (btnImprimir) btnImprimir.addEventListener('click', () => window.print());

    const btnExportar = contenedorRaiz.querySelector('#btn-exportar-excel');
    if (btnExportar) btnExportar.addEventListener('click', exportarExcel);

    const btnNuevo = contenedorRaiz.querySelector('#btn-nuevo-accidente');
    if (btnNuevo) btnNuevo.addEventListener('click', () => abrirWizard(null, 'nuevo'));

    const btnLimpiar = contenedorRaiz.querySelector('#btn-limpiar-filtros');
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltros);

    const filtroTexto = contenedorRaiz.querySelector<HTMLInputElement>('#filtro-texto');
    if (filtroTexto) filtroTexto.addEventListener('input', () => {
        filtros.texto = filtroTexto.value;
        renderizarGrid();
    });

    const filtroArea = contenedorRaiz.querySelector<HTMLInputElement>('#filtro-area');
    if (filtroArea) filtroArea.addEventListener('input', () => {
        filtros.area = filtroArea.value;
        renderizarGrid();
    });

    const filtroMes = contenedorRaiz.querySelector<HTMLSelectElement>('#filtro-mes');
    if (filtroMes) filtroMes.addEventListener('change', () => {
        filtros.mes = filtroMes.value;
        renderizarGrid();
    });

    const filtroGravedad = contenedorRaiz.querySelector<HTMLSelectElement>('#filtro-gravedad');
    if (filtroGravedad) filtroGravedad.addEventListener('change', () => {
        filtros.gravedad = filtroGravedad.value;
        renderizarGrid();
    });
}

function conectarEventosGrid(): void {
    if (!contenedorRaiz) return;

    contenedorRaiz.querySelectorAll<HTMLButtonElement>('.btn-ver-registro').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            if (id) abrirWizard(id, 'ver');
        });
    });

    contenedorRaiz.querySelectorAll<HTMLButtonElement>('.btn-editar-registro').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            if (id) abrirWizard(id, 'editar');
        });
    });

    contenedorRaiz.querySelectorAll<HTMLButtonElement>('.btn-eliminar-registro').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            if (id) eliminarRegistro(id);
        });
    });
}

function limpiarFiltros(): void {
    filtros = { texto: '', area: '', mes: '', gravedad: '' };

    const filtroTexto = contenedorRaiz?.querySelector<HTMLInputElement>('#filtro-texto');
    const filtroArea = contenedorRaiz?.querySelector<HTMLInputElement>('#filtro-area');
    const filtroMes = contenedorRaiz?.querySelector<HTMLSelectElement>('#filtro-mes');
    const filtroGravedad = contenedorRaiz?.querySelector<HTMLSelectElement>('#filtro-gravedad');

    if (filtroTexto) filtroTexto.value = '';
    if (filtroArea) filtroArea.value = '';
    if (filtroMes) filtroMes.value = '';
    if (filtroGravedad) filtroGravedad.value = '';

    renderizarGrid();
}

// ================================================================
// WIZARD MODAL — 4 PASOS
// ================================================================

function construirModalWizard(): string {
    return `
        <div id="modal-wizard" class="modal-overlay" role="dialog" aria-modal="true">
            <div class="modal-contenido">
                <div class="modal-header">
                    <h2 id="wizard-titulo">➕ Nuevo accidente o incidente</h2>
                    <button class="btn-cerrar" type="button" id="btn-cerrar-wizard" aria-label="Cerrar">✕</button>
                </div>

                <div class="wizard-pasos" id="wizard-pasos">
                    <button type="button" class="wizard-paso activo" data-paso="1">
                        <span class="numero">1</span>
                        <span>Ocurrencia y trabajador</span>
                    </button>
                    <span class="wizard-separador"></span>
                    <button type="button" class="wizard-paso" data-paso="2">
                        <span class="numero">2</span>
                        <span>Ubicación y lesión</span>
                    </button>
                    <span class="wizard-separador"></span>
                    <button type="button" class="wizard-paso" data-paso="3">
                        <span class="numero">3</span>
                        <span>Análisis causal</span>
                    </button>
                    <span class="wizard-separador"></span>
                    <button type="button" class="wizard-paso" data-paso="4">
                        <span class="numero">4</span>
                        <span>Plan de acción</span>
                    </button>
                </div>

                <div class="modal-body" id="wizard-body">
                    ${construirPaso1()}
                    ${construirPaso2()}
                    ${construirPaso3()}
                    ${construirPaso4()}
                </div>

                <div class="modal-footer">
                    <button id="btn-wizard-cancelar" class="btn btn-outline" type="button">Cerrar</button>
                    <div class="grupo-acciones">
                        <button id="btn-wizard-anterior" class="btn btn-outline" type="button" disabled>← Anterior</button>
                        <button id="btn-wizard-siguiente" class="btn btn-primary" type="button">Siguiente →</button>
                        <button id="btn-wizard-guardar" class="btn btn-success hidden" type="button">💾 Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function construirPaso1(): string {
    return `
        <div class="paso-contenido activo" data-paso-contenido="1">
            <div class="paso-titulo">Paso 1: Ocurrencia del evento y datos del trabajador</div>
            <p class="paso-descripcion">Registre la fecha, hora y datos generales del accidentado.</p>

            <div class="form-grid">
                <div class="form-grupo">
                    <label for="w-fechaEvento">Fecha del evento <span class="required">*</span></label>
                    <input type="date" id="w-fechaEvento" required />
                </div>
                <div class="form-grupo">
                    <label for="w-hora">Hora</label>
                    <input type="text" id="w-hora" placeholder="Ej. 13h10 o 13:10" />
                </div>
                <div class="form-grupo">
                    <label for="w-tipo">Tipo de evento <span class="required">*</span></label>
                    <select id="w-tipo">
                        ${TIPOS_SINIESTRO.map(t => `<option value="${t}">${etiquetaTipo(t)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-grupo">
                    <label for="w-gravedad">Gravedad <span class="required">*</span></label>
                    <select id="w-gravedad">
                        ${GRAVEDADES.map(g => `<option value="${g}">${g}</option>`).join('')}
                    </select>
                </div>
                <div class="form-grupo ancho-completo">
                    <label for="w-nombreAccidentado">Nombre del accidentado <span class="required">*</span></label>
                    <input type="text" id="w-nombreAccidentado" placeholder="Nombre completo" required />
                </div>
                <div class="form-grupo">
                    <label for="w-cedula">Cédula</label>
                    <input type="text" id="w-cedula" placeholder="Ej. 1234567890" />
                </div>
                <div class="form-grupo">
                    <label for="w-sexo">Sexo</label>
                    <select id="w-sexo">
                        <option value="H">H — Hombre</option>
                        <option value="M">M — Mujer</option>
                    </select>
                </div>
                <div class="form-grupo">
                    <label for="w-edad">Edad</label>
                    <input type="number" id="w-edad" min="0" max="120" placeholder="Años" />
                </div>
                <div class="form-grupo">
                    <label for="w-tiempoTrabajo">Tiempo de trabajo</label>
                    <input type="text" id="w-tiempoTrabajo" placeholder="Ej. 2m, 1a, 3sem" />
                </div>
                <div class="form-grupo">
                    <label for="w-ausentismoMesAccidente">Ausentismo mes del accidente (días)</label>
                    <input type="number" id="w-ausentismoMesAccidente" min="0" value="0" />
                </div>
                <div class="form-grupo">
                    <label for="w-ausentismoMesSiguiente">Ausentismo mes siguiente (días)</label>
                    <input type="number" id="w-ausentismoMesSiguiente" min="0" value="0" />
                </div>
                <div class="form-grupo">
                    <label>¿Realizaba su tarea habitual?</label>
                    <div class="radio-opciones">
                        <label class="radio-chip">
                            <input type="radio" name="w-tareaHabitual" value="si" />
                            <span>Sí</span>
                        </label>
                        <label class="radio-chip">
                            <input type="radio" name="w-tareaHabitual" value="no" checked />
                            <span>No</span>
                        </label>
                    </div>
                </div>
                <div class="form-grupo">
                    <label>¿Portaba los EPP requeridos?</label>
                    <div class="radio-opciones">
                        <label class="radio-chip">
                            <input type="radio" name="w-usoEPP" value="si" />
                            <span>Sí</span>
                        </label>
                        <label class="radio-chip">
                            <input type="radio" name="w-usoEPP" value="no" checked />
                            <span>No</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function construirPaso2(): string {
    return `
        <div class="paso-contenido" data-paso-contenido="2">
            <div class="paso-titulo">Paso 2: Ubicación y caracterización de la lesión (NTC 3701)</div>
            <p class="paso-descripcion">Describa dónde ocurrió y las características de la lesión.</p>

            <div class="form-grid">
                <div class="form-grupo">
                    <label for="w-area">Área <span class="required">*</span></label>
                    <input type="text" id="w-area" placeholder="Ej. Sistemas, Despacho" required />
                </div>
                <div class="form-grupo">
                    <label for="w-puesto">Puesto de trabajo</label>
                    <input type="text" id="w-puesto" placeholder="Ej. Chofer, Estibador" />
                </div>
                <div class="form-grupo">
                    <label for="w-naturalezaLesion">Naturaleza de la lesión</label>
                    <input type="text" id="w-naturalezaLesion" placeholder="Ej. Herida cortante, Caída" />
                </div>
                <div class="form-grupo">
                    <label for="w-parteCuerpo">Parte del cuerpo afectada</label>
                    <input type="text" id="w-parteCuerpo" placeholder="Ej. Rodilla derecha, Cabeza" />
                </div>
                <div class="form-grupo">
                    <label for="w-agente">Agente</label>
                    <input type="text" id="w-agente" placeholder="Objeto o elemento que causó la lesión" />
                </div>
                <div class="form-grupo">
                    <label for="w-fuente">Fuente</label>
                    <input type="text" id="w-fuente" placeholder="Entorno u operación específica" />
                </div>
                <div class="form-grupo">
                    <label for="w-tipoContacto">Tipo de contacto</label>
                    <input type="text" id="w-tipoContacto" placeholder="Ej. Caída al mismo nivel" />
                </div>
                <div class="form-grupo ancho-completo">
                    <label for="w-descripcionLesion">Descripción de la lesión</label>
                    <textarea id="w-descripcionLesion" placeholder="Detalle clínico u operativo corto..."></textarea>
                </div>
            </div>
        </div>
    `;
}

function construirPaso3(): string {
    return `
        <div class="paso-contenido" data-paso-contenido="3">
            <div class="paso-titulo">Paso 3: Análisis causal y relato</div>
            <p class="paso-descripcion">Identifique las causas subyacentes y describa el evento con detalle.</p>

            <div class="form-grid">
                <div class="form-grupo ancho-completo">
                    <label for="w-condicionSubestandar">Condición subestándar</label>
                    <textarea id="w-condicionSubestandar" placeholder="Condición física o ambiental insegura presente..."></textarea>
                </div>
                <div class="form-grupo ancho-completo">
                    <label for="w-actoSubestandar">Acto subestándar</label>
                    <textarea id="w-actoSubestandar" placeholder="Acción u omisión insegura del trabajador o terceros..."></textarea>
                </div>
                <div class="form-grupo ancho-completo">
                    <label for="w-factoresTrabajo">Factores de trabajo</label>
                    <textarea id="w-factoresTrabajo" placeholder="Fallas en mantenimiento, supervisión o procedimientos..."></textarea>
                </div>
                <div class="form-grupo ancho-completo">
                    <label for="w-factoresPersonales">Factores personales</label>
                    <textarea id="w-factoresPersonales" placeholder="Exceso de confianza, fatiga, falta de capacitación..."></textarea>
                </div>
                <div class="form-grupo ancho-completo">
                    <label for="w-descripcionDetallada">Descripción detallada del evento <span class="required">*</span></label>
                    <textarea id="w-descripcionDetallada" placeholder="Narre las circunstancias de tiempo, modo y lugar..." required></textarea>
                </div>
            </div>
        </div>
    `;
}

function construirPaso4(): string {
    return `
        <div class="paso-contenido" data-paso-contenido="4">
            <div class="paso-titulo">Paso 4: Plan de acción y cierre</div>
            <p class="paso-descripcion">Registre las medidas correctivas y el tipo de intervención aplicada.</p>

            <div class="form-grid">
                <div class="form-grupo ancho-completo">
                    <label for="w-medidasCumplidas">Medidas cumplidas</label>
                    <textarea id="w-medidasCumplidas" placeholder="Plan de acción formulado y estado de ejecución..."></textarea>
                </div>
                <div class="form-grupo ancho-completo">
                    <label>Tipo de actividad aplicada</label>
                    <div class="actividades-chips">
                        <label class="actividad-chip">
                            <input type="checkbox" id="w-actividadCapacitacion" />
                            <span>Capacitación</span>
                        </label>
                        <label class="actividad-chip">
                            <input type="checkbox" id="w-actividadMantenimiento" />
                            <span>Mantenimiento</span>
                        </label>
                        <label class="actividad-chip">
                            <input type="checkbox" id="w-actividadAseo" />
                            <span>Aseo / Orden y limpieza</span>
                        </label>
                        <label class="actividad-chip">
                            <input type="checkbox" id="w-actividadAjusteHoras" />
                            <span>Ajuste de horas de trabajo</span>
                        </label>
                    </div>
                </div>
                <div class="form-grupo">
                    <label for="w-estado">Estado del registro</label>
                    <select id="w-estado">
                        ${ESTADOS.map(e => `<option value="${e}">${etiquetaEstado(e)}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
    `;
}

// ================================================================
// WIZARD — ABRIR / CERRAR / NAVEGAR / GUARDAR
// ================================================================

/**
 * Abre el wizard en uno de los 3 modos.
 * 
 * @param id - ID del registro (null para nuevo).
 * @param modo - 'nuevo' | 'editar' | 'ver'.
 */
function abrirWizard(id: string | null, modo: ModoWizard): void {
    registroEditandoId = id;
    modoWizard = modo;
    pasoWizard = 1;

    const modal = contenedorRaiz?.querySelector('#modal-wizard');
    const titulo = contenedorRaiz?.querySelector('#wizard-titulo');
    if (!modal || !titulo) return;

    if (id) {
        const registro = registros.find(r => r.id === id);
        if (!registro) {
            mostrarMensaje('❌ No se encontró el registro.', 'error');
            return;
        }
        if (modo === 'ver') {
            titulo.textContent = `👁️ Ver accidente (ITEM ${registro.item})`;
        } else {
            titulo.textContent = `✏️ Editar accidente (ITEM ${registro.item})`;
        }
        rellenarFormulario(registro);
    } else {
        titulo.textContent = '➕ Nuevo accidente o incidente';
        limpiarFormulario();
    }

    aplicarModoWizard();
    actualizarWizard();
    modal.classList.add('abierto');
}

/**
 * Aplica el modo (nuevo/editar/ver) al formulario:
 * - Bloquea los inputs si es modo ver.
 * - Oculta el botón Guardar si es modo ver.
 */
function aplicarModoWizard(): void {
    if (!contenedorRaiz) return;
    const esVer = modoWizard === 'ver';

    contenedorRaiz.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        '.paso-contenido input, .paso-contenido textarea, .paso-contenido select'
    ).forEach(el => {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.readOnly = esVer;
        } else if (el instanceof HTMLSelectElement) {
            el.disabled = esVer;
        }
    });

    const btnGuardar = contenedorRaiz.querySelector<HTMLButtonElement>('#btn-wizard-guardar');
    if (btnGuardar) btnGuardar.classList.toggle('hidden', esVer || pasoWizard !== 4);
}

function cerrarWizard(): void {
    const modal = contenedorRaiz?.querySelector('#modal-wizard');
    if (modal) modal.classList.remove('abierto');
    registroEditandoId = null;
    pasoWizard = 1;
    modoWizard = 'nuevo';
}

function irAPaso(paso: number): void {
    if (paso < 1 || paso > 4) return;
    pasoWizard = paso;
    actualizarWizard();
}

function actualizarWizard(): void {
    if (!contenedorRaiz) return;
    const esVer = modoWizard === 'ver';

    contenedorRaiz.querySelectorAll<HTMLElement>('.paso-contenido').forEach(el => {
        const n = parseInt(el.dataset.pasoContenido ?? '0', 10);
        el.classList.toggle('activo', n === pasoWizard);
    });

    contenedorRaiz.querySelectorAll<HTMLElement>('.wizard-paso').forEach(el => {
        const n = parseInt(el.dataset.paso ?? '0', 10);
        el.classList.toggle('activo', n === pasoWizard);
        el.classList.toggle('completado', n < pasoWizard);
    });

    const btnAnterior = contenedorRaiz.querySelector<HTMLButtonElement>('#btn-wizard-anterior');
    const btnSiguiente = contenedorRaiz.querySelector<HTMLButtonElement>('#btn-wizard-siguiente');
    const btnGuardar = contenedorRaiz.querySelector<HTMLButtonElement>('#btn-wizard-guardar');

    if (btnAnterior) btnAnterior.disabled = pasoWizard === 1;
    if (btnSiguiente) btnSiguiente.classList.toggle('hidden', pasoWizard === 4);
    if (btnGuardar) btnGuardar.classList.toggle('hidden', esVer || pasoWizard !== 4);
}

function conectarEventosWizard(): void {
    if (!contenedorRaiz) return;

    const btnCerrar = contenedorRaiz.querySelector('#btn-cerrar-wizard');
    if (btnCerrar) btnCerrar.addEventListener('click', cerrarWizard);

    const btnCancelar = contenedorRaiz.querySelector('#btn-wizard-cancelar');
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarWizard);

    const btnAnterior = contenedorRaiz.querySelector('#btn-wizard-anterior');
    if (btnAnterior) btnAnterior.addEventListener('click', () => irAPaso(pasoWizard - 1));

    const btnSiguiente = contenedorRaiz.querySelector('#btn-wizard-siguiente');
    if (btnSiguiente) btnSiguiente.addEventListener('click', () => {
        if (validarPasoActual()) irAPaso(pasoWizard + 1);
    });

    const btnGuardar = contenedorRaiz.querySelector('#btn-wizard-guardar');
    if (btnGuardar) btnGuardar.addEventListener('click', guardarWizard);

    contenedorRaiz.querySelectorAll<HTMLElement>('.wizard-paso').forEach(el => {
        el.addEventListener('click', () => {
            const n = parseInt(el.dataset.paso ?? '0', 10);
            if (n && n <= pasoWizard + 1) irAPaso(n);
        });
    });
}

function validarPasoActual(): boolean {
    if (modoWizard === 'ver') return true;

    if (pasoWizard === 1) {
        const fechaEvento = leerInput('w-fechaEvento');
        const nombre = leerInput('w-nombreAccidentado');
        if (!fechaEvento) {
            mostrarMensaje('⚠️ La fecha del evento es obligatoria.', 'warning');
            return false;
        }
        if (!nombre) {
            mostrarMensaje('⚠️ El nombre del accidentado es obligatorio.', 'warning');
            return false;
        }
    }
    if (pasoWizard === 2) {
        const area = leerInput('w-area');
        if (!area) {
            mostrarMensaje('⚠️ El área es obligatoria.', 'warning');
            return false;
        }
    }
    if (pasoWizard === 3) {
        const descripcion = leerInput('w-descripcionDetallada');
        if (!descripcion) {
            mostrarMensaje('⚠️ La descripción detallada es obligatoria.', 'warning');
            return false;
        }
    }
    return true;
}

// ================================================================
// LEER / RELLENAR / LIMPIAR FORMULARIO
// ================================================================

function leerInput(id: string): string {
    const el = contenedorRaiz?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`);
    return el ? el.value.trim() : '';
}

function leerNumero(id: string): number {
    const v = parseInt(leerInput(id), 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
}

function leerRadio(name: string): boolean {
    const el = contenedorRaiz?.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
    return el ? el.value === 'si' : false;
}

function setRadio(name: string, valor: boolean): void {
    const target = valor ? 'si' : 'no';
    const el = contenedorRaiz?.querySelector<HTMLInputElement>(`input[name="${name}"][value="${target}"]`);
    if (el) el.checked = true;
}

function leerCheckbox(id: string): boolean {
    const el = contenedorRaiz?.querySelector<HTMLInputElement>(`#${id}`);
    return el ? el.checked : false;
}

function limpiarFormulario(): void {
    if (!contenedorRaiz) return;
    const hoy = new Date().toISOString().split('T')[0] ?? '';
    const set = (id: string, valor: string): void => {
        const el = contenedorRaiz?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`);
        if (el) el.value = valor;
    };

    set('w-fechaEvento', hoy);
    set('w-hora', '');
    set('w-tipo', 'AccidenteTrabajo');
    set('w-gravedad', 'Leve');
    set('w-nombreAccidentado', '');
    set('w-cedula', '');
    set('w-sexo', 'H');
    set('w-edad', '');
    set('w-tiempoTrabajo', '');
    set('w-ausentismoMesAccidente', '0');
    set('w-ausentismoMesSiguiente', '0');
    set('w-area', '');
    set('w-puesto', '');
    set('w-naturalezaLesion', '');
    set('w-parteCuerpo', '');
    set('w-agente', '');
    set('w-fuente', '');
    set('w-tipoContacto', '');
    set('w-descripcionLesion', '');
    set('w-condicionSubestandar', '');
    set('w-actoSubestandar', '');
    set('w-factoresTrabajo', '');
    set('w-factoresPersonales', '');
    set('w-descripcionDetallada', '');
    set('w-medidasCumplidas', '');
    set('w-estado', 'Registrado');

    setRadio('w-tareaHabitual', false);
    setRadio('w-usoEPP', false);

    const check = (id: string, valor: boolean): void => {
        const el = contenedorRaiz?.querySelector<HTMLInputElement>(`#${id}`);
        if (el) el.checked = valor;
    };
    check('w-actividadCapacitacion', false);
    check('w-actividadMantenimiento', false);
    check('w-actividadAseo', false);
    check('w-actividadAjusteHoras', false);
}

function rellenarFormulario(r: ISiniestro): void {
    if (!contenedorRaiz) return;
    const set = (id: string, valor: string): void => {
        const el = contenedorRaiz?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`);
        if (el) el.value = valor;
    };

    set('w-fechaEvento', r.fechaEvento);
    set('w-hora', r.hora);
    set('w-tipo', r.tipo);
    set('w-gravedad', r.gravedad);
    set('w-nombreAccidentado', r.nombreAccidentado);
    set('w-cedula', r.cedula);
    set('w-sexo', r.sexo);
    set('w-edad', r.edad ? String(r.edad) : '');
    set('w-tiempoTrabajo', r.tiempoTrabajo);
    set('w-ausentismoMesAccidente', String(r.ausentismoMesAccidente));
    set('w-ausentismoMesSiguiente', String(r.ausentismoMesSiguiente));
    set('w-area', r.area);
    set('w-puesto', r.puesto);
    set('w-naturalezaLesion', r.naturalezaLesion);
    set('w-parteCuerpo', r.parteCuerpo);
    set('w-agente', r.agente);
    set('w-fuente', r.fuente);
    set('w-tipoContacto', r.tipoContacto);
    set('w-descripcionLesion', r.descripcionLesion);
    set('w-condicionSubestandar', r.condicionSubestandar);
    set('w-actoSubestandar', r.actoSubestandar);
    set('w-factoresTrabajo', r.factoresTrabajo);
    set('w-factoresPersonales', r.factoresPersonales);
    set('w-descripcionDetallada', r.descripcionDetallada);
    set('w-medidasCumplidas', r.medidasCumplidas);
    set('w-estado', r.estado);

    setRadio('w-tareaHabitual', r.tareaHabitual);
    setRadio('w-usoEPP', r.usoEPP);

    const check = (id: string, valor: boolean): void => {
        const el = contenedorRaiz?.querySelector<HTMLInputElement>(`#${id}`);
        if (el) el.checked = valor;
    };
    check('w-actividadCapacitacion', r.actividadCapacitacion);
    check('w-actividadMantenimiento', r.actividadMantenimiento);
    check('w-actividadAseo', r.actividadAseo);
    check('w-actividadAjusteHoras', r.actividadAjusteHoras);
}

// ================================================================
// GUARDAR
// ================================================================

function guardarWizard(): void {
    if (!contenedorRaiz) return;
    if (modoWizard === 'ver') return;

    const fechaEvento = leerInput('w-fechaEvento');
    const nombreAccidentado = leerInput('w-nombreAccidentado');
    const area = leerInput('w-area');
    const descripcionDetallada = leerInput('w-descripcionDetallada');

    const validacion = validarRegistroNominal(
        fechaEvento,
        nombreAccidentado,
        leerNumero('w-ausentismoMesAccidente'),
        leerNumero('w-ausentismoMesSiguiente')
    );
    if (!validacion.ok) {
        mostrarMensaje(validacion.mensaje, 'error');
        return;
    }
    if (!area) {
        mostrarMensaje('⚠️ El área es obligatoria.', 'error');
        return;
    }
    if (!descripcionDetallada) {
        mostrarMensaje('⚠️ La descripción detallada es obligatoria.', 'error');
        return;
    }

    const partes = fechaEvento.split('-').map(Number);
    const year = partes[0] ?? 0;
    const month = partes[1] ?? 1;
    const day = partes[2] ?? 1;
    const fechaObj = new Date(year, month - 1, day);
    const diaSemana: DiaSemana = DIAS_SEMANA[fechaObj.getDay()] ?? 'Lu';

    const diasMes = leerNumero('w-ausentismoMesAccidente');
    const diasSig = leerNumero('w-ausentismoMesSiguiente');

    const registroExistente = registroEditandoId
        ? registros.find(r => r.id === registroEditandoId)
        : undefined;

    const base: ISiniestro = {
        id: registroEditandoId ?? generarIdRegistro(),
        empresaId: nit,
        item: registroExistente
            ? registroExistente.item
            : calcularUltimoItem() + 1,
        anio: String(year),
        fechaCreacion: registroExistente ? registroExistente.fechaCreacion : new Date(),
        fechaActualizacion: new Date(),
        fechaEvento,
        mes: month,
        dia: day,
        hora: leerInput('w-hora'),
        diaSemana,
        ausentismoMesAccidente: diasMes,
        ausentismoMesSiguiente: diasSig,
        totalDiasPerdidos: diasMes + diasSig,
        nombreAccidentado,
        cedula: leerInput('w-cedula'),
        sexo: (leerInput('w-sexo') === 'M' ? 'M' : 'H') as SexoTrabajador,
        edad: leerNumero('w-edad'),
        tiempoTrabajo: leerInput('w-tiempoTrabajo'),
        tareaHabitual: leerRadio('w-tareaHabitual'),
        usoEPP: leerRadio('w-usoEPP'),
        area,
        puesto: leerInput('w-puesto'),
        naturalezaLesion: leerInput('w-naturalezaLesion'),
        parteCuerpo: leerInput('w-parteCuerpo'),
        descripcionLesion: leerInput('w-descripcionLesion'),
        agente: leerInput('w-agente'),
        fuente: leerInput('w-fuente'),
        tipoContacto: leerInput('w-tipoContacto'),
        condicionSubestandar: leerInput('w-condicionSubestandar'),
        actoSubestandar: leerInput('w-actoSubestandar'),
        factoresTrabajo: leerInput('w-factoresTrabajo'),
        factoresPersonales: leerInput('w-factoresPersonales'),
        descripcionDetallada,
        medidasCumplidas: leerInput('w-medidasCumplidas'),
        actividadCapacitacion: leerCheckbox('w-actividadCapacitacion'),
        actividadMantenimiento: leerCheckbox('w-actividadMantenimiento'),
        actividadAseo: leerCheckbox('w-actividadAseo'),
        actividadAjusteHoras: leerCheckbox('w-actividadAjusteHoras'),
        estado: leerInput('w-estado') as EstadoSiniestro,
        gravedad: leerInput('w-gravedad') as GravedadLesion,
        tipo: leerInput('w-tipo') as TipoSiniestro
    };

    let ok: boolean;
    if (registroEditandoId) {
        ok = storageSiniestros.actualizar(registroEditandoId, base);
    } else {
        ok = storageSiniestros.guardar(base);
    }

    if (!ok) {
        mostrarMensaje('❌ No se pudo guardar el registro.', 'error');
        return;
    }

    const eraEdicion = registroEditandoId !== null;
    cerrarWizard();
    cargarRegistros();
    actualizarEncabezado();
    renderizarKPIs();
    renderizarGrid();

    mostrarMensaje(
        eraEdicion
            ? '✅ Registro actualizado.'
            : '✅ Registro guardado correctamente.',
        'success'
    );
}

function eliminarRegistro(id: string): void {
    const reg = registros.find(r => r.id === id);
    if (!reg) return;

    const ok = confirm(`¿Eliminar el registro ITEM ${reg.item} de "${reg.nombreAccidentado}"?`);
    if (!ok) return;

    if (storageSiniestros.eliminar(id)) {
        cargarRegistros();
        actualizarEncabezado();
        renderizarKPIs();
        renderizarGrid();
        mostrarMensaje('🗑️ Registro eliminado.', 'success');
    } else {
        mostrarMensaje('❌ No se pudo eliminar el registro.', 'error');
    }
}

// ================================================================
// HELPERS
// ================================================================

function calcularUltimoItem(): number {
    return registros.reduce((max, r) => Math.max(max, r.item), 0);
}

function actualizarEncabezado(): void {
    const total = contenedorRaiz?.querySelector<HTMLInputElement>('#reg-total');
    const ultimoItem = contenedorRaiz?.querySelector<HTMLInputElement>('#reg-ultimo-item');
    if (total) total.value = String(registros.length);
    if (ultimoItem) ultimoItem.value = String(calcularUltimoItem());
}

function generarIdRegistro(): string {
    return `SIN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning'): void {
    const cont = contenedorRaiz?.querySelector<HTMLElement>('#mensaje-registro');
    if (!cont) return;
    cont.className = `alert ${tipo}`;
    cont.textContent = mensaje;
    window.setTimeout(() => {
        cont.className = 'alert hidden';
        cont.textContent = '';
    }, 4500);
}

function etiquetaTipo(t: TipoSiniestro): string {
    switch (t) {
        case 'AccidenteTrabajo': return 'Accidente de trabajo';
        case 'Incidente': return 'Incidente';
        case 'EnfermedadLaboral': return 'Enfermedad laboral';
        case 'AccidenteComun': return 'Accidente común';
        case 'Otro': return 'Otro';
    }
}

function etiquetaEstado(e: EstadoSiniestro): string {
    switch (e) {
        case 'Registrado': return 'Registrado';
        case 'EnInvestigacion': return 'En investigación';
        case 'Cerrado': return 'Cerrado';
        case 'ReportadoARL': return 'Reportado a ARL';
    }
}

/**
 * Exporta el Registro Nominal completo del año a un archivo .xls
 * usando el helper reutilizable exportarModulo() de src/exportar-excel.ts.
 * 
 * No usa la librería xlsx porque el navegador no resuelve el módulo
 * "xlsx" sin un bundler. El helper exportar-excel.ts genera un .xls
 * (HTML con extensión .xls) que Excel/LibreOffice abren sin problema.
 */
function exportarExcel(): void {
    if (registros.length === 0) {
        mostrarMensaje('⚠️ No hay registros para exportar.', 'warning');
        return;
    }

    const usuario = obtenerUsuarioSesion();
    const usuarioNombre = usuario?.nombreCompleto || 'Usuario';

    const columnas: string[] = [
        'ITEM', 'Mes', 'Día', 'Hora', 'Semana',
        'Aus. mes acc.', 'Aus. mes sig.', 'Total días perdidos',
        'Nombre', 'Cédula', 'Sexo', 'Edad', 'Tiempo de trabajo',
        'Tarea habitual', 'Uso EPP',
        'Área', 'Puesto',
        'Naturaleza lesión', 'Parte del cuerpo', 'Descripción lesión',
        'Agente', 'Fuente', 'Tipo de contacto',
        'Condición subestándar', 'Acto subestándar',
        'Factores de trabajo', 'Factores personales',
        'Descripción detallada',
        'Medidas cumplidas',
        'Capacitación', 'Mantenimiento', 'Aseo', 'Ajuste horas'
    ];

    const filas: (string | number)[][] = registros.map(r => [
        r.item,
        NOMBRES_MESES_LARGOS[r.mes - 1] ?? '',
        r.dia,
        r.hora || '',
        r.diaSemana,
        r.ausentismoMesAccidente,
        r.ausentismoMesSiguiente,
        r.totalDiasPerdidos,
        r.nombreAccidentado,
        r.cedula,
        r.sexo,
        r.edad,
        r.tiempoTrabajo,
        r.tareaHabitual ? 'Sí' : 'No',
        r.usoEPP ? 'Sí' : 'No',
        r.area,
        r.puesto,
        r.naturalezaLesion,
        r.parteCuerpo,
        r.descripcionLesion,
        r.agente,
        r.fuente,
        r.tipoContacto,
        r.condicionSubestandar,
        r.actoSubestandar,
        r.factoresTrabajo,
        r.factoresPersonales,
        r.descripcionDetallada,
        r.medidasCumplidas,
        r.actividadCapacitacion ? 'X' : '',
        r.actividadMantenimiento ? 'X' : '',
        r.actividadAseo ? 'X' : '',
        r.actividadAjusteHoras ? 'X' : ''
    ]);

    const ok = exportarModulo({
        tituloModulo: `M25 – Registro de Accidentes e Incidentes ${anio}`,
        empresaNombre: empresaNombre || 'Empresa',
        empresaNit: nit,
        usuarioNombre,
        tablas: [
            {
                titulo: 'Registro Nominal de Accidentes e Incidentes',
                columnas,
                filas
            }
        ]
    });

    if (ok) {
        mostrarMensaje('📊 Archivo Excel generado correctamente.', 'success');
    } else {
        mostrarMensaje('❌ No se pudo generar el archivo Excel.', 'error');
    }
}

/**
 * Vuelve al módulo principal.
 * Dispara CustomEvent 'siniestralidad:volver' para que la pestaña padre
 * pueda reaccionar (patrón M21 con 'comite:volver-listado').
 */
function volverAlModulo(): void {
    localStorage.removeItem(LS_EMPRESA_NIT);

    try {
        window.dispatchEvent(new CustomEvent('siniestralidad:volver'));
    } catch (error) {
        console.error('M25 Registro: error al emitir evento de vuelta:', error);
    }

    window.close();

    window.setTimeout(() => {
        window.location.href = '../../index.html#M25-Gestion-Siniestralidad';
    }, 200);
}