/**
 * src/interfaces/ISociodemografico.ts
 * 
 * Interfaz que define la estructura del Perfil Sociodemográfico,
 * Condiciones de Salud, Seguridad y Afiliaciones para los trabajadores.
 * 
 * Se aplica una vez por trabajador (identificado por su cédula) y
 * puede ser editado posteriormente para corregir datos.
 * 
 * @version 1.5.0 (agregados empresaId, estadoTrabajador y fechas de inactividad/retiro)
 * @since 2026-09-08
 */

// ================================================================
// 1. ENUMS Y TIPOS PARA DATOS PERSONALES Y DEMOGRÁFICOS
// ================================================================

export type TipoDocumento = "Cédula" | "Cédula de extranjería" | "Permiso de trabajo" | "Otro";
export type Genero = "Femenino" | "Masculino" | "Otro";
export type EstadoCivil = "Soltero/a" | "Casado/a" | "Unión libre" | "Divorciado/a" | "Viudo/a";
export type MedioTransporte = "Automóvil" | "Moto" | "Bicicleta" | "Transporte público" | "Otro";
export type ZonaResidencia = "Urbana" | "Rural";
export type TipoVivienda = "Propia" | "Arrendada" | "Familiar" | "Otra";
export type CabezaFamilia = "Sí" | "No";
export type PersonasACargo = "Menor o igual a 2 personas" | "De 3 a 5 personas" | "Más de 5 personas" | "No aplica";
export type NivelEducacion = "Primaria" | "Bachillerato" | "Técnico/Tecnólogo" | "Profesional" | "Postgrado" | "Ninguno";
export type RangoIngresos = "Menos de 1 SMLV" | "De 1 a 2 SMLV" | "De 2 a 3 SMLV" | "De 3 a 4 SMLV" | "Más de 4 SMLV";
export type AntiguedadOficio = "Menos de 1 año" | "De 1 a 5 años" | "De 6 a 10 años" | "Más de 10 años";
export type VinculacionLaboral = "Contrato término fijo o indefinido" | "Obra labor contratada" | "Prestación de servicios" | "Otro";
export type JornadaLaboral = "Diurna" | "Nocturna" | "Turnos" | "Por horas";
export type RangoEdad = "Entre 18 y 25" | "Entre 26 y 35" | "Entre 36 y 45" | "Entre 46 y 55" | "Mayor a 55";

// 🆕 Estado del trabajador en la empresa
export type EstadoTrabajador = "Activo" | "Inactivo" | "Retirado";

// ================================================================
// 2. ENUMS Y TIPOS PARA CONDICIONES DE SALUD
// ================================================================

export type FrecuenciaDeporte = "A diario" | "1 o 2 veces por semana" | "Cada 15 días" | "Ocasionalmente" | "No practica" | "No sabe / No responde";
export type FrecuenciaConsumo = "A diario" | "Ocasionalmente" | "No fuma" | "No sabe / No responde"; // Para tabaco
export type FrecuenciaAlcohol = "1 vez a la semana" | "A diario" | "Cada quincena" | "Ocasionalmente" | "No consume";
export type AlimentacionDiaria = "Igual o más de 3 veces" | "Menos de 3 veces";
export type EstadoSaludGeneral = "Excelente" | "Bueno" | "Regular" | "Malo";

// Lista de enfermedades (selección múltiple)
export type EnfermedadDiagnosticada = 
    "Ninguna" | "Obesidad" | "Diabetes" | "Pérdida de la visión" | 
    "Hipertensión arterial" | "Cáncer" | "Pérdida de la audición" | 
    "Enfermedad pulmonar" | "Infarto" | "Insuficiencia renal" | "Otra";

// Lista de molestias (selección múltiple)
export type Molestia =
    "Ninguna" | "Dificultad respiratoria" | "Tos frecuente" | "Alteraciones digestivas" |
    "Dolor de cuello, espalda y cintura" | "Mal genio" | "Dolor de cabeza" |
    "Dolores musculares" | "Cansancio mental" | "Alteraciones del sueño (insomnio, somnolencia)" |
    "Cambios visuales" | "Dificultad para algún movimiento" | "Dolor en el pecho" |
    "Nerviosismo" | "Dificultad para concentrarse" | "Palpitaciones" | "Otro";

// Lista de discapacidades (selección múltiple)
export type Discapacidad = "Física o motora" | "Sensorial (Visual, Auditiva)" | "Intelectual o Mental" | "Ninguna" | "No sabe / No responde";

