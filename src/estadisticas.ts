/**
 * src/estadisticas.ts
 * 
 * Helper para procesar datos del perfil sociodemográfico y generar
 * estadísticas con cantidades y porcentajes para las 22 tablas/gráficas.
 * 
 * @version 1.2.0 (agregado filtro opcional por empresaId y función auxiliar)
 * @since 2026-09-08
 */

import type { ISociodemografico } from './interfaces/ISociodemografico.js';

// ================================================================
// 1. TIPOS DE RETORNO PARA CADA ESTADÍSTICA
// ================================================================

export interface IEstadisticaItem {
    label: string;
    cantidad: number;
    porcentaje: number;
}

export interface IEstadisticaBloque {
    titulo: string;
    datos: IEstadisticaItem[];
}

export interface IEstadisticasCompletas {
    datosPersonales: IEstadisticaBloque[];
    condicionesSalud: IEstadisticaBloque[];
    condicionesSeguridad: IEstadisticaBloque[];
}

// ================================================================
// 2. FUNCIÓN AUXILIAR: FILTRAR POR EMPRESA
// ================================================================

/**
 * Filtra un array de perfiles sociodemográficos por el NIT de la empresa.
 * Si el empresaId es null o vacío, devuelve todos los perfiles sin filtrar.
 * 
 * @param perfiles - Array de perfiles.
 * @param empresaId - NIT de la empresa por el que filtrar (opcional).
 * @returns {ISociodemografico[]} - Array filtrado.
 */
export function filtrarPorEmpresa(
    perfiles: ISociodemografico[],
    empresaId: string | null
): ISociodemografico[] {
    if (!empresaId || empresaId.trim() === '') {
        return perfiles;
    }
    return perfiles.filter(p => p.empresaId === empresaId);
}

// ================================================================
// 3. FUNCIÓN PRINCIPAL: PROCESA TODOS LOS PERFILES
// ================================================================

/**
 * Procesa un array de perfiles sociodemográficos y genera las estadísticas
 * completas para los 3 bloques.
 * 
 * Si se proporciona un `empresaId`, se filtran los perfiles antes de procesar.
 * Si no se proporciona, se procesan todos los perfiles (comportamiento original).
 * 
 * @param perfiles - Array de objetos ISociodemografico.
 * @param empresaId - (Opcional) NIT de la empresa para filtrar.
 * @returns Objeto con los 3 bloques de estadísticas.
 */
export function generarEstadisticas(
    perfiles: ISociodemografico[],
    empresaId: string | null = null
): IEstadisticasCompletas {
    // Filtrar por empresa si se proporciona el ID
    const perfilesFiltrados = filtrarPorEmpresa(perfiles, empresaId);
    const total = perfilesFiltrados.length;

    if (total === 0) {
        return {
            datosPersonales: [],
            condicionesSalud: [],
            condicionesSeguridad: []
        };
    }

    return {
        datosPersonales: obtenerDatosPersonales(perfilesFiltrados, total),
        condicionesSalud: obtenerCondicionesSalud(perfilesFiltrados, total),
        condicionesSeguridad: obtenerCondicionesSeguridad(perfilesFiltrados, total)
    };
}

// ================================================================
// 4. BLOQUE 1: DATOS PERSONALES Y DEMOGRÁFICOS (15 tablas)
// ================================================================

function obtenerDatosPersonales(perfiles: ISociodemografico[], total: number): IEstadisticaBloque[] {
    return [
        procesarRangoEdad(perfiles, total),      // ✅ Campo real: rangoEdad
        procesarTipoDocumento(perfiles, total),  // ✅ tipoDocumento
        procesarGenero(perfiles, total),         // ✅ genero
        procesarEstadoCivil(perfiles, total),    // ✅ estadoCivil
        procesarOficio(perfiles, total),         // ✅ oficio
        procesarMedioTransporte(perfiles, total),// ✅ medioTransporte
        procesarZonaResidencia(perfiles, total), // ✅ zonaResidencia
        procesarTipoVivienda(perfiles, total),   // ✅ tipoVivienda
        procesarCabezaFamilia(perfiles, total),  // ✅ esCabezaFamilia
        procesarPersonasACargo(perfiles, total), // ✅ personasACargo
        procesarNivelEducacion(perfiles, total), // ✅ nivelEducacion
        procesarIngresos(perfiles, total),       // ✅ ingresosMensuales
        procesarAntiguedad(perfiles, total),     // ✅ antiguedadOficio
        procesarVinculacion(perfiles, total),    // ✅ vinculacionLaboral
        procesarJornada(perfiles, total)         // ✅ jornadaLaboral
    ];
}

function procesarRangoEdad(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución por grupos de edad',
        datos: obtenerConteoYPorcentaje(perfiles, 'rangoEdad', total)
    };
}

function procesarTipoDocumento(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución por tipo de documento',
        datos: obtenerConteoYPorcentaje(perfiles, 'tipoDocumento', total)
    };
}

function procesarGenero(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución por género',
        datos: obtenerConteoYPorcentaje(perfiles, 'genero', total)
    };
}

