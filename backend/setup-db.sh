#!/bin/bash
# Setup PostgreSQL database for GodsPlan

sudo -u postgres psql << SQL
CREATE USER godsplan WITH PASSWORD 'godsplan_secure_2026';
CREATE DATABASE godsplan_db OWNER godsplan;
GRANT ALL PRIVILEGES ON DATABASE godsplan_db TO godsplan;
\c godsplan_db
CREATE EXTENSION IF NOT EXISTS postgis;
SQL

echo "✅ Database godsplan_db created with user godsplan"
