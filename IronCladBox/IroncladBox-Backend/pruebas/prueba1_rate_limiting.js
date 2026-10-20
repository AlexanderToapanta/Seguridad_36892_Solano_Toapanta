/**
 * PRUEBA 1 (Verificación Automatizada):
 * Verificación de Ausencia de Rate Limiting en /api/auth/login
 * 
 * Objetivo:
 * Comprobar si el endpoint de autenticación permite ráfagas consecutivas de
 * credenciales erróneas sin aplicar limitación de tasa (HTTP 429 Too Many Requests),
 * lo que facilita ataques de fuerza bruta y agotamiento de recursos.
 */

const http = require('http');

async function sendLoginAttempt(i) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      email: `test_bruteforce_${i}@ironcladbox.com`,
      password: 'WrongPassword123!'
    });

    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, index: i });
      });
    });

    req.on('error', (err) => {
      resolve({ error: err.message, index: i });
    });

    req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log('=== [PRUEBA 1] Verificación de Rate Limiting en /api/auth/login ===');
  console.log('Enviando ráfaga de 15 intentos consecutivos de login...');

  const attempts = 15;
  const results = [];

  for (let i = 1; i <= attempts; i++) {
    const res = await sendLoginAttempt(i);
    results.push(res);
  }

  const statusCounts = results.reduce((acc, curr) => {
    acc[curr.status || 'ERROR'] = (acc[curr.status || 'ERROR'] || 0) + 1;
    return acc;
  }, {});

  console.log('Resultados por código de estado HTTP:', statusCounts);

  if (statusCounts['429']) {
    console.log('✅ Rate limiting DETECTADO: El servidor bloqueó intentos tras un umbral.');
  } else if (statusCounts['401'] === attempts || statusCounts['400'] === attempts) {
    console.log('❌ VULNERABILIDAD CONFIRMADA: Las 15 peticiones fueron procesadas (HTTP 401/400).');
    console.log('   No existe middleware (como express-rate-limit) protegiendo el endpoint.');
  } else {
    console.log('ℹ️ No se pudo conectar al servidor o resultado no concluyente:', results[0]);
  }
}

runTest();
