// ===============================================
// AUTH.JS - Manejo de autenticación
// ===============================================

const API_URL = window.location.origin;

// ===============================================
// VERIFICAR SESIÓN ACTIVA AL CARGAR
// ===============================================
async function checkActiveSession() {
    const token = SecureStorage.getToken();
    
    // Si hay token y estamos en login o register, verificar si es válido
    if (token && (window.location.pathname === '/login' || window.location.pathname === '/register')) {
        try {
            const response = await fetch(`${API_URL}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Token válido, mostrar modal de confirmación
                showSessionModal(data.data.user);
                return;
            } else {
                // Token inválido, limpiar
                SecureStorage.clear();
            }
        } catch (error) {
            // Error en la verificación, limpiar
            SecureStorage.clear();
        }
    }
}

// Verificar al cargar la página
document.addEventListener('DOMContentLoaded', checkActiveSession);

// Verificar al volver atrás/adelante con las flechas del navegador
window.addEventListener('pageshow', function(event) {
    // event.persisted es true cuando la página se carga desde el caché del navegador
    if (event.persisted) {
        checkActiveSession();
    }
});

// ===============================================
// MODAL DE SESIÓN ACTIVA
// ===============================================
function showSessionModal(user) {
    const modal = document.getElementById('sessionModal');
    const currentUserName = document.getElementById('currentUserName');
    const cancelBtn = document.getElementById('cancelBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!modal) return;
    
    // Mostrar nombre completo del usuario
    const fullName = `${user.nombre} ${user.apellido}`.toUpperCase();
    currentUserName.textContent = fullName;
    
    // Mostrar modal
    modal.style.display = 'flex';
    
    // Botón Cancelar - volver al dashboard
    cancelBtn.onclick = () => {
        window.location.href = '/dashboard';
    };
    
    // Botón Cerrar sesión - limpiar sesión y recargar
    logoutBtn.onclick = () => {
        SecureStorage.clear();
        modal.style.display = 'none';
        window.location.reload();
    };
    
    // Cerrar modal al hacer clic fuera
    modal.onclick = (e) => {
        if (e.target === modal) {
            window.location.href = '/dashboard';
        }
    };
}

// ===============================================
// LOGIN
// ===============================================
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                loginMessage.textContent = '¡Login exitoso! Redirigiendo...';
                loginMessage.className = 'auth-message success';

                // Limpiar formulario
                loginForm.reset();

                // Guardar token y usuario de forma segura
                SecureStorage.setToken(data.data.token);
                SecureStorage.setUser(data.data.user);

                // Redirigir al dashboard
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                loginMessage.textContent = data.message;
                loginMessage.className = 'auth-message error';
                // Limpiar solo la contraseña por seguridad
                document.getElementById('password').value = '';
            }
        } catch (error) {
            console.error('Error:', error);
            loginMessage.textContent = 'Error al iniciar sesión. Intenta nuevamente.';
            loginMessage.className = 'auth-message error';
        }
    });
}

// ===============================================
// REGISTER
// ===============================================
if (document.getElementById('registerForm')) {
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');
    const membershipCardsContainer = document.getElementById('membershipCards');
    let selectedMembershipId = null;

    // Cargar membresías disponibles
    async function loadMemberships() {
        try {
            const response = await fetch(`${API_URL}/api/auth/memberships`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                membershipCardsContainer.innerHTML = '';
                
                data.data.forEach(membership => {
                    const card = document.createElement('div');
                    card.className = 'membership-card';
                    card.dataset.id = membership.id_membresia;
                    
                    card.innerHTML = `
                        <input type="radio" name="membership" id="membership_${membership.id_membresia}" value="${membership.id_membresia}">
                        <h3>${membership.nombre}</h3>
                        <div class="price">$${membership.precio}</div>
                        <div class="duration">${membership.duracion_dias} días</div>
                        <div class="description">${membership.descripcion || ''}</div>
                        <div class="benefits">${membership.beneficios || ''}</div>
                    `;
                    
                    card.addEventListener('click', function() {
                        // Remover selección anterior
                        document.querySelectorAll('.membership-card').forEach(c => c.classList.remove('selected'));
                        
                        // Seleccionar esta tarjeta
                        this.classList.add('selected');
                        this.querySelector('input[type="radio"]').checked = true;
                        selectedMembershipId = membership.id_membresia;
                        document.getElementById('id_membresia').value = membership.id_membresia;
                    });
                    
                    membershipCardsContainer.appendChild(card);
                });
            } else {
                membershipCardsContainer.innerHTML = '<p style="color: #999; text-align: center;">No hay membresías disponibles en este momento.</p>';
            }
        } catch (error) {
            console.error('Error al cargar membresías:', error);
            membershipCardsContainer.innerHTML = '<p style="color: #f00; text-align: center;">Error al cargar membresías. Por favor recarga la página.</p>';
        }
    }

    // Cargar membresías al iniciar
    loadMemberships();

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validar que se haya seleccionado una membresía
        if (!selectedMembershipId) {
            registerMessage.textContent = 'Por favor selecciona una membresía';
            registerMessage.className = 'auth-message error';
            return;
        }

        // Validar que se haya ingresado el teléfono
        const telefono = document.getElementById('telefono').value;
        if (!telefono || telefono.trim() === '') {
            registerMessage.textContent = 'Por favor ingresa tu número de teléfono';
            registerMessage.className = 'auth-message error';
            return;
        }

        const formData = {
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            email: document.getElementById('email').value,
            telefono: telefono.trim(),
            password: document.getElementById('password').value,
            rol: 'ATLETA',
            id_membresia: selectedMembershipId
        };

        // Agregar campos opcionales
        const peso = document.getElementById('peso').value;
        const altura = document.getElementById('altura').value;
        if (peso) formData.peso = parseFloat(peso);
        if (altura) formData.altura = parseFloat(altura);

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                registerMessage.textContent = data.message || '¡Registro exitoso! Tu cuenta será activada una vez procesado tu pago.';
                registerMessage.className = 'auth-message success';

                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else {
                registerMessage.textContent = data.message;
                registerMessage.className = 'auth-message error';
            }
        } catch (error) {
            console.error('Error:', error);
            registerMessage.textContent = 'Error al registrarse. Intenta nuevamente.';
            registerMessage.className = 'auth-message error';
        }
    });
}

// ===============================================
// HELPER FUNCTIONS
// ===============================================

// Verificar si el usuario está autenticado
function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

// Obtener usuario actual
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Obtener token
function getToken() {
    return localStorage.getItem('token');
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Hacer petición autenticada
async function authenticatedFetch(url, options = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    return fetch(url, {
        ...options,
        headers
    });
}
