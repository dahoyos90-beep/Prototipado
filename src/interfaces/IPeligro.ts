/**
 * src/interfaces/IPeligro.ts
 * 
 * Interfaz que define la estructura de un Peligro en el sistema.
 * Corresponde al módulo M06 - Gestión de Peligros (CU18 al CU21).
 * Basado en la metodología GTC 45 para clasificación de peligros.
 * 
 * También contiene la interfaz del Reporte de Auto-Reporte de
 * Condiciones de Trabajo y Peligros (M12), que incluye las respuestas
 * a 28 preguntas organizadas en 8 bloques.
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Peligro.
 * - Permitir el registro, categorización, vinculación a áreas/cargos
 *   y generación de reportes consolidados.
 * - Definir la estructura de la encuesta de auto-reporte de peligros (M12).
 * 
 * @version 1.2.0 (agregada interfaz IReportePeligro y tipos asociados)
 * @since 2026-08-31
 */

/**
 * Categorías de peligro según la metodología GTC 45.
 * Clasificación estándar para identificar y evaluar riesgos.
 */
export type CategoriaPeligro =
  | "Biológico"     // Virus, bacterias, hongos, parásitos
  | "Físico"        // Ruido, iluminación, temperatura, radiación, vibración
  | "Químico"       // Polvos, vapores, gases, líquidos, humos
  | "Ergonómico"    // Posturas, movimientos repetitivos, esfuerzos, carga física
  | "Psicosocial"   // Estrés, carga mental, relaciones laborales, turnos
  | "Mecánico"      // Máquinas, herramientas, equipos, partes móviles
  | "Eléctrico"     // Cables, tableros, descargas, instalaciones
  | "Locativo"      // Escaleras, pisos, espacios confinados, orden y aseo
  | "Químico-Industrial" // Sustancias químicas industriales específicas
  | "Incendio/Explosión" // Materiales combustibles, fuentes de ignición
  | "Otro";         // Cualquier otra categoría no clasificada

/**
 * Frecuencia percibida de exposición al peligro.
 * - Alta: Exposición constante (ej. diaria).
 * - Media: Exposición periódica (ej. semanal).
 * - Baja: Exposición ocasional (ej. mensual o esporádica).
 */
export type FrecuenciaPeligro = "Alta" | "Media" | "Baja";

/**
 * Estados de un peligro en el sistema.
 * - Activo: Peligro validado y vigente.
 * - Inactivo: Peligro dado de baja (por cambio de proceso o condición).
 * - EnValidacion: Peligro reportado pero pendiente de validación técnica.
 */
export type EstadoPeligro = "Activo" | "Inactivo" | "EnValidacion";

/**
 * Interfaz IPeligro
 * 
 * Define la estructura completa de un peligro en el prototipo SG-SST Manager.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único del peligro (generado por el sistema, ej. UUID).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el peligro.
 * @property {string} nombre - Nombre descriptivo del peligro (ej. "Ruido en planta de producción").
 * @property {CategoriaPeligro} categoria - Categoría GTC 45 del peligro.
 * @property {string} descripcion - Descripción detallada de la fuente y condiciones del peligro.
 * @property {string} fuente - Origen o fuente del peligro (ej. "Máquina troqueladora").
 * @property {string} ubicacion - Ubicación específica donde se presenta el peligro (ej. "Planta Baja, Área 3").
 * @property {FrecuenciaPeligro} frecuencia - Frecuencia de exposición al peligro.
 * @property {string[]} cargosAsociados - IDs o nombres de los cargos relacionados con este peligro.
 * @property {EstadoPeligro} estado - Estado del peligro (Activo/Inactivo/EnValidacion).
 * @property {Date} fechaCreacion - Fecha y hora de registro del peligro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IPeligro {
    id: string;
    empresaId: string; // NIT de la empresa
    nombre: string;
    categoria: CategoriaPeligro;
    descripcion: string;
    fuente: string;
    ubicacion: string;
    frecuencia: FrecuenciaPeligro;
    cargosAsociados: string[];
    estado: EstadoPeligro;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

// ================================================================
// ENCUESTA DE AUTO-REPORTE DE PELIGROS (M12)
// ================================================================

/**
 * Clasificación de los bloques de preguntas de la encuesta (GTC 45).
 * - Biológicos: Virus, bacterias, fluidos, mordeduras/picaduras.
 * - Físicos: Ruido, iluminación, temperaturas, vibraciones, radiaciones.
 * - Químicos: Polvos/gases, productos líquidos, etiquetado.
 * - Psicosociales: Carga, monotonía, jornadas, relaciones.
 * - Biomecánicos: Posturas, esfuerzos, movimientos repetitivos.
 * - Condiciones de Seguridad: Mecánico, eléctrico, locativo, alturas, público, tecnológico.
 * - Fenómenos Naturales: Sismos, inundaciones, vendavales.
 * - Salud y EPP: Dolores musculares, entrega de EPP, uso de EPP.
 */
