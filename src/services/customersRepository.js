import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.customers.v1';

function loadLocalCustomers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalCustomers(customers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortCustomers(customers)));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

export function sortCustomers(customers) {
  return [...customers].sort((a, b) => (a.clientName || '').localeCompare(b.clientName || '', 'pt-BR'));
}

export function cacheCustomers(customers) {
  saveLocalCustomers(customers);
}

function toCustomer(row) {
  return {
    id: row.id,
    clientCode: row.client_code || '',
    clientName: row.client_name || '',
    seller: row.seller || '',
    document: row.document || '',
    phone: row.phone || '',
    fiscalAddress: row.fiscal_address || '',
    deliveryAddress: row.delivery_address || '',
    state: row.state || '',
    email: row.email || '',
    zipCode: row.zip_code || '',
    purchases: Array.isArray(row.purchases) ? row.purchases : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(customer) {
  const row = {};

  if ('id' in customer) row.id = customer.id;
  if ('clientCode' in customer) row.client_code = customer.clientCode || '';
  if ('clientName' in customer) row.client_name = customer.clientName || '';
  if ('seller' in customer) row.seller = customer.seller || '';
  if ('document' in customer) row.document = customer.document || '';
  if ('phone' in customer) row.phone = customer.phone || '';
  if ('fiscalAddress' in customer) row.fiscal_address = customer.fiscalAddress || '';
  if ('deliveryAddress' in customer) row.delivery_address = customer.deliveryAddress || '';
  if ('state' in customer) row.state = customer.state || '';
  if ('email' in customer) row.email = customer.email || '';
  if ('zipCode' in customer) row.zip_code = customer.zipCode || '';
  if ('purchases' in customer) row.purchases = customer.purchases || [];
  if ('createdAt' in customer) row.created_at = customer.createdAt;
  if ('updatedAt' in customer) row.updated_at = customer.updatedAt;

  return row;
}

function mergePurchases(existingPurchases = [], nextPurchases = []) {
  const byId = new Map();
  [...existingPurchases, ...nextPurchases].forEach((purchase) => {
    if (!purchase?.id) return;
    byId.set(purchase.id, { ...byId.get(purchase.id), ...purchase });
  });

  return [...byId.values()].sort((a, b) => new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0));
}

function mergeCustomerRecords(existing, next) {
  if (!existing) return next;

  return {
    ...existing,
    ...next,
    clientCode: next.clientCode || existing.clientCode || '',
    clientName: next.clientName || existing.clientName || '',
    seller: next.seller || existing.seller || '',
    document: next.document || existing.document || '',
    phone: next.phone || existing.phone || '',
    fiscalAddress: next.fiscalAddress || existing.fiscalAddress || '',
    deliveryAddress: next.deliveryAddress || existing.deliveryAddress || '',
    state: next.state || existing.state || '',
    email: next.email || existing.email || '',
    zipCode: next.zipCode || existing.zipCode || '',
    purchases: mergePurchases(existing.purchases, next.purchases),
    createdAt: existing.createdAt || next.createdAt,
    updatedAt: next.updatedAt || existing.updatedAt,
  };
}

function dedupeCustomersById(customers) {
  const byId = new Map();

  customers.forEach((customer) => {
    if (!customer?.id) return;
    byId.set(customer.id, mergeCustomerRecords(byId.get(customer.id), customer));
  });

  return sortCustomers([...byId.values()]);
}

export async function loadCustomers() {
  if (!supabase) {
    return { customers: sortCustomers(loadLocalCustomers()), mode: 'local' };
  }

  const { data, error } = await supabase.from('customers').select('*').order('client_name', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return { customers: sortCustomers(loadLocalCustomers()), mode: 'local' };
    }

    throw error;
  }

  const customers = sortCustomers(data.map(toCustomer));
  saveLocalCustomers(customers);
  return { customers, mode: 'supabase' };
}

export async function createCustomer(customer) {
  if (!supabase) {
    const customers = sortCustomers([...loadLocalCustomers(), customer]);
    saveLocalCustomers(customers);
    return customer;
  }

  const { data, error } = await supabase.from('customers').insert(toRow(customer)).select('*').single();
  if (error) throw error;

  return toCustomer(data);
}

export async function updateCustomer(id, changes) {
  const nextChanges = { ...changes, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const customers = loadLocalCustomers().map((customer) => (customer.id === id ? { ...customer, ...nextChanges } : customer));
    saveLocalCustomers(customers);
    return customers.find((customer) => customer.id === id);
  }

  const { data, error } = await supabase.from('customers').update(toRow(nextChanges)).eq('id', id).select('*').single();
  if (error) throw error;

  return toCustomer(data);
}

export async function deleteCustomer(id) {
  if (!supabase) {
    saveLocalCustomers(loadLocalCustomers().filter((customer) => customer.id !== id));
    return;
  }

  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertCustomers(nextCustomers) {
  const dedupedCustomers = dedupeCustomersById(nextCustomers);

  if (!supabase) {
    const existing = loadLocalCustomers();
    const existingById = new Map(existing.map((customer) => [customer.id, customer]));
    dedupedCustomers.forEach((customer) => existingById.set(customer.id, mergeCustomerRecords(existingById.get(customer.id), customer)));
    const customers = sortCustomers([...existingById.values()]);
    saveLocalCustomers(customers);
    return customers;
  }

  const { data, error } = await supabase
    .from('customers')
    .upsert(dedupedCustomers.map(toRow), { onConflict: 'id' })
    .select('*');
  if (error) throw error;

  return sortCustomers(data.map(toCustomer));
}

export function subscribeToCustomerChanges(onChange) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('public:customers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
      onChange({
        eventType: payload.eventType,
        customer: payload.new?.id ? toCustomer(payload.new) : null,
        oldId: payload.old?.id,
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
