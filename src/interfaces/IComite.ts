/**
 * src/interfaces/IComite.ts
 * 
 * Interfaces que definen la estructura de un Comité COPASST o Vigía en el
 * sistema, así como sus Actas de Reunión y Compromisos.
 * 
 * Corresponde al módulo M18 - Gestión de Comités (COPASST / Vigía).
 * 
 * Basado en:
 * - Resolución 2013 de 1986
 * - Decreto Ley 1295 de 1994 (Art. 63)
 * - Ley 1562 de 2012
 * - Decreto 1072 de 2015
 * - Resolución 0312 de 2019
 * 
 * @version 2.0.0 (extendida para M18: representantes, votación, capacitaciones, pasos)
 * @since 2026-08-31
 */

// ================================================================
// TIPOS PRINCIPALES
// ================================================================

/**
 * Tipo de comité según el tamaño de la empresa.
 * - COPASST: Comité Paritario de Seguridad y Salud en el Trabajo
 *            (empresas con ≥ 10 trabajadores).
 * - Vigia:   Vigía de Seguridad y Salud en el Trabajo
 *            (empresas con < 10 trabajadores).
 */
export type TipoComite = "COPASST" | "Vigia";

/**
 * Estado del comité.
 * - Activo:          Comité funcionando correctamente.
 * - Inactivo:        Comité suspendido o disuelto.
 * - EnFormalizacion: Comité en proceso de conformación.
 */
export type EstadoComite = "Activo" | "Inactivo" | "EnFormalizacion";

/**
 * Estado de un compromiso del plan de acción.
 * - Pendiente:  Aún no se ha iniciado.
 * - EnProgreso: En ejecución.
 * - Completado: Finalizado exitosamente.
 * - Vencido:    No se completó en plazo.
 */
export type EstadoCompromiso = "Pendiente" | "EnProgreso" | "Completado" | "Vencido";

/**
 * Estado de cada paso de la conformación del comité.
 * - Pendiente:  No se ha iniciado.
 * - EnProgreso: Se inició pero no se completó.
 * - Completado: Se completó y guardó.
 */
export type EstadoPaso = "Pendiente" | "EnProgreso" | "Completado";

/**
 * Parte del comité a la que pertenece un representante.
 * - Empleador:   Designado directamente por el Representante Legal.
 * - Trabajador:  Electo por votación de los trabajadores.
 */
export type ParteRepresentante = "Empleador" | "Trabajador";

/**
 * Rol de un representante dentro del comité.
 * - Principal: Miembro con voz y voto.
 * - Suplente:  Reemplaza al principal en ausencias.
 */
export type RolRepresentante = "Principal" | "Suplente";

/**
 * Tipo de reunión del comité.
 * - Ordinaria:      Reunión mensual programada.
 * - Extraordinaria: Reunión convocada por urgencia.
 */
export type TipoReunion = "Ordinaria" | "Extraordinaria";

// ================================================================
// SUB-INTERFACES
// ================================================================

/**
 * Interfaz IRepresentante
 * 
 * Representa a un miembro del comité (sea del empleador o de los
 * trabajadores, principal o suplente).
 * 
 * @property {string} nombre - Nombres y apellidos completos.
 * @property {string} cedula - Número de cédula de ciudadanía.
 * @property {string} cargo - Cargo actual en la empresa.
 * @property {RolRepresentante} rol - Principal o Suplente.
 * @property {ParteRepresentante} parte - Empleador o Trabajador.
 * @property {number} votos - Cantidad de votos obtenidos (solo si fue electo).
 */
export interface IRepresentante {
    nombre: string;
    cedula: string;
    cargo: string;
    rol: RolRepresentante;
    parte: ParteRepresentante;
    votos?: number;
}

/**
 * Interfaz ICapacitacionComite
 * 
 * Registra una capacitación brindada a los miembros del comité.
 * 
 * @property {string} id - Identificador único de la capacitación.
 * @property {string} fecha - Fecha de la capacitación (ISO YYYY-MM-DD).
 * @property {string} tema - Tema tratado.
 * @property {string} instructor - Nombre del instructor.
 * @property {string[]} asistentes - Nombres de los asistentes.
 * @property {string | null} observaciones - Observaciones adicionales.
 */
export interface ICapacitacionComite {
    id: string;
    fecha: string;
    tema: string;
    instructor: string;
    asistentes: string[];
    observaciones: string | null;
}

// ================================================================
// INTERFAZ PRINCIPAL: IComite
// ================================================================

