-- GodsPlan Database Setup Script
-- Run this after starting docker-compose to initialize the churches table

-- Create churches table with PostGIS geography support
CREATE TABLE IF NOT EXISTS churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address JSONB NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    contact JSONB,
    "massSchedules" JSONB DEFAULT '[]'::jsonb,
    rites TEXT[] DEFAULT ARRAY['french_paul_vi']::TEXT[],
    languages TEXT[] DEFAULT ARRAY['French']::TEXT[],
    accessibility JSONB,
    photos TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dataSources" JSONB DEFAULT '[]'::jsonb,
    "reliabilityScore" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    "lastVerified" TIMESTAMP
);

-- Create spatial index for location queries (nearby search)
CREATE INDEX IF NOT EXISTS idx_churches_location ON churches USING GIST(location);

-- Create regular index for name searches
CREATE INDEX IF NOT EXISTS idx_churches_name ON churches(name);

-- Create index for active churches filter
CREATE INDEX IF NOT EXISTS idx_churches_active ON churches("isActive");

-- Create index for reliability score sorting
CREATE INDEX IF NOT EXISTS idx_churches_reliability ON churches("reliabilityScore" DESC);

-- Add comments for documentation
COMMENT ON TABLE churches IS 'Churches directory with mass schedules, rites, and geospatial data';
COMMENT ON COLUMN churches.location IS 'PostGIS geography point (SRID 4326) for spatial queries';
COMMENT ON COLUMN churches."massSchedules" IS 'Array of mass schedules with day, time, rite, and language';
COMMENT ON COLUMN churches."dataSources" IS 'Array of data sources with reliability scores and last scraped timestamp';

-- Run this script with:
-- docker exec -i godsplan-db psql -U godsplan -d godsplan < SETUP_DB.sql
