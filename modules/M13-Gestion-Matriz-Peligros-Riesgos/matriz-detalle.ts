/**
 * modules/M13-Gestion-Matriz-Peligros-Riesgos/matriz-detalle.ts
 *
 * Detalle de la Matriz de Riesgos (M13 - GTC 45).
 * Se abre en pestaña nueva desde matriz-listado.ts.
 * Lee el matrizId y motivoActualizacion de localStorage.
 *
 * v2.2.1
 *  - Corregido: ahora lee de localStorage (antes sessionStorage) para
 *    coincidir con matriz-listado.ts que escribe en localStorage.
 *
 * @version 2.2.1
 * @since 2026-09-16
 */

import type { IRiesgo } from '../../src/interfaces/index.js';
import { storageMatrices, storageRiesgos } from '../../src/storage.js';
import { escaparHTML, generarIdUnico } from '../../src/utils.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';

// ================================================================
// CATÁLOGO DE PELIGROS (Anexo A GTC 45)
// ================================================================

const CATALOGO_PELIGROS: Record<string, string[]> = {
    'Biológico': ['Virus', 'Bacterias', 'Hongos', 'Rickettsias', 'Parásitos', 'Picaduras', 'Mordeduras', 'Fluidos o excrementos'],
    'Físico': ['Ruido (impacto, intermitente y continuo)', 'Iluminación (luz visible por exceso o deficiencia)', 'Vibración (cuerpo entero, segmentaria)', 'Temperaturas extremas (calor y frío)', 'Presión atmosférica (normal y ajustada)', 'Radiaciones ionizantes (rayos x, gama, beta y alfa)', 'Radiaciones no ionizantes (láser, ultravioleta, infrarroja)'],
    'Químico': ['Polvos orgánicos inorgánicos', 'Fibras', 'Líquidos (nieblas y rocíos)', 'Gases y vapores', 'Humos metálicos y no metálicos', 'Material particulado'],
    'Psicosocial': ['Gestión organizacional', 'Características de la organización del trabajo', 'Características del grupo social del trabajo', 'Condiciones de la tarea', 'Interfase persona-tarea', 'Jornada de trabajo'],
    'Biomecánico': ['Postura (prolongada, mantenida, forzada, antigravitacionales)', 'Esfuerzo', 'Movimiento repetitivo', 'Manipulación manual de cargas'],
    'Condiciones de Seguridad': ['Mecánico', 'Eléctrico', 'Locativo', 'Tecnológico', 'Accidentes de tránsito', 'Públicos', 'Trabajo en Alturas', 'Espacios Confinados'],
    'Fenómenos Naturales': ['Sismo', 'Terremoto', 'Vendaval', 'Inundación', 'Derrumbe', 'Precipitaciones (lluvias, granizadas, heladas)']
};

// ================================================================
// TIPOS
// ================================================================

type TipoActividad = 'Rutinaria' | 'No Rutinaria';
type TipoProceso = 'Rutinario' | 'No Rutinario';

interface CamposMatrizExtra {
    tipoProceso: TipoProceso;
    tipoActividad: TipoActividad;
    descripcionPeligro: string;
    clasifPrincipal: string;
    clasifEspecifica: string;
    efectosPosibles: string;
    controlFuente: string;
    controlMedio: string;
    controlTrabajador: string;
    numExpuestos: number;
    medEliminacion: string;
    medSustitucion: string;
    medIngenieria: string;
    medAdministrativos: string;
    medEpp: string;
    aspectosLegales: 'SI' | 'NO';
    relacionRequisitos: string;
    observacion: string;
    evaluacionCompleta: boolean;
}

type IRiesgoMatriz = IRiesgo & Partial<CamposMatrizExtra>;

interface FilaRiesgo {
    id: string;
    proceso: string;
    tipoProceso: TipoProceso;
    zona: string;
    actividad: string;
    tarea: string;
    tipoActividad: TipoActividad;
    descripcionPeligro: string;
    clasifPrincipal: string;
    clasifEspecifica: string;
    efectosPosibles: string;
    controlFuente: string;
    controlMedio: string;
    controlTrabajador: string;
    nd: number | null;
    ne: number | null;
    nc: number | null;
    numExpuestos: number;
    medEliminacion: string;
    medSustitucion: string;
    medIngenieria: string;
    medAdministrativos: string;
    medEpp: string;
    aspectosLegales: 'SI' | 'NO';
    relacionRequisitos: string;
    observacion: string;
}

type CampoFila = Exclude<keyof FilaRiesgo, 'id'>;
type CalcKey = 'nivelDef' | 'np' | 'intNP' | 'nr' | 'intNR' | 'aceptabilidad';

type TipoColumna =
    | 'indice' | 'contexto' | 'contextoActividad'
    | 'texto' | 'area' | 'numero' | 'tipoActividad' | 'tipoProceso' | 'siNo'
    | 'clasifPrincipal' | 'clasifEspecifica'
    | 'nd' | 'ne' | 'nc'
    | 'nivelDef' | 'omitir' | 'calc' | 'acciones';

interface Columna {
    titulo: string;
    tipo: TipoColumna;
    campo?: CampoFila;
    calc?: CalcKey;
    ancho?: number;
    ph?: string;
}

interface Grupo {
    titulo?: string;
    clase: string;
    columnas: Columna[];
}

interface Pestana {
    id: string;
    icono: string;
    titulo: string;
    ayuda?: string;
    grupos?: Grupo[];
}

// ================================================================
// DEFINICIÓN DE PESTAÑAS Y COLUMNAS
// ================================================================

const G_INDICE: Grupo = { clase: 'th-base', columnas: [{ titulo: '#', tipo: 'indice', ancho: 44 }] };
const G_ACCIONES: Grupo = { clase: 'th-base', columnas: [{ titulo: 'Acciones', tipo: 'acciones', ancho: 76 }] };
const G_CONTEXTO: Grupo = { clase: 'th-base', columnas: [{ titulo: 'Peligro identificado', tipo: 'contexto', ancho: 260 }] };

