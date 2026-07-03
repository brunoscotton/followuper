import { supabase } from './supabaseClient';

const ITEMS_STORAGE_KEY = 'followuper.stockItems.v1';
const CATALOG_STORAGE_KEY = 'followuper.stockCatalog.v1';
const LISTS_STORAGE_KEY = 'followuper.stockTransferLists.v1';
const CANDIDATES_STORAGE_KEY = 'followuper.stockTransferCandidates.v1';
const ADDRESSES_STORAGE_KEY = 'followuper.stockProductAddresses.v1';

function loadLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

export function normalizeStockProduct(value) {
  return String(value || '').trim().toUpperCase();
}

function toStockItem(row) {
  return {
    productKey: row.product_key,
    product: row.product,
    description: row.description || '',
    address: '',
    quantity: Number(row.quantity || 0),
    groupCode: row.group_code || '',
    isManual: row.is_manual === true,
  };
}

function mergeStockDescriptions(items, descriptions) {
  const descriptionsByKey = new Map(
    descriptions.map((description) => [description.product_key, description.description || '']),
  );
  return items.map((item) => ({
    ...item,
    description: descriptionsByKey.get(item.productKey) || item.description || '',
  }));
}

function mergeStockAddresses(items, addresses) {
  const addressesByKey = new Map(
    addresses.map((address) => [
      address.product_key || address.productKey,
      address.address || '',
    ]),
  );
  return items.map((item) => ({
    ...item,
    address: addressesByKey.get(item.productKey) || '',
  }));
}

async function loadAllStockDescriptions() {
  const descriptions = [];
  const pageSize = 1000;

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from('stock_product_descriptions')
      .select('product_key,description')
      .range(start, start + pageSize - 1);
    if (error) return { data: [], error };
    descriptions.push(...data);
    if (data.length < pageSize) return { data: descriptions, error: null };
  }
}

async function loadAllStockAddresses() {
  const addresses = [];
  const pageSize = 1000;

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from('stock_product_addresses')
      .select('product_key,address')
      .range(start, start + pageSize - 1);
    if (error) return { data: [], error };
    addresses.push(...data);
    if (data.length < pageSize) return { data: addresses, error: null };
  }
}

async function touchStockCatalog(updatedAt, updatedBy) {
  const [{ data: currentCatalog, error: catalogLookupError }, { count, error: countError }] = await Promise.all([
    supabase.from('stock_catalog').select('*').eq('id', 'current').maybeSingle(),
    supabase.from('stock_items').select('*', { count: 'exact', head: true }),
  ]);
  if (catalogLookupError) throw catalogLookupError;
  if (countError) throw countError;

  const { error: catalogError } = await supabase.from('stock_catalog').upsert(
    {
      id: 'current',
      batch_id: currentCatalog?.batch_id || crypto.randomUUID(),
      file_name: currentCatalog?.file_name || '',
      item_count: Number(count || 0),
      updated_by: updatedBy || currentCatalog?.updated_by || '',
      updated_at: updatedAt,
    },
    { onConflict: 'id' },
  );
  if (catalogError) throw catalogError;
}

async function loadAllStockItems() {
  const items = [];
  const pageSize = 1000;

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .order('product', { ascending: true })
      .range(start, start + pageSize - 1);
    if (error) return { data: [], error };
    items.push(...data);
    if (data.length < pageSize) return { data: items, error: null };
  }
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

