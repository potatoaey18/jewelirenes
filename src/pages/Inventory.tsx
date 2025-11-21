import { useState, useEffect } from "react";
import { Package, Plus, Edit, Trash2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductDialog } from "@/components/inventory/ProductDialog";
import { TransactionHistoryDialog } from "@/components/inventory/TransactionHistoryDialog";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";

const Inventory = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [productTransactions, setProductTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete);

      if (error) throw error;
      toast.success("Product deleted");
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleViewHistory = async (product: any) => {
    setSelectedProduct(product);
    try {
      const { data, error } = await supabase
        .from("transaction_items")
        .select(`
          *,
          transactions(
            *,
            customers(name)
          )
        `)
        .eq("product_id", product.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProductTransactions(data || []);
      setHistoryDialogOpen(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock < 10) return <Badge variant="destructive">Low Stock</Badge>;
    if (stock < 20) return <Badge className="bg-amber-500">Medium</Badge>;
    return <Badge className="bg-green-600">In Stock</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Inventory Management</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your jewelry collection</p>
          </div>
          <Button
            onClick={handleAdd}
            className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <Card
              key={product.id}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden cursor-pointer"
              onClick={() => handleViewHistory(product)}
            >
              <div className="h-48 bg-gradient-to-br from-accent/20 to-accent/5 relative flex items-center justify-center">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-16 w-16 text-accent/40" />
                )}
                <div className="absolute top-2 right-2">{getStockBadge(product.stock)}</div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-lg mb-1 line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Metal</p>
                    <p className="font-medium">{product.metal}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Weight</p>
                    <p className="font-medium">{product.weight}</p>
                  </div>
                  {product.gemstone !== "None" && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs">Gemstone</p>
                        <p className="font-medium">{product.gemstone}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Carat</p>
                        <p className="font-medium">{product.carat}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-xl font-bold text-accent">₱{product.price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <p className="font-bold">{product.stock} units</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(product);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(product.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />

      <TransactionHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        product={selectedProduct}
        transactions={productTransactions}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
