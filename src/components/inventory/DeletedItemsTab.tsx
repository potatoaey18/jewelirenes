import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConfirmation } from "@/hooks/useConfirmation";

interface DeletedItemsTabProps {
  refreshTrigger: number;
  onRestore: () => void;
}

export function DeletedItemsTab({ refreshTrigger, onRestore }: DeletedItemsTabProps) {
  const { confirm } = useConfirmation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedItems();
  }, [refreshTrigger]);

  const fetchDeletedItems = async () => {
    try {
      const { data, error } = await supabase
        .from("finished_items")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching deleted items:", error);
      toast.error("Failed to fetch deleted items");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: any) => {
    const confirmed = await confirm({
      actionType: 'restore',
      title: 'Restore Item',
      description: `Are you sure you want to restore "${item.name}"?`,
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("finished_items")
        .update({ deleted_at: null })
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Item restored successfully");
      fetchDeletedItems();
      onRestore();
    } catch (error) {
      console.error("Error restoring item:", error);
      toast.error("Failed to restore item");
    }
  };

  const handlePermanentDelete = async (item: any) => {
    const confirmed = await confirm({
      actionType: 'delete',
      title: 'Permanently Delete Item',
      description: `Are you sure you want to permanently delete "${item.name}"? This action cannot be undone and will also remove all associated materials and labor records.`,
      destructive: true,
    });
    if (!confirmed) return;

    try {
      // Delete related item_materials first
      await supabase
        .from("item_materials")
        .delete()
        .eq("item_id", item.id);

      // Delete related item_labor
      await supabase
        .from("item_labor")
        .delete()
        .eq("item_id", item.id);

      // Delete the item
      const { error } = await supabase
        .from("finished_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Item permanently deleted");
      fetchDeletedItems();
    } catch (error) {
      console.error("Error permanently deleting item:", error);
      toast.error("Failed to permanently delete item");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No deleted items</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="hover:shadow-lg transition-shadow opacity-75">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">SKU: {item.sku}</p>
                <p className="text-xs text-muted-foreground">
                  Deleted: {new Date(item.deleted_at).toLocaleDateString()}
                </p>
              </div>
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-md ml-2 opacity-50"
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Total Cost</p>
                <p className="font-semibold">₱{Number(item.total_cost).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Selling Price</p>
                <p className="font-semibold">₱{Number(item.selling_price).toFixed(2)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stock</p>
              <Badge variant="secondary">
                {item.stock} units
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleRestore(item)} 
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Restore
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handlePermanentDelete(item)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
