/**
 * modules/M11-Gestion-Perfil-Afiliaciones/perfil-afiliaciones.ts
 * 
 * Módulo de Gestión de Perfil y Afiliaciones.
 * - Subtabs: Activos, Inactivos, Retirados
 * - Botones: Marcar Retiro, Reactivar
 * - Iconos de soportes en tabla
 * - Encuestas aplicadas/pendientes
 * - Estadísticas jerárquicas (sub-subtabs)
 * - Filtro por empresa activa
 * - Ocultar acciones para rol Empresa
 * 
 * @version 2.0.0
 * @since 2026-09-14
 */

import { StorageService, storageEncuestas } from '../../src/storage.js';
import { qs, escaparHTML, formatearFecha, fechaActualISO } from '../../src/utils.js';
import { validarRequerido } from '../../src/validators.js';
import { generarEstadisticas } from '../../src/estadisticas.js';
import { obtenerUsuarioSesion } from '../../src/auth.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';
import type { ISociodemografico, EstadoTrabajador } from '../../src/interfaces/index.js';
import type { IEncuesta } from '../../src/interfaces/IEncuesta.js';
import type { RangoEdad } from '../../src/interfaces/ISociodemografico.js';

// ================================================================
// CONSTANTES Y STORAGE
// ================================================================

const STORAGE_KEY = 'sociodemografico';
const storageTrabajadores = new StorageService<ISociodemografico>(STORAGE_KEY);

// ================================================================
// INICIALIZACIÓN
// ================================================================

