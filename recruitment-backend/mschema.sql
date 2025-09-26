-- Search indexing logs table
CREATE TABLE IF NOT EXISTS search_index_logs (
  id SERIAL PRIMARY KEY,
  operation VARCHAR(50),
  candidate_id INTEGER,
  details JSONB,
  indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_logs_candidate ON search_index_logs(candidate_id);
CREATE INDEX idx_search_logs_operation ON search_index_logs(operation);
CREATE INDEX idx_search_logs_date ON search_index_logs(indexed_at);