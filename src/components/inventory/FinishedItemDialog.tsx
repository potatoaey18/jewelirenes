import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAuditLog } from "@/lib/auditLog";

interface Material {
  material_id: string;
  quantity: number;
  type?: string;
  pieces?: number;
  carat?: number;
  size?: number;
  amountPerUnit: number;
}

interface Labor {
  type: "diamond_setting" | "tubog";
  pieces?: number;
  amountPerPiece?: number;
  fixedCost?: number;
  staffMember?: string;
}

export function FinishedItemDialog({ open, onOpenChange, item, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    date_manufactured: new Date().toISOString().split('T')[0],
    selling_price: "",
    stock: "0",
    image_url: ""
  });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [labor, setLabor] = useState<Labor[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      fetchRawMaterials();
      if (item) {
        setFormData({
          sku: item.sku || "",
          name: item.name || "",
          description: item.description || "",
          date_manufactured: item.date_manufactured?.split('T')[0] || new Date().toISOString().split('T')[0],
          selling_price: item.selling_price?.toString() || "",
          stock: item.stock?.toString() || "0",
          image_url: item.image_url || ""
        });
        fetchItemMaterials(item.id);
        fetchItemLabor(item.id);
      } else {
        setFormData({
          sku: "",
          name: "",
          description: "",
          date_manufactured: new Date().toISOString().split('T')[0],
          selling_price: "",
          stock: "0",
          image_url: ""
        });
        setMaterials([]);
        setLabor([]);
      }
    }
  }, [open, item]);

  const fetchItemMaterials = async (itemId: string) => {
    const { data, error } = await supabase
      .from("item_materials")
      .select("*, raw_materials(*)")
      .eq("item_id", itemId);
    
    if (!error && data) {
      const mappedMaterials: Material[] = data.map((im: any) => ({
        material_id: im.material_id,
        quantity: im.quantity_used,
        pieces: im.raw_materials?.type === "diamond" || im.raw_materials?.type === "gem" || im.raw_materials?.type === "south_sea_pearl" 
          ? im.quantity_used : 1,
        carat: im.raw_materials?.type === "diamond" || im.raw_materials?.type === "gem" ? im.quantity_used : 0,
        size: im.raw_materials?.type === "south_sea_pearl" ? im.quantity_used : 0,
        amountPerUnit: im.cost_at_time
      }));
      setMaterials(mappedMaterials);
    }
  };

  const fetchItemLabor = async (itemId: string) => {
    const { data, error } = await supabase
      .from("item_labor")
      .select("*")
      .eq("item_id", itemId);
    
    if (!error && data) {
      const mappedLabor: Labor[] = data.map((il: any) => ({
        type: il.labor_type,
        pieces: il.pieces,
        amountPerPiece: il.amount_per_piece,
        fixedCost: il.fixed_cost,
        staffMember: il.staff_member
      }));
      setLabor(mappedLabor);
    }
  };

  const fetchRawMaterials = async () => {
    const { data, error } = await supabase
      .from("raw_materials")
      .select("*")
      .order("name");
    
    if (!error && data) {
      setRawMaterials(data);
    }
  };

  const addMaterial = () => {
    setMaterials([...materials, { material_id: "", quantity: 0, pieces: 1, carat: 0, size: 0, amountPerUnit: 0 }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: string, value: any) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterials(updated);
  };

  const addLabor = () => {
    setLabor([...labor, { type: "diamond_setting" }]);
  };

  const removeLabor = (index: number) => {
    setLabor(labor.filter((_, i) => i !== index));
  };

  const updateLabor = (index: number, field: string, value: any) => {
    const updated = [...labor];
    updated[index] = { ...updated[index], [field]: value };
    setLabor(updated);
  };

  const calculateMaterialCost = (mat: Material) => {
    const material = rawMaterials.find(m => m.id === mat.material_id);
    if (!material) return 0;

    if (material.type === "gold" || material.type === "silver") {
      return (mat.quantity || 0) * (mat.amountPerUnit || 0);
    } else if (material.type === "diamond") {
      return (mat.carat || 0) * (mat.amountPerUnit || 0) * (mat.pieces || 1);
    } else if (material.type === "gem" || material.type === "south_sea_pearl") {
      const measurement = material.type === "gem" ? (mat.carat || 0) : (mat.size || 0);
      return measurement * (mat.amountPerUnit || 0) * (mat.pieces || 1);
    } else if (material.type === "other") {
      return (mat.quantity || 0) * (mat.amountPerUnit || 0);
    }
    return 0;
  };

  const calculateLaborCost = (lab: Labor) => {
    if (lab.type === "tubog") {
      return lab.fixedCost || 0;
    } else if (lab.type === "diamond_setting") {
      return (lab.pieces || 0) * (lab.amountPerPiece || 0);
    }
    return 0;
  };

  const calculateTotalCost = () => {
    const materialCost = materials.reduce((sum, mat) => sum + calculateMaterialCost(mat), 0);
    const laborCost = labor.reduce((sum, lab) => sum + calculateLaborCost(lab), 0);
    return materialCost + laborCost;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const totalCost = calculateTotalCost();

      const itemData = {
        ...formData,
        selling_price: parseFloat(formData.selling_price),
        stock: parseInt(formData.stock),
        total_cost: totalCost,
        image_url: imageUrl
      };

      let itemId = item?.id;

      if (item) {
        const { error } = await supabase
          .from("finished_items")
          .update(itemData)
          .eq("id", item.id);

        if (error) throw error;

        // Get existing materials to restore quantities
        const { data: existingMaterials } = await supabase
          .from("item_materials")
          .select("material_id, quantity_used")
          .eq("item_id", item.id);

        // Restore quantities from old materials
        if (existingMaterials) {
          for (const oldMat of existingMaterials) {
            const material = rawMaterials.find(m => m.id === oldMat.material_id);
            if (material) {
              const restoredQuantity = material.quantity_on_hand + oldMat.quantity_used;
              await supabase
                .from("raw_materials")
                .update({ quantity_on_hand: restoredQuantity })
                .eq("id", oldMat.material_id);
            }
          }
        }

        // Delete existing materials and labor
        await supabase.from("item_materials").delete().eq("item_id", item.id);
        await supabase.from("item_labor").delete().eq("item_id", item.id);

        // Deduct new materials
        for (const mat of materials) {
          const material = rawMaterials.find(m => m.id === mat.material_id);
          if (material) {
            // Get current quantity (which includes restored amount)
            const { data: currentMaterial } = await supabase
              .from("raw_materials")
              .select("quantity_on_hand")
              .eq("id", mat.material_id)
              .single();

            if (currentMaterial) {
              // Use pieces for piece-based materials (diamond, gem, south_sea_pearl), quantity for weight/unit-based (gold, silver, other)
              const deductAmount = (material.type === "diamond" || material.type === "gem" || material.type === "south_sea_pearl") 
                ? (mat.pieces || 0) 
                : (mat.quantity || 0);
              if (deductAmount > 0) {
                const newQuantity = currentMaterial.quantity_on_hand - deductAmount;
                if (newQuantity < 0) {
                  throw new Error(`Insufficient ${material.name}. Available: ${currentMaterial.quantity_on_hand}, Required: ${deductAmount}`);
                }
                await supabase
                  .from("raw_materials")
                  .update({ quantity_on_hand: newQuantity })
                  .eq("id", mat.material_id);
              }
            }
          }
        }
      } else {
        const { data: newItem, error } = await supabase
          .from("finished_items")
          .insert(itemData)
          .select()
          .single();

        if (error) throw error;
        itemId = newItem.id;

        // Deduct raw materials
        for (const mat of materials) {
          const material = rawMaterials.find(m => m.id === mat.material_id);
          if (material) {
            // Use pieces for piece-based materials (diamond, gem, south_sea_pearl), quantity for weight/unit-based (gold, silver, other)
            const deductAmount = (material.type === "diamond" || material.type === "gem" || material.type === "south_sea_pearl") 
              ? (mat.pieces || 0) 
              : (mat.quantity || 0);
            if (deductAmount > 0) {
              const newQuantity = material.quantity_on_hand - deductAmount;
              if (newQuantity < 0) {
                throw new Error(`Insufficient ${material.name}. Available: ${material.quantity_on_hand}, Required: ${deductAmount}`);
              }
              await supabase
                .from("raw_materials")
                .update({ quantity_on_hand: newQuantity })
                .eq("id", mat.material_id);
            }
          }
        }
      }

      // Insert materials
      for (const mat of materials) {
        const material = rawMaterials.find(m => m.id === mat.material_id);
        // Use pieces for piece-based materials, quantity for weight-based (gold/silver)
        const quantityUsed = (material?.type === "diamond" || material?.type === "gem" || material?.type === "south_sea_pearl") 
          ? (mat.pieces || 0) 
          : (mat.quantity || 0);
        await supabase.from("item_materials").insert({
          item_id: itemId,
          material_id: mat.material_id,
          quantity_used: quantityUsed,
          cost_at_time: mat.amountPerUnit,
          subtotal: calculateMaterialCost(mat)
        });
      }

      // Insert labor
      for (const lab of labor) {
        await supabase.from("item_labor").insert({
          item_id: itemId,
          labor_type: lab.type,
          pieces: lab.pieces,
          amount_per_piece: lab.amountPerPiece,
          fixed_cost: lab.fixedCost,
          total_cost: calculateLaborCost(lab),
          staff_member: lab.staffMember
        });
      }

      if (item) {
        await createAuditLog('UPDATE', 'finished_items', item.id, { name: item.name, sku: item.sku }, itemData);
      } else {
        await createAuditLog('CREATE', 'finished_items', itemId, undefined, itemData);
      }
      toast.success(item ? "Item updated successfully" : "Item created successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const getMaterialType = (materialId: string) => {
    return rawMaterials.find(m => m.id === materialId)?.type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit" : "Add"} Finished Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date Manufactured</Label>
              <Input
                type="date"
                value={formData.date_manufactured}
                onChange={(e) => setFormData({ ...formData, date_manufactured: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>SKU</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Selling Price (₱)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-lg font-semibold">Materials Used</Label>
              <Button type="button" size="sm" onClick={addMaterial}>
                <Plus className="w-4 h-4 mr-1" />
                Add Material
              </Button>
            </div>
            {materials.map((mat, index) => {
              const materialType = getMaterialType(mat.material_id);
              return (
                <div key={index} className="border p-4 rounded-lg space-y-3 mb-3">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <div>
                        <Label>Material</Label>
                        <Select
                          value={mat.material_id}
                          onValueChange={(value) => updateMaterial(index, "material_id", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {rawMaterials.map((rm) => (
                              <SelectItem key={rm.id} value={rm.id}>
                                {rm.name} ({rm.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {(materialType === "gold" || materialType === "silver") && (
                        <>
                          <div>
                            <Label>Grams</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={mat.quantity}
                              onChange={(e) => updateMaterial(index, "quantity", parseFloat(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Amount per Gram (₱)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={mat.amountPerUnit}
                              onChange={(e) => updateMaterial(index, "amountPerUnit", parseFloat(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Total</Label>
                            <Input value={`₱${calculateMaterialCost(mat).toFixed(2)}`} disabled />
                          </div>
                        </>
                      )}

                      {materialType === "diamond" && (
                        <>
                          <div>
                            <Label>Pieces</Label>
                            <Input
                              type="number"
                              value={mat.pieces || 1}
                              onChange={(e) => updateMaterial(index, "pieces", parseInt(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Carat</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={mat.carat}
                              onChange={(e) => updateMaterial(index, "carat", parseFloat(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Amount per Carat (₱)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={mat.amountPerUnit}
                              onChange={(e) => updateMaterial(index, "amountPerUnit", parseFloat(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Total</Label>
                            <Input value={`₱${calculateMaterialCost(mat).toFixed(2)}`} disabled />
                          </div>
                        </>
                      )}

                      {(materialType === "gem" || materialType === "south_sea_pearl") && (
                        <>
                          <div>
                            <Label>Pieces</Label>
                            <Input
                              type="number"
                              value={mat.pieces || 1}
                              onChange={(e) => updateMaterial(index, "pieces", parseInt(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>{materialType === "gem" ? "Carat" : "Size"}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={materialType === "gem" ? mat.carat : mat.size}
                              onChange={(e) => updateMaterial(index, materialType === "gem" ? "carat" : "size", parseFloat(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Amount per {materialType === "gem" ? "Carat" : "Size"} (₱)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={mat.amountPerUnit}
                              onChange={(e) => updateMaterial(index, "amountPerUnit", parseFloat(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Total</Label>
                            <Input value={`₱${calculateMaterialCost(mat).toFixed(2)}`} disabled />
                          </div>
                        </>
                      )}

                      {materialType === "other" && (
                        <>
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={mat.quantity || 0}
                              onChange={(e) => updateMaterial(index, "quantity", parseFloat(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Cost per Unit (₱)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={mat.amountPerUnit}
                              onChange={(e) => updateMaterial(index, "amountPerUnit", parseFloat(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Total</Label>
                            <Input value={`₱${calculateMaterialCost(mat).toFixed(2)}`} disabled />
                          </div>
                        </>
                      )}
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeMaterial(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-lg font-semibold">Labor Costs</Label>
              <Button type="button" size="sm" onClick={addLabor}>
                <Plus className="w-4 h-4 mr-1" />
                Add Labor
              </Button>
            </div>
            {labor.map((lab, index) => (
              <div key={index} className="border p-4 rounded-lg space-y-3 mb-3">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={lab.type}
                        onValueChange={(value) => updateLabor(index, "type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diamond_setting">Diamond Setting</SelectItem>
                          <SelectItem value="tubog">Tubog</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {lab.type === "diamond_setting" && (
                      <>
                        <div>
                          <Label>Pieces</Label>
                          <Input
                            type="number"
                            value={lab.pieces}
                            onChange={(e) => updateLabor(index, "pieces", parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Amount per Piece (₱)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={lab.amountPerPiece}
                            onChange={(e) => updateLabor(index, "amountPerPiece", parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Staff Member</Label>
                          <Input
                            placeholder="Name of staff who performed service"
                            value={lab.staffMember || ""}
                            onChange={(e) => updateLabor(index, "staffMember", e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {lab.type === "tubog" && (
                      <div>
                        <Label>Fixed Cost (₱)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={lab.fixedCost}
                          onChange={(e) => updateLabor(index, "fixedCost", parseFloat(e.target.value))}
                        />
                      </div>
                    )}

                    <div>
                      <Label>Total</Label>
                      <Input value={`₱${calculateLaborCost(lab).toFixed(2)}`} disabled />
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeLabor(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Cost:</span>
              <span>₱{calculateTotalCost().toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : item ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
