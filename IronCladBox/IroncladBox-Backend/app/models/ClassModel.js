// Modelo para las clases de CrossFit
class ClassModel {
  constructor() {
    // Simulación de base de datos en memoria
    this.classes = [
      {
        id: 1,
        name: 'CrossFit Fundamentals',
        description: 'Clase introductoria para aprender los movimientos básicos del CrossFit',
        duration: '60 minutos',
        level: 'Principiante',
        maxCapacity: 15,
        schedule: [
          { day: 'Lunes', time: '07:00' },
          { day: 'Miércoles', time: '07:00' },
          { day: 'Viernes', time: '07:00' }
        ]
      },
      {
        id: 2,
        name: 'CrossFit WOD',
        description: 'Workout of the Day - Entrenamiento intenso del día',
        duration: '60 minutos',
        level: 'Intermedio/Avanzado',
        maxCapacity: 20,
        schedule: [
          { day: 'Lunes', time: '09:00' },
          { day: 'Martes', time: '09:00' },
          { day: 'Miércoles', time: '09:00' },
          { day: 'Jueves', time: '09:00' },
          { day: 'Viernes', time: '09:00' }
        ]
      },
      {
        id: 3,
        name: 'Olympic Lifting',
        description: 'Técnica de levantamiento olímpico: Clean, Jerk, Snatch',
        duration: '90 minutos',
        level: 'Avanzado',
        maxCapacity: 10,
        schedule: [
          { day: 'Martes', time: '18:00' },
          { day: 'Jueves', time: '18:00' }
        ]
      },
      {
        id: 4,
        name: 'CrossFit Kids',
        description: 'CrossFit adaptado para niños de 8 a 14 años',
        duration: '45 minutos',
        level: 'Principiante',
        maxCapacity: 12,
        schedule: [
          { day: 'Martes', time: '16:00' },
          { day: 'Jueves', time: '16:00' },
          { day: 'Sábado', time: '10:00' }
        ]
      },
      {
        id: 5,
        name: 'Mobility & Recovery',
        description: 'Clase de movilidad y recuperación muscular',
        duration: '45 minutos',
        level: 'Todos los niveles',
        maxCapacity: 15,
        schedule: [
          { day: 'Miércoles', time: '19:00' },
          { day: 'Sábado', time: '09:00' }
        ]
      }
    ];
  }

  // Obtener todas las clases
  getAllClasses() {
    return this.classes;
  }

  // Obtener clase por ID
  getClassById(id) {
    return this.classes.find(cls => cls.id === parseInt(id));
  }

  // Obtener clases por nivel
  getClassesByLevel(level) {
    return this.classes.filter(cls => cls.level === level);
  }

  // Crear nueva clase
  createClass(classData) {
    const newClass = {
      id: this.classes.length + 1,
      ...classData
    };
    this.classes.push(newClass);
    return newClass;
  }
}

module.exports = new ClassModel();
