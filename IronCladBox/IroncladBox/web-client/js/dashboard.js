// ===============================================
// DASHBOARD.JS - Manejo del dashboard por roles
// ===============================================

let currentUser = null;
let currentView = null;

// Obtener token de donde sea que esté guardado
function getStoredToken() {
    return SecureStorage.getToken() || localStorage.getItem('token') || localStorage.getItem('auth_token') || null;
}

// ===============================================
// FUNCIONES AUXILIARES PARA FECHAS
// ===============================================
// Formatear fecha sin conversión de zona horaria
function formatDateWithoutTimezone(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
}

// ===============================================
// INICIALIZACIÓN
// ===============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticación
    const token = getStoredToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Verificar token válido
    try {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            logout();
            return;
        }

        const data = await response.json();
        currentUser = data.data.user;

        // Inicializar dashboard
        initDashboard();
    } catch (error) {
        console.error('Error:', error);
        logout();
    }
});

// ===============================================
// INICIALIZAR DASHBOARD
// ===============================================
function initDashboard() {
    SocketManager.connect();
    _setupSocketListeners();

    document.getElementById('userName').textContent = `${currentUser.nombre} ${currentUser.apellido}`;
    document.getElementById('userRole').textContent = currentUser.rol;

    // Cargar foto de perfil si existe
    if (currentUser.foto_perfil) {
        document.getElementById('userProfileImage').src = currentUser.foto_perfil;
    }

    // Configurar upload de foto de perfil
    setupProfileImageUpload();

    // Cargar menú según rol
    loadSidebarMenu();

    // Cargar vista por defecto
    loadDefaultView();

    // Verificar estado de membresía si es atleta
    if (currentUser.rol === 'ATLETA') {
        checkMembershipStatus();
    }

    // Event listeners
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
}

function _setupSocketListeners() {
    const refreshEvents = [
        'wod:created', 'wod:updated', 'wod:deleted',
        'schedule:created', 'schedule:cancelled',
        'enrollment:created', 'enrollment:deleted',
        'class:created', 'class:updated', 'class:deleted',
        'class:enrollment_created', 'class:enrollment_deleted',
        'membership:created', 'membership:updated', 'membership:deleted',
        'membership:assigned', 'membership:cancelled',
        'trainer:created', 'trainer:deleted', 'trainer:status_updated',
        'athlete:created', 'athlete:deleted', 'athlete:status_updated',
        'exercise:created', 'exercise:updated', 'exercise:deleted', 'exercise:reactivated',
        'attendance:marked', 'progress:updated', 'progress:deleted'
    ];

    refreshEvents.forEach(event => {
        SocketManager.on(event, () => { if (currentView) loadView(currentView); });
    });

    SocketManager.on('membership:expired', () => {
        if (currentUser.rol === 'ADMINISTRADOR' && currentView && (currentView.startsWith('admin'))) {
            loadView(currentView);
        }
    });

    SocketManager.on('account:deleted', () => logout());
}

// ===============================================
// SUBIR FOTO DE PERFIL
// ===============================================
function setupProfileImageUpload() {
    const uploadBtn = document.getElementById('uploadImageBtn');
    const fileInput = document.getElementById('profileImageInput');
    const profileImage = document.getElementById('userProfileImage');

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    profileImage.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            await Swal.fire({
                icon: 'error',
                title: 'Archivo inválido',
                text: 'Por favor selecciona un archivo de imagen válido'
            });
            return;
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            await Swal.fire({
                icon: 'error',
                title: 'Archivo muy grande',
                text: 'La imagen no debe superar los 5MB'
            });
            return;
        }

        // Mostrar preview inmediato
        const reader = new FileReader();
        reader.onload = (e) => {
            profileImage.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Subir imagen al servidor
        try {
            const formData = new FormData();
            formData.append('profileImage', file);

            const token = SecureStorage.getToken();
            const response = await fetch(`${API_URL}/api/auth/upload-profile-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: 'Foto de perfil actualizada correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
                // Actualizar currentUser
                currentUser.foto_perfil = result.data.foto_perfil;
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message
                });
                // Revertir preview
                if (currentUser.foto_perfil) {
                    profileImage.src = currentUser.foto_perfil;
                } else {
                    profileImage.src = '/img/default-avatar.png';
                }
            }
        } catch (error) {
            console.error('Error al subir imagen:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al subir la imagen'
            });
            // Revertir preview
            if (currentUser.foto_perfil) {
                profileImage.src = currentUser.foto_perfil;
            } else {
                profileImage.src = '/img/default-avatar.png';
            }
        }
    });
}

// ===============================================
// SIDEBAR MENU
// ===============================================
function loadSidebarMenu() {
    const sidebarNav = document.getElementById('sidebarNav');
    let menuItems = [];

    switch (currentUser.rol) {
        case 'ADMINISTRADOR':
            menuItems = [
                { icon: 'fa-home', text: 'Dashboard', view: 'admin-dashboard' },
                { icon: 'fa-id-card', text: 'Membresías', view: 'admin-memberships' },
                { icon: 'fa-user-tie', text: 'Entrenadores', view: 'admin-trainers' },
                { icon: 'fa-calendar-alt', text: 'Calendario WOD', view: 'admin-calendar' },
                { icon: 'fa-plus-circle', text: 'Crear WOD', view: 'admin-create-wod' },
                { icon: 'fa-users', text: 'Atletas', view: 'admin-athletes' },
                { icon: 'fa-clock', text: 'Clases', view: 'admin-classes' },
                { icon: 'fa-dumbbell', text: 'Ejercicios', view: 'admin-ejercicios' },
                { icon: 'fa-user', text: 'Mi Perfil', view: 'admin-profile' }
            ];
            break;

        case 'ENTRENADOR':
            menuItems = [
                { icon: 'fa-home', text: 'Dashboard', view: 'trainer-dashboard' },
                { icon: 'fa-calendar-alt', text: 'Calendario WOD', view: 'trainer-calendar' },
                { icon: 'fa-plus-circle', text: 'Crear WOD', view: 'trainer-create-wod' },
                { icon: 'fa-users', text: 'Mis Atletas', view: 'trainer-athletes' },
                { icon: 'fa-dumbbell', text: 'Ejercicios', view: 'trainer-ejercicios' },
                { icon: 'fa-user', text: 'Mi Perfil', view: 'trainer-profile' }
            ];
            break;

        case 'ATLETA':
            menuItems = [
                { icon: 'fa-home', text: 'Dashboard', view: 'athlete-dashboard' },
                { icon: 'fa-calendar-check', text: 'Mis WODs', view: 'athlete-classes' },
                { icon: 'fa-calendar-alt', text: 'Calendario WOD', view: 'athlete-calendar' },
                { icon: 'fa-chart-line', text: 'Mi Progreso', view: 'athlete-progress' },
                { icon: 'fa-dumbbell', text: 'Ejercicios', view: 'athlete-ejercicios' },
                { icon: 'fa-id-card', text: 'Membresía', view: 'athlete-membership' },
                { icon: 'fa-user', text: 'Mi Perfil', view: 'athlete-profile' }
            ];
            break;
    }

    sidebarNav.innerHTML = menuItems.map(item => `
        <a class="nav-item" data-view="${item.view}">
            <i class="fas ${item.icon}"></i>
            <span>${item.text}</span>
        </a>
    `).join('');

    // Event listeners para menú
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            loadView(view);

            // Actualizar activo
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Cerrar sidebar en móvil
            if (window.innerWidth <= 968) {
                document.getElementById('sidebar').classList.remove('active');
            }
        });
    });
}

// ===============================================
// CARGAR VISTA POR DEFECTO
// ===============================================
function loadDefaultView() {
    const defaultViews = {
        'ADMINISTRADOR': 'admin-dashboard',
        'ENTRENADOR': 'trainer-dashboard',
        'ATLETA': 'athlete-dashboard'
    };

    loadView(defaultViews[currentUser.rol]);
    document.querySelector('[data-view="' + defaultViews[currentUser.rol] + '"]').classList.add('active');
}

// ===============================================
// CARGAR VISTA
// ===============================================
async function loadView(viewName) {
    currentView = viewName;
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
        switch (viewName) {
            // ADMINISTRADOR
            case 'admin-dashboard':
                await loadAdminDashboard();
                break;
            case 'admin-memberships':
                await loadAdminMemberships();
                break;
            case 'admin-trainers':
                await loadAdminTrainers();
                break;
            case 'admin-calendar':
                await loadAdminCalendar();
                break;
            case 'admin-create-wod':
                await loadAdminCreateWOD();
                break;
            case 'admin-athletes':
                await loadAdminAthletes();
                break;
            case 'admin-classes':
                await loadAdminClasses();
                break;
            case 'admin-ejercicios':
                await loadAdminEjercicios();
                break;
            case 'admin-profile':
                await loadAdminProfile();
                break;

            // ENTRENADOR
            case 'trainer-dashboard':
                await loadTrainerDashboard();
                break;
            case 'trainer-calendar':
                await loadTrainerCalendar();
                break;
            case 'trainer-athletes':
                await loadTrainerAthletes();
                break;
            case 'trainer-create-wod':
                await loadCreateWOD();
                break;
            case 'trainer-profile':
                await loadTrainerProfile();
                break;
            case 'trainer-ejercicios':
                await loadTrainerEjercicios();
                break;

            // ATLETA
            case 'athlete-dashboard':
                await loadAthleteDashboard();
                break;
            case 'athlete-classes':
                await loadAthleteWODs();
                break;
            case 'athlete-calendar':
                await loadAthleteCalendar();
                break;
            case 'athlete-progress':
                await loadAthleteProgress();
                break;
            case 'athlete-membership':
                await loadAthleteMembership();
                break;
            case 'athlete-profile':
                await loadAthleteProfile();
                break;
            case 'athlete-ejercicios':
                await loadAthleteEjercicios();
                break;

            default:
                contentArea.innerHTML = '<h1>Vista no encontrada</h1>';
        }
    } catch (error) {
        console.error('Error cargando vista:', error);
        contentArea.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Error al cargar la vista</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ===============================================
// VISTAS - ADMINISTRADOR
// ===============================================
async function loadAdminDashboard() {
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <h1 class="dashboard-title">Panel de Administración</h1>
        
        <div class="dashboard-cards">
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-users"></i></div>
                <div class="card-value" id="totalAthletes">...</div>
                <div class="card-label">Atletas Totales</div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-user-check"></i></div>
                <div class="card-value" id="activeAthletes">...</div>
                <div class="card-label">Atletas Activos</div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-dumbbell"></i></div>
                <div class="card-value" id="totalWODs">...</div>
                <div class="card-label">WODs Programados</div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-user-tie"></i></div>
                <div class="card-value" id="totalTrainers">...</div>
                <div class="card-label">Entrenadores</div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-id-card"></i></div>
                <div class="card-value" id="totalMemberships">...</div>
                <div class="card-label">Membresías</div>
            </div>
        </div>


    `;

    // Cargar estadísticas
    await loadStats();
}

async function loadStats() {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data;
            const totalEl = document.getElementById('totalAthletes');
            const activeEl = document.getElementById('activeAthletes');
            const wodsEl = document.getElementById('totalWODs');
            const trainersEl = document.getElementById('totalTrainers');
            const membershipsEl = document.getElementById('totalMemberships');
            
            if (totalEl) totalEl.textContent = stats.totalAthletes || 0;
            if (activeEl) activeEl.textContent = stats.activeAthletes || 0;
            if (wodsEl) wodsEl.textContent = stats.totalWODs || 0;
            if (trainersEl) trainersEl.textContent = stats.totalTrainers || 0;
            if (membershipsEl) membershipsEl.textContent = stats.totalMemberships || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ========================================
// GESTIÓN DE MEMBRESÍAS
// ========================================
async function loadAdminMemberships() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="admin-header">
            <h1 class="dashboard-title">Gestión de Membresías</h1>
            <button class="btn-primary" onclick="openMembershipModal()">
                <i class="fas fa-plus"></i> Nueva Membresía
            </button>
        </div>
        <div class="table-filter">
            <input type="text" id="membershipsFilter" placeholder="🔍 Buscar por nombre, precio o duración..." onkeyup="filterTable('membershipsTableBody', 'membershipsFilter')">
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Precio</th>
                        <th>Duración</th>
                        <th>Beneficios</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="membershipsTableBody">
                    <tr><td colspan="8" class="loading">Cargando...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- Modal para Membresía -->
        <div id="membershipModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="membershipModalTitle">Nueva Membresía</h2>
                    <span class="close" onclick="closeMembershipModal()">&times;</span>
                </div>
                <form id="membershipForm">
                    <input type="hidden" id="membershipId">
                    <div class="form-group">
                        <label for="membershipNombre">Nombre *</label>
                        <input type="text" id="membershipNombre" required>
                    </div>
                    <div class="form-group">
                        <label for="membershipDescripcion">Descripción *</label>
                        <textarea id="membershipDescripcion" rows="3" required></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="membershipPrecio">Precio ($) *</label>
                            <input type="number" id="membershipPrecio" step="0.01" min="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="membershipDuracion">Duración (días) *</label>
                            <input type="number" id="membershipDuracion" min="1" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="membershipBeneficios">Beneficios (uno por línea) *</label>
                        <textarea id="membershipBeneficios" rows="4" placeholder="Ejemplo:&#10;Acceso ilimitado&#10;Clases grupales&#10;Asesoría personalizada" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="membershipEstado" checked> Membresía Activa
                        </label>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeMembershipModal()">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    await loadMembershipsData();
    setupMembershipFormHandler();
}

async function loadMembershipsData() {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/memberships`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        const data = result.data || [];
        
        const tbody = document.getElementById('membershipsTableBody');
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No hay membresías registradas</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(m => `
            <tr>
                <td>${m.id_membresia}</td>
                <td><strong>${m.nombre}</strong></td>
                <td>${m.descripcion}</td>
                <td>$${parseFloat(m.precio).toFixed(2)}</td>
                <td>${m.duracion_dias} días</td>
                <td><small>${typeof m.beneficios === 'string' ? m.beneficios : (Array.isArray(m.beneficios) ? m.beneficios.join(', ') : m.beneficios)}</small></td>
                <td><span class="badge ${m.estado ? 'badge-success' : 'badge-danger'}">${m.estado ? 'Activo' : 'Inactivo'}</span></td>
                <td class="actions">
                    <button class="btn-icon btn-edit" onclick="editMembership(${m.id_membresia})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteMembership(${m.id_membresia}, '${m.nombre}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando membresías:', error);
        document.getElementById('membershipsTableBody').innerHTML = 
            '<tr><td colspan="8" class="error">Error al cargar datos</td></tr>';
    }
}

function openMembershipModal() {
    document.getElementById('membershipModalTitle').textContent = 'Nueva Membresía';
    document.getElementById('membershipForm').reset();
    document.getElementById('membershipId').value = '';
    document.getElementById('membershipModal').style.display = 'block';
}

function closeMembershipModal() {
    document.getElementById('membershipModal').style.display = 'none';
}

async function editMembership(id) {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/memberships/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        const membership = result.data || result;

        document.getElementById('membershipModalTitle').textContent = 'Editar Membresía';
        document.getElementById('membershipId').value = membership.id_membresia || membership.id;
        document.getElementById('membershipNombre').value = membership.nombre;
        document.getElementById('membershipDescripcion').value = membership.descripcion;
        document.getElementById('membershipPrecio').value = membership.precio;
        document.getElementById('membershipDuracion').value = membership.duracion_dias;
        document.getElementById('membershipEstado').checked = membership.estado === true || membership.estado === 'true';
        
        const beneficios = Array.isArray(membership.beneficios) 
            ? membership.beneficios.join('\n') 
            : membership.beneficios;
        document.getElementById('membershipBeneficios').value = beneficios;
        
        document.getElementById('membershipModal').style.display = 'block';
    } catch (error) {
        console.error('Error cargando membresía:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cargar la membresía'
        });
    }
}

