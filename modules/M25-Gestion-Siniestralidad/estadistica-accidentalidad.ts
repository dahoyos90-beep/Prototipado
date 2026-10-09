/**
 * modules/M25-Gestion-Siniestralidad/estadistica-accidentalidad.ts
 * 
 * Lógica del HTML independiente "Estadística de Accidentalidad" del
 * módulo M25 - Gestión de Siniestralidad.
 * 
 * Se abre en pestaña nueva desde gestion-siniestralidad.ts.
 * Lee la empresa activa desde localStorage ('siniestralidadEmpresaNit').
 * 
 * Responsabilidades:
 * - Cargar el CSS del módulo dinámicamente.
 * - Cargar / crear la configuración anual de la empresa.
 * - Cargar / crear los 12 registros mensuales del año.
 * - Construir el encabezado naranja estilo Excel.
 * - Renderizar el panel de jornada (48h/42h/personalizada + HHT automática).
 * - Renderizar 4 sub-pestañas internas:
 *     • Mes a mes    → matriz editable + indicadores calculados.
 *     • Consolidado  → totales anuales + indicadores ponderados.
 *     • Estadísticas → barras CSS (IF, IS, ILI, %Inv) + semáforo vs metas.
 *     • Análisis     → 4 textareas por trimestre.
 * - Guardar cambios en storage.
 * - Exportar a Excel (.xls) con el helper reutilizable exportar-excel.ts.
 * - Enviar indicadores a M23 (actualiza consolidado + CustomEvent).
 * - Imprimir y volver al módulo principal.
 * 
 * Basado en:
 * - NTC 3701 (constantes y fórmulas IF / IS / ILI)
 * - Resolución 0312 de 2019 (indicadores mínimos del SG-SST)
 * - Ley 2101 de 2021 (jornada laboral 42h vs 48h)
 * - Decreto 1072 de 2015 (evaluación de indicadores)
 * 
 * @version 1.0.2
 *  - Quitado import * as XLSX from 'xlsx' (no resuelve en navegador).
 *  - Exportación de Excel vía exportarModulo() de src/exportar-excel.ts.
 *  - Corregido bug: obtenerPorId(nit) buscaba por ID y no encontraba la
 *    empresa. Se agrega fallback por NIT.
 *  - Limpiado el bloque redundante en actualizarConsolidadosDeTablas().
 * 
 * @version 1.0.1
 *  - Implementada exportación real a Excel con xlsx@0.18.5.
 *  - Implementado envío funcional a M23 (actualiza consolidado + CustomEvent).
 *  - Limpiado el bloque redundante en actualizarTablaIndicadores().
 * 
 * @version 1.0.0
 * @since 2026-10-09
 */

import { escaparHTML } from '../../src/utils.js';
import {
    storageEmpresas,
    storageConfiguracionesSiniestralidad,
    storageRegistrosMensualesSiniestralidad,
    storageConsolidadosAnualesSiniestralidad,
    storageAnalisisTrimestralesSiniestralidad,
    storageSiniestros
} from '../../src/storage.js';
import {
    K_SINIESTRALIDAD,
    K_ILI,
    HORAS_MES_48H,
    HORAS_MES_42H,
    NOMBRES_MESES,
    calcularIndicadoresMensuales,
    calcularConsolidadoAnual,
    calcularTop5Meses,
    calcularTop5Areas,
    contarGravedades,
    contarTiposSiniestro,
    formatearIndicador,
    nombreMes,
    generarTextoInterpretativo,
    sugerirEnfoqueAnalisis,
    validarRegistroMensual
} from '../../src/siniestralidad-utils.js';
import { exportarModulo } from '../../src/exportar-excel.js';
import { obtenerUsuarioSesion } from '../../src/auth.js';
import type { IConfiguracionSiniestralidad, JornadaReferencia } from '../../src/interfaces/IConfiguracionSiniestralidad.js';
import type { IRegistroMensualSiniestralidad } from '../../src/interfaces/IRegistroMensualSiniestralidad.js';
import type { EscenarioJornada, IIndicadoresMensualesSiniestralidad } from '../../src/interfaces/IIndicadoresMensualesSiniestralidad.js';
import type { IConsolidadoAnualSiniestralidad } from '../../src/interfaces/IConsolidadoAnualSiniestralidad.js';
import type { IAnalisisTrimestralSiniestralidad, NumeroTrimestre } from '../../src/interfaces/IAnalisisTrimestralSiniestralidad.js';
import type { ISiniestro } from '../../src/interfaces/ISiniestro.js';

// ================================================================
// CONSTANTES
// ================================================================

const CSS_LINK_ID = 'modulo-siniestralidad-estadistica-css';
const CSS_HREF = 'modules/M25-Gestion-Siniestralidad/estadistica-accidentalidad.css';
const LS_EMPRESA_NIT = 'siniestralidadEmpresaNit';

/** Nombres de archivo al exportar. */
const NOMBRE_HOJA_EXCEL = 'Accidentalidad';

/** Definición de las 6 variables operativas de la matriz mensual. */
const VARIABLES_MENSUALES: ReadonlyArray<{
    clave: keyof Pick<
        IRegistroMensualSiniestralidad,
        'numTrabajadores' | 'hhtManual' | 'sumAT' | 'sumDiasPerdidos' | 'sumATinc' | 'sumATmortal' | 'investigaciones'
    >;
    etiqueta: string;
}> = [
    { clave: 'numTrabajadores', etiqueta: 'N° de trabajadores' },
    { clave: 'hhtManual',       etiqueta: 'Total horas hombre trabajadas (HHT)' },
    { clave: 'sumAT',           etiqueta: 'Suma de accidentes de trabajo' },
    { clave: 'sumDiasPerdidos', etiqueta: 'Suma de días perdidos por AT' },
    { clave: 'sumATinc',        etiqueta: 'Suma de AT con incapacidad' },
    { clave: 'sumATmortal',     etiqueta: 'Suma de AT mortales' },
    { clave: 'investigaciones', etiqueta: 'Total de investigaciones realizadas' }
];

/** Metadatos de los 5 indicadores calculados de la matriz. */
const INDICADORES_MENSUALES: ReadonlyArray<{
    clave: keyof Pick<
        IIndicadoresMensualesSiniestralidad,
        'if_AT' | 'if_inc' | 'is_AT' | 'ili' | 'porcentajeInvestigaciones'
    >;
    etiqueta: string;
    sufijo: string;
}> = [
    { clave: 'if_AT',                     etiqueta: 'Índice de Frecuencia (IF)',                sufijo: '' },
    { clave: 'if_inc',                    etiqueta: 'Índice de Frecuencia con Incapacidad',     sufijo: '' },
    { clave: 'is_AT',                     etiqueta: 'Índice de Severidad (IS)',                 sufijo: '' },
    { clave: 'ili',                       etiqueta: 'Índice de Lesiones Incapacitantes (ILI)',  sufijo: '' },
    { clave: 'porcentajeInvestigaciones', etiqueta: '% Cumplimiento de Investigaciones',        sufijo: '%' }
];

