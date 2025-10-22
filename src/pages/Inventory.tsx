import { useState } from "react";
import { Package, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";

const Inventory = () => {
  const [products] = useState([
    {
      id: "1",
      name: "Diamond Solitaire Ring",
      sku: "DSR-001",
      category: "Rings",
      metal: "18K White Gold",
      gemstone: "Diamond",
      carat: "1.5",
      weight: "3.2g",
      price: 4200,
      stock: 12,
      image: "ring",
    },
    {
      id: "2",
      name: "Gold Chain Necklace",
      sku: "GCN-002",
      category: "Necklaces",
      metal: "24K Yellow Gold",
      gemstone: "None",
      carat: "-",
      weight: "8.5g",
      price: 2850,
      stock: 8,
      image: "necklace",
    },
    {
      id: "3",
      name: "Pearl Drop Earrings",
      sku: "PDE-003",
      category: "Earrings",
      metal: "Sterling Silver",
      gemstone: "Pearl",
      carat: "-",
      weight: "2.1g",
      price: 890,
      stock: 25,
      image: "earrings",
    },
    {
      id: "4",
      name: "Ruby Tennis Bracelet",
      sku: "RTB-004",
      category: "Bracelets",
      metal: "18K Rose Gold",
      gemstone: "Ruby",
      carat: "3.0",
      weight: "12.5g",
      price: 5600,
      stock: 5,
      image: "bracelet",
    },
  ]);

  const getStockBadge = (stock: number) => {
    if (stock < 10) return <Badge variant="destructive">Low Stock</Badge>;
    if (stock < 20) return <Badge className="bg-amber-500">Medium</Badge>;
    return <Badge className="bg-green-600">In Stock</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-bold mb-2">Inventory Management</h2>
            <p className="text-muted-foreground">Manage your jewelry collection</p>
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card
              key={product.id}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden"
            >
              <div className="h-48 bg-gradient-to-br from-accent/20 to-accent/5 relative flex items-center justify-center">
                <Package className="h-16 w-16 text-accent/40" />
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
                    <p className="text-xl font-bold text-accent">${product.price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <p className="font-bold">{product.stock} units</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Inventory;
