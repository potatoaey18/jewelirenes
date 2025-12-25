import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, ZoomIn } from "lucide-react";

export function ItemDetailsDialog({ open, onOpenChange, item }: any) {
  const [imageEnlarged, setImageEnlarged] = useState(false);

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item Details: {item.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Image Section */}
            {item.image_url && (
              <div className="flex justify-center">
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => setImageEnlarged(true)}
                >
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="max-h-48 object-contain rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            )}

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
                <p className="font-semibold">₱{Number(item.selling_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock</p>
                <p className="font-semibold">{item.stock} units</p>
              </div>
              {item.item_type && (
                <div>
                  <p className="text-sm text-muted-foreground">Item Type</p>
                  <p className="font-semibold">{item.item_type}</p>
                </div>
              )}
              {item.customers?.name && (
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-semibold">{item.customers.name}</p>
                </div>
              )}
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
                <span>₱{Number(item.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>Profit Margin:</span>
                <span>₱{(Number(item.selling_price) - Number(item.total_cost)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enlarged Image Modal */}
      {imageEnlarged && item.image_url && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImageEnlarged(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setImageEnlarged(false)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={item.image_url}
            alt={item.name}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
