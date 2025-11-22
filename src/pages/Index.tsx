import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, Users, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const Index = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    totalExpenses: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentSales();

    const channel = supabase
      .channel("transactions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        fetchStats();
        fetchRecentSales();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: todayTransactions, error: todayError } = await supabase
        .from("transactions")
        .select("total_amount")
        .gte("created_at", today);

      if (todayError) throw todayError;

      const todaySales = todayTransactions?.reduce((sum, t) => sum + Number(t.total_amount || 0), 0) || 0;
      const todayOrders = todayTransactions?.length || 0;

      const { data: allTransactions, error: allError } = await supabase
        .from("transactions")
        .select("total_amount");

      if (allError) throw allError;

      const totalRevenue = allTransactions?.reduce((sum, t) => sum + Number(t.total_amount || 0), 0) || 0;

      const { count: customerCount } = await supabase.from("customers").select("*", { count: "exact", head: true });

      const { data: expenses, error: expensesError } = await supabase.from("expenses").select("amount");

      if (expensesError) throw expensesError;

      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;

      setStats({
        todaySales,
        todayOrders,
        totalCustomers: customerCount || 0,
        totalRevenue,
        totalExpenses,
      });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          customers(name),
          transaction_items(product_name, quantity)
        `)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentSales(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchChartData = async (metric: string) => {
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });

      if (metric === "sales" || metric === "revenue") {
        const { data, error } = await supabase
          .from("transactions")
          .select("created_at, total_amount, transaction_items(product_name)")
          .gte("created_at", last7Days[0]);

        if (error) throw error;

        const chartData = last7Days.map((date) => {
          const dayTransactions = data?.filter((t) => t.created_at.startsWith(date)) || [];
          const value = dayTransactions.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
          return {
            date: format(new Date(date), "MMM dd"),
            value,
            transactions: dayTransactions,
          };
        });

        setChartData(chartData);
      } else if (metric === "expenses") {
        const { data, error } = await supabase
          .from("expenses")
          .select("expense_date, amount, description, vendor")
          .gte("expense_date", last7Days[0]);

        if (error) throw error;

        const chartData = last7Days.map((date) => {
          const dayExpenses = data?.filter((e) => e.expense_date.startsWith(date)) || [];
          const value = dayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
          return {
            date: format(new Date(date), "MMM dd"),
            value,
            expenses: dayExpenses,
          };
        });

        setChartData(chartData);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCardClick = (metric: string) => {
    setSelectedMetric(metric);
    fetchChartData(metric);
  };

  const handleChartClick = (transactionId?: string) => {
    if (transactionId) {
      navigate(`/sales`);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-base mb-2">{data.date}</p>
          <p className="text-accent text-lg font-bold mb-2">Php {data.value.toLocaleString()}</p>
          {data.transactions && data.transactions.length > 0 && (
            <div className="space-y-1">
              {data.transactions.slice(0, 3).map((t: any, i: number) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {t.transaction_items?.[0]?.product_name || "Transaction"} - Php {parseFloat(t.total_amount).toLocaleString()}
                </p>
              ))}
            </div>
          )}
          {data.expenses && data.expenses.length > 0 && (
            <div className="space-y-1">
              {data.expenses.slice(0, 3).map((e: any, i: number) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {e.vendor || e.description || "Expense"} - Php {parseFloat(e.amount).toLocaleString()}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const statsData = [
    {
      title: "Today's Sales",
      value: `Php ${stats.todaySales.toLocaleString()}`,
      icon: TrendingUp,
      gradient: "from-accent/20 to-accent/5",
      metric: "sales",
    },
    {
      title: "Today's Orders",
      value: stats.todayOrders,
      icon: ShoppingBag,
      gradient: "from-primary/20 to-primary/5",
      metric: "sales",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      gradient: "from-secondary/20 to-secondary/5",
      metric: null,
    },
    {
      title: "Total Revenue",
      value: `Php ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-accent/30 to-accent/10",
      metric: "revenue",
    },
    {
      title: "Total Expenses",
      value: `Php ${stats.totalExpenses.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-destructive/20 to-destructive/5",
      metric: "expenses",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3">Analytics Dashboard</h2>
          <p className="text-base sm:text-lg text-muted-foreground">Welcome back! Here's your business overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {statsData.map((stat, index) => (
            <Card
              key={index}
              className={`overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${stat.metric ? "cursor-pointer" : ""}`}
              onClick={() => stat.metric && handleCardClick(stat.metric)}
            >
              <div className={`h-2 bg-gradient-to-r ${stat.gradient}`} />
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <p className="text-sm sm:text-base font-medium text-muted-foreground">{stat.title}</p>
                  <stat.icon className="h-6 w-6 sm:h-7 sm:w-7 text-accent" />
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedMetric && chartData.length > 0 && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">
                {selectedMetric === "sales" ? "Sales" : selectedMetric === "revenue" ? "Revenue" : "Expenses"} Trend (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "14px" }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "14px" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--accent))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--accent))", r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-base sm:text-lg">No sales yet</p>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 sm:pb-6 border-b last:border-0 gap-3 sm:gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold text-base sm:text-lg">
                        {sale.transaction_items?.[0]?.product_name || "Product"}
                        {sale.transaction_items?.length > 1 && ` +${sale.transaction_items.length - 1} more`}
                      </p>
                      <p className="text-sm sm:text-base text-muted-foreground">{sale.customers?.name || "Customer"}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {format(new Date(sale.created_at), "PPp")}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xl sm:text-2xl font-bold text-accent">Php {parseFloat(sale.total_amount).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
