describe('Pruebas E2E - IronCladBox', () => {
  const adminEmail = 'admin@crossfit.com';
  const adminPassword = 'admin123';
  const passwordValida = 'Admin123@';

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window().then((win) => win.sessionStorage.clear());
  });

  it('CP01 - Carga de página principal', () => {
    cy.visit('/', { timeout: 120000, failOnStatusCode: false });

    cy.contains('IRONCLADBOX').should('be.visible');
    cy.contains('SOBRE NOSOTROS').should('be.visible');
    cy.contains('NUESTRAS CLASES').should('be.visible');
    cy.contains('MEMBRESÍAS').should('be.visible');
    cy.contains('CONTÁCTANOS').should('be.visible');
  });

  it('CP02 - Navegación al login', () => {
    cy.visit('/', { timeout: 120000, failOnStatusCode: false });

    cy.get('a[href="/login"]').click();

    cy.url().should('include', '/login');
    cy.get('#loginForm').should('be.visible');
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
  });

  it('CP03 - Login correcto con administrador', () => {
    cy.visit('/login');

    cy.get('#email').type(adminEmail);
    cy.get('#password').type(adminPassword);
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 15000 }).should('include', '/dashboard');
    cy.get('#sidebar').should('be.visible');
    cy.get('#contentArea').should('be.visible');
  });

  it('CP04 - Login incorrecto', () => {
    cy.visit('/login');

    cy.get('#email').type('usuario_incorrecto@test.com');
    cy.get('#password').type('claveincorrecta');
    cy.get('button[type="submit"]').click();

    cy.get('#loginMessage', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.empty');
  });

  it('CP05 - Registro correcto de atleta', () => {
    const atletaEmail = `atleta_test_${Date.now()}@correo.com`;

    cy.visit('/register', { timeout: 120000, failOnStatusCode: false });

    cy.get('#nombre').type('Atleta');
    cy.get('#apellido').type('Prueba');
    cy.get('#email').type(atletaEmail);
    cy.get('#telefono').type('0999999999');
    cy.get('#password').type(passwordValida);
    cy.get('#confirmPassword').type(passwordValida);
    cy.get('#peso').type('75');
    cy.get('#altura').type('1.75');

    cy.get('#membershipCards .membership-card', { timeout: 15000 })
      .should('have.length.greaterThan', 0)
      .first()
      .click();

    cy.get('#id_membresia').should('not.have.value', '');

    cy.get('button[type="submit"]').click();

    cy.get('#registerMessage', { timeout: 15000 })
      .should('be.visible')
      .and('not.be.empty');
  });

  it('CP06 - Registro vacío valida campos requeridos', () => {
    cy.visit('/register', { timeout: 120000, failOnStatusCode: false });

    cy.get('button[type="submit"]').click();

    cy.get('#nombre').then(($input) => {
      expect($input[0].checkValidity()).to.eq(false);
    });
  });

  it('CP07 - Formulario de contacto correcto', () => {
    cy.visit('/', { timeout: 120000, failOnStatusCode: false });

    cy.get('#name').type('Josue Solano');
    cy.get('#email').type('josue@test.com');
    cy.get('#phone').type('0999999999');
    cy.get('#message').type('Deseo información sobre las membresías de IronCladBox.');

    cy.get('#contactForm button[type="submit"]').click();

    cy.get('#formMessage', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.empty');
  });

  it('CP08 - Formulario de contacto con correo inválido', () => {
    cy.visit('/', { timeout: 120000, failOnStatusCode: false });

    cy.get('#name').type('Josue Solano');
    cy.get('#email').type('correo_invalido');
    cy.get('#message').type('Mensaje válido de prueba');

    cy.get('#email').then(($input) => {
      expect($input[0].checkValidity()).to.eq(false);
    });
  });

  it('CP09 - Dashboard administrador', () => {
    cy.visit('/login');

    cy.get('#email').type(adminEmail);
    cy.get('#password').type(adminPassword);
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 15000 }).should('include', '/dashboard');

    cy.contains('Membresías', { timeout: 15000 }).should('be.visible');
    cy.contains('Entrenadores').should('be.visible');
    cy.contains('Atletas').should('be.visible');
    cy.contains('Ejercicios').should('be.visible');
  });

  it('CP10 - Cierre de sesión', () => {
    cy.visit('/login');

    cy.get('#email').type(adminEmail);
    cy.get('#password').type(adminPassword);
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 15000 }).should('include', '/dashboard');

    cy.get('#logoutBtn').click();

    cy.url({ timeout: 15000 }).should('include', '/login');
  });
});