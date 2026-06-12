import {
  AlertTriangle,
  Bell,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Database,
  FileText,
  GraduationCap,
  Heading1,
  Image as ImageIcon,
  List,
  Link as LinkIcon,
  LogIn,
  LogOut,
  Menu as MenuIcon,
  Minus,
  PackageSearch,
  PanelLeft,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Table2,
  Trash2,
  Truck,
  Type,
  Upload,
  X,
} from 'lucide-react';
import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { readSheet } from 'read-excel-file/browser';
import { getCurrentSession, onAuthChange, signIn, signOut } from './services/authRepository';
import {
  cacheQuotes,
  createQuote,
  deleteQuote,
  loadQuotes as loadStoredQuotes,
  persistenceMode,
  subscribeToQuoteChanges,
  updateQuote,
} from './services/quotesRepository';
import { isSupabaseConfigured } from './services/supabaseClient';
import { isCorreiosTrackingCandidate, requestCorreiosTrackingUpdate } from './services/correiosTrackingService';
import {
  cacheTrackingEntries,
  createTrackingEntry,
  deleteTrackingEntry,
  loadTrackingEntries,
  subscribeToTrackingChanges,
  updateTrackingEntry,
} from './services/trackingRepository';
import {
  cacheInfoBlocks,
  createInfoBlock,
  deleteInfoBlock,
  loadInfoBlocks,
  sortInfoBlocks,
  subscribeToInfoBlockChanges,
  updateInfoBlock,
} from './services/infoBlocksRepository';
import {
  cacheRotaxBlocks,
  cacheRotaxContacts,
  cacheRotaxSessions,
  cacheRotaxStudents,
  createRotaxBlock,
  createRotaxContact,
  createRotaxSession,
  createRotaxStudent,
  deleteRotaxBlock,
  deleteRotaxContact,
  deleteRotaxStudent,
  loadRotaxTrainingData,
  sortRotaxBlocks,
  sortRotaxContacts,
  sortRotaxSessions,
  sortRotaxStudents,
  subscribeToRotaxTrainingChanges,
  updateRotaxBlock,
  updateRotaxContact,
  updateRotaxStudent,
} from './services/rotaxTrainingRepository';

const sellers = ['Elton', 'Bruno', 'Stephanie'];
const LAYOUT_STORAGE_KEY = 'followuper.layoutMode.v1';

const statuses = [
  { value: 'sem-resposta', label: 'Sem resposta', color: 'yellow' },
  { value: 'negociacao', label: 'Em negociação', color: 'orange' },
  { value: 'fechada', label: 'Fechada', color: 'red' },
];

const tabs = [
  { value: 'abertas', label: 'Cotações em aberto' },
  { value: 'followup', label: 'Cotações para Follow-up' },
  { value: 'fechadas', label: 'Cotações finalizadas' },
  { value: 'arquivadas', label: 'Arquivadas' },
  { value: 'todas', label: 'Visualizar todas' },
];

const simpleTabs = [
  { value: 'abertas', label: 'Cotações em aberto' },
  { value: 'fechadas', label: 'Cotações finalizadas' },
  { value: 'todas', label: 'Visualizar todas' },
  { value: 'arquivadas', label: 'Arquivadas' },
  { value: 'followup', label: 'Cotações para Follow-up' },
];

const trackingTabs = [
  { value: 'Em andamento', label: 'Em andamento' },
  { value: 'Finalizado', label: 'Finalizado' },
];

const rotaxInfoCategories = [
  { value: 'internal', label: 'Informações Internas' },
  { value: 'explanation', label: 'Explicativo do treinamento' },
  { value: 'indications', label: 'Indicações' },
];

const rotaxTrainingTypes = [
  'Service',
  'Maintenance',
  'Heavy',
  'Renew Service',
  'Renew maintenance',
  'Renew 2 tempos',
  'Is Installation',
  'Is Troubleshooting',
];

const rotaxTypeColorClass = {
  Service: 'green',
  Maintenance: 'blue',
  Heavy: 'red',
  'Renew Service': 'yellow',
  'Renew maintenance': 'purple',
  'Renew 2 tempos': 'pink',
  'Is Installation': 'teal',
  'Is Troubleshooting': 'orange',
};

const infoBlockTypes = [
  { value: 'text', label: 'Texto', icon: Type, placeholder: 'Digite algo...' },
  { value: 'title', label: 'Título', icon: Heading1, placeholder: 'Título' },
  { value: 'bullet', label: 'Lista com marcadores', icon: List, placeholder: 'Item da lista' },
  { value: 'toggle', label: 'Lista de alternantes', icon: ChevronRight, placeholder: 'Título do alternante' },
  { value: 'divider', label: 'Barra de quebra de página', icon: Minus, placeholder: '' },
  { value: 'image', label: 'Importar imagem', icon: ImageIcon, placeholder: '' },
  { value: 'table', label: 'Tabela', icon: Table2, placeholder: '' },
  { value: 'link', label: 'Link', icon: LinkIcon, placeholder: 'https://exemplo.com' },
  { value: 'sidebar', label: 'Barra lateral', icon: PanelLeft, placeholder: 'Título da barra lateral' },
];

const deliverySituations = [
  'Entregue',
  'Disponível para Retirada',
  'Não encontrado na Base dados',
  'Manifestação',
  'NÃO ENTREGUE',
  'Em correção de rota',
  'Correio não atendido',
  'Em transferencia',
  'Preparando para entrega',
  'saiu para entrega',
  'Postado após limite de horário',
  'etiqueta',
];

const situationColorClass = {
  Entregue: 'green',
  'Disponível para Retirada': 'green',
  'Não encontrado na Base dados': 'red',
  Manifestação: 'red',
  'NÃO ENTREGUE': 'red',
  'Em correção de rota': 'purple',
  'Correio não atendido': 'purple',
  'Em transferencia': 'yellow',
  'Preparando para entrega': 'yellow',
  'saiu para entrega': 'pink',
  'Postado após limite de horário': 'blue',
  etiqueta: 'blue',
};

const initialCloseDetails = {
  orderNumber: '',
  agreedPaymentTerms: '',
  carrier: '',
  totalValue: '',
  phone: '',
  notes: '',
};

const initialForm = {
  quoteNumber: '',
  clientName: '',
  phone: '',
  quoteValue: '',
  paymentTerms: '',
  quoteDate: getTodayInputValue(),
  seller: 'Elton',
  notes: '',
  isInterest: false,
  followUpAmount: 1,
  followUpUnit: 'days',
  followUpUsesTime: false,
};

const initialGrandpaForm = {
  quoteNumber: '',
  clientName: '',
  phone: '',
  paymentTerms: '',
};

const initialQuoteEditForm = {
  quoteNumber: '',
  clientName: '',
  phone: '',
  quoteValue: '',
  paymentTerms: '',
  quoteDate: getTodayInputValue(),
  seller: 'Elton',
  notes: '',
  isInterest: false,
  followUpAmount: 1,
  followUpUnit: 'days',
  followUpUsesTime: false,
};

const initialTrackingForm = {
  clientName: '',
  carrier: '',
  trackingCode: '',
  invoiceNumber: '',
  deliverySituation: 'etiqueta',
  expectedDeliveryDate: '',
  notes: '',
  status: 'Em andamento',
};

const initialRotaxSessionForm = {
  trainingDate: getTodayInputValue(),
};

const initialRotaxStudentForm = {
  trainingSessionId: '',
  name: '',
  email: '',
  trainingTypes: [],
  contractDone: false,
  contractSigned: false,
  quoteNumber: '',
  orderNumber: '',
  address: '',
  phone: '',
  notes: '',
};

const initialRotaxContactForm = {
  name: '',
  contact: '',
  status: 'Em contato',
  redirectSessionId: '',
};

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getStoredLayoutMode() {
  try {
    const storedMode = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return ['simple', 'vovo', 'dashboard'].includes(storedMode) ? storedMode : 'complete';
  } catch {
    return 'complete';
  }
}

function normalizeUploadHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function normalizeUploadValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeUploadQuoteNumber(value) {
  return normalizeUploadValue(value).replace(/\.0$/, '').replace(/-\d{1,3}$/, '');
}

function normalizeUploadOrderNumber(value) {
  const normalized = normalizeUploadValue(value).replace(/\.0$/, '');
  return normalized;
}

function parseUploadCurrency(value) {
  if (typeof value === 'number') return value;
  const normalized = normalizeUploadValue(value)
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUploadCurrency(value) {
  return value.toLocaleString('pt-BR', { currency: 'BRL', minimumFractionDigits: 2, style: 'currency' });
}

function parseQuoteValue(value) {
  return parseUploadCurrency(value);
}

function getQuoteInterestStars(quote) {
  const value = parseQuoteValue(quote.quoteValue || quote.closeDetails?.totalValue);
  if (value >= 10000) return 2;
  if (value >= 5000) return 1;
  return quote.isInterest ? 1 : 0;
}

function getQuoteNumericValue(quote) {
  return parseQuoteValue(quote.quoteValue || quote.closeDetails?.totalValue);
}

function formatCurrencyValue(value) {
  return Number(value || 0).toLocaleString('pt-BR', { currency: 'BRL', minimumFractionDigits: 2, style: 'currency' });
}

function getPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function getSellerFromUploadCode(value) {
  const code = normalizeUploadValue(value).replace(/\D/g, '').padStart(6, '0');
  if (code === '000022') return 'Bruno';
  if (code === '000036') return 'Elton';
  if (code === '000063') return 'Stephanie';
  return '';
}

async function parseQuotesUploadFile(file) {
  const rows = await readSheet(file, 2);
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeUploadHeader);
    return headers.includes('numeroit') && headers.includes('vlrtotal');
  });

  if (headerIndex === -1) {
    throw new Error('Nao encontrei o cabecalho na segunda aba da planilha.');
  }

  const headers = rows[headerIndex].map(normalizeUploadHeader);
  const columnIndex = {
    quoteNumber: headers.indexOf('numeroit'),
    clientName: headers.indexOf('nome'),
    totalValue: headers.indexOf('vlrtotal'),
    seller: headers.indexOf('vendedor1'),
    orderNumber: headers.indexOf('pedidovenda'),
  };

  if (Object.values(columnIndex).some((index) => index < 0)) {
    throw new Error('A planilha precisa ter Numero It, Nome, Vlr.Total, Vendedor 1 e Pedido Venda.');
  }

  const grouped = new Map();

  for (const row of rows.slice(headerIndex + 1)) {
    const quoteNumber = normalizeUploadQuoteNumber(row[columnIndex.quoteNumber]);
    if (!quoteNumber) continue;

    const current = grouped.get(quoteNumber) || {
      quoteNumber,
      clientName: normalizeUploadValue(row[columnIndex.clientName]),
      orderNumber: '',
      seller: getSellerFromUploadCode(row[columnIndex.seller]),
      totalValue: 0,
    };

    current.clientName = current.clientName || normalizeUploadValue(row[columnIndex.clientName]);
    current.seller = current.seller || getSellerFromUploadCode(row[columnIndex.seller]);
    current.orderNumber = current.orderNumber || normalizeUploadOrderNumber(row[columnIndex.orderNumber]);
    current.totalValue = Math.round((current.totalValue + parseUploadCurrency(row[columnIndex.totalValue])) * 100) / 100;
    grouped.set(quoteNumber, current);
  }

  return [...grouped.values()].filter((item) => item.clientName && item.seller);
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + Number(days || 0));
  return date;
}

function addFollowUpTime(dateValue, amount, unit) {
  const date = new Date(dateValue);
  const numericAmount = Number(amount || 1);

  if (unit === 'minutes') date.setMinutes(date.getMinutes() + numericAmount);
  else if (unit === 'hours') date.setHours(date.getHours() + numericAmount);
  else date.setDate(date.getDate() + numericAmount);

  return date;
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(dateValue));
}

function formatDateTime(dateValue) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue));
}

function formatDateWithWeekday(dateValue) {
  if (!dateValue) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    weekday: 'long',
  }).format(new Date(`${dateValue}T12:00:00`));
}

function normalize(text) {
  return text.toString().trim().toLowerCase();
}

function normalizeFinalClientName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function isFinalClientName(value) {
  return normalizeFinalClientName(value) === 'CLIENTE FINAL';
}

function getStatusMeta(status) {
  return statuses.find((item) => item.value === status) || statuses[0];
}

function isClosed(quote) {
  return quote.status === 'fechada';
}

function isArchived(quote) {
  return Boolean(quote.archivedAt);
}

function getFollowUpDueAt(quote) {
  return addFollowUpTime(
    quote.followUpStartedAt || quote.createdAt,
    quote.followUpAmount || quote.followUpDays || 1,
    quote.followUpUnit || 'days',
  );
}

function isFollowUpDue(quote, now) {
  return !isClosed(quote) && !isArchived(quote) && getFollowUpDueAt(quote) <= now;
}

function isStatusUnchanged(quote, now) {
  const oneDayAfterCreation = addDays(quote.createdAt, 1);
  return !isClosed(quote) && quote.statusUpdatedAt === quote.createdAt && oneDayAfterCreation <= now;
}

