import {
  AlertTriangle,
  Activity,
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
  Save,
  Search,
  ShieldCheck,
  Star,
  Table2,
  Trash2,
  Truck,
  Type,
  Upload,
  Users,
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
import {
  loadUserActivity,
  registerUserProfile,
  startUserPresence,
  subscribeToUserActivity,
  userIsMaster,
} from './services/userActivityRepository';
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
  updateRotaxSession,
  updateRotaxStudent,
} from './services/rotaxTrainingRepository';
import {
  cacheRotaxRevenueEntries,
  createRotaxRevenueEntry,
  loadRotaxRevenueEntries,
  sortRotaxRevenueEntries,
  subscribeToRotaxRevenueChanges,
  updateRotaxRevenueEntry,
} from './services/rotaxRevenueRepository';
import {
  cacheCustomers,
  createCustomer,
  deleteCustomer,
  loadCustomers,
  sortCustomers,
  subscribeToCustomerChanges,
  updateCustomer,
  upsertCustomers,
} from './services/customersRepository';
import {
  cacheContractTemplates,
  loadContractTemplates,
  subscribeToContractTemplateChanges,
  upsertContractTemplate,
} from './services/contractTemplatesRepository';
import {
  cacheBillingEntries,
  deleteBillingEntry,
  loadBillingEntries,
  replaceBillingEntriesForSellerWithSnapshot,
  restoreLastBillingUpload,
  sortBillingEntries,
  subscribeToBillingChanges,
  updateBillingEntry,
} from './services/billingRepository';
import {
  cacheReturnEntries,
  createReturnEntry,
  deleteReturnEntry,
  loadReturnEntries,
  sortReturnEntries,
  subscribeToReturnChanges,
  updateReturnEntry,
} from './services/returnsRepository';
import {
  cacheWarrantyEntries,
  createWarrantyEntry,
  deleteWarrantyEntry,
  loadWarrantyEntries,
  sortWarrantyEntries,
  subscribeToWarrantyChanges,
  updateWarrantyEntry,
} from './services/warrantiesRepository';
import { generateContractPdf } from './services/contractsPdfService';
import { createUploadAudit, loadUploadAudits } from './services/uploadAuditsRepository';
import {
  loadRotaxPartsCatalog,
  normalizePartNumber,
  replaceRotaxParts,
  searchRotaxParts,
  subscribeToRotaxPartsCatalog,
} from './services/rotaxPartsRepository';
import {
  clearStockTransferCandidates,
  createStockTransferList,
  deleteStockTransferCandidate,
  deleteStockTransferList,
  ensureManualStockItem,
  loadStockItems,
  loadStockTransferData,
  normalizeStockProduct,
  replaceStockItems,
  replaceStockProductAddresses,
  subscribeToStockTransferChanges,
  updateStockTransferList,
  upsertStockTransferCandidate,
  upsertStockProductDescriptions,
} from './services/stockTransfersRepository';
import {
  loadDashboardControl,
  loadDashboardSnapshot,
  saveDashboardSnapshot,
  subscribeToDashboardSetting,
  updateDashboardPeriod,
} from './services/dashboardRepository';

const sellers = ['Elton', 'Bruno', 'Stephanie'];
const billingSellers = ['Bruno', 'Elton', 'Stephanie'];
const BILLING_NOTE_DRAFTS_STORAGE_KEY = 'followuper.billingNoteDrafts.v1';
const LAYOUT_STORAGE_KEY = 'followuper.layoutMode.v1';
const AUTO_ARCHIVE_INACTIVE_DAYS = 15;
const DOLLAR_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const lossReasons = [
  { value: 'preco', label: 'Preco' },
  { value: 'prazo', label: 'Prazo' },
  { value: 'cliente-desistiu', label: 'Cliente desistiu' },
  { value: 'comprou-concorrente', label: 'Comprou concorrente' },
  { value: 'sem-retorno', label: 'Sem retorno' },
  { value: 'duplicado', label: 'Duplicado' },
  { value: 'outro', label: 'Outro' },
];

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
  { value: 'Importação', label: 'Importação' },
];

const returnTabs = [
  { value: 'andamento', label: 'Em andamento' },
  { value: 'finalizado', label: 'Finalizado' },
];

const returnTypes = ['Total', 'Parcial'];

const returnStatuses = [
  'Aguardando retorno cliente',
  'Solicitado carta faturamento',
  'Aguardando finalização faturamento',
  'Aguardando item chegar matriz',
  'Finalizado',
];

const initialReturnForm = {
  invoiceNumber: '',
  returnType: 'Total',
  items: [{ partNumber: '', quantity: '' }],
  status: 'Aguardando retorno cliente',
};

const warrantyStatuses = [
  'SIR Enviada',
  'Caso Criado',
  'Garantia Criada',
  'Garantia Paga',
  'Standby',
  'Peça enviada ao cliente',
  'Peça recebida na Matriz',
];

const warrantyStatusColorClass = {
  'SIR Enviada': 'blue',
  'Caso Criado': 'purple',
  'Garantia Criada': 'yellow',
  'Garantia Paga': 'green',
  Standby: 'orange',
  'Peça enviada ao cliente': 'pink',
  'Peça recebida na Matriz': 'teal',
};

const initialWarrantyForm = {
  warrantyNumber: '',
  motorSerialNumber: '',
  statuses: [],
  notes: '',
  attachmentFileName: '',
  attachmentFileData: '',
  attachmentMimeType: '',
};

const warrantyTabs = [
  { value: 'andamento', label: 'Em andamento' },
  { value: 'finalizada', label: 'Finalizada' },
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
  'Importação',
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
  Importação: 'teal',
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
  phone: '',
  carrier: '',
  trackingCode: '',
  invoiceNumber: '',
  deliverySituation: 'etiqueta',
  expectedDeliveryDate: '',
  notes: '',
  status: 'Em andamento',
};

const initialCustomerEditForm = {
  clientCode: '',
  clientName: '',
  seller: '',
  document: '',
  phone: '',
  fiscalAddress: '',
  deliveryAddress: '',
  state: '',
  email: '',
  zipCode: '',
};

const initialContractForms = {
  motor: {
    value: '',
    paymentTerms: '',
    motorModel: '',
    motorSerial: '',
    aircraftManufacturer: '',
    aircraftModel: '',
    aircraftPrefix: '',
    aircraftSerial: '',
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    document: '',
    email: '',
    phone: '',
    date: getTodayInputValue(),
  },
  training: {
    name: '',
    address: '',
    document: '',
    courses: '',
    duration: '',
    totalValue: '',
    paymentTerms: '',
    date: getTodayInputValue(),
  },
  return: {
    name: '',
    document: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    invoiceNumber: '',
    date: getTodayInputValue(),
    items: [{ id: crypto.randomUUID(), productCode: '', description: '', quantity: '', unitValue: '', totalValue: '' }],
  },
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

function normalizeUploadText(value) {
  return normalizeUploadValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function isIgnoredUploadClientName(value) {
  return normalizeUploadText(value).startsWith('CRUZEIRO DO SUL AVIACAO');
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

function formatCurrencyInput(value) {
  const digits = normalizeUploadValue(value).replace(/\D/g, '');
  if (!digits) return '';
  return formatUploadCurrency(Number(digits) / 100);
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

function formatDocumentNumber(value) {
  const digits = normalizeUploadValue(value).replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return normalizeUploadValue(value);
}

function isBusinessDay(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function countBusinessDaysInMonth(year, month, startDay = 1) {
  const firstDay = new Date(year, month - 1, Math.max(1, startDay));
  const lastDay = new Date(year, month, 0);
  let count = 0;

  for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
    if (isBusinessDay(date)) count += 1;
  }

  return count;
}

function countRemainingBusinessDays(year, month, now = new Date()) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) return 0;
  if (year > currentYear || month > currentMonth) return countBusinessDaysInMonth(year, month);

  return countBusinessDaysInMonth(year, month, now.getDate());
}

function isMonthAvailableForGoalDiff(year, month, now = new Date()) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return year < currentYear || (year === currentYear && month <= currentMonth);
}

function compareQuoteNumbers(a, b) {
  const normalizedA = normalizeUploadQuoteNumber(a);
  const normalizedB = normalizeUploadQuoteNumber(b);
  const digitsA = normalizedA.replace(/\D/g, '');
  const digitsB = normalizedB.replace(/\D/g, '');
  const numericA = Number(digitsA);
  const numericB = Number(digitsB);

  if (digitsA && digitsB && Number.isFinite(numericA) && Number.isFinite(numericB) && numericA !== numericB) {
    return numericA - numericB;
  }

  return normalizedA.localeCompare(normalizedB, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

function getQuoteSortDate(quote) {
  const dateValue = quote.closeDetails?.closedAt || (quote.quoteDate ? `${quote.quoteDate}T12:00:00` : quote.createdAt);
  const timestamp = new Date(dateValue).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getDashboardMonthKey(dateValue = new Date()) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getQuoteDashboardMonthKey(quote) {
  if (isClosed(quote)) {
    return getDashboardMonthKey(quote.closeDetails?.closedAt || quote.statusUpdatedAt || quote.createdAt);
  }
  if (quote.quoteDate && /^\d{4}-\d{2}/.test(quote.quoteDate)) return quote.quoteDate.slice(0, 7);
  return getDashboardMonthKey(quote.createdAt);
}

function serializeDashboardQuotes(quotes) {
  return quotes.map((quote) => ({
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    clientName: quote.clientName,
    quoteValue: quote.quoteValue,
    seller: quote.seller,
    status: quote.status,
    isInterest: quote.isInterest,
    archivedAt: quote.archivedAt,
    quoteDate: quote.quoteDate,
    createdAt: quote.createdAt,
    statusUpdatedAt: quote.statusUpdatedAt,
    closeDetails: quote.closeDetails,
  }));
}

function formatDashboardMonthLabel(periodKey) {
  const match = String(periodKey || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return periodKey;
  const [, year, month] = match;
  return `${monthNames[Number(month) - 1]} ${year}`;
}

function getLossReasonLabel(value) {
  return lossReasons.find((reason) => reason.value === value)?.label || value || 'Sem retorno';
}

function getPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function buildQuoteHistoryEvent(type, label, details = {}, createdAt = new Date().toISOString()) {
  return {
    id: crypto.randomUUID(),
    type,
    label,
    details,
    createdAt,
  };
}

function getQuoteHistory(quote) {
  const history = Array.isArray(quote.history) ? quote.history : [];

  if (history.length > 0) {
    return [...history].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return [
    buildQuoteHistoryEvent(
      'created',
      'Cotacao criada',
      { seller: quote.seller },
      quote.createdAt || new Date().toISOString(),
    ),
  ];
}

function appendQuoteHistory(quote, events) {
  const nextEvents = Array.isArray(events) ? events : [events];
  const currentHistory = Array.isArray(quote.history) ? quote.history : [];
  return [...currentHistory, ...nextEvents].filter(Boolean);
}

function createInitialQuoteHistory(quote, createdAt, source = 'manual') {
  return [
    buildQuoteHistoryEvent(
      'created',
      source === 'upload' ? 'Cotacao importada' : 'Cotacao criada',
      { seller: quote.seller, source },
      createdAt,
    ),
  ];
}

function getQuoteAgeInDays(quote, now) {
  const createdAt = new Date(quote.createdAt || now);
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000));
}

function getQuoteInactiveDays(quote, now) {
  const activityAt = getQuoteLastActivityAt(quote);
  return Math.max(0, Math.floor((now.getTime() - activityAt.getTime()) / 86_400_000));
}

function shouldRequestLossReason(quote, now) {
  return !isClosed(quote) && !isArchived(quote) && (isFollowUpDue(quote, now) || getQuoteAgeInDays(quote, now) >= 15);
}

function getSellerFromUploadCode(value) {
  const code = normalizeUploadValue(value).replace(/\D/g, '').padStart(6, '0');
  if (code === '000022') return 'Bruno';
  if (code === '000036') return 'Elton';
  if (code === '000063') return 'Stephanie';
  return '';
}

function getCustomerSellerFromUploadRow(row, sellerIndex) {
  if (sellerIndex < 0) return '';
  const value = normalizeUploadValue(row[sellerIndex]);
  return getSellerFromUploadCode(value) || value;
}

function findCustomerUploadColumn(headers, aliases, fallbackIndex) {
  const index = aliases
    .map(normalizeUploadHeader)
    .map((alias) => headers.indexOf(alias))
    .find((columnIndex) => columnIndex >= 0);

  return index ?? fallbackIndex;
}

function formatUploadPhoneWithDdd(dddValue, phoneValue) {
  const ddd = normalizeUploadValue(dddValue);
  const phone = normalizeUploadValue(phoneValue);
  if (!phone) return '';
  if (!ddd) return phone;

  const dddDigits = ddd.replace(/\D/g, '');
  const phoneDigits = phone.replace(/\D/g, '');
  if (dddDigits && phoneDigits.startsWith(dddDigits)) return phone;

  return `(${ddd}) ${phone}`;
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
  let ignoredCruzeiroCount = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    const quoteNumber = normalizeUploadQuoteNumber(row[columnIndex.quoteNumber]);
    if (!quoteNumber) continue;
    if (isIgnoredUploadClientName(row[columnIndex.clientName])) {
      ignoredCruzeiroCount += 1;
      continue;
    }

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

  return {
    ignoredCruzeiroCount,
    rows: [...grouped.values()].filter((item) => item.clientName && item.seller),
  };
}

function normalizeCustomerKey(value) {
  return normalizeUploadText(value).replace(/[^A-Z0-9]/g, '');
}

function formatUploadDateValue(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);

  return normalizeUploadValue(value);
}

function mergeCustomerPurchases(existingPurchases, newPurchases) {
  const byId = new Map();
  [...(existingPurchases || []), ...(newPurchases || [])].forEach((purchase) => {
    if (!purchase?.id) return;
    byId.set(purchase.id, purchase);
  });

  return [...byId.values()].sort((a, b) => new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0));
}

function buildCustomersFromUploadRows(rows, existingCustomers = []) {
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeUploadHeader);
    return headers.includes('cliente') && headers.includes('nome') && headers.includes('vlrtotal');
  });
  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 1;
  const headers = headerIndex >= 0 ? rows[headerIndex].map(normalizeUploadHeader) : [];
  const sellerIndex = headers.findIndex((header) => header.includes('vendedor'));
  const columnIndex = {
    quoteItem: findCustomerUploadColumn(headers, ['Numero It'], 0),
    clientCode: findCustomerUploadColumn(headers, ['Cliente'], 1),
    clientName: findCustomerUploadColumn(headers, ['Nome'], 2),
    totalValue: findCustomerUploadColumn(headers, ['Vlr.Total'], 3),
    orderNumber: findCustomerUploadColumn(headers, ['Pedido Venda'], 6),
    product: findCustomerUploadColumn(headers, ['Produto'], 7),
    quantity: findCustomerUploadColumn(headers, ['Quantidade'], 8),
    partNumber: findCustomerUploadColumn(headers, ['PART NUMBER'], 9),
    description: findCustomerUploadColumn(headers, ['Descricao', 'Descrição'], 10),
    purchaseDate: findCustomerUploadColumn(headers, ['DT Emissao', 'DT Emissão'], 12),
    document: findCustomerUploadColumn(headers, ['CNPJ/CPF'], 13),
    ddd: findCustomerUploadColumn(headers, ['DDD'], -1),
    phone: findCustomerUploadColumn(headers, ['Telefone'], 15),
    fiscalAddress: findCustomerUploadColumn(headers, ['End Fiscal', 'End. Cadastro'], 16),
    deliveryAddress: findCustomerUploadColumn(headers, ['End.Entrega', 'End. Entrega'], 17),
    state: findCustomerUploadColumn(headers, ['UF Entrega', 'Estado'], 18),
    email: findCustomerUploadColumn(headers, ['Email-Boleto', 'E-mail', 'Email'], 19),
    zipCode: findCustomerUploadColumn(headers, ['Cep Fiscal', 'CEP'], 21),
  };
  const existingByKey = new Map();
  existingCustomers.forEach((customer) => {
    if (customer.clientCode) existingByKey.set(normalizeCustomerKey(customer.clientCode), customer);
    if (customer.clientName) existingByKey.set(normalizeCustomerKey(customer.clientName), customer);
  });
  const grouped = new Map();

  for (const row of rows.slice(startIndex)) {
    const orderNumber = normalizeUploadOrderNumber(row[columnIndex.orderNumber]);
    const clientCode = normalizeUploadValue(row[columnIndex.clientCode]);
    const clientName = normalizeUploadValue(row[columnIndex.clientName]);
    if (!orderNumber || isFinalClientName(clientName)) continue;
    if (!clientCode && !clientName) continue;

    const key = clientCode ? normalizeCustomerKey(clientCode) : normalizeCustomerKey(clientName);
    const existing = grouped.get(key) || existingByKey.get(key) || existingByKey.get(normalizeCustomerKey(clientName));
    const nowIso = new Date().toISOString();
    const customer = existing
      ? { ...existing, purchases: [...(existing.purchases || [])] }
      : {
          id: crypto.randomUUID(),
          clientCode,
          clientName,
          seller: '',
          document: '',
          phone: '',
          fiscalAddress: '',
          deliveryAddress: '',
          state: '',
          email: '',
          zipCode: '',
          purchases: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    customer.clientCode = clientCode || customer.clientCode || '';
    customer.clientName = clientName || customer.clientName || '';
    customer.seller = getCustomerSellerFromUploadRow(row, sellerIndex) || customer.seller || '';
    customer.document = normalizeUploadValue(row[columnIndex.document]) || customer.document || '';
    customer.phone = formatUploadPhoneWithDdd(row[columnIndex.ddd], row[columnIndex.phone]) || customer.phone || '';
    customer.fiscalAddress = normalizeUploadValue(row[columnIndex.fiscalAddress]) || customer.fiscalAddress || '';
    customer.deliveryAddress = normalizeUploadValue(row[columnIndex.deliveryAddress]) || customer.deliveryAddress || '';
    customer.state = normalizeUploadValue(row[columnIndex.state]) || customer.state || '';
    customer.email = normalizeUploadValue(row[columnIndex.email]) || customer.email || '';
    customer.zipCode = normalizeUploadValue(row[columnIndex.zipCode]) || customer.zipCode || '';
    customer.updatedAt = nowIso;

    const productPartNumber = normalizeUploadValue(row[columnIndex.product]) || normalizeUploadValue(row[columnIndex.partNumber]);
    const productDescription = normalizeUploadValue(row[columnIndex.description]);
    if (productPartNumber) {
      const quantity = Number(row[columnIndex.quantity] || 0) || 0;
      const totalValue = parseUploadCurrency(row[columnIndex.totalValue]);
      const purchaseDate = formatUploadDateValue(row[columnIndex.purchaseDate]);
      const quoteItem = normalizeUploadValue(row[columnIndex.quoteItem]);
      const purchase = {
        id: `${quoteItem || productPartNumber}-${purchaseDate}-${totalValue}-${quantity}`,
        quoteItem,
        orderNumber,
        productPartNumber,
        productDescription,
        quantity,
        totalValue,
        unitValue: quantity ? Math.round((totalValue / quantity) * 100) / 100 : totalValue,
        purchaseDate,
      };
      customer.purchases = mergeCustomerPurchases(customer.purchases, [purchase]);
    }

    grouped.set(key, customer);
  }

  return sortCustomers([...grouped.values()]);
}

async function parseCustomersUploadFile(file, existingCustomers) {
  const rows = await readSheet(file, 2);
  const customers = buildCustomersFromUploadRows(rows, existingCustomers);
  if (customers.length === 0) throw new Error('Nao encontrei clientes validos na segunda aba da planilha.');
  return customers;
}

function getBillingCellValue(value) {
  if (value instanceof Date) return formatUploadDateValue(value);
  if (value === null || value === undefined) return '';
  return value;
}

function getBillingCellText(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return normalizeUploadValue(value);
}

function createBillingHash(value) {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function buildBillingHeaders(rows) {
  const groupRow = rows[5] || [];
  const labelRow = rows[6] || [];
  const headers = [];
  let activeGroup = '';

  const maxColumns = Math.max(groupRow.length, labelRow.length);
  for (let index = 0; index < maxColumns; index += 1) {
    const group = normalizeUploadValue(groupRow[index]);
    const label = normalizeUploadValue(labelRow[index]);
    if (group) activeGroup = group;
    if (!group && !label) continue;

    const header = label && activeGroup && label !== activeGroup ? `${activeGroup} ${label}` : group || label;
    if (isIgnoredBillingColumn(header)) continue;
    headers.push({ index, label: header });
  }

  return headers;
}

function normalizeBillingSearchText(value) {
  return normalizeFinalClientName(value).toLowerCase();
}

function isIgnoredBillingColumn(label) {
  const compactLabel = normalizeBillingSearchText(label).replace(/\s/g, '');
  return compactLabel.includes('%abs') || compactLabel.includes('%acm');
}

function getBillingIdentityValue(rowData, labelFragments, options = {}) {
  const normalizer = options.ignoreAccents === false ? normalize : normalizeBillingSearchText;
  const normalizedFragments = labelFragments.map(normalizer);
  const match = Object.entries(rowData).find(([label]) => {
    const normalizedLabel = normalizer(label);
    return normalizedFragments.every((fragment) => normalizedLabel.includes(fragment));
  });
  return getBillingCellText(match?.[1]);
}

function buildBillingRowKey(rowData, options = {}) {
  const identityParts = [
    getBillingIdentityValue(rowData, ['cliente'], options),
    getBillingIdentityValue(rowData, ['pedido'], options),
    getBillingIdentityValue(rowData, ['titulo', 'prefixo'], options),
    getBillingIdentityValue(rowData, ['titulo', 'numero'], options),
    getBillingIdentityValue(rowData, ['titulo', 'parcela'], options),
    getBillingIdentityValue(rowData, ['vencimento'], options),
  ].filter(Boolean);

  const identity = identityParts.length >= 3 ? identityParts.join('|') : JSON.stringify(rowData);
  return createBillingHash(identity);
}

function loadBillingNoteDrafts() {
  try {
    return JSON.parse(localStorage.getItem(BILLING_NOTE_DRAFTS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveBillingNoteDrafts(drafts) {
  localStorage.setItem(BILLING_NOTE_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

async function parseBillingUploadFile(file) {
  const rows = await readSheet(file);
  const headers = buildBillingHeaders(rows);
  if (headers.length === 0) throw new Error('Nao encontrei os cabecalhos da planilha de cobranca.');

  const entries = rows.slice(7).reduce((acc, row) => {
    const rowData = {};
    headers.forEach(({ index, label }) => {
      rowData[label] = getBillingCellValue(row[index]);
    });

    const clientName = getBillingIdentityValue(rowData, ['cliente']);
    if (!clientName) return acc;
    const baseRowKey = buildBillingRowKey(rowData);
    const duplicateCount = acc.filter((entry) => entry.baseRowKey === baseRowKey).length;
    acc.push({
      baseRowKey,
      legacyRowKey: buildBillingRowKey(rowData, { ignoreAccents: false }),
      rowData,
      rowKey: duplicateCount ? `${baseRowKey}-${duplicateCount + 1}` : baseRowKey,
    });
    return acc;
  }, []);

  if (entries.length === 0) throw new Error('Nao encontrei linhas validas na planilha de cobranca.');
  return entries;
}

function parseRotaxPartPrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value || '').replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalizedValue = cleaned;

  if (lastComma > lastDot) normalizedValue = cleaned.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma && lastComma >= 0) normalizedValue = cleaned.replace(/,/g, '');
  else if (lastComma >= 0) normalizedValue = cleaned.replace(',', '.');

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function parseRotaxPartsUploadFile(file) {
  const rows = await readSheet(file);
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeUploadHeader);
    return headers.includes('item') && headers.includes('descript');
  });
  if (headerIndex < 0) throw new Error('Não encontrei os cabeçalhos Item# e Descript na planilha.');

  const headers = rows[headerIndex].map(normalizeUploadHeader);
  const findColumn = (...aliases) => aliases.map((alias) => headers.indexOf(alias)).find((index) => index >= 0) ?? -1;
  const columns = {
    partNumber: findColumn('item'),
    description: findColumn('descript', 'description'),
    unit: findColumn('ficlass', 'fitclass'),
    suggestedPrice: findColumn('suggestedbahamianretail'),
    cruzeiroPrice: findColumn('servicecenterprice', 'servicecentreprice'),
  };

  if (Object.values(columns).some((index) => index < 0)) {
    throw new Error('A planilha precisa conter Item#, Descript, ficlass, Suggested Bahamian Retail e Service Center Price.');
  }

  const partsByKey = new Map();
  rows.slice(headerIndex + 1).forEach((row) => {
    const partNumber = normalizeUploadValue(row[columns.partNumber]);
    const pnKey = normalizePartNumber(partNumber);
    if (!pnKey) return;

    partsByKey.set(pnKey, {
      pnKey,
      partNumber,
      description: normalizeUploadValue(row[columns.description]),
      unit: normalizeUploadValue(row[columns.unit]),
      suggestedPrice: parseRotaxPartPrice(row[columns.suggestedPrice]),
      cruzeiroPrice: parseRotaxPartPrice(row[columns.cruzeiroPrice]),
    });
  });

  const parts = [...partsByKey.values()];
  if (parts.length === 0) throw new Error('Nenhum PN válido foi encontrado na planilha.');
  return parts;
}

function parseStockQuantity(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalizedValue = String(value || '').trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidStockAddressValue(value) {
  const normalized = normalizeUploadText(value);
  return Boolean(normalized) && normalized !== 'ESTOQUE';
}

async function parseStockUploadFile(file) {
  const rows = await readSheet(file);
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeUploadHeader);
    return headers.includes('produto') && headers.includes('saldoatual') && headers.includes('grupo');
  });
  if (headerIndex < 0) throw new Error('Não encontrei os cabeçalhos Produto, Saldo Atual e Grupo.');

  const headers = rows[headerIndex].map(normalizeUploadHeader);
  const columns = {
    product: headers.indexOf('produto'),
    quantity: headers.indexOf('saldoatual'),
    groupCode: headers.indexOf('grupo'),
  };
  const itemsByProduct = new Map();

  rows.slice(headerIndex + 1).forEach((row) => {
    const product = normalizeUploadValue(row[columns.product]);
    const productKey = normalizeStockProduct(product);
    if (!productKey) return;

    const current = itemsByProduct.get(productKey) || {
      productKey,
      product,
      quantity: 0,
      groupCode: normalizeUploadValue(row[columns.groupCode]).replace(/\.0$/, ''),
    };
    current.quantity += parseStockQuantity(row[columns.quantity]);
    current.groupCode = current.groupCode || normalizeUploadValue(row[columns.groupCode]).replace(/\.0$/, '');
    itemsByProduct.set(productKey, current);
  });

  const items = [...itemsByProduct.values()].sort((a, b) => a.product.localeCompare(b.product, 'pt-BR'));
  if (items.length === 0) throw new Error('Nenhum produto válido foi encontrado na planilha.');
  return items;
}

async function parseStockTransferUploadFile(file) {
  const rows = await readSheet(file);
  const stockHeaderIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeUploadHeader);
    return headers.includes('produto') && headers.includes('saldoatual') && headers.includes('grupo');
  });

  if (stockHeaderIndex >= 0) {
    const headers = rows[stockHeaderIndex].map(normalizeUploadHeader);
    const columns = {
      product: headers.indexOf('produto'),
      quantity: headers.indexOf('saldoatual'),
      groupCode: headers.indexOf('grupo'),
    };
    const itemsByProduct = new Map();

    rows.slice(stockHeaderIndex + 1).forEach((row) => {
      const product = normalizeUploadValue(row[columns.product]);
      const productKey = normalizeStockProduct(product);
      if (!productKey) return;

      const current = itemsByProduct.get(productKey) || {
        productKey,
        product,
        quantity: 0,
        groupCode: normalizeUploadValue(row[columns.groupCode]).replace(/\.0$/, ''),
      };
      current.quantity += parseStockQuantity(row[columns.quantity]);
      current.groupCode =
        current.groupCode || normalizeUploadValue(row[columns.groupCode]).replace(/\.0$/, '');
      itemsByProduct.set(productKey, current);
    });

    const items = [...itemsByProduct.values()].sort((a, b) =>
      a.product.localeCompare(b.product, 'pt-BR'),
    );
    if (items.length === 0) throw new Error('Nenhum produto valido foi encontrado na planilha.');
    return { type: 'stock', items };
  }

  const descriptionHeaderIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeUploadHeader);
    return headers.includes('partnumber') && headers.includes('descricao') && headers.includes('grupo');
  });
  if (descriptionHeaderIndex >= 0) {
    const headers = rows[descriptionHeaderIndex].map(normalizeUploadHeader);
    const columns = {
      product: headers.indexOf('partnumber'),
      description: headers.indexOf('descricao'),
      groupCode: headers.indexOf('grupo'),
    };
    const descriptionsByProduct = new Map();

    rows.slice(descriptionHeaderIndex + 1).forEach((row) => {
      const product = normalizeUploadValue(row[columns.product]);
      const productKey = normalizeStockProduct(product);
      const description = normalizeUploadValue(row[columns.description]);
      if (!productKey || !description) return;

      descriptionsByProduct.set(productKey, {
        productKey,
        product,
        description,
        groupCode: normalizeUploadValue(row[columns.groupCode]).replace(/\.0$/, ''),
      });
    });

    const descriptions = [...descriptionsByProduct.values()].sort((a, b) =>
      a.product.localeCompare(b.product, 'pt-BR'),
    );
    if (descriptions.length === 0) throw new Error('Nenhuma descricao valida foi encontrada na planilha.');
    return { type: 'descriptions', descriptions };
  }

  const addressHeaderIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeUploadHeader);
    return headers.includes('produto') && headers.includes('endereco') && !headers.includes('saldoatual');
  });
  if (addressHeaderIndex >= 0) {
    const headers = rows[addressHeaderIndex].map(normalizeUploadHeader);
    const columns = {
      product: headers.indexOf('produto'),
      address: headers.indexOf('endereco'),
    };
    const addressesByProduct = new Map();

    rows.slice(addressHeaderIndex + 1).forEach((row) => {
      const product = normalizeUploadValue(row[columns.product]);
      const productKey = normalizeStockProduct(product);
      const address = normalizeUploadValue(row[columns.address]);
      if (!productKey || !isValidStockAddressValue(address)) return;

      const current = addressesByProduct.get(productKey) || {
        productKey,
        product,
        addresses: new Set(),
      };
      current.addresses.add(address);
      addressesByProduct.set(productKey, current);
    });

    const addresses = [...addressesByProduct.values()]
      .map((item) => ({
        productKey: item.productKey,
        product: item.product,
        address: [...item.addresses].join(' / '),
      }))
      .sort((a, b) => a.product.localeCompare(b.product, 'pt-BR'));
    if (addresses.length === 0) throw new Error('Nenhum endereço válido foi encontrado na planilha.');
    return { type: 'addresses', addresses };
  }

  const fallbackDescriptionHeaderIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeUploadHeader);
    return headers.includes('partnumber') && headers.includes('descricao') && headers.includes('grupo');
  });
  if (fallbackDescriptionHeaderIndex < 0) {
    throw new Error('Não encontrei os cabeçalhos de estoque, endereçamento ou descrição genérica nesta planilha.');
  }

  const headers = rows[fallbackDescriptionHeaderIndex].map(normalizeUploadHeader);
  const columns = {
    product: headers.indexOf('partnumber'),
    description: headers.indexOf('descricao'),
    groupCode: headers.indexOf('grupo'),
  };
  const descriptionsByProduct = new Map();

  rows.slice(fallbackDescriptionHeaderIndex + 1).forEach((row) => {
    const product = normalizeUploadValue(row[columns.product]);
    const productKey = normalizeStockProduct(product);
    const description = normalizeUploadValue(row[columns.description]);
    if (!productKey || !description) return;

    descriptionsByProduct.set(productKey, {
      productKey,
      product,
      description,
      groupCode: normalizeUploadValue(row[columns.groupCode]).replace(/\.0$/, ''),
    });
  });

  const descriptions = [...descriptionsByProduct.values()].sort((a, b) =>
    a.product.localeCompare(b.product, 'pt-BR'),
  );
  if (descriptions.length === 0) throw new Error('Nenhuma descricao valida foi encontrada na planilha.');
  return { type: 'descriptions', descriptions };
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

