/**
 * src/storage.ts
 * 
 * Abstracción genérica para el almacenamiento en localStorage con TypeScript.
 * Proporciona operaciones CRUD (Crear, Leer, Actualizar, Eliminar) tipadas
 * para cualquier entidad que tenga una propiedad `id` de tipo string.
 * 
 * Propósito:
 * - Centralizar el acceso a localStorage en un solo lugar.
 * - Garantizar el tipado fuerte en todas las operaciones de almacenamiento.
 * - Manejar errores y casos borde (datos corruptos, claves inexistentes, etc.).
 * 
 * @version 1.9.2
 *  - M25: agregados 4 storages (configuración anual, registros mensuales,
 *    consolidados anuales y análisis trimestrales). `storageSiniestros`
 *    ahora apunta al Registro Nominal reescrito (ISiniestro v2.0.0).
 * 
 * @version 1.9.1
 *  - S1: eliminado console.log de inicializarDatosPrueba (consola limpia en prod).
 * 
 * @version 1.9.0 (M24: agregados 5 storages para eventos, parámetros,
 *                  cierres mensuales, consolidados anuales y trabajadores)
 * @since 2026-08-31
 */

// ================================================================
// IMPORTS DE INTERFACES
// ================================================================

import { IUsuario } from './interfaces/IUsuario.js';
import { IEmpresa } from './interfaces/IEmpresa.js';
import { IInspeccion } from './interfaces/IInspeccion.js';
import { IPeligro, IReportePeligro } from './interfaces/IPeligro.js';
import { IRiesgo } from './interfaces/IRiesgo.js';
import { ICapacitacion } from './interfaces/ICapacitacion.js';
import { IComite, IActaReunion, ICompromisoComite } from './interfaces/IComite.js';

// --- M21 — Comité de Convivencia (interfaces separadas) ---
import { IConvivencia } from './interfaces/IConvivencia.js';
import { IQuejaConvivencia } from './interfaces/IQuejaConvivencia.js';
import { ICasoConvivencia } from './interfaces/ICasoConvivencia.js';
import { IActaConvivencia } from './interfaces/IActaConvivencia.js';
import { IEntrevistaConvivencia } from './interfaces/IEntrevistaConvivencia.js';
import { IPlanMejoraConvivencia } from './interfaces/IPlanMejoraConvivencia.js';
import { ICompromisoConfidencialidad } from './interfaces/ICompromisoConfidencialidad.js';
import { IInformeConvivencia } from './interfaces/IInformeConvivencia.js';
import { IReglamentoInternoCCL } from './interfaces/IReglamentoInternoCCL.js';

// --- M23 — Gestión de Indicadores (interfaces separadas) ---
import { IIndicador } from './interfaces/IIndicador.js';
import { IResultadoIndicador } from './interfaces/IResultadoIndicador.js';
import { ICalculoHHT } from './interfaces/ICalculoHHT.js';
import { IPlanAccionIndicador } from './interfaces/IPlanAccionIndicador.js';

// --- M24 — Gestión de Ausentismo (interfaces separadas) ---
import { IAusentismo, ICausaAusentismo } from './interfaces/IAusentismo.js';
import { ISociodemografico } from './interfaces/ISociodemografico.js';
import { IEventoAusentismo } from './interfaces/IEventoAusentismo.js';
import { IParametrosMes } from './interfaces/IParametrosMes.js';
import { IEstadisticaMensual } from './interfaces/IEstadisticaMensual.js';
import { IConsolidadoAnual } from './interfaces/IConsolidadoAnual.js';

// --- M25 — Gestión de Siniestralidad (interfaces separadas) ---
import { ISiniestro } from './interfaces/ISiniestro.js';
import { IConfiguracionSiniestralidad } from './interfaces/IConfiguracionSiniestralidad.js';
import { IRegistroMensualSiniestralidad } from './interfaces/IRegistroMensualSiniestralidad.js';
import { IConsolidadoAnualSiniestralidad } from './interfaces/IConsolidadoAnualSiniestralidad.js';
import { IAnalisisTrimestralSiniestralidad } from './interfaces/IAnalisisTrimestralSiniestralidad.js';

