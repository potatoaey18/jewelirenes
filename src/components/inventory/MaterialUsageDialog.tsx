import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function MaterialUsageDialog({ open, onOpenChange, material }: any) {
  if (!material) return null;

  const totalUsed = material.usage?.reduce((sum: number, item: any) => sum + Number(item.quantity_used || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Material Usage: {material.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-semibold capitalize">{material.type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="font-semibold">{Number(material.quantity_on_hand).toFixed(2)} {material.unit}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Items Using This Material</h3>
            {material.usage && material.usage.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity Used</TableHead>
                    <TableHead>Cost at Time</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {material.usage.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.finished_items?.name}</TableCell>
                      <TableCell>{item.finished_items?.sku}</TableCell>
                      <TableCell>{Number(item.quantity_used).toFixed(2)} {material.unit}</TableCell>
                      <TableCell>Php {Number(item.cost_at_time).toFixed(2)}</TableCell>
                      <TableCell className="text-right">Php {Number(item.subtotal).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2}>Total Used</TableCell>
                    <TableCell>{totalUsed.toFixed(2)} {material.unit}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                This material hasn't been used in any items yet.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