const PESTANAS: Pestana[] = [
    {
        id: 'actividades',
        icono: '📍',
        titulo: 'Actividades',
        ayuda: '<strong>Dónde y qué se hace.</strong> Indique el proceso, el lugar de trabajo, la actividad y la tarea. El tipo de actividad es rutinaria o no rutinaria.',
        grupos: [
            G_INDICE,
            {
                clase: 'th-base',
                columnas: [
                    { titulo: 'Proceso', tipo: 'texto', campo: 'proceso', ancho: 180 },
                    { titulo: 'Tipo Proceso (Rutinario / No Rutinario)', tipo: 'tipoProceso', campo: 'tipoProceso', ancho: 170 },
                    { titulo: 'Lugar de Trabajo', tipo: 'texto', campo: 'zona', ancho: 200 },
                    { titulo: 'Actividad', tipo: 'texto', campo: 'actividad', ancho: 200 },
                    { titulo: 'Tarea', tipo: 'texto', campo: 'tarea', ancho: 180 },
                    { titulo: 'Tipo Actividad (Rutinaria / No Rutinaria)', tipo: 'tipoActividad', campo: 'tipoActividad', ancho: 170 }
                ]
            },
            G_ACCIONES
        ]
    },
    {
        id: 'peligros',
        icono: '⚠️',
        titulo: 'Peligros y controles',
        ayuda: '<strong>Peligro y controles existentes.</strong> Elija la clasificación principal para habilitar la específica (Anexo A de la GTC 45). Los controles existentes se clasifican en fuente, medio e individuo (trabajador); incluya también los administrativos, como inspecciones, ajustes a procedimientos u horarios de trabajo. Escriba NA si no aplica.',
        grupos: [
            G_INDICE,
            { clase: 'th-base', columnas: [{ titulo: 'Actividad / Tarea', tipo: 'contextoActividad', ancho: 200 }] },
            { clase: 'th-peligros', columnas: [{ titulo: 'Descripción', tipo: 'area', campo: 'descripcionPeligro', ancho: 220, ph: 'Descripción del peligro' }] },
            {
                titulo: 'Clasificación',
                clase: 'th-peligros',
                columnas: [
                    { titulo: 'Principal', tipo: 'clasifPrincipal', campo: 'clasifPrincipal', ancho: 160 },
                    { titulo: 'Específica', tipo: 'clasifEspecifica', campo: 'clasifEspecifica', ancho: 200 }
                ]
            },
            { clase: 'th-base', columnas: [{ titulo: 'Efectos Posibles', tipo: 'area', campo: 'efectosPosibles', ancho: 220, ph: 'Efectos' }] },
            {
                titulo: 'Control Existente',
                clase: 'th-control',
                columnas: [
                    { titulo: 'Fuente', tipo: 'area', campo: 'controlFuente', ancho: 140, ph: 'NA' },
                    { titulo: 'Medio', tipo: 'area', campo: 'controlMedio', ancho: 140, ph: 'NA' },
                    { titulo: 'Trabajador', tipo: 'area', campo: 'controlTrabajador', ancho: 140, ph: 'NA' }
                ]
            },
            G_ACCIONES
        ]
    },
    {
        id: 'evaluacion',
        icono: '📊',
        titulo: 'Evaluación del riesgo',
        ayuda: '<strong>Valoración.</strong> Seleccione ND, NE y NC; el resto se calcula solo: NP = ND × NE y NR = NP × NC. Las tablas para decidir cada nivel están en la pestaña «Tablas de valoración».',
        grupos: [
            G_INDICE,
            G_CONTEXTO,
            {
                titulo: 'Nivel de Deficiencia',
                clase: 'th-eficiencia',
                columnas: [
                    { titulo: 'Muy Alto', tipo: 'nivelDef', ancho: 48 },
                    { titulo: 'Alto', tipo: 'omitir', ancho: 48 },
                    { titulo: 'Medio', tipo: 'omitir', ancho: 48 },
                    { titulo: 'Bajo', tipo: 'omitir', ancho: 48 }
                ]
            },
            {
                titulo: 'Evaluación del Riesgo',
                clase: 'th-evaluacion',
                columnas: [
                    { titulo: 'ND', tipo: 'nd', campo: 'nd', ancho: 96 },
                    { titulo: 'NE', tipo: 'ne', campo: 'ne', ancho: 96 },
                    { titulo: 'NP', tipo: 'calc', calc: 'np', ancho: 56 },
                    { titulo: 'Int. NP', tipo: 'calc', calc: 'intNP', ancho: 90 },
                    { titulo: 'NC', tipo: 'nc', campo: 'nc', ancho: 100 },
                    { titulo: 'NR', tipo: 'calc', calc: 'nr', ancho: 64 },
                    { titulo: 'Int. NR', tipo: 'calc', calc: 'intNR', ancho: 64 },
                    { titulo: 'Aceptabilidad', tipo: 'calc', calc: 'aceptabilidad', ancho: 170 }
                ]
            },
            { clase: 'th-criterios', columnas: [{ titulo: 'Expuestos', tipo: 'numero', campo: 'numExpuestos', ancho: 90 }] },
            G_ACCIONES
        ]
    },
    {
        id: 'intervencion',
        icono: '🛠️',
        titulo: 'Medidas de intervención',
        ayuda: '<strong>Jerarquía de controles (NTC-OHSAS 18001).</strong> Priorice en este orden: eliminación, sustitución, controles de ingeniería, controles administrativos y, por último, equipos de protección personal. Escriba NA si no aplica.',
        grupos: [
            G_INDICE,
            G_CONTEXTO,
            {
                titulo: 'Medidas de Intervención',
                clase: 'th-medidas',
                columnas: [
                    { titulo: 'Eliminación', tipo: 'area', campo: 'medEliminacion', ancho: 170, ph: 'NA' },
                    { titulo: 'Sustitución', tipo: 'area', campo: 'medSustitucion', ancho: 170, ph: 'NA' },
                    { titulo: 'Ingeniería', tipo: 'area', campo: 'medIngenieria', ancho: 170, ph: 'NA' },
                    { titulo: 'Administrativos', tipo: 'area', campo: 'medAdministrativos', ancho: 190, ph: 'NA' },
                    { titulo: 'EPP', tipo: 'area', campo: 'medEpp', ancho: 170, ph: 'NA' }
                ]
            },
            G_ACCIONES
        ]
    },
    {
        id: 'legal',
        icono: '⚖️',
        titulo: 'Marco legal y observaciones',
        ayuda: '<strong>Requisito legal asociado.</strong> Indique si existe uno para la tarea evaluada y cuál es; sirve como criterio para priorizar controles junto con el número de expuestos y la peor consecuencia.',
        grupos: [
            G_INDICE,
            G_CONTEXTO,
            {
                titulo: 'Marco Legal',
                clase: 'th-legal',
                columnas: [
                    { titulo: 'Aspectos Legales', tipo: 'siNo', campo: 'aspectosLegales', ancho: 120 },
                    { titulo: 'Relación Requisitos', tipo: 'area', campo: 'relacionRequisitos', ancho: 260 }
                ]
            },
            { clase: 'th-base', columnas: [{ titulo: 'Observación', tipo: 'area', campo: 'observacion', ancho: 280 }] },
            G_ACCIONES
        ]
    },
    { id: 'dano', icono: '📖', titulo: 'Niveles de daño (Tabla 1)' },
    { id: 'guia', icono: '📐', titulo: 'Tablas de valoración (2 a 9)' }
];

const NIVELES_ND = [{ v: 10, t: 'MA (10)' }, { v: 6, t: 'A (6)' }, { v: 2, t: 'M (2)' }];
const NIVELES_NE = [{ v: 4, t: 'EC (4)' }, { v: 3, t: 'EF (3)' }, { v: 2, t: 'EO (2)' }, { v: 1, t: 'EE (1)' }];
const NIVELES_NC = [{ v: 100, t: 'M (100)' }, { v: 60, t: 'MG (60)' }, { v: 25, t: 'G (25)' }, { v: 10, t: 'L (10)' }];