// --- Otras interfaces del sistema ---
import { IEMO } from './interfaces/IEMO.js';
import { IEncuesta } from './interfaces/IEncuesta.js';
import { IAlertaSalud } from './interfaces/IAlertaSalud.js';
import { INotificacion } from './interfaces/INotificacion.js';
import { IMatriz } from './interfaces/IMatriz.js';

// ================================================================
// INTERFAZ BASE
// ================================================================

/**
 * Interfaz base para cualquier entidad que se almacene en localStorage.
 * Todas las entidades deben tener una propiedad `id` de tipo string.
 */
interface IStorable {
    id: string;
}

// ================================================================
// CLASE STORAGESERVICE
// ================================================================

/**
 * Clase StorageService
 * 
 * Servicio genérico para manejar el almacenamiento en localStorage.
 * Utiliza tipos genéricos para garantizar que los datos almacenados
 * cumplan con el contrato de la interfaz especificada.
 * 
 * @template T - Tipo de entidad que se almacena (debe extender IStorable).
 */
export class StorageService<T extends IStorable> {
    private readonly clave: string;

    /**
     * Constructor del servicio de almacenamiento.
     * 
     * @param clave - Clave única en localStorage para este tipo de entidad.
     *                Ejemplo: 'usuarios', 'empresas', 'inspecciones'.
     */
    constructor(clave: string) {
        this.clave = clave;
    }

    /**
     * Obtiene todos los registros almacenados para esta entidad.
     * 
     * @returns {T[]} - Array de entidades. Si no hay datos, retorna un array vacío.
     */
    public obtenerTodos(): T[] {
        try {
            const datos = localStorage.getItem(this.clave);
            if (!datos) return [];
            const parsed = JSON.parse(datos);
            // Validar que sea un array
            if (!Array.isArray(parsed)) {
                console.warn(`StorageService: La clave "${this.clave}" no contiene un array válido.`);
                return [];
            }
            return parsed as T[];
        } catch (error) {
            console.error(`StorageService: Error al obtener datos de "${this.clave}":`, error);
            return [];
        }
    }

    /**
     * Obtiene un registro específico por su ID.
     * 
     * @param id - Identificador único del registro.
     * @returns {T | null} - La entidad encontrada o null si no existe.
     */
    public obtenerPorId(id: string): T | null {
        if (!id) {
            console.warn('StorageService.obtenerPorId: ID no proporcionado.');
            return null;
        }
        const todos = this.obtenerTodos();
        return todos.find(item => item.id === id) || null;
    }

    /**
     * Guarda un nuevo registro en localStorage.
     * 
     * @param item - Entidad a guardar (debe tener id definido).
     * @returns {boolean} - true si se guardó correctamente, false en caso de error.
     */
    public guardar(item: T): boolean {
        if (!item || !item.id) {
            console.error('StorageService.guardar: El item debe tener un ID válido.');
            return false;
        }

        try {
            const todos = this.obtenerTodos();
            // Verificar si ya existe un registro con el mismo ID
            const existe = todos.some(existing => existing.id === item.id);
            if (existe) {
                console.warn(`StorageService.guardar: Ya existe un registro con ID "${item.id}". Use actualizar() en su lugar.`);
                return false;
            }
            todos.push(item);
            localStorage.setItem(this.clave, JSON.stringify(todos));
            return true;
        } catch (error) {
            console.error(`StorageService.guardar: Error al guardar en "${this.clave}":`, error);
            return false;
        }
    }

