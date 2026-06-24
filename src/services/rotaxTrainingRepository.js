import { supabase } from './supabaseClient';

const BLOCKS_STORAGE_KEY = 'followuper.rotaxTrainingBlocks.v1';
const SESSIONS_STORAGE_KEY = 'followuper.rotaxTrainingSessions.v1';
const STUDENTS_STORAGE_KEY = 'followuper.rotaxTrainingStudents.v1';
const CONTACTS_STORAGE_KEY = 'followuper.rotaxTrainingContacts.v1';

function loadLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function saveLocal(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('does not exist');
}

export function sortRotaxBlocks(blocks) {
  return [...blocks].sort((a, b) => (a.position || 0) - (b.position || 0));
}

export function sortRotaxSessions(sessions) {
  return [...sessions].sort((a, b) => new Date(a.trainingDate) - new Date(b.trainingDate));
}

export function sortRotaxStudents(students) {
  return [...students].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function sortRotaxContacts(contacts) {
  return [...contacts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function cacheRotaxBlocks(blocks) {
  saveLocal(BLOCKS_STORAGE_KEY, sortRotaxBlocks(blocks));
}

export function cacheRotaxSessions(sessions) {
  saveLocal(SESSIONS_STORAGE_KEY, sortRotaxSessions(sessions));
}

export function cacheRotaxStudents(students) {
  saveLocal(STUDENTS_STORAGE_KEY, sortRotaxStudents(students));
}

export function cacheRotaxContacts(contacts) {
  saveLocal(CONTACTS_STORAGE_KEY, sortRotaxContacts(contacts));
}

function toBlock(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title || '',
    body: row.body || '',
    isOpen: row.is_open !== false,
    position: row.position || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBlockRow(block) {
  const row = {};
  if ('id' in block) row.id = block.id;
  if ('category' in block) row.category = block.category;
  if ('title' in block) row.title = block.title || '';
  if ('body' in block) row.body = block.body || '';
  if ('isOpen' in block) row.is_open = block.isOpen !== false;
  if ('position' in block) row.position = block.position || 0;
  if ('createdAt' in block) row.created_at = block.createdAt;
  if ('updatedAt' in block) row.updated_at = block.updatedAt;
  return row;
}

function toSession(row) {
  return {
    id: row.id,
    trainingDate: row.training_date,
    archivedAt: row.archived_at || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSessionRow(session) {
  const row = {};
  if ('id' in session) row.id = session.id;
  if ('trainingDate' in session) row.training_date = session.trainingDate;
  if ('archivedAt' in session) row.archived_at = session.archivedAt || null;
  if ('createdAt' in session) row.created_at = session.createdAt;
  if ('updatedAt' in session) row.updated_at = session.updatedAt;
  return row;
}

function toStudent(row) {
  return {
    id: row.id,
    trainingSessionId: row.training_session_id,
    name: row.name || '',
    email: row.email || '',
    trainingTypes: row.training_types || [],
    contractDone: Boolean(row.contract_done),
    contractSigned: Boolean(row.contract_signed),
    quoteNumber: row.quote_number || '',
    orderNumber: row.order_number || '',
    address: row.address || '',
    phone: row.phone || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStudentRow(student) {
  const row = {};
  if ('id' in student) row.id = student.id;
  if ('trainingSessionId' in student) row.training_session_id = student.trainingSessionId || null;
  if ('name' in student) row.name = student.name;
  if ('email' in student) row.email = student.email || null;
  if ('trainingTypes' in student) row.training_types = student.trainingTypes || [];
  if ('contractDone' in student) row.contract_done = student.contractDone === true;
  if ('contractSigned' in student) row.contract_signed = student.contractSigned === true;
  if ('quoteNumber' in student) row.quote_number = student.quoteNumber || null;
  if ('orderNumber' in student) row.order_number = student.orderNumber || null;
  if ('address' in student) row.address = student.address || null;
  if ('phone' in student) row.phone = student.phone || null;
  if ('notes' in student) row.notes = student.notes || null;
  if ('createdAt' in student) row.created_at = student.createdAt;
  if ('updatedAt' in student) row.updated_at = student.updatedAt;
  return row;
}

function toContact(row) {
  return {
    id: row.id,
    name: row.name || '',
    contact: row.contact || '',
    status: row.status || 'Em contato',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toContactRow(contact) {
  const row = {};
  if ('id' in contact) row.id = contact.id;
  if ('name' in contact) row.name = contact.name;
  if ('contact' in contact) row.contact = contact.contact || null;
  if ('status' in contact) row.status = contact.status || 'Em contato';
  if ('createdAt' in contact) row.created_at = contact.createdAt;
  if ('updatedAt' in contact) row.updated_at = contact.updatedAt;
  return row;
}

export async function loadRotaxTrainingData() {
  if (!supabase) {
    return {
      blocks: sortRotaxBlocks(loadLocal(BLOCKS_STORAGE_KEY)),
      sessions: sortRotaxSessions(loadLocal(SESSIONS_STORAGE_KEY)),
      students: sortRotaxStudents(loadLocal(STUDENTS_STORAGE_KEY)),
      contacts: sortRotaxContacts(loadLocal(CONTACTS_STORAGE_KEY)),
      mode: 'local',
    };
  }

  const [blocksResult, sessionsResult, studentsResult, contactsResult] = await Promise.all([
    supabase.from('rotax_training_blocks').select('*').order('position', { ascending: true }),
    supabase.from('rotax_training_sessions').select('*').order('training_date', { ascending: true }),
    supabase.from('rotax_training_students').select('*').order('created_at', { ascending: false }),
    supabase.from('rotax_training_contacts').select('*').order('created_at', { ascending: false }),
  ]);

  const errors = [blocksResult.error, sessionsResult.error, studentsResult.error, contactsResult.error].filter(Boolean);
  if (errors.length) {
    if (errors.some(isMissingTableError)) {
      return {
        blocks: sortRotaxBlocks(loadLocal(BLOCKS_STORAGE_KEY)),
        sessions: sortRotaxSessions(loadLocal(SESSIONS_STORAGE_KEY)),
        students: sortRotaxStudents(loadLocal(STUDENTS_STORAGE_KEY)),
        contacts: sortRotaxContacts(loadLocal(CONTACTS_STORAGE_KEY)),
        mode: 'local',
      };
    }

    throw errors[0];
  }

  const blocks = sortRotaxBlocks(blocksResult.data.map(toBlock));
  const sessions = sortRotaxSessions(sessionsResult.data.map(toSession));
  const students = sortRotaxStudents(studentsResult.data.map(toStudent));
  const contacts = sortRotaxContacts(contactsResult.data.map(toContact));

  cacheRotaxBlocks(blocks);
  cacheRotaxSessions(sessions);
  cacheRotaxStudents(students);
  cacheRotaxContacts(contacts);

  return { blocks, sessions, students, contacts, mode: 'supabase' };
}

async function createItem(key, table, mapper, sorter, item) {
  if (!supabase) {
    const items = sorter([item, ...loadLocal(key)]);
    saveLocal(key, items);
    return item;
  }

  const { data, error } = await supabase.from(table).insert(mapper(item)).select('*').single();
  if (error) throw error;
  return data;
}

async function updateItem(key, table, mapper, converter, sorter, id, changes) {
  const nextChanges = { ...changes, updatedAt: new Date().toISOString() };

  if (!supabase) {
    const items = loadLocal(key).map((item) => (item.id === id ? { ...item, ...nextChanges } : item));
    saveLocal(key, sorter(items));
    return items.find((item) => item.id === id);
  }

  const { data, error } = await supabase.from(table).update(mapper(nextChanges)).eq('id', id).select('*').single();
  if (error) throw error;
  return converter(data);
}

async function deleteItem(key, table, id) {
  if (!supabase) {
    saveLocal(key, loadLocal(key).filter((item) => item.id !== id));
    return;
  }

  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function createRotaxBlock(block) {
  const row = await createItem(BLOCKS_STORAGE_KEY, 'rotax_training_blocks', toBlockRow, sortRotaxBlocks, block);
  return supabase ? toBlock(row) : row;
}

export async function updateRotaxBlock(id, changes) {
  return updateItem(BLOCKS_STORAGE_KEY, 'rotax_training_blocks', toBlockRow, toBlock, sortRotaxBlocks, id, changes);
}

export async function deleteRotaxBlock(id) {
  return deleteItem(BLOCKS_STORAGE_KEY, 'rotax_training_blocks', id);
}

export async function createRotaxSession(session) {
  const row = await createItem(SESSIONS_STORAGE_KEY, 'rotax_training_sessions', toSessionRow, sortRotaxSessions, session);
  return supabase ? toSession(row) : row;
}

export async function updateRotaxSession(id, changes) {
  return updateItem(SESSIONS_STORAGE_KEY, 'rotax_training_sessions', toSessionRow, toSession, sortRotaxSessions, id, changes);
}

export async function deleteRotaxSession(id) {
  return deleteItem(SESSIONS_STORAGE_KEY, 'rotax_training_sessions', id);
}

export async function createRotaxStudent(student) {
  const row = await createItem(STUDENTS_STORAGE_KEY, 'rotax_training_students', toStudentRow, sortRotaxStudents, student);
  return supabase ? toStudent(row) : row;
}

export async function updateRotaxStudent(id, changes) {
  return updateItem(STUDENTS_STORAGE_KEY, 'rotax_training_students', toStudentRow, toStudent, sortRotaxStudents, id, changes);
}

export async function deleteRotaxStudent(id) {
  return deleteItem(STUDENTS_STORAGE_KEY, 'rotax_training_students', id);
}

export async function createRotaxContact(contact) {
  const row = await createItem(CONTACTS_STORAGE_KEY, 'rotax_training_contacts', toContactRow, sortRotaxContacts, contact);
  return supabase ? toContact(row) : row;
}

export async function updateRotaxContact(id, changes) {
  return updateItem(CONTACTS_STORAGE_KEY, 'rotax_training_contacts', toContactRow, toContact, sortRotaxContacts, id, changes);
}

export async function deleteRotaxContact(id) {
  return deleteItem(CONTACTS_STORAGE_KEY, 'rotax_training_contacts', id);
}

export function subscribeToRotaxTrainingChanges(onChange) {
  if (!supabase) return () => {};

  const tables = [
    ['rotax_training_blocks', 'block', toBlock],
    ['rotax_training_sessions', 'session', toSession],
    ['rotax_training_students', 'student', toStudent],
    ['rotax_training_contacts', 'contact', toContact],
  ];

  const channel = supabase.channel('public:rotax_training');
  tables.forEach(([table, key, converter]) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      onChange({
        eventType: payload.eventType,
        key,
        item: payload.new?.id ? converter(payload.new) : null,
        oldId: payload.old?.id,
      });
    });
  });

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
