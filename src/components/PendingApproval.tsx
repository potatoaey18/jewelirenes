import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const PendingApproval = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-full w-fit">
            <Clock className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-2xl">Waiting for Admin Approval</CardTitle>
          <CardDescription className="text-base mt-2">
            Your account has been verified and is pending administrator approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              An administrator will review your account shortly. You'll receive an email notification once your account is approved.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Need help? Contact support at{" "}
              <a href="mailto:agathamayesguerra@gmail.com" className="text-primary hover:underline">
                agathamayesguerra@gmail.com
              </a>
            </p>
          </div>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
