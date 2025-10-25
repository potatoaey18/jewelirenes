import { NavLink } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Users, Crown, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/pos", icon: ShoppingCart, label: "POS" },
    { to: "/inventory", icon: Package, label: "Inventory" },
    { to: "/customers", icon: Users, label: "Customers" },
    { to: "/files", icon: FolderOpen, label: "Files" },
  ];

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-accent" />
            <h1 className="text-xl font-bold">Jewelirene's</h1>
          </div>
          
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
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
