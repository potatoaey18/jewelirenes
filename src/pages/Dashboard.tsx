import { useState, useEffect } from "react";
import { TrendingUp, ShoppingBag, Users, DollarSign, Receipt, Banknote, Smartphone, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { TrendDialog } from "@/components/dashboard/TrendDialog";
import { CashCheckSummaryDialog } from "@/components/dashboard/CashCheckSummaryDialog";
import { CashOnlinePaymentDialog } from "@/components/dashboard/CashOnlinePaymentDialog";
import { DashboardSettings } from "@/components/dashboard/DashboardSettings";
import { useNavigate } from "react-router-dom";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, subYears } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

type TrendPeriod = "weekly" | "monthly" | "yearly";
type ViewMode = "cards" | "table";

interface TransactionSummary {
  id: string;
  customer_name: string;
  product_names: string[];
  amount: number;
  date: string;
  source: "transaction" | "collection" | "bank_check";
  payment_method?: string;
}

type PeriodFilter = "daily" | "weekly" | "monthly";

const Dashboard = () => {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem("dashboard-view-mode");
    return (stored as ViewMode) || "cards";
  });
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
    checkReceived: 0,
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
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    type: "cash" | "check" | "online";
    data: TransactionSummary[];
    totalAmount: number;
    onlineData?: { gcash: TransactionSummary[]; bdo: TransactionSummary[]; bpi: TransactionSummary[] };
  }>({ open: false, type: "cash", data: [], totalAmount: 0 });
  const navigate = useNavigate();

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("dashboard-view-mode", mode);
  };

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

    // Fetch bank checks received in the period
    const { data: bankChecks } = await supabase
      .from("bank_checks")
      .select("amount")
      .gte("date_received", periodStart.toISOString());

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

    // Calculate check received (from bank checks + check payments)
    const checkFromBankChecks = bankChecks?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    const checkFromTransactions = transactions
      ?.filter(t => t.payment_type?.toLowerCase() === 'check')
      .reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    const checkFromCollections = collections
      ?.filter(c => c.payment_method?.toLowerCase() === 'check')
      .reduce((sum, c) => sum + Number(c.amount_paid), 0) || 0;

    const checkReceived = checkFromBankChecks + checkFromTransactions + checkFromCollections;

    setCashOnlineStats({
      cashReceived,
      gcashReceived,
      bdoReceived,
      bpiReceived,
      checkReceived,
    });
  };

  const fetchPaymentDetails = async (type: "cash" | "check" | "online") => {
    const periodStart = getPeriodStartDate();
    const summaryData: TransactionSummary[] = [];

    if (type === "online") {
      // Fetch all online payment types separately
      const onlineData = { gcash: [] as TransactionSummary[], bdo: [] as TransactionSummary[], bpi: [] as TransactionSummary[] };
      
      for (const paymentMethod of ["gcash", "bdo", "bpi"]) {
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
          .ilike("payment_type", paymentMethod);

        transactions?.forEach(t => {
          onlineData[paymentMethod as keyof typeof onlineData].push({
            id: t.id,
            customer_name: t.customers?.name || "Unknown",
            product_names: t.transaction_items?.map((i: any) => i.product_name) || [],
            amount: Number(t.total_amount),
            date: t.created_at,
            source: "transaction"
          });
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
          .ilike("payment_method", paymentMethod);

        collections?.forEach(c => {
          onlineData[paymentMethod as keyof typeof onlineData].push({
            id: c.id,
            customer_name: c.payment_plans?.customers?.name || "Unknown",
            product_names: c.payment_plans?.transactions?.transaction_items?.map((i: any) => i.product_name) || [],
            amount: Number(c.amount_paid),
            date: c.payment_date,
            source: "collection"
          });
        });
      }

      const totalAmount = onlineData.gcash.reduce((s, i) => s + i.amount, 0) +
                          onlineData.bdo.reduce((s, i) => s + i.amount, 0) +
                          onlineData.bpi.reduce((s, i) => s + i.amount, 0);

      setDetailDialog({
        open: true,
        type: "online",
        data: [],
        totalAmount,
        onlineData
      });
      return;
    }

    const paymentFilter = type;

    // Fetch transactions
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
      .ilike("payment_type", paymentFilter);

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

    // Fetch collections
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
      .ilike("payment_method", paymentFilter);

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

    // For check type, also fetch bank checks
    if (type === "check") {
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

    setDetailDialog({
      open: true,
      type: type === "check" ? "check" : "cash",
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
        .select(`
          id,
          total_amount,
          created_at,
          payment_type,
          tax,
          discount,
          notes,
          customers (name),
          transaction_items (product_name, quantity, unit_price)
        `)
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
        .select(`
          id,
          amount,
          expense_date,
          category,
          description,
          vendor,
          payment_method,
          notes,
          reference_number
        `)
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
      
      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">Dashboard</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Here's what's happening with your business today.</p>
          </div>
          <DashboardSettings viewMode={viewMode} onViewModeChange={handleViewModeChange} />
        </div>

        {/* Stats Grid - Cards or Table View */}
        {viewMode === "cards" ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-8">
            {statsData.map((stat) => (
              <Card
                key={stat.title}
                className="relative overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                onClick={() => stat.type && fetchTrendData(stat.type)}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50`} />
                <CardHeader className="relative flex flex-row items-center justify-between p-3 sm:pb-2">
                  <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
                </CardHeader>
                <CardContent className="relative p-3 pt-0">
                  <div className="text-base sm:text-xl lg:text-2xl font-bold">{stat.value}</div>
                  {stat.trend && <p className="text-[10px] text-accent mt-1">{stat.trend}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mb-4 sm:mb-8 border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 sm:p-3 font-medium">Metric</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.map((stat) => (
                    <tr 
                      key={stat.title} 
                      className="border-t border-border/50 hover:bg-muted/30 cursor-pointer"
                      onClick={() => stat.type && fetchTrendData(stat.type)}
                    >
                      <td className="p-2 sm:p-3 flex items-center gap-2">
                        <stat.icon className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
                        <span>{stat.title}</span>
                      </td>
                      <td className="p-2 sm:p-3 text-right font-bold">{stat.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Cash, Online Payments & Check Collections Section */}
        <Card className="mb-4 sm:mb-8 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-lg">Cash, Online & Check</CardTitle>
            <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
              <SelectTrigger className="w-[100px] sm:w-[140px] h-8 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {/* Cash Column */}
              <div 
                className="bg-green-500/10 rounded-lg p-2 sm:p-4 flex items-center gap-2 sm:gap-4 cursor-pointer hover:bg-green-500/20 transition-colors"
                onClick={() => fetchPaymentDetails("cash")}
              >
                <div className="bg-green-500/20 p-1.5 sm:p-3 rounded-full flex-shrink-0">
                  <Banknote className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Cash ({periodLabel})</p>
                  <p className="text-sm sm:text-xl font-bold text-green-600 truncate">₱{cashOnlineStats.cashReceived.toLocaleString()}</p>
                </div>
              </div>

              {/* Online Payments Column */}
              <div 
                className="bg-blue-500/10 rounded-lg p-2 sm:p-4 cursor-pointer hover:bg-blue-500/20 transition-colors"
                onClick={() => fetchPaymentDetails("online")}
              >
                <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                  <div className="bg-blue-500/20 p-1.5 sm:p-3 rounded-full flex-shrink-0">
                    <Smartphone className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Online ({periodLabel})</p>
                    <p className="text-sm sm:text-xl font-bold text-blue-600 truncate">₱{totalOnlinePayments.toLocaleString()}</p>
                  </div>
                </div>
                {/* Sub-columns for GCash, BDO, BPI */}
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-blue-500/20">
                  <div className="text-center">
                    <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5">GCash</p>
                    <p className="text-[10px] sm:text-sm font-semibold text-blue-600 truncate">₱{cashOnlineStats.gcashReceived.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5">BDO</p>
                    <p className="text-[10px] sm:text-sm font-semibold text-orange-600 truncate">₱{cashOnlineStats.bdoReceived.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] sm:text-xs text-muted-foreground mb-0.5">BPI</p>
                    <p className="text-[10px] sm:text-sm font-semibold text-purple-600 truncate">₱{cashOnlineStats.bpiReceived.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Check Collections Column */}
              <div 
                className="bg-amber-500/10 rounded-lg p-2 sm:p-4 flex items-center gap-2 sm:gap-4 cursor-pointer hover:bg-amber-500/20 transition-colors sm:col-span-2 lg:col-span-1"
                onClick={() => fetchPaymentDetails("check")}
              >
                <div className="bg-amber-500/20 p-1.5 sm:p-3 rounded-full flex-shrink-0">
                  <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Checks ({periodLabel})</p>
                  <p className="text-sm sm:text-xl font-bold text-amber-600 truncate">₱{cashOnlineStats.checkReceived.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-lg">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="space-y-2 sm:space-y-4">
              {recentSales.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-xs sm:text-sm">No recent sales</p>
              ) : (
                recentSales.map((sale) => {
                  const productName = sale.transaction_items?.[0]?.product_name || "Multiple items";
                  const timeAgo = new Date(sale.created_at).toLocaleTimeString();

                  return (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-2 sm:p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors gap-2"
                    >
                      <p className="font-medium text-xs sm:text-sm truncate flex-1">{productName}</p>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-accent text-xs sm:text-sm">₱{Number(sale.total_amount).toLocaleString()}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{timeAgo}</p>
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

        {detailDialog.type !== "online" ? (
          <CashCheckSummaryDialog
            open={detailDialog.open}
            onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}
            type={detailDialog.type as "cash" | "check"}
            data={detailDialog.data}
            totalAmount={detailDialog.totalAmount}
            periodLabel={periodLabel}
          />
        ) : (
          <CashOnlinePaymentDialog
            open={detailDialog.open}
            onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}
            type="online"
            cashData={[]}
            onlineData={detailDialog.onlineData || { gcash: [], bdo: [], bpi: [] }}
            totalCash={0}
            totalOnline={{
              gcash: detailDialog.onlineData?.gcash.reduce((s, i) => s + i.amount, 0) || 0,
              bdo: detailDialog.onlineData?.bdo.reduce((s, i) => s + i.amount, 0) || 0,
              bpi: detailDialog.onlineData?.bpi.reduce((s, i) => s + i.amount, 0) || 0,
            }}
            periodLabel={periodLabel}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;