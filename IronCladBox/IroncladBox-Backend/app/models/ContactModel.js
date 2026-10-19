// Modelo para contacto
class ContactModel {
  constructor() {
    this.contacts = []; // Almacena los mensajes de contacto
  }

  // Guardar mensaje de contacto
  saveContact(contactData) {
    const newContact = {
      id: this.contacts.length + 1,
      ...contactData,
      date: new Date(),
      status: 'pending'
    };
    this.contacts.push(newContact);
    return newContact;
  }

  // Obtener todos los contactos
  getAllContacts() {
    return this.contacts;
  }

  // Obtener contacto por ID
  getContactById(id) {
    return this.contacts.find(c => c.id === parseInt(id));
  }

  // Actualizar estado del contacto
  updateContactStatus(id, status) {
    const contact = this.getContactById(id);
    if (contact) {
      contact.status = status;
      return contact;
    }
    return null;
  }
}

module.exports = new ContactModel();
