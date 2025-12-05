import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ItemDetailsDialog({ open, onOpenChange, item }: any) {
  if (!item) return null;

  const getMaterialTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      gold: "Gold",
      silver: "Silver",
      diamond: "Diamond",
      gem: "Gem",
      south_sea_pearl: "South Sea Pearl",
      other: "Other"
    };
    return labels[type] || type;
  };

  const isPieceBasedMaterial = (type: string) => {
    return type === "diamond" || type === "gem" || type === "south_sea_pearl";
  };

  const formatQuantity = (quantity: number, type: string) => {
    if (isPieceBasedMaterial(type)) {
      return `${Math.round(quantity)} pcs`;
    }
    return `${Number(quantity).toFixed(2)} g`;
  };

  const getLaborTypeLabel = (type: string) => {
    return type === "diamond_setting" ? "Diamond Setting" : "Tubog";
  };

  const totalMaterialCost = item.materials?.reduce((sum: number, mat: any) => sum + Number(mat.subtotal || 0), 0) || 0;
  const totalLaborCost = item.labor?.reduce((sum: number, lab: any) => sum + Number(lab.total_cost || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Item Details: {item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">SKU</p>
              <p className="font-semibold">{item.sku}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date Manufactured</p>
              <p className="font-semibold">{new Date(item.date_manufactured).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Selling Price</p>
              <p className="font-semibold">₱{Number(item.selling_price).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stock</p>
              <p className="font-semibold">{item.stock} units</p>
            </div>
          </div>

          {item.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p>{item.description}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3">Materials Used</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Cost at Time</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.materials?.map((mat: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{mat.raw_materials?.name}</TableCell>
                    <TableCell>{getMaterialTypeLabel(mat.raw_materials?.type)}</TableCell>
                    <TableCell>{formatQuantity(mat.quantity_used, mat.raw_materials?.type)}</TableCell>
                    <TableCell>₱{Number(mat.cost_at_time).toFixed(2)}</TableCell>
                    <TableCell className="text-right">₱{Number(mat.subtotal).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell colSpan={4}>Total Materials Cost</TableCell>
                  <TableCell className="text-right">₱{totalMaterialCost.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Labor Costs</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.labor?.map((lab: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{getLaborTypeLabel(lab.labor_type)}</TableCell>
                    <TableCell>
                      {lab.labor_type === "diamond_setting" 
                        ? `${lab.pieces} pieces × ₱${Number(lab.amount_per_piece).toFixed(2)}`
                        : "Fixed cost"}
                    </TableCell>
                    <TableCell className="text-right">₱{Number(lab.total_cost).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell colSpan={2}>Total Labor Cost</TableCell>
                  <TableCell className="text-right">₱{totalLaborCost.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Cost:</span>
              <span>₱{Number(item.total_cost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>Profit Margin:</span>
              <span>₱{(Number(item.selling_price) - Number(item.total_cost)).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
