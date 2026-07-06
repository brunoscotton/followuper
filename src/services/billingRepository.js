import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.billingEntries.v1';
const UPLOADS_STORAGE_KEY = 'followuper.billingUploads.v1';
const SNAPSHOTS_STORAGE_KEY = 'followuper.billingUploadSnapshots.v1';

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

function loadLocalBillingUploads() {
  try {
    return JSON.parse(localStorage.getItem(UPLOADS_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalBillingUploads(uploads) {
  localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(uploads));
}

function loadLocalBillingSnapshots() {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOTS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalBillingSnapshots(snapshots) {
  localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
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

function toBillingUpload(row) {
  return {
    seller: row.seller,
    fileName: row.file_name || '',
    userId: row.user_id || '',
    userEmail: row.user_email || '',
    userName: row.user_name || row.user_email || '',
    entryCount: Number(row.entry_count || 0),
    uploadedAt: row.uploaded_at,
    canRestore: Boolean(row.has_snapshot),
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
  const usedExistingIds = new Set();

  return rows.map((row, index) => {
    let existing = existingByKey.get(row.rowKey);
    if (!existing && row.legacyRowKey) {
      const legacyEntry = existingByKey.get(row.legacyRowKey);
      if (legacyEntry && !usedExistingIds.has(legacyEntry.id)) existing = legacyEntry;
    }
    if (existing?.id) usedExistingIds.add(existing.id);

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
    return { entries: sortBillingEntries(loadLocalBillingEntries()), uploads: loadLocalBillingUploads(), mode: 'local' };
  }

  const [entriesResult, uploadsResult] = await Promise.all([
    supabase
      .from('billing_entries')
      .select('*')
      .order('seller', { ascending: true })
      .order('order_index', { ascending: true }),
    supabase.from('billing_uploads').select('*').order('uploaded_at', { ascending: false }),
  ]);

  if (entriesResult.error) {
    if (isMissingTableError(entriesResult.error)) {
      return { entries: sortBillingEntries(loadLocalBillingEntries()), uploads: loadLocalBillingUploads(), mode: 'local' };
    }
    throw entriesResult.error;
  }

  const entries = sortBillingEntries(entriesResult.data.map(toBillingEntry));
  const uploads = uploadsResult.error && isMissingTableError(uploadsResult.error)
    ? loadLocalBillingUploads()
    : (uploadsResult.data || []).map(toBillingUpload);
  if (uploadsResult.error && !isMissingTableError(uploadsResult.error)) throw uploadsResult.error;
  saveLocalBillingEntries(entries);
  saveLocalBillingUploads(uploads);
  return { entries, uploads, mode: 'supabase' };
}

export async function recordBillingUpload(upload) {
  const nextUpload = {
    ...upload,
    uploadedAt: upload.uploadedAt || new Date().toISOString(),
  };

  if (!supabase) {
    const uploads = [nextUpload, ...loadLocalBillingUploads().filter((item) => item.seller !== nextUpload.seller)];
    saveLocalBillingUploads(uploads);
    return nextUpload;
  }

  const { data, error } = await supabase
    .from('billing_uploads')
    .upsert(
      {
        seller: nextUpload.seller,
        file_name: nextUpload.fileName || '',
        user_id: nextUpload.userId || null,
        user_email: nextUpload.userEmail || '',
        user_name: nextUpload.userName || nextUpload.userEmail || '',
        entry_count: Number(nextUpload.entryCount || 0),
        uploaded_at: nextUpload.uploadedAt,
      },
      { onConflict: 'seller' },
    )
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      const uploads = [nextUpload, ...loadLocalBillingUploads().filter((item) => item.seller !== nextUpload.seller)];
      saveLocalBillingUploads(uploads);
      return nextUpload;
    }
    throw error;
  }

  return toBillingUpload(data);
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

export async function replaceBillingEntriesForSellerWithSnapshot(seller, rows, upload) {
  const nextUpload = {
    ...upload,
    seller,
    uploadedAt: upload.uploadedAt || new Date().toISOString(),
  };

  if (!supabase) {
    const existingEntries = loadLocalBillingEntries();
    const existingUploads = loadLocalBillingUploads();
    const previousSellerEntries = existingEntries.filter((entry) => entry.seller === seller);
    const previousUpload = existingUploads.find((item) => item.seller === seller) || null;
    const snapshots = loadLocalBillingSnapshots();
    snapshots[seller] = { entries: previousSellerEntries, upload: previousUpload };
    saveLocalBillingSnapshots(snapshots);

    const nextSellerRows = mergeRowsWithNotes(seller, rows, previousSellerEntries);
    saveLocalBillingEntries([...existingEntries.filter((entry) => entry.seller !== seller), ...nextSellerRows]);
    const savedUpload = { ...nextUpload, entryCount: nextSellerRows.length, canRestore: true };
    saveLocalBillingUploads([savedUpload, ...existingUploads.filter((item) => item.seller !== seller)]);
    return { entries: nextSellerRows, upload: savedUpload };
  }

  const { data: existingData, error: existingError } = await supabase
    .from('billing_entries')
    .select('*')
    .eq('seller', seller);
  if (existingError) throw existingError;

  const nextRows = mergeRowsWithNotes(seller, rows, (existingData || []).map(toBillingEntry));
  const uploadPayload = {
    file_name: nextUpload.fileName || '',
    user_id: nextUpload.userId || null,
    user_email: nextUpload.userEmail || '',
    user_name: nextUpload.userName || nextUpload.userEmail || '',
    entry_count: nextRows.length,
    uploaded_at: nextUpload.uploadedAt,
  };
  const { data, error } = await supabase.rpc('replace_billing_entries_with_snapshot', {
    p_seller: seller,
    p_rows: nextRows.map(toRow),
    p_upload: uploadPayload,
  });

  if (error) {
    const message = String(error.message || '').toLowerCase();
    if (error.code === 'PGRST202' || message.includes('replace_billing_entries_with_snapshot')) {
      throw new Error('Atualize o schema do Supabase antes de fazer um novo upload de cobranças.');
    }
    throw error;
  }

  const { data: uploadData, error: uploadError } = await supabase
    .from('billing_uploads')
    .select('*')
    .eq('seller', seller)
    .single();
  if (uploadError) throw uploadError;

  return {
    entries: sortBillingEntries((data || []).map(toBillingEntry)),
    upload: toBillingUpload(uploadData),
  };
}

export async function restoreLastBillingUpload(seller) {
  if (!seller) throw new Error('Selecione o vendedor da cobrança.');

  if (!supabase) {
    const snapshots = loadLocalBillingSnapshots();
    const snapshot = snapshots[seller];
    if (!snapshot) throw new Error('Não há upload anterior disponível para restauração.');

    const currentEntries = loadLocalBillingEntries();
    const restoredEntries = snapshot.entries || [];
    saveLocalBillingEntries([...currentEntries.filter((entry) => entry.seller !== seller), ...restoredEntries]);

    const currentUploads = loadLocalBillingUploads();
    const restoredUpload = snapshot.upload ? { ...snapshot.upload, canRestore: false } : null;
    saveLocalBillingUploads([
      ...(restoredUpload ? [restoredUpload] : []),
      ...currentUploads.filter((item) => item.seller !== seller),
    ]);
    delete snapshots[seller];
    saveLocalBillingSnapshots(snapshots);
    return { entries: restoredEntries, upload: restoredUpload };
  }

  const { data, error } = await supabase.rpc('restore_last_billing_upload', { p_seller: seller });
  if (error) {
    const message = String(error.message || '').toLowerCase();
    if (error.code === 'PGRST202' || message.includes('restore_last_billing_upload')) {
      throw new Error('Atualize o schema do Supabase para habilitar a restauração de cobranças.');
    }
    throw error;
  }

  const { data: uploadData, error: uploadError } = await supabase
    .from('billing_uploads')
    .select('*')
    .eq('seller', seller)
    .maybeSingle();
  if (uploadError) throw uploadError;

  return {
    entries: sortBillingEntries((data || []).map(toBillingEntry)),
    upload: uploadData ? toBillingUpload(uploadData) : null,
  };
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

export async function deleteBillingEntry(id) {
  if (!supabase) {
    saveLocalBillingEntries(loadLocalBillingEntries().filter((entry) => entry.id !== id));
    return;
  }

  const { error } = await supabase.from('billing_entries').delete().eq('id', id);
  if (error) throw error;

  saveLocalBillingEntries(loadLocalBillingEntries().filter((entry) => entry.id !== id));
}

export function subscribeToBillingChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:billing_entries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_entries' }, (payload) => {
      onChange({
        collection: 'entries',
        eventType: payload.eventType,
        entry: payload.new?.id ? toBillingEntry(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_uploads' }, (payload) => {
      onChange({
        collection: 'uploads',
        eventType: payload.eventType,
        upload: payload.new?.seller ? toBillingUpload(payload.new) : null,
        oldId: payload.old?.seller,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
