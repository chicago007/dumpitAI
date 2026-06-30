-- User appearance / background theme preference

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS appearance_theme TEXT NOT NULL DEFAULT 'default'
    CHECK (appearance_theme IN (
      'default',
      'white',
      'warm',
      'solarized-dark',
      'midnight'
    ));
