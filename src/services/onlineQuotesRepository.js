import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.onlineQuotes.v1';

function loadLocalOnlineQuotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalOnlineQuotes(quotes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

export function cacheOnlineQuotes(quotes) {
  saveLocalOnlineQuotes(sortOnlineQuotes(quotes));
}

function toOnlineQuote(row) {
  const workflow = row.customer?.followuperWorkflow || {};

  return {
    id: row.id,
    controlNumber: row.control_number,
    source: row.source || 'rotax-system',
    customerName: row.customer_name || '',
    customerEmail: row.customer_email || '',
    customerPhone: row.customer_phone || '',
    customerPrefix: row.customer_prefix || '',
    customerState: row.customer_state || '',
    customer: row.customer || {},
    items: Array.isArray(row.items) ? row.items : [],
    quoteText: row.quote_text || '',
    codesTsv: row.codes_tsv || '',
    status: row.status || 'nova',
    notes: row.notes || '',
    acceptedBy: workflow.acceptedBy || '',
    acceptedByEmail: workflow.acceptedByEmail || '',
    acceptedAt: workflow.acceptedAt || '',
    cdsQuoteNumber: workflow.cdsQuoteNumber || '',
    finalizedAt: workflow.finalizedAt || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildCustomerPayload(quote) {
  const customer = quote.customer || {};
  const workflow = { ...(customer.followuperWorkflow || {}) };

  if ('acceptedBy' in quote) workflow.acceptedBy = quote.acceptedBy || '';
  if ('acceptedByEmail' in quote) workflow.acceptedByEmail = quote.acceptedByEmail || '';
  if ('acceptedAt' in quote) workflow.acceptedAt = quote.acceptedAt || '';
  if ('cdsQuoteNumber' in quote) workflow.cdsQuoteNumber = quote.cdsQuoteNumber || '';
  if ('finalizedAt' in quote) workflow.finalizedAt = quote.finalizedAt || '';

  return { ...customer, followuperWorkflow: workflow };
}

function toRow(quote) {
  const row = {};

  if ('id' in quote) row.id = quote.id;
  if ('controlNumber' in quote) row.control_number = quote.controlNumber;
  if ('source' in quote) row.source = quote.source || 'rotax-system';
  if ('customerName' in quote) row.customer_name = quote.customerName || null;
  if ('customerEmail' in quote) row.customer_email = quote.customerEmail || null;
  if ('customerPhone' in quote) row.customer_phone = quote.customerPhone || null;
  if ('customerPrefix' in quote) row.customer_prefix = quote.customerPrefix || null;
  if ('customerState' in quote) row.customer_state = quote.customerState || null;
  if (
    'customer' in quote ||
    'acceptedBy' in quote ||
    'acceptedByEmail' in quote ||
    'acceptedAt' in quote ||
    'cdsQuoteNumber' in quote ||
    'finalizedAt' in quote
  ) {
    row.customer = buildCustomerPayload(quote);
  }
  if ('items' in quote) row.items = Array.isArray(quote.items) ? quote.items : [];
  if ('quoteText' in quote) row.quote_text = quote.quoteText || null;
  if ('codesTsv' in quote) row.codes_tsv = quote.codesTsv || null;
  if ('status' in quote) row.status = quote.status || 'nova';
  if ('notes' in quote) row.notes = quote.notes || null;
  if ('createdAt' in quote) row.created_at = quote.createdAt;
  if ('updatedAt' in quote) row.updated_at = quote.updatedAt;

  return row;
}

export function sortOnlineQuotes(quotes) {
  return [...quotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function loadOnlineQuotes() {
  if (!supabase) {
    return { onlineQuotes: sortOnlineQuotes(loadLocalOnlineQuotes()), mode: 'local' };
  }

  const { data, error } = await supabase.from('online_quotes').select('*').order('created_at', { ascending: false });
  if (error) throw error;

  const onlineQuotes = data.map(toOnlineQuote);
  saveLocalOnlineQuotes(onlineQuotes);
  return { onlineQuotes, mode: 'supabase' };
}

export async function updateOnlineQuote(id, changes) {
  if (!supabase) {
    const quotes = loadLocalOnlineQuotes().map((quote) => (quote.id === id ? { ...quote, ...changes } : quote));
    saveLocalOnlineQuotes(sortOnlineQuotes(quotes));
    return quotes.find((quote) => quote.id === id);
  }

  const { data, error } = await supabase.from('online_quotes').update(toRow(changes)).eq('id', id).select('*').single();
  if (error) throw error;

  const savedQuote = toOnlineQuote(data);
  const quotes = loadLocalOnlineQuotes().map((quote) => (quote.id === id ? savedQuote : quote));
  saveLocalOnlineQuotes(sortOnlineQuotes(quotes));
  return savedQuote;
}

export async function deleteOnlineQuote(id) {
  if (!supabase) {
    saveLocalOnlineQuotes(loadLocalOnlineQuotes().filter((quote) => quote.id !== id));
    return;
  }

  const { error } = await supabase.from('online_quotes').delete().eq('id', id);
  if (error) throw error;

  saveLocalOnlineQuotes(loadLocalOnlineQuotes().filter((quote) => quote.id !== id));
}

export function subscribeToOnlineQuoteChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:online_quotes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'online_quotes' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        onlineQuote: payload.new?.id ? toOnlineQuote(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
