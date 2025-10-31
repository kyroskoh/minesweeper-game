-- PostgreSQL Initialization Script
-- This runs automatically when PostgreSQL container is first created

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    time INTEGER NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    date TIMESTAMP NOT NULL,
    is_daily BOOLEAN DEFAULT FALSE,
    device_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create daily_leaderboard table
CREATE TABLE IF NOT EXISTS daily_leaderboard (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    time INTEGER NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    date TIMESTAMP NOT NULL,
    device_id VARCHAR(255),
    puzzle_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_difficulty_time 
ON leaderboard(difficulty, time);

CREATE INDEX IF NOT EXISTS idx_leaderboard_is_daily 
ON leaderboard(is_daily);

CREATE INDEX IF NOT EXISTS idx_daily_leaderboard_puzzle_date 
ON daily_leaderboard(puzzle_date, difficulty, time);

-- Grant permissions (adjust user if needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO minesweeper_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO minesweeper_user;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Minesweeper database initialized successfully';
END $$;

