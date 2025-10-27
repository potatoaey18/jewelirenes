import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Users, Crown, FolderOpen, LogOut } from "lucide-react";
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
    { to: "/pos", icon: ShoppingCart, label: "POS" },
    { to: "/inventory", icon: Package, label: "Inventory" },
    { to: "/customers", icon: Users, label: "Customers" },
    { to: "/files", icon: FolderOpen, label: "Files" },
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
    <nav className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-accent" />
            <h1 className="text-xl font-bold">Store Manager</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
                      "hover:bg-secondary",
                      isActive && "bg-accent text-accent-foreground font-medium"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
            </div>
            {user && (
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
