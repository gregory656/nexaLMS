-- Add profile picture URL to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Add class_id to fee_structures for per-class fee targeting
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Add fee_balance and fee_balance_updated_at to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS fee_balance NUMERIC(12,2) DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS fee_balance_updated_at TIMESTAMPTZ;

-- Fee payments ledger table for tracking add/subtract transactions
CREATE TABLE IF NOT EXISTS fee_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL, -- positive = payment (subtract from balance), negative = charge (add to balance)
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'charge', 'adjustment')),
    description TEXT,
    reference_number TEXT,
    payment_method TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for fee_ledger
ALTER TABLE fee_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_ledger_all" ON fee_ledger FOR ALL USING (true) WITH CHECK (true);