/** Nombres de trimestres. */
const NOMBRES_TRIMESTRES: ReadonlyArray<{ n: NumeroTrimestre; titulo: string; meses: string }> = [
    { n: 1, titulo: '1er Trimestre', meses: 'Enero – Febrero – Marzo' },
    { n: 2, titulo: '2do Trimestre', meses: 'Abril – Mayo – Junio' },
    { n: 3, titulo: '3er Trimestre', meses: 'Julio – Agosto – Septiembre' },
    { n: 4, titulo: '4to Trimestre', meses: 'Octubre – Noviembre – Diciembre' }
];

// ================================================================
// ESTADO
// ================================================================

let contenedorRaiz: HTMLElement | null = null;
let nit = '';
let empresaNombre = '';
let anio = String(new Date().getFullYear());
let config: IConfiguracionSiniestralidad | null = null;
let registros: IRegistroMensualSiniestralidad[] = [];
let analisis: IAnalisisTrimestralSiniestralidad[] = [];
let escenario: EscenarioJornada = '48h';
let hayCambios = false;
let subTabActiva: 'meses' | 'consolidado' | 'estadisticas' | 'analisis' = 'meses';

// ================================================================
// ARRANQUE
// ================================================================

function arrancar(): void {
    const contenedor = document.getElementById('estadistica-accidentalidad-container');
    if (!contenedor) {
        console.error('❌ M25 Estadística: No se encontró #estadistica-accidentalidad-container.');
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
    console.info('📊 M25 Estadística: Inicializando...');

    cargarCSSModulo();

    nit = localStorage.getItem(LS_EMPRESA_NIT) || '';
    if (!nit) {
        contenedor.innerHTML = `<div class="card"><p class="text-muted">⚠️ No se especificó la empresa.</p></div>`;
        console.error('M25 Estadística: No hay siniestralidadEmpresaNit en localStorage.');
        return;
    }

    // Buscar la empresa por ID y, si no, por NIT (patrón M24)
    const empresaPorId = storageEmpresas.obtenerPorId(nit);
    if (empresaPorId) {
        empresaNombre = empresaPorId.razonSocial;
    } else {
        const empresaPorNit = storageEmpresas.obtenerTodos().find(e => e.nit === nit);
        empresaNombre = empresaPorNit ? empresaPorNit.razonSocial : 'Empresa';
    }

    config = cargarOCrearConfiguracion(empresaNombre, nit);
    registros = cargarOCrearRegistros(config.id);
    analisis = cargarOCrearAnalisis(config.id);
    escenario = (config.jornadaReferencia === '42h') ? '42h' : '48h';

    construirDashboard(contenedor);

    window.addEventListener('beforeunload', (e) => {
        if (hayCambios) e.preventDefault();
    });

    console.info(`✅ M25 Estadística: Empresa ${empresaNombre} cargada (${anio}).`);
}

// ================================================================
// CARGA / CREACIÓN DE DATOS
// ================================================================

function cargarOCrearConfiguracion(razonSocial: string, nitFormateado: string): IConfiguracionSiniestralidad {
    const existente = storageConfiguracionesSiniestralidad
        .obtenerTodos()
        .find(c => c.empresaId === nit && c.anio === anio);

    if (existente) return existente;

    const nueva: IConfiguracionSiniestralidad = {
        id: `${nit}__${anio}`,
        empresaId: nit,
        anio,
        razonSocial,
        nit: nitFormateado,
        sedeObraProceso: '',
        responsableSST: '',
        version: '1',
        vigenciaAnio: anio,
        jornadaReferencia: '48h',
        horasSemanales: 48,
        horasMensuales: HORAS_MES_48H,
        hhtAutomatica: true,
        constK: K_SINIESTRALIDAD,
        constKILI: K_ILI,
        metas: {
            metaIF: 2.0,
            metaIFInc: null,
            metaIS: 15.0,
            metaILI: 3.0,
            metaPorcentajeInvestigaciones: 95,
            metaProporcionMortales: 0
        },
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
    };

    storageConfiguracionesSiniestralidad.guardar(nueva);
    return nueva;
}

function cargarOCrearRegistros(configId: string): IRegistroMensualSiniestralidad[] {
    const existentes = storageRegistrosMensualesSiniestralidad
        .obtenerTodos()
        .filter(r => r.empresaId === nit && r.anio === anio);

    const resultado: IRegistroMensualSiniestralidad[] = [];

    for (let mes = 1; mes <= 12; mes++) {
        const existente = existentes.find(r => r.mes === mes);
        if (existente) {
            resultado.push(existente);
        } else {
            const nuevo: IRegistroMensualSiniestralidad = {
                id: `${nit}__${anio}__${String(mes).padStart(2, '0')}`,
                empresaId: nit,
                configId,
                anio,
                mes,
                numTrabajadores: 0,
                hhtManual: 0,
                hhtCalculada: 0,
                sumAT: 0,
                sumDiasPerdidos: 0,
                sumATinc: 0,
                sumATmortal: 0,
                investigaciones: 0,
                editadoManualmente: false,
                observaciones: '',
                fechaCreacion: new Date(),
                fechaActualizacion: new Date(),
                actualizadoPor: 'sistema'
            };
            storageRegistrosMensualesSiniestralidad.guardar(nuevo);
            resultado.push(nuevo);
        }
    }

    return resultado;
}

function cargarOCrearAnalisis(configId: string): IAnalisisTrimestralSiniestralidad[] {
    const existentes = storageAnalisisTrimestralesSiniestralidad
        .obtenerTodos()
        .filter(a => a.empresaId === nit && a.anio === anio);

    const resultado: IAnalisisTrimestralSiniestralidad[] = [];

    for (const t of NOMBRES_TRIMESTRES) {
        const existente = existentes.find(a => a.trimestre === t.n);
        if (existente) {
            resultado.push(existente);
        } else {
            const nuevo: IAnalisisTrimestralSiniestralidad = {
                id: `${nit}__${anio}__T${t.n}`,
                empresaId: nit,
                configId,
                anio,
                trimestre: t.n,
                meses: t.meses,
                texto: '',
                guardado: false,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date(),
                actualizadoPor: 'sistema'
            };
            storageAnalisisTrimestralesSiniestralidad.guardar(nuevo);
            resultado.push(nuevo);
        }
    }

    return resultado;
}

// ================================================================
// HELPERS GENERALES
// ================================================================

function cargarCSSModulo(): void {
    if (document.getElementById(CSS_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = CSS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    document.head.appendChild(link);
}

function mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning'): void {
    const cont = contenedorRaiz?.querySelector('#mensaje-estadistica');
    if (!cont) return;
    cont.textContent = mensaje;
    cont.className = `alert ${tipo}`;
    cont.classList.remove('hidden');
    window.setTimeout(() => cont.classList.add('hidden'), 4500);
}

function obtenerIndicadoresDelAnio(): IIndicadoresMensualesSiniestralidad[] {
    if (!config) return [];
    return registros
        .map(r => calcularIndicadoresMensuales(r, config!, escenario))
        .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

function actualizarConfig(parcial: Partial<IConfiguracionSiniestralidad>): void {
    if (!config) return;
    config = { ...config, ...parcial, fechaActualizacion: new Date() };
    storageConfiguracionesSiniestralidad.actualizar(config.id, config);
    hayCambios = true;
}

// ================================================================
// CONSTRUCCIÓN DEL DASHBOARD
// ================================================================

function construirDashboard(contenedor: HTMLElement): void {
    if (!config) return;

    contenedor.innerHTML = `
        ${construirBarraSuperior()}
        ${construirEncabezadoExcel()}
        ${construirPanelJornada()}
        <div class="card">
            ${construirSubTabs()}
            <div id="sub-panel-meses" class="sub-panel"></div>
            <div id="sub-panel-consolidado" class="sub-panel hidden"></div>
            <div id="sub-panel-estadisticas" class="sub-panel hidden"></div>
            <div id="sub-panel-analisis" class="sub-panel hidden"></div>
            <div id="mensaje-estadistica" class="alert hidden"></div>
        </div>
        ${construirAccionesInferiores()}
    `;

    conectarEventosEstructura();
    renderizarSubTabActiva();
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

function construirEncabezadoExcel(): string {
    if (!config) return '';
    return `
        <div class="encabezado-excel">
            <div class="encabezado-excel-titulo">INDICADORES DE ACCIDENTALIDAD</div>
            <div class="encabezado-excel-subtitulo">
                Resolución 0312 de 2019 · NTC 3701 · Ley 2101 de 2021
            </div>
            <div class="encabezado-excel-grid">
                <div class="encabezado-campo">
                    <label for="enc-razon-social">Empresa</label>
                    <input type="text" id="enc-razon-social" value="${escaparHTML(config.razonSocial)}" readonly />
                </div>
                <div class="encabezado-campo">
                    <label for="enc-nit">NIT</label>
                    <input type="text" id="enc-nit" value="${escaparHTML(config.nit)}" readonly />
                </div>
                <div class="encabezado-campo">
                    <label for="enc-anio">Año / Vigencia</label>
                    <input type="text" id="enc-anio" value="${escaparHTML(config.anio)}" readonly />
                </div>
                <div class="encabezado-campo">
                    <label for="enc-sede">Sede / Obra / Proceso</label>
                    <input type="text" id="enc-sede" value="${escaparHTML(config.sedeObraProceso)}" />
                </div>
                <div class="encabezado-campo">
                    <label for="enc-responsable">Responsable SST</label>
                    <input type="text" id="enc-responsable" value="${escaparHTML(config.responsableSST)}" />
                </div>
                <div class="encabezado-campo">
                    <label for="enc-version">Versión</label>
                    <input type="text" id="enc-version" value="${escaparHTML(config.version)}" />
                </div>
                <div class="encabezado-campo">
                    <label for="enc-k">Constante K</label>
                    <input type="text" id="enc-k" value="${config.constK}" readonly />
                </div>
                <div class="encabezado-campo">
                    <label for="enc-kili">Constante K_ILI</label>
                    <input type="text" id="enc-kili" value="${config.constKILI}" readonly />
                </div>
            </div>
        </div>
    `;
}

function construirPanelJornada(): string {
    if (!config) return '';
    const esPersonalizada = config.jornadaReferencia === 'personalizada';
    return `
        <div class="panel-jornada">
            <div class="grupo-jornada">
                <label>Jornada de referencia:</label>
                <div class="jornada-opciones" role="radiogroup" aria-label="Jornada de referencia">
                    <input type="radio" id="jornada-48" name="jornada" value="48h"
                           ${config.jornadaReferencia === '48h' ? 'checked' : ''} />
                    <label for="jornada-48">48 h/sem</label>

                    <input type="radio" id="jornada-42" name="jornada" value="42h"
                           ${config.jornadaReferencia === '42h' ? 'checked' : ''} />
                    <label for="jornada-42">42 h/sem</label>

                    <input type="radio" id="jornada-personalizada" name="jornada" value="personalizada"
                           ${esPersonalizada ? 'checked' : ''} />
                    <label for="jornada-personalizada">Personalizada</label>
                </div>
                <div class="jornada-personalizada">
                    <span>Horas/sem:</span>
                    <input type="number" id="jornada-horas" min="1" max="80"
                           value="${config.horasSemanales}" ${esPersonalizada ? '' : 'readonly'} />
                </div>
            </div>

            <label class="interruptor-hht" for="chk-hht-automatica">
                <input type="checkbox" id="chk-hht-automatica"
                       ${config.hhtAutomatica ? 'checked' : ''} />
                🔒 HHT automática (jornada × trabajadores)
            </label>
        </div>
    `;
}

function construirSubTabs(): string {
    const tabs: Array<{ id: typeof subTabActiva; label: string }> = [
        { id: 'meses',        label: '📅 Mes a mes' },
        { id: 'consolidado',  label: '📈 Consolidado' },
        { id: 'estadisticas', label: '📉 Estadísticas' },
        { id: 'analisis',     label: '📝 Análisis Trimestral' }
    ];
    return `
        <div class="sub-tabs" role="tablist">
            ${tabs.map(t => `
                <button type="button" class="sub-tab ${t.id === subTabActiva ? 'activa' : ''}"
                        data-subtab="${t.id}" role="tab">
                    ${t.label}
                </button>
            `).join('')}
        </div>
    `;
}

function construirAccionesInferiores(): string {
    return `
        <div class="acciones-inferiores">
            <button id="btn-cancelar" class="btn btn-outline" type="button">Cancelar</button>
            <button id="btn-enviar-m23" class="btn btn-primary" type="button">📤 Enviar a M23</button>
            <button id="btn-guardar" class="btn btn-success" type="button">💾 Guardar cambios</button>
        </div>
    `;
}

// ================================================================
// EVENTOS DE ESTRUCTURA
// ================================================================

function conectarEventosEstructura(): void {
    if (!contenedorRaiz) return;

    const btnVolver = contenedorRaiz.querySelector('#btn-volver');
    if (btnVolver) btnVolver.addEventListener('click', confirmarVolver);

    const btnImprimir = contenedorRaiz.querySelector('#btn-imprimir');
    if (btnImprimir) btnImprimir.addEventListener('click', () => window.print());

    const btnExportar = contenedorRaiz.querySelector('#btn-exportar-excel');
    if (btnExportar) btnExportar.addEventListener('click', exportarExcel);

    const btnGuardar = contenedorRaiz.querySelector('#btn-guardar');
    if (btnGuardar) btnGuardar.addEventListener('click', guardarTodo);

    const btnCancelar = contenedorRaiz.querySelector('#btn-cancelar');
    if (btnCancelar) btnCancelar.addEventListener('click', confirmarVolver);

    const btnM23 = contenedorRaiz.querySelector('#btn-enviar-m23');
    if (btnM23) btnM23.addEventListener('click', enviarAM23);

    contenedorRaiz.querySelectorAll<HTMLButtonElement>('.sub-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.subtab as typeof subTabActiva | undefined;
            if (!id) return;
            subTabActiva = id;
            contenedorRaiz?.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('activa'));
            btn.classList.add('activa');
            renderizarSubTabActiva();
        });
    });

    ['#enc-sede', '#enc-responsable', '#enc-version'].forEach(sel => {
        const input = contenedorRaiz?.querySelector<HTMLInputElement>(sel);
        if (input) input.addEventListener('input', () => { hayCambios = true; });
    });

    contenedorRaiz.querySelectorAll<HTMLInputElement>('input[name="jornada"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const valor = radio.value as JornadaReferencia;
            const horasSemanales = valor === '48h' ? 48 : valor === '42h' ? 42 : (config?.horasSemanales ?? 48);
            const horasMensuales = valor === '48h' ? HORAS_MES_48H : valor === '42h' ? HORAS_MES_42H : horasSemanales * 5;
            escenario = (valor === '42h') ? '42h' : '48h';
            actualizarConfig({ jornadaReferencia: valor, horasSemanales, horasMensuales });
            renderizarPanelJornada();
            renderizarSubTabActiva();
        });
    });

    const inputHoras = contenedorRaiz.querySelector<HTMLInputElement>('#jornada-horas');
    if (inputHoras) {
        inputHoras.addEventListener('input', () => {
            const horas = parseInt(inputHoras.value, 10) || 0;
            if (horas > 0) {
                actualizarConfig({ horasSemanales: horas, horasMensuales: horas * 5 });
                renderizarSubTabActiva();
            }
        });
    }

    const chkHHT = contenedorRaiz.querySelector<HTMLInputElement>('#chk-hht-automatica');
    if (chkHHT) {
        chkHHT.addEventListener('change', () => {
            actualizarConfig({ hhtAutomatica: chkHHT.checked });
            renderizarSubTabActiva();
        });
    }
}

