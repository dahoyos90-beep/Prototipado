/**
 * src/interfaces/IAlertaSalud.ts
 * 
 * Alertas críticas de salud
 * @version 1.1.0 (agregado empresaId)
 * @since 2026-08-31
 */

import type { ResultadoEMO } from './IEMO.js';
import type { NivelRiesgoEncuesta } from './IEncuesta.js';

export interface IAlertaSalud {
    id: string;
    empresaId: string;
    trabajadorId: string;
    origen: "Encuesta" | "EMO";
    origenId: string;
    descripcion: string;
    nivelRiesgo: NivelRiesgoEncuesta | null;
    resultadoEMO: ResultadoEMO | null;
    fechaDeteccion: string;
    estado: "Pendiente" | "EnSeguimiento" | "Cerrada" | "Escalada";
    responsableId: string | null;
    seguimiento: string | null;
    fechaCierre: string | null;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}