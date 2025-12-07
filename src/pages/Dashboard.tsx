import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, Users, DollarSign, Receipt, Banknote, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { TrendDialog } from "@/components/dashboard/TrendDialog";
import { CashOnlinePaymentDialog } from "@/components/dashboard/CashOnlinePaymentDialog";
import { useNavigate } from "react-router-dom";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, subYears } from "date-fns";

type TrendPeriod = "weekly" | "monthly" | "yearly";

interface TransactionSummary {
  id: string;
  customer_name: string;
  product_names: string[];
  amount: number;
  date: string;
  source: "transaction" | "collection" | "bank_check";
  payment_method?: string;
}

interface OnlinePaymentSummary {
  gcash: TransactionSummary[];
  bdo: TransactionSummary[];
  bpi: TransactionSummary[];
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
  const [cashOnlineStats, setCashOnlineStats] = useState({
    cashReceived: 0,
    gcashReceived: 0,
    bdoReceived: 0,
    bpiReceived: 0,
  });
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("daily");
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [trendDialog, setTrendDialog] = useState<{
    open: boolean;
    title: string;
    data: Array<{ date: string; value: number; details?: any }>;
    type?: string;
    period: TrendPeriod;
  }>({ open: false, title: "", data: [], period: "weekly" });
  const [cashOnlineDialog, setCashOnlineDialog] = useState<{
    open: boolean;
    type: "cash" | "online";
    cashData: TransactionSummary[];
    onlineData: OnlinePaymentSummary;
    totalCash: number;
    totalOnline: { gcash: number; bdo: number; bpi: number };
  }>({ 
    open: false, 
    type: "cash", 
    cashData: [], 
    onlineData: { gcash: [], bdo: [], bpi: [] },
    totalCash: 0,
    totalOnline: { gcash: 0, bdo: 0, bpi: 0 }
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchRecentSales();

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
    fetchCashOnlineStats();
  }, [periodFilter]);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayTransactions } = await supabase
      .from("transactions")
      .select("total_amount")
      .gte("created_at", today.toISOString());

    const todaySales = todayTransactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
    const todayOrders = todayTransactions?.length || 0;

    const { count: totalCustomers } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    const { data: allTransactions } = await supabase
      .from("transactions")
      .select("total_amount");

    const transactionRevenue = allTransactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    const { data: encashedChecks } = await supabase
      .from("bank_checks")
      .select("amount")
      .eq("status", "Encashed");

    const encashedCheckRevenue = encashedChecks?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    const totalRevenue = transactionRevenue + encashedCheckRevenue;

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

  const fetchCashOnlineStats = async () => {
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

    // Calculate cash received
    const cashFromTransactions = transactions
      ?.filter(t => t.payment_type?.toLowerCase() === 'cash')
      .reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    const cashFromCollections = collections
      ?.filter(c => c.payment_method?.toLowerCase() === 'cash')
      .reduce((sum, c) => sum + Number(c.amount_paid), 0) || 0;

    const cashReceived = cashFromTransactions + cashFromCollections;

    // Calculate GCash received
    const gcashFromTransactions = transactions
      ?.filter(t => t.payment_type?.toLowerCase() === 'gcash')
      .reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    const gcashFromCollections = collections
      ?.filter(c => c.payment_method?.toLowerCase() === 'gcash')
      .reduce((sum, c) => sum + Number(c.amount_paid), 0) || 0;

    const gcashReceived = gcashFromTransactions + gcashFromCollections;

    // Calculate BDO received
    const bdoFromTransactions = transactions
      ?.filter(t => t.payment_type?.toLowerCase() === 'bdo')
      .reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    const bdoFromCollections = collections
      ?.filter(c => c.payment_method?.toLowerCase() === 'bdo')
      .reduce((sum, c) => sum + Number(c.amount_paid), 0) || 0;

    const bdoReceived = bdoFromTransactions + bdoFromCollections;

    // Calculate BPI received
    const bpiFromTransactions = transactions
      ?.filter(t => t.payment_type?.toLowerCase() === 'bpi')
      .reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    const bpiFromCollections = collections
      ?.filter(c => c.payment_method?.toLowerCase() === 'bpi')
      .reduce((sum, c) => sum + Number(c.amount_paid), 0) || 0;

    const bpiReceived = bpiFromTransactions + bpiFromCollections;

    setCashOnlineStats({
      cashReceived,
      gcashReceived,
      bdoReceived,
      bpiReceived,
    });
  };

  const fetchCashOnlineDetails = async (type: "cash" | "online") => {
    const periodStart = getPeriodStartDate();
    const cashData: TransactionSummary[] = [];
    const onlineData: OnlinePaymentSummary = { gcash: [], bdo: [], bpi: [] };

    if (type === "cash") {
      // Fetch cash transactions
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
        cashData.push({
          id: t.id,
          customer_name: t.customers?.name || "Unknown",
          product_names: t.transaction_items?.map((i: any) => i.product_name) || [],
          amount: Number(t.total_amount),
          date: t.created_at,
          source: "transaction"
        });
      });

      // Fetch cash collections
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
        cashData.push({
          id: c.id,
          customer_name: c.payment_plans?.customers?.name || "Unknown",
          product_names: c.payment_plans?.transactions?.transaction_items?.map((i: any) => i.product_name) || [],
          amount: Number(c.amount_paid),
          date: c.payment_date,
          source: "collection"
        });
      });
    } else {
      // Fetch online transactions for each payment method
      const paymentMethods = ['gcash', 'bdo', 'bpi'];
      
      for (const method of paymentMethods) {
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
          .ilike("payment_type", method);

        transactions?.forEach(t => {
          const item: TransactionSummary = {
            id: t.id,
            customer_name: t.customers?.name || "Unknown",
            product_names: t.transaction_items?.map((i: any) => i.product_name) || [],
            amount: Number(t.total_amount),
            date: t.created_at,
            source: "transaction",
            payment_method: method
          };
          onlineData[method as keyof OnlinePaymentSummary].push(item);
        });

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
          .ilike("payment_method", method);

        collections?.forEach(c => {
          const item: TransactionSummary = {
            id: c.id,
            customer_name: c.payment_plans?.customers?.name || "Unknown",
            product_names: c.payment_plans?.transactions?.transaction_items?.map((i: any) => i.product_name) || [],
            amount: Number(c.amount_paid),
            date: c.payment_date,
            source: "collection",
            payment_method: method
          };
          onlineData[method as keyof OnlinePaymentSummary].push(item);
        });
      }
    }

    // Sort by date descending
    cashData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onlineData.gcash.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onlineData.bdo.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    onlineData.bpi.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setCashOnlineDialog({
      open: true,
      type,
      cashData,
      onlineData,
      totalCash: cashData.reduce((sum, item) => sum + item.amount, 0),
      totalOnline: {
        gcash: onlineData.gcash.reduce((sum, item) => sum + item.amount, 0),
        bdo: onlineData.bdo.reduce((sum, item) => sum + item.amount, 0),
        bpi: onlineData.bpi.reduce((sum, item) => sum + item.amount, 0),
      }
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

  const fetchTrendData = async (type: string, period: TrendPeriod = "weekly") => {
    let startDate: Date;
    let groupByMonth = false;

    switch (period) {
      case "weekly":
        startDate = subDays(new Date(), 7);
        break;
      case "monthly":
        startDate = subDays(new Date(), 30);
        break;
      case "yearly":
        startDate = subYears(new Date(), 1);
        groupByMonth = true;
        break;
      default:
        startDate = subDays(new Date(), 7);
    }

    if (type === "sales" || type === "revenue") {
      const { data } = await supabase
        .from("transactions")
        .select("total_amount, created_at, id")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      const groupedData = new Map<string, { value: number; transactions: any[] }>();
      
      data?.forEach((t) => {
        const date = groupByMonth 
          ? format(new Date(t.created_at), "yyyy-MM") 
          : new Date(t.created_at).toISOString().split("T")[0];
        const existing = groupedData.get(date) || { value: 0, transactions: [] };
        groupedData.set(date, {
          value: existing.value + Number(t.total_amount),
          transactions: [...existing.transactions, t],
        });
      });

      const trendData = Array.from(groupedData.entries()).map(([date, data]) => ({
        date: groupByMonth ? `${date}-01` : date,
        value: data.value,
        details: { transactions: data.transactions, type: "transaction" },
      }));

      setTrendDialog({
        open: true,
        title: type === "sales" ? "Today's Sales" : "Revenue",
        data: trendData,
        type: "transaction",
        period,
      });
    } else if (type === "expenses") {
      const { data } = await supabase
        .from("expenses")
        .select("amount, expense_date, id")
        .gte("expense_date", startDate.toISOString())
        .order("expense_date", { ascending: true });

      const groupedData = new Map<string, { value: number; expenses: any[] }>();
      
      data?.forEach((e) => {
        const date = groupByMonth 
          ? format(new Date(e.expense_date), "yyyy-MM") 
          : new Date(e.expense_date).toISOString().split("T")[0];
        const existing = groupedData.get(date) || { value: 0, expenses: [] };
        groupedData.set(date, {
          value: existing.value + Number(e.amount),
          expenses: [...existing.expenses, e],
        });
      });

      const trendData = Array.from(groupedData.entries()).map(([date, data]) => ({
        date: groupByMonth ? `${date}-01` : date,
        value: data.value,
        details: { expenses: data.expenses, type: "expense" },
      }));

      setTrendDialog({
        open: true,
        title: "Expenses",
        data: trendData,
        type: "expense",
        period,
      });
    }
  };

  const handleTrendPeriodChange = (period: TrendPeriod) => {
    if (trendDialog.type) {
      fetchTrendData(trendDialog.type === "transaction" ? "revenue" : "expenses", period);
    }
  };

  const handleDataPointClick = (details: any) => {
    if (details.type === "transaction" && details.transactions?.[0]) {
      navigate("/sales");
      setTrendDialog({ open: false, title: "", data: [], period: "weekly" });
    } else if (details.type === "expense" && details.expenses?.[0]) {
      navigate("/expenses");
      setTrendDialog({ open: false, title: "", data: [], period: "weekly" });
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

  const periodLabel = periodFilter === 'daily' ? 'Today' : periodFilter === 'weekly' ? 'This Week' : 'This Month';
  const totalOnlinePayments = cashOnlineStats.gcashReceived + cashOnlineStats.bdoReceived + cashOnlineStats.bpiReceived;

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

        {/* Cash & Online Payments Section */}
        <Card className="mb-6 sm:mb-8 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Cash & Online Payments</CardTitle>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cash Column */}
              <div 
                className="bg-green-500/10 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-green-500/20 transition-colors"
                onClick={() => fetchCashOnlineDetails("cash")}
              >
                <div className="bg-green-500/20 p-3 rounded-full">
                  <Banknote className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cash Received ({periodLabel})</p>
                  <p className="text-2xl font-bold text-green-600">₱{cashOnlineStats.cashReceived.toLocaleString()}</p>
                </div>
              </div>

              {/* Online Payments Column */}
              <div 
                className="bg-blue-500/10 rounded-lg p-4 cursor-pointer hover:bg-blue-500/20 transition-colors"
                onClick={() => fetchCashOnlineDetails("online")}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-blue-500/20 p-3 rounded-full">
                    <Smartphone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Online Payments ({periodLabel})</p>
                    <p className="text-2xl font-bold text-blue-600">₱{totalOnlinePayments.toLocaleString()}</p>
                  </div>
                </div>
                {/* Sub-columns for GCash, BDO, BPI */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-blue-500/20">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">GCash</p>
                    <p className="text-sm font-semibold text-blue-600">₱{cashOnlineStats.gcashReceived.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">BDO</p>
                    <p className="text-sm font-semibold text-orange-600">₱{cashOnlineStats.bdoReceived.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">BPI</p>
                    <p className="text-sm font-semibold text-purple-600">₱{cashOnlineStats.bpiReceived.toLocaleString()}</p>
                  </div>
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
          onPeriodChange={handleTrendPeriodChange}
        />

        <CashOnlinePaymentDialog
          open={cashOnlineDialog.open}
          onOpenChange={(open) => setCashOnlineDialog({ ...cashOnlineDialog, open })}
          type={cashOnlineDialog.type}
          cashData={cashOnlineDialog.cashData}
          onlineData={cashOnlineDialog.onlineData}
          totalCash={cashOnlineDialog.totalCash}
          totalOnline={cashOnlineDialog.totalOnline}
          periodLabel={periodLabel}
        />
      </main>
    </div>
  );
};

export default Dashboard;