import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Database,
  FileText,
  LogIn,
  LogOut,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import React from 'react';
import { useEffect, useMemo, useState } from 'react';
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
  cacheTrackingEntries,
  createTrackingEntry,
  deleteTrackingEntry,
  loadTrackingEntries,
  subscribeToTrackingChanges,
  updateTrackingEntry,
} from './services/trackingRepository';

const sellers = ['Elton', 'Bruno', 'Stephanie'];

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

const trackingTabs = [
  { value: 'Em andamento', label: 'Em andamento' },
  { value: 'Finalizado', label: 'Finalizado' },
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
};

const initialForm = {
  quoteNumber: '',
  clientName: '',
  paymentTerms: '',
  quoteDate: getTodayInputValue(),
  seller: 'Elton',
  followUpAmount: 1,
  followUpUnit: 'days',
  followUpUsesTime: false,
};

const initialQuoteEditForm = {
  quoteNumber: '',
  clientName: '',
  paymentTerms: '',
  quoteDate: getTodayInputValue(),
  seller: 'Elton',
  followUpAmount: 1,
  followUpUnit: 'days',
  followUpUsesTime: false,
};

const initialTrackingForm = {
  clientName: '',
  trackingCode: '',
  invoiceNumber: '',
  deliverySituation: 'etiqueta',
  expectedDeliveryDate: '',
  notes: '',
  status: 'Em andamento',
};

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
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
  const [form, setForm] = useState(initialForm);
  const [activeView, setActiveView] = useState('quotes');
  const [activeTab, setActiveTab] = useState('abertas');
  const [activeTrackingTab, setActiveTrackingTab] = useState('Em andamento');
  const [searchTerm, setSearchTerm] = useState('');
  const [trackingSearchTerm, setTrackingSearchTerm] = useState('');
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
  const [expandedQuoteIds, setExpandedQuoteIds] = useState([]);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState('');
  const [dataStatus, setDataStatus] = useState(persistenceMode === 'supabase' ? 'Supabase' : 'Local');
  const [now, setNow] = useState(new Date());

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
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    Promise.all([loadStoredQuotes(), loadTrackingEntries()])
      .then(([quoteResult, trackingResult]) => {
        if (!active) return;
        setQuotes(quoteResult.quotes);
        setTrackingEntries(trackingResult.entries);
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

          unsubscribeRealtime = () => {
            unsubscribeQuotes();
            unsubscribeTracking();
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
      .filter((quote) => {
        if (!query) return true;
        return normalize(quote.clientName).includes(query) || normalize(quote.quoteNumber).includes(query);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activeTab, now, quotes, searchTerm]);

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

  function updateForm(field, value) {
    setForm((current) => {
      if (field === 'followUpUsesTime') {
        return { ...current, followUpUsesTime: value, followUpUnit: value ? 'hours' : 'days' };
      }

      return { ...current, [field]: value };
    });
    setErrors((current) => ({ ...current, [field]: '' }));
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
    } catch (error) {
      setAppError(error.message || 'Não foi possível sair.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const createdAt = new Date().toISOString();
    const nextQuote = {
      id: crypto.randomUUID(),
      quoteNumber: form.quoteNumber.trim(),
      clientName: form.clientName.trim(),
      paymentTerms: form.paymentTerms.trim(),
      quoteDate: form.quoteDate,
      seller: form.seller,
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

  function openCloseModal(quote) {
    setCloseModal({ quoteId: quote.id, quoteNumber: quote.quoteNumber, clientName: quote.clientName });
    setCloseDetails({
      ...initialCloseDetails,
      ...quote.closeDetails,
      carrier: quote.closeDetails?.carrier || quote.closeDetails?.freight || '',
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
      status: 'fechada',
      statusUpdatedAt: closedAt,
      closeDetails: {
        orderNumber: closeDetails.orderNumber.trim(),
        agreedPaymentTerms: closeDetails.agreedPaymentTerms.trim(),
        carrier: closeDetails.carrier.trim(),
        totalValue: closeDetails.totalValue.trim(),
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
      paymentTerms: quote.paymentTerms || '',
      quoteDate: quote.quoteDate,
      seller: quote.seller,
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
      paymentTerms: quoteEditForm.paymentTerms.trim(),
      quoteDate: quoteEditForm.quoteDate,
      seller: quoteEditForm.seller,
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
      trackingCode: entry.trackingCode || '',
      invoiceNumber: entry.invoiceNumber || '',
      deliverySituation: entry.deliverySituation || 'etiqueta',
      expectedDeliveryDate: entry.expectedDeliveryDate || '',
      notes: entry.notes || '',
      status: entry.status || 'Em andamento',
    });
  }

  function updateTrackingForm(field, value) {
    setTrackingForm((current) => ({ ...current, [field]: value }));
    setTrackingFormErrors((current) => ({ ...current, [field]: '' }));
  }

  function validateStandaloneTrackingForm() {
    const nextErrors = {};

    if (!trackingForm.clientName.trim()) nextErrors.clientName = 'Informe o nome.';

    setTrackingFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveTrackingForm(event) {
    event.preventDefault();
    if (!trackingModal) return;

    const previousEntries = trackingEntries;
    const changes = {
      trackingCode: trackingForm.trackingCode.trim(),
      invoiceNumber: trackingForm.invoiceNumber.trim(),
      deliverySituation: trackingForm.deliverySituation,
      expectedDeliveryDate: trackingForm.expectedDeliveryDate,
      notes: trackingForm.notes.trim(),
      status: trackingForm.status,
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
      setActiveTrackingTab(savedEntry.status);
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
    const nextEntry = {
      id: crypto.randomUUID(),
      quoteId: null,
      quoteNumber: 'Avulso',
      clientName: trackingForm.clientName.trim(),
      orderNumber: '',
      invoiceNumber: trackingForm.invoiceNumber.trim(),
      carrier: '',
      trackingCode: trackingForm.trackingCode.trim(),
      deliverySituation: trackingForm.deliverySituation,
      expectedDeliveryDate: trackingForm.expectedDeliveryDate,
      notes: trackingForm.notes.trim(),
      status: trackingForm.status,
      finalizedAt: trackingForm.status === 'Finalizado' ? nowIso : '',
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
      setActiveTrackingTab(savedEntry.status);
      setAppError('');
    } catch (error) {
      setTrackingEntries(previousEntries);
      setAppError(error.message || 'Não foi possível adicionar o rastreio avulso.');
    }
  }

  function toggleQuoteDetails(id) {
    setExpandedQuoteIds((current) =>
      current.includes(id) ? current.filter((quoteId) => quoteId !== id) : [...current, id],
    );
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
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Dashboard comercial</p>
          <img className="app-logo header-logo" src="/followuper-logo-cropped.png" alt="FollowUper" />
        </div>
        <div className="top-stack">
          <div className="session-actions">
            <span className="data-badge">
              <Database size={15} />
              {dataStatus}
            </span>
            <button
              className={activeView === 'tracking' ? 'view-button active' : 'view-button'}
              type="button"
              onClick={() => setActiveView('tracking')}
            >
              <Truck size={16} />
              Rastreio
            </button>
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
        </div>
      </section>

      {appError && <div className="app-alert">{appError}</div>}

      {activeView === 'quotes' ? (
        <QuotesWorkspace
          activeTab={activeTab}
          errors={errors}
          form={form}
          metrics={metrics}
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
          setActiveTab={setActiveTab}
          setActiveView={setActiveView}
          setSearchTerm={setSearchTerm}
          onToggleQuoteDetails={toggleQuoteDetails}
          visibleQuotes={visibleQuotes}
        />
      ) : (
        <TrackingWorkspace
          activeTrackingTab={activeTrackingTab}
          entries={visibleTrackingEntries}
          metrics={trackingMetrics}
          onEdit={openTrackingModal}
          onRemove={removeTrackingEntry}
          onAddStandalone={openStandaloneTrackingModal}
          setActiveTrackingTab={setActiveTrackingTab}
          setActiveView={setActiveView}
          searchTerm={trackingSearchTerm}
          setSearchTerm={setTrackingSearchTerm}
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
    </main>
  );
}

function QuotesWorkspace({
  activeTab,
  errors,
  form,
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
  setActiveTab,
  setActiveView,
  setSearchTerm,
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
            <button className="secondary-button compact" type="button" onClick={() => setActiveView('tracking')}>
              <Truck size={16} />
              Rastreio
            </button>
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
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Nº cotação</th>
                <th>Cliente</th>
                <th>Pagamento</th>
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
                const detailsExpanded = expandedQuoteIds.includes(quote.id);
                const canEditQuote = !isClosed(quote);

                return (
                  <React.Fragment key={quote.id}>
                    <tr
                      className={`quote-row ${statusMeta.color} ${showCloseDetails ? 'expandable' : ''} ${due ? 'overdue' : ''}`}
                      onClick={() => showCloseDetails && onToggleQuoteDetails(quote.id)}
                    >
                      <td>
                        <div className="status-cell">
                          <i className={`dot ${statusMeta.color}`} />
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
                      <td className="strong-text">{quote.quoteNumber}</td>
                      <td>{quote.clientName}</td>
                      <td>{quote.paymentTerms || '—'}</td>
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
                                  Follow-up vencido - Reiniciar
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

function TrackingWorkspace({
  activeTrackingTab,
  entries,
  metrics,
  onAddStandalone,
  onEdit,
  onRemove,
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
                    {hasTrackingCode ? <span className={`situation ${colorClass}`}>{entry.deliverySituation}</span> : '—'}
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
          Condição de pagamento
          <input
            value={form.paymentTerms}
            onChange={(event) => onUpdate('paymentTerms', event.target.value)}
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
          <img className="app-logo login-logo" src="/followuper-logo-cropped.png" alt="FollowUper" />
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
