/**
 * src/exportar-excel.ts
 * 
 * Helper para exportar datos de cualquier módulo a un archivo Excel
 * (formato HTML con extensión .xls).
 * 
 * Propósito:
 * - Generar un archivo .xls con encabezado y tablas separadas por módulo.
 * - Descargar el archivo directamente al navegador.
 * - Ser reutilizable por todos los módulos del sistema.
 * 
 * @version 1.0.0
 * @since 2026-09-10
 */

import { formatearFecha, fechaHoraActualISO } from './utils.js';
import type { IConfigExportacion, ITablaExportacion } from './interfaces/index.js';

// ================================================================
// FUNCIÓN PRINCIPAL
// ================================================================

/**
 * Exporta los datos de un módulo a un archivo Excel (.xls).
 * 
 * @param config - Configuración con el título del módulo, datos de la empresa,
 *                 usuario y tablas a exportar.
 * @returns {boolean} - true si se exportó correctamente.
 */
export function exportarModulo(config: IConfigExportacion): boolean {
    if (!config || !config.tablas || config.tablas.length === 0) {
        console.warn('exportar-excel: No hay tablas para exportar.');
        return false;
    }

    try {
        const html = generarHTMLExportacion(config);
        const nombreArchivo = obtenerNombreArchivo(config.tituloModulo, config.empresaNit);

        descargarArchivo(html, nombreArchivo);

        console.info(`✅ Archivo exportado: ${nombreArchivo}`);
        return true;
    } catch (error) {
        console.error('exportar-excel: Error al exportar:', error);
        return false;
    }
}

// ================================================================
// GENERACIÓN DEL HTML
// ================================================================

/**
 * Genera el HTML completo del archivo .xls.
 * 
 * @param config - Configuración de exportación.
 * @returns {string} - HTML del archivo.
 */
function generarHTMLExportacion(config: IConfigExportacion): string {
    const encabezado = generarEncabezado(config);
    const secciones = generarSecciones(config.tablas);

    return `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:x="urn:schemas-microsoft-com:office:excel" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Datos</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                body { font-family: Arial, sans-serif; font-size: 11px; }
                h1 { font-size: 16px; color: #1e3a8a; }
                h2 { font-size: 13px; color: #1e3a8a; margin-top: 20px; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                th { background-color: #1e3a8a; color: #ffffff; padding: 6px; text-align: left; border: 1px solid #ccc; }
                td { padding: 5px; border: 1px solid #ccc; }
                .encabezado { margin-bottom: 20px; }
                .encabezado p { margin: 3px 0; }
                .encabezado .empresa { font-weight: bold; font-size: 13px; }
                .encabezado .fecha { color: #666; font-size: 10px; }
                .titulo-modulo { font-weight: bold; font-size: 14px; color: #1e3a8a; margin: 10px 0; }
            </style>
        </head>
        <body>
            ${encabezado}
            ${secciones}
        </body>
        </html>
    `;
}

/**
 * Genera el encabezado del archivo con los datos de la empresa y usuario.
 * 
 * @param config - Configuración de exportación.
 * @returns {string} - HTML del encabezado.
 */
function generarEncabezado(config: IConfigExportacion): string {
    const fechaActual = formatearFecha(fechaHoraActualISO(), 'larga');

    return `
        <div class="encabezado">
            <p class="empresa">${escaparTextoHTML(config.empresaNombre)}</p>
            <p>NIT: ${escaparTextoHTML(config.empresaNit)}</p>
            <p class="titulo-modulo">${escaparTextoHTML(config.tituloModulo)}</p>
            <p class="fecha">Exportado por: ${escaparTextoHTML(config.usuarioNombre)}</p>
            <p class="fecha">Fecha de exportación: ${fechaActual}</p>
        </div>
    `;
}

/**
 * Genera las secciones de tablas del archivo.
 * 
 * @param tablas - Array de tablas a exportar.
 * @returns {string} - HTML de las secciones.
 */
function generarSecciones(tablas: ITablaExportacion[]): string {
    return tablas.map(tabla => {
        const filasHTML = tabla.filas.map(fila => {
            const celdas = fila.map(celda => `<td>${escaparTextoHTML(String(celda))}</td>`).join('');
            return `<tr>${celdas}</tr>`;
        }).join('');

        const columnasHTML = tabla.columnas
            .map(col => `<th>${escaparTextoHTML(col)}</th>`)
            .join('');

        return `
            <h2>${escaparTextoHTML(tabla.titulo)}</h2>
            <table>
                <thead>
                    <tr>${columnasHTML}</tr>
                </thead>
                <tbody>
                    ${filasHTML}
                </tbody>
            </table>
        `;
    }).join('');
}

// ================================================================
// DESCARGA DEL ARCHIVO
// ================================================================

/**
 * Descarga un archivo al navegador usando un Blob.
 * 
 * @param contenido - Contenido HTML del archivo.
 * @param nombreArchivo - Nombre del archivo (con extensión .xls).
 */
function descargarArchivo(contenido: string, nombreArchivo: string): void {
    // Crear un Blob con el contenido HTML
    const blob = new Blob([contenido], { type: 'application/vnd.ms-excel;charset=utf-8' });

    // Crear URL temporal
    const url = URL.createObjectURL(blob);

    // Crear un enlace temporal
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.style.display = 'none';

    // Insertar, simular clic y eliminar
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    // Liberar el objeto URL
    URL.revokeObjectURL(url);
}

// ================================================================
// GENERACIÓN DEL NOMBRE DEL ARCHIVO
// ================================================================

/**
 * Genera el nombre del archivo de exportación.
 * Formato: Modulo_EmpresaNit_YYYY-MM-DD.xls
 * 
 * @param tituloModulo - Título del módulo.
 * @param empresaNit - NIT de la empresa.
 * @returns {string} - Nombre del archivo.
 */
function obtenerNombreArchivo(tituloModulo: string, empresaNit: string): string {
    // Limpiar el título del módulo: quitar espacios, caracteres especiales y convertir a mayúsculas
    const moduloLimpio = tituloModulo
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toUpperCase()
        .substring(0, 30);

    // Limpiar el NIT: quitar guiones y espacios
    const nitLimpio = empresaNit.replace(/[^0-9]/g, '');

    // Fecha actual en formato YYYY-MM-DD
    const fecha = fechaHoraActualISO().split('T')[0];

    return `${moduloLimpio}_${nitLimpio}_${fecha}.xls`;
}

// ================================================================
// FUNCIONES AUXILIARES
// ================================================================

/**
 * Escapa caracteres especiales HTML para prevenir inyección en el archivo.
 * 
 * @param texto - Texto a escapar.
 * @returns {string} - Texto escapado.
 */
function escaparTextoHTML(texto: string): string {
    if (!texto) return '';
    const mapa: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return texto.replace(/[&<>"']/g, function (match: string) {
        return mapa[match];
    });
}