// ================================================================
// 3. ENUMS Y TIPOS PARA CONDICIONES DE SEGURIDAD Y COVID-19
// ================================================================

export type ConoceSG = "Sí" | "No";

// Lista de accidentes sufridos (selección múltiple)
export type TipoLesion = 
    "Ninguna" | "Golpes" | "Accidente de tránsito" | "Quemadura" | 
    "Amputación" | "Fractura" | "Torcedura (Esguince)" | "Caídas" | 
    "Heridas" | "Otro";

// Objeto que generó el accidente (selección simple)
export type ObjetoAccidente = 
    "Máquinas, equipos o herramientas" | "Medios de transporte" | 
    "Ambiente de trabajo (Escaleras, desniveles, etc.)" | "Animales" | 
    "Materiales o sustancias" | "Otro" | "No aplica";

// Parte del cuerpo afectada (selección simple)
export type ParteCuerpo = 
    "Cabeza o cuello" | "Tórax" | "Abdomen" | "Tronco (Espalda)" | 
    "Brazos o manos" | "Piernas o pies" | "Ubicaciones múltiples" | "Otro" | "No aplica";

// Lista de riesgos laborales (selección múltiple)
export type RiesgoLaboral =
    "Esfuerzos inadecuados o movimientos repetitivos" |
    "Levantamiento o cargue de elementos pesados" |
    "Infecciones por virus, bacterias u otros" |
    "Accidentes de tránsito" |
    "Ruidos fuertes" |
    "Posturas inadecuadas" |
    "Horarios y cargas de trabajo excesivas" |
    "Contacto con químicos peligrosos y no peligrosos" |
    "Contacto con máquinas o herramientas" |
    "Caída de objetos" |
    "Robos, atentados terroristas o desorden público" |
    "Exceso de calor o frío" |
    "Pisos irregulares o con desniveles" |
    "Incendios o explosiones" |
    "Falta de participación en la toma de decisiones que afectan al trabajador" |
    "Falta de claridad de las funciones del oficio" |
    "Ninguno";

export type CovidPositivo = "Sí" | "No";
export type VacunadoCovid = "Sí" | "No";

// ================================================================
// 4. INTERFAZ PRINCIPAL (agrupa todas las secciones)
// ================================================================

/**
 * Interfaz que define el perfil sociodemográfico completo de un trabajador.
 * 
 * @property id - Número de cédula o documento de identidad (único, usado como clave primaria).
 * @property empresaId - NIT de la empresa a la que pertenece el trabajador.
 * @property nombreCompleto - Nombre completo del trabajador.
 * @property tipoDocumento - Tipo de documento de identidad.
 * @property genero - Género del trabajador.
 * @property estadoCivil - Estado civil actual.
 * @property oficio - Cargo u oficio actual.
 * @property medioTransporte - Medio de transporte habitual.
 * @property zonaResidencia - Zona de residencia (urbana/rural).
 * @property tipoVivienda - Tipo de vivienda (propia, arrendada, etc.).
 * @property esCabezaFamilia - Indica si es cabeza de familia.
 * @property personasACargo - Número de personas a cargo.
 * @property nivelEducacion - Nivel educativo más alto alcanzado.
 * @property ingresosMensuales - Rango de ingresos mensuales en SMLV.
 * @property antiguedadOficio - Antigüedad en el oficio actual.
 * @property vinculacionLaboral - Tipo de vinculación laboral.
 * @property jornadaLaboral - Tipo de jornada laboral.
 * @property fechaNacimiento - Fecha de nacimiento (ISO YYYY-MM-DD).
 * @property rangoEdad - Rango de edad calculado automáticamente.
 * @property fechaIngreso - Fecha de ingreso a la empresa (ISO YYYY-MM-DD).
 * @property fechaRetiro - Fecha de retiro (null si está activo o inactivo).
 * @property estadoTrabajador - Estado del trabajador (Activo, Inactivo, Retirado).
 * @property fechaInicioInactividad - Fecha de inicio de inactividad (null si no aplica).
 * @property fechaFinInactividad - Fecha de fin de inactividad (null si no aplica).
 * @property motivoRetiro - Motivo del retiro (null si no aplica).
 * 
 * @property eps - Nombre de la EPS (puede ser null).
 * @property epsSoporte - Base64 del soporte de EPS (puede ser null).
 * @property arl - Nombre de la ARL (puede ser null).
 * @property arlSoporte - Base64 del soporte de ARL (puede ser null).
 * @property afp - Nombre de la AFP (puede ser null).
 * @property afpSoporte - Base64 del soporte de AFP (puede ser null).
 * @property cajaCompensacion - Nombre de la Caja de Compensación (puede ser null).
 * @property cajaCompensacionSoporte - Base64 del soporte de Caja de Compensación (puede ser null).
 * 
 * @property frecuenciaDeporte - Frecuencia con que practica deporte.
 * @property fuma - Frecuencia de consumo de tabaco.
 * @property consumoAlcohol - Frecuencia de consumo de alcohol.
 * @property alimentacionDiaria - Número de comidas al día.
 * @property estadoSaludGeneral - Percepción general del estado de salud.
 * @property enfermedadesDiagnosticadas - Lista de enfermedades diagnosticadas (selección múltiple).
 * @property molestiasFrecuentes - Lista de molestias frecuentes en los últimos 6 meses.
 * @property discapacidad - Lista de discapacidades declaradas.
 * 
 * @property conoceSG_SST - Conocimiento del SG-SST en la empresa.
 * @property accidentesSufridos - Lista de accidentes sufridos durante el oficio.
 * @property objetoAccidente - Objeto que generó el accidente más reciente.
 * @property parteCuerpoAfectada - Parte del cuerpo afectada en el accidente.
 * @property riesgosLaborales - Lista de riesgos laborales a los que está expuesto.
 * @property covidPositivo - Indica si ha tenido COVID-19 con prueba positiva.
 * @property vacunadoCovid - Indica si está vacunado contra COVID-19.
 * 
 * @property fechaCreacion - Fecha de creación del perfil.
 * @property fechaActualizacion - Fecha de última actualización del perfil.
 */
