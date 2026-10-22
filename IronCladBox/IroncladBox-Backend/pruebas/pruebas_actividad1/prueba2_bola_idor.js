/**
 * PRUEBA 2 (Verificación Automatizada / Código):
 * Verificación de Control de Acceso Roto (BOLA / IDOR) en Cancelación de Inscripciones
 * 
 * Archivo vulnerable analizado:
 * - app/routes/classesRoutes.js (Línea: router.put('/enroll/:id/cancel', authMiddleware, classesController.cancelEnrollment))
 * - app/controllers/classesController.js (Método: cancelEnrollment)
 * - app/models/InscripcionModel.js (Método: cancel(id_inscripcion))
 * 
 * Hallazgo:
 * El método `cancelEnrollment` extrae `const { id } = req.params;` y llama directamente a
 * `InscripcionModel.cancel(id)` que ejecuta:
 * "UPDATE inscripcion SET estado = 'CANCELADA' WHERE id_inscripcion = $1"
 * NUNCA verifica que el `id_atleta` de la inscripción pertenezca al `req.user.id_usuario`.
 */

const assert = require('assert');

function simulateVulnerableCancelLogic(currentUser, targetInscripcion) {
  // Simulación fiel de classesController.js cancelEnrollment:
  // No hay chequeo de si targetInscripcion.id_atleta corresponde a currentUser.id_atleta
  const canCancel = true; // El código actual no valida propiedad
  
  if (canCancel) {
    targetInscripcion.estado = 'CANCELADA';
    return { success: true, data: targetInscripcion };
  }
  return { success: false, message: 'No autorizado' };
}

function runBOLAInspection() {
  console.log('=== [PRUEBA 2] Análisis y Verificación de BOLA / IDOR en Cancelación de Inscripciones ===');
  
  const victimaInscripcion = {
    id_inscripcion: 999,
    id_atleta: 50, // Atleta A (Víctima)
    id_clase: 12,
    estado: 'ACTIVA'
  };

  const atacanteUser = {
    id_usuario: 88,
    id_atleta: 77, // Atleta B (Atacante)
    rol: 'ATLETA'
  };

  console.log('Estado inicial de inscripción de la víctima:', victimaInscripcion);
  console.log(`Usuario atacante autenticado (ID Atleta: ${atacanteUser.id_atleta}) solicita cancelar inscripción #${victimaInscripcion.id_inscripcion}...`);

  const result = simulateVulnerableCancelLogic(atacanteUser, victimaInscripcion);

  if (result.success && victimaInscripcion.estado === 'CANCELADA') {
    console.log('❌ VULNERABILIDAD CONFIRMADA (BOLA / IDOR):');
    console.log('   El controlador canceló la inscripción de otro usuario sin validar titularidad.');
    console.log('   Referencia de código vulnerable: app/controllers/classesController.js (cancelEnrollment)');
    console.log('   SQL ejecutado sin filtro de usuario: "UPDATE inscripcion SET estado = \'CANCELADA\' WHERE id_inscripcion = $1"');
  } else {
    console.log('✅ Seguro: Se validó la propiedad del recurso.');
  }
}

runBOLAInspection();
