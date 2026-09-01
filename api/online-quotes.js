import { createClient } from '@supabase/supabase-js';

function getRequestBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

function requiredText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatPartNumberForCopy(partNumber) {
  const digits = String(partNumber || '').replace(/\D/g, '');
  if (digits.length === 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return String(partNumber || '');
}

function buildCodesTsv(items) {
  return `${items.map((item) => `${item.quantity || 1}\t${formatPartNumberForCopy(item.partNumber)}`).join('\n')}\n`;
}

function normalizeQuotePayload(body) {
  const customer = body.customer || {};
  const items = Array.isArray(body.items) ? body.items : [];
  const quoteText = String(body.text || body.quoteText || '').trim();
  const codesTsv = String(body.codesTsv || '').trim() ? `${String(body.codesTsv).trimEnd()}\n` : buildCodesTsv(items);

  return {
    controlNumber: String(body.filename || body.controlNumber || '').trim(),
    source: String(body.source || 'rotax-system').trim(),
    customer,
    items,
    quoteText: quoteText ? `${quoteText}\n` : '',
    codesTsv,
  };
}

function verifyWebhookSecret(req) {
  const expected = process.env.FOLLOWUPER_WEBHOOK_SECRET;
  if (!expected) throw Object.assign(new Error('FOLLOWUPER_WEBHOOK_SECRET nao configurado no Followuper.'), { statusCode: 503 });

  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerSecret = req.headers['x-followuper-secret'] || '';
  return bearer === expected || headerSecret === expected;
}

function supabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(new Error('Supabase server-side nao configurado no Followuper.'), { statusCode: 503 });
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Metodo nao permitido.' });
    return;
  }

  try {
    if (!verifyWebhookSecret(req)) {
      res.status(401).json({ ok: false, message: 'Webhook nao autorizado.' });
      return;
    }

    const quote = normalizeQuotePayload(getRequestBody(req));
    const customer = quote.customer || {};
    if (!requiredText(customer.name) || !requiredText(customer.email) || !quote.items.length) {
      res.status(400).json({ ok: false, message: 'Cotacao online sem cliente, e-mail ou itens.' });
      return;
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('online_quotes')
      .insert({
        control_number: quote.controlNumber || null,
        source: quote.source,
        customer_name: customer.name.trim(),
        customer_email: customer.email.trim(),
        customer_phone: String(customer.phone || '').trim() || null,
        customer_prefix: String(customer.prefix || '').trim() || null,
        customer_state: String(customer.state || '').trim() || null,
        customer,
        items: quote.items,
        quote_text: quote.quoteText,
        codes_tsv: quote.codesTsv,
        status: 'nova',
      })
      .select('id,control_number')
      .single();

    if (error) throw error;

    res.status(201).json({ ok: true, id: data.id, controlNumber: data.control_number });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, message: error.message || 'Nao foi possivel receber a cotacao online.' });
  }
}
