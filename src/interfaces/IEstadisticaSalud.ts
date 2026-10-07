/**
 * src/interfaces/IEstadisticaSalud.ts
 * 
 * Estadísticas de salud poblacional
 * @version 1.0.0
 * @since 2026-08-31
 */

import type { ResultadoEMO, EstadoVigenciaEMO } from './IEMO.js';
import type { NivelRiesgoEncuesta } from './IEncuesta.js';

export interface IEstadisticaSalud {
    periodo: string;
    totalTrabajadores: number;
    totalExamenes: number;
    totalEncuestas: number;
    distribucionResultadosEMO: Record<ResultadoEMO, number>;
    distribucionVigenciaEMO: Record<EstadoVigenciaEMO, number>;
    distribucionRiesgosEncuesta: Record<NivelRiesgoEncuesta, number>;
    sintomasFrecuentes: Record<string, number>;
    porcentajeAptos: number;
    porcentajeNoAptos: number;
    porcentajeExamenesVencidos: number;
    fechaActualizacion: Date;
}