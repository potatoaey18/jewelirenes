-- Add payment_type and invoice_image_url to transactions table
ALTER TABLE transactions
ADD COLUMN payment_type TEXT,
ADD COLUMN invoice_image_url TEXT;