// ================================================================
// CÁLCULOS (GTC 45)
// ================================================================

interface Resultado {
    npNum: number;
    nrNum: number;
    nivelDef: string;
    np: string;
    intNP: string;
    nr: string;
    intNR: string;
    claseNR: string;
    aceptabilidad: string;
}

function calcular(f: FilaRiesgo): Resultado {
    const npNum = f.nd !== null && f.ne !== null ? f.nd * f.ne : 0;
    const nrNum = npNum > 0 && f.nc !== null ? npNum * f.nc : 0;

    let nivelDef = '—';
    if (f.nd === 10) nivelDef = '(MA)';
    else if (f.nd === 6) nivelDef = '(A)';
    else if (f.nd === 2) nivelDef = '(M)';

    let intNP = '—';
    if (npNum >= 24) intNP = 'Muy Alto';
    else if (npNum >= 10) intNP = 'Alto';
    else if (npNum >= 6) intNP = 'Medio';
    else if (npNum >= 2) intNP = 'Bajo';

    let intNR = '—';
    let claseNR = '';
    let aceptabilidad = '—';
    if (nrNum >= 600) { intNR = 'I'; claseNR = 'riesgo-i'; aceptabilidad = 'No Aceptable'; }
    else if (nrNum >= 150) { intNR = 'II'; claseNR = 'riesgo-ii'; aceptabilidad = 'No Aceptable o Aceptable con control específico'; }
    else if (nrNum >= 40) { intNR = 'III'; claseNR = 'riesgo-iii'; aceptabilidad = 'Mejorable'; }
    else if (nrNum > 0) { intNR = 'IV'; claseNR = 'riesgo-iv'; aceptabilidad = 'Aceptable'; }

    return {
        npNum,
        nrNum,
        nivelDef,
        np: npNum > 0 ? String(npNum) : '—',
        intNP,
        nr: nrNum > 0 ? String(nrNum) : '—',
        intNR,
        claseNR,
        aceptabilidad
    };
}

// ================================================================
// HTML DE LAS PESTAÑAS DE CONSULTA
// ================================================================

function htmlTabla1(): string {
    return `
        <div class="info-box">
            <strong>Tabla 1. Descripción de los niveles de daño.</strong> Sirve de apoyo para elegir el nivel de consecuencia (NC) y describir los efectos posibles. Cada organización puede adaptar esta estructura a sus objetivos, por ejemplo agregando una tercera categoría para daños a la propiedad, fallas en los procesos o pérdidas económicas.
        </div>
        <div class="tabla-scroll">
            <table class="tabla-guia">
                <thead>
                    <tr><th style="width:12%">Categoría del daño</th><th>Daño leve</th><th>Daño moderado</th><th>Daño extremo</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="fila-titulo">Salud</td>
                        <td>Molestias e irritación (ejemplo: dolor de cabeza); enfermedad temporal que produce malestar (ejemplo: diarrea).</td>
                        <td>Enfermedades que causan incapacidad temporal. Ejemplo: pérdida parcial de la audición; dermatitis; asma; desórdenes de las extremidades superiores.</td>
                        <td>Enfermedades agudas o crónicas que generan incapacidad permanente parcial, invalidez o muerte.</td>
                    </tr>
                    <tr>
                        <td class="fila-titulo">Seguridad</td>
                        <td>Lesiones superficiales; heridas de poca profundidad; contusiones; irritaciones del ojo por material particulado.</td>
                        <td>Laceraciones; heridas profundas; quemaduras de primer grado; conmoción cerebral; esguinces graves; fracturas de huesos cortos.</td>
                        <td>Lesiones que generen amputaciones; fracturas de huesos largos; trauma cráneo encefálico; quemaduras de segundo y tercer grado; alteraciones severas de mano, de columna vertebral con compromiso de la médula espinal, oculares que comprometan el campo visual; disminuyan la capacidad auditiva.</td>
                    </tr>
                </tbody>
            </table>
        </div>`;
}

