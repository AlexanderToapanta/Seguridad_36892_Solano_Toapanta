// ejercicios.js - Gestión de ejercicios para entrenadores y atletas

// Verificar que secureStorage esté disponible
const secureStorage = window.secureStorage || window.SecureStorage;

class EjerciciosManager {
  constructor() {
    this.ejercicios = [];
    this.currentEjercicio = null;
    this.isTrainer = false;
  }

  async init(isTrainer = false) {
    this.isTrainer = isTrainer;
    await this.loadEjercicios();
    this.renderView();
  }

  async loadEjercicios() {
    try {
      const token = secureStorage.getToken();
      const response = await fetch(`${API_URL}/api/ejercicios`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al cargar ejercicios');

      const data = await response.json();
      this.ejercicios = data.data;
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'No se pudieron cargar los ejercicios', 'error');
    }
  }

  renderView() {
    const contentArea = document.getElementById('contentArea');
    
    if (this.isTrainer) {
      contentArea.innerHTML = this.renderTrainerView();
      this.attachTrainerEvents();
    } else {
      contentArea.innerHTML = this.renderAtletaView();
      this.attachAtletaEvents();
    }
  }

  renderTrainerView() {
    return `
      <div class="ejercicios-container">
        <div class="section-header">
          <h2><i class="fas fa-dumbbell"></i> Gestión de Ejercicios</h2>
          <button class="btn btn-primary" id="btnNuevoEjercicio">
            <i class="fas fa-plus"></i> Nuevo Ejercicio
          </button>
        </div>

        <div class="ejercicios-stats">
          <div class="stat-card">
            <i class="fas fa-dumbbell"></i>
            <div class="stat-info">
              <h3>${this.ejercicios.length}</h3>
              <p>Ejercicios Activos</p>
            </div>
          </div>
        </div>

        <div class="ejercicios-filter">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" id="searchEjercicios" placeholder="Buscar ejercicio...">
          </div>
        </div>

        <div class="ejercicios-grid" id="ejerciciosGrid">
          ${this.renderEjerciciosCards()}
        </div>
      </div>

      <!-- Modal para crear/editar ejercicio -->
      <div class="modal" id="modalEjercicio">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modalTitle">Nuevo Ejercicio</h3>
            <button class="modal-close" id="closeModal">&times;</button>
          </div>
          <form id="formEjercicio" enctype="multipart/form-data">
            <div class="form-group">
              <label for="nombre">Nombre del Ejercicio *</label>
              <input type="text" id="nombre" name="nombre" required>
            </div>
            
            <div class="form-group">
              <label for="descripcion">Descripción</label>
              <textarea id="descripcion" name="descripcion" rows="4"></textarea>
            </div>
            
            <div class="form-group">
              <label for="imagen">Imagen (opcional)</label>
              <div class="image-upload-area" id="imageUploadArea">
                <img id="imagePreview" style="display: none; max-width: 100%; max-height: 200px; margin-bottom: 10px;">
                <input type="file" id="imagen" name="imagen" accept="image/*">
                <p class="help-text">Formatos: JPG, PNG, GIF, WEBP. Máximo 5MB</p>
                <button type="button" class="btn btn-danger btn-sm" id="btnRemoveImage" style="display: none;">
                  <i class="fas fa-trash"></i> Eliminar Imagen
                </button>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" id="btnCancelar">Cancelar</button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  renderAtletaView() {
    return `
      <div class="ejercicios-container atleta">
        <div class="section-header">
          <h2><i class="fas fa-dumbbell"></i> Biblioteca de Ejercicios</h2>
        </div>

        <div class="ejercicios-filter">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" id="searchEjercicios" placeholder="Buscar ejercicio...">
          </div>
        </div>

        <div class="ejercicios-list" id="ejerciciosList">
          ${this.renderEjerciciosList()}
        </div>
      </div>

      <!-- Modal para ver detalles del ejercicio -->
      <div class="modal" id="modalDetalleEjercicio">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="detalleTitle">Detalle del Ejercicio</h3>
            <button class="modal-close" id="closeDetalleModal">&times;</button>
          </div>
          <div class="ejercicio-detalle" id="ejercicioDetalle">
            <!-- Se cargará dinámicamente -->
          </div>
        </div>
      </div>
    `;
  }

  renderEjerciciosCards() {
    if (this.ejercicios.length === 0) {
      return '<p class="no-data">No hay ejercicios registrados</p>';
    }

    return this.ejercicios.map(ejercicio => `
      <div class="ejercicio-card" data-id="${ejercicio.id_ejercicio}" style="${ejercicio.activo === false ? 'opacity:0.5;' : ''}">
        <div class="ejercicio-imagen">
          ${ejercicio.imagen_url 
            ? `<img src="${ejercicio.imagen_url}" alt="${ejercicio.nombre}">`
            : '<i class="fas fa-dumbbell fa-3x"></i>'}
          <span class="ejercicio-badge" style="position:absolute;top:8px;right:8px;background:${ejercicio.activo !== false ? '#34C759' : '#dc3545'};color:white;padding:2px 8px;border-radius:10px;font-size:10px;">${ejercicio.activo !== false ? 'Activo' : 'Inactivo'}</span>
        </div>
        <div class="ejercicio-info">
          <h3>${ejercicio.nombre}</h3>
          <p>${ejercicio.descripcion ? this.truncate(ejercicio.descripcion, 100) : 'Sin descripción'}</p>
        </div>
        <div class="ejercicio-actions">
          <button class="btn btn-sm btn-primary" onclick="ejerciciosManager.editEjercicio(${ejercicio.id_ejercicio})">
            <i class="fas fa-edit"></i>
          </button>
          ${ejercicio.activo !== false
            ? `<button class="btn btn-sm btn-warning" onclick="ejerciciosManager.deleteEjercicio(${ejercicio.id_ejercicio})" title="Desactivar"><i class="fas fa-ban"></i></button>`
            : `<button class="btn btn-sm btn-success" onclick="ejerciciosManager.reactivateEjercicio(${ejercicio.id_ejercicio})" title="Reactivar"><i class="fas fa-check"></i></button>`
          }
        </div>
      </div>
    `).join('');
  }

  renderEjerciciosList() {
    if (this.ejercicios.length === 0) {
      return '<p class="no-data">No hay ejercicios disponibles</p>';
    }

    return this.ejercicios.map(ejercicio => `
      <div class="ejercicio-item" onclick="ejerciciosManager.viewEjercicio(${ejercicio.id_ejercicio})">
        <div class="ejercicio-imagen-small">
          ${ejercicio.imagen_url 
            ? `<img src="${ejercicio.imagen_url}" alt="${ejercicio.nombre}">`
            : '<i class="fas fa-dumbbell fa-2x"></i>'}
        </div>
        <div class="ejercicio-info-item">
          <h4>${ejercicio.nombre}</h4>
          <p>${ejercicio.descripcion ? this.truncate(ejercicio.descripcion, 150) : 'Sin descripción'}</p>
        </div>
        <div class="ejercicio-arrow">
          <i class="fas fa-chevron-right"></i>
        </div>
      </div>
    `).join('');
  }

  attachTrainerEvents() {
    // Botón nuevo ejercicio
    document.getElementById('btnNuevoEjercicio')?.addEventListener('click', () => {
      this.showModal();
    });

    // Búsqueda
    document.getElementById('searchEjercicios')?.addEventListener('input', (e) => {
      this.filterEjercicios(e.target.value);
    });

    // Cerrar modal
    document.getElementById('closeModal')?.addEventListener('click', () => {
      this.hideModal();
    });

    document.getElementById('btnCancelar')?.addEventListener('click', () => {
      this.hideModal();
    });

    // Form submit
    document.getElementById('formEjercicio')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEjercicio();
    });

    // Preview imagen
    document.getElementById('imagen')?.addEventListener('change', (e) => {
      this.previewImage(e.target.files[0]);
    });

    // Remover imagen
    document.getElementById('btnRemoveImage')?.addEventListener('click', () => {
      this.removeImage();
    });
  }

  attachAtletaEvents() {
    // Búsqueda
    document.getElementById('searchEjercicios')?.addEventListener('input', (e) => {
      this.filterEjercicios(e.target.value);
    });

    // Cerrar modal detalle
    document.getElementById('closeDetalleModal')?.addEventListener('click', () => {
      this.hideDetalleModal();
    });
  }

  showModal(ejercicio = null) {
    this.currentEjercicio = ejercicio;
    const modal = document.getElementById('modalEjercicio');
    const form = document.getElementById('formEjercicio');
    const title = document.getElementById('modalTitle');

    form.reset();
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('btnRemoveImage').style.display = 'none';

    if (ejercicio) {
      title.textContent = 'Editar Ejercicio';
      document.getElementById('nombre').value = ejercicio.nombre;
      document.getElementById('descripcion').value = ejercicio.descripcion || '';
      
      if (ejercicio.imagen_url) {
        const preview = document.getElementById('imagePreview');
        preview.src = ejercicio.imagen_url;
        preview.style.display = 'block';
        document.getElementById('btnRemoveImage').style.display = 'inline-block';
      }
    } else {
      title.textContent = 'Nuevo Ejercicio';
    }

    modal.style.display = 'flex';
  }

  hideModal() {
    document.getElementById('modalEjercicio').style.display = 'none';
    this.currentEjercicio = null;
  }

  hideDetalleModal() {
    document.getElementById('modalDetalleEjercicio').style.display = 'none';
  }

  previewImage(file) {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById('imagePreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
        document.getElementById('btnRemoveImage').style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    document.getElementById('imagen').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('btnRemoveImage').style.display = 'none';
  }

  async saveEjercicio() {
    const form = document.getElementById('formEjercicio');
    const nombre = document.getElementById('nombre').value.trim();
    const imagenFile = document.getElementById('imagen').files[0];
    const errors = [];

    if (!nombre) {
      errors.push('El nombre del ejercicio es requerido');
    } else if (nombre.length < 3) {
      errors.push('El nombre debe tener al menos 3 caracteres');
    }

    if (imagenFile) {
      if (!imagenFile.type.startsWith('image/')) {
        errors.push('El archivo debe ser una imagen (JPG, PNG, GIF, WEBP)');
      }
      if (imagenFile.size > 5 * 1024 * 1024) {
        errors.push('La imagen no debe superar los 5MB');
      }
    }

    if (errors.length > 0) {
      Swal.fire({ icon: 'warning', title: 'Validación', html: errors.join('<br>') });
      return;
    }

    const formData = new FormData(form);

    try {
      const token = secureStorage.getToken();
      const url = this.currentEjercicio 
        ? `${API_URL}/api/ejercicios/${this.currentEjercicio.id_ejercicio}`
        : `${API_URL}/api/ejercicios`;
      
      const method = this.currentEjercicio ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al guardar ejercicio');
      }

      Swal.fire('Éxito', data.message, 'success');
      this.hideModal();
      await this.loadEjercicios();
      this.renderView();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', error.message, 'error');
    }
  }

  async editEjercicio(id) {
    const ejercicio = this.ejercicios.find(e => e.id_ejercicio === id);
    if (ejercicio) {
      this.showModal(ejercicio);
    }
  }

  async deleteEjercicio(id) {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Este ejercicio se desactivará',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const token = secureStorage.getToken();
        const response = await fetch(`${API_URL}/api/ejercicios/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Error al eliminar ejercicio');
        }

