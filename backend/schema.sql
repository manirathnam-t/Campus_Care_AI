CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CampusCare schema matching the user_id / complaint_id column names used by the API.
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
  complaint_id SERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(60) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(200) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Completed')),
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaint_history (
  history_id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
  changed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  old_status VARCHAR(30),
  new_status VARCHAR(30),
  remarks TEXT,
  status VARCHAR(30) NOT NULL,
  note TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Safe additive compatibility for an existing CampusCare database created earlier.
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE complaints ALTER COLUMN public_id SET DEFAULT gen_random_uuid();
ALTER TABLE complaint_history ADD COLUMN IF NOT EXISTS changed_by INTEGER;
ALTER TABLE complaint_history ADD COLUMN IF NOT EXISTS old_status VARCHAR(30);
ALTER TABLE complaint_history ADD COLUMN IF NOT EXISTS new_status VARCHAR(30);
ALTER TABLE complaint_history ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE complaint_history ADD COLUMN IF NOT EXISTS status VARCHAR(30);
ALTER TABLE complaint_history ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE complaint_history ADD COLUMN IF NOT EXISTS changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_complaints_user_created ON complaints(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_status_created ON complaints(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_category_location ON complaints(category, location);
CREATE INDEX IF NOT EXISTS idx_history_complaint_changed ON complaint_history(complaint_id, changed_at DESC);