export function init(contenedor: HTMLElement): void {
    const cssId = 'modulo-perfil-css';
    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'modules/M11-Gestion-Perfil-Afiliaciones/perfil-afiliaciones.css';
        document.head.appendChild(link);
    }

    // ================================================================
    // DATOS DEL USUARIO Y EMPRESA ACTIVA
    // ================================================================

    const usuarioActual = obtenerUsuarioSesion();
    const empresaActivaRaw = obtenerEmpresaActiva();
    const esRolEmpresa = usuarioActual?.rol === 'Empresa';

    // Verificar que haya empresa activa (no null)
    if (!empresaActivaRaw) {
        const tbodyErr = qs('#tbody-trabajadores') as HTMLElement;
        if (tbodyErr) {
            tbodyErr.innerHTML = `<tr><td colspan="6" class="text-center text-muted">⚠️ No hay empresa activa. Seleccione una empresa primero.</td></tr>`;
        }
        console.warn('⚠️ M11: No hay empresa activa.');
        return;
    }

    // Ahora sabemos que empresaActiva es string (no null)
    const empresaActiva: string = empresaActivaRaw;

    // ================================================================
    // REFERENCIAS AL DOM
    // ================================================================

    const tabContainer = qs('#tab-container') as HTMLElement;
    const tabButtons = tabContainer?.querySelectorAll('.tab-button') as NodeListOf<HTMLButtonElement>;
    const tabContents: Record<string, HTMLElement | null> = {
        trabajadores: qs('#tab-trabajadores') as HTMLElement,
        perfil: qs('#tab-perfil') as HTMLElement,
        estadisticas: qs('#tab-estadisticas') as HTMLElement,
        soportes: qs('#tab-soportes') as HTMLElement,
        encuestas: qs('#tab-encuestas') as HTMLElement,
    };

    const tbodyTrabajadores = qs('#tbody-trabajadores') as HTMLElement;
    const buscarInput = qs('#buscar-trabajador') as HTMLInputElement;
    const btnNuevo = qs('#btn-nuevo-trabajador') as HTMLButtonElement;
    const formPerfil = qs('#form-perfil') as HTMLFormElement;
    const perfilTitulo = qs('#perfil-titulo') as HTMLElement;
    const mensajePerfil = qs('#mensaje-perfil') as HTMLElement;
    const btnCancelarPerfil = qs('#btn-cancelar-perfil') as HTMLButtonElement;
    const statsContainer = qs('#stats-container') as HTMLElement;
    const tbodySoportes = qs('#tbody-soportes') as HTMLElement;
    const encuestasContainer = qs('#encuestas-container') as HTMLElement;

    if (!tabContainer || !tabButtons.length || !tbodyTrabajadores || !formPerfil) {
        console.error('❌ M11: No se encontraron los elementos del DOM.');
        return;
    }

    // ================================================================
    // ESTADO INTERNO
    // ================================================================

    let subTabActual: 'Activo' | 'Inactivo' | 'Retirado' = 'Activo';
    let bloqueActual: 'datosPersonales' | 'condicionesSalud' | 'condicionesSeguridad' = 'datosPersonales';
    let tablaActual = 0;

    // ================================================================
    // PESTAÑAS PRINCIPALES
    // ================================================================

    function mostrarPestana(id: string): void {
        Object.values(tabContents).forEach(el => el?.classList.add('hidden'));
        tabContents[id]?.classList.remove('hidden');
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === id);
        });
        if (id === 'estadisticas') renderizarEstadisticasJerarquicas();
        if (id === 'soportes') renderizarSoportes();
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            if (tabId) mostrarPestana(tabId);
        });
    });

    mostrarPestana('trabajadores');

    // ================================================================
    // UTILIDADES
    // ================================================================

    function mostrarMensaje(msg: string, tipo: 'success' | 'error'): void {
        if (!mensajePerfil) return;
        mensajePerfil.textContent = msg;
        mensajePerfil.className = `alert ${tipo}`;
        mensajePerfil.style.display = 'block';
        setTimeout(() => { mensajePerfil.style.display = 'none'; }, 4000);
    }

    function calcularRangoEdad(fechaNacimiento: string): RangoEdad {
        if (!fechaNacimiento) return 'Mayor a 55';
        const hoy = new Date();
        const nac = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - nac.getFullYear();
        const mes = hoy.getMonth() - nac.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
        if (edad <= 25) return 'Entre 18 y 25';
        if (edad <= 35) return 'Entre 26 y 35';
        if (edad <= 45) return 'Entre 36 y 45';
        if (edad <= 55) return 'Entre 46 y 55';
        return 'Mayor a 55';
    }

    function leerArchivoComoBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Error'));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    function getEstadoTrabajador(t: ISociodemografico): EstadoTrabajador {
        return t.estadoTrabajador || (t.fechaRetiro ? 'Retirado' : 'Activo');
    }

    function obtenerTrabajadores(): ISociodemografico[] {
        return storageTrabajadores.obtenerTodos().filter(t => t.empresaId === empresaActiva);
    }

    function guardarTrabajador(t: ISociodemografico): boolean {
        const existe = storageTrabajadores.obtenerPorId(t.id);
        return existe ? storageTrabajadores.actualizar(t.id, t) : storageTrabajadores.guardar(t);
    }

    // ================================================================
    // SUBTABS DE TRABAJADORES
    // ================================================================

    function renderizarSubtabs(): void {
        const subtabContainer = qs('#subtabs-trabajadores') as HTMLElement;
        if (!subtabContainer) return;
        subtabContainer.innerHTML = `
            <button class="subtab-button ${subTabActual === 'Activo' ? 'active' : ''}" data-subtab="Activo">✅ Activos</button>
            <button class="subtab-button ${subTabActual === 'Inactivo' ? 'active' : ''}" data-subtab="Inactivo">⏸️ Inactivos</button>
            <button class="subtab-button ${subTabActual === 'Retirado' ? 'active' : ''}" data-subtab="Retirado">🚪 Retirados</button>
        `;
        subtabContainer.querySelectorAll('.subtab-button').forEach(btn => {
            btn.addEventListener('click', () => {
                subTabActual = (btn as HTMLElement).dataset.subtab as typeof subTabActual;
                renderizarSubtabs();
                renderizarTrabajadores();
            });
        });
    }

    // ================================================================
    // TABLA DE TRABAJADORES
    // ================================================================

    function renderizarTrabajadores(): void {
        renderizarSubtabs();

        const busqueda = buscarInput?.value.toLowerCase().trim() || '';
        let trabajadores = obtenerTrabajadores().filter(t => getEstadoTrabajador(t) === subTabActual);

        if (busqueda) {
            trabajadores = trabajadores.filter(t =>
                t.id.includes(busqueda) || t.nombreCompleto.toLowerCase().includes(busqueda)
            );
        }

        if (trabajadores.length === 0) {
            tbodyTrabajadores.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No hay trabajadores en este estado.</td></tr>`;
            return;
        }

        tbodyTrabajadores.innerHTML = trabajadores.map(t => {
            const estado = getEstadoTrabajador(t);
            const badge = estado === 'Activo' ? 'badge-success' : estado === 'Inactivo' ? 'badge-warning' : 'badge-danger';

            // Iconos de soportes
            const soportesArr: string[] = [];
            if (t.epsSoporte) soportesArr.push(`<button class="btn btn-sm btn-outline btn-soporte" title="EPS" data-soporte="${escaparHTML(t.epsSoporte)}" data-nombre="EPS_${t.id}.pdf">📎EPS</button>`);
            if (t.arlSoporte) soportesArr.push(`<button class="btn btn-sm btn-outline btn-soporte" title="ARL" data-soporte="${escaparHTML(t.arlSoporte)}" data-nombre="ARL_${t.id}.pdf">📎ARL</button>`);
            if (t.afpSoporte) soportesArr.push(`<button class="btn btn-sm btn-outline btn-soporte" title="AFP" data-soporte="${escaparHTML(t.afpSoporte)}" data-nombre="AFP_${t.id}.pdf">📎AFP</button>`);
            if (t.cajaCompensacionSoporte) soportesArr.push(`<button class="btn btn-sm btn-outline btn-soporte" title="Caja" data-soporte="${escaparHTML(t.cajaCompensacionSoporte)}" data-nombre="CAJA_${t.id}.pdf">📎Caja</button>`);

            const soportesHTML = soportesArr.length > 0 ? `<div class="soportes-cell">${soportesArr.join(' ')}</div>` : '—';

            // Acciones según estado y rol
            let accionesHTML = '—';
            if (!esRolEmpresa) {
                const acciones: string[] = [];
                if (estado === 'Activo') {
                    acciones.push(`<button class="btn btn-sm btn-outline btn-editar-trabajador" data-id="${escaparHTML(t.id)}" title="Editar">✏️</button>`);
                    acciones.push(`<button class="btn btn-sm btn-warning btn-retirar" data-id="${escaparHTML(t.id)}" title="Marcar retiro">🚪</button>`);
                } else if (estado === 'Inactivo') {
                    acciones.push(`<button class="btn btn-sm btn-outline btn-editar-trabajador" data-id="${escaparHTML(t.id)}" title="Editar">✏️</button>`);
                    acciones.push(`<button class="btn btn-sm btn-success btn-reactivar" data-id="${escaparHTML(t.id)}" title="Reactivar">▶️</button>`);
                } else {
                    acciones.push(`<button class="btn btn-sm btn-success btn-reactivar" data-id="${escaparHTML(t.id)}" title="Reactivar">▶️</button>`);
                }
                accionesHTML = `<div class="actions-cell">${acciones.join(' ')}</div>`;
            }

            return `
                <tr>
                    <td>${escaparHTML(t.id)}</td>
                    <td>${escaparHTML(t.nombreCompleto)}</td>
                    <td><span class="badge ${badge}">${escaparHTML(estado)}</span></td>
                    <td>${soportesHTML}</td>
                    <td>${t.fechaIngreso ? formatearFecha(t.fechaIngreso) : '—'}</td>
                    <td>${accionesHTML}</td>
                </tr>
            `;
        }).join('');

        asignarEventosTabla();
    }

    function asignarEventosTabla(): void {
        tbodyTrabajadores.querySelectorAll('.btn-editar-trabajador').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) cargarTrabajadorEnFormulario(id);
            });
        });

        tbodyTrabajadores.querySelectorAll('.btn-retirar').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) marcarRetiro(id);
            });
        });

        tbodyTrabajadores.querySelectorAll('.btn-reactivar').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) reactivarTrabajador(id);
            });
        });

        tbodyTrabajadores.querySelectorAll('.btn-soporte').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                const el = event.currentTarget as HTMLElement;
                const soporte = el.dataset.soporte;
                const nombre = el.dataset.nombre || 'soporte.pdf';
                if (soporte) {
                    const link = document.createElement('a');
                    link.href = soporte;
                    link.download = nombre;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            });
        });
    }

    // ================================================================
    // MARCAR RETIRO / REACTIVAR
    // ================================================================

    function marcarRetiro(id: string): void {
        const trabajador = storageTrabajadores.obtenerPorId(id);
        if (!trabajador) return;

        const fechaRetiro = window.prompt(
            `Fecha de retiro para "${trabajador.nombreCompleto}" (YYYY-MM-DD):`,
            fechaActualISO()
        );
        if (!fechaRetiro) return;

        const motivo = window.prompt('Motivo del retiro (renuncia, despido, terminación, etc.):');
        if (!motivo || !motivo.trim()) {
            mostrarMensaje('El motivo del retiro es obligatorio.', 'error');
            return;
        }

        const exito = storageTrabajadores.actualizar(id, {
            estadoTrabajador: 'Retirado',
            fechaRetiro,
            motivoRetiro: motivo.trim(),
            fechaActualizacion: new Date()
        });

        if (exito) {
            mostrarMensaje('Trabajador marcado como Retirado.', 'success');
            renderizarTrabajadores();
        } else {
            mostrarMensaje('Error al marcar retiro.', 'error');
        }
    }

    function reactivarTrabajador(id: string): void {
        const trabajador = storageTrabajadores.obtenerPorId(id);
        if (!trabajador) return;

        if (!confirm(`¿Reactivar a "${trabajador.nombreCompleto}"?`)) return;

        const exito = storageTrabajadores.actualizar(id, {
            estadoTrabajador: 'Activo',
            fechaRetiro: null,
            motivoRetiro: null,
            fechaInicioInactividad: null,
            fechaFinInactividad: null,
            fechaActualizacion: new Date()
        });

        if (exito) {
            mostrarMensaje('Trabajador reactivado.', 'success');
            renderizarTrabajadores();
        } else {
            mostrarMensaje('Error al reactivar.', 'error');
        }
    }

    // ================================================================
    // FORMULARIO DE PERFIL
    // ================================================================

    function cargarTrabajadorEnFormulario(id: string): void {
        const t = storageTrabajadores.obtenerPorId(id);
        if (!t) { mostrarMensaje('Trabajador no encontrado.', 'error'); return; }

        const set = (sel: string, val: string) => {
            const el = qs(sel) as HTMLInputElement | HTMLSelectElement | null;
            if (el) el.value = val;
        };

        set('#perfil-trabajador-id', t.id);
        set('#perfil-cedula', t.id);
        const partes = t.nombreCompleto.split(' ');
        set('#perfil-nombre', partes[0] || '');
        set('#perfil-apellidos', partes.slice(1).join(' ') || '');
        set('#perfil-tipo-documento', t.tipoDocumento);
        set('#perfil-genero', t.genero);
        set('#perfil-estado-civil', t.estadoCivil);
        set('#perfil-oficio', t.oficio);
        set('#perfil-medio-transporte', t.medioTransporte);
        set('#perfil-zona-residencia', t.zonaResidencia);
        set('#perfil-tipo-vivienda', t.tipoVivienda);
        set('#perfil-cabeza-familia', t.esCabezaFamilia);
        set('#perfil-personas-cargo', t.personasACargo);
        set('#perfil-nivel-educacion', t.nivelEducacion);
        set('#perfil-ingresos', t.ingresosMensuales);
        set('#perfil-antiguedad', t.antiguedadOficio);
        set('#perfil-vinculacion', t.vinculacionLaboral);
        set('#perfil-jornada', t.jornadaLaboral);
        set('#perfil-fecha-nacimiento', t.fechaNacimiento);
        set('#perfil-fecha-ingreso', t.fechaIngreso);
        set('#perfil-fecha-retiro', t.fechaRetiro || '');
        set('#perfil-eps', t.eps || '');
        set('#perfil-arl', t.arl || '');
        set('#perfil-afp', t.afp || '');
        set('#perfil-caja', t.cajaCompensacion || '');
        set('#perfil-frecuencia-deporte', t.frecuenciaDeporte);
        set('#perfil-fuma', t.fuma);
        set('#perfil-alcohol', t.consumoAlcohol);
        set('#perfil-alimentacion', t.alimentacionDiaria);
        set('#perfil-estado-salud', t.estadoSaludGeneral);
        set('#perfil-conoce-sg', t.conoceSG_SST);
        set('#perfil-objeto-accidente', t.objetoAccidente);
        set('#perfil-parte-cuerpo', t.parteCuerpoAfectada);
        set('#perfil-covid', t.covidPositivo);
        set('#perfil-vacunado', t.vacunadoCovid);

        setCheckboxes('#perfil-enfermedades', t.enfermedadesDiagnosticadas || []);
        setCheckboxes('#perfil-molestias', t.molestiasFrecuentes || []);
        setCheckboxes('#perfil-discapacidad', t.discapacidad || []);
        setCheckboxes('#perfil-accidentes', t.accidentesSufridos || []);
        setCheckboxes('#perfil-riesgos', t.riesgosLaborales || []);

        perfilTitulo.textContent = 'Editar Perfil Sociodemográfico';
        mostrarPestana('perfil');
    }

    function setCheckboxes(sel: string, valores: string[]): void {
        const c = qs(sel) as HTMLElement;
        if (!c) return;
        c.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            (cb as HTMLInputElement).checked = valores.includes((cb as HTMLInputElement).value);
        });
    }

    function getCheckboxes(sel: string): string[] {
        const c = qs(sel) as HTMLElement;
        if (!c) return [];
        return Array.from(c.querySelectorAll('input[type="checkbox"]:checked')).map(cb => (cb as HTMLInputElement).value);
    }

    function obtenerDatosFormulario(): ISociodemografico {
        const id = (qs('#perfil-cedula') as HTMLInputElement).value.trim();
        const nombre = (qs('#perfil-nombre') as HTMLInputElement).value.trim();
        const apellidos = (qs('#perfil-apellidos') as HTMLInputElement).value.trim();
        const nombreCompleto = `${nombre} ${apellidos}`.trim();
        const fechaNacimiento = (qs('#perfil-fecha-nacimiento') as HTMLInputElement).value;
        const fechaRetiro = (qs('#perfil-fecha-retiro') as HTMLInputElement).value || null;
        const estadoTrabajador: EstadoTrabajador = fechaRetiro ? 'Retirado' : 'Activo';

        return {
            id,
            empresaId: empresaActiva,
            nombreCompleto,
            tipoDocumento: (qs('#perfil-tipo-documento') as HTMLSelectElement).value as ISociodemografico['tipoDocumento'],
            genero: (qs('#perfil-genero') as HTMLSelectElement).value as ISociodemografico['genero'],
            estadoCivil: (qs('#perfil-estado-civil') as HTMLSelectElement).value as ISociodemografico['estadoCivil'],
            oficio: (qs('#perfil-oficio') as HTMLInputElement).value.trim(),
            medioTransporte: (qs('#perfil-medio-transporte') as HTMLSelectElement).value as ISociodemografico['medioTransporte'],
            zonaResidencia: (qs('#perfil-zona-residencia') as HTMLSelectElement).value as ISociodemografico['zonaResidencia'],
            tipoVivienda: (qs('#perfil-tipo-vivienda') as HTMLSelectElement).value as ISociodemografico['tipoVivienda'],
            esCabezaFamilia: (qs('#perfil-cabeza-familia') as HTMLSelectElement).value as ISociodemografico['esCabezaFamilia'],
            personasACargo: (qs('#perfil-personas-cargo') as HTMLSelectElement).value as ISociodemografico['personasACargo'],
            nivelEducacion: (qs('#perfil-nivel-educacion') as HTMLSelectElement).value as ISociodemografico['nivelEducacion'],
            ingresosMensuales: (qs('#perfil-ingresos') as HTMLSelectElement).value as ISociodemografico['ingresosMensuales'],
            antiguedadOficio: (qs('#perfil-antiguedad') as HTMLSelectElement).value as ISociodemografico['antiguedadOficio'],
            vinculacionLaboral: (qs('#perfil-vinculacion') as HTMLSelectElement).value as ISociodemografico['vinculacionLaboral'],
            jornadaLaboral: (qs('#perfil-jornada') as HTMLSelectElement).value as ISociodemografico['jornadaLaboral'],
            fechaNacimiento,
            rangoEdad: calcularRangoEdad(fechaNacimiento),
            fechaIngreso: (qs('#perfil-fecha-ingreso') as HTMLInputElement).value,
            fechaRetiro,
            estadoTrabajador,
            fechaInicioInactividad: null,
            fechaFinInactividad: null,
            motivoRetiro: null,
            eps: (qs('#perfil-eps') as HTMLInputElement).value.trim() || null,
            epsSoporte: null,
            arl: (qs('#perfil-arl') as HTMLInputElement).value.trim() || null,
            arlSoporte: null,
            afp: (qs('#perfil-afp') as HTMLInputElement).value.trim() || null,
            afpSoporte: null,
            cajaCompensacion: (qs('#perfil-caja') as HTMLInputElement).value.trim() || null,
            cajaCompensacionSoporte: null,
            frecuenciaDeporte: (qs('#perfil-frecuencia-deporte') as HTMLSelectElement).value as ISociodemografico['frecuenciaDeporte'],
            fuma: (qs('#perfil-fuma') as HTMLSelectElement).value as ISociodemografico['fuma'],
            consumoAlcohol: (qs('#perfil-alcohol') as HTMLSelectElement).value as ISociodemografico['consumoAlcohol'],
            alimentacionDiaria: (qs('#perfil-alimentacion') as HTMLSelectElement).value as ISociodemografico['alimentacionDiaria'],
            estadoSaludGeneral: (qs('#perfil-estado-salud') as HTMLSelectElement).value as ISociodemografico['estadoSaludGeneral'],
            enfermedadesDiagnosticadas: getCheckboxes('#perfil-enfermedades') as ISociodemografico['enfermedadesDiagnosticadas'],
            molestiasFrecuentes: getCheckboxes('#perfil-molestias') as ISociodemografico['molestiasFrecuentes'],
            discapacidad: getCheckboxes('#perfil-discapacidad') as ISociodemografico['discapacidad'],
            conoceSG_SST: (qs('#perfil-conoce-sg') as HTMLSelectElement).value as ISociodemografico['conoceSG_SST'],
            accidentesSufridos: getCheckboxes('#perfil-accidentes') as ISociodemografico['accidentesSufridos'],
            objetoAccidente: (qs('#perfil-objeto-accidente') as HTMLSelectElement).value as ISociodemografico['objetoAccidente'],
            parteCuerpoAfectada: (qs('#perfil-parte-cuerpo') as HTMLSelectElement).value as ISociodemografico['parteCuerpoAfectada'],
            riesgosLaborales: getCheckboxes('#perfil-riesgos') as ISociodemografico['riesgosLaborales'],
            covidPositivo: (qs('#perfil-covid') as HTMLSelectElement).value as ISociodemografico['covidPositivo'],
            vacunadoCovid: (qs('#perfil-vacunado') as HTMLSelectElement).value as ISociodemografico['vacunadoCovid'],
            fechaCreacion: new Date(),
            fechaActualizacion: new Date()
        };
    }

    async function handleSubmitForm(event: Event): Promise<void> {
        event.preventDefault();

        const id = (qs('#perfil-cedula') as HTMLInputElement).value.trim();
        const nombre = (qs('#perfil-nombre') as HTMLInputElement).value.trim();
        const apellidos = (qs('#perfil-apellidos') as HTMLInputElement).value.trim();
        const fechaNac = (qs('#perfil-fecha-nacimiento') as HTMLInputElement).value;
        const fechaIng = (qs('#perfil-fecha-ingreso') as HTMLInputElement).value;

        if (!validarRequerido(id) || !validarRequerido(nombre) || !validarRequerido(apellidos) ||
            !validarRequerido(fechaNac) || !validarRequerido(fechaIng)) {
            mostrarMensaje('Todos los campos marcados con * son obligatorios.', 'error');
            return;
        }

        const existente = storageTrabajadores.obtenerPorId(id);
        const trabajador = obtenerDatosFormulario();

        if (existente) {
            trabajador.fechaCreacion = existente.fechaCreacion;
            trabajador.epsSoporte = existente.epsSoporte;
            trabajador.arlSoporte = existente.arlSoporte;
            trabajador.afpSoporte = existente.afpSoporte;
            trabajador.cajaCompensacionSoporte = existente.cajaCompensacionSoporte;
            trabajador.estadoTrabajador = existente.estadoTrabajador;
            trabajador.fechaInicioInactividad = existente.fechaInicioInactividad;
            trabajador.fechaFinInactividad = existente.fechaFinInactividad;
            trabajador.motivoRetiro = existente.motivoRetiro;
        }

        const epsFile = (qs('#perfil-eps-soporte') as HTMLInputElement).files?.[0];
        if (epsFile) trabajador.epsSoporte = await leerArchivoComoBase64(epsFile);
        const arlFile = (qs('#perfil-arl-soporte') as HTMLInputElement).files?.[0];
        if (arlFile) trabajador.arlSoporte = await leerArchivoComoBase64(arlFile);
        const afpFile = (qs('#perfil-afp-soporte') as HTMLInputElement).files?.[0];
        if (afpFile) trabajador.afpSoporte = await leerArchivoComoBase64(afpFile);
        const cajaFile = (qs('#perfil-caja-soporte') as HTMLInputElement).files?.[0];
        if (cajaFile) trabajador.cajaCompensacionSoporte = await leerArchivoComoBase64(cajaFile);

        if (guardarTrabajador(trabajador)) {
            mostrarMensaje('Perfil guardado correctamente.', 'success');
            limpiarFormulario();
            renderizarTrabajadores();
            mostrarPestana('trabajadores');
        } else {
            mostrarMensaje('Error al guardar el perfil.', 'error');
        }
    }

    function limpiarFormulario(): void {
        formPerfil.reset();
        perfilTitulo.textContent = 'Nuevo Perfil Sociodemográfico';
        const idInput = qs('#perfil-trabajador-id') as HTMLInputElement | null;
        if (idInput) idInput.value = '';
        ['#perfil-eps-soporte','#perfil-arl-soporte','#perfil-afp-soporte','#perfil-caja-soporte'].forEach(s => {
            const el = qs(s) as HTMLInputElement | null;
            if (el) el.value = '';
        });
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }
        // ================================================================
    // ESTADÍSTICAS JERÁRQUICAS (SUB-SUBTABS)
    // ================================================================

    function renderizarEstadisticasJerarquicas(): void {
        const perfiles = obtenerTrabajadores();
        if (perfiles.length === 0) {
            statsContainer.innerHTML = `<p class="text-muted">No hay datos suficientes para generar estadísticas.</p>`;
            return;
        }

        const estadisticas = generarEstadisticas(perfiles, empresaActiva);
        const bloques = {
            datosPersonales: estadisticas.datosPersonales,
            condicionesSalud: estadisticas.condicionesSalud,
            condicionesSeguridad: estadisticas.condicionesSeguridad
        };

        const tablas = bloques[bloqueActual];
        if (tablas.length === 0) {
            statsContainer.innerHTML = `<p class="text-muted">No hay tablas en este bloque.</p>`;
            return;
        }
        if (tablaActual >= tablas.length) tablaActual = 0;
        const tabla = tablas[tablaActual];

        statsContainer.innerHTML = `
            <div class="stats-jerarquicas">
                <div class="subtab-bloques">
                    <button class="subtab-bloque ${bloqueActual === 'datosPersonales' ? 'active' : ''}" data-bloque="datosPersonales">📋 Datos Personales</button>
                    <button class="subtab-bloque ${bloqueActual === 'condicionesSalud' ? 'active' : ''}" data-bloque="condicionesSalud">🏥 Salud</button>
                    <button class="subtab-bloque ${bloqueActual === 'condicionesSeguridad' ? 'active' : ''}" data-bloque="condicionesSeguridad">🔒 Seguridad</button>
                </div>
                <div class="subtab-tablas">
                    ${tablas.map((t, i) => `
                        <button class="subtab-tabla ${i === tablaActual ? 'active' : ''}" data-tabla="${i}">${escaparHTML(t.titulo)}</button>
                    `).join('')}
                </div>
                <div class="stats-tabla-individual">
                    <h4>${escaparHTML(tabla.titulo)}</h4>
                    <table class="table table-striped">
                        <thead><tr><th>Respuesta</th><th>Cantidad</th><th>Porcentaje</th></tr></thead>
                        <tbody>
                            ${tabla.datos.map(item => `
                                <tr>
                                    <td>${escaparHTML(item.label)}</td>
                                    <td>${item.cantidad}</td>
                                    <td>${item.porcentaje.toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Eventos de subtabs de bloque
        statsContainer.querySelectorAll('.subtab-bloque').forEach(btn => {
            btn.addEventListener('click', () => {
                bloqueActual = (btn as HTMLElement).dataset.bloque as typeof bloqueActual;
                tablaActual = 0;
                renderizarEstadisticasJerarquicas();
            });
        });

        // Eventos de subtabs de tabla
        statsContainer.querySelectorAll('.subtab-tabla').forEach(btn => {
            btn.addEventListener('click', () => {
                tablaActual = parseInt((btn as HTMLElement).dataset.tabla || '0', 10);
                renderizarEstadisticasJerarquicas();
            });
        });
    }

    // ================================================================
    // SOPORTES DE AFILIACIÓN
    // ================================================================

    function renderizarSoportes(): void {
        const trabajadores = obtenerTrabajadores();
        if (trabajadores.length === 0) {
            tbodySoportes.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No hay trabajadores con soportes.</td></tr>`;
            return;
        }

        tbodySoportes.innerHTML = trabajadores.map(t => `
            <tr>
                <td>${escaparHTML(t.id)}</td>
                <td>${escaparHTML(t.nombreCompleto)}</td>
                <td>${t.epsSoporte ? `<button class="btn btn-sm btn-primary btn-descargar-soporte" data-soporte="${escaparHTML(t.epsSoporte)}" data-nombre="EPS_${t.id}.pdf">📎 EPS</button>` : 'No cargado'}</td>
                <td>${t.arlSoporte ? `<button class="btn btn-sm btn-primary btn-descargar-soporte" data-soporte="${escaparHTML(t.arlSoporte)}" data-nombre="ARL_${t.id}.pdf">📎 ARL</button>` : 'No cargado'}</td>
                <td>${t.afpSoporte ? `<button class="btn btn-sm btn-primary btn-descargar-soporte" data-soporte="${escaparHTML(t.afpSoporte)}" data-nombre="AFP_${t.id}.pdf">📎 AFP</button>` : 'No cargado'}</td>
                <td>${t.cajaCompensacionSoporte ? `<button class="btn btn-sm btn-primary btn-descargar-soporte" data-soporte="${escaparHTML(t.cajaCompensacionSoporte)}" data-nombre="CAJA_${t.id}.pdf">📎 Caja</button>` : 'No cargado'}</td>
            </tr>
        `).join('');

        tbodySoportes.querySelectorAll('.btn-descargar-soporte').forEach(btn => {
            btn.addEventListener('click', () => {
                const soporte = (btn as HTMLElement).dataset.soporte;
                const nombre = (btn as HTMLElement).dataset.nombre || 'soporte.pdf';
                if (soporte) {
                    const link = document.createElement('a');
                    link.href = soporte;
                    link.download = nombre;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            });
        });
    }

    // ================================================================
    // ENCUESTAS VINCULADAS (CON APLICADAS/PENDIENTES)
    // ================================================================

    /**
     * Renderiza las encuestas vinculadas a un trabajador, mostrando
     * tanto las aplicadas como las pendientes.
     * 
     * @param trabajadorId - Cédula del trabajador.
     */
    function renderizarEncuestas(trabajadorId: string): void {
        if (!trabajadorId) {
            encuestasContainer.innerHTML = `<p class="text-muted">Seleccione un trabajador para ver sus encuestas.</p>`;
            return;
        }

        const trabajador = storageTrabajadores.obtenerPorId(trabajadorId);
        if (!trabajador) {
            encuestasContainer.innerHTML = `<p class="text-muted">Trabajador no encontrado.</p>`;
            return;
        }

        // Filtrar encuestas por trabajadorId y empresaId
        const todasLasEncuestas = storageEncuestas.obtenerTodos() as IEncuesta[];
        const encuestas = todasLasEncuestas.filter(e =>
            e.trabajadorId === trabajadorId && e.empresaId === empresaActiva
        );

        // Encabezado con nombre y CC
        let html = `
            <div class="encuestas-header">
                <h4>${escaparHTML(trabajador.nombreCompleto)}</h4>
                <p class="text-muted">Cédula: ${escaparHTML(trabajador.id)}</p>
            </div>
        `;

        // Tabla comparativa: aplicadas vs pendientes
        const tiposAplicados = encuestas.map(e => e.tipo);
        const tiposPendientes = ['Nordic', 'Psicosocial', 'CondicionesSalud'].filter(
            t => !tiposAplicados.includes(t as IEncuesta['tipo'])
        );

        html += `
            <table class="table table-striped encuestas-tabla">
                <thead>
                    <tr>
                        <th>Encuesta</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Nivel de Riesgo</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Encuestas aplicadas
        encuestas.forEach(e => {
            html += `
                <tr>
                    <td>${escaparHTML(e.tipo)}</td>
                    <td><span class="badge badge-success">✅ Aplicada</span></td>
                    <td>${formatearFecha(e.fechaAplicacion)}</td>
                    <td><span class="badge ${e.nivelRiesgo === 'Critico' ? 'badge-danger' : 'badge-info'}">${escaparHTML(e.nivelRiesgo)}</span></td>
                </tr>
            `;
        });

        // Encuestas pendientes
        tiposPendientes.forEach(tipo => {
            html += `
                <tr class="fila-pendiente">
                    <td>${escaparHTML(tipo)}</td>
                    <td><span class="badge badge-danger">❌ Pendiente</span></td>
                    <td>—</td>
                    <td>—</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        // Alerta si hay pendientes
        if (tiposPendientes.length > 0) {
            html += `
                <div class="alert alert-error" style="display:block;">
                    ⚠️ Encuestas pendientes de aplicar: <strong>${tiposPendientes.join(', ')}</strong>
                </div>
            `;
        } else {
            html += `
                <div class="alert alert-success" style="display:block;">
                    ✅ Todas las encuestas obligatorias han sido aplicadas.
                </div>
            `;
        }

        encuestasContainer.innerHTML = html;
    }

    // ================================================================
    // EVENTOS FINALES
    // ================================================================

    // Clic en fila de trabajadores para ver encuestas
    tbodyTrabajadores.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;

        // Si el clic fue en un botón, no procesar como "selección de trabajador"
        if (target.closest('button')) return;

        const row = target.closest('tr');
        if (!row) return;

        const cells = row.querySelectorAll('td');
        if (cells.length >= 1) {
            const cedula = cells[0]?.textContent?.trim() || '';
            if (cedula) {
                // Renderizar encuestas
                renderizarEncuestas(cedula);
                // Cambiar a pestaña de encuestas
                mostrarPestana('encuestas');
            }
        }
    });

    // Submit del formulario de perfil
    formPerfil.addEventListener('submit', handleSubmitForm);

    // Botón "Nuevo Trabajador"
    btnNuevo.addEventListener('click', () => {
        limpiarFormulario();
        perfilTitulo.textContent = 'Nuevo Perfil Sociodemográfico';
        mostrarPestana('perfil');
    });

    // Botón "Cancelar"
    btnCancelarPerfil.addEventListener('click', () => {
        limpiarFormulario();
        mostrarPestana('trabajadores');
    });

    // Búsqueda
    if (buscarInput) {
        buscarInput.addEventListener('input', renderizarTrabajadores);
    }

    // Ocultar botón "Nuevo" para rol Empresa
    if (esRolEmpresa) {
        btnNuevo.style.display = 'none';
    }

    // ================================================================
    // INICIALIZACIÓN
    // ================================================================

    renderizarTrabajadores();

    console.info('✅ Módulo M11 – Gestión de Perfil y Afiliaciones inicializado.');
}