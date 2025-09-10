// recruitment-backend/utils/database.js - COMPLETE VERSION WITH PROPER JSON HANDLING
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

        // Form templates table
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
          deleted INTEGER DEFAULT 0,
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

        // Candidates table
        this.db.run(`CREATE TABLE IF NOT EXISTS candidates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          linkedin_url TEXT,
          current_location TEXT,
          visa_status TEXT,
          years_experience TEXT,
          skills TEXT,
          education TEXT,
          current_employer TEXT,
          status TEXT DEFAULT 'Active',
          source TEXT,
          source_id TEXT,
          referred_by TEXT,
          availability TEXT,
          expected_salary TEXT,
          notes TEXT,
          resume_url TEXT,
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
          console.log('✅ Database initialized with all tables');
          resolve();
        });
      });
    });
  }

  // ========== JSON HANDLING HELPERS ==========
  
  /**
   * Parse JSON fields in a row based on field definitions
   */
/**
 * Parse JSON fields in a row based on field definitions
 */
parseJsonFields(row, jsonFields = []) {
  if (!row) return row;
  
  const parsed = { ...row };
  jsonFields.forEach(field => {
    if (parsed[field] && typeof parsed[field] === 'string') {
      try {
        // First check if it's already a valid JSON string
        if (parsed[field].startsWith('[') || parsed[field].startsWith('{')) {
          parsed[field] = JSON.parse(parsed[field]);
        } else {
          // If it's a comma-separated string (for skills), convert to array
          if (field === 'skills') {
            parsed[field] = parsed[field]
              .split(',')
              .map(s => s.trim())
              .filter(s => s.length > 0);
          } else {
            // Keep original value for other fields
            // Don't try to parse non-JSON strings
          }
        }
      } catch (e) {
        console.error(`Failed to parse JSON field ${field}:`, e);
        // For skills, try to convert comma-separated string to array
        if (field === 'skills' && typeof parsed[field] === 'string') {
          parsed[field] = parsed[field]
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        }
      }
    }
  });
  return parsed;
}
  /**
   * Stringify JSON fields before storing
   */
  stringifyJsonFields(data, jsonFields = []) {
    const stringified = { ...data };
    jsonFields.forEach(field => {
      if (stringified[field] !== undefined && stringified[field] !== null) {
        if (typeof stringified[field] !== 'string') {
          stringified[field] = JSON.stringify(stringified[field]);
        }
      }
    });
    return stringified;
  }

  // ========== FORM TEMPLATE METHODS (WITH PROPER JSON HANDLING) ==========

  async getFormTemplates(activeOnly = true) {
    const query = activeOnly
      ? 'SELECT * FROM form_templates WHERE deleted = 0 AND is_active = 1 ORDER BY created_at DESC'
      : 'SELECT * FROM form_templates WHERE deleted = 0 ORDER BY created_at DESC';
    
    const rows = await this.all(query);
    
    // Parse JSON fields for each template
    return rows.map(row => this.parseJsonFields(row, ['fields', 'settings']));
  }

  async getFormTemplateById(templateId) {
    const query = 'SELECT * FROM form_templates WHERE id = ? AND deleted = 0';
    const row = await this.get(query, [templateId]);
    
    // Parse JSON fields
    return this.parseJsonFields(row, ['fields', 'settings']);
  }

  async createFormTemplate(templateData) {
    // Prepare data with JSON stringification
    const preparedData = this.stringifyJsonFields(
      {
        name: templateData.name,
        description: templateData.description || '',
        fields: templateData.fields || [],
        settings: templateData.settings || {},
        created_by: templateData.created_by || templateData.createdBy
      },
      ['fields', 'settings']
    );

    const query = `
      INSERT INTO form_templates (
        name, description, fields, settings, created_by
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const result = await this.run(query, [
      preparedData.name,
      preparedData.description,
      preparedData.fields,
      preparedData.settings,
      preparedData.created_by
    ]);

    // Return the created template with parsed fields
    return this.getFormTemplateById(result.id);
  }

// recruitment-backend/utils/database.js - Replace the updateFormTemplate method

async updateFormTemplate(templateId, updates, updatedBy) {
  return new Promise((resolve, reject) => {
    // Build the update query dynamically
    const updateFields = [];
    const params = [];
    
    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      params.push(updates.name);
    }
    
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      params.push(updates.description);
    }
    
    if (updates.fields !== undefined) {
      updateFields.push('fields = ?');
      const fieldsJson = typeof updates.fields === 'string' 
        ? updates.fields 
        : JSON.stringify(updates.fields);
      params.push(fieldsJson);
    }
    
    if (updates.is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(updates.is_active ? 1 : 0);
    }
    
    // Always update the timestamp and updater
    updateFields.push('updated_at = datetime("now")');
    updateFields.push('updated_by = ?');
    params.push(updatedBy || 'system');
    
    // Add the template ID at the end
    params.push(templateId);
    
    const query = `
      UPDATE form_templates 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND deleted = 0
    `;
    
    this.db.run(query, params, (err) => {
      if (err) {
        console.error('Error updating template:', err);
        reject(err);
      } else {
        // Fetch and return the updated template
        this.get('SELECT * FROM form_templates WHERE id = ?', [templateId])
          .then(template => {
            resolve({
              success: true,
              template,
              id: templateId
            });
          })
          .catch(reject);
      }
    });
  });
}

  async deleteFormTemplate(templateId) {
    const query = `
      UPDATE form_templates 
      SET deleted = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const result = await this.run(query, [templateId]);
    return { success: result.changes > 0 };
  }

  // ========== FORM METHODS (WITH PROPER JSON HANDLING) ==========

async createForm(formData) {
    const {
      token,
      templateId,
      caseId,
      candidateEmail,
      candidateName,
      senderEmail,
      fields
    } = formData;

    return new Promise((resolve, reject) => {
      // Set expiration date (14 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const query = `
        INSERT INTO forms (
          token, template_id, case_id, 
          candidate_email, candidate_name, sender_email,
          fields, status, created_date, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'created', datetime('now'), ?)
      `;

      this.db.run(query, [
        token,
        templateId,
        caseId || null,
        candidateEmail,
        candidateName,
        senderEmail,
        JSON.stringify(fields || []),
        expiresAt.toISOString()
      ], function(err) {
        if (err) {
          console.error('Error creating form:', err);
          reject(err);
        } else {
          resolve({ 
            id: this.lastID, 
            token: token,
            success: true 
          });
        }
      });
    });
  }

 async getFormByToken(token) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT f.*, t.name as template_name, t.fields as template_fields
        FROM forms f
        LEFT JOIN form_templates t ON f.template_id = t.id
        WHERE f.token = ?
      `;
      
      this.db.get(query, [token], (err, row) => {
        if (err) reject(err);
        else {
          if (row) {
            // Parse fields - prefer form fields, fallback to template fields
            try {
              if (row.fields) {
                row.fields = typeof row.fields === 'string' ? JSON.parse(row.fields) : row.fields;
              } else if (row.template_fields) {
                row.fields = typeof row.template_fields === 'string' ? JSON.parse(row.template_fields) : row.template_fields;
              } else {
                row.fields = [];
              }
            } catch (e) {
              console.error('Error parsing fields:', e);
              row.fields = [];
            }
          }
          resolve(row);
        }
      });
    });
  }

