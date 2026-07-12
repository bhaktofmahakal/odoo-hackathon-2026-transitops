import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  // Only allow POST requests for execution safety
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Run the database trigger logic to generate in-app notifications
    const { error: rpcError } = await supabaseClient.rpc('fn_check_license_expiry');
    if (rpcError) {
      throw new Error(`Database RPC failed: ${rpcError.message}`);
    }

    // 2. Fetch drivers expiring within 7 days
    const today = new Date().toISOString().split('T')[0];
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeek = nextWeekDate.toISOString().split('T')[0];

    const { data: drivers, error: driversError } = await supabaseClient
      .from('drivers')
      .select('*')
      .lte('license_expiry_date', nextWeek)
      .gte('license_expiry_date', today);

    if (driversError) {
      throw new Error(`Failed to query drivers: ${driversError.message}`);
    }

    // 3. Fetch safety officers' emails to notify
    const { data: officers, error: officersError } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'safety_officer');

    if (officersError) {
      throw new Error(`Failed to query safety officers: ${officersError.message}`);
    }

    let emailReport = '';
    if (drivers && drivers.length > 0 && officers && officers.length > 0) {
      const expiringList = drivers
        .map((d) => `• ${d.name} (License #${d.license_number}) expires on ${d.license_expiry_date}`)
        .join('\n');

      emailReport = `Attention Safety Team,\n\nThe following driver licenses are expiring within the next 7 days:\n\n${expiringList}\n\nPlease take appropriate action immediately.\n\n— TransitOps Alert System`;

      // 4. Send email via Resend if RESEND_API_KEY is configured
      if (RESEND_API_KEY) {
        const recipients = officers.map((o) => o.email);
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'TransitOps Alerts <alerts@resend.dev>',
            to: recipients,
            subject: '🚨 CRITICAL: Driver Licenses Expiring Within 7 Days',
            text: emailReport,
          }),
        });

        if (!emailResponse.ok) {
          const errText = await emailResponse.text();
          console.error(`Resend API Error details: ${errText}`);
        } else {
          console.log(`Alert email successfully sent to: ${recipients.join(', ')}`);
        }
      } else {
        console.warn('RESEND_API_KEY not configured. Skipping email delivery, in-app notification only.');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${drivers?.length || 0} expiring licenses. Email sent: ${!!RESEND_API_KEY}`,
        details: emailReport || 'No expiring licenses found.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
