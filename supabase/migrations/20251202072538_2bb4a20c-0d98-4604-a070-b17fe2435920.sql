-- Create bank_checks table
CREATE TABLE public.bank_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  bank TEXT NOT NULL,
  branch TEXT NOT NULL,
  check_date TIMESTAMP WITH TIME ZONE NOT NULL,
  check_number TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date_received TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'Not Yet',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bank_checks ENABLE ROW LEVEL SECURITY;

-- Create policies for bank_checks
CREATE POLICY "Authenticated users can view bank checks"
ON public.bank_checks
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create bank checks"
ON public.bank_checks
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update bank checks"
ON public.bank_checks
FOR UPDATE
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bank checks"
ON public.bank_checks
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bank_checks_updated_at
BEFORE UPDATE ON public.bank_checks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();