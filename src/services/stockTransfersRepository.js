import { supabase } from './supabaseClient';

const ITEMS_STORAGE_KEY = 'followuper.stockItems.v1';
const CATALOG_STORAGE_KEY = 'followuper.stockCatalog.v1';
const LISTS_STORAGE_KEY = 'followuper.stockTransferLists.v1';

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
    quantity: Number(row.quantity || 0),
    groupCode: row.group_code || '',
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

export async function loadStockTransferData() {
  if (!supabase) {
    return {
      catalog: loadLocal(CATALOG_STORAGE_KEY, null),
      items: loadLocal(ITEMS_STORAGE_KEY, []),
      lists: loadLocal(LISTS_STORAGE_KEY, []),
      mode: 'local',
    };
  }

  const [itemsResult, catalogResult, listsResult] = await Promise.all([
    supabase.from('stock_items').select('*').order('product', { ascending: true }),
    supabase.from('stock_catalog').select('*').eq('id', 'current').maybeSingle(),
    supabase.from('stock_transfer_lists').select('*').order('created_at', { ascending: false }),
  ]);

  const firstError = [itemsResult.error, catalogResult.error, listsResult.error].find(Boolean);
  if (firstError) {
    if (isMissingTableError(firstError)) {
      return {
        catalog: loadLocal(CATALOG_STORAGE_KEY, null),
        items: loadLocal(ITEMS_STORAGE_KEY, []),
        lists: loadLocal(LISTS_STORAGE_KEY, []),
        mode: 'local',
      };
    }
    throw firstError;
  }

  const items = itemsResult.data.map(toStockItem);
  const catalog = toCatalog(catalogResult.data);
  const lists = listsResult.data.map(toTransferList);
  saveLocal(ITEMS_STORAGE_KEY, items);
  saveLocal(CATALOG_STORAGE_KEY, catalog);
  saveLocal(LISTS_STORAGE_KEY, lists);
  return { catalog, items, lists, mode: 'supabase' };
}

export async function loadStockItems() {
  if (!supabase) return loadLocal(ITEMS_STORAGE_KEY, []);
  const { data, error } = await supabase.from('stock_items').select('*').order('product', { ascending: true });
  if (error) throw error;
  const items = data.map(toStockItem);
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
    saveLocal(ITEMS_STORAGE_KEY, items);
    saveLocal(CATALOG_STORAGE_KEY, catalog);
    return catalog;
  }

  for (let index = 0; index < items.length; index += 500) {
    const rows = items.slice(index, index + 500).map((item) => ({
      product_key: item.productKey,
      product: item.product,
      quantity: Number(item.quantity || 0),
      group_code: item.groupCode || null,
      batch_id: batchId,
      updated_at: updatedAt,
    }));
    const { error } = await supabase.from('stock_items').upsert(rows, { onConflict: 'product_key' });
    if (error) throw error;
  }

  const { error: cleanupError } = await supabase.from('stock_items').delete().neq('batch_id', batchId);
  if (cleanupError) throw cleanupError;

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
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
