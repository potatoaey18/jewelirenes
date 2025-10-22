import { useState } from "react";
import { UserPlus, Search, Phone, Mail, MapPin, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";

const Customers = () => {
  const [search, setSearch] = useState("");

  const customers = [
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      phone: "+1 (555) 123-4567",
      location: "New York, NY",
      totalSpent: 12450,
      purchases: 8,
      lastVisit: "2 days ago",
      tier: "VIP",
    },
    {
      id: "2",
      name: "Michael Chen",
      email: "m.chen@email.com",
      phone: "+1 (555) 234-5678",
      location: "Los Angeles, CA",
      totalSpent: 8920,
      purchases: 5,
      lastVisit: "1 week ago",
      tier: "Gold",
    },
    {
      id: "3",
      name: "Emma Davis",
      email: "emma.d@email.com",
      phone: "+1 (555) 345-6789",
      location: "Chicago, IL",
      totalSpent: 5240,
      purchases: 3,
      lastVisit: "3 days ago",
      tier: "Silver",
    },
    {
      id: "4",
      name: "James Wilson",
      email: "j.wilson@email.com",
      phone: "+1 (555) 456-7890",
      location: "Houston, TX",
      totalSpent: 18750,
      purchases: 12,
      lastVisit: "Yesterday",
      tier: "VIP",
    },
  ];

  const getTierBadge = (tier: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      VIP: { bg: "bg-accent", text: "text-accent-foreground" },
      Gold: { bg: "bg-amber-500", text: "text-white" },
      Silver: { bg: "bg-slate-400", text: "text-white" },
    };
    const style = variants[tier] || variants.Silver;
    return (
      <Badge className={`${style.bg} ${style.text} hover:${style.bg}/90`}>{tier}</Badge>
    );
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-bold mb-2">Customer Directory</h2>
            <p className="text-muted-foreground">Manage your client relationships</p>
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 bg-card border-border/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 cursor-pointer overflow-hidden"
            >
              <div className="h-24 bg-gradient-to-br from-accent/20 to-accent/5 group-hover:from-accent/30 group-hover:to-accent/10 transition-all relative">
                <div className="absolute top-3 right-3">{getTierBadge(customer.tier)}</div>
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">{customer.name}</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{customer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{customer.location}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                    <p className="text-lg font-bold text-accent">${customer.totalSpent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Purchases</p>
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="h-4 w-4 text-accent" />
                      <p className="text-lg font-bold">{customer.purchases}</p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Last visit: {customer.lastVisit}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Customers;