async function deleteMembership(id, nombre) {
    const result = await Swal.fire({
        title: '¿Eliminar Membresía?',
        text: `¿Estás seguro de eliminar la membresía "${nombre}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/memberships/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            await Swal.fire({
                icon: 'success',
                title: '¡Eliminada!',
                text: 'Membresía eliminada correctamente',
                timer: 2000,
                showConfirmButton: false
            });
            await loadMembershipsData();
        } else {
            const errorData = await response.json();
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message || errorData.error || 'Error desconocido'
            });
        }
    } catch (error) {
        console.error('Error eliminando membresía:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al eliminar la membresía'
        });
    }
}

function setupMembershipFormHandler() {
    document.getElementById('membershipForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('membershipId').value;
        const nombre = document.getElementById('membershipNombre').value;
        const precio = parseFloat(document.getElementById('membershipPrecio').value);
        const duracion = parseInt(document.getElementById('membershipDuracion').value);
        const beneficiosText = document.getElementById('membershipBeneficios').value;

        const errors = [];
        if (!nombre || nombre.trim().length < 3) errors.push('El nombre debe tener al menos 3 caracteres');
        if (isNaN(precio) || precio <= 0) errors.push('El precio debe ser mayor a 0');
        if (isNaN(duracion) || duracion <= 0) errors.push('La duración debe ser mayor a 0');
        if (!beneficiosText || beneficiosText.trim() === '') errors.push('Los beneficios son requeridos');

        if (errors.length > 0) {
            await Swal.fire({ icon: 'warning', title: 'Validación', html: errors.join('<br>') });
            return;
        }

        const data = {
            nombre: nombre,
            descripcion: document.getElementById('membershipDescripcion').value,
            precio: precio,
            duracion_dias: duracion,
            beneficios: beneficiosText.trim(),
            estado: document.getElementById('membershipEstado').checked
        };

        try {
            const token = SecureStorage.getToken();
            const url = id ? `${API_URL}/api/admin/memberships/${id}` : `${API_URL}/api/admin/memberships`;
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: id ? 'Membresía actualizada correctamente' : 'Membresía creada correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
                closeMembershipModal();
                await loadMembershipsData();
            } else {
                const error = await response.json();
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error
                });
            }
        } catch (error) {
            console.error('Error guardando membresía:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar la membresía'
            });
        }
    };
}

// ========================================
// GESTIÓN DE ENTRENADORES
// ========================================
async function loadAdminTrainers() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="admin-header">
            <h1 class="dashboard-title">Gestión de Entrenadores</h1>
            <button class="btn-primary" onclick="openTrainerModal()">
                <i class="fas fa-plus"></i> Nuevo Entrenador
            </button>
        </div>
        <div class="table-filter">
            <input type="text" id="trainersFilter" placeholder="🔍 Buscar por nombre, email o especialidad..." onkeyup="filterTable('trainersTableBody', 'trainersFilter')">
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Apellido</th>
                        <th>Email</th>
                        <th>Telefono</th>
                        <th>Especialidad</th>
                        <th>Experiencia</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="trainersTableBody">
                    <tr><td colspan="9" class="loading">Cargando...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- Modal para Entrenador -->
        <div id="trainerModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="trainerModalTitle">Nuevo Entrenador</h2>
                    <span class="close" onclick="closeTrainerModal()">&times;</span>
                </div>
                <form id="trainerForm">
                    <input type="hidden" id="trainerId">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="trainerNombre">Nombre *</label>
                            <input type="text" id="trainerNombre" required>
                        </div>
                        <div class="form-group">
                            <label for="trainerApellido">Apellido *</label>
                            <input type="text" id="trainerApellido" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="trainerEmail">Email *</label>
                        <input type="email" id="trainerEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="trainerTelefono">Telefono</label>
                        <input type="tel" id="trainerTelefono" placeholder="+593 999 999 999">
                    </div>
                    <div class="form-group">
                        <label for="trainerDireccion">Direccion</label>
                        <input type="text" id="trainerDireccion" placeholder="Direccion">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="trainerEspecialidad">Especialidad *</label>
                            <input type="text" id="trainerEspecialidad" placeholder="CrossFit, Halterofilia, etc." required>
                        </div>
                        <div class="form-group">
                            <label for="trainerExperiencia">Anios de Experiencia *</label>
                            <input type="number" id="trainerExperiencia" min="1" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="trainerFechaNacimiento">Fecha Nacimiento</label>
                            <input type="date" id="trainerFechaNacimiento">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="trainerCertificaciones">Certificaciones</label>
                        <textarea id="trainerCertificaciones" rows="2" placeholder="Certificaciones separadas por comas"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="trainerBiografia">Biografía</label>
                        <textarea id="trainerBiografia" rows="3" placeholder="Información sobre el entrenador"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeTrainerModal()">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    await loadTrainersData();
    setupTrainerFormHandler();
}

async function loadTrainersData() {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/trainers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        const data = result.data || [];
        
        const tbody = document.getElementById('trainersTableBody');
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="no-data">No hay entrenadores registrados</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(t => `
            <tr>
                <td>${t.id_entrenador}</td>
                <td><strong>${t.nombre}</strong></td>
                <td>${t.apellido}</td>
                <td>${t.email}</td>
                <td>${t.telefono || '-'}</td>
                <td>${t.especialidad}</td>
                <td>${t.anios_experiencia} años</td>
                <td><span class="badge ${t.activo ? 'badge-success' : 'badge-danger'}">${t.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td class="actions">
                    <button class="btn-icon btn-edit" onclick="editTrainer(${t.id_entrenador})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon ${t.activo ? 'btn-delete' : 'btn-success'}" 
                            onclick="toggleTrainerStatus(${t.id_entrenador}, ${t.activo}, '${t.nombre} ${t.apellido}')" 
                            title="${t.activo ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${t.activo ? 'ban' : 'check'}"></i>
                    </button>
                    <button class="btn-icon btn-delete" 
                            onclick="deleteTrainer(${t.id_entrenador}, '${t.nombre} ${t.apellido}')" 
                            title="Eliminar permanentemente"
                            style="background-color: #dc3545;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error cargando entrenadores:', error);
        document.getElementById('trainersTableBody').innerHTML = 
            '<tr><td colspan="9" class="error">Error al cargar datos</td></tr>';
    }
}

function openTrainerModal() {
    document.getElementById('trainerModalTitle').textContent = 'Nuevo Entrenador';
    document.getElementById('trainerForm').reset();
    document.getElementById('trainerId').value = '';
    document.getElementById('trainerModal').style.display = 'block';
}

function closeTrainerModal() {
    document.getElementById('trainerModal').style.display = 'none';
}

async function editTrainer(id) {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/trainers/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        const trainer = result.data || result;

        document.getElementById('trainerModalTitle').textContent = 'Editar Entrenador';
        document.getElementById('trainerId').value = trainer.id_entrenador || trainer.id;
        document.getElementById('trainerNombre').value = trainer.nombre;
        document.getElementById('trainerApellido').value = trainer.apellido;
        document.getElementById('trainerEmail').value = trainer.email;
        document.getElementById('trainerTelefono').value = trainer.telefono || '';
        document.getElementById('trainerDireccion').value = trainer.direccion || '';
        document.getElementById('trainerEspecialidad').value = trainer.especialidad;
        document.getElementById('trainerExperiencia').value = trainer.anios_experiencia;
        if (trainer.fecha_nacimiento) document.getElementById('trainerFechaNacimiento').value = trainer.fecha_nacimiento;
        document.getElementById('trainerCertificaciones').value = trainer.certificaciones || '';
        document.getElementById('trainerBiografia').value = trainer.biografia || '';
        
        document.getElementById('trainerModal').style.display = 'block';
    } catch (error) {
        console.error('Error cargando entrenador:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cargar el entrenador'
        });
    }
}

async function toggleTrainerStatus(id, currentStatus, nombre) {
    const action = currentStatus ? 'desactivar' : 'activar';
    const result = await Swal.fire({
        title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} Entrenador?`,
        text: `¿Estás seguro de ${action} al entrenador "${nombre}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#FF3B30',
        cancelButtonColor: '#6c757d',
        confirmButtonText: `Sí, ${action}`,
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/trainers/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ activo: !currentStatus })
        });

        if (response.ok) {
            await Swal.fire({
                icon: 'success',
                title: '¡Estado actualizado!',
                text: `Entrenador ${currentStatus ? 'desactivado' : 'activado'} correctamente`,
                timer: 2000,
                showConfirmButton: false
            });
            await loadTrainersData();
        } else {
            const error = await response.json();
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || error.error
            });
        }
    } catch (error) {
        console.error('Error cambiando estado:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cambiar el estado'
        });
    }
}

async function deleteTrainer(id, nombre) {
    const result = await Swal.fire({
        title: '⚠️ ¿Eliminar Entrenador?',
        html: `
            <div style="text-align: left; padding: 10px;">
                <p style="margin-bottom: 15px; font-size: 16px;"><strong>¿Estás seguro de ELIMINAR PERMANENTEMENTE al entrenador "${nombre}"?</strong></p>
                <p style="color: #dc3545; margin-bottom: 10px;">Esta acción NO se puede deshacer y eliminará:</p>
                <ul style="color: #666; line-height: 1.8;">
                    <li>El perfil del entrenador</li>
                    <li>Su usuario del sistema</li>
                    <li>Todas sus clases programadas</li>
                </ul>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });
    
    if (!result.isConfirmed) return;
    
    // Doble confirmación para acciones peligrosas
    const result2 = await Swal.fire({
        title: '¿REALMENTE deseas continuar?',
        text: `Última confirmación: ¿ELIMINAR PERMANENTEMENTE a "${nombre}"?`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar definitivamente',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });
    
    if (!result2.isConfirmed) return;
    
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/trainers/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            await Swal.fire({
                icon: 'success',
                title: '¡Eliminado!',
                text: result.message || 'Entrenador eliminado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
            await loadTrainersData();
        } else {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message || result.error
            });
        }
    } catch (error) {
        console.error('Error eliminando entrenador:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al eliminar el entrenador'
        });
    }
}

function setupTrainerFormHandler() {
    document.getElementById('trainerForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('trainerId').value;
        const email = document.getElementById('trainerEmail').value.trim();
        const fechaNac = document.getElementById('trainerFechaNacimiento').value;
        const telefono = document.getElementById('trainerTelefono').value;
        const experiencia = parseInt(document.getElementById('trainerExperiencia').value);
        const especialidad = document.getElementById('trainerEspecialidad').value;

        const errors = [];

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Formato de email inválido');
        } else if (!email.toLowerCase().endsWith('@crossfit.com')) {
            errors.push('El email del entrenador debe ser del dominio @crossfit.com');
        }

        if (fechaNac) {
            const fnDate = new Date(fechaNac + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(fnDate.getTime())) {
                errors.push('Fecha de nacimiento no es válida');
            } else if (fnDate >= today) {
                errors.push('La fecha de nacimiento debe ser pasada');
            } else {
                let age = today.getFullYear() - fnDate.getFullYear();
                const mDiff = today.getMonth() - fnDate.getMonth();
                if (mDiff < 0 || (mDiff === 0 && today.getDate() < fnDate.getDate())) age--;
                if (age < 18) errors.push('El entrenador debe tener al menos 18 años (edad actual: ' + age + ')');
            }
        }

        if (telefono) {
            const cleaned = telefono.replace(/[\s\-\(\)\+]/g, '');
            if (!/^\d{10}$/.test(cleaned)) {
                errors.push('El teléfono debe tener 10 dígitos');
            }
        }

        if (isNaN(experiencia) || experiencia <= 0) {
            errors.push('Los años de experiencia deben ser mayor a 0');
        }

        if (!especialidad || especialidad.trim() === '') {
            errors.push('La especialidad es requerida');
        }

        const nombre = document.getElementById('trainerNombre').value.trim();
        const apellido = document.getElementById('trainerApellido').value.trim();
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) errors.push('El nombre solo debe contener letras');
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) errors.push('El apellido solo debe contener letras');

        if (errors.length > 0) {
            await Swal.fire({ icon: 'warning', title: 'Validación', html: errors.join('<br>') });
            return;
        }

        const data = {
            nombre: nombre,
            apellido: apellido,
            email: email,
            fecha_nacimiento: fechaNac || (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 25); return d.toISOString().split('T')[0]; })(),
            telefono: telefono,
            direccion: document.getElementById('trainerDireccion').value,
            especialidad: especialidad,
            anios_experiencia: experiencia,
            certificaciones: document.getElementById('trainerCertificaciones').value,
            biografia: document.getElementById('trainerBiografia').value
        };

        try {
            const token = SecureStorage.getToken();
            const url = id ? `${API_URL}/api/admin/trainers/${id}` : `${API_URL}/api/admin/trainers`;
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: id ? 'Entrenador actualizado correctamente' : 'Entrenador creado correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
                closeTrainerModal();
                await loadTrainersData();
            } else {
                const error = await response.json();
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error
                });
            }
        } catch (error) {
            console.error('Error guardando entrenador:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar el entrenador'
            });
        }
    };
}

// ========================================
// GESTIÓN DE CLASES
// ========================================
async function loadAdminCalendar() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <h1 class="dashboard-title">
            <i class="fas fa-calendar-alt"></i> Calendario de WODs - Administración
        </h1>
        <div class="info-card" style="background: linear-gradient(135deg, #e63946 0%, #d62828 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;"><i class="fas fa-user-shield"></i> Panel de Administrador</h3>
            <p style="margin: 0; line-height: 1.6;">
                Gestiona todos los WODs del box. Haz clic en un día para ver detalles, lista de inscritos y gestionar horarios.
                Los entrenadores pueden crear WODs desde su panel.
            </p>
        </div>
        <div id="wodCalendarContainer"></div>
    `;

    // Inicializar calendario WOD
    wodCalendar = new WODCalendar('wodCalendarContainer');
}

async function loadAdminCalendar() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <h1 class="dashboard-title">
            <i class="fas fa-calendar-alt"></i> Calendario de WODs - Administrador
        </h1>
        <div class="info-card" style="background: linear-gradient(135deg, #e63946 0%, #d62828 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;"><i class="fas fa-user-shield"></i> Panel de Administrador</h3>
            <p style="margin: 0; line-height: 1.6;">
                Visualiza y gestiona todos los WODs del box. Puedes crear, editar y eliminar WODs.
                Haz clic en un día para ver los detalles completos y la lista de inscritos por horario.
            </p>
        </div>
        <div id="wodCalendarContainer"></div>
    `;

    // Inicializar calendario WOD
    wodCalendar = new WODCalendar('wodCalendarContainer');
}

async function loadAthleteCalendar() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <h1 class="dashboard-title">
            <i class="fas fa-calendar-alt"></i> Calendario de WODs
        </h1>
        <div class="info-card" style="background: linear-gradient(135deg, #06d6a0 0%, #05b589 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;"><i class="fas fa-calendar-check"></i> Inscríbete a los WODs</h3>
            <p style="margin: 0; line-height: 1.6;">
                Consulta los WODs programados y selecciona el horario que mejor te convenga.
                Recuerda: solo puedes inscribirte a un horario por día.
            </p>
        </div>
        <div id="wodCalendarContainer"></div>
    `;

    // Inicializar calendario WOD
    wodCalendar = new WODCalendar('wodCalendarContainer');
}

// ========================================
// CREAR WOD - ADMINISTRADOR
// ========================================
async function loadAdminCreateWOD() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="wod-create-container">
            <h1 class="dashboard-title"><i class="fas fa-plus-circle"></i> Crear WOD</h1>
            <div class="dashboard-form wod-form-enhanced">
                <form id="adminCreateWODForm">
                    <!-- Información Básica -->
                    <div class="form-section">
                        <h3 class="section-title"><i class="fas fa-info-circle"></i> Información Básica</h3>
                        
                        <div class="form-group">
                            <label><i class="fas fa-calendar"></i> Fecha *</label>
                            <input type="date" id="adminWodFecha" name="fecha" required>
                        </div>

                        <div class="form-group">
                            <label><i class="fas fa-dumbbell"></i> Título del WOD *</label>
                            <input type="text" id="adminWodTitulo" name="titulo" 
                                   placeholder="Ej: Murph, Helen, Fran..." required>
                        </div>

                        <div class="form-group">
                            <label><i class="fas fa-list"></i> Descripción / Movimientos *</label>
                            <textarea id="adminWodDescripcion" name="descripcion" rows="6" 
                                      placeholder="Describe el WOD completo...&#10;&#10;Ejemplo:&#10;For Time:&#10;21-15-9&#10;Thrusters (95/65 lb)&#10;Pull-ups" required></textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label><i class="fas fa-tag"></i> Tipo de WOD *</label>
                                <select id="adminWodTipo" name="tipo" required>
                                    <option value="">Seleccionar...</option>
                                    <option value="AMRAP">AMRAP</option>
                                    <option value="FOR TIME">FOR TIME</option>
                                    <option value="EMOM">EMOM</option>
                                    <option value="TABATA">TABATA</option>
                                    <option value="STRENGTH">STRENGTH</option>
                                    <option value="CHIPPER">CHIPPER</option>
                                    <option value="HERO">HERO</option>
                                    <option value="BENCHMARK">BENCHMARK</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-signal"></i> Nivel *</label>
                                <select id="adminWodNivel" name="nivel" required>
                                    <option value="">Seleccionar nivel</option>
                                    <option value="Principiante">Principiante</option>
                                    <option value="Intermedio">Intermedio</option>
                                    <option value="Avanzado">Avanzado</option>
                                    <option value="Todos">Todos</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Horarios -->
                    <div class="form-section">
                        <h3 class="section-title"><i class="fas fa-clock"></i> Horarios Disponibles</h3>
                        <p class="section-description">Agrega los horarios en los que se realizará este WOD y asigna un entrenador a cada uno:</p>

                        <div id="adminHorariosContainer">
                            <div class="horario-item">
                                <div class="horario-row">
                                    <div class="form-group">
                                        <label>Hora *</label>
                                        <input type="time" class="horario-time" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Cupo máximo *</label>
                                        <input type="number" class="horario-cupo" min="1" value="12" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Entrenador *</label>
                                        <select class="horario-entrenador" required>
                                            <option value="">Cargando...</option>
                                        </select>
                                    </div>
                                    <div class="form-group" style="align-self: flex-end;">
                                        <button type="button" class="btn-icon btn-delete" onclick="removeHorario(this)" style="visibility: hidden;">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="button" class="btn-add-horario" onclick="addHorarioField()">
                            <i class="fas fa-plus"></i> Agregar Horario
                        </button>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-primary btn-submit-wod">
                            <i class="fas fa-save"></i> Crear WOD
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Cargar entrenadores
    await loadTrainersForWOD();

    // Configurar el manejador del formulario
    setupAdminWODFormHandler();
}

// Función para cargar entrenadores en los selects
async function loadTrainersForWOD() {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/trainers`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        const trainerSelects = document.querySelectorAll('.horario-entrenador');

        if (response.ok && result.success && result.data.length > 0) {
            // Guardar lista de entrenadores globalmente para uso posterior
            window.trainersData = result.data;
            
            trainerSelects.forEach(select => {
                select.innerHTML = '<option value="">Seleccionar entrenador...</option>';
                result.data.forEach(trainer => {
                    const option = document.createElement('option');
                    option.value = trainer.id_entrenador;
                    option.textContent = `${trainer.nombre} ${trainer.apellido}${trainer.especialidad ? ' - ' + trainer.especialidad : ''}`;
                    select.appendChild(option);
                });
            });
        } else {
            trainerSelects.forEach(select => {
                select.innerHTML = '<option value="">No hay entrenadores disponibles</option>';
            });
        }
    } catch (error) {
        console.error('Error cargando entrenadores:', error);
        document.querySelectorAll('.horario-entrenador').forEach(select => {
            select.innerHTML = '<option value="">Error al cargar entrenadores</option>';
        });
    }
}

function addHorarioField() {
    const container = document.getElementById('adminHorariosContainer');
    const horarioItem = document.createElement('div');
    horarioItem.className = 'horario-item';
    
    // Crear opciones de entrenadores
    let trainerOptions = '<option value="">Seleccionar entrenador...</option>';
    if (window.trainersData && window.trainersData.length > 0) {
        window.trainersData.forEach(trainer => {
            trainerOptions += `<option value="${trainer.id_entrenador}">${trainer.nombre} ${trainer.apellido}${trainer.especialidad ? ' - ' + trainer.especialidad : ''}</option>`;
        });
    }
    
    horarioItem.innerHTML = `
        <div class="horario-row">
            <div class="form-group">
                <label>Hora *</label>
                <input type="time" class="horario-time" required>
            </div>
            <div class="form-group">
                <label>Cupo máximo *</label>
                <input type="number" class="horario-cupo" min="1" value="12" required>
            </div>
            <div class="form-group">
                <label>Entrenador *</label>
                <select class="horario-entrenador" required>
                    ${trainerOptions}
                </select>
            </div>
            <div class="form-group" style="align-self: flex-end;">
                <button type="button" class="btn-icon btn-delete" onclick="removeHorario(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    container.appendChild(horarioItem);
}

function removeHorario(button) {
    button.closest('.horario-item').remove();
}

function setupAdminWODFormHandler() {
    document.getElementById('adminCreateWODForm').onsubmit = async (e) => {
        e.preventDefault();

        const fecha = document.getElementById('adminWodFecha').value;
        const titulo = document.getElementById('adminWodTitulo').value;
        const errors = [];

        if (!fecha) {
            errors.push('La fecha es requerida');
        } else {
            const fDate = new Date(fecha + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(fDate.getTime())) {
                errors.push('La fecha no es válida');
            } else if (fDate < today) {
                errors.push('La fecha no puede ser pasada');
            }
        }

        if (!titulo || titulo.trim().length < 3) {
            errors.push('El título debe tener al menos 3 caracteres');
        }

        // Recolectar horarios con entrenadores
        const horarioItems = document.querySelectorAll('#adminHorariosContainer .horario-item');
        const horarios = Array.from(horarioItems).map(item => {
            const hora = item.querySelector('.horario-time').value;
            const cupo = parseInt(item.querySelector('.horario-cupo').value);
            const id_entrenador = parseInt(item.querySelector('.horario-entrenador').value);
            return { hora, cupo_maximo: cupo, id_entrenador };
        }).filter(h => h.hora && h.cupo_maximo > 0 && h.id_entrenador);

        if (horarios.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Faltan horarios',
                text: 'Debes agregar al menos un horario con entrenador asignado'
            });
            return;
        }

        // Validar que todos los horarios tengan entrenador
        const horariosIncompletos = horarios.find(h => !h.id_entrenador);
        if (horariosIncompletos) {
            await Swal.fire({
                icon: 'warning',
                title: 'Horarios incompletos',
                text: 'Todos los horarios deben tener un entrenador asignado'
            });
            return;
        }

        // Validar horas y cupos de cada horario
        for (let i = 0; i < horarios.length; i++) {
            const h = horarios[i];
            if (h.cupo_maximo <= 0) {
                errors.push('Cada horario debe tener cupo mayor a 0');
            }
            if (h.hora < '06:00' || h.hora > '21:00') {
                errors.push('La hora del horario debe estar entre 06:00 y 21:00');
            }
        }

        if (errors.length > 0) {
            await Swal.fire({ icon: 'warning', title: 'Validación', html: errors.join('<br>') });
            return;
        }

        const data = {
            fecha: fecha,
            titulo: titulo,
            descripcion: document.getElementById('adminWodDescripcion').value,
            tipo: document.getElementById('adminWodTipo').value,
            nivel: document.getElementById('adminWodNivel').value,
            horarios: horarios
        };

        console.log('Creando WOD (Admin):', data);

        try {
            const token = SecureStorage.getToken();
            const response = await fetch(`${API_URL}/api/wod`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡WOD creado!',
                    text: 'WOD creado exitosamente',
                    timer: 2000,
                    showConfirmButton: false
                });
                document.getElementById('adminCreateWODForm').reset();
                // Recargar calendario si está abierto
                if (wodCalendar) {
                    wodCalendar.loadMonth();
                }
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message || 'No se pudo crear el WOD'
                });
            }
        } catch (error) {
            console.error('Error creando WOD:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al crear el WOD'
            });
        }
    };
}

