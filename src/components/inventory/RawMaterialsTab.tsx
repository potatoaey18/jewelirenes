import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MaterialUsageDialog } from "./MaterialUsageDialog";

interface RawMaterialsTabProps {
  refreshTrigger: number;
  onEdit: (material: any) => void;
}

export function RawMaterialsTab({ refreshTrigger, onEdit }: RawMaterialsTabProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [usageOpen, setUsageOpen] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, [refreshTrigger]);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from("raw_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error("Error fetching materials:", error);
      toast.error("Failed to fetch materials");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("raw_materials")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Material deleted successfully");
      fetchMaterials();
    } catch (error) {
      console.error("Error deleting material:", error);
      toast.error("Failed to delete material");
    } finally {
      setDeleteId(null);
    }
  };

  const viewUsage = async (material: any) => {
    try {
      const { data, error } = await supabase
        .from("item_materials")
        .select(`
          *,
          finished_items (*)
        `)
        .eq("material_id", material.id);

      if (error) throw error;

      setSelectedMaterial({
        ...material,
        usage: data || []
      });
      setUsageOpen(true);
    } catch (error) {
      console.error("Error fetching material usage:", error);
      toast.error("Failed to fetch material usage");
    }
  };

  const getMaterialTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      gold: "Gold",
      diamond: "Diamond",
      gem: "Gem",
      south_sea_pearl: "South Sea Pearl",
      other: "Other"
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map((material) => (
          <Card key={material.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{material.name}</CardTitle>
              <Badge variant="outline" className="w-fit">
                {getMaterialTypeLabel(material.type)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-semibold">
                    {Number(material.quantity_on_hand).toFixed(2)} {material.unit}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cost per Unit</p>
                  <p className="font-semibold">Php {Number(material.cost_per_unit).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => viewUsage(material)} className="flex-1">
                  <Eye className="w-4 h-4 mr-1" />
                  View Usage
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(material)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteId(material.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this material? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MaterialUsageDialog
        open={usageOpen}
        onOpenChange={setUsageOpen}
        material={selectedMaterial}
      />
    </>
  );
}
