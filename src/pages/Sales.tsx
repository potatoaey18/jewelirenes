import { useState, useEffect } from "react";
import { Search, Plus, Minus, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutDialog } from "@/components/pos/CheckoutDialog";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string;
}

const Sales = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, category, image_url")
      .gt("stock", 0);

    if (error) {
      toast.error("Failed to load products");
      console.error(error);
    } else {
      setProducts(data || []);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + delta;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setCheckoutOpen(true);
  };

  const handleCheckoutSuccess = () => {
    setCart([]);
    setCheckoutOpen(false);
    fetchProducts();
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  const TAX_RATE = 0.12;
  const subtotal = total;
  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Sales</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Select products to add to cart
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3 md:p-4">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-24 md:h-32 object-cover rounded-md mb-2"
                      />
                    )}
                    <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">
                      {product.category}
                    </p>
                    <p className="text-base md:text-lg font-bold text-accent">
                      ₱{product.price.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-4 h-fit">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl">Shopping Cart</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[40vh] md:max-h-[50vh] overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm md:text-base truncate">{item.name}</p>
                            <p className="text-xs md:text-sm text-muted-foreground">
                              ₱{item.price.toFixed(2)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-1 md:gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="h-7 w-7 md:h-8 md:w-8 p-0"
                            >
                              <Minus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <span className="w-6 md:w-8 text-center font-medium text-sm md:text-base">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="h-7 w-7 md:h-8 md:w-8 p-0"
                            >
                              <Plus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItem(item.id)}
                              className="h-7 w-7 md:h-8 md:w-8 p-0 ml-1"
                            >
                              <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-3 md:pt-4 border-t">
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Subtotal:</span>
                        <span className="font-medium">₱{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm md:text-base">
                        <span>Tax (12%):</span>
                        <span className="font-medium">₱{tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base md:text-lg font-bold pt-2 border-t">
                        <span>Total:</span>
                        <span className="text-accent">₱{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      size="lg" 
                      onClick={handleCheckout}
                    >
                      <CreditCard className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                      Complete Sale
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        total={grandTotal}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
};

export default Sales;
