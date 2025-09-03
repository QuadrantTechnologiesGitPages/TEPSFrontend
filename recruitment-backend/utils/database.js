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

        // Forms table (enhanced version)
        this.db.run(`CREATE TABLE IF NOT EXISTS forms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT UNIQUE,
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
          email_thread_id TEXT
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
          resolve();
        });
      });
    });
  }

  // Helper methods for database operations
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

  // OAuth token methods
  async saveOAuthToken(email, provider, tokens) {
    const query = `
      INSERT OR REPLACE INTO oauth_tokens 
      (user_email, provider, access_token, refresh_token, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600000).toISOString(); // 1 hour default
    
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

  // Form methods
  async createForm(formData) {
    const query = `
      INSERT INTO forms 
      (token, case_id, candidate_email, candidate_name, sender_email, fields, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    return this.run(query, [
      formData.token,
      formData.caseId,
      formData.candidateEmail,
      formData.candidateName,
      formData.senderEmail,
      JSON.stringify(formData.fields),
      'created'
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
    
    if (additionalData.response_data) {
      updateFields.push('response_data = ?');
      params.push(JSON.stringify(additionalData.response_data));
    }
    
    if (additionalData.email_message_id) {
      updateFields.push('email_message_id = ?');
      params.push(additionalData.email_message_id);
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
    
    if (form && form.fields) {
      form.fields = JSON.parse(form.fields);
    }
    
    if (form && form.response_data) {
      form.response_data = JSON.parse(form.response_data);
    }
    
    return form;
  }

  async getFormsByCaseId(caseId) {
    const query = `
      SELECT * FROM forms 
      WHERE case_id = ? 
      ORDER BY created_date DESC
    `;
    
    const forms = await this.all(query, [caseId]);
    
    return forms.map(form => {
      if (form.fields) form.fields = JSON.parse(form.fields);
      if (form.response_data) form.response_data = JSON.parse(form.response_data);
      return form;
    });
  }

  async getPendingForms() {
    const query = `
      SELECT * FROM forms 
      WHERE status IN ('sent', 'opened')
      ORDER BY sent_date DESC
    `;
    
    const forms = await this.all(query, []);
    
    return forms.map(form => {
      if (form.fields) form.fields = JSON.parse(form.fields);
      if (form.response_data) form.response_data = JSON.parse(form.response_data);
      return form;
    });
  }

  // Activity logging
  async logActivity(caseId, formToken, action, description, userEmail) {
    const query = `
      INSERT INTO activity_logs 
      (case_id, form_token, action, description, user_email)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    return this.run(query, [caseId, formToken, action, description, userEmail]);
  }

  async getActivities(caseId) {
    const query = `
      SELECT * FROM activity_logs 
      WHERE case_id = ?
      ORDER BY created_at DESC
    `;
    
    return this.all(query, [caseId]);
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