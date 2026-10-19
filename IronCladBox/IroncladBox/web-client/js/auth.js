// ===============================================
// AUTH.JS - Manejo de autenticación
// ===============================================

// ===============================================
// VERIFICAR SESIÓN ACTIVA AL CARGAR
// ===============================================
async function checkActiveSession() {
    const token = SecureStorage.getToken();
    
    // Si hay token y estamos en login o register, verificar si es válido
    if (token && (window.location.pathname.includes('/login') || window.location.pathname.includes('/register'))) {
        try {
            const response = await fetch(`${API_URL}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.data && data.data.user) {
                    showSessionModal(data.data.user);
                }
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
document.addEventListener('DOMContentLoaded', () => {
    try { checkActiveSession(); } catch (e) { /* skip on mobile */ }
});

// Verificar al volver atrás/adelante con las flechas del navegador
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        try { checkActiveSession(); } catch (e) { /* skip */ }
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
    
    if (!modal || !currentUserName || !cancelBtn || !logoutBtn) return;
    
    // Mostrar nombre completo del usuario
    const fullName = `${user.nombre} ${user.apellido}`.toUpperCase();
    currentUserName.textContent = fullName;
    
    // Mostrar modal
    modal.style.display = 'flex';
    
    // Botón Cancelar - volver al dashboard
    cancelBtn.onclick = () => {
        window.location.href = '/dashboard.html';
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
            window.location.href = '/dashboard.html';
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
                    window.location.href = '/dashboard.html';
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

        const nombre = document.getElementById('nombre').value.trim();
        const apellido = document.getElementById('apellido').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const fechaNacimientoVal = document.getElementById('fecha_nacimiento').value;
        const peso = document.getElementById('peso').value;
        const altura = document.getElementById('altura').value;

        // Validar nombre
        if (nombre.length < 2) {
            registerMessage.textContent = 'El nombre debe tener al menos 2 caracteres';
            registerMessage.className = 'auth-message error';
            return;
        }
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
            registerMessage.textContent = 'El nombre solo debe contener letras y espacios';
            registerMessage.className = 'auth-message error';
            return;
        }

        // Validar apellido
        if (apellido.length < 2) {
            registerMessage.textContent = 'El apellido debe tener al menos 2 caracteres';
            registerMessage.className = 'auth-message error';
            return;
        }
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) {
            registerMessage.textContent = 'El apellido solo debe contener letras y espacios';
            registerMessage.className = 'auth-message error';
            return;
        }

        // Validar email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            registerMessage.textContent = 'Formato de email inválido';
            registerMessage.className = 'auth-message error';
            return;
        }

        // Validar teléfono (10 dígitos)
        const telCleaned = telefono.trim().replace(/[\s\-\(\)\+]/g, '');
        if (!/^\d{10}$/.test(telCleaned)) {
            registerMessage.textContent = 'El teléfono debe tener 10 dígitos';
            registerMessage.className = 'auth-message error';
            return;
        }

        // Validar fecha de nacimiento
        if (fechaNacimientoVal) {
            const fnDate = new Date(fechaNacimientoVal + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(fnDate.getTime())) {
                registerMessage.textContent = 'Fecha de nacimiento no es válida';
                registerMessage.className = 'auth-message error';
                return;
            }
            if (fnDate >= today) {
                registerMessage.textContent = 'La fecha de nacimiento debe ser pasada';
                registerMessage.className = 'auth-message error';
                return;
            }
            let age = today.getFullYear() - fnDate.getFullYear();
            const mDiff = today.getMonth() - fnDate.getMonth();
            if (mDiff < 0 || (mDiff === 0 && today.getDate() < fnDate.getDate())) {
                age--;
            }
            if (age < 12) {
                registerMessage.textContent = 'Debes tener al menos 12 años';
                registerMessage.className = 'auth-message error';
                return;
            }
        }

        // Validar peso (opcional pero si se ingresa debe ser rango válido)
        if (peso) {
            const pesoNum = parseFloat(peso);
            if (isNaN(pesoNum) || pesoNum < 20 || pesoNum > 300) {
                registerMessage.textContent = 'El peso debe estar entre 20 y 300 kg';
                registerMessage.className = 'auth-message error';
                return;
            }
        }

        // Validar altura (opcional pero si se ingresa debe ser rango válido)
        if (altura) {
            const alturaNum = parseFloat(altura);
            if (isNaN(alturaNum) || alturaNum < 0.5 || alturaNum > 2.5) {
                registerMessage.textContent = 'La altura debe estar entre 0.5 y 2.5 m';
                registerMessage.className = 'auth-message error';
                return;
            }
        }

        const formData = {
            nombre: nombre,
            apellido: apellido,
            email: email,
            telefono: telCleaned,
            password: password,
            rol: 'ATLETA',
            id_membresia: selectedMembershipId
        };

        // Agregar campos opcionales
        if (peso) formData.peso = parseFloat(peso);
        if (altura) formData.altura = parseFloat(altura);

        const fechaNacimientoEl = document.getElementById('fecha_nacimiento');
        const direccion = document.getElementById('direccion');
        if (fechaNacimientoEl && fechaNacimientoEl.value) {
            formData.fecha_nacimiento = fechaNacimientoEl.value;
        }
        if (direccion && direccion.value) {
            formData.direccion = direccion.value;
        }

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
                    window.location.href = '/login.html';
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
    return SecureStorage.getToken() !== null;
}

// Obtener usuario actual
function getCurrentUser() {
    return SecureStorage.getUser();
}

// Obtener token
function getToken() {
    return SecureStorage.getToken();
}

// Logout
function logout() {
    SecureStorage.clear();
    window.location.href = '/login.html';
}

// Hacer petición autenticada
async function authenticatedFetch(url, options = {}) {
    const token = SecureStorage.getToken();

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
