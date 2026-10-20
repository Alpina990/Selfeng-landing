CREATE TABLE IF NOT EXISTS hits (
  day TEXT NOT NULL,      -- YYYY-MM-DD, Asia/Tashkent
  vid TEXT NOT NULL,      -- anonymous random visitor id (localStorage)
  ts  INTEGER NOT NULL    -- unix ms
);
CREATE INDEX IF NOT EXISTS hits_day ON hits(day);
