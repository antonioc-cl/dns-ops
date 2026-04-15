-- Create domains table
CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS domains_tenant_id_idx ON domains(tenant_id);

-- Other tables will be created from schema
-- This is a minimal init for basic functionality