    /**
     * Actualiza un registro existente por su ID.
     * 
     * @param id - Identificador del registro a actualizar.
     * @param nuevosDatos - Objeto parcial con los campos a modificar.
     * @returns {boolean} - true si se actualizó correctamente, false en caso de error.
     */
    public actualizar(id: string, nuevosDatos: Partial<T>): boolean {
        if (!id) {
            console.warn('StorageService.actualizar: ID no proporcionado.');
            return false;
        }

        try {
            const todos = this.obtenerTodos();
            const index = todos.findIndex(item => item.id === id);
            if (index === -1) {
                console.warn(`StorageService.actualizar: No se encontró registro con ID "${id}".`);
                return false;
            }

            // Fusionar los datos existentes con los nuevos
            todos[index] = { ...todos[index], ...nuevosDatos };
            localStorage.setItem(this.clave, JSON.stringify(todos));
            return true;
        } catch (error) {
            console.error(`StorageService.actualizar: Error al actualizar en "${this.clave}":`, error);
            return false;
        }
    }

    /**
     * Elimina un registro por su ID (baja física).
     * 
     * @param id - Identificador del registro a eliminar.
     * @returns {boolean} - true si se eliminó correctamente, false en caso de error.
     */
    public eliminar(id: string): boolean {
        if (!id) {
            console.warn('StorageService.eliminar: ID no proporcionado.');
            return false;
        }

        try {
            const todos = this.obtenerTodos();
            const nuevos = todos.filter(item => item.id !== id);
            if (nuevos.length === todos.length) {
                console.warn(`StorageService.eliminar: No se encontró registro con ID "${id}".`);
                return false;
            }
            localStorage.setItem(this.clave, JSON.stringify(nuevos));
            return true;
        } catch (error) {
            console.error(`StorageService.eliminar: Error al eliminar en "${this.clave}":`, error);
            return false;
        }
    }

    /**
     * Limpia todos los registros de esta entidad.
     * 
     * @returns {boolean} - true si se limpió correctamente, false en caso de error.
     */
    public limpiar(): boolean {
        try {
            localStorage.removeItem(this.clave);
            return true;
        } catch (error) {
            console.error(`StorageService.limpiar: Error al limpiar "${this.clave}":`, error);
            return false;
        }
    }

    /**
     * Verifica si existe al menos un registro.
     * 
     * @returns {boolean} - true si hay registros, false si está vacío.
     */
    public existeAlguno(): boolean {
        return this.obtenerTodos().length > 0;
    }

    /**
     * Obtiene el número total de registros.
     * 
     * @returns {number} - Cantidad de registros.
     */
    public contar(): number {
        return this.obtenerTodos().length;
    }
}

// ================================================================
// INSTANCIAS PRECONFIGURADAS
// ================================================================
// Se pueden importar directamente en los módulos.
// ================================================================

// M01 - Usuarios
export const storageUsuarios = new StorageService<IUsuario>('usuarios');

// M02 - Empresas
export const storageEmpresas = new StorageService<IEmpresa>('empresas');

// Transversal - Inspecciones
export const storageInspecciones = new StorageService<IInspeccion>('inspecciones');

// M12 - Peligros (catálogo)
export const storagePeligros = new StorageService<IPeligro>('peligros');

// M12 - Reportes de encuesta de peligros
export const storageReportesPeligro = new StorageService<IReportePeligro>('reportesPeligro');

// M13 - Matriz de Peligros y Riesgos
export const storageMatrices = new StorageService<IMatriz>('matrices');
export const storageRiesgos = new StorageService<IRiesgo>('riesgos');

// M17 - Plan de Trabajo y Capacitación
export const storageCapacitaciones = new StorageService<ICapacitacion>('capacitaciones');

// M18 - Comités (COPASST / Vigía)
export const storageComites = new StorageService<IComite>('comites');
export const storageActasReunion = new StorageService<IActaReunion>('actasReunion');
export const storageCompromisosComite = new StorageService<ICompromisoComite>('compromisosComite');

