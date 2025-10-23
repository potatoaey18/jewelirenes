import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
  onSuccess: () => void;
}

export const ProductDialog = ({ open, onOpenChange, product, onSuccess }: ProductDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    metal: "",
    gemstone: "",
    carat: "",
    weight: "",
    price: "",
    cost_price: "",
    stock: "",
    description: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        sku: product.sku || "",
        category: product.category || "",
        metal: product.metal || "",
        gemstone: product.gemstone || "",
        carat: product.carat || "",
        weight: product.weight || "",
        price: product.price?.toString() || "",
        cost_price: product.cost_price?.toString() || "",
        stock: product.stock?.toString() || "",
        description: product.description || "",
      });
      setImagePreview(product.image_url || "");
    } else {
      setFormData({
        name: "",
        sku: "",
        category: "",
        metal: "",
        gemstone: "",
        carat: "",
        weight: "",
        price: "",
        cost_price: "",
        stock: "",
        description: "",
      });
      setImagePreview("");
    }
    setImageFile(null);
  }, [product, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = product?.image_url || "";

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        stock: parseInt(formData.stock) || 0,
        image_url: imageUrl,
      };

      if (product) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);
        if (error) throw error;
        toast.success("Product updated successfully");
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
        toast.success("Product created successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Product Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU*</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category*</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="metal">Metal</Label>
              <Input
                id="metal"
                value={formData.metal}
                onChange={(e) => setFormData({ ...formData, metal: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="gemstone">Gemstone</Label>
              <Input
                id="gemstone"
                value={formData.gemstone}
                onChange={(e) => setFormData({ ...formData, gemstone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="carat">Carat</Label>
              <Input
                id="carat"
                value={formData.carat}
                onChange={(e) => setFormData({ ...formData, carat: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="price">Price*</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="cost_price">Cost Price</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="stock">Stock*</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label>Product Image</Label>
            <div className="mt-2">
              {imagePreview && (
                <div className="relative w-32 h-32 mb-2">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 h-6 w-6"
                    onClick={() => {
                      setImagePreview("");
                      setImageFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <Label
                htmlFor="image-upload"
                className="flex items-center gap-2 cursor-pointer border border-input rounded-md px-4 py-2 hover:bg-accent w-fit"
              >
                <Upload className="h-4 w-4" />
                {imagePreview ? "Change Image" : "Upload Image"}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-accent hover:bg-accent/90">
              {loading ? "Saving..." : product ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};