function sortQuotes(quotes) {
  return [...quotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function sortTrackingEntries(entries) {
  return [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function syncCollection(current, eventType, item, oldId, sorter, cache) {
  let nextItems = current;

  if (eventType === 'INSERT' && item) {
    const exists = current.some((currentItem) => currentItem.id === item.id);
    nextItems = exists ? current.map((currentItem) => (currentItem.id === item.id ? item : currentItem)) : [item, ...current];
  }

  if (eventType === 'UPDATE' && item) {
    nextItems = current.map((currentItem) => (currentItem.id === item.id ? item : currentItem));
  }

  if (eventType === 'DELETE' && oldId) {
    nextItems = current.filter((currentItem) => currentItem.id !== oldId);
  }

  const sortedItems = sorter(nextItems);
  cache(sortedItems);
  return sortedItems;
}

export function App() {
  const [quotes, setQuotes] = useState([]);
  const [trackingEntries, setTrackingEntries] = useState([]);
  const [infoBlocks, setInfoBlocks] = useState([]);
  const [rotaxBlocks, setRotaxBlocks] = useState([]);
  const [rotaxSessions, setRotaxSessions] = useState([]);
  const [rotaxStudents, setRotaxStudents] = useState([]);
  const [rotaxContacts, setRotaxContacts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [activeView, setActiveView] = useState('quotes');
  const [activeTab, setActiveTab] = useState('abertas');
  const [activeTrackingTab, setActiveTrackingTab] = useState('Em andamento');
  const [activeRotaxTab, setActiveRotaxTab] = useState('students');
  const [activeRotaxSessionId, setActiveRotaxSessionId] = useState('');
  const [activeRotaxInfoCategory, setActiveRotaxInfoCategory] = useState('internal');
  const [expandedRotaxStudentIds, setExpandedRotaxStudentIds] = useState([]);
  const [layoutMode, setLayoutMode] = useState(getStoredLayoutMode);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [isUploadingQuotes, setIsUploadingQuotes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [trackingSearchTerm, setTrackingSearchTerm] = useState('');
  const [selectedSellers, setSelectedSellers] = useState([]);
  const [sortByRelevance, setSortByRelevance] = useState(false);
  const [grandpaForm, setGrandpaForm] = useState(initialGrandpaForm);
  const [grandpaErrors, setGrandpaErrors] = useState({});
  const [isUpdatingCorreios, setIsUpdatingCorreios] = useState(false);
  const [errors, setErrors] = useState({});
  const [closeModal, setCloseModal] = useState(null);
  const [closeDetails, setCloseDetails] = useState(initialCloseDetails);
  const [closeErrors, setCloseErrors] = useState({});
  const [quoteEditModal, setQuoteEditModal] = useState(null);
  const [quoteEditForm, setQuoteEditForm] = useState(initialQuoteEditForm);
  const [quoteEditErrors, setQuoteEditErrors] = useState({});
  const [trackingModal, setTrackingModal] = useState(null);
  const [standaloneTrackingModal, setStandaloneTrackingModal] = useState(false);
  const [trackingForm, setTrackingForm] = useState(initialTrackingForm);
  const [trackingFormErrors, setTrackingFormErrors] = useState({});
  const [rotaxSessionModalOpen, setRotaxSessionModalOpen] = useState(false);
  const [rotaxSessionForm, setRotaxSessionForm] = useState(initialRotaxSessionForm);
  const [rotaxSessionErrors, setRotaxSessionErrors] = useState({});
  const [rotaxStudentModal, setRotaxStudentModal] = useState(null);
  const [rotaxStudentForm, setRotaxStudentForm] = useState(initialRotaxStudentForm);
  const [rotaxStudentErrors, setRotaxStudentErrors] = useState({});
  const [rotaxContactModal, setRotaxContactModal] = useState(null);
  const [rotaxContactForm, setRotaxContactForm] = useState(initialRotaxContactForm);
  const [rotaxContactErrors, setRotaxContactErrors] = useState({});
  const [expandedQuoteIds, setExpandedQuoteIds] = useState([]);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState('');
  const [dataStatus, setDataStatus] = useState(persistenceMode === 'supabase' ? 'Supabase' : 'Local');
  const [now, setNow] = useState(new Date());
  const [saleCelebration, setSaleCelebration] = useState(null);
  const uploadInputRef = useRef(null);
  const previousClosedQuoteIdsRef = useRef(null);
  const celebrationTimeoutRef = useRef(null);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured) {
      setAuthChecked(true);
      return () => {
        active = false;
      };
    }

    getCurrentSession()
      .then(({ user: currentUser }) => {
        if (!active) return;
        setUser(currentUser);
        setAuthChecked(true);
      })
      .catch((error) => {
        if (!active) return;
        setAppError(error.message || 'Não foi possível verificar o login.');
        setAuthChecked(true);
      });

    const unsubscribe = onAuthChange(({ user: currentUser }) => {
      setUser(currentUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribeRealtime = () => {};

    if (!authChecked) return () => {};

    if (isSupabaseConfigured && !user) {
      setQuotes([]);
      setTrackingEntries([]);
      setInfoBlocks([]);
      setRotaxBlocks([]);
      setRotaxSessions([]);
      setRotaxStudents([]);
      setRotaxContacts([]);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    Promise.all([loadStoredQuotes(), loadTrackingEntries(), loadInfoBlocks(), loadRotaxTrainingData()])
      .then(([quoteResult, trackingResult, infoResult, rotaxResult]) => {
        if (!active) return;
        setQuotes(quoteResult.quotes);
        setTrackingEntries(trackingResult.entries);
        setInfoBlocks(infoResult.blocks);
        setRotaxBlocks(rotaxResult.blocks);
        setRotaxSessions(rotaxResult.sessions);
        setRotaxStudents(rotaxResult.students);
        setRotaxContacts(rotaxResult.contacts);
        setActiveRotaxSessionId((current) => current || rotaxResult.sessions[0]?.id || '');
        setDataStatus(quoteResult.mode === 'supabase' ? 'Supabase · tempo real' : 'Local');
        setAppError('');

        if (quoteResult.mode === 'supabase') {
          const unsubscribeQuotes = subscribeToQuoteChanges(({ eventType, quote, oldId }) => {
            setQuotes((current) => syncCollection(current, eventType, quote, oldId, sortQuotes, cacheQuotes));
          });
          const unsubscribeTracking = subscribeToTrackingChanges(({ eventType, entry, oldId }) => {
            setTrackingEntries((current) =>
              syncCollection(current, eventType, entry, oldId, sortTrackingEntries, cacheTrackingEntries),
            );
          });
          const unsubscribeInfoBlocks = subscribeToInfoBlockChanges(({ eventType, block, oldId }) => {
            setInfoBlocks((current) => syncCollection(current, eventType, block, oldId, sortInfoBlocks, cacheInfoBlocks));
          });
          const unsubscribeRotax = subscribeToRotaxTrainingChanges(({ eventType, key, item, oldId }) => {
            if (key === 'block') {
              setRotaxBlocks((current) => syncCollection(current, eventType, item, oldId, sortRotaxBlocks, cacheRotaxBlocks));
            }
            if (key === 'session') {
              setRotaxSessions((current) =>
                syncCollection(current, eventType, item, oldId, sortRotaxSessions, cacheRotaxSessions),
              );
            }
            if (key === 'student') {
              setRotaxStudents((current) =>
                syncCollection(current, eventType, item, oldId, sortRotaxStudents, cacheRotaxStudents),
              );
            }
            if (key === 'contact') {
              setRotaxContacts((current) =>
                syncCollection(current, eventType, item, oldId, sortRotaxContacts, cacheRotaxContacts),
              );
            }
          });

          unsubscribeRealtime = () => {
            unsubscribeQuotes();
            unsubscribeTracking();
            unsubscribeInfoBlocks();
            unsubscribeRotax();
          };
        }
      })
      .catch((error) => {
        if (!active) return;
        setAppError(error.message || 'Não foi possível carregar os dados.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      unsubscribeRealtime();
    };
  }, [authChecked, user]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) window.clearTimeout(celebrationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const closedQuotes = quotes.filter(isClosed);
    const closedIds = new Set(closedQuotes.map((quote) => quote.id));

    if (previousClosedQuoteIdsRef.current === null) {
      previousClosedQuoteIdsRef.current = closedIds;
      return;
    }

    const previousIds = previousClosedQuoteIdsRef.current;
    const newClosedQuotes = closedQuotes.filter((quote) => !previousIds.has(quote.id));
    previousClosedQuoteIdsRef.current = closedIds;

    if (newClosedQuotes.length === 0) return;

    const latestSale = [...newClosedQuotes].sort((a, b) => new Date(b.statusUpdatedAt) - new Date(a.statusUpdatedAt))[0];
    setSaleCelebration({
      id: `${latestSale.id}-${Date.now()}`,
      seller: latestSale.seller,
      value: formatCurrencyValue(getQuoteNumericValue(latestSale)),
    });

    if (celebrationTimeoutRef.current) window.clearTimeout(celebrationTimeoutRef.current);
    celebrationTimeoutRef.current = window.setTimeout(() => setSaleCelebration(null), 6500);
  }, [quotes]);

  useEffect(() => {
    if (!rotaxSessions.length) {
      setActiveRotaxSessionId('');
      return;
    }

    if (!activeRotaxSessionId || !rotaxSessions.some((session) => session.id === activeRotaxSessionId)) {
      setActiveRotaxSessionId(rotaxSessions[0].id);
    }
  }, [activeRotaxSessionId, rotaxSessions]);

  const metrics = useMemo(() => {
    const followUpDue = quotes.filter((quote) => isFollowUpDue(quote, now));
    const unchangedStatus = quotes.filter((quote) => isStatusUnchanged(quote, now));

    return {
      abertas: quotes.filter((quote) => !isClosed(quote) && !isArchived(quote)).length,
      followup: followUpDue.length,
      fechadas: quotes.filter(isClosed).length,
      arquivadas: quotes.filter(isArchived).length,
      todas: quotes.length,
      followUpDue: followUpDue.length,
      unchangedStatus: unchangedStatus.length,
    };
  }, [quotes, now]);

  const trackingMetrics = useMemo(
    () => ({
      andamento: trackingEntries.filter((entry) => entry.status === 'Em andamento').length,
      finalizado: trackingEntries.filter((entry) => entry.status === 'Finalizado').length,
      withoutCode: trackingEntries.filter((entry) => entry.status === 'Em andamento' && !entry.trackingCode.trim()).length,
    }),
    [trackingEntries],
  );

  const visibleQuotes = useMemo(() => {
    const query = normalize(searchTerm);

    return quotes
      .filter((quote) => {
        if (activeTab === 'abertas') return !isClosed(quote) && !isArchived(quote);
        if (activeTab === 'followup') return isFollowUpDue(quote, now);
        if (activeTab === 'fechadas') return isClosed(quote);
        if (activeTab === 'arquivadas') return isArchived(quote);
        return true;
      })
      .filter((quote) => selectedSellers.length === 0 || selectedSellers.includes(quote.seller))
      .filter((quote) => {
        if (!query) return true;
        return normalize(quote.clientName).includes(query) || normalize(quote.quoteNumber).includes(query);
      })
      .sort((a, b) => {
        if (sortByRelevance) {
          const relevanceDiff = getQuoteInterestStars(b) - getQuoteInterestStars(a);
          if (relevanceDiff !== 0) return relevanceDiff;
        }

        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [activeTab, now, quotes, searchTerm, selectedSellers, sortByRelevance]);

  const visibleTrackingEntries = useMemo(
    () => {
      const query = normalize(trackingSearchTerm);

      return trackingEntries
        .filter((entry) => entry.status === activeTrackingTab)
        .filter((entry) => {
          if (!query) return true;

          return [
            entry.quoteNumber,
            entry.clientName,
            entry.orderNumber,
            entry.invoiceNumber,
            entry.carrier,
            entry.trackingCode,
            entry.deliverySituation,
            entry.expectedDeliveryDate,
            entry.notes,
            entry.status,
          ].some((value) => normalize(value || '').includes(query));
        });
    },
    [activeTrackingTab, trackingEntries, trackingSearchTerm],
  );

  const correiosTrackingCandidates = useMemo(
    () => trackingEntries.filter(isCorreiosTrackingCandidate),
    [trackingEntries],
  );

  const rotaxMetrics = useMemo(
    () => ({
      contacts: rotaxContacts.length,
      students: rotaxStudents.length,
    }),
    [rotaxContacts, rotaxStudents],
  );

  const activeRotaxBlocks = useMemo(
    () => rotaxBlocks.filter((block) => block.category === activeRotaxInfoCategory),
    [activeRotaxInfoCategory, rotaxBlocks],
  );

  const visibleRotaxStudents = useMemo(() => {
    if (!activeRotaxSessionId) return rotaxStudents;
    return rotaxStudents.filter((student) => student.trainingSessionId === activeRotaxSessionId);
  }, [activeRotaxSessionId, rotaxStudents]);

  async function addInfoBlock(type, options = {}) {
    const nowIso = new Date().toISOString();
    const { afterBlockId = null, content = getDefaultInfoBlockContent(type) } = options;
    const block = {
      id: crypto.randomUUID(),
      type,
      content,
      position: getNextInfoBlockPosition(infoBlocks, afterBlockId),
      isOpen: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const previousBlocks = infoBlocks;

    setInfoBlocks((current) => sortInfoBlocks([...current, block]));

    try {
      const savedBlock = await createInfoBlock(block);
      setInfoBlocks((current) => sortInfoBlocks(current.map((item) => (item.id === block.id ? savedBlock : item))));
      setAppError('');
    } catch (error) {
      setInfoBlocks(previousBlocks);
      setAppError(error.message || 'Nao foi possivel adicionar o bloco.');
    }
  }

  function changeInfoBlock(id, changes) {
    setInfoBlocks((current) => sortInfoBlocks(current.map((block) => (block.id === id ? { ...block, ...changes } : block))));
  }

  async function saveInfoBlock(id, changes) {
    const previousBlocks = infoBlocks;

    try {
      const savedBlock = await updateInfoBlock(id, changes);
      setInfoBlocks((current) => sortInfoBlocks(current.map((block) => (block.id === id ? savedBlock : block))));
      setAppError('');
    } catch (error) {
      setInfoBlocks(previousBlocks);
      setAppError(error.message || 'Nao foi possivel salvar o bloco.');
    }
  }

  async function removeInfoBlock(id) {
    const previousBlocks = infoBlocks;
    setInfoBlocks((current) => current.filter((block) => block.id !== id));

    try {
      await deleteInfoBlock(id);
      setAppError('');
    } catch (error) {
      setInfoBlocks(previousBlocks);
      setAppError(error.message || 'Nao foi possivel remover o bloco.');
    }
  }

  async function reorderInfoBlocks(draggedId, targetId, placement = 'before') {
    if (!draggedId || !targetId || draggedId === targetId) return;

    const previousBlocks = infoBlocks;
    const sortedBlocks = sortInfoBlocks(infoBlocks);
    const draggedBlock = sortedBlocks.find((block) => block.id === draggedId);
    if (!draggedBlock) return;

    const blocksWithoutDragged = sortedBlocks.filter((block) => block.id !== draggedId);
    const targetIndex = blocksWithoutDragged.findIndex((block) => block.id === targetId);
    if (targetIndex < 0) return;

    const insertIndex = placement === 'after' ? targetIndex + 1 : targetIndex;
    const reorderedBlocks = [
      ...blocksWithoutDragged.slice(0, insertIndex),
      draggedBlock,
      ...blocksWithoutDragged.slice(insertIndex),
    ].map((block, index) => ({ ...block, position: index + 1 }));
    const changedBlocks = reorderedBlocks.filter((block) => {
      const previousBlock = sortedBlocks.find((item) => item.id === block.id);
      return previousBlock?.position !== block.position;
    });

    if (!changedBlocks.length) return;

    setInfoBlocks(reorderedBlocks);

    try {
      const savedBlocks = await Promise.all(changedBlocks.map((block) => updateInfoBlock(block.id, { position: block.position })));
      const savedById = new Map(savedBlocks.filter(Boolean).map((block) => [block.id, block]));
      setInfoBlocks((current) => sortInfoBlocks(current.map((block) => savedById.get(block.id) || block)));
      setAppError('');
    } catch (error) {
      setInfoBlocks(previousBlocks);
      setAppError(error.message || 'Nao foi possivel reordenar os blocos.');
    }
  }

  function getNextRotaxBlockPosition(category) {
    const categoryBlocks = rotaxBlocks.filter((block) => block.category === category);
    return categoryBlocks.length ? Math.max(...categoryBlocks.map((block) => block.position || 0)) + 1 : 1;
  }

  async function addRotaxBlock(category) {
    const nowIso = new Date().toISOString();
    const block = {
      id: crypto.randomUUID(),
      category,
      title: 'Novo bloco',
      body: '',
      isOpen: true,
      position: getNextRotaxBlockPosition(category),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const previousBlocks = rotaxBlocks;
    setRotaxBlocks((current) => sortRotaxBlocks([...current, block]));

    try {
      const savedBlock = await createRotaxBlock(block);
      setRotaxBlocks((current) => sortRotaxBlocks(current.map((item) => (item.id === block.id ? savedBlock : item))));
      setAppError('');
    } catch (error) {
      setRotaxBlocks(previousBlocks);
      setAppError(error.message || 'Nao foi possivel adicionar o bloco do treinamento.');
    }
  }

  function changeRotaxBlock(id, changes) {
    setRotaxBlocks((current) => sortRotaxBlocks(current.map((block) => (block.id === id ? { ...block, ...changes } : block))));
  }

  async function saveRotaxBlock(id, changes) {
    const previousBlocks = rotaxBlocks;

    try {
      const savedBlock = await updateRotaxBlock(id, changes);
      setRotaxBlocks((current) => sortRotaxBlocks(current.map((block) => (block.id === id ? savedBlock : block))));
      setAppError('');
    } catch (error) {
      setRotaxBlocks(previousBlocks);
      setAppError(error.message || 'Nao foi possivel salvar o bloco do treinamento.');
    }
  }

  async function removeRotaxBlock(id) {
    const previousBlocks = rotaxBlocks;
    setRotaxBlocks((current) => current.filter((block) => block.id !== id));

    try {
      await deleteRotaxBlock(id);
      setAppError('');
    } catch (error) {
      setRotaxBlocks(previousBlocks);
      setAppError(error.message || 'Nao foi possivel remover o bloco do treinamento.');
    }
  }

  function openRotaxSessionModal() {
    setRotaxSessionForm(initialRotaxSessionForm);
    setRotaxSessionErrors({});
    setRotaxSessionModalOpen(true);
  }

  async function submitRotaxSession(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!rotaxSessionForm.trainingDate) nextErrors.trainingDate = 'Informe a data do treinamento.';
    if (rotaxSessions.some((session) => session.trainingDate === rotaxSessionForm.trainingDate)) {
      nextErrors.trainingDate = 'Este treinamento ja existe.';
    }

    setRotaxSessionErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const nowIso = new Date().toISOString();
    const session = {
      id: crypto.randomUUID(),
      trainingDate: rotaxSessionForm.trainingDate,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const previousSessions = rotaxSessions;
    setRotaxSessions((current) => sortRotaxSessions([...current, session]));

    try {
      const savedSession = await createRotaxSession(session);
      setRotaxSessions((current) => sortRotaxSessions(current.map((item) => (item.id === session.id ? savedSession : item))));
      setActiveRotaxSessionId(savedSession.id);
      setRotaxSessionModalOpen(false);
      setRotaxSessionErrors({});
      setAppError('');
    } catch (error) {
      setRotaxSessions(previousSessions);
      setAppError(error.message || 'Nao foi possivel adicionar o treinamento.');
    }
  }

  function openRotaxStudentModal(student = null, overrides = {}) {
    setRotaxStudentModal(student || { id: null });
    setRotaxStudentForm(
      student
        ? {
            trainingSessionId: student.trainingSessionId || activeRotaxSessionId || '',
            name: student.name || '',
            email: student.email || '',
            trainingTypes: student.trainingTypes || [],
            contractDone: student.contractDone || false,
            contractSigned: student.contractSigned || false,
            quoteNumber: student.quoteNumber || '',
            orderNumber: student.orderNumber || '',
            address: student.address || '',
            phone: student.phone || '',
            notes: student.notes || '',
          }
        : {
            ...initialRotaxStudentForm,
            trainingSessionId: activeRotaxSessionId || rotaxSessions[0]?.id || '',
            ...overrides,
          },
    );
    setRotaxStudentErrors({});
  }

  function updateRotaxStudentForm(field, value) {
    setRotaxStudentForm((current) => ({ ...current, [field]: value }));
    setRotaxStudentErrors((current) => ({ ...current, [field]: '' }));
  }

  function toggleRotaxTrainingType(type) {
    setRotaxStudentForm((current) => {
      const selected = current.trainingTypes.includes(type);
      return {
        ...current,
        trainingTypes: selected
          ? current.trainingTypes.filter((item) => item !== type)
          : [...current.trainingTypes, type],
      };
    });
  }

  async function submitRotaxStudent(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!rotaxStudentForm.trainingSessionId) nextErrors.trainingSessionId = 'Selecione a data do treinamento.';
    if (!rotaxStudentForm.name.trim()) nextErrors.name = 'Informe o nome.';

    setRotaxStudentErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const changes = {
      trainingSessionId: rotaxStudentForm.trainingSessionId,
      name: rotaxStudentForm.name.trim(),
      email: rotaxStudentForm.email.trim(),
      trainingTypes: rotaxStudentForm.trainingTypes,
      contractDone: rotaxStudentForm.contractDone,
      contractSigned: rotaxStudentForm.contractSigned,
      quoteNumber: rotaxStudentForm.quoteNumber.trim(),
      orderNumber: rotaxStudentForm.orderNumber.trim(),
      address: rotaxStudentForm.address.trim(),
      phone: rotaxStudentForm.phone.trim(),
      notes: rotaxStudentForm.notes.trim(),
    };
    const previousStudents = rotaxStudents;

    if (rotaxStudentModal?.id) {
      setRotaxStudents((current) =>
        sortRotaxStudents(current.map((student) => (student.id === rotaxStudentModal.id ? { ...student, ...changes } : student))),
      );

      try {
        const savedStudent = await updateRotaxStudent(rotaxStudentModal.id, changes);
        setRotaxStudents((current) =>
          sortRotaxStudents(current.map((student) => (student.id === rotaxStudentModal.id ? savedStudent : student))),
        );
        setRotaxStudentModal(null);
        setAppError('');
      } catch (error) {
        setRotaxStudents(previousStudents);
        setAppError(error.message || 'Nao foi possivel salvar o aluno.');
      }
      return;
    }

    const nowIso = new Date().toISOString();
    const student = { id: crypto.randomUUID(), ...changes, createdAt: nowIso, updatedAt: nowIso };
    setRotaxStudents((current) => sortRotaxStudents([student, ...current]));

    try {
      const savedStudent = await createRotaxStudent(student);
      setRotaxStudents((current) => sortRotaxStudents(current.map((item) => (item.id === student.id ? savedStudent : item))));
      setActiveRotaxTab('students');
      setActiveRotaxSessionId(savedStudent.trainingSessionId);
      setRotaxStudentModal(null);
      setAppError('');
    } catch (error) {
      setRotaxStudents(previousStudents);
      setAppError(error.message || 'Nao foi possivel adicionar o aluno.');
    }
  }

  async function removeRotaxStudent(id) {
    const previousStudents = rotaxStudents;
    setRotaxStudents((current) => current.filter((student) => student.id !== id));

    try {
      await deleteRotaxStudent(id);
      setAppError('');
    } catch (error) {
      setRotaxStudents(previousStudents);
      setAppError(error.message || 'Nao foi possivel excluir o aluno.');
    }
  }

  function toggleRotaxStudentDetails(id) {
    setExpandedRotaxStudentIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function openRotaxContactModal(contact = null) {
    setRotaxContactModal(contact || { id: null });
    setRotaxContactForm(
      contact
        ? {
            name: contact.name || '',
            contact: contact.contact || '',
            status: contact.status || 'Em contato',
            redirectSessionId: '',
          }
        : initialRotaxContactForm,
    );
    setRotaxContactErrors({});
  }

  function updateRotaxContactForm(field, value) {
    setRotaxContactForm((current) => ({ ...current, [field]: value }));
    setRotaxContactErrors((current) => ({ ...current, [field]: '' }));
  }

  async function submitRotaxContact(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!rotaxContactForm.name.trim()) nextErrors.name = 'Informe o nome.';
    if (rotaxContactForm.redirectSessionId && !rotaxSessions.some((session) => session.id === rotaxContactForm.redirectSessionId)) {
      nextErrors.redirectSessionId = 'Selecione um treinamento valido.';
    }

    setRotaxContactErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const changes = {
      name: rotaxContactForm.name.trim(),
      contact: rotaxContactForm.contact.trim(),
      status: rotaxContactForm.status,
    };
    const previousContacts = rotaxContacts;
    let savedContact = null;

    try {
      if (rotaxContactModal?.id) {
        setRotaxContacts((current) =>
          sortRotaxContacts(current.map((contact) => (contact.id === rotaxContactModal.id ? { ...contact, ...changes } : contact))),
        );
        savedContact = await updateRotaxContact(rotaxContactModal.id, changes);
        setRotaxContacts((current) =>
          sortRotaxContacts(current.map((contact) => (contact.id === rotaxContactModal.id ? savedContact : contact))),
        );
      } else {
        const nowIso = new Date().toISOString();
        const contact = { id: crypto.randomUUID(), ...changes, createdAt: nowIso, updatedAt: nowIso };
        setRotaxContacts((current) => sortRotaxContacts([contact, ...current]));
        savedContact = await createRotaxContact(contact);
        setRotaxContacts((current) => sortRotaxContacts(current.map((item) => (item.id === contact.id ? savedContact : item))));
      }

      setRotaxContactModal(null);
      setAppError('');

      if (rotaxContactForm.redirectSessionId) {
        setActiveRotaxTab('students');
        setActiveRotaxSessionId(rotaxContactForm.redirectSessionId);
        openRotaxStudentModal(null, {
          trainingSessionId: rotaxContactForm.redirectSessionId,
          name: savedContact.name,
          phone: savedContact.contact,
        });
      }
    } catch (error) {
      setRotaxContacts(previousContacts);
      setAppError(error.message || 'Nao foi possivel salvar o contato.');
    }
  }

  async function removeRotaxContact(id) {
    const previousContacts = rotaxContacts;
    setRotaxContacts((current) => current.filter((contact) => contact.id !== id));

    try {
      await deleteRotaxContact(id);
      setAppError('');
    } catch (error) {
      setRotaxContacts(previousContacts);
      setAppError(error.message || 'Nao foi possivel excluir o contato.');
    }
  }

  function updateForm(field, value) {
    setForm((current) => {
      if (field === 'followUpUsesTime') {
        return { ...current, followUpUsesTime: value, followUpUnit: value ? 'hours' : 'days' };
      }

      return { ...current, [field]: value };
    });
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  function updateGrandpaForm(field, value) {
    setGrandpaForm((current) => ({ ...current, [field]: value }));
    setGrandpaErrors((current) => ({ ...current, [field]: '' }));
  }

  function findQuoteByQuoteNumber(value) {
    const quoteNumber = normalizeUploadQuoteNumber(value);
    return quotes.find((item) => normalizeUploadQuoteNumber(item.quoteNumber) === quoteNumber);
  }

  async function submitGrandpaForm(event) {
    event.preventDefault();

    const nextErrors = {};
    const quoteNumber = normalizeUploadQuoteNumber(grandpaForm.quoteNumber);
    const clientName = grandpaForm.clientName.trim();
    const phone = grandpaForm.phone.trim();
    const paymentTerms = grandpaForm.paymentTerms.trim();

    if (!quoteNumber) nextErrors.quoteNumber = 'Informe o numero do orcamento.';
    if (!clientName) nextErrors.clientName = 'Informe o nome.';

    setGrandpaErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const quote = findQuoteByQuoteNumber(quoteNumber);
    if (!quote) {
      const createdAt = new Date().toISOString();
      const nextQuote = {
        id: crypto.randomUUID(),
        quoteNumber,
        clientName,
        phone,
        paymentTerms,
        quoteDate: getTodayInputValue(),
        seller: initialForm.seller,
        notes: '',
        isInterest: false,
        followUpDays: 1,
        followUpAmount: 1,
        followUpUnit: 'days',
        followUpStartedAt: createdAt,
        status: 'sem-resposta',
        createdAt,
        statusUpdatedAt: createdAt,
        archivedAt: '',
      };

      const previousQuotes = quotes;
      setQuotes((current) => [nextQuote, ...current]);

      try {
        const savedQuote = await createQuote(nextQuote);
        setQuotes((current) => current.map((item) => (item.id === nextQuote.id ? savedQuote : item)));
        setGrandpaForm(initialGrandpaForm);
        setGrandpaErrors({});
        setActiveTab('abertas');
        setAppError(`Orcamento ${quoteNumber} adicionado com sucesso.`);
      } catch (error) {
        setQuotes(previousQuotes);
        setAppError(error.message || 'Nao foi possivel adicionar o orcamento.');
      }
      return;
    }

    const changes = {};
    if (isFinalClientName(quote.clientName)) changes.clientName = clientName;
    if (phone) changes.phone = phone;
    if (paymentTerms) {
      changes.paymentTerms = paymentTerms;
      if (quote.closeDetails) {
        changes.closeDetails = {
          ...quote.closeDetails,
          agreedPaymentTerms: paymentTerms,
        };
      }
    }

    if (Object.keys(changes).length === 0) {
      setAppError(`Orcamento ${quoteNumber} encontrado, mas nao havia dados para alterar.`);
      return;
    }

    const previousQuotes = quotes;
    setQuotes((current) => current.map((item) => (item.id === quote.id ? { ...item, ...changes } : item)));

    try {
      const savedQuote = await updateQuote(quote.id, changes);
      setQuotes((current) => current.map((item) => (item.id === quote.id ? savedQuote : item)));
      setGrandpaForm(initialGrandpaForm);
      setGrandpaErrors({});
      setAppError(`Orcamento ${quoteNumber} atualizado com sucesso.`);
    } catch (error) {
      setQuotes(previousQuotes);
      setAppError(error.message || 'Nao foi possivel atualizar o orcamento.');
    }
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.quoteNumber.trim()) nextErrors.quoteNumber = 'Informe o número da cotação.';
    if (!form.clientName.trim()) nextErrors.clientName = 'Informe o nome do cliente.';
    if (!form.quoteDate) nextErrors.quoteDate = 'Informe a data da cotação.';
    if (!form.seller) nextErrors.seller = 'Selecione o vendedor.';
    if (!form.followUpAmount || Number(form.followUpAmount) <= 0) {
      nextErrors.followUpAmount = 'Use um prazo maior que zero.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleLogin(email, password) {
    setAppError('');

    try {
      const { user: signedUser } = await signIn(email, password);
      setUser(signedUser);
    } catch (error) {
      setAppError(error.message || 'Não foi possível entrar.');
    }
  }

  async function handleSignOut() {
    setAppError('');

    try {
      await signOut();
      setUser(null);
      setQuotes([]);
      setTrackingEntries([]);
      setInfoBlocks([]);
    } catch (error) {
      setAppError(error.message || 'Não foi possível sair.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const createdAt = new Date().toISOString();
    const quoteNumber = normalizeUploadQuoteNumber(form.quoteNumber.trim());
    const existingQuote = findQuoteByQuoteNumber(quoteNumber);

    if (existingQuote) {
      const changes = {
        quoteNumber,
        clientName: form.clientName.trim(),
        phone: form.phone.trim(),
        quoteValue: form.quoteValue.trim(),
        paymentTerms: form.paymentTerms.trim(),
        quoteDate: form.quoteDate,
        seller: form.seller,
        notes: form.notes.trim(),
        isInterest: form.isInterest,
        followUpDays: form.followUpUnit === 'days' ? Number(form.followUpAmount) : 1,
        followUpAmount: Number(form.followUpAmount),
        followUpUnit: form.followUpUnit,
        followUpStartedAt: createdAt,
      };

      if (existingQuote.closeDetails) {
        changes.closeDetails = {
          ...existingQuote.closeDetails,
          agreedPaymentTerms: form.paymentTerms.trim(),
        };
      }

      const previousQuotes = quotes;
      setQuotes((current) => current.map((quote) => (quote.id === existingQuote.id ? { ...quote, ...changes } : quote)));

      try {
        const savedQuote = await updateQuote(existingQuote.id, changes);
        setQuotes((current) => current.map((quote) => (quote.id === existingQuote.id ? savedQuote : quote)));
        setForm({ ...initialForm, quoteDate: getTodayInputValue() });
        setActiveTab(savedQuote.status === 'fechada' ? 'fechadas' : 'abertas');
        setAppError(`Cotacao ${quoteNumber} atualizada com sucesso.`);
      } catch (error) {
        setQuotes(previousQuotes);
        setAppError(error.message || 'Nao foi possivel atualizar a cotacao.');
      }

      return;
    }

    const nextQuote = {
      id: crypto.randomUUID(),
      quoteNumber,
      clientName: form.clientName.trim(),
      phone: form.phone.trim(),
      quoteValue: form.quoteValue.trim(),
      paymentTerms: form.paymentTerms.trim(),
      quoteDate: form.quoteDate,
      seller: form.seller,
      notes: form.notes.trim(),
      isInterest: form.isInterest,
      followUpDays: form.followUpUnit === 'days' ? Number(form.followUpAmount) : 1,
      followUpAmount: Number(form.followUpAmount),
      followUpUnit: form.followUpUnit,
      followUpStartedAt: createdAt,
      status: 'sem-resposta',
      createdAt,
      statusUpdatedAt: createdAt,
      archivedAt: '',
    };

    const previousQuotes = quotes;
    setQuotes((current) => [nextQuote, ...current]);

    try {
      const savedQuote = await createQuote(nextQuote);
      setQuotes((current) => current.map((quote) => (quote.id === nextQuote.id ? savedQuote : quote)));
      setForm({ ...initialForm, quoteDate: getTodayInputValue() });
      setActiveTab('abertas');
      setAppError('');
    } catch (error) {
      setQuotes(previousQuotes);
      setAppError(error.message || 'Não foi possível salvar a cotação.');
    }
  }

  async function handleQuotesUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploadingQuotes(true);

    try {
      const importedRows = await parseQuotesUploadFile(file);
      if (importedRows.length === 0) {
        throw new Error('Nenhum orçamento válido foi encontrado na segunda aba da planilha.');
      }

      const existingQuotesByNumber = new Map(
        quotes.map((quote) => [normalizeUploadQuoteNumber(quote.quoteNumber), quote]),
      );
      const existingQuoteNumbers = new Set(existingQuotesByNumber.keys());
      const existingRows = importedRows.filter((row) => existingQuoteNumbers.has(row.quoteNumber));
      const newRows = importedRows.filter((row) => !existingQuoteNumbers.has(row.quoteNumber));

      if (newRows.length === 0 && existingRows.length === 0) {
        setAppError('Upload concluído: todos os orçamentos da planilha já existem no FollowUper.');
        return;
      }

      const savedQuotes = [];
      const updatedQuotes = [];
      let closedCount = 0;

      for (const row of existingRows) {
        const existingQuote = existingQuotesByNumber.get(row.quoteNumber);
        if (!existingQuote) continue;

        const closedAt = new Date().toISOString();
        const formattedTotalValue = formatUploadCurrency(row.totalValue);
        const isClosedUpload = Boolean(row.orderNumber);
        const changes = {
          quoteValue: formattedTotalValue,
          isInterest: existingQuote.isInterest || row.totalValue >= 5000,
        };

        if (isClosedUpload) {
          changes.status = 'fechada';
          changes.statusUpdatedAt = existingQuote.status === 'fechada' ? existingQuote.statusUpdatedAt || closedAt : closedAt;
          changes.closeDetails = {
            orderNumber: row.orderNumber,
            agreedPaymentTerms: existingQuote.closeDetails?.agreedPaymentTerms || '',
            carrier: existingQuote.closeDetails?.carrier || existingQuote.closeDetails?.freight || '',
            totalValue: existingQuote.closeDetails?.totalValue || formattedTotalValue,
            notes: existingQuote.closeDetails?.notes || '',
            closedAt: existingQuote.closeDetails?.closedAt || closedAt,
          };
        } else if (existingQuote.closeDetails) {
          changes.closeDetails = {
            ...existingQuote.closeDetails,
            totalValue: existingQuote.closeDetails.totalValue || formattedTotalValue,
          };
        }

        const hasChanges = Object.entries(changes).some(([key, value]) => {
          if (key === 'closeDetails') return JSON.stringify(existingQuote.closeDetails || null) !== JSON.stringify(value || null);
          return existingQuote[key] !== value;
        });

        if (!hasChanges) {
          continue;
        }

        const savedQuote = await updateQuote(existingQuote.id, changes);
        updatedQuotes.push(savedQuote);

        if (isClosedUpload && savedQuote.closeDetails) {
          if (existingQuote.status !== 'fechada') closedCount += 1;
          await ensureTrackingEntry(savedQuote, savedQuote.closeDetails);
        }
      }

      for (const row of newRows) {
        const createdAt = new Date().toISOString();
        const isClosedUpload = Boolean(row.orderNumber);
        const formattedTotalValue = formatUploadCurrency(row.totalValue);
        const closeDetails = isClosedUpload
          ? {
              orderNumber: row.orderNumber,
              agreedPaymentTerms: '',
              carrier: '',
              totalValue: formattedTotalValue,
              notes: '',
              closedAt: createdAt,
            }
          : undefined;
        const nextQuote = {
          id: crypto.randomUUID(),
          quoteNumber: row.quoteNumber,
          clientName: row.clientName,
          quoteValue: formattedTotalValue,
          paymentTerms: '',
          quoteDate: getTodayInputValue(),
          seller: row.seller,
          notes: '',
          isInterest: row.totalValue >= 5000,
          followUpDays: 1,
          followUpAmount: 1,
          followUpUnit: 'days',
          followUpStartedAt: createdAt,
          status: isClosedUpload ? 'fechada' : 'sem-resposta',
          createdAt,
          statusUpdatedAt: createdAt,
          archivedAt: '',
          closeDetails,
        };

        const savedQuote = await createQuote(nextQuote);
        savedQuotes.push(savedQuote);
        existingQuoteNumbers.add(normalizeUploadQuoteNumber(savedQuote.quoteNumber));

        if (isClosedUpload && savedQuote.closeDetails) {
          closedCount += 1;
          await ensureTrackingEntry(savedQuote, savedQuote.closeDetails);
        }
      }

      setQuotes((current) => {
        const changedQuotes = [...savedQuotes, ...updatedQuotes];
        return [
          ...changedQuotes,
          ...current.filter((quote) => !changedQuotes.some((saved) => saved.id === quote.id)),
        ];
      });
      setActiveView('quotes');
      setActiveTab('abertas');
      setAppError(
        `Upload concluído: ${savedQuotes.length} orçamento(s) novo(s), ${updatedQuotes.length} atualizado(s), ${closedCount} finalizado(s), ${existingRows.length - updatedQuotes.length} ignorado(s).`,
      );
    } catch (error) {
      setAppError(error.message || 'Não foi possível importar a planilha.');
    } finally {
      setIsUploadingQuotes(false);
    }
  }

  function openCloseModal(quote) {
    setCloseModal({ quoteId: quote.id, quoteNumber: quote.quoteNumber, clientName: quote.clientName });
    const totalValue = quote.closeDetails?.totalValue || quote.quoteValue || '';
    setCloseDetails({
      ...initialCloseDetails,
      ...quote.closeDetails,
      carrier: quote.closeDetails?.carrier || quote.closeDetails?.freight || '',
      phone: quote.phone || '',
      totalValue,
    });
    setCloseErrors({});
  }

  function updateCloseDetails(field, value) {
    setCloseDetails((current) => ({ ...current, [field]: value }));
    setCloseErrors((current) => ({ ...current, [field]: '' }));
  }

  function validateCloseDetails() {
    const nextErrors = {};

    if (!closeDetails.orderNumber.trim()) nextErrors.orderNumber = 'Informe o número do pedido.';
    if (!closeDetails.agreedPaymentTerms.trim()) {
      nextErrors.agreedPaymentTerms = 'Informe a condição acordada.';
    }
    if (!closeDetails.carrier.trim()) nextErrors.carrier = 'Informe a transportadora.';
    if (!closeDetails.totalValue.trim()) nextErrors.totalValue = 'Informe o valor total.';

    setCloseErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function changeStatus(id, status) {
    const quote = quotes.find((item) => item.id === id);
    if (status === 'fechada' && quote) {
      openCloseModal(quote);
      return;
    }

    const previousQuotes = quotes;
    const statusUpdatedAt = new Date().toISOString();
    const changes = { status, statusUpdatedAt };

    setQuotes((current) => current.map((quote) => (quote.id === id ? { ...quote, ...changes } : quote)));

    try {
      const savedQuote = await updateQuote(id, changes);
      setQuotes((current) => current.map((quote) => (quote.id === id ? savedQuote : quote)));
      setAppError('');
    } catch (error) {
      setQuotes(previousQuotes);
      setAppError(error.message || 'Não foi possível atualizar o status.');
    }
  }

  async function confirmCloseQuote(event) {
    event.preventDefault();
    if (!closeModal || !validateCloseDetails()) return;

    const closedAt = new Date().toISOString();
    const previousQuotes = quotes;
    const previousTrackingEntries = trackingEntries;
    const changes = {
      phone: closeDetails.phone.trim(),
      quoteValue: closeDetails.totalValue.trim(),
      status: 'fechada',
      statusUpdatedAt: closedAt,
      closeDetails: {
        orderNumber: closeDetails.orderNumber.trim(),
        agreedPaymentTerms: closeDetails.agreedPaymentTerms.trim(),
        carrier: closeDetails.carrier.trim(),
        totalValue: closeDetails.totalValue.trim(),
        notes: closeDetails.notes.trim(),
        closedAt,
      },
    };

    setQuotes((current) =>
      current.map((quote) => (quote.id === closeModal.quoteId ? { ...quote, ...changes } : quote)),
    );

    try {
      const savedQuote = await updateQuote(closeModal.quoteId, changes);
      setQuotes((current) => current.map((quote) => (quote.id === closeModal.quoteId ? savedQuote : quote)));
      await ensureTrackingEntry(savedQuote, changes.closeDetails);
      setCloseModal(null);
      setCloseDetails(initialCloseDetails);
      setCloseErrors({});
      setActiveTab('fechadas');
      setActiveView('quotes');
      setAppError('');
    } catch (error) {
      setQuotes(previousQuotes);
      setTrackingEntries(previousTrackingEntries);
      setAppError(error.message || 'Não foi possível finalizar a cotação.');
    }
  }

  function cancelCloseModal() {
    setCloseModal(null);
    setCloseDetails(initialCloseDetails);
    setCloseErrors({});
  }

  function openQuoteEditModal(quote) {
    setQuoteEditModal(quote);
    setQuoteEditForm({
      quoteNumber: quote.quoteNumber,
      clientName: quote.clientName,
      phone: quote.phone || '',
      quoteValue: quote.quoteValue || '',
      paymentTerms: quote.paymentTerms || '',
      quoteDate: quote.quoteDate,
      seller: quote.seller,
      notes: quote.notes || '',
      isInterest: quote.isInterest === true,
      followUpAmount: quote.followUpAmount || quote.followUpDays || 1,
      followUpUnit: quote.followUpUnit || 'days',
      followUpUsesTime: (quote.followUpUnit || 'days') !== 'days',
    });
    setQuoteEditErrors({});
  }

  function updateQuoteEditForm(field, value) {
    setQuoteEditForm((current) => {
      if (field === 'followUpUsesTime') {
        return { ...current, followUpUsesTime: value, followUpUnit: value ? 'hours' : 'days' };
      }

      return { ...current, [field]: value };
    });
    setQuoteEditErrors((current) => ({ ...current, [field]: '' }));
  }

  function validateQuoteEditForm() {
    const nextErrors = {};

    if (!quoteEditForm.quoteNumber.trim()) nextErrors.quoteNumber = 'Informe o número da cotação.';
    if (!quoteEditForm.clientName.trim()) nextErrors.clientName = 'Informe o nome do cliente.';
    if (!quoteEditForm.quoteDate) nextErrors.quoteDate = 'Informe a data da cotação.';
    if (!quoteEditForm.seller) nextErrors.seller = 'Selecione o vendedor.';
    if (!quoteEditForm.followUpAmount || Number(quoteEditForm.followUpAmount) <= 0) {
      nextErrors.followUpAmount = 'Use um prazo maior que zero.';
    }

    setQuoteEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveQuoteEditForm(event) {
    event.preventDefault();
    if (!quoteEditModal || !validateQuoteEditForm()) return;

    const previousQuotes = quotes;
    const changes = {
      quoteNumber: quoteEditForm.quoteNumber.trim(),
      clientName: quoteEditForm.clientName.trim(),
      phone: quoteEditForm.phone.trim(),
      quoteValue: quoteEditForm.quoteValue.trim(),
      paymentTerms: quoteEditForm.paymentTerms.trim(),
      quoteDate: quoteEditForm.quoteDate,
      seller: quoteEditForm.seller,
      notes: quoteEditForm.notes.trim(),
      isInterest: quoteEditForm.isInterest,
      followUpDays: quoteEditForm.followUpUnit === 'days' ? Number(quoteEditForm.followUpAmount) : 1,
      followUpAmount: Number(quoteEditForm.followUpAmount),
      followUpUnit: quoteEditForm.followUpUnit,
    };

    setQuotes((current) =>
      current.map((quote) => (quote.id === quoteEditModal.id ? { ...quote, ...changes } : quote)),
    );

    try {
      const savedQuote = await updateQuote(quoteEditModal.id, changes);
      setQuotes((current) => current.map((quote) => (quote.id === quoteEditModal.id ? savedQuote : quote)));
      setQuoteEditModal(null);
      setQuoteEditForm(initialQuoteEditForm);
      setQuoteEditErrors({});
      setAppError('');
    } catch (error) {
      setQuotes(previousQuotes);
      setAppError(error.message || 'Não foi possível editar a cotação.');
    }
  }

  function cancelQuoteEditModal() {
    setQuoteEditModal(null);
    setQuoteEditForm(initialQuoteEditForm);
    setQuoteEditErrors({});
  }

  async function restartFollowUp(id) {
    const previousQuotes = quotes;
    const startedAt = new Date().toISOString();
    const changes = {
      followUpAmount: 5,
      followUpUnit: 'days',
      followUpDays: 5,
      followUpStartedAt: startedAt,
      archivedAt: '',
    };

    setQuotes((current) => current.map((quote) => (quote.id === id ? { ...quote, ...changes } : quote)));

    try {
      const savedQuote = await updateQuote(id, changes);
      setQuotes((current) => current.map((quote) => (quote.id === id ? savedQuote : quote)));
      setAppError('');
    } catch (error) {
      setQuotes(previousQuotes);
      setAppError(error.message || 'Não foi possível reiniciar o follow-up.');
    }
  }

  async function archiveQuote(id) {
    const previousQuotes = quotes;
    const changes = { archivedAt: new Date().toISOString() };

    setQuotes((current) => current.map((quote) => (quote.id === id ? { ...quote, ...changes } : quote)));

    try {
      const savedQuote = await updateQuote(id, changes);
      setQuotes((current) => current.map((quote) => (quote.id === id ? savedQuote : quote)));
      setActiveTab('arquivadas');
      setAppError('');
    } catch (error) {
      setQuotes(previousQuotes);
      setAppError(error.message || 'Não foi possível arquivar a cotação.');
    }
  }

  async function ensureTrackingEntry(quote, details) {
    const existingEntry = trackingEntries.find((entry) => entry.quoteId === quote.id);
    const nowIso = new Date().toISOString();

    if (existingEntry) {
      const savedEntry = await updateTrackingEntry(existingEntry.id, {
        quoteNumber: quote.quoteNumber,
        clientName: quote.clientName,
        orderNumber: details.orderNumber,
        carrier: details.carrier,
      });
      setTrackingEntries((current) =>
        sortTrackingEntries(current.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry))),
      );
      return;
    }

    const nextEntry = {
      id: crypto.randomUUID(),
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      clientName: quote.clientName,
      orderNumber: details.orderNumber,
      invoiceNumber: '',
      carrier: details.carrier,
      trackingCode: '',
      deliverySituation: 'etiqueta',
      expectedDeliveryDate: '',
      notes: '',
      status: 'Em andamento',
      finalizedAt: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const savedEntry = await createTrackingEntry(nextEntry);
    setTrackingEntries((current) =>
      sortTrackingEntries([savedEntry, ...current.filter((entry) => entry.id !== savedEntry.id)]),
    );
  }

  async function removeQuote(id) {
    const previousQuotes = quotes;
    const previousTrackingEntries = trackingEntries;
    const relatedTrackingEntries = trackingEntries.filter((entry) => entry.quoteId === id);

    setQuotes((current) => current.filter((quote) => quote.id !== id));
    setTrackingEntries((current) => current.filter((entry) => entry.quoteId !== id));

    try {
      await deleteQuote(id);
      if (!isSupabaseConfigured) {
        await Promise.all(relatedTrackingEntries.map((entry) => deleteTrackingEntry(entry.id)));
      }
      setAppError('');
    } catch (error) {
      setQuotes(previousQuotes);
      setTrackingEntries(previousTrackingEntries);
      setAppError(error.message || 'Não foi possível remover a cotação.');
    }
  }

  async function removeTrackingEntry(id) {
    const previousEntries = trackingEntries;
    setTrackingEntries((current) => current.filter((entry) => entry.id !== id));

    try {
      await deleteTrackingEntry(id);
      setAppError('');
    } catch (error) {
      setTrackingEntries(previousEntries);
      setAppError(error.message || 'Não foi possível excluir o rastreio.');
    }
  }

  function openTrackingModal(entry) {
    setTrackingModal(entry);
    setTrackingForm({
      carrier: entry.carrier || '',
      trackingCode: entry.trackingCode || '',
      invoiceNumber: entry.invoiceNumber || '',
      deliverySituation: entry.deliverySituation || 'etiqueta',
      expectedDeliveryDate: entry.expectedDeliveryDate || '',
      notes: entry.notes || '',
      status: entry.status || 'Em andamento',
    });
  }

  function toggleSellerFilter(seller) {
    setSelectedSellers((current) =>
      current.includes(seller) ? current.filter((selectedSeller) => selectedSeller !== seller) : [...current, seller],
    );
  }

  function changeSellerFilter(value) {
    setSelectedSellers(value ? [value] : []);
  }

  function updateTrackingForm(field, value) {
    setTrackingForm((current) => {
      if (field === 'deliverySituation' && value === 'Entregue') {
        return { ...current, deliverySituation: value, status: 'Finalizado' };
      }

      return { ...current, [field]: value };
    });
    setTrackingFormErrors((current) => ({ ...current, [field]: '' }));
  }

  function validateStandaloneTrackingForm() {
    const nextErrors = {};

    if (!trackingForm.clientName.trim()) nextErrors.clientName = 'Informe o nome.';
    if (!trackingForm.carrier.trim()) nextErrors.carrier = 'Informe a transportadora.';

    setTrackingFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveTrackingForm(event) {
    event.preventDefault();
    if (!trackingModal) return;

    const previousEntries = trackingEntries;
    const nextStatus = trackingForm.deliverySituation === 'Entregue' ? 'Finalizado' : trackingForm.status;
    const changes = {
      carrier: trackingForm.carrier.trim(),
      trackingCode: trackingForm.trackingCode.trim(),
      invoiceNumber: trackingForm.invoiceNumber.trim(),
      deliverySituation: trackingForm.deliverySituation,
      expectedDeliveryDate: trackingForm.expectedDeliveryDate,
      notes: trackingForm.notes.trim(),
      status: nextStatus,
      correiosUpdateFailed: false,
    };

    if (changes.status === 'Finalizado' && trackingModal.status !== 'Finalizado') {
      changes.finalizedAt = new Date().toISOString();
    }

    if (changes.status === 'Em andamento') {
      changes.finalizedAt = '';
    }

    setTrackingEntries((current) =>
      sortTrackingEntries(current.map((entry) => (entry.id === trackingModal.id ? { ...entry, ...changes } : entry))),
    );

    try {
      const savedEntry = await updateTrackingEntry(trackingModal.id, changes);
      setTrackingEntries((current) =>
        sortTrackingEntries(current.map((entry) => (entry.id === trackingModal.id ? savedEntry : entry))),
      );
      setTrackingModal(null);
      setTrackingForm(initialTrackingForm);
      setTrackingFormErrors({});
      setAppError('');
    } catch (error) {
      setTrackingEntries(previousEntries);
      setAppError(error.message || 'Não foi possível atualizar o rastreio.');
    }
  }

  function cancelTrackingModal() {
    setTrackingModal(null);
    setStandaloneTrackingModal(false);
    setTrackingForm(initialTrackingForm);
    setTrackingFormErrors({});
  }

  function openStandaloneTrackingModal() {
    setStandaloneTrackingModal(true);
    setTrackingForm(initialTrackingForm);
    setTrackingFormErrors({});
  }

  async function saveStandaloneTrackingForm(event) {
    event.preventDefault();
    if (!validateStandaloneTrackingForm()) return;

    const previousEntries = trackingEntries;
    const nowIso = new Date().toISOString();
    const nextStatus = trackingForm.deliverySituation === 'Entregue' ? 'Finalizado' : trackingForm.status;
    const nextEntry = {
      id: crypto.randomUUID(),
      quoteId: null,
      quoteNumber: 'Avulso',
      clientName: trackingForm.clientName.trim(),
      orderNumber: '',
      invoiceNumber: trackingForm.invoiceNumber.trim(),
      carrier: trackingForm.carrier.trim(),
      trackingCode: trackingForm.trackingCode.trim(),
      deliverySituation: trackingForm.deliverySituation,
      expectedDeliveryDate: trackingForm.expectedDeliveryDate,
      notes: trackingForm.notes.trim(),
      status: nextStatus,
      finalizedAt: nextStatus === 'Finalizado' ? nowIso : '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setTrackingEntries((current) => sortTrackingEntries([nextEntry, ...current]));

    try {
      const savedEntry = await createTrackingEntry(nextEntry);
      setTrackingEntries((current) =>
        sortTrackingEntries([savedEntry, ...current.filter((entry) => entry.id !== savedEntry.id)]),
      );
      setStandaloneTrackingModal(false);
      setTrackingForm(initialTrackingForm);
      setTrackingFormErrors({});
      setAppError('');
    } catch (error) {
      setTrackingEntries(previousEntries);
      setAppError(error.message || 'Não foi possível adicionar o rastreio avulso.');
    }
  }

  async function updateCorreiosStatuses() {
    const candidates = correiosTrackingCandidates;
    if (candidates.length === 0 || isUpdatingCorreios) return;

    setIsUpdatingCorreios(true);

    try {
      const results = await requestCorreiosTrackingUpdate(candidates);
      const resultsById = new Map(results.map((result) => [result.id, result]));
      let updatedCount = 0;
      let failedCount = 0;

      for (const entry of candidates) {
        const result = resultsById.get(entry.id);
        if (!result?.updated) {
          failedCount += 1;
          const savedEntry = await updateTrackingEntry(entry.id, { correiosUpdateFailed: true });
          setTrackingEntries((current) =>
            sortTrackingEntries(current.map((currentEntry) => (currentEntry.id === savedEntry.id ? savedEntry : currentEntry))),
          );
          continue;
        }

        updatedCount += 1;
        const changes = {
          deliverySituation: result.deliverySituation,
          expectedDeliveryDate: result.expectedDeliveryDate || entry.expectedDeliveryDate,
          correiosUpdateFailed: false,
        };
        if (result.deliverySituation === 'Entregue') {
          changes.status = 'Finalizado';
        }
        const savedEntry = await updateTrackingEntry(entry.id, changes);
        setTrackingEntries((current) =>
          sortTrackingEntries(current.map((currentEntry) => (currentEntry.id === savedEntry.id ? savedEntry : currentEntry))),
        );
      }

      setAppError(`Correios: ${updatedCount} rastreio(s) atualizado(s), ${failedCount} sem retorno.`);
    } catch (error) {
      setAppError(error.message || 'Nao foi possivel atualizar os rastreios dos Correios.');
    } finally {
      setIsUpdatingCorreios(false);
    }
  }

  function toggleQuoteDetails(id) {
    setExpandedQuoteIds((current) =>
      current.includes(id) ? current.filter((quoteId) => quoteId !== id) : [...current, id],
    );
  }

  function changeLayoutMode(mode) {
    setLayoutMode(mode);
    setLayoutMenuOpen(false);
    setMainMenuOpen(false);
    if (mode !== 'complete') setActiveTab('abertas');
    if (mode === 'vovo' || mode === 'dashboard') setActiveView('quotes');

    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
    } catch {
      // Layout preference is optional; the app can run without localStorage.
    }
  }

  function navigateFromMenu(view) {
    setActiveView(view);
    setMainMenuOpen(false);
    setLayoutMenuOpen(false);
  }

  if (!authChecked || isLoading) {
    return (
      <main className="app-shell center-shell">
        <div className="loading-panel">
          <Database size={28} />
          <p>Carregando FollowUper...</p>
        </div>
      </main>
    );
  }

  if (isSupabaseConfigured && !user) {
    return <LoginScreen error={appError} onLogin={handleLogin} />;
  }

  return (
    <main className={`app-shell${layoutMode === 'dashboard' ? ' dashboard-shell' : ''}`}>
      <section className="topbar">
        {layoutMode !== 'dashboard' && (
          <div className="topbar-brand">
          <p className="eyebrow">Dashboard comercial</p>
          <button className="logo-button" type="button" aria-label="Voltar para cotações" onClick={() => setActiveView('quotes')}>
            <img className="app-logo header-logo" src="/followuper-logo.png" alt="FollowUper" />
          </button>
        </div>
        )}
        <div className="top-stack">
          {layoutMode !== 'complete' ? (
            <div className="session-actions">
              <div className="menu-dropdown-wrap">
                <button className="view-button" type="button" onClick={() => setMainMenuOpen((current) => !current)}>
                  <MenuIcon size={16} />
                  Menu
                </button>
                {mainMenuOpen && (
                  <div className="top-dropdown-menu">
                    {layoutMode !== 'vovo' && layoutMode !== 'dashboard' && (
                      <>
                        <button type="button" onClick={() => navigateFromMenu('quotes')}>
                          <FileText size={16} />
                          Cotações
                        </button>
                        <button type="button" onClick={() => navigateFromMenu('info')}>
                          <BookOpenText size={16} />
                          Painel de informações
                        </button>
                        <button type="button" onClick={() => navigateFromMenu('rotax')}>
                          <GraduationCap size={16} />
                          Treinamento Rotax
                        </button>
                        <button type="button" onClick={() => navigateFromMenu('tracking')}>
                          <Truck size={16} />
                          Rastreio
                        </button>
                        <hr />
                      </>
                    )}
                    <button type="button" onClick={() => changeLayoutMode('simple')}>
                      Layout simples
                    </button>
                    <button type="button" onClick={() => changeLayoutMode('vovo')}>
                      Layout vovô
                    </button>
                    <button type="button" onClick={() => changeLayoutMode('dashboard')}>
                      Layout dashboard
                    </button>
                    <button type="button" onClick={() => changeLayoutMode('complete')}>
                      Layout completa
                    </button>
                  </div>
                )}
              </div>
              {isSupabaseConfigured && (
                <button className="logout-button" type="button" onClick={handleSignOut}>
                  <LogOut size={16} />
                  Sair
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="session-actions">
                <span className="data-badge">
                  <Database size={15} />
                  {dataStatus}
                </span>
                <button
                  className="view-button"
                  type="button"
                  disabled={isUploadingQuotes}
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <Upload size={16} />
                  {isUploadingQuotes ? 'Importando...' : 'Upload'}
                </button>
                <button
                  className={activeView === 'quotes' ? 'view-button active' : 'view-button'}
                  type="button"
                  onClick={() => setActiveView('quotes')}
                >
                  <FileText size={16} />
                  Cotações
                </button>
                <button
                  className={activeView === 'info' ? 'view-button active' : 'view-button'}
                  type="button"
                  onClick={() => setActiveView('info')}
                >
                  <BookOpenText size={16} />
                  Painel de informações
                </button>
                <button
                  className={activeView === 'rotax' ? 'view-button active' : 'view-button'}
                  type="button"
                  onClick={() => setActiveView('rotax')}
                >
                  <GraduationCap size={16} />
                  Treinamento Rotax
                </button>
                <button
                  className={activeView === 'tracking' ? 'view-button active' : 'view-button'}
                  type="button"
                  onClick={() => setActiveView('tracking')}
                >
                  <Truck size={16} />
                  Rastreio
                </button>
                <div className="menu-dropdown-wrap">
                  <button className="view-button" type="button" onClick={() => setLayoutMenuOpen((current) => !current)}>
                    Layout
                  </button>
                  {layoutMenuOpen && (
                    <div className="top-dropdown-menu compact">
                      <button type="button" onClick={() => changeLayoutMode('simple')}>
                        Simples
                      </button>
                      <button type="button" onClick={() => changeLayoutMode('vovo')}>
                        Vovô
                      </button>
                      <button type="button" onClick={() => changeLayoutMode('dashboard')}>
                        Dashboard
                      </button>
                      <button type="button" onClick={() => changeLayoutMode('complete')}>
                        Completa
                      </button>
                    </div>
                  )}
                </div>
                {isSupabaseConfigured && (
                  <button className="logout-button" type="button" onClick={handleSignOut}>
                    <LogOut size={16} />
                    Sair
                  </button>
                )}
              </div>
              <div className="top-actions" aria-live="polite">
                <button
                  className="alert-tab"
                  type="button"
                  onClick={() => {
                    setActiveView('quotes');
                    setActiveTab('followup');
                  }}
                >
                  <Bell size={18} />
                  <span>({metrics.followUpDue}) Cotações precisam de Follow-up</span>
                </button>
                <button
                  className="alert-tab muted"
                  type="button"
                  onClick={() => {
                    setActiveView('quotes');
                    setActiveTab('abertas');
                  }}
                >
                  <AlertTriangle size={18} />
                  <span>({metrics.unchangedStatus}) Cotações sem alteração de status</span>
                </button>
                <button
                  className="alert-tab freight"
                  type="button"
                  onClick={() => {
                    setActiveView('tracking');
                    setActiveTrackingTab('Em andamento');
                  }}
                >
                  <PackageSearch size={18} />
                  <span>({trackingMetrics.withoutCode}) fretes sem rastreio</span>
                </button>
              </div>
            </>
          )}
        </div>
      </section>
      <input ref={uploadInputRef} accept=".xlsx" hidden type="file" onChange={handleQuotesUpload} />

      {appError && <div className="app-alert">{appError}</div>}

      {layoutMode === 'dashboard' ? (
        <SalesDashboard quotes={quotes} saleCelebration={saleCelebration} />
      ) : layoutMode === 'vovo' ? (
        <GrandpaWorkspace
          errors={grandpaErrors}
          form={grandpaForm}
          onSubmit={submitGrandpaForm}
          onUpdate={updateGrandpaForm}
        />
      ) : activeView === 'quotes' ? (
        <QuotesWorkspace
          activeTab={activeTab}
          errors={errors}
          form={form}
          metrics={metrics}
          isSimpleLayout={layoutMode === 'simple'}
          now={now}
          onArchiveQuote={archiveQuote}
          onChangeStatus={changeStatus}
          onEditQuote={openQuoteEditModal}
          onRemoveQuote={removeQuote}
          onRestartFollowUp={restartFollowUp}
          onSubmit={handleSubmit}
          onUpdateForm={updateForm}
          openCloseModal={openCloseModal}
          expandedQuoteIds={expandedQuoteIds}
          searchTerm={searchTerm}
          selectedSellers={selectedSellers}
          sortByRelevance={sortByRelevance}
          setActiveTab={setActiveTab}
          setActiveView={setActiveView}
          setSearchTerm={setSearchTerm}
          setSortByRelevance={setSortByRelevance}
          onChangeSellerFilter={changeSellerFilter}
          onToggleSellerFilter={toggleSellerFilter}
          onToggleQuoteDetails={toggleQuoteDetails}
          visibleQuotes={visibleQuotes}
        />
      ) : activeView === 'tracking' ? (
        <TrackingWorkspace
          activeTrackingTab={activeTrackingTab}
          entries={visibleTrackingEntries}
          metrics={trackingMetrics}
          correiosCandidateCount={correiosTrackingCandidates.length}
          isUpdatingCorreios={isUpdatingCorreios}
          onEdit={openTrackingModal}
          onRemove={removeTrackingEntry}
          onAddStandalone={openStandaloneTrackingModal}
          onUpdateCorreiosStatuses={updateCorreiosStatuses}
          setActiveTrackingTab={setActiveTrackingTab}
          setActiveView={setActiveView}
          searchTerm={trackingSearchTerm}
          setSearchTerm={setTrackingSearchTerm}
        />
      ) : activeView === 'rotax' ? (
        <RotaxTrainingWorkspace
          activeInfoCategory={activeRotaxInfoCategory}
          activeSessionId={activeRotaxSessionId}
          activeTab={activeRotaxTab}
          allStudents={rotaxStudents}
          blocks={activeRotaxBlocks}
          contacts={rotaxContacts}
          expandedStudentIds={expandedRotaxStudentIds}
          metrics={rotaxMetrics}
          onAddBlock={addRotaxBlock}
          onAddContact={() => openRotaxContactModal()}
          onAddSession={openRotaxSessionModal}
          onAddStudent={() => openRotaxStudentModal()}
          onChangeBlock={changeRotaxBlock}
          onEditContact={openRotaxContactModal}
          onEditStudent={openRotaxStudentModal}
          onRemoveBlock={removeRotaxBlock}
          onRemoveContact={removeRotaxContact}
          onRemoveStudent={removeRotaxStudent}
          onSaveBlock={saveRotaxBlock}
          onToggleStudentDetails={toggleRotaxStudentDetails}
          sessions={rotaxSessions}
          setActiveInfoCategory={setActiveRotaxInfoCategory}
          setActiveSessionId={setActiveRotaxSessionId}
          setActiveTab={setActiveRotaxTab}
          setActiveView={setActiveView}
          students={visibleRotaxStudents}
        />
      ) : (
        <InfoPanel
          blocks={infoBlocks}
          onAddBlock={addInfoBlock}
          onChangeBlock={changeInfoBlock}
          onRemoveBlock={removeInfoBlock}
          onReorderBlocks={reorderInfoBlocks}
          onSaveBlock={saveInfoBlock}
          setActiveView={setActiveView}
        />
      )}

      {closeModal && (
        <CloseQuoteModal
          closeDetails={closeDetails}
          closeErrors={closeErrors}
          closeModal={closeModal}
          onCancel={cancelCloseModal}
          onSubmit={confirmCloseQuote}
          onUpdate={updateCloseDetails}
        />
      )}

      {quoteEditModal && (
        <QuoteEditModal
          errors={quoteEditErrors}
          form={quoteEditForm}
          onCancel={cancelQuoteEditModal}
          onSubmit={saveQuoteEditForm}
          onUpdate={updateQuoteEditForm}
        />
      )}

      {trackingModal && (
        <TrackingEditModal
          errors={trackingFormErrors}
          form={trackingForm}
          entry={trackingModal}
          onCancel={cancelTrackingModal}
          onSubmit={saveTrackingForm}
          onUpdate={updateTrackingForm}
        />
      )}

      {standaloneTrackingModal && (
        <TrackingEditModal
          errors={trackingFormErrors}
          form={trackingForm}
          entry={null}
          isStandalone
          onCancel={cancelTrackingModal}
          onSubmit={saveStandaloneTrackingForm}
          onUpdate={updateTrackingForm}
        />
      )}

      {rotaxSessionModalOpen && (
        <RotaxSessionModal
          errors={rotaxSessionErrors}
          form={rotaxSessionForm}
          onCancel={() => setRotaxSessionModalOpen(false)}
          onSubmit={submitRotaxSession}
          onUpdate={(field, value) => {
            setRotaxSessionForm((current) => ({ ...current, [field]: value }));
            setRotaxSessionErrors((current) => ({ ...current, [field]: '' }));
          }}
        />
      )}

      {rotaxStudentModal && (
        <RotaxStudentModal
          errors={rotaxStudentErrors}
          form={rotaxStudentForm}
          isEditing={Boolean(rotaxStudentModal.id)}
          onCancel={() => setRotaxStudentModal(null)}
          onSubmit={submitRotaxStudent}
          onToggleTrainingType={toggleRotaxTrainingType}
          onUpdate={updateRotaxStudentForm}
          sessions={rotaxSessions}
        />
      )}

      {rotaxContactModal && (
        <RotaxContactModal
          errors={rotaxContactErrors}
          form={rotaxContactForm}
          isEditing={Boolean(rotaxContactModal.id)}
          onCancel={() => setRotaxContactModal(null)}
          onSubmit={submitRotaxContact}
          onUpdate={updateRotaxContactForm}
          sessions={rotaxSessions}
        />
      )}
    </main>
  );
}

function splitToggleContent(content = '') {
  const [title = '', ...body] = content.split('\n');
  return { title, body: body.join('\n') };
}

function joinToggleContent(title, body) {
  return `${title || ''}${body ? `\n${body}` : ''}`;
}

function safeParseInfoContent(content, fallback) {
  try {
    return content ? { ...fallback, ...JSON.parse(content) } : fallback;
  } catch {
    return fallback;
  }
}

function getDefaultInfoBlockContent(type) {
  if (type === 'image') return JSON.stringify({ src: '', name: '', caption: '' });
  if (type === 'link') return JSON.stringify({ url: '', label: '' });
  if (type === 'table') return JSON.stringify({ headers: ['Coluna 1', 'Coluna 2'], rows: [['', '']] });
  if (type === 'sidebar') return JSON.stringify({ title: '', body: '' });
  return '';
}

function getNextInfoBlockPosition(blocks, afterBlockId) {
  const sortedBlocks = sortInfoBlocks(blocks);

  if (!afterBlockId) {
    return sortedBlocks.length ? Math.max(...sortedBlocks.map((block) => block.position || 0)) + 1 : 1;
  }

  const blockIndex = sortedBlocks.findIndex((block) => block.id === afterBlockId);
  if (blockIndex === -1) return getNextInfoBlockPosition(blocks, null);

  const currentPosition = sortedBlocks[blockIndex].position || blockIndex + 1;
  const nextPosition = sortedBlocks[blockIndex + 1]?.position;
  return nextPosition ? (currentPosition + nextPosition) / 2 : currentPosition + 1;
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function buildImageBlockContent(file, src) {
  return JSON.stringify({ src, name: file.name, caption: '' });
}

function normalizeInfoLink(url) {
  const trimmedUrl = (url || '').trim();
  if (!trimmedUrl) return '';
  return /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
}

function SalesDashboard({ quotes, saleCelebration }) {
  const [relevantPage, setRelevantPage] = useState(0);
  const [dollarQuote, setDollarQuote] = useState({ error: '', updatedAt: '', value: null });
  const activeQuotes = quotes.filter((quote) => !isArchived(quote));
  const openQuotes = activeQuotes.filter((quote) => !isClosed(quote));
  const closedQuotes = activeQuotes.filter(isClosed);
  const totalQuotes = openQuotes.length + closedQuotes.length;
  const closedPercent = getPercent(closedQuotes.length, totalQuotes);
  const openPercent = getPercent(openQuotes.length, totalQuotes);
  const totalOpenValue = openQuotes.reduce((sum, quote) => sum + getQuoteNumericValue(quote), 0);
  const totalClosedValue = closedQuotes.reduce((sum, quote) => sum + getQuoteNumericValue(quote), 0);
  const totalClosedCount = closedQuotes.length;
  const sortedRelevantQuotes = [...activeQuotes]
    .sort((a, b) => {
      const starDiff = getQuoteInterestStars(b) - getQuoteInterestStars(a);
      if (starDiff !== 0) return starDiff;
      return getQuoteNumericValue(b) - getQuoteNumericValue(a);
    });
  const relevantPageSize = 5;
  const relevantPageCount = Math.max(1, Math.ceil(sortedRelevantQuotes.length / relevantPageSize));
  const currentRelevantPage = relevantPage % relevantPageCount;
  const relevantQuotes =
    sortedRelevantQuotes.length <= relevantPageSize
      ? sortedRelevantQuotes
      : Array.from({ length: relevantPageSize }, (_, index) => {
          const quoteIndex = (currentRelevantPage * relevantPageSize + index) % sortedRelevantQuotes.length;
          return sortedRelevantQuotes[quoteIndex];
        });
  const visibleRelevantQuotes = relevantQuotes.filter(Boolean).slice(0, relevantPageSize);

  const sellerStats = sellers.map((seller) => {
    const sellerQuotes = activeQuotes.filter((quote) => quote.seller === seller);
    const sellerClosed = sellerQuotes.filter(isClosed);
    const closedValue = sellerClosed.reduce((sum, quote) => sum + getQuoteNumericValue(quote), 0);

    return {
      seller,
      closedCount: sellerClosed.length,
      closedCountPercent: getPercent(sellerClosed.length, totalClosedCount),
      closedValue,
      closedValuePercent: getPercent(closedValue, totalClosedValue),
      openCount: sellerQuotes.length - sellerClosed.length,
      totalCount: sellerQuotes.length,
    };
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRelevantPage((currentPage) => currentPage + 1);
    }, 12000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDollarQuote() {
      try {
        const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
        if (!response.ok) throw new Error('cotacao_indisponivel');
        const data = await response.json();
        const quote = data?.USDBRL;
        const value = Number.parseFloat(quote?.bid);
        if (!Number.isFinite(value)) throw new Error('cotacao_invalida');

        if (active) {
          setDollarQuote({
            error: '',
            updatedAt: quote?.create_date || new Date().toISOString(),
            value,
          });
        }
      } catch {
        if (active) {
          setDollarQuote((currentQuote) => ({
            ...currentQuote,
            error: currentQuote.value ? 'Atualizacao indisponivel' : 'Cotacao indisponivel',
          }));
        }
      }
    }

    loadDollarQuote();
    const timer = window.setInterval(loadDollarQuote, 5 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="sales-dashboard">
      {saleCelebration && <FireworksCelebration sale={saleCelebration} />}

      <div className="dashboard-header">
        <div className="dashboard-clock">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}</div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-card quotes-chart-card">
          <div className="dashboard-card-title">
            <h3>Orçamentos por vendedor</h3>
            <strong>{totalQuotes}</strong>
          </div>
          <div className="seller-bars">
            {sellerStats.map((stat) => {
              const closedWidth = getPercent(stat.closedCount, stat.totalCount);
              const openWidth = getPercent(stat.openCount, stat.totalCount);
              return (
                <div className="seller-bar-row" key={stat.seller}>
                  <div className="seller-bar-label">
                    <b>{stat.seller}</b>
                    <span>{stat.totalCount} orçamento(s)</span>
                  </div>
                  <div className="seller-bar-track">
                    <span className="seller-bar-open" style={{ width: `${openWidth}%` }} />
                    <span className="seller-bar-closed" style={{ width: `${closedWidth}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="dollar-quote-card">
            <span>Dolar comercial</span>
            <strong>{dollarQuote.value ? formatCurrencyValue(dollarQuote.value) : '--'}</strong>
            <small>
              {dollarQuote.error ||
                (dollarQuote.updatedAt
                  ? `Atualizado ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
                      new Date(dollarQuote.updatedAt.replace(' ', 'T')),
                    )}`
                  : 'Atualiza a cada 5 min')}
            </small>
          </div>
        </section>

        <section className="dashboard-card pie-card">
          <div className="dashboard-card-title">
            <h3>Abertos x fechados</h3>
          </div>
          <div
            className="quote-pie"
            style={{
              background: `conic-gradient(#22c55e 0 ${closedPercent}%, #facc15 ${closedPercent}% 100%)`,
            }}
          >
            <div>
              <strong>{closedPercent}%</strong>
              <span>fechados</span>
            </div>
          </div>
          <div className="pie-legend">
            <span>
              <i className="dot yellow" /> Sem finalizar: {openQuotes.length} ({openPercent}%)
            </span>
            <span>
              <i className="dot green" /> Fechados: {closedQuotes.length} ({closedPercent}%)
            </span>
          </div>
        </section>

        <section className="dashboard-card relevant-card">
          <div className="dashboard-card-title">
            <h3>Orçamentos relevantes</h3>
          </div>
          <div className="relevant-list">
            {visibleRelevantQuotes.map((quote) => {
              const stars = getQuoteInterestStars(quote);
              return (
                <div className="relevant-item" key={quote.id}>
                  <div>
                    <b>{quote.quoteNumber}</b>
                    <span>{quote.clientName}</span>
                  </div>
                  <div className="relevant-value">
                    <span>{formatCurrencyValue(getQuoteNumericValue(quote))}</span>
                    <span className="relevant-stars">
                      {Array.from({ length: stars }).map((_, index) => (
                        <Star key={`${quote.id}-dashboard-star-${index}`} size={15} fill="currentColor" />
                      ))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="dashboard-totals">
        <div className="dashboard-total-card open">
          <span>Total em aberto</span>
          <strong>{formatCurrencyValue(totalOpenValue)}</strong>
        </div>
        <div className="dashboard-total-card closed">
          <span>Total fechado</span>
          <strong>{formatCurrencyValue(totalClosedValue)}</strong>
        </div>
      </div>

      <section className="dashboard-gauges">
        <div className="dashboard-gauge-section">
          <h3>Participação por pedidos fechados</h3>
          <div className="gauge-grid">
            {sellerStats.map((stat) => (
              <SellerGauge key={`count-${stat.seller}`} label={stat.seller} percent={stat.closedCountPercent} value={`${stat.closedCount} pedido(s)`} />
            ))}
          </div>
        </div>
        <div className="dashboard-gauge-section">
          <h3>Participação por valor fechado</h3>
          <div className="gauge-grid">
            {sellerStats.map((stat) => (
              <SellerGauge
                key={`value-${stat.seller}`}
                label={stat.seller}
                percent={stat.closedValuePercent}
                value={formatCurrencyValue(stat.closedValue)}
              />
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

function SellerGauge({ label, percent, value }) {
  const gaugeDegrees = `${Math.min(Math.max(percent, 0), 100) * 1.8}deg`;

  return (
    <div className="seller-gauge">
      <div className="seller-gauge-meter" style={{ '--gauge-deg': gaugeDegrees }}>
        <span className="seller-gauge-needle" />
      </div>
      <div className="seller-gauge-info">
        <b>{label}</b>
        <strong>{percent}%</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}

function FireworksCelebration({ sale }) {
  return (
    <div className="fireworks-overlay" aria-live="polite">
      <img className="fireworks-gif" src="/fireworks.gif" alt="" aria-hidden="true" />
      <div className="sale-celebration-card">
        <p>Venda fechada</p>
        <strong>{sale.seller}</strong>
        <span>{sale.value}</span>
      </div>
    </div>
  );
}

function InfoPanel({ blocks, onAddBlock, onChangeBlock, onRemoveBlock, onReorderBlocks, onSaveBlock, setActiveView }) {
  const [draggedBlockId, setDraggedBlockId] = useState(null);
  const [dragOverBlockId, setDragOverBlockId] = useState(null);
  const [menuTarget, setMenuTarget] = useState(null);
  const [pendingImageTarget, setPendingImageTarget] = useState(null);
  const pendingImageTargetRef = useRef(null);
  const imageInputRef = useRef(null);

  function getAfterBlockId(targetId) {
    return targetId && targetId !== 'top' ? targetId : null;
  }

  function handleAddBlock(type, targetId = menuTarget || 'top') {
    if (type === 'image') {
      setPendingImageTarget(targetId);
      pendingImageTargetRef.current = targetId;
      imageInputRef.current?.click();
      return;
    }

    onAddBlock(type, { afterBlockId: getAfterBlockId(targetId) });
    setMenuTarget(null);
  }

  async function handleImageFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const src = await readImageFileAsDataUrl(file);
    onAddBlock('image', {
      afterBlockId: getAfterBlockId(pendingImageTargetRef.current || pendingImageTarget),
      content: buildImageBlockContent(file, src),
    });
    setMenuTarget(null);
    setPendingImageTarget(null);
    pendingImageTargetRef.current = null;
    event.target.value = '';
  }

  function isDragIgnored(target) {
    return Boolean(target.closest('input, textarea, select, button, a, label, [contenteditable="true"]'));
  }

  function handleBlockDragStart(event, blockId) {
    if (isDragIgnored(event.target)) {
      event.preventDefault();
      return;
    }

    setDraggedBlockId(blockId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', blockId);
  }

  function handleBlockDragOver(event, blockId) {
    const currentDraggedId = draggedBlockId || event.dataTransfer.getData('text/plain');
    if (!currentDraggedId || currentDraggedId === blockId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverBlockId(blockId);
  }

  function handleBlockDrop(event, blockId) {
    event.preventDefault();
    const currentDraggedId = draggedBlockId || event.dataTransfer.getData('text/plain');
    setDraggedBlockId(null);
    setDragOverBlockId(null);
    if (!currentDraggedId || currentDraggedId === blockId) return;

    const blockRect = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY > blockRect.top + blockRect.height / 2 ? 'after' : 'before';
    onReorderBlocks(currentDraggedId, blockId, placement);
  }

  function handleBlockDragEnd() {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }

  function renderAddControl(targetId, isInline = false) {
    const isOpen = menuTarget === targetId;

    return (
      <div className={isInline ? 'info-add-row inline' : 'info-add-row'}>
        <button
          className="info-add-button"
          type="button"
          aria-label="Adicionar bloco"
          onClick={() => setMenuTarget((current) => (current === targetId ? null : targetId))}
        >
          <Plus size={18} />
        </button>
        {isOpen && (
          <div className="info-block-menu">
            {infoBlockTypes.map((blockType) => {
              const Icon = blockType.icon;
              return (
                <button key={blockType.value} type="button" onClick={() => handleAddBlock(blockType.value, targetId)}>
                  <Icon size={17} />
                  {blockType.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="info-panel">
      <div className="panel-toolbar info-toolbar">
        <div className="section-title">
          <BookOpenText size={20} />
          <h2>Painel de informações</h2>
        </div>
        <button className="secondary-button compact" type="button" onClick={() => setActiveView('quotes')}>
          <FileText size={16} />
          Cotações
        </button>
      </div>

      <div className="info-document">
        {renderAddControl('top')}
        <input ref={imageInputRef} accept="image/*" hidden type="file" onChange={handleImageFileChange} />

        {blocks.length === 0 ? (
          <div className="info-empty-state">
            <BookOpenText size={30} />
            <p>Adicione o primeiro bloco pelo botão +.</p>
          </div>
        ) : (
          <div className="info-block-list">
            {blocks.map((block) => (
              <React.Fragment key={block.id}>
                <InfoBlock
                  block={block}
                  isDragTarget={dragOverBlockId === block.id}
                  isDragging={draggedBlockId === block.id}
                  onChangeBlock={onChangeBlock}
                  onDragEnd={handleBlockDragEnd}
                  onDragOver={handleBlockDragOver}
                  onDragStart={handleBlockDragStart}
                  onDrop={handleBlockDrop}
                  onRemoveBlock={onRemoveBlock}
                  onSaveBlock={onSaveBlock}
                />
                {renderAddControl(block.id, true)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function InfoBlock({
  block,
  isDragging = false,
  isDragTarget = false,
  onChangeBlock,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onRemoveBlock,
  onSaveBlock,
}) {
  const blockType = infoBlockTypes.find((item) => item.value === block.type) || infoBlockTypes[0];
  const Icon = blockType.icon;
  const dragClassName = `${isDragging ? ' dragging' : ''}${isDragTarget ? ' drag-over' : ''}`;
  const dragProps = {
    draggable: true,
    onDragEnd,
    onDragOver: (event) => onDragOver(event, block.id),
    onDragStart: (event) => onDragStart(event, block.id),
    onDrop: (event) => onDrop(event, block.id),
  };
  const toggleContent = block.type === 'toggle' ? splitToggleContent(block.content) : null;
  const imageContent = block.type === 'image' ? safeParseInfoContent(block.content, { src: '', name: '', caption: '' }) : null;
  const linkContent = block.type === 'link' ? safeParseInfoContent(block.content, { url: '', label: '' }) : null;
  const tableContent =
    block.type === 'table' ? safeParseInfoContent(block.content, { headers: ['Coluna 1', 'Coluna 2'], rows: [['', '']] }) : null;
  const sidebarContent = block.type === 'sidebar' ? safeParseInfoContent(block.content, { title: '', body: '' }) : null;

  function updateContent(content) {
    onChangeBlock(block.id, { content });
  }

  function saveContent(content = block.content) {
    onSaveBlock(block.id, { content });
  }

  function updateJsonContent(nextContent) {
    const content = JSON.stringify(nextContent);
    updateContent(content);
    return content;
  }

  function saveJsonContent(nextContent) {
    onSaveBlock(block.id, { content: JSON.stringify(nextContent) });
  }

  async function replaceImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const src = await readImageFileAsDataUrl(file);
    const content = buildImageBlockContent(file, src);
    updateContent(content);
    saveContent(content);
    event.target.value = '';
  }

  function updateTableHeader(index, value) {
    const headers = [...tableContent.headers];
    headers[index] = value;
    updateJsonContent({ ...tableContent, headers });
  }

  function updateTableCell(rowIndex, columnIndex, value) {
    const rows = tableContent.rows.map((row) => [...row]);
    rows[rowIndex][columnIndex] = value;
    updateJsonContent({ ...tableContent, rows });
  }

  function addTableRow() {
    const rows = [...tableContent.rows, tableContent.headers.map(() => '')];
    saveJsonContent({ ...tableContent, rows });
  }

  function addTableColumn() {
    const headers = [...tableContent.headers, `Coluna ${tableContent.headers.length + 1}`];
    const rows = tableContent.rows.map((row) => [...row, '']);
    saveJsonContent({ ...tableContent, headers, rows });
  }

  if (block.type === 'divider') {
    return (
      <div className={`info-block info-divider-block${dragClassName}`} {...dragProps}>
        <div className="info-block-handle">
          <Minus size={16} />
        </div>
        <hr />
        <button className="info-delete-button" type="button" aria-label="Remover bloco" onClick={() => onRemoveBlock(block.id)}>
          <Trash2 size={15} />
        </button>
      </div>
    );
  }

  if (block.type === 'toggle') {
    return (
      <div className={`info-block${dragClassName}`} {...dragProps}>
        <button
          className={block.isOpen ? 'toggle-control open' : 'toggle-control'}
          type="button"
          aria-label={block.isOpen ? 'Recolher alternante' : 'Expandir alternante'}
          onClick={() => {
            const nextOpen = !block.isOpen;
            onChangeBlock(block.id, { isOpen: nextOpen });
            onSaveBlock(block.id, { isOpen: nextOpen });
          }}
        >
          <ChevronRight size={17} />
        </button>
        <div className="info-block-content">
          <input
            className="info-toggle-title"
            value={toggleContent.title}
            onBlur={() => saveContent(joinToggleContent(toggleContent.title, toggleContent.body))}
            onChange={(event) => updateContent(joinToggleContent(event.target.value, toggleContent.body))}
            placeholder={blockType.placeholder}
          />
          {block.isOpen && (
            <textarea
              className="info-block-input"
              value={toggleContent.body}
              onBlur={() => saveContent(joinToggleContent(toggleContent.title, toggleContent.body))}
              onChange={(event) => updateContent(joinToggleContent(toggleContent.title, event.target.value))}
              placeholder="Conteúdo do alternante"
              rows="3"
            />
          )}
        </div>
        <button className="info-delete-button" type="button" aria-label="Remover bloco" onClick={() => onRemoveBlock(block.id)}>
          <Trash2 size={15} />
        </button>
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div className={`info-block info-image-block${dragClassName}`} {...dragProps}>
        <div className="info-block-handle">
          <ImageIcon size={16} />
        </div>
        <div className="info-block-content">
          {imageContent.src ? (
            <img className="info-image-preview" src={imageContent.src} alt={imageContent.caption || imageContent.name || 'Imagem'} />
          ) : (
            <div className="info-image-placeholder">Nenhuma imagem selecionada</div>
          )}
          <div className="info-inline-actions">
            <label className="secondary-button compact">
              <ImageIcon size={15} />
              Trocar imagem
              <input accept="image/*" hidden type="file" onChange={replaceImage} />
            </label>
          </div>
          <input
            className="info-block-input"
            value={imageContent.caption}
            onBlur={() => saveJsonContent(imageContent)}
            onChange={(event) => updateJsonContent({ ...imageContent, caption: event.target.value })}
            placeholder="Legenda da imagem"
          />
        </div>
        <button className="info-delete-button" type="button" aria-label="Remover bloco" onClick={() => onRemoveBlock(block.id)}>
          <Trash2 size={15} />
        </button>
      </div>
    );
  }

  if (block.type === 'link') {
    const href = normalizeInfoLink(linkContent.url);

    return (
      <div className={`info-block info-link-block${dragClassName}`} {...dragProps}>
        <div className="info-block-handle">
          <LinkIcon size={16} />
        </div>
        <div className="info-block-content">
          <input
            className="info-toggle-title"
            value={linkContent.label}
            onBlur={() => saveJsonContent(linkContent)}
            onChange={(event) => updateJsonContent({ ...linkContent, label: event.target.value })}
            placeholder="Texto do link"
          />
          <input
            className="info-block-input"
            value={linkContent.url}
            onBlur={() => saveJsonContent(linkContent)}
            onChange={(event) => updateJsonContent({ ...linkContent, url: event.target.value })}
            placeholder={blockType.placeholder}
          />
          {href && (
            <a className="info-link-preview" href={href} rel="noreferrer" target="_blank">
              {linkContent.label || href}
            </a>
          )}
        </div>
        <button className="info-delete-button" type="button" aria-label="Remover bloco" onClick={() => onRemoveBlock(block.id)}>
          <Trash2 size={15} />
        </button>
      </div>
    );
  }

  if (block.type === 'table') {
    return (
      <div className={`info-block info-table-block${dragClassName}`} {...dragProps}>
        <div className="info-block-handle">
          <Table2 size={16} />
        </div>
        <div className="info-block-content">
          <div className="info-edit-table-wrap">
            <table className="info-edit-table">
              <thead>
                <tr>
                  {tableContent.headers.map((header, index) => (
                    <th key={`header-${index}`}>
                      <input
                        value={header}
                        onBlur={() => saveJsonContent(tableContent)}
                        onChange={(event) => updateTableHeader(index, event.target.value)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableContent.rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {tableContent.headers.map((_, columnIndex) => (
                      <td key={`cell-${rowIndex}-${columnIndex}`}>
                        <input
                          value={row[columnIndex] || ''}
                          onBlur={() => saveJsonContent(tableContent)}
                          onChange={(event) => updateTableCell(rowIndex, columnIndex, event.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="info-inline-actions">
            <button className="secondary-button compact" type="button" onClick={addTableRow}>
              <Plus size={15} />
              Linha
            </button>
            <button className="secondary-button compact" type="button" onClick={addTableColumn}>
              <Plus size={15} />
              Coluna
            </button>
          </div>
        </div>
        <button className="info-delete-button" type="button" aria-label="Remover bloco" onClick={() => onRemoveBlock(block.id)}>
          <Trash2 size={15} />
        </button>
      </div>
    );
  }

  if (block.type === 'sidebar') {
    return (
      <div className={`info-block info-sidebar-block${dragClassName}`} {...dragProps}>
        <div className="info-block-handle">
          <PanelLeft size={16} />
        </div>
        <div className="info-sidebar-box">
          <input
            className="info-toggle-title"
            value={sidebarContent.title}
            onBlur={() => saveJsonContent(sidebarContent)}
            onChange={(event) => updateJsonContent({ ...sidebarContent, title: event.target.value })}
            placeholder={blockType.placeholder}
          />
          <textarea
            className="info-block-input"
            value={sidebarContent.body}
            onBlur={() => saveJsonContent(sidebarContent)}
            onChange={(event) => updateJsonContent({ ...sidebarContent, body: event.target.value })}
            placeholder="Conteúdo da barra lateral"
            rows="4"
          />
        </div>
        <button className="info-delete-button" type="button" aria-label="Remover bloco" onClick={() => onRemoveBlock(block.id)}>
          <Trash2 size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className={`info-block ${block.type === 'title' ? 'title-block' : ''} ${block.type === 'bullet' ? 'bullet-block' : ''}${dragClassName}`} {...dragProps}>
      <div className="info-block-handle">
        <Icon size={16} />
      </div>
      {block.type === 'bullet' && <span className="bullet-marker">•</span>}
      {block.type === 'title' ? (
        <input
          className="info-title-input"
          value={block.content}
          onBlur={() => saveContent()}
          onChange={(event) => updateContent(event.target.value)}
          placeholder={blockType.placeholder}
        />
      ) : (
        <textarea
          className="info-block-input"
          value={block.content}
          onBlur={() => saveContent()}
          onChange={(event) => updateContent(event.target.value)}
          placeholder={blockType.placeholder}
          rows={block.type === 'bullet' ? '1' : '2'}
        />
      )}
      <button className="info-delete-button" type="button" aria-label="Remover bloco" onClick={() => onRemoveBlock(block.id)}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function GrandpaWorkspace({ errors, form, onSubmit, onUpdate }) {
  return (
    <section className="grandpa-panel">
      <form className="grandpa-form" onSubmit={onSubmit} noValidate>
        <div className="section-title grandpa-title">
          <FileText size={24} />
          <h2>Atualizar orçamento</h2>
        </div>

        <label>
          Número do orçamento
          <input
            autoFocus
            value={form.quoteNumber}
            onChange={(event) => onUpdate('quoteNumber', event.target.value)}
            placeholder="Ex: 228916"
          />
          {errors.quoteNumber && <small>{errors.quoteNumber}</small>}
        </label>

        <label>
          Nome
          <input
            value={form.clientName}
            onChange={(event) => onUpdate('clientName', event.target.value)}
            placeholder="Nome do cliente"
          />
          {errors.clientName && <small>{errors.clientName}</small>}
        </label>

        <label>
          Telefone
          <input
            value={form.phone}
            onChange={(event) => onUpdate('phone', event.target.value)}
            placeholder="Telefone do cliente"
          />
        </label>

        <label>
          Condição de pagamento
          <input
            value={form.paymentTerms}
            onChange={(event) => onUpdate('paymentTerms', event.target.value)}
            placeholder="Opcional"
          />
        </label>

        <button className="primary-button grandpa-submit" type="submit">
          Enviar
        </button>
      </form>
    </section>
  );
}

function QuotesWorkspace({
  activeTab,
  errors,
  form,
  isSimpleLayout,
  metrics,
  now,
  onArchiveQuote,
  onChangeStatus,
  onEditQuote,
  onRemoveQuote,
  onRestartFollowUp,
  onSubmit,
  onUpdateForm,
  openCloseModal,
  expandedQuoteIds,
  searchTerm,
  selectedSellers,
  sortByRelevance,
  setActiveTab,
  setActiveView,
  setSearchTerm,
  setSortByRelevance,
  onChangeSellerFilter,
  onToggleSellerFilter,
  onToggleQuoteDetails,
  visibleQuotes,
}) {
  return (
    <section className="workspace-grid">
      <form className="quote-form" onSubmit={onSubmit} noValidate>
        <div className="section-title">
          <FileText size={20} />
          <h2>Nova cotação</h2>
        </div>

        <label>
          Nº cotação
          <input
            value={form.quoteNumber}
            onChange={(event) => onUpdateForm('quoteNumber', event.target.value)}
            placeholder="Ex: 10482"
          />
          {errors.quoteNumber && <small>{errors.quoteNumber}</small>}
        </label>

        <label>
          Nome do cliente
          <input
            value={form.clientName}
            onChange={(event) => onUpdateForm('clientName', event.target.value)}
            placeholder="Ex: ACME Ltda."
          />
          {errors.clientName && <small>{errors.clientName}</small>}
        </label>

        <label>
          Telefone
          <input
            value={form.phone}
            onChange={(event) => onUpdateForm('phone', event.target.value)}
            placeholder="Telefone do cliente"
          />
        </label>

        <label>
          Valor
          <input
            value={form.quoteValue}
            onChange={(event) => onUpdateForm('quoteValue', event.target.value)}
            placeholder="Opcional"
          />
        </label>

        <label>
          Condição de pagamento
          <input
            value={form.paymentTerms}
            onChange={(event) => onUpdateForm('paymentTerms', event.target.value)}
            placeholder="Opcional"
          />
        </label>

        <div className="form-pair">
          <label>
            Data de cotação
            <input type="date" value={form.quoteDate} onChange={(event) => onUpdateForm('quoteDate', event.target.value)} />
            {errors.quoteDate && <small>{errors.quoteDate}</small>}
          </label>

          <div className="followup-input-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.followUpUsesTime}
                onChange={(event) => onUpdateForm('followUpUsesTime', event.target.checked)}
              />
              Tempo
            </label>
            <label>
              {form.followUpUsesTime ? 'Follow-up em tempo' : 'Follow-up em dias'}
              <div className="inline-field-pair">
                <input
                  type="number"
                  min="1"
                  value={form.followUpAmount}
                  onChange={(event) => onUpdateForm('followUpAmount', event.target.value)}
                />
                {form.followUpUsesTime && (
                  <select value={form.followUpUnit} onChange={(event) => onUpdateForm('followUpUnit', event.target.value)}>
                    <option value="hours">Horas</option>
                    <option value="minutes">Minutos</option>
                  </select>
                )}
              </div>
              {errors.followUpAmount && <small>{errors.followUpAmount}</small>}
            </label>
          </div>
        </div>

        <label>
          Vendedor
          <select value={form.seller} onChange={(event) => onUpdateForm('seller', event.target.value)}>
            {sellers.map((seller) => (
              <option key={seller} value={seller}>
                {seller}
              </option>
            ))}
          </select>
          {errors.seller && <small>{errors.seller}</small>}
        </label>

        <label className="checkbox-label interest-checkbox">
          <input
            type="checkbox"
            checked={form.isInterest}
            onChange={(event) => onUpdateForm('isInterest', event.target.checked)}
          />
          Cotação de interesse
        </label>

        <label>
          Obs.
          <textarea
            value={form.notes}
            onChange={(event) => onUpdateForm('notes', event.target.value)}
            placeholder="Observações da cotação"
            rows="4"
          />
        </label>

        <button className="primary-button" type="submit">
          <Plus size={18} />
          Adicionar cotação
        </button>
      </form>

      <section className="quotes-panel">
        <div className="panel-toolbar">
          <div className="section-title">
            <CircleDot size={20} />
            <h2>Cotações</h2>
          </div>
          <div className="panel-actions">
            {!isSimpleLayout && (
              <button className="secondary-button compact" type="button" onClick={() => setActiveView('tracking')}>
                <Truck size={16} />
                Rastreio
              </button>
            )}
            <label className="search-box">
              <Search size={18} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por cliente ou Nº cotação"
              />
            </label>
          </div>
        </div>

        {isSimpleLayout ? (
          <div className="simple-filters">
            <label>
              Categoria
              <select value={activeTab} onChange={(event) => setActiveTab(event.target.value)}>
                {simpleTabs.map((tab) => (
                  <option key={tab.value} value={tab.value}>
                    {tab.label} ({metrics[tab.value]})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vendedor
              <select value={selectedSellers[0] || ''} onChange={(event) => onChangeSellerFilter(event.target.value)}>
                <option value="">Todos</option>
                {sellers.map((seller) => (
                  <option key={seller} value={seller}>
                    {seller}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label compact-checkbox relevance-filter simple-relevance-filter">
              <input
                type="checkbox"
                checked={sortByRelevance}
                onChange={(event) => setSortByRelevance(event.target.checked)}
              />
              Relevância
            </label>
          </div>
        ) : (
          <>
            <div className="tabs" role="tablist" aria-label="Categorias de cotações">
              {tabs.map((tab) => (
                <button
                  className={activeTab === tab.value ? 'tab active' : 'tab'}
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                  <strong>{metrics[tab.value]}</strong>
                </button>
              ))}
            </div>

            <div className="legend" aria-label="Legenda de status">
              <span>
                <i className="dot yellow" /> Sem resposta
              </span>
              <span>
                <i className="dot orange" /> Em negociação
              </span>
              <span>
                <i className="dot red" /> Fechada
              </span>
              <div className="seller-filter" aria-label="Filtro por vendedor">
                {sellers.map((seller) => (
                  <label className="checkbox-label compact-checkbox" key={seller}>
                    <input
                      type="checkbox"
                      checked={selectedSellers.includes(seller)}
                      onChange={() => onToggleSellerFilter(seller)}
                    />
                    {seller}
                  </label>
                ))}
                <label className="checkbox-label compact-checkbox relevance-filter">
                  <input
                    type="checkbox"
                    checked={sortByRelevance}
                    onChange={(event) => setSortByRelevance(event.target.checked)}
                  />
                  Relevância
                </label>
              </div>
            </div>
          </>
        )}

        <div className="table-wrap">
          <table className="quote-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Nº cotação</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Data cotação</th>
                <th>Vendedor</th>
                <th>Follow-up</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleQuotes.map((quote) => {
                const statusMeta = getStatusMeta(quote.status);
                const dueAt = getFollowUpDueAt(quote);
                const due = isFollowUpDue(quote, now);
                const unchanged = isStatusUnchanged(quote, now);
                const showCloseDetails = isClosed(quote) && quote.closeDetails;
                const hasQuoteNotes = Boolean(quote.notes?.trim());
                const detailsExpanded = expandedQuoteIds.includes(quote.id);
                const canEditQuote = !isClosed(quote);
                const interestStars = getQuoteInterestStars(quote);

                return (
                  <React.Fragment key={quote.id}>
                    <tr
                      className={`quote-row ${isSimpleLayout ? '' : statusMeta.color} ${showCloseDetails ? 'expandable' : ''} ${due ? 'overdue' : ''}`}
                      onClick={() => showCloseDetails && onToggleQuoteDetails(quote.id)}
                    >
                      <td>
                        <div className="status-cell">
                          {!isSimpleLayout && <i className={`dot ${statusMeta.color}`} />}
                          <select
                            value={quote.status}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => onChangeStatus(quote.id, event.target.value)}
                          >
                            {statuses.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="strong-text">
                        <span className="quote-number-cell">
                          {Array.from({ length: interestStars }).map((_, index) => (
                            <Star
                              className="interest-star"
                              key={`${quote.id}-star-${index}`}
                              size={16}
                              aria-label="Cotação de interesse"
                              fill="currentColor"
                            />
                          ))}
                          {quote.quoteNumber}
                        </span>
                      </td>
                      <td>{quote.clientName}</td>
                      <td>{quote.quoteValue || '—'}</td>
                      <td>{formatDate(`${quote.quoteDate}T12:00:00`)}</td>
                      <td>{quote.seller}</td>
                      <td>
                        <div className="due-cell">
                          {isClosed(quote) || isArchived(quote) ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>{isClosed(quote) ? 'Finalizada' : 'Arquivada'}</span>
                            </>
                          ) : (
                            <>
                              {due ? <CalendarClock size={16} /> : <Clock3 size={16} />}
                              {due ? (
                                <button
                                  className="inline-reset-button"
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onRestartFollowUp(quote.id);
                                  }}
                                >
                                  Reiniciar
                                </button>
                              ) : (
                                <span>{formatDateTime(dueAt)}</span>
                              )}
                              {unchanged && <b className="neutral">Sem alteração</b>}
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          {canEditQuote && (
                            <button
                              className="icon-button neutral"
                              type="button"
                              title="Editar cotação"
                              aria-label="Editar cotação"
                              onClick={(event) => {
                                event.stopPropagation();
                                onEditQuote(quote);
                              }}
                            >
                              <Pencil size={17} />
                            </button>
                          )}
                          {canEditQuote && hasQuoteNotes && (
                            <button
                              className="obs-button"
                              type="button"
                              title="Ver observação da cotação"
                              aria-label="Ver observação da cotação"
                              onClick={(event) => {
                                event.stopPropagation();
                                onToggleQuoteDetails(quote.id);
                              }}
                            >
                              Obs.
                            </button>
                          )}
                          {due && (
                            <button
                              className="archive-button"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onArchiveQuote(quote.id);
                              }}
                            >
                              Arquivar
                            </button>
                          )}
                          {showCloseDetails && (
                            <button
                              className="icon-button neutral"
                              type="button"
                              title="Editar dados do pedido"
                              aria-label="Editar dados do pedido"
                              onClick={(event) => {
                                event.stopPropagation();
                                openCloseModal(quote);
                              }}
                            >
                              <Pencil size={17} />
                            </button>
                          )}
                          {showCloseDetails && hasQuoteNotes && (
                            <button
                              className="obs-button"
                              type="button"
                              title="Ver observação da cotação"
                              aria-label="Ver observação da cotação"
                              onClick={(event) => {
                                event.stopPropagation();
                                onToggleQuoteDetails(quote.id);
                              }}
                            >
                              Obs.
                            </button>
                          )}
                          <button
                            className="icon-button"
                            type="button"
                            title="Remover cotação"
                            aria-label="Remover cotação"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemoveQuote(quote.id);
                            }}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {showCloseDetails && detailsExpanded && (
                      <tr className="closed-details-row">
                        <td colSpan="8">
                          <div className="closed-details">
                            <span>
                              <b>Nº pedido</b>
                              {quote.closeDetails.orderNumber}
                            </span>
                            <span>
                              <b>Pagamento acordado</b>
                              {quote.closeDetails.agreedPaymentTerms}
                            </span>
                            <span>
                              <b>Transportadora</b>
                              {quote.closeDetails.carrier || quote.closeDetails.freight}
                            </span>
                            <span>
                              <b>Valor total</b>
                              {quote.closeDetails.totalValue}
                            </span>
                            <span>
                              <b>Valor cotação</b>
                              {quote.quoteValue || '—'}
                            </span>
                            <span>
                              <b>Telefone</b>
                              {quote.phone || 'â€”'}
                            </span>
                            <span>
                              <b>Obs. cotação</b>
                              {quote.notes || '—'}
                            </span>
                            <span>
                              <b>Obs. pedido</b>
                              {quote.closeDetails.notes || '—'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!showCloseDetails && hasQuoteNotes && detailsExpanded && (
                      <tr className="closed-details-row quote-notes-row">
                        <td colSpan="8">
                          <div className="closed-details quote-notes-details">
                            <span>
                              <b>Obs. cotação</b>
                              {quote.notes}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {visibleQuotes.length === 0 && (
            <div className="empty-state">
              <CheckCircle2 size={28} />
              <p>Nenhuma cotação encontrada nesta visualização.</p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function getRotaxSessionLabel(session) {
  return session?.trainingDate ? formatDate(`${session.trainingDate}T12:00:00`) : 'Sem treinamento';
}

function RotaxTrainingWorkspace({
  activeInfoCategory,
  activeSessionId,
  activeTab,
  blocks,
  contacts,
  expandedStudentIds,
  metrics,
  onAddBlock,
  onAddContact,
  onAddSession,
  onAddStudent,
  onChangeBlock,
  onEditContact,
  onEditStudent,
  onRemoveBlock,
  onRemoveContact,
  onRemoveStudent,
  onSaveBlock,
  onToggleStudentDetails,
  sessions,
  setActiveInfoCategory,
  setActiveSessionId,
  setActiveTab,
  setActiveView,
  allStudents,
  students,
}) {
  const activeCategory = rotaxInfoCategories.find((category) => category.value === activeInfoCategory) || rotaxInfoCategories[0];
  const activeSession = sessions.find((session) => session.id === activeSessionId);

  return (
    <section className="rotax-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <GraduationCap size={20} />
          <h2>Treinamento Rotax</h2>
        </div>
        <div className="panel-actions">
          <button className="secondary-button compact" type="button" onClick={() => setActiveView('quotes')}>
            <FileText size={16} />
            Cotações
          </button>
        </div>
      </div>

      <div className="rotax-info-tabs" role="tablist" aria-label="Informações do treinamento Rotax">
        {rotaxInfoCategories.map((category) => (
          <button
            className={activeInfoCategory === category.value ? 'view-button active' : 'view-button'}
            key={category.value}
            type="button"
            onClick={() => setActiveInfoCategory(category.value)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="rotax-info-area">
        <div className="rotax-info-header">
          <h3>{activeCategory.label}</h3>
          <button className="secondary-button compact" type="button" onClick={() => onAddBlock(activeInfoCategory)}>
            <Plus size={16} />
            Adicionar linha
          </button>
        </div>
        {blocks.length === 0 ? (
          <div className="info-empty-state compact">
            <BookOpenText size={24} />
            <p>Nenhuma informação cadastrada.</p>
          </div>
        ) : (
          <div className="rotax-toggle-list">
            {blocks.map((block) => (
              <RotaxToggleBlock
                block={block}
                key={block.id}
                onChangeBlock={onChangeBlock}
                onRemoveBlock={onRemoveBlock}
                onSaveBlock={onSaveBlock}
              />
            ))}
          </div>
        )}
      </div>

      <section className="rotax-dashboard">
        <div className="panel-toolbar">
          <div className="tabs rotax-main-tabs" role="tablist" aria-label="Gestão de treinamento">
            <button
              className={activeTab === 'contacts' ? 'tab active' : 'tab'}
              type="button"
              onClick={() => setActiveTab('contacts')}
            >
              Contatos próximos treinamentos
              <strong>{metrics.contacts}</strong>
            </button>
            <button
              className={activeTab === 'students' ? 'tab active' : 'tab'}
              type="button"
              onClick={() => setActiveTab('students')}
            >
              Alunos confirmados
              <strong>{metrics.students}</strong>
            </button>
          </div>
          <div className="panel-actions">
            <button className="secondary-button compact" type="button" onClick={onAddStudent}>
              <Plus size={16} />
              Adicionar novo aluno
            </button>
            <button className="secondary-button compact" type="button" onClick={onAddSession}>
              <CalendarClock size={16} />
              Adicionar treinamento
            </button>
          </div>
        </div>

        {activeTab === 'contacts' ? (
          <RotaxContactsTable
            contacts={contacts}
            onAdd={onAddContact}
            onEdit={onEditContact}
            onRemove={onRemoveContact}
          />
        ) : (
          <>
            <div className="tabs rotax-session-tabs" role="tablist" aria-label="Datas de treinamento">
              {sessions.length === 0 ? (
                <button className="tab active" type="button" onClick={onAddSession}>
                  Nenhum treinamento cadastrado
                  <strong>+</strong>
                </button>
              ) : (
                sessions.map((session) => (
                  <button
                    className={activeSessionId === session.id ? 'tab active' : 'tab'}
                    key={session.id}
                    type="button"
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    {getRotaxSessionLabel(session)}
                    <strong>{allStudents.filter((student) => student.trainingSessionId === session.id).length}</strong>
                  </button>
                ))
              )}
            </div>
            <RotaxStudentsTable
              activeSession={activeSession}
              expandedStudentIds={expandedStudentIds}
              onEdit={onEditStudent}
              onRemove={onRemoveStudent}
              onToggleDetails={onToggleStudentDetails}
              sessions={sessions}
              students={students}
            />
          </>
        )}
      </section>
    </section>
  );
}

function RotaxToggleBlock({ block, onChangeBlock, onRemoveBlock, onSaveBlock }) {
  function openForEditing() {
    if (block.isOpen) return;
    onChangeBlock(block.id, { isOpen: true });
    onSaveBlock(block.id, { isOpen: true });
  }

  return (
    <div className="rotax-toggle-block">
      <button
        className={block.isOpen ? 'toggle-control open' : 'toggle-control'}
        type="button"
        aria-label={block.isOpen ? 'Recolher bloco' : 'Expandir bloco'}
        onClick={() => {
          const nextOpen = !block.isOpen;
          onChangeBlock(block.id, { isOpen: nextOpen });
          onSaveBlock(block.id, { isOpen: nextOpen });
        }}
      >
        <ChevronRight size={17} />
      </button>
      <div className="info-block-content">
        <input
          className="info-toggle-title"
          value={block.title}
          onBlur={() => onSaveBlock(block.id, { title: block.title })}
          onChange={(event) => onChangeBlock(block.id, { title: event.target.value })}
          placeholder="Título"
        />
        {block.isOpen && (
          <textarea
            className="info-block-input"
            value={block.body}
            onBlur={() => onSaveBlock(block.id, { body: block.body })}
            onChange={(event) => onChangeBlock(block.id, { body: event.target.value })}
            placeholder="Digite o texto"
            rows="4"
          />
        )}
      </div>
      <div className="rotax-block-actions">
        <button className="secondary-button compact" type="button" onClick={openForEditing}>
          <Pencil size={15} />
          Editar
        </button>
        <button className="rotax-delete-button" type="button" onClick={() => onRemoveBlock(block.id)}>
          <Trash2 size={15} />
          Excluir
        </button>
      </div>
    </div>
  );
}

function RotaxStudentsTable({ activeSession, expandedStudentIds, onEdit, onRemove, onToggleDetails, sessions, students }) {
  return (
    <div className="table-wrap">
      <table className="quote-table rotax-table">
        <thead>
          <tr>
            <th>Nº orçamento</th>
            <th>Nome</th>
            <th>Tipos de treinamento</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const expanded = expandedStudentIds.includes(student.id);
            const session = sessions.find((item) => item.id === student.trainingSessionId);
            return (
              <React.Fragment key={student.id}>
                <tr className="quote-row expandable" onClick={() => onToggleDetails(student.id)}>
                  <td className="strong-text">{student.quoteNumber || '—'}</td>
                  <td>{student.name}</td>
                  <td>
                    <div className="type-pill-list">
                      {student.trainingTypes.length ? (
                        student.trainingTypes.map((type) => (
                          <span className={`situation ${rotaxTypeColorClass[type] || 'blue'}`} key={type}>
                            {type}
                          </span>
                        ))
                      ) : (
                        '—'
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button neutral"
                        type="button"
                        title="Editar aluno"
                        aria-label="Editar aluno"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(student);
                        }}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        title="Excluir aluno"
                        aria-label="Excluir aluno"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove(student.id);
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr className="closed-details-row">
                    <td colSpan="4">
                      <div className="closed-details rotax-details">
                        <span>
                          <b>Data treinamento</b>
                          {getRotaxSessionLabel(session)}
                        </span>
                        <span>
                          <b>E-mail</b>
                          {student.email || '—'}
                        </span>
                        <span>
                          <b>Contrato efetuado?</b>
                          {student.contractDone ? 'Sim' : 'Não'}
                        </span>
                        <span>
                          <b>Contrato assinado?</b>
                          {student.contractSigned ? 'Sim' : 'Não'}
                        </span>
                        <span>
                          <b>Nº pedido</b>
                          {student.orderNumber || '—'}
                        </span>
                        <span>
                          <b>Telefone</b>
                          {student.phone || '—'}
                        </span>
                        <span className="wide-detail">
                          <b>Endereço/Cod. Cliente</b>
                          {student.address || '—'}
                        </span>
                        <span className="wide-detail">
                          <b>Observações</b>
                          {student.notes || '—'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {students.length === 0 && (
        <div className="empty-state">
          <GraduationCap size={28} />
          <p>{activeSession ? 'Nenhum aluno confirmado para esta data.' : 'Cadastre um treinamento para adicionar alunos.'}</p>
        </div>
      )}
    </div>
  );
}

function RotaxContactsTable({ contacts, onAdd, onEdit, onRemove }) {
  return (
    <div className="table-wrap">
      <div className="rotax-table-actions">
        <button className="secondary-button compact" type="button" onClick={onAdd}>
          <Plus size={16} />
          Incluir contato
        </button>
      </div>
      <table className="quote-table rotax-table contacts-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Contato</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr className="quote-row" key={contact.id}>
              <td className="strong-text">{contact.name}</td>
              <td>{contact.contact || '—'}</td>
              <td>
                <span className={contact.status === 'Em contato' ? 'situation blue' : 'situation yellow'}>{contact.status}</span>
              </td>
              <td>
                <div className="row-actions">
                  <button
                    className="icon-button neutral"
                    type="button"
                    title="Editar contato"
                    aria-label="Editar contato"
                    onClick={() => onEdit(contact)}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    title="Excluir contato"
                    aria-label="Excluir contato"
                    onClick={() => onRemove(contact.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {contacts.length === 0 && (
        <div className="empty-state">
          <BookOpenText size={28} />
          <p>Nenhum contato cadastrado.</p>
        </div>
      )}
    </div>
  );
}

function TrackingWorkspace({
  activeTrackingTab,
  correiosCandidateCount,
  entries,
  isUpdatingCorreios,
  metrics,
  onAddStandalone,
  onEdit,
  onRemove,
  onUpdateCorreiosStatuses,
  searchTerm,
  setActiveTrackingTab,
  setActiveView,
  setSearchTerm,
}) {
  return (
    <section className="tracking-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <Truck size={20} />
          <h2>Rastreios</h2>
        </div>
        <div className="panel-actions">
          <button className="secondary-button compact" type="button" onClick={onAddStandalone}>
            <Plus size={16} />
            Adicionar rastreio avulso
          </button>
          <button
            className="secondary-button compact"
            type="button"
            disabled={correiosCandidateCount === 0 || isUpdatingCorreios}
            title={
              correiosCandidateCount === 0
                ? 'Nenhum rastreio dos Correios encontrado'
                : `${correiosCandidateCount} rastreio(s) dos Correios encontrado(s)`
            }
            onClick={onUpdateCorreiosStatuses}
          >
            <RefreshCw size={16} />
            {isUpdatingCorreios ? 'Atualizando...' : 'Atualizar Status Correio'}
          </button>
          <label className="search-box">
            <Search size={18} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por cliente, pedido ou rastreio"
            />
          </label>
          <button className="secondary-button compact" type="button" onClick={() => setActiveView('quotes')}>
            <FileText size={16} />
            Cotações
          </button>
        </div>
      </div>

      <div className="tabs tracking-tabs" role="tablist" aria-label="Status dos rastreios">
        {trackingTabs.map((tab) => (
          <button
            className={activeTrackingTab === tab.value ? 'tab active' : 'tab'}
            key={tab.value}
            type="button"
            onClick={() => setActiveTrackingTab(tab.value)}
          >
            {tab.label}
            <strong>{tab.value === 'Em andamento' ? metrics.andamento : metrics.finalizado}</strong>
          </button>
        ))}
      </div>

      <div className="tracking-legend" aria-label="Legenda de entrega">
        <span className="situation green">Entregue / Retirada</span>
        <span className="situation red">Ocorrência crítica</span>
        <span className="situation purple">Correção / atendimento</span>
        <span className="situation yellow">Transferência / preparo</span>
        <span className="situation pink">Saiu para entrega</span>
        <span className="situation blue">Postado / etiqueta</span>
      </div>

      <div className="table-wrap">
        <table className="tracking-table">
          <thead>
            <tr>
              <th>Cotação</th>
              <th>Cliente</th>
              <th>Nº pedido</th>
              <th>Nº Nota Fiscal</th>
              <th>Transportadora</th>
              <th>Cod. Rastreio</th>
              <th>Situação entrega</th>
              <th>Previsão de entrega</th>
              <th>Observações</th>
              <th>Status</th>
              <th>Data Finalização</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const colorClass = situationColorClass[entry.deliverySituation] || 'blue';
              const hasTrackingCode = entry.trackingCode.trim();
              return (
                <tr className={`tracking-row ${colorClass}`} key={entry.id}>
                  <td className="strong-text">{entry.quoteNumber}</td>
                  <td>{entry.clientName}</td>
                  <td>{entry.orderNumber || '—'}</td>
                  <td>{entry.invoiceNumber || '—'}</td>
                  <td>{entry.carrier || '—'}</td>
                  <td>
                    <span className={entry.trackingCode ? 'tracking-code' : 'tracking-code missing'}>
                      {entry.trackingCode || 'Sem rastreio'}
                    </span>
                  </td>
                  <td>
                    {hasTrackingCode ? (
                      <span className="situation-cell">
                        <span className={`situation ${colorClass}`}>{entry.deliverySituation}</span>
                        {entry.correiosUpdateFailed && (
                          <span className="update-failed-indicator" title="Rastreio Correios sem retorno na ultima atualizacao">
                            !
                          </span>
                        )}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{formatDateWithWeekday(entry.expectedDeliveryDate)}</td>
                  <td className="notes-cell">{entry.notes || '—'}</td>
                  <td>{entry.status}</td>
                  <td>{entry.finalizedAt ? formatDateTime(entry.finalizedAt) : '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button neutral"
                        type="button"
                        title="Editar rastreio"
                        aria-label="Editar rastreio"
                        onClick={() => onEdit(entry)}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        title="Excluir rastreio"
                        aria-label="Excluir rastreio"
                        onClick={() => onRemove(entry.id)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="empty-state">
            <CheckCircle2 size={28} />
            <p>Nenhum rastreio nesta aba.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CloseQuoteModal({ closeDetails, closeErrors, closeModal, onCancel, onSubmit, onUpdate }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="close-modal" onSubmit={onSubmit} noValidate>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Cotação finalizada</p>
            <h2>
              {closeModal.quoteNumber} · {closeModal.clientName}
            </h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <label>
          Nº do pedido
          <input
            value={closeDetails.orderNumber}
            onChange={(event) => onUpdate('orderNumber', event.target.value)}
            placeholder="Ex: 58014"
          />
          {closeErrors.orderNumber && <small>{closeErrors.orderNumber}</small>}
        </label>

        <label>
          Condição de pagamento acordada
          <input
            value={closeDetails.agreedPaymentTerms}
            onChange={(event) => onUpdate('agreedPaymentTerms', event.target.value)}
            placeholder="Ex: 28 dias"
          />
          {closeErrors.agreedPaymentTerms && <small>{closeErrors.agreedPaymentTerms}</small>}
        </label>

        <label>
          Telefone
          <input
            value={closeDetails.phone}
            onChange={(event) => onUpdate('phone', event.target.value)}
            placeholder="Telefone do cliente"
          />
        </label>

        <label>
          Transportadora
          <input
            value={closeDetails.carrier}
            onChange={(event) => onUpdate('carrier', event.target.value)}
            placeholder="Ex: Correios"
          />
          {closeErrors.carrier && <small>{closeErrors.carrier}</small>}
        </label>

        <label>
          Valor Total
          <input
            value={closeDetails.totalValue}
            onChange={(event) => onUpdate('totalValue', event.target.value)}
            placeholder="Ex: R$ 12.500,00"
          />
          {closeErrors.totalValue && <small>{closeErrors.totalValue}</small>}
        </label>

        <label>
          Obs.
          <textarea
            value={closeDetails.notes}
            onChange={(event) => onUpdate('notes', event.target.value)}
            placeholder="Observações do pedido fechado"
            rows="4"
          />
        </label>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            OK
          </button>
        </div>
      </form>
    </div>
  );
}

function QuoteEditModal({ errors, form, onCancel, onSubmit, onUpdate }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="close-modal" onSubmit={onSubmit} noValidate>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Editar cotação</p>
            <h2>{form.quoteNumber || 'Cotação'}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <label>
          Nº cotação
          <input
            value={form.quoteNumber}
            onChange={(event) => onUpdate('quoteNumber', event.target.value)}
            placeholder="Ex: 10482"
          />
          {errors.quoteNumber && <small>{errors.quoteNumber}</small>}
        </label>

        <label>
          Nome do cliente
          <input
            value={form.clientName}
            onChange={(event) => onUpdate('clientName', event.target.value)}
            placeholder="Ex: ACME Ltda."
          />
          {errors.clientName && <small>{errors.clientName}</small>}
        </label>

        <label>
          Telefone
          <input
            value={form.phone}
            onChange={(event) => onUpdate('phone', event.target.value)}
            placeholder="Telefone do cliente"
          />
        </label>

        <label>
          Condição de pagamento
          <input
            value={form.paymentTerms}
            onChange={(event) => onUpdate('paymentTerms', event.target.value)}
            placeholder="Opcional"
          />
        </label>

        <label>
          Valor
          <input
            value={form.quoteValue}
            onChange={(event) => onUpdate('quoteValue', event.target.value)}
            placeholder="Opcional"
          />
        </label>

        <div className="form-pair">
          <label>
            Data de cotação
            <input type="date" value={form.quoteDate} onChange={(event) => onUpdate('quoteDate', event.target.value)} />
            {errors.quoteDate && <small>{errors.quoteDate}</small>}
          </label>

          <div className="followup-input-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.followUpUsesTime}
                onChange={(event) => onUpdate('followUpUsesTime', event.target.checked)}
              />
              Tempo
            </label>
            <label>
              {form.followUpUsesTime ? 'Follow-up em tempo' : 'Follow-up em dias'}
              <div className="inline-field-pair">
                <input
                  type="number"
                  min="1"
                  value={form.followUpAmount}
                  onChange={(event) => onUpdate('followUpAmount', event.target.value)}
                />
                {form.followUpUsesTime && (
                  <select value={form.followUpUnit} onChange={(event) => onUpdate('followUpUnit', event.target.value)}>
                    <option value="hours">Horas</option>
                    <option value="minutes">Minutos</option>
                  </select>
                )}
              </div>
              {errors.followUpAmount && <small>{errors.followUpAmount}</small>}
            </label>
          </div>
        </div>

        <label>
          Vendedor
          <select value={form.seller} onChange={(event) => onUpdate('seller', event.target.value)}>
            {sellers.map((seller) => (
              <option key={seller} value={seller}>
                {seller}
              </option>
            ))}
          </select>
          {errors.seller && <small>{errors.seller}</small>}
        </label>

        <label className="checkbox-label interest-checkbox">
          <input
            type="checkbox"
            checked={form.isInterest}
            onChange={(event) => onUpdate('isInterest', event.target.checked)}
          />
          Cotação de interesse
        </label>

        <label>
          Obs.
          <textarea
            value={form.notes}
            onChange={(event) => onUpdate('notes', event.target.value)}
            placeholder="Observações da cotação"
            rows="4"
          />
        </label>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

function RotaxSessionModal({ errors, form, onCancel, onSubmit, onUpdate }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="close-modal" onSubmit={onSubmit} noValidate>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Treinamento Rotax</p>
            <h2>Adicionar treinamento</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <label>
          Data do treinamento
          <input type="date" value={form.trainingDate} onChange={(event) => onUpdate('trainingDate', event.target.value)} />
          {errors.trainingDate && <small>{errors.trainingDate}</small>}
        </label>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            Incluir
          </button>
        </div>
      </form>
    </div>
  );
}

function RotaxStudentModal({
  errors,
  form,
  isEditing,
  onCancel,
  onSubmit,
  onToggleTrainingType,
  onUpdate,
  sessions,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="close-modal rotax-modal" onSubmit={onSubmit} noValidate>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Treinamento Rotax</p>
            <h2>{isEditing ? 'Editar aluno' : 'Adicionar novo aluno'}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <label>
          Data do treinamento
          <select value={form.trainingSessionId} onChange={(event) => onUpdate('trainingSessionId', event.target.value)}>
            <option value="">Selecione</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {getRotaxSessionLabel(session)}
              </option>
            ))}
          </select>
          {errors.trainingSessionId && <small>{errors.trainingSessionId}</small>}
        </label>

        <div className="form-pair wide">
          <label>
            Nome
            <input value={form.name} onChange={(event) => onUpdate('name', event.target.value)} placeholder="Nome do aluno" />
            {errors.name && <small>{errors.name}</small>}
          </label>

          <label>
            E-mail
            <input value={form.email} onChange={(event) => onUpdate('email', event.target.value)} placeholder="email@empresa.com" />
          </label>
        </div>

        <label>
          Tipo treinamento
          <details className="multi-select-dropdown">
            <summary>{form.trainingTypes.length ? form.trainingTypes.join(', ') : 'Selecione um ou mais tipos'}</summary>
            <div className="rotax-type-grid">
              {rotaxTrainingTypes.map((type) => (
                <label className="checkbox-label compact-checkbox" key={type}>
                  <input
                    type="checkbox"
                    checked={form.trainingTypes.includes(type)}
                    onChange={() => onToggleTrainingType(type)}
                  />
                  <span className={`situation ${rotaxTypeColorClass[type] || 'blue'}`}>{type}</span>
                </label>
              ))}
            </div>
          </details>
        </label>

        <div className="form-pair wide">
          <label className="checkbox-label interest-checkbox">
            <input
              type="checkbox"
              checked={form.contractDone}
              onChange={(event) => onUpdate('contractDone', event.target.checked)}
            />
            Contrato efetuado?
          </label>
          <label className="checkbox-label interest-checkbox">
            <input
              type="checkbox"
              checked={form.contractSigned}
              onChange={(event) => onUpdate('contractSigned', event.target.checked)}
            />
            Contrato Assinado?
          </label>
        </div>

        <div className="form-pair wide">
          <label>
            Número do orçamento
            <input value={form.quoteNumber} onChange={(event) => onUpdate('quoteNumber', event.target.value)} placeholder="Ex: 10482" />
          </label>
          <label>
            Número do pedido
            <input value={form.orderNumber} onChange={(event) => onUpdate('orderNumber', event.target.value)} placeholder="Ex: 58014" />
          </label>
        </div>

        <div className="form-pair wide">
          <label>
            Telefone
            <input value={form.phone} onChange={(event) => onUpdate('phone', event.target.value)} placeholder="Contato do aluno" />
          </label>
          <label>
            Endereço/Cod. Cliente
            <input value={form.address} onChange={(event) => onUpdate('address', event.target.value)} placeholder="Endereço ou código do cliente" />
          </label>
        </div>

        <label>
          Observações
          <textarea
            value={form.notes}
            onChange={(event) => onUpdate('notes', event.target.value)}
            placeholder="Observações do aluno"
            rows="5"
          />
        </label>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

function RotaxContactModal({ errors, form, isEditing, onCancel, onSubmit, onUpdate, sessions }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="close-modal rotax-modal" onSubmit={onSubmit} noValidate>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Próximos treinamentos</p>
            <h2>{isEditing ? 'Editar contato' : 'Incluir contato'}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <label>
          Nome
          <input value={form.name} onChange={(event) => onUpdate('name', event.target.value)} placeholder="Nome do contato" />
          {errors.name && <small>{errors.name}</small>}
        </label>

        <label>
          Contato
          <input value={form.contact} onChange={(event) => onUpdate('contact', event.target.value)} placeholder="Telefone ou e-mail" />
        </label>

        <label>
          Status
          <select value={form.status} onChange={(event) => onUpdate('status', event.target.value)}>
            <option value="Em contato">Em contato</option>
            <option value="Manter na lista">Manter na lista</option>
          </select>
        </label>

        {isEditing && (
          <label>
            Direcionar aluno
            <select value={form.redirectSessionId} onChange={(event) => onUpdate('redirectSessionId', event.target.value)}>
              <option value="">Não direcionar agora</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {getRotaxSessionLabel(session)}
                </option>
              ))}
            </select>
            {errors.redirectSessionId && <small>{errors.redirectSessionId}</small>}
          </label>
        )}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

function TrackingEditModal({ entry, errors = {}, form, isStandalone = false, onCancel, onSubmit, onUpdate }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="close-modal tracking-modal" onSubmit={onSubmit}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">{isStandalone ? 'Adicionar rastreio avulso' : 'Editar rastreio'}</p>
            <h2>{isStandalone ? 'Rastreio avulso' : `${entry.quoteNumber} · ${entry.clientName}`}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        {isStandalone && (
          <label>
            Nome
            <input
              value={form.clientName}
              onChange={(event) => onUpdate('clientName', event.target.value)}
              placeholder="Ex: Cliente antigo"
            />
            {errors.clientName && <small>{errors.clientName}</small>}
          </label>
        )}

        <label>
          Transportadora
          <input
            value={form.carrier}
            onChange={(event) => onUpdate('carrier', event.target.value)}
            placeholder="Ex: Correios"
          />
          {errors.carrier && <small>{errors.carrier}</small>}
        </label>

        <label>
          Cod. Rastreio
          <input
            value={form.trackingCode}
            onChange={(event) => onUpdate('trackingCode', event.target.value)}
            placeholder="Ex: BR123456789"
          />
        </label>

        <label>
          Nº Nota Fiscal
          <input
            value={form.invoiceNumber}
            onChange={(event) => onUpdate('invoiceNumber', event.target.value)}
            placeholder="Ex: NF-2048"
          />
        </label>

        <div className="form-pair wide">
          <label>
            Situação entrega
            <select
              value={form.deliverySituation}
              onChange={(event) => onUpdate('deliverySituation', event.target.value)}
            >
              {deliverySituations.map((situation) => (
                <option key={situation} value={situation}>
                  {situation}
                </option>
              ))}
            </select>
          </label>

          <label>
            Previsão de entrega
            <input
              type="date"
              value={form.expectedDeliveryDate}
              onChange={(event) => onUpdate('expectedDeliveryDate', event.target.value)}
            />
          </label>
        </div>

        <label>
          Observações
          <textarea
            value={form.notes}
            onChange={(event) => onUpdate('notes', event.target.value)}
            placeholder="Adicione observações do transporte"
            rows="5"
          />
        </label>

        <label>
          Status
          <select value={form.status} onChange={(event) => onUpdate('status', event.target.value)}>
            <option value="Em andamento">Em andamento</option>
            <option value="Finalizado">Finalizado</option>
          </select>
        </label>

        {form.status === 'Finalizado' && (
          <div className="finalized-preview">
            <b>Data Finalização:</b> será preenchida automaticamente ao salvar.
          </div>
        )}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}

function LoginScreen({ error, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    await onLogin(email, password);
    setIsSubmitting(false);
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="login-mark">
          <ShieldCheck size={24} />
        </div>
        <div>
          <p className="eyebrow">Acesso restrito</p>
          <img className="app-logo login-logo" src="/followuper-logo.png" alt="FollowUper" />
        </div>

        {error && <div className="app-alert">{error}</div>}

        <label>
          E-mail
          <input
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="usuario@empresa.com"
            required
          />
        </label>

        <label>
          Senha
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Sua senha"
            required
          />
        </label>

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          <LogIn size={18} />
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
