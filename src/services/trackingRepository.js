import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.tracking.v1';

function loadLocalTrackingEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalTrackingEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function cacheTrackingEntries(entries) {
  saveLocalTrackingEntries(sortTrackingEntries(entries));
}

function toTrackingEntry(row) {
  return {
    id: row.id,
    quoteId: row.quote_id,
    quoteNumber: row.quote_number,
    clientName: row.client_name,
    phone: row.phone || '',
    orderNumber: row.order_number || '',
    invoiceNumber: row.invoice_number || '',
    carrier: row.carrier || '',
    trackingCode: row.tracking_code || '',
    correiosUpdateFailed: Boolean(row.correios_update_failed),
    deliverySituation: row.delivery_situation || 'etiqueta',
    expectedDeliveryDate: row.expected_delivery_date || '',
    notes: row.notes || '',
    status: row.status || 'Em andamento',
    finalizedAt: row.finalized_at || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(entry) {
  const row = {};

  if ('id' in entry) row.id = entry.id;
  if ('quoteId' in entry) row.quote_id = entry.quoteId;
  if ('quoteNumber' in entry) row.quote_number = entry.quoteNumber;
  if ('clientName' in entry) row.client_name = entry.clientName;
  if ('phone' in entry) row.phone = entry.phone || null;
  if ('orderNumber' in entry) row.order_number = entry.orderNumber || null;
  if ('invoiceNumber' in entry) row.invoice_number = entry.invoiceNumber || null;
  if ('carrier' in entry) row.carrier = entry.carrier || null;
  if ('trackingCode' in entry) row.tracking_code = entry.trackingCode || null;
  if ('correiosUpdateFailed' in entry) row.correios_update_failed = entry.correiosUpdateFailed || false;
  if ('deliverySituation' in entry) row.delivery_situation = entry.deliverySituation;
  if ('expectedDeliveryDate' in entry) row.expected_delivery_date = entry.expectedDeliveryDate || null;
  if ('notes' in entry) row.notes = entry.notes || null;
  if ('status' in entry) row.status = entry.status;
  if ('finalizedAt' in entry) row.finalized_at = entry.finalizedAt || null;
  if ('createdAt' in entry) row.created_at = entry.createdAt;
  if ('updatedAt' in entry) row.updated_at = entry.updatedAt;

  return row;
}

function sortTrackingEntries(entries) {
  return [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function loadTrackingEntries() {
  if (!supabase) {
    return { entries: sortTrackingEntries(loadLocalTrackingEntries()), mode: 'local' };
  }

  const { data, error } = await supabase
    .from('tracking_entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const entries = data.map(toTrackingEntry);
  saveLocalTrackingEntries(entries);
  return { entries, mode: 'supabase' };
}

export async function createTrackingEntry(entry) {
  if (!supabase) {
    const entries = sortTrackingEntries([entry, ...loadLocalTrackingEntries()]);
    saveLocalTrackingEntries(entries);
    return entry;
  }

  const { data, error } = await supabase.from('tracking_entries').insert(toRow(entry)).select('*').single();
  if (error) throw error;

  const savedEntry = toTrackingEntry(data);
  saveLocalTrackingEntries(
    sortTrackingEntries([savedEntry, ...loadLocalTrackingEntries().filter((item) => item.id !== savedEntry.id)]),
  );
  return savedEntry;
}

export async function updateTrackingEntry(id, changes) {
  const updatedAt = new Date().toISOString();
  const nextChanges = { ...changes, updatedAt };

  if (nextChanges.status === 'Finalizado' && !nextChanges.finalizedAt) {
    nextChanges.finalizedAt = updatedAt;
  }

  if (nextChanges.status === 'Em andamento') {
    nextChanges.finalizedAt = '';
  }

  if (!supabase) {
    const entries = loadLocalTrackingEntries().map((entry) =>
      entry.id === id ? { ...entry, ...nextChanges } : entry,
    );
    saveLocalTrackingEntries(sortTrackingEntries(entries));
    return entries.find((entry) => entry.id === id);
  }

  const { data, error } = await supabase
    .from('tracking_entries')
    .update(toRow(nextChanges))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;

  const savedEntry = toTrackingEntry(data);
  const entries = loadLocalTrackingEntries().map((entry) => (entry.id === id ? savedEntry : entry));
  saveLocalTrackingEntries(sortTrackingEntries(entries));
  return savedEntry;
}

export async function deleteTrackingEntry(id) {
  if (!supabase) {
    saveLocalTrackingEntries(loadLocalTrackingEntries().filter((entry) => entry.id !== id));
    return;
  }

  const { error } = await supabase.from('tracking_entries').delete().eq('id', id);
  if (error) throw error;

  saveLocalTrackingEntries(loadLocalTrackingEntries().filter((entry) => entry.id !== id));
}

export function subscribeToTrackingChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:tracking_entries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_entries' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        entry: payload.new?.id ? toTrackingEntry(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
