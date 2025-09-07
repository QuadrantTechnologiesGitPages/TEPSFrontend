// recruitment-backend/utils/database.js - COMPLETE VERSION WITH ALL METHODS
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
        // ========== EXISTING TABLES (keeping as is) ==========
        
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
        )`);

        // Forms table
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
        )`);

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
        )`);

        // Activity log table
        this.db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id TEXT,
          form_token TEXT,
          action TEXT,
          description TEXT,
          user_email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Form templates table - Updated with 'deleted' column
        this.db.run(`CREATE TABLE IF NOT EXISTS form_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          fields TEXT NOT NULL,
          settings TEXT,
          created_by TEXT NOT NULL,
          updated_by TEXT,
          is_active BOOLEAN DEFAULT 1,
          is_default BOOLEAN DEFAULT 0,
          usage_count INTEGER DEFAULT 0,
          deleted INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Candidate responses table
        this.db.run(`CREATE TABLE IF NOT EXISTS candidate_responses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          form_token TEXT,
          template_id INTEGER,
          candidate_email TEXT,
          candidate_name TEXT,
          candidate_phone TEXT,
          response_data TEXT NOT NULL,
          submission_ip TEXT,
          ip_address TEXT,
          user_agent TEXT,
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT 0,
          processed_by TEXT,
          processed_at DATETIME,
          case_created BOOLEAN DEFAULT 0,
          case_id TEXT,
          candidate_id INTEGER,
          notes TEXT,
          FOREIGN KEY (form_token) REFERENCES forms(token),
          FOREIGN KEY (template_id) REFERENCES form_templates(id),
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )`);

        // Form tokens table
        this.db.run(`CREATE TABLE IF NOT EXISTS form_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT UNIQUE NOT NULL,
          template_id INTEGER,
          expires_at DATETIME,
          used INTEGER DEFAULT 0,
          used_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (template_id) REFERENCES form_templates(id)
        )`);

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
        )`);

        // Field library table
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
        )`);

        // ========== NEW CANDIDATES TABLES ==========
        
        // Candidates table
        this.db.run(`CREATE TABLE IF NOT EXISTS candidates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          -- Basic Info
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          linkedin_url TEXT,
          
          -- Professional Info
          current_location TEXT,
          visa_status TEXT,
          years_experience TEXT,
          skills TEXT,
          education TEXT,
          current_employer TEXT,
          
          -- Tracking Info
          status TEXT DEFAULT 'Active',
          source TEXT,
          source_id TEXT,
          referred_by TEXT,
          
          -- Additional Info
          availability TEXT,
          expected_salary TEXT,
          notes TEXT,
          resume_url TEXT,
          
          -- Metadata
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_updated_by TEXT
        )`, (err) => {
          if (err) console.error('Error creating candidates table:', err);
        });

        // Candidate activities table
        this.db.run(`CREATE TABLE IF NOT EXISTS candidate_activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidate_id INTEGER NOT NULL,
          activity_type TEXT NOT NULL,
          description TEXT,
          performed_by TEXT,
          performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          changes TEXT,
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )`, (err) => {
          if (err) console.error('Error creating candidate_activities table:', err);
          
          // Create default form template after all tables are created
          this.createDefaultTemplate();
          console.log('✅ Database initialized with candidates table');
          resolve();
        });
      });
    });
  }

  // ========== FORM TEMPLATE METHODS ==========

  getFormTemplates(filters = {}) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM form_templates 
        WHERE deleted = 0
        ORDER BY created_at DESC
      `;
      
      this.db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getFormTemplateById(templateId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM form_templates 
        WHERE id = ? AND deleted = 0
      `;
      
      this.db.get(query, [templateId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  createFormTemplate(templateData) {
    const {
      name,
      description,
      fields,
      settings,
      created_by
    } = templateData;

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO form_templates (
          name, description, fields, settings, 
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;

      this.db.run(query, [
        name,
        description || '',
        JSON.stringify(fields || []),
        JSON.stringify(settings || {}),
        created_by
      ], function(err) {
        if (err) reject(err);
        else {
          // Get the newly created template
          this.getFormTemplateById(this.lastID)
            .then(resolve)
            .catch(reject);
        }
      }.bind(this));
    });
  }

  updateFormTemplate(templateId, updates) {
    return new Promise(async (resolve, reject) => {
      try {
        const current = await this.getFormTemplateById(templateId);
        if (!current) {
          return reject(new Error('Template not found'));
        }

        const {
          name = current.name,
          description = current.description,
          fields = current.fields,
          settings = current.settings,
          updated_by
        } = updates;

        const query = `
          UPDATE form_templates 
          SET name = ?, description = ?, fields = ?, settings = ?,
              updated_at = datetime('now'), updated_by = ?
          WHERE id = ? AND deleted = 0
        `;

        this.db.run(query, [
          name,
          description,
          typeof fields === 'string' ? fields : JSON.stringify(fields),
          typeof settings === 'string' ? settings : JSON.stringify(settings),
          updated_by,
          templateId
        ], (err) => {
          if (err) reject(err);
          else {
            this.getFormTemplateById(templateId)
              .then(resolve)
              .catch(reject);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  deleteFormTemplate(templateId) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE form_templates 
        SET deleted = 1, updated_at = datetime('now')
        WHERE id = ?
      `;
      
      this.db.run(query, [templateId], function(err) {
        if (err) reject(err);
        else resolve({ success: this.changes > 0 });
      });
    });
  }

  // ========== RESPONSE METHODS ==========

  getResponses(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          cr.*,
          ft.name as template_name
        FROM candidate_responses cr
        LEFT JOIN form_templates ft ON cr.template_id = ft.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.processed !== undefined) {
        query += ` AND cr.processed = ?`;
        params.push(filters.processed ? 1 : 0);
      }
      
      if (filters.template_id) {
        query += ` AND cr.template_id = ?`;
        params.push(filters.template_id);
      }
      
      query += ` ORDER BY cr.submitted_at DESC`;
      
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getResponseById(responseId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          cr.*,
          ft.name as template_name,
          ft.fields as template_fields
        FROM candidate_responses cr
        LEFT JOIN form_templates ft ON cr.template_id = ft.id
        WHERE cr.id = ?
      `;
      
      this.db.get(query, [responseId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  createResponse(responseData) {
    const {
      template_id,
      form_token,
      response_data,
      candidate_name,
      candidate_email,
      candidate_phone,
      ip_address,
      user_agent
    } = responseData;

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO candidate_responses (
          template_id, form_token, response_data,
          candidate_name, candidate_email, candidate_phone,
          ip_address, user_agent, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      this.db.run(query, [
        template_id,
        form_token || null,
        JSON.stringify(response_data || {}),
        candidate_name || 'Unknown',
        candidate_email || null,
        candidate_phone || null,
        ip_address || null,
        user_agent || null
      ], function(err) {
        if (err) reject(err);
        else {
          this.getResponseById(this.lastID)
            .then(resolve)
            .catch(reject);
        }
      }.bind(this));
    });
  }

  markResponseAsProcessed(responseId, processedBy) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE candidate_responses 
        SET processed = 1, 
            processed_by = ?,
            processed_at = datetime('now')
        WHERE id = ?
      `;
      
      this.db.run(query, [processedBy, responseId], function(err) {
        if (err) reject(err);
        else resolve({ success: this.changes > 0 });
      });
    });
  }

  updateResponseWithCandidate(responseId, candidateId) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE candidate_responses 
        SET candidate_id = ?,
            processed = 1,
            processed_at = datetime('now')
        WHERE id = ?
      `;
      
      this.db.run(query, [candidateId, responseId], function(err) {
        if (err) reject(err);
        else resolve({ success: this.changes > 0 });
      });
    });
  }

  getResponsesForExport(filters = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const responses = await this.getResponses(filters);
        
        // Flatten response data for CSV export
        const exportData = responses.map(response => {
          const data = JSON.parse(response.response_data || '{}');
          return {
            id: response.id,
            submitted_at: response.submitted_at,
            candidate_name: response.candidate_name,
            candidate_email: response.candidate_email,
            candidate_phone: response.candidate_phone,
            template_name: response.template_name,
            processed: response.processed ? 'Yes' : 'No',
            ...data
          };
        });
        
        resolve(exportData);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ========== FORM TOKEN METHODS ==========

  createFormToken(templateId, expiresIn = 14) {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);
    
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO form_tokens (
          token, template_id, expires_at, created_at
        ) VALUES (?, ?, ?, datetime('now'))
      `;
      
      this.db.run(query, [token, templateId, expiresAt.toISOString()], (err) => {
        if (err) reject(err);
        else resolve({ token, expires_at: expiresAt.toISOString() });
      });
    });
  }

  validateFormToken(token) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT ft.*, t.* 
        FROM form_tokens ft
        JOIN form_templates t ON ft.template_id = t.id
        WHERE ft.token = ? 
          AND ft.used = 0 
          AND datetime(ft.expires_at) > datetime('now')
          AND t.deleted = 0
      `;
      
      this.db.get(query, [token], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  markTokenAsUsed(token) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE form_tokens 
        SET used = 1, used_at = datetime('now')
        WHERE token = ?
      `;
      
      this.db.run(query, [token], function(err) {
        if (err) reject(err);
        else resolve({ success: this.changes > 0 });
      });
    });
  }

  generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  // ========== CANDIDATE METHODS ==========
  
  async createCandidate(candidateData) {
    const query = `
      INSERT INTO candidates (
        name, email, phone, linkedin_url, current_location,
        visa_status, years_experience, skills, education,
        current_employer, status, source, source_id,
        referred_by, availability, expected_salary, notes,
        resume_url, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      candidateData.name,
      candidateData.email,
      candidateData.phone || null,
      candidateData.linkedin_url || null,
      candidateData.current_location || null,
      candidateData.visa_status || null,
      candidateData.years_experience || null,
      JSON.stringify(candidateData.skills || []),
      candidateData.education || null,
      candidateData.current_employer || null,
      candidateData.status || 'Active',
      candidateData.source || 'Manual',
      candidateData.source_id || null,
      candidateData.referred_by || null,
      candidateData.availability || null,
      candidateData.expected_salary || null,
      candidateData.notes || null,
      candidateData.resume_url || null,
      candidateData.created_by
    ];
    
    return this.run(query, params);
  }

  async updateCandidate(candidateId, updates, updatedBy) {
    const fields = [];
    const params = [];
    
    // Build dynamic update query
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'created_at' && key !== 'created_by') {
        fields.push(`${key} = ?`);
        if (key === 'skills' && Array.isArray(updates[key])) {
          params.push(JSON.stringify(updates[key]));
        } else {
          params.push(updates[key]);
        }
      }
    });
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    fields.push('last_updated_by = ?');
    params.push(updatedBy);
    params.push(candidateId);
    
    const query = `UPDATE candidates SET ${fields.join(', ')} WHERE id = ?`;
    return this.run(query, params);
  }

  async getCandidateById(candidateId) {
    const candidate = await this.get(
      'SELECT * FROM candidates WHERE id = ?',
      [candidateId]
    );
    
    if (candidate && candidate.skills) {
      try {
        candidate.skills = JSON.parse(candidate.skills);
      } catch {
        candidate.skills = [];
      }
    }
    
    return candidate;
  }

  async getCandidateByEmail(email) {
    const candidate = await this.get(
      'SELECT * FROM candidates WHERE email = ?',
      [email]
    );
    
    if (candidate && candidate.skills) {
      try {
        candidate.skills = JSON.parse(candidate.skills);
      } catch {
        candidate.skills = [];
      }
    }
    
    return candidate;
  }

  async getCandidates(filters = {}) {
    let query = 'SELECT * FROM candidates WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    
    if (filters.visa_status) {
      query += ' AND visa_status = ?';
      params.push(filters.visa_status);
    }
    
    if (filters.search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR skills LIKE ?)';
      const searchParam = `%${filters.search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    const candidates = await this.all(query, params);
    
    // Parse skills JSON for each candidate
    return candidates.map(c => ({
      ...c,
      skills: c.skills ? JSON.parse(c.skills) : []
    }));
  }

  async getCandidateStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'Placed' THEN 1 ELSE 0 END) as placed,
        SUM(CASE WHEN status = 'On Hold' THEN 1 ELSE 0 END) as onHold
      FROM candidates
    `;
    
    return this.get(query);
  }

  async logCandidateActivity(candidateId, activityType, description, performedBy, changes = null) {
    const query = `
      INSERT INTO candidate_activities 
      (candidate_id, activity_type, description, performed_by, changes)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    return this.run(query, [
      candidateId,
      activityType,
      description,
      performedBy,
      changes ? JSON.stringify(changes) : null
    ]);
  }

  async getCandidateActivities(candidateId) {
    const activities = await this.all(
      'SELECT * FROM candidate_activities WHERE candidate_id = ? ORDER BY performed_at DESC',
      [candidateId]
    );
    
    return activities.map(a => ({
      ...a,
      changes: a.changes ? JSON.parse(a.changes) : null
    }));
  }

  async createCandidateFromResponse(responseId, createdBy) {
    // Get the response data
    const response = await this.get(
      'SELECT * FROM candidate_responses WHERE id = ?',
      [responseId]
    );
    
    if (!response) {
      throw new Error('Response not found');
    }
    
    // Check if candidate already exists
    if (response.candidate_email) {
      const existingCandidate = await this.getCandidateByEmail(response.candidate_email);
      if (existingCandidate) {
        throw new Error('Candidate with this email already exists');
      }
    }
    
    // Parse response data
    const responseData = JSON.parse(response.response_data || '{}');
    
    // Map response fields to candidate fields
    const candidateData = {
      name: response.candidate_name || responseData.name || responseData.fullName || responseData['Full Name'] || 'Unknown',
      email: response.candidate_email || responseData.email || responseData.Email,
      phone: response.candidate_phone || responseData.phone || responseData.phoneNumber || responseData['Phone'] || responseData['Phone Number'] || null,
      linkedin_url: responseData.linkedIn || responseData.linkedin || responseData['LinkedIn'] || null,
      current_location: responseData.location || responseData.currentLocation || responseData['Location'] || responseData['Current Location'] || null,
      visa_status: responseData.visa || responseData.visaStatus || responseData['Visa Status'] || null,
      years_experience: responseData.experience || responseData.yearsOfExperience || responseData['Years of Experience'] || null,
      skills: this.extractSkills(responseData.skills || responseData.technicalSkills || responseData['Skills'] || responseData['Technical Skills'] || ''),
      education: responseData.education || responseData['Education'] || null,
      current_employer: responseData.currentEmployer || responseData['Current Employer'] || null,
      availability: responseData.availability || responseData['Availability'] || null,
      expected_salary: responseData.expectedSalary || responseData['Expected Salary'] || null,
      notes: `Created from form response #${responseId}`,
      source: 'Form Response',
      source_id: responseId.toString(),
      referred_by: responseData.referredBy || responseData['Referred By'] || null,
      created_by: createdBy,
      status: 'Active'
    };
    
    // Create the candidate
    const result = await this.createCandidate(candidateData);
    
    // Update the response to link it to the candidate
    await this.run(
      'UPDATE candidate_responses SET candidate_id = ?, processed = 1, processed_at = datetime("now") WHERE id = ?',
      [result.id, responseId]
    );
    
    // Log the activity
    await this.logCandidateActivity(
      result.id,
      'created',
      'Candidate created from form response',
      createdBy,
      { source: 'Form Response', responseId }
    );
    
    return result;
  }

  extractSkills(skillsString) {
    if (Array.isArray(skillsString)) {
      return skillsString;
    }
    
    if (typeof skillsString === 'string') {
      return skillsString
        .split(/[,;]/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
    }
    
    return [];
  }

  // Helper methods
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
          options: ['Immediate', '2 weeks', '1 month', 'More than 1 month'] }
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