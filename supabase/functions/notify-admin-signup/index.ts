import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyAdminRequest {
  userEmail: string;
  userName: string;
  signupDate: string;
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
    const { userEmail, userName, signupDate }: NotifyAdminRequest = await req.json();

    const formattedDate = new Date(signupDate).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const emailResponse = await sendEmail(
      ["agathamayesguerra@gmail.com"],
      "New User Signup - Pending Approval",
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">New User Signup</h1>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #475569; margin-top: 0;">User Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Name:</td>
                <td style="padding: 8px 0; color: #1a1a1a;">${userName || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; color: #1a1a1a;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Signup Date:</td>
                <td style="padding: 8px 0; color: #1a1a1a;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0;">
                  <span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 14px;">
                    Pending Admin Approval
                  </span>
                </td>
              </tr>
            </table>
          </div>
          
          <p style="color: #475569; line-height: 1.6;">
            A new user has signed up and is awaiting your approval to access the platform.
          </p>
          
          <p style="color: #475569; line-height: 1.6;">
            Please log in to the admin panel to review and approve or reject this user.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
            This is an automated notification from your application.
          </div>
        </div>
      `
    );

    console.log("Admin notification email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending admin notification:", error);
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
