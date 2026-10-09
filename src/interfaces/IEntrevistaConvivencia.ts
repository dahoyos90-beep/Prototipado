/**
 * src/interfaces/IEntrevistaConvivencia.ts
 * 
 * Interfaz que define la estructura de una Entrevista Individual Reservada
 * en el Comité de Convivencia Laboral (CCL). Corresponde al módulo M21 -
 * Gestión del Comité de Convivencia.
 * 
 * Se realiza durante la fase de investigación de una queja (Resolución 3461
 * de 2025) y se levanta acta reservada por cada persona citada:
 *   - Quejoso/a (víctima).
 *   - Persona reportada (denunciado/a).
 *   - Testigos.
 * 
 * Basado en:
 * - Resolución 3461 de 2025 (término: 5 días calendario)
 * - Ley 1010 de 2006 (debido proceso)
 * - Ley 2365 de 2024 (no careo — entrevistas separadas)
 * 
 * @version 1.0.0
 * @since 2026-10-07
 */

// ================================================================
// TIPOS
// ================================================================

/**
 * Rol de la persona entrevistada dentro del trámite.
 * - Quejoso:    Persona que presentó la queja.
 * - Denunciado: Persona señalada (también llamada "persona reportada").
 * - Testigo:    Persona que presenció los hechos o a quien la víctima
 *               se lo comentó.
 */
export type RolEntrevistado = "Quejoso" | "Denunciado" | "Testigo";

// ================================================================
// INTERFAZ PRINCIPAL: IEntrevistaConvivencia
// ================================================================

/**
 * Interfaz IEntrevistaConvivencia
 * 
 * Define la estructura de una entrevista individual reservada.
 * Es un documento separado por cada persona citada dentro del caso.
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único de la entrevista.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} comiteId - ID del comité.
 * @property {string} quejaId - ID de la queja asociada.
 * @property {string} casoId - ID del caso asociado (si ya existe).
 * @property {number} numeroEntrevista - Número consecutivo dentro del caso.
 * 
 * --- Datos de la diligencia ---
 * @property {string} fecha - Fecha de la entrevista (ISO YYYY-MM-DD).
 * @property {string} horaInicio - Hora de inicio (HH:MM).
 * @property {string} horaCierre - Hora de cierre (HH:MM).
 * @property {string} lugar - Lugar de la entrevista (físico o virtual).
 * 
 * --- Persona entrevistada ---
 * @property {RolEntrevistado} rol - Rol de la persona entrevistada.
 * @property {string} nombre - Nombres y apellidos completos.
 * @property {string} cedula - Número de cédula de ciudadanía.
 * @property {string} cargo - Cargo en la empresa.
 * @property {string} area - Área o departamento.
 * 
 * --- Integrantes del comité presentes ---
 * @property {string[]} integrantesCCL - Nombres de los miembros del comité
 *                                       que realizaron la entrevista.
 * 
 * --- Contenido de la entrevista ---
 * @property {string} advertenciaLegal - Advertencia sobre confidencialidad
 *                                       y debido proceso (dejar constancia).
 * @property {string} motivoCitacion - Motivo por el que se cita.
 * @property {string} declaracion - Declaración / versión libre del
 *                                  entrevistado.
 * @property {string[]} pruebasAportadas - Nombres o descripciones de pruebas
 *                                         aportadas en esta diligencia.
 * 
 * --- Cierre y firmas ---
 * @property {boolean} leidaConforme - Indica si la persona declaró estar
 *                                     de acuerdo con el acta.
 * @property {string | null} firmaEntrevistado - Nombre o ID de la firma.
 * @property {string | null} firmaCCL - Nombre o ID del integrante que firma.
 * @property {string | null} observaciones - Observaciones adicionales.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IEntrevistaConvivencia {
    // --- Identificación ---
    id: string;
    empresaId: string;
    comiteId: string;
    quejaId: string;
    casoId: string | null;
    numeroEntrevista: number;

    // --- Datos de la diligencia ---
    fecha: string;
    horaInicio: string;
    horaCierre: string;
    lugar: string;

    // --- Persona entrevistada ---
    rol: RolEntrevistado;
    nombre: string;
    cedula: string;
    cargo: string;
    area: string;

    // --- Integrantes del comité presentes ---
    integrantesCCL: string[];

    // --- Contenido de la entrevista ---
    advertenciaLegal: string;
    motivoCitacion: string;
    declaracion: string;
    pruebasAportadas: string[];

    // --- Cierre y firmas ---
    leidaConforme: boolean;
    firmaEntrevistado: string | null;
    firmaCCL: string | null;
    observaciones: string | null;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}