// ========================================
// GESTIÓN DE ATLETAS
// ========================================
async function loadAdminAthletes() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="admin-header">
            <h1 class="dashboard-title">Gestión de Atletas</h1>
            <button class="btn-primary" onclick="openAthleteModal()">
                <i class="fas fa-plus"></i> Nuevo Atleta
            </button>
            <button class="btn-danger" onclick="deactivateExpiredAthletes()" style="margin-left: 10px; background: #dc3545;">
                <i class="fas fa-user-slash"></i> Desactivar Vencidos
            </button>
        </div>
        <div class="table-filter">
            <input type="text" id="athletesFilter" placeholder="🔍 Buscar por nombre, email o membresía..." onkeyup="filterTable('athletesTableBody', 'athletesFilter')">
            <label style="margin-left: 10px; font-size: 13px; color: #666;">
                <input type="checkbox" id="expiredFilter" onchange="loadAthletesData()"> Solo vencidas
            </label>
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Apellido</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Membresía</th>
                        <th>Fecha Inicio</th>
                        <th>Fecha Fin</th>
                        <th>Vigencia</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="athletesTableBody">
                    <tr><td colspan="11" class="loading">Cargando...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- Modal para Asignar Membresía -->
        <div id="membershipAssignModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Asignar/Cambiar Membresía</h2>
                    <span class="close" onclick="closeMembershipAssignModal()">&times;</span>
                </div>
                <form id="membershipAssignForm">
                    <input type="hidden" id="athleteIdForMembership">
                    <div class="form-group">
                        <label>Atleta:</label>
                        <p id="athleteNameDisplay" style="font-weight: bold; margin: 10px 0;"></p>
                    </div>
                    <div class="form-group">
                        <label for="membershipSelect">Membresía *</label>
                        <select id="membershipSelect" required>
                            <option value="">Seleccionar membresía...</option>
                        </select>
                    </div>
                    <div class="form-group" style="display: none;">
                        <label for="fechaInicio">Fecha de Inicio *</label>
                        <input type="date" id="fechaInicio">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeMembershipAssignModal()">Cancelar</button>
                        <button type="submit" class="btn-primary">Asignar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Modal para Crear/Editar Atleta -->
        <div id="athleteModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="athleteModalTitle">Nuevo Atleta</h2>
                    <span class="close" onclick="closeAthleteModal()">&times;</span>
                </div>
                <form id="athleteForm">
                    <input type="hidden" id="athleteId">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="athleteNombre">Nombre *</label>
                            <input type="text" id="athleteNombre" required>
                        </div>
                        <div class="form-group">
                            <label for="athleteApellido">Apellido *</label>
                            <input type="text" id="athleteApellido" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="athleteEmail">Email *</label>
                        <input type="email" id="athleteEmail" required>
                    </div>

                    <div class="form-group">
                        <label for="athleteTelefono">Teléfono *</label>
                        <input type="tel" id="athleteTelefono" required placeholder="Ej: +593 999 999 999">
                    </div>
                    <div class="form-group">
                        <label for="athleteFechaNacimiento">Fecha de Nacimiento *</label>
                        <input type="date" id="athleteFechaNacimiento" required>
                    </div>
                    <div class="form-group">
                        <label for="athleteDireccion">Dirección</label>
                        <input type="text" id="athleteDireccion">
                    </div>
                    <div class="form-group">
                        <label for="athleteContactoEmergencia">Contacto de Emergencia</label>
                        <input type="text" id="athleteContactoEmergencia" placeholder="Nombre y teléfono">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="athletePeso">Peso (kg)</label>
                            <input type="number" id="athletePeso" step="0.1" min="1" max="500" placeholder="Ej: 70.5">
                        </div>
                        <div class="form-group">
                            <label for="athleteAltura">Altura (m)</label>
                            <input type="number" id="athleteAltura" step="0.01" min="0.01" max="3" placeholder="Ej: 1.75">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeAthleteModal()">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    await loadAthletesData();
    await loadMembershipsForSelect();
    setupMembershipAssignFormHandler();
    setupAthleteFormHandler();
}

async function deactivateExpiredAthletes() {
    const result = await Swal.fire({
        title: 'Desactivar atletas vencidos?',
        text: 'Se desactivaran todos los atletas con membresia vencida.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Si, desactivar',
        cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/memberships/deactivate-expired`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            Swal.fire({ icon: 'success', title: 'Desactivados', text: data.message || 'Atletas vencidos desactivados.' });
            loadAthletesData();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Error al desactivar' });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexion' });
    }
}

async function loadAthletesData() {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/athletes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const allData = result.data || [];
        
        const tbody = document.getElementById('athletesTableBody');
        if (!tbody) return;
        
        const onlyExpired = document.getElementById('expiredFilter')?.checked || false;
        const hoy = new Date().toISOString().split('T')[0];
        const data = onlyExpired ? allData.filter(a => a.fecha_fin && a.fecha_fin < hoy) : allData;
        
        if (allData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="no-data">No hay atletas registrados</td></tr>';
            return;
        }
        if (data.length === 0 && onlyExpired) {
            tbody.innerHTML = '<tr><td colspan="11" class="no-data">No hay atletas con membresias vencidas</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(a => {
            const fechaInicio = a.fecha_inicio ? new Date(a.fecha_inicio + 'T00:00:00').toLocaleDateString('es-ES') : '-';
            const fechaFin = a.fecha_fin ? new Date(a.fecha_fin + 'T00:00:00').toLocaleDateString('es-ES') : '-';
            const tieneMembresia = a.membresia_nombre;
            const vigencia = !tieneMembresia ? 'Sin membresia' : (a.activo && a.fecha_fin && a.fecha_fin >= hoy ? 'Vigente' : 'Vencida');

            return `
                <tr${!a.activo ? ' style="opacity:0.6"' : ''}>
                    <td>${a.id_atleta}</td>
                    <td><strong>${a.nombre}</strong></td>
                    <td>${a.apellido}</td>
                    <td class="text-truncate" title="${a.email}">${a.email}</td>
                    <td>${a.telefono || '-'}</td>
                    <td>${tieneMembresia ? a.membresia_nombre : '<span class="badge badge-warning">Sin membresia</span>'}</td>
                    <td class="text-nowrap">${fechaInicio}</td>
                    <td class="text-nowrap">${fechaFin}</td>
                    <td><span class="badge ${vigencia === 'Vigente' ? 'badge-success' : 'badge-warning'}" style="${vigencia === 'Vencida' ? 'background:#dc3545;' : ''}">${vigencia}</span></td>
                    <td><span class="badge ${a.activo ? 'badge-success' : 'badge-danger'}">${a.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td class="actions">
                        <button class="btn-icon btn-edit" onclick="editAthlete(${a.id_atleta})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-edit" onclick="assignMembership(${a.id_atleta}, '${a.nombre} ${a.apellido}')" title="Asignar Membresía">
                            <i class="fas fa-id-card"></i>
                        </button>
                        <button class="btn-icon ${a.activo ? 'btn-delete' : 'btn-success'}" 
                                onclick="toggleAthleteStatus(${a.id_atleta}, ${a.activo}, '${a.nombre} ${a.apellido}')" 
                                title="${a.activo ? 'Desactivar' : 'Activar'}">
                            <i class="fas fa-${a.activo ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteAthlete(${a.id_atleta}, '${a.nombre} ${a.apellido}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error cargando atletas:', error);
        const tbody = document.getElementById('athletesTableBody');
        if (tbody) {
            tbody.innerHTML =             '<tr><td colspan="11" class="error">Error al cargar datos</td></tr>';
        }
    }
}

async function loadMembershipsForSelect() {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/memberships`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        const memberships = result.data || [];
        
        const select = document.getElementById('membershipSelect');
        // Limpiar opciones anteriores excepto la primera
        select.innerHTML = '<option value="">Seleccionar membresía...</option>';
        
        memberships.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id_membresia;
            option.dataset.duracion = m.duracion_dias;
            option.textContent = `${m.nombre} - $${parseFloat(m.precio).toFixed(2)} (${m.duracion_dias} días)`;
            select.appendChild(option);
        });
        
        // Evento para calcular fecha de fin automáticamente
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.dataset.duracion) {
                const fechaInicio = document.getElementById('fechaInicio').value;
                if (fechaInicio) {
                    const inicio = new Date(fechaInicio);
                    const duracion = parseInt(selectedOption.dataset.duracion);
                    const fin = new Date(inicio);
                    fin.setDate(fin.getDate() + duracion);
                    
                    const fechaFinFormatted = fin.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    // Mostrar fecha de fin calculada
                    let infoDiv = document.getElementById('membershipEndDateInfo');
                    if (!infoDiv) {
                        infoDiv = document.createElement('div');
                        infoDiv.id = 'membershipEndDateInfo';
                        infoDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: #e8f5e9; border-radius: 5px; color: #2e7d32;';
                        document.getElementById('fechaInicio').parentElement.appendChild(infoDiv);
                    }
                    infoDiv.innerHTML = `<i class="fas fa-calendar-check"></i> Fecha de fin: <strong>${fechaFinFormatted}</strong>`;
                }
            }
        });
        
        // Evento para recalcular cuando cambia la fecha de inicio
        document.getElementById('fechaInicio').addEventListener('change', function() {
            const select = document.getElementById('membershipSelect');
            if (select.value) {
                select.dispatchEvent(new Event('change'));
            }
        });
    } catch (error) {
        console.error('Error cargando membresías:', error);
    }
}

function assignMembership(athleteId, athleteName) {
    document.getElementById('athleteIdForMembership').value = athleteId;
    document.getElementById('athleteNameDisplay').textContent = athleteName;
    
    // Establecer fecha de inicio como hoy
    const today = new Date().toISOString().split('T')[0];
    const fechaInicioEl = document.getElementById('fechaInicio');
    if (fechaInicioEl) {
        fechaInicioEl.value = today;
    }
    
    // Limpiar info de fecha de fin si existe
    const infoDiv = document.getElementById('membershipEndDateInfo');
    if (infoDiv) {
        infoDiv.remove();
    }
    
    document.getElementById('membershipAssignModal').style.display = 'block';
}

function closeMembershipAssignModal() {
    document.getElementById('membershipAssignModal').style.display = 'none';
}

function openAthleteModal() {
    document.getElementById('athleteModalTitle').textContent = 'Nuevo Atleta';
    document.getElementById('athleteForm').reset();
    document.getElementById('athleteId').value = '';
    document.getElementById('athleteTelefono').required = true;
    document.getElementById('athleteModal').style.display = 'block';
}

function closeAthleteModal() {
    document.getElementById('athleteModal').style.display = 'none';
}

async function editAthlete(id) {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/athletes/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Datos del atleta recibidos:', result);
        
        const athlete = result.data || result;

        document.getElementById('athleteModalTitle').textContent = 'Editar Atleta';
        document.getElementById('athleteId').value = athlete.id_atleta || athlete.id;
        document.getElementById('athleteNombre').value = athlete.nombre || '';
        document.getElementById('athleteApellido').value = athlete.apellido || '';
        document.getElementById('athleteEmail').value = athlete.email || '';
        document.getElementById('athleteTelefono').value = athlete.telefono || '';
        document.getElementById('athleteTelefono').required = false; // No obligatorio en edición
        document.getElementById('athleteDireccion').value = athlete.direccion || '';
        document.getElementById('athleteContactoEmergencia').value = athlete.contacto_emergencia || '';
        if (athlete.fecha_nacimiento) {
            const fn = athlete.fecha_nacimiento;
            if (fn instanceof Date || typeof fn === 'string') {
                const d = new Date(fn);
                if (!isNaN(d.getTime())) document.getElementById('athleteFechaNacimiento').value = d.toISOString().split('T')[0];
            }
        }
        console.log('peso:', athlete.peso, '| altura:', athlete.altura, '| direccion:', athlete.direccion, '| contacto_emergencia:', athlete.contacto_emergencia, '| fecha_nacimiento:', athlete.fecha_nacimiento);
        document.getElementById('athletePeso').value = (athlete.peso != null && athlete.peso !== '') ? athlete.peso : '';
        document.getElementById('athleteAltura').value = (athlete.altura != null && athlete.altura !== '') ? athlete.altura : '';
        
        document.getElementById('athleteModal').style.display = 'block';
    } catch (error) {
        console.error('Error cargando atleta:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cargar el atleta: ' + error.message
        });
    }
}

async function toggleAthleteStatus(id, currentStatus, nombre) {
    const action = currentStatus ? 'desactivar' : 'activar';
    const result = await Swal.fire({
        title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} Atleta?`,
        text: `¿Estás seguro de ${action} al atleta "${nombre}"?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#FF3B30',
        cancelButtonColor: '#6c757d',
        confirmButtonText: `Sí, ${action}`,
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/athletes/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ activo: !currentStatus })
        });

        if (response.ok) {
            await Swal.fire({
                icon: 'success',
                title: '¡Estado actualizado!',
                text: `Atleta ${currentStatus ? 'desactivado' : 'activado'} correctamente`,
                timer: 2000,
                showConfirmButton: false
            });
            await loadAthletesData();
        } else {
            const error = await response.json();
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.error
            });
        }
    } catch (error) {
        console.error('Error cambiando estado:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al cambiar el estado'
        });
    }
}

async function deleteAthlete(id, nombre) {
    const result = await Swal.fire({
        title: '⚠️ ¿Eliminar Atleta?',
        html: `
            <div style="text-align: left; padding: 10px;">
                <p style="margin-bottom: 15px; font-size: 16px;"><strong>¿Estás seguro de ELIMINAR PERMANENTEMENTE a "${nombre}"?</strong></p>
                <p style="color: #dc3545; margin-bottom: 10px;">Esta acción NO se puede deshacer y eliminará:</p>
                <ul style="color: #666; line-height: 1.8;">
                    <li>El perfil del atleta</li>
                    <li>Todas sus inscripciones</li>
                    <li>Su historial de asistencias</li>
                    <li>Su progreso y racha</li>
                    <li>Su cuenta de usuario</li>
                </ul>
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });
    
    if (!result.isConfirmed) return;
    
    // Segunda confirmación para seguridad
    const result2 = await Swal.fire({
        title: '¿REALMENTE deseas continuar?',
        text: `Esta es tu última oportunidad para cancelar la eliminación de "${nombre}".`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar definitivamente',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });
    
    if (!result2.isConfirmed) return;
    
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/athletes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            await Swal.fire({
                icon: 'success',
                title: '¡Eliminado!',
                text: 'El atleta ha sido eliminado exitosamente',
                timer: 2000,
                showConfirmButton: false
            });
            await loadAthletesData();
        } else {
            const error = await response.json();
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo eliminar el atleta'
            });
        }
    } catch (error) {
        console.error('Error eliminando atleta:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al eliminar el atleta'
        });
    }
}

function setupMembershipAssignFormHandler() {
    document.getElementById('membershipAssignForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const athleteId = document.getElementById('athleteIdForMembership').value;
        const membershipId = parseInt(document.getElementById('membershipSelect').value);
        const fechaInicio = document.getElementById('fechaInicio').value;
        const errors = [];

        if (isNaN(membershipId) || membershipId <= 0) {
            errors.push('Debes seleccionar una membresía');
        }
        if (fechaInicio) {
            const fiDate = new Date(fechaInicio + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(fiDate.getTime())) {
                errors.push('Fecha de inicio no es válida');
            } else if (fiDate > today) {
                errors.push('La fecha de inicio no puede ser futura');
            }
        }

        if (errors.length > 0) {
            await Swal.fire({ icon: 'warning', title: 'Validación', html: errors.join('<br>') });
            return;
        }

        const data = {
            id_membresia: membershipId
        };

        try {
            const token = SecureStorage.getToken();
            const response = await fetch(`${API_URL}/api/admin/athletes/${athleteId}/membership`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: 'Membresía asignada correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
                closeMembershipAssignModal();
                await loadAthletesData();
            } else {
                const error = await response.json();
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error
                });
            }
        } catch (error) {
            console.error('Error asignando membresía:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al asignar la membresía'
            });
        }
    };
}

function setupAthleteFormHandler() {
    document.getElementById('athleteForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('athleteId').value;
        const fechaNac = document.getElementById('athleteFechaNacimiento').value;
        const email = document.getElementById('athleteEmail').value.trim();
        const telefono = document.getElementById('athleteTelefono').value;
        const peso = document.getElementById('athletePeso').value;
        const altura = document.getElementById('athleteAltura').value;
        const contactoEmergencia = document.getElementById('athleteContactoEmergencia').value;
        const nombre = document.getElementById('athleteNombre').value.trim();
        const apellido = document.getElementById('athleteApellido').value.trim();

        const errors = [];

        if (!nombre || nombre.length < 2) errors.push('El nombre debe tener al menos 2 caracteres');
        else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) errors.push('El nombre solo debe contener letras');

        if (!apellido || apellido.length < 2) errors.push('El apellido debe tener al menos 2 caracteres');
        else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) errors.push('El apellido solo debe contener letras');

        if (!fechaNac) {
            errors.push('La fecha de nacimiento es requerida');
        } else {
            const fnDate = new Date(fechaNac + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(fnDate.getTime())) {
                errors.push('Fecha de nacimiento no es válida');
            } else if (fnDate >= today) {
                errors.push('La fecha de nacimiento debe ser pasada');
            } else {
                let age = today.getFullYear() - fnDate.getFullYear();
                const mDiff = today.getMonth() - fnDate.getMonth();
                if (mDiff < 0 || (mDiff === 0 && today.getDate() < fnDate.getDate())) age--;
                if (age < 12) errors.push('El atleta debe tener al menos 12 años (edad actual: ' + age + ')');
            }
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Formato de email inválido');
        }

        if (telefono) {
            const cleaned = telefono.replace(/[\s\-\(\)\+]/g, '');
            if (!/^\d{10}$/.test(cleaned)) {
                errors.push('El teléfono debe tener 10 dígitos');
            }
        }

        if (peso) {
            const pesoNum = parseFloat(peso);
            if (isNaN(pesoNum) || pesoNum < 20 || pesoNum > 300) {
                errors.push('El peso debe estar entre 20 y 300 kg');
            }
        }

        if (altura) {
            const alturaNum = parseFloat(altura);
            if (isNaN(alturaNum) || alturaNum < 0.5 || alturaNum > 2.5) {
                errors.push('La altura debe estar entre 0.5 y 2.5 m');
            }
        }

        if (contactoEmergencia) {
            if (contactoEmergencia.trim().length < 3) {
                errors.push('El contacto de emergencia debe tener al menos 3 caracteres');
            }
        }

        if (errors.length > 0) {
            await Swal.fire({ icon: 'warning', title: 'Validación', html: errors.join('<br>') });
            return;
        }

        const dateParts = fechaNac.split('-');
        const password = dateParts[2] + dateParts[1] + dateParts[0];
        const data = {
            nombre: nombre,
            apellido: apellido,
            email: email,
            fecha_nacimiento: fechaNac,
            telefono: telefono || null,
            direccion: document.getElementById('athleteDireccion').value || null,
            contacto_emergencia: contactoEmergencia || null,
            peso: peso ? parseFloat(peso) : null,
            altura: altura ? parseFloat(altura) : null
        };

        try {
            const token = SecureStorage.getToken();
            const url = id ? `/api/admin/athletes/${id}` : '/api/admin/athletes';
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Atleta creado!',
                    text: id ? 'Atleta actualizado correctamente' : `Su contraseña es: ${password} (ddmmaaaa de su fecha de nacimiento)`,
                    timer: 5000,
                    showConfirmButton: true
                });
                closeAthleteModal();
                await loadAthletesData();
            } else {
                const errorData = await response.json();
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorData.message || errorData.error || 'Error desconocido'
                });
            }
        } catch (error) {
            console.error('Error guardando atleta:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar el atleta: ' + error.message
            });
        }
    };
}

