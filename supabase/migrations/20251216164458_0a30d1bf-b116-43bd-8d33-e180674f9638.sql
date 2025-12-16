-- Add deleted_at column for soft delete on transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for faster queries on non-deleted transactions
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON public.transactions(deleted_at);

-- Create vendor_files table to link files with vendors
CREATE TABLE IF NOT EXISTS public.vendor_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name text NOT NULL,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on vendor_files
ALTER TABLE public.vendor_files ENABLE ROW LEVEL SECURITY;

-- Create policy for vendor_files
CREATE POLICY "Allow all operations on vendor_files" 
ON public.vendor_files 
FOR ALL 
USING (true) 
WITH CHECK (true);