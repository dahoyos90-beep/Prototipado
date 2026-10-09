/**
 * src/interfaces/index.ts
 * 
 * Exporta todas las interfaces del sistema.
 * Punto de entrada único para importar tipos desde cualquier módulo.
 * 
 * @version 2.4.1
 *  - M25: re-exportado IResumenMensualSiniestralidad (ya no colisiona con
 *    IResumenMensualAnual de M24 porque se renombró en el archivo fuente).
 * 
 * @version 2.4.0
 *  - M25: reescrito el bloque completo. Se eliminan IIndicadoresSiniestralidad
 *    e ITendenciaSiniestralidad (ya no existen). Se agregan las 6 interfaces
 *    nuevas + tipos auxiliares.
 * 
 * @version 2.3.0
 *  - I1: re-exportación con `export type` (universal para verbatimModuleSyntax
 *        e isolatedModules en TS 5.9.3).
 * 
 * @version 2.2.0 (M24: agregados exports de IEventoAusentismo, IParametrosMes,
 *                  IEstadisticaMensual e IConsolidadoAnual con sus tipos auxiliares)
 * @since 2026-08-31
 */

// ================================================================
// M01 - Gestión de Usuarios
// ================================================================
export type { IUsuario, RolUsuario, EstadoUsuario } from './IUsuario.js';

// ================================================================
// M02 - Gestión de Empresas
// ================================================================
export type { IEmpresa, EstadoEmpresa, EstadoEliminacion } from './IEmpresa.js';

// ================================================================
// M12 - Gestión de Peligros (catálogo + encuesta de auto-reporte)
// ================================================================
export type {
    IPeligro,
    CategoriaPeligro,
    FrecuenciaPeligro,
    EstadoPeligro,
    ClasificacionEncuestaPeligro,
    PreguntaPeligroId,
    IRespuestaPeligro,
    EstadoReportePeligro,
    IReportePeligro
} from './IPeligro.js';

// ================================================================
// M13 - Matriz de Peligros y Riesgos (GTC 45)
// ================================================================
export type {
    IRiesgo,
    NivelDeficiencia,
    NivelExposicion,
    NivelProbabilidad,
    NivelConsecuencia,
    NivelRiesgo,
    ColorRiesgo,
    JerarquiaControl,
    EstadoRiesgo,
    TipoActividadMatriz,
    AspectosLegalesMatriz
} from './IRiesgo.js';

export type { IMatriz, ClaseRiesgoEmpresa } from './IMatriz.js';

// ================================================================
// M17 - Plan de Trabajo y Capacitación
// ================================================================

// --- Plan de Capacitación ---
export type {
    ICapacitacion,
    TipoActividad,
    EstadoEjecucion,
    FrecuenciaActividad
} from './ICapacitacion.js';

export type { IActividadCapacitacion } from './IActividadCapacitacion.js';

// --- Plan de Trabajo ---
export type { IPlanTrabajo } from './IPlanTrabajo.js';
export type { IActividadPlanTrabajo, EtapaPHVA } from './IActividadPlanTrabajo.js';

// --- Recursos y medición (compartidos por ambos planes) ---
export type { IRecursosPlan } from './IRecursosPlan.js';
export type { IMedicionPlan } from './IMedicionPlan.js';

// ================================================================
// M18 - Gestión de Comités (COPASST / Vigía)
// ================================================================
// ⚠️ NOTA: EstadoPaso, ParteRepresentante y RolRepresentante se exportan
//         ÚNICAMENTE desde aquí (son compartidos con M21).
export type {
    // --- Interfaces principales ---
    IComite,
    IActaReunion,
    ICompromisoComite,

    // --- Sub-interfaces ---
    IRepresentante,
    ICapacitacionComite,

    // --- Tipos principales ---
    TipoComite,
    EstadoComite,
    EstadoCompromiso,

    // --- Tipos compartidos (M18 + M21) ---
    EstadoPaso,
    ParteRepresentante,
    RolRepresentante,
    TipoReunion
} from './IComite.js';

// ================================================================
// M21 - Gestión del Comité de Convivencia Laboral (CCL)
// ================================================================
// ⚠️ NOTA: NO se re-exportan EstadoPaso, ParteRepresentante ni
//         RolRepresentante porque ya están exportados desde M18.