// M21 - Comité de Convivencia Laboral (CCL)
export const storageConvivencia = new StorageService<IConvivencia>('convivencia');
export const storageQuejasConvivencia = new StorageService<IQuejaConvivencia>('quejasConvivencia');
export const storageCasosConvivencia = new StorageService<ICasoConvivencia>('casosConvivencia');
export const storageActasConvivencia = new StorageService<IActaConvivencia>('actasConvivencia');
export const storageEntrevistasConvivencia = new StorageService<IEntrevistaConvivencia>('entrevistasConvivencia');
export const storagePlanesMejoraConvivencia = new StorageService<IPlanMejoraConvivencia>('planesMejoraConvivencia');
export const storageCompromisosConfidencialidad = new StorageService<ICompromisoConfidencialidad>('compromisosConfidencialidad');
export const storageInformesConvivencia = new StorageService<IInformeConvivencia>('informesConvivencia');
export const storageReglamentosCCL = new StorageService<IReglamentoInternoCCL>('reglamentosCCL');

// M23 - Indicadores
export const storageIndicadores = new StorageService<IIndicador>('indicadores');
export const storageResultadosIndicadores = new StorageService<IResultadoIndicador>('resultadosIndicadores');
export const storageCalculosHHT = new StorageService<ICalculoHHT>('calculosHHT');
export const storagePlanesAccionIndicador = new StorageService<IPlanAccionIndicador>('planesAccionIndicador');

// M24 - Ausentismo
export const storageAusentismos = new StorageService<IAusentismo>('ausentismos');
export const storageCausasAusentismo = new StorageService<ICausaAusentismo>('causasAusentismo');
export const storageTrabajadores = new StorageService<ISociodemografico>('sociodemografico');
export const storageEventosAusentismo = new StorageService<IEventoAusentismo>('eventosAusentismo');
export const storageParametrosMes = new StorageService<IParametrosMes>('parametrosMes');
export const storageCierresMensuales = new StorageService<IEstadisticaMensual>('cierresMensuales');
export const storageConsolidadosAnuales = new StorageService<IConsolidadoAnual>('consolidadosAnuales');

// M25 - Siniestralidad
// storageSiniestros ahora representa el Registro Nominal (ISiniestro v2.0.0).
// Cada registro es un evento individual (accidente o incidente).
export const storageSiniestros = new StorageService<ISiniestro>('siniestros');

// M25 - Configuración anual (una por empresa + año)
export const storageConfiguracionesSiniestralidad =
    new StorageService<IConfiguracionSiniestralidad>('configuracionesSiniestralidad');

// M25 - Registros mensuales (matriz 12 meses × 6 variables)
export const storageRegistrosMensualesSiniestralidad =
    new StorageService<IRegistroMensualSiniestralidad>('registrosMensualesSiniestralidad');

// M25 - Consolidados anuales (caché recalculado por año)
export const storageConsolidadosAnualesSiniestralidad =
    new StorageService<IConsolidadoAnualSiniestralidad>('consolidadosAnualesSiniestralidad');

// M25 - Análisis trimestrales (4 bloques de texto libre por año)
export const storageAnalisisTrimestralesSiniestralidad =
    new StorageService<IAnalisisTrimestralSiniestralidad>('analisisTrimestralesSiniestralidad');

// M10 - Condiciones de Salud
export const storageEMO = new StorageService<IEMO>('emo');
export const storageEncuestas = new StorageService<IEncuesta>('encuestas');
export const storageAlertasSalud = new StorageService<IAlertaSalud>('alertasSalud');

// Transversal - Notificaciones
export const storageNotificaciones = new StorageService<INotificacion>('notificaciones');

// ================================================================
// FUNCIONES AUXILIARES
// ================================================================

/**
 * Función utilitaria para inicializar datos de prueba en localStorage.
 * Solo se debe usar en desarrollo. Se exporta para permitir inicialización
 * manual desde consola o scripts de seed externos.
 */
export function inicializarDatosPrueba(): void {
    // Reservado para datos de ejemplo por entidad cuando se implementen
    // los módulos correspondientes. Sin efectos secundarios en producción.
}