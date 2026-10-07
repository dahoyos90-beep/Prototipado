/**
 * modules/M13-Gestion-Matriz-Peligros-Riesgos/matriz-listado.ts
 * 
 * Módulo de Gestión de Matriz de Peligros y Riesgos (M13 - GTC 45).
 * - Vista 1: Listado de matrices.
 * - Vista 2: Estadística de la matriz seleccionada.
 * - Abre matriz-detalle.html en pestaña nueva.
 * 
 * @version 1.3.0 (usa localStorage, crea matriz vacía sin pedir datos)
 * @since 2026-09-16
 */

import { storageMatrices, storageRiesgos } from '../../src/storage.js';
import { qs, escaparHTML, formatearFecha } from '../../src/utils.js';
import { obtenerUsuarioSesion } from '../../src/auth.js';
import { obtenerEmpresaActiva } from '../../src/session-manager.js';
import { calcularEstadisticas, generarIdMatriz, fechaActualISO } from '../../src/matriz-utils.js';

// ================================================================
// INICIALIZACIÓN
// ================================================================

export function init(contenedor: HTMLElement): void {
    const cssId = 'modulo-matriz-css';
    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'modules/M13-Gestion-Matriz-Peligros-Riesgos/matriz-listado.css';
        document.head.appendChild(link);
    }

    const usuarioActual = obtenerUsuarioSesion();
    const empresaActiva = obtenerEmpresaActiva();
    const esRolEmpresa = usuarioActual?.rol === 'Empresa';

    if (!empresaActiva) {
        const contenedorMatricesErr = qs('#contenedor-matrices') as HTMLElement;
        if (contenedorMatricesErr) {
            contenedorMatricesErr.innerHTML = `<p class="text-muted">⚠️ No hay empresa activa.</p>`;
        }
        return;
    }

    const tabContainer = qs('#tab-container-matriz') as HTMLElement;
    const tabButtons = tabContainer?.querySelectorAll('.tab-button') as NodeListOf<HTMLButtonElement>;
    const tabContents: Record<string, HTMLElement | null> = {
        matriz: qs('#tab-matriz') as HTMLElement,
        estadistica: qs('#tab-estadistica') as HTMLElement,
    };

    const contenedorMatrices = qs('#contenedor-matrices') as HTMLElement;
    const contenedorEstadisticas = qs('#contenedor-estadisticas') as HTMLElement;
    const statsTituloMatriz = qs('#stats-titulo-matriz') as HTMLElement;
    const btnNuevaMatriz = qs('#btn-nueva-matriz') as HTMLButtonElement;

    if (!tabContainer || !tabButtons.length || !contenedorMatrices) {
        console.error('❌ M13: No se encontraron los elementos del DOM.');
        return;
    }

    let matrizSeleccionadaId: string | null = null;

    // ================================================================
    // PESTAÑAS
    // ================================================================

    function mostrarPestana(id: string): void {
        Object.values(tabContents).forEach(el => el?.classList.add('hidden'));
        tabContents[id]?.classList.remove('hidden');
        tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === id));
        if (id === 'estadistica') renderizarEstadisticas();
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            if (tabId) mostrarPestana(tabId);
        });
    });

    mostrarPestana('matriz');

    // ================================================================
    // LISTADO DE MATRICES
    // ================================================================

    function renderizarMatrices(): void {
        const matrices = storageMatrices.obtenerTodos().filter(m => m.empresaId === empresaActiva);

        if (matrices.length === 0) {
            contenedorMatrices.innerHTML = `<p class="text-muted">No hay matrices registradas. Cree una nueva para comenzar.</p>`;
            return;
        }

        contenedorMatrices.innerHTML = matrices.map(matriz => `
            <div class="matriz-item" data-id="${escaparHTML(matriz.id)}">
                <div class="matriz-item-info">
                    <h4>🏢 ${escaparHTML(matriz.nombreCentroTrabajo || 'Sin nombre')}</h4>
                    <p><strong>NIT:</strong> ${escaparHTML(matriz.nit || 'Sin NIT')}</p>
                    <p><strong>Fecha creación:</strong> ${formatearFecha(matriz.fechaCreacion)}</p>
                    <p><strong>Última actualización:</strong> ${formatearFecha(matriz.fechaActualizacion)}</p>
                    <p><strong>Motivo:</strong> ${escaparHTML(matriz.motivoActualizacion || 'Sin motivo registrado')}</p>
                </div>
                <div class="matriz-item-acciones">
                    <button class="btn btn-sm btn-outline btn-ver-stats" data-id="${escaparHTML(matriz.id)}" title="Ver estadísticas">📊</button>
                    <button class="btn btn-sm btn-outline btn-editar" data-id="${escaparHTML(matriz.id)}">✏️ Editar</button>
                    <button class="btn btn-sm btn-danger btn-eliminar" data-id="${escaparHTML(matriz.id)}">🗑️ Eliminar</button>
                </div>
            </div>
        `).join('');

        asignarEventosTabla();
    }

    // ================================================================
    // EVENTOS DE LA TABLA
    // ================================================================

    function asignarEventosTabla(): void {
        // Botón Editar → pide motivo y abre detalle en pestaña nueva
        contenedorMatrices.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (!id) return;

                const motivo = window.prompt('Ingrese el motivo de la actualización:');
                if (!motivo || !motivo.trim()) {
                    alert('El motivo es obligatorio.');
                    return;
                }

                // ✅ Usar localStorage (persiste entre pestañas)
                localStorage.setItem('matrizIdActiva', id);
                localStorage.setItem('motivoActualizacion', motivo.trim());

                window.open('modules/M13-Gestion-Matriz-Peligros-Riesgos/matriz-detalle.html', '_blank');
            });
        });

        // Botón Ver Estadísticas
        contenedorMatrices.querySelectorAll('.btn-ver-stats').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id) {
                    matrizSeleccionadaId = id;
                    mostrarPestana('estadistica');
                }
            });
        });

        // Botón Eliminar
        contenedorMatrices.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = (btn as HTMLElement).dataset.id;
                if (id && confirm('¿Está seguro de eliminar esta matriz?')) {
                    storageMatrices.eliminar(id);
                    if (matrizSeleccionadaId === id) matrizSeleccionadaId = null;
                    renderizarMatrices();
                }
            });
        });
    }

    // ================================================================
    // ESTADÍSTICAS
    // ================================================================

    function renderizarEstadisticas(): void {
        if (!contenedorEstadisticas) return;

        if (!matrizSeleccionadaId) {
            if (statsTituloMatriz) {
                statsTituloMatriz.textContent = 'Seleccione una matriz para ver sus estadísticas.';
            }
            contenedorEstadisticas.innerHTML = `
                <p class="text-muted">Haga clic en el botón 📊 de una matriz del listado para ver sus estadísticas.</p>
            `;
            return;
        }

        const matriz = storageMatrices.obtenerPorId(matrizSeleccionadaId);
        if (!matriz) {
            contenedorEstadisticas.innerHTML = `<p class="text-muted">Matriz no encontrada.</p>`;
            return;
        }

        if (statsTituloMatriz) {
            statsTituloMatriz.textContent = `Matriz: ${matriz.nombreCentroTrabajo || 'Sin nombre'} · NIT: ${matriz.nit || 'Sin NIT'}`;
        }

        const todosLosRiesgos = storageRiesgos.obtenerTodos();
        const riesgos = todosLosRiesgos.filter(r => r.matrizId === matrizSeleccionadaId);

        if (riesgos.length === 0) {
            contenedorEstadisticas.innerHTML = `
                <p class="text-muted">Esta matriz no tiene riesgos registrados. Agregue riesgos para ver estadísticas.</p>
            `;
            return;
        }

        const stats = calcularEstadisticas(riesgos);
        const total = stats.evaluacionRiesgo.total;
        const evalRiesgo = stats.evaluacionRiesgo;
        const eficiencia = stats.nivelEficiencia;

        contenedorEstadisticas.innerHTML = `
            <!-- BLOQUE 1: EVALUACIÓN DEL RIESGO -->
            <div class="stats-bloque">
                <h4>🎯 Evaluación del Riesgo</h4>
                <div class="stats-grafica">
                    ${renderizarBarra('I (Crítico)', evalRiesgo.nivelI, total, 'barra-riesgo-i')}
                    ${renderizarBarra('II (Alto)', evalRiesgo.nivelII, total, 'barra-riesgo-ii')}
                    ${renderizarBarra('III (Medio)', evalRiesgo.nivelIII, total, 'barra-riesgo-iii')}
                    ${renderizarBarra('IV (Bajo)', evalRiesgo.nivelIV, total, 'barra-riesgo-iv')}
                </div>
                <table class="stats-tabla">
                    <thead>
                        <tr><th>Nivel de Riesgo</th><th>Cantidad</th><th>Porcentaje</th></tr>
                    </thead>
                    <tbody>
                        ${renderizarFilaTablaRiesgo('I (Crítico)', evalRiesgo.nivelI, total, 'riesgo-i')}
                        ${renderizarFilaTablaRiesgo('II (Alto)', evalRiesgo.nivelII, total, 'riesgo-ii')}
                        ${renderizarFilaTablaRiesgo('III (Medio)', evalRiesgo.nivelIII, total, 'riesgo-iii')}
                        ${renderizarFilaTablaRiesgo('IV (Bajo)', evalRiesgo.nivelIV, total, 'riesgo-iv')}
                        <tr class="stats-total"><td>Total</td><td>${total}</td><td>100%</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- BLOQUE 2: NIVEL DE EFICIENCIA -->
            <div class="stats-bloque">
                <h4>📈 Nivel de Eficiencia</h4>
                <div class="stats-grafica">
                    ${renderizarBarra('Controlados', eficiencia.controlados, total, 'barra-bajo')}
                    ${renderizarBarra('En Intervención', eficiencia.enIntervencion, total, 'barra-medio')}
                    ${renderizarBarra('Activos', eficiencia.activos, total, 'barra-muy-alto')}
                </div>
                <table class="stats-tabla">
                    <thead>
                        <tr><th>Estado del Riesgo</th><th>Cantidad</th><th>Porcentaje</th></tr>
                    </thead>
                    <tbody>
                        ${renderizarFilaTabla('Controlados', eficiencia.controlados, total)}
                        ${renderizarFilaTabla('En Intervención', eficiencia.enIntervencion, total)}
                        ${renderizarFilaTabla('Activos', eficiencia.activos, total)}
                        <tr class="stats-total"><td>Total</td><td>${total}</td><td>100%</td></tr>
                    </tbody>
                </table>
                <p class="text-muted" style="margin-top: 10px;">
                    <strong>% de Eficiencia:</strong> ${eficiencia.porcentaje}%
                    (riesgos controlados o en intervención)
                </p>
            </div>
        `;
    }

    // ================================================================
    // HELPERS DE RENDERIZADO
    // ================================================================

    function renderizarBarra(label: string, cantidad: number, total: number, claseColor: string): string {
        const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
        return `
            <div class="stats-barra-item">
                <span class="stats-barra-label">${label}</span>
                <div class="stats-barra-container">
                    <div class="stats-barra-fill ${claseColor}" style="width: ${porcentaje}%;">
                        ${porcentaje > 15 ? `${porcentaje}%` : ''}
                    </div>
                </div>
                <span class="stats-barra-valor">${cantidad}</span>
            </div>
        `;
    }

    function renderizarFilaTabla(label: string, cantidad: number, total: number): string {
        const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
        return `<tr><td>${label}</td><td>${cantidad}</td><td>${porcentaje}%</td></tr>`;
    }

    function renderizarFilaTablaRiesgo(label: string, cantidad: number, total: number, claseColor: string): string {
        const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
        return `
            <tr>
                <td><span class="resultado-riesgo ${claseColor}">${label}</span></td>
                <td>${cantidad}</td>
                <td>${porcentaje}%</td>
            </tr>
        `;
    }

    // ================================================================
    // EVENTO NUEVA MATRIZ (crea vacía y abre detalle directo)
    // ================================================================

    if (btnNuevaMatriz) {
        btnNuevaMatriz.addEventListener('click', () => {
            const nuevaMatriz = {
                id: generarIdMatriz(),
                empresaId: empresaActiva,
                nombreCentroTrabajo: '',
                nit: '',
                numTrabajadores: 0,
                clase1: false,
                clase2: false,
                clase3: false,
                clase4: false,
                clase5: false,
                claseRiesgoEmpresa: 'IV' as const,
                fechaUltimaEvaluacion: fechaActualISO(),
                fechaRealizacion: fechaActualISO(),
                responsablesEmpresa: '',
                levantamientoPor: '',
                licenciaSO: '',
                verificadoPor: '',
                cargoVerificador: '',
                asesoradoPor: '',
                licenciaAsesor: '',
                fechaVigenciaLicencia: '',
                fechaCreacion: new Date(),
                fechaActualizacion: new Date(),
                motivoActualizacion: 'Creación inicial'
            };

            if (storageMatrices.guardar(nuevaMatriz)) {
                // ✅ Guardar en localStorage (persiste entre pestañas)
                localStorage.setItem('matrizIdActiva', nuevaMatriz.id);
                localStorage.setItem('motivoActualizacion', 'Creación inicial');

                // Abrir el detalle en pestaña nueva
                window.open('modules/M13-Gestion-Matriz-Peligros-Riesgos/matriz-detalle.html', '_blank');

                // Actualizar el listado
                renderizarMatrices();
            } else {
                alert('Error al crear la matriz.');
            }
        });
    }

    // Ocultar botón para rol Empresa
    if (esRolEmpresa && btnNuevaMatriz) {
        btnNuevaMatriz.style.display = 'none';
    }

    // ================================================================
    // RENDERIZADO INICIAL
    // ================================================================

    renderizarMatrices();

    console.info('✅ M13 – Gestión de Matriz inicializado.');
}