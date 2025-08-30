import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  phoneNumber: string;
  message: string;
  complexName: string;
  reservationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, message, complexName, reservationId }: WhatsAppRequest = await req.json();

    // Simple WhatsApp URL sending without API key - just log the message
    console.log("WhatsApp notification:", {
      to: phoneNumber,
      message: message,
      complex: complexName,
      reservation: reservationId,
      timestamp: new Date().toISOString()
    });

    // In a real implementation, you would make a simple HTTP request to your WhatsApp service
    // For now, we'll simulate success
    
    // Simple HTTP request to WhatsApp gateway (replace with your actual endpoint)
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    console.log("WhatsApp URL generated:", whatsappUrl);

    return new Response(JSON.stringify({ 
      success: true, 
      whatsappUrl,
      message: "Notification sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-whatsapp-notification function:", error);
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