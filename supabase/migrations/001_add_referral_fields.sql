-- Add referral fields to waitlists table
ALTER TABLE waitlists 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referred_by VARCHAR(12);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlists_referral_code ON waitlists(referral_code);
CREATE INDEX IF NOT EXISTS idx_waitlists_referred_by ON waitlists(referred_by);

-- Add comment
COMMENT ON COLUMN waitlists.referral_code IS 'Unique referral code generated for each active user';
COMMENT ON COLUMN waitlists.referred_count IS 'Number of successful referrals made by this user';
COMMENT ON COLUMN waitlists.referred_by IS 'Referral code of the user who referred this person';
