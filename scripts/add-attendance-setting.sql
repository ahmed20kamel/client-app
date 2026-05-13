-- AttendanceSetting table — run once in Neon DB console
-- Controls the daily window during which foremen can mark P (Present) for today

CREATE TABLE IF NOT EXISTS "AttendanceSetting" (
  id               TEXT PRIMARY KEY DEFAULT 'singleton',
  "checkInStart"   INTEGER NOT NULL DEFAULT 6,
  "checkInEnd"     INTEGER NOT NULL DEFAULT 8,
  "graceMinutes"   INTEGER NOT NULL DEFAULT 0,
  timezone         TEXT    NOT NULL DEFAULT 'Asia/Dubai',
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "AttendanceSetting" (id, "checkInStart", "checkInEnd", "graceMinutes", timezone, "updatedAt")
VALUES ('singleton', 6, 8, 0, 'Asia/Dubai', NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT * FROM "AttendanceSetting";