export interface ISociodemografico {
    // --- Identificador único (cédula) ---
    id: string; // Usamos "id" para cumplir con IStorable de StorageService

    // --- Empresa a la que pertenece ---
    empresaId: string; // NIT de la empresa

    // --- Datos Personales y Demográficos ---
    nombreCompleto: string;
    tipoDocumento: TipoDocumento;
    genero: Genero;
    estadoCivil: EstadoCivil;
    oficio: string;
    medioTransporte: MedioTransporte;
    zonaResidencia: ZonaResidencia;
    tipoVivienda: TipoVivienda;
    esCabezaFamilia: CabezaFamilia;
    personasACargo: PersonasACargo;
    nivelEducacion: NivelEducacion;
    ingresosMensuales: RangoIngresos;
    antiguedadOficio: AntiguedadOficio;
    vinculacionLaboral: VinculacionLaboral;
    jornadaLaboral: JornadaLaboral;
    fechaNacimiento: string; // ISO YYYY-MM-DD
    rangoEdad: RangoEdad;
    fechaIngreso: string; // ISO YYYY-MM-DD
    fechaRetiro: string | null; // ISO YYYY-MM-DD (null si activo o inactivo)

    // 🆕 Estado del trabajador y fechas de inactividad/retiro
    estadoTrabajador: EstadoTrabajador;
    fechaInicioInactividad: string | null;
    fechaFinInactividad: string | null;
    motivoRetiro: string | null;

    // --- Afiliaciones y soportes ---
    eps: string | null;
    epsSoporte: string | null; // Base64 del archivo
    arl: string | null;
    arlSoporte: string | null; // Base64 del archivo
    afp: string | null;
    afpSoporte: string | null; // Base64 del archivo
    cajaCompensacion: string | null;
    cajaCompensacionSoporte: string | null; // Base64 del archivo

    // --- Condiciones de Salud ---
    frecuenciaDeporte: FrecuenciaDeporte;
    fuma: FrecuenciaConsumo;
    consumoAlcohol: FrecuenciaAlcohol;
    alimentacionDiaria: AlimentacionDiaria;
    estadoSaludGeneral: EstadoSaludGeneral;
    enfermedadesDiagnosticadas: EnfermedadDiagnosticada[];
    molestiasFrecuentes: Molestia[];
    discapacidad: Discapacidad[];

    // --- Condiciones de Seguridad y COVID-19 ---
    conoceSG_SST: ConoceSG;
    accidentesSufridos: TipoLesion[];
    objetoAccidente: ObjetoAccidente;
    parteCuerpoAfectada: ParteCuerpo;
    riesgosLaborales: RiesgoLaboral[];
    covidPositivo: CovidPositivo;
    vacunadoCovid: VacunadoCovid;

    // --- Metadatos del perfil ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}