function renderizarPanelJornada(): void {
    if (!contenedorRaiz || !config) return;
    const panel = contenedorRaiz.querySelector('.panel-jornada');
    if (!panel) return;
    const temp = document.createElement('div');
    temp.innerHTML = construirPanelJornada();
    const nuevo = temp.firstElementChild;
    if (nuevo) {
        panel.replaceWith(nuevo);
        conectarEventosEstructura();
    }
}

// ================================================================
// RENDERIZADO DE SUB-PESTAÑAS
// ================================================================

function renderizarSubTabActiva(): void {
    if (!contenedorRaiz || !config) return;

    const panelMeses = contenedorRaiz.querySelector('#sub-panel-meses');
    const panelConsolidado = contenedorRaiz.querySelector('#sub-panel-consolidado');
    const panelEstadisticas = contenedorRaiz.querySelector('#sub-panel-estadisticas');
    const panelAnalisis = contenedorRaiz.querySelector('#sub-panel-analisis');
    if (!panelMeses || !panelConsolidado || !panelEstadisticas || !panelAnalisis) return;

    panelMeses.classList.toggle('hidden', subTabActiva !== 'meses');
    panelConsolidado.classList.toggle('hidden', subTabActiva !== 'consolidado');
    panelEstadisticas.classList.toggle('hidden', subTabActiva !== 'estadisticas');
    panelAnalisis.classList.toggle('hidden', subTabActiva !== 'analisis');

    if (subTabActiva === 'meses') renderizarMeses(panelMeses as HTMLElement);
    if (subTabActiva === 'consolidado') renderizarConsolidado(panelConsolidado as HTMLElement);
    if (subTabActiva === 'estadisticas') renderizarEstadisticas(panelEstadisticas as HTMLElement);
    if (subTabActiva === 'analisis') renderizarAnalisis(panelAnalisis as HTMLElement);
}

