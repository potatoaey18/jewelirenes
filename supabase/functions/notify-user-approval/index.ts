import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyUserRequest {
  userEmail: string;
  userName: string;
  action: 'approved' | 'rejected';
  reason?: string;
}

async function sendEmail(to: string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Lovable <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }
  
  return res.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, action, reason }: NotifyUserRequest = await req.json();

    const isApproved = action === 'approved';
    
    const subject = isApproved 
      ? "Your Account Has Been Approved!" 
      : "Account Application Status Update";
    
    const html = isApproved
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px;">
            🎉 Account Approved!
          </h1>
          
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6;">
            Hi ${userName || 'there'},
          </p>
          
          <p style="color: #475569; line-height: 1.6;">
            Great news! Your account has been approved by an administrator. You now have full access to all features of the platform.
          </p>
          
          <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: #059669; font-weight: bold; margin: 0;">
              Your account is now active!
            </p>
          </div>
          
          <p style="color: #475569; line-height: 1.6;">
            You can now log in and start using all the features available to you.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
            If you have any questions, please contact our support team.
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
            Account Application Update
          </h1>
          
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6;">
            Hi ${userName || 'there'},
          </p>
          
          <p style="color: #475569; line-height: 1.6;">
            We regret to inform you that your account application has not been approved at this time.
          </p>
          
          ${reason ? `
            <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #991b1b; margin: 0;">
                <strong>Reason:</strong> ${reason}
              </p>
            </div>
          ` : ''}
          
          <p style="color: #475569; line-height: 1.6;">
            If you believe this is an error or have questions, please contact our support team for further assistance.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
            This is an automated message from our system.
          </div>
        </div>
      `;

    const emailResponse = await sendEmail([userEmail], subject, html);

    console.log("User notification email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending user notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
