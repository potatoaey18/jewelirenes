import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Users, Crown, FolderOpen, LogOut, DollarSign, Wallet, FileText, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const Navigation = () => {
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/sales", icon: ShoppingCart, label: "Sales" },
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
    setMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={handleNavClick}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-[44px]",
              "hover:bg-secondary",
              isActive && "bg-accent text-accent-foreground font-medium shadow-sm",
              mobile && "w-full text-base"
            )
          }
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className={cn(mobile ? "inline" : "hidden xl:inline", "text-base")}>{label}</span>
        </NavLink>
      ))}
    </>
  );

  return (
    <nav className="border-b-2 border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Crown className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
            <h1 className="text-xl sm:text-2xl font-bold">Jewelirene's</h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <div className="flex gap-1">
              <NavLinks />
            </div>
            {user && (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2">
                <LogOut className="h-5 w-5" />
                <span className="hidden xl:inline ml-2">Logout</span>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  {/* Mobile Menu Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Crown className="h-6 w-6 text-accent" />
                      <span className="font-bold text-lg">Menu</span>
                    </div>
                  </div>

                  {/* Mobile Nav Links */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <NavLinks mobile />
                  </div>

                  {/* Mobile Menu Footer */}
                  {user && (
                    <div className="p-4 border-t border-border">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3" 
                        onClick={handleLogout}
                      >
                        <LogOut className="h-5 w-5" />
                        Logout
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
