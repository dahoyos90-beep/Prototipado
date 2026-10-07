/**
 * src/interfaces/IInspeccion.ts
 * 
 * Interfaz que define la estructura de una Inspección de Seguridad.
 * Se utiliza en múltiples módulos (gestión de peligros, matriz de riesgos,
 * condiciones de salud, etc.) para registrar hallazgos y seguimientos.
 * 
 * Propósito:
 * - Establecer el contrato de datos para una inspección.
 * - Permitir el registro, consulta, modificación y eliminación de inspecciones
 *   a través de los servicios de almacenamiento.
 * 
 * @version 1.1.0 (agregado empresaId)
 * @since 2026-08-31
 */

/**
 * Tipos de riesgo posibles en una inspección.
 * Basado en la clasificación GTC 45 y necesidades del SG-SST.
 */
export type TipoRiesgo =
  | "Locativo"      // Escaleras, pisos, espacios confinados
  | "Mecánico"      // Maquinaria, herramientas, equipos
  | "Químico"       // Sustancias, vapores, polvos
  | "Eléctrico"     // Cables, tableros, instalaciones
  | "Biomecánico"   // Posturas, movimientos repetitivos, esfuerzos
  | "Ergonómico"    // Condiciones del puesto de trabajo
  | "Psicosocial"   // Estrés, carga mental, relaciones laborales
  | "Biológico"     // Virus, bacterias, hongos
  | "Físico"        // Ruido, iluminación, temperatura, radiación
  | "Otro";         // Cualquier otro no clasificado

/**
 * Estados de cumplimiento de una inspección.
 * - Cumple: La condición es satisfactoria.
 * - No Cumple: Se requiere acción correctiva.
 * - Observación: Se recomienda mejora, pero no es crítica.
 * - Pendiente: Aún no se ha evaluado.
 */
export type EstadoInspeccion = "Cumple" | "No Cumple" | "Observación" | "Pendiente";

/**
 * Interfaz IInspeccion
 * 
 * Define la estructura completa de una inspección de seguridad.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único de la inspección (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece la inspección.
 * @property {string} fecha - Fecha en que se realizó la inspección (formato ISO YYYY-MM-DD).
 * @property {string} lugar - Área, planta o ubicación donde se realizó la inspección.
 * @property {string} inspector - Nombre completo de la persona responsable de la inspección.
 * @property {TipoRiesgo} tipoRiesgo - Clasificación del riesgo identificado.
 * @property {string} descripcion - Descripción detallada del hallazgo o condición observada.
 * @property {EstadoInspeccion} estado - Estado de cumplimiento de la inspección.
 * @property {string | null} accionCorrectiva - Descripción de la acción correctiva propuesta (puede ser null si no aplica).
 * @property {string | null} responsableAccion - Persona responsable de ejecutar la acción correctiva (puede ser null).
 * @property {string | null} fechaLimite - Fecha límite para la acción correctiva (formato ISO YYYY-MM-DD, puede ser null).
 * @property {Date} fechaCreacion - Fecha y hora de registro de la inspección.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IInspeccion {
  id: string;
  empresaId: string;            // NIT de la empresa
  fecha: string;                // ISO YYYY-MM-DD
  lugar: string;
  inspector: string;
  tipoRiesgo: TipoRiesgo;
  descripcion: string;
  estado: EstadoInspeccion;
  accionCorrectiva: string | null;
  responsableAccion: string | null;
  fechaLimite: string | null;   // ISO YYYY-MM-DD
  fechaCreacion: Date;
  fechaActualizacion: Date;
}