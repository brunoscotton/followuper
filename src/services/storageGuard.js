const FOLLOWUPER_CACHE_KEYS = [
  'followuper.billingEntries.v1',
  'followuper.billingUploads.v1',
  'followuper.billingUploadSnapshots.v1',
  'followuper.contractTemplates.v1',
  'followuper.customers.v1',
  'followuper.dashboardSnapshots.v1',
  'followuper.dashboardSettings.v1',
  'followuper.infoBlocks.v1',
  'followuper.quotes.v1',
  'followuper.reminders.v1',
  'followuper.returnEntries.v1',
  'followuper.rotaxParts.v1',
  'followuper.rotaxPartsCatalog.v1',
  'followuper.rotaxRevenueEntries.v1',
  'followuper.rotaxTrainingBlocks.v1',
  'followuper.rotaxTrainingContacts.v1',
  'followuper.rotaxTrainingSessions.v1',
  'followuper.rotaxTrainingStudents.v1',
  'followuper.stockCatalog.v1',
  'followuper.stockItems.v1',
  'followuper.stockProductAddresses.v1',
  'followuper.stockTransferCandidates.v1',
  'followuper.stockTransferLists.v1',
  'followuper.tracking.v1',
  'followuper.uploadAudits.v1',
  'followuper.warrantyEntries.v1',
];

function isQuotaExceededError(error) {
  return (
    error?.name === 'QuotaExceededError' ||
    error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error?.code === 22 ||
    String(error?.message || '').toLowerCase().includes('quota')
  );
}

export function installLocalStorageQuotaGuard() {
  if (typeof window === 'undefined' || window.__followuperStorageGuardInstalled) return;
  if (!window.Storage?.prototype?.setItem || !window.Storage?.prototype?.removeItem) return;

  window.__followuperStorageGuardInstalled = true;
  const originalSetItem = window.Storage.prototype.setItem;
  const originalRemoveItem = window.Storage.prototype.removeItem;

  window.Storage.prototype.setItem = function guardedSetItem(key, value) {
    try {
      return originalSetItem.call(this, key, value);
    } catch (error) {
      const isFollowUperLocalStorage = this === window.localStorage && String(key || '').startsWith('followuper.');
      if (!isFollowUperLocalStorage || !isQuotaExceededError(error)) throw error;

      FOLLOWUPER_CACHE_KEYS.forEach((cacheKey) => {
        if (cacheKey === key) return;
        try {
          originalRemoveItem.call(window.localStorage, cacheKey);
        } catch {
          // Best effort cleanup only.
        }
      });

      try {
        return originalSetItem.call(this, key, value);
      } catch (retryError) {
        if (!isQuotaExceededError(retryError)) throw retryError;
        console.warn('FollowUper: cache local ignorado por falta de espaço no navegador.', retryError);
        return undefined;
      }
    }
  };
}
