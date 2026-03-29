-- ============================================
-- Migration 001: Initial Schema
-- ============================================
-- This migration creates the entire initial schema for AURA
-- Run: psql -d aura -f migrations/001_initial_schema.sql

BEGIN;

-- Source the main schema
\i schema.sql

COMMIT;
