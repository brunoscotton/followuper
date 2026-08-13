import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.regularizationEntries.v1';

function loadLocalEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortRegularizationEntries(entries)));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

export function sortRegularizationEntries(entries) {
  return [...entries].sort((a, b) => (a.clientName || '').localeCompare(b.clientName || '', 'pt-BR'));
}

export function cacheRegularizationEntries(entries) {
  saveLocalEntries(entries);
}

function toRegularizationEntry(row) {
  return {
    id: row.id,
    rowKey: row.row_key || '',
    clientCode: row.client_code || '',
    storeCode: row.store_code || '',
    clientName: row.client_name || '',
    accumulatedValue: Number(row.accumulated_value || 0),
    phone: row.phone || '',
    mobile: row.mobile || '',
    invoiceEmail: row.invoice_email || '',
    contractEmail: row.contract_email || '',
    commercialEmail: row.commercial_email || '',
    seller: row.seller || '',
    status: row.status || 'priority_not_sent',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(entry) {
  const row = {};
  if ('id' in entry) row.id = entry.id;
  if ('rowKey' in entry) row.row_key = entry.rowKey || '';
  if ('clientCode' in entry) row.client_code = entry.clientCode || '';
  if ('storeCode' in entry) row.store_code = entry.storeCode || '';
  if ('clientName' in entry) row.client_name = entry.clientName || '';
  if ('accumulatedValue' in entry) row.accumulated_value = Number(entry.accumulatedValue || 0);
  if ('phone' in entry) row.phone = entry.phone || '';
  if ('mobile' in entry) row.mobile = entry.mobile || '';
  if ('invoiceEmail' in entry) row.invoice_email = entry.invoiceEmail || '';
  if ('contractEmail' in entry) row.contract_email = entry.contractEmail || '';
  if ('commercialEmail' in entry) row.commercial_email = entry.commercialEmail || '';
  if ('seller' in entry) row.seller = entry.seller || '';
  if ('status' in entry) row.status = entry.status || 'priority_not_sent';
  if ('createdAt' in entry) row.created_at = entry.createdAt;
  if ('updatedAt' in entry) row.updated_at = entry.updatedAt;
  return row;
}

export async function loadRegularizationEntries() {
  if (!supabase) {
    return { entries: sortRegularizationEntries(loadLocalEntries()), mode: 'local' };
  }

  const { data, error } = await supabase
    .from('regularization_entries')
    .select('*')
    .order('client_name', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return { entries: sortRegularizationEntries(loadLocalEntries()), mode: 'local' };
    }
    throw error;
  }

  const entries = sortRegularizationEntries((data || []).map(toRegularizationEntry));
  saveLocalEntries(entries);
  return { entries, mode: 'supabase' };
}

export async function mergeRegularizationEntries(uploadRows) {
  const now = new Date().toISOString();

  if (!supabase) {
    const existingEntries = loadLocalEntries();
    const existingKeys = new Set(existingEntries.map((entry) => entry.rowKey));
    const newEntries = uploadRows
      .filter((entry) => !existingKeys.has(entry.rowKey))
      .map((entry) => ({ ...entry, createdAt: now, updatedAt: now }));
    const entries = sortRegularizationEntries([...existingEntries, ...newEntries]);
    saveLocalEntries(entries);
    return { entries, insertedCount: newEntries.length, skippedCount: uploadRows.length - newEntries.length };
  }

  const { data: existingData, error: existingError } = await supabase.from('regularization_entries').select('*');
  if (existingError) {
    if (!isMissingTableError(existingError)) throw existingError;
    const existingEntries = loadLocalEntries();
    const existingKeys = new Set(existingEntries.map((entry) => entry.rowKey));
    const newEntries = uploadRows
      .filter((entry) => !existingKeys.has(entry.rowKey))
      .map((entry) => ({ ...entry, createdAt: now, updatedAt: now }));
    const entries = sortRegularizationEntries([...existingEntries, ...newEntries]);
    saveLocalEntries(entries);
    return { entries, insertedCount: newEntries.length, skippedCount: uploadRows.length - newEntries.length };
  }

  const existingEntries = (existingData || []).map(toRegularizationEntry);
  const existingKeys = new Set(existingEntries.map((entry) => entry.rowKey));
  const newEntries = uploadRows
    .filter((entry) => !existingKeys.has(entry.rowKey))
    .map((entry) => ({ ...entry, createdAt: now, updatedAt: now }));

  if (newEntries.length === 0) {
    const entries = sortRegularizationEntries(existingEntries);
    saveLocalEntries(entries);
    return { entries, insertedCount: 0, skippedCount: uploadRows.length };
  }

  const { data, error } = await supabase
    .from('regularization_entries')
    .insert(newEntries.map(toRow))
    .select('*');
  if (error) throw error;

  const savedEntries = (data || []).map(toRegularizationEntry);
  const entries = sortRegularizationEntries([...existingEntries, ...savedEntries]);
  saveLocalEntries(entries);
  return { entries, insertedCount: savedEntries.length, skippedCount: uploadRows.length - savedEntries.length };
}

export async function updateRegularizationEntry(id, changes) {
  const nextChanges = { ...changes, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const entries = loadLocalEntries().map((entry) => (entry.id === id ? { ...entry, ...nextChanges } : entry));
    saveLocalEntries(entries);
    return entries.find((entry) => entry.id === id);
  }

  const { data, error } = await supabase
    .from('regularization_entries')
    .update(toRow(nextChanges))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  const savedEntry = toRegularizationEntry(data);
  saveLocalEntries(sortRegularizationEntries(loadLocalEntries().map((entry) => (entry.id === id ? savedEntry : entry))));
  return savedEntry;
}

export async function deleteRegularizationEntry(id) {
  if (!supabase) {
    saveLocalEntries(loadLocalEntries().filter((entry) => entry.id !== id));
    return;
  }

  const { error } = await supabase.from('regularization_entries').delete().eq('id', id);
  if (error) throw error;

  saveLocalEntries(loadLocalEntries().filter((entry) => entry.id !== id));
}

export function subscribeToRegularizationChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:regularization_entries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'regularization_entries' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        entry: payload.new?.id ? toRegularizationEntry(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
