// src/modules/benchSales/models/formTemplateModel.js

export const FieldTypes = {
  TEXT: 'text',
  EMAIL: 'email',
  PHONE: 'phone',
  SELECT: 'select',
  TEXTAREA: 'textarea',
  CHECKBOX: 'checkbox',
  DATE: 'date',
  FILE: 'file'
};

export class FormField {
  constructor(data = {}) {
    this.id = data.id || Date.now().toString();
    this.label = data.label || '';
    this.type = data.type || FieldTypes.TEXT;
    this.required = data.required || false;
    this.placeholder = data.placeholder || '';
    this.options = data.options || []; // For select fields
    this.validation = data.validation || {};
    this.order = data.order || 0;
  }
}

export class FormTemplate {
  constructor(data = {}) {
    this.id = data.id || Date.now().toString();
    this.name = data.name || 'Untitled Form';
    this.description = data.description || '';
    this.fields = data.fields || this.getDefaultFields();
    this.createdDate = data.createdDate || new Date().toISOString();
    this.modifiedDate = data.modifiedDate || new Date().toISOString();
    this.isDefault = data.isDefault || false;
  }

  getDefaultFields() {
    return [
      new FormField({
        label: 'Full Name',
        type: FieldTypes.TEXT,
        required: true,
        order: 1
      }),
      new FormField({
        label: 'Email',
        type: FieldTypes.EMAIL,
        required: true,
        order: 2
      }),
      new FormField({
        label: 'Phone',
        type: FieldTypes.PHONE,
        required: true,
        order: 3
      }),
      new FormField({
        label: 'LinkedIn Profile',
        type: FieldTypes.TEXT,
        required: true,
        placeholder: 'https://linkedin.com/in/...',
        order: 4
      }),
      new FormField({
        label: 'Current Location',
        type: FieldTypes.TEXT,
        required: false,
        order: 5
      }),
      new FormField({
        label: 'Visa Status',
        type: FieldTypes.SELECT,
        required: true,
        options: ['H1B', 'OPT-EAD', 'GC-EAD', 'Green Card', 'US Citizen'],
        order: 6
      }),
      new FormField({
        label: 'Years of Experience',
        type: FieldTypes.SELECT,
        required: true,
        options: ['0-2 years', '2-5 years', '5-8 years', '8-10 years', '10+ years'],
        order: 7
      }),
      new FormField({
        label: 'Skills',
        type: FieldTypes.TEXTAREA,
        required: true,
        placeholder: 'List your technical skills separated by commas',
        order: 8
      }),
      new FormField({
        label: 'Education',
        type: FieldTypes.SELECT,
        required: true,
        options: ['High School', 'Associate', 'Bachelor', 'Master', 'PhD'],
        order: 9
      })
    ];
  }
}

export class FormSubmission {
  constructor(data = {}) {
    this.id = data.id || Date.now().toString();
    this.token = data.token || this.generateToken();
    this.caseId = data.caseId;
    this.templateId = data.templateId;
    this.candidateEmail = data.candidateEmail;
    this.status = data.status || 'pending'; // pending, completed, expired
    this.sentDate = data.sentDate || new Date().toISOString();
    this.completedDate = data.completedDate || null;
    this.expiryDate = data.expiryDate || this.getExpiryDate();
    this.responses = data.responses || {};
    this.remindersSent = data.remindersSent || 0;
  }

  generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  getExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7); // 7 days expiry
    return date.toISOString();
  }
}