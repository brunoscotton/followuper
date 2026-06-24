import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.billingEntries.v1';

function loadLocalBillingEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalBillingEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortBillingEntries(entries)));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

export function sortBillingEntries(entries) {
  return [...entries].sort((a, b) => {
    const sellerCompare = (a.seller || '').localeCompare(b.seller || '', 'pt-BR');
    if (sellerCompare !== 0) return sellerCompare;
    return Number(a.orderIndex || 0) - Number(b.orderIndex || 0);
  });
}

export function cacheBillingEntries(entries) {
  saveLocalBillingEntries(entries);
}

function toBillingEntry(row) {
  return {
    id: row.id,
    seller: row.seller || '',
    rowKey: row.row_key || '',
    rowData: row.row_data || {},
    notes: row.notes || '',
    orderIndex: Number(row.order_index || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(entry) {
  const row = {};
  if ('id' in entry) row.id = entry.id;
  if ('seller' in entry) row.seller = entry.seller || '';
  if ('rowKey' in entry) row.row_key = entry.rowKey || '';
  if ('rowData' in entry) row.row_data = entry.rowData || {};
  if ('notes' in entry) row.notes = entry.notes || '';
  if ('orderIndex' in entry) row.order_index = Number(entry.orderIndex || 0);
  if ('createdAt' in entry) row.created_at = entry.createdAt;
  if ('updatedAt' in entry) row.updated_at = entry.updatedAt;
  return row;
}

function mergeRowsWithNotes(seller, rows, existingRows) {
  const now = new Date().toISOString();
  const existingByKey = new Map(existingRows.map((entry) => [entry.rowKey, entry]));

  return rows.map((row, index) => {
    const existing = existingByKey.get(row.rowKey);
    return {
      id: existing?.id || `${seller}-${row.rowKey}`,
      seller,
      rowKey: row.rowKey,
      rowData: row.rowData,
      notes: existing?.notes || '',
      orderIndex: index,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  });
}

export async function loadBillingEntries() {
  if (!supabase) {
    return { entries: sortBillingEntries(loadLocalBillingEntries()), mode: 'local' };
  }

  const { data, error } = await supabase
    .from('billing_entries')
    .select('*')
    .order('seller', { ascending: true })
    .order('order_index', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return { entries: sortBillingEntries(loadLocalBillingEntries()), mode: 'local' };
    }
    throw error;
  }

  const entries = sortBillingEntries(data.map(toBillingEntry));
  saveLocalBillingEntries(entries);
  return { entries, mode: 'supabase' };
}

export async function replaceBillingEntriesForSeller(seller, rows) {
  if (!supabase) {
    const existing = loadLocalBillingEntries();
    const otherSellers = existing.filter((entry) => entry.seller !== seller);
    const nextSellerRows = mergeRowsWithNotes(seller, rows, existing.filter((entry) => entry.seller === seller));
    const nextEntries = sortBillingEntries([...otherSellers, ...nextSellerRows]);
    saveLocalBillingEntries(nextEntries);
    return nextSellerRows;
  }

  const { data: existingData, error: existingError } = await supabase
    .from('billing_entries')
    .select('*')
    .eq('seller', seller);
  if (existingError) throw existingError;

  const nextRows = mergeRowsWithNotes(seller, rows, (existingData || []).map(toBillingEntry));

  const { error: deleteError } = await supabase.from('billing_entries').delete().eq('seller', seller);
  if (deleteError) throw deleteError;
  if (nextRows.length === 0) return [];

  const { data, error } = await supabase
    .from('billing_entries')
    .insert(nextRows.map(toRow))
    .select('*');
  if (error) throw error;

  return sortBillingEntries(data.map(toBillingEntry));
}

export async function updateBillingEntry(id, changes) {
  const nextChanges = { ...changes, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const entries = loadLocalBillingEntries().map((entry) => (entry.id === id ? { ...entry, ...nextChanges } : entry));
    saveLocalBillingEntries(entries);
    return entries.find((entry) => entry.id === id);
  }

  const { data, error } = await supabase
    .from('billing_entries')
    .update(toRow(nextChanges))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  return toBillingEntry(data);
}

export function subscribeToBillingChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:billing_entries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_entries' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        entry: payload.new?.id ? toBillingEntry(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
