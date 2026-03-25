-- CitySense Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Telegram users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    photo_url TEXT,
    problems_count INT DEFAULT 0,
    votes_count INT DEFAULT 0,
    badge VARCHAR(50) DEFAULT 'newcomer',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Problems table
CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id),
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    sentiment VARCHAR(50),
    urgency VARCHAR(50),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    location_name VARCHAR(500),
    image_url TEXT,
    votes INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open',
    ai_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(telegram_id),
    problem_id INT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, problem_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_problems_category ON problems(category);
CREATE INDEX IF NOT EXISTS idx_problems_urgency ON problems(urgency);
CREATE INDEX IF NOT EXISTS idx_problems_sentiment ON problems(sentiment);
CREATE INDEX IF NOT EXISTS idx_problems_created ON problems(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problems_votes ON problems(votes DESC);
CREATE INDEX IF NOT EXISTS idx_problems_user ON problems(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_problem ON votes(problem_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER problems_updated_at
    BEFORE UPDATE ON problems
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
