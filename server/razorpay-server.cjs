require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn('Razorpay keys not set. Create orders will fail unless keys are provided in .env');
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase service key not set. Server cannot update wallets without it. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
} else {
  supabaseAdmin = null;
}

app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt = `rcpt_${Date.now()}`, user_id, provider = 'razorpay' } = req.body;
    if (!amount || !user_id) return res.status(400).json({ error: 'amount and user_id required' });

    // If provider is 'simulated' or keys missing, return a fake order for prototyping
    if (provider !== 'razorpay' || !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      const fakeOrder = { id: `order_sim_${Date.now()}`, amount: Math.round(Number(amount) * 100), currency, receipt };
      return res.json({ order: fakeOrder, key_id: 'SIMULATED', provider });
    }

    const body = {
      amount: Math.round(Number(amount) * 100), // paise
      currency,
      receipt,
      payment_capture: 1,
    };

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const r = await axios.post('https://api.razorpay.com/v1/orders', body, {
      headers: { Authorization: `Basic ${auth}` },
    });

    return res.json({ order: r.data, key_id: RAZORPAY_KEY_ID, provider: 'razorpay' });
  } catch (err) {
    console.error('create-order err', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'failed to create order' });
  }
});

app.post('/api/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, user_id, provider = 'razorpay' } = req.body;
    if (!user_id) return res.status(400).json({ error: 'missing user_id' });

    const amt = Number(amount || 0);

  if (provider === 'simulated') {
      // Directly credit if supabase admin is available, otherwise return success for prototype
      if (!supabaseAdmin) {
        console.warn('Supabase admin not configured; simulated verify will not persist to DB');
        return res.json({ ok: true, provider: 'simulated', note: 'no-supabase' });
      }

      const { data: existing } = await supabaseAdmin.from('wallets').select('balance').eq('user_id', user_id).single();
      if (!existing) {
        await supabaseAdmin.from('wallets').insert({ user_id, balance: amt });
      } else {
        const newBalance = Number(existing.balance || 0) + amt;
        await supabaseAdmin.from('wallets').update({ balance: newBalance }).eq('user_id', user_id);
      }

      await supabaseAdmin.from('wallet_transactions').insert({ user_id, amount: amt, payment_method: 'simulated', status: 'success' });
      return res.json({ ok: true, provider: 'simulated' });
    }

      if (provider === 'phonepe') {
        // PhonePe simulated flow: credit wallet if supabase admin available
        if (!supabaseAdmin) {
          console.warn('Supabase admin not configured; phonepe verify will not persist to DB');
          return res.json({ ok: true, provider: 'phonepe', note: 'no-supabase' });
        }

        const { data: existingP } = await supabaseAdmin.from('wallets').select('balance').eq('user_id', user_id).single();
        if (!existingP) {
          await supabaseAdmin.from('wallets').insert({ user_id, balance: amt });
        } else {
          const newBalance = Number(existingP.balance || 0) + amt;
          await supabaseAdmin.from('wallets').update({ balance: newBalance }).eq('user_id', user_id);
        }

        await supabaseAdmin.from('wallet_transactions').insert({ user_id, amount: amt, payment_method: 'phonepe', status: 'success' });
        return res.json({ ok: true, provider: 'phonepe' });
      }

      if (provider === 'razorpay') {
      if (!RAZORPAY_KEY_SECRET || !RAZORPAY_KEY_ID) return res.status(400).json({ error: 'razorpay keys not configured on server' });
      if (!supabaseAdmin) return res.status(400).json({ error: 'supabase service role not configured on server' });
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: 'missing fields' });

      const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
      if (expected !== razorpay_signature) return res.status(400).json({ error: 'invalid signature' });

      const { data: existing } = await supabaseAdmin.from('wallets').select('balance').eq('user_id', user_id).single();
      if (!existing) {
        await supabaseAdmin.from('wallets').insert({ user_id, balance: amt });
      } else {
        const newBalance = Number(existing.balance || 0) + amt;
        await supabaseAdmin.from('wallets').update({ balance: newBalance }).eq('user_id', user_id);
      }

      await supabaseAdmin.from('wallet_transactions').insert({ user_id, amount: amt, payment_method: 'razorpay', status: 'success', metadata: { razorpay_order_id, razorpay_payment_id } });
      return res.json({ ok: true, provider: 'razorpay' });
    }

    return res.status(400).json({ error: 'unsupported provider' });
  } catch (err) {
    console.error('verify err', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'verification failed' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Razorpay helper server listening on ${port}`));
