-- Create products table for inventory
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  metal TEXT,
  gemstone TEXT,
  carat TEXT,
  weight TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2),
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  location TEXT,
  photo_url TEXT,
  tier TEXT DEFAULT 'Silver',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL, -- 'sale' or 'purchase'
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transaction items table
CREATE TABLE public.transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- Create folders table for file management
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create files table for file management
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create customer files junction table
CREATE TABLE public.customer_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_files ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now - we'll add auth later)
CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on transaction_items" ON public.transaction_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on folders" ON public.folders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on files" ON public.files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on customer_files" ON public.customer_files FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-photos', 'customer-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-files', 'customer-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('file-system', 'file-system', false);

-- Storage policies for product images
CREATE POLICY "Public read access for product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Public upload for product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Public update for product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');
CREATE POLICY "Public delete for product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

-- Storage policies for customer photos
CREATE POLICY "Public read access for customer photos" ON storage.objects FOR SELECT USING (bucket_id = 'customer-photos');
CREATE POLICY "Public upload for customer photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'customer-photos');
CREATE POLICY "Public update for customer photos" ON storage.objects FOR UPDATE USING (bucket_id = 'customer-photos');
CREATE POLICY "Public delete for customer photos" ON storage.objects FOR DELETE USING (bucket_id = 'customer-photos');

-- Storage policies for customer files
CREATE POLICY "Public read access for customer files" ON storage.objects FOR SELECT USING (bucket_id = 'customer-files');
CREATE POLICY "Public upload for customer files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'customer-files');
CREATE POLICY "Public update for customer files" ON storage.objects FOR UPDATE USING (bucket_id = 'customer-files');
CREATE POLICY "Public delete for customer files" ON storage.objects FOR DELETE USING (bucket_id = 'customer-files');

-- Storage policies for file system
CREATE POLICY "Public read access for file system" ON storage.objects FOR SELECT USING (bucket_id = 'file-system');
CREATE POLICY "Public upload for file system" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'file-system');
CREATE POLICY "Public update for file system" ON storage.objects FOR UPDATE USING (bucket_id = 'file-system');
CREATE POLICY "Public delete for file system" ON storage.objects FOR DELETE USING (bucket_id = 'file-system');