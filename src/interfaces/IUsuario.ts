/**
 * src/interfaces/IUsuario.ts
 * 
 * Interfaz que define la estructura de un Usuario en el sistema.
 * Corresponde al módulo M01 - Gestión de Usuarios (CU1 al CU4).
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Usuario.
 * - Ser utilizada por los servicios de almacenamiento (storage.ts)
 *   y por los módulos de gestión de usuarios.
 * 
 * @version 1.1.0 (agregados cc y empresasVinculadas)
 * @since 2026-08-31
 */

/**
 * Roles posibles dentro del sistema SG-SST Manager.
 * - Administrador: Acceso total a configuración y gestión.
 * - Profesional: Gestión de seguridad y salud (SST).
 * - Empresa: Visualización y reportes de su propia organización.
 * - Trabajador: Acceso a su perfil, capacitaciones y reportes personales.
 */
export type RolUsuario = "Administrador" | "Profesional" | "Empresa" | "Trabajador";

/**
 * Estados posibles para un usuario.
 * - Activo: Puede iniciar sesión y usar el sistema.
 * - Inactivo: No puede iniciar sesión (baja lógica).
 */
export type EstadoUsuario = "Activo" | "Inactivo";

/**
 * Interfaz IUsuario
 * 
 * Define la estructura completa de un usuario en el prototipo SG-SST Manager.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único del usuario (generado por el sistema, ej. UUID).
 * @property {string} nombreCompleto - Nombre completo del usuario (obligatorio).
 * @property {string} email - Correo electrónico (debe ser único en el sistema).
 * @property {string} documento - Número de identificación (único).
 * @property {string} telefono - Número de teléfono de contacto.
 * @property {string} licenciaSST - Número de licencia en Seguridad y Salud en el Trabajo (opcional, puede ser cadena vacía).
 * @property {RolUsuario} rol - Rol del usuario en el sistema (restringido a los valores definidos en el tipo).
 * @property {string} password - Contraseña del usuario (en prototipo se almacena en texto plano; en producción se usaría hash).
 * @property {EstadoUsuario} estado - Estado del usuario (Activo/Inactivo).
 * @property {string | null} cc - Cédula del representante legal (solo para rol "Empresa"; null para otros roles).
 * @property {string[]} empresasVinculadas - Lista de NITs de empresas vinculadas al usuario (solo para rol "Empresa"; array vacío para otros roles).
 * @property {Date} fechaCreacion - Fecha y hora de registro del usuario.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación del perfil.
 */
export interface IUsuario {
    id: string;
    nombreCompleto: string;
    email: string;
    documento: string;
    telefono: string;
    licenciaSST: string; // Puede ser vacío si no tiene licencia
    rol: RolUsuario;
    password: string;
    estado: EstadoUsuario;
    cc: string | null; // Solo para rol "Empresa"
    empresasVinculadas: string[]; // Lista de NITs (solo para rol "Empresa")
    fechaCreacion: Date;
    fechaActualizacion: Date;
}