function procesarEstadoCivil(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución según estado civil',
        datos: obtenerConteoYPorcentaje(perfiles, 'estadoCivil', total)
    };
}

function procesarOficio(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución por ocupación u oficio actual',
        datos: obtenerConteoYPorcentaje(perfiles, 'oficio', total)
    };
}

function procesarMedioTransporte(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución según el medio de transporte',
        datos: obtenerConteoYPorcentaje(perfiles, 'medioTransporte', total)
    };
}

function procesarZonaResidencia(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución según zona de residencia (urbana/rural)',
        datos: obtenerConteoYPorcentaje(perfiles, 'zonaResidencia', total)
    };
}

function procesarTipoVivienda(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución según el tipo de vivienda',
        datos: obtenerConteoYPorcentaje(perfiles, 'tipoVivienda', total)
    };
}

function procesarCabezaFamilia(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución si es o no cabeza de familia',
        datos: obtenerConteoYPorcentaje(perfiles, 'esCabezaFamilia', total)
    };
}

function procesarPersonasACargo(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución según número de personas a cargo',
        datos: obtenerConteoYPorcentaje(perfiles, 'personasACargo', total)
    };
}

function procesarNivelEducacion(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Nivel de educación más alto recibido',
        datos: obtenerConteoYPorcentaje(perfiles, 'nivelEducacion', total)
    };
}

function procesarIngresos(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Promedio de ingresos mensuales (en SMLV)',
        datos: obtenerConteoYPorcentaje(perfiles, 'ingresosMensuales', total)
    };
}

function procesarAntiguedad(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Antigüedad en el oficio actual',
        datos: obtenerConteoYPorcentaje(perfiles, 'antiguedadOficio', total)
    };
}

function procesarVinculacion(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Forma de vinculación laboral',
        datos: obtenerConteoYPorcentaje(perfiles, 'vinculacionLaboral', total)
    };
}

function procesarJornada(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Jornada laboral',
        datos: obtenerConteoYPorcentaje(perfiles, 'jornadaLaboral', total)
    };
}

// ================================================================
// 5. BLOQUE 2: CONDICIONES DE SALUD (7 tablas)
// ================================================================

function obtenerCondicionesSalud(perfiles: ISociodemografico[], total: number): IEstadisticaBloque[] {
    return [
        procesarFrecuenciaDeporte(perfiles, total), // ✅ frecuenciaDeporte
        procesarConsumo(perfiles, total),           // ✅ fuma y consumoAlcohol
        procesarAlimentacion(perfiles, total),      // ✅ alimentacionDiaria
        procesarEstadoSalud(perfiles, total),       // ✅ estadoSaludGeneral
        procesarEnfermedades(perfiles, total),      // ✅ enfermedadesDiagnosticadas (array)
        procesarMolestias(perfiles, total),         // ✅ molestiasFrecuentes (array)
        procesarDiscapacidad(perfiles, total)       // ✅ discapacidad (array)
    ];
}

function procesarFrecuenciaDeporte(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución del uso del tiempo libre / frecuencia deportiva',
        datos: obtenerConteoYPorcentaje(perfiles, 'frecuenciaDeporte', total)
    };
}

function procesarConsumo(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    const tabaco = obtenerConteoYPorcentaje(perfiles, 'fuma', total);        // ✅ Campo real
    const alcohol = obtenerConteoYPorcentaje(perfiles, 'consumoAlcohol', total); // ✅ Campo real
    return {
        titulo: 'Hábitos de consumo (tabaco y alcohol)',
        datos: [
            ...tabaco.map(item => ({ ...item, label: `Tabaco: ${item.label}` })),
            ...alcohol.map(item => ({ ...item, label: `Alcohol: ${item.label}` }))
        ]
    };
}

function procesarAlimentacion(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Distribución de la alimentación diaria (número de comidas)',
        datos: obtenerConteoYPorcentaje(perfiles, 'alimentacionDiaria', total)
    };
}

function procesarEstadoSalud(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Estado de salud general percibido',
        datos: obtenerConteoYPorcentaje(perfiles, 'estadoSaludGeneral', total)
    };
}

function procesarEnfermedades(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    const conteo: Record<string, number> = {};
    perfiles.forEach(p => {
        p.enfermedadesDiagnosticadas.forEach(enf => {
            conteo[enf] = (conteo[enf] || 0) + 1;
        });
    });
    const datos = Object.entries(conteo).map(([label, cantidad]) => ({
        label,
        cantidad,
        porcentaje: total > 0 ? (cantidad / total) * 100 : 0
    }));
    return {
        titulo: 'Distribución según diagnóstico de enfermedades',
        datos
    };
}

function procesarMolestias(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    const conteo: Record<string, number> = {};
    perfiles.forEach(p => {
        p.molestiasFrecuentes.forEach(mol => {
            conteo[mol] = (conteo[mol] || 0) + 1;
        });
    });
    const datos = Object.entries(conteo).map(([label, cantidad]) => ({
        label,
        cantidad,
        porcentaje: total > 0 ? (cantidad / total) * 100 : 0
    }));
    return {
        titulo: 'Distribución de molestias presentadas en los últimos 6 meses',
        datos
    };
}