// ================================================================
// SUB-PESTAÑA MES A MES
// ================================================================

function renderizarMeses(panel: HTMLElement): void {
    if (!config) return;

    panel.innerHTML = `
        <h3>📅 Datos Operativos del Año ${escaparHTML(config.anio)}</h3>
        <p style="font-size:0.85rem;color:#64748B;margin-bottom:1rem;">
            Ingrese los valores mes a mes. El Consolidado se calcula automáticamente.
            Los indicadores aparecen en la tabla inferior (solo lectura).
        </p>
        ${construirTablaVariables()}
        <h3 style="margin-top:1.5rem;">📊 Indicadores Calculados (NTC 3701)</h3>
        <p style="font-size:0.85rem;color:#64748B;margin-bottom:1rem;">
            Valores calculados automáticamente. La división por cero se muestra como "—".
        </p>
        ${construirTablaIndicadores()}
    `;

    panel.querySelectorAll<HTMLInputElement>('input[data-mes][data-clave]').forEach(input => {
        input.addEventListener('input', () => {
            const mes = parseInt(input.dataset.mes ?? '0', 10);
            const clave = input.dataset.clave as keyof IRegistroMensualSiniestralidad | undefined;
            if (!clave) return;
            const registro = registros.find(r => r.mes === mes);
            if (!registro) return;

            const valor = Math.max(0, parseInt(input.value, 10) || 0);
            (registro as unknown as Record<string, number>)[clave] = valor;
            registro.editadoManualmente = true;
            registro.fechaActualizacion = new Date();
            registro.actualizadoPor = 'usuario';
            hayCambios = true;

            const validacion = validarRegistroMensual(registro);
            if (!validacion.ok) {
                input.classList.add('input-error');
                mostrarMensaje(validacion.mensaje, 'warning');
            } else {
                input.classList.remove('input-error');
            }

            actualizarConsolidadosDeTablas();
        });
    });
}

