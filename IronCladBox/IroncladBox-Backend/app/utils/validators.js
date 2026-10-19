const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#.])[A-Za-z\d@$!%*?&_\-#.]{8,128}$/;

function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'El email es requerido';
  if (!EMAIL_REGEX.test(email.trim())) return 'Formato de email inválido';
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'La contraseña es requerida';
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (password.length > 128) return 'La contraseña no debe exceder 128 caracteres';
  if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una mayúscula';
  if (!/[a-z]/.test(password)) return 'La contraseña debe contener al menos una minúscula';
  if (!/\d/.test(password)) return 'La contraseña debe contener al menos un número';
  if (!/[@$!%*?&_\-#.]/.test(password)) return 'La contraseña debe contener al menos un símbolo (@$!%*?&_-#.)';
  return null;
}

function validatePhone(phone) {
  if (phone === undefined || phone === null || phone === '') return null;
  if (typeof phone !== 'string') return 'Formato de teléfono inválido';
  if (!PHONE_REGEX.test(phone.trim())) return 'Formato de teléfono inválido (7-20 dígitos, permite +, -, espacios)';
  return null;
}

function validateNotEmpty(value, fieldName) {
  if (value === undefined || value === null) return `${fieldName} es requerido`;
  if (typeof value === 'string' && value.trim() === '') return `${fieldName} no puede estar vacío`;
  return null;
}

function validateMaxLength(value, max, fieldName) {
  if (typeof value === 'string' && value.trim().length > max) {
    return `${fieldName} no debe exceder ${max} caracteres`;
  }
  return null;
}

function validatePositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === '') return `${fieldName} es requerido`;
  const num = parseInt(value, 10);
  if (isNaN(num) || num <= 0) return `${fieldName} debe ser un número positivo`;
  return null;
}

function validatePositiveDecimal(value, fieldName, max) {
  if (value === undefined || value === null || value === '') return `${fieldName} es requerido`;
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return `${fieldName} debe ser un número positivo`;
  if (max !== undefined && num > max) return `${fieldName} no debe exceder ${max}`;
  return null;
}

function validateDate(value, fieldName, options = {}) {
  if (!value) return `${fieldName} es requerida`;
  const date = new Date(value);
  if (isNaN(date.getTime())) return `${fieldName} no es una fecha válida`;
  if (options.notFuture) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) return `${fieldName} no puede ser una fecha futura`;
  }
  if (options.notPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return `${fieldName} no puede ser una fecha pasada`;
  }
  if (options.minAge) {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate()) ? age - 1 : age;
    if (actualAge < options.minAge) return `La edad mínima es ${options.minAge} años`;
  }
  if (options.maxAge) {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate()) ? age - 1 : age;
    if (actualAge > options.maxAge) return `La edad máxima es ${options.maxAge} años`;
  }
  return null;
}

function validateWeightPeso(peso) {
  if (peso === undefined || peso === null || peso === '') return null;
  const num = parseFloat(peso);
  if (isNaN(num)) return 'El peso debe ser un número válido';
  if (num <= 0 || num > 500) return 'El peso debe estar entre 1 y 500 kg';
  return null;
}

function validateHeightAltura(altura) {
  if (altura === undefined || altura === null || altura === '') return null;
  const num = parseFloat(altura);
  if (isNaN(num)) return 'La altura debe ser un número válido';
  if (num <= 0 || num > 3) return 'La altura debe estar entre 0.01 y 3.00 metros';
  return null;
}

function validateIdParam(id) {
  if (!id) return 'ID es requerido';
  const num = parseInt(id, 10);
  if (isNaN(num) || num <= 0) return 'ID debe ser un número entero positivo';
  return null;
}

function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/<[^>]*>/g, '');
}

function validateHorariosArray(horarios) {
  if (!horarios || !Array.isArray(horarios) || horarios.length === 0) {
    return 'Se requiere al menos un horario';
  }
  for (const h of horarios) {
    const horaErr = validateNotEmpty(h.hora, 'hora del horario');
    if (horaErr) return horaErr;
    const cupoErr = validatePositiveInt(h.cupo_maximo, 'cupo_maximo del horario');
    if (cupoErr) return cupoErr;
  }
  return null;
}

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateNotEmpty,
  validateMaxLength,
  validatePositiveInt,
  validatePositiveDecimal,
  validateDate,
  validateWeightPeso,
  validateHeightAltura,
  validateIdParam,
  sanitizeString,
  validateHorariosArray,
  EMAIL_REGEX,
  PHONE_REGEX
};
