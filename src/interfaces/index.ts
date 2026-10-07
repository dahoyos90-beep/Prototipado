/**
 * src/interfaces/index.ts
 * 
 * Exporta todas las interfaces del sistema.
 * Punto de entrada único para importar tipos desde cualquier módulo.
 * 
 * @version 1.8.0 (agregadas exportaciones de IPlanTrabajo, IActividadPlanTrabajo y EtapaPHVA)
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
// M18 - Comités (COPASST / Vigía)
// ================================================================
export {
    IComite,
    IActaReunion,
    ICompromisoComite,
    TipoComite,
    EstadoComite,
    EstadoCompromiso
} from './IComite.js';

// ================================================================
// M21 - Comité de Convivencia
// ================================================================
export {
    IConvivencia,
    IQuejaConvivencia,
    ICasoConvivencia,
    IActaConvivencia,
    EstadoConvivencia,
    EstadoQueja,
    TipoQueja
} from './IConvivencia.js';

// ================================================================
// M23 - Indicadores
// ================================================================
export {
    IIndicador,
    IResultadoIndicador,
    ITendenciaIndicador,
    ClasificacionIndicador,
    TipoResultado,
    EstadoIndicador,
    Periodicidad
} from './IIndicador.js';

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