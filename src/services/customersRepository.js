import { supabase } from './supabaseClient';

const STORAGE_KEY = 'followuper.customers.v1';
const CUSTOMER_SELECT_BATCH_SIZE = 1000;
const CUSTOMER_UPSERT_BATCH_SIZE = 500;

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
    billingEmail: row.billing_email || '',
    city: row.city || '',
    cnpj: row.cnpj || '',
    commercialEmail: row.commercial_email || '',
    complement: row.complement || '',
    cpf: row.cpf || '',
    ddd: row.ddd || '',
    document: row.document || '',
    email: row.email || '',
    fiscalAddress: row.fiscal_address || '',
    invoiceEmail: row.invoice_email || '',
    lastPurchaseAt: row.last_purchase_at || '',
    mobile: row.mobile || '',
    neighborhood: row.neighborhood || '',
    personType: row.person_type || '',
    phone: row.phone || '',
    phoneNumber: row.phone_number || '',
    purchaseCount: row.purchase_count || '',
    seller: row.seller || '',
    state: row.state || '',
    stateRegistration: row.state_registration || '',
    storeCode: row.store_code || '',
    tradeName: row.trade_name || '',
    deliveryAddress: row.delivery_address || '',
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
  if ('billingEmail' in customer) row.billing_email = customer.billingEmail || '';
  if ('city' in customer) row.city = customer.city || '';
  if ('cnpj' in customer) row.cnpj = customer.cnpj || '';
  if ('commercialEmail' in customer) row.commercial_email = customer.commercialEmail || '';
  if ('complement' in customer) row.complement = customer.complement || '';
  if ('cpf' in customer) row.cpf = customer.cpf || '';
  if ('ddd' in customer) row.ddd = customer.ddd || '';
  if ('document' in customer) row.document = customer.document || '';
  if ('email' in customer) row.email = customer.email || '';
  if ('fiscalAddress' in customer) row.fiscal_address = customer.fiscalAddress || '';
  if ('invoiceEmail' in customer) row.invoice_email = customer.invoiceEmail || '';
  if ('lastPurchaseAt' in customer) row.last_purchase_at = customer.lastPurchaseAt || null;
  if ('mobile' in customer) row.mobile = customer.mobile || '';
  if ('neighborhood' in customer) row.neighborhood = customer.neighborhood || '';
  if ('personType' in customer) row.person_type = customer.personType || '';
  if ('phone' in customer) row.phone = customer.phone || '';
  if ('phoneNumber' in customer) row.phone_number = customer.phoneNumber || '';
  if ('purchaseCount' in customer) row.purchase_count = customer.purchaseCount || '';
  if ('seller' in customer) row.seller = customer.seller || '';
  if ('state' in customer) row.state = customer.state || '';
  if ('stateRegistration' in customer) row.state_registration = customer.stateRegistration || '';
  if ('storeCode' in customer) row.store_code = customer.storeCode || '';
  if ('tradeName' in customer) row.trade_name = customer.tradeName || '';
  if ('deliveryAddress' in customer) row.delivery_address = customer.deliveryAddress || '';
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
    billingEmail: next.billingEmail || existing.billingEmail || '',
    city: next.city || existing.city || '',
    cnpj: next.cnpj || existing.cnpj || '',
    commercialEmail: next.commercialEmail || existing.commercialEmail || '',
    complement: next.complement || existing.complement || '',
    cpf: next.cpf || existing.cpf || '',
    ddd: next.ddd || existing.ddd || '',
    document: next.document || existing.document || '',
    email: next.email || existing.email || '',
    fiscalAddress: next.fiscalAddress || existing.fiscalAddress || '',
    invoiceEmail: next.invoiceEmail || existing.invoiceEmail || '',
    lastPurchaseAt: next.lastPurchaseAt || existing.lastPurchaseAt || '',
    mobile: next.mobile || existing.mobile || '',
    neighborhood: next.neighborhood || existing.neighborhood || '',
    personType: next.personType || existing.personType || '',
    phone: next.phone || existing.phone || '',
    phoneNumber: next.phoneNumber || existing.phoneNumber || '',
    purchaseCount: next.purchaseCount || existing.purchaseCount || '',
    seller: next.seller || existing.seller || '',
    state: next.state || existing.state || '',
    stateRegistration: next.stateRegistration || existing.stateRegistration || '',
    storeCode: next.storeCode || existing.storeCode || '',
    tradeName: next.tradeName || existing.tradeName || '',
    deliveryAddress: next.deliveryAddress || existing.deliveryAddress || '',
    zipCode: next.zipCode || existing.zipCode || '',
    purchases: mergePurchases(existing.purchases, next.purchases),
    createdAt: existing.createdAt || next.createdAt,
    updatedAt: next.updatedAt || existing.updatedAt,
  };
}

function normalizeIdentityValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function getCustomerIdentityKey(customer) {
  const clientCode = normalizeIdentityValue(customer.clientCode);
  const storeCode = normalizeIdentityValue(customer.storeCode);
  if (clientCode && storeCode) return `code-store:${clientCode}:${storeCode}`;

  const document = String(customer.cnpj || customer.cpf || customer.document || '').replace(/\D/g, '');
  if (document) return `document:${document}`;

  const clientName = normalizeIdentityValue(customer.clientName);
  return clientName ? `name:${clientName}` : '';
}

function dedupeCustomersById(customers) {
  const byId = new Map();

  customers.forEach((customer) => {
    if (!customer?.id) return;
    byId.set(customer.id, mergeCustomerRecords(byId.get(customer.id), customer));
  });

  return sortCustomers([...byId.values()]);
}

function dedupeCustomersByIdentity(customers) {
  const byKey = new Map();

  customers.forEach((customer) => {
    if (!customer?.id) return;
    const key = getCustomerIdentityKey(customer) || `id:${customer.id}`;
    byKey.set(key, mergeCustomerRecords(byKey.get(key), customer));
  });

  return sortCustomers([...byKey.values()]);
}

function getCustomerCompletenessScore(customer) {
  const values = [
    customer.clientCode,
    customer.storeCode,
    customer.clientName,
    customer.tradeName,
    customer.document,
    customer.cpf,
    customer.cnpj,
    customer.personType,
    customer.phone,
    customer.phoneNumber,
    customer.mobile,
    customer.fiscalAddress,
    customer.city,
    customer.neighborhood,
    customer.state,
    customer.zipCode,
    customer.email,
    customer.commercialEmail,
    customer.invoiceEmail,
    customer.billingEmail,
    customer.lastPurchaseAt,
    customer.purchaseCount,
  ];

  return values.filter(Boolean).length + (customer.purchases || []).length;
}

function getDuplicateCustomerGroups(customers) {
  const byKey = new Map();

  customers.forEach((customer) => {
    const key = getCustomerIdentityKey(customer);
    if (!key) return;
    byKey.set(key, [...(byKey.get(key) || []), customer]);
  });

  return [...byKey.values()].filter((group) => group.length > 1);
}

function chooseDuplicateKeeper(group) {
  return [...group].sort((a, b) => {
    const scoreDifference = getCustomerCompletenessScore(b) - getCustomerCompletenessScore(a);
    if (scoreDifference !== 0) return scoreDifference;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  })[0];
}

function filterNewCustomers(nextCustomers, existingCustomers) {
  const existingKeys = new Set(existingCustomers.map(getCustomerIdentityKey).filter(Boolean));
  const nextKeys = new Set();
  const newCustomers = [];
  let skippedCount = 0;

  dedupeCustomersByIdentity(nextCustomers).forEach((customer) => {
    const key = getCustomerIdentityKey(customer);
    if (key && (existingKeys.has(key) || nextKeys.has(key))) {
      skippedCount += 1;
      return;
    }
    if (key) nextKeys.add(key);
    newCustomers.push(customer);
  });

  return { newCustomers, skippedCount };
}