        Swal.fire('Éxito', data.message, 'success');
        await this.loadEjercicios();
        this.renderView();
      } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', error.message, 'error');
      }
    }
  }

  async reactivateEjercicio(id) {
    try {
      const token = secureStorage.getToken();
      const response = await fetch(`${API_URL}/api/ejercicios/${id}/reactivate`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al reactivar');
      Swal.fire('Exito', 'Ejercicio reactivado', 'success');
      await this.loadEjercicios();
      this.renderView();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }

  async viewEjercicio(id) {
    const ejercicio = this.ejercicios.find(e => e.id_ejercicio === id);
    if (!ejercicio) return;

    const modal = document.getElementById('modalDetalleEjercicio');
    const detalleContainer = document.getElementById('ejercicioDetalle');
    const title = document.getElementById('detalleTitle');

    title.textContent = ejercicio.nombre;
    detalleContainer.innerHTML = `
      <div class="ejercicio-detalle-content">
        ${ejercicio.imagen_url 
          ? `<div class="ejercicio-imagen-grande">
              <img src="${ejercicio.imagen_url}" alt="${ejercicio.nombre}">
             </div>`
          : '<div class="ejercicio-no-imagen"><i class="fas fa-dumbbell fa-5x"></i></div>'}
        
        <div class="ejercicio-descripcion">
          <h4>Descripción</h4>
          <p>${ejercicio.descripcion || 'Sin descripción disponible'}</p>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  filterEjercicios(searchTerm) {
    const term = searchTerm.toLowerCase();
    const filteredEjercicios = this.ejercicios.filter(e => 
      e.nombre.toLowerCase().includes(term) || 
      (e.descripcion && e.descripcion.toLowerCase().includes(term))
    );

    const prevEjercicios = this.ejercicios;
    this.ejercicios = filteredEjercicios;

    if (this.isTrainer) {
      document.getElementById('ejerciciosGrid').innerHTML = this.renderEjerciciosCards();
    } else {
      document.getElementById('ejerciciosList').innerHTML = this.renderEjerciciosList();
    }

    this.ejercicios = prevEjercicios;
  }

  truncate(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
}

// Instancia global
const ejerciciosManager = new EjerciciosManager();
