-- Add payment reference fields to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS reference_number text,
ADD COLUMN IF NOT EXISTS account_name text,
ADD COLUMN IF NOT EXISTS check_number text,
ADD COLUMN IF NOT EXISTS check_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS bank text,
ADD COLUMN IF NOT EXISTS branch text;