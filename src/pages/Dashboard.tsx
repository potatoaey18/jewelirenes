import { TrendingUp, ShoppingBag, Users, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";

const Dashboard = () => {
  const stats = [
    {
      title: "Today's Sales",
      value: "$12,450",
      icon: DollarSign,
      trend: "+12.5%",
      bgGradient: "from-accent/20 to-accent/5",
    },
    {
      title: "Orders",
      value: "24",
      icon: ShoppingBag,
      trend: "+8%",
      bgGradient: "from-primary/10 to-primary/5",
    },
    {
      title: "Customers",
      value: "186",
      icon: Users,
      trend: "+23",
      bgGradient: "from-secondary to-secondary/50",
    },
    {
      title: "Revenue",
      value: "$48,290",
      icon: TrendingUp,
      trend: "+18.2%",
      bgGradient: "from-accent/20 to-accent/5",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2">Welcome Back</h2>
          <p className="text-muted-foreground">Here's what's happening with your jewelry business today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="relative overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50`} />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-accent mt-1">{stat.trend} from last week</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Diamond Necklace", customer: "Sarah Johnson", amount: "$4,200", time: "2 mins ago" },
                  { name: "Gold Bracelet", customer: "Michael Chen", amount: "$1,850", time: "15 mins ago" },
                  { name: "Pearl Earrings", customer: "Emma Davis", amount: "$890", time: "1 hour ago" },
                ].map((sale, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="font-medium">{sale.name}</p>
                      <p className="text-sm text-muted-foreground">{sale.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-accent">{sale.amount}</p>
                      <p className="text-xs text-muted-foreground">{sale.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "18K Gold Ring", sales: 45, revenue: "$18,900" },
                  { name: "Diamond Studs", sales: 38, revenue: "$15,200" },
                  { name: "Silver Chain", sales: 52, revenue: "$10,400" },
                ].map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors border border-accent/20">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sales} sales</p>
                    </div>
                    <div className="font-bold text-accent">{product.revenue}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
