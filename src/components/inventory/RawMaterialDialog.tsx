import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createAuditLog } from "@/lib/auditLog";

export function RawMaterialDialog({ open, onOpenChange, material, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "gold",
    quantity_on_hand: "",
    cost_per_unit: "",
    unit: "grams",
    other_description: ""
  });

  useEffect(() => {
    if (open) {
      if (material) {
        setFormData({
          name: material.name || "",
          type: material.type || "gold",
          quantity_on_hand: material.quantity_on_hand?.toString() || "",
          cost_per_unit: material.cost_per_unit?.toString() || "",
          unit: material.unit || "grams",
          other_description: material.other_description || ""
        });
      } else {
        setFormData({
          name: "",
          type: "gold",
          quantity_on_hand: "",
          cost_per_unit: "",
          unit: "grams",
          other_description: ""
        });
      }
    }
  }, [open, material]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.type === "other" && !formData.other_description.trim()) {
      toast.error("Please specify the type of other material");
      return;
    }
    
    setLoading(true);

    try {
      const data = {
        name: formData.name,
        type: formData.type as "gold" | "diamond" | "gem" | "south_sea_pearl" | "other",
        unit: formData.unit,
        quantity_on_hand: parseFloat(formData.quantity_on_hand),
        cost_per_unit: parseFloat(formData.cost_per_unit),
        other_description: formData.type === "other" ? formData.other_description : null
      };

      if (material) {
        const { error } = await supabase
          .from("raw_materials")
          .update(data)
          .eq("id", material.id);

        if (error) throw error;
        await createAuditLog('UPDATE', 'raw_materials', material.id, { name: material.name }, data);
        toast.success("Material updated successfully");
      } else {
        const { data: newMaterial, error } = await supabase
          .from("raw_materials")
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        await createAuditLog('CREATE', 'raw_materials', newMaterial?.id, undefined, data);
        toast.success("Material created successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving material:", error);
      toast.error("Failed to save material");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? "Edit" : "Add"} Raw Material</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
                <SelectItem value="gem">Gem</SelectItem>
                <SelectItem value="south_sea_pearl">South Sea Pearl</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === "other" && (
            <div>
              <Label>Other Material Description *</Label>
              <Input
                value={formData.other_description}
                onChange={(e) => setFormData({ ...formData, other_description: e.target.value })}
                placeholder="e.g., Silver, Bronze, Titanium"
                required
              />
            </div>
          )}

          <div>
            <Label>Quantity on Hand</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.quantity_on_hand}
              onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Unit</Label>
            <Select
              value={formData.unit}
              onValueChange={(value) => setFormData({ ...formData, unit: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grams">Grams</SelectItem>
                <SelectItem value="carats">Carats</SelectItem>
                <SelectItem value="pieces">Pieces</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Cost per Unit (₱)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.cost_per_unit}
              onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : material ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