function htmlGuia(): string {
    return `
        <div class="info-box">
            <strong>Fórmulas:</strong> NP = ND × NE &nbsp;·&nbsp; NR = NP × NC. Con el nivel de riesgo se decide la aceptabilidad y la urgencia de la intervención.
        </div>
        <div class="guia-grid">
            <div class="guia-bloque">
                <h4>Tabla 2. Nivel de deficiencia (ND)</h4>
                <div class="tabla-scroll"><table class="tabla-guia">
                    <thead><tr><th>Nivel</th><th>ND</th><th>Significado</th></tr></thead>
                    <tbody>
                        <tr><td class="c">Muy Alto (MA)</td><td class="c">10</td><td>Se detectaron peligros que hacen posible incidentes o consecuencias muy significativas, o la eficacia de las medidas preventivas es nula o no existen, o ambos.</td></tr>
                        <tr><td class="c">Alto (A)</td><td class="c">6</td><td>Se detectaron peligros que pueden dar lugar a consecuencias significativas, o la eficacia de las medidas preventivas es baja, o ambos.</td></tr>
                        <tr><td class="c">Medio (M)</td><td class="c">2</td><td>Se detectaron peligros que pueden dar lugar a consecuencias poco significativas o de menor importancia, o la eficacia de las medidas preventivas es moderada, o ambos.</td></tr>
                        <tr><td class="c">Bajo (B)</td><td class="c">Sin valor</td><td>No se detectó consecuencia alguna, o la eficacia de las medidas preventivas es alta, o ambos. El riesgo está controlado y se clasifica directamente en el nivel de riesgo IV.</td></tr>
                    </tbody>
                </table></div>
                <p>Para peligros higiénicos (físico, químico, biológico) el ND puede determinarse cualitativa (Anexo C) o cuantitativamente (Anexo D). Para psicosociales se usan las metodologías vigentes, como la Resolución 2646 de 2008.</p>
            </div>

            <div class="guia-bloque">
                <h4>Tabla 3. Nivel de exposición (NE)</h4>
                <div class="tabla-scroll"><table class="tabla-guia">
                    <thead><tr><th>Nivel</th><th>NE</th><th>Significado</th></tr></thead>
                    <tbody>
                        <tr><td class="c">Continua (EC)</td><td class="c">4</td><td>La exposición se presenta sin interrupción o varias veces con tiempo prolongado durante la jornada laboral.</td></tr>
                        <tr><td class="c">Frecuente (EF)</td><td class="c">3</td><td>La exposición se presenta varias veces durante la jornada laboral por tiempos cortos.</td></tr>
                        <tr><td class="c">Ocasional (EO)</td><td class="c">2</td><td>La exposición se presenta alguna vez durante la jornada laboral y por un periodo corto.</td></tr>
                        <tr><td class="c">Esporádica (EE)</td><td class="c">1</td><td>La exposición se presenta de manera eventual.</td></tr>
                    </tbody>
                </table></div>
            </div>

            <div class="guia-bloque">
                <h4>Tabla 4. Nivel de probabilidad (NP = ND × NE)</h4>
                <div class="tabla-scroll"><table class="tabla-guia">
                    <thead><tr><th rowspan="2">ND</th><th colspan="4">Nivel de exposición (NE)</th></tr><tr><th>4</th><th>3</th><th>2</th><th>1</th></tr></thead>
                    <tbody>
                        <tr><td class="c">10</td><td class="c c-ma">MA – 40</td><td class="c c-ma">MA – 30</td><td class="c c-a">A – 20</td><td class="c c-a">A – 10</td></tr>
                        <tr><td class="c">6</td><td class="c c-ma">MA – 24</td><td class="c c-a">A – 18</td><td class="c c-a">A – 12</td><td class="c c-m">M – 6</td></tr>
                        <tr><td class="c">2</td><td class="c c-m">M – 8</td><td class="c c-m">M – 6</td><td class="c c-b">B – 4</td><td class="c c-b">B – 2</td></tr>
                    </tbody>
                </table></div>
            </div>

            <div class="guia-bloque">
                <h4>Tabla 5. Significado de los niveles de probabilidad</h4>
                <div class="tabla-scroll"><table class="tabla-guia">
                    <thead><tr><th>Nivel</th><th>NP</th><th>Significado</th></tr></thead>
                    <tbody>
                        <tr><td class="c c-ma">Muy Alto</td><td class="c">40 a 24</td><td>Situación deficiente con exposición continua, o muy deficiente con exposición frecuente. Normalmente la materialización del riesgo ocurre con frecuencia.</td></tr>
                        <tr><td class="c c-a">Alto</td><td class="c">20 a 10</td><td>Situación deficiente con exposición frecuente u ocasional, o muy deficiente con exposición ocasional o esporádica. Es posible que el riesgo se materialice varias veces en la vida laboral.</td></tr>
                        <tr><td class="c c-m">Medio</td><td class="c">8 a 6</td><td>Situación deficiente con exposición esporádica, o mejorable con exposición continuada o frecuente. Es posible que suceda el daño alguna vez.</td></tr>
                        <tr><td class="c c-b">Bajo</td><td class="c">4 a 2</td><td>Situación mejorable con exposición ocasional o esporádica, o sin anomalía destacable con cualquier nivel de exposición. No es esperable que se materialice, aunque puede ser concebible.</td></tr>
                    </tbody>
                </table></div>
            </div>

            <div class="guia-bloque">
                <h4>Tabla 6. Nivel de consecuencia (NC)</h4>
                <div class="tabla-scroll"><table class="tabla-guia">
                    <thead><tr><th>Nivel</th><th>NC</th><th>Daños personales</th></tr></thead>
                    <tbody>
                        <tr><td class="c">Mortal o Catastrófico (M)</td><td class="c">100</td><td>Muerte(s).</td></tr>
                        <tr><td class="c">Muy grave (MG)</td><td class="c">60</td><td>Lesiones o enfermedades graves irreparables (incapacidad permanente parcial o invalidez).</td></tr>
                        <tr><td class="c">Grave (G)</td><td class="c">25</td><td>Lesiones o enfermedades con incapacidad laboral temporal (ILT).</td></tr>
                        <tr><td class="c">Leve (L)</td><td class="c">10</td><td>Lesiones o enfermedades que no requieren incapacidad.</td></tr>
                    </tbody>
                </table></div>
                <p>Se toma la consecuencia directa más grave que se pueda presentar en la actividad valorada.</p>
            </div>

            <div class="guia-bloque">
                <h4>Tabla 7. Nivel de riesgo (NR = NP × NC)</h4>
                <div class="tabla-scroll"><table class="tabla-guia">
                    <thead><tr><th rowspan="2">NC</th><th colspan="4">Nivel de probabilidad (NP)</th></tr><tr><th>40 – 24</th><th>20 – 10</th><th>8 – 6</th><th>4 – 2</th></tr></thead>
                    <tbody>
                        <tr><td class="c">100</td><td class="c c-i">I<br>4000–2400</td><td class="c c-i">I<br>2000–1200</td><td class="c c-i">I<br>800–600</td><td class="c c-ii">II<br>400–200</td></tr>
                        <tr><td class="c">60</td><td class="c c-i">I<br>2400–1440</td><td class="c c-i">I<br>1200–600</td><td class="c c-ii">II<br>480–360</td><td class="c c-ii">II 240<br>III 120</td></tr>
                        <tr><td class="c">25</td><td class="c c-i">I<br>1000–600</td><td class="c c-ii">II<br>500–250</td><td class="c c-ii">II<br>200–150</td><td class="c c-iii">III<br>100–50</td></tr>
                        <tr><td class="c">10</td><td class="c c-ii">II<br>400–240</td><td class="c c-ii">II 200<br>III 100</td><td class="c c-iii">III<br>80–60</td><td class="c c-iii">III 40<br>IV 20</td></tr>
                    </tbody>
                </table></div>
            </div>

            <div class="guia-bloque">
                <h4>Tabla 8. Significado del nivel de riesgo</h4>
                <div class="tabla-scroll"><table class="tabla-guia">
                    <thead><tr><th>Nivel</th><th>NR</th><th>Significado</th></tr></thead>
                    <tbody>
                        <tr><td class="c c-i">I</td><td class="c">4000 – 600</td><td>Situación crítica. Suspender actividades hasta que el riesgo esté bajo control. Intervención urgente.</td></tr>
                        <tr><td class="c c-ii">II</td><td class="c">500 – 150</td><td>Corregir y adoptar medidas de control de inmediato.</td></tr>
                        <tr><td class="c c-iii">III</td><td class="c">120 – 40</td><td>Mejorar si es posible. Sería conveniente justificar la intervención y su rentabilidad.</td></tr>
                        <tr><td class="c c-iv">IV</td><td class="c">20</td><td>Mantener las medidas de control existentes, considerar soluciones o mejoras y hacer comprobaciones periódicas para asegurar que el riesgo aún es aceptable.</td></tr>
                    </tbody>
                </table></div>
            </div>

            <div class="guia-bloque">
                <h4>Tabla 9. Aceptabilidad del riesgo</h4>
                <div class="tabla-scroll"><table class="tabla-guia">
                    <thead><tr><th>Nivel</th><th>Significado</th><th>Explicación</th></tr></thead>
                    <tbody>
                        <tr><td class="c c-i">I</td><td>No Aceptable</td><td>Situación crítica, corrección urgente.</td></tr>
                        <tr><td class="c c-ii">II</td><td>No Aceptable o Aceptable con control específico</td><td>Corregir o adoptar medidas de control.</td></tr>
                        <tr><td class="c c-iii">III</td><td>Mejorable</td><td>Mejorar el control existente.</td></tr>
                        <tr><td class="c c-iv">IV</td><td>Aceptable</td><td>No intervenir, salvo que un análisis más preciso lo justifique.</td></tr>
                    </tbody>
                </table></div>
                <p>Al aceptar un riesgo tenga en cuenta el número de expuestos, la exposición a otros peligros y los grupos vulnerables, como personal nuevo o inexperto.</p>
            </div>
        </div>`;
}

