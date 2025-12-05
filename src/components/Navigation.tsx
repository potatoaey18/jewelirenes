import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Users, Crown, FolderOpen, LogOut, DollarSign, Wallet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";

const Navigation = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/sales", icon: ShoppingCart, label: "Sale" },
    { to: "/inventory", icon: Package, label: "Inventory" },
    { to: "/customers", icon: Users, label: "Customers" },
    { to: "/expenses", icon: DollarSign, label: "Expenses" },
    { to: "/collections", icon: Wallet, label: "Collections" },
    { to: "/files", icon: FolderOpen, label: "Files" },
    { to: "/logs", icon: FileText, label: "Logs" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "Successfully signed out.",
    });
    navigate("/auth");
  };

  return (
    <nav className="border-b-2 border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-3">
            <Crown className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
            <h1 className="text-xl sm:text-2xl font-bold">Jewelirene's</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 sm:px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px]",
                      "hover:bg-secondary",
                      isActive && "bg-accent text-accent-foreground font-medium shadow-sm"
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden lg:inline text-base">{label}</span>
                </NavLink>
              ))}
            </div>
            {user && (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2">
                <LogOut className="h-5 w-5" />
                <span className="hidden lg:inline ml-2">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