async function loadAdminUsers() {
    // Función placeholder
}

// ===============================================
// VISTAS - ENTRENADOR
// ===============================================
async function loadTrainerDashboard() {
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <h1 class="dashboard-title">Dashboard Entrenador</h1>
        
        <div class="dashboard-cards">
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-dumbbell"></i></div>
                <div class="card-value" id="myWODs">...</div>
                <div class="card-label">WODs Próximos</div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-check-circle"></i></div>
                <div class="card-value" id="completedWODs">...</div>
                <div class="card-label">WODs Completados</div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-users"></i></div>
                <div class="card-value" id="myStudents">...</div>
                <div class="card-label">Mis Atletas</div>
            </div>
        </div>

        <div class="data-table-container">
            <h2>Próximos WODs</h2>
            <div id="upcomingWODsList">
                <p>Cargando...</p>
            </div>
        </div>
    `;
    
    // Cargar datos
    await loadTrainerDashboardData();
}

async function loadTrainerDashboardData() {
    try {
        const token = SecureStorage.getToken();
        
        // Obtener WODs del entrenador
        const wodsResponse = await fetch(`${API_URL}/api/trainers/my-wods`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const wodsResult = await wodsResponse.json();
        
        console.log('WODs Response:', wodsResult); // Debug
        
        const wods = wodsResult.data || [];
        
        // Obtener atletas del entrenador
        const athletesResponse = await fetch(`${API_URL}/api/trainers/my-athletes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const athletesResult = await athletesResponse.json();
        const athletes = athletesResult.data || [];
        
        // Filtrar próximos WODs (hoy en adelante)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingWODs = wods.filter(w => {
            const wodDate = new Date(w.fecha);
            return wodDate >= today;
        }).sort((a, b) => {
            return new Date(a.fecha) - new Date(b.fecha);
        });
        
        const completedWODs = wods.filter(w => {
            const wodDate = new Date(w.fecha);
            return wodDate < today;
        });
        
        // Actualizar contadores
        document.getElementById('myWODs').textContent = upcomingWODs.length;
        document.getElementById('completedWODs').textContent = completedWODs.length;
        document.getElementById('myStudents').textContent = athletes.length;
        
        // Mostrar solo los primeros 5 próximos WODs
        const wodsToShow = upcomingWODs.slice(0, 5);
        
        const upcomingList = document.getElementById('upcomingWODsList');
        if (wodsToShow.length === 0) {
            upcomingList.innerHTML = '<p>No tienes WODs próximos programados.</p>';
        } else {
            upcomingList.innerHTML = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>WOD</th>
                            <th>Fecha</th>
                            <th>Horarios</th>
                            <th>Inscritos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${wodsToShow.map(w => {
                            const fecha = new Date(w.fecha);
                            const fechaStr = fecha.toLocaleDateString('es-ES');
                            
                            const horariosStr = w.horarios.map(h => {
                                const horaStr = h.hora ? h.hora.substring(0, 5) : '-';
                                return `${horaStr} (${h.inscritos}/${h.cupo_maximo})`;
                            }).join('<br>');
                            
                            const totalInscritos = w.horarios.reduce((sum, h) => sum + h.inscritos, 0);
                            const totalCupo = w.horarios.reduce((sum, h) => sum + h.cupo_maximo, 0);
                            
                            return `
                                <tr>
                                    <td><strong>${w.titulo}</strong><br><small>${w.tipo}</small></td>
                                    <td>${fechaStr}</td>
                                    <td>${horariosStr}</td>
                                    <td><strong>${totalInscritos}/${totalCupo}</strong></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error cargando dashboard del entrenador:', error);
        document.getElementById('myWODs').textContent = '0';
        document.getElementById('completedWODs').textContent = '0';
        document.getElementById('myStudents').textContent = '0';
        document.getElementById('upcomingWODsList').innerHTML = '<p class="error">Error al cargar datos</p>';
    }
}

// ===============================================
// VISTAS - ATLETA
// ===============================================
async function loadAthleteDashboard() {
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <h1 class="dashboard-title">Mi Dashboard</h1>
        
        <div class="dashboard-cards">
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-calendar-check"></i></div>
                <div class="card-value" id="myEnrollments">0</div>
                <div class="card-label">WODs Inscritos</div>
            </div>
            <div class="dashboard-card" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);">
                <div class="card-icon"><i class="fas fa-fire"></i></div>
                <div class="card-value" id="rachaActual">0</div>
                <div class="card-label">Días de Racha 🔥</div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-trophy"></i></div>
                <div class="card-value" id="rachaMaxima">0</div>
                <div class="card-label">Récord de Racha</div>
            </div>
            <div class="dashboard-card">
                <div class="card-icon"><i class="fas fa-dumbbell"></i></div>
                <div class="card-value" id="totalAsistencias">0</div>
                <div class="card-label">Total Asistencias</div>
            </div>
        </div>

        <div class="data-table-container">
            <h2>Próximos WODs</h2>
            <div id="upcomingWODs">
                <p style="text-align: center; padding: 20px; color: #666;">Cargando...</p>
            </div>
        </div>
    `;
    
    // Cargar estadísticas del atleta
    await loadAthleteStats();
    await loadUpcomingWODs();
}

async function loadAthleteStats() {
    try {
        const token = SecureStorage.getToken();
        
        // Cargar WODs inscritos
        console.log('🔄 Iniciando carga de estadísticas...');
        const schedulesResponse = await fetch(`${API_URL}/api/wod/my-schedules`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Status de respuesta:', schedulesResponse.status);
        
        if (schedulesResponse.ok) {
            const result = await schedulesResponse.json();
            console.log('📦 Resultado completo:', result);
            
            const schedules = result.data || [];
            
            console.log('📊 Total de inscripciones activas:', schedules.length);
            
            if (schedules.length > 0) {
                console.log('📅 Primer WOD:', schedules[0]);
            }
            
            const hoy = new Date();
            const hoyStr = hoy.toISOString().split('T')[0];
            console.log('📆 Fecha de hoy:', hoyStr);
            
            // Contar WODs inscritos (hoy o futuros)
            const inscritosCount = schedules.filter(s => {
                const fechaWod = s.fecha.split('T')[0];
                const esFuturoOHoy = fechaWod >= hoyStr;
                console.log(`  → WOD "${s.titulo}" (${fechaWod}): ${esFuturoOHoy ? '✅ CUENTA' : '❌ PASADO'}`);
                return esFuturoOHoy;
            }).length;
            
            console.log('✅ Total WODs inscritos:', inscritosCount);
            
            const enrollmentsEl = document.getElementById('myEnrollments');
            if (enrollmentsEl) {
                enrollmentsEl.textContent = inscritosCount;
                console.log('✏️ Actualizado en UI:', inscritosCount);
            } else {
                console.error('❌ Elemento myEnrollments no encontrado');
            }
        } else {
            const errorText = await schedulesResponse.text();
            console.error('❌ Error al cargar schedules:', errorText);
        }
        
        // Cargar estadísticas de racha
        const rachaResponse = await fetch(`${API_URL}/api/wod/racha`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (rachaResponse.ok) {
            const rachaResult = await rachaResponse.json();
            const racha = rachaResult.data || {};
            
            console.log('🔥 Datos de racha:', racha);
            
            const rachaActualEl = document.getElementById('rachaActual');
            const rachaMaximaEl = document.getElementById('rachaMaxima');
            const totalAsistenciasEl = document.getElementById('totalAsistencias');
            
            if (rachaActualEl) rachaActualEl.textContent = racha.racha_actual || 0;
            if (rachaMaximaEl) rachaMaximaEl.textContent = racha.racha_maxima || 0;
            if (totalAsistenciasEl) totalAsistenciasEl.textContent = racha.total_asistencias || 0;
        } else {
            const errorText = await rachaResponse.text();
            console.error('❌ Error al cargar racha:', errorText);
        }
    } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
    }
}

async function loadUpcomingWODs() {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/wod/my-schedules`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            const schedules = result.data || [];
            
            const ahora = new Date();
            const upcoming = schedules.filter(s => {
                const fechaObj = new Date(s.fecha + 'T' + s.hora);
                return fechaObj >= ahora;
            }).sort((a, b) => {
                const fechaA = new Date(a.fecha + 'T' + a.hora);
                const fechaB = new Date(b.fecha + 'T' + b.hora);
                return fechaA - fechaB;
            }).slice(0, 5); // Solo los próximos 5
            
            const container = document.getElementById('upcomingWODs');
            if (!container) return;
            
            if (upcoming.length === 0) {
                container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">No tienes WODs próximos. ¡Ve al calendario para inscribirte!</p>';
                return;
            }
            
            container.innerHTML = upcoming.map(s => {
                const fecha = new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const hora = s.hora.substring(0, 5);
                
                return `
                    <div style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 4px solid #06d6a0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h3 style="margin: 0 0 5px 0; color: #2c3e50;">${s.titulo}</h3>
                                <p style="margin: 5px 0; color: #7f8c8d;"><i class="fas fa-calendar"></i> ${fecha}</p>
                                <p style="margin: 5px 0; color: #7f8c8d;"><i class="fas fa-clock"></i> ${hora} | <i class="fas fa-user"></i> ${s.entrenador_nombre || 'Sin asignar'}</p>
                            </div>
                            <span class="badge badge-success">PRÓXIMO</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error cargando próximos WODs:', error);
        const container = document.getElementById('upcomingWODs');
        if (container) {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #e63946;">Error al cargar WODs</p>';
        }
    }
}

async function loadAthleteWODs() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <h1 class="dashboard-title">
            <i class="fas fa-dumbbell"></i> Mis WODs
        </h1>
        
        <!-- Tabs -->
        <div class="tabs-container" style="margin-bottom: 20px;">
            <button class="tab-btn active" onclick="switchClassesTab('wod')">
                <i class="fas fa-calendar-day"></i> WODs Inscritos
            </button>
            <button class="tab-btn" onclick="switchClassesTab('racha')">
                <i class="fas fa-fire"></i> Racha de WODs
            </button>
        </div>

        <!-- Tab WOD Inscritos -->
        <div id="wodClassesTab" class="tab-content active">
            <div class="info-card" style="background: linear-gradient(135deg, #06d6a0 0%, #05b589 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; line-height: 1.6;">
                    <i class="fas fa-info-circle"></i> Aquí puedes ver tus inscripciones activas y cancelarlas si es necesario.
                </p>
            </div>
            <div class="table-filter">
                <input type="text" id="wodSchedulesFilter" placeholder="🔍 Buscar..." onkeyup="filterTable('wodSchedulesTableBody', 'wodSchedulesFilter')">
            </div>
            <div class="table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>WOD</th>
                            <th>Horario</th>
                            <th>Entrenador</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="wodSchedulesTableBody">
                        <tr><td colspan="6" class="loading">Cargando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tab Racha -->
        <div id="completedClassesTab" class="tab-content" style="display: none;">
            <div class="info-card" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0;"><i class="fas fa-fire"></i> Tu Racha de WODs</h3>
                <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.6;">
                    Mantén tu racha asistiendo a un WOD cada día. ¡Si faltas un día se reinicia!
                </p>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 150px; background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 36px; font-weight: bold;" id="rachaActualCard">0</div>
                        <div style="font-size: 14px; margin-top: 5px;">Días Actuales</div>
                    </div>
                    <div style="flex: 1; min-width: 150px; background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 36px; font-weight: bold;" id="rachaMaximaCard">0</div>
                        <div style="font-size: 14px; margin-top: 5px;">Récord Personal</div>
                    </div>
                    <div style="flex: 1; min-width: 150px; background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 36px; font-weight: bold;" id="asistenciasMesCard">0</div>
                        <div style="font-size: 14px; margin-top: 5px;">Este Mes</div>
                    </div>
                </div>
            </div>
            <h3 style="margin: 20px 0 15px 0;">📊 Historial de Asistencias</h3>
            <div class="table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>WOD</th>
                            <th>Tipo</th>
                            <th>Horario</th>
                            <th>Entrenador</th>
                        </tr>
                    </thead>
                    <tbody id="completedSchedulesTableBody">
                        <tr><td colspan="5" class="loading">Cargando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await loadMyWODSchedules();
}

// Función para cambiar entre tabs
window.switchClassesTab = async function(tab) {
    // Toggle tabs
    const wodTab = document.getElementById('wodClassesTab');
    const completedTab = document.getElementById('completedClassesTab');
    const buttons = document.querySelectorAll('.tab-btn');

    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'wod') {
        wodTab.style.display = 'block';
        completedTab.style.display = 'none';
        buttons[0].classList.add('active');
    } else if (tab === 'racha') {
        wodTab.style.display = 'none';
        completedTab.style.display = 'block';
        buttons[1].classList.add('active');
        // Cargar datos de racha
        await loadRachaData();
    }
};

// Cargar horarios WOD inscritos
async function loadMyWODSchedules() {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/wod/my-schedules`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const data = result.data || [];
        
        const tbody = document.getElementById('wodSchedulesTableBody');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No tienes horarios WOD inscritos</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(schedule => {
            const fecha = new Date(schedule.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const hora = schedule.hora.substring(0, 5);
            const fechaObj = new Date(schedule.fecha + 'T' + schedule.hora);
            const ahora = new Date();
            const isPast = fechaObj < ahora;
            const isToday = fechaObj.toDateString() === ahora.toDateString();
            
            // Solo mostrar futuros en esta tabla
            if (isPast && !isToday) return '';
            
            let actionButton = '';
            
            // Si ya asistió, mostrar badge
            if (schedule.asistio) {
                actionButton = '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Asistido</span>';
            }
            // Si es hoy y aún no ha asistido, mostrar botón de marcar asistencia
            else if (isToday) {
                actionButton = `
                    <button class="btn-icon" style="background: #06d6a0;" onclick="marcarAsistencia(${schedule.id_inscripcion}, '${schedule.titulo}')" title="Marcar asistencia">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="unenrollWODSchedule(${schedule.id_horario}, '${schedule.titulo}', '${hora}')" title="Cancelar inscripción">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
            // Si es futuro, solo mostrar botón de cancelar
            else {
                actionButton = `
                    <button class="btn-icon btn-delete" onclick="unenrollWODSchedule(${schedule.id_horario}, '${schedule.titulo}', '${hora}')" title="Cancelar inscripción">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
            
            let statusBadge = schedule.asistio 
                ? '<span class="badge badge-success">COMPLETADO</span>'
                : '<span class="badge badge-info">INSCRITO</span>';
            
            return `
                <tr>
                    <td><strong>${fecha}</strong></td>
                    <td>
                        <strong>${schedule.titulo}</strong>
                        <br><small style="color: #666;">${schedule.tipo || 'CrossFit'}</small>
                    </td>
                    <td><strong>${hora}</strong></td>
                    <td>${schedule.entrenador_nombre || '-'}</td>
                    <td>${statusBadge}</td>
                    <td class="actions">
                        ${actionButton}
                    </td>
                </tr>
            `;
        }).filter(row => row !== '').join('');

        if (!tbody.innerHTML || tbody.innerHTML.trim() === '') {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No tienes horarios WOD inscritos próximos</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando horarios WOD:', error);
        const tbody = document.getElementById('wodSchedulesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="error">Error al cargar datos: ' + error.message + '</td></tr>';
        }
    }
}

// Función para marcar asistencia a un WOD
window.marcarAsistencia = async function(idInscripcion, wodTitulo) {
    const result = await Swal.fire({
        title: '¿Marcar asistencia?',
        html: `
            <p>¿Completaste este WOD?</p>
            <p><strong>${wodTitulo}</strong></p>
            <p style="color: #ff6b6b; font-size: 14px;"><i class="fas fa-fire"></i> ¡Sumará a tu racha!</p>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#06d6a0',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, marcar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/wod/asistencia/${idInscripcion}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const racha = data.racha || {};
            await Swal.fire({
                title: '¡Asistencia registrada! 🔥',
                html: `
                    <p style="font-size: 18px; margin: 10px 0;">
                        <strong>Racha actual: ${racha.racha_actual || 0} días</strong>
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        Récord personal: ${racha.racha_maxima || 0} días
                    </p>
                    ${racha.racha_actual >= racha.racha_maxima && racha.racha_actual > 1 
                        ? '<p style="color: #06d6a0; font-weight: bold;">🏆 ¡Nuevo récord personal!</p>' 
                        : ''}
                `,
                icon: 'success',
                confirmButtonColor: '#06d6a0'
            });
            await loadMyWODSchedules();
            await loadAthleteStats();
        } else {
            await Swal.fire({
                title: 'Error',
                text: data.message || 'No se pudo registrar la asistencia',
                icon: 'error',
                confirmButtonColor: '#e63946'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire({
            title: 'Error',
            text: 'Hubo un problema al registrar tu asistencia',
            icon: 'error',
            confirmButtonColor: '#e63946'
        });
    }
};

// Función para cancelar inscripción a horario WOD
window.unenrollWODSchedule = async function(horarioId, wodTitulo, hora) {
    const result = await Swal.fire({
        title: '¿Cancelar inscripción?',
        html: `
            <p>¿Estás seguro de que deseas cancelar tu inscripción?</p>
            <p><strong>WOD:</strong> ${wodTitulo}</p>
            <p><strong>Horario:</strong> ${hora}</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e63946',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No'
    });

    if (!result.isConfirmed) return;

    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/wod/schedule/${horarioId}/unenroll`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            await Swal.fire({
                title: '¡Cancelada!',
                text: 'Tu inscripción ha sido cancelada exitosamente',
                icon: 'success',
                confirmButtonColor: '#06d6a0'
            });
            await loadMyWODSchedules();
            await loadAthleteStats();
        } else {
            await Swal.fire({
                title: 'Error',
                text: data.message,
                icon: 'error',
                confirmButtonColor: '#e63946'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        await Swal.fire({
            title: 'Error',
            text: 'No se pudo cancelar la inscripción',
            icon: 'error',
            confirmButtonColor: '#e63946'
        });
    }
};

// Cargar WODs completados
async function loadMyCompletedWODs() {
    // Esta función ya no es necesaria, usar loadRachaData
}

// Función para cargar datos de racha y historial de asistencias
async function loadRachaData() {
    try {
        const token = SecureStorage.getToken();
        
        // Cargar estadísticas de racha
        const rachaResponse = await fetch(`${API_URL}/api/wod/racha`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (rachaResponse.ok) {
            const rachaResult = await rachaResponse.json();
            const racha = rachaResult.data || {};
            
            // Actualizar cards de racha
            document.getElementById('rachaActualCard').textContent = racha.racha_actual || 0;
            document.getElementById('rachaMaximaCard').textContent = racha.racha_maxima || 0;
            document.getElementById('asistenciasMesCard').textContent = racha.asistencias_mes || 0;
        }
        
        // Cargar historial de asistencias
        const historialResponse = await fetch(`${API_URL}/api/wod/historial-asistencias?limit=20`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (historialResponse.ok) {
            const historialResult = await historialResponse.json();
            const historial = historialResult.data || [];
            
            const tbody = document.getElementById('completedSchedulesTableBody');
            if (!tbody) return;
            
            if (historial.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="no-data">No tienes asistencias registradas aún</td></tr>';
                return;
            }
            
            tbody.innerHTML = historial.map(item => {
                const fecha = new Date(item.fecha_asistencia).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                const hora = item.hora ? item.hora.substring(0, 5) : '--';
                
                return `
                    <tr>
                        <td>${fecha}</td>
                        <td>${item.wod_titulo || 'N/A'}</td>
                        <td>${item.tipo_wod || '--'}</td>
                        <td>${hora}</td>
                        <td>${item.entrenador_nombre || 'N/A'}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error cargando datos de racha:', error);
        const tbody = document.getElementById('completedSchedulesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="error">Error al cargar historial</td></tr>';
        }
    }
}

async function loadSearchClasses() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <h1 class="dashboard-title">
            <i class="fas fa-calendar-alt"></i> Calendario de Clases - WOD del Día
        </h1>
        <div class="info-card" style="background: linear-gradient(135deg, #e63946 0%, #d62828 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;"><i class="fas fa-info-circle"></i> ¿Cómo funciona?</h3>
            <p style="margin: 0; line-height: 1.6;">
                Selecciona un día del calendario para ver el <strong>WOD (Workout of the Day)</strong> y los horarios disponibles. 
                Puedes inscribirte a <strong>un solo horario por día</strong>. Los días con WOD están marcados en rojo.
            </p>
        </div>
        <div id="wodCalendarContainer"></div>
    `;

    // Inicializar calendario WOD
    wodCalendar = new WODCalendar('wodCalendarContainer');
}

async function loadAthleteProgress() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <h1 class="dashboard-title">Mi Progreso</h1>
        <div class="progress-container">
            <div class="progress-stats" id="progressStats">
                <div class="stat-card">
                    <i class="fas fa-dumbbell"></i>
                    <div class="stat-info">
                        <span class="stat-label">Ejercicios Registrados</span>
                        <span class="stat-value" id="totalEjercicios">-</span>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-chart-line"></i>
                    <div class="stat-info">
                        <span class="stat-label">Promedio de Marcas</span>
                        <span class="stat-value" id="promedioMarcas">-</span>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-trophy"></i>
                    <div class="stat-info">
                        <span class="stat-label">Marca Más Alta</span>
                        <span class="stat-value" id="marcaMasAlta">-</span>
                    </div>
                </div>
            </div>

            <div class="progress-search">
                <input type="text" id="progresoFilter" placeholder="🔍 Buscar ejercicio..." onkeyup="filterProgressCards()">
            </div>

            <div class="progress-exercises" id="progressExercises">
                <div class="loading">Cargando ejercicios...</div>
            </div>
        </div>

        <!-- Modal para registrar marca -->
        <div id="marcaModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeMarcaModal()">&times;</span>
                <h2 id="marcaModalTitle">Registrar Marca</h2>
                <div class="modal-body">
                    <div class="exercise-info" id="exerciseInfo"></div>
                    <form id="marcaForm">
                        <input type="hidden" id="ejercicioId" name="ejercicioId">
                        <div class="form-group">
                            <label for="marcaMaxima">Marca Máxima (lb)</label>
                            <input type="number" id="marcaMaxima" name="marcaMaxima" 
                                   step="0.5" min="0" required 
                                   placeholder="Ej: 135.5">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save"></i> Guardar Marca
                            </button>
                            <button type="button" class="btn-secondary" onclick="closeMarcaModal()">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    await loadProgressData();
    setupMarcaFormHandler();
}

async function loadProgressData() {
    try {
        const token = SecureStorage.getToken();

        // Obtener estadísticas
        const statsResponse = await fetch(`${API_URL}/api/progreso/estadisticas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsResult = await statsResponse.json();

        if (statsResult.success && statsResult.data) {
            const stats = statsResult.data;
            document.getElementById('totalEjercicios').textContent = stats.total_ejercicios || 0;
            document.getElementById('promedioMarcas').textContent = 
                stats.promedio_marcas ? `${parseFloat(stats.promedio_marcas).toFixed(1)} lb` : '0 lb';
            document.getElementById('marcaMasAlta').textContent = 
                stats.marca_mas_alta ? `${parseFloat(stats.marca_mas_alta).toFixed(1)} lb` : '0 lb';
        }

        // Obtener ejercicios con progreso
        const ejerciciosResponse = await fetch(`${API_URL}/api/progreso/ejercicios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const ejerciciosResult = await ejerciciosResponse.json();

        if (ejerciciosResult.success) {
            displayProgressExercises(ejerciciosResult.data || []);
        } else {
            throw new Error(ejerciciosResult.message || 'Error al cargar ejercicios');
        }

    } catch (error) {
        console.error('Error cargando progreso:', error);
        document.getElementById('progressExercises').innerHTML = `
            <div class="error">Error al cargar los ejercicios: ${error.message}</div>
        `;
    }
}

function displayProgressExercises(ejercicios) {
    const container = document.getElementById('progressExercises');

    if (ejercicios.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-info-circle"></i>
                <p>No hay ejercicios disponibles. Contacta al administrador.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = ejercicios.map(ejercicio => {
        const tieneMarca = ejercicio.marca_maxima !== null;
        const marca = tieneMarca ? parseFloat(ejercicio.marca_maxima).toFixed(1) : '-';
        const fecha = ejercicio.fecha_actualizacion ? 
            new Date(ejercicio.fecha_actualizacion).toLocaleDateString('es-ES') : '-';

        return `
            <div class="progress-card" data-nombre="${ejercicio.nombre.toLowerCase()}">
                <div class="progress-card-header">
                    ${ejercicio.imagen_url ? 
                        `<img src="${ejercicio.imagen_url}" alt="${ejercicio.nombre}" class="progress-card-img">` :
                        '<div class="progress-card-img-placeholder"><i class="fas fa-dumbbell"></i></div>'
                    }
                    <div class="progress-card-info">
                        <h3>${ejercicio.nombre}</h3>
                        <p>${ejercicio.descripcion || 'Sin descripción'}</p>
                    </div>
                </div>
                <div class="progress-card-body">
                    <div class="marca-display">
                        <span class="marca-label">Marca Personal</span>
                        <span class="marca-value ${tieneMarca ? 'has-marca' : 'no-marca'}">
                            ${tieneMarca ? `${marca} lb` : 'Sin registrar'}
                        </span>
                        ${tieneMarca ? `<span class="marca-fecha">Actualizado: ${fecha}</span>` : ''}
                    </div>
                    <button class="btn-register-marca" onclick="openMarcaModal(${ejercicio.id_ejercicio}, '${ejercicio.nombre}', ${ejercicio.marca_maxima || 0})">
                        <i class="fas fa-edit"></i> ${tieneMarca ? 'Actualizar Marca' : 'Registrar Marca'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openMarcaModal(idEjercicio, nombreEjercicio, marcaActual) {
    const modal = document.getElementById('marcaModal');
    const form = document.getElementById('marcaForm');
    
    document.getElementById('marcaModalTitle').textContent = 
        marcaActual > 0 ? 'Actualizar Marca' : 'Registrar Primera Marca';
    
    document.getElementById('exerciseInfo').innerHTML = `
        <div class="exercise-modal-info">
            <i class="fas fa-dumbbell"></i>
            <h3>${nombreEjercicio}</h3>
            ${marcaActual > 0 ? `<p class="marca-anterior">Marca actual: <strong>${marcaActual} lb</strong></p>` : ''}
        </div>
    `;
    
    document.getElementById('ejercicioId').value = idEjercicio;
    document.getElementById('marcaMaxima').value = marcaActual > 0 ? marcaActual : '';
    document.getElementById('marcaMaxima').focus();
    
    modal.style.display = 'block';
}

function closeMarcaModal() {
    const modal = document.getElementById('marcaModal');
    const form = document.getElementById('marcaForm');
    form.reset();
    modal.style.display = 'none';
}

function setupMarcaFormHandler() {
    const form = document.getElementById('marcaForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const idEjercicio = document.getElementById('ejercicioId').value;
        const marcaMaxima = document.getElementById('marcaMaxima').value;
        
        if (!marcaMaxima || parseFloat(marcaMaxima) <= 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Marca inválida',
                text: 'Por favor ingresa una marca válida mayor a 0'
            });
            return;
        }
        
        try {
            const token = SecureStorage.getToken();
            const response = await fetch(`${API_URL}/api/progreso/marca`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_ejercicio: parseInt(idEjercicio),
                    marca_maxima: parseFloat(marcaMaxima)
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Mostrar mensaje motivacional con SweetAlert2
                Swal.fire({
                    icon: result.progreso.tipo === 'mejora' ? 'success' : 
                          result.progreso.tipo === 'descenso' ? 'info' : 'success',
                    title: result.message,
                    text: result.motivacion,
                    confirmButtonText: '¡Entendido!',
                    timer: 5000
                });
                
                closeMarcaModal();
                await loadProgressData(); // Recargar datos
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message
                });
            }
        } catch (error) {
            console.error('Error al guardar marca:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar la marca. Por favor intenta de nuevo.'
            });
        }
    });
}

function filterProgressCards() {
    const filterValue = document.getElementById('progresoFilter').value.toLowerCase();
    const cards = document.querySelectorAll('.progress-card');
    
    cards.forEach(card => {
        const nombre = card.getAttribute('data-nombre');
        if (nombre.includes(filterValue)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Cerrar modal al hacer clic fuera de él
window.addEventListener('click', (event) => {
    const modal = document.getElementById('marcaModal');
    if (event.target === modal) {
        closeMarcaModal();
    }
});


function setupChangePasswordHandler() {
    const form = document.getElementById('changePasswordForm');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        const errors = [];

        if (!currentPassword || currentPassword.trim() === '') {
            errors.push('La contraseña actual es requerida');
        }
        if (newPassword.length < 6) {
            errors.push('La nueva contraseña debe tener al menos 6 caracteres');
        }
        if (!/[A-Z]/.test(newPassword)) {
            errors.push('La nueva contraseña debe contener al menos una mayúscula');
        }
        if (!/[0-9]/.test(newPassword)) {
            errors.push('La nueva contraseña debe contener al menos un número');
        }
        if (newPassword !== confirmNewPassword) {
            errors.push('Las contraseñas no coinciden');
        }

        if (errors.length > 0) {
            await Swal.fire({ icon: 'warning', title: 'Validación', html: errors.join('<br>') });
            return;
        }

        try {
            const token = SecureStorage.getToken();
            const response = await fetch(`${API_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const result = await response.json();
            if (result.success) {
                await Swal.fire({ icon: 'success', title: '¡Éxito!', text: result.message, timer: 2000, showConfirmButton: false });
                form.reset();
            } else {
                await Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'Error al cambiar contraseña' });
            }
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Error de conexión' });
        }
    };
}

async function loadAthleteProfile() { await loadProfilePage(); }
async function loadTrainerProfile() { await loadProfilePage(); }
async function loadAdminProfile() { await loadProfilePage(); }

async function loadProfilePage() {
    const contentArea = document.getElementById('contentArea');
    let nombre = currentUser.nombre || '';
    let apellido = currentUser.apellido || '';
    let email = currentUser.email || '';
    let rol = currentUser.rol || '';
    let telefono = '';
    let direccion = '';
    let peso = '';
    let altura = '';
    let foto = currentUser.foto_perfil || '/img/default-avatar.png';

    try {
        const token = SecureStorage.getToken();
        const resp = await fetch(`${API_URL}/api/auth/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await resp.json();
        if (data.success && data.data) {
            const p = data.data;
            nombre = p.nombre || nombre;
            apellido = p.apellido || apellido;
            email = p.email || email;
            rol = p.rol_nombre || p.rol || rol;
            telefono = p.telefono || '';
            direccion = p.direccion || '';
            peso = p.peso || '';
            altura = p.altura || '';
            foto = p.foto_perfil || foto;
            currentUser.rol = rol;
            currentUser.foto_perfil = foto;
        }
    } catch(e) {}

    contentArea.innerHTML = `
        <h1 class="dashboard-title">Mi Perfil</h1>
        <div class="dashboard-form" style="text-align:center;">
            <div style="position:relative;display:inline-block;cursor:pointer;">
                <img src="${foto}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--primary-color);" id="profilePhotoImg" onerror="this.src='/img/default-avatar.png'">
                <div style="position:absolute;bottom:0;right:0;background:var(--primary-color);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="document.getElementById('profileUploadInput').click()"><i class="fas fa-camera"></i></div>
            </div>
            <input type="file" id="profileUploadInput" accept="image/*" style="display:none" onchange="uploadProfilePhoto(event)">
            <p style="margin-top:10px;"><strong>${nombre} ${apellido}</strong></p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Rol:</strong> ${rol}</p>
            ${telefono ? `<p><strong>Telefono:</strong> ${telefono}</p>` : ''}
            ${direccion ? `<p><strong>Direccion:</strong> ${direccion}</p>` : ''}
            ${peso ? `<p><strong>Peso:</strong> ${peso} kg</p>` : ''}
            ${altura ? `<p><strong>Altura:</strong> ${altura} m</p>` : ''}
            ${peso && altura && parseFloat(altura) > 0 ? (() => { const imc = parseFloat(peso) / (parseFloat(altura) * parseFloat(altura)); const cat = imc < 18.5 ? 'Bajo' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobrepeso' : 'Obeso'; return `<p><strong>IMC:</strong> ${imc.toFixed(1)} (${cat})</p>`; })() : ''}
        </div>
        <div class="dashboard-form" style="margin-top: 1.5rem;">
            <h2 class="dashboard-title" style="font-size: 2rem; margin-bottom: 1rem;">Cambiar Contrasena</h2>
            <form id="changePasswordForm">
                <div class="form-group"><label>Contrasena Actual</label><input type="password" id="currentPassword" required></div>
                <div class="form-group"><label>Nueva Contrasena</label><input type="password" id="newPassword" minlength="6" required></div>
                <div class="form-group"><label>Confirmar Nueva Contrasena</label><input type="password" id="confirmNewPassword" minlength="6" required></div>
                <button type="submit" class="btn btn-primary">Actualizar Contrasena</button>
            </form>
        </div>
    `;
    setupChangePasswordHandler();
}

async function uploadProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { Swal.fire({ icon:'error', title:'Error', text:'Solo imagenes permitidas' }); return; }
    if (file.size > 5*1024*1024) { Swal.fire({ icon:'error', title:'Error', text:'Maximo 5MB' }); return; }
    const reader = new FileReader();
    reader.onload = (e) => { const img = document.getElementById('profilePhotoImg'); if (img) img.src = e.target.result; };
    reader.readAsDataURL(file);
    const formData = new FormData();
    formData.append('profileImage', file);
    try {
        const token = SecureStorage.getToken();
        const resp = await fetch(`${API_URL}/api/auth/upload-profile-image`, { method:'POST', headers:{ 'Authorization':`Bearer ${token}` }, body: formData });
        const data = await resp.json();
        if (data.success) { currentUser.foto_perfil = data.data.foto_perfil; Swal.fire({ icon:'success', title:'Foto actualizada', timer:1500, showConfirmButton:false }); }
        else Swal.fire({ icon:'error', title:'Error', text: data.message || 'No se pudo subir' });
    } catch(e) { Swal.fire({ icon:'error', title:'Error', text:'Error de conexion' }); }
}

async function loadAthleteMembership() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <h1 class="dashboard-title">Mi Membresía</h1>
        <div id="athleteProfileContainer" class="dashboard-form">
            <p>Cargando información de membresía...</p>
        </div>
    `;

    try {
        const [membershipResponse, membershipsResponse] = await Promise.all([
            authenticatedFetch(`${API_URL}/api/members/my-membership`),
            fetch(`${API_URL}/api/auth/memberships`)
        ]);

        const membershipResult = await membershipResponse.json();
        const membershipsResult = await membershipsResponse.json();
        const membership = membershipResult.success ? membershipResult.data : null;
        const memberships = membershipsResult.success ? membershipsResult.data.filter(m => m.estado) : [];
        const currentMembershipId = membership?.id_membresia || '';
        const membershipStatus = membership?.estado_membresia || membership?.status || 'sin_membresia';
        const currentMembershipName = membership?.membresia_nombre || 'Sin membresía';
        const fechaInicio = membership?.fecha_inicio_membresia ? formatDateWithoutTimezone(String(membership.fecha_inicio_membresia)) : '-';
        const fechaFin = membership?.fecha_fin_membresia ? formatDateWithoutTimezone(String(membership.fecha_fin_membresia)) : '-';

        const membershipOptions = memberships
            .map(membershipItem => `<option value="${membershipItem.id_membresia}" ${String(membershipItem.id_membresia) === String(currentMembershipId) ? 'selected' : ''}>${membershipItem.nombre} - $${Number(membershipItem.precio).toFixed(2)}</option>`)
            .join('');

        const membershipStatusText = {
            activa: 'Activa',
            por_vencer: 'Por vencer',
            vencida: 'Vencida',
            sin_membresia: 'Sin membresía',
            membresia_inactiva: 'Membresía inactiva',
            asignada_sin_vigencia: 'Asignada sin vigencia',
            no_atleta: 'No disponible'
        }[membershipStatus] || membershipStatus;

        const membershipStatusClass = membershipStatus === 'activa' ? 'success' : membershipStatus === 'por_vencer' ? 'warning' : 'danger';

        contentArea.innerHTML = `
            <div class="dashboard-form" style="margin-top: 1.5rem;">
                <h2 class="dashboard-title" style="font-size: 2rem; margin-bottom: 1rem;">Membresía actual</h2>
                <p><strong>Estado:</strong> <span class="status-badge ${membershipStatusClass}">${membershipStatusText}</span></p>
                <p><strong>Membresía:</strong> ${currentMembershipName}</p>
                <p><strong>Inicio:</strong> ${fechaInicio}</p>
                <p><strong>Fin:</strong> ${fechaFin}</p>
            </div>
            <div class="dashboard-form" style="margin-top: 1.5rem;">
                <h2 class="dashboard-title" style="font-size: 2rem; margin-bottom: 1rem;">Cambiar o cancelar membresía</h2>
                <form id="membershipForm">
                    <div class="form-group">
                        <label for="membershipSelect">Selecciona una nueva membresía</label>
                        <select id="membershipSelect" class="form-control" ${memberships.length === 0 ? 'disabled' : ''}>
                            ${memberships.length > 0 ? `<option value="">Selecciona una opción</option>${membershipOptions}` : '<option value="">No hay membresías disponibles</option>'}
                        </select>
                    </div>
                    <div class="form-actions" style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button type="submit" class="btn btn-primary" ${memberships.length === 0 ? 'disabled' : ''}>Cambiar membresía</button>
                        <button type="button" class="btn btn-secondary" id="cancelMembershipBtn" ${currentMembershipId ? '' : 'disabled'}>Cancelar membresía</button>
                    </div>
                </form>
                <p style="margin-top: 1rem; opacity: 0.85;">
                    Si cancelas tu membresía, no podrás iniciar sesión hasta que tengas una nueva membresía activa.
                </p>
            </div>
        `;

        const membershipForm = document.getElementById('membershipForm');
        const membershipSelect = document.getElementById('membershipSelect');
        const cancelMembershipBtn = document.getElementById('cancelMembershipBtn');

        membershipForm?.addEventListener('submit', async (event) => {
            event.preventDefault();

            const selectedMembershipId = membershipSelect.value;
            if (!selectedMembershipId) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Selecciona una membresía',
                    text: 'Debes elegir una membresía antes de actualizarla.'
                });
                return;
            }

            const result = await Swal.fire({
                icon: 'question',
                title: '¿Cambiar membresía?',
                text: 'Se actualizará tu membresía actual por la seleccionada.',
                showCancelButton: true,
                confirmButtonText: 'Sí, cambiar',
                cancelButtonText: 'Cancelar'
            });

            if (!result.isConfirmed) {
                return;
            }

            try {
                const response = await authenticatedFetch(`${API_URL}/api/members/my-membership`, {
                    method: 'PUT',
                    body: JSON.stringify({ id_membresia: selectedMembershipId })
                });

                const updateResult = await response.json();

                if (updateResult.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Membresía actualizada',
                        text: 'Tu membresía fue cambiada correctamente.'
                    });
                    await loadAthleteMembership();
                    if (currentUser.rol === 'ATLETA') {
                        await checkMembershipStatus();
                    }
                } else {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: updateResult.message || 'No se pudo actualizar la membresía'
                    });
                }
            } catch (error) {
                console.error('Error al actualizar membresía:', error);
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Ocurrió un error de red al intentar actualizar la membresía.'
                });
            }
        });

        cancelMembershipBtn?.addEventListener('click', async () => {
            const result = await Swal.fire({
                icon: 'warning',
                title: '¿Cancelar membresía?',
                text: 'Perderás el acceso a la plataforma al cerrar sesión. ¿Estás seguro?',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, cancelar membresía',
                cancelButtonText: 'Volver'
            });

            if (!result.isConfirmed) {
                return;
            }

            try {
                const response = await authenticatedFetch(`${API_URL}/api/members/my-membership`, {
                    method: 'DELETE'
                });

                const deleteResult = await response.json();

                if (deleteResult.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Membresía cancelada',
                        text: 'Tu membresía ha sido cancelada correctamente.'
                    });
                    await loadAthleteMembership();
                } else {
                    await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: deleteResult.message || 'No se pudo cancelar la membresía'
                    });
                }
            } catch (error) {
                console.error('Error al cancelar membresía:', error);
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Ocurrió un error de red al intentar cancelar la membresía.'
                });
            }
        });

    } catch (error) {
        console.error('Error loading membership:', error);
        contentArea.innerHTML = `
            <div class="dashboard-form error">
                <p>Error al cargar la información de la membresía. Por favor, intente nuevamente.</p>
            </div>
        `;
    }
}

async function loadTrainerAthletes() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <h1 class="dashboard-title">Mis Atletas</h1>
        <div class="table-filter">
            <input type="text" id="trainerAthletesFilter" placeholder="🔍 Buscar por nombre o email..." onkeyup="filterTable('trainerAthletesTableBody', 'trainerAthletesFilter')">
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Total Inscripciones</th>
                        <th>Último WOD</th>
                    </tr>
                </thead>
                <tbody id="trainerAthletesTableBody">
                    <tr><td colspan="4" class="loading">Cargando...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    
    await loadTrainerAthletesData();
}

async function loadTrainerAthletesData() {
    try {
        const token = SecureStorage.getToken();
        
        // Obtener atletas del entrenador
        const athletesResponse = await fetch(`${API_URL}/api/trainers/my-athletes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const athletesResult = await athletesResponse.json();
        
        const tbody = document.getElementById('trainerAthletesTableBody');
        
        if (!athletesResult.success || athletesResult.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="no-data">No tienes atletas inscritos en tus WODs</td></tr>';
            return;
        }
        
        const athletes = athletesResult.data;
        
        tbody.innerHTML = athletes.map(athlete => {
            const ultimaClase = athlete.ultima_clase ? 
                new Date(athlete.ultima_clase).toLocaleDateString('es-ES') : 
                'N/A';
            const nombreCompleto = `${athlete.nombre} ${athlete.apellido}`;
            
            return `
                <tr>
                    <td><strong>${nombreCompleto}</strong></td>
                    <td>${athlete.email || 'N/A'}</td>
                    <td>${athlete.total_inscripciones || 0}</td>
                    <td>${ultimaClase}</td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando atletas del entrenador:', error);
        const tbody = document.getElementById('trainerAthletesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="error">Error al cargar datos</td></tr>';
        }
    }
}

// ===============================================
// HELPERS - CARGAR DATOS
// ===============================================
async function loadAllClasses() {
    try {
        const response = await authenticatedFetch(`${API_URL}/api/classes`);
        const data = await response.json();

        const classesList = document.getElementById('classesList');
        if (data.success && data.data.length > 0) {
            classesList.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Clase</th>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Entrenador</th>
                            <th>Inscritos</th>
                            <th>Cupo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(clase => `
                            <tr>
                                <td><strong>${clase.nombre}</strong></td>
                                <td>${new Date(clase.fecha).toLocaleDateString()}</td>
                                <td>${clase.hora}</td>
                                <td>${clase.entrenador_nombre || 'N/A'}</td>
                                <td>${clase.inscritos || 0}</td>
                                <td>${clase.cupo_maximo}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            classesList.innerHTML = '<p>No hay clases disponibles.</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('classesList').innerHTML = '<p>Error al cargar clases.</p>';
    }
}

// ===============================================
// UTILIDADES
// ===============================================
function filterTable(tableBodyId, inputId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toLowerCase();
    const tbody = document.getElementById(tableBodyId);
    const rows = tbody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        let found = false;

        for (let j = 0; j < cells.length; j++) {
            const cell = cells[j];
            if (cell) {
                const textValue = cell.textContent || cell.innerText;
                if (textValue.toLowerCase().indexOf(filter) > -1) {
                    found = true;
                    break;
                }
            }
        }

        if (found) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function logout() {
    SocketManager.disconnect();
    SecureStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

async function authenticatedFetch(url, options = {}) {
    const token = getStoredToken();

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    // Verificar si la respuesta indica sesión expirada o membresía vencida
    if (!response.ok) {
        try {
            const data = await response.json();
            
            // Si la membresía está vencida o la sesión expiró
            if (data.sessionExpired || data.membershipExpired) {
                if (typeof Swal !== 'undefined') {
                    await Swal.fire({
                        icon: 'error',
                        title: data.membershipExpired ? '¡Membresía Vencida!' : 'Sesión Expirada',
                        text: data.message || 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#FF3B30',
                        allowOutsideClick: false
                    });
                }
                logout();
                throw new Error(data.message);
            }
            
            // Si el usuario está inactivo
            if (response.status === 401 && data.message?.includes('inactivo')) {
                if (typeof Swal !== 'undefined') {
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Cuenta Desactivada',
                        text: data.message,
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#FF3B30',
                        allowOutsideClick: false
                    });
                }
                logout();
                throw new Error(data.message);
            }
        } catch (jsonError) {
            // Si no se puede parsear como JSON, continuar con la respuesta original
            if (jsonError instanceof SyntaxError) {
                return response;
            }
            throw jsonError;
        }
    }

    return response;
}

// ===============================================
// VERIFICAR ESTADO DE MEMBRESÍA
// ===============================================
async function checkMembershipStatus() {
    try {
        console.log('🔍 Verificando estado de membresía...');
        
        // Verificar si Swal está disponible
        if (typeof Swal === 'undefined') {
            console.error('❌ SweetAlert2 no está cargado');
            return;
        }

        // Verificar si el usuario pidió no mostrar notificaciones por 24 horas (por usuario específico)
        const hideKey = `hideMembresiaNoti_${currentUser.id_usuario}`;
        const hideUntil = localStorage.getItem(hideKey);
        if (hideUntil && Date.now() < parseInt(hideUntil)) {
            console.log('⏸️ Notificación oculta por preferencia del usuario');
            return;
        }

        const response = await authenticatedFetch(`${API_URL}/api/members/check-membership`);
        const data = await response.json();

        console.log('📊 Estado de membresía:', data);

        if (data.success && data.data) {
            const { estado_membresia, dias_restantes, fecha_fin_membresia, membresia_nombre } = data.data;

            console.log(`Estado: ${estado_membresia}, Días restantes: ${dias_restantes}`);

            // Mostrar notificación según el estado
            if (estado_membresia === 'vencida') {
                console.log('🔴 Mostrando notificación de membresía vencida');
                Swal.fire({
                    icon: 'error',
                    title: '¡Membresía Vencida!',
                    html: `
                        <p>Tu membresía <strong>${membresia_nombre || 'actual'}</strong> ha vencido.</p>
                        <p>Por favor, renueva tu membresía para continuar disfrutando de nuestros servicios.</p>
                    `,
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#FF3B30',
                    allowOutsideClick: false
                });
            } else if (estado_membresia === 'por_vencer') {
                console.log('⚠️ Mostrando notificación de membresía por vencer');
                const fechaVencimiento = new Date(fecha_fin_membresia).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });

                Swal.fire({
                    icon: 'warning',
                    title: '¡Membresía por Vencer!',
                    html: `
                        <p>Tu membresía <strong>${membresia_nombre || 'actual'}</strong> vence en <strong>${dias_restantes} día${dias_restantes > 1 ? 's' : ''}</strong>.</p>
                        <p>Fecha de vencimiento: <strong>${fechaVencimiento}</strong></p>
                        <p>Te recomendamos renovarla pronto para evitar interrupciones.</p>
                    `,
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#FF9500',
                    showCancelButton: true,
                    cancelButtonText: 'No mostrar hoy',
                    cancelButtonColor: '#666'
                }).then((result) => {
                    if (result.dismiss === Swal.DismissReason.cancel) {
                        // Guardar preferencia específica para este usuario por 24 horas
                        localStorage.setItem(hideKey, Date.now() + (24 * 60 * 60 * 1000));
                    }
                });
            } else if (estado_membresia === 'sin_membresia' || estado_membresia === 'membresia_inactiva' || estado_membresia === 'asignada_sin_vigencia') {
                console.log('ℹ️ Mostrando notificación sin membresía activa');
                Swal.fire({
                    icon: 'error',
                    title: 'Sin Membresía Activa',
                    html: `
                        <p>Actualmente no tienes una membresía activa.</p>
                        <p>Contacta con el administrador o cambia tu membresía desde el perfil si todavía tienes acceso.</p>
                    `,
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#FF3B30',
                    allowOutsideClick: false
                });
            } else {
                console.log('✅ Membresía activa, no se requiere notificación');
            }
        }
    } catch (error) {
        console.error('❌ Error al verificar membresía:', error);
    }
}
// ===============================================
// CALENDARIO WOD
// ===============================================

class WODCalendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.selectedDate = null;
        this.wods = [];
        // Definir permisos basados en el rol del usuario
        this.isAdmin = currentUser && currentUser.rol === 'ADMINISTRADOR';
        this.isTrainer = currentUser && currentUser.rol === 'ENTRENADOR';
        this.init();
    }

    init() {
        this.render();
        this.loadWODs();
    }

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        this.container.innerHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <h2>${this.getMonthName(month)} ${year}</h2>
                    <div class="calendar-navigation">
                        <button id="prevMonth">
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <button id="todayBtn">Hoy</button>
                        <button id="nextMonth">
                            Siguiente <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                <div class="calendar-loading">
                    <div class="calendar-loading-spinner"></div>
                    <p>Cargando calendario...</p>
                </div>
            </div>

            <!-- Modal WOD -->
            <div class="wod-modal" id="wodModal">
                <div class="wod-modal-content">
                    <div class="wod-modal-header">
                        <button class="wod-modal-close" id="closeWodModal">&times;</button>
                        <div class="wod-date-title" id="wodDateTitle"></div>
                        <h2 class="wod-title" id="wodTitle"></h2>
                        <span class="wod-type-badge" id="wodTypeBadge"></span>
                    </div>
                    <div class="wod-modal-body" id="wodModalBody">
                        <!-- Se llenará dinámicamente -->
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    attachEventListeners() {
        document.getElementById('prevMonth')?.addEventListener('click', () => this.previousMonth());
        document.getElementById('nextMonth')?.addEventListener('click', () => this.nextMonth());
        document.getElementById('todayBtn')?.addEventListener('click', () => this.goToToday());
        document.getElementById('closeWodModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('wodModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'wodModal') this.closeModal();
        });
    }

    async loadWODs() {
        try {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth() + 1;
            const token = SecureStorage.getToken();

            const response = await fetch(`${API_URL}/api/wod/calendar/${year}/${month}`);
            const data = await response.json();

            if (data.success) {
                this.wods = data.data;
                
                // Cargar horarios para cada WOD para verificar si están completados
                for (const wod of this.wods) {
                    try {
                        const wodResponse = await fetch(`${API_URL}/api/wod/date/${wod.fecha.split('T')[0]}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const wodData = await wodResponse.json();
                        if (wodData.success && wodData.data.horarios) {
                            wod.horarios = wodData.data.horarios;
                        }
                    } catch (err) {
                        console.error(`Error cargando horarios para WOD ${wod.fecha}:`, err);
                    }
                }
                
                this.renderCalendar();
            }
        } catch (error) {
            console.error('Error al cargar WODs:', error);
            this.renderCalendar();
        }
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);
        
        const firstDayOfWeek = firstDay.getDay();
        const lastDateOfMonth = lastDay.getDate();
        const prevLastDate = prevLastDay.getDate();
        
        const days = [];
        
        // Días del mes anterior
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: prevLastDate - i,
                isCurrentMonth: false,
                fullDate: new Date(year, month - 1, prevLastDate - i)
            });
        }
        
        // Días del mes actual
        for (let i = 1; i <= lastDateOfMonth; i++) {
            days.push({
                date: i,
                isCurrentMonth: true,
                fullDate: new Date(year, month, i)
            });
        }
        
        // Días del mes siguiente
        const remainingDays = 42 - days.length; // 6 semanas * 7 días
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i)
            });
        }

        const calendarHTML = `
            <div class="calendar-grid">
                ${['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
                    .map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
                ${days.map(day => this.renderDay(day)).join('')}
            </div>
        `;

        const loadingDiv = this.container.querySelector('.calendar-loading');
        if (loadingDiv) {
            loadingDiv.outerHTML = calendarHTML;
        }

        this.attachDayListeners();
    }

    renderDay(dayObj) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dayObj.fullDate.setHours(0, 0, 0, 0);
        
        const isToday = dayObj.fullDate.getTime() === today.getTime();
        const isPast = dayObj.fullDate < today;
        const dateString = this.formatDate(dayObj.fullDate);
        
        const wod = this.wods.find(w => w.fecha.split('T')[0] === dateString);
        const hasWOD = !!wod;
        
        let classes = ['calendar-day'];
        if (!dayObj.isCurrentMonth) classes.push('other-month');
        if (isToday) classes.push('today');
        if (hasWOD) classes.push('has-wod');
        
        // Verificar si el WOD está completado (día pasado)
        let isCompleted = false;
        if (hasWOD && isPast) {
            isCompleted = true;
        }
        
        if (isCompleted) classes.push('wod-completed');
        
        let indicator = '';
        if (hasWOD && dayObj.isCurrentMonth) {
            const scheduleCount = wod.total_horarios || 0;
            const indicatorClass = isCompleted ? 'wod-indicator-completed' : '';
            indicator = `
                <div class="calendar-schedules-count ${indicatorClass}">${scheduleCount}</div>
                <div class="calendar-day-indicator ${indicatorClass}">${isCompleted ? '✓ WOD' : 'WOD'}</div>
            `;
        }

        return `
            <div class="${classes.join(' ')}" data-date="${dateString}" data-has-wod="${hasWOD}">
                <div class="calendar-day-number">${dayObj.date}</div>
                ${indicator}
            </div>
        `;
    }

    attachDayListeners() {
        const days = this.container.querySelectorAll('.calendar-day');
        days.forEach(day => {
            if (day.classList.contains('other-month')) return;
            
            day.addEventListener('click', () => {
                const date = day.dataset.date;
                const hasWOD = day.dataset.hasWod === 'true';
                
                if (hasWOD) {
                    this.openWODModal(date);
                } else if (currentUser.rol === 'ENTRENADOR' || currentUser.rol === 'ADMINISTRADOR') {
                    // Los entrenadores pueden crear WOD para días sin WOD
                    this.createWODModal(date);
                }
            });
        });
    }

    async openWODModal(fecha) {
        try {
            const token = SecureStorage.getToken();
            const response = await fetch(`${API_URL}/api/wod/date/${fecha}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showWODModal(data.data);
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo cargar el WOD'
                });
            }
        } catch (error) {
            console.error('Error al abrir modal:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar el WOD'
            });
        }
    }

    showWODModal(wod) {
        console.log('WOD data:', wod); // Debug
        const modal = document.getElementById('wodModal');
        const dateTitle = document.getElementById('wodDateTitle');
        const title = document.getElementById('wodTitle');
        const typeBadge = document.getElementById('wodTypeBadge');
        const body = document.getElementById('wodModalBody');

        // Header - Validar y formatear fecha
        let fechaTexto = 'Fecha no disponible';
        if (wod && wod.fecha) {
            try {
                // Limpiar la fecha para asegurar formato correcto
                let fechaStr = wod.fecha;
                if (fechaStr.includes('T')) {
                    fechaStr = fechaStr.split('T')[0];
                }
                const fecha = new Date(fechaStr + 'T00:00:00');
                console.log('Fecha procesada:', fecha); // Debug
                
                if (!isNaN(fecha.getTime())) {
                    fechaTexto = fecha.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
            } catch (e) {
                console.error('Error al formatear fecha:', e);
            }
        }
        dateTitle.textContent = fechaTexto;
        title.textContent = wod.titulo || 'WOD del Día';
        typeBadge.textContent = wod.tipo || 'CrossFit';

        // Body
        let bodyHTML = '';

        // Botones de admin/entrenador - Verificar que existe id_wod
        if ((this.isAdmin || this.isTrainer) && wod.id_wod) {
            bodyHTML += `
                <div class="wod-admin-actions" style="display: flex; gap: 10px; margin-bottom: 20px; justify-content: flex-end;">
                    <button onclick="wodCalendar.editWOD(${wod.id_wod})" class="btn-admin" style="background: #4361ee; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-edit"></i> Editar WOD
                    </button>
                    <button onclick="wodCalendar.deleteWOD(${wod.id_wod})" class="btn-danger" style="background: #e63946; color: white; padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-trash"></i> Eliminar WOD
                    </button>
                </div>
            `;
        }

        bodyHTML += `
            <div class="wod-description">
                <h3>Descripción del WOD</h3>
                <p>${wod.descripcion || 'Sin descripción'}</p>
            </div>
        `;

        // Mensaje si el atleta ya está inscrito
        if (wod.athlete_enrolled) {
            const enrolledTime = wod.athlete_enrolled.hora.substring(0, 5);
            bodyHTML += `
                <div class="wod-enrolled-message">
                    <h4>✅ Ya estás inscrito en este día</h4>
                    <p>Horario: ${enrolledTime}</p>
                </div>
            `;
        }

        // Horarios disponibles
        bodyHTML += `<div class="wod-schedules-section">`;
        
        if (wod.horarios && wod.horarios.length > 0) {
            bodyHTML += `
                <h3>Horarios Disponibles</h3>
                <div class="wod-schedules-list">
            `;

            wod.horarios.forEach(horario => {
                const time = horario.hora.substring(0, 5);
                const inscritos = parseInt(horario.inscritos) || 0;
                const cupoMaximo = horario.cupo_maximo;
                const cuposDisponibles = horario.cupos_disponibles;
                const isFull = cuposDisponibles <= 0;
                const isEnrolled = wod.athlete_enrolled && wod.athlete_enrolled.id_horario === horario.id_horario;
                
                // Verificar si el horario ya pasó
                const horarioDateTime = new Date(wod.fecha.split('T')[0] + 'T' + horario.hora);
                const isPastSchedule = horarioDateTime < new Date();
                
                const percentage = (inscritos / cupoMaximo) * 100;

                let scheduleClasses = ['wod-schedule-item'];
                if (isEnrolled) scheduleClasses.push('enrolled');
                if (isFull && !isEnrolled) scheduleClasses.push('full');
                if (isPastSchedule) scheduleClasses.push('past');

                let badge = '';
                if (isPastSchedule) {
                    badge = '<span class="schedule-past-badge">✓ Completado</span>';
                } else if (isEnrolled) {
                    badge = '<span class="schedule-enrolled-badge">✓ Inscrito</span>';
                } else if (isFull) {
                    badge = '<span class="schedule-full-badge">Lleno</span>';
                }

                bodyHTML += `
                    <div class="${scheduleClasses.join(' ')}" 
                         data-horario-id="${horario.id_horario}"
                         data-is-enrolled="${isEnrolled}"
                         data-is-full="${isFull}"
                         data-is-past="${isPastSchedule}">
                        ${badge}
                        <div class="schedule-time">${time}</div>
                        <div class="schedule-capacity">
                            <i class="fas fa-users"></i>
                            ${inscritos}/${cupoMaximo}
                        </div>
                        <div class="schedule-capacity-bar">
                            <div class="schedule-capacity-fill" style="width: ${percentage}%"></div>
                        </div>
                        ${horario.entrenador_nombre ? `<div style="font-size: 0.8rem; margin-top: 5px; opacity: 0.8;">${horario.entrenador_nombre}</div>` : ''}
                    </div>
                `;
            });

            bodyHTML += `</div>`;
        } else {
            bodyHTML += `
                <div class="wod-empty-state">
                    <h3>No hay horarios disponibles</h3>
                    <p>Este WOD aún no tiene horarios programados</p>
                </div>
            `;
        }

        bodyHTML += `</div>`;
        body.innerHTML = bodyHTML;

        // Attach event listeners para inscripciones
        if (currentUser.rol === 'ATLETA') {
            this.attachScheduleListeners(wod);
        }

        modal.classList.add('active');
    }

    attachScheduleListeners(wod) {
        const schedules = document.querySelectorAll('.wod-schedule-item');
        schedules.forEach(schedule => {
            const isEnrolled = schedule.dataset.isEnrolled === 'true';
            const isFull = schedule.dataset.isFull === 'true';
            const isPast = schedule.dataset.isPast === 'true';
            const horarioId = schedule.dataset.horarioId;

            // No hacer nada si está lleno, ya pasó, o si ya pasó y no está inscrito
            if ((isFull && !isEnrolled) || (isPast && !isEnrolled)) return;

            schedule.addEventListener('click', async () => {
                if (isEnrolled) {
                    // Desinscribirse
                    const confirm = await Swal.fire({
                        title: '¿Cancelar inscripción?',
                        text: '¿Estás seguro de que deseas cancelar tu inscripción a este horario?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#e63946',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Sí, cancelar',
                        cancelButtonText: 'No'
                    });

                    if (confirm.isConfirmed) {
                        await this.unenrollSchedule(horarioId, wod.fecha);
                    }
                } else {
                    // Inscribirse
                    if (wod.athlete_enrolled) {
                        await Swal.fire({
                            title: 'Ya estás inscrito',
                            text: 'Solo puedes inscribirte a un horario por día. Cancela tu inscripción actual primero.',
                            icon: 'info',
                            confirmButtonColor: '#e63946'
                        });
                        return;
                    }

                    await this.enrollSchedule(horarioId, wod.fecha);
                }
            });
        });
    }

    async enrollSchedule(horarioId, fecha) {
        try {
            const token = SecureStorage.getToken();
            const response = await fetch(`${API_URL}/api/wod/schedule/${horarioId}/enroll`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    title: '¡Inscripción exitosa!',
                    text: 'Te has inscrito al horario correctamente',
                    icon: 'success',
                    confirmButtonColor: '#06d6a0'
                });
                this.closeModal();
                this.loadWODs(); // Recargar calendario
                // Actualizar estadísticas del dashboard si estamos en la vista del atleta
                if (typeof loadAthleteStats === 'function') {
                    await loadAthleteStats();
                }
                // Actualizar lista de Mis WODs si está cargada
                if (document.getElementById('wodSchedulesTableBody')) {
                    await loadMyWODSchedules();
                }
            } else {
                await Swal.fire({
                    title: 'Error',
                    text: data.message,
                    icon: 'error',
                    confirmButtonColor: '#e63946'
                });
            }
        } catch (error) {
            console.error('Error al inscribirse:', error);
            await Swal.fire({
                title: 'Error',
                text: 'No se pudo procesar la inscripción',
                icon: 'error',
                confirmButtonColor: '#e63946'
            });
        }
    }

    async unenrollSchedule(horarioId, fecha) {
        try {
            const token = SecureStorage.getToken();
            const response = await fetch(`${API_URL}/api/wod/schedule/${horarioId}/unenroll`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                await Swal.fire({
                    title: 'Inscripción cancelada',
                    text: 'Has cancelado tu inscripción correctamente',
                    icon: 'success',
                    confirmButtonColor: '#06d6a0'
                });
                this.closeModal();
                this.loadWODs(); // Recargar calendario
                // Actualizar estadísticas del dashboard si estamos en la vista del atleta
                if (typeof loadAthleteStats === 'function') {
                    await loadAthleteStats();
                }
                // Actualizar lista de Mis WODs si está cargada
                if (document.getElementById('wodSchedulesTableBody')) {
                    await loadMyWODSchedules();
                }
            } else {
                await Swal.fire({
                    title: 'Error',
                    text: data.message,
                    icon: 'error',
                    confirmButtonColor: '#e63946'
                });
            }
        } catch (error) {
            console.error('Error al cancelar inscripción:', error);
            await Swal.fire({
                title: 'Error',
                text: 'No se pudo cancelar la inscripción',
                icon: 'error',
                confirmButtonColor: '#e63946'
            });
        }
    }

    async editWOD(id_wod) {
        try {
            const response = await fetch(`${API_URL}/api/wod/${id_wod}`, {
                headers: { 'Authorization': `Bearer ${SecureStorage.getToken()}` }
            });
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message);
            }

            const wod = data.data;

            const { value: formValues } = await Swal.fire({
                title: 'Editar WOD',
                html: `
                    <div style="text-align: left;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Título</label>
                            <input id="swal-titulo" class="swal2-input" style="width: 90%;" value="${wod.titulo || ''}">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Descripción</label>
                            <textarea id="swal-descripcion" class="swal2-textarea" style="width: 90%; min-height: 100px;">${wod.descripcion || ''}</textarea>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tipo</label>
                            <select id="swal-tipo" class="swal2-select" style="width: 90%;">
                                <option value="AMRAP" ${wod.tipo === 'AMRAP' ? 'selected' : ''}>AMRAP</option>
                                <option value="FOR TIME" ${wod.tipo === 'FOR TIME' ? 'selected' : ''}>FOR TIME</option>
                                <option value="EMOM" ${wod.tipo === 'EMOM' ? 'selected' : ''}>EMOM</option>
                                <option value="TABATA" ${wod.tipo === 'TABATA' ? 'selected' : ''}>TABATA</option>
                                <option value="STRENGTH" ${wod.tipo === 'STRENGTH' ? 'selected' : ''}>STRENGTH</option>
                                <option value="CHIPPER" ${wod.tipo === 'CHIPPER' ? 'selected' : ''}>CHIPPER</option>
                                <option value="HERO" ${wod.tipo === 'HERO' ? 'selected' : ''}>HERO</option>
                                <option value="BENCHMARK" ${wod.tipo === 'BENCHMARK' ? 'selected' : ''}>BENCHMARK</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Nivel</label>
                            <select id="swal-nivel" class="swal2-select" style="width: 90%;">
                                <option value="Principiante" ${wod.nivel === 'Principiante' ? 'selected' : ''}>Principiante</option>
                                <option value="Intermedio" ${wod.nivel === 'Intermedio' ? 'selected' : ''}>Intermedio</option>
                                <option value="Avanzado" ${wod.nivel === 'Avanzado' ? 'selected' : ''}>Avanzado</option>
                                <option value="Todos" ${wod.nivel === 'Todos' ? 'selected' : ''}>Todos</option>
                            </select>
                        </div>
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Guardar cambios',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#06d6a0',
                cancelButtonColor: '#e63946',
                preConfirm: () => {
                    const titulo = document.getElementById('swal-titulo').value;
                    const descripcion = document.getElementById('swal-descripcion').value;
                    const tipo = document.getElementById('swal-tipo').value;
                    const nivel = document.getElementById('swal-nivel').value;

                    if (!titulo || !descripcion) {
                        Swal.showValidationMessage('Por favor completa todos los campos');
                        return false;
                    }

                    return { titulo, descripcion, tipo, nivel };
                }
            });

            if (formValues) {
                const updateResponse = await fetch(`${API_URL}/api/wod/${id_wod}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SecureStorage.getToken()}`
                    },
                    body: JSON.stringify(formValues)
                });

                const updateData = await updateResponse.json();

                if (updateData.success) {
                    await Swal.fire({
                        title: 'WOD actualizado',
                        text: 'Los cambios se guardaron correctamente',
                        icon: 'success',
                        confirmButtonColor: '#06d6a0'
                    });
                    this.closeModal();
                    this.loadWODs();
                } else {
                    throw new Error(updateData.message);
                }
            }
        } catch (error) {
            console.error('Error al editar WOD:', error);
            await Swal.fire({
                title: 'Error',
                text: error.message || 'No se pudo editar el WOD',
                icon: 'error',
                confirmButtonColor: '#e63946'
            });
        }
    }

    async deleteWOD(id_wod) {
        try {
            const result = await Swal.fire({
                title: '¿Eliminar este WOD?',
                text: 'Esta acción eliminará el WOD y todos sus horarios. Los atletas inscritos serán notificados.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#e63946',
                cancelButtonColor: '#6c757d'
            });

            if (result.isConfirmed) {
                const response = await fetch(`${API_URL}/api/wod/${id_wod}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${SecureStorage.getToken()}`
                    }
                });

                const data = await response.json();

                if (data.success) {
                    await Swal.fire({
                        title: 'WOD eliminado',
                        text: 'El WOD se eliminó correctamente',
                        icon: 'success',
                        confirmButtonColor: '#06d6a0'
                    });
                    this.closeModal();
                    this.loadWODs();
                } else {
                    throw new Error(data.message);
                }
            }
        } catch (error) {
            console.error('Error al eliminar WOD:', error);
            await Swal.fire({
                title: 'Error',
                text: error.message || 'No se pudo eliminar el WOD',
                icon: 'error',
                confirmButtonColor: '#e63946'
            });
        }
    }

    createWODModal(fecha) {
        // TODO: Implementar modal para crear WOD (solo entrenadores/admin)
        Swal.fire({
            icon: 'info',
            title: 'Función no disponible',
            text: 'Función de crear WOD - Por implementar'
        });
    }

    closeModal() {
        document.getElementById('wodModal').classList.remove('active');
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.loadWODs();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.loadWODs();
    }

    goToToday() {
        this.currentDate = new Date();
        this.loadWODs();
    }

    getMonthName(month) {
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return months[month];
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// Variable global para el calendario
let wodCalendar = null;
// ===============================================
// VISTAS DE ENTRENADOR - CALENDARIO
// ===============================================

async function loadTrainerCalendar() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <h1 class="dashboard-title">
            <i class="fas fa-calendar-alt"></i> Calendario de WODs
        </h1>
        <div class="info-card" style="background: linear-gradient(135deg, #06d6a0 0%, #05b589 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0;"><i class="fas fa-chalkboard-teacher"></i> Gestión de WODs</h3>
            <p style="margin: 0; line-height: 1.6;">
                Visualiza todos los WODs programados del mes. Haz clic en un día para ver los detalles y lista de inscritos.
                Para crear un nuevo WOD, usa el botón "Crear WOD" en el menú.
            </p>
        </div>
        <div id="wodCalendarContainer"></div>
    `;

    // Inicializar calendario WOD
    wodCalendar = new WODCalendar('wodCalendarContainer');
}

async function loadCreateWOD() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="wod-create-container">
            <h1 class="dashboard-title"><i class="fas fa-plus-circle"></i> Crear WOD</h1>
            <div class="dashboard-form wod-form-enhanced">
                <form id="trainerCreateWODForm">
                    <!-- Información Básica -->
                    <div class="form-section">
                        <h3 class="section-title"><i class="fas fa-info-circle"></i> Información Básica</h3>
                        
                        <div class="form-group">
                            <label><i class="fas fa-calendar"></i> Fecha *</label>
                            <input type="date" id="trainerWodFecha" name="fecha" required>
                        </div>

                        <div class="form-group">
                            <label><i class="fas fa-dumbbell"></i> Título del WOD *</label>
                            <input type="text" id="trainerWodTitulo" name="titulo" 
                                   placeholder="Ej: Murph, Helen, Fran..." required>
                        </div>

                        <div class="form-group">
                            <label><i class="fas fa-list"></i> Descripción / Movimientos *</label>
                            <textarea id="trainerWodDescripcion" name="descripcion" rows="6" 
                                      placeholder="Describe el WOD completo...&#10;&#10;Ejemplo:&#10;For Time:&#10;21-15-9&#10;Thrusters (95/65 lb)&#10;Pull-ups" required></textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label><i class="fas fa-tag"></i> Tipo de WOD *</label>
                                <select id="trainerWodTipo" name="tipo" required>
                                    <option value="">Seleccionar...</option>
                                    <option value="AMRAP">AMRAP</option>
                                    <option value="FOR TIME">FOR TIME</option>
                                    <option value="EMOM">EMOM</option>
                                    <option value="TABATA">TABATA</option>
                                    <option value="STRENGTH">STRENGTH</option>
                                    <option value="CHIPPER">CHIPPER</option>
                                    <option value="HERO">HERO</option>
                                    <option value="BENCHMARK">BENCHMARK</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-signal"></i> Nivel *</label>
                                <select id="trainerWodNivel" name="nivel" required>
                                    <option value="">Seleccionar nivel</option>
                                    <option value="Principiante">Principiante</option>
                                    <option value="Intermedio">Intermedio</option>
                                    <option value="Avanzado">Avanzado</option>
                                    <option value="Todos">Todos</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Horarios -->
                    <div class="form-section">
                        <h3 class="section-title"><i class="fas fa-clock"></i> Horarios Disponibles</h3>
                        <p class="section-description">Agrega los horarios en los que se realizará este WOD:</p>

                        <div id="trainerHorariosContainer">
                            <div class="horario-item">
                                <div class="horario-row">
                                    <div class="form-group">
                                        <label>Hora *</label>
                                        <input type="time" class="horario-time" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Cupo máximo *</label>
                                        <input type="number" class="horario-cupo" min="1" value="12" required>
                                    </div>
                                    <div class="form-group" style="align-self: flex-end;">
                                        <button type="button" class="btn-icon btn-delete" onclick="removeTrainerHorario(this)" style="visibility: hidden;">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="button" class="btn-add-horario" onclick="addTrainerHorarioField()">
                            <i class="fas fa-plus"></i> Agregar Horario
                        </button>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-primary btn-submit-wod">
                            <i class="fas fa-save"></i> Crear WOD
                        </button>
                        <button type="button" class="btn-secondary" onclick="loadView('trainer-calendar')">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Configurar el manejador del formulario
    setupTrainerWODFormHandler();
}

function addTrainerHorarioField() {
    const container = document.getElementById('trainerHorariosContainer');
    const horarioItem = document.createElement('div');
    horarioItem.className = 'horario-item';
    
    horarioItem.innerHTML = `
        <div class="horario-row">
            <div class="form-group">
                <label>Hora *</label>
                <input type="time" class="horario-time" required>
            </div>
            <div class="form-group">
                <label>Cupo máximo *</label>
                <input type="number" class="horario-cupo" min="1" value="12" required>
            </div>
            <div class="form-group" style="align-self: flex-end;">
                <button type="button" class="btn-icon btn-delete" onclick="removeTrainerHorario(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    container.appendChild(horarioItem);
}

