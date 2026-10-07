/**
 * src/interfaces/IExportacion.ts
 * 
 * Interfaz para la exportación de datos a Excel (formato HTML con .xls).
 * Define la estructura de configuración que recibe exportar-excel.ts.
 * 
 * @version 1.0.0
 * @since 2026-09-10
 */

/**
 * Representa una tabla individual dentro del archivo exportado.
 * 
 * @property titulo - Título de la tabla (ej. "Distribución por género").
 * @property columnas - Array con los nombres de las columnas (ej. ["Respuesta", "Cantidad", "Porcentaje"]).
 * @property filas - Array de filas. Cada fila es un array con los valores de las celdas.
 */
export interface ITablaExportacion {
    titulo: string;
    columnas: string[];
    filas: (string | number)[][];
}

/**
 * Configuración completa para exportar un módulo a Excel.
 * 
 * @property tituloModulo - Título del módulo (ej. "M11 – Gestión de Perfil y Afiliaciones").
 * @property empresaNombre - Nombre de la empresa (para el encabezado).
 * @property empresaNit - NIT de la empresa (para el encabezado).
 * @property usuarioNombre - Nombre del usuario que exporta (para el encabezado).
 * @property tablas - Array de tablas a incluir en el archivo.
 */
export interface IConfigExportacion {
    tituloModulo: string;
    empresaNombre: string;
    empresaNit: string;
    usuarioNombre: string;
    tablas: ITablaExportacion[];
}