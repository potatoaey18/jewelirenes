-- Add 'silver' to the material_type enum
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'silver';

-- Add staff_member column to item_labor table for tracking who performed the service
ALTER TABLE public.item_labor ADD COLUMN IF NOT EXISTS staff_member TEXT;