export type ClasificacionEncuestaPeligro =
    | "Biológicos"
    | "Físicos"
    | "Químicos"
    | "Psicosociales"
    | "Biomecánicos"
    | "Condiciones de Seguridad"
    | "Fenómenos Naturales"
    | "Salud y EPP";

/**
 * Identificadores únicos de las 28 preguntas del formulario.
 * Se usan como claves en el Record de respuestas.
 */
export type PreguntaPeligroId =
    // 1. Biológicos (3)
    | "1.1" | "1.2" | "1.3"
    // 2. Físicos (5)
    | "2.1" | "2.2" | "2.3" | "2.4" | "2.5"
    // 3. Químicos (3)
    | "3.1" | "3.2" | "3.3"
    // 4. Psicosociales (4)
    | "4.1" | "4.2" | "4.3" | "4.4"
    // 5. Biomecánicos (3)
    | "5.1" | "5.2" | "5.3"
    // 6. Condiciones de Seguridad (6)
    | "6.1" | "6.2" | "6.3" | "6.4" | "6.5" | "6.6"
    // 7. Fenómenos Naturales (1)
    | "7.1"
    // 8. Salud y EPP (3)
    | "8.1" | "8.2" | "8.3";

/**
 * Interfaz IRespuestaPeligro
 * 
 * Representa la respuesta a una pregunta individual de la encuesta.
 * 
 * @property {boolean} si - Indica si el trabajador identificó el peligro (Sí/No).
 * @property {string} descripcion - Descripción breve de la situación o fuente.
 * @property {string} [extra] - Campo adicional opcional según la pregunta:
 *   - 5.2: Peso aproximado de la carga.
 *   - 8.1: Parte del cuerpo afectada.
 *   - 8.3: Razón por la que no usa el EPP.
 */
export interface IRespuestaPeligro {
    si: boolean;
    descripcion: string;
    extra?: string;
}

/**
 * Estados posibles de un reporte de encuesta.
 * - Pendiente: Reporte enviado, pendiente de revisión por el SST.
 * - Revisado: Reporte revisado pero aún no convertido en peligro.
 * - ConvertidoAPeligro: Reporte que generó un registro en el catálogo de peligros.
 * - Descartado: Reporte descartado (no procede).
 */
export type EstadoReportePeligro = "Pendiente" | "Revisado" | "ConvertidoAPeligro" | "Descartado";

/**
 * Interfaz IReportePeligro
 * 
 * Define la estructura completa del reporte de auto-reporte de
 * condiciones de trabajo y peligros (GTC 45) para el módulo M12.
 * 
 * @property {string} id - Identificador único del reporte (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el reporte.
 * @property {string} trabajadorId - Cédula del trabajador (relación con ISociodemografico.id).
 * 
 * @property {string} nombreApellidos - Nombre completo del trabajador.
 * @property {string} cedula - Número de cédula del trabajador.
 * @property {string} cargo - Cargo que desempeña.
 * @property {string} areaSeccion - Área o sección donde trabaja.
 * @property {string} antiguedadCargo - Antigüedad en el cargo.
 * 
 * @property {Record<PreguntaPeligroId, IRespuestaPeligro>} respuestas - Objeto con las 28 respuestas.
 * 
 * @property {string | null} peligroId - ID del peligro del catálogo creado a partir de este reporte (null si aún no se ha creado).
 * @property {EstadoReportePeligro} estadoReporte - Estado del reporte (Pendiente, Revisado, ConvertidoAPeligro, Descartado).
 * 
 * @property {Date} fechaCreacion - Fecha y hora de creación del reporte.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IReportePeligro {
    // --- Identificación ---
    id: string;
    empresaId: string;
    trabajadorId: string;

    // --- Datos generales del trabajador ---
    nombreApellidos: string;
    cedula: string;
    cargo: string;
    areaSeccion: string;
    antiguedadCargo: string;

    // --- Respuestas (28 preguntas) ---
    respuestas: Record<PreguntaPeligroId, IRespuestaPeligro>;

    // --- Relación con el catálogo de peligros ---
    peligroId: string | null;
    estadoReporte: EstadoReportePeligro;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}