/**
 * Interfaz IComite
 * 
 * Define la estructura completa de un comité (COPASST o Vigía) en el sistema.
 * 
 * @property {string} id - Identificador único del comité.
 * @property {string} empresaId - NIT de la empresa a la que pertenece.
 * @property {TipoComite} tipo - Tipo: COPASST o Vigia.
 * @property {string} nombre - Nombre descriptivo (ej. "COPASST - Planta Norte").
 * @property {string} ciudad - Ciudad o municipio donde se conforma.
 * @property {number} numeroTrabajadores - Cantidad total de trabajadores.
 * 
 * @property {string} fechaInicioVigencia - Inicio del período (ISO YYYY-MM-DD).
 * @property {string} fechaFinVigencia - Fin del período (ISO YYYY-MM-DD).
 * @property {EstadoComite} estado - Estado del comité.
 * 
 * @property {IRepresentante[]} representantesEmpleador - Reps. del empleador.
 * @property {IRepresentante[]} representantesTrabajadores - Reps. de trabajadores.
 * 
 * @property {number} votosBlancos - Total de votos en blanco.
 * @property {number} votosNulos - Total de votos nulos.
 * @property {number} totalHabilitados - Total de trabajadores habilitados para votar.
 * @property {number} totalEmitidos - Total de votos emitidos.
 * 
 * @property {string | null} presidenteId - Cédula del Presidente.
 * @property {string | null} secretarioId - Cédula del Secretario.
 * 
 * @property {string | null} fechaPublicacionConvocatoria - Fecha publicación (ISO).
 * @property {string | null} fechaAperturaInscripciones - Apertura inscripciones (ISO).
 * @property {string | null} fechaCierreInscripciones - Cierre inscripciones (ISO).
 * @property {string | null} fechaVotacion - Fecha de votación (ISO).
 * 
 * @property {ICapacitacionComite[]} capacitaciones - Capacitaciones dictadas.
 * 
 * @property {EstadoPaso} pasoConvocatoria - Estado del paso 2.
 * @property {EstadoPaso} pasoDesignacion - Estado del paso 3.
 * @property {EstadoPaso} pasoVotacion - Estado del paso 4.
 * @property {EstadoPaso} pasoConstitucion - Estado del paso 5.
 * @property {EstadoPaso} pasoCapacitacion - Estado del paso 6.
 * @property {EstadoPaso} pasoActas - Estado del paso 7.
 * @property {EstadoPaso} pasoSgSst - Estado del paso 8.
 * 
 * @property {string} actaEleccion - Nombre del archivo PDF del acta de elección.
 * @property {string[]} miembros - IDs de los usuarios que integran el comité.
 * 
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IComite {
    // --- Identificación ---
    id: string;
    empresaId: string;
    tipo: TipoComite;
    nombre: string;
    ciudad: string;
    numeroTrabajadores: number;

    // --- Vigencia ---
    fechaInicioVigencia: string;
    fechaFinVigencia: string;
    estado: EstadoComite;

    // --- Representantes ---
    representantesEmpleador: IRepresentante[];
    representantesTrabajadores: IRepresentante[];

    // --- Votación ---
    votosBlancos: number;
    votosNulos: number;
    totalHabilitados: number;
    totalEmitidos: number;

    // --- Roles internos ---
    presidenteId: string | null;
    secretarioId: string | null;

    // --- Cronograma de conformación ---
    fechaPublicacionConvocatoria: string | null;
    fechaAperturaInscripciones: string | null;
    fechaCierreInscripciones: string | null;
    fechaVotacion: string | null;

    // --- Capacitaciones ---
    capacitaciones: ICapacitacionComite[];

    // --- Estado de cada paso ---
    pasoConvocatoria: EstadoPaso;
    pasoDesignacion: EstadoPaso;
    pasoVotacion: EstadoPaso;
    pasoConstitucion: EstadoPaso;
    pasoCapacitacion: EstadoPaso;
    pasoActas: EstadoPaso;
    pasoSgSst: EstadoPaso;

    // --- Documentos ---
    actaEleccion: string;
    miembros: string[];

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

// ================================================================
// INTERFAZ: IActaReunion
// ================================================================

/**
 * Interfaz IActaReunion
 * 
 * Define la estructura de un acta de reunión del comité.
 * Se almacena como documento independiente vinculado al comité por su ID.
 * 
 * @property {string} id - Identificador único del acta.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} comiteId - ID del comité al que pertenece.
 * @property {number} numeroActa - Número consecutivo del acta.
 * @property {string} fechaReunion - Fecha de la reunión (ISO YYYY-MM-DD).
 * @property {string} horaInicio - Hora de inicio (HH:MM).
 * @property {string} horaCierre - Hora de cierre (HH:MM).
 * @property {TipoReunion} tipoReunion - Ordinaria o Extraordinaria.
 * @property {string} lugar - Lugar de la reunión.
 * @property {string[]} asistentes - Nombres de los asistentes.
 * @property {string[]} ausentes - Nombres de los ausentes.
 * @property {string} ordenDelDia - Orden del día (texto libre).
 * @property {string} desarrollo - Desarrollo de los temas tratados.
 * @property {string} resumen - Resumen del contenido del acta.
 * @property {string} archivoPDF - Nombre del archivo PDF del acta.
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IActaReunion {
    id: string;
    empresaId: string;
    comiteId: string;
    numeroActa: number;
    fechaReunion: string;
    horaInicio: string;
    horaCierre: string;
    tipoReunion: TipoReunion;
    lugar: string;
    asistentes: string[];
    ausentes: string[];
    ordenDelDia: string;
    desarrollo: string;
    resumen: string;
    archivoPDF: string;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

// ================================================================
// INTERFAZ: ICompromisoComite
// ================================================================

/**
 * Interfaz ICompromisoComite
 * 
 * Define la estructura de un compromiso o tarea derivada de una reunión.
 * 
 * @property {string} id - Identificador único del compromiso.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} actaId - ID del acta de reunión a la que pertenece.
 * @property {string} descripcion - Descripción del compromiso.
 * @property {string} responsable - Nombre del responsable de ejecutar.
 * @property {string} fechaLimite - Fecha límite (ISO YYYY-MM-DD).
 * @property {EstadoCompromiso} estado - Estado del compromiso.
 * @property {string | null} observaciones - Observaciones adicionales.
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface ICompromisoComite {
    id: string;
    empresaId: string;
    actaId: string;
    descripcion: string;
    responsable: string;
    fechaLimite: string;
    estado: EstadoCompromiso;
    observaciones: string | null;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}