function isWarrantyFinalized(entry) {
  return (entry.statuses || []).includes('Garantia Paga');
}

function isArchived(quote) {
  return Boolean(quote.archivedAt);
}

function isManuallyArchived(quote) {
  if (!isArchived(quote)) return false;

  const latestArchiveEvent = (Array.isArray(quote.history) ? quote.history : [])
    .filter((event) => event.type === 'archived')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  if (latestArchiveEvent) {
    const label = normalizeUploadText(latestArchiveEvent.label);
    return !label.includes('AUTOMATICAMENTE') && !label.includes('PELO UPLOAD');
  }

  const lossNotes = normalizeUploadText(quote.lossReason?.notes);
  if (lossNotes.includes('ARQUIVADA AUTOMATICAMENTE')) return false;
  return Boolean(quote.lossReason);
}

function isArchivedByUpload(quote) {
  if (!isArchived(quote)) return false;
  const latestArchiveEvent = (Array.isArray(quote.history) ? quote.history : [])
    .filter((event) => event.type === 'archived')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  return normalizeUploadText(latestArchiveEvent?.label).includes('PELO UPLOAD');
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

function getQuoteLastActivityAt(quote) {
  const timestamps = [quote.createdAt, quote.statusUpdatedAt, quote.followUpStartedAt]
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0);

  return timestamps.length ? new Date(Math.max(...timestamps)) : new Date(quote.createdAt);
}

function shouldAutoArchiveQuote(quote, now) {
  if (isClosed(quote) || isArchived(quote)) return false;

  const archiveAfter = addDays(getQuoteLastActivityAt(quote), AUTO_ARCHIVE_INACTIVE_DAYS);
  return archiveAfter <= now;
}