async updateFormStatus(token, status, additionalData = {}) {
    return new Promise((resolve, reject) => {
      let updateFields = [`status = ?`];
      let params = [status];
      
      if (status === 'sent') {
        updateFields.push('sent_date = datetime("now")');
      } else if (status === 'opened') {
        updateFields.push('opened_date = datetime("now")');
      } else if (status === 'completed') {
        updateFields.push('completed_date = datetime("now")');
      }
      
      if (additionalData.response_data) {
        updateFields.push('response_data = ?');
        params.push(JSON.stringify(additionalData.response_data));
      }
      
      params.push(token);
      
      const query = `UPDATE forms SET ${updateFields.join(', ')} WHERE token = ?`;
      
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ success: this.changes > 0 });
      });
    });
  }
  // ========== RESPONSE METHODS (WITH PROPER JSON HANDLING) ==========

  async getResponses(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          cr.*,
          ft.name as template_name,
          ft.fields as template_fields
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
        else {
          // Parse response_data for each row
          const parsedRows = rows.map(row => {
            try {
              if (row.response_data) {
                row.response_data = typeof row.response_data === 'string' 
                  ? JSON.parse(row.response_data) 
                  : row.response_data;
              }
              if (row.template_fields) {
                row.template_fields = typeof row.template_fields === 'string'
                  ? JSON.parse(row.template_fields)
                  : row.template_fields;
              }
            } catch (e) {
              console.error('Error parsing row data:', e);
            }
            return row;
          });
          resolve(parsedRows);
        }
      });
    });
  }

  async getResponseById(responseId) {
    const query = `
      SELECT 
        cr.*,
        ft.name as template_name,
        ft.fields as template_fields
      FROM candidate_responses cr
      LEFT JOIN form_templates ft ON cr.template_id = ft.id
      WHERE cr.id = ? AND cr.deleted = 0
    `;
    
    const row = await this.get(query, [responseId]);
    return this.parseJsonFields(row, ['response_data', 'template_fields']);
  }

