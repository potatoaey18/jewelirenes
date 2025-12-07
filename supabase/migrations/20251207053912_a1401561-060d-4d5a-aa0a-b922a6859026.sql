-- Create expense_bank_checks table for expense-related bank checks (separate from customer collection checks)
CREATE TABLE public.expense_bank_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor TEXT NOT NULL,
  bank TEXT NOT NULL,
  branch TEXT NOT NULL,
  check_number TEXT NOT NULL,
  check_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount NUMERIC NOT NULL,
  invoice_number TEXT,
  date_received TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'Not Yet',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_bank_checks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view expense bank checks" 
ON public.expense_bank_checks 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create expense bank checks" 
ON public.expense_bank_checks 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update expense bank checks" 
ON public.expense_bank_checks 
FOR UPDATE 
USING ((auth.uid() = created_by) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete expense bank checks" 
ON public.expense_bank_checks 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_expense_bank_checks_updated_at
BEFORE UPDATE ON public.expense_bank_checks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();