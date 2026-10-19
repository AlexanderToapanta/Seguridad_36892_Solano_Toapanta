// ===============================================
// MAIN.JS - IroncladBox CrossFit
// ===============================================

// Navegacion
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');

// Cambiar estilo del navbar al hacer scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Toggle menu movil
hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Cerrar menu al hacer click en un link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// ===============================================
// CARGAR STATS DESDE API
// ===============================================
const loadAboutStats = async () => {
    try {
        const response = await fetch(`${API_URL}/api/public/stats`);
        const data = await response.json();
        if (data.success && data.data) {
            const s = data.data;
            const animateCount = (elId, value) => {
                const el = document.getElementById(elId);
                if (!el) return;
                let current = 0;
                const target = value || 0;
                const increment = target / 120;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) { el.textContent = target; clearInterval(timer); }
                    else { el.textContent = Math.floor(current); }
                }, 16);
            };
            animateCount('statAthletes', s.totalAthletes);
            animateCount('statActive', s.activeAthletes);
            animateCount('statTrainers', s.totalTrainers);
            animateCount('statWods', s.totalWODs);
            animateCount('statMemberships', s.totalMemberships);
        }
    } catch (e) {
        console.error('Error cargando stats:', e);
    }
};

// ===============================================
// CARGAR CLASES DESDE API
// ===============================================
const loadClasses = async () => {
    const classesGrid = document.getElementById('classesGrid');
    
    try {
        const response = await fetch(`${API_URL}/api/classes/available`);
        const data = await response.json();
        
        if (data.success) {
            classesGrid.innerHTML = '';
            data.data.forEach(classItem => {
                const classCard = createClassCard(classItem);
                classesGrid.innerHTML += classCard;
            });
        } else {
            classesGrid.innerHTML = '<p class="error">Error al cargar las clases</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        classesGrid.innerHTML = '<p class="error">Error al cargar las clases</p>';
    }
};

const createClassCard = (classData) => {
    const name = classData.nombre || classData.name || 'Sin nombre';
    const description = classData.descripcion || classData.description || 'Sin descripcion';
    const duration = classData.duracion || classData.duration || 60;
    const maxCapacity = classData.capacidad_maxima || classData.cupo_maximo || classData.maxCapacity || 20;
    const entrenador = classData.entrenador_nombre || 'Entrenador';
    
    let scheduleInfo = '';
    if (classData.fecha && classData.hora) {
        const fecha = new Date(classData.fecha);
        const dias = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        scheduleInfo = `
            <div class="schedule-item">
                <span>${dias[fecha.getDay()]}, ${fecha.getDate()} ${meses[fecha.getMonth()]}</span>
                <span>${classData.hora}</span>
            </div>
        `;
    }

    return `
        <div class="class-card">
            <div class="class-header">
                <h3>${name}</h3>
                <p class="class-level">${entrenador}</p>
            </div>
            <div class="class-body">
                <p>${description}</p>
                <div class="class-info">
                    <div class="class-info-item">
                        <i class="fas fa-clock"></i>
                        <span>${duration} min</span>
                    </div>
                    <div class="class-info-item">
                        <i class="fas fa-users"></i>
                        <span>Max. ${maxCapacity} personas</span>
                    </div>
                </div>
                ${scheduleInfo ? `<div class="class-schedule">
                    <h4>Proxima clase:</h4>
                    ${scheduleInfo}
                </div>` : ''}
            </div>
        </div>
    `;
};

// ===============================================
// CARGAR ENTRENADORES DESDE API
// ===============================================
const loadTrainers = async () => {
    const trainersGrid = document.getElementById('trainersGrid');
    
    try {
        const response = await fetch(`${API_URL}/api/trainers`);
        const data = await response.json();
        
        if (data.success) {
            trainersGrid.innerHTML = '';
            data.data.forEach(trainer => {
                const trainerCard = createTrainerCard(trainer);
                trainersGrid.innerHTML += trainerCard;
            });
        } else {
            trainersGrid.innerHTML = '<p class="error">Error al cargar los entrenadores</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        trainersGrid.innerHTML = '<p class="error">Error al cargar los entrenadores</p>';
    }
};

const createTrainerCard = (trainer) => {
    const name = `${trainer.nombre || ''} ${trainer.apellido || ''}`.trim() || trainer.name || 'Entrenador';
    const especialidad = trainer.especialidad || trainer.specialty || 'CrossFit';
    const experiencia = trainer.anios_experiencia || trainer.experience || '0';
    
    let specialties = [];
    if (typeof especialidad === 'string') {
        specialties = especialidad.split(',').map(s => s.trim());
    } else if (Array.isArray(especialidad)) {
        specialties = especialidad;
    } else if (Array.isArray(trainer.specialties)) {
        specialties = trainer.specialties;
    }
    
    const specialtiesHTML = specialties.length > 0 ? 
        specialties.map(s => `<span class="specialty-tag">${s}</span>`).join('') :
        `<span class="specialty-tag">${especialidad}</span>`;

    let certificaciones = [];
    if (typeof trainer.certificaciones === 'string') {
        certificaciones = trainer.certificaciones.split(',').map(c => c.trim());
    } else if (Array.isArray(trainer.certifications)) {
        certificaciones = trainer.certifications;
    }
    
    const certificationsHTML = certificaciones.length > 0 ? 
        certificaciones.join(' - ') : 
        trainer.certificaciones || 'Certificado';
    
    const biografia = trainer.biografia || trainer.bio || 'Entrenador certificado';
    const fotoPerfil = trainer.foto_perfil || '/img/default-avatar.png';

    return `
        <div class="trainer-card">
            <div class="trainer-image">
                <img src="${fotoPerfil}" alt="${name}" onerror="this.src='/img/default-avatar.png'">
            </div>
            <div class="trainer-info">
                <h3>${name}</h3>
                <p class="trainer-role">${experiencia} anios de experiencia</p>
                <p>${biografia}</p>
                <div class="trainer-specialties">
                    ${specialtiesHTML}
                </div>
                <p class="trainer-certifications">
                    <strong>Certificaciones:</strong><br>
                    ${certificationsHTML}
                </p>
                <p><strong>Experiencia:</strong> ${trainer.experience}</p>
            </div>
        </div>
    `;
};

// ===============================================
// CARGAR MEMBRESIAS DESDE API
// ===============================================
const loadMemberships = async () => {
    const membershipsGrid = document.getElementById('membershipsGrid');
    
    try {
        const response = await fetch(`${API_URL}/api/members/memberships`);
        const data = await response.json();
        
        if (data.success) {
            membershipsGrid.innerHTML = '';
            data.data.forEach(membership => {
                const membershipCard = createMembershipCard(membership);
                membershipsGrid.innerHTML += membershipCard;
            });
        } else {
            membershipsGrid.innerHTML = '<p class="error">Error al cargar las membresias</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        membershipsGrid.innerHTML = '<p class="error">Error al cargar las membresias</p>';
    }
};

const createMembershipCard = (membership) => {
    let benefits = [];
    if (typeof membership.beneficios === 'string') {
        benefits = membership.beneficios.split(',').map(b => b.trim());
    } else if (Array.isArray(membership.beneficios)) {
        benefits = membership.beneficios;
    } else if (Array.isArray(membership.benefits)) {
        benefits = membership.benefits;
    }

    const benefitsHTML = benefits.map(b => 
        `<li><i class="fas fa-check-circle"></i>${b}</li>`
    ).join('');

    const isPopular = membership.nombre?.toLowerCase().includes('premium') || 
                      membership.name?.toLowerCase().includes('premium');
    
    const popularBadge = isPopular ? 
        '<div class="popular-badge">MAS POPULAR</div>' : '';

    const cardClass = isPopular ? 'membership-card popular' : 'membership-card';

    const name = membership.nombre || membership.name || 'Sin nombre';
    const price = membership.precio || membership.price || '0';
    const period = membership.duracion_dias === 1 ? 'dia' : 
                   membership.duracion_dias <= 31 ? 'mes' : 
                   membership.period || 'mes';

    return `
        <div class="${cardClass}">
            ${popularBadge}
            <h3>${name}</h3>
            <div class="membership-price">
                <span class="price">$${price}</span>
                <p class="period">/ ${period}</p>
            </div>
            <ul class="membership-benefits">
                ${benefitsHTML}
            </ul>
            <a href="#contact" class="btn btn-primary">COMENZAR</a>
        </div>
    `;
};

// ===============================================
// FORMULARIO DE CONTACTO
// ===============================================
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const message = document.getElementById('message').value;

    if (!name || name.length < 2) {
        formMessage.textContent = 'El nombre debe tener al menos 2 caracteres';
        formMessage.className = 'form-message error';
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        formMessage.textContent = 'Formato de email inválido';
        formMessage.className = 'form-message error';
        return;
    }
    if (phone) {
        const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
        if (!/^\d{10}$/.test(cleaned)) {
            formMessage.textContent = 'El teléfono debe tener 10 dígitos';
            formMessage.className = 'form-message error';
            return;
        }
    }
    if (!message || message.trim().length < 10) {
        formMessage.textContent = 'El mensaje debe tener al menos 10 caracteres';
        formMessage.className = 'form-message error';
        return;
    }
    
    const formData = {
        name: name,
        email: email,
        phone: phone,
        message: message
    };
    
    try {
        const response = await fetch(`${API_URL}/api/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            formMessage.textContent = data.message;
            formMessage.className = 'form-message success';
            contactForm.reset();
            
            setTimeout(() => {
                formMessage.className = 'form-message';
            }, 5000);
        } else {
            formMessage.textContent = data.message;
            formMessage.className = 'form-message error';
        }
    } catch (error) {
        console.error('Error:', error);
        formMessage.textContent = 'Error al enviar el mensaje. Por favor intenta nuevamente.';
        formMessage.className = 'form-message error';
    }
});

// ===============================================
// SMOOTH SCROLL PARA NAVEGACION
// ===============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80;
            const targetPosition = target.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===============================================
// ANIMACIONES AL HACER SCROLL
// ===============================================
const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(20px)';
            entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
            
            fadeInObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1
});

const animateElements = document.querySelectorAll('.class-card, .trainer-card, .membership-card');
animateElements.forEach(el => {
    fadeInObserver.observe(el);
});

// ===============================================
// INICIALIZACION
// ===============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('IroncladBox CrossFit - Sistema iniciado');
    
    loadAboutStats();
    loadClasses();
    loadTrainers();
    loadMemberships();
    
    console.log('%cBienvenido a IroncladBox!', 'color: #FF3B30; font-size: 20px; font-weight: bold;');
    console.log('Tu journey comienza aqui');
});

// ===============================================
// MANEJO DE ERRORES GLOBAL
// ===============================================
window.addEventListener('error', (e) => {
    console.error('Error detectado:', e.error);
});
