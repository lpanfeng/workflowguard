-- Add outreach tracking fields to waitlists table
ALTER TABLE waitlists ADD COLUMN IF NOT EXISTS outreach_sent_at TIMESTAMPTZ;
ALTER TABLE waitlists ADD COLUMN IF NOT EXISTS outreach_note TEXT;