function construirTablaVariables(): string {
    if (!config) return '';

    const cabeceraMeses = NOMBRES_MESES.map(n => {
        const abrev = n.slice(0, 3).toUpperCase();
        return `<th title="${escaparHTML(n)}">${abrev}</th>`;
    }).join('');

    const filas = VARIABLES_MENSUALES.map(v => {
        const celdas = registros.map(r => {
            const valor = (r as unknown as Record<string, number>)[v.clave] ?? 0;
            return `
                <td>
                    <input type="number" min="0" step="1"
                           data-mes="${r.mes}" data-clave="${v.clave}"
                           value="${valor}" />
                </td>
            `;
        }).join('');
        const total = registros.reduce((sum, r) => sum + ((r as unknown as Record<string, number>)[v.clave] ?? 0), 0);
        return `
            <tr>
                <td class="td-concepto">${escaparHTML(v.etiqueta)}</td>
                ${celdas}
                <td class="td-consolidado" data-consolidado-variable="${v.clave}">${total}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="tabla-scroll">
            <table class="tabla-matriz-mensual" id="tabla-variables">
                <thead>
                    <tr>
                        <th class="th-concepto">Concepto</th>
                        ${cabeceraMeses}
                        <th class="th-consolidado">Consolidado</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
}

function construirTablaIndicadores(): string {
    const indicadores = obtenerIndicadoresDelAnio();
    const porMes = new Map<number, IIndicadoresMensualesSiniestralidad>();
    indicadores.forEach(i => {
        const mes = parseInt(i.periodo.split('-')[1] ?? '0', 10);
        porMes.set(mes, i);
    });

    const cabeceraMeses = NOMBRES_MESES.map(n => {
        const abrev = n.slice(0, 3).toUpperCase();
        return `<th title="${escaparHTML(n)}">${abrev}</th>`;
    }).join('');

    const filas = INDICADORES_MENSUALES.map(ind => {
        const celdas = registros.map(r => {
            const valor = porMes.get(r.mes)?.[ind.clave] ?? null;
            const texto = formatearIndicador(valor);
            return `<td data-indicador="${ind.clave}" data-mes="${r.mes}">${texto}${ind.sufijo && texto !== '—' ? ind.sufijo : ''}</td>`;
        }).join('');
        const total = calcularValorAnual(ind.clave);
        const textoTotal = formatearIndicador(total);
        return `
            <tr>
                <td class="td-concepto">${escaparHTML(ind.etiqueta)}</td>
                ${celdas}
                <td class="td-consolidado" data-consolidado-indicador="${ind.clave}">
                    ${textoTotal}${ind.sufijo && textoTotal !== '—' ? ind.sufijo : ''}
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="tabla-scroll">
            <table class="tabla-matriz-mensual tabla-indicadores" id="tabla-indicadores">
                <thead>
                    <tr>
                        <th class="th-concepto">Indicador</th>
                        ${cabeceraMeses}
                        <th class="th-consolidado">Consolidado</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
}

/**
 * Actualiza las celdas de indicadores mensuales + las columnas de consolidado
 * (tanto de variables como de indicadores) sin re-renderizar toda la tabla.
 * Se llama tras cada edición de un input.
 */
function actualizarConsolidadosDeTablas(): void {
    if (!contenedorRaiz || !config) return;

    const indicadores = obtenerIndicadoresDelAnio();
    const porMes = new Map<number, IIndicadoresMensualesSiniestralidad>();
    indicadores.forEach(i => {
        const mes = parseInt(i.periodo.split('-')[1] ?? '0', 10);
        porMes.set(mes, i);
    });

    // 1. Actualizar celdas mensuales de los indicadores
    INDICADORES_MENSUALES.forEach(ind => {
        registros.forEach(r => {
            const celda = contenedorRaiz?.querySelector<HTMLElement>(
                `[data-indicador="${ind.clave}"][data-mes="${r.mes}"]`
            );
            if (!celda) return;
            const valor = porMes.get(r.mes)?.[ind.clave] ?? null;
            const texto = formatearIndicador(valor);
            celda.textContent = `${texto}${ind.sufijo && texto !== '—' ? ind.sufijo : ''}`;
        });
    });

    // 2. Actualizar columna "Consolidado" de la tabla de variables
    VARIABLES_MENSUALES.forEach(v => {
        const celda = contenedorRaiz?.querySelector<HTMLElement>(
            `[data-consolidado-variable="${v.clave}"]`
        );
        if (!celda) return;
        const total = registros.reduce(
            (sum, r) => sum + ((r as unknown as Record<string, number>)[v.clave] ?? 0),
            0
        );
        celda.textContent = String(total);
    });

    // 3. Actualizar columna "Consolidado" de la tabla de indicadores
    INDICADORES_MENSUALES.forEach(ind => {
        const celda = contenedorRaiz?.querySelector<HTMLElement>(
            `[data-consolidado-indicador="${ind.clave}"]`
        );
        if (!celda) return;
        const total = calcularValorAnual(ind.clave);
        const texto = formatearIndicador(total);
        celda.textContent = `${texto}${ind.sufijo && texto !== '—' ? ind.sufijo : ''}`;
    });
}

function calcularValorAnual(
    clave: keyof IIndicadoresMensualesSiniestralidad
): number | null {
    if (!config) return null;
    const consolidado = calcularConsolidadoAnual(registros, config, escenario, 'sistema');
    switch (clave) {
        case 'if_AT': return consolidado.if_AT_anual;
        case 'if_inc': return consolidado.if_inc_anual;
        case 'is_AT': return consolidado.is_AT_anual;
        case 'ili': return consolidado.ili_anual;
        case 'porcentajeInvestigaciones': return consolidado.porcentajeInvestigaciones_anual;
        default: return null;
    }
}

// ================================================================
// SUB-PESTAÑA CONSOLIDADO
// ================================================================

function renderizarConsolidado(panel: HTMLElement): void {
    if (!config) return;

    const consolidado = calcularConsolidadoAnual(registros, config, escenario, 'sistema');

    panel.innerHTML = `
        <h3>📈 Consolidado Anual ${escaparHTML(config.anio)}</h3>

        <div class="chips-resumen">
            <span class="chip">HHT: <b>${consolidado.totalHHT}</b></span>
            <span class="chip">∑AT: <b>${consolidado.totalAT}</b></span>
            <span class="chip">∑AT_inc: <b>${consolidado.totalATinc}</b></span>
            <span class="chip">∑AT_mort: <b>${consolidado.totalATmortal}</b></span>
            <span class="chip">∑Días: <b>${consolidado.totalDiasPerdidos}</b></span>
            <span class="chip">Investig.: <b>${consolidado.totalInvestigaciones}</b></span>
            <span class="chip">Meses con datos: <b>${consolidado.mesesConDatos}/12</b></span>
        </div>

        <h4 style="margin-top:1.5rem;color:#1B365D;">Indicadores anuales (recalculados ponderados)</h4>
        <div class="tabla-scroll">
            <table class="tabla-matriz-mensual">
                <thead>
                    <tr>
                        <th class="th-concepto">Indicador</th>
                        <th>Valor anual</th>
                        <th>Meta</th>
                        <th>Semáforo</th>
                    </tr>
                </thead>
                <tbody>
                    ${filaConsolidado('Índice de Frecuencia (IF)', consolidado.if_AT_anual, config.metas.metaIF)}
                    ${filaConsolidado('IF con Incapacidad', consolidado.if_inc_anual, config.metas.metaIFInc)}
                    ${filaConsolidado('Índice de Severidad (IS)', consolidado.is_AT_anual, config.metas.metaIS)}
                    ${filaConsolidado('Índice de Lesiones Incapacitantes (ILI)', consolidado.ili_anual, config.metas.metaILI)}
                    ${filaConsolidado('% Investigaciones', consolidado.porcentajeInvestigaciones_anual, config.metas.metaPorcentajeInvestigaciones, '%', false)}
                    ${filaConsolidado('Proporción de AT Mortales', consolidado.proporcionMortales_anual, config.metas.metaProporcionMortales, '%', false)}
                </tbody>
            </table>
        </div>
    `;
}

function filaConsolidado(
    etiqueta: string,
    valor: number | null,
    meta: number | null,
    sufijo: string = '',
    menorEsMejor: boolean = true
): string {
    const textoValor = formatearIndicador(valor);
    const textoMeta = meta !== null ? `${meta}${sufijo}` : '—';
    let semaforo = '⚪';
    if (valor !== null && meta !== null) {
        const cumple = menorEsMejor ? (valor <= meta) : (valor >= meta);
        semaforo = cumple ? '🟢' : '🔴';
    }
    return `
        <tr>
            <td class="td-concepto">${escaparHTML(etiqueta)}</td>
            <td style="text-align:center;font-weight:800;color:#1B365D;">${textoValor}${sufijo && textoValor !== '—' ? sufijo : ''}</td>
            <td style="text-align:center;color:#64748B;">${textoMeta}</td>
            <td style="text-align:center;font-size:1.1rem;">${semaforo}</td>
        </tr>
    `;
}

// ================================================================
// SUB-PESTAÑA ESTADÍSTICAS
// ================================================================

function renderizarEstadisticas(panel: HTMLElement): void {
    if (!config) return;

    const indicadores = obtenerIndicadoresDelAnio();
    const consolidado = calcularConsolidadoAnual(registros, config, escenario, 'sistema');

    const topIF = calcularTop5Meses(indicadores, 'if_AT', 'IF');
    const topIS = calcularTop5Meses(indicadores, 'is_AT', 'IS');

    const siniestrosEmpresa: ISiniestro[] = storageSiniestros
        .obtenerTodos()
        .filter(s => s.empresaId === nit && s.anio === anio);

    const distribucionGravedad = contarGravedades(siniestrosEmpresa.map(s => s.gravedad));
    const distribucionTipo = contarTiposSiniestro(siniestrosEmpresa.map(s => s.tipo));

    const mapaAreas: Record<string, number> = {};
    siniestrosEmpresa.forEach(s => {
        if (!s.area) return;
        mapaAreas[s.area] = (mapaAreas[s.area] ?? 0) + 1;
    });
    const topAreas = calcularTop5Areas(mapaAreas);

    const maxIF = Math.max(...indicadores.map(i => i.if_AT ?? 0), 1);
    const maxIS = Math.max(...indicadores.map(i => i.is_AT ?? 0), 1);
    const maxILI = Math.max(...indicadores.map(i => i.ili ?? 0), 1);

    panel.innerHTML = `
        <h3>📉 Estadísticas del Año ${escaparHTML(config.anio)}</h3>

        <div class="card" style="box-shadow:none;border:1px solid #e2e8f0;margin-top:0.5rem;">
            <h4 style="margin:0 0 0.75rem 0;color:#1B365D;">📊 Índices por mes (comparativa)</h4>
            <div class="barras-grafica">
                ${indicadores.map(i => {
                    const mes = parseInt(i.periodo.split('-')[1] ?? '0', 10);
                    const pctIF = maxIF > 0 ? ((i.if_AT ?? 0) / maxIF) * 100 : 0;
                    const pctIS = maxIS > 0 ? ((i.is_AT ?? 0) / maxIS) * 100 : 0;
                    return `
                        <div style="display:grid;grid-template-columns:80px 1fr;gap:0.5rem;align-items:center;">
                            <span style="font-weight:600;font-size:0.8rem;">${escaparHTML(nombreMes(mes))}</span>
                            <div>
                                <div style="font-size:0.7rem;color:#64748B;">IF: ${formatearIndicador(i.if_AT)} · IS: ${formatearIndicador(i.is_AT)}</div>
                                <div class="barra-container" style="height:14px;margin-top:2px;">
                                    <div class="barra-fill barra-azul" style="width:${pctIF}%;min-width:2px;"></div>
                                </div>
                                <div class="barra-container" style="height:14px;margin-top:2px;">
                                    <div class="barra-fill barra-naranja" style="width:${pctIS}%;min-width:2px;"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div class="card" style="box-shadow:none;border:1px solid #e2e8f0;margin-top:1rem;">
            <h4 style="margin:0 0 0.75rem 0;color:#1B365D;">🎯 Comparativo anual vs meta</h4>
            <div class="semaforo-lista">
                ${filaSemaforo('IF', consolidado.if_AT_anual, config.metas.metaIF, maxIF)}
                ${filaSemaforo('IF_inc', consolidado.if_inc_anual, config.metas.metaIFInc, maxIF)}
                ${filaSemaforo('IS', consolidado.is_AT_anual, config.metas.metaIS, maxIS)}
                ${filaSemaforo('ILI', consolidado.ili_anual, config.metas.metaILI, maxILI)}
                ${filaSemaforo('Investigaciones (%)', consolidado.porcentajeInvestigaciones_anual, config.metas.metaPorcentajeInvestigaciones, 100, false)}
            </div>
        </div>

        <div class="card" style="box-shadow:none;border:1px solid #e2e8f0;margin-top:1rem;">
            <h4 style="margin:0 0 0.75rem 0;color:#1B365D;">🏥 Distribución por gravedad</h4>
            ${barraDistribucion('Leve', distribucionGravedad.Leve, siniestrosEmpresa.length, 'barra-verde')}
            ${barraDistribucion('Moderado', distribucionGravedad.Moderado, siniestrosEmpresa.length, 'barra-amarillo')}
            ${barraDistribucion('Grave', distribucionGravedad.Grave, siniestrosEmpresa.length, 'barra-naranja')}
            ${barraDistribucion('Fatal', distribucionGravedad.Fatal, siniestrosEmpresa.length, 'barra-rojo')}
        </div>

        <div class="card" style="box-shadow:none;border:1px solid #e2e8f0;margin-top:1rem;">
            <h4 style="margin:0 0 0.75rem 0;color:#1B365D;">📂 Distribución por tipo de siniestro</h4>
            ${barraDistribucion('Accidente de Trabajo', distribucionTipo.AccidenteTrabajo, siniestrosEmpresa.length, 'barra-rojo')}
            ${barraDistribucion('Incidente', distribucionTipo.Incidente, siniestrosEmpresa.length, 'barra-azul')}
            ${barraDistribucion('Enfermedad Laboral', distribucionTipo.EnfermedadLaboral, siniestrosEmpresa.length, 'barra-naranja')}
            ${barraDistribucion('Accidente Común', distribucionTipo.AccidenteComun, siniestrosEmpresa.length, 'barra-gris')}
            ${barraDistribucion('Otro', distribucionTipo.Otro, siniestrosEmpresa.length, 'barra-gris')}
        </div>

        ${topAreas.length > 0 ? `
        <div class="card" style="box-shadow:none;border:1px solid #e2e8f0;margin-top:1rem;">
            <h4 style="margin:0 0 0.75rem 0;color:#1B365D;">📋 Top 5 áreas con más accidentes</h4>
            ${topAreas.map(a => barraDistribucion(a.area, a.total, siniestrosEmpresa.length, 'barra-cian')).join('')}
        </div>
        ` : ''}

        ${topIF.length > 0 ? `
        <div class="card" style="box-shadow:none;border:1px solid #e2e8f0;margin-top:1rem;">
            <h4 style="margin:0 0 0.75rem 0;color:#1B365D;">📈 Top 5 meses por IF</h4>
            ${topIF.map(t => barraDistribucion(`${t.nombreMes} (IF ${t.valor.toFixed(2)})`, t.valor, maxIF, 'barra-rojo')).join('')}
        </div>
        ` : ''}

        ${topIS.length > 0 ? `
        <div class="card" style="box-shadow:none;border:1px solid #e2e8f0;margin-top:1rem;">
            <h4 style="margin:0 0 0.75rem 0;color:#1B365D;">📈 Top 5 meses por IS</h4>
            ${topIS.map(t => barraDistribucion(`${t.nombreMes} (IS ${t.valor.toFixed(2)})`, t.valor, maxIS, 'barra-naranja')).join('')}
        </div>
        ` : ''}

        <div class="card" style="box-shadow:none;border:1px solid #e2e8f0;margin-top:1rem;">
            <h4 style="margin:0 0 0.75rem 0;color:#1B365D;">🧠 Interpretación automática</h4>
            <p style="font-size:0.85rem;color:#1E293B;line-height:1.6;margin:0 0 0.75rem 0;">
                ${escaparHTML(generarTextoInterpretativo(consolidado, config.metas))}
            </p>
            <p style="font-size:0.85rem;color:#1E293B;line-height:1.6;margin:0;">
                <strong>${escaparHTML(sugerirEnfoqueAnalisis(consolidado, config.metas))}</strong>
            </p>
        </div>
    `;
}

function filaSemaforo(
    etiqueta: string,
    valor: number | null,
    meta: number | null,
    maxValor: number,
    menorEsMejor: boolean = true
): string {
    const textoValor = formatearIndicador(valor);
    const textoMeta = meta !== null ? String(meta) : '—';
    let semaforo = '⚪';
    let pct = 0;
    let claseBarra = 'barra-gris';
    if (valor !== null && maxValor > 0) {
        pct = Math.min(100, (valor / maxValor) * 100);
        if (meta !== null) {
            const cumple = menorEsMejor ? (valor <= meta) : (valor >= meta);
            semaforo = cumple ? '🟢' : '🔴';
            claseBarra = cumple ? 'barra-verde' : 'barra-rojo';
        } else {
            claseBarra = 'barra-azul';
        }
    }
    return `
        <div class="semaforo-item">
            <span class="nombre">${escaparHTML(etiqueta)}</span>
            <span class="valor">${textoValor}</span>
            <span class="meta">meta ${textoMeta}</span>
            <div class="mini-barra"><div class="${claseBarra}" style="width:${pct}%;"></div></div>
            <span class="estado">${semaforo}</span>
        </div>
    `;
}

function barraDistribucion(etiqueta: string, cantidad: number, total: number, claseColor: string): string {
    const pct = total > 0 ? Math.round((cantidad / total) * 100) : 0;
    return `
        <div class="barra-item">
            <span class="barra-label">${escaparHTML(etiqueta)}</span>
            <div class="barra-container">
                <div class="barra-fill ${claseColor}" style="width:${pct}%;">
                    ${pct > 15 ? pct + '%' : ''}
                </div>
            </div>
            <span class="barra-valor">${cantidad}</span>
        </div>
    `;
}

// ================================================================
// SUB-PESTAÑA ANÁLISIS TRIMESTRAL
// ================================================================

function renderizarAnalisis(panel: HTMLElement): void {
    if (!config) return;

    const consolidado = calcularConsolidadoAnual(registros, config, escenario, 'sistema');
    const textoAutomatico = generarTextoInterpretativo(consolidado, config.metas);
    const sugerencia = sugerirEnfoqueAnalisis(consolidado, config.metas);

    panel.innerHTML = `
        <h3>📝 Análisis Trimestral ${escaparHTML(config.anio)}</h3>
        <p style="font-size:0.85rem;color:#64748B;margin-bottom:1rem;">
            Redacte hallazgos, tendencias y planes de acción por trimestre.
            Puede usar el texto generado automáticamente como punto de partida.
        </p>

        <div class="alert info" style="margin-bottom:1rem;">
            <strong>Sugerencia automática:</strong> ${escaparHTML(textoAutomatico)}<br>
            <strong>${escaparHTML(sugerencia)}</strong>
        </div>

        <div class="analisis-grid">
            ${NOMBRES_TRIMESTRES.map(t => {
                const reg = analisis.find(a => a.trimestre === t.n);
                const texto = reg?.texto ?? '';
                return `
                    <div class="analisis-card analisis-${t.n}T">
                        <div class="analisis-card-header">
                            <h4>${escaparHTML(t.titulo)}</h4>
                            <span class="subtitulo-meses">${escaparHTML(t.meses)}</span>
                        </div>
                        <textarea data-trimestre="${t.n}" placeholder="Análisis del trimestre...">${escaparHTML(texto)}</textarea>
                        <div class="acciones-analisis">
                            <button class="btn btn-sm btn-success btn-guardar-analisis" data-trimestre="${t.n}" type="button">
                                💾 Guardar trimestre
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    panel.querySelectorAll<HTMLTextAreaElement>('textarea[data-trimestre]').forEach(ta => {
        ta.addEventListener('input', () => { hayCambios = true; });
    });

    panel.querySelectorAll<HTMLButtonElement>('.btn-guardar-analisis').forEach(btn => {
        btn.addEventListener('click', () => {
            const n = parseInt(btn.dataset.trimestre ?? '0', 10);
            const ta = panel.querySelector<HTMLTextAreaElement>(`textarea[data-trimestre="${n}"]`);
            if (!ta) return;
            const reg = analisis.find(a => a.trimestre === n);
            if (!reg) return;
            reg.texto = ta.value;
            reg.guardado = true;
            reg.fechaActualizacion = new Date();
            reg.actualizadoPor = 'usuario';
            storageAnalisisTrimestralesSiniestralidad.actualizar(reg.id, reg);
            mostrarMensaje(`✅ Análisis del trimestre ${n} guardado.`, 'success');
        });
    });
}

// ================================================================
// GUARDAR / EXPORTAR / ENVIAR M23 / VOLVER
// ================================================================

function guardarTodo(): void {
    if (!config) return;

    for (const r of registros) {
        const v = validarRegistroMensual(r);
        if (!v.ok) {
            mostrarMensaje(`❌ Mes ${nombreMes(r.mes)}: ${v.mensaje}`, 'error');
            return;
        }
    }

    config.sedeObraProceso = (contenedorRaiz?.querySelector<HTMLInputElement>('#enc-sede')?.value ?? '').trim();
    config.responsableSST = (contenedorRaiz?.querySelector<HTMLInputElement>('#enc-responsable')?.value ?? '').trim();
    config.version = (contenedorRaiz?.querySelector<HTMLInputElement>('#enc-version')?.value ?? '').trim();
    config.fechaActualizacion = new Date();
    storageConfiguracionesSiniestralidad.actualizar(config.id, config);

    for (const r of registros) {
        storageRegistrosMensualesSiniestralidad.actualizar(r.id, r);
    }

    persistirConsolidado();

    hayCambios = false;
    mostrarMensaje('✅ Cambios guardados correctamente.', 'success');
    console.info('✅ M25 Estadística: cambios guardados.');
}

/**
 * Recalcula el consolidado anual y lo persiste en storage.
 * Se usa al guardar y al "Enviar a M23".
 */
function persistirConsolidado(): IConsolidadoAnualSiniestralidad | null {
    if (!config) return null;

    const consolidado = calcularConsolidadoAnual(registros, config, escenario, 'usuario');

    const existente = storageConsolidadosAnualesSiniestralidad
        .obtenerTodos()
        .find(c => c.empresaId === nit && c.anio === anio && c.escenario === escenario);

    if (existente) {
        storageConsolidadosAnualesSiniestralidad.actualizar(existente.id, consolidado);
    } else {
        storageConsolidadosAnualesSiniestralidad.guardar(consolidado);
    }

    return consolidado;
}

/**
 * Exporta los datos del año a un archivo .xls replicando la estructura
 * del archivo original "APLICATIVO ESTADISTICO DE ACCIDENTALIDAD.xls".
 * 
 * Usa el helper reutilizable exportarModulo() de src/exportar-excel.ts.
 * No usa la librería xlsx porque el navegador no resuelve el módulo
 * "xlsx" sin un bundler.
 */
function exportarExcel(): void {
    if (!config) return;

    const consolidado = persistirConsolidado();
    if (!consolidado) return;

    const usuario = obtenerUsuarioSesion();
    const usuarioNombre = usuario?.nombreCompleto || 'Usuario';

    // --- Tabla 1: Encabezado (una sola fila con datos clave) ---
    const tablaEncabezado = {
        titulo: 'Encabezado',
        columnas: ['Concepto', 'Valor'],
        filas: [
            ['Empresa', config.razonSocial],
            ['NIT', config.nit],
            ['Año / Vigencia', config.anio],
            ['Sede / Obra / Proceso', config.sedeObraProceso || '—'],
            ['Responsable SST', config.responsableSST || '—'],
            ['Versión', config.version || '1'],
            ['Jornada de referencia', config.jornadaReferencia],
            ['Constante K', String(config.constK)],
            ['Constante K_ILI', String(config.constKILI)]
        ] as (string | number)[][]
    };

    // --- Tabla 2: Variables mensuales (12 meses + Consolidado) ---
    const columnasVariables: string[] = ['Concepto'];
    NOMBRES_MESES.forEach(n => columnasVariables.push(n));
    columnasVariables.push('Consolidado');

    const filasVariables: (string | number)[][] = VARIABLES_MENSUALES.map(v => {
        const fila: (string | number)[] = [v.etiqueta];
        let total = 0;
        registros.forEach(r => {
            const valor = (r as unknown as Record<string, number>)[v.clave] ?? 0;
            fila.push(valor);
            total += valor;
        });
        fila.push(total);
        return fila;
    });

    // --- Tabla 3: Indicadores mensuales (12 meses + Consolidado) ---
    const indicadores = obtenerIndicadoresDelAnio();
    const porMes = new Map<number, IIndicadoresMensualesSiniestralidad>();
    indicadores.forEach(i => {
        const mes = parseInt(i.periodo.split('-')[1] ?? '0', 10);
        porMes.set(mes, i);
    });

    const columnasIndicadores: string[] = ['Indicador'];
    NOMBRES_MESES.forEach(n => columnasIndicadores.push(n));
    columnasIndicadores.push('Consolidado');

    const filasIndicadores: (string | number)[][] = INDICADORES_MENSUALES.map(ind => {
        const fila: (string | number)[] = [ind.etiqueta];
        registros.forEach(r => {
            const v = porMes.get(r.mes)?.[ind.clave] ?? null;
            fila.push(v === null ? '—' : Number(v.toFixed(2)));
        });
        const totalAnual = calcularValorAnual(ind.clave);
        fila.push(totalAnual === null ? '—' : Number(totalAnual.toFixed(2)));
        return fila;
    });

    // --- Tabla 4: Análisis trimestral (4 filas) ---
    const tablaAnalisis = {
        titulo: 'Análisis Trimestral',
        columnas: ['Trimestre', 'Meses', 'Análisis'],
        filas: NOMBRES_TRIMESTRES.map(t => {
            const reg = analisis.find(a => a.trimestre === t.n);
            return [t.titulo, t.meses, reg?.texto || '—'] as (string | number)[];
        })
    };

    const ok = exportarModulo({
        tituloModulo: `M25 – Indicadores de Accidentalidad ${anio}`,
        empresaNombre: empresaNombre || config.razonSocial,
        empresaNit: config.nit,
        usuarioNombre,
        tablas: [
            tablaEncabezado,
            {
                titulo: 'Datos Operativos Mensuales',
                columnas: columnasVariables,
                filas: filasVariables
            },
            {
                titulo: 'Indicadores Calculados (NTC 3701)',
                columnas: columnasIndicadores,
                filas: filasIndicadores
            },
            tablaAnalisis
        ]
    });

    if (ok) {
        mostrarMensaje('📊 Archivo Excel generado correctamente.', 'success');
    } else {
        mostrarMensaje('❌ No se pudo generar el archivo Excel.', 'error');
    }
}

/**
 * Envía los indicadores anuales a M23.
 * 
 * M25 no conoce la forma exacta de IResultadoIndicador de M23, por lo que
 * sigue el patrón "pull" aprobado: actualiza el consolidado anual en
 * storage y emite un CustomEvent para que M23 (o cualquier módulo) pueda
 * reaccionar cuando esté implementado.
 */
function enviarAM23(): void {
    if (!config) return;

    const consolidado = persistirConsolidado();
    if (!consolidado) {
        mostrarMensaje('❌ No se pudo calcular el consolidado.', 'error');
        return;
    }

    if (consolidado.totalHHT === 0) {
        mostrarMensaje('❌ No se puede enviar: la HHT total del año es 0.', 'error');
        return;
    }

    try {
        const evento = new CustomEvent('siniestralidad:enviar-m23', {
            detail: {
                empresaId: nit,
                anio,
                escenario,
                indicadores: {
                    if_AT: consolidado.if_AT_anual,
                    if_inc: consolidado.if_inc_anual,
                    is_AT: consolidado.is_AT_anual,
                    ili: consolidado.ili_anual,
                    porcentajeInvestigaciones: consolidado.porcentajeInvestigaciones_anual,
                    proporcionMortales: consolidado.proporcionMortales_anual
                },
                fechaEnvio: new Date().toISOString()
            }
        });
        window.dispatchEvent(evento);
    } catch (error) {
        console.error('M25 Estadística: error al emitir evento para M23:', error);
    }

    mostrarMensaje(
        `✅ Consolidado anual de ${anio} enviado. M23 podrá leerlo desde "consolidadosAnualesSiniestralidad".`,
        'success'
    );
    console.info('M25 Estadística: consolidado enviado a M23 (actualizado en storage + CustomEvent).');
}

function confirmarVolver(): void {
    if (hayCambios) {
        const ok = confirm('⚠️ Hay cambios sin guardar. ¿Desea salir sin guardar?');
        if (!ok) return;
    }
    localStorage.removeItem(LS_EMPRESA_NIT);
    window.close();
    window.setTimeout(() => {
        window.location.href = '../../index.html#M25-Gestion-Siniestralidad';
    }, 200);
}