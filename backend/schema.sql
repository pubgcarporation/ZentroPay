-- ZentroPay D1 schema. Addresses are stored lowercase. Amounts are USDC base units (6 decimals) as text.
CREATE TABLE IF NOT EXISTS users (
  address TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS nonces (
  address TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT NOT NULL UNIQUE,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'friends', 'private')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_from ON payments (from_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_to ON payments (to_address, created_at DESC);

CREATE TABLE IF NOT EXISTS likes (
  payment_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (payment_id, address)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_payment ON comments (payment_id, created_at);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_address TEXT NOT NULL,   -- requester, will receive the money
  to_address TEXT NOT NULL,     -- person being asked to pay
  amount TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'declined', 'cancelled')),
  payment_id INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_to ON requests (to_address, status);
CREATE INDEX IF NOT EXISTS idx_requests_from ON requests (from_address, status);