function procesarDiscapacidad(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    const conteo: Record<string, number> = {};
    perfiles.forEach(p => {
        p.discapacidad.forEach(dis => {
            conteo[dis] = (conteo[dis] || 0) + 1;
        });
    });
    const datos = Object.entries(conteo).map(([label, cantidad]) => ({
        label,
        cantidad,
        porcentaje: total > 0 ? (cantidad / total) * 100 : 0
    }));
    return {
        titulo: 'Distribución de la población que presenta alguna discapacidad',
        datos
    };
}

// ================================================================
// 6. BLOQUE 3: CONDICIONES DE SEGURIDAD (7 tablas)
// ================================================================

function obtenerCondicionesSeguridad(perfiles: ISociodemografico[], total: number): IEstadisticaBloque[] {
    return [
        procesarConoceSG(perfiles, total),        // ✅ conoceSG_SST
        procesarAccidentes(perfiles, total),      // ✅ accidentesSufridos (array)
        procesarObjetoAccidente(perfiles, total), // ✅ objetoAccidente
        procesarParteCuerpo(perfiles, total),     // ✅ parteCuerpoAfectada
        procesarRiesgosLaborales(perfiles, total),// ✅ riesgosLaborales (array)
        procesarCovid(perfiles, total),           // ✅ covidPositivo
        procesarVacunacion(perfiles, total)       // ✅ vacunadoCovid
    ];
}

function procesarConoceSG(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Conocimiento del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST)',
        datos: obtenerConteoYPorcentaje(perfiles, 'conoceSG_SST', total)
    };
}

function procesarAccidentes(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    const conteo: Record<string, number> = {};
    perfiles.forEach(p => {
        p.accidentesSufridos.forEach(acc => {
            conteo[acc] = (conteo[acc] || 0) + 1;
        });
    });
    const datos = Object.entries(conteo).map(([label, cantidad]) => ({
        label,
        cantidad,
        porcentaje: total > 0 ? (cantidad / total) * 100 : 0
    }));
    return {
        titulo: 'Accidentes sufridos durante la ejecución del oficio',
        datos
    };
}

function procesarObjetoAccidente(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Objeto o causa que generó el accidente de trabajo',
        datos: obtenerConteoYPorcentaje(perfiles, 'objetoAccidente', total)
    };
}

function procesarParteCuerpo(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Parte del cuerpo afectada en accidentes',
        datos: obtenerConteoYPorcentaje(perfiles, 'parteCuerpoAfectada', total)
    };
}

function procesarRiesgosLaborales(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    const conteo: Record<string, number> = {};
    perfiles.forEach(p => {
        p.riesgosLaborales.forEach(riesgo => {
            conteo[riesgo] = (conteo[riesgo] || 0) + 1;
        });
    });
    const datos = Object.entries(conteo).map(([label, cantidad]) => ({
        label,
        cantidad,
        porcentaje: total > 0 ? (cantidad / total) * 100 : 0
    }));
    return {
        titulo: 'Exposición a peligros o riesgos laborales',
        datos
    };
}

function procesarCovid(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Antecedente de contagio por COVID-19 con prueba positiva',
        datos: obtenerConteoYPorcentaje(perfiles, 'covidPositivo', total)
    };
}

function procesarVacunacion(perfiles: ISociodemografico[], total: number): IEstadisticaBloque {
    return {
        titulo: 'Estado de vacunación contra COVID-19',
        datos: obtenerConteoYPorcentaje(perfiles, 'vacunadoCovid', total)
    };
}

// ================================================================
// 7. FUNCIÓN AUXILIAR PARA CONTAR Y CALCULAR PORCENTAJES
// ================================================================

/**
 * Cuenta las ocurrencias de un campo en un array de perfiles y devuelve
 * un array con la etiqueta, cantidad y porcentaje.
 * 
 * @param perfiles - Array de objetos ISociodemografico.
 * @param campo - Nombre del campo a contar (debe ser una propiedad simple).
 * @param total - Número total de perfiles.
 * @returns Array de IEstadisticaItem.
 */
function obtenerConteoYPorcentaje<K extends keyof ISociodemografico>(
    perfiles: ISociodemografico[],
    campo: K,
    total: number
): IEstadisticaItem[] {
    const conteo: Record<string, number> = {};
    perfiles.forEach(p => {
        const valor = p[campo];
        // Solo procesamos si el valor es string o número (no arrays, no objetos anidados)
        if (typeof valor === 'string' || typeof valor === 'number') {
            const clave = String(valor);
            conteo[clave] = (conteo[clave] || 0) + 1;
        }
    });
    return Object.entries(conteo).map(([label, cantidad]) => ({
        label,
        cantidad,
        porcentaje: total > 0 ? (cantidad / total) * 100 : 0
    }));
}