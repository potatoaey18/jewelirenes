import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

type TrendPeriod = "weekly" | "monthly" | "yearly";

interface TrendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Array<{ date: string; value: number; details?: any }>;
  onDataPointClick?: (details: any) => void;
  onPeriodChange?: (period: TrendPeriod) => void;
}

export const TrendDialog = ({ open, onOpenChange, title, data, onDataPointClick, onPeriodChange }: TrendDialogProps) => {
  const [period, setPeriod] = useState<TrendPeriod>("weekly");

  const handlePeriodChange = (value: TrendPeriod) => {
    setPeriod(value);
    onPeriodChange?.(value);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "weekly":
        return "Last 7 Days";
      case "monthly":
        return "Last 30 Days";
      case "yearly":
        return "Last 12 Months";
      default:
        return "Last 7 Days";
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{format(new Date(dataPoint.date), period === "yearly" ? "MMM yyyy" : "MMM dd, yyyy")}</p>
          <p className="text-accent font-bold">₱{dataPoint.value.toLocaleString()}</p>
          {dataPoint.details && (
            <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <DialogTitle className="text-2xl">{title} - {getPeriodLabel()}</DialogTitle>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </DialogHeader>
        
        <div className="mt-6 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), period === "yearly" ? "MMM" : "MMM dd")}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={(value) => `₱${value.toLocaleString()}`}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--accent))" 
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data: any) => {
                  if (onDataPointClick && data?.details) {
                    onDataPointClick(data.details);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
};
