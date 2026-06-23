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

export async function upsertCustomers(nextCustomers) {
  if (!supabase) {
    const existing = loadLocalCustomers();
    const existingById = new Map(existing.map((customer) => [customer.id, customer]));
    nextCustomers.forEach((customer) => existingById.set(customer.id, customer));
    const customers = sortCustomers([...existingById.values()]);
    saveLocalCustomers(customers);
    return customers;
  }

  const { data, error } = await supabase
    .from('customers')
    .upsert(nextCustomers.map(toRow), { onConflict: 'id' })
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
