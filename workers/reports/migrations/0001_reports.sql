CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('url', 'address', 'photo')),
  name TEXT,
  address TEXT,
  source_url TEXT,
  photo_key TEXT,
  photo_bytes INTEGER NOT NULL DEFAULT 0 CHECK (photo_bytes >= 0),
  upload_day TEXT,
  status TEXT NOT NULL CHECK (status IN ('uploading', 'pending', 'accepted', 'dismissed')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  photo_delete_requested_at TEXT,
  verified_reference TEXT
) STRICT;

CREATE INDEX reports_status_order ON reports (status, created_at DESC, id DESC);
CREATE INDEX reports_photo_cleanup ON reports (status, created_at) WHERE photo_key IS NOT NULL;

CREATE TABLE photo_daily_usage (
  day TEXT PRIMARY KEY,
  uploads INTEGER NOT NULL,
  bytes INTEGER NOT NULL
) STRICT;

CREATE TABLE photo_storage (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  bytes INTEGER NOT NULL CHECK (bytes >= 0),
  max_daily_uploads INTEGER NOT NULL DEFAULT 100 CHECK (max_daily_uploads >= 0),
  max_daily_bytes INTEGER NOT NULL DEFAULT 100000000 CHECK (max_daily_bytes >= 0),
  max_storage_bytes INTEGER NOT NULL DEFAULT 8000000000 CHECK (max_storage_bytes >= 0)
) STRICT;

INSERT INTO photo_storage (id, bytes) VALUES (1, 0);

CREATE TRIGGER reserve_photo_quota BEFORE INSERT ON reports
WHEN NEW.photo_key IS NOT NULL
BEGIN
  UPDATE photo_storage SET bytes = bytes + NEW.photo_bytes
  WHERE id = 1 AND bytes + NEW.photo_bytes <= max_storage_bytes;
  SELECT RAISE(ABORT, 'PHOTO_QUOTA') WHERE changes() = 0;

  INSERT INTO photo_daily_usage (day, uploads, bytes)
  SELECT NEW.upload_day, 1, NEW.photo_bytes FROM photo_storage
  WHERE id = 1 AND max_daily_uploads >= 1 AND NEW.photo_bytes <= max_daily_bytes
  ON CONFLICT(day) DO UPDATE SET
    uploads = photo_daily_usage.uploads + 1,
    bytes = photo_daily_usage.bytes + excluded.bytes
  WHERE photo_daily_usage.uploads < (SELECT max_daily_uploads FROM photo_storage WHERE id = 1)
    AND photo_daily_usage.bytes + excluded.bytes <= (SELECT max_daily_bytes FROM photo_storage WHERE id = 1);
  SELECT RAISE(ABORT, 'PHOTO_QUOTA') WHERE changes() = 0;
END;

CREATE TRIGGER release_reviewed_photo_capacity AFTER UPDATE OF photo_key ON reports
WHEN OLD.photo_key IS NOT NULL AND NEW.photo_key IS NULL
BEGIN
  UPDATE photo_storage SET bytes = bytes - OLD.photo_bytes WHERE id = 1;
END;

CREATE TRIGGER release_abandoned_photo_capacity AFTER DELETE ON reports
WHEN OLD.photo_key IS NOT NULL
BEGIN
  UPDATE photo_storage SET bytes = bytes - OLD.photo_bytes WHERE id = 1;
END;
