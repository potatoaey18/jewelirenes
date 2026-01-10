import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ItemDetailsDialog } from "./ItemDetailsDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { createAuditLog } from "@/lib/auditLog";

interface FinishedItemsTabProps {
  refreshTrigger: number;
  onEdit: (item: any) => void;
}

export function FinishedItemsTab({ refreshTrigger, onEdit }: FinishedItemsTabProps) {
  const { confirm } = useConfirmation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [refreshTrigger]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("finished_items")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: any) => {
    const confirmed = await confirm({
      actionType: 'delete',
      title: 'Move to Bin',
      description: `Are you sure you want to move "${item.name}" to the bin? You can restore it later.`,
    });
    if (!confirmed) return;

    try {
      const deletedAt = new Date().toISOString();
      const { error } = await supabase
        .from("finished_items")
        .update({ deleted_at: deletedAt })
        .eq("id", item.id);

      if (error) throw error;

      await createAuditLog("SOFT_DELETE", "finished_items", item.id, { deleted_at: null }, { deleted_at: deletedAt });

      toast.success("Item moved to bin");
      fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  const viewDetails = async (item: any) => {
    try {
      const { data: materials, error: matError } = await supabase
        .from("item_materials")
        .select(`
          *,
          raw_materials (*)
        `)
        .eq("item_id", item.id);

      const { data: labor, error: laborError } = await supabase
        .from("item_labor")
        .select("*")
        .eq("item_id", item.id);

      if (matError) throw matError;
      if (laborError) throw laborError;

      setSelectedItem({
        ...item,
        materials: materials || [],
        labor: labor || []
      });
      setDetailsOpen(true);
    } catch (error) {
      console.error("Error fetching item details:", error);
      toast.error("Failed to fetch item details");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">SKU: {item.sku}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.date_manufactured).toLocaleDateString()}
                  </p>
                </div>
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-md ml-2"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Cost</p>
                  <p className="font-semibold">₱{Number(item.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Selling Price</p>
                  <p className="font-semibold">₱{Number(item.selling_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock</p>
                <Badge variant={item.stock > 5 ? "default" : item.stock > 0 ? "secondary" : "destructive"}>
                  {item.stock} units
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => viewDetails(item)} className="flex-1">
                  <Eye className="w-4 h-4 mr-1" />
                  Details
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ItemDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        item={selectedItem}
      />
    </>
  );
}
