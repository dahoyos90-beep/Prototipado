/**
 * src/interfaces/IConvivencia.ts
 * 
 * Interfaz que define la estructura del Comité de Convivencia Laboral (CCL)
 * en el sistema. Corresponde al módulo M21 - Gestión del Comité de Convivencia.
 * 
 * Basado en:
 * - Resolución 3461 de 2025 (MinTrabajo) — Reemplaza Res. 652 y 1356 de 2012
 * - Ley 2365 de 2024 (Acoso Sexual Laboral)
 * - Ley 1010 de 2006 (Acoso Laboral)
 * - Decreto 1072 de 2015 (SG-SST)
 * - Resolución 0312 de 2019 (Estándares Mínimos)
 * 
 * @version 2.0.0 (extendida para M21: representantes, votación, cronograma,
 *                  pasos, canales de queja. Se separan IQuejaConvivencia,
 *                  ICasoConvivencia e IActaConvivencia a sus propios archivos.)
 * @since 2026-08-31
 */

import type { IRepresentante } from './IComite.js';

// ================================================================
// TIPOS
// ================================================================

/**
 * Estado del Comité de Convivencia.
 * - Activo:          Comité funcionando correctamente.
 * - Inactivo:        Comité suspendido o disuelto.
 * - EnFormalizacion: Comité en proceso de conformación.
 */
export type EstadoConvivencia = "Activo" | "Inactivo" | "EnFormalizacion";

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
 * Ruta de una queja según la naturaleza del hecho.
 * - AcosoLaboral:          Ruta conciliatoria (Ley 1010 de 2006).
 * - AccoSexual:            Ruta de protección + traslado directo (Ley 2365 de 2024).
 * - ConflictoConvivencia:  Conflicto de convivencia general.
 */
export type RutaQueja = "AcosoLaboral" | "AcosoSexual" | "ConflictoConvivencia";

// ================================================================
// INTERFAZ PRINCIPAL: IConvivencia
// ================================================================

/**
 * Interfaz IConvivencia
 * 
 * Define la estructura completa del Comité de Convivencia Laboral (CCL).
 * 
 * @property {string} id - Identificador único del comité.
 * @property {string} empresaId - NIT de la empresa a la que pertenece.
 * @property {string} nombre - Nombre descriptivo.
 * @property {string} ciudad - Ciudad o municipio del centro de trabajo.
 * @property {number} numeroTrabajadores - Cantidad total de trabajadores.
 * 
 * @property {string} fechaInicioVigencia - Inicio del período (ISO YYYY-MM-DD).
 * @property {string} fechaFinVigencia - Fin del período (ISO YYYY-MM-DD).
 * @property {EstadoConvivencia} estado - Estado del comité.
 * 
 * @property {IRepresentante[]} representantesEmpleador - Reps. del empleador.
 * @property {IRepresentante[]} representantesTrabajadores - Reps. de trabajadores.
 * 
 * @property {string | null} presidenteId - Cédula del Presidente.
 * @property {string | null} secretarioId - Cédula del Secretario.
 * 
 * @property {string} canalQuejas - Correo electrónico oficial del CCL.
 * @property {string} buzonFisico - Ubicación del buzón físico de quejas.
 * 
 * @property {string | null} fechaPublicacionConvocatoria - Fecha publicación.
 * @property {string | null} fechaAperturaInscripciones - Apertura inscripciones.
 * @property {string | null} fechaCierreInscripciones - Cierre inscripciones.
 * @property {string | null} fechaVotacion - Fecha de votación.
 * 
 * @property {number} votosValidos - Total de votos válidos.
 * @property {number} votosBlancos - Total de votos en blanco.
 * @property {number} votosNulos - Total de votos nulos.
 * @property {number} totalHabilitados - Total de trabajadores habilitados.
 * @property {number} totalEmitidos - Total de votos emitidos.
 * 
 * @property {EstadoPaso} pasoConvocatoria - Estado del paso 1.
 * @property {EstadoPaso} pasoEleccion - Estado del paso 2.
 * @property {EstadoPaso} pasoDesignacion - Estado del paso 3.
 * @property {EstadoPaso} pasoConstitucion - Estado del paso 4.
 * @property {EstadoPaso} pasoCapacitacion - Estado del paso 5.
 * @property {EstadoPaso} pasoReglamento - Estado del paso 6.
 * 
 * @property {string} actaEleccion - Nombre del archivo PDF del acta de elección.
 * @property {string[]} miembros - IDs de los usuarios que integran el comité.
 * 
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IConvivencia {
    // --- Identificación ---
    id: string;
    empresaId: string;
    nombre: string;
    ciudad: string;
    numeroTrabajadores: number;

    // --- Vigencia ---
    fechaInicioVigencia: string;
    fechaFinVigencia: string;
    estado: EstadoConvivencia;

    // --- Representantes ---
    representantesEmpleador: IRepresentante[];
    representantesTrabajadores: IRepresentante[];

    // --- Roles internos ---
    presidenteId: string | null;
    secretarioId: string | null;

    // --- Canales de comunicación ---
    canalQuejas: string;
    buzonFisico: string;

    // --- Cronograma de conformación ---
    fechaPublicacionConvocatoria: string | null;
    fechaAperturaInscripciones: string | null;
    fechaCierreInscripciones: string | null;
    fechaVotacion: string | null;

    // --- Votación ---
    votosValidos: number;
    votosBlancos: number;
    votosNulos: number;
    totalHabilitados: number;
    totalEmitidos: number;

    // --- Estado de cada paso ---
    pasoConvocatoria: EstadoPaso;
    pasoEleccion: EstadoPaso;
    pasoDesignacion: EstadoPaso;
    pasoConstitucion: EstadoPaso;
    pasoCapacitacion: EstadoPaso;
    pasoReglamento: EstadoPaso;

    // --- Documentos ---
    actaEleccion: string;
    miembros: string[];

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}