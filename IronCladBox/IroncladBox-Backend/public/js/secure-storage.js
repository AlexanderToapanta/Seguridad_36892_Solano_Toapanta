// ===============================================
// STORAGE SEGURO - Manejo de sesiones
// ===============================================

const SecureStorage = {
    // Usar sessionStorage en lugar de localStorage
    // Se limpia automáticamente al cerrar la pestaña
    
    setToken(token) {
        sessionStorage.setItem('auth_token', token);
        // Agregar timestamp de expiración (8 horas)
        const expiresAt = Date.now() + (8 * 60 * 60 * 1000);
        sessionStorage.setItem('token_expires', expiresAt.toString());
    },

    getToken() {
        const token = sessionStorage.getItem('auth_token');
        const expiresAt = sessionStorage.getItem('token_expires');
        
        // Verificar si el token ha expirado
        if (token && expiresAt) {
            if (Date.now() > parseInt(expiresAt)) {
                this.clear();
                return null;
            }
            return token;
        }
        return null;
    },

    setUser(user) {
        // No guardar información sensible como password
        const safeUser = {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            rol: user.rol,
            foto_perfil: user.foto_perfil || null
        };
        sessionStorage.setItem('user_data', JSON.stringify(safeUser));
    },

    getUser() {
        const userData = sessionStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    },

    clear() {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('token_expires');
        sessionStorage.removeItem('user_data');
    },

    isAuthenticated() {
        return this.getToken() !== null;
    }
};

// Exportar para uso global
window.SecureStorage = SecureStorage;
