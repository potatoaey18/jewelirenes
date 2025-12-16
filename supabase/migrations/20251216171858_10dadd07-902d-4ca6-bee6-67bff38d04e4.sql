-- Add deleted_at column to finished_items for soft delete functionality
ALTER TABLE public.finished_items 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;