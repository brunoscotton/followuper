import { supabase } from './supabaseClient';

const CARRIERS_STORAGE_KEY = 'followuper.shippingCarriers.v1';
const CARRIER_META_STORAGE_KEY = 'followuper.shippingCarriersMeta.v1';
const CARRIER_BATCH_SIZE = 500;

function loadLocalCarriers() {
  try {
    return JSON.parse(localStorage.getItem(CARRIERS_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function loadLocalMeta() {
  try {
    return JSON.parse(localStorage.getItem(CARRIER_META_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalCarriers(carriers) {
  localStorage.setItem(CARRIERS_STORAGE_KEY, JSON.stringify(sortShippingCarriers(carriers)));
}

function saveLocalMeta(meta) {
  localStorage.setItem(CARRIER_META_STORAGE_KEY, JSON.stringify(meta || {}));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

export function sortShippingCarriers(carriers) {
  return [...carriers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
}

function toCarrier(row) {
  return {
    code: row.code,
    name: row.name || '',
    ddd: row.ddd || '',
    phone: row.phone || '',
    uploadedAt: row.uploaded_at || '',
    updatedAt: row.updated_at || '',
  };
}

function toRow(carrier) {
  return {
    code: carrier.code,
    ddd: carrier.ddd || null,
    name: carrier.name || '',
    phone: carrier.phone || null,
    uploaded_at: carrier.uploadedAt || null,
    updated_at: carrier.updatedAt || new Date().toISOString(),
  };
}

function toMeta(row) {
  return {
    fileName: row?.file_name || '',
    uploadedAt: row?.uploaded_at || '',
  };
}

export async function loadShippingCarriers() {
  if (!supabase) {
    return { carriers: sortShippingCarriers(loadLocalCarriers()), meta: loadLocalMeta(), mode: 'local' };
  }

  const [carriersResult, metaResult] = await Promise.all([
    supabase.from('shipping_carriers').select('*').order('name', { ascending: true }),
    supabase.from('shipping_carrier_uploads').select('*').eq('id', 'current').maybeSingle(),
  ]);

  if (carriersResult.error || metaResult.error) {
    const error = carriersResult.error || metaResult.error;
    if (isMissingTableError(error)) {
      return { carriers: sortShippingCarriers(loadLocalCarriers()), meta: loadLocalMeta(), mode: 'local' };
    }
    throw error;
  }

  const carriers = sortShippingCarriers((carriersResult.data || []).map(toCarrier));
  const meta = toMeta(metaResult.data);
  saveLocalCarriers(carriers);
  saveLocalMeta(meta);
  return { carriers, meta, mode: 'supabase' };
}

export async function replaceShippingCarriers(carriers, fileName) {
  const uploadedAt = new Date().toISOString();
  const nextCarriers = sortShippingCarriers(
    carriers.map((carrier) => ({
      ...carrier,
      uploadedAt,
      updatedAt: uploadedAt,
    })),
  );
  const meta = { fileName, uploadedAt };

  if (!supabase) {
    saveLocalCarriers(nextCarriers);
    saveLocalMeta(meta);
    return { carriers: nextCarriers, meta };
  }

  const { error: deleteError } = await supabase.from('shipping_carriers').delete().neq('code', '__followuper_keep_none__');
  if (deleteError) throw deleteError;

  for (let index = 0; index < nextCarriers.length; index += CARRIER_BATCH_SIZE) {
    const batch = nextCarriers.slice(index, index + CARRIER_BATCH_SIZE);
    const { error } = await supabase
      .from('shipping_carriers')
      .upsert(batch.map(toRow), { onConflict: 'code' });
    if (error) throw error;
  }

  const { error: metaError } = await supabase.from('shipping_carrier_uploads').upsert({
    id: 'current',
    file_name: fileName || null,
    uploaded_at: uploadedAt,
  });
  if (metaError) throw metaError;

  saveLocalCarriers(nextCarriers);
  saveLocalMeta(meta);
  return { carriers: nextCarriers, meta };
}