function removeTrainerHorario(button) {
    button.closest('.horario-item').remove();
}

async function setupTrainerWODFormHandler() {
    // Obtener id_entrenador del usuario actual
    let trainerIdEntrenador = null;
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        // Obtener id_entrenador
        const trainerResponse = await fetch(`${API_URL}/api/trainers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const trainersResult = await trainerResponse.json();
        if (trainersResult.success && trainersResult.data.length > 0) {
            // Buscar el entrenador actual por id_usuario
            const currentTrainer = trainersResult.data.find(t => t.id_usuario === result.data.user.id_usuario);
            if (currentTrainer) {
                trainerIdEntrenador = currentTrainer.id_entrenador;
            }
        }
    } catch (error) {
        console.error('Error obteniendo id_entrenador:', error);
    }

    document.getElementById('trainerCreateWODForm').onsubmit = async (e) => {
        e.preventDefault();

        if (!trainerIdEntrenador) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo obtener tu información de entrenador'
            });
            return;
        }

        // Recolectar horarios
        const horarioItems = document.querySelectorAll('#trainerHorariosContainer .horario-item');
        const horarios = Array.from(horarioItems).map(item => {
            const hora = item.querySelector('.horario-time').value;
            const cupo = parseInt(item.querySelector('.horario-cupo').value);
            return { hora, cupo_maximo: cupo, id_entrenador: trainerIdEntrenador };
        }).filter(h => h.hora && h.cupo_maximo > 0);

        if (horarios.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Faltan horarios',
                text: 'Debes agregar al menos un horario'
            });
            return;
        }

        const data = {
            fecha: document.getElementById('trainerWodFecha').value,
            titulo: document.getElementById('trainerWodTitulo').value,
            descripcion: document.getElementById('trainerWodDescripcion').value,
            tipo: document.getElementById('trainerWodTipo').value,
            nivel: document.getElementById('trainerWodNivel').value,
            horarios: horarios
        };

        console.log('Creando WOD (Trainer):', data);

        try {
            const token = SecureStorage.getToken();
            const response = await fetch(`${API_URL}/api/wod`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡WOD creado!',
                    text: 'WOD creado exitosamente',
                    timer: 2000,
                    showConfirmButton: false
                });
                loadView('trainer-calendar');
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.message || 'Error al crear el WOD'
                });
            }
        } catch (error) {
            console.error('Error al crear WOD:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al crear el WOD'
            });
        }
    };
}

let scheduleCount = 0;

function addScheduleField() {
    scheduleCount++;
    const container = document.getElementById('horariosContainer');
    const scheduleDiv = document.createElement('div');
    scheduleDiv.className = 'schedule-field';
    scheduleDiv.id = `schedule-${scheduleCount}`;
    scheduleDiv.innerHTML = `
        <div class="form-row" style="align-items: flex-end; gap: 10px; margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <div class="form-group" style="flex: 1;">
                <label>Hora</label>
                <input type="time" name="hora[]" required class="form-control" value="06:00">
            </div>
            <div class="form-group" style="flex: 1;">
                <label>Cupo Máximo</label>
                <input type="number" name="cupo_maximo[]" required min="1" max="50" value="20" class="form-control">
            </div>
            <button type="button" class="btn btn-danger" onclick="removeScheduleField(${scheduleCount})" style="height: 42px;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(scheduleDiv);
}

function removeScheduleField(id) {
    const field = document.getElementById(`schedule-${id}`);
    if (field) {
        field.remove();
    }
}

async function handleCreateWOD(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const fecha = formData.get('fecha');
    const titulo = formData.get('titulo');
    const errors = [];

    if (!fecha) {
        errors.push('La fecha es requerida');
    } else {
        const fDate = new Date(fecha + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(fDate.getTime())) {
            errors.push('La fecha no es válida');
        } else if (fDate < today) {
            errors.push('La fecha no puede ser pasada');
        }
    }

    if (!titulo || titulo.trim().length < 3) {
        errors.push('El título debe tener al menos 3 caracteres');
    }

    const wodData = {
        fecha: fecha,
        titulo: titulo,
        descripcion: formData.get('descripcion'),
        tipo: formData.get('tipo'),
        nivel: formData.get('nivel'),
        horarios: []
    };

    const horas = formData.getAll('hora[]');
    const cupos = formData.getAll('cupo_maximo[]');

    for (let i = 0; i < horas.length; i++) {
        const cupo = parseInt(cupos[i]);
        const hora = horas[i];
        if (cupo <= 0) errors.push('Cada horario debe tener cupo mayor a 0');
        if (hora < '06:00' || hora > '21:00') errors.push('La hora del horario debe estar entre 06:00 y 21:00');
        wodData.horarios.push({
            hora: hora + ':00',
            cupo_maximo: cupo
        });
    }

    if (wodData.horarios.length === 0) {
        await Swal.fire({
            title: 'Error',
            text: 'Debes agregar al menos un horario',
            icon: 'error',
            confirmButtonColor: '#e63946'
        });
        return;
    }

    if (errors.length > 0) {
        await Swal.fire({ icon: 'warning', title: 'Validación', html: errors.join('<br>'), confirmButtonColor: '#e63946' });
        return;
    }

    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/wod`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(wodData)
        });

        const data = await response.json();

        if (data.success) {
            await Swal.fire({
                title: '¡WOD Creado!',
                text: 'El WOD y sus horarios han sido creados exitosamente',
                icon: 'success',
                confirmButtonColor: '#06d6a0'
            });
            loadView('trainer-calendar');
        } else {
            await Swal.fire({
                title: 'Error',
                text: data.message,
                icon: 'error',
                confirmButtonColor: '#e63946'
            });
        }
    } catch (error) {
        console.error('Error al crear WOD:', error);
        await Swal.fire({
            title: 'Error',
            text: 'No se pudo crear el WOD',
            icon: 'error',
            confirmButtonColor: '#e63946'
        });
    }
}

// ===============================================
// VISTAS - CLASES
// ===============================================
async function loadAdminClasses() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="admin-header">
            <h1 class="dashboard-title">Gestion de Clases</h1>
            <button class="btn-primary" onclick="openClassModal()">
                <i class="fas fa-plus"></i> Nueva Clase
            </button>
        </div>
        <div class="table-filter">
            <input type="text" id="classesFilter" placeholder="Buscar por nombre, fecha o entrenador..." onkeyup="filterTable('classesTableBody', 'classesFilter')">
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead><tr>
                    <th>ID</th><th>Nombre</th><th>Descripcion</th><th>Fecha</th><th>Hora</th><th>Entrenador</th><th>Cupo</th><th>Inscritos</th><th>Estado</th><th>Acciones</th>
                </tr></thead>
                <tbody id="classesTableBody"><tr><td colspan="10" class="loading">Cargando...</td></tr></tbody>
            </table>
        </div>
        <div id="classModal" class="modal">
            <div class="modal-content">
                <div class="modal-header"><h2 id="classModalTitle">Nueva Clase</h2><span class="close" onclick="closeClassModal()">&times;</span></div>
                <form id="classForm">
                    <input type="hidden" id="classId">
                    <div class="form-group"><label for="classNombre">Nombre *</label><input type="text" id="classNombre" required></div>
                    <div class="form-group"><label for="classDescripcion">Descripcion</label><textarea id="classDescripcion" rows="2"></textarea></div>
                    <div class="form-row">
                        <div class="form-group"><label for="classFecha">Fecha *</label><input type="date" id="classFecha" required></div>
                        <div class="form-group"><label for="classHora">Hora *</label><input type="time" id="classHora" required></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label for="classCupo">Cupo Maximo *</label><input type="number" id="classCupo" min="1" value="20" required></div>
                        <div class="form-group"><label for="classEntrenador">Entrenador *</label><select id="classEntrenador" required><option value="">Cargando...</option></select></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeClassModal()">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    await loadClassesData();
    setupClassFormHandler();
}

async function loadClassesData() {
    try {
        const token = SecureStorage.getToken();
        const response = await fetch(`${API_URL}/api/admin/classes`, { headers: { 'Authorization': `Bearer ${token}` } });
        const result = await response.json();
        const data = result.data || [];
        const tbody = document.getElementById('classesTableBody');
        if (!tbody) return;
        if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="10" class="no-data">No hay clases programadas</td></tr>'; return; }
        tbody.innerHTML = data.map(c => {
            const fecha = c.fecha ? c.fecha.substring(0,10) : '-';
            const hora = c.hora ? c.hora.substring(0,5) : '-';
            return `<tr>
                <td>${c.id_clase}</td><td><strong>${c.nombre}</strong></td><td>${c.descripcion || '-'}</td>
                <td>${fecha}</td><td>${hora}</td><td>${c.entrenador_nombre || '-'}</td>
                <td>${c.cupo_maximo || 20}</td><td>${c.inscritos || 0}</td>
                <td><span class="badge ${c.estado === 'CANCELADA' ? 'badge-danger' : 'badge-success'}">${c.estado || 'ACTIVA'}</span></td>
                <td class="actions">
                    <button class="btn-icon btn-edit" onclick="editClass(${c.id_clase})" title="Editar"><i class="fas fa-edit"></i></button>
                    ${c.estado === 'CANCELADA'
                        ? `<button class="btn-icon btn-success" onclick="reactivateClass(${c.id_clase})" title="Reactivar"><i class="fas fa-check"></i></button>
                           <button class="btn-icon btn-delete" onclick="deleteClassPermanently(${c.id_clase},'${c.nombre}')" title="Eliminar Permanentemente"><i class="fas fa-trash"></i></button>`
                        : `<button class="btn-icon btn-delete" onclick="cancelClass(${c.id_clase},'${c.nombre}')" title="Cancelar"><i class="fas fa-ban"></i></button>`
                    }
                </td></tr>`;
        }).join('');
    } catch (e) { console.error('Error clases:', e); }
}

function openClassModal() {
    document.getElementById('classModalTitle').textContent = 'Nueva Clase';
    document.getElementById('classForm').reset();
    document.getElementById('classId').value = '';
    document.getElementById('classModal').style.display = 'block';
    loadTrainersForClassSelect();
}
function closeClassModal() { document.getElementById('classModal').style.display = 'none'; }

async function loadTrainersForClassSelect() {
    try {
        const token = SecureStorage.getToken();
        const resp = await fetch(`${API_URL}/api/trainers`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await resp.json();
        const sel = document.getElementById('classEntrenador');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar entrenador...</option>';
        (data.data||[]).forEach(t => { sel.innerHTML += `<option value="${t.id_entrenador}">${t.nombre} ${t.apellido}</option>`; });
    } catch(e) {}
}

async function editClass(id) {
    try {
        const token = SecureStorage.getToken();
        const resp = await fetch(`${API_URL}/api/admin/classes/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await resp.json();
        const c = data.data || data;
        document.getElementById('classModalTitle').textContent = 'Editar Clase';
        document.getElementById('classId').value = c.id_clase;
        document.getElementById('classNombre').value = c.nombre || '';
        document.getElementById('classDescripcion').value = c.descripcion || '';
        document.getElementById('classFecha').value = c.fecha ? c.fecha.substring(0,10) : '';
        document.getElementById('classHora').value = c.hora ? c.hora.substring(0,5) : '';
        document.getElementById('classCupo').value = c.cupo_maximo || 20;
        document.getElementById('classModal').style.display = 'block';
        await loadTrainersForClassSelect();
        if (c.id_entrenador) document.getElementById('classEntrenador').value = c.id_entrenador;
    } catch(e) { Swal.fire({ icon:'error', title:'Error', text:'No se pudo cargar la clase' }); }
}

