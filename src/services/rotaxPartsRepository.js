import { supabase } from './supabaseClient';

const PARTS_STORAGE_KEY = 'followuper.rotaxParts.v1';
const CATALOG_STORAGE_KEY = 'followuper.rotaxPartsCatalog.v1';

export function normalizePartNumber(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function loadLocalParts() {
  try {
    return JSON.parse(localStorage.getItem(PARTS_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalParts(parts) {
  localStorage.setItem(PARTS_STORAGE_KEY, JSON.stringify(parts));
}

function loadLocalCatalog() {
  try {
    return JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveLocalCatalog(catalog) {
  localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

function toPart(row) {
  return {
    pnKey: row.pn_key,
    partNumber: row.part_number,
    description: row.description || '',
    unit: row.unit || '',
    suggestedPrice: Number(row.suggested_price || 0),
    cruzeiroPrice: Number(row.cruzeiro_price || 0),
  };
}

function toCatalog(row) {
  if (!row) return null;
  return {
    id: row.id,
    batchId: row.batch_id,
    fileName: row.file_name || '',
    itemCount: Number(row.item_count || 0),
    updatedBy: row.updated_by || '',
    updatedAt: row.updated_at,
  };
}

export async function loadRotaxPartsCatalog() {
  if (!supabase) return { catalog: loadLocalCatalog(), mode: 'local' };

  const { data, error } = await supabase.from('rotax_parts_catalog').select('*').eq('id', 'current').maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return { catalog: loadLocalCatalog(), mode: 'local' };
    throw error;
  }

  const catalog = toCatalog(data);
  if (catalog) saveLocalCatalog(catalog);
  return { catalog, mode: 'supabase' };
}

export async function searchRotaxParts(value) {
  const query = normalizePartNumber(value);
  if (!query) return [];

  if (!supabase) {
    return loadLocalParts()
      .filter((part) => part.pnKey.includes(query))
      .slice(0, 30);
  }

  const { data, error } = await supabase
    .from('rotax_parts')
    .select('pn_key,part_number,description,unit,suggested_price,cruzeiro_price')
    .ilike('pn_key', `%${query}%`)
    .order('part_number', { ascending: true })
    .limit(30);

  if (error) {
    if (isMissingTableError(error)) {
      return loadLocalParts()
        .filter((part) => part.pnKey.includes(query))
        .slice(0, 30);
    }
    throw error;
  }

  return data.map(toPart);
}

export async function replaceRotaxParts(parts, metadata) {
  const batchId = crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  const nextParts = parts.map((part) => ({ ...part, batchId }));
  const catalog = {
    id: 'current',
    batchId,
    fileName: metadata.fileName || '',
    itemCount: nextParts.length,
    updatedBy: metadata.updatedBy || '',
    updatedAt,
  };

  if (!supabase) {
    saveLocalParts(nextParts);
    saveLocalCatalog(catalog);
    return catalog;
  }

  for (let index = 0; index < nextParts.length; index += 500) {
    const chunk = nextParts.slice(index, index + 500).map((part) => ({
      pn_key: part.pnKey,
      part_number: part.partNumber,
      description: part.description || null,
      unit: part.unit || null,
      suggested_price: Number(part.suggestedPrice || 0),
      cruzeiro_price: Number(part.cruzeiroPrice || 0),
      batch_id: batchId,
      updated_at: updatedAt,
    }));
    const { error } = await supabase.from('rotax_parts').upsert(chunk, { onConflict: 'pn_key' });
    if (error) throw error;
  }

  const { error: cleanupError } = await supabase.from('rotax_parts').delete().neq('batch_id', batchId);
  if (cleanupError) throw cleanupError;

  const { error: catalogError } = await supabase.from('rotax_parts_catalog').upsert(
    {
      id: 'current',
      batch_id: batchId,
      file_name: catalog.fileName,
      item_count: catalog.itemCount,
      updated_by: catalog.updatedBy,
      updated_at: catalog.updatedAt,
    },
    { onConflict: 'id' },
  );
  if (catalogError) throw catalogError;

  saveLocalParts(nextParts);
  saveLocalCatalog(catalog);
  return catalog;
}

export function subscribeToRotaxPartsCatalog(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:rotax_parts_catalog')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rotax_parts_catalog' }, (payload) => {
      onChange(payload.new?.id ? toCatalog(payload.new) : null);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
