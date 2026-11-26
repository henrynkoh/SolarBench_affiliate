import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BellRing,
  Check,
  CheckCircle2,
  ExternalLink,
  LogIn,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { getBestOffer, getOfferLandedPrice } from '../data/solarCatalog';
import {
  getPriceArbitrageMetrics,
  getProduct30DayPriceSeries,
  Product30DayPriceSummary,
} from '../data/solarEconomics';
import { signInWithGoogleForArchive } from '../lib/firebase';
import { PriceAlertRecord, SolarProduct } from '../types/solar';
import { WatchedPriceChart30d } from './WatchedPriceChart30d';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: PriceAlertRecord[];
  catalog: SolarProduct[];
  includeRefurb: boolean;
  user: User | null;
  initialProductId?: string | null;
  onCreateAlert: (input: {
    productId: string;
    productName: string;
    brand: string;
    targetPrice: number;
    lowestLandedAtCreation: number;
  }) => Promise<void>;
  onUpdateAlertTarget: (alertId: string, targetPrice: number) => Promise<void>;
  onDeleteAlert: (alertId: string) => Promise<void>;
  onInspectProduct: (product: SolarProduct) => void;
  onAddToBuild: (productId: string, merchantId: string) => void;
}

export function PriceAlertsModal({
  isOpen,
  onClose,
  alerts,
  catalog,
  includeRefurb,
  user,
  initialProductId,
  onCreateAlert,
  onUpdateAlertTarget,
  onDeleteAlert,
  onInspectProduct,
  onAddToBuild,
}: PriceAlertsModalProps) {
  const [selectedProductId, setSelectedProductId] = useState(
    initialProductId ?? catalog[0]?.id ?? ''
  );
  const [targetInput, setTargetInput] = useState('1050');
  const [saving, setSaving] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialProductId) {
      setSelectedProductId(initialProductId);
    }
  }, [isOpen, initialProductId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    const prod = catalog.find((p) => p.id === selectedProductId);
    if (!prod) return;
    const best = getOfferLandedPrice(getBestOffer(prod, includeRefurb));
    setTargetInput(String(Math.max(50, Math.round(best * 0.92))));
  }, [selectedProductId, catalog, includeRefurb]);

  const seriesByProductId = useMemo(() => {
    const map = new Map<string, Product30DayPriceSummary>();
    const ids = new Set<string>();
    if (selectedProductId) ids.add(selectedProductId);
    for (const a of alerts) ids.add(a.productId);

    for (const id of ids) {
      const prod = catalog.find((p) => p.id === id);
      if (prod) {
        map.set(id, getProduct30DayPriceSeries(prod, includeRefurb));
      }
    }
    return map;
  }, [catalog, alerts, selectedProductId, includeRefurb]);

  if (!isOpen) return null;

  const selectedProd = catalog.find((p) => p.id === selectedProductId);
  const selectedCurrent = selectedProd
    ? getOfferLandedPrice(getBestOffer(selectedProd, includeRefurb))
    : 0;
  const selected90dLow = selectedProd
    ? getPriceArbitrageMetrics(selectedProd, includeRefurb).low90d
    : 0;
  const selected30dSeries = selectedProd
    ? seriesByProductId.get(selectedProd.id)
    : undefined;
  const parsedNewTarget = Number(targetInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = catalog.find((p) => p.id === selectedProductId);
    const num = Number(targetInput);
    if (!prod || !Number.isFinite(num) || num <= 0) return;

    const currentLowest = getOfferLandedPrice(getBestOffer(prod, includeRefurb));
    setSaving(true);
    try {
      await onCreateAlert({
        productId: prod.id,
        productName: prod.name,
        brand: prod.brand,
        targetPrice: num,
        lowestLandedAtCreation: currentLowest,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (alertId: string, nextVal?: number) => {
    const val = nextVal ?? Number(editValue);
    if (!Number.isFinite(val) || val <= 0) return;
    setUpdatingAlertId(alertId);
    try {
      await onUpdateAlertTarget(alertId, val);
      setEditingAlertId(null);
    } finally {
      setUpdatingAlertId(null);
    }
  };

  const triggeredCount = alerts.filter((alert) => {
    const prod = catalog.find((p) => p.id === alert.productId);
    if (!prod) return false;
    const current = getOfferLandedPrice(getBestOffer(prod, includeRefurb));
    return current <= alert.targetPrice;
  }).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-alerts-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <BellRing className="w-3.5 h-3.5" />
              <span>Target Price-Drop Watchlist</span>
            </div>
            <h2
              id="price-alerts-title"
              className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums"
            >
              Solar Price Alerts ({alerts.length} Watched · {triggeredCount}{' '}
              Triggered)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {!user ? (
              <button
                type="button"
                onClick={() => void signInWithGoogleForArchive()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In to Sync Firestore DB
              </button>
            ) : (
              <span className="text-xs font-medium text-emerald-700">
                Synced to Firestore ({user.email})
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close price alerts"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-900">
                Add New Cross-Platform Target Price Alert
              </div>
              {selectedProd && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500">Presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setTargetInput(String(Math.round(selectedCurrent * 0.95)))
                    }
                    className="px-2 py-0.5 rounded border border-slate-200 bg-white font-mono tabular-nums text-slate-700 hover:border-amber-500 whitespace-nowrap"
                  >
                    -5% (${Math.round(selectedCurrent * 0.95).toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTargetInput(String(Math.round(selectedCurrent * 0.9)))
                    }
                    className="px-2 py-0.5 rounded border border-slate-200 bg-white font-mono tabular-nums text-slate-700 hover:border-amber-500 whitespace-nowrap"
                  >
                    -10% (${Math.round(selectedCurrent * 0.9).toLocaleString()})
                  </button>
                  {selected30dSeries && (
                    <button
                      type="button"
                      onClick={() =>
                        setTargetInput(String(selected30dSeries.low30d))
                      }
                      className="px-2 py-0.5 rounded border border-amber-200 bg-amber-50 font-mono tabular-nums text-amber-800 hover:border-amber-400 whitespace-nowrap"
                    >
                      30d Low (${selected30dSeries.low30d.toLocaleString()})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTargetInput(String(selected90dLow))}
                    className="px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 font-mono tabular-nums text-emerald-700 hover:border-emerald-400 whitespace-nowrap"
                  >
                    90d Low (${selected90dLow.toLocaleString()})
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                aria-label="Select solar product to watch"
                className="sm:col-span-7 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
              >
                {catalog.map((p) => {
                  const lowest = getOfferLandedPrice(
                    getBestOffer(p, includeRefurb)
                  );
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} (Today: ${lowest.toLocaleString()})
                    </option>
                  );
                })}
              </select>

              <div className="sm:col-span-3 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                  $
                </span>
                <input
                  type="number"
                  min={10}
                  max={100000}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  aria-label="Target landed price USD"
                  className="w-full pl-6 pr-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                {saving ? 'Saving' : 'Set Alert'}
              </button>
            </div>

            {selectedProd && selected30dSeries && (
              <WatchedPriceChart30d
                summary={selected30dSeries}
                targetPrice={
                  Number.isFinite(parsedNewTarget) && parsedNewTarget > 0
                    ? parsedNewTarget
                    : selectedCurrent
                }
                productName={selectedProd.name}
                isTriggered={
                  Number.isFinite(parsedNewTarget) &&
                  parsedNewTarget > 0 &&
                  selectedCurrent <= parsedNewTarget
                }
                onApplyTargetPrice={(val) => setTargetInput(String(val))}
                compact
              />
            )}
          </form>

          {alerts.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
              No target price alerts set yet. Choose any solar hardware SKU
              above or click Watch on any store row to track landed drops across
              all 10 stores.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const product = catalog.find((p) => p.id === alert.productId);
                const bestOffer = product
                  ? getBestOffer(product, includeRefurb)
                  : null;
                const currentLowest = bestOffer
                  ? getOfferLandedPrice(bestOffer)
                  : alert.lowestLandedAtCreation;
                const isEditing = editingAlertId === alert.alertId;
                const parsedEdit = Number(editValue);
                const effectiveTarget =
                  isEditing && Number.isFinite(parsedEdit) && parsedEdit > 0
                    ? parsedEdit
                    : alert.targetPrice;
                const isTriggered = currentLowest <= effectiveTarget;
                const series30d = product
                  ? seriesByProductId.get(product.id)
                  : undefined;

                return (
                  <div
                    key={alert.alertId}
                    className={`border rounded-xl p-4 ${
                      isTriggered
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-slate-900 truncate">
                            {alert.productName}
                          </span>
                          <span className="text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-500 font-medium">
                            {alert.brand}
                          </span>
                          {isTriggered && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Target Reached
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-xs font-mono text-slate-600 mt-1 tabular-nums flex flex-wrap items-center gap-2">
                          {isEditing ? (
                            <span className="inline-flex items-center gap-1.5">
                              Target: $
                              <input
                                type="number"
                                min={10}
                                max={100000}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                aria-label={`Edit target price for ${alert.productName}`}
                                className="w-24 px-2 py-0.5 border border-amber-400 rounded bg-white text-slate-900"
                              />
                              <button
                                type="button"
                                disabled={updatingAlertId === alert.alertId}
                                onClick={() => void handleSaveEdit(alert.alertId)}
                                className="p-1 rounded bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
                                aria-label="Save new target price"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingAlertId(null)}
                                className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                                aria-label="Cancel target edit"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ) : (
                            <span>
                              Target:{' '}
                              <strong>
                                ${alert.targetPrice.toLocaleString()}
                              </strong>
                            </span>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>
                            Live Lowest:{' '}
                            <strong
                              className={
                                isTriggered
                                  ? 'text-emerald-700'
                                  : 'text-slate-900'
                              }
                            >
                              ${currentLowest.toLocaleString()}
                            </strong>
                            {bestOffer ? ` (${bestOffer.merchantName})` : ''}
                          </span>
                          {updatingAlertId === alert.alertId && (
                            <span className="text-[11px] font-sans text-amber-700">
                              Updating target…
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAlertId(alert.alertId);
                              setEditValue(String(alert.targetPrice));
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900"
                            title="Edit target price"
                            aria-label="Edit target price"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {product && bestOffer && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onAddToBuild(product.id, bestOffer.merchantId);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 transition-colors whitespace-nowrap"
                            >
                              Add to Build
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onInspectProduct(product);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900"
                              title="Inspect stores"
                              aria-label={`Inspect stores for ${alert.productName}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => void onDeleteAlert(alert.alertId)}
                          aria-label="Delete alert"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {series30d ? (
                      <WatchedPriceChart30d
                        summary={series30d}
                        targetPrice={effectiveTarget}
                        productName={alert.productName}
                        isTriggered={isTriggered}
                        onApplyTargetPrice={(newTarget) => {
                          if (isEditing) {
                            setEditValue(String(newTarget));
                          } else {
                            void handleSaveEdit(alert.alertId, newTarget);
                          }
                        }}
                      />
                    ) : (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-[11px] text-slate-500">
                        30-day price telemetry unavailable for archived SKU (initial landed price at watch: $
                        {alert.lowestLandedAtCreation.toLocaleString()}).
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
