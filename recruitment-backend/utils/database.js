// recruitment-backend/utils/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const dbPath = process.env.DATABASE_PATH || './recruitment.db';
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to database:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.initializeTables()
            .then(() => resolve(this.db))
            .catch(reject);
        }
      });
    });
  }

  initializeTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // ========== EXISTING TABLES ==========
        
        // OAuth tokens table
        this.db.run(`CREATE TABLE IF NOT EXISTS oauth_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT UNIQUE,
          provider TEXT,
          access_token TEXT,
          refresh_token TEXT,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) console.error('Error creating oauth_tokens table:', err);
        });

        // Forms table (MODIFIED - added template_id)
        this.db.run(`CREATE TABLE IF NOT EXISTS forms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT UNIQUE,
          template_id INTEGER,
          case_id TEXT,
          candidate_email TEXT,
          candidate_name TEXT,
          sender_email TEXT,
          fields TEXT,
          status TEXT DEFAULT 'pending',
          created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          sent_date DATETIME,
          opened_date DATETIME,
          completed_date DATETIME,
          response_data TEXT,
          email_message_id TEXT,
          email_thread_id TEXT,
          expires_at DATETIME
        )`, (err) => {
          if (err) console.error('Error creating forms table:', err);
        });

        // Email tracking table
        this.db.run(`CREATE TABLE IF NOT EXISTS email_tracking (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          form_token TEXT,
          message_id TEXT,
          thread_id TEXT,
          status TEXT DEFAULT 'sent',
          provider TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (form_token) REFERENCES forms(token)
        )`, (err) => {
          if (err) console.error('Error creating email_tracking table:', err);
        });

        // Activity log table
        this.db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id TEXT,
          form_token TEXT,
          action TEXT,
          description TEXT,
          user_email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) console.error('Error creating activity_logs table:', err);
        });

        // ========== NEW TABLES FOR FORM SYSTEM ==========
        
        // Form templates table
        this.db.run(`CREATE TABLE IF NOT EXISTS form_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          fields TEXT NOT NULL,
          created_by TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          is_default BOOLEAN DEFAULT 0,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) console.error('Error creating form_templates table:', err);
        });

        // Candidate responses table
        this.db.run(`CREATE TABLE IF NOT EXISTS candidate_responses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          form_token TEXT NOT NULL,
          template_id INTEGER,
          candidate_email TEXT,
          candidate_name TEXT,
          response_data TEXT NOT NULL,
          submission_ip TEXT,
          user_agent TEXT,
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT 0,
          processed_by TEXT,
          processed_at DATETIME,
          case_created BOOLEAN DEFAULT 0,
          case_id TEXT,
          notes TEXT,
          FOREIGN KEY (form_token) REFERENCES forms(token),
          FOREIGN KEY (template_id) REFERENCES form_templates(id)
        )`, (err) => {
          if (err) console.error('Error creating candidate_responses table:', err);
        });

        // Notifications table
        this.db.run(`CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT,
          message TEXT,
          data TEXT,
          priority TEXT DEFAULT 'normal',
          read BOOLEAN DEFAULT 0,
          read_at DATETIME,
          action_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) console.error('Error creating notifications table:', err);
        });

        // Form fields library table (for reusable fields)
        this.db.run(`CREATE TABLE IF NOT EXISTS field_library (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          field_name TEXT NOT NULL,
          field_type TEXT NOT NULL,
          field_label TEXT NOT NULL,
          field_options TEXT,
          validation_rules TEXT,
          placeholder TEXT,
          help_text TEXT,
          is_required BOOLEAN DEFAULT 0,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) console.error('Error creating field_library table:', err);
          
          // Create default form template after all tables are created
          this.createDefaultTemplate();
          resolve();
        });
      });
    });
  }

  // Create a default form template
  createDefaultTemplate() {
    const defaultTemplate = {
      name: 'Default Candidate Information Form',
      description: 'Standard form for collecting candidate information',
      fields: JSON.stringify([
        { id: 'name', label: 'Full Name', type: 'text', required: true, order: 1 },
        { id: 'email', label: 'Email', type: 'email', required: true, order: 2 },
        { id: 'phone', label: 'Phone Number', type: 'tel', required: true, order: 3 },
        { id: 'linkedIn', label: 'LinkedIn Profile URL', type: 'url', required: false, order: 4 },
        { id: 'location', label: 'Current Location', type: 'text', required: true, order: 5 },
        { id: 'visa', label: 'Visa Status', type: 'select', required: true, order: 6,
          options: ['H1B', 'OPT-EAD', 'GC-EAD', 'Green Card', 'US Citizen'] },
        { id: 'experience', label: 'Years of Experience', type: 'select', required: true, order: 7,
          options: ['0-2 years', '2-5 years', '5-8 years', '8-10 years', '10+ years'] },
        { id: 'skills', label: 'Technical Skills', type: 'textarea', required: true, order: 8,
          placeholder: 'Please list your technical skills separated by commas' },
        { id: 'education', label: 'Highest Education', type: 'select', required: true, order: 9,
          options: ['High School', 'Associate', 'Bachelor', 'Master', 'PhD'] },
        { id: 'availability', label: 'When can you start?', type: 'select', required: true, order: 10,
          options: ['Immediate', '2 weeks', '1 month', 'More than 1 month'] },
        { id: 'resume', label: 'Resume', type: 'file', required: false, order: 11,
          accept: '.pdf,.doc,.docx' }
      ]),
      created_by: 'system',
      is_default: true
    };

    this.db.get(
      'SELECT id FROM form_templates WHERE is_default = 1',
      (err, row) => {
        if (!row) {
          this.db.run(
            `INSERT INTO form_templates (name, description, fields, created_by, is_default) 
             VALUES (?, ?, ?, ?, ?)`,
            [defaultTemplate.name, defaultTemplate.description, defaultTemplate.fields, 
             defaultTemplate.created_by, defaultTemplate.is_default],
            (err) => {
              if (!err) {
                console.log('✅ Default form template created');
              }
            }
          );
        }
      }
    );
  }

  // ========== HELPER METHODS ==========
  
  get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  // ========== FORM TEMPLATE METHODS ==========
  
  async createFormTemplate(templateData) {
    const query = `
      INSERT INTO form_templates (name, description, fields, created_by, is_active)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    return this.run(query, [
      templateData.name,
      templateData.description,
      JSON.stringify(templateData.fields),
      templateData.createdBy,
      1
    ]);
  }

  async getFormTemplates(activeOnly = true) {
    const query = activeOnly 
      ? 'SELECT * FROM form_templates WHERE is_active = 1 ORDER BY created_at DESC'
      : 'SELECT * FROM form_templates ORDER BY created_at DESC';
    
    const templates = await this.all(query);
    return templates.map(t => ({
      ...t,
      fields: JSON.parse(t.fields)
    }));
  }

  async getFormTemplateById(id) {
    const template = await this.get('SELECT * FROM form_templates WHERE id = ?', [id]);
    if (template) {
      template.fields = JSON.parse(template.fields);
    }
    return template;
  }

  // ========== CANDIDATE RESPONSE METHODS ==========
  
  async saveResponse(responseData) {
    const query = `
      INSERT INTO candidate_responses 
      (form_token, template_id, candidate_email, candidate_name, response_data, submission_ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    return this.run(query, [
      responseData.formToken,
      responseData.templateId,
      responseData.candidateEmail,
      responseData.candidateName,
      JSON.stringify(responseData.responses),
      responseData.ip,
      responseData.userAgent
    ]);
  }

  async getResponses(filter = {}) {
    let query = 'SELECT * FROM candidate_responses WHERE 1=1';
    const params = [];
    
    if (filter.processed !== undefined) {
      query += ' AND processed = ?';
      params.push(filter.processed ? 1 : 0);
    }
    
    if (filter.caseCreated !== undefined) {
      query += ' AND case_created = ?';
      params.push(filter.caseCreated ? 1 : 0);
    }
    
    query += ' ORDER BY submitted_at DESC';
    
    const responses = await this.all(query, params);
    return responses.map(r => ({
      ...r,
      response_data: JSON.parse(r.response_data)
    }));
  }

  async markResponseProcessed(responseId, processedBy) {
    const query = `
      UPDATE candidate_responses 
      SET processed = 1, processed_by = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    return this.run(query, [processedBy, responseId]);
  }

  // ========== NOTIFICATION METHODS ==========
  
  async createNotification(notificationData) {
    const query = `
      INSERT INTO notifications (user_email, type, title, message, data, priority, action_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    return this.run(query, [
      notificationData.userEmail,
      notificationData.type,
      notificationData.title,
      notificationData.message,
      JSON.stringify(notificationData.data || {}),
      notificationData.priority || 'normal',
      notificationData.actionUrl
    ]);
  }

  async getUnreadNotifications(userEmail) {
    const query = `
      SELECT * FROM notifications 
      WHERE user_email = ? AND read = 0 
      ORDER BY created_at DESC
    `;
    
    const notifications = await this.all(query, [userEmail]);
    return notifications.map(n => ({
      ...n,
      data: JSON.parse(n.data || '{}')
    }));
  }

  async markNotificationRead(notificationId) {
    const query = `
      UPDATE notifications 
      SET read = 1, read_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    return this.run(query, [notificationId]);
  }

  // ========== EXISTING METHODS (keeping for compatibility) ==========
  
  async saveOAuthToken(email, provider, tokens) {
    const query = `
      INSERT OR REPLACE INTO oauth_tokens 
      (user_email, provider, access_token, refresh_token, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600000).toISOString();
    
    return this.run(query, [
      email, 
      provider, 
      tokens.access_token,
      tokens.refresh_token,
      expiresAt
    ]);
  }

  async getOAuthToken(email, provider) {
    const query = `
      SELECT * FROM oauth_tokens 
      WHERE user_email = ? AND provider = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    return this.get(query, [email, provider]);
  }

  async createForm(formData) {
    const query = `
      INSERT INTO forms 
      (token, template_id, case_id, candidate_email, candidate_name, sender_email, fields, status, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Set expiry to 14 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);
    
    return this.run(query, [
      formData.token,
      formData.templateId,
      formData.caseId,
      formData.candidateEmail,
      formData.candidateName,
      formData.senderEmail,
      JSON.stringify(formData.fields),
      'created',
      expiresAt.toISOString()
    ]);
  }

  async updateFormStatus(token, status, additionalData = {}) {
    let updateFields = [`status = ?`];
    let params = [status];
    
    if (status === 'sent' && !additionalData.sent_date) {
      updateFields.push('sent_date = CURRENT_TIMESTAMP');
    }
    
    if (status === 'opened' && !additionalData.opened_date) {
      updateFields.push('opened_date = CURRENT_TIMESTAMP');
    }
    
    if (status === 'completed' && !additionalData.completed_date) {
      updateFields.push('completed_date = CURRENT_TIMESTAMP');
    }
    
    params.push(token);
    
    const query = `
      UPDATE forms 
      SET ${updateFields.join(', ')}
      WHERE token = ?
    `;
    
    return this.run(query, params);
  }

  async getFormByToken(token) {
    const query = 'SELECT * FROM forms WHERE token = ?';
    const form = await this.get(query, [token]);
    
    if (form) {
      if (form.fields) form.fields = JSON.parse(form.fields);
      if (form.response_data) form.response_data = JSON.parse(form.response_data);
    }
    
    return form;
  }

  async logActivity(caseId, formToken, action, description, userEmail) {
    const query = `
      INSERT INTO activity_logs 
      (case_id, form_token, action, description, user_email)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    return this.run(query, [caseId, formToken, action, description, userEmail]);
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Export singleton instance
module.exports = new Database();