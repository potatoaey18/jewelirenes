-- Add customer_id and item_type columns to finished_items table
ALTER TABLE public.finished_items 
ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN item_type text;

-- Create index for customer_id for better query performance
CREATE INDEX idx_finished_items_customer_id ON public.finished_items(customer_id);

-- Create index for item_type
CREATE INDEX idx_finished_items_item_type ON public.finished_items(item_type);