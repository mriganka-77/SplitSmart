import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    // Find all active recurring expenses due today or earlier
    const { data: dueExpenses, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('id, next_occurrence')
      .eq('is_active', true)
      .lte('next_occurrence', today);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${dueExpenses?.length || 0} due recurring expenses`);

    const results: Array<{ id: string; status: string; error?: string; expense_id?: string }> = [];

    for (const expense of dueExpenses || []) {
      // Check if this occurrence is skipped
      const { data: skipped } = await supabase
        .from('skipped_occurrences')
        .select('id')
        .eq('recurring_expense_id', expense.id)
        .eq('skipped_date', expense.next_occurrence)
        .single();

      if (skipped) {
        console.log(`Skipping occurrence for ${expense.id} on ${expense.next_occurrence}`);
        
        // Update next occurrence
        const { data: expenseData } = await supabase
          .from('recurring_expenses')
          .select('frequency, next_occurrence')
          .eq('id', expense.id)
          .single();

        if (expenseData) {
          const currentDate = new Date(expenseData.next_occurrence);
          let nextDate: Date;
          
          switch (expenseData.frequency) {
            case 'daily':
              nextDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
              break;
            case 'weekly':
              nextDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
              break;
            case 'monthly':
              nextDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
              break;
            default:
              nextDate = currentDate;
          }

          await supabase
            .from('recurring_expenses')
            .update({ next_occurrence: nextDate.toISOString().split('T')[0] })
            .eq('id', expense.id);
        }

        results.push({ id: expense.id, status: 'skipped' });
        continue;
      }

      // Generate the expense
      const { data: generatedId, error: genError } = await supabase
        .rpc('generate_recurring_expense', { _recurring_expense_id: expense.id });

      if (genError) {
        console.error(`Error generating expense for ${expense.id}:`, genError);
        results.push({ id: expense.id, status: 'error', error: genError.message });
      } else {
        console.log(`Generated expense ${generatedId} for recurring expense ${expense.id}`);
        results.push({ id: expense.id, status: 'generated', expense_id: generatedId });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing recurring expenses:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});