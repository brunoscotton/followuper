import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.quotes.v1';

export const persistenceMode = supabase ? 'supabase' : 'local';

function loadLocalQuotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalQuotes(quotes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

export function cacheQuotes(quotes) {
  saveLocalQuotes(sortQuotes(quotes));
}

function toQuote(row) {
  const followUpUnit = row.follow_up_unit || 'days';
  const followUpAmount = row.follow_up_amount || row.follow_up_days || 1;

  return {
    id: row.id,
    quoteNumber: row.quote_number,
    clientName: row.client_name,
    paymentTerms: row.payment_terms || '',
    quoteDate: row.quote_date,
    seller: row.seller,
    followUpDays: row.follow_up_days || (followUpUnit === 'days' ? followUpAmount : 1),
    followUpAmount,
    followUpUnit,
    followUpStartedAt: row.follow_up_started_at || row.created_at,
    status: row.status,
    createdAt: row.created_at,
    statusUpdatedAt: row.status_updated_at,
    archivedAt: row.archived_at || '',
    closeDetails: row.close_details || undefined,
  };
}

function toRow(quote) {
  const row = {};

  if ('id' in quote) row.id = quote.id;
  if ('quoteNumber' in quote) row.quote_number = quote.quoteNumber;
  if ('clientName' in quote) row.client_name = quote.clientName;
  if ('paymentTerms' in quote) row.payment_terms = quote.paymentTerms || null;
  if ('quoteDate' in quote) row.quote_date = quote.quoteDate;
  if ('seller' in quote) row.seller = quote.seller;
  if ('followUpDays' in quote) row.follow_up_days = quote.followUpDays;
  if ('followUpAmount' in quote) row.follow_up_amount = quote.followUpAmount;
  if ('followUpUnit' in quote) row.follow_up_unit = quote.followUpUnit;
  if ('followUpStartedAt' in quote) row.follow_up_started_at = quote.followUpStartedAt;
  if ('status' in quote) row.status = quote.status;
  if ('createdAt' in quote) row.created_at = quote.createdAt;
  if ('statusUpdatedAt' in quote) row.status_updated_at = quote.statusUpdatedAt;
  if ('archivedAt' in quote) row.archived_at = quote.archivedAt || null;
  if ('closeDetails' in quote) row.close_details = quote.closeDetails || null;

  return row;
}

function sortQuotes(quotes) {
  return [...quotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function loadQuotes() {
  if (!supabase) {
    return { quotes: sortQuotes(loadLocalQuotes()), mode: 'local' };
  }

  const { data, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
  if (error) throw error;

  const remoteQuotes = data.map(toQuote);
  saveLocalQuotes(remoteQuotes);
  return { quotes: remoteQuotes, mode: 'supabase' };
}

export async function createQuote(quote) {
  if (!supabase) {
    const quotes = sortQuotes([quote, ...loadLocalQuotes()]);
    saveLocalQuotes(quotes);
    return quote;
  }

  const { data, error } = await supabase.from('quotes').insert(toRow(quote)).select('*').single();
  if (error) throw error;

  const savedQuote = toQuote(data);
  saveLocalQuotes(sortQuotes([savedQuote, ...loadLocalQuotes().filter((item) => item.id !== savedQuote.id)]));
  return savedQuote;
}

export async function updateQuote(id, changes) {
  if (!supabase) {
    const quotes = loadLocalQuotes().map((quote) => (quote.id === id ? { ...quote, ...changes } : quote));
    saveLocalQuotes(sortQuotes(quotes));
    return quotes.find((quote) => quote.id === id);
  }

  const { data, error } = await supabase.from('quotes').update(toRow(changes)).eq('id', id).select('*').single();
  if (error) throw error;

  const savedQuote = toQuote(data);
  const quotes = loadLocalQuotes().map((quote) => (quote.id === id ? savedQuote : quote));
  saveLocalQuotes(sortQuotes(quotes));
  return savedQuote;
}

export async function deleteQuote(id) {
  if (!supabase) {
    saveLocalQuotes(loadLocalQuotes().filter((quote) => quote.id !== id));
    return;
  }

  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) throw error;

  saveLocalQuotes(loadLocalQuotes().filter((quote) => quote.id !== id));
}

export function subscribeToQuoteChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:quotes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        quote: payload.new?.id ? toQuote(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
