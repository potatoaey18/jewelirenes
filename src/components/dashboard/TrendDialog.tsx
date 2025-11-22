import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface TrendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Array<{ date: string; value: number; details?: any }>;
  onDataPointClick?: (details: any) => void;
}

export const TrendDialog = ({ open, onOpenChange, title, data, onDataPointClick }: TrendDialogProps) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{format(new Date(dataPoint.date), "MMM dd, yyyy")}</p>
          <p className="text-accent font-bold">Php {dataPoint.value.toLocaleString()}</p>
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
        <DialogHeader>
          <DialogTitle className="text-2xl">{title} - Last 7 Days</DialogTitle>
        </DialogHeader>
        
        <div className="mt-6 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), "MMM dd")}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={(value) => `Php ${value.toLocaleString()}`}
                className="text-xs"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--accent))", r: 4, cursor: "pointer" }}
                activeDot={{ 
                  r: 6, 
                  onClick: (_e: any, payload: any) => {
                    if (onDataPointClick && payload?.payload?.details) {
                      onDataPointClick(payload.payload.details);
                    }
                  },
                  cursor: "pointer"
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
};