// --- Comité principal ---
export type {
    IConvivencia,
    EstadoConvivencia,
    RutaQueja
} from './IConvivencia.js';

// --- Queja ---
export type {
    IQuejaConvivencia,
    EstadoQueja,
    TipoQueja
} from './IQuejaConvivencia.js';

// --- Caso ---
export type {
    ICasoConvivencia,
    ISeguimientoCaso,
    ResultadoCaso,
    EstadoSeguimiento
} from './ICasoConvivencia.js';

// --- Acta de reunión ---
export type {
    IActaConvivencia,
    TipoReunionConvivencia
} from './IActaConvivencia.js';

// --- Entrevista individual reservada ---
export type {
    IEntrevistaConvivencia,
    RolEntrevistado
} from './IEntrevistaConvivencia.js';

// --- Plan de mejora ---
export type {
    IPlanMejoraConvivencia,
    ISeguimientoPlanMejora,
    EstadoPlanMejora,
    EstadoSeguimientoPlan
} from './IPlanMejoraConvivencia.js';

// --- Compromiso de confidencialidad ---
export type {
    ICompromisoConfidencialidad,
    ParteConfidencialidad,
    RolConfidencialidad,
    TipoMiembroConfidencialidad
} from './ICompromisoConfidencialidad.js';

// --- Informe de gestión ---
export type {
    IInformeConvivencia,
    IIndicadoresConvivencia,
    TipoInformeConvivencia,
    PeriodoInformeConvivencia,
    EstadoInformeConvivencia
} from './IInformeConvivencia.js';

// --- Reglamento interno ---
export type {
    IReglamentoInternoCCL,
    EstadoReglamento
} from './IReglamentoInternoCCL.js';

// ================================================================
// M23 - Gestión de Indicadores
// ================================================================

// --- Indicador (datos maestros / ficha técnica) ---
export type {
    IIndicador,
    ClasificacionIndicador,
    TipoResultado,
    EstadoIndicador,
    Periodicidad,
    TipoIndicadorMinimo,
    NivelSemaforo,
    TipoMedida,
    TipoCalculoAutomatico,
    TipoTendencia,
    DestinatarioIndicador
} from './IIndicador.js';

// --- Resultado del indicador (valor por periodo) ---
export type { IResultadoIndicador } from './IResultadoIndicador.js';

// --- Tendencia del indicador (análisis histórico) ---
export type {
    ITendenciaIndicador,
    IDatoHistorico
} from './ITendenciaIndicador.js';

// --- Cálculo de Horas Hombre Trabajadas (HHT) ---
export type {
    ICalculoHHT,
    OrigenCalculoHHT,
    EstadoCalculoHHT
} from './ICalculoHHT.js';

// --- Plan de acción del indicador ---
export type {
    IPlanAccionIndicador,
    IAccionPlan,
    ISeguimientoPlanAccion,
    EstadoPlanAccion,
    TipoAccionPlan,
    EstadoAccionPlan
} from './IPlanAccionIndicador.js';

// ================================================================
// M24 - Ausentismo
// ================================================================

// --- Interfaz legacy (marcada @deprecated, mantenida por compatibilidad) ---
export type {
    IAusentismo,
    ICausaAusentismo,
    IEstadisticaAusentismo,
    IReporteAusentismo,
    CausaAusentismo,
    EstadoNovedad,
    TipoJornada
} from './IAusentismo.js';

// --- Nueva interfaz de evento individual (12 conceptos por horas) ---
export type {
    IEventoAusentismo,
    CodigoConceptoAusentismo,
    CodigoAusentismoLey,
    CodigoPermisoLaboral
} from './IEventoAusentismo.js';

// --- Parámetros del mes (periodo, días, empleados, jornada) ---
export type { IParametrosMes } from './IParametrosMes.js';

// --- Cierre mensual (bloques Ley / Permisos + días + indicadores) ---
export type {
    IEstadisticaMensual,
    IBloqueIndicadores,
    DiasPorConcepto,
    CodigoConceptoDias,
    EstadoCierreMensual
} from './IEstadisticaMensual.js';

