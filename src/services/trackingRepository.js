import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.tracking.v1';
const TRACKING_UPSERT_BATCH_SIZE = 500;

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
    clientCode: row.client_code || '',
    clientName: row.client_name,
    phone: row.phone || '',
    orderNumber: row.order_number || '',
    invoiceNumber: row.invoice_number || '',
    invoiceIssueDate: row.invoice_issue_date || '',
    carrier: row.carrier || '',
    carrierCode: row.carrier_code || '',
    freightValue: row.freight_value || '',
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
  if ('clientCode' in entry) row.client_code = entry.clientCode || null;
  if ('clientName' in entry) row.client_name = entry.clientName;
  if ('phone' in entry) row.phone = entry.phone || null;
  if ('orderNumber' in entry) row.order_number = entry.orderNumber || null;
  if ('invoiceNumber' in entry) row.invoice_number = entry.invoiceNumber || null;
  if ('invoiceIssueDate' in entry && entry.invoiceIssueDate) row.invoice_issue_date = entry.invoiceIssueDate;
  if ('carrier' in entry) row.carrier = entry.carrier || null;
  if ('carrierCode' in entry) row.carrier_code = entry.carrierCode || null;
  if ('freightValue' in entry) row.freight_value = entry.freightValue || null;
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

function dedupeTrackingEntriesById(entries) {
  return [...new Map(entries.filter(Boolean).map((entry) => [entry.id, entry])).values()];
}

function prepareTrackingEntryForSave(entry) {
  const updatedAt = entry.updatedAt || new Date().toISOString();
  const nextEntry = { ...entry, updatedAt };

  if (nextEntry.status === 'Finalizado' && !nextEntry.finalizedAt) {
    nextEntry.finalizedAt = updatedAt;
  }

  if (nextEntry.status === 'Em andamento' || nextEntry.status === 'Importação') {
    nextEntry.finalizedAt = '';
  }

  return nextEntry;
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
  const nextEntry = { correiosUpdateFailed: false, ...entry };

  if (!supabase) {
    const entries = sortTrackingEntries([nextEntry, ...loadLocalTrackingEntries()]);
    saveLocalTrackingEntries(entries);
    return nextEntry;
  }

  const { data, error } = await supabase.from('tracking_entries').insert(toRow(nextEntry)).select('*').single();
  if (error) throw error;

  const savedEntry = toTrackingEntry(data);
  saveLocalTrackingEntries(
    sortTrackingEntries([savedEntry, ...loadLocalTrackingEntries().filter((item) => item.id !== savedEntry.id)]),
  );
  return savedEntry;
}

export async function updateTrackingEntry(id, changes) {
  const nextChanges = prepareTrackingEntryForSave(changes);

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

export async function upsertTrackingEntries(nextEntries) {
  const entriesWithDefaults = nextEntries.map((entry) => ({ correiosUpdateFailed: false, ...entry }));
  const dedupedEntries = dedupeTrackingEntriesById(entriesWithDefaults.map(prepareTrackingEntryForSave));

  if (!supabase) {
    const existingById = new Map(loadLocalTrackingEntries().map((entry) => [entry.id, entry]));
    dedupedEntries.forEach((entry) => existingById.set(entry.id, { ...existingById.get(entry.id), ...entry }));
    const entries = sortTrackingEntries([...existingById.values()]);
    saveLocalTrackingEntries(entries);
    return sortTrackingEntries(dedupedEntries);
  }

  const savedRows = [];
  for (let index = 0; index < dedupedEntries.length; index += TRACKING_UPSERT_BATCH_SIZE) {
    const batch = dedupedEntries.slice(index, index + TRACKING_UPSERT_BATCH_SIZE);
    if (batch.length === 0) continue;

    const { data, error } = await supabase
      .from('tracking_entries')
      .upsert(batch.map(toRow), { onConflict: 'id' })
      .select('*');
    if (error) throw error;
    savedRows.push(...(data || []));
  }

  const savedEntries = sortTrackingEntries(savedRows.map(toTrackingEntry));
  const existingById = new Map(loadLocalTrackingEntries().map((entry) => [entry.id, entry]));
  savedEntries.forEach((entry) => existingById.set(entry.id, entry));
  saveLocalTrackingEntries(sortTrackingEntries([...existingById.values()]));
  return savedEntries;
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
