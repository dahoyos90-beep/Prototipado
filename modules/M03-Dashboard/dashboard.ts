/**
 * modules/M03-Dashboard/dashboard.ts
 * 
 * Módulo de Dashboard – Indicadores clave del SG-SST.
 * Incluye selección de empresa, verificación de NIT, banner de empresa activa
 * y tarjetas de indicadores filtradas por empresa.
 * 
 * @version 2.0.0 (agregada selección de empresa, verificación NIT, filtro por empresaId)
 * @since 2026-09-08
 */

import {
    storageUsuarios,
    storageEmpresas,
    storageInspecciones,
    storageComites,
    storageConvivencia
} from '../../src/storage.js';
import { qs, escaparHTML, limpiarNIT } from '../../src/utils.js';
import { obtenerUsuarioSesion } from '../../src/auth.js';
import { obtenerEmpresaActiva, establecerEmpresaActiva } from '../../src/session-manager.js';
import type { IEmpresa } from '../../src/interfaces/index.js';

// ================================================================
// INICIALIZACIÓN DEL MÓDULO
// ================================================================

export function init(contenedor: HTMLElement): void {
    // Cargar CSS específico del módulo
    const cssId = 'modulo-dashboard-css';
    if (!document.getElementById(cssId)) {
        const cssLink = document.createElement('link');
        cssLink.id = cssId;
        cssLink.rel = 'stylesheet';
        cssLink.href = 'modules/M03-Dashboard/dashboard.css';
        document.head.appendChild(cssLink);
    }

    // ================================================================
    // REFERENCIAS AL DOM
    // ================================================================
    const bannerEmpresaActiva = qs('#banner-empresa-activa') as HTMLElement;
    const bannerEmpresaNombre = qs('#banner-empresa-nombre') as HTMLElement;
    const bannerEmpresaNit = qs('#banner-empresa-nit') as HTMLElement;
    const seleccionEmpresa = qs('#dashboard-seleccion-empresa') as HTMLElement;
    const listaEmpresas = qs('#lista-empresas-disponibles') as HTMLElement;
    const mensajeSinEmpresas = qs('#mensaje-sin-empresas') as HTMLElement;
    const btnIrEmpresas = qs('#btn-ir-empresas') as HTMLButtonElement;
    const indicadoresContainer = qs('#dashboard-indicadores') as HTMLElement;
    const dashboardCards = qs('#dashboard-cards') as HTMLElement;

    if (!bannerEmpresaActiva || !seleccionEmpresa || !indicadoresContainer || !dashboardCards) {
        console.error('❌ M03: No se encontraron todos los elementos del DOM.');
        return;
    }

    // ================================================================
    // OBTENER USUARIO Y EMPRESA ACTIVA
    // ================================================================
    const usuarioActual = obtenerUsuarioSesion();
    const empresaActiva = obtenerEmpresaActiva();

    if (!usuarioActual) {
        console.error('❌ M03: No hay usuario en sesión.');
        return;
    }

    // ================================================================
    // FUNCIONES DE UI
    // ================================================================

    /**
     * Muestra el banner con la empresa activa.
     */
    function mostrarBannerEmpresaActiva(empresa: IEmpresa): void {
        if (bannerEmpresaNombre) bannerEmpresaNombre.textContent = empresa.razonSocial;
        if (bannerEmpresaNit) bannerEmpresaNit.textContent = empresa.nit;
        bannerEmpresaActiva.classList.remove('hidden');
    }

    /**
     * Muestra el contenedor de selección de empresa con la lista.
     */
    function mostrarSeleccionEmpresa(): void {
        seleccionEmpresa.classList.remove('hidden');
        indicadoresContainer.classList.add('hidden');
        bannerEmpresaActiva.classList.add('hidden');
    }

    /**
     * Muestra el contenedor de indicadores.
     */
    function mostrarIndicadores(): void {
        seleccionEmpresa.classList.add('hidden');
        indicadoresContainer.classList.remove('hidden');
    }

    // ================================================================
    // RENDERIZADO DE LA LISTA DE EMPRESAS
    // ================================================================

    /**
     * Obtiene las empresas disponibles según el rol del usuario.
     */
    function obtenerEmpresasDisponibles(): IEmpresa[] {
        const todasEmpresas = storageEmpresas.obtenerTodos();

        if (usuarioActual?.rol === 'Empresa') {
            // Usuario Empresa: solo las empresas vinculadas a su CC
            return todasEmpresas.filter(e => usuarioActual.empresasVinculadas.includes(e.nit));
        }

        // SST: todas las empresas activas
        return todasEmpresas.filter(e =>
            e.estadoEliminacion === 'Activa' || !e.estadoEliminacion
        );
    }

    /**
     * Renderiza la lista de empresas disponibles en el contenedor.
     */
    function renderizarListaEmpresas(): void {
        const empresas = obtenerEmpresasDisponibles();

        if (empresas.length === 0) {
            listaEmpresas.classList.add('hidden');
            mensajeSinEmpresas.classList.remove('hidden');
            return;
        }

        listaEmpresas.classList.remove('hidden');
        mensajeSinEmpresas.classList.add('hidden');

        listaEmpresas.innerHTML = empresas.map(e => `
            <div class="empresa-card" data-nid="${escaparHTML(e.nit)}">
                <div class="empresa-info">
                    <h4>${escaparHTML(e.razonSocial)}</h4>
                    <p class="empresa-nit">NIT: ${escaparHTML(e.nit)}</p>
                    <p class="empresa-detalle">${escaparHTML(e.direccion)}</p>
                </div>
                <button class="btn btn-primary btn-seleccionar-empresa" data-nid="${escaparHTML(e.nit)}">
                    Seleccionar
                </button>
            </div>
        `).join('');

        // Asignar eventos a los botones de seleccionar
        listaEmpresas.querySelectorAll('.btn-seleccionar-empresa').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const nit = (event.currentTarget as HTMLElement).dataset.nid;
                if (nit) seleccionarEmpresa(nit);
            });
        });
    }

    // ================================================================
    // SELECCIÓN DE EMPRESA
    // ================================================================

    /**
     * Inicia el proceso de selección de empresa.
     * Pide verificación del NIT y establece la empresa activa.
     */
    function seleccionarEmpresa(nit: string): void {
        const empresa = storageEmpresas.obtenerTodos().find(e => limpiarNIT(e.nit) === limpiarNIT(nit));

        if (!empresa) {
            alert('Empresa no encontrada.');
            return;
        }

        // Pedir verificación del NIT
        const nitIngresado = window.prompt(
            `Verifique el NIT de la empresa:\n\n"${empresa.razonSocial}"\n\nIngrese el NIT:`
        );

        if (!nitIngresado) {
            console.warn('Selección cancelada.');
            return;
        }

        if (limpiarNIT(nitIngresado) !== limpiarNIT(empresa.nit)) {
            alert('❌ El NIT ingresado no coincide. Intente de nuevo.');
            return;
        }

        // Éxito: establecer empresa activa
        establecerEmpresaActiva(empresa.nit);
        console.info(`✅ Empresa activa: ${empresa.razonSocial} (${empresa.nit})`);

        // Actualizar UI
        mostrarBannerEmpresaActiva(empresa);
        mostrarIndicadores();
        renderizarTarjetas(empresa.nit);
    }

    // ================================================================
    // RENDERIZADO DE TARJETAS
    // ================================================================

    /**
     * Renderiza las tarjetas de indicadores filtradas por empresa.
     * 
     * @param empresaId - NIT de la empresa activa.
     */
    function renderizarTarjetas(empresaId: string): void {
        // Filtrar datos por empresa
        const usuarios = storageUsuarios.obtenerTodos().filter(u =>
            u.rol === 'Empresa' ? u.empresasVinculadas.includes(empresaId) : false
        );
        const totalUsuarios = usuarios.length;

        const totalEmpresas = 1; // La empresa activa

        const inspecciones = storageInspecciones.obtenerTodos().filter(i => i.empresaId === empresaId);
        const totalInspecciones = inspecciones.length;

        const comitesActivos = storageComites.obtenerTodos()
            .filter(c => c.empresaId === empresaId && c.estado === 'Activo').length;
        const convivenciaActiva = storageConvivencia.obtenerTodos()
            .filter(c => c.empresaId === empresaId && c.estado === 'Activo').length;

        dashboardCards.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${totalUsuarios}</h3>
                    <p>👥 Usuarios</p>
                </div>
                <div class="stat-card">
                    <h3>${totalEmpresas}</h3>
                    <p>🏢 Empresa</p>
                </div>
                <div class="stat-card">
                    <h3>${totalInspecciones}</h3>
                    <p>🔍 Inspecciones</p>
                </div>
                <div class="stat-card">
                    <h3>${comitesActivos + convivenciaActiva}</h3>
                    <p>🗂️ Comités Activos</p>
                    <span class="stat-detail">COPASST: ${comitesActivos} | Convivencia: ${convivenciaActiva}</span>
                </div>
            </div>
        `;

        console.info(`✅ Indicadores cargados para la empresa "${empresaId}".`);
    }

    // ================================================================
    // INICIALIZACIÓN
    // ================================================================

    // Si hay empresa activa, mostrar indicadores
    if (empresaActiva) {
        const empresa = storageEmpresas.obtenerPorId(empresaActiva);
        if (empresa) {
            mostrarBannerEmpresaActiva(empresa);
            mostrarIndicadores();
            renderizarTarjetas(empresa.nit);
        } else {
            // Empresa activa no encontrada (puede haber sido eliminada)
            console.warn('⚠️ Empresa activa no encontrada. Mostrando selección.');
            mostrarSeleccionEmpresa();
            renderizarListaEmpresas();
        }
    } else {
        // No hay empresa activa, mostrar selección
        mostrarSeleccionEmpresa();
        renderizarListaEmpresas();
    }

    // Evento del botón "Ir a Gestión de Empresas"
    if (btnIrEmpresas) {
        btnIrEmpresas.addEventListener('click', () => {
            // Simular clic en el enlace de navegación de M02
            const navLink = document.querySelector('[data-modulo="M02-Gestion-Empresas"]') as HTMLAnchorElement;
            if (navLink) navLink.click();
        });
    }

    console.info('✅ Módulo M03 – Dashboard inicializado.');
}