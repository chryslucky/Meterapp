CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meters (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  utility TEXT NOT NULL CHECK (utility IN ('electricity', 'water')),
  unit TEXT NOT NULL CHECK (unit IN ('kWh', 'm3')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  meter_id BIGINT NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
  reading_value NUMERIC(14, 4) NOT NULL CHECK (reading_value >= 0),
  reading_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (meter_id, reading_date)
);

CREATE TABLE IF NOT EXISTS tariffs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  utility TEXT NOT NULL CHECK (utility IN ('electricity', 'water')),
  rate_per_unit NUMERIC(14, 4) NOT NULL CHECK (rate_per_unit >= 0),
  fixed_charge NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (fixed_charge >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'RWF',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, utility, effective_from)
);

CREATE INDEX IF NOT EXISTS meters_user_id_idx ON meters(user_id);
CREATE INDEX IF NOT EXISTS readings_meter_date_idx ON readings(meter_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS tariffs_user_utility_date_idx ON tariffs(user_id, utility, effective_from DESC);
