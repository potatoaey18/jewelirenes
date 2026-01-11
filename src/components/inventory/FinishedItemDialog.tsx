import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAuditLog } from "@/lib/auditLog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useConfirmation } from "@/hooks/useConfirmation";
import { CurrencyInput } from "@/components/ui/currency-input"; // ← Add this import

interface Material {
  material_id: string;
  quantity: number;
  type?: string;
  pieces?: number;
  carat?: number;
  size?: number;
  amountPerUnit: number;
  costPerPiece?: number;
}

interface Labor {
  type: "diamond_setting" | "tubog";
  pieces?: number;
  amountPerPiece?: number;
  fixedCost?: number;
  staffMember?: string;
}

const ITEM_TYPES = [
  "Ring",
  "Pendant",
  "Earring",
  "Bracelet",
  "Anklet",
  "Necklace",
  "Brooch",
  "Cufflinks",
  "Tiara",
  "Watch",
  "Charm",
  "Chain",
  "Bangle",
  "Other"
];

export function FinishedItemDialog({ open, onOpenChange, item, onSuccess }: any) {
  const { confirm } = useConfirmation();
  const [loading, setLoading] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [itemTypeOpen, setItemTypeOpen] = useState(false);
  const [customItemType, setCustomItemType] = useState("");
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    date_manufactured: new Date().toISOString().split('T')[0],
    selling_price: "",
    stock: "1",
    image_url: "",
    customer_id: "",
    item_type: ""
  });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [labor, setLabor] = useState<Labor[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value, sku: value });
  };

  useEffect(() => {
    if (open) {
      fetchRawMaterials();
      fetchCustomers();
      if (item) {
        const existingItemType = item.item_type || "";
        const isCustomType = existingItemType && !ITEM_TYPES.includes(existingItemType);
        
        setFormData({
          sku: item.sku || "",
          name: item.name || "",
          description: item.description || "",
          date_manufactured: item.date_manufactured?.split('T')[0] || new Date().toISOString().split('T')[0],
          selling_price: item.selling_price?.toString() || "",
          stock: item.stock?.toString() || "0",
          image_url: item.image_url || "",
          customer_id: item.customer_id || "",
          item_type: isCustomType ? "Other" : existingItemType
        });
        setCustomItemType(isCustomType ? existingItemType : "");
        fetchItemMaterials(item.id);
        fetchItemLabor(item.id);
      } else {
        setFormData({
          sku: "",
          name: "",
          description: "",
          date_manufactured: new Date().toISOString().split('T')[0],
          selling_price: "",
          stock: "1",
          image_url: "",
          customer_id: "",
          item_type: ""
        });
        setCustomItemType("");
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
      const mappedMaterials: Material[] = data.map((im: any) => {
        const materialType = im.raw_materials?.type;
        const isPieceBased = materialType === "diamond" || materialType === "gem" || materialType === "south_sea_pearl";
        
        return {
          material_id: im.material_id,
          quantity: isPieceBased ? 0 : im.quantity_used,
          pieces: isPieceBased ? im.quantity_used : 1,
          carat: (materialType === "diamond" || materialType === "gem") ? (im.subtotal / ((im.quantity_used || 1) * (im.cost_at_time || 1))) : 0,
          size: materialType === "south_sea_pearl" ? (im.raw_materials?.other_description ? parseFloat(im.raw_materials.other_description) : 0) : 0,
          amountPerUnit: im.cost_at_time,
          costPerPiece: materialType === "south_sea_pearl" ? (im.subtotal / (im.quantity_used || 1)) : 0
        };
      });
      setMaterials(mappedMaterials);
    }
  };

  const handleMaterialSelect = (index: number, materialId: string) => {
  const material = rawMaterials.find(m => m.id === materialId);
  if (!material) return;

  const updated = [...materials];

  updated[index] = {
    ...updated[index],
    material_id: materialId,

    // reset usage values
    quantity: 0,
    pieces: 0,
    carat: 0,
    size: 0,

    // 🔑 auto-fill from inventory
    amountPerUnit: material.cost_per_unit || 0,
  };

  setMaterials(updated);
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

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .order("name");
    
    if (!error && data) {
      setCustomers(data);
    }
  };

  const addMaterial = () => {
    setMaterials([...materials, { material_id: "", quantity: 0, pieces: 0, carat: 0, size: 0, amountPerUnit: 0, costPerPiece: 0 }]);
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

    if (material.type === "gold" || material.type === "silver" || material.type === "other") {
      return (mat.quantity || 0) * (mat.amountPerUnit || 0);
    } 
    if (material.type === "diamond" || material.type === "gem") {
      return (mat.pieces || 1) * (mat.carat || 0) * (mat.amountPerUnit || 0);
    } 
    if (material.type === "south_sea_pearl") {
      return (mat.pieces || 1) * (mat.costPerPiece || 0);
    }
    return 0;
  };

  const calculatePricePerPiece = (mat: Material) => {
    return (mat.carat || 0) * (mat.amountPerUnit || 0);
  };

  const calculateLaborCost = (lab: Labor) => {
    if (lab.type === "tubog") {
      return lab.fixedCost || 0;
    } 
    if (lab.type === "diamond_setting") {
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

    const confirmed = await confirm({
      actionType: item ? 'update' : 'create',
      title: item ? 'Update Item' : 'Add Finished Item',
      description: item
        ? `Are you sure you want to save changes to "${formData.name}"?`
        : `Are you sure you want to add "${formData.name}" as a finished item?`,
    });
    if (!confirmed) return;

    setLoading(true);

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const totalCost = calculateTotalCost();
      const finalItemType = formData.item_type === "Other" ? customItemType : formData.item_type;

      const itemData = {
        sku: formData.sku,
        name: formData.name,
        description: formData.description,
        date_manufactured: formData.date_manufactured,
        selling_price: Number(formData.selling_price) || 0,
        stock: parseInt(formData.stock) || 1,
        total_cost: totalCost,
        image_url: imageUrl,
        customer_id: formData.customer_id || null,
        item_type: finalItemType || null
      };

      let itemId = item?.id;

      if (item) {
        const { error } = await supabase
          .from("finished_items")
          .update(itemData)
          .eq("id", item.id);

        if (error) throw error;

        // Restore old material quantities
        const { data: existingMaterials } = await supabase
          .from("item_materials")
          .select("material_id, quantity_used")
          .eq("item_id", item.id);

        if (existingMaterials) {
          for (const oldMat of existingMaterials) {
            const material = rawMaterials.find(m => m.id === oldMat.material_id);
            if (material) {
              const restored = material.quantity_on_hand + oldMat.quantity_used;
              await supabase
                .from("raw_materials")
                .update({ quantity_on_hand: restored })
                .eq("id", oldMat.material_id);
            }
          }
        }

        await supabase.from("item_materials").delete().eq("item_id", item.id);
        await supabase.from("item_labor").delete().eq("item_id", item.id);

        // Deduct new quantities
        for (const mat of materials) {
          const material = rawMaterials.find(m => m.id === mat.material_id);
          if (!material) continue;

          const deductAmount = (material.type === "diamond" || material.type === "gem" || material.type === "south_sea_pearl")
            ? (mat.pieces || 0)
            : (mat.quantity || 0);

          if (deductAmount <= 0) continue;

          const { data: current } = await supabase
            .from("raw_materials")
            .select("quantity_on_hand")
            .eq("id", mat.material_id)
            .single();

          if (!current) continue;

          const newQty = current.quantity_on_hand - deductAmount;
          if (newQty < 0) {
            throw new Error(`Insufficient stock for ${material.name}`);
          }

          await supabase
            .from("raw_materials")
            .update({ quantity_on_hand: newQty })
            .eq("id", mat.material_id);
        }
      } else {
        const { data: newItem, error } = await supabase
          .from("finished_items")
          .insert(itemData)
          .select()
          .single();

        if (error) throw error;
        itemId = newItem.id;

        // Deduct new materials (same logic as above)
        for (const mat of materials) {
          const material = rawMaterials.find(m => m.id === mat.material_id);
          if (!material) continue;

          const deductAmount = (material.type === "diamond" || material.type === "gem" || material.type === "south_sea_pearl")
            ? (mat.pieces || 0)
            : (mat.quantity || 0);

          if (deductAmount <= 0) continue;

          const newQty = material.quantity_on_hand - deductAmount;
          if (newQty < 0) {
            throw new Error(`Insufficient stock for ${material.name}`);
          }

          await supabase
            .from("raw_materials")
            .update({ quantity_on_hand: newQty })
            .eq("id", mat.material_id);
        }
      }

      // Save materials
      for (const mat of materials) {
        const material = rawMaterials.find(m => m.id === mat.material_id);
        if (!material) continue;

        const quantityUsed = (material.type === "diamond" || material.type === "gem" || material.type === "south_sea_pearl")
          ? (mat.pieces || 0)
          : (mat.quantity || 0);

        await supabase.from("item_materials").insert({
          item_id: itemId,
          material_id: mat.material_id,
          quantity_used: quantityUsed,
          cost_at_time: mat.amountPerUnit || mat.costPerPiece || 0,
          subtotal: calculateMaterialCost(mat)
        });
      }

      // Save labor
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

      await createAuditLog(
        item ? 'UPDATE' : 'CREATE',
        'finished_items',
        itemId,
        item ? { name: item.name, sku: item.sku } : undefined,
        itemData
      );

      toast.success(item ? "Item updated successfully" : "Item created successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving item:", error);
      toast.error(error.message || "Failed to save item");
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
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Item Type</Label>
              <Popover open={itemTypeOpen} onOpenChange={setItemTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={itemTypeOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.item_type
                      ? formData.item_type === "Other" && customItemType
                        ? customItemType
                        : formData.item_type
                      : "Select item type..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search item type..." />
                    <CommandList>
                      <CommandEmpty>No item type found.</CommandEmpty>
                      <CommandGroup>
                        {ITEM_TYPES.map((type) => (
                          <CommandItem
                            key={type}
                            value={type}
                            onSelect={() => {
                              setFormData({ ...formData, item_type: type });
                              if (type !== "Other") setCustomItemType("");
                              setItemTypeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.item_type === type ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {type}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {formData.item_type === "Other" && (
                <Input
                  placeholder="Enter custom item type..."
                  value={customItemType}
                  onChange={(e) => setCustomItemType(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div>
              <Label>Customer (Optional)</Label>
              <Select
                value={formData.customer_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer (if custom)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No customer (stock item)</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Selling Price</Label>
              <CurrencyInput
                value={formData.selling_price}
                onChange={(_, numeric) => setFormData({ ...formData, selling_price: numeric.toString() })}
                showPesoSign={true}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                min="0"
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

          {/* ── MATERIALS SECTION ──────────────────────────────────────── */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-lg font-semibold">Materials Used</Label>
              <Button type="button" size="sm" onClick={addMaterial}>
                <Plus className="w-4 h-4 mr-1" /> Add Material
              </Button>
            </div>

            {materials.map((mat, index) => {
              const type = getMaterialType(mat.material_id);

              return (
                <div key={index} className="border p-4 rounded-lg mb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-1 flex-1">
                      <div>
                        <Label>Material</Label>
                        <Select
                          value={mat.material_id}
                          onValueChange={(v) => handleMaterialSelect(index, v)}
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

                      {(type === "gold" || type === "silver" || type === "other") && (
                        <>
                          <div>
                            <Label>Quantity {type === "other" ? "" : "(grams)"}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={mat.quantity || ""}
                              onChange={(e) => updateMaterial(index, "quantity", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label>Cost per Unit</Label>
                            <CurrencyInput
                              value={mat.amountPerUnit}
                              onChange={(_, num) => updateMaterial(index, "amountPerUnit", num)}
                              showPesoSign={true}
                            />
                          </div>
                        </>
                      )}

                      {(type === "diamond" || type === "gem") && (
                        <>
                          <div>
                            <Label>Pieces</Label>
                            <Input
                              type="number"
                              min="0"
                              value={mat.pieces || ""}
                              onChange={(e) => updateMaterial(index, "pieces", parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label>Carat per piece</Label>
                            <Input
                                type="number"
                                value={mat.carat ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateMaterial(index, "carat", val === "" ? "" : Number(val));
                                }}
                              />
                          </div>
                          <div>
                            <Label>Price per Carat</Label>
                            <CurrencyInput
                              value={mat.amountPerUnit}
                              onChange={(_, num) => updateMaterial(index, "amountPerUnit", num)}
                              showPesoSign={true}
                            />
                          </div>
                        </>
                      )}

                      {type === "south_sea_pearl" && (
                        <>
                          <div>
                            <Label>Pieces</Label>
                            <Input
                              type="number"
                              min="0"
                              value={mat.pieces || ""}
                              onChange={(e) => updateMaterial(index, "pieces", parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label>Cost per Piece</Label>
                            <CurrencyInput
                              value={mat.costPerPiece}
                              onChange={(_, num) => updateMaterial(index, "costPerPiece", num)}
                              showPesoSign={true}
                            />
                          </div>
                        </>
                      )}

                      {/* Total column - last in grid */}
                      <div className="col-span-full md:col-span-1">
                        <Label>Total</Label>
                        <div className="h-10 flex items-center px-3 border rounded-md bg-muted/40">
                          ₱{calculateMaterialCost(mat).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMaterial(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── LABOR SECTION ──────────────────────────────────────────── */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-lg font-semibold">Labor Costs</Label>
              <Button type="button" size="sm" onClick={addLabor}>
                <Plus className="w-4 h-4 mr-1" /> Add Labor
              </Button>
            </div>

            {labor.map((lab, index) => (
              <div key={index} className="border p-4 rounded-lg mb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={lab.type}
                        onValueChange={(v) => updateLabor(index, "type", v)}
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
                            min="0"
                            value={lab.pieces || ""}
                            onChange={(e) => updateLabor(index, "pieces", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Amount per Piece</Label>
                          <CurrencyInput
                            value={lab.amountPerPiece}
                            onChange={(_, num) => updateLabor(index, "amountPerPiece", num)}
                            showPesoSign={true}
                          />
                        </div>
                      </>
                    )}

                    {lab.type === "tubog" && (
                      <div>
                        <Label>Fixed Cost</Label>
                        <CurrencyInput
                          value={lab.fixedCost}
                          onChange={(_, num) => updateLabor(index, "fixedCost", num)}
                          showPesoSign={true}
                        />
                      </div>
                    )}

                    <div>
                      <Label>Total</Label>
                      <div className="h-10 flex items-center px-3 border rounded-md bg-muted/40">
                        ₱{calculateLaborCost(lab).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeLabor(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Total Cost Display */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Cost:</span>
              <span className="text-primary">
                ₱{calculateTotalCost().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : item ? "Update Item" : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}