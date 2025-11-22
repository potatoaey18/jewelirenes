import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, Users, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentSales();

    // Set up realtime subscription for transactions
    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchStats();
          fetchRecentSales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's sales and orders
    const { data: todayTransactions } = await supabase
      .from("transactions")
      .select("total_amount")
      .gte("created_at", today.toISOString());

    const todaySales = todayTransactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
    const todayOrders = todayTransactions?.length || 0;

    // Total customers
    const { count: totalCustomers } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    // Total revenue
    const { data: allTransactions } = await supabase
      .from("transactions")
      .select("total_amount");

    const totalRevenue = allTransactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    setStats({
      todaySales,
      todayOrders,
      totalCustomers: totalCustomers || 0,
      totalRevenue,
    });
  };

  const fetchRecentSales = async () => {
    const { data } = await supabase
      .from("transactions")
      .select(`
        id,
        total_amount,
        created_at,
        customers (name),
        transaction_items (product_name)
      `)
      .order("created_at", { ascending: false })
      .limit(3);

    setRecentSales(data || []);
  };

  const statsData = [
    {
      title: "Today's Sales",
      value: `Php ${stats.todaySales.toLocaleString()}`,
      icon: DollarSign,
      trend: "",
      bgGradient: "from-accent/20 to-accent/5",
    },
    {
      title: "Orders",
      value: stats.todayOrders.toString(),
      icon: ShoppingBag,
      trend: "",
      bgGradient: "from-primary/10 to-primary/5",
    },
    {
      title: "Customers",
      value: stats.totalCustomers.toString(),
      icon: Users,
      trend: "",
      bgGradient: "from-secondary to-secondary/50",
    },
    {
      title: "Revenue",
      value: `Php ${stats.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      trend: "",
      bgGradient: "from-accent/20 to-accent/5",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Here's what's happening with your business today.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {statsData.map((stat) => (
            <Card
              key={stat.title}
              className="relative overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50`} />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                {stat.trend && <p className="text-xs text-accent mt-1">{stat.trend}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No recent sales</p>
              ) : (
                recentSales.map((sale) => {
                  const productName = sale.transaction_items?.[0]?.product_name || "Multiple items";
                  const customerName = sale.customers?.name || "Unknown";
                  const timeAgo = new Date(sale.created_at).toLocaleTimeString();

                  return (
                    <div
                      key={sale.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors gap-3 sm:gap-0"
                    >
                      <div className="w-full sm:w-auto">
                        <p className="font-medium text-sm sm:text-base">{productName}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{customerName}</p>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <p className="font-bold text-accent text-sm sm:text-base">Php {Number(sale.total_amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
