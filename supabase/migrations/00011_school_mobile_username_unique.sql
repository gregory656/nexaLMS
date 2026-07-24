-- Keep Nexa School login usernames stable and unique.
CREATE UNIQUE INDEX IF NOT EXISTS schools_mobile_username_unique
  ON schools (lower(mobile_username))
  WHERE mobile_username IS NOT NULL;
