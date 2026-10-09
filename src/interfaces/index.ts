/**
 * src/interfaces/index.ts
 * 
 * Exporta todas las interfaces del sistema.
 * Punto de entrada único para importar tipos desde cualquier módulo.
 * 
 * @version 2.1.0 (M23: actualizados exports a los 5 archivos separados:
 *                  IIndicador, IResultadoIndicador, ITendenciaIndicador,
 *                  ICalculoHHT, IPlanAccionIndicador)
 * @since 2026-08-31
 */

// ================================================================
// M01 - Gestión de Usuarios
// ================================================================
export { IUsuario, RolUsuario, EstadoUsuario } from './IUsuario.js';

// ================================================================
// M02 - Gestión de Empresas
// ================================================================
export { IEmpresa, EstadoEmpresa, EstadoEliminacion } from './IEmpresa.js';

// ================================================================
// M12 - Gestión de Peligros (catálogo + encuesta de auto-reporte)
// ================================================================
export {
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
export {
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

export { IMatriz, ClaseRiesgoEmpresa } from './IMatriz.js';

// ================================================================
// M17 - Plan de Trabajo y Capacitación
// ================================================================

// --- Plan de Capacitación ---
export {
    ICapacitacion,
    TipoActividad,
    EstadoEjecucion,
    FrecuenciaActividad
} from './ICapacitacion.js';

export { IActividadCapacitacion } from './IActividadCapacitacion.js';

// --- Plan de Trabajo ---
export { IPlanTrabajo } from './IPlanTrabajo.js';
export { IActividadPlanTrabajo, EtapaPHVA } from './IActividadPlanTrabajo.js';

// --- Recursos y medición (compartidos por ambos planes) ---
export { IRecursosPlan } from './IRecursosPlan.js';
export { IMedicionPlan } from './IMedicionPlan.js';

// ================================================================
// M18 - Gestión de Comités (COPASST / Vigía)
// ================================================================
// ⚠️ NOTA: EstadoPaso, ParteRepresentante y RolRepresentante se exportan
//         ÚNICAMENTE desde aquí (son compartidos con M21).
export {
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
export {
    IConvivencia,
    EstadoConvivencia,
    RutaQueja
} from './IConvivencia.js';

// --- Queja ---
export {
    IQuejaConvivencia,
    EstadoQueja,
    TipoQueja
} from './IQuejaConvivencia.js';

// --- Caso ---
export {
    ICasoConvivencia,
    ISeguimientoCaso,
    ResultadoCaso,
    EstadoSeguimiento
} from './ICasoConvivencia.js';

// --- Acta de reunión ---
export {
    IActaConvivencia,
    TipoReunionConvivencia
} from './IActaConvivencia.js';

// --- Entrevista individual reservada ---
export {
    IEntrevistaConvivencia,
    RolEntrevistado
} from './IEntrevistaConvivencia.js';

// --- Plan de mejora ---
export {
    IPlanMejoraConvivencia,
    ISeguimientoPlanMejora,
    EstadoPlanMejora,
    EstadoSeguimientoPlan
} from './IPlanMejoraConvivencia.js';

// --- Compromiso de confidencialidad ---
export {
    ICompromisoConfidencialidad,
    ParteConfidencialidad,
    RolConfidencialidad,
    TipoMiembroConfidencialidad
} from './ICompromisoConfidencialidad.js';

// --- Informe de gestión ---
export {
    IInformeConvivencia,
    IIndicadoresConvivencia,
    TipoInformeConvivencia,
    PeriodoInformeConvivencia,
    EstadoInformeConvivencia
} from './IInformeConvivencia.js';

// --- Reglamento interno ---
export {
    IReglamentoInternoCCL,
    EstadoReglamento
} from './IReglamentoInternoCCL.js';

// ================================================================
// M23 - Gestión de Indicadores
// ================================================================

// --- Indicador (datos maestros / ficha técnica) ---
export {
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
export { IResultadoIndicador } from './IResultadoIndicador.js';

// --- Tendencia del indicador (análisis histórico) ---
export {
    ITendenciaIndicador,
    IDatoHistorico
} from './ITendenciaIndicador.js';

// --- Cálculo de Horas Hombre Trabajadas (HHT) ---
export {
    ICalculoHHT,
    OrigenCalculoHHT,
    EstadoCalculoHHT
} from './ICalculoHHT.js';

// --- Plan de acción del indicador ---
export {
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
export {
    IAusentismo,
    ICausaAusentismo,
    IEstadisticaAusentismo,
    IReporteAusentismo,
    CausaAusentismo,
    EstadoNovedad,
    TipoJornada
} from './IAusentismo.js';

// ================================================================
// M25 - Siniestralidad
// ================================================================
export {
    ISiniestro,
    IIndicadoresSiniestralidad,
    ITendenciaSiniestralidad,
    IConsolidadoAnualSiniestralidad,
    TipoSiniestro,
    EstadoSiniestro,
    GravedadLesion
} from './ISiniestro.js';

// ================================================================
// M10 - Condiciones de Salud (EMO + Encuestas + Estadísticas)
// ================================================================
export {
    IEMO,
    TipoEMO,
    EstadoVigenciaEMO,
    ResultadoEMO
} from './IEMO.js';

export {
    IEncuesta,
    TipoEncuesta,
    EstadoEncuesta,
    NivelRiesgoEncuesta
} from './IEncuesta.js';

export { IEstadisticaSalud } from './IEstadisticaSalud.js';
export { IAlertaSalud } from './IAlertaSalud.js';

// ================================================================
// M11 - Perfil y Afiliaciones (Perfil Sociodemográfico)
// ================================================================
export {
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
export { IInspeccion, TipoRiesgo, EstadoInspeccion } from './IInspeccion.js';

// ================================================================
// Transversal - Notificaciones
// ================================================================
export { INotificacion, TipoNotificacion } from './INotificacion.js';

// ================================================================
// Transversal - Sesión
// ================================================================
export { ISession } from './ISession.js';

// ================================================================
// Transversal - Exportación
// ================================================================
export { ITablaExportacion, IConfigExportacion } from './IExportacion.js';