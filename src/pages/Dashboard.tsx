import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, Users, DollarSign, Receipt, Banknote, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { TrendDialog } from "@/components/dashboard/TrendDialog";
import { CashCheckSummaryDialog } from "@/components/dashboard/CashCheckSummaryDialog";
import { useNavigate } from "react-router-dom";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths } from "date-fns";

interface TransactionSummary {
  id: string;
  customer_name: string;
  product_names: string[];
  amount: number;
  date: string;
  source: "transaction" | "collection" | "bank_check";
}

type PeriodFilter = "daily" | "weekly" | "monthly";

const Dashboard = () => {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    totalExpenses: 0,
  });
  const [cashCheckStats, setCashCheckStats] = useState({
    cashReceived: 0,
    checkReceived: 0,
  });
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("daily");
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [trendDialog, setTrendDialog] = useState<{
    open: boolean;
    title: string;
    data: Array<{ date: string; value: number; details?: any }>;
    type?: string;
  }>({ open: false, title: "", data: [] });
  const [cashCheckDialog, setCashCheckDialog] = useState<{
    open: boolean;
    type: "cash" | "check";
    data: TransactionSummary[];
    totalAmount: number;
  }>({ open: false, type: "cash", data: [], totalAmount: 0 });
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchCashCheckStats();
  }, [periodFilter]);

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

    // Total expenses
    const { data: allExpenses } = await supabase
      .from("expenses")
      .select("amount");

    const totalExpenses = allExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    setStats({
      todaySales,
      todayOrders,
      totalCustomers: totalCustomers || 0,
      totalRevenue,
      totalExpenses,
    });
  };

  const getPeriodStartDate = () => {
    const now = new Date();
    switch (periodFilter) {
      case "daily":
        return startOfDay(now);
      case "weekly":
        return startOfWeek(now, { weekStartsOn: 1 });
      case "monthly":
        return startOfMonth(now);
      default:
        return startOfDay(now);
    }
  };

  const fetchCashCheckStats = async () => {
    const periodStart = getPeriodStartDate();

    // Fetch transactions with payment type
    const { data: transactions } = await supabase
      .from("transactions")
      .select("total_amount, payment_type")
      .gte("created_at", periodStart.toISOString());

    // Fetch collections with payment method
    const { data: collections } = await supabase
      .from("collections")
      .select("amount_paid, payment_method")
      .gte("payment_date", periodStart.toISOString());

    // Fetch bank checks received in the period
    const { data: bankChecks } = await supabase
      .from("bank_checks")
      .select("amount")
      .gte("date_received", periodStart.toISOString());

    // Calculate cash received (from transactions + collections)
    const cashFromTransactions = transactions
      ?.filter(t => t.payment_type?.toLowerCase() === 'cash')
      .reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    const cashFromCollections = collections
      ?.filter(c => c.payment_method?.toLowerCase() === 'cash')
      .reduce((sum, c) => sum + Number(c.amount_paid), 0) || 0;

    const cashReceived = cashFromTransactions + cashFromCollections;

    // Calculate check received (from bank checks + transactions/collections with check payment)
    const checkFromBankChecks = bankChecks?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    const checkFromTransactions = transactions
      ?.filter(t => t.payment_type?.toLowerCase() === 'check')
      .reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    const checkFromCollections = collections
      ?.filter(c => c.payment_method?.toLowerCase() === 'check')
      .reduce((sum, c) => sum + Number(c.amount_paid), 0) || 0;

    const checkReceived = checkFromBankChecks + checkFromTransactions + checkFromCollections;

    setCashCheckStats({
      cashReceived,
      checkReceived,
    });
  };

  const fetchCashCheckDetails = async (type: "cash" | "check") => {
    const periodStart = getPeriodStartDate();
    const summaryData: TransactionSummary[] = [];

    if (type === "cash") {
      // Fetch cash transactions with customer and product info
      const { data: transactions } = await supabase
        .from("transactions")
        .select(`
          id,
          total_amount,
          created_at,
          payment_type,
          customers (name),
          transaction_items (product_name)
        `)
        .gte("created_at", periodStart.toISOString())
        .ilike("payment_type", "cash");

      transactions?.forEach(t => {
        summaryData.push({
          id: t.id,
          customer_name: t.customers?.name || "Unknown",
          product_names: t.transaction_items?.map((i: any) => i.product_name) || [],
          amount: Number(t.total_amount),
          date: t.created_at,
          source: "transaction"
        });
      });

      // Fetch cash collections with customer and transaction info
      const { data: collections } = await supabase
        .from("collections")
        .select(`
          id,
          amount_paid,
          payment_date,
          payment_method,
          payment_plans (
            customers (name),
            transactions (
              transaction_items (product_name)
            )
          )
        `)
        .gte("payment_date", periodStart.toISOString())
        .ilike("payment_method", "cash");

      collections?.forEach(c => {
        summaryData.push({
          id: c.id,
          customer_name: c.payment_plans?.customers?.name || "Unknown",
          product_names: c.payment_plans?.transactions?.transaction_items?.map((i: any) => i.product_name) || [],
          amount: Number(c.amount_paid),
          date: c.payment_date,
          source: "collection"
        });
      });
    } else {
      // Fetch check transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select(`
          id,
          total_amount,
          created_at,
          payment_type,
          customers (name),
          transaction_items (product_name)
        `)
        .gte("created_at", periodStart.toISOString())
        .ilike("payment_type", "check");

      transactions?.forEach(t => {
        summaryData.push({
          id: t.id,
          customer_name: t.customers?.name || "Unknown",
          product_names: t.transaction_items?.map((i: any) => i.product_name) || [],
          amount: Number(t.total_amount),
          date: t.created_at,
          source: "transaction"
        });
      });

      // Fetch check collections
      const { data: collections } = await supabase
        .from("collections")
        .select(`
          id,
          amount_paid,
          payment_date,
          payment_method,
          payment_plans (
            customers (name),
            transactions (
              transaction_items (product_name)
            )
          )
        `)
        .gte("payment_date", periodStart.toISOString())
        .ilike("payment_method", "check");

      collections?.forEach(c => {
        summaryData.push({
          id: c.id,
          customer_name: c.payment_plans?.customers?.name || "Unknown",
          product_names: c.payment_plans?.transactions?.transaction_items?.map((i: any) => i.product_name) || [],
          amount: Number(c.amount_paid),
          date: c.payment_date,
          source: "collection"
        });
      });

      // Fetch bank checks
      const { data: bankChecks } = await supabase
        .from("bank_checks")
        .select(`
          id,
          amount,
          date_received,
          invoice_number,
          customers (name)
        `)
        .gte("date_received", periodStart.toISOString());

      bankChecks?.forEach(bc => {
        summaryData.push({
          id: bc.id,
          customer_name: bc.customers?.name || "Unknown",
          product_names: bc.invoice_number ? [`Invoice: ${bc.invoice_number}`] : [],
          amount: Number(bc.amount),
          date: bc.date_received,
          source: "bank_check"
        });
      });
    }

    // Sort by date descending
    summaryData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalAmount = summaryData.reduce((sum, item) => sum + item.amount, 0);

    setCashCheckDialog({
      open: true,
      type,
      data: summaryData,
      totalAmount
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

  const fetchTrendData = async (type: string) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (type === "sales" || type === "revenue") {
      const { data } = await supabase
        .from("transactions")
        .select("total_amount, created_at, id")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      const dailyData = new Map<string, { value: number; transactions: any[] }>();
      
      data?.forEach((t) => {
        const date = new Date(t.created_at).toISOString().split("T")[0];
        const existing = dailyData.get(date) || { value: 0, transactions: [] };
        dailyData.set(date, {
          value: existing.value + Number(t.total_amount),
          transactions: [...existing.transactions, t],
        });
      });

      const trendData = Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        value: data.value,
        details: { transactions: data.transactions, type: "transaction" },
      }));

      setTrendDialog({
        open: true,
        title: type === "sales" ? "Today's Sales" : "Revenue",
        data: trendData,
        type: "transaction",
      });
    } else if (type === "expenses") {
      const { data } = await supabase
        .from("expenses")
        .select("amount, expense_date, id")
        .gte("expense_date", sevenDaysAgo.toISOString())
        .order("expense_date", { ascending: true });

      const dailyData = new Map<string, { value: number; expenses: any[] }>();
      
      data?.forEach((e) => {
        const date = new Date(e.expense_date).toISOString().split("T")[0];
        const existing = dailyData.get(date) || { value: 0, expenses: [] };
        dailyData.set(date, {
          value: existing.value + Number(e.amount),
          expenses: [...existing.expenses, e],
        });
      });

      const trendData = Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        value: data.value,
        details: { expenses: data.expenses, type: "expense" },
      }));

      setTrendDialog({
        open: true,
        title: "Expenses",
        data: trendData,
        type: "expense",
      });
    }
  };

  const handleDataPointClick = (details: any) => {
    if (details.type === "transaction" && details.transactions?.[0]) {
      navigate("/sales");
      setTrendDialog({ open: false, title: "", data: [] });
    } else if (details.type === "expense" && details.expenses?.[0]) {
      navigate("/expenses");
      setTrendDialog({ open: false, title: "", data: [] });
    }
  };

  const statsData = [
    {
      title: "Today's Sales",
      value: `₱${stats.todaySales.toLocaleString()}`,
      icon: DollarSign,
      trend: "",
      bgGradient: "from-accent/20 to-accent/5",
      type: "sales",
    },
    {
      title: "Orders",
      value: stats.todayOrders.toString(),
      icon: ShoppingBag,
      trend: "",
      bgGradient: "from-primary/10 to-primary/5",
      type: "",
    },
    {
      title: "Customers",
      value: stats.totalCustomers.toString(),
      icon: Users,
      trend: "",
      bgGradient: "from-secondary to-secondary/50",
      type: "",
    },
    {
      title: "Revenue",
      value: `₱${stats.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      trend: "",
      bgGradient: "from-accent/20 to-accent/5",
      type: "revenue",
    },
    {
      title: "Expenses",
      value: `₱${stats.totalExpenses.toLocaleString()}`,
      icon: Receipt,
      trend: "",
      bgGradient: "from-destructive/20 to-destructive/5",
      type: "expenses",
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {statsData.map((stat) => (
            <Card
              key={stat.title}
              className="relative overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              onClick={() => stat.type && fetchTrendData(stat.type)}
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

        {/* Cash & Check Received Section */}
        <Card className="mb-6 sm:mb-8 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Cash & Check Received</CardTitle>
            <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                className="bg-green-500/10 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-green-500/20 transition-colors"
                onClick={() => fetchCashCheckDetails("cash")}
              >
                <div className="bg-green-500/20 p-3 rounded-full">
                  <Banknote className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cash Received ({periodFilter === 'daily' ? 'Today' : periodFilter === 'weekly' ? 'This Week' : 'This Month'})</p>
                  <p className="text-2xl font-bold text-green-600">₱{cashCheckStats.cashReceived.toLocaleString()}</p>
                </div>
              </div>
              <div 
                className="bg-blue-500/10 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-blue-500/20 transition-colors"
                onClick={() => fetchCashCheckDetails("check")}
              >
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check Received ({periodFilter === 'daily' ? 'Today' : periodFilter === 'weekly' ? 'This Week' : 'This Month'})</p>
                  <p className="text-2xl font-bold text-blue-600">₱{cashCheckStats.checkReceived.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <p className="font-bold text-accent text-sm sm:text-base">₱{Number(sale.total_amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <TrendDialog
          open={trendDialog.open}
          onOpenChange={(open) => setTrendDialog({ ...trendDialog, open })}
          title={trendDialog.title}
          data={trendDialog.data}
          onDataPointClick={handleDataPointClick}
        />

        <CashCheckSummaryDialog
          open={cashCheckDialog.open}
          onOpenChange={(open) => setCashCheckDialog({ ...cashCheckDialog, open })}
          type={cashCheckDialog.type}
          data={cashCheckDialog.data}
          totalAmount={cashCheckDialog.totalAmount}
          periodLabel={periodFilter === 'daily' ? 'Today' : periodFilter === 'weekly' ? 'This Week' : 'This Month'}
        />
      </main>
    </div>
  );
};

export default Dashboard;