async saveResponse(responseData) {
    const {
      formToken,
      templateId,
      candidateEmail,
      candidateName,
      responses,
      ip,
      userAgent
    } = responseData;

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO candidate_responses (
          form_token, template_id, candidate_email, candidate_name,
          response_data, ip_address, user_agent, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      this.db.run(query, [
        formToken,
        templateId,
        candidateEmail,
        candidateName,
        JSON.stringify(responses),
        ip,
        userAgent
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }

  async markResponseProcessed(responseId, processedBy) {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE candidate_responses 
        SET processed = 1, processed_by = ?, processed_at = datetime('now')
        WHERE id = ?
      `;
      
      this.db.run(query, [processedBy, responseId], function(err) {
        if (err) reject(err);
        else resolve({ success: this.changes > 0 });
      });
    });
  }

  // ========== CANDIDATE METHODS (WITH PROPER JSON HANDLING) ==========

  async createCandidate(candidateData) {
    // Prepare data with JSON stringification for skills
    const preparedData = this.stringifyJsonFields(
      candidateData,
      ['skills']
    );

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
      preparedData.name,
      preparedData.email,
      preparedData.phone || null,
      preparedData.linkedin_url || null,
      preparedData.current_location || null,
      preparedData.visa_status || null,
      preparedData.years_experience || null,
      preparedData.skills,
      preparedData.education || null,
      preparedData.current_employer || null,
      preparedData.status || 'Active',
      preparedData.source || 'Manual',
      preparedData.source_id || null,
      preparedData.referred_by || null,
      preparedData.availability || null,
      preparedData.expected_salary || null,
      preparedData.notes || null,
      preparedData.resume_url || null,
      preparedData.created_by
    ];
    
    return this.run(query, params);
  }

  async updateCandidate(candidateId, updates, updatedBy) {
    const fields = [];
    const params = [];
    
    // Prepare updates with JSON stringification if needed
    const preparedUpdates = this.stringifyJsonFields(updates, ['skills']);
    
    // Build dynamic update query
    Object.keys(preparedUpdates).forEach(key => {
      if (key !== 'id' && key !== 'created_at' && key !== 'created_by') {
        fields.push(`${key} = ?`);
        params.push(preparedUpdates[key]);
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
    
    return this.parseJsonFields(candidate, ['skills']);
  }

  async getCandidateByEmail(email) {
    const candidate = await this.get(
      'SELECT * FROM candidates WHERE email = ?',
      [email]
    );
    
    return this.parseJsonFields(candidate, ['skills']);
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
    
    // Parse JSON fields for each candidate
    return candidates.map(c => this.parseJsonFields(c, ['skills']));
  }

  async getCandidateStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN status = 'Placed' THEN 1 ELSE 0 END) as placed,
        SUM(CASE WHEN status = 'On Hold' THEN 1 ELSE 0 END) as onHold
      FROM candidates
    `;
    
    return this.get(query);
  }

  async logCandidateActivity(candidateId, activityType, description, performedBy, changes = null) {
    // Prepare data with JSON stringification for changes
    const preparedData = this.stringifyJsonFields(
      { changes },
      ['changes']
    );

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
      preparedData.changes
    ]);
  }

  async getCandidateActivities(candidateId) {
    const activities = await this.all(
      'SELECT * FROM candidate_activities WHERE candidate_id = ? ORDER BY performed_at DESC',
      [candidateId]
    );
    
    // Parse JSON fields for each activity
    return activities.map(a => this.parseJsonFields(a, ['changes']));
  }

  async createCandidateFromResponse(responseId, createdBy) {
    // Get the response data
    const response = await this.getResponseById(responseId);
    
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
    
    // Response data is already parsed by getResponseById
    const responseData = response.response_data || {};
    
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
      'UPDATE candidate_responses SET candidate_id = ?, processed = 1, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
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

  // ========== OTHER METHODS ==========

  async saveOAuthToken(email, provider, tokens) {
    const query = `
      INSERT OR REPLACE INTO oauth_tokens 
      (user_email, provider, access_token, refresh_token, expires_at)
      VALUES (?, ?, ?, ?, ?)
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
    return this.get(
      'SELECT * FROM oauth_tokens WHERE user_email = ? AND provider = ?',
      [email, provider]
    );
  }

  async logActivity(caseId, formToken, action, description, userEmail) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO activity_logs (case_id, form_token, action, description, user_email)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [caseId, formToken, action, description, userEmail], function(err) {
        if (err) {
          console.error('Error logging activity:', err);
          // Don't reject, just resolve with false
          resolve({ success: false });
        } else {
          resolve({ success: true, id: this.lastID });
        }
      });
    });
  }

  async createNotification(notificationData) {
    // Prepare data with JSON stringification
    const preparedData = this.stringifyJsonFields(
      notificationData,
      ['data']
    );

    const query = `
      INSERT INTO notifications 
      (user_email, type, title, message, data, priority, action_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    return this.run(query, [
      preparedData.userEmail,
      preparedData.type,
      preparedData.title,
      preparedData.message,
      preparedData.data,
      preparedData.priority || 'normal',
      preparedData.actionUrl
    ]);
  }

  async getUnreadNotifications(userEmail) {
    const notifications = await this.all(
      'SELECT * FROM notifications WHERE user_email = ? AND read = 0 ORDER BY created_at DESC',
      [userEmail]
    );
    
    // Parse JSON fields for each notification
    return notifications.map(n => this.parseJsonFields(n, ['data']));
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

  createDefaultTemplate() {
    const defaultTemplate = {
      name: 'Default Candidate Information Form',
      description: 'Standard form for collecting candidate information',
      fields: [
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
      ],
      created_by: 'system',
      is_default: true
    };

    this.db.get(
      'SELECT id FROM form_templates WHERE is_default = 1',
      (err, row) => {
        if (!row) {
          // Use the new createFormTemplate method which handles JSON properly
          this.createFormTemplate(defaultTemplate)
            .then(() => console.log('✅ Default form template created'))
            .catch(err => console.error('Error creating default template:', err));
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