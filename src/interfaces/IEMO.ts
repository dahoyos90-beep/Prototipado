/**
 * src/interfaces/IEMO.ts
 * 
 * Interfaz que define la estructura de Exámenes Médicos Ocupacionales (E.M.O.)
 * @version 1.1.0 (agregado empresaId)
 * @since 2026-08-31
 */

export type TipoEMO = "Ingreso" | "Periodico" | "Retiro" | "Especial";
export type EstadoVigenciaEMO = "Vigente" | "PorVencer" | "Vencido" | "SinVigencia";
export type ResultadoEMO = "Apto" | "AptoConRestricciones" | "NoApto" | "Pendiente";

export interface IEMO {
    id: string;
    empresaId: string; // NIT de la empresa
    trabajadorId: string;
    tipo: TipoEMO;
    fechaRealizacion: string;
    fechaVigencia: string;
    institucion: string;
    resultado: ResultadoEMO;
    restricciones: string | null;
    archivoPDF: string | null;
    observaciones: string | null;
    estadoVigencia: EstadoVigenciaEMO;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}