// ================================================================
// ARRANQUE
// ================================================================

function arrancar(): void {
    const contenedor = document.querySelector('#matriz-detalle-container') as HTMLElement | null;
    if (!contenedor) {
        console.error('❌ No se encontró el contenedor #matriz-detalle-container.');
        return;
    }
    init(contenedor);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
} else {
    arrancar();
}

function init(contenedor: HTMLElement): void {
    // ================================================================
    // DATOS
    // ================================================================

    const empresaActiva = obtenerEmpresaActiva();

    // ✅ CORREGIDO: leer desde localStorage (coincide con matriz-listado.ts)
    const matrizId = localStorage.getItem('matrizIdActiva') || '';
    const motivoActualizacion = localStorage.getItem('motivoActualizacion') || null;

    if (!empresaActiva) {
        contenedor.innerHTML = `<div class="card"><p>⚠️ No hay empresa activa.</p></div>`;
        return;
    }
    if (!matrizId) {
        contenedor.innerHTML = `<div class="card"><p>⚠️ No se especificó una matriz.</p></div>`;
        return;
    }
    const matriz = storageMatrices.obtenerPorId(matrizId);
    if (!matriz) {
        contenedor.innerHTML = `<div class="card"><p>⚠️ Matriz no encontrada.</p></div>`;
        return;
    }

    let filas: FilaRiesgo[] = storageRiesgos
        .obtenerTodos()
        .filter(r => r.matrizId === matrizId)
        .map(r => aFila(r as IRiesgoMatriz));
    let tabActiva = PESTANAS[0].id;
    let hayCambios = false;

    // ================================================================
    // RENDERIZAR ESTRUCTURA
    // ================================================================

    contenedor.innerHTML = `
        <div class="card">
            <button id="btn-volver-listado" class="btn btn-outline btn-sm">← Volver al Listado</button>
        </div>

        <div class="matriz-encabezado">
            <div class="matriz-encabezado-titulo">MATRIZ DE RIESGOS</div>
            <div class="matriz-encabezado-subtitulo">
                IDENTIFICACIÓN DE PELIGROS, VALORACIÓN DE RIESGOS Y DETERMINACIÓN DE CONTROLES · MODELO SEGÚN NORMA GTC 45 ICONTEC
            </div>
            <div class="matriz-encabezado-grid">
                <div class="matriz-campo">
                    <label for="enc-nombre-centro">Nombre del Centro de Trabajo</label>
                    <input type="text" id="enc-nombre-centro" value="${escaparHTML(matriz.nombreCentroTrabajo)}" />
                </div>
                <div class="matriz-campo">
                    <label for="enc-nit">NIT</label>
                    <input type="text" id="enc-nit" value="${escaparHTML(matriz.nit)}" />
                </div>
                <div class="matriz-campo">
                    <label for="enc-num-trabajadores">No. de Trabajadores</label>
                    <input type="number" min="0" id="enc-num-trabajadores" value="${matriz.numTrabajadores}" />
                </div>
                <div class="matriz-campo">
                    <label for="enc-clase-riesgo">Clase de Riesgo de la Empresa</label>
                    <select id="enc-clase-riesgo">
                        ${['I', 'II', 'III', 'IV', 'V'].map(c => `<option value="${c}" ${matriz.claseRiesgoEmpresa === c ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="matriz-campo">
                    <label for="enc-fecha-ultima-eval">Fecha Última Evaluación</label>
                    <input type="date" id="enc-fecha-ultima-eval" value="${escaparHTML(matriz.fechaUltimaEvaluacion)}" />
                </div>
                <div class="matriz-campo">
                    <label for="enc-fecha-realizacion">Fecha de Realización</label>
                    <input type="date" id="enc-fecha-realizacion" value="${escaparHTML(matriz.fechaRealizacion)}" />
                </div>
                <div class="matriz-campo">
                    <label for="enc-responsables">Responsable(s) de la Empresa</label>
                    <input type="text" id="enc-responsables" value="${escaparHTML(matriz.responsablesEmpresa)}" />
                </div>
                <div class="matriz-campo">
                    <label for="enc-levantamiento">Levantamiento de la Información Realizado por</label>
                    <input type="text" id="enc-levantamiento" value="${escaparHTML(matriz.levantamientoPor)}" />
                </div>
                <div class="matriz-campo">
                    <label for="enc-licencia-so">Licencia en SO</label>
                    <input type="text" id="enc-licencia-so" value="${escaparHTML(matriz.licenciaSO)}" />
                </div>
                <div class="matriz-campo">
                    <label for="enc-verificado">Verificado por</label>
                    <input type="text" id="enc-verificado" value="${escaparHTML(matriz.verificadoPor)}" />
                </div>
                <div class="matriz-campo">
                    <label for="enc-asesorado">Asesorado por</label>
                    <input type="text" id="enc-asesorado" value="${escaparHTML(matriz.asesoradoPor || '')}" placeholder="Nombre del asesor" />
                </div>
            </div>
        </div>

        <div class="card">
            <div class="section-header">
                <h3>📋 Riesgos Identificados</h3>
                <button id="btn-nuevo-riesgo" class="btn btn-success">➕ Nuevo Riesgo</button>
            </div>
            <div id="md-resumen" class="md-resumen"></div>
        </div>

        <div class="card">
            <div class="md-tabs" id="md-tabs" role="tablist">
                ${PESTANAS.map((p, i) => `
                    ${i === 5 ? '<span class="md-tab-sep"></span>' : ''}
                    <button type="button" class="md-tab" role="tab" data-tab="${p.id}">${p.icono} ${p.titulo}</button>
                `).join('')}
            </div>
            <div class="md-panel" id="md-panel" role="tabpanel"></div>
        </div>

        <div class="card">
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="btn-guardar-matriz" class="btn btn-success">💾 Guardar Matriz</button>
                <button id="btn-cancelar-matriz" class="btn btn-outline">Cancelar</button>
            </div>
            <div id="mensaje-matriz" class="alert" style="display:none; margin-top: 10px;"></div>
        </div>
    `;

    // ================================================================
    // REFERENCIAS AL DOM
    // ================================================================

    const btnVolver = contenedor.querySelector('#btn-volver-listado') as HTMLButtonElement;
    const btnNuevoRiesgo = contenedor.querySelector('#btn-nuevo-riesgo') as HTMLButtonElement;
    const btnGuardar = contenedor.querySelector('#btn-guardar-matriz') as HTMLButtonElement;
    const btnCancelar = contenedor.querySelector('#btn-cancelar-matriz') as HTMLButtonElement;
    const mensajeMatriz = contenedor.querySelector('#mensaje-matriz') as HTMLElement;
    const tabsBar = contenedor.querySelector('#md-tabs') as HTMLElement;
    const panel = contenedor.querySelector('#md-panel') as HTMLElement;
    const resumen = contenedor.querySelector('#md-resumen') as HTMLElement;

    // ================================================================
    // CONVERSIONES
    // ================================================================

    function aFila(r: IRiesgoMatriz): FilaRiesgo {
        const completa = r.evaluacionCompleta !== false;
        return {
            id: r.id,
            proceso: r.proceso || '',
            tipoProceso: r.tipoProceso === 'No Rutinario' ? 'No Rutinario' : 'Rutinario',
            zona: r.zona || '',
            actividad: r.actividad || '',
            tarea: r.tarea || '',
            tipoActividad: r.tipoActividad === 'No Rutinaria' ? 'No Rutinaria' : 'Rutinaria',
            descripcionPeligro: r.descripcionPeligro || '',
            clasifPrincipal: r.clasifPrincipal || '',
            clasifEspecifica: r.clasifEspecifica || '',
            efectosPosibles: r.efectosPosibles || '',
            controlFuente: r.controlFuente || '',
            controlMedio: r.controlMedio || '',
            controlTrabajador: r.controlTrabajador || '',
            nd: completa ? (r.nivelDeficiencia ?? null) : null,
            ne: completa ? (r.nivelExposicion ?? null) : null,
            nc: completa ? (r.nivelConsecuencia ?? null) : null,
            numExpuestos: r.numExpuestos || 0,
            medEliminacion: r.medEliminacion || '',
            medSustitucion: r.medSustitucion || '',
            medIngenieria: r.medIngenieria || '',
            medAdministrativos: r.medAdministrativos || '',
            medEpp: r.medEpp || '',
            aspectosLegales: r.aspectosLegales === 'SI' ? 'SI' : 'NO',
            relacionRequisitos: r.relacionRequisitos || '',
            observacion: r.observacion || ''
        };
    }

    // ================================================================
    // RENDER DE PESTAÑAS
    // ================================================================

    function opciones(lista: { v: number; t: string }[], actual: number | null): string {
        return `<option value="">--</option>` + lista
            .map(o => `<option value="${o.v}" ${actual === o.v ? 'selected' : ''}>${o.t}</option>`)
            .join('');
    }

    function opcionesEspecifica(f: FilaRiesgo): string {
        const lista = CATALOGO_PELIGROS[f.clasifPrincipal] || [];
        const extra = f.clasifEspecifica && lista.indexOf(f.clasifEspecifica) === -1 ? [f.clasifEspecifica] : [];
        return `<option value="">--</option>` + lista.concat(extra)
            .map(op => `<option value="${escaparHTML(op)}" ${f.clasifEspecifica === op ? 'selected' : ''}>${escaparHTML(op)}</option>`)
            .join('');
    }

    function celda(f: FilaRiesgo, indice: number, c: Columna, res: Resultado): string {
        const valor = c.campo ? String((f as unknown as Record<string, unknown>)[c.campo] ?? '') : '';
        const ph = escaparHTML(c.ph || '');

        switch (c.tipo) {
            case 'indice':
                return `<td class="td-indice">${indice + 1}</td>`;
            case 'contexto':
                return `<td class="td-contexto"><strong>${escaparHTML(f.descripcionPeligro || 'Sin descripción')}</strong><span>${escaparHTML([f.actividad, f.tarea].filter(Boolean).join(' · '))}</span></td>`;
            case 'contextoActividad':
                return `<td class="td-contexto"><strong>${escaparHTML(f.actividad || '—')}</strong><span>${escaparHTML(f.tarea)}</span></td>`;
            case 'texto':
                return `<td><input type="text" data-campo="${c.campo}" value="${escaparHTML(valor)}" placeholder="${ph}" /></td>`;
            case 'area':
                return `<td><textarea rows="2" data-campo="${c.campo}" placeholder="${ph}">${escaparHTML(valor)}</textarea></td>`;
            case 'numero':
                return `<td><input type="number" min="0" data-campo="${c.campo}" value="${escaparHTML(valor)}" /></td>`;
            case 'tipoProceso':
                return `<td><select data-campo="tipoProceso">
                    <option value="Rutinario" ${f.tipoProceso === 'Rutinario' ? 'selected' : ''}>Rutinario</option>
                    <option value="No Rutinario" ${f.tipoProceso === 'No Rutinario' ? 'selected' : ''}>No Rutinario</option>
                </select></td>`;
            case 'tipoActividad':
                return `<td><select data-campo="tipoActividad">
                    <option value="Rutinaria" ${f.tipoActividad === 'Rutinaria' ? 'selected' : ''}>Rutinaria</option>
                    <option value="No Rutinaria" ${f.tipoActividad === 'No Rutinaria' ? 'selected' : ''}>No Rutinaria</option>
                </select></td>`;
            case 'siNo':
                return `<td><select data-campo="aspectosLegales">
                    <option value="NO" ${f.aspectosLegales === 'NO' ? 'selected' : ''}>NO</option>
                    <option value="SI" ${f.aspectosLegales === 'SI' ? 'selected' : ''}>SI</option>
                </select></td>`;
            case 'clasifPrincipal':
                return `<td><select data-campo="clasifPrincipal">
                    <option value="">--</option>
                    ${Object.keys(CATALOGO_PELIGROS).map(k => `<option value="${escaparHTML(k)}" ${f.clasifPrincipal === k ? 'selected' : ''}>${escaparHTML(k)}</option>`).join('')}
                </select></td>`;
            case 'clasifEspecifica':
                return `<td><select data-campo="clasifEspecifica">${opcionesEspecifica(f)}</select></td>`;
            case 'nd':
                return `<td><select data-campo="nd">${opciones(NIVELES_ND, f.nd)}</select></td>`;
            case 'ne':
                return `<td><select data-campo="ne">${opciones(NIVELES_NE, f.ne)}</select></td>`;
            case 'nc':
                return `<td><select data-campo="nc">${opciones(NIVELES_NC, f.nc)}</select></td>`;
            case 'nivelDef':
                return `<td colspan="4" class="calculado" data-calc="nivelDef">${res.nivelDef}</td>`;
            case 'omitir':
                return '';
            case 'calc':
                if (c.calc === 'intNR') {
                    return `<td><span class="resultado-riesgo ${res.claseNR}" data-calc="intNR">${res.intNR}</span></td>`;
                }
                return `<td class="calculado" data-calc="${c.calc}">${c.calc ? res[c.calc] : ''}</td>`;
            case 'acciones':
                return `<td style="text-align:center"><button type="button" class="btn btn-sm btn-danger btn-eliminar-riesgo" data-id="${escaparHTML(f.id)}" title="Eliminar riesgo" aria-label="Eliminar riesgo ${indice + 1}">🗑️</button></td>`;
        }
        return '<td></td>';
    }

    function todasLasColumnas(grupos: Grupo[]): Columna[] {
        return ([] as Columna[]).concat(...grupos.map(g => g.columnas));
    }

    function htmlEncabezado(grupos: Grupo[]): string {
        const estilo = (c: Columna) => c.ancho ? `style="min-width:${c.ancho}px"` : '';
        const fila1 = grupos.map(g => g.titulo
            ? `<th colspan="${g.columnas.length}" class="${g.clase}">${g.titulo}</th>`
            : g.columnas.map(c => `<th rowspan="2" class="${g.clase} ${c.tipo === 'indice' ? 'th-idx' : ''}" ${estilo(c)}>${c.titulo}</th>`).join('')
        ).join('');
        const fila2 = grupos
            .filter(g => g.titulo)
            .map(g => g.columnas.map(c => `<th class="${g.clase}" ${estilo(c)}>${c.titulo}</th>`).join(''))
            .join('');
        return `<thead><tr>${fila1}</tr><tr>${fila2}</tr></thead>`;
    }

    function htmlTablaRiesgos(p: Pestana): string {
        const grupos = p.grupos as Grupo[];
        const cols = todasLasColumnas(grupos);
        const minAncho = cols.reduce((s, c) => s + (c.ancho || 120), 0);

        const cuerpo = filas.length === 0
            ? `<tr><td class="td-vacio" colspan="${cols.length}">No hay riesgos registrados. Haga clic en «➕ Nuevo Riesgo» para agregar uno.</td></tr>`
            : filas.map((f, i) => {
                const res = calcular(f);
                return `<tr data-id="${escaparHTML(f.id)}">${cols.map(c => celda(f, i, c, res)).join('')}</tr>`;
            }).join('');

        return `
            <div class="info-box">${p.ayuda || ''}</div>
            <div class="tabla-scroll">
                <table class="tabla-matriz" style="min-width:${minAncho}px">
                    ${htmlEncabezado(grupos)}
                    <tbody>${cuerpo}</tbody>
                </table>
            </div>`;
    }

    function renderizarPanel(): void {
        const p = PESTANAS.filter(x => x.id === tabActiva)[0] || PESTANAS[0];

        if (p.id === 'dano') panel.innerHTML = htmlTabla1();
        else if (p.id === 'guia') panel.innerHTML = htmlGuia();
        else panel.innerHTML = htmlTablaRiesgos(p);

        tabsBar.querySelectorAll<HTMLElement>('.md-tab').forEach(b => {
            const activa = b.dataset.tab === p.id;
            b.classList.toggle('activa', activa);
            b.setAttribute('aria-selected', activa ? 'true' : 'false');
        });
    }

    function actualizarResumen(): void {
        const cuenta = { I: 0, II: 0, III: 0, IV: 0, sin: 0 };
        filas.forEach(f => {
            const k = calcular(f).intNR;
            if (k === 'I' || k === 'II' || k === 'III' || k === 'IV') cuenta[k]++;
            else cuenta.sin++;
        });
        const chip = (color: string, etiqueta: string, n: number) =>
            `<span class="md-chip"><i style="background:${color}"></i>${etiqueta} <b>${n}</b></span>`;
        resumen.innerHTML =
            `<span class="md-chip">Total <b>${filas.length}</b></span>` +
            chip('#DC2626', 'Nivel I', cuenta.I) +
            chip('#F59E0B', 'Nivel II', cuenta.II) +
            chip('#FCD34D', 'Nivel III', cuenta.III) +
            chip('#10B981', 'Nivel IV', cuenta.IV) +
            chip('#94a3b8', 'Sin evaluar', cuenta.sin);
    }

    // ================================================================
    // EDICIÓN
    // ================================================================

    function aplicarValor(f: FilaRiesgo, campo: CampoFila, valor: string): void {
        const destino = f as unknown as Record<string, string | number | null>;
        if (campo === 'nd' || campo === 'ne' || campo === 'nc') {
            destino[campo] = valor === '' ? null : parseInt(valor, 10);
        } else if (campo === 'numExpuestos') {
            destino[campo] = Math.max(0, parseInt(valor, 10) || 0);
        } else {
            destino[campo] = valor;
        }
    }

    function actualizarCalculos(tr: HTMLElement, f: FilaRiesgo): void {
        const res = calcular(f);
        tr.querySelectorAll<HTMLElement>('[data-calc]').forEach(el => {
            const k = el.dataset.calc as CalcKey;
            el.textContent = res[k];
            if (k === 'intNR') el.className = `resultado-riesgo ${res.claseNR}`;
        });
    }

    function onEditar(e: Event): void {
        const el = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const campo = el.dataset ? (el.dataset.campo as CampoFila | undefined) : undefined;
        if (!campo) return;
        if (el instanceof HTMLSelectElement && e.type === 'input') return;

        const tr = el.closest('tr[data-id]') as HTMLElement | null;
        if (!tr) return;
        const fila = filas.filter(f => f.id === tr.dataset.id)[0];
        if (!fila) return;

        aplicarValor(fila, campo, el.value);
        hayCambios = true;

        if (campo === 'nd' || campo === 'ne' || campo === 'nc') {
            actualizarCalculos(tr, fila);
            actualizarResumen();
        } else if (campo === 'clasifPrincipal') {
            fila.clasifEspecifica = '';
            const selEsp = tr.querySelector('[data-campo="clasifEspecifica"]') as HTMLSelectElement | null;
            if (selEsp) selEsp.innerHTML = opcionesEspecifica(fila);
        }
    }

    panel.addEventListener('input', onEditar);
    panel.addEventListener('change', onEditar);

    panel.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.btn-eliminar-riesgo') as HTMLElement | null;
        if (!btn) return;
        const id = btn.dataset.id;
        if (id && confirm('¿Eliminar este riesgo?')) {
            storageRiesgos.eliminar(id);
            filas = filas.filter(f => f.id !== id);
            renderizarPanel();
            actualizarResumen();
        }
    });

    tabsBar.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('.md-tab') as HTMLElement | null;
        if (!btn || !btn.dataset.tab) return;
        tabActiva = btn.dataset.tab;
        renderizarPanel();
    });

    contenedor.querySelector('.matriz-encabezado')?.addEventListener('input', () => { hayCambios = true; });

    // ================================================================
    // NUEVO RIESGO
    // ================================================================

    btnNuevoRiesgo.addEventListener('click', () => {
        const base = filas.length > 0 ? filas[filas.length - 1] : null;

        const nuevoRiesgo: IRiesgoMatriz = {
            id: generarIdUnico(),
            empresaId: empresaActiva,
            matrizId: matrizId,
            peligroId: '',
            reporteId: null,
            proceso: base ? base.proceso : '',
            zona: base ? base.zona : '',
            actividad: base ? base.actividad : '',
            tarea: base ? base.tarea : '',
            nivelDeficiencia: 2,
            nivelExposicion: 1,
            nivelProbabilidad: 2,
            nivelConsecuencia: 10,
            nivelRiesgo: 20,
            color: 'Verde',
            jerarquiaControl: null,
            planIntervencion: null,
            responsableIntervencion: null,
            fechaLimiteIntervencion: null,
            estado: 'Activo',
            fechaCreacion: new Date(),
            fechaActualizacion: new Date(),
            tipoProceso: base ? base.tipoProceso : 'Rutinario',
            tipoActividad: base ? base.tipoActividad : 'Rutinaria',
            descripcionPeligro: '',
            clasifPrincipal: '',
            clasifEspecifica: '',
            efectosPosibles: '',
            controlFuente: '',
            controlMedio: '',
            controlTrabajador: '',
            numExpuestos: 0,
            medEliminacion: '',
            medSustitucion: '',
            medIngenieria: '',
            medAdministrativos: '',
            medEpp: '',
            aspectosLegales: 'NO',
            relacionRequisitos: '',
            observacion: '',
            evaluacionCompleta: false
        };

        if (storageRiesgos.guardar(nuevoRiesgo)) {
            filas.push(aFila(nuevoRiesgo));
            hayCambios = true;
            if (tabActiva === 'dano' || tabActiva === 'guia') tabActiva = PESTANAS[0].id;
            renderizarPanel();
            actualizarResumen();
            const ultima = panel.querySelector('tbody tr:last-child input, tbody tr:last-child textarea, tbody tr:last-child select') as HTMLElement | null;
            if (ultima) ultima.focus();
        } else {
            alert('Error al guardar el riesgo.');
        }
    });

    // ================================================================
    // GUARDAR MATRIZ
    // ================================================================

    function valorEnc(id: string): string {
        return (contenedor.querySelector(id) as HTMLInputElement | HTMLSelectElement).value.trim();
    }

    btnGuardar.addEventListener('click', () => {
        const exitoMatriz = storageMatrices.actualizar(matrizId, {
            nombreCentroTrabajo: valorEnc('#enc-nombre-centro'),
            nit: valorEnc('#enc-nit'),
            numTrabajadores: parseInt(valorEnc('#enc-num-trabajadores'), 10) || 0,
            claseRiesgoEmpresa: valorEnc('#enc-clase-riesgo') as 'I' | 'II' | 'III' | 'IV' | 'V',
            fechaUltimaEvaluacion: valorEnc('#enc-fecha-ultima-eval'),
            fechaRealizacion: valorEnc('#enc-fecha-realizacion'),
            responsablesEmpresa: valorEnc('#enc-responsables'),
            levantamientoPor: valorEnc('#enc-levantamiento'),
            licenciaSO: valorEnc('#enc-licencia-so'),
            verificadoPor: valorEnc('#enc-verificado'),
            asesoradoPor: valorEnc('#enc-asesorado'),
            motivoActualizacion: motivoActualizacion,
            fechaActualizacion: new Date()
        });

        let exitoRiesgos = true;
        let sinEvaluar = 0;

        filas.forEach(f => {
            const completa = f.nd !== null && f.ne !== null && f.nc !== null;
            if (!completa) sinEvaluar++;
            const res = calcular(f);

            const cambios: Partial<IRiesgoMatriz> = {
                proceso: f.proceso.trim(),
                tipoProceso: f.tipoProceso,
                zona: f.zona.trim(),
                actividad: f.actividad.trim(),
                tarea: f.tarea.trim(),
                tipoActividad: f.tipoActividad,
                descripcionPeligro: f.descripcionPeligro.trim(),
                clasifPrincipal: f.clasifPrincipal,
                clasifEspecifica: f.clasifEspecifica,
                efectosPosibles: f.efectosPosibles.trim(),
                controlFuente: f.controlFuente.trim(),
                controlMedio: f.controlMedio.trim(),
                controlTrabajador: f.controlTrabajador.trim(),
                numExpuestos: f.numExpuestos,
                medEliminacion: f.medEliminacion.trim(),
                medSustitucion: f.medSustitucion.trim(),
                medIngenieria: f.medIngenieria.trim(),
                medAdministrativos: f.medAdministrativos.trim(),
                medEpp: f.medEpp.trim(),
                aspectosLegales: f.aspectosLegales,
                relacionRequisitos: f.relacionRequisitos.trim(),
                observacion: f.observacion.trim(),
                evaluacionCompleta: completa,
                nivelDeficiencia: (completa ? f.nd : 2) as IRiesgo['nivelDeficiencia'],
                nivelExposicion: (completa ? f.ne : 1) as IRiesgo['nivelExposicion'],
                nivelConsecuencia: (completa ? f.nc : 10) as IRiesgo['nivelConsecuencia'],
                nivelProbabilidad: (completa ? res.npNum : 2) as IRiesgo['nivelProbabilidad'],
                nivelRiesgo: (completa ? res.nrNum : 20) as IRiesgo['nivelRiesgo'],
                fechaActualizacion: new Date()
            };

            if (!storageRiesgos.actualizar(f.id, cambios)) exitoRiesgos = false;
        });

        if (exitoMatriz && exitoRiesgos) {
            hayCambios = false;
            mensajeMatriz.textContent = sinEvaluar > 0
                ? `✅ Matriz guardada. ${sinEvaluar} riesgo(s) siguen sin evaluar (falta ND, NE o NC).`
                : '✅ Matriz guardada correctamente.';
            mensajeMatriz.className = 'alert success';
            mensajeMatriz.style.display = 'block';
            setTimeout(() => { mensajeMatriz.style.display = 'none'; }, 4000);
            console.info('✅ Matriz y riesgos guardados.');
        } else {
            mensajeMatriz.textContent = '❌ Error al guardar la matriz.';
            mensajeMatriz.className = 'alert error';
            mensajeMatriz.style.display = 'block';
        }
    });

    // ================================================================
    // CANCELAR / VOLVER
    // ================================================================

    function salir(pregunta: string): void {
        if (!hayCambios || confirm(pregunta)) {
            hayCambios = false;
            localStorage.removeItem('matrizIdActiva');
            localStorage.removeItem('motivoActualizacion');
            window.close();
        }
    }

    btnCancelar.addEventListener('click', () => salir('¿Cancelar? Los cambios no guardados se perderán.'));
    btnVolver.addEventListener('click', () => salir('¿Volver al listado? Los cambios no guardados se perderán.'));

    window.addEventListener('beforeunload', (e) => {
        if (hayCambios) e.preventDefault();
    });

    // ================================================================
    // RENDERIZADO INICIAL
    // ================================================================

    renderizarPanel();
    actualizarResumen();

    console.info(`✅ Matriz "${matriz.nombreCentroTrabajo}" cargada.`);
}