function setupClassFormHandler() {
    document.getElementById('classForm').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('classId').value;
        const nombre = document.getElementById('classNombre').value;
        const fecha = document.getElementById('classFecha').value;
        const hora = document.getElementById('classHora').value;
        const cupo = parseInt(document.getElementById('classCupo').value);
        const errors = [];

        if (!nombre || nombre.trim().length < 3) errors.push('El nombre debe tener al menos 3 caracteres');
        if (!fecha) {
            errors.push('La fecha es requerida');
        } else {
            const fDate = new Date(fecha + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(fDate.getTime())) errors.push('La fecha no es válida');
            else if (fDate < today) errors.push('La fecha no puede ser pasada');
        }
        if (hora < '06:00' || hora > '21:00') errors.push('La hora debe estar entre 06:00 y 21:00');
        if (isNaN(cupo) || cupo <= 0) errors.push('El cupo máximo debe ser mayor a 0');

        if (errors.length > 0) {
            await Swal.fire({ icon: 'warning', title: 'Validación', html: errors.join('<br>') });
            return;
        }

        const data = {
            nombre: nombre,
            descripcion: document.getElementById('classDescripcion').value,
            fecha: fecha,
            hora: hora + ':00',
            cupo_maximo: cupo,
            id_entrenador: parseInt(document.getElementById('classEntrenador').value)
        };
        const token = SecureStorage.getToken();
        const url = id ? `${API_URL}/api/admin/classes/${id}` : `${API_URL}/api/admin/classes`;
        const method = id ? 'PUT' : 'POST';
        const resp = await fetch(url, { method, headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` }, body: JSON.stringify(data) });
        if (resp.ok) { closeClassModal(); loadClassesData(); Swal.fire({ icon:'success', title: id?'Actualizada':'Creada', timer:1500, showConfirmButton:false }); }
        else { const err = await resp.json(); Swal.fire({ icon:'error', title:'Error', text: err.message || err.error }); }
    };
}

async function cancelClass(id, nombre) {
    const result = await Swal.fire({ title: 'Cancelar Clase?', text: `La clase "${nombre}" pasara a estado CANCELADA.`, icon:'warning', showCancelButton:true, confirmButtonText:'Si, cancelar', cancelButtonText:'Volver' });
    if (!result.isConfirmed) return;
    const token = SecureStorage.getToken();
    await fetch(`${API_URL}/api/admin/classes/${id}`, { method:'DELETE', headers: { 'Authorization':`Bearer ${token}` } });
    loadClassesData();
}

async function reactivateClass(id) {
    const result = await Swal.fire({ title:'Reactivar Clase?', text:'La clase volvera a estado ACTIVA.', icon:'question', showCancelButton:true, confirmButtonText:'Si, reactivar' });
    if (!result.isConfirmed) return;
    const token = SecureStorage.getToken();
    await fetch(`${API_URL}/api/admin/classes/${id}/reactivate`, { method:'PUT', headers: { 'Authorization':`Bearer ${token}` } });
    loadClassesData();
}

async function deleteClassPermanently(id, nombre) {
    const result = await Swal.fire({ title:'Eliminar Permanentemente?', text:`La clase "${nombre}" sera eliminada definitivamente.`, icon:'error', showCancelButton:true, confirmButtonText:'Eliminar', cancelButtonText:'Cancelar', confirmButtonColor:'#dc3545' });
    if (!result.isConfirmed) return;
    const token = SecureStorage.getToken();
    await fetch(`${API_URL}/api/admin/classes/${id}/permanent`, { method:'DELETE', headers: { 'Authorization':`Bearer ${token}` } });
    loadClassesData();
}

// ===============================================
// VISTAS - EJERCICIOS
// ===============================================
async function loadAdminEjercicios() {
    // Cargar estilos de ejercicios si no están cargados
    if (!document.querySelector('link[href="/css/ejercicios.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/ejercicios.css';
        document.head.appendChild(link);
    }
    
    // Cargar script de ejercicios si no está cargado
    if (typeof ejerciciosManager === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/js/ejercicios.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    
    // Inicializar vista de ejercicios para administrador (mismos permisos que entrenador)
    await ejerciciosManager.init(true);
}

async function loadTrainerEjercicios() {
    // Cargar estilos de ejercicios si no están cargados
    if (!document.querySelector('link[href="/css/ejercicios.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/ejercicios.css';
        document.head.appendChild(link);
    }
    
    // Cargar script de ejercicios si no está cargado
    if (typeof ejerciciosManager === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/js/ejercicios.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    
    // Inicializar vista de ejercicios para entrenador
    await ejerciciosManager.init(true);
}

async function loadAthleteEjercicios() {
    // Cargar estilos de ejercicios si no están cargados
    if (!document.querySelector('link[href="/css/ejercicios.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/ejercicios.css';
        document.head.appendChild(link);
    }
    
    // Cargar script de ejercicios si no está cargado
    if (typeof ejerciciosManager === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/js/ejercicios.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    
    // Inicializar vista de ejercicios para atleta
    await ejerciciosManager.init(false);
}

// ===============================================
// VALIDACIONES CLIENT-SIDE PARA DASHBOARD
// ===============================================
const DashboardValidators = {
    validateNotEmpty: function (value, fieldName) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            return fieldName + ' es requerido';
        }
        return null;
    },

    validateEmail: function (email) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return 'Formato de email inválido';
        }
        return null;
    },

    validatePositiveInt: function (value, fieldName) {
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
            return fieldName + ' debe ser un número positivo';
        }
        return null;
    },

    validatePositiveFloat: function (value, fieldName) {
        const num = parseFloat(value);
        if (isNaN(num) || num <= 0) {
            return fieldName + ' debe ser un número positivo';
        }
        return null;
    },

    validatePhone: function (value) {
        if (!value) return null;
        const cleaned = value.replace(/[\s\-\(\)\+]/g, '');
        if (!/^\d{10}$/.test(cleaned)) {
            return 'El teléfono debe tener 10 dígitos';
        }
        return null;
    },

    validateLettersOnly: function (value, fieldName) {
        if (!value) return null;
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value.trim())) {
            return fieldName + ' solo debe contener letras y espacios';
        }
        return null;
    },

    validateMinLength: function (value, minLen, fieldName) {
        if (!value || value.trim().length < minLen) {
            return fieldName + ' debe tener al menos ' + minLen + ' caracteres';
        }
        return null;
    },

    validateDatePast: function (value, fieldName) {
        if (!value) return null;
        const inputDate = new Date(value + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(inputDate.getTime())) {
            return fieldName + ' no es una fecha válida';
        }
        if (inputDate >= today) {
            return fieldName + ' debe ser una fecha pasada';
        }
        return null;
    },

    validateMinAge: function (value, minYears, fieldName) {
        if (!value) return null;
        const inputDate = new Date(value + 'T00:00:00');
        if (isNaN(inputDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - inputDate.getFullYear();
        const monthDiff = today.getMonth() - inputDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < inputDate.getDate())) {
            age--;
        }
        if (age < minYears) {
            return 'Debe tener al menos ' + minYears + ' años (edad actual: ' + age + ')';
        }
        return null;
    },

    validateDateFutureOrToday: function (value, fieldName) {
        if (!value) return null;
        const inputDate = new Date(value + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(inputDate.getTime())) {
            return fieldName + ' no es una fecha válida';
        }
        if (inputDate < today) {
            return fieldName + ' no puede ser una fecha pasada';
        }
        return null;
    },

    validateTimeRange: function (value, minTime, maxTime, fieldName) {
        if (!value) return null;
        if (value < minTime || value > maxTime) {
            return fieldName + ' debe estar entre ' + minTime + ' y ' + maxTime;
        }
        return null;
    },

    validateEmailDomain: function (email, domain) {
        if (!email) return null;
        const trimmed = email.trim().toLowerCase();
        if (!trimmed.endsWith(domain.toLowerCase())) {
            return 'El email debe pertenecer al dominio ' + domain;
        }
        return null;
    },

    validateMinMax: function (value, min, max, fieldName) {
        if (!value && value !== 0) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return null;
        if (num < min || num > max) {
            return fieldName + ' debe estar entre ' + min + ' y ' + max;
        }
        return null;
    },

    validateForm: function (formData, rules) {
        const errors = [];
        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = formData[field];
            if (fieldRules.required) {
                const err = DashboardValidators.validateNotEmpty(value, fieldRules.label || field);
                if (err) { errors.push(err); continue; }
            }
            if (fieldRules.type === 'email' && value) {
                const err = DashboardValidators.validateEmail(value);
                if (err) errors.push(err);
            }
            if (fieldRules.type === 'phone' && value) {
                const err = DashboardValidators.validatePhone(value);
                if (err) errors.push(err);
            }
            if (fieldRules.type === 'positiveInt' && value) {
                const err = DashboardValidators.validatePositiveInt(value, fieldRules.label || field);
                if (err) errors.push(err);
            }
            if (fieldRules.type === 'positiveFloat' && value) {
                const err = DashboardValidators.validatePositiveFloat(value, fieldRules.label || field);
                if (err) errors.push(err);
            }
            if (fieldRules.type === 'lettersOnly' && value) {
                const err = DashboardValidators.validateLettersOnly(value, fieldRules.label || field);
                if (err) errors.push(err);
            }
            if (fieldRules.type === 'datePast' && value) {
                const err = DashboardValidators.validateDatePast(value, fieldRules.label || field);
                if (err) errors.push(err);
            }
            if (fieldRules.type === 'dateFutureOrToday' && value) {
                const err = DashboardValidators.validateDateFutureOrToday(value, fieldRules.label || field);
                if (err) errors.push(err);
            }
            if (fieldRules.type === 'timeRange' && value && fieldRules.timeMin && fieldRules.timeMax) {
                const err = DashboardValidators.validateTimeRange(value, fieldRules.timeMin, fieldRules.timeMax, fieldRules.label || field);
                if (err) errors.push(err);
            }
            if (fieldRules.type === 'emailDomain' && value && fieldRules.domain) {
                const err = DashboardValidators.validateEmailDomain(value, fieldRules.domain);
                if (err) errors.push(err);
            }
            if (fieldRules.minAge && value) {
                const err = DashboardValidators.validateMinAge(value, fieldRules.minAge, fieldRules.label || field);
                if (err) errors.push(err);
            }
            if (fieldRules.minLength && value && value.trim().length < fieldRules.minLength) {
                errors.push((fieldRules.label || field) + ' debe tener al menos ' + fieldRules.minLength + ' caracteres');
            }
            if (fieldRules.minMax && value && fieldRules.minMax.min !== undefined && fieldRules.minMax.max !== undefined) {
                const err = DashboardValidators.validateMinMax(value, fieldRules.minMax.min, fieldRules.minMax.max, fieldRules.label || field);
                if (err) errors.push(err);
            }
        }
        return errors;
    }
};
