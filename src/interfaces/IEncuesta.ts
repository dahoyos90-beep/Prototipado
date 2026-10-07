/**
 * src/interfaces/IEncuesta.ts
 * 
 * Interfaz para encuestas de salud (Nordic, Psicosocial, etc.)
 * @version 1.1.0 (agregado empresaId)
 * @since 2026-08-31
 */

export type TipoEncuesta = "Nordic" | "Psicosocial" | "CondicionesSalud" | "EstiloVida" | "Otro";
export type EstadoEncuesta = "Pendiente" | "EnProceso" | "Completada" | "Cancelada";
export type NivelRiesgoEncuesta = "Bajo" | "Medio" | "Alto" | "Critico" | "SinRiesgo";

export interface IEncuesta {
    id: string;
    empresaId: string; // NIT de la empresa
    trabajadorId: string;
    tipo: TipoEncuesta;
    fechaAplicacion: string;
    estado: EstadoEncuesta;
    respuestas: Record<string, string | number>;
    resumen: string | null;
    nivelRiesgo: NivelRiesgoEncuesta;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}