async function fetchAllCustomerRows() {
  const rows = [];

  for (let start = 0; ; start += CUSTOMER_SELECT_BATCH_SIZE) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('client_name', { ascending: true })
      .range(start, start + CUSTOMER_SELECT_BATCH_SIZE - 1);

    if (error) return { data: rows, error };

    rows.push(...(data || []));
    if (!data || data.length < CUSTOMER_SELECT_BATCH_SIZE) return { data: rows, error: null };
  }
}

export async function loadCustomers() {
  if (!supabase) {
    return { customers: sortCustomers(loadLocalCustomers()), mode: 'local' };
  }

  const { data, error } = await fetchAllCustomerRows();

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

export async function removeDuplicateCustomers(existingCustomers = null) {
  const sourceCustomers = existingCustomers || (supabase ? (await fetchAllCustomerRows()).data.map(toCustomer) : loadLocalCustomers());
  const duplicateGroups = getDuplicateCustomerGroups(sourceCustomers);

  if (duplicateGroups.length === 0) {
    return { customers: sortCustomers(sourceCustomers), removedCount: 0 };
  }

  const duplicateIds = [];

  duplicateGroups.forEach((group) => {
    const keeper = chooseDuplicateKeeper(group);
    duplicateIds.push(...group.filter((customer) => customer.id !== keeper.id).map((customer) => customer.id));
  });

  if (!supabase) {
    const duplicateIdSet = new Set(duplicateIds);
    const customers = sortCustomers(sourceCustomers.filter((customer) => !duplicateIdSet.has(customer.id)));
    saveLocalCustomers(customers);
    return { customers, removedCount: duplicateIds.length };
  }

  for (let index = 0; index < duplicateIds.length; index += CUSTOMER_UPSERT_BATCH_SIZE) {
    const batch = duplicateIds.slice(index, index + CUSTOMER_UPSERT_BATCH_SIZE);
    const { error } = await supabase.from('customers').delete().in('id', batch);
    if (error) throw error;
  }

  const duplicateIdSet = new Set(duplicateIds);
  const customers = sortCustomers(sourceCustomers.filter((customer) => !duplicateIdSet.has(customer.id)));
  saveLocalCustomers(customers);
  return { customers, removedCount: duplicateIds.length };
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

  const savedRows = [];
  for (let index = 0; index < dedupedCustomers.length; index += CUSTOMER_UPSERT_BATCH_SIZE) {
    const batch = dedupedCustomers.slice(index, index + CUSTOMER_UPSERT_BATCH_SIZE);
    const { data, error } = await supabase
      .from('customers')
      .upsert(batch.map(toRow), { onConflict: 'id' })
      .select('*');
    if (error) throw error;
    savedRows.push(...(data || []));
  }

  return sortCustomers(savedRows.map(toCustomer));
}

export async function insertNewCustomers(nextCustomers) {
  if (!supabase) {
    const existing = loadLocalCustomers();
    const { newCustomers, skippedCount } = filterNewCustomers(nextCustomers, existing);
    const customers = sortCustomers([...existing, ...newCustomers]);
    saveLocalCustomers(customers);
    return { customers: newCustomers, skippedCount };
  }

  const { data, error } = await fetchAllCustomerRows();
  if (error) throw error;

  const existingCustomers = data.map(toCustomer);
  const { newCustomers, skippedCount } = filterNewCustomers(nextCustomers, existingCustomers);
  const savedRows = [];

  for (let index = 0; index < newCustomers.length; index += CUSTOMER_UPSERT_BATCH_SIZE) {
    const batch = newCustomers.slice(index, index + CUSTOMER_UPSERT_BATCH_SIZE);
    if (batch.length === 0) continue;
    const { data: insertedRows, error: insertError } = await supabase
      .from('customers')
      .insert(batch.map(toRow))
      .select('*');
    if (insertError) throw insertError;
    savedRows.push(...(insertedRows || []));
  }

  return { customers: sortCustomers(savedRows.map(toCustomer)), skippedCount };
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