function buildUploadPreview(importedRows, quotes, ignoredCruzeiroCount, fileName) {
  const existingQuotesByNumber = new Map(
    quotes.map((quote) => [normalizeUploadQuoteNumber(quote.quoteNumber), quote]),
  );
  const existingQuoteNumbers = new Set(existingQuotesByNumber.keys());
  const existingRows = importedRows.filter((row) => existingQuoteNumbers.has(row.quoteNumber));
  const newRows = importedRows.filter((row) => !existingQuoteNumbers.has(row.quoteNumber));
  const finalizingRows = importedRows.filter((row) => {
    if (!row.orderNumber) return false;
    const quote = existingQuotesByNumber.get(row.quoteNumber);
    return !quote || quote.status !== 'fechada';
  });

  return {
    fileName,
    importedRows,
    ignoredCruzeiroCount,
    summary: {
      novos: newRows.length,
      atualizados: existingRows.length,
      finalizados: finalizingRows.length,
      arquivados: 0,
      ignorados: 0,
      cruzeiroIgnorados: ignoredCruzeiroCount,
    },
    totals: {
      open: importedRows.filter((row) => !row.orderNumber).reduce((sum, row) => sum + row.totalValue, 0),
      closed: importedRows.filter((row) => row.orderNumber).reduce((sum, row) => sum + row.totalValue, 0),
    },
  };
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
  const [rotaxRevenueEntries, setRotaxRevenueEntries] = useState([]);
  const [rotaxPartsCatalog, setRotaxPartsCatalog] = useState(null);
  const [stockCatalog, setStockCatalog] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [stockTransferLists, setStockTransferLists] = useState([]);
  const [stockTransferCandidates, setStockTransferCandidates] = useState([]);
  const [dashboardPeriod, setDashboardPeriod] = useState('current');
  const [dashboardSnapshotPeriods, setDashboardSnapshotPeriods] = useState([]);
  const [dashboardSnapshotQuotes, setDashboardSnapshotQuotes] = useState([]);
  const [dashboardControlLoaded, setDashboardControlLoaded] = useState(false);
  const [activeRotaxRevenueYear, setActiveRotaxRevenueYear] = useState(2026);
  const [customers, setCustomers] = useState([]);
  const [billingEntries, setBillingEntries] = useState([]);
  const [billingUploads, setBillingUploads] = useState([]);
  const [returnEntries, setReturnEntries] = useState([]);
  const [warrantyEntries, setWarrantyEntries] = useState([]);
  const [contractTemplates, setContractTemplates] = useState([]);
  const [activeContractType, setActiveContractType] = useState('motor');
  const [contractForms, setContractForms] = useState(initialContractForms);
  const [isSavingContractTemplate, setIsSavingContractTemplate] = useState(false);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [uploadAudits, setUploadAudits] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [activeView, setActiveView] = useState('quotes');
  const [activeTab, setActiveTab] = useState('abertas');
  const [activeTrackingTab, setActiveTrackingTab] = useState('Em andamento');
  const [activeRotaxTab, setActiveRotaxTab] = useState('students');
  const [activeRotaxSessionId, setActiveRotaxSessionId] = useState('');
  const [activeRotaxInfoCategory, setActiveRotaxInfoCategory] = useState('internal');
  const [activeBillingSeller, setActiveBillingSeller] = useState(billingSellers[0]);
  const [activeReturnTab, setActiveReturnTab] = useState('andamento');
  const [activeWarrantyTab, setActiveWarrantyTab] = useState('andamento');
  const [expandedRotaxStudentIds, setExpandedRotaxStudentIds] = useState([]);
  const [layoutMode, setLayoutMode] = useState(getStoredLayoutMode);
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [sideQuoteFormOpen, setSideQuoteFormOpen] = useState(false);
  const [isUploadingQuotes, setIsUploadingQuotes] = useState(false);
  const [isUploadingCustomers, setIsUploadingCustomers] = useState(false);
  const [isUploadingBilling, setIsUploadingBilling] = useState(false);
  const [isRestoringBilling, setIsRestoringBilling] = useState(false);
  const [isUploadingRotaxParts, setIsUploadingRotaxParts] = useState(false);
  const [isUploadingStock, setIsUploadingStock] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [expandedCustomerIds, setExpandedCustomerIds] = useState([]);
  const [expandedCustomerProductKeys, setExpandedCustomerProductKeys] = useState([]);
  const [customerEditModal, setCustomerEditModal] = useState(null);
  const [customerEditForm, setCustomerEditForm] = useState(initialCustomerEditForm);
  const [customerEditErrors, setCustomerEditErrors] = useState({});
  const [billingNoteDrafts, setBillingNoteDrafts] = useState(() => loadBillingNoteDrafts());
  const [returnModal, setReturnModal] = useState(null);
  const [returnForm, setReturnForm] = useState(initialReturnForm);
  const [returnErrors, setReturnErrors] = useState({});
  const [warrantyModal, setWarrantyModal] = useState(null);
  const [warrantyForm, setWarrantyForm] = useState(initialWarrantyForm);
  const [warrantyErrors, setWarrantyErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [trackingSearchTerm, setTrackingSearchTerm] = useState('');
  const [selectedSellers, setSelectedSellers] = useState([]);
  const [sortByRelevance, setSortByRelevance] = useState(false);
  const [quoteSort, setQuoteSort] = useState({ direction: 'desc', key: '' });
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
  const [lossModal, setLossModal] = useState(null);
  const [lossForm, setLossForm] = useState({ reason: 'sem-retorno', notes: '' });
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
  const [expandedTrackingEntryIds, setExpandedTrackingEntryIds] = useState([]);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState('');
  const [dataStatus, setDataStatus] = useState(persistenceMode === 'supabase' ? 'Supabase' : 'Local');
  const [now, setNow] = useState(new Date());
  const [saleCelebration, setSaleCelebration] = useState(null);
  const uploadInputRef = useRef(null);
  const customerUploadInputRef = useRef(null);
  const previousClosedQuoteIdsRef = useRef(null);
  const autoArchiveRunningRef = useRef(false);
  const uploadArchiveRecoveryRunningRef = useRef(false);
  const closedUnarchiveRunningRef = useRef(false);
  const celebrationTimeoutRef = useRef(null);
  const presenceSessionRef = useRef(null);
  const currentPresenceStateRef = useRef({ currentView: activeView, layoutMode });
  currentPresenceStateRef.current = { currentView: activeView, layoutMode };

  const isMasterUser = userIsMaster(user);
  const currentDashboardMonthKey = getDashboardMonthKey(now);

  useEffect(() => {
    if (!user) {
      setUserProfiles([]);
      setActivityLogs([]);
      setOnlineUsers([]);
      return () => {};
    }

    let active = true;
    let unsubscribeActivity = () => {};
    const presenceSession = startUserPresence(user, { currentView: activeView, layoutMode }, (presences) => {
      if (active && userIsMaster(user)) setOnlineUsers(presences);
    });
    presenceSessionRef.current = presenceSession;

    registerUserProfile(user, activeView).catch((error) => {
      if (active && error.code !== '42P01') setAppError(error.message || 'Não foi possível registrar a presença do usuário.');
    });

    if (userIsMaster(user)) {
      loadUserActivity()
        .then(({ profiles, logs }) => {
          if (!active) return;
          setUserProfiles(profiles);
          setActivityLogs(logs);
        })
        .catch((error) => {
          if (active) setAppError(error.message || 'Não foi possível carregar a atividade dos usuários.');
        });

      unsubscribeActivity = subscribeToUserActivity(({ collection, eventType, item, oldId }) => {
        if (!active) return;

        if (collection === 'logs' && item) {
          setActivityLogs((current) => [item, ...current.filter((log) => log.id !== item.id)].slice(0, 500));
          return;
        }

        if (collection === 'profiles') {
          setUserProfiles((current) => {
            if (eventType === 'DELETE') return current.filter((profile) => profile.id !== oldId);
            if (!item) return current;
            return [item, ...current.filter((profile) => profile.id !== item.id)].sort(
              (a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt),
            );
          });
        }
      });
    }

    const heartbeat = window.setInterval(() => {
      const currentState = currentPresenceStateRef.current;
      registerUserProfile(user, currentState.currentView).catch(() => {});
      presenceSession.update(currentState).catch(() => {});
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(heartbeat);
      unsubscribeActivity();
      presenceSession.unsubscribe();
      if (presenceSessionRef.current === presenceSession) presenceSessionRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    registerUserProfile(user, activeView).catch(() => {});
    presenceSessionRef.current?.update({ currentView: activeView, layoutMode }).catch(() => {});
  }, [activeView, layoutMode, user]);
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
      setUploadAudits([]);
      setRotaxBlocks([]);
      setRotaxSessions([]);
      setRotaxStudents([]);
      setRotaxContacts([]);
      setRotaxRevenueEntries([]);
      setCustomers([]);
      setBillingEntries([]);
      setBillingUploads([]);
      setReturnEntries([]);
      setWarrantyEntries([]);
      setContractTemplates([]);
      setUploadAudits([]);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    Promise.all([
      loadStoredQuotes(),
      loadTrackingEntries(),
      loadInfoBlocks(),
      loadRotaxTrainingData(),
      loadUploadAudits(),
      loadCustomers(),
      loadContractTemplates(),
      loadBillingEntries(),
      loadReturnEntries(),
      loadWarrantyEntries(),
    ])
      .then(
        ([
          quoteResult,
          trackingResult,
          infoResult,
          rotaxResult,
          uploadAuditResult,
          customerResult,
          contractTemplateResult,
          billingResult,
          returnResult,
          warrantyResult,
        ]) => {
        if (!active) return;
        setQuotes(quoteResult.quotes);
        setTrackingEntries(trackingResult.entries);
        setInfoBlocks(infoResult.blocks);
        setRotaxBlocks(rotaxResult.blocks);
        setRotaxSessions(rotaxResult.sessions);
        setRotaxStudents(rotaxResult.students);
        setRotaxContacts(rotaxResult.contacts);
        setUploadAudits(uploadAuditResult.audits);
        setCustomers(customerResult.customers);
        setContractTemplates(contractTemplateResult.templates);
        setBillingEntries(billingResult.entries);
        setBillingUploads(billingResult.uploads || []);
        setReturnEntries(returnResult.entries);
        setWarrantyEntries(warrantyResult.entries);
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
          const unsubscribeCustomers = subscribeToCustomerChanges(({ eventType, customer, oldId }) => {
            setCustomers((current) => syncCollection(current, eventType, customer, oldId, sortCustomers, cacheCustomers));
          });
          const unsubscribeContractTemplates = subscribeToContractTemplateChanges(({ eventType, template, oldId }) => {
            setContractTemplates((current) => {
              let nextTemplates = current;
              if ((eventType === 'INSERT' || eventType === 'UPDATE') && template) {
                nextTemplates = [template, ...current.filter((item) => item.type !== template.type)];
              }
              if (eventType === 'DELETE' && oldId) {
                nextTemplates = current.filter((item) => item.type !== oldId);
              }
              const sortedTemplates = [...nextTemplates].sort((a, b) => a.type.localeCompare(b.type));
              cacheContractTemplates(sortedTemplates);
              return sortedTemplates;
            });
          });
          const unsubscribeBilling = subscribeToBillingChanges(({ collection, eventType, entry, upload, oldId }) => {
            if (collection === 'uploads') {
              setBillingUploads((current) => {
                if (eventType === 'DELETE') return current.filter((item) => item.seller !== oldId);
                if (!upload) return current;
                return [upload, ...current.filter((item) => item.seller !== upload.seller)];
              });
              return;
            }
            setBillingEntries((current) => syncCollection(current, eventType, entry, oldId, sortBillingEntries, cacheBillingEntries));
          });
          const unsubscribeReturns = subscribeToReturnChanges(({ eventType, entry, oldId }) => {
            setReturnEntries((current) => syncCollection(current, eventType, entry, oldId, sortReturnEntries, cacheReturnEntries));
          });
          const unsubscribeWarranties = subscribeToWarrantyChanges(({ eventType, entry, oldId }) => {
            setWarrantyEntries((current) => syncCollection(current, eventType, entry, oldId, sortWarrantyEntries, cacheWarrantyEntries));
          });

          unsubscribeRealtime = () => {
            unsubscribeQuotes();
            unsubscribeTracking();
            unsubscribeInfoBlocks();
            unsubscribeRotax();
            unsubscribeCustomers();
            unsubscribeContractTemplates();
            unsubscribeBilling();
            unsubscribeReturns();
            unsubscribeWarranties();
          };
        }
      },
      )
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
    let active = true;
    let unsubscribe = () => {};
    if (!authChecked || (isSupabaseConfigured && !user)) {
      setDashboardPeriod('current');
      setDashboardSnapshotPeriods([]);
      setDashboardSnapshotQuotes([]);
      setDashboardControlLoaded(false);
      return () => {};
    }

    loadDashboardControl()
      .then(({ setting, snapshots, mode }) => {
        if (!active) return;
        setDashboardPeriod(setting.periodKey || 'current');
        setDashboardSnapshotPeriods(snapshots);
        setDashboardControlLoaded(true);
        if (mode === 'supabase') {
          unsubscribe = subscribeToDashboardSetting((nextSetting) => {
            if (active) setDashboardPeriod(nextSetting.periodKey || 'current');
          });
        }
      })
      .catch((error) => {
        if (!active) return;
        setDashboardControlLoaded(true);
        setAppError(error.message || 'Não foi possível carregar a configuração do dashboard.');
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authChecked, user]);

  useEffect(() => {
    let active = true;
    if (!dashboardControlLoaded || dashboardPeriod === 'current' || dashboardPeriod === 'general') {
      setDashboardSnapshotQuotes([]);
      return () => {
        active = false;
      };
    }

    loadDashboardSnapshot(dashboardPeriod)
      .then((snapshot) => {
        if (active) setDashboardSnapshotQuotes(snapshot?.quotes || []);
      })
      .catch((error) => {
        if (active) setAppError(error.message || 'Não foi possível carregar o histórico do dashboard.');
      });

    return () => {
      active = false;
    };
  }, [dashboardControlLoaded, dashboardPeriod]);

  useEffect(() => {
    if (!dashboardControlLoaded || isLoading || !user) return () => {};

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const periodQuotes = serializeDashboardQuotes(
          quotes.filter((quote) => getQuoteDashboardMonthKey(quote) === currentDashboardMonthKey),
        );
        const savedSnapshot = await saveDashboardSnapshot(
          currentDashboardMonthKey,
          periodQuotes,
          user.email || '',
        );
        if (!active) return;
        setDashboardSnapshotPeriods((current) => [
          { periodKey: savedSnapshot.periodKey, capturedAt: savedSnapshot.capturedAt },
          ...current.filter((snapshot) => snapshot.periodKey !== savedSnapshot.periodKey),
        ].sort((a, b) => b.periodKey.localeCompare(a.periodKey)));
      } catch {
        // The dashboard remains usable even if a background snapshot retry is needed.
      }
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [currentDashboardMonthKey, dashboardControlLoaded, isLoading, quotes, user]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    if (!authChecked || (isSupabaseConfigured && !user)) {
      setStockCatalog(null);
      setStockItems([]);
      setStockTransferLists([]);
      setStockTransferCandidates([]);
      return () => {};
    }

    loadStockTransferData()
      .then((result) => {
        if (!active) return;
        setStockCatalog(result.catalog);
        setStockItems(result.items);
        setStockTransferLists(result.lists);
        setStockTransferCandidates(result.candidates || []);

        if (result.mode === 'supabase') {
          unsubscribe = subscribeToStockTransferChanges(({ collection, eventType, item, oldId }) => {
            if (!active) return;
            if (collection === 'catalog') {
              setStockCatalog(item);
              loadStockItems()
                .then((items) => {
                  if (active) setStockItems(items);
                })
                .catch(() => {});
              return;
            }

            if (collection === 'candidates') {
              setStockTransferCandidates((current) => {
                if (eventType === 'DELETE') return current.filter((candidate) => candidate.productKey !== oldId);
                if (!item) return current;
                return [item, ...current.filter((candidate) => candidate.productKey !== item.productKey)];
              });
              return;
            }

            setStockTransferLists((current) => {
              if (eventType === 'DELETE') return current.filter((list) => list.id !== oldId);
              if (!item) return current;
              return [item, ...current.filter((list) => list.id !== item.id)].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
              );
            });
          });
        }
      })
      .catch((error) => {
        if (active) setAppError(error.message || 'Não foi possível carregar os dados de transferência.');
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authChecked, user]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    if (!authChecked || (isSupabaseConfigured && !user)) {
      setRotaxPartsCatalog(null);
      return () => {};
    }

    loadRotaxPartsCatalog()
      .then(({ catalog, mode }) => {
        if (!active) return;
        setRotaxPartsCatalog(catalog);
        if (mode === 'supabase') {
          unsubscribe = subscribeToRotaxPartsCatalog((nextCatalog) => {
            if (active) setRotaxPartsCatalog(nextCatalog);
          });
        }
      })
      .catch((error) => {
        if (active) setAppError(error.message || 'Não foi possível carregar o catálogo Rotax.');
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authChecked, user]);

  useEffect(() => {
    let active = true;
    let unsubscribeRealtime = () => {};

    if (!authChecked) return () => {};

    if (isSupabaseConfigured && !user) {
      setRotaxRevenueEntries([]);
      return () => {
        active = false;
      };
    }

    loadRotaxRevenueEntries()
      .then((result) => {
        if (!active) return;
        setRotaxRevenueEntries(result.entries);
        setActiveRotaxRevenueYear((currentYear) => {
          if (result.entries.some((entry) => Number(entry.year) === Number(currentYear))) return currentYear;
          return result.entries[0]?.year || 2026;
        });

        if (result.mode === 'supabase') {
          unsubscribeRealtime = subscribeToRotaxRevenueChanges(({ eventType, entry, oldId }) => {
            setRotaxRevenueEntries((current) =>
              syncCollection(current, eventType, entry, oldId, sortRotaxRevenueEntries, cacheRotaxRevenueEntries),
            );
          });
        }
      })
      .catch((error) => {
        if (!active) return;
        setAppError(error.message || 'Nao foi possivel carregar o faturamento Rotax.');
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
    if (isLoading) {
      previousClosedQuoteIdsRef.current = null;
      return;
    }

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
  }, [isLoading, quotes]);

  useEffect(() => {
    if (isLoading || uploadArchiveRecoveryRunningRef.current) return;

    const quotesToRestore = quotes.filter((quote) => {
      if (isClosed(quote) || !isArchivedByUpload(quote)) return false;
      return !shouldAutoArchiveQuote({ ...quote, archivedAt: '' }, now);
    });
    if (quotesToRestore.length === 0) return;

    uploadArchiveRecoveryRunningRef.current = true;
    const previousQuotes = quotes;
    const restoredAt = new Date().toISOString();
    const changesById = new Map(
      quotesToRestore.map((quote) => [
        quote.id,
        {
          archivedAt: '',
          history: appendQuoteHistory(
            quote,
            buildQuoteHistoryEvent('updated', 'Reativada após correção do upload', {}, restoredAt),
          ),
        },
      ]),
    );

    setQuotes((current) =>
      current.map((quote) => (changesById.has(quote.id) ? { ...quote, ...changesById.get(quote.id) } : quote)),
    );

    Promise.all(quotesToRestore.map((quote) => updateQuote(quote.id, changesById.get(quote.id))))
      .then((savedQuotes) => {
        const savedById = new Map(savedQuotes.map((quote) => [quote.id, quote]));
        setQuotes((current) => current.map((quote) => savedById.get(quote.id) || quote));
        setAppError('');
      })
      .catch((error) => {
        setQuotes(previousQuotes);
        setAppError(error.message || 'Não foi possível reativar as cotações arquivadas pelo upload.');
      })
      .finally(() => {
        uploadArchiveRecoveryRunningRef.current = false;
      });
  }, [isLoading, now, quotes]);

  useEffect(() => {
    if (isLoading || autoArchiveRunningRef.current) return;

    const quotesToArchive = quotes.filter((quote) => shouldAutoArchiveQuote(quote, now));
    if (quotesToArchive.length === 0) return;

    autoArchiveRunningRef.current = true;
    const archivedAt = new Date().toISOString();
    const previousQuotes = quotes;
    const quoteIds = new Set(quotesToArchive.map((quote) => quote.id));

    const changesById = new Map(
      quotesToArchive.map((quote) => {
        const lossReason = { reason: 'sem-retorno', notes: 'Arquivada automaticamente apos 15 dias sem atividade.' };
        return [
          quote.id,
          {
            archivedAt,
            lossReason,
            history: appendQuoteHistory(
              quote,
              buildQuoteHistoryEvent('archived', 'Arquivada automaticamente', { reason: getLossReasonLabel(lossReason.reason) }, archivedAt),
            ),
          },
        ];
      }),
    );

    setQuotes((current) =>
      current.map((quote) => (quoteIds.has(quote.id) ? { ...quote, ...changesById.get(quote.id) } : quote)),
    );

    Promise.all(quotesToArchive.map((quote) => updateQuote(quote.id, changesById.get(quote.id))))
      .then((savedQuotes) => {
        const savedById = new Map(savedQuotes.filter(Boolean).map((quote) => [quote.id, quote]));
        setQuotes((current) => current.map((quote) => savedById.get(quote.id) || quote));
        setAppError('');
      })
      .catch((error) => {
        setQuotes(previousQuotes);
        setAppError(error.message || 'Nao foi possivel arquivar automaticamente cotacoes antigas.');
      })
      .finally(() => {
        autoArchiveRunningRef.current = false;
      });
  }, [isLoading, now, quotes]);

  useEffect(() => {
    if (isLoading || closedUnarchiveRunningRef.current) return;

    const closedArchivedQuotes = quotes.filter(
      (quote) => isClosed(quote) && isArchived(quote) && !isManuallyArchived(quote),
    );
    if (closedArchivedQuotes.length === 0) return;

    closedUnarchiveRunningRef.current = true;
    const previousQuotes = quotes;
    const quoteIds = new Set(closedArchivedQuotes.map((quote) => quote.id));

    setQuotes((current) =>
      current.map((quote) => (quoteIds.has(quote.id) ? { ...quote, archivedAt: '' } : quote)),
    );

    Promise.all(closedArchivedQuotes.map((quote) => updateQuote(quote.id, { archivedAt: '' })))
      .then((savedQuotes) => {
        const savedById = new Map(savedQuotes.filter(Boolean).map((quote) => [quote.id, quote]));
        setQuotes((current) => current.map((quote) => savedById.get(quote.id) || quote));
        setAppError('');
      })
      .catch((error) => {
        setQuotes(previousQuotes);
        setAppError(error.message || 'Nao foi possivel reativar cotacoes fechadas no dashboard.');
      })
      .finally(() => {
        closedUnarchiveRunningRef.current = false;
      });
  }, [isLoading, quotes]);

  useEffect(() => {
    const activeSessions = rotaxSessions.filter((session) => !isRotaxSessionArchived(session));
    const archivedSessions = rotaxSessions.filter(isRotaxSessionArchived);
    const selectableSessions = activeRotaxTab === 'archived' ? archivedSessions : activeSessions;

    if (!selectableSessions.length) {
      setActiveRotaxSessionId('');
      return;
    }

    if (!activeRotaxSessionId || !selectableSessions.some((session) => session.id === activeRotaxSessionId)) {
      setActiveRotaxSessionId(selectableSessions[0].id);
    }
  }, [activeRotaxSessionId, activeRotaxTab, rotaxSessions]);

  const metrics = useMemo(() => {
    const followUpDue = quotes.filter((quote) => isFollowUpDue(quote, now));
    const unchangedStatus = quotes.filter((quote) => isStatusUnchanged(quote, now));
    const highValueFollowUps = followUpDue.filter((quote) => getQuoteNumericValue(quote) >= 50000);
    const followUpsBySeller = sellers
      .map((seller) => ({
        seller,
        total: followUpDue.filter((quote) => quote.seller === seller).length,
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);
    const stoppedHighValueQuote = quotes
      .filter((quote) => !isClosed(quote) && !isArchived(quote) && getQuoteNumericValue(quote) >= 50000)
      .map((quote) => ({ quote, inactiveDays: getQuoteInactiveDays(quote, now) }))
      .filter((item) => item.inactiveDays >= 5)
      .sort((a, b) => getQuoteNumericValue(b.quote) - getQuoteNumericValue(a.quote))[0];

    return {
      abertas: quotes.filter((quote) => !isClosed(quote) && !isArchived(quote)).length,
      followup: followUpDue.length,
      fechadas: quotes.filter(isClosed).length,
      arquivadas: quotes.filter(isArchived).length,
      todas: quotes.length,
      followUpDue: followUpDue.length,
      unchangedStatus: unchangedStatus.length,
      smartAlerts: [
        highValueFollowUps.length
          ? `${highValueFollowUps.length} cotacao(oes) acima de R$ 50 mil estao sem follow-up`
          : '',
        followUpsBySeller[0] ? `${followUpsBySeller[0].seller} tem ${followUpsBySeller[0].total} follow-up(s) vencido(s)` : '',
        stoppedHighValueQuote
          ? `Cotacao ${stoppedHighValueQuote.quote.quoteNumber} de ${formatCurrencyValue(
              getQuoteNumericValue(stoppedHighValueQuote.quote),
            )} esta ha ${stoppedHighValueQuote.inactiveDays} dias sem alteracao`
          : '',
      ].filter(Boolean),
    };
  }, [quotes, now]);

  const trackingMetrics = useMemo(
    () => ({
      andamento: trackingEntries.filter((entry) => entry.status === 'Em andamento').length,
      finalizado: trackingEntries.filter((entry) => entry.status === 'Finalizado').length,
      importacao: trackingEntries.filter((entry) => entry.status === 'Importação').length,
      withoutCode: trackingEntries.filter((entry) => entry.status === 'Em andamento' && !entry.trackingCode.trim()).length,
    }),
    [trackingEntries],
  );

  const visibleCustomers = useMemo(() => {
    const query = normalize(customerSearchTerm);
    if (!query) return customers;

    return customers.filter((customer) => {
      const purchaseSearchValues = (customer.purchases || []).flatMap((purchase) => [
        purchase.productPartNumber,
        purchase.productDescription,
      ]);

      return [customer.clientName, customer.clientCode, customer.seller, customer.document, customer.phone, customer.email, ...purchaseSearchValues]
        .filter(Boolean)
        .some((value) => normalize(value).includes(query));
    });
  }, [customerSearchTerm, customers]);

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
        if (quoteSort.key) {
          const directionFactor = quoteSort.direction === 'asc' ? 1 : -1;
          let sortResult = 0;

          if (quoteSort.key === 'quoteNumber') sortResult = compareQuoteNumbers(a.quoteNumber, b.quoteNumber);
          if (quoteSort.key === 'value') sortResult = getQuoteNumericValue(a) - getQuoteNumericValue(b);
          if (quoteSort.key === 'date') sortResult = getQuoteSortDate(a) - getQuoteSortDate(b);

          if (sortResult !== 0) return sortResult * directionFactor;
        }

        if (sortByRelevance) {
          const relevanceDiff = getQuoteInterestStars(b) - getQuoteInterestStars(a);
          if (relevanceDiff !== 0) return relevanceDiff;
        }

        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [activeTab, now, quoteSort, quotes, searchTerm, selectedSellers, sortByRelevance]);

  const visibleTrackingEntries = useMemo(
    () => {
      const query = normalize(trackingSearchTerm);

      return trackingEntries
        .filter((entry) => entry.status === activeTrackingTab)
        .filter((entry) => {
          if (!query) return true;
          const customer = customers.find((item) => normalize(item.clientName || '') === normalize(entry.clientName || ''));

          return [
            entry.quoteNumber,
            entry.clientName,
            entry.phone || customer?.phone,
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
    [activeTrackingTab, customers, trackingEntries, trackingSearchTerm],
  );

  const correiosTrackingCandidates = useMemo(
    () => trackingEntries.filter(isCorreiosTrackingCandidate),
    [trackingEntries],
  );

  const visibleReturnEntries = useMemo(
    () =>
      returnEntries.filter((entry) =>
        activeReturnTab === 'finalizado' ? entry.status === 'Finalizado' : entry.status !== 'Finalizado',
      ),
    [activeReturnTab, returnEntries],
  );

  const visibleWarrantyEntries = useMemo(
    () =>
      warrantyEntries.filter((entry) =>
        activeWarrantyTab === 'finalizada' ? isWarrantyFinalized(entry) : !isWarrantyFinalized(entry),
      ),
    [activeWarrantyTab, warrantyEntries],
  );

  const dashboardDisplayedQuotes = useMemo(() => {
    if (dashboardPeriod === 'general') return quotes;
    if (dashboardPeriod === 'current') {
      const currentMonthKey = getDashboardMonthKey(now);
      return quotes.filter((quote) => getQuoteDashboardMonthKey(quote) === currentMonthKey);
    }
    return dashboardSnapshotQuotes;
  }, [dashboardPeriod, dashboardSnapshotQuotes, now, quotes]);

  const rotaxMetrics = useMemo(
    () => ({
      contacts: rotaxContacts.length,
      students: rotaxStudents.filter((student) => {
        const session = rotaxSessions.find((item) => item.id === student.trainingSessionId);
        return !isRotaxSessionArchived(session);
      }).length,
      archived: rotaxSessions.filter(isRotaxSessionArchived).length,
    }),
    [rotaxContacts, rotaxSessions, rotaxStudents],
  );

  const activeRotaxBlocks = useMemo(
    () => rotaxBlocks.filter((block) => block.category === activeRotaxInfoCategory),
    [activeRotaxInfoCategory, rotaxBlocks],
  );

  const visibleRotaxStudents = useMemo(() => {
    if (!activeRotaxSessionId) return [];
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

  async function archiveRotaxSession(sessionId) {
    const session = rotaxSessions.find((item) => item.id === sessionId);
    if (!session || isRotaxSessionArchived(session)) return;
    if (!hasRotaxSessionPassed(session)) {
      setAppError('Treinamentos so podem ser arquivados depois que a data passar.');
      return;
    }

    const confirmed = window.confirm(`Arquivar o treinamento de ${getRotaxSessionLabel(session)}?`);
    if (!confirmed) return;

    const archivedAt = new Date().toISOString();
    const previousSessions = rotaxSessions;
    setRotaxSessions((current) => sortRotaxSessions(current.map((item) => (item.id === sessionId ? { ...item, archivedAt } : item))));
    setActiveRotaxTab('archived');
    setActiveRotaxSessionId(sessionId);

    try {
      const savedSession = await updateRotaxSession(sessionId, { archivedAt });
      setRotaxSessions((current) => sortRotaxSessions(current.map((item) => (item.id === savedSession.id ? savedSession : item))));
      setAppError('Treinamento arquivado.');
    } catch (error) {
      setRotaxSessions(previousSessions);
      setActiveRotaxTab('students');
      setActiveRotaxSessionId(sessionId);
      setAppError(error.message || 'Nao foi possivel arquivar o treinamento.');
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
    const nextValue = field === 'quoteValue' ? formatCurrencyInput(value) : value;

    setForm((current) => {
      if (field === 'followUpUsesTime') {
        return { ...current, followUpUsesTime: nextValue, followUpUnit: nextValue ? 'hours' : 'days' };
      }

      if (field === 'clientName') {
        const customer = findCustomerByName(nextValue);
        return {
          ...current,
          clientName: nextValue,
          phone: customer?.phone || current.phone,
        };
      }

      return { ...current, [field]: nextValue };
    });
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  function findCustomerByName(value) {
    const normalized = normalize(value || '');
    if (!normalized) return null;
    return customers.find((customer) => normalize(customer.clientName || '') === normalized) || null;
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
      nextQuote.history = createInitialQuoteHistory(nextQuote, createdAt, 'layout vovo');

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
    changes.history = appendQuoteHistory(
      quote,
      buildQuoteHistoryEvent('updated', 'Cotacao atualizada pelo layout vovo', {}, new Date().toISOString()),
    );

    if (Object.keys(changes).length === 1 && changes.history) {
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

      const historyEvents = [
        buildQuoteHistoryEvent('updated', 'Cotacao atualizada', { source: 'formulario' }, createdAt),
      ];
      if ((existingQuote.notes || '').trim() !== form.notes.trim() && form.notes.trim()) {
        historyEvents.push(buildQuoteHistoryEvent('notes', 'Observacao adicionada', {}, createdAt));
      }
      changes.history = appendQuoteHistory(existingQuote, historyEvents);

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
    nextQuote.history = createInitialQuoteHistory(nextQuote, createdAt);

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

    await prepareQuotesUpload(file);
  }

  async function prepareQuotesUpload(file, options = {}) {
    if (!file) return false;
    setIsUploadingQuotes(true);

    try {
      const { ignoredCruzeiroCount, rows: importedRows } = await parseQuotesUploadFile(file);
      if (importedRows.length === 0) {
        throw new Error('Nenhum orçamento válido foi encontrado na segunda aba da planilha.');
      }

      setUploadPreview(buildUploadPreview(importedRows, quotes, ignoredCruzeiroCount, file.name));
      setAppError('');
      return true;

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
        const hasUploadClientName = row.clientName && !isFinalClientName(row.clientName);
        const shouldUpdateClientName = hasUploadClientName && (isFinalClientName(existingQuote.clientName) || existingQuote.clientName !== row.clientName);
        const changes = {
          archivedAt: isManuallyArchived(existingQuote) ? existingQuote.archivedAt : '',
          quoteValue: formattedTotalValue,
          isInterest: existingQuote.isInterest || row.totalValue >= 5000,
        };
        if (shouldUpdateClientName) changes.clientName = row.clientName;

        if (isClosedUpload) {
          const existingTrackingEntry = trackingEntries.find((entry) => entry.quoteId === existingQuote.id);
          changes.status = 'fechada';
          changes.statusUpdatedAt = existingQuote.status === 'fechada' ? existingQuote.statusUpdatedAt || closedAt : closedAt;
          changes.closeDetails = {
            orderNumber: row.orderNumber,
            agreedPaymentTerms: existingQuote.closeDetails?.agreedPaymentTerms || '',
            carrier:
              existingTrackingEntry?.carrier ||
              existingQuote.closeDetails?.carrier ||
              existingQuote.closeDetails?.freight ||
              '',
            totalValue: formattedTotalValue,
            notes: existingQuote.closeDetails?.notes || '',
            closedAt: existingQuote.closeDetails?.closedAt || closedAt,
          };
        } else if (existingQuote.status === 'fechada' || existingQuote.closeDetails) {
          changes.status = 'sem-resposta';
          changes.statusUpdatedAt = closedAt;
          changes.closeDetails = undefined;
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
          await ensureCustomerFromClosedQuote(savedQuote, savedQuote.closeDetails);
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
          await ensureCustomerFromClosedQuote(savedQuote, savedQuote.closeDetails);
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
        `Upload concluído: ${savedQuotes.length} orçamento(s) novo(s), ${updatedQuotes.length} atualizado(s) e ${closedCount} finalizado(s).`,
      );
    } catch (error) {
      setAppError(error.message || 'Não foi possível importar a planilha.');
      if (options.rethrow) throw error;
      return false;
    } finally {
      setIsUploadingQuotes(false);
    }
  }

  async function confirmQuotesUpload() {
    if (!uploadPreview) return;

    setIsUploadingQuotes(true);

    try {
      const importedRows = uploadPreview.importedRows;
      const existingQuotesByNumber = new Map(quotes.map((quote) => [normalizeUploadQuoteNumber(quote.quoteNumber), quote]));
      const existingQuoteNumbers = new Set(existingQuotesByNumber.keys());
      const existingRows = importedRows.filter((row) => existingQuoteNumbers.has(row.quoteNumber));
      const newRows = importedRows.filter((row) => !existingQuoteNumbers.has(row.quoteNumber));
      const savedQuotes = [];
      const updatedQuotes = [];
      let closedCount = 0;

      for (const row of existingRows) {
        const existingQuote = existingQuotesByNumber.get(row.quoteNumber);
        if (!existingQuote) continue;

        const changedAt = new Date().toISOString();
        const formattedTotalValue = formatUploadCurrency(row.totalValue);
        const isClosedUpload = Boolean(row.orderNumber);
        const hasUploadClientName = row.clientName && !isFinalClientName(row.clientName);
        const shouldUpdateClientName =
          hasUploadClientName && (isFinalClientName(existingQuote.clientName) || existingQuote.clientName !== row.clientName);
        const changes = {
          archivedAt: isManuallyArchived(existingQuote) ? existingQuote.archivedAt : '',
          quoteValue: formattedTotalValue,
          isInterest: existingQuote.isInterest || row.totalValue >= 5000,
        };
        const historyEvents = [];

        if (shouldUpdateClientName) {
          changes.clientName = row.clientName;
          historyEvents.push(buildQuoteHistoryEvent('updated', 'Cliente atualizado pelo upload', {}, changedAt));
        }

        if (existingQuote.quoteValue !== formattedTotalValue) {
          historyEvents.push(buildQuoteHistoryEvent('updated', 'Valor atualizado pelo upload', { value: formattedTotalValue }, changedAt));
        }

        if (isClosedUpload) {
          const existingTrackingEntry = trackingEntries.find((entry) => entry.quoteId === existingQuote.id);
          changes.status = 'fechada';
          changes.statusUpdatedAt = existingQuote.status === 'fechada' ? existingQuote.statusUpdatedAt || changedAt : changedAt;
          changes.closeDetails = {
            orderNumber: row.orderNumber,
            agreedPaymentTerms: existingQuote.closeDetails?.agreedPaymentTerms || '',
            carrier:
              existingTrackingEntry?.carrier ||
              existingQuote.closeDetails?.carrier ||
              existingQuote.closeDetails?.freight ||
              '',
            totalValue: formattedTotalValue,
            notes: existingQuote.closeDetails?.notes || '',
            closedAt: existingQuote.closeDetails?.closedAt || changedAt,
          };
          if (existingQuote.status !== 'fechada') {
            historyEvents.push(buildQuoteHistoryEvent('closed', 'Virou pedido pelo upload', { orderNumber: row.orderNumber }, changedAt));
          }
        } else if (existingQuote.status === 'fechada' || existingQuote.closeDetails) {
          changes.status = 'sem-resposta';
          changes.statusUpdatedAt = changedAt;
          changes.closeDetails = undefined;
          historyEvents.push(buildQuoteHistoryEvent('status', 'Status voltou para sem resposta pelo upload', {}, changedAt));
        }

        if (historyEvents.length) changes.history = appendQuoteHistory(existingQuote, historyEvents);

        const hasChanges = Object.entries(changes).some(([key, value]) => {
          if (key === 'closeDetails') return JSON.stringify(existingQuote.closeDetails || null) !== JSON.stringify(value || null);
          if (key === 'history') return true;
          return existingQuote[key] !== value;
        });

        if (!hasChanges) continue;

        const savedQuote = await updateQuote(existingQuote.id, changes);
        updatedQuotes.push(savedQuote);

        if (isClosedUpload && savedQuote.closeDetails) {
          if (existingQuote.status !== 'fechada') closedCount += 1;
          await ensureTrackingEntry(savedQuote, savedQuote.closeDetails);
          await ensureCustomerFromClosedQuote(savedQuote, savedQuote.closeDetails);
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
        nextQuote.history = [
          ...createInitialQuoteHistory(nextQuote, createdAt, 'upload'),
          ...(isClosedUpload ? [buildQuoteHistoryEvent('closed', 'Virou pedido pelo upload', { orderNumber: row.orderNumber }, createdAt)] : []),
        ];

        const savedQuote = await createQuote(nextQuote);
        savedQuotes.push(savedQuote);
        existingQuoteNumbers.add(normalizeUploadQuoteNumber(savedQuote.quoteNumber));

        if (isClosedUpload && savedQuote.closeDetails) {
          closedCount += 1;
          await ensureTrackingEntry(savedQuote, savedQuote.closeDetails);
          await ensureCustomerFromClosedQuote(savedQuote, savedQuote.closeDetails);
        }
      }

      setQuotes((current) => {
        const changedQuotes = [...savedQuotes, ...updatedQuotes];
        return [...changedQuotes, ...current.filter((quote) => !changedQuotes.some((saved) => saved.id === quote.id))];
      });

      const audit = {
        id: crypto.randomUUID(),
        userEmail: user?.email || '',
        fileName: uploadPreview.fileName,
        summary: {
          ...uploadPreview.summary,
          novos: savedQuotes.length,
          atualizados: updatedQuotes.length,
          finalizados: closedCount,
          arquivados: 0,
        },
        totalOpenValue: uploadPreview.totals.open,
        totalClosedValue: uploadPreview.totals.closed,
        createdAt: new Date().toISOString(),
      };
      const savedAudit = await createUploadAudit(audit);
      setUploadAudits((current) => [savedAudit, ...current]);
      setUploadPreview(null);
      setActiveView('quotes');
      setActiveTab('abertas');
      setAppError(
        `Upload concluido: ${savedQuotes.length} orcamento(s) novo(s), ${updatedQuotes.length} atualizado(s) e ${closedCount} finalizado(s).`,
      );
    } catch (error) {
      setAppError(error.message || 'Nao foi possivel importar a planilha.');
    } finally {
      setIsUploadingQuotes(false);
    }
  }

  function cancelQuotesUploadPreview() {
    setUploadPreview(null);
  }

  async function handleCustomersUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    await uploadCustomersFile(file);
  }

  async function uploadCustomersFile(file, options = {}) {
    if (!file) return false;
    setIsUploadingCustomers(true);

    try {
      const importedCustomers = await parseCustomersUploadFile(file, customers);
      const savedCustomers = await upsertCustomers(importedCustomers);
      setCustomers((current) => {
        const byId = new Map(current.map((customer) => [customer.id, customer]));
        savedCustomers.forEach((customer) => byId.set(customer.id, customer));
        return sortCustomers([...byId.values()]);
      });
      if (!options.keepView) setActiveView('customers');
      setAppError(`Clientes atualizados: ${savedCustomers.length} cadastro(s) processado(s).`);
      return true;
    } catch (error) {
      setAppError(error.message || 'Nao foi possivel importar a base de clientes.');
      if (options.rethrow) throw error;
      return false;
    } finally {
      setIsUploadingCustomers(false);
    }
  }

  async function handleBillingUpload(file, seller, options = {}) {
    if (!file || !seller) return;

    setIsUploadingBilling(true);

    try {
      const importedRows = await parseBillingUploadFile(file);
      const result = await replaceBillingEntriesForSellerWithSnapshot(seller, importedRows, {
        seller,
        fileName: file.name,
        userId: user?.id || '',
        userEmail: user?.email || '',
        userName: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '',
      });
      const savedEntries = result.entries;
      const savedUpload = result.upload;
      setBillingEntries((current) => sortBillingEntries([...current.filter((entry) => entry.seller !== seller), ...savedEntries]));
      setBillingUploads((current) => [savedUpload, ...current.filter((upload) => upload.seller !== seller)]);
      if (!options.keepView) {
        setActiveView('billing');
        setActiveBillingSeller(seller);
      }
      setAppError(`Cobrança de ${seller} atualizada: ${savedEntries.length} titulo(s) importado(s).`);
      return true;
    } catch (error) {
      setAppError(error.message || 'Nao foi possivel importar a planilha de cobranca.');
      if (options.rethrow) throw error;
      return false;
    } finally {
      setIsUploadingBilling(false);
    }
  }

  async function handleRotaxPartsUpload(file, options = {}) {
    if (!file) return;
    setIsUploadingRotaxParts(true);

    try {
      const parts = await parseRotaxPartsUploadFile(file);
      const catalog = await replaceRotaxParts(parts, {
        fileName: file.name,
        updatedBy: user?.email || '',
      });
      setRotaxPartsCatalog(catalog);
      if (!options.keepView) setActiveView('rotaxParts');
      setAppError(`Catálogo Rotax atualizado: ${parts.length} PN(s) importado(s).`);
      return true;
    } catch (error) {
      setAppError(error.message || 'Não foi possível importar a tabela de PN Rotax.');
      if (options.rethrow) throw error;
      return false;
    } finally {
      setIsUploadingRotaxParts(false);
    }
  }

  async function handleStockUpload(file, options = {}) {
    if (!file) return;
    setIsUploadingStock(true);
    try {
      const upload = await parseStockTransferUploadFile(file);
      if (upload.type === 'descriptions') {
        await upsertStockProductDescriptions(upload.descriptions, {
          updatedBy: user?.email || '',
        });
        setStockItems(await loadStockItems());
        setAppError(`Descrições atualizadas: ${upload.descriptions.length} PN(s) importado(s).`);
      } else if (upload.type === 'addresses') {
        await replaceStockProductAddresses(upload.addresses, {
          updatedBy: user?.email || '',
        });
        setStockItems(await loadStockItems());
        setAppError(`Endereçamento atualizado: ${upload.addresses.length} PN(s) importado(s).`);
      } else {
        const catalog = await replaceStockItems(upload.items, {
          fileName: file.name,
          updatedBy: user?.email || '',
        });
        setStockItems(await loadStockItems());
        setStockCatalog(catalog);
        setAppError(`Estoque atualizado: ${upload.items.length} PN(s) importado(s).`);
      }
      if (!options.keepView) setActiveView('stockTransfers');
      return true;
    } catch (error) {
      setAppError(error.message || 'Não foi possível importar o relatório de estoque.');
      if (options.rethrow) throw error;
      return false;
    } finally {
      setIsUploadingStock(false);
    }
  }

  async function createNewStockTransfer(items) {
    const nextNumber =
      stockTransferLists.reduce((highest, list) => {
        const number = Number(String(list.name || '').match(/(\d+)$/)?.[1] || 0);
        return Math.max(highest, number);
      }, 0) + 1;
    const nowIso = new Date().toISOString();
    const nextList = {
      id: crypto.randomUUID(),
      name: `Transferência ${String(nextNumber).padStart(2, '0')}`,
      items: items.map((item) => ({
        productKey: item.productKey,
        product: item.product,
        description: item.description || '',
        address: item.address || '',
        availableQuantity: Number(item.availableQuantity ?? item.stockQuantity ?? item.quantity ?? 0),
        quantity: Number(item.transferQuantity || 0),
      })),
      createdBy: user?.email || '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      const savedList = await createStockTransferList(nextList);
      setStockTransferLists((current) => [savedList, ...current.filter((list) => list.id !== savedList.id)]);
      setAppError('');
      return savedList;
    } catch (error) {
      setAppError(error.message || 'Não foi possível criar a transferência.');
      return null;
    }
  }

  async function addItemsToStockTransfer(listId, newItems) {
    const list = stockTransferLists.find((item) => item.id === listId);
    if (!list) {
      setAppError('A transferência selecionada não foi encontrada.');
      return null;
    }

    const existingKeys = new Set(list.items.map((item) => item.productKey));
    const appendedItems = newItems
      .filter((item) => !existingKeys.has(item.productKey))
      .map((item) => ({
        productKey: item.productKey,
        product: item.product,
        description: item.description || '',
        address: item.address || '',
        availableQuantity: Number(item.availableQuantity ?? item.stockQuantity ?? item.quantity ?? 0),
        quantity: Number(item.transferQuantity || 0),
      }));
    const items = [...list.items, ...appendedItems];

    try {
      const savedList = await updateStockTransferList(listId, { items });
      setStockTransferLists((current) =>
        current.map((item) => (item.id === listId ? savedList : item)),
      );
      setAppError(
        appendedItems.length > 0
          ? `${appendedItems.length} item(ns) adicionado(s) à ${savedList.name}.`
          : `Os itens selecionados já estavam na ${savedList.name}.`,
      );
      return savedList;
    } catch (error) {
      setAppError(error.message || 'Não foi possível incluir os itens na transferência.');
      return null;
    }
  }

  async function changeStockTransferQuantity(listId, productKey, quantity) {
    const list = stockTransferLists.find((item) => item.id === listId);
    if (!list) return;
    const items = list.items.map((item) =>
      item.productKey === productKey ? { ...item, quantity: Math.max(0, Number(quantity || 0)) } : item,
    );
    setStockTransferLists((current) =>
      current.map((item) => (item.id === listId ? { ...item, items, updatedAt: new Date().toISOString() } : item)),
    );

    try {
      const savedList = await updateStockTransferList(listId, { items });
      setStockTransferLists((current) => current.map((item) => (item.id === listId ? savedList : item)));
    } catch (error) {
      setAppError(error.message || 'Não foi possível salvar a quantidade da transferência.');
    }
  }

  async function removeStockTransfer(listId) {
    const previousLists = stockTransferLists;
    setStockTransferLists((current) => current.filter((list) => list.id !== listId));
    try {
      await deleteStockTransferList(listId);
      setAppError('');
    } catch (error) {
      setStockTransferLists(previousLists);
      setAppError(error.message || 'Não foi possível excluir a transferência.');
    }
  }

  async function saveStockTransferCandidate(form) {
    const product = form.product.trim();
    const candidate = {
      productKey: normalizeStockProduct(product),
      product,
      quantity: Math.max(1, Number(form.quantity || 0)),
      groupCode: form.groupCode,
      createdBy: user?.email || '',
    };

    try {
      const stockItem = await ensureManualStockItem(candidate);
      const savedCandidate = await upsertStockTransferCandidate(candidate);
      setStockItems((current) =>
        current.some((item) => item.productKey === stockItem.productKey)
          ? current
          : [...current, stockItem].sort((a, b) => a.product.localeCompare(b.product, 'pt-BR')),
      );
      setStockTransferCandidates((current) => [
        savedCandidate,
        ...current.filter((item) => item.productKey !== savedCandidate.productKey),
      ]);
      setAppError('');
      return savedCandidate;
    } catch (error) {
      setAppError(error.message || 'Não foi possível cadastrar o item.');
      return null;
    }
  }

  async function removeStockTransferCandidate(productKey) {
    const previousCandidates = stockTransferCandidates;
    setStockTransferCandidates((current) => current.filter((item) => item.productKey !== productKey));
    try {
      await deleteStockTransferCandidate(productKey);
      setAppError('');
    } catch (error) {
      setStockTransferCandidates(previousCandidates);
      setAppError(error.message || 'Não foi possível excluir o item cadastrado.');
    }
  }

  async function createTransferFromCandidates() {
    if (stockTransferCandidates.length === 0) return null;
    const transferItems = stockTransferCandidates.map((candidate) => {
      const stockItem = stockItems.find((item) => item.productKey === candidate.productKey);
      return {
        ...candidate,
        description: stockItem?.description || '',
        address: stockItem?.address || '',
        stockQuantity: Number(stockItem?.quantity || 0),
        transferQuantity: Number(candidate.quantity || 0),
      };
    });
    const savedList = await createNewStockTransfer(transferItems);
    if (!savedList) return null;

    try {
      await clearStockTransferCandidates();
      setStockTransferCandidates([]);
    } catch (error) {
      setAppError(error.message || 'A transferência foi criada, mas não foi possível limpar os itens cadastrados.');
    }
    return savedList;
  }

  function updateBillingNoteDraft(id, value) {
    setBillingNoteDrafts((current) => {
      const nextDrafts = { ...current, [id]: value };
      saveBillingNoteDrafts(nextDrafts);
      return nextDrafts;
    });
  }

  async function saveBillingNote(entry) {
    const nextNote = billingNoteDrafts[entry.id] ?? entry.notes ?? '';
    if (nextNote === (entry.notes || '')) {
      if (entry.id in billingNoteDrafts) {
        setBillingNoteDrafts((current) => {
          const nextDrafts = { ...current };
          delete nextDrafts[entry.id];
          saveBillingNoteDrafts(nextDrafts);
          return nextDrafts;
        });
      }
      return;
    }

    const previousEntries = billingEntries;
    setBillingEntries((current) => sortBillingEntries(current.map((item) => (item.id === entry.id ? { ...item, notes: nextNote } : item))));

    try {
      const savedEntry = await updateBillingEntry(entry.id, { notes: nextNote });
      setBillingEntries((current) => sortBillingEntries(current.map((item) => (item.id === savedEntry.id ? savedEntry : item))));
      setBillingNoteDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[entry.id];
        saveBillingNoteDrafts(nextDrafts);
        return nextDrafts;
      });
    } catch (error) {
      setBillingEntries(previousEntries);
      setAppError(error.message || 'Nao foi possivel salvar a observacao da cobranca.');
    }
  }

  async function removeBillingEntry(entry) {
    if (!entry?.id) return;
    const previousEntries = billingEntries;

    setBillingEntries((current) => current.filter((item) => item.id !== entry.id));
    setBillingNoteDrafts((current) => {
      if (!(entry.id in current)) return current;
      const nextDrafts = { ...current };
      delete nextDrafts[entry.id];
      saveBillingNoteDrafts(nextDrafts);
      return nextDrafts;
    });

    try {
      await deleteBillingEntry(entry.id);
      setAppError('');
    } catch (error) {
      setBillingEntries(previousEntries);
      setAppError(error.message || 'Nao foi possivel excluir a cobranca.');
    }
  }

  async function restoreBillingUpload(seller) {
    if (!seller || isRestoringBilling) return;
    const confirmed = window.confirm(
      `Excluir o último upload de ${seller} e restaurar a cobrança exatamente como estava antes?`,
    );
    if (!confirmed) return;

    const previousEntries = billingEntries;
    const previousUploads = billingUploads;
    setIsRestoringBilling(true);

    try {
      const result = await restoreLastBillingUpload(seller);
      setBillingEntries((current) =>
        sortBillingEntries([...current.filter((entry) => entry.seller !== seller), ...result.entries]),
      );
      setBillingUploads((current) => [
        ...(result.upload ? [result.upload] : []),
        ...current.filter((upload) => upload.seller !== seller),
      ]);
      setBillingNoteDrafts((current) => {
        const sellerEntryIds = new Set(previousEntries.filter((entry) => entry.seller === seller).map((entry) => entry.id));
        const nextDrafts = Object.fromEntries(
          Object.entries(current).filter(([entryId]) => !sellerEntryIds.has(entryId)),
        );
        saveBillingNoteDrafts(nextDrafts);
        return nextDrafts;
      });
      setAppError(`Último upload de ${seller} excluído. A cobrança anterior foi restaurada.`);
    } catch (error) {
      setBillingEntries(previousEntries);
      setBillingUploads(previousUploads);
      setAppError(error.message || 'Não foi possível restaurar a cobrança anterior.');
    } finally {
      setIsRestoringBilling(false);
    }
  }

  function openReturnModal(entry = null) {
    setReturnModal(entry || {});
    setReturnForm(
      entry
        ? {
            invoiceNumber: entry.invoiceNumber || '',
            returnType: entry.returnType || 'Total',
            items: entry.items?.length ? entry.items : [{ partNumber: '', quantity: '' }],
            status: entry.status || 'Aguardando retorno cliente',
          }
        : initialReturnForm,
    );
    setReturnErrors({});
  }

  function cancelReturnModal() {
    setReturnModal(null);
    setReturnForm(initialReturnForm);
    setReturnErrors({});
  }

  function updateReturnForm(field, value) {
    setReturnForm((current) => {
      if (field === 'returnType') {
        return {
          ...current,
          returnType: value,
          items: value === 'Parcial' ? current.items?.length ? current.items : [{ partNumber: '', quantity: '' }] : [],
        };
      }
      return { ...current, [field]: value };
    });
    setReturnErrors((current) => ({ ...current, [field]: '' }));
  }

  function addReturnFormItem() {
    setReturnForm((current) => ({
      ...current,
      items: [...(current.items || []), { partNumber: '', quantity: '' }],
    }));
  }

  function updateReturnFormItem(index, field, value) {
    setReturnForm((current) => ({
      ...current,
      items: (current.items || []).map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function removeReturnFormItem(index) {
    setReturnForm((current) => ({
      ...current,
      items: (current.items || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function validateReturnForm() {
    const nextErrors = {};
    if (!returnForm.invoiceNumber.trim()) nextErrors.invoiceNumber = 'Informe a nota fiscal.';
    if (returnForm.returnType === 'Parcial') {
      const validItems = (returnForm.items || []).filter((item) => item.partNumber.trim() && String(item.quantity || '').trim());
      if (validItems.length === 0) nextErrors.items = 'Informe pelo menos um PN e quantidade.';
    }
    setReturnErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveReturnForm(event) {
    event.preventDefault();
    if (!returnModal || !validateReturnForm()) return;

    const previousEntries = returnEntries;
    const nowIso = new Date().toISOString();
    const sanitizedItems =
      returnForm.returnType === 'Parcial'
        ? (returnForm.items || [])
            .map((item) => ({ partNumber: item.partNumber.trim(), quantity: String(item.quantity || '').trim() }))
            .filter((item) => item.partNumber && item.quantity)
        : [];
    const nextEntry = {
      id: returnModal.id || crypto.randomUUID(),
      invoiceNumber: returnForm.invoiceNumber.trim(),
      returnType: returnForm.returnType,
      items: sanitizedItems,
      status: returnForm.status,
      createdAt: returnModal.createdAt || nowIso,
      updatedAt: nowIso,
    };

    setReturnEntries((current) =>
      sortReturnEntries([nextEntry, ...current.filter((entry) => entry.id !== nextEntry.id)]),
    );

    try {
      const savedEntry = returnModal.id
        ? await updateReturnEntry(returnModal.id, {
            invoiceNumber: nextEntry.invoiceNumber,
            returnType: nextEntry.returnType,
            items: nextEntry.items,
            status: nextEntry.status,
          })
        : await createReturnEntry(nextEntry);

      setReturnEntries((current) =>
        sortReturnEntries([savedEntry, ...current.filter((entry) => entry.id !== savedEntry.id)]),
      );
      setActiveReturnTab(savedEntry.status === 'Finalizado' ? 'finalizado' : 'andamento');
      cancelReturnModal();
      setAppError('');
    } catch (error) {
      setReturnEntries(previousEntries);
      setAppError(error.message || 'Nao foi possivel salvar a devolucao.');
    }
  }

  async function removeReturnEntry(entry) {
    if (!entry?.id) return;
    const previousEntries = returnEntries;
    setReturnEntries((current) => current.filter((item) => item.id !== entry.id));

    try {
      await deleteReturnEntry(entry.id);
      setAppError('');
    } catch (error) {
      setReturnEntries(previousEntries);
      setAppError(error.message || 'Nao foi possivel excluir a devolucao.');
    }
  }

  function openWarrantyModal(entry = null) {
    setWarrantyModal(entry || {});
    setWarrantyForm(
      entry
        ? {
            warrantyNumber: entry.warrantyNumber || '',
            motorSerialNumber: entry.motorSerialNumber || '',
            statuses: Array.isArray(entry.statuses) ? entry.statuses : [],
            notes: entry.notes || '',
            attachmentFileName: entry.attachmentFileName || '',
            attachmentFileData: entry.attachmentFileData || '',
            attachmentMimeType: entry.attachmentMimeType || '',
          }
        : initialWarrantyForm,
    );
    setWarrantyErrors({});
  }

  function cancelWarrantyModal() {
    setWarrantyModal(null);
    setWarrantyForm(initialWarrantyForm);
    setWarrantyErrors({});
  }

  function updateWarrantyForm(field, value) {
    setWarrantyForm((current) => ({ ...current, [field]: value }));
    setWarrantyErrors((current) => ({ ...current, [field]: '' }));
  }

  function toggleWarrantyStatus(status) {
    setWarrantyForm((current) => ({
      ...current,
      statuses: current.statuses.includes(status)
        ? current.statuses.filter((item) => item !== status)
        : [...current.statuses, status],
    }));
    setWarrantyErrors((current) => ({ ...current, statuses: '' }));
  }

  async function handleWarrantyAttachmentUpload(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setWarrantyErrors((current) => ({ ...current, attachment: 'Selecione um arquivo PDF.' }));
      return;
    }

    try {
      const fileData = await readFileAsDataUrl(file);
      setWarrantyForm((current) => ({
        ...current,
        attachmentFileName: file.name,
        attachmentFileData: fileData,
        attachmentMimeType: file.type || 'application/pdf',
      }));
      setWarrantyErrors((current) => ({ ...current, attachment: '' }));
    } catch {
      setWarrantyErrors((current) => ({ ...current, attachment: 'Nao foi possivel carregar o PDF.' }));
    }
  }

  function validateWarrantyForm() {
    const nextErrors = {};
    if (!warrantyForm.warrantyNumber.trim()) nextErrors.warrantyNumber = 'Informe o Nº da garantia.';
    if (warrantyForm.statuses.length === 0) nextErrors.statuses = 'Selecione pelo menos um status.';
    setWarrantyErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveWarrantyForm(event) {
    event.preventDefault();
    if (!warrantyModal || !validateWarrantyForm()) return;

    const previousEntries = warrantyEntries;
    const nowIso = new Date().toISOString();
    const nextEntry = {
      id: warrantyModal.id || crypto.randomUUID(),
      warrantyNumber: warrantyForm.warrantyNumber.trim(),
      motorSerialNumber: warrantyForm.motorSerialNumber.trim(),
      statuses: warrantyForm.statuses,
      notes: warrantyForm.notes.trim(),
      attachmentFileName: warrantyForm.attachmentFileName,
      attachmentFileData: warrantyForm.attachmentFileData,
      attachmentMimeType: warrantyForm.attachmentMimeType,
      createdAt: warrantyModal.createdAt || nowIso,
      updatedAt: nowIso,
    };

    setWarrantyEntries((current) =>
      sortWarrantyEntries([nextEntry, ...current.filter((entry) => entry.id !== nextEntry.id)]),
    );

    try {
      const savedEntry = warrantyModal.id
        ? await updateWarrantyEntry(warrantyModal.id, {
            warrantyNumber: nextEntry.warrantyNumber,
            motorSerialNumber: nextEntry.motorSerialNumber,
            statuses: nextEntry.statuses,
            notes: nextEntry.notes,
            attachmentFileName: nextEntry.attachmentFileName,
            attachmentFileData: nextEntry.attachmentFileData,
            attachmentMimeType: nextEntry.attachmentMimeType,
          })
        : await createWarrantyEntry(nextEntry);

      setWarrantyEntries((current) =>
        sortWarrantyEntries([savedEntry, ...current.filter((entry) => entry.id !== savedEntry.id)]),
      );
      setActiveWarrantyTab(isWarrantyFinalized(savedEntry) ? 'finalizada' : 'andamento');
      cancelWarrantyModal();
      setAppError('');
    } catch (error) {
      setWarrantyEntries(previousEntries);
      setAppError(error.message || 'Nao foi possivel salvar a garantia.');
    }
  }

  async function removeWarrantyEntry(entry) {
    if (!entry?.id) return;
    const previousEntries = warrantyEntries;
    setWarrantyEntries((current) => current.filter((item) => item.id !== entry.id));

    try {
      await deleteWarrantyEntry(entry.id);
      setAppError('');
    } catch (error) {
      setWarrantyEntries(previousEntries);
      setAppError(error.message || 'Nao foi possivel excluir a garantia.');
    }
  }

  function openCustomerEditModal(customer) {
    setCustomerEditModal(customer);
    setCustomerEditForm({
      clientCode: customer.clientCode || '',
      clientName: customer.clientName || '',
      seller: customer.seller || '',
      document: customer.document || '',
      phone: customer.phone || '',
      fiscalAddress: customer.fiscalAddress || '',
      deliveryAddress: customer.deliveryAddress || '',
      state: customer.state || '',
      email: customer.email || '',
      zipCode: customer.zipCode || '',
    });
    setCustomerEditErrors({});
  }

  function updateCustomerEditForm(field, value) {
    setCustomerEditForm((current) => ({ ...current, [field]: value }));
    setCustomerEditErrors((current) => ({ ...current, [field]: '' }));
  }

  async function saveCustomerEditForm(event) {
    event.preventDefault();
    if (!customerEditModal) return;

    const nextErrors = {};
    if (!customerEditForm.clientName.trim()) nextErrors.clientName = 'Informe o nome do cliente.';
    setCustomerEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const previousCustomers = customers;
    const changes = {
      clientCode: customerEditForm.clientCode.trim(),
      clientName: customerEditForm.clientName.trim(),
      seller: customerEditForm.seller.trim(),
      document: customerEditForm.document.trim(),
      phone: customerEditForm.phone.trim(),
      fiscalAddress: customerEditForm.fiscalAddress.trim(),
      deliveryAddress: customerEditForm.deliveryAddress.trim(),
      state: customerEditForm.state.trim(),
      email: customerEditForm.email.trim(),
      zipCode: customerEditForm.zipCode.trim(),
    };

    setCustomers((current) =>
      sortCustomers(current.map((customer) => (customer.id === customerEditModal.id ? { ...customer, ...changes } : customer))),
    );

    try {
      const savedCustomer = await updateCustomer(customerEditModal.id, changes);
      setCustomers((current) => sortCustomers(current.map((customer) => (customer.id === savedCustomer.id ? savedCustomer : customer))));
      setCustomerEditModal(null);
      setCustomerEditForm(initialCustomerEditForm);
      setCustomerEditErrors({});
      setAppError('');
    } catch (error) {
      setCustomers(previousCustomers);
      setAppError(error.message || 'Nao foi possivel atualizar o cliente.');
    }
  }

  async function removeCustomerFromModal() {
    if (!customerEditModal) return;
    const confirmed = window.confirm(`Excluir o cliente ${customerEditModal.clientName}?`);
    if (!confirmed) return;

    const previousCustomers = customers;
    setCustomers((current) => current.filter((customer) => customer.id !== customerEditModal.id));
    setExpandedCustomerIds((current) => current.filter((id) => id !== customerEditModal.id));
    setExpandedCustomerProductKeys((current) => current.filter((key) => !key.startsWith(`${customerEditModal.id}-`)));

    try {
      await deleteCustomer(customerEditModal.id);
      setCustomerEditModal(null);
      setCustomerEditForm(initialCustomerEditForm);
      setCustomerEditErrors({});
      setAppError('');
    } catch (error) {
      setCustomers(previousCustomers);
      setAppError(error.message || 'Nao foi possivel excluir o cliente.');
    }
  }

  function cancelCustomerEditModal() {
    setCustomerEditModal(null);
    setCustomerEditForm(initialCustomerEditForm);
    setCustomerEditErrors({});
  }

  function getCustomerContractFields(clientName) {
    const customer = findCustomerByName(clientName);
    if (!customer) return {};
    return {
      name: customer.clientName || clientName,
      address: customer.fiscalAddress || customer.deliveryAddress || '',
      state: customer.state || '',
      zipCode: customer.zipCode || '',
      document: customer.document || '',
      email: customer.email || '',
      phone: customer.phone || '',
    };
  }

  function updateContractForm(type, field, value) {
    const nextValue = ['value', 'totalValue', 'unitValue', 'totalValue'].includes(field) ? formatCurrencyInput(value) : value;
    setContractForms((current) => {
      const nextForm = { ...current[type], [field]: nextValue };
      if (field === 'name') return { ...current, [type]: { ...nextForm, ...getCustomerContractFields(value) } };
      return { ...current, [type]: nextForm };
    });
  }

  function updateReturnItem(index, field, value) {
    setContractForms((current) => {
      const items = current.return.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextValue = ['unitValue', 'totalValue'].includes(field) ? formatCurrencyInput(value) : value;
        const nextItem = { ...item, [field]: nextValue };
        if (field === 'quantity' || field === 'unitValue') {
          const quantity = Number(nextItem.quantity || 0);
          const unitValue = parseUploadCurrency(nextItem.unitValue);
          nextItem.totalValue = quantity && unitValue ? formatUploadCurrency(quantity * unitValue) : nextItem.totalValue;
        }
        return nextItem;
      });
      return { ...current, return: { ...current.return, items } };
    });
  }

  function addReturnItem() {
    setContractForms((current) => ({
      ...current,
      return: {
        ...current.return,
        items: [
          ...current.return.items,
          { id: crypto.randomUUID(), productCode: '', description: '', quantity: '', unitValue: '', totalValue: '' },
        ],
      },
    }));
  }

  function removeReturnItem(index) {
    setContractForms((current) => ({
      ...current,
      return: {
        ...current.return,
        items: current.return.items.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  }

  function formatContractDate(dateValue) {
    if (!dateValue) return '';
    return formatDate(`${dateValue}T12:00:00`);
  }

  async function handleContractTemplateUpload(type, file, options = {}) {
    if (!file) return;
    setIsSavingContractTemplate(true);

    try {
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const savedTemplate = await upsertContractTemplate({
        type,
        fileName: file.name,
        fileData,
        mimeType: file.type || 'application/pdf',
      });
      setContractTemplates((current) => [savedTemplate, ...current.filter((template) => template.type !== savedTemplate.type)]);
      setAppError('Modelo de contrato atualizado.');
      return true;
    } catch (error) {
      setAppError(error.message || 'Nao foi possivel salvar o modelo de contrato.');
      if (options.rethrow) throw error;
      return false;
    } finally {
      setIsSavingContractTemplate(false);
    }
  }

  async function generateContract(type) {
    const template = contractTemplates.find((item) => item.type === type);
    const form = {
      ...contractForms[type],
      date: formatContractDate(contractForms[type].date),
    };
    if (type === 'return') {
      form.items = contractForms.return.items.map((item) => ({
        ...item,
        unitValue: parseUploadCurrency(item.unitValue),
        totalValue: parseUploadCurrency(item.totalValue),
      }));
    }

    setIsGeneratingContract(true);

    try {
      const result = await generateContractPdf(type, template, form);
      const blob = new Blob([result.bytes], { type: result.mimeType || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setAppError('Contrato gerado para download.');
    } catch (error) {
      setAppError(error.message || 'Nao foi possivel gerar o contrato.');
    } finally {
      setIsGeneratingContract(false);
    }
  }

  function openCloseModal(quote) {
    setCloseModal({ quoteId: quote.id, quoteNumber: quote.quoteNumber, clientName: quote.clientName });
    const totalValue = quote.closeDetails?.totalValue || quote.quoteValue || '';
    const customer = findCustomerByName(quote.clientName);
    setCloseDetails({
      ...initialCloseDetails,
      ...quote.closeDetails,
      carrier: quote.closeDetails?.carrier || quote.closeDetails?.freight || '',
      phone: quote.phone || customer?.phone || '',
      totalValue,
    });
    setCloseErrors({});
  }

  function updateCloseDetails(field, value) {
    const nextValue = field === 'totalValue' ? formatCurrencyInput(value) : value;
    setCloseDetails((current) => ({ ...current, [field]: nextValue }));
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

    if (status === 'sem-resposta' && quote && quote.status !== 'sem-resposta' && shouldRequestLossReason(quote, now)) {
      setLossModal({ quoteId: id, mode: 'status', status });
      setLossForm({ reason: 'sem-retorno', notes: '' });
      return;
    }

    const previousQuotes = quotes;
    const statusUpdatedAt = new Date().toISOString();
    const changes = {
      status,
      statusUpdatedAt,
      archivedAt: '',
      history: appendQuoteHistory(
        quote,
        buildQuoteHistoryEvent('status', 'Status alterado pelo vendedor', { seller: quote?.seller, status: getStatusMeta(status).label }, statusUpdatedAt),
      ),
    };

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
      archivedAt: '',
      closeDetails: {
        orderNumber: closeDetails.orderNumber.trim(),
        agreedPaymentTerms: closeDetails.agreedPaymentTerms.trim(),
        carrier: closeDetails.carrier.trim(),
        totalValue: closeDetails.totalValue.trim(),
        notes: closeDetails.notes.trim(),
        closedAt,
      },
    };
    const quote = quotes.find((item) => item.id === closeModal.quoteId);
    if (quote) {
      changes.history = appendQuoteHistory(
        quote,
        buildQuoteHistoryEvent('closed', 'Virou pedido', { orderNumber: closeDetails.orderNumber.trim() }, closedAt),
      );
    }

    setQuotes((current) =>
      current.map((quote) => (quote.id === closeModal.quoteId ? { ...quote, ...changes } : quote)),
    );

    try {
      const savedQuote = await updateQuote(closeModal.quoteId, changes);
      setQuotes((current) => current.map((quote) => (quote.id === closeModal.quoteId ? savedQuote : quote)));
      await ensureTrackingEntry(savedQuote, changes.closeDetails);
      await ensureCustomerFromClosedQuote(savedQuote, changes.closeDetails);
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
    const nextValue = field === 'quoteValue' ? formatCurrencyInput(value) : value;

    setQuoteEditForm((current) => {
      if (field === 'followUpUsesTime') {
        return { ...current, followUpUsesTime: nextValue, followUpUnit: nextValue ? 'hours' : 'days' };
      }

      if (field === 'clientName') {
        const customer = findCustomerByName(nextValue);
        return {
          ...current,
          clientName: nextValue,
          phone: customer?.phone || current.phone,
        };
      }

      return { ...current, [field]: nextValue };
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
    const editAt = new Date().toISOString();
    const historyEvents = [buildQuoteHistoryEvent('updated', 'Cotacao editada', {}, editAt)];
    if ((quoteEditModal.notes || '').trim() !== quoteEditForm.notes.trim() && quoteEditForm.notes.trim()) {
      historyEvents.push(buildQuoteHistoryEvent('notes', 'Observacao adicionada', {}, editAt));
    }
    changes.history = appendQuoteHistory(quoteEditModal, historyEvents);

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
    const quote = quotes.find((item) => item.id === id);
    if (quote) {
      changes.history = appendQuoteHistory(quote, buildQuoteHistoryEvent('followup', 'Follow-up reiniciado', { days: 5 }, startedAt));
    }

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
    setLossModal({ quoteId: id, mode: 'archive' });
    setLossForm({ reason: 'sem-retorno', notes: '' });
    return;

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

  async function confirmLossModal(event) {
    event.preventDefault();
    if (!lossModal) return;

    const quote = quotes.find((item) => item.id === lossModal.quoteId);
    if (!quote) return;

    const previousQuotes = quotes;
    const changedAt = new Date().toISOString();
    const lossReason = { reason: lossForm.reason, notes: lossForm.notes.trim() };
    const changes =
      lossModal.mode === 'archive'
        ? {
            archivedAt: changedAt,
            lossReason,
            history: appendQuoteHistory(
              quote,
              buildQuoteHistoryEvent('archived', 'Cotacao arquivada', { reason: getLossReasonLabel(lossForm.reason) }, changedAt),
            ),
          }
        : {
            status: lossModal.status || 'sem-resposta',
            statusUpdatedAt: changedAt,
            archivedAt: '',
            lossReason,
            history: appendQuoteHistory(
              quote,
              buildQuoteHistoryEvent('status', 'Marcada como sem resposta', { reason: getLossReasonLabel(lossForm.reason) }, changedAt),
            ),
          };

    setQuotes((current) => current.map((item) => (item.id === lossModal.quoteId ? { ...item, ...changes } : item)));

    try {
      const savedQuote = await updateQuote(lossModal.quoteId, changes);
      setQuotes((current) => current.map((item) => (item.id === lossModal.quoteId ? savedQuote : item)));
      if (lossModal.mode === 'archive') setActiveTab('arquivadas');
      setLossModal(null);
      setLossForm({ reason: 'sem-retorno', notes: '' });
      setAppError('');
    } catch (error) {
      setQuotes(previousQuotes);
      setAppError(error.message || 'Nao foi possivel salvar o motivo de perda.');
    }
  }

  function cancelLossModal() {
    setLossModal(null);
    setLossForm({ reason: 'sem-retorno', notes: '' });
  }

  async function ensureTrackingEntry(quote, details) {
    const existingEntry = trackingEntries.find((entry) => entry.quoteId === quote.id);
    const nowIso = new Date().toISOString();
    const customer = findCustomerByName(quote.clientName);
    const phone = quote.phone || customer?.phone || '';

    if (existingEntry) {
      const savedEntry = await updateTrackingEntry(existingEntry.id, {
        quoteNumber: quote.quoteNumber,
        clientName: quote.clientName,
        phone,
        orderNumber: details.orderNumber,
        carrier: existingEntry.carrier || details.carrier || '',
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
      phone,
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

  async function ensureCustomerFromClosedQuote(quote, details) {
    if (!quote?.clientName?.trim()) return;

    const existingCustomer = findCustomerByName(quote.clientName);
    const phone = quote.phone || details?.phone || '';
    const seller = quote.seller || '';

    if (existingCustomer) {
      const changes = {};
      if (phone && existingCustomer.phone !== phone) changes.phone = phone;
      if (seller && existingCustomer.seller !== seller) changes.seller = seller;

      if (Object.keys(changes).length > 0) {
        const savedCustomer = await updateCustomer(existingCustomer.id, changes);
        setCustomers((current) => sortCustomers(current.map((customer) => (customer.id === savedCustomer.id ? savedCustomer : customer))));
      }
      return;
    }

    const nowIso = new Date().toISOString();
    const customer = {
      id: crypto.randomUUID(),
      clientCode: '',
      clientName: quote.clientName.trim(),
      seller,
      document: '',
      phone,
      fiscalAddress: '',
      deliveryAddress: '',
      state: '',
      email: '',
      zipCode: '',
      purchases: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const savedCustomer = await createCustomer(customer);
    setCustomers((current) => sortCustomers([savedCustomer, ...current.filter((item) => item.id !== savedCustomer.id)]));
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
    const customer = findCustomerByName(entry.clientName);
    setTrackingModal(entry);
    setTrackingForm({
      clientName: entry.clientName || '',
      phone: entry.phone || customer?.phone || '',
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

  function changeQuoteSort(key) {
    const defaultDirection = key === 'quoteNumber' ? 'asc' : 'desc';
    setQuoteSort((current) => {
      if (current.key !== key) return { key, direction: defaultDirection };
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    });
  }

  function updateTrackingForm(field, value) {
    setTrackingForm((current) => {
      if (field === 'deliverySituation' && value === 'Entregue') {
        return { ...current, deliverySituation: value, status: 'Finalizado' };
      }

      if (field === 'deliverySituation' && value === 'Importação') {
        return { ...current, deliverySituation: value, status: 'Importação' };
      }

      if (field === 'deliverySituation' && current.status === 'Importação') {
        return { ...current, deliverySituation: value, status: 'Em andamento' };
      }

      if (field === 'clientName') {
        const customer = findCustomerByName(value);
        return { ...current, clientName: value, phone: customer?.phone || current.phone };
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
    const nextStatus =
      trackingForm.deliverySituation === 'Entregue'
        ? 'Finalizado'
        : trackingForm.deliverySituation === 'Importação'
          ? 'Importação'
          : trackingForm.status;
    const customer = findCustomerByName(trackingModal.clientName);
    const phone = trackingForm.phone.trim() || customer?.phone || '';
    const changes = {
      phone,
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

    if (changes.status === 'Em andamento' || changes.status === 'Importação') {
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
    const nextStatus =
      trackingForm.deliverySituation === 'Entregue'
        ? 'Finalizado'
        : trackingForm.deliverySituation === 'Importação'
          ? 'Importação'
          : trackingForm.status;
    const customer = findCustomerByName(trackingForm.clientName);
    const phone = trackingForm.phone.trim() || customer?.phone || '';
    const nextEntry = {
      id: crypto.randomUUID(),
      quoteId: null,
      quoteNumber: 'Avulso',
      clientName: trackingForm.clientName.trim(),
      phone,
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

  async function saveRotaxRevenueEntry(entry, changes) {
    const previousEntries = rotaxRevenueEntries;
    const nowIso = new Date().toISOString();
    const nextEntry = {
      id: entry.id || crypto.randomUUID(),
      year: Number(entry.year),
      month: Number(entry.month),
      revenueValue: Number(changes.revenueValue || 0),
      targetValue: Number(changes.targetValue || 0),
      matrizValue: Number(changes.matrizValue || 0),
      campinasValue: Number(changes.campinasValue || 0),
      goianiaValue: Number(changes.goianiaValue || 0),
      notes: changes.notes || '',
      createdAt: entry.createdAt || nowIso,
      updatedAt: nowIso,
    };

    setRotaxRevenueEntries((current) =>
      sortRotaxRevenueEntries([
        nextEntry,
        ...current.filter((currentEntry) => currentEntry.id !== nextEntry.id),
      ]),
    );

    try {
      const savedEntry = entry.id
        ? await updateRotaxRevenueEntry(entry.id, {
            revenueValue: nextEntry.revenueValue,
            targetValue: nextEntry.targetValue,
            matrizValue: nextEntry.matrizValue,
            campinasValue: nextEntry.campinasValue,
            goianiaValue: nextEntry.goianiaValue,
            notes: nextEntry.notes,
          })
        : await createRotaxRevenueEntry(nextEntry);

      setRotaxRevenueEntries((current) =>
        sortRotaxRevenueEntries([
          savedEntry,
          ...current.filter((currentEntry) => currentEntry.id !== savedEntry.id),
        ]),
      );
      setAppError('');
      return true;
    } catch (error) {
      setRotaxRevenueEntries(previousEntries);
      setAppError(error.message || 'Nao foi possivel salvar o faturamento Rotax.');
      return false;
    }
  }

  async function createRotaxRevenueYear(year) {
    const numericYear = Number(year);
    if (!Number.isFinite(numericYear)) return;

    const existingKeys = new Set(rotaxRevenueEntries.map((entry) => `${entry.year}-${entry.month}`));
    const nowIso = new Date().toISOString();
    const newEntries = monthNames
      .map((_, index) => ({
        id: crypto.randomUUID(),
        year: numericYear,
        month: index + 1,
        revenueValue: 0,
        targetValue: 0,
        matrizValue: 0,
        campinasValue: 0,
        goianiaValue: 0,
        notes: '',
        createdAt: nowIso,
        updatedAt: nowIso,
      }))
      .filter((entry) => !existingKeys.has(`${entry.year}-${entry.month}`));

    if (newEntries.length === 0) {
      setActiveRotaxRevenueYear(numericYear);
      return;
    }

    const previousEntries = rotaxRevenueEntries;
    setRotaxRevenueEntries((current) => sortRotaxRevenueEntries([...newEntries, ...current]));
    setActiveRotaxRevenueYear(numericYear);

    try {
      const savedEntries = [];
      for (const entry of newEntries) {
        savedEntries.push(await createRotaxRevenueEntry(entry));
      }
      setRotaxRevenueEntries((current) =>
        sortRotaxRevenueEntries([
          ...savedEntries,
          ...current.filter((entry) => !savedEntries.some((savedEntry) => savedEntry.id === entry.id)),
        ]),
      );
      setAppError('');
    } catch (error) {
      setRotaxRevenueEntries(previousEntries);
      setAppError(error.message || 'Nao foi possivel criar o ano do faturamento Rotax.');
    }
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

  async function changeDashboardView(periodKey) {
    if (!isMasterUser) return;
    const previousPeriod = dashboardPeriod;
    setDashboardPeriod(periodKey);
    try {
      const savedSetting = await updateDashboardPeriod(periodKey, user?.email || '');
      setDashboardPeriod(savedSetting.periodKey);
      setAppError('');
    } catch (error) {
      setDashboardPeriod(previousPeriod);
      setAppError(error.message || 'Não foi possível alterar a visualização do dashboard.');
    }
  }

  function navigateFromSideMenu(view) {
    setActiveView(view);
    if (view !== 'quotes') setSideQuoteFormOpen(false);
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

  const useSideMenu = layoutMode === 'complete' || layoutMode === 'simple';

  return (
    <main className={`app-shell${layoutMode === 'dashboard' ? ' dashboard-shell' : ''}${useSideMenu ? ' side-menu-shell' : ''}`}>
      <section className="topbar">
        {layoutMode !== 'dashboard' && !useSideMenu && (
          <div className="topbar-brand">
          <p className="eyebrow">Dashboard comercial</p>
          <button className="logo-button" type="button" aria-label="Voltar para cotações" onClick={() => setActiveView('quotes')}>
            <img className="app-logo header-logo" src="/followuper-logo.png" alt="FollowUper" />
          </button>
        </div>
        )}
        <div className="top-stack">
          {useSideMenu ? (
            <div className="session-actions compact-top-actions">
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
          ) : layoutMode !== 'complete' ? (
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
                        <button type="button" onClick={() => navigateFromMenu('rotaxRevenue')}>
                          <ShieldCheck size={16} />
                          Faturamento Rotax
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
                  className={activeView === 'rotaxRevenue' ? 'view-button active' : 'view-button'}
                  type="button"
                  onClick={() => setActiveView('rotaxRevenue')}
                >
                  <ShieldCheck size={16} />
                  Faturamento Rotax
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
              {metrics.smartAlerts.length > 0 && (
                <div className="smart-alerts" aria-live="polite">
                  {metrics.smartAlerts.map((alert) => (
                    <span key={alert}>{alert}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <input ref={uploadInputRef} accept=".xlsx" hidden type="file" onChange={handleQuotesUpload} />
      <input ref={customerUploadInputRef} accept=".xlsx" hidden type="file" onChange={handleCustomersUpload} />
      <datalist id="customer-name-options">
        {customers.map((customer) => (
          <option key={customer.id} value={customer.clientName} />
        ))}
      </datalist>
      <datalist id="seller-options">
        {sellers.map((seller) => (
          <option key={seller} value={seller} />
        ))}
      </datalist>

      {appError && <div className="app-alert">{appError}</div>}

      <div className={useSideMenu ? 'app-main-with-sidebar' : 'app-main-without-sidebar'}>
        {useSideMenu && (
          <SideNavigation
            activeView={activeView}
            dataStatus={dataStatus}
            errors={errors}
            form={form}
            isMasterUser={isMasterUser}
            metrics={metrics}
            onNavigate={navigateFromSideMenu}
            onSubmitQuote={handleSubmit}
            onUpdateForm={updateForm}
            quoteFormOpen={sideQuoteFormOpen}
            setActiveTab={setActiveTab}
            setActiveTrackingTab={setActiveTrackingTab}
            setQuoteFormOpen={setSideQuoteFormOpen}
            smartAlerts={metrics.smartAlerts}
            trackingMetrics={trackingMetrics}
          />
        )}
        <div className={useSideMenu ? 'app-content-area' : undefined}>
      {layoutMode === 'dashboard' ? (
        <SalesDashboard
          isMasterUser={isMasterUser}
          onChangePeriod={changeDashboardView}
          periodKey={dashboardPeriod}
          quotes={dashboardDisplayedQuotes}
          rotaxRevenueEntries={rotaxRevenueEntries}
          saleCelebration={dashboardPeriod === 'current' || dashboardPeriod === 'general' ? saleCelebration : null}
          snapshotPeriods={dashboardSnapshotPeriods}
        />
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
          isUploadingQuotes={isUploadingQuotes}
          metrics={metrics}
          isSimpleLayout={layoutMode === 'simple'}
          now={now}
          onArchiveQuote={archiveQuote}
          onChangeStatus={changeStatus}
          onChangeQuoteSort={changeQuoteSort}
          onEditQuote={openQuoteEditModal}
          onRemoveQuote={removeQuote}
          onRestartFollowUp={restartFollowUp}
          onSubmit={handleSubmit}
          onUpdateForm={updateForm}
          onUploadClick={() => uploadInputRef.current?.click()}
          openCloseModal={openCloseModal}
          quoteSort={quoteSort}
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
          hideQuoteForm={useSideMenu}
          visibleQuotes={visibleQuotes}
        />
      ) : activeView === 'tracking' ? (
        <TrackingWorkspace
          activeTrackingTab={activeTrackingTab}
          customers={customers}
          entries={visibleTrackingEntries}
          expandedEntryIds={expandedTrackingEntryIds}
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
          onToggleDetails={(id) =>
            setExpandedTrackingEntryIds((current) =>
              current.includes(id) ? current.filter((entryId) => entryId !== id) : [...current, id],
            )
          }
        />
      ) : activeView === 'customers' ? (
        <CustomersWorkspace
          customers={visibleCustomers}
          expandedCustomerIds={expandedCustomerIds}
          expandedProductKeys={expandedCustomerProductKeys}
          isUploading={isUploadingCustomers}
          onEditCustomer={openCustomerEditModal}
          onToggleCustomer={(id) =>
            setExpandedCustomerIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
          }
          onToggleProduct={(key) =>
            setExpandedCustomerProductKeys((current) =>
              current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
            )
          }
          onUploadClick={() => customerUploadInputRef.current?.click()}
          searchTerm={customerSearchTerm}
          setSearchTerm={setCustomerSearchTerm}
        />
      ) : activeView === 'billing' ? (
        <BillingWorkspace
        activeSeller={activeBillingSeller}
        entries={billingEntries}
        uploads={billingUploads}
          isUploading={isUploadingBilling}
          isRestoring={isRestoringBilling}
          noteDrafts={billingNoteDrafts}
          onChangeNote={updateBillingNoteDraft}
          onRemoveEntry={removeBillingEntry}
          onRestoreUpload={restoreBillingUpload}
          onSaveNote={saveBillingNote}
          onSelectSeller={setActiveBillingSeller}
          onUpload={handleBillingUpload}
        />
      ) : activeView === 'contracts' ? (
        <ContractsWorkspace
          activeType={activeContractType}
          customers={customers}
          forms={contractForms}
          isGenerating={isGeneratingContract}
          isSavingTemplate={isSavingContractTemplate}
          onAddReturnItem={addReturnItem}
          onGenerate={generateContract}
          onRemoveReturnItem={removeReturnItem}
          onSelectType={setActiveContractType}
          onTemplateUpload={handleContractTemplateUpload}
          onUpdateField={updateContractForm}
          onUpdateReturnItem={updateReturnItem}
          templates={contractTemplates}
        />
      ) : activeView === 'returns' ? (
        <ReturnsWorkspace
          activeTab={activeReturnTab}
          entries={visibleReturnEntries}
          onAdd={() => openReturnModal()}
          onEdit={openReturnModal}
          onRemove={removeReturnEntry}
          setActiveTab={setActiveReturnTab}
          totalCounts={{
            andamento: returnEntries.filter((entry) => entry.status !== 'Finalizado').length,
            finalizado: returnEntries.filter((entry) => entry.status === 'Finalizado').length,
          }}
        />
      ) : activeView === 'warranties' ? (
        <WarrantiesWorkspace
          activeTab={activeWarrantyTab}
          entries={visibleWarrantyEntries}
          onAdd={() => openWarrantyModal()}
          onEdit={openWarrantyModal}
          onRemove={removeWarrantyEntry}
          setActiveTab={setActiveWarrantyTab}
          totalCounts={{
            andamento: warrantyEntries.filter((entry) => !isWarrantyFinalized(entry)).length,
            finalizada: warrantyEntries.filter(isWarrantyFinalized).length,
          }}
        />
      ) : activeView === 'rotaxParts' ? (
        <RotaxPartsWorkspace
          catalog={rotaxPartsCatalog}
          isUploading={isUploadingRotaxParts}
          onSearch={searchRotaxParts}
          onUpload={handleRotaxPartsUpload}
        />
      ) : activeView === 'stockTransfers' ? (
        <StockTransfersWorkspace
          catalog={stockCatalog}
          candidates={stockTransferCandidates}
          isUploading={isUploadingStock}
          items={stockItems}
          lists={stockTransferLists}
          onAddToTransfer={addItemsToStockTransfer}
          onCreateTransfer={createNewStockTransfer}
          onCreateTransferFromCandidates={createTransferFromCandidates}
          onDeleteCandidate={removeStockTransferCandidate}
          onDeleteTransfer={removeStockTransfer}
          onUpdateQuantity={changeStockTransferQuantity}
          onSaveCandidate={saveStockTransferCandidate}
          onUpload={handleStockUpload}
        />
      ) : activeView === 'uploads' ? (
        <UploadsWorkspace
          isBusy={
            isUploadingQuotes ||
            isUploadingCustomers ||
            isUploadingBilling ||
            isUploadingRotaxParts ||
            isUploadingStock ||
            isSavingContractTemplate
          }
          onUploadBilling={(file, seller) => handleBillingUpload(file, seller, { keepView: true, rethrow: true })}
          onUploadContract={(type, file) => handleContractTemplateUpload(type, file, { rethrow: true })}
          onUploadCustomers={(file) => uploadCustomersFile(file, { keepView: true, rethrow: true })}
          onUploadQuotes={(file) => prepareQuotesUpload(file, { rethrow: true })}
          onUploadRotaxParts={(file) => handleRotaxPartsUpload(file, { keepView: true, rethrow: true })}
          onUploadStock={(file) => handleStockUpload(file, { keepView: true, rethrow: true })}
        />
      ) : activeView === 'users' && isMasterUser ? (
        <UsersWorkspace
          activityLogs={activityLogs}
          now={now}
          onlineUsers={onlineUsers}
          profiles={userProfiles}
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
          onArchiveSession={archiveRotaxSession}
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
      ) : activeView === 'rotaxRevenue' ? (
        <RotaxRevenueWorkspaceV2
          activeYear={activeRotaxRevenueYear}
          entries={rotaxRevenueEntries}
          onCreateYear={createRotaxRevenueYear}
          onSaveEntry={saveRotaxRevenueEntry}
          setActiveView={setActiveView}
          setActiveYear={setActiveRotaxRevenueYear}
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
        </div>
      </div>

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

      {lossModal && (
        <LossReasonModal
          form={lossForm}
          mode={lossModal.mode}
          onCancel={cancelLossModal}
          onSubmit={confirmLossModal}
          onUpdate={(field, value) => setLossForm((current) => ({ ...current, [field]: value }))}
        />
      )}

      {uploadPreview && (
        <UploadPreviewModal
          isUploading={isUploadingQuotes}
          onCancel={cancelQuotesUploadPreview}
          onConfirm={confirmQuotesUpload}
          preview={uploadPreview}
        />
      )}

      {customerEditModal && (
        <CustomerEditModal
          errors={customerEditErrors}
          form={customerEditForm}
          onCancel={cancelCustomerEditModal}
          onDelete={removeCustomerFromModal}
          onSubmit={saveCustomerEditForm}
          onUpdate={updateCustomerEditForm}
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

      {returnModal && (
        <ReturnEntryModal
          errors={returnErrors}
          form={returnForm}
          isEditing={Boolean(returnModal.id)}
          onAddItem={addReturnFormItem}
          onCancel={cancelReturnModal}
          onRemoveItem={removeReturnFormItem}
          onSubmit={saveReturnForm}
          onUpdate={updateReturnForm}
          onUpdateItem={updateReturnFormItem}
        />
      )}

      {warrantyModal && (
        <WarrantyEntryModal
          errors={warrantyErrors}
          form={warrantyForm}
          isEditing={Boolean(warrantyModal.id)}
          onCancel={cancelWarrantyModal}
          onSubmit={saveWarrantyForm}
          onToggleStatus={toggleWarrantyStatus}
          onUpdate={updateWarrantyForm}
          onUploadAttachment={handleWarrantyAttachmentUpload}
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
  return readFileAsDataUrl(file);
}

function readFileAsDataUrl(file) {
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

function SalesDashboard({
  isMasterUser,
  onChangePeriod,
  periodKey,
  quotes,
  rotaxRevenueEntries = [],
  saleCelebration,
  snapshotPeriods = [],
}) {
  const [relevantPage, setRelevantPage] = useState(0);
  const [dollarQuote, setDollarQuote] = useState({ error: '', updatedAt: '', value: null });
  const periodMatch = String(periodKey || '').match(/^(\d{4})-(\d{2})$/);
  const dashboardDate = periodMatch
    ? new Date(Number(periodMatch[1]), Number(periodMatch[2]) - 1, 1)
    : new Date();
  const currentMonthKey = getDashboardMonthKey(new Date());
  const periodLabel =
    periodKey === 'general'
      ? 'Visão geral'
      : periodKey === 'current'
        ? `Mês vigente · ${formatDashboardMonthLabel(currentMonthKey)}`
        : formatDashboardMonthLabel(periodKey);
  const historicalPeriods = snapshotPeriods
    .map((snapshot) => snapshot.periodKey)
    .filter((snapshotPeriod, index, periods) =>
      snapshotPeriod !== currentMonthKey && periods.indexOf(snapshotPeriod) === index,
    )
    .sort((a, b) => b.localeCompare(a));
  const currentRotaxRevenue = rotaxRevenueEntries.find(
    (entry) =>
      Number(entry.year) === dashboardDate.getFullYear() &&
      Number(entry.month) === dashboardDate.getMonth() + 1,
  );
  const rotaxMonthlyRevenue = Number(currentRotaxRevenue?.revenueValue || 0);
  const rotaxMonthlyTarget = Number(currentRotaxRevenue?.targetValue || 0);
  const rotaxMonthlyDifference = rotaxMonthlyRevenue - rotaxMonthlyTarget;
  const rotaxMonthlyPercent = rotaxMonthlyTarget ? Math.round((rotaxMonthlyRevenue / rotaxMonthlyTarget) * 100) : 0;
  const rotaxMonthlyStatus = rotaxMonthlyDifference >= 0 ? 'above' : 'below';
  const rotaxMonthlyDiffLabel = rotaxMonthlyDifference >= 0 ? 'acima da meta' : 'para chegar na meta';
  const dashboardBusinessDays = countBusinessDaysInMonth(
    dashboardDate.getFullYear(),
    dashboardDate.getMonth() + 1,
  );
  const dashboardRemainingBusinessDays = countRemainingBusinessDays(
    dashboardDate.getFullYear(),
    dashboardDate.getMonth() + 1,
    new Date(),
  );
  const rotaxMonthlyMissing = Math.max(0, rotaxMonthlyTarget - rotaxMonthlyRevenue);
  const rotaxDailyNeeded =
    rotaxMonthlyMissing === 0 || dashboardRemainingBusinessDays === 0
      ? 0
      : rotaxMonthlyMissing / dashboardRemainingBusinessDays;
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
    const timer = window.setInterval(loadDollarQuote, DOLLAR_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="sales-dashboard">
      {saleCelebration && <FireworksCelebration sale={saleCelebration} />}

      <div className="dashboard-header">
        <div className="dashboard-period-control">
          <span>Período exibido</span>
          {isMasterUser ? (
            <select value={periodKey} onChange={(event) => onChangePeriod(event.target.value)}>
              <option value="current">Mês vigente · {formatDashboardMonthLabel(currentMonthKey)}</option>
              {historicalPeriods.map((snapshotPeriod) => (
                <option key={snapshotPeriod} value={snapshotPeriod}>
                  {formatDashboardMonthLabel(snapshotPeriod)}
                </option>
              ))}
              <option value="general">Geral · Todo o histórico</option>
            </select>
          ) : (
            <strong>{periodLabel}</strong>
          )}
        </div>
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
                  : 'Atualiza a cada 15 min')}
            </small>
            <div className="dashboard-business-days">
              <span>Dias úteis do mês</span>
              <b>
                {dashboardBusinessDays} total · {dashboardRemainingBusinessDays} restante(s)
              </b>
            </div>
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

      <section className={`dashboard-rotax-summary ${rotaxMonthlyStatus}`}>
        <div className="dashboard-card-title">
          <h3>Faturamento Rotax - {monthNames[dashboardDate.getMonth()]}</h3>
        </div>
        <div className="rotax-summary-grid">
          <div>
            <span>Faturamento do mês</span>
            <strong>{formatCurrencyValue(rotaxMonthlyRevenue)}</strong>
          </div>
          <div>
            <span>Meta</span>
            <strong>{formatCurrencyValue(rotaxMonthlyTarget)}</strong>
          </div>
          <div>
            <span>{rotaxMonthlyDiffLabel}</span>
            <strong>{formatCurrencyValue(Math.abs(rotaxMonthlyDifference))}</strong>
          </div>
          <div>
            <span>% faturamento/meta</span>
            <strong>{rotaxMonthlyPercent}%</strong>
          </div>
          <div>
            <span>Venda diária necessária</span>
            <strong>{formatCurrencyValue(rotaxDailyNeeded)}</strong>
          </div>
        </div>
      </section>

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
  const normalizedPercent = Math.min(Math.max(percent, 0), 100);
  const gaugeDegrees = `${normalizedPercent * 1.8}deg`;
  const needleDegrees = `${Math.min(Math.max(normalizedPercent * 1.8, 4), 176)}deg`;

  return (
    <div className="seller-gauge">
      <div className="seller-gauge-meter" style={{ '--gauge-deg': gaugeDegrees, '--needle-deg': needleDegrees }}>
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

function getInfoBlockSearchTitle(block) {
  if (block.type === 'toggle') return splitToggleContent(block.content).title;
  if (block.type === 'sidebar') return safeParseInfoContent(block.content, { title: '' }).title;
  if (block.type === 'link') return safeParseInfoContent(block.content, { label: '' }).label;
  if (block.type === 'image') {
    const content = safeParseInfoContent(block.content, { caption: '', name: '' });
    return content.caption || content.name;
  }
  if (block.type === 'table') {
    return safeParseInfoContent(block.content, { headers: [] }).headers.join(' ');
  }
  return String(block.content || '').split('\n')[0];
}

function InfoPanel({ blocks, onAddBlock, onChangeBlock, onRemoveBlock, onReorderBlocks, onSaveBlock, setActiveView }) {
  const [draggedBlockId, setDraggedBlockId] = useState(null);
  const [dragOverBlockId, setDragOverBlockId] = useState(null);
  const [menuTarget, setMenuTarget] = useState(null);
  const [pendingImageTarget, setPendingImageTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const pendingImageTargetRef = useRef(null);
  const imageInputRef = useRef(null);
  const normalizedSearchTerm = normalizeUploadText(searchTerm);
  const visibleBlocks = useMemo(
    () =>
      normalizedSearchTerm
        ? blocks.filter((block) => normalizeUploadText(getInfoBlockSearchTitle(block)).includes(normalizedSearchTerm))
        : blocks,
    [blocks, normalizedSearchTerm],
  );

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

      <label className="search-box info-search-box">
        <Search size={18} />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar pelo título"
        />
        {searchTerm && (
          <button type="button" title="Limpar busca" aria-label="Limpar busca" onClick={() => setSearchTerm('')}>
            <X size={17} />
          </button>
        )}
      </label>

      <div className="info-document">
        {!normalizedSearchTerm && renderAddControl('top')}
        <input ref={imageInputRef} accept="image/*" hidden type="file" onChange={handleImageFileChange} />

        {blocks.length === 0 ? (
          <div className="info-empty-state">
            <BookOpenText size={30} />
            <p>Adicione o primeiro bloco pelo botão +.</p>
          </div>
        ) : visibleBlocks.length === 0 ? (
          <div className="info-empty-state">
            <Search size={30} />
            <p>Nenhum título encontrado.</p>
          </div>
        ) : (
          <div className="info-block-list">
            {visibleBlocks.map((block) => (
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
                {!normalizedSearchTerm && renderAddControl(block.id, true)}
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

const initialCentralUploadFiles = {
  quotes: null,
  customers: null,
  billingBruno: null,
  billingElton: null,
  billingStephanie: null,
  rotaxParts: null,
  stock: [],
  contractMotor: null,
  contractTraining: null,
  contractReturn: null,
};

function UploadFileField({ accept = '.xlsx', file, label, multiple = false, onChange }) {
  const selectedFiles = multiple ? file || [] : file ? [file] : [];

  return (
    <label className={selectedFiles.length ? 'central-upload-field selected' : 'central-upload-field'}>
      <span className="central-upload-field-title">{label}</span>
      <span className="central-upload-file-name">
        {selectedFiles.length
          ? selectedFiles.map((selectedFile) => selectedFile.name).join(', ')
          : multiple
            ? 'Selecione um ou mais arquivos'
            : 'Selecione o arquivo'}
      </span>
      <span className="secondary-button compact central-upload-select">
        <Upload size={15} />
        Escolher
      </span>
      <input
        accept={accept}
        hidden
        multiple={multiple}
        type="file"
        onChange={(event) => {
          const nextFiles = [...(event.target.files || [])];
          onChange(multiple ? nextFiles : nextFiles[0] || null);
          event.target.value = '';
        }}
      />
    </label>
  );
}

function UploadsWorkspace({
  isBusy,
  onUploadBilling,
  onUploadContract,
  onUploadCustomers,
  onUploadQuotes,
  onUploadRotaxParts,
  onUploadStock,
}) {
  const [files, setFiles] = useState(initialCentralUploadFiles);
  const [statuses, setStatuses] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  function updateFiles(field, value) {
    setFiles((current) => ({ ...current, [field]: value }));
    setStatuses({});
  }

  const selectedCount =
    Object.entries(files).reduce((total, [field, value]) => {
      if (field === 'stock') return total + value.length;
      return total + (value ? 1 : 0);
    }, 0);

  async function processUploads() {
    const tasks = [
      files.customers && {
        id: 'customers',
        label: 'Clientes',
        run: () => onUploadCustomers(files.customers),
      },
      files.billingBruno && {
        id: 'billingBruno',
        label: 'Cobrança Bruno',
        run: () => onUploadBilling(files.billingBruno, 'Bruno'),
      },
      files.billingElton && {
        id: 'billingElton',
        label: 'Cobrança Elton',
        run: () => onUploadBilling(files.billingElton, 'Elton'),
      },
      files.billingStephanie && {
        id: 'billingStephanie',
        label: 'Cobrança Stephanie',
        run: () => onUploadBilling(files.billingStephanie, 'Stephanie'),
      },
      files.rotaxParts && {
        id: 'rotaxParts',
        label: 'Consulta PN Rotax',
        run: () => onUploadRotaxParts(files.rotaxParts),
      },
      ...files.stock.map((file, index) => ({
        id: `stock-${index}`,
        label: `Transferência/Estoque: ${file.name}`,
        run: () => onUploadStock(file),
      })),
      files.contractMotor && {
        id: 'contractMotor',
        label: 'Modelo contrato motor',
        run: () => onUploadContract('motor', files.contractMotor),
      },
      files.contractTraining && {
        id: 'contractTraining',
        label: 'Modelo contrato treinamento',
        run: () => onUploadContract('training', files.contractTraining),
      },
      files.contractReturn && {
        id: 'contractReturn',
        label: 'Modelo devolução',
        run: () => onUploadContract('return', files.contractReturn),
      },
      files.quotes && {
        id: 'quotes',
        label: 'Cotações',
        run: () => onUploadQuotes(files.quotes),
      },
    ].filter(Boolean);

    if (!tasks.length || isProcessing || isBusy) return;

    setIsProcessing(true);
    setStatuses({});

    for (const task of tasks) {
      setStatuses((current) => ({ ...current, [task.id]: { label: task.label, state: 'running' } }));
      try {
        await task.run();
        setStatuses((current) => ({ ...current, [task.id]: { label: task.label, state: 'success' } }));
      } catch (error) {
        setStatuses((current) => ({
          ...current,
          [task.id]: {
            label: task.label,
            message: error.message || 'Não foi possível processar o arquivo.',
            state: 'error',
          },
        }));
      }
    }

    setIsProcessing(false);
  }

  const statusItems = Object.entries(statuses);

  return (
    <section className="panel central-upload-workspace">
      <div className="central-upload-heading">
        <div>
          <p className="eyebrow">Central de arquivos</p>
          <h2>Upload</h2>
        </div>
        <div className="central-upload-actions">
          <span>{selectedCount} arquivo(s) selecionado(s)</span>
          <button
            className="primary-button compact"
            type="button"
            disabled={!selectedCount || isProcessing || isBusy}
            onClick={processUploads}
          >
            {isProcessing ? <RefreshCw className="spin" size={16} /> : <Upload size={16} />}
            {isProcessing ? 'Processando...' : 'Enviar todos'}
          </button>
        </div>
      </div>

      <div className="central-upload-section">
        <div className="central-upload-section-title">
          <FileText size={18} />
          <div>
            <h3>Comercial</h3>
            <p>Cotações, clientes e cobranças.</p>
          </div>
        </div>
        <div className="central-upload-grid">
          <UploadFileField label="Cotações" file={files.quotes} onChange={(file) => updateFiles('quotes', file)} />
          <UploadFileField label="Clientes" file={files.customers} onChange={(file) => updateFiles('customers', file)} />
          <UploadFileField label="Cobrança Bruno" file={files.billingBruno} onChange={(file) => updateFiles('billingBruno', file)} />
          <UploadFileField label="Cobrança Elton" file={files.billingElton} onChange={(file) => updateFiles('billingElton', file)} />
          <UploadFileField
            label="Cobrança Stephanie"
            file={files.billingStephanie}
            onChange={(file) => updateFiles('billingStephanie', file)}
          />
        </div>
      </div>

      <div className="central-upload-section">
        <div className="central-upload-section-title">
          <PackageSearch size={18} />
          <div>
            <h3>Produtos e estoque</h3>
            <p>O estoque aceita relatório, descrições e endereçamento no mesmo envio.</p>
          </div>
        </div>
        <div className="central-upload-grid">
          <UploadFileField
            label="Consulta PN Rotax"
            file={files.rotaxParts}
            onChange={(file) => updateFiles('rotaxParts', file)}
          />
          <UploadFileField
            label="Transferência/Estoque"
            file={files.stock}
            multiple
            onChange={(selectedFiles) => updateFiles('stock', selectedFiles)}
          />
        </div>
      </div>

      <div className="central-upload-section">
        <div className="central-upload-section-title">
          <FileText size={18} />
          <div>
            <h3>Modelos de contratos</h3>
            <p>O novo arquivo substitui o modelo atual do mesmo tipo.</p>
          </div>
        </div>
        <div className="central-upload-grid">
          <UploadFileField
            accept=".doc,.docx,.pdf"
            label="Contrato motor"
            file={files.contractMotor}
            onChange={(file) => updateFiles('contractMotor', file)}
          />
          <UploadFileField
            accept=".doc,.docx,.pdf"
            label="Contrato treinamento"
            file={files.contractTraining}
            onChange={(file) => updateFiles('contractTraining', file)}
          />
          <UploadFileField
            accept=".doc,.docx,.pdf"
            label="Devolução"
            file={files.contractReturn}
            onChange={(file) => updateFiles('contractReturn', file)}
          />
        </div>
      </div>

      {statusItems.length > 0 && (
        <div className="central-upload-results" aria-live="polite">
          <h3>Andamento do lote</h3>
          {statusItems.map(([id, status]) => (
            <div className={`central-upload-result ${status.state}`} key={id}>
              {status.state === 'success' ? (
                <CheckCircle2 size={17} />
              ) : status.state === 'error' ? (
                <AlertTriangle size={17} />
              ) : (
                <RefreshCw className="spin" size={17} />
              )}
              <span>
                <b>{status.label}</b>
                {status.state === 'running'
                  ? 'Processando...'
                  : status.state === 'success'
                    ? id === 'quotes'
                      ? 'Prévia pronta para confirmação.'
                      : 'Concluído.'
                    : status.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SideNavigation({
  activeView,
  dataStatus,
  errors,
  form,
  isMasterUser,
  metrics,
  onNavigate,
  onSubmitQuote,
  onUpdateForm,
  quoteFormOpen,
  setActiveTab,
  setActiveTrackingTab,
  setQuoteFormOpen,
  smartAlerts,
  trackingMetrics,
}) {
  function navigateQuotes(tab) {
    onNavigate('quotes');
    setActiveTab(tab);
  }

  return (
    <aside className="side-navigation">
      <button className="side-logo-button" type="button" aria-label="Voltar para cotações" onClick={() => navigateQuotes('abertas')}>
        <img className="app-logo side-logo" src="/followuper-logo.png" alt="FollowUper" />
      </button>

      <div className="side-status">
        <Database size={15} />
        {dataStatus}
      </div>

      <section className={quoteFormOpen ? 'side-quote-create open' : 'side-quote-create'}>
        <button className="side-nav-button primary" type="button" onClick={() => setQuoteFormOpen((current) => !current)}>
          <Plus size={17} />
          Nova cotação
          <ChevronRight size={16} />
        </button>
        {quoteFormOpen && (
          <form className="side-quote-form" onSubmit={onSubmitQuote} noValidate>
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
              Cliente
              <input
                list="customer-name-options"
                value={form.clientName}
                onChange={(event) => onUpdateForm('clientName', event.target.value)}
                placeholder="Nome do cliente"
              />
              {errors.clientName && <small>{errors.clientName}</small>}
            </label>

            <label>
              Telefone
              <input value={form.phone} onChange={(event) => onUpdateForm('phone', event.target.value)} placeholder="Telefone" />
            </label>

            <label>
              Valor
              <input
                inputMode="numeric"
                value={form.quoteValue}
                onChange={(event) => onUpdateForm('quoteValue', event.target.value)}
                placeholder="R$ 0,00"
              />
            </label>

            <label>
              Pagamento
              <input
                value={form.paymentTerms}
                onChange={(event) => onUpdateForm('paymentTerms', event.target.value)}
                placeholder="Opcional"
              />
            </label>

            <label>
              Data
              <input type="date" value={form.quoteDate} onChange={(event) => onUpdateForm('quoteDate', event.target.value)} />
              {errors.quoteDate && <small>{errors.quoteDate}</small>}
            </label>

            <div className="side-followup-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.followUpUsesTime}
                  onChange={(event) => onUpdateForm('followUpUsesTime', event.target.checked)}
                />
                Tempo
              </label>
              <label>
                Follow-up
                <div className="inline-field-pair">
                  <input
                    min="1"
                    type="number"
                    value={form.followUpAmount}
                    onChange={(event) => onUpdateForm('followUpAmount', event.target.value)}
                  />
                  {form.followUpUsesTime && (
                    <select value={form.followUpUnit} onChange={(event) => onUpdateForm('followUpUnit', event.target.value)}>
                      <option value="hours">Horas</option>
                      <option value="minutes">Min.</option>
                    </select>
                  )}
                </div>
                {errors.followUpAmount && <small>{errors.followUpAmount}</small>}
              </label>
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
                placeholder="Observações"
                rows="3"
              />
            </label>

            <button className="primary-button compact" type="submit">
              <Plus size={16} />
              Adicionar
            </button>
          </form>
        )}
      </section>

      <nav className="side-nav-list" aria-label="Menu principal">
        <button className={activeView === 'quotes' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => navigateQuotes('abertas')}>
          <FileText size={17} />
          Cotações
        </button>
        <button className={activeView === 'info' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('info')}>
          <BookOpenText size={17} />
          Painel infos.
        </button>
        <button className={activeView === 'uploads' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('uploads')}>
          <Upload size={17} />
          Upload
        </button>
        <button className={activeView === 'tracking' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('tracking')}>
          <Truck size={17} />
          Rastreio
        </button>
        <button className={activeView === 'customers' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('customers')}>
          <Users size={17} />
          Clientes
        </button>
        <button className={activeView === 'billing' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('billing')}>
          <FileText size={17} />
          Cobrança
        </button>
        <button className={activeView === 'contracts' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('contracts')}>
          <FileText size={17} />
          Contratos
        </button>
        <button className={activeView === 'returns' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('returns')}>
          <RefreshCw size={17} />
          Devoluções
        </button>
        <button className={activeView === 'warranties' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('warranties')}>
          <ShieldCheck size={17} />
          Garantias
        </button>
        {isMasterUser && (
          <button className={activeView === 'users' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('users')}>
            <Users size={17} />
            Usuários
          </button>
        )}
        <button className={activeView === 'rotaxParts' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('rotaxParts')}>
          <PackageSearch size={17} />
          Consulta PN Rotax
        </button>
        <button className={activeView === 'stockTransfers' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('stockTransfers')}>
          <RefreshCw size={17} />
          Transferência/Estoque
        </button>
        <button className={activeView === 'rotax' ? 'side-nav-button active' : 'side-nav-button'} type="button" onClick={() => onNavigate('rotax')}>
          <GraduationCap size={17} />
          Trein. Rotax
        </button>
        <button
          className={activeView === 'rotaxRevenue' ? 'side-nav-button active' : 'side-nav-button'}
          type="button"
          onClick={() => onNavigate('rotaxRevenue')}
        >
          <ShieldCheck size={17} />
          Fat. Rotax
        </button>
      </nav>

      <div className="side-alerts" aria-live="polite">
        <button type="button" onClick={() => navigateQuotes('followup')}>
          <Bell size={16} />
          ({metrics.followUpDue}) Follow-up
        </button>
        <button type="button" onClick={() => navigateQuotes('abertas')}>
          <AlertTriangle size={16} />
          ({metrics.unchangedStatus}) Sem alt.
        </button>
        <button
          type="button"
          onClick={() => {
            onNavigate('tracking');
            setActiveTrackingTab('Em andamento');
          }}
        >
          <PackageSearch size={16} />
          ({trackingMetrics.withoutCode}) S/ rastreio
        </button>
      </div>

      {smartAlerts.length > 0 && (
        <div className="side-smart-alerts">
          {smartAlerts.map((alert) => (
            <span key={alert}>{alert}</span>
          ))}
        </div>
      )}
    </aside>
  );
}

function QuotesWorkspace({
  activeTab,
  errors,
  form,
  isUploadingQuotes,
  isSimpleLayout,
  metrics,
  now,
  onArchiveQuote,
  onChangeQuoteSort,
  onChangeStatus,
  onEditQuote,
  onRemoveQuote,
  onRestartFollowUp,
  onSubmit,
  onUpdateForm,
  onUploadClick,
  openCloseModal,
  quoteSort,
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
  hideQuoteForm,
  visibleQuotes,
}) {
  const tableWrapRef = useRef(null);
  const tableRef = useRef(null);
  const topScrollRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  useEffect(() => {
    function updateScrollWidth() {
      const nextWidth = tableRef.current?.scrollWidth || tableWrapRef.current?.scrollWidth || 0;
      setTableScrollWidth(nextWidth);
    }

    updateScrollWidth();
    window.addEventListener('resize', updateScrollWidth);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateScrollWidth);
    }

    const resizeObserver = new ResizeObserver(updateScrollWidth);
    if (tableRef.current) resizeObserver.observe(tableRef.current);
    if (tableWrapRef.current) resizeObserver.observe(tableWrapRef.current);

    return () => {
      window.removeEventListener('resize', updateScrollWidth);
      resizeObserver.disconnect();
    };
  }, [activeTab, isSimpleLayout, visibleQuotes.length]);

  function syncTableScrollFromTop(event) {
    if (tableWrapRef.current) tableWrapRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  function syncTopScrollFromTable(event) {
    if (topScrollRef.current) topScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  function getSortDirectionLabel(key) {
    if (quoteSort.key !== key) return '';
    return quoteSort.direction === 'asc' ? 'Asc' : 'Desc';
  }

  return (
    <section className={hideQuoteForm ? 'workspace-grid no-quote-form' : 'workspace-grid'}>
      {!hideQuoteForm && (
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
            list="customer-name-options"
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
            inputMode="numeric"
            value={form.quoteValue}
            onChange={(event) => onUpdateForm('quoteValue', event.target.value)}
            placeholder="R$ 0,00"
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
      )}

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
            {!isSimpleLayout && (
              <button className="secondary-button compact" type="button" disabled={isUploadingQuotes} onClick={onUploadClick}>
                <Upload size={16} />
                {isUploadingQuotes ? 'Importando...' : 'Upload'}
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

        <div className="table-top-scroll" ref={topScrollRef} onScroll={syncTableScrollFromTop} aria-label="Mover tabela lateralmente">
          <div style={{ width: `${tableScrollWidth || 900}px` }} />
        </div>

        <div className="table-wrap" ref={tableWrapRef} onScroll={syncTopScrollFromTable}>
          <table className="quote-table" ref={tableRef}>
            <thead>
              <tr>
                <th>Status</th>
                <th>
                  <button className="sortable-header-button" type="button" onClick={() => onChangeQuoteSort('quoteNumber')}>
                    Nº cotação
                    <span>{getSortDirectionLabel('quoteNumber')}</span>
                  </button>
                </th>
                <th>Cliente</th>
                <th>
                  <button className="sortable-header-button" type="button" onClick={() => onChangeQuoteSort('value')}>
                    Valor
                    <span>{getSortDirectionLabel('value')}</span>
                  </button>
                </th>
                <th>
                  <button className="sortable-header-button" type="button" onClick={() => onChangeQuoteSort('date')}>
                    Data cotação
                    <span>{getSortDirectionLabel('date')}</span>
                  </button>
                </th>
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
                          <button
                            className="obs-button history-button"
                            type="button"
                            title="Ver historico da cotacao"
                            aria-label="Ver historico da cotacao"
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleQuoteDetails(quote.id);
                            }}
                          >
                            Hist.
                          </button>
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
                            {quote.lossReason && (
                              <span>
                                <b>Motivo de perda</b>
                                {getLossReasonLabel(quote.lossReason.reason)}
                              </span>
                            )}
                            <QuoteHistoryTimeline quote={quote} />
                          </div>
                        </td>
                      </tr>
                    )}
                    {!showCloseDetails && detailsExpanded && (
                      <tr className="closed-details-row quote-notes-row">
                        <td colSpan="8">
                          <div className="closed-details quote-notes-details">
                            <span>
                              <b>Obs. cotação</b>
                              {quote.notes}
                            </span>
                            {quote.lossReason && (
                              <span>
                                <b>Motivo de perda</b>
                                {getLossReasonLabel(quote.lossReason.reason)}
                              </span>
                            )}
                            <QuoteHistoryTimeline quote={quote} />
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

function QuoteHistoryTimeline({ quote }) {
  const history = getQuoteHistory(quote);

  return (
    <div className="quote-history">
      <b>Historico da cotacao</b>
      <div className="quote-history-list">
        {history.map((event) => (
          <span className="quote-history-item" key={event.id || `${event.type}-${event.createdAt}`}>
            <i />
            <strong>{event.label}</strong>
            <small>{formatDateTime(event.createdAt)}</small>
            {event.details?.status && <em>{event.details.status}</em>}
            {event.details?.seller && <em>{event.details.seller}</em>}
            {event.details?.reason && <em>{event.details.reason}</em>}
            {event.details?.orderNumber && <em>Pedido {event.details.orderNumber}</em>}
            {event.details?.value && <em>{event.details.value}</em>}
          </span>
        ))}
      </div>
    </div>
  );
}

function RotaxRevenueWorkspace({ activeYear, entries, onCreateYear, onSaveEntry, setActiveView, setActiveYear }) {
  const years = useMemo(() => {
    const entryYears = [...new Set(entries.map((entry) => Number(entry.year)))].filter(Boolean);
    const currentYear = new Date().getFullYear();
    return [...new Set([currentYear, 2026, ...entryYears])].sort((a, b) => b - a);
  }, [entries]);
  const [newYear, setNewYear] = useState(String(years[0] || new Date().getFullYear()));
  const rows = useMemo(() => {
    const byMonth = new Map(
      entries
        .filter((entry) => Number(entry.year) === Number(activeYear))
        .map((entry) => [Number(entry.month), entry]),
    );

    return monthNames.map((monthName, index) => {
      const month = index + 1;
      return (
        byMonth.get(month) || {
          id: '',
          year: activeYear,
          month,
          revenueValue: 0,
          targetValue: 0,
          notes: '',
        }
      );
    });
  }, [activeYear, entries]);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setDrafts(
      rows.reduce((acc, row) => {
        acc[`${row.year}-${row.month}`] = {
          revenueValue: row.revenueValue ? formatUploadCurrency(row.revenueValue) : '',
          targetValue: row.targetValue ? formatUploadCurrency(row.targetValue) : '',
          notes: row.notes || '',
        };
        return acc;
      }, {}),
    );
  }, [rows]);

  const totals = rows.reduce(
    (acc, row) => ({
      revenue: acc.revenue + Number(row.revenueValue || 0),
      target: acc.target + Number(row.targetValue || 0),
    }),
    { revenue: 0, target: 0 },
  );
  const difference = totals.revenue - totals.target;
  const percent = totals.target ? Math.round((totals.revenue / totals.target) * 100) : 0;
  const progressPercent = Math.max(0, Math.min(100, percent));

  function getDraft(row) {
    return drafts[`${row.year}-${row.month}`] || { revenueValue: '', targetValue: '', notes: '' };
  }

  function updateDraft(row, field, value) {
    setDrafts((current) => ({
      ...current,
      [`${row.year}-${row.month}`]: {
        ...getDraft(row),
        [field]: field === 'notes' ? value : formatCurrencyInput(value),
      },
    }));
  }

  function saveRow(row) {
    const draft = getDraft(row);
    onSaveEntry(row, {
      revenueValue: parseUploadCurrency(draft.revenueValue),
      targetValue: parseUploadCurrency(draft.targetValue),
      notes: draft.notes.trim(),
    });
  }

  return (
    <section className="rotax-revenue-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <ShieldCheck size={20} />
          <h2>Faturamento Rotax</h2>
        </div>
        <div className="panel-actions">
          <button className="secondary-button compact" type="button" onClick={() => setActiveView('quotes')}>
            <FileText size={16} />
            Cotações
          </button>
        </div>
      </div>

      <div className="master-notice">
        <ShieldCheck size={18} />
        Faturamento Rotax compartilhado entre usuarios logados.
      </div>

      <div className="rotax-revenue-controls">
        <label>
          Ano
          <select value={activeYear} onChange={(event) => setActiveYear(Number(event.target.value))}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          Criar ano
          <input
            inputMode="numeric"
            min="2023"
            type="number"
            value={newYear}
            onChange={(event) => setNewYear(event.target.value)}
          />
        </label>
        <button className="primary-button compact" type="button" onClick={() => onCreateYear(newYear)}>
          <Plus size={16} />
          Criar/abrir ano
        </button>
      </div>

      <div className="rotax-revenue-summary">
        <article>
          <span>Faturamento anual</span>
          <strong>{formatCurrencyValue(totals.revenue)}</strong>
        </article>
        <article>
          <span>Meta anual</span>
          <strong>{formatCurrencyValue(totals.target)}</strong>
        </article>
        <article className={difference >= 0 ? 'positive' : 'negative'}>
          <span>Diferença</span>
          <strong>{formatCurrencyValue(difference)}</strong>
        </article>
        <article>
          <span>Atingimento</span>
          <strong>{percent}%</strong>
          <div className="rotax-revenue-progress" aria-hidden="true">
            <i style={{ width: `${progressPercent}%` }} />
          </div>
        </article>
      </div>

      <div className="table-wrap">
        <table className="quote-table rotax-revenue-table">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Faturamento</th>
              <th>Meta</th>
              <th>Diferença</th>
              <th>% meta</th>
              <th>Observações</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = getDraft(row);
              const revenue = parseUploadCurrency(draft.revenueValue);
              const target = parseUploadCurrency(draft.targetValue);
              const monthDifference = revenue - target;
              const monthPercent = target ? Math.round((revenue / target) * 100) : 0;

              return (
                <tr className="quote-row" key={`${row.year}-${row.month}`}>
                  <td className="strong-text">{monthNames[row.month - 1]}</td>
                  <td>
                    <input
                      inputMode="numeric"
                      value={draft.revenueValue}
                      onChange={(event) => updateDraft(row, 'revenueValue', event.target.value)}
                      placeholder="R$ 0,00"
                    />
                  </td>
                  <td>
                    <input
                      inputMode="numeric"
                      value={draft.targetValue}
                      onChange={(event) => updateDraft(row, 'targetValue', event.target.value)}
                      placeholder="R$ 0,00"
                    />
                  </td>
                  <td className={monthDifference >= 0 ? 'positive-text' : 'negative-text'}>
                    {formatCurrencyValue(monthDifference)}
                  </td>
                  <td>{target ? `${monthPercent}%` : '—'}</td>
                  <td>
                    <input
                      value={draft.notes}
                      onChange={(event) => updateDraft(row, 'notes', event.target.value)}
                      placeholder="Observação do mês"
                    />
                  </td>
                  <td>
                    <button className="secondary-button compact" type="button" onClick={() => saveRow(row)}>
                      <Save size={16} />
                      Salvar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const ROTAX_REVENUE_DRAFTS_STORAGE_KEY = 'followuper.rotaxRevenueDrafts.v1';

function loadRotaxRevenueDrafts() {
  try {
    return JSON.parse(localStorage.getItem(ROTAX_REVENUE_DRAFTS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveRotaxRevenueDrafts(drafts) {
  localStorage.setItem(ROTAX_REVENUE_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

function saveRotaxRevenueDraft(key, draft) {
  const drafts = loadRotaxRevenueDrafts();
  drafts[key] = draft;
  saveRotaxRevenueDrafts(drafts);
}

function removeRotaxRevenueDraft(key) {
  const drafts = loadRotaxRevenueDrafts();
  delete drafts[key];
  saveRotaxRevenueDrafts(drafts);
}

function RotaxRevenueWorkspaceV2({ activeYear, entries, onCreateYear, onSaveEntry, setActiveView, setActiveYear }) {
  const years = useMemo(() => {
    const entryYears = [...new Set(entries.map((entry) => Number(entry.year)))].filter(Boolean);
    const currentYear = new Date().getFullYear();
    return [...new Set([currentYear, 2026, ...entryYears])].sort((a, b) => b - a);
  }, [entries]);
  const currentDate = new Date();
  const [newYear, setNewYear] = useState(String(years[0] || currentDate.getFullYear()));
  const [activeInsight, setActiveInsight] = useState('monthlyGoal');
  const [monthlyGoalYear, setMonthlyGoalYear] = useState(activeYear);
  const [monthlyGoalMonth, setMonthlyGoalMonth] = useState(currentDate.getMonth() + 1);
  const [compareBaseYear, setCompareBaseYear] = useState(2025);
  const [compareBaseMonth, setCompareBaseMonth] = useState(currentDate.getMonth() + 1);
  const [compareTargetYear, setCompareTargetYear] = useState(2026);
  const [compareTargetMonth, setCompareTargetMonth] = useState(currentDate.getMonth() + 1);
  const [expandedBranchRows, setExpandedBranchRows] = useState([]);
  const rows = useMemo(() => {
    const byMonth = new Map(
      entries
        .filter((entry) => Number(entry.year) === Number(activeYear))
        .map((entry) => [Number(entry.month), entry]),
    );

    return monthNames.map((monthName, index) => {
      const month = index + 1;
      return (
        byMonth.get(month) || {
          id: '',
          year: activeYear,
          month,
          revenueValue: 0,
          targetValue: 0,
          matrizValue: 0,
          campinasValue: 0,
          goianiaValue: 0,
          notes: '',
        }
      );
    });
  }, [activeYear, entries]);
  const [drafts, setDrafts] = useState(() => loadRotaxRevenueDrafts());

  useEffect(() => {
    const storedDrafts = loadRotaxRevenueDrafts();
    setDrafts(() => {
      const nextDrafts = rows.reduce((acc, row) => {
        const key = `${row.year}-${row.month}`;
        const savedDraft = storedDrafts[key] || {};
        acc[`${row.year}-${row.month}`] = {
          revenueValue: row.revenueValue ? formatUploadCurrency(row.revenueValue) : '',
          targetValue: row.targetValue ? formatUploadCurrency(row.targetValue) : '',
          matrizValue: row.matrizValue ? formatUploadCurrency(row.matrizValue) : '',
          campinasValue: row.campinasValue ? formatUploadCurrency(row.campinasValue) : '',
          goianiaValue: row.goianiaValue ? formatUploadCurrency(row.goianiaValue) : '',
          notes: row.notes || '',
          ...savedDraft,
        };
        return acc;
      }, {});

      return nextDrafts;
    });
  }, [rows]);

  function getEntry(year, month) {
    return entries.find((entry) => Number(entry.year) === Number(year) && Number(entry.month) === Number(month));
  }

  const totals = rows.reduce(
    (acc, row) => ({
      revenue: acc.revenue + Number(row.revenueValue || 0),
      target: acc.target + Number(row.targetValue || 0),
    }),
    { revenue: 0, target: 0 },
  );
  const difference = totals.revenue - totals.target;
  const percent = totals.target ? Math.round((totals.revenue / totals.target) * 100) : 0;
  const progressPercent = Math.max(0, Math.min(100, percent));
  const monthlyGoalEntry = getEntry(monthlyGoalYear, monthlyGoalMonth) || {};
  const monthlyBusinessDays = countBusinessDaysInMonth(Number(monthlyGoalYear), Number(monthlyGoalMonth));
  const monthlyRemainingDays = countRemainingBusinessDays(Number(monthlyGoalYear), Number(monthlyGoalMonth), currentDate);
  const monthlyTarget = Number(monthlyGoalEntry.targetValue || 0);
  const monthlyRevenue = Number(monthlyGoalEntry.revenueValue || 0);
  const monthlyMissing = Math.max(0, monthlyTarget - monthlyRevenue);
  const dailyNeeded = monthlyMissing === 0 || monthlyRemainingDays === 0 ? 0 : monthlyMissing / monthlyRemainingDays;
  const goalDiffRows = rows.filter((row) => isMonthAvailableForGoalDiff(Number(row.year), Number(row.month), currentDate));
  const goalDiffTotals = goalDiffRows.reduce(
    (acc, row) => {
      const rowDiff = Number(row.revenueValue || 0) - Number(row.targetValue || 0);
      if (rowDiff >= 0) acc.above += rowDiff;
      else acc.below += Math.abs(rowDiff);
      return acc;
    },
    { above: 0, below: 0 },
  );
  const goalDiffNet = goalDiffTotals.above - goalDiffTotals.below;
  const compareBaseEntry = getEntry(compareBaseYear, compareBaseMonth) || {};
  const compareTargetEntry = getEntry(compareTargetYear, compareTargetMonth) || {};
  const periodDifference = Number(compareTargetEntry.revenueValue || 0) - Number(compareBaseEntry.revenueValue || 0);
  const annualAverage = totals.revenue / 12;

  function getDraft(row) {
    return (
      drafts[`${row.year}-${row.month}`] || {
        revenueValue: '',
        targetValue: '',
        matrizValue: '',
        campinasValue: '',
        goianiaValue: '',
        notes: '',
      }
    );
  }

  function updateDraft(row, field, value) {
    const key = `${row.year}-${row.month}`;

    setDrafts((current) => {
      const nextDraft = {
        ...(current[key] || getDraft(row)),
        [field]: field === 'notes' ? value : formatCurrencyInput(value),
      };
      const nextDrafts = {
        ...current,
        [key]: nextDraft,
      };

      saveRotaxRevenueDraft(key, nextDraft);
      return nextDrafts;
    });
  }

  function toggleBranchRow(row) {
    const key = `${row.year}-${row.month}`;
    setExpandedBranchRows((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  async function saveRow(row, options = {}) {
    const key = `${row.year}-${row.month}`;
    const draft = getDraft(row);
    const matrizValue = parseUploadCurrency(draft.matrizValue);
    const campinasValue = parseUploadCurrency(draft.campinasValue);
    const goianiaValue = parseUploadCurrency(draft.goianiaValue);
    const branchTotal = matrizValue + campinasValue + goianiaValue;

    const saved = await onSaveEntry(row, {
      revenueValue: options.useBranchTotal ? branchTotal : parseUploadCurrency(draft.revenueValue),
      targetValue: parseUploadCurrency(draft.targetValue),
      matrizValue,
      campinasValue,
      goianiaValue,
      notes: draft.notes.trim(),
    });
    if (saved) removeRotaxRevenueDraft(key);
  }

  function renderYearSelect(value, onChange) {
    return (
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    );
  }

  function renderMonthSelect(value, onChange) {
    return (
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {monthNames.map((monthName, index) => (
          <option key={monthName} value={index + 1}>
            {monthName}
          </option>
        ))}
      </select>
    );
  }

  return (
    <section className="rotax-revenue-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <ShieldCheck size={20} />
          <h2>Faturamento Rotax</h2>
        </div>
        <div className="panel-actions rotax-revenue-actions">
          <button
            className={activeInsight === 'monthlyGoal' ? 'secondary-button compact active' : 'secondary-button compact'}
            type="button"
            onClick={() => setActiveInsight('monthlyGoal')}
          >
            Meta mensal
          </button>
          <button
            className={activeInsight === 'goalDiff' ? 'secondary-button compact active' : 'secondary-button compact'}
            type="button"
            onClick={() => setActiveInsight('goalDiff')}
          >
            Diferença meta
          </button>
          <button
            className={activeInsight === 'periodDiff' ? 'secondary-button compact active' : 'secondary-button compact'}
            type="button"
            onClick={() => setActiveInsight('periodDiff')}
          >
            Diferença período
          </button>
          <button
            className={activeInsight === 'annualAverage' ? 'secondary-button compact active' : 'secondary-button compact'}
            type="button"
            onClick={() => setActiveInsight('annualAverage')}
          >
            Média fat. anual
          </button>
          <button className="secondary-button compact" type="button" onClick={() => setActiveView('quotes')}>
            <FileText size={16} />
            Cotações
          </button>
        </div>
      </div>

      <div className="master-notice">
        <ShieldCheck size={18} />
        Faturamento Rotax compartilhado entre usuarios logados.
      </div>

      <div className="rotax-revenue-controls">
        <label>
          Ano
          <select value={activeYear} onChange={(event) => setActiveYear(Number(event.target.value))}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          Criar ano
          <input
            inputMode="numeric"
            min="2023"
            type="number"
            value={newYear}
            onChange={(event) => setNewYear(event.target.value)}
          />
        </label>
        <button className="primary-button compact" type="button" onClick={() => onCreateYear(newYear)}>
          <Plus size={16} />
          Criar/abrir ano
        </button>
      </div>

      <div className="rotax-revenue-summary">
        <article>
          <span>Faturamento anual</span>
          <strong>{formatCurrencyValue(totals.revenue)}</strong>
        </article>
        <article>
          <span>Meta anual</span>
          <strong>{formatCurrencyValue(totals.target)}</strong>
        </article>
        <article className={difference >= 0 ? 'positive' : 'negative'}>
          <span>Diferença</span>
          <strong>{formatCurrencyValue(difference)}</strong>
        </article>
        <article>
          <span>Atingimento</span>
          <strong>{percent}%</strong>
          <div className="rotax-revenue-progress" aria-hidden="true">
            <i style={{ width: `${progressPercent}%` }} />
          </div>
        </article>
      </div>

      <div className="rotax-revenue-insight">
        {activeInsight === 'monthlyGoal' && (
          <>
            <div className="rotax-insight-controls">
              <label>
                Ano
                {renderYearSelect(monthlyGoalYear, setMonthlyGoalYear)}
              </label>
              <label>
                Mês
                {renderMonthSelect(monthlyGoalMonth, setMonthlyGoalMonth)}
              </label>
            </div>
            <div className="rotax-insight-grid">
              <span>
                <b>Dias úteis do mês</b>
                {monthlyBusinessDays}
              </span>
              <span>
                <b>Dias úteis restantes</b>
                {monthlyRemainingDays}
              </span>
              <span>
                <b>Valor da meta</b>
                {formatCurrencyValue(monthlyTarget)}
              </span>
              <span>
                <b>Valor atual</b>
                {formatCurrencyValue(monthlyRevenue)}
              </span>
              <span>
                <b>Venda diária necessária</b>
                {formatCurrencyValue(dailyNeeded)}
              </span>
            </div>
          </>
        )}

        {activeInsight === 'goalDiff' && (
          <div className="rotax-insight-grid three">
            <span className="positive">
              <b>Meses acima da meta</b>
              {formatCurrencyValue(goalDiffTotals.above)}
            </span>
            <span className="negative">
              <b>Meses abaixo da meta</b>
              {formatCurrencyValue(goalDiffTotals.below)}
            </span>
            <span className={goalDiffNet >= 0 ? 'positive' : 'negative'}>
              <b>Diferença final</b>
              {formatCurrencyValue(goalDiffNet)}
            </span>
          </div>
        )}

        {activeInsight === 'periodDiff' && (
          <>
            <div className="rotax-insight-controls compare">
              <label>
                Ano inicial
                {renderYearSelect(compareBaseYear, setCompareBaseYear)}
              </label>
              <label>
                Mês inicial
                {renderMonthSelect(compareBaseMonth, setCompareBaseMonth)}
              </label>
              <label>
                Ano comparação
                {renderYearSelect(compareTargetYear, setCompareTargetYear)}
              </label>
              <label>
                Mês comparação
                {renderMonthSelect(compareTargetMonth, setCompareTargetMonth)}
              </label>
            </div>
            <div className="rotax-insight-grid three">
              <span>
                <b>
                  {monthNames[compareBaseMonth - 1]} / {compareBaseYear}
                </b>
                {formatCurrencyValue(compareBaseEntry.revenueValue)}
              </span>
              <span>
                <b>
                  {monthNames[compareTargetMonth - 1]} / {compareTargetYear}
                </b>
                {formatCurrencyValue(compareTargetEntry.revenueValue)}
              </span>
              <span className={periodDifference >= 0 ? 'positive' : 'negative'}>
                <b>Diferença</b>
                {formatCurrencyValue(periodDifference)}
              </span>
            </div>
          </>
        )}

        {activeInsight === 'annualAverage' && (
          <div className="rotax-insight-grid three">
            <span>
              <b>Total faturado em 12 meses</b>
              {formatCurrencyValue(totals.revenue)}
            </span>
            <span>
              <b>Divisão</b>
              12 meses
            </span>
            <span className="positive">
              <b>Média fat. anual</b>
              {formatCurrencyValue(annualAverage)}
            </span>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table className="quote-table rotax-revenue-table">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Faturamento</th>
              <th>Meta</th>
              <th>Diferença</th>
              <th>% meta</th>
              <th>Observações</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = getDraft(row);
              const revenue = parseUploadCurrency(draft.revenueValue);
              const target = parseUploadCurrency(draft.targetValue);
              const monthDifference = revenue - target;
              const monthPercent = target ? Math.round((revenue / target) * 100) : 0;
              const rowKey = `${row.year}-${row.month}`;
              const branchesExpanded = expandedBranchRows.includes(rowKey);
              const branchTotal =
                parseUploadCurrency(draft.matrizValue) +
                parseUploadCurrency(draft.campinasValue) +
                parseUploadCurrency(draft.goianiaValue);

              return (
                <React.Fragment key={rowKey}>
                  <tr className="quote-row">
                    <td className="strong-text">
                      <div className="month-with-branch">
                        <button
                          className="inline-plus-button"
                          type="button"
                          title="Abrir faturamento por filial"
                          aria-label="Abrir faturamento por filial"
                          onClick={() => toggleBranchRow(row)}
                        >
                          <Plus size={15} />
                        </button>
                        {monthNames[row.month - 1]}
                      </div>
                    </td>
                    <td>
                      <input
                        inputMode="numeric"
                        value={draft.revenueValue}
                        onChange={(event) => updateDraft(row, 'revenueValue', event.target.value)}
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td>
                      <input
                        inputMode="numeric"
                        value={draft.targetValue}
                        onChange={(event) => updateDraft(row, 'targetValue', event.target.value)}
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className={monthDifference >= 0 ? 'positive-text' : 'negative-text'}>
                      {formatCurrencyValue(monthDifference)}
                    </td>
                    <td>{target ? `${monthPercent}%` : '—'}</td>
                    <td>
                      <input
                        value={draft.notes}
                        onChange={(event) => updateDraft(row, 'notes', event.target.value)}
                        placeholder="Observação do mês"
                      />
                    </td>
                    <td>
                      <button className="secondary-button compact" type="button" onClick={() => saveRow(row)}>
                        <Save size={16} />
                        Salvar
                      </button>
                    </td>
                  </tr>
                  {branchesExpanded && (
                    <tr className="closed-details-row rotax-branch-row">
                      <td colSpan="7">
                        <div className="rotax-branch-editor">
                          <label>
                            Matriz:
                            <input
                              inputMode="numeric"
                              value={draft.matrizValue}
                              onChange={(event) => updateDraft(row, 'matrizValue', event.target.value)}
                              placeholder="R$ 0,00"
                            />
                          </label>
                          <label>
                            Campinas:
                            <input
                              inputMode="numeric"
                              value={draft.campinasValue}
                              onChange={(event) => updateDraft(row, 'campinasValue', event.target.value)}
                              placeholder="R$ 0,00"
                            />
                          </label>
                          <label>
                            Goiania:
                            <input
                              inputMode="numeric"
                              value={draft.goianiaValue}
                              onChange={(event) => updateDraft(row, 'goianiaValue', event.target.value)}
                              placeholder="R$ 0,00"
                            />
                          </label>
                          <span className="branch-total">
                            <b>Total filiais</b>
                            {formatCurrencyValue(branchTotal)}
                          </span>
                          <button className="primary-button compact" type="button" onClick={() => saveRow(row, { useBranchTotal: true })}>
                            <Save size={16} />
                            Salvar soma
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getRotaxSessionLabel(session) {
  return session?.trainingDate ? formatDate(`${session.trainingDate}T12:00:00`) : 'Sem treinamento';
}

function isRotaxSessionArchived(session) {
  return Boolean(session?.archivedAt);
}

function hasRotaxSessionPassed(session) {
  return Boolean(session?.trainingDate && session.trainingDate < getTodayInputValue());
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
  onArchiveSession,
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
  const activeSessions = sessions.filter((session) => !isRotaxSessionArchived(session));
  const archivedSessions = sessions.filter(isRotaxSessionArchived);
  const displayedSessions = activeTab === 'archived' ? archivedSessions : activeSessions;
  const activeSession = displayedSessions.find((session) => session.id === activeSessionId);

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
            <button
              className={activeTab === 'archived' ? 'tab active' : 'tab'}
              type="button"
              onClick={() => setActiveTab('archived')}
            >
              Arquivados
              <strong>{metrics.archived}</strong>
            </button>
          </div>
          <div className="panel-actions">
            {activeTab !== 'archived' && (
              <button className="secondary-button compact" type="button" onClick={onAddStudent}>
                <Plus size={16} />
                Adicionar novo aluno
              </button>
            )}
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
              {displayedSessions.length === 0 ? (
                <button className="tab active" type="button" disabled={activeTab === 'archived'} onClick={activeTab === 'archived' ? undefined : onAddSession}>
                  {activeTab === 'archived' ? 'Nenhum treinamento arquivado' : 'Nenhum treinamento cadastrado'}
                  <strong>{activeTab === 'archived' ? '0' : '+'}</strong>
                </button>
              ) : (
                displayedSessions.map((session) => {
                  const canArchive = activeTab === 'students' && hasRotaxSessionPassed(session);

                  return (
                    <div className="rotax-session-tab-item" key={session.id}>
                      <button
                        className={activeSessionId === session.id ? 'tab active' : 'tab'}
                        type="button"
                        onClick={() => setActiveSessionId(session.id)}
                      >
                        {getRotaxSessionLabel(session)}
                        <strong>{allStudents.filter((student) => student.trainingSessionId === session.id).length}</strong>
                      </button>
                      {canArchive && (
                        <button
                          className="secondary-button compact rotax-archive-session-button"
                          type="button"
                          onClick={() => onArchiveSession(session.id)}
                        >
                          Arquivar
                        </button>
                      )}
                    </div>
                  );
                })
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

function getCustomerProductGroups(customer) {
  const grouped = new Map();

  (customer.purchases || []).forEach((purchase) => {
    const key = `${purchase.productPartNumber || 'produto'}-${purchase.productDescription || ''}`;
    const current = grouped.get(key) || {
      key,
      productPartNumber: purchase.productPartNumber || '',
      productDescription: purchase.productDescription || '',
      totalQuantity: 0,
      totalValue: 0,
      purchases: [],
      latestPurchase: purchase,
    };

    current.totalQuantity += Number(purchase.quantity || 0);
    current.totalValue += Number(purchase.totalValue || 0);
    current.purchases.push(purchase);
    if (new Date(purchase.purchaseDate || 0) > new Date(current.latestPurchase.purchaseDate || 0)) {
      current.latestPurchase = purchase;
    }
    grouped.set(key, current);
  });

  return [...grouped.values()].sort(
    (a, b) => new Date(b.latestPurchase.purchaseDate || 0) - new Date(a.latestPurchase.purchaseDate || 0),
  );
}

const contractTabs = [
  { label: 'Contrato motor', value: 'motor' },
  { label: 'Contrato Treinamento', value: 'training' },
  { label: 'Devolução', value: 'return' },
];

function ContractsWorkspace({
  activeType,
  customers,
  forms,
  isGenerating,
  isSavingTemplate,
  onAddReturnItem,
  onGenerate,
  onRemoveReturnItem,
  onSelectType,
  onTemplateUpload,
  onUpdateField,
  onUpdateReturnItem,
  templates,
}) {
  const form = forms[activeType];
  const template = templates.find((item) => item.type === activeType);
  const isWordTemplate = activeType === 'motor' || activeType === 'training' || activeType === 'return';
  const templateAccept =
    activeType === 'motor' || activeType === 'training'
      ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : activeType === 'return'
        ? '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf,.pdf';

  return (
    <section className="contracts-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <FileText size={20} />
          <h2>Contratos</h2>
        </div>
        <div className="panel-actions">
          <label className="secondary-button compact file-button">
            <Upload size={16} />
            {isSavingTemplate ? 'Salvando...' : isWordTemplate ? 'Upload modelo Word' : 'Upload modelo PDF'}
            <input
              accept={templateAccept}
              hidden
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                onTemplateUpload(activeType, file);
              }}
            />
          </label>
          <button className="primary-button compact" type="button" disabled={isGenerating} onClick={() => onGenerate(activeType)}>
            <Save size={16} />
            {isGenerating ? 'Gerando...' : isWordTemplate ? 'Gerar Word' : 'Gerar PDF'}
          </button>
        </div>
      </div>

      <div className="tabs contract-tabs" role="tablist" aria-label="Tipos de contrato">
        {contractTabs.map((tab) => (
          <button
            className={activeType === tab.value ? 'tab active' : 'tab'}
            key={tab.value}
            type="button"
            onClick={() => onSelectType(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={template ? 'template-status ready' : 'template-status'}>
        {template ? `Modelo salvo: ${template.fileName}` : 'Nenhum modelo salvo para esta seção.'}
      </div>

      {activeType === 'motor' && (
        <div className="contract-form">
          <div className="form-pair wide">
            <label>
              Valor
              <input value={form.value} onChange={(event) => onUpdateField('motor', 'value', event.target.value)} placeholder="R$ 0,00" />
            </label>
            <label>
              Forma de pagamento
              <input value={form.paymentTerms} onChange={(event) => onUpdateField('motor', 'paymentTerms', event.target.value)} />
            </label>
          </div>

          <h3>Motor e equipamento</h3>
          <div className="form-pair wide">
            <label>
              Motor modelo
              <input value={form.motorModel} onChange={(event) => onUpdateField('motor', 'motorModel', event.target.value)} />
            </label>
            <label>
              Nº de série
              <input value={form.motorSerial} onChange={(event) => onUpdateField('motor', 'motorSerial', event.target.value)} />
            </label>
          </div>

          <h3>Dados Anv.</h3>
          <div className="form-grid-4">
            <label>
              Fabricante anv.
              <input value={form.aircraftManufacturer} onChange={(event) => onUpdateField('motor', 'aircraftManufacturer', event.target.value)} />
            </label>
            <label>
              Modelo
              <input value={form.aircraftModel} onChange={(event) => onUpdateField('motor', 'aircraftModel', event.target.value)} />
            </label>
            <label>
              Prefixo
              <input value={form.aircraftPrefix} onChange={(event) => onUpdateField('motor', 'aircraftPrefix', event.target.value)} />
            </label>
            <label>
              Nº de série anv.
              <input value={form.aircraftSerial} onChange={(event) => onUpdateField('motor', 'aircraftSerial', event.target.value)} />
            </label>
          </div>

          <ContractOwnerFields customers={customers} form={form} type="motor" onUpdateField={onUpdateField} />
        </div>
      )}

      {activeType === 'training' && (
        <div className="contract-form">
          <ContractOwnerFields compact customers={customers} form={form} type="training" onUpdateField={onUpdateField} />
          <h3>Treinamento</h3>
          <div className="form-pair wide">
            <label>
              Cursos
              <input value={form.courses} onChange={(event) => onUpdateField('training', 'courses', event.target.value)} />
            </label>
            <label>
              Duração
              <input value={form.duration} onChange={(event) => onUpdateField('training', 'duration', event.target.value)} />
            </label>
          </div>
          <div className="form-pair wide">
            <label>
              Valor total
              <input value={form.totalValue} onChange={(event) => onUpdateField('training', 'totalValue', event.target.value)} placeholder="R$ 0,00" />
            </label>
            <label>
              Forma de pagamento
              <input value={form.paymentTerms} onChange={(event) => onUpdateField('training', 'paymentTerms', event.target.value)} />
            </label>
          </div>
          <label>
            Data
            <input type="date" value={form.date} onChange={(event) => onUpdateField('training', 'date', event.target.value)} />
          </label>
        </div>
      )}

      {activeType === 'return' && (
        <div className="contract-form">
          <ContractOwnerFields customers={customers} form={form} type="return" onUpdateField={onUpdateField} />
          <div className="form-pair wide">
            <label>
              Nota fiscal
              <input value={form.invoiceNumber} onChange={(event) => onUpdateField('return', 'invoiceNumber', event.target.value)} />
            </label>
            <label>
              Data
              <input type="date" value={form.date} onChange={(event) => onUpdateField('return', 'date', event.target.value)} />
            </label>
          </div>

          <div className="contract-items-header">
            <h3>Itens a serem devolvidos</h3>
            <button className="secondary-button compact" type="button" onClick={onAddReturnItem}>
              <Plus size={16} />
              Adicionar linha
            </button>
          </div>

          <div className="contract-return-items">
            {form.items.map((item, index) => (
              <div className="contract-return-item" key={item.id || index}>
                <label>
                  PN
                  <input value={item.productCode} onChange={(event) => onUpdateReturnItem(index, 'productCode', event.target.value)} />
                </label>
                <label>
                  Descrição Produto
                  <input value={item.description} onChange={(event) => onUpdateReturnItem(index, 'description', event.target.value)} />
                </label>
                <label>
                  Quantidade
                  <input value={item.quantity} onChange={(event) => onUpdateReturnItem(index, 'quantity', event.target.value)} />
                </label>
                <label>
                  Valor unitário
                  <input value={item.unitValue} onChange={(event) => onUpdateReturnItem(index, 'unitValue', event.target.value)} />
                </label>
                <label>
                  Valor total
                  <input value={item.totalValue} onChange={(event) => onUpdateReturnItem(index, 'totalValue', event.target.value)} />
                </label>
                <button className="icon-button" type="button" title="Remover item" onClick={() => onRemoveReturnItem(index)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ContractOwnerFields({ compact = false, customers, form, onUpdateField, type }) {
  return (
    <>
      <h3>{compact ? 'Contratante' : 'Proprietário'}</h3>
      <div className="form-grid-3">
        <label>
          Nome
          <input
            list="customer-name-options"
            value={form.name}
            onChange={(event) => onUpdateField(type, 'name', event.target.value)}
            placeholder="Nome do cliente"
          />
        </label>
        <label>
          CPF/CNPJ
          <input value={form.document} onChange={(event) => onUpdateField(type, 'document', event.target.value)} />
        </label>
        {!compact && (
          <label>
            Telefone
            <input value={form.phone} onChange={(event) => onUpdateField(type, 'phone', event.target.value)} />
          </label>
        )}
      </div>
      <label>
        Endereço
        <input value={form.address} onChange={(event) => onUpdateField(type, 'address', event.target.value)} />
      </label>
      <div className="form-grid-4">
        {!compact && (
          <label>
            Cidade
            <input value={form.city} onChange={(event) => onUpdateField(type, 'city', event.target.value)} />
          </label>
        )}
        {!compact && (
          <label>
            Estado
            <input value={form.state} onChange={(event) => onUpdateField(type, 'state', event.target.value)} />
          </label>
        )}
        {!compact && (
          <label>
            CEP
            <input value={form.zipCode} onChange={(event) => onUpdateField(type, 'zipCode', event.target.value)} />
          </label>
        )}
        {type === 'motor' && (
          <label>
            Data
            <input type="date" value={form.date} onChange={(event) => onUpdateField(type, 'date', event.target.value)} />
          </label>
        )}
      </div>
      {type === 'motor' && (
        <label>
          E-mail
          <input value={form.email} onChange={(event) => onUpdateField(type, 'email', event.target.value)} />
        </label>
      )}
    </>
  );
}

function CustomersWorkspace({
  customers,
  expandedCustomerIds,
  expandedProductKeys,
  isUploading,
  onEditCustomer,
  onToggleCustomer,
  onToggleProduct,
  onUploadClick,
  searchTerm,
  setSearchTerm,
}) {
  const tableWrapRef = useRef(null);
  const tableRef = useRef(null);
  const topScrollRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  useEffect(() => {
    function updateScrollWidth() {
      const nextWidth = tableRef.current?.scrollWidth || tableWrapRef.current?.scrollWidth || 0;
      setTableScrollWidth(nextWidth);
    }

    updateScrollWidth();
    window.addEventListener('resize', updateScrollWidth);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateScrollWidth);
    }

    const resizeObserver = new ResizeObserver(updateScrollWidth);
    if (tableRef.current) resizeObserver.observe(tableRef.current);
    if (tableWrapRef.current) resizeObserver.observe(tableWrapRef.current);

    return () => {
      window.removeEventListener('resize', updateScrollWidth);
      resizeObserver.disconnect();
    };
  }, [customers.length]);

  function syncTableScrollFromTop(event) {
    if (tableWrapRef.current) tableWrapRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  function syncTopScrollFromTable(event) {
    if (topScrollRef.current) topScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  return (
    <section className="customers-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <Users size={20} />
          <h2>Clientes</h2>
        </div>
        <div className="panel-actions">
          <button className="secondary-button compact" type="button" disabled={isUploading} onClick={onUploadClick}>
            <Upload size={16} />
            {isUploading ? 'Importando...' : 'Upload planilha'}
          </button>
          <label className="search-box">
            <Search size={18} />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nome do cliente" />
          </label>
        </div>
      </div>
      <div className="table-top-scroll" ref={topScrollRef} onScroll={syncTableScrollFromTop} aria-label="Mover tabela lateralmente">
        <div style={{ width: `${tableScrollWidth}px` }} />
      </div>

      <div className="table-wrap customers-table-wrap" ref={tableWrapRef} onScroll={syncTopScrollFromTable}>
        <table className="quote-table customers-table" ref={tableRef}>
          <thead>
            <tr>
              <th>Cod.</th>
              <th>Cliente</th>
              <th>CNPJ/CPF</th>
              <th>Telefone</th>
              <th>UF</th>
              <th>E-mail</th>
              <th>Compras</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const expanded = expandedCustomerIds.includes(customer.id);
              const productGroups = getCustomerProductGroups(customer);

              return (
                <React.Fragment key={customer.id}>
                  <tr className="quote-row expandable" onClick={() => onToggleCustomer(customer.id)}>
                    <td className="strong-text">{customer.clientCode || '—'}</td>
                    <td>{customer.clientName}</td>
                    <td>{formatDocumentNumber(customer.document) || '—'}</td>
                    <td>{customer.phone || '—'}</td>
                    <td>{customer.state || '—'}</td>
                    <td>{customer.email || '—'}</td>
                    <td>{customer.purchases?.length || 0}</td>
                    <td>
                      <button
                        className="icon-button neutral"
                        type="button"
                        title="Editar cliente"
                        aria-label="Editar cliente"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditCustomer(customer);
                        }}
                      >
                        <Pencil size={17} />
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="closed-details-row">
                      <td colSpan="8">
                        <div className="customer-details">
                          <div className="customer-address-grid">
                            <span>
                              <b>Vendedor</b>
                              {customer.seller || '—'}
                            </span>
                            <span>
                              <b>End. Cadastro</b>
                              {customer.fiscalAddress || '—'}
                            </span>
                            <span>
                              <b>End. Entrega</b>
                              {customer.deliveryAddress || '—'}
                            </span>
                            <span>
                              <b>CEP</b>
                              {customer.zipCode || '—'}
                            </span>
                          </div>

                          <div className="customer-products">
                            <strong>Últimos produtos comprados</strong>
                            {productGroups.length === 0 ? (
                              <p>Nenhuma compra de produto cadastrada.</p>
                            ) : (
                              productGroups.map((product) => {
                                const productKey = `${customer.id}-${product.key}`;
                                const productExpanded = expandedProductKeys.includes(productKey);
                                const averageUnitValue = product.totalQuantity ? product.totalValue / product.totalQuantity : 0;

                                return (
                                  <div className="customer-product-card" key={productKey}>
                                    <button type="button" onClick={() => onToggleProduct(productKey)}>
                                      <span>
                                        <b>{product.productPartNumber}</b>
                                        {product.productDescription}
                                      </span>
                                      <span>{Number(product.totalQuantity || 0).toLocaleString('pt-BR')} un.</span>
                                      <span>{formatCurrencyValue(product.latestPurchase.totalValue)}</span>
                                      <span>{formatDate(`${product.latestPurchase.purchaseDate}T12:00:00`)}</span>
                                    </button>
                                    {productExpanded && (
                                      <div className="customer-product-history">
                                        <div className="customer-product-average">
                                          Média de preço de venda: <b>{formatCurrencyValue(averageUnitValue)}</b>
                                        </div>
                                        <table>
                                          <thead>
                                            <tr>
                                              <th>Data</th>
                                              <th>Qtd.</th>
                                              <th>Valor pago</th>
                                              <th>Unitário</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {product.purchases.map((purchase) => (
                                              <tr key={purchase.id}>
                                                <td>{purchase.purchaseDate ? formatDate(`${purchase.purchaseDate}T12:00:00`) : '—'}</td>
                                                <td>{Number(purchase.quantity || 0).toLocaleString('pt-BR')}</td>
                                                <td>{formatCurrencyValue(purchase.totalValue)}</td>
                                                <td>{formatCurrencyValue(purchase.unitValue)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {customers.length === 0 && (
        <div className="empty-state">
          <Users size={28} />
          <p>Nenhum cliente encontrado.</p>
        </div>
      )}
    </section>
  );
}

function formatBillingDisplayValue(label, value) {
  if (value === null || value === undefined || value === '') return '—';
  const textLabel = normalize(label);

  if (isBillingWholeNumberColumn(label)) {
    return formatBillingWholeNumber(value);
  }

  if (textLabel.includes('data')) {
    const dateValue = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? String(value) : formatDate(date);
  }

  if (textLabel.includes('valores')) {
    return formatCurrencyValue(Number(value || 0));
  }

  if (textLabel.includes('%')) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `${Math.round(numeric * 100)}%` : String(value);
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString('pt-BR') : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  return String(value);
}

function getBillingValueByLabel(rowData, labelFragments) {
  const normalizedFragments = labelFragments.map(normalizeBillingSearchText);
  const match = Object.entries(rowData || {}).find(([label]) => {
    const normalizedLabel = normalizeBillingSearchText(label);
    return normalizedFragments.every((fragment) => normalizedLabel.includes(fragment));
  });
  return match?.[1];
}

function isBillingWholeNumberColumn(label) {
  const normalizedLabel = normalizeBillingSearchText(label);
  return normalizedLabel.includes('pedido') || (normalizedLabel.includes('titulo') && normalizedLabel.includes('numero'));
}

function formatBillingWholeNumber(value) {
  if (typeof value === 'number') return String(Math.trunc(value));

  const text = String(value || '').trim();
  if (!text) return '-';

  const normalizedNumber = text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const numericValue = Number(normalizedNumber);
  if (Number.isFinite(numericValue)) return String(Math.trunc(numericValue));

  return text;
}

function getBillingSortKeyForColumn(label) {
  const normalizedLabel = normalizeBillingSearchText(label);
  if (normalizedLabel.includes('dias') && (normalizedLabel.includes('aberto') || normalizedLabel.includes('atraso'))) return 'openDays';
  if (normalizedLabel.includes('vencimento')) return 'dueDate';
  if (normalizedLabel.includes('nome') || normalizedLabel.includes('cliente')) return 'name';
  return '';
}

function getBillingSearchText(entry) {
  return [
    getBillingValueByLabel(entry.rowData, ['nome']),
    getBillingValueByLabel(entry.rowData, ['cliente']),
    getBillingValueByLabel(entry.rowData, ['pedido']),
    getBillingValueByLabel(entry.rowData, ['titulo', 'numero']),
    entry.notes,
  ]
    .filter(Boolean)
    .join(' ');
}

function parseBillingDateValue(value) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();

  const text = String(value).trim();
  const brDateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brDateMatch) {
    const [, day, month, year] = brDateMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`).getTime();
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getBillingSortValue(entry, sortKey) {
  if (sortKey === 'name') {
    return normalizeBillingSearchText(
      getBillingValueByLabel(entry.rowData, ['nome']) || getBillingValueByLabel(entry.rowData, ['cliente']) || '',
    );
  }

  if (sortKey === 'openDays') {
    return Number(getBillingValueByLabel(entry.rowData, ['dias', 'aberto']) || getBillingValueByLabel(entry.rowData, ['atraso', 'dias']) || 0);
  }

  if (sortKey === 'dueDate') {
    return parseBillingDateValue(getBillingValueByLabel(entry.rowData, ['vencimento']));
  }

  return '';
}

function getBillingCurrentValue(entry) {
  return parseUploadCurrency(getBillingValueByLabel(entry.rowData, ['valores', 'atual']));
}

function BillingWorkspace({
  activeSeller,
  entries,
  uploads,
  isUploading,
  isRestoring,
  noteDrafts,
  onChangeNote,
  onRemoveEntry,
  onRestoreUpload,
  onSaveNote,
  onSelectSeller,
  onUpload,
}) {
  const tableWrapRef = useRef(null);
  const tableRef = useRef(null);
  const topScrollRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [searchTermsBySeller, setSearchTermsBySeller] = useState(() => ({}));
  const [sortStateBySeller, setSortStateBySeller] = useState(() => ({}));
  const sellerEntries = useMemo(() => entries.filter((entry) => entry.seller === activeSeller), [activeSeller, entries]);
  const activeSearchTerm = searchTermsBySeller[activeSeller] || '';
  const activeSort = sortStateBySeller[activeSeller] || { key: '', direction: 'asc' };
  const activeUpload = uploads.find((upload) => upload.seller === activeSeller);
  const totalsBySeller = useMemo(
    () =>
      billingSellers.reduce((acc, seller) => {
        acc[seller] = entries
          .filter((entry) => entry.seller === seller)
          .reduce((sum, entry) => sum + getBillingCurrentValue(entry), 0);
        return acc;
      }, {}),
    [entries],
  );
  const columns = useMemo(() => {
    const labels = [];
    sellerEntries.forEach((entry) => {
      Object.keys(entry.rowData || {}).forEach((label) => {
        if (!isIgnoredBillingColumn(label) && !labels.includes(label)) labels.push(label);
      });
    });
    return labels;
  }, [sellerEntries]);
  const visibleSellerEntries = useMemo(() => {
    const normalizedSearch = normalizeBillingSearchText(activeSearchTerm);
    const filteredEntries = normalizedSearch
      ? sellerEntries.filter((entry) => normalizeBillingSearchText(getBillingSearchText(entry)).includes(normalizedSearch))
      : sellerEntries;

    if (!activeSort.key) return filteredEntries;

    return [...filteredEntries].sort((a, b) => {
      const valueA = getBillingSortValue(a, activeSort.key);
      const valueB = getBillingSortValue(b, activeSort.key);
      let result = 0;

      if (activeSort.key === 'name') {
        result = String(valueA).localeCompare(String(valueB), 'pt-BR');
      } else {
        result = Number(valueA || 0) - Number(valueB || 0);
      }

      if (result !== 0) return activeSort.direction === 'desc' ? result * -1 : result;
      return Number(a.orderIndex || 0) - Number(b.orderIndex || 0);
    });
  }, [activeSearchTerm, activeSort, sellerEntries]);

  useEffect(() => {
    function updateScrollWidth() {
      const nextWidth = tableRef.current?.scrollWidth || tableWrapRef.current?.scrollWidth || 0;
      setTableScrollWidth(nextWidth);
    }

    updateScrollWidth();
    window.addEventListener('resize', updateScrollWidth);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateScrollWidth);
    }

    const resizeObserver = new ResizeObserver(updateScrollWidth);
    if (tableRef.current) resizeObserver.observe(tableRef.current);
    if (tableWrapRef.current) resizeObserver.observe(tableWrapRef.current);

    return () => {
      window.removeEventListener('resize', updateScrollWidth);
      resizeObserver.disconnect();
    };
  }, [visibleSellerEntries.length, columns.length]);

  function updateSearchTerm(value) {
    setSearchTermsBySeller((current) => ({ ...current, [activeSeller]: value }));
  }

  function changeSort(sortKey) {
    setSortStateBySeller((current) => {
      const currentSort = current[activeSeller] || { key: '', direction: 'asc' };
      const nextDirection = sortKey === 'name' ? 'asc' : currentSort.key === sortKey && currentSort.direction === 'asc' ? 'desc' : 'asc';
      return { ...current, [activeSeller]: { key: sortKey, direction: nextDirection } };
    });
  }

  function renderHeader(column) {
    const sortKey = getBillingSortKeyForColumn(column);
    if (!sortKey) return column;

    const directionLabel = activeSort.key === sortKey ? (activeSort.direction === 'asc' ? '↑' : '↓') : '';
    return (
      <button className="sortable-header-button" type="button" onClick={() => changeSort(sortKey)}>
        {column}
        <span>{directionLabel}</span>
      </button>
    );
  }

  function syncTableScrollFromTop(event) {
    if (tableWrapRef.current) tableWrapRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  function syncTopScrollFromTable(event) {
    if (topScrollRef.current) topScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  return (
    <section className="billing-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <FileText size={20} />
          <h2>Cobrança</h2>
        </div>
        <div className="panel-actions">
          <label className="secondary-button compact file-button">
            <Upload size={16} />
            {isUploading ? 'Importando...' : `Upload ${activeSeller}`}
            <input
              accept=".xlsx"
              hidden
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                onUpload(file, activeSeller);
              }}
            />
          </label>
          <button
            className="danger-button compact"
            type="button"
            disabled={isUploading || isRestoring || !activeUpload?.canRestore}
            title={
              activeUpload?.canRestore
                ? 'Restaura a cobrança anterior deste vendedor'
                : 'Não há upload anterior disponível'
            }
            onClick={() => onRestoreUpload(activeSeller)}
          >
            <RefreshCw size={16} />
            {isRestoring ? 'Restaurando...' : 'Excluir último upload'}
          </button>
          {activeUpload && (
            <span className="billing-last-upload">
              Último upload: {formatActivityDate(activeUpload.uploadedAt)} por {activeUpload.userName || activeUpload.userEmail}
            </span>
          )}
        </div>
      </div>

      <div className="tabs billing-tabs" role="tablist" aria-label="Vendedores cobrança">
        {billingSellers.map((seller) => (
          <button
            className={activeSeller === seller ? 'tab active' : 'tab'}
            key={seller}
            type="button"
            onClick={() => onSelectSeller(seller)}
          >
            {seller}
            <span>{formatCurrencyValue(totalsBySeller[seller] || 0)}</span>
            <strong>{entries.filter((entry) => entry.seller === seller).length}</strong>
          </button>
        ))}
      </div>

      <div className="billing-table-tools">
        <label className="search-box billing-search-box">
          <Search size={18} />
          <input
            value={activeSearchTerm}
            onChange={(event) => updateSearchTerm(event.target.value)}
            placeholder="Buscar por nome, Nº pedido ou título número"
          />
        </label>
      </div>

      <div className="table-top-scroll" ref={topScrollRef} onScroll={syncTableScrollFromTop} aria-label="Mover tabela lateralmente">
        <div style={{ width: `${tableScrollWidth}px` }} />
      </div>

      <div className="table-wrap billing-table-wrap" ref={tableWrapRef} onScroll={syncTopScrollFromTable}>
        <table className="quote-table billing-table" ref={tableRef}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{renderHeader(column)}</th>
              ))}
              <th>Observação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visibleSellerEntries.map((entry) => (
              <tr className="quote-row" key={entry.id}>
                {columns.map((column) => (
                  <td key={column}>{formatBillingDisplayValue(column, entry.rowData?.[column])}</td>
                ))}
                <td>
                  <textarea
                    className="billing-note-input"
                    value={noteDrafts[entry.id] ?? entry.notes ?? ''}
                    onBlur={() => onSaveNote(entry)}
                    onChange={(event) => onChangeNote(entry.id, event.target.value)}
                    placeholder="Observação"
                    rows="2"
                  />
                </td>
                <td>
                  <button
                    className="icon-button"
                    type="button"
                    title="Excluir cobrança"
                    aria-label="Excluir cobrança"
                    onClick={() => onRemoveEntry(entry)}
                  >
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sellerEntries.length === 0 && (
        <div className="empty-state">
          <FileText size={28} />
          <p>Nenhuma cobrança importada para {activeSeller}.</p>
        </div>
      )}
      {sellerEntries.length > 0 && visibleSellerEntries.length === 0 && (
        <div className="empty-state">
          <Search size={28} />
          <p>Nenhuma cobrança encontrada para a busca atual.</p>
        </div>
      )}
    </section>
  );
}

function formatRotaxPartPrice(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function RotaxPartsWorkspace({ catalog, isUploading, onSearch, onUpload }) {
  const [partNumber, setPartNumber] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let active = true;
    const query = partNumber.trim();
    if (!query) {
      setResults([]);
      setIsSearching(false);
      setSearchError('');
      return () => {
        active = false;
      };
    }

    setIsSearching(true);
    const timer = window.setTimeout(() => {
      onSearch(query)
        .then((items) => {
          if (!active) return;
          const queryKey = normalizePartNumber(query);
          setResults(
            [...items].sort((a, b) => {
              const exactDifference = Number(b.pnKey === queryKey) - Number(a.pnKey === queryKey);
              return exactDifference || a.partNumber.localeCompare(b.partNumber, 'pt-BR');
            }),
          );
          setSearchError('');
        })
        .catch((error) => {
          if (!active) return;
          setResults([]);
          setSearchError(error.message || 'Não foi possível consultar o PN.');
        })
        .finally(() => {
          if (active) setIsSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [catalog?.batchId, onSearch, partNumber]);

  return (
    <section className="rotax-parts-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <PackageSearch size={22} />
          <div>
            <h1>Consulta PN Rotax</h1>
            <p>Consulte preços e informações do catálogo por número da peça.</p>
          </div>
        </div>
        <div className="rotax-parts-upload-area">
          {catalog && (
            <span className="catalog-meta">
              {catalog.itemCount.toLocaleString('pt-BR')} itens · Atualizado em {formatActivityDate(catalog.updatedAt)}
            </span>
          )}
          <label className="secondary-button compact file-button">
            <Upload size={16} />
            {isUploading ? 'Importando tabela...' : 'Upload tabela'}
            <input
              accept=".xlsx"
              disabled={isUploading}
              hidden
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                onUpload(file);
              }}
            />
          </label>
        </div>
      </div>

      <label className="rotax-pn-search">
        <span>PN:</span>
        <div>
          <Search size={22} />
          <input
            autoComplete="off"
            value={partNumber}
            onChange={(event) => setPartNumber(event.target.value)}
            placeholder="Digite o número da peça"
          />
          {partNumber && (
            <button type="button" title="Limpar busca" aria-label="Limpar busca" onClick={() => setPartNumber('')}>
              <X size={18} />
            </button>
          )}
        </div>
      </label>

      {searchError && <div className="app-alert">{searchError}</div>}

      {!partNumber.trim() ? (
        <div className="empty-state rotax-parts-empty">
          <PackageSearch size={32} />
          <p>Digite um PN para iniciar a consulta.</p>
        </div>
      ) : isSearching ? (
        <div className="empty-state rotax-parts-empty">
          <RefreshCw className="spin-icon" size={28} />
          <p>Consultando catálogo...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state rotax-parts-empty">
          <AlertTriangle size={30} />
          <p>Nenhum PN encontrado.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="quote-table rotax-parts-table">
            <thead>
              <tr>
                <th>PN</th>
                <th>Unidade</th>
                <th>Descrição</th>
                <th>Preço sugerido</th>
                <th>Preço Cruzeiro</th>
              </tr>
            </thead>
            <tbody>
              {results.map((part) => (
                <tr key={part.pnKey}>
                  <td><strong>{part.partNumber}</strong></td>
                  <td>{part.unit || '-'}</td>
                  <td>{part.description || '-'}</td>
                  <td>{formatRotaxPartPrice(part.suggestedPrice)}</td>
                  <td className="cruzeiro-price">{formatRotaxPartPrice(part.cruzeiroPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 30 && <p className="rotax-results-limit">Mostrando os 30 primeiros resultados. Digite mais números para refinar.</p>}
        </div>
      )}
    </section>
  );
}

const stockGroupTabs = [
  { value: 'register', label: 'Cadastrar item' },
  { value: 'all', label: 'Todos' },
  { value: '9001', label: '9001 - Homologado' },
  { value: '9002', label: '9002 - Rotax Exp.' },
  { value: '9016', label: '9016 - Lubrificantes' },
  { value: '9009', label: '9009 - Pneus' },
  { value: '9017', label: '9017 - Rotax cert.' },
  { value: 'transfer', label: 'Transferência' },
];

const missingStockAddressLabel = '- Sem Endereço -';

function getStockQuantityClass(quantity) {
  const numericQuantity = Number(quantity || 0);
  if (numericQuantity <= 1) return 'stock-quantity critical';
  if (numericQuantity === 2) return 'stock-quantity warning';
  return 'stock-quantity';
}

function StockTransfersWorkspace({
  catalog,
  candidates,
  isUploading,
  items,
  lists,
  onAddToTransfer,
  onCreateTransfer,
  onCreateTransferFromCandidates,
  onDeleteCandidate,
  onDeleteTransfer,
  onSaveCandidate,
  onUpdateQuantity,
  onUpload,
}) {
  const selectedStockItemsStorageKey = 'followuper.selectedStockTransferItems.v1';
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [quantitySort, setQuantitySort] = useState('asc');
  const [selectedKeys, setSelectedKeys] = useState(() => {
    try {
      const storedKeys = JSON.parse(localStorage.getItem(selectedStockItemsStorageKey) || '[]');
      return Array.isArray(storedKeys) ? storedKeys.filter((key) => typeof key === 'string') : [];
    } catch {
      return [];
    }
  });
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);
  const [transferDestination, setTransferDestination] = useState('');
  const [orderDialog, setOrderDialog] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [candidateModal, setCandidateModal] = useState(null);
  const [candidateForm, setCandidateForm] = useState({ product: '', quantity: '', groupCode: '9001' });
  const [candidateErrors, setCandidateErrors] = useState({});
  const [isSavingCandidate, setIsSavingCandidate] = useState(false);
  const tableWrapRef = useRef(null);
  const tableRef = useRef(null);
  const topScrollRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const activeListId = activeTab.startsWith('list:') ? activeTab.slice(5) : '';
  const activeList = lists.find((list) => list.id === activeListId);

  useEffect(() => {
    if (activeListId && !lists.some((list) => list.id === activeListId)) setActiveTab('transfer');
  }, [activeListId, lists]);

  useEffect(() => {
    try {
      localStorage.setItem(selectedStockItemsStorageKey, JSON.stringify(selectedKeys));
    } catch {
      // The selection remains available for the current session if storage is unavailable.
    }
  }, [selectedKeys]);

  useEffect(() => {
    if (items.length === 0) return;
    const availableKeys = new Set(items.map((item) => item.productKey));
    setSelectedKeys((current) => current.filter((key) => availableKeys.has(key)));
  }, [items]);

  useEffect(() => {
    function updateScrollWidth() {
      const nextWidth = tableRef.current?.scrollWidth || tableWrapRef.current?.scrollWidth || 0;
      setTableScrollWidth(nextWidth);
    }

    updateScrollWidth();
    window.addEventListener('resize', updateScrollWidth);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateScrollWidth);
    }

    const resizeObserver = new ResizeObserver(updateScrollWidth);
    if (tableRef.current) resizeObserver.observe(tableRef.current);
    if (tableWrapRef.current) resizeObserver.observe(tableWrapRef.current);

    return () => {
      window.removeEventListener('resize', updateScrollWidth);
      resizeObserver.disconnect();
    };
  }, [activeListId, activeTab, candidates.length, items.length, lists.length, quantitySort, searchTerm]);

  function syncTableScrollFromTop(event) {
    if (tableWrapRef.current) tableWrapRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  function syncTopScrollFromTable(event) {
    if (topScrollRef.current) topScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  const visibleItems = useMemo(() => {
    const normalizedSearch = normalizeStockProduct(searchTerm);
    const normalizedTextSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
    const filtered = items.filter((item) => {
      if (activeTab === 'transfer' && Number(item.quantity) !== 0) return false;
      if (activeTab !== 'all' && activeTab !== 'transfer' && item.groupCode !== activeTab) return false;
      return (
        !normalizedSearch ||
        item.productKey.includes(normalizedSearch) ||
        String(item.description || '').toLocaleLowerCase('pt-BR').includes(normalizedTextSearch) ||
        String(item.address || '').toLocaleLowerCase('pt-BR').includes(normalizedTextSearch)
      );
    });
    return [...filtered].sort((a, b) => {
      const difference = Number(a.quantity || 0) - Number(b.quantity || 0);
      if (difference !== 0) return quantitySort === 'asc' ? difference : difference * -1;
      return a.product.localeCompare(b.product, 'pt-BR');
    });
  }, [activeTab, items, quantitySort, searchTerm]);

  const visibleListItems = useMemo(() => {
    if (!activeList) return [];
    const normalizedSearch = normalizeStockProduct(searchTerm);
    const normalizedTextSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
    const stockItemsByKey = new Map(items.map((item) => [item.productKey, item]));
    return activeList.items
      .map((item) => {
        const stockItem = stockItemsByKey.get(item.productKey);
        return {
          ...item,
          description: item.description || stockItem?.description || '',
          address: stockItem?.address || '',
        };
      })
      .filter(
        (item) =>
          !normalizedSearch ||
          normalizeStockProduct(item.product).includes(normalizedSearch) ||
          item.description.toLocaleLowerCase('pt-BR').includes(normalizedTextSearch) ||
          item.address.toLocaleLowerCase('pt-BR').includes(normalizedTextSearch),
      )
      .sort((a, b) => {
        const difference = Number(a.availableQuantity || 0) - Number(b.availableQuantity || 0);
        if (difference !== 0) return quantitySort === 'asc' ? difference : difference * -1;
        return a.product.localeCompare(b.product, 'pt-BR');
      });
  }, [activeList, items, quantitySort, searchTerm]);

  const visibleCandidates = useMemo(() => {
    const normalizedSearch = normalizeStockProduct(searchTerm);
    const normalizedTextSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
    const stockItemsByKey = new Map(items.map((item) => [item.productKey, item]));
    return candidates
      .map((candidate) => ({
        ...candidate,
        address: stockItemsByKey.get(candidate.productKey)?.address || '',
      }))
      .filter(
        (candidate) =>
          !normalizedSearch ||
          candidate.productKey.includes(normalizedSearch) ||
          candidate.address.toLocaleLowerCase('pt-BR').includes(normalizedTextSearch),
      )
      .sort((a, b) => {
        const difference = Number(a.quantity || 0) - Number(b.quantity || 0);
        if (difference !== 0) return quantitySort === 'asc' ? difference : difference * -1;
        return a.product.localeCompare(b.product, 'pt-BR');
      });
  }, [candidates, items, quantitySort, searchTerm]);

  async function saveSelectedItemsToTransfer(event) {
    event.preventDefault();
    const selectedItems = items.filter((item) => selectedKeys.includes(item.productKey));
    if (selectedItems.length === 0 || !transferDestination || isCreatingTransfer) return;
    setIsCreatingTransfer(true);
    try {
      const savedList =
        transferDestination === 'new'
          ? await onCreateTransfer(selectedItems)
          : await onAddToTransfer(transferDestination, selectedItems);
      if (!savedList) return;
      setSelectedKeys([]);
      setTransferDestination('');
      setActiveTab(`list:${savedList.id}`);
    } finally {
      setIsCreatingTransfer(false);
    }
  }

  async function createCandidateTransfer() {
    if (candidates.length === 0 || isCreatingTransfer) return;
    setIsCreatingTransfer(true);
    try {
      const savedList = await onCreateTransferFromCandidates();
      if (savedList) setActiveTab(`list:${savedList.id}`);
    } finally {
      setIsCreatingTransfer(false);
    }
  }

  function openCandidateModal(candidate = null) {
    setCandidateForm(
      candidate
        ? { product: candidate.product, quantity: candidate.quantity, groupCode: candidate.groupCode || '9001' }
        : { product: '', quantity: '', groupCode: '9001' },
    );
    setCandidateErrors({});
    setCandidateModal({ editing: Boolean(candidate) });
  }

  async function submitCandidate(event) {
    event.preventDefault();
    const errors = {};
    if (!candidateForm.product.trim()) errors.product = 'Informe o PN.';
    if (Number(candidateForm.quantity || 0) <= 0) errors.quantity = 'Informe uma quantidade maior que zero.';
    if (!candidateForm.groupCode) errors.groupCode = 'Selecione o grupo.';
    setCandidateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSavingCandidate(true);
    try {
      const saved = await onSaveCandidate(candidateForm);
      if (saved) setCandidateModal(null);
    } finally {
      setIsSavingCandidate(false);
    }
  }

  function toggleSelection(productKey) {
    setSelectedKeys((current) =>
      current.includes(productKey) ? current.filter((key) => key !== productKey) : [...current, productKey],
    );
  }

  function generateOrder(list) {
    const lines = list.items
      .filter((item) => Number(item.quantity || 0) > 0)
      .map((item) => `${Number(item.quantity)}\t${item.product}`);
    setCopyFeedback('');
    setOrderDialog({ name: list.name, content: lines.join('\n'), itemCount: lines.length });
  }

  async function copyOrder() {
    if (!orderDialog?.content) return;
    try {
      await navigator.clipboard.writeText(orderDialog.content);
      setCopyFeedback('Copiado');
    } catch {
      setCopyFeedback('Selecione e copie o texto');
    }
  }

  return (
    <section className="stock-transfer-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <RefreshCw size={22} />
          <div>
            <h1>Transferência/Estoque</h1>
            <p>Estoque de Campinas e preparação de pedidos de transferência.</p>
          </div>
        </div>
        <div className="stock-upload-area">
          {catalog && (
            <span className="catalog-meta">
              {catalog.itemCount.toLocaleString('pt-BR')} PNs · Atualizado em {formatActivityDate(catalog.updatedAt)}
            </span>
          )}
          <label className="secondary-button compact file-button">
            <Upload size={16} />
            {isUploading ? 'Importando...' : 'Upload planilha'}
            <input
              accept=".xlsx"
              disabled={isUploading}
              hidden
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                onUpload(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className="stock-tabs" role="tablist" aria-label="Grupos de estoque">
        {stockGroupTabs.map((tab) => {
          const count =
            tab.value === 'register'
              ? candidates.length
              : tab.value === 'all'
              ? items.length
              : tab.value === 'transfer'
                ? items.filter((item) => Number(item.quantity) === 0).length
                : items.filter((item) => item.groupCode === tab.value).length;
          return (
            <button
              className={activeTab === tab.value ? 'stock-tab active' : 'stock-tab'}
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
              <strong>{count}</strong>
            </button>
          );
        })}
        {lists.map((list) => (
          <button
            className={activeTab === `list:${list.id}` ? 'stock-tab saved active' : 'stock-tab saved'}
            key={list.id}
            type="button"
            onClick={() => setActiveTab(`list:${list.id}`)}
          >
            {list.name}
            <strong>{list.items.length}</strong>
          </button>
        ))}
      </div>

      <div className="stock-toolbar">
        <label className="search-box stock-search-box">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar PN, descrição ou endereço"
          />
        </label>

        {activeTab === 'register' && (
          <div className="stock-selection-actions">
            <button className="secondary-button compact" type="button" onClick={() => openCandidateModal()}>
              <Plus size={16} />
              Incluir
            </button>
            <button
              className="primary-button compact"
              disabled={candidates.length === 0 || isCreatingTransfer}
              type="button"
              onClick={createCandidateTransfer}
            >
              <RefreshCw size={16} />
              {isCreatingTransfer ? 'Criando...' : 'Incluir em nova transferência'}
            </button>
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className="stock-selection-actions">
            <button
              className="secondary-button compact"
              type="button"
              onClick={() => setSelectedKeys((current) => [...new Set([...current, ...visibleItems.map((item) => item.productKey)])])}
            >
              Selecionar tudo
            </button>
            <button className="secondary-button compact" type="button" onClick={() => setSelectedKeys([])}>
              Desselecionar tudo
            </button>
            <button
              className="primary-button compact"
              disabled={selectedKeys.length === 0 || isCreatingTransfer}
              type="button"
              onClick={() => setTransferDestination('new')}
            >
              <Plus size={16} />
              {isCreatingTransfer ? 'Criando...' : 'Nova transferência'}
            </button>
          </div>
        )}

        {activeList && (
          <div className="stock-selection-actions">
            <button className="primary-button compact" type="button" onClick={() => generateOrder(activeList)}>
              <FileText size={16} />
              Gerar pedido
            </button>
            <button
              className="danger-button compact"
              type="button"
              onClick={() => {
                if (window.confirm(`Excluir ${activeList.name}?`)) onDeleteTransfer(activeList.id);
              }}
            >
              <Trash2 size={16} />
              Excluir transferência
            </button>
          </div>
        )}
      </div>

      <div className="table-top-scroll" ref={topScrollRef} onScroll={syncTableScrollFromTop} aria-label="Mover tabela lateralmente">
        <div style={{ width: `${tableScrollWidth || 1120}px` }} />
      </div>

      {activeTab === 'register' ? (
        <div className="table-wrap" ref={tableWrapRef} onScroll={syncTopScrollFromTable}>
          <table className="quote-table stock-table stock-candidate-table" ref={tableRef}>
            <thead>
              <tr>
                <th>PN</th>
                <th>Endereço</th>
                <th>Grupo</th>
                <th>
                  <button
                    className="sortable-header-button"
                    type="button"
                    onClick={() => setQuantitySort((current) => (current === 'asc' ? 'desc' : 'asc'))}
                  >
                    Quantidade
                    <span>{quantitySort === 'asc' ? '↑' : '↓'}</span>
                  </button>
                </th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleCandidates.map((candidate) => (
                <tr key={candidate.productKey}>
                  <td><strong>{candidate.product}</strong></td>
                  <td className="stock-address-cell">{candidate.address || missingStockAddressLabel}</td>
                  <td>{candidate.groupCode}</td>
                  <td>{candidate.quantity}</td>
                  <td className="candidate-actions">
                    <button
                      className="icon-button"
                      type="button"
                      title="Editar item"
                      aria-label={`Editar ${candidate.product}`}
                      onClick={() => openCandidateModal(candidate)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button danger"
                      type="button"
                      title="Excluir item"
                      aria-label={`Excluir ${candidate.product}`}
                      onClick={() => onDeleteCandidate(candidate.productKey)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="table-wrap" ref={tableWrapRef} onScroll={syncTopScrollFromTable}>
        <table className="quote-table stock-table" ref={tableRef}>
          <thead>
            <tr>
               {activeTab === 'transfer' && <th className="stock-checkbox-column">Selecionar</th>}
                <th>Produto</th>
                <th>Descrição</th>
                <th>Endereço</th>
                {!activeList && <th>Grupo</th>}
              <th>
                <button
                  className="sortable-header-button"
                  type="button"
                  onClick={() => setQuantitySort((current) => (current === 'asc' ? 'desc' : 'asc'))}
                >
                  Saldo Atual
                  <span>{quantitySort === 'asc' ? '↑' : '↓'}</span>
                </button>
              </th>
              {activeList && <th>Unidades para transferir</th>}
            </tr>
          </thead>
          <tbody>
            {activeList
              ? visibleListItems.map((item) => (
                   <tr key={item.productKey}>
                     <td><strong>{item.product}</strong></td>
                     <td className="stock-description-cell">{item.description || '-'}</td>
                     <td className="stock-address-cell">{item.address || missingStockAddressLabel}</td>
                     <td><span className={getStockQuantityClass(item.availableQuantity)}>{item.availableQuantity}</span></td>
                    <td>
                      <input
                        className="stock-transfer-quantity-input"
                        inputMode="numeric"
                        min="0"
                        type="number"
                        value={item.quantity || ''}
                        onChange={(event) => onUpdateQuantity(activeList.id, item.productKey, event.target.value)}
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))
              : visibleItems.map((item) => (
                  <tr key={item.productKey}>
                    {activeTab === 'transfer' && (
                      <td className="stock-checkbox-column">
                        <input
                          checked={selectedKeys.includes(item.productKey)}
                          type="checkbox"
                          onChange={() => toggleSelection(item.productKey)}
                          aria-label={`Selecionar ${item.product}`}
                        />
                      </td>
                     )}
                     <td><strong>{item.product}</strong></td>
                     <td className="stock-description-cell">{item.description || '-'}</td>
                     <td className="stock-address-cell">{item.address || missingStockAddressLabel}</td>
                     <td>{item.groupCode || '-'}</td>
                    <td><span className={getStockQuantityClass(item.quantity)}>{item.quantity}</span></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      )}

      {(activeTab === 'register' ? visibleCandidates : activeList ? visibleListItems : visibleItems).length === 0 && (
        <div className="empty-state">
          <PackageSearch size={28} />
          <p>Nenhum PN encontrado nesta aba.</p>
        </div>
      )}

      {candidateModal && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-panel stock-candidate-modal" role="dialog" aria-modal="true" onSubmit={submitCandidate}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Transferência</span>
                <h2>Cadastrar item</h2>
              </div>
              <button className="modal-close" type="button" aria-label="Fechar" onClick={() => setCandidateModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="form-pair">
              <label>
                PN:
                <input
                  autoFocus
                  disabled={candidateModal.editing}
                  value={candidateForm.product}
                  onChange={(event) => setCandidateForm((current) => ({ ...current, product: event.target.value }))}
                />
                {candidateErrors.product && <small>{candidateErrors.product}</small>}
              </label>
              <label>
                Quantidade:
                <input
                  inputMode="numeric"
                  min="1"
                  type="number"
                  value={candidateForm.quantity}
                  onChange={(event) => setCandidateForm((current) => ({ ...current, quantity: event.target.value }))}
                />
                {candidateErrors.quantity && <small>{candidateErrors.quantity}</small>}
              </label>
            </div>
            <label>
              Grupo:
              <select
                value={candidateForm.groupCode}
                onChange={(event) => setCandidateForm((current) => ({ ...current, groupCode: event.target.value }))}
              >
                {stockGroupTabs
                  .filter((tab) => /^\d+$/.test(tab.value))
                  .map((tab) => <option key={tab.value} value={tab.value}>{tab.label}</option>)}
              </select>
              {candidateErrors.groupCode && <small>{candidateErrors.groupCode}</small>}
            </label>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setCandidateModal(null)}>Cancelar</button>
              <button className="primary-button" disabled={isSavingCandidate} type="submit">
                <Save size={16} />
                {isSavingCandidate ? 'Salvando...' : 'Salvar item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {transferDestination && (
        <div className="modal-backdrop" role="presentation">
          <form
            className="modal-panel stock-transfer-destination-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Escolher destino da transferência"
            onSubmit={saveSelectedItemsToTransfer}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">Transferência/Estoque</span>
                <h2>Destino dos itens</h2>
                <p>{selectedKeys.length} item(ns) selecionado(s).</p>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label="Fechar"
                onClick={() => setTransferDestination('')}
              >
                <X size={18} />
              </button>
            </div>

            <label>
              Incluir em:
              <select
                autoFocus
                value={transferDestination}
                onChange={(event) => setTransferDestination(event.target.value)}
              >
                <option value="new">Gerar nova transferência</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.items.length} item(ns))
                  </option>
                ))}
              </select>
            </label>

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setTransferDestination('')}>
                Cancelar
              </button>
              <button className="primary-button" disabled={isCreatingTransfer} type="submit">
                <Save size={16} />
                {isCreatingTransfer ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {orderDialog && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel stock-order-dialog" role="dialog" aria-modal="true" aria-label="Pedido de transferência">
            <div className="modal-header">
              <div>
                <span className="eyebrow">{orderDialog.name}</span>
                <h2>Pedido de transferência</h2>
                <p>{orderDialog.itemCount} item(ns) com quantidade preenchida.</p>
              </div>
              <button className="modal-close" type="button" aria-label="Fechar" onClick={() => setOrderDialog(null)}>
                <X size={18} />
              </button>
            </div>
            {orderDialog.content ? (
              <textarea className="stock-order-output" readOnly value={orderDialog.content} rows="12" />
            ) : (
              <div className="empty-state">Preencha ao menos uma quantidade maior que zero.</div>
            )}
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setOrderDialog(null)}>Fechar</button>
              <button className="primary-button" disabled={!orderDialog.content} type="button" onClick={copyOrder}>
                <Save size={16} />
                {copyFeedback || 'Copiar TSV'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

const activityEntityLabels = {
  billing_entries: 'Cobranças',
  billing_uploads: 'Uploads de cobrança',
  contract_templates: 'Contratos',
  customers: 'Clientes',
  dashboard_settings: 'Configuração do dashboard',
  info_blocks: 'Painel de informações',
  quotes: 'Cotações',
  return_entries: 'Devoluções',
  rotax_revenue_entries: 'Faturamento Rotax',
  rotax_parts_catalog: 'Catálogo PN Rotax',
  stock_catalog: 'Estoque para transferência',
  stock_transfer_candidates: 'Itens para transferência',
  stock_transfer_lists: 'Listas de transferência',
  rotax_training_blocks: 'Informações do treinamento',
  rotax_training_contacts: 'Contatos do treinamento',
  rotax_training_sessions: 'Treinamentos',
  rotax_training_students: 'Alunos',
  tracking_entries: 'Rastreios',
  upload_audits: 'Uploads',
  warranty_entries: 'Garantias',
};

const activityFieldLabels = {
  archived_at: 'arquivamento',
  carrier: 'transportadora',
  client_name: 'cliente',
  close_details: 'dados do pedido',
  current_view: 'tela atual',
  delivery_situation: 'situação da entrega',
  email: 'e-mail',
  expected_delivery_date: 'previsão de entrega',
  follow_up_started_at: 'follow-up',
  invoice_number: 'nota fiscal',
  notes: 'observações',
  payment_terms: 'pagamento',
  phone: 'telefone',
  quote_value: 'valor',
  seller: 'vendedor',
  status: 'status',
  tracking_code: 'código de rastreio',
};

const userViewLabels = {
  billing: 'Cobranças',
  contracts: 'Contratos',
  customers: 'Clientes',
  info: 'Painel de informações',
  quotes: 'Cotações',
  returns: 'Devoluções',
  rotax: 'Treinamento Rotax',
  rotaxParts: 'Consulta PN Rotax',
  rotaxRevenue: 'Faturamento Rotax',
  stockTransfers: 'Transferência/Estoque',
  tracking: 'Rastreios',
  uploads: 'Upload',
  users: 'Usuários',
  warranties: 'Garantias',
};

function formatActivityDate(value) {
  if (!value) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getActivityDescription(log) {
  const actionLabels = {
    DELETE: 'Excluiu',
    INSERT: 'Incluiu',
    UPDATE: 'Editou',
  };
  const entityLabel = activityEntityLabels[log.entityType] || log.entityType;
  const identifier = log.identifier ? ` ${log.identifier}` : '';
  return `${actionLabels[log.action] || log.action} em ${entityLabel}${identifier}`;
}

function UsersWorkspace({ activityLogs, now, onlineUsers, profiles }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');

  const onlineByUserId = useMemo(() => {
    const usersById = new Map();
    onlineUsers.forEach((presence) => {
      const current = usersById.get(presence.userId);
      if (!current || new Date(presence.onlineAt) > new Date(current.onlineAt)) {
        usersById.set(presence.userId, presence);
      }
    });

    const currentTime = now instanceof Date ? now.getTime() : Date.now();
    profiles.forEach((profile) => {
      const lastSeenTime = new Date(profile.lastSeenAt).getTime();
      if (!Number.isFinite(lastSeenTime) || currentTime - lastSeenTime > 3 * 60 * 1000) return;
      if (!usersById.has(profile.id)) {
        usersById.set(profile.id, {
          userId: profile.id,
          email: profile.email,
          displayName: profile.displayName,
          currentView: profile.currentView,
          onlineAt: profile.lastSeenAt,
        });
      }
    });

    return usersById;
  }, [now, onlineUsers, profiles]);

  const displayedProfiles = useMemo(() => {
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    onlineByUserId.forEach((presence, userId) => {
      if (!profilesById.has(userId)) {
        profilesById.set(userId, {
          id: userId,
          email: presence.email,
          displayName: presence.displayName,
          currentView: presence.currentView,
          lastSeenAt: presence.onlineAt,
        });
      }
    });
    return [...profilesById.values()].sort((a, b) => {
      const onlineDifference = Number(onlineByUserId.has(b.id)) - Number(onlineByUserId.has(a.id));
      return onlineDifference || new Date(b.lastSeenAt) - new Date(a.lastSeenAt);
    });
  }, [onlineByUserId, profiles]);

  const areas = useMemo(
    () => [...new Set(activityLogs.map((log) => log.entityType))].sort(),
    [activityLogs],
  );

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return activityLogs.filter((log) => {
      if (selectedUser !== 'all' && log.userId !== selectedUser) return false;
      if (selectedArea !== 'all' && log.entityType !== selectedArea) return false;
      if (!normalizedSearch) return true;
      return `${log.userEmail} ${log.identifier} ${getActivityDescription(log)}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [activityLogs, searchTerm, selectedArea, selectedUser]);

  return (
    <section className="users-panel">
      <div className="section-heading users-heading">
        <div>
          <span className="eyebrow">Acesso master</span>
          <h1>
            <Users size={24} />
            Usuários
          </h1>
          <p>Presença em tempo real e histórico das alterações realizadas no FollowUper.</p>
        </div>
        <span className="users-online-summary">
          <i />
          {onlineByUserId.size} online
        </span>
      </div>

      <div className="user-presence-grid">
        {displayedProfiles.map((profile) => {
          const presence = onlineByUserId.get(profile.id);
          const latestLog = activityLogs.find((log) => log.userId === profile.id);
          return (
            <article className={presence ? 'user-presence-card online' : 'user-presence-card'} key={profile.id}>
              <div className="user-avatar">{(profile.displayName || profile.email || 'U').slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{profile.displayName || profile.email}</strong>
                <span>{profile.email}</span>
                <small>
                  {presence
                    ? `Em ${userViewLabels[presence.currentView] || presence.currentView || 'FollowUper'}`
                    : `Último acesso: ${formatActivityDate(profile.lastSeenAt)}`}
                </small>
                {latestLog && <small>Última ação: {formatActivityDate(latestLog.createdAt)}</small>}
              </div>
              <span className={presence ? 'presence-status online' : 'presence-status'}>
                {presence ? 'Online' : 'Offline'}
              </span>
            </article>
          );
        })}
        {displayedProfiles.length === 0 && <div className="empty-state">Nenhum usuário registrado ainda.</div>}
      </div>

      <div className="activity-section-heading">
        <div>
          <Activity size={21} />
          <h2>Últimas atualizações</h2>
        </div>
        <span>{filteredLogs.length} registro(s)</span>
      </div>

      <div className="activity-filters">
        <label className="search-field">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar usuário, registro ou alteração"
          />
        </label>
        <select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}>
          <option value="all">Todos os usuários</option>
          {displayedProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.displayName || profile.email}
            </option>
          ))}
        </select>
        <select value={selectedArea} onChange={(event) => setSelectedArea(event.target.value)}>
          <option value="all">Todas as áreas</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {activityEntityLabels[area] || area}
            </option>
          ))}
        </select>
      </div>

      <div className="activity-list">
        {filteredLogs.map((log) => (
          <article className="activity-row" key={log.id}>
            <span className={`activity-action ${log.action.toLowerCase()}`}>
              {log.action === 'INSERT' ? 'Inclusão' : log.action === 'DELETE' ? 'Exclusão' : 'Edição'}
            </span>
            <div>
              <strong>{getActivityDescription(log)}</strong>
              <span>{log.userEmail}</span>
              {log.changedFields.length > 0 && (
                <small>
                  Campos: {log.changedFields.map((field) => activityFieldLabels[field] || field).join(', ')}
                </small>
              )}
            </div>
            <time dateTime={log.createdAt}>{formatActivityDate(log.createdAt)}</time>
          </article>
        ))}
        {filteredLogs.length === 0 && <div className="empty-state">Nenhuma alteração encontrada.</div>}
      </div>
    </section>
  );
}

function ReturnsWorkspace({ activeTab, entries, onAdd, onEdit, onRemove, setActiveTab, totalCounts }) {
  return (
    <section className="returns-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <RefreshCw size={20} />
          <h2>Devoluções</h2>
        </div>
      </div>

      <div className="tabs returns-tabs" role="tablist" aria-label="Status das devoluções">
        {returnTabs.map((tab) => (
          <button
            className={activeTab === tab.value ? 'tab active' : 'tab'}
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
            <strong>{totalCounts[tab.value]}</strong>
          </button>
        ))}
      </div>

      <div className="returns-actions">
        <button className="primary-button compact" type="button" onClick={onAdd}>
          <Plus size={16} />
          Incluir
        </button>
      </div>

      <div className="table-wrap">
        <table className="quote-table returns-table">
          <thead>
            <tr>
              <th>Nota Fiscal</th>
              <th>Tipo</th>
              <th>Itens</th>
              <th>Status</th>
              <th>Atualizado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="quote-row" key={entry.id}>
                <td className="strong-text">{entry.invoiceNumber}</td>
                <td>
                  <span className={entry.returnType === 'Total' ? 'situation green' : 'situation orange'}>{entry.returnType}</span>
                </td>
                <td>
                  {entry.returnType === 'Parcial' && entry.items?.length ? (
                    <div className="return-items-list">
                      {entry.items.map((item, index) => (
                        <span key={`${entry.id}-${item.partNumber}-${index}`}>
                          {item.partNumber} · {item.quantity}
                        </span>
                      ))}
                    </div>
                  ) : (
                    'Devolução total'
                  )}
                </td>
                <td>{entry.status}</td>
                <td>{entry.updatedAt ? formatDateTime(entry.updatedAt) : '-'}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-button neutral" type="button" title="Editar devolução" aria-label="Editar devolução" onClick={() => onEdit(entry)}>
                      <Pencil size={17} />
                    </button>
                    <button className="icon-button" type="button" title="Excluir devolução" aria-label="Excluir devolução" onClick={() => onRemove(entry)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div className="empty-state">
          <RefreshCw size={28} />
          <p>Nenhuma devolução nesta aba.</p>
        </div>
      )}
    </section>
  );
}

function ReturnEntryModal({ errors = {}, form, isEditing, onAddItem, onCancel, onRemoveItem, onSubmit, onUpdate, onUpdateItem }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="close-modal return-modal" onSubmit={onSubmit} noValidate>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Devoluções</p>
            <h2>{isEditing ? 'Editar devolução' : 'Nova devolução'}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="form-pair wide">
          <label>
            Nota Fiscal
            <input value={form.invoiceNumber} onChange={(event) => onUpdate('invoiceNumber', event.target.value)} placeholder="Ex: 123456" />
            {errors.invoiceNumber && <small>{errors.invoiceNumber}</small>}
          </label>
          <label>
            Tipo de devolução
            <select value={form.returnType} onChange={(event) => onUpdate('returnType', event.target.value)}>
              {returnTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>

        {form.returnType === 'Parcial' && (
          <div className="return-items-editor">
            <h3>Itens da devolução parcial</h3>
            {(form.items || []).map((item, index) => (
              <div className="return-item-row" key={`return-item-${index}`}>
                <label>
                  PN
                  <input value={item.partNumber} onChange={(event) => onUpdateItem(index, 'partNumber', event.target.value)} placeholder="PN" />
                </label>
                <label>
                  Quantidade
                  <input value={item.quantity} onChange={(event) => onUpdateItem(index, 'quantity', event.target.value)} placeholder="Qtd." />
                </label>
                <button className="icon-button" type="button" title="Remover item" aria-label="Remover item" onClick={() => onRemoveItem(index)}>
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            {errors.items && <small>{errors.items}</small>}
            <button className="secondary-button compact" type="button" onClick={onAddItem}>
              <Plus size={16} />
              Adicionar item
            </button>
          </div>
        )}

        <label>
          Status
          <select value={form.status} onChange={(event) => onUpdate('status', event.target.value)}>
            {returnStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
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

function WarrantiesWorkspace({ activeTab, entries, onAdd, onEdit, onRemove, setActiveTab, totalCounts }) {
  return (
    <section className="warranties-panel">
      <div className="panel-toolbar">
        <div className="section-title">
          <ShieldCheck size={20} />
          <h2>Garantias</h2>
        </div>
        <div className="panel-actions">
          <button className="primary-button compact" type="button" onClick={onAdd}>
            <Plus size={16} />
            Incluir
          </button>
        </div>
      </div>

      <div className="tabs warranties-tabs" role="tablist" aria-label="Status das garantias">
        {warrantyTabs.map((tab) => (
          <button
            className={activeTab === tab.value ? 'tab active' : 'tab'}
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
            <strong>{totalCounts[tab.value]}</strong>
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="quote-table warranties-table">
          <thead>
            <tr>
              <th>Nº garantia</th>
              <th>Nº série motor</th>
              <th>Status</th>
              <th>Observações</th>
              <th>Arquivo</th>
              <th>Atualizado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="quote-row" key={entry.id}>
                <td className="strong-text">{entry.warrantyNumber}</td>
                <td>{entry.motorSerialNumber || '-'}</td>
                <td>
                  <div className="warranty-status-list">
                    {entry.statuses.map((status) => (
                      <span className={`situation ${warrantyStatusColorClass[status] || 'blue'}`} key={`${entry.id}-${status}`}>
                        {status}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{entry.notes || '-'}</td>
                <td>
                  {entry.attachmentFileData ? (
                    <a
                      className="mini-link-button"
                      download={entry.attachmentFileName || `garantia-${entry.warrantyNumber}.pdf`}
                      href={entry.attachmentFileData}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <FileText size={15} />
                      PDF
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{entry.updatedAt ? formatDateTime(entry.updatedAt) : '-'}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-button neutral" type="button" title="Editar garantia" aria-label="Editar garantia" onClick={() => onEdit(entry)}>
                      <Pencil size={17} />
                    </button>
                    <button className="icon-button" type="button" title="Excluir garantia" aria-label="Excluir garantia" onClick={() => onRemove(entry)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <div className="empty-state">
          <ShieldCheck size={28} />
          <p>Nenhuma garantia nesta aba.</p>
        </div>
      )}
    </section>
  );
}

function WarrantyEntryModal({ errors = {}, form, isEditing, onCancel, onSubmit, onToggleStatus, onUpdate, onUploadAttachment }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="close-modal warranty-modal" onSubmit={onSubmit} noValidate>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Garantias</p>
            <h2>{isEditing ? 'Editar garantia' : 'Nova garantia'}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <label>
          Nº garantia
          <input value={form.warrantyNumber} onChange={(event) => onUpdate('warrantyNumber', event.target.value)} placeholder="Ex: GAR-1024" />
          {errors.warrantyNumber && <small>{errors.warrantyNumber}</small>}
        </label>

        <label>
          Nº série motor
          <input value={form.motorSerialNumber} onChange={(event) => onUpdate('motorSerialNumber', event.target.value)} placeholder="Ex: 914-123456" />
        </label>

        <fieldset className="warranty-status-fieldset">
          <legend>Status</legend>
          <div className="warranty-status-options">
            {warrantyStatuses.map((status) => (
              <label className="checkbox-label warranty-status-option" key={status}>
                <input type="checkbox" checked={form.statuses.includes(status)} onChange={() => onToggleStatus(status)} />
                <span className={`situation ${warrantyStatusColorClass[status] || 'blue'}`}>{status}</span>
              </label>
            ))}
          </div>
          {errors.statuses && <small>{errors.statuses}</small>}
        </fieldset>

        <label>
          Observações
          <textarea
            value={form.notes}
            onChange={(event) => onUpdate('notes', event.target.value)}
            placeholder="Observações da garantia"
            rows="5"
          />
        </label>

        <div className="warranty-upload-field">
          <span>Arquivo PDF</span>
          <div className="warranty-upload-actions">
            <label className="secondary-button compact file-button">
              <Upload size={16} />
              Upload PDF
              <input
                accept="application/pdf,.pdf"
                className="visually-hidden"
                type="file"
                onChange={(event) => {
                  onUploadAttachment(event.target.files?.[0] || null);
                  event.target.value = '';
                }}
              />
            </label>
            {form.attachmentFileData && (
              <>
                <a
                  className="mini-link-button"
                  download={form.attachmentFileName || `garantia-${form.warrantyNumber || 'arquivo'}.pdf`}
                  href={form.attachmentFileData}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FileText size={15} />
                  Ver PDF
                </a>
                <button
                  className="secondary-button compact"
                  type="button"
                  onClick={() => {
                    onUpdate('attachmentFileName', '');
                    onUpdate('attachmentFileData', '');
                    onUpdate('attachmentMimeType', '');
                  }}
                >
                  Remover
                </button>
              </>
            )}
          </div>
          {form.attachmentFileName && <small>{form.attachmentFileName}</small>}
          {errors.attachment && <small>{errors.attachment}</small>}
        </div>

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

function CustomerEditModal({ errors = {}, form, onCancel, onDelete, onSubmit, onUpdate }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="close-modal customer-edit-modal" onSubmit={onSubmit} noValidate>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Cliente</p>
            <h2>Editar cadastro</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="form-pair wide">
          <label>
            Cod. Cliente
            <input value={form.clientCode} onChange={(event) => onUpdate('clientCode', event.target.value)} placeholder="Código" />
          </label>

          <label>
            Vendedor
            <input list="seller-options" value={form.seller} onChange={(event) => onUpdate('seller', event.target.value)} placeholder="Vendedor" />
          </label>
        </div>

        <label>
          Nome do cliente
          <input value={form.clientName} onChange={(event) => onUpdate('clientName', event.target.value)} placeholder="Nome do cliente" />
          {errors.clientName && <small>{errors.clientName}</small>}
        </label>

        <div className="form-pair wide">
          <label>
            CNPJ/CPF
            <input value={form.document} onChange={(event) => onUpdate('document', event.target.value)} placeholder="Documento" />
          </label>

          <label>
            Telefone
            <input value={form.phone} onChange={(event) => onUpdate('phone', event.target.value)} placeholder="Telefone" />
          </label>
        </div>

        <div className="form-pair wide">
          <label>
            Estado
            <input value={form.state} onChange={(event) => onUpdate('state', event.target.value)} placeholder="UF" />
          </label>

          <label>
            E-mail
            <input value={form.email} onChange={(event) => onUpdate('email', event.target.value)} placeholder="E-mail" />
          </label>
        </div>

        <label>
          End. Cadastro
          <input value={form.fiscalAddress} onChange={(event) => onUpdate('fiscalAddress', event.target.value)} placeholder="Endereço de cadastro" />
        </label>

        <label>
          End. Entrega
          <input value={form.deliveryAddress} onChange={(event) => onUpdate('deliveryAddress', event.target.value)} placeholder="Endereço de entrega" />
        </label>

        <label>
          CEP
          <input value={form.zipCode} onChange={(event) => onUpdate('zipCode', event.target.value)} placeholder="CEP" />
        </label>

        <div className="modal-actions">
          <button className="danger-button" type="button" onClick={onDelete}>
            <Trash2 size={16} />
            Excluir
          </button>
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

function TrackingWorkspace({
  activeTrackingTab,
  correiosCandidateCount,
  customers = [],
  entries,
  expandedEntryIds = [],
  isUpdatingCorreios,
  metrics,
  onAddStandalone,
  onEdit,
  onRemove,
  onToggleDetails,
  onUpdateCorreiosStatuses,
  searchTerm,
  setActiveTrackingTab,
  setActiveView,
  setSearchTerm,
}) {
  const tableWrapRef = useRef(null);
  const tableRef = useRef(null);
  const topScrollRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  useEffect(() => {
    function updateScrollWidth() {
      const nextWidth = tableRef.current?.scrollWidth || tableWrapRef.current?.scrollWidth || 0;
      setTableScrollWidth(nextWidth);
    }

    updateScrollWidth();
    window.addEventListener('resize', updateScrollWidth);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateScrollWidth);
    }

    const resizeObserver = new ResizeObserver(updateScrollWidth);
    if (tableRef.current) resizeObserver.observe(tableRef.current);
    if (tableWrapRef.current) resizeObserver.observe(tableWrapRef.current);

    return () => {
      window.removeEventListener('resize', updateScrollWidth);
      resizeObserver.disconnect();
    };
  }, [activeTrackingTab, entries.length]);

  function syncTableScrollFromTop(event) {
    if (tableWrapRef.current) tableWrapRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  function syncTopScrollFromTable(event) {
    if (topScrollRef.current) topScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  function getCustomerPhone(clientName) {
    const normalizedClientName = normalize(clientName || '');
    if (!normalizedClientName) return '';
    return customers.find((customer) => normalize(customer.clientName || '') === normalizedClientName)?.phone || '';
  }

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
            <strong>{metrics[tab.value === 'Em andamento' ? 'andamento' : tab.value === 'Finalizado' ? 'finalizado' : 'importacao']}</strong>
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
        <span className="situation teal">Importação</span>
      </div>

      <div className="table-top-scroll" ref={topScrollRef} onScroll={syncTableScrollFromTop} aria-label="Mover tabela lateralmente">
        <div style={{ width: `${tableScrollWidth}px` }} />
      </div>

      <div className="table-wrap" ref={tableWrapRef} onScroll={syncTopScrollFromTable}>
        <table className="tracking-table" ref={tableRef}>
          <thead>
            <tr>
              <th>Cotação</th>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Nº pedido</th>
              <th>Nº Nota Fiscal</th>
              <th>Transportadora</th>
              <th>Cod. Rastreio</th>
              <th>Situação entrega</th>
              <th>Previsão de entrega</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const colorClass = situationColorClass[entry.deliverySituation] || 'blue';
              const hasTrackingCode = entry.trackingCode.trim();
              const isExpanded = expandedEntryIds.includes(entry.id);
              const phone = entry.phone || getCustomerPhone(entry.clientName);
              return (
                <React.Fragment key={entry.id}>
                  <tr className={`tracking-row ${colorClass}`} onClick={() => onToggleDetails(entry.id)}>
                    <td className="strong-text">{entry.quoteNumber}</td>
                    <td>{entry.clientName}</td>
                    <td>{phone || '—'}</td>
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
                    <td>{entry.status}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button neutral"
                          type="button"
                          title="Editar rastreio"
                          aria-label="Editar rastreio"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(entry);
                          }}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="icon-button"
                          type="button"
                          title="Excluir rastreio"
                          aria-label="Excluir rastreio"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemove(entry.id);
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="tracking-details-row">
                      <td colSpan="11">
                        <div className="tracking-details">
                          <div>
                            <b>Observações</b>
                            <p>{entry.notes || 'Sem observações.'}</p>
                          </div>
                          <div>
                            <b>Data finalização</b>
                            <p>{entry.finalizedAt ? formatDateTime(entry.finalizedAt) : 'Não finalizado.'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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

function LossReasonModal({ form, mode, onCancel, onSubmit, onUpdate }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="close-modal" onSubmit={onSubmit} noValidate>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Motivo de perda</p>
            <h2>{mode === 'archive' ? 'Arquivar cotacao' : 'Marcar sem resposta'}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <label>
          Motivo
          <select value={form.reason} onChange={(event) => onUpdate('reason', event.target.value)}>
            {lossReasons.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Observacao
          <textarea
            value={form.notes}
            onChange={(event) => onUpdate('notes', event.target.value)}
            placeholder="Detalhes opcionais"
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

function UploadPreviewModal({ isUploading, onCancel, onConfirm, preview }) {
  const items = [
    ['Novos', preview.summary.novos],
    ['Atualizados', preview.summary.atualizados],
    ['Finalizados', preview.summary.finalizados],
    ['Arquivados', preview.summary.arquivados],
    ['Ignorados', preview.summary.ignorados],
    ['Cruzeiro do Sul ignorados', preview.summary.cruzeiroIgnorados],
  ];

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="close-modal upload-preview-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Previa da importacao</p>
            <h2>{preview.fileName}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Fechar janela" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="upload-preview-grid">
          {items.map(([label, value]) => (
            <span key={label}>
              <b>{value}</b>
              {label}
            </span>
          ))}
        </div>

        <div className="upload-preview-totals">
          <span>
            <b>Total em aberto</b>
            {formatCurrencyValue(preview.totals.open)}
          </span>
          <span>
            <b>Total finalizado</b>
            {formatCurrencyValue(preview.totals.closed)}
          </span>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={isUploading}>
            Cancelar
          </button>
          <button className="primary-button" type="button" onClick={onConfirm} disabled={isUploading}>
            {isUploading ? 'Importando...' : 'Confirmar importacao'}
          </button>
        </div>
      </div>
    </div>
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
            inputMode="numeric"
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
            list="customer-name-options"
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
            inputMode="numeric"
            value={form.quoteValue}
            onChange={(event) => onUpdate('quoteValue', event.target.value)}
            placeholder="R$ 0,00"
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
              list="customer-name-options"
              value={form.clientName}
              onChange={(event) => onUpdate('clientName', event.target.value)}
              placeholder="Ex: Cliente antigo"
            />
            {errors.clientName && <small>{errors.clientName}</small>}
          </label>
        )}

        <label>
          Telefone
          <input
            value={form.phone}
            onChange={(event) => onUpdate('phone', event.target.value)}
            placeholder="Telefone do cliente"
          />
        </label>

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
            <option value="Importação">Importação</option>
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
