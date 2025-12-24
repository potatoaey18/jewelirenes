import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handlePeriodChange = (value: TrendPeriod) => {
    setPeriod(value);
    setSelectedDate(null);
    setSelectedItem(null);
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

  const selectedData = data.find(d => d.date === selectedDate);
  const detailItems = selectedData?.details?.transactions || selectedData?.details?.expenses || [];
  const isExpense = selectedData?.details?.type === "expense";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{format(new Date(dataPoint.date), period === "yearly" ? "MMM yyyy" : "MMM dd, yyyy")}</p>
          <p className="text-accent font-bold">₱{dataPoint.value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (data: any) => {
    if (data?.date) {
      setSelectedDate(data.date);
      setSelectedItem(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setSelectedDate(null);
          setSelectedItem(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between gap-4">
            <DialogTitle className="text-xl sm:text-2xl">{title} - {getPeriodLabel()}</DialogTitle>
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[120px] sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </DialogHeader>
          
          <div className="mt-4 h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), period === "yearly" ? "MMM" : "MMM dd")}
                  className="text-xs"
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                  className="text-xs"
                  tick={{ fontSize: 10 }}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.date === selectedDate ? "hsl(var(--primary))" : "hsl(var(--accent))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Details List */}
          {selectedDate && (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-semibold mb-3 text-sm sm:text-base">
                Details for {format(new Date(selectedDate), period === "yearly" ? "MMMM yyyy" : "MMMM dd, yyyy")}
              </h3>
              <ScrollArea className="h-[200px]">
                {detailItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No details available</p>
                ) : (
                  <div className="space-y-2">
                    {detailItems.map((item: any, index: number) => (
                      <Card 
                        key={item.id || index} 
                        className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedItem({ ...item, isExpense })}
                      >
                        <CardContent className="p-3 flex justify-between items-center">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {isExpense 
                                ? (item.category || item.description || "Expense")
                                : (item.transaction_items?.map((ti: any) => ti.product_name).join(", ") || `Transaction #${item.id?.slice(0, 8) || index + 1}`)
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {!isExpense && item.customers?.name && <span className="font-medium">{item.customers.name} • </span>}
                              {format(new Date(item.created_at || item.expense_date), "h:mm a")} • Click for details
                            </p>
                          </div>
                          <p className="font-bold text-accent text-sm ml-2">
                            ₱{Number(item.total_amount || item.amount).toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total ({detailItems.length} items)</span>
                <span className="font-bold text-accent">₱{selectedData?.value.toLocaleString()}</span>
              </div>
            </div>
          )}

          {!selectedDate && data.length > 0 && (
            <p className="text-center text-muted-foreground text-sm mt-4">
              Click on a bar to view detailed transactions
            </p>
          )}

          {data.length === 0 && (
            <p className="text-center text-muted-foreground text-sm mt-4 py-8">
              No data available for this period
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Item Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {selectedItem?.isExpense ? "Expense Details" : "Transaction Details"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Amount</span>
                <span className="font-bold text-xl text-accent">
                  ₱{Number(selectedItem.total_amount || selectedItem.amount).toLocaleString()}
                </span>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                {selectedItem.id && (
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground text-sm">ID</span>
                    <span className="text-sm font-mono text-right">{selectedItem.id.slice(0, 12)}...</span>
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground text-sm">Date & Time</span>
                  <span className="text-sm text-right">
                    {format(new Date(selectedItem.created_at || selectedItem.expense_date), "PPP 'at' p")}
                  </span>
                </div>
                
                {selectedItem.isExpense ? (
                  <>
                    {selectedItem.category && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground text-sm">Category</span>
                        <Badge variant="outline">{selectedItem.category}</Badge>
                      </div>
                    )}
                    
                    {selectedItem.description && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground text-sm">Description</span>
                        <span className="text-sm text-right max-w-[200px]">{selectedItem.description}</span>
                      </div>
                    )}
                    
                    {selectedItem.vendor && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground text-sm">Vendor</span>
                        <span className="text-sm text-right">{selectedItem.vendor}</span>
                      </div>
                    )}
                    
                    {selectedItem.payment_method && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground text-sm">Payment Method</span>
                        <Badge variant="secondary">{selectedItem.payment_method}</Badge>
                      </div>
                    )}
                    
                    {selectedItem.reference_number && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground text-sm">Reference #</span>
                        <span className="text-sm text-right font-mono">{selectedItem.reference_number}</span>
                      </div>
                    )}
                    
                    {selectedItem.notes && (
                      <div className="pt-2">
                        <span className="text-muted-foreground text-sm block mb-1">Notes</span>
                        <p className="text-sm bg-muted/50 p-2 rounded">{selectedItem.notes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Customer Name */}
                    {selectedItem.customers?.name && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground text-sm">Customer</span>
                        <span className="text-sm text-right font-medium">{selectedItem.customers.name}</span>
                      </div>
                    )}
                    
                    {selectedItem.payment_type && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground text-sm">Payment Type</span>
                        <Badge variant="secondary">{selectedItem.payment_type}</Badge>
                      </div>
                    )}
                    
                    {selectedItem.tax !== undefined && selectedItem.tax > 0 && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground text-sm">Tax</span>
                        <span className="text-sm">₱{Number(selectedItem.tax).toLocaleString()}</span>
                      </div>
                    )}
                    
                    {selectedItem.discount !== undefined && selectedItem.discount > 0 && (
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground text-sm">Discount</span>
                        <span className="text-sm text-green-600">-₱{Number(selectedItem.discount).toLocaleString()}</span>
                      </div>
                    )}
                    
                    {/* Transaction Items */}
                    {selectedItem.transaction_items && selectedItem.transaction_items.length > 0 && (
                      <div className="pt-2">
                        <span className="text-muted-foreground text-sm block mb-2">Items Purchased</span>
                        <div className="space-y-2">
                          {selectedItem.transaction_items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-muted/30 p-2 rounded text-sm">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{item.product_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.quantity} × ₱{Number(item.unit_price).toLocaleString()}
                                </p>
                              </div>
                              <span className="font-medium ml-2">
                                ₱{(item.quantity * item.unit_price).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedItem.notes && (
                      <div className="pt-2">
                        <span className="text-muted-foreground text-sm block mb-1">Notes</span>
                        <p className="text-sm bg-muted/50 p-2 rounded">{selectedItem.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};