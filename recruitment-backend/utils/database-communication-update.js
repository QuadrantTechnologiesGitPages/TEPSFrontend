// recruitment-backend/utils/database-communication-update.js
// Run this script to add communication tables to your existing database

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function updateDatabase() {
  const dbPath = process.env.DATABASE_PATH || './recruitment.db';
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      process.exit(1);
    }
    
    console.log('✅ Connected to database');
    
    db.serialize(() => {
      // Communication logs table
      db.run(`CREATE TABLE IF NOT EXISTS communication_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER,
        channel TEXT NOT NULL,
        recipients TEXT NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        attachments TEXT,
        status TEXT DEFAULT 'sent',
        message_id TEXT,
        sent_by TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        error_message TEXT,
        metadata TEXT,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id)
      )`, (err) => {
        if (err) console.error('Error creating communication_logs:', err);
        else console.log('✅ Created communication_logs table');
      });

      // Communication templates table
      db.run(`CREATE TABLE IF NOT EXISTS communication_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        subject TEXT,
        body TEXT NOT NULL,
        channel TEXT,
        tags TEXT,
        variables TEXT,
        category TEXT,
        usage_count INTEGER DEFAULT 0,
        is_public BOOLEAN DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted INTEGER DEFAULT 0
      )`, (err) => {
        if (err) console.error('Error creating communication_templates:', err);
        else console.log('✅ Created communication_templates table');
      });

      // Scheduled messages table
      db.run(`CREATE TABLE IF NOT EXISTS scheduled_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id TEXT UNIQUE NOT NULL,
        candidate_id INTEGER,
        channel TEXT NOT NULL,
        recipients TEXT NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        attachments TEXT,
        schedule_time DATETIME NOT NULL,
        status TEXT DEFAULT 'pending',
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME,
        cancelled_at DATETIME,
        error_message TEXT,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id)
      )`, (err) => {
        if (err) console.error('Error creating scheduled_messages:', err);
        else console.log('✅ Created scheduled_messages table');
      });

      // Channel configurations table
      db.run(`CREATE TABLE IF NOT EXISTS channel_configurations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        channel TEXT NOT NULL,
        provider TEXT,
        configuration TEXT,
        is_active BOOLEAN DEFAULT 1,
        last_verified DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, channel, provider)
      )`, (err) => {
        if (err) console.error('Error creating channel_configurations:', err);
        else console.log('✅ Created channel_configurations table');
      });

      // Communication preferences table
      db.run(`CREATE TABLE IF NOT EXISTS communication_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id INTEGER,
        preferred_channel TEXT DEFAULT 'email',
        email_opt_in BOOLEAN DEFAULT 1,
        sms_opt_in BOOLEAN DEFAULT 1,
        whatsapp_opt_in BOOLEAN DEFAULT 1,
        phone_opt_in BOOLEAN DEFAULT 1,
        do_not_contact BOOLEAN DEFAULT 0,
        preferred_time_zone TEXT,
        preferred_contact_hours TEXT,
        notes TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id),
        UNIQUE(candidate_id)
      )`, (err) => {
        if (err) console.error('Error creating communication_preferences:', err);
        else console.log('✅ Created communication_preferences table');
      });

      // Message threads table (for conversation tracking)
      db.run(`CREATE TABLE IF NOT EXISTS message_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT UNIQUE NOT NULL,
        candidate_id INTEGER,
        channel TEXT NOT NULL,
        subject TEXT,
        last_message_at DATETIME,
        message_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id)
      )`, (err) => {
        if (err) console.error('Error creating message_threads:', err);
        else console.log('✅ Created message_threads table');
      });

      // Add default templates
      db.run(`INSERT OR IGNORE INTO communication_templates 
        (name, description, subject, body, channel, tags, is_public, created_by)
        VALUES 
        ('Introduction Email', 'Initial outreach to candidate', 'Exciting Opportunity - {{position}}', 
         'Dear {{candidate_name}},\n\nI came across your profile and was impressed by your experience with {{skills}}.\n\nWe have an exciting {{position}} opportunity that aligns perfectly with your background.\n\nWould you be available for a brief call this week?\n\nBest regards,\n{{sender_name}}', 
         'email', '["introduction", "outreach"]', 1, 'system'),
        
        ('Interview Invitation', 'Schedule interview with candidate', 'Interview Invitation - {{company_name}}',
         'Hi {{candidate_name}},\n\nGreat news! {{company_name}} would like to schedule an interview for the {{position}} position.\n\nAvailable times:\n{{interview_slots}}\n\nPlease let me know which works best for you.\n\nBest regards,\n{{sender_name}}',
         'email', '["interview", "scheduling"]', 1, 'system'),
        
        ('WhatsApp Quick Follow-up', 'Quick WhatsApp follow-up', '',
         'Hi {{candidate_name}}! Following up on the {{position}} opportunity we discussed. Are you still interested? Let me know if you have any questions.',
         'whatsapp', '["followup", "whatsapp"]', 1, 'system'),
        
        ('SMS Reminder', 'Interview reminder via SMS', '',
         'Hi {{candidate_name}}, reminder: Your interview for {{position}} is scheduled for {{interview_time}}. Good luck!',
         'sms', '["reminder", "interview", "sms"]', 1, 'system')
      `, (err) => {
        if (err && !err.message.includes('UNIQUE')) {
          console.error('Error adding default templates:', err);
        } else {
          console.log('✅ Added default communication templates');
        }
      });

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_comm_logs_candidate 
              ON communication_logs(candidate_id)`, (err) => {
        if (!err) console.log('✅ Created index on communication_logs');
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_comm_logs_sent_by 
              ON communication_logs(sent_by)`, (err) => {
        if (!err) console.log('✅ Created index on sent_by');
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status 
              ON scheduled_messages(status, schedule_time)`, (err) => {
        if (!err) console.log('✅ Created index on scheduled_messages');
      });

      console.log('\n✅ Database update complete!');
      console.log('Communication tables and templates have been added.');
      
      db.close();
    });
  });
}

// Run the update
updateDatabase();