function toTransferList(row) {
  return {
    id: row.id,
    name: row.name,
    items: Array.isArray(row.items) ? row.items : [],
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCandidate(row) {
  return {
    productKey: row.product_key,
    product: row.product,
    quantity: Number(row.quantity || 0),
    groupCode: row.group_code || '',
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadStockTransferData() {
  if (!supabase) {
    const items = mergeStockAddresses(
      loadLocal(ITEMS_STORAGE_KEY, []),
      loadLocal(ADDRESSES_STORAGE_KEY, []),
    );
    return {
      catalog: loadLocal(CATALOG_STORAGE_KEY, null),
      items,
      lists: loadLocal(LISTS_STORAGE_KEY, []),
      candidates: loadLocal(CANDIDATES_STORAGE_KEY, []),
      mode: 'local',
    };
  }

  const [itemsResult, descriptionsResult, addressesResult, catalogResult, listsResult, candidatesResult] = await Promise.all([
    loadAllStockItems(),
    loadAllStockDescriptions(),
    loadAllStockAddresses(),
    supabase.from('stock_catalog').select('*').eq('id', 'current').maybeSingle(),
    supabase.from('stock_transfer_lists').select('*').order('created_at', { ascending: false }),
    supabase.from('stock_transfer_candidates').select('*').order('created_at', { ascending: true }),
  ]);

  const firstError = [
    itemsResult.error,
    descriptionsResult.error,
    addressesResult.error,
    catalogResult.error,
    listsResult.error,
    candidatesResult.error,
  ].find(Boolean);
  if (firstError) {
    if (isMissingTableError(firstError)) {
      const items = mergeStockAddresses(
        loadLocal(ITEMS_STORAGE_KEY, []),
        loadLocal(ADDRESSES_STORAGE_KEY, []),
      );
      return {
        catalog: loadLocal(CATALOG_STORAGE_KEY, null),
        items,
        lists: loadLocal(LISTS_STORAGE_KEY, []),
        candidates: loadLocal(CANDIDATES_STORAGE_KEY, []),
        mode: 'local',
      };
    }
    throw firstError;
  }

  const items = mergeStockAddresses(
    mergeStockDescriptions(itemsResult.data.map(toStockItem), descriptionsResult.data),
    addressesResult.data,
  );
  const catalog = toCatalog(catalogResult.data);
  const lists = listsResult.data.map(toTransferList);
  const candidates = candidatesResult.data.map(toCandidate);
  saveLocal(ITEMS_STORAGE_KEY, items);
  saveLocal(CATALOG_STORAGE_KEY, catalog);
  saveLocal(LISTS_STORAGE_KEY, lists);
  saveLocal(CANDIDATES_STORAGE_KEY, candidates);
  return { catalog, items, lists, candidates, mode: 'supabase' };
}

export async function loadStockItems() {
  if (!supabase) {
    return mergeStockAddresses(
      loadLocal(ITEMS_STORAGE_KEY, []),
      loadLocal(ADDRESSES_STORAGE_KEY, []),
    );
  }
  const [itemsResult, descriptionsResult, addressesResult] = await Promise.all([
    loadAllStockItems(),
    loadAllStockDescriptions(),
    loadAllStockAddresses(),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (descriptionsResult.error) throw descriptionsResult.error;
  if (addressesResult.error) throw addressesResult.error;
  const items = mergeStockAddresses(
    mergeStockDescriptions(itemsResult.data.map(toStockItem), descriptionsResult.data),
    addressesResult.data,
  );
  saveLocal(ITEMS_STORAGE_KEY, items);
  return items;
}

export async function replaceStockItems(items, metadata) {
  const batchId = crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  const catalog = {
    id: 'current',
    batchId,
    fileName: metadata.fileName || '',
    itemCount: items.length,
    updatedBy: metadata.updatedBy || '',
    updatedAt,
  };

  if (!supabase) {
    const manualItems = loadLocal(ITEMS_STORAGE_KEY, []).filter(
      (item) => item.isManual && !items.some((nextItem) => nextItem.productKey === item.productKey),
    );
    const allItems = mergeStockAddresses(
      [...items, ...manualItems],
      loadLocal(ADDRESSES_STORAGE_KEY, []),
    ).sort((a, b) => a.product.localeCompare(b.product, 'pt-BR'));
    const savedCatalog = { ...catalog, itemCount: allItems.length };
    saveLocal(ITEMS_STORAGE_KEY, allItems);
    saveLocal(CATALOG_STORAGE_KEY, savedCatalog);
    return savedCatalog;
  }

  for (let index = 0; index < items.length; index += 500) {
    const rows = items.slice(index, index + 500).map((item) => ({
      product_key: item.productKey,
      product: item.product,
      description: item.description || '',
      quantity: Number(item.quantity || 0),
      group_code: item.groupCode || null,
      is_manual: false,
      batch_id: batchId,
      updated_at: updatedAt,
    }));
    const { error } = await supabase.from('stock_items').upsert(rows, { onConflict: 'product_key' });
    if (error) throw error;
  }

  const { error: cleanupError } = await supabase
    .from('stock_items')
    .delete()
    .eq('is_manual', false)
    .neq('batch_id', batchId);
  if (cleanupError) throw cleanupError;

  const { count } = await supabase.from('stock_items').select('*', { count: 'exact', head: true });
  catalog.itemCount = Number(count || items.length);

  const { error: catalogError } = await supabase.from('stock_catalog').upsert(
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

  saveLocal(ITEMS_STORAGE_KEY, items);
  saveLocal(CATALOG_STORAGE_KEY, catalog);
  return catalog;
}

export async function createStockTransferList(list) {
  if (!supabase) {
    const lists = [list, ...loadLocal(LISTS_STORAGE_KEY, [])];
    saveLocal(LISTS_STORAGE_KEY, lists);
    return list;
  }

  const { data, error } = await supabase
    .from('stock_transfer_lists')
    .insert({
      id: list.id,
      name: list.name,
      items: list.items,
      created_by: list.createdBy || null,
      created_at: list.createdAt,
      updated_at: list.updatedAt,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toTransferList(data);
}

export async function updateStockTransferList(id, changes) {
  const updatedAt = new Date().toISOString();
  if (!supabase) {
    const lists = loadLocal(LISTS_STORAGE_KEY, []).map((list) =>
      list.id === id ? { ...list, ...changes, updatedAt } : list,
    );
    saveLocal(LISTS_STORAGE_KEY, lists);
    return lists.find((list) => list.id === id);
  }

  const row = { updated_at: updatedAt };
  if ('name' in changes) row.name = changes.name;
  if ('items' in changes) row.items = changes.items;
  const { data, error } = await supabase
    .from('stock_transfer_lists')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toTransferList(data);
}

export async function deleteStockTransferList(id) {
  if (!supabase) {
    saveLocal(LISTS_STORAGE_KEY, loadLocal(LISTS_STORAGE_KEY, []).filter((list) => list.id !== id));
    return;
  }

  const { error } = await supabase.from('stock_transfer_lists').delete().eq('id', id);
  if (error) throw error;
}

export async function ensureManualStockItem(candidate) {
  if (!supabase) {
    const items = loadLocal(ITEMS_STORAGE_KEY, []);
    const existing = items.find((item) => item.productKey === candidate.productKey);
    if (existing) return existing;
    const item = {
      productKey: candidate.productKey,
      product: candidate.product,
      description: '',
      quantity: 0,
      groupCode: candidate.groupCode,
      isManual: true,
    };
    const nextItems = [...items, item].sort((a, b) => a.product.localeCompare(b.product, 'pt-BR'));
    saveLocal(ITEMS_STORAGE_KEY, nextItems);
    const catalog = loadLocal(CATALOG_STORAGE_KEY, null);
    saveLocal(CATALOG_STORAGE_KEY, {
      ...(catalog || {
        id: 'current',
        batchId: crypto.randomUUID(),
        fileName: '',
        updatedBy: candidate.createdBy || '',
      }),
      itemCount: nextItems.length,
      updatedAt: new Date().toISOString(),
    });
    return item;
  }

  const { data: existing, error: lookupError } = await supabase
    .from('stock_items')
    .select('*')
    .eq('product_key', candidate.productKey)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return toStockItem(existing);

  const { data, error } = await supabase
    .from('stock_items')
    .insert({
      product_key: candidate.productKey,
      product: candidate.product,
      quantity: 0,
      group_code: candidate.groupCode || null,
      batch_id: crypto.randomUUID(),
      is_manual: true,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;

  const [{ count }, { data: currentCatalog }] = await Promise.all([
    supabase.from('stock_items').select('*', { count: 'exact', head: true }),
    supabase.from('stock_catalog').select('*').eq('id', 'current').maybeSingle(),
  ]);
  await supabase.from('stock_catalog').upsert(
    {
      id: 'current',
      batch_id: currentCatalog?.batch_id || crypto.randomUUID(),
      file_name: currentCatalog?.file_name || '',
      item_count: Number(count || 0),
      updated_by: candidate.createdBy || currentCatalog?.updated_by || '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  return toStockItem(data);
}

export async function upsertStockTransferCandidate(candidate) {
  const nowIso = new Date().toISOString();
  if (!supabase) {
    const candidates = loadLocal(CANDIDATES_STORAGE_KEY, []);
    const existing = candidates.find((item) => item.productKey === candidate.productKey);
    const saved = { ...existing, ...candidate, createdAt: existing?.createdAt || nowIso, updatedAt: nowIso };
    saveLocal(CANDIDATES_STORAGE_KEY, [saved, ...candidates.filter((item) => item.productKey !== candidate.productKey)]);
    return saved;
  }

  const { data, error } = await supabase
    .from('stock_transfer_candidates')
    .upsert(
      {
        product_key: candidate.productKey,
        product: candidate.product,
        quantity: Number(candidate.quantity || 0),
        group_code: candidate.groupCode || null,
        created_by: candidate.createdBy || null,
        updated_at: nowIso,
      },
      { onConflict: 'product_key' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return toCandidate(data);
}

export async function deleteStockTransferCandidate(productKey) {
  if (!supabase) {
    saveLocal(
      CANDIDATES_STORAGE_KEY,
      loadLocal(CANDIDATES_STORAGE_KEY, []).filter((item) => item.productKey !== productKey),
    );
    return;
  }
  const { error } = await supabase.from('stock_transfer_candidates').delete().eq('product_key', productKey);
  if (error) throw error;
}

export async function clearStockTransferCandidates() {
  if (!supabase) {
    saveLocal(CANDIDATES_STORAGE_KEY, []);
    return;
  }
  const { error } = await supabase.from('stock_transfer_candidates').delete().neq('product_key', '');
  if (error) throw error;
}

export async function upsertStockProductDescriptions(descriptions, metadata = {}) {
  if (!supabase) {
    const items = loadLocal(ITEMS_STORAGE_KEY, []);
    const descriptionsByKey = new Map(descriptions.map((item) => [item.productKey, item.description]));
    const nextItems = items.map((item) => ({
      ...item,
      description: descriptionsByKey.get(item.productKey) || item.description || '',
    }));
    saveLocal(ITEMS_STORAGE_KEY, nextItems);
    return descriptions;
  }

  const updatedAt = new Date().toISOString();
  for (let index = 0; index < descriptions.length; index += 500) {
    const rows = descriptions.slice(index, index + 500).map((item) => ({
      product_key: item.productKey,
      product: item.product,
      description: item.description || '',
      group_code: item.groupCode || null,
      updated_at: updatedAt,
    }));
    const { error } = await supabase.from('stock_product_descriptions').upsert(rows, { onConflict: 'product_key' });
    if (error) throw error;
  }

  await touchStockCatalog(updatedAt, metadata.updatedBy);
  return descriptions;
}

export async function replaceStockProductAddresses(addresses, metadata = {}) {
  if (!supabase) {
    saveLocal(ADDRESSES_STORAGE_KEY, addresses);
    const items = mergeStockAddresses(loadLocal(ITEMS_STORAGE_KEY, []), addresses);
    saveLocal(ITEMS_STORAGE_KEY, items);
    return addresses;
  }

  const batchId = crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  for (let index = 0; index < addresses.length; index += 500) {
    const rows = addresses.slice(index, index + 500).map((item) => ({
      product_key: item.productKey,
      product: item.product,
      address: item.address,
      batch_id: batchId,
      updated_at: updatedAt,
    }));
    const { error } = await supabase
      .from('stock_product_addresses')
      .upsert(rows, { onConflict: 'product_key' });
    if (error) throw error;
  }

  const { error: cleanupError } = await supabase
    .from('stock_product_addresses')
    .delete()
    .neq('batch_id', batchId);
  if (cleanupError) throw cleanupError;

  await touchStockCatalog(updatedAt, metadata.updatedBy);
  saveLocal(ADDRESSES_STORAGE_KEY, addresses);
  return addresses;
}

export function subscribeToStockTransferChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:stock-transfers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_catalog' }, (payload) => {
      onChange({
        collection: 'catalog',
        eventType: payload.eventType,
        item: payload.new?.id ? toCatalog(payload.new) : null,
      });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transfer_lists' }, (payload) => {
      onChange({
        collection: 'lists',
        eventType: payload.eventType,
        item: payload.new?.id ? toTransferList(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transfer_candidates' }, (payload) => {
      onChange({
        collection: 'candidates',
        eventType: payload.eventType,
        item: payload.new?.product_key ? toCandidate(payload.new) : null,
        oldId: payload.old?.product_key,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