// --- Consolidado anual (matriz 12 meses × 12 conceptos + comparación años) ---
// ⚠️ NOTA: IResumenMensualAnual se exporta ÚNICAMENTE desde aquí (M24).
//         El M25 tiene un tipo homónimo ya renombrado a
//         IResumenMensualSiniestralidad (en su propio archivo).
export type {
    IConsolidadoAnual,
    IResumenMensualAnual,
    IBloqueAnual,
    IComparacionAnio,
    ITopConceptoAnual
} from './IConsolidadoAnual.js';

// ================================================================
// M25 - Siniestralidad
// ================================================================

// --- Registro Nominal de Accidentes e Incidentes (evento por evento) ---
export type {
    ISiniestro,
    TipoSiniestro,
    EstadoSiniestro,
    GravedadLesion,
    SexoTrabajador,
    DiaSemana
} from './ISiniestro.js';

// --- Configuración anual (encabezado + jornada + constantes + metas) ---
export type {
    IConfiguracionSiniestralidad,
    IMetasSiniestralidad,
    JornadaReferencia
} from './IConfiguracionSiniestralidad.js';

// --- Registro mensual (matriz 12 meses × 6 variables) ---
export type { IRegistroMensualSiniestralidad } from './IRegistroMensualSiniestralidad.js';

// --- Indicadores mensuales calculados (IF, IF_inc, IS, ILI, %Inv) ---
export type {
    IIndicadoresMensualesSiniestralidad,
    EscenarioJornada
} from './IIndicadoresMensualesSiniestralidad.js';

// --- Consolidado anual (sumas + recálculo ponderado + rankings) ---
export type {
    IConsolidadoAnualSiniestralidad,
    IResumenMensualSiniestralidad,
    ITopMesSiniestralidad,
    ITopAreaSiniestralidad
} from './IConsolidadoAnualSiniestralidad.js';

// --- Análisis cualitativo trimestral (4 bloques de texto) ---
export type {
    IAnalisisTrimestralSiniestralidad,
    NumeroTrimestre,
    MesesTrimestre
} from './IAnalisisTrimestralSiniestralidad.js';

// ================================================================
// M10 - Condiciones de Salud (EMO + Encuestas + Estadísticas)
// ================================================================
export type {
    IEMO,
    TipoEMO,
    EstadoVigenciaEMO,
    ResultadoEMO
} from './IEMO.js';

export type {
    IEncuesta,
    TipoEncuesta,
    EstadoEncuesta,
    NivelRiesgoEncuesta
} from './IEncuesta.js';

export type { IEstadisticaSalud } from './IEstadisticaSalud.js';
export type { IAlertaSalud } from './IAlertaSalud.js';

// ================================================================
// M11 - Perfil y Afiliaciones (Perfil Sociodemográfico)
// ================================================================
export type {
    ISociodemografico,
    TipoDocumento,
    Genero,
    EstadoCivil,
    MedioTransporte,
    ZonaResidencia,
    TipoVivienda,
    CabezaFamilia,
    PersonasACargo,
    NivelEducacion,
    RangoIngresos,
    AntiguedadOficio,
    VinculacionLaboral,
    JornadaLaboral,
    RangoEdad,
    EstadoTrabajador,
    FrecuenciaDeporte,
    FrecuenciaConsumo,
    FrecuenciaAlcohol,
    AlimentacionDiaria,
    EstadoSaludGeneral,
    EnfermedadDiagnosticada,
    Molestia,
    Discapacidad,
    ConoceSG,
    TipoLesion,
    ObjetoAccidente,
    ParteCuerpo,
    RiesgoLaboral,
    CovidPositivo,
    VacunadoCovid
} from './ISociodemografico.js';

// ================================================================
// Transversal - Inspecciones
// ================================================================
export type { IInspeccion, TipoRiesgo, EstadoInspeccion } from './IInspeccion.js';

// ================================================================
// Transversal - Notificaciones
// ================================================================
export type { INotificacion, TipoNotificacion } from './INotificacion.js';

// ================================================================
// Transversal - Sesión
// ================================================================
export type { ISession } from './ISession.js';

// ================================================================
// Transversal - Exportación
// ================================================================
export type { ITablaExportacion, IConfigExportacion } from './IExportacion.js';