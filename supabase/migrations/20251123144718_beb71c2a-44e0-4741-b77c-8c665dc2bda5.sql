-- Create enum for raw material types
CREATE TYPE public.material_type AS ENUM ('gold', 'diamond', 'gem', 'south_sea_pearl', 'other');

-- Create enum for labor types
CREATE TYPE public.labor_type AS ENUM ('diamond_setting', 'tubog');

-- Create raw_materials table
CREATE TABLE public.raw_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type material_type NOT NULL,
  quantity_on_hand NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL, -- 'grams', 'carats', 'pieces', 'size'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create finished_items table
CREATE TABLE public.finished_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  date_manufactured TIMESTAMP WITH TIME ZONE NOT NULL,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create item_materials junction table
CREATE TABLE public.item_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.finished_items(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity_used NUMERIC NOT NULL,
  cost_at_time NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create item_labor table
CREATE TABLE public.item_labor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.finished_items(id) ON DELETE CASCADE,
  labor_type labor_type NOT NULL,
  pieces INTEGER,
  amount_per_piece NUMERIC,
  fixed_cost NUMERIC,
  total_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finished_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_labor ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for raw_materials
CREATE POLICY "Allow all operations on raw_materials"
ON public.raw_materials
FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for finished_items
CREATE POLICY "Allow all operations on finished_items"
ON public.finished_items
FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for item_materials
CREATE POLICY "Allow all operations on item_materials"
ON public.item_materials
FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for item_labor
CREATE POLICY "Allow all operations on item_labor"
ON public.item_labor
FOR ALL
USING (true)
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_raw_materials_updated_at
BEFORE UPDATE ON public.raw_materials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_finished_items_updated_at
BEFORE UPDATE ON public.finished_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_item_materials_item_id ON public.item_materials(item_id);
CREATE INDEX idx_item_materials_material_id ON public.item_materials(material_id);
CREATE INDEX idx_item_labor_item_id ON public.item_labor(item_id);