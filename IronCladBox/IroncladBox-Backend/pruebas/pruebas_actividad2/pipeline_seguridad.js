
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const BACKEND_DIR = path.resolve(__dirname, '..', '..');

// ============================================================================
// 1. ANÁLISIS DE DEPENDENCIAS (SCA)
// ============================================================================
function runSCA() {
  console.log('\n=============================================================');
  console.log(' [FASE 1] Análisis de Dependencias (SCA) con npm audit');
  console.log('=============================================================');

  try {
    const output = execSync('npm audit --json', { cwd: BACKEND_DIR, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const auditData = JSON.parse(output);
    const vulns = auditData.metadata ? auditData.metadata.vulnerabilities : {};

    console.log('Resumen de Vulnerabilidades encontradas:');
    console.log(` - Critical: ${vulns.critical || 0}`);
    console.log(` - High:     ${vulns.high || 0}`);
    console.log(` - Moderate: ${vulns.moderate || 0}`);
    console.log(` - Low:      ${vulns.low || 0}`);

    const hasHighOrCritical = (vulns.critical || 0) > 0 || (vulns.high || 0) > 0;
    return {
      status: hasHighOrCritical ? 'FAIL' : 'PASS',
      summary: vulns,
      details: 'Evaluación de CVEs en dependencias directas e indirectas'
    };
  } catch (error) {
    if (error.stdout) {
      try {
        const auditData = JSON.parse(error.stdout);
        const vulns = auditData.metadata ? auditData.metadata.vulnerabilities : {};
        console.log('Resumen de Vulnerabilidades encontradas (Alerta):');
        console.log(` - Critical: ${vulns.critical || 0}`);
        console.log(` - High:     ${vulns.high || 0}`);
        console.log(` - Moderate: ${vulns.moderate || 0}`);
        console.log(` - Low:      ${vulns.low || 0}`);

        const hasHighOrCritical = (vulns.critical || 0) > 0 || (vulns.high || 0) > 0;
        return {
          status: hasHighOrCritical ? 'FAIL' : 'PASS',
          summary: vulns,
          details: 'Vulnerabilidades detectadas mediante npm audit'
        };
      } catch (parseErr) {
        console.log('⚠️ Salida no JSON de npm audit');
      }
    }
    return { status: 'WARN', summary: {}, details: 'No se pudo parsear el resultado de npm audit' };
  }
}

// ============================================================================
// 2. PRUEBA DINÁMICA 1: Escalada Vertical (BFLA) Atleta -> Admin
// ============================================================================
async function runTestBFLA() {
  console.log('\n=============================================================');
  console.log(' [FASE 2] Prueba 1: Escalada Vertical de Privilegios (BFLA)');
  console.log(' Target: GET /api/admin/athletes');
  console.log('=============================================================');

  const secretKey = process.env.JWT_SECRET || 'ironcladbox_jwt_secret_key_2024';
  const tokenAtleta = jwt.sign(
    { id_usuario: 999, email: 'atleta_test@ironcladbox.com', rol: 'ATLETA' },
    secretKey,
    { expiresIn: '1h' }
  );

  try {
    const res = await axios.get(`${BASE_URL}/api/admin/athletes`, {
      headers: { Authorization: `Bearer ${tokenAtleta}` },
      validateStatus: () => true
    });

    console.log(`Código HTTP obtenido: ${res.status}`);

    if (res.status === 403 || res.status === 401) {
      console.log('✅ PASS: El middleware bloqueó correctamente al usuario sin privilegios.');
      return { status: 'PASS', code: res.status };
    } else if (res.status === 200) {
      console.log('❌ FAIL: Vulnerabilidad BFLA confirmada. Atleta accedió a datos de administrador.');
      return { status: 'FAIL', code: res.status };
    } else {
      console.log(`ℹ️ INFO: Código de respuesta HTTP ${res.status}`);
      return { status: 'WARN', code: res.status };
    }
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    return { status: 'ERROR', message: err.message };
  }
}

// ============================================================================
// 3. PRUEBA DINÁMICA 2: Inyección y Validación de Tipos en Parámetros :id
// ============================================================================
async function runTestParamValidation() {
  console.log('\n=============================================================');
  console.log(' [FASE 3] Prueba 2: Inyección de Parámetros y Validación de Tipos');
  console.log(' Target: GET /api/classes/:id');
  console.log('=============================================================');

  const payloads = [
    { name: 'Inyección SQL con comilla', value: '%27%20OR%201=1--' },
    { name: 'Identificador alfanumérico', value: 'clase_invalida_abc' }
  ];

  let pass = true;

  for (const item of payloads) {
    try {
      const res = await axios.get(`${BASE_URL}/api/classes/${item.value}`, {
        validateStatus: () => true
      });

      console.log(`Enviando [${item.name}]: /api/classes/${item.value}`);
      console.log(`Respuesta: HTTP ${res.status}`);

      const bodyStr = JSON.stringify(res.data || '');
      const hasDbLeak = /syntax error|invalid input syntax|postgresql|pg_/i.test(bodyStr);

      if (res.status === 500 || hasDbLeak) {
        console.log('❌ FAIL: Se generó HTTP 500 o hubo fuga de error interno de PostgreSQL.');
        pass = false;
      } else if (res.status === 400 || res.status === 404) {
        console.log(`✅ PASS: Entrada rechazada de forma controlada (HTTP ${res.status}).`);
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err.message);
      pass = false;
    }
  }

  return { status: pass ? 'PASS' : 'FAIL' };
}

// ============================================================================
// 4. PRUEBA DINÁMICA 3: Ausencia de Cabeceras de Seguridad HTTP
// ============================================================================
async function runTestSecurityHeaders() {
  console.log('\n=============================================================');
  console.log(' [FASE 4] Prueba 3: Verificación de Cabeceras de Seguridad HTTP');
  console.log(' Target: GET / (página principal)');
  console.log('=============================================================');

  const requiredHeaders = [
    { name: 'X-Content-Type-Options', expected: 'nosniff' },
    { name: 'X-Frame-Options', expected: 'SAMEORIGIN' },
    { name: 'X-XSS-Protection', expected: '0' }
  ];

  let pass = true;

  try {
    const res = await axios.get(`${BASE_URL}/`, {
      validateStatus: () => true
    });

    console.log(`Respuesta del servidor: HTTP ${res.status}`);
    console.log('Cabeceras de seguridad evaluadas:');

    for (const header of requiredHeaders) {
      const value = res.headers[header.name.toLowerCase()];
      if (value) {
        console.log(`  ✅ ${header.name}: ${value}`);
      } else {
        console.log(`  ❌ ${header.name}: AUSENTE (se esperaba "${header.expected}")`);
        pass = false;
      }
    }

    if (pass) {
      console.log('✅ PASS: Todas las cabeceras de seguridad están presentes.');
    } else {
      console.log('❌ FAIL: Faltan cabeceras de seguridad HTTP. No se utiliza helmet ni configuración manual.');
    }
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    pass = false;
  }

  return { status: pass ? 'PASS' : 'FAIL' };
}

// ============================================================================
// ORQUESTADOR DEL PIPELINE UNIFICADO
// ============================================================================
async function runSecurityPipeline() {
  const startTime = new Date();
  console.log('=============================================================');
  console.log(' INICIANDO PIPELINE UNIFICADO DE SEGURIDAD (IRONCLADBOX)');
  console.log(` Fecha/Hora: ${startTime.toISOString()}`);
  console.log('=============================================================');

  const scaResult = runSCA();
  const test1Result = await runTestBFLA();
  const test2Result = await runTestParamValidation();
  const test3Result = await runTestSecurityHeaders();

  console.log('\n=============================================================');
  console.log(' RESUMEN FINAL DEL PIPELINE');
  console.log('=============================================================');
  console.log(`1. Análisis SCA (npm audit):             [${scaResult.status}]`);
  console.log(`2. Prueba 1: BFLA (Atleta -> Admin):     [${test1Result.status}]`);
  console.log(`3. Prueba 2: Validación Parámetro :id:   [${test2Result.status}]`);
  console.log(`4. Prueba 3: Cabeceras de Seguridad:     [${test3Result.status}]`);

  const report = {
    timestamp: startTime.toISOString(),
    results: {
      sca: scaResult,
      test_bfla: test1Result,
      test_param_injection: test2Result,
      test_security_headers: test3Result
    }
  };

  // Guardar evidencia automática (Punto 5)
  const reportsDir = path.join(BACKEND_DIR, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportPath = path.join(reportsDir, 'pipeline_report_latest.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📁 Evidencia del pipeline guardada en: ${reportPath}`);

  // Criterio de Falla del Pipeline (Punto 5)
  const dynamicTestsPassed = (test1Result.status === 'PASS') &&
    (test2Result.status === 'PASS') &&
    (test3Result.status === 'PASS');

  if (!dynamicTestsPassed) {
    console.log('\n❌ RESULTADO FINAL: PIPELINE FALLIDO (Existen pruebas de seguridad en FAIL)');
    process.exitCode = 1;
  } else {
    console.log('\n✅ RESULTADO FINAL: PIPELINE EXITOSO (Todas las pruebas dinámicas pasaron)');
    process.exitCode = 0;
  }
}

runSecurityPipeline();
