'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { uploadImage } from '@/lib/api';
import { buildLayoutDiscountMap, fetchMagnetConfig, type ApiMagnetSize, type ApiTileLayout, type MagnetProductConfig } from '@/lib/tiledProducts';
import { buildLayoutGroupQty, calcCartTotals, formatPrice } from '@/lib/pricing';
import {
  centeredPhotoState, coverScaleFor, cropDataFrom, findLayout, findSize, itemGrid, itemLayoutSlug,
  itemNeedsReplace, itemSizeMm, loadImage, magnetsInItem, pickableLayouts, productFields, renderCropThumb,
} from '@/lib/studio';
import type { CartItem } from '@/types';
import MagnetPreview from '@/components/studio/MagnetPreview';
import AddSheet from '@/components/studio/AddSheet';
import BottomSheet from '@/components/configurator/BottomSheet';

const EditView = dynamic(() => import('@/components/studio/EditView'), { ssr: false });
const BulkDiscountPopup = dynamic(() => import('@/components/configurator/BulkDiscountPopup'), { ssr: false });

// On-screen size of a product: grows with its real printed width, but
// compressed (square root) so a 5×5 set doesn't dwarf a single magnet.
const PHONE_MAX = 640;

// On-screen size of a product. Phones: a two-column grid that fills the
// screen — singles take one column, sets span both. Larger screens: grows with
// the real printed width, compressed (square root) so a 5×5 set doesn't dwarf a single.
function displayPx(item: CartItem, viewportW: number) {
  const { cols } = itemGrid(item);
  if (viewportW < PHONE_MAX) {
    const avail = viewportW - 32; // px-4 page gutters
    return cols > 1 ? Math.round(avail * 0.92) : Math.round((avail - 24) / 2 - 8);
  }
  const widthMm = cols * itemSizeMm(item);
  return Math.round(120 * Math.sqrt(widthMm / 50));
}

function useViewportWidth() {
  return useSyncExternalStore(
    cb => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb); },
    () => window.innerWidth,
    () => 1024,
  );
}

function StudioMenu({ onClose }: { onClose: () => void }) {
  const { customer } = useAuth();
  const links: [string, string][] = [
    ['/', 'Home'],
    ['/faq', 'FAQ'],
    ['/shipping', 'Shipping'],
    ['/track', 'Track your order'],
    customer ? ['/account', 'My account'] : ['/auth/login', 'Sign in'],
  ];
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.nav
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15 }}
        className="absolute left-3 top-14 z-50 w-56 bg-white rounded-xl shadow-xl border border-border py-2"
      >
        {links.map(([href, label]) => (
          <Link key={href} href={href} onClick={onClose} className="block px-4 py-2.5 text-sm text-navy hover:bg-cream">
            {label}
          </Link>
        ))}
      </motion.nav>
    </>
  );
}

function Studio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewportW = useViewportWidth();
  const phone = viewportW < PHONE_MAX;
  const {
    items, hydrated, addItem, updateItem, removeItem, clearCart, uploadingIds, setUploading, openBag,
  } = useCart();

  const [config, setConfig] = useState<MagnetProductConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [size, setSize] = useState<ApiMagnetSize | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false);
  const [bulkPopup, setBulkPopup] = useState<{ remaining: number; pct: number } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Last removed magnet, kept briefly so a mis-tap on × can be undone
  const [undo, setUndo] = useState<CartItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Original photos picked this session (object URLs) — faster than refetching
  // the upload and works before it finishes. Falls back to item.sourceUrl.
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const localUrlsRef = useRef(localUrls);
  const setLocalUrl = useCallback((id: string, url: string | null) => {
    const prev = localUrlsRef.current[id];
    if (prev && prev !== url && !Object.entries(localUrlsRef.current).some(([k, v]) => k !== id && v === prev)) {
      URL.revokeObjectURL(prev); // only when no clone still shows it
    }
    const next = { ...localUrlsRef.current };
    if (url) next[id] = url; else delete next[id];
    localUrlsRef.current = next;
    setLocalUrls(next);
  }, []);

  useEffect(() => {
    fetchMagnetConfig()
      .then(cfg => {
        setConfig(cfg);
        setSize(cfg.sizes.find(s => s.active) ?? cfg.sizes[0] ?? null);
      })
      .catch(() => setConfigError(true));
  }, []);

  // Deep link from the bag: /configure?edit=<itemId>
  const editParam = searchParams.get('edit');
  useEffect(() => {
    if (!hydrated || !editParam) return;
    // Syncing from the URL (an external source) into local state, once per link
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (items.some(i => i.id === editParam)) setEditingId(editParam);
    router.replace('/configure', { scroll: false });
  }, [editParam, hydrated, items, router]);

  const layouts = pickableLayouts(config);
  const sizes = (config?.sizes ?? []).filter(s => s.active);
  const discountMap = config ? buildLayoutDiscountMap(config.layouts) : undefined;
  const { subtotal } = calcCartTotals(items, discountMap);
  const magnetCount = items.reduce((s, i) => s + i.quantity * magnetsInItem(i), 0);
  const editing = items.find(i => i.id === editingId) ?? null;

  // ── Photo pipeline ────────────────────────────────────────────────────

  // Loads the photo, crops it centred, then uploads. `targetId` replaces the
  // photo on an existing item (keeping its layout, size and quantity).
  const ingestFile = useCallback(async (file: File, layout: ApiTileLayout, sz: ApiMagnetSize, targetId?: string) => {
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) return;
    const id = targetId ?? uuidv4();
    const objUrl = URL.createObjectURL(file);
    setLocalUrl(id, objUrl);

    // HEIC can't be decoded by most browsers — then we wait for the server's JPEG
    let img: HTMLImageElement | null = null;
    try { img = await loadImage(objUrl); } catch { img = null; }

    const w = img?.naturalWidth ?? 0;
    const h = img?.naturalHeight ?? 0;
    const ps = centeredPhotoState(w ? coverScaleFor(w, h) : 1);
    const base = {
      ...productFields(sz, layout, w || undefined, h || undefined),
      imageKey: '',
      thumbUrl: img ? (renderCropThumb(img, ps) ?? '') : '',
      cropData: cropDataFrom(ps),
      naturalW: w || undefined,
      naturalH: h || undefined,
      sourceUrl: undefined,
    };

    if (targetId) updateItem(targetId, base);
    else addItem({ ...base, id, quantity: 1, discountPct: 0, currency: 'GBP' });

    setUploading(id, true);
    try {
      const res = await uploadImage(file, 'photo-magnet-50mm');
      const patch: Partial<CartItem> = { imageKey: res.imageKey, sourceUrl: res.imageUrl };
      if (!img && res.width && res.height) {
        // Server converted it (e.g. HEIC) — its 400px centre thumbnail equals our centred crop
        const sps = centeredPhotoState(coverScaleFor(res.width, res.height));
        setLocalUrl(id, null);
        Object.assign(patch, productFields(sz, layout, res.width, res.height), {
          thumbUrl: res.thumbUrl, cropData: cropDataFrom(sps), naturalW: res.width, naturalH: res.height,
        });
      }
      updateItem(id, patch);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      updateItem(id, {
        imageKey: '',
        ...(msg.includes('too small') || msg.includes('blocked') || msg.includes('resolution')
          ? { imageQuality: 'blocked' as const }
          : {}),
      });
    } finally {
      setUploading(id, false);
    }
  }, [addItem, updateItem, setUploading, setLocalUrl]);

  const handleFiles = (files: File[], layout: ApiTileLayout) => {
    if (!size) return;
    setAddOpen(false);
    const targetId = replaceId;
    setReplaceId(null);

    if (targetId) {
      const target = items.find(i => i.id === targetId);
      const sz = target ? findSize(config, itemSizeMm(target)) ?? size : size;
      ingestFile(files[0], layout, sz, targetId);
      return;
    }

    // Halfway-to-discount nudge, per layout (counts products, not magnets)
    if (layout.bulkDiscountQty && layout.bulkDiscountPct) {
      const before = buildLayoutGroupQty(items).get(layout.slug) ?? 0;
      const after = before + files.length;
      const half = Math.floor(layout.bulkDiscountQty / 2);
      if (half > 0 && before < half && after >= half && after < layout.bulkDiscountQty) {
        setBulkPopup({ remaining: layout.bulkDiscountQty - after, pct: layout.bulkDiscountPct });
      }
    }

    files.forEach(f => ingestFile(f, layout, size));
  };

  // ── Item actions (from the editor / toolbar) ──────────────────────────

  const changeItemProduct = (item: CartItem, sz: ApiMagnetSize | null, layout: ApiTileLayout | null) => {
    if (!sz || !layout) return;
    updateItem(item.id, productFields(sz, layout, item.naturalW, item.naturalH));
  };

  const applySizeToAll = (sz: ApiMagnetSize) => {
    setSize(sz);
    for (const item of items) changeItemProduct(item, sz, findLayout(config, itemLayoutSlug(item)));
    setSizeSheetOpen(false);
  };

  const cloneItem = (item: CartItem) => {
    const id = uuidv4();
    const url = localUrlsRef.current[item.id];
    if (url) setLocalUrl(id, url);
    const { id: _old, ...rest } = item;
    void _old;
    addItem({ ...rest, id, quantity: 1 });
    setEditingId(null);
  };

  const deleteItem = (item: CartItem) => {
    setLocalUrl(item.id, null);
    removeItem(item.id);
    setEditingId(null);
  };

  const removeWithUndo = (item: CartItem) => {
    removeItem(item.id);
    if (undo && undo.id !== item.id) setLocalUrl(undo.id, null); // previous undo window ends
    setUndo(item);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      setLocalUrl(item.id, null); // free the photo once undo is no longer possible
      setUndo(null);
    }, 5000);
  };

  const undoRemove = () => {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    addItem(undo); // same id, so its photo URL still lines up
    setUndo(null);
  };

  const clearAll = () => {
    for (const item of items) setLocalUrl(item.id, null);
    if (undo) setLocalUrl(undo.id, null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(null);
    clearCart();
    setConfirmClear(false);
  };

  const startReplace = (item: CartItem) => {
    setEditingId(null);
    setReplaceId(item.id);
    setAddOpen(true);
  };

  const presetLayout = replaceId
    ? (() => { const t = items.find(i => i.id === replaceId); return t ? findLayout(config, itemLayoutSlug(t)) : null; })()
    : null;

  // ── Render ────────────────────────────────────────────────────────────

  const empty = hydrated && items.length === 0;

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col">
      {/* ── Top bar ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-border flex items-center gap-2 px-2 min-[380px]:px-3">
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-cream cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <Link href="/" aria-label="Kustom Kreations home" className="hidden sm:flex items-center gap-2">
            <Image src="/logo-teal.png" alt="" width={34} height={34} className="w-8.5 h-8.5" />
            <span className="font-heading text-lg text-brand leading-none">kustom kreations</span>
          </Link>
        </div>

        <p className="min-w-0 truncate text-center text-sm min-[380px]:text-[15px] text-navy font-medium tabular-nums" aria-live="polite">
          {items.length > 0
            ? <>{magnetCount} Magnet{magnetCount !== 1 ? 's' : ''} · {formatPrice(subtotal)}</>
            : 'Create your magnets'}
        </p>

        <div className="flex-1 min-w-0 flex justify-end">
          <button
            onClick={openBag}
            aria-label={`Basket${items.length ? `, ${items.length} item${items.length > 1 ? 's' : ''}` : ''}`}
            className="relative shrink-0 inline-flex items-center justify-center gap-1.5 w-10 min-[380px]:w-auto min-[380px]:pl-3 min-[380px]:pr-3.5 h-9 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 016 0" />
            </svg>
            {/* icon-only on very narrow phones so the title never collides */}
            <span className="hidden min-[380px]:inline" aria-hidden="true">Basket</span>
            {items.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-navy text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">
                {items.length}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence>{menuOpen && <StudioMenu onClose={() => setMenuOpen(false)} />}</AnimatePresence>
      </header>

      {/* ── Canvas ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        {configError && (
          <p className="mx-auto mt-6 text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-2 rounded-[3px]">
            We couldn&apos;t load our magnet options. Please refresh the page.
          </p>
        )}

        {empty ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
            <button onClick={() => setAddOpen(true)} disabled={!config} className="flex flex-col items-center gap-5 group cursor-pointer disabled:cursor-wait">
              <motion.span
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-28 h-28 rounded-full bg-brand flex items-center justify-center shadow-[0_12px_32px_-8px_rgba(0,110,113,0.55)] group-active:scale-95 transition-transform"
              >
                <svg className="w-11 h-11 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </motion.span>
              <span className="font-heading text-3xl text-navy">Start Creating</span>
            </button>
            <p className="text-sm text-text-secondary mt-2 text-center max-w-xs">
              Pick a single magnet or a photo set, then add your favourite photos.
            </p>
          </div>
        ) : (
          <div className="flex-1 px-4 pt-4 sm:pt-6 pb-40">
            {items.length > 0 && (
              <div className="max-w-6xl mx-auto flex items-center gap-3 mb-6 sm:mb-10">
                <button
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex items-center gap-1.5 h-10 px-3 -ml-1 rounded-lg text-sm font-medium text-navy/70 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                  Clear all
                </button>
                <p className="flex-1 text-right sm:text-center text-sm text-text-secondary sm:pr-24">
                  {phone ? 'Tap a magnet to edit it' : 'Tap a magnet to crop, resize or change it'}
                </p>
              </div>
            )}
            <div className="max-w-6xl mx-auto grid grid-cols-2 justify-items-center gap-x-6 gap-y-9 sm:flex sm:flex-wrap sm:items-end sm:justify-center sm:gap-x-14 sm:gap-y-12">
              <AnimatePresence initial={false}>
                {items.map(item => {
                  const { rows, cols } = itemGrid(item);
                  const uploading = uploadingIds.has(item.id);
                  const label = `${rows * cols > 1 ? `${rows}×${cols} set` : 'Single'} · ${itemSizeMm(item)}mm`;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                      className={`flex flex-col items-center gap-2.5 ${cols > 1 ? 'col-span-2' : ''}`}
                    >
                      <div className="relative">
                        <button
                          onClick={() => setEditingId(item.id)}
                          className="group block cursor-pointer"
                          aria-label={`Edit ${label}`}
                        >
                          <MagnetPreview
                            thumbUrl={item.thumbUrl || null}
                            rows={rows}
                            cols={cols}
                            size={displayPx(item, viewportW)}
                            uploading={uploading}
                            warning={itemNeedsReplace(item, uploading)}
                            className="transition-transform duration-200 group-hover:-translate-y-1"
                          />
                        </button>
                        {/* Remove — 44px hit area around a 28px chip */}
                        <button
                          onClick={() => removeWithUndo(item)}
                          aria-label={`Remove ${label}`}
                          className="absolute -top-4 -right-4 w-11 h-11 flex items-center justify-center cursor-pointer group/x"
                        >
                          <span className="w-7 h-7 rounded-full bg-white text-navy border border-border shadow-[0_2px_8px_rgba(26,26,24,0.18)] flex items-center justify-center group-hover/x:bg-navy group-hover/x:text-white transition-colors">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          </span>
                        </button>
                      </div>
                      <span className="text-xs text-text-secondary">
                        {label}{item.quantity > 1 && <> · ×{item.quantity}</>}
                      </span>
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="-mt-1 inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border bg-white text-[13px] font-medium text-navy hover:border-brand hover:text-brand transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>
                        Edit
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* ── Floating toolbar ──────────────────────────────────── */}
      {!empty && (
        <div className="fixed bottom-5 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-white rounded-2xl shadow-[0_10px_34px_-10px_rgba(26,26,24,0.28)] border border-border/70 pl-3 pr-2.5 py-2 flex items-center gap-1">
            {sizes.length > 1 && (
              <button
                onClick={() => setSizeSheetOpen(true)}
                className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium text-navy/80 hover:text-navy cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" /><path d="M9 15l6-6M10 9h5v5" /></svg>
                Size
              </button>
            )}
            <button
              onClick={openBag}
              className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium text-navy/80 hover:text-navy cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 016 0" /></svg>
              Basket
            </button>
            <span className="w-px h-9 bg-border mx-2" />
            <button
              onClick={() => { setReplaceId(null); setAddOpen(true); }}
              disabled={!config}
              aria-label="Add more magnets"
              className="w-12 h-12 rounded-full bg-brand-light text-brand hover:bg-brand hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Sheets & overlays ─────────────────────────────────── */}
      <AddSheet
        open={addOpen}
        onClose={() => { setAddOpen(false); setReplaceId(null); }}
        layouts={layouts}
        sizes={sizes}
        size={size}
        onSizeChange={setSize}
        onFiles={handleFiles}
        presetLayout={presetLayout}
      />

      <BottomSheet open={sizeSheetOpen} onClose={() => setSizeSheetOpen(false)} label="Magnet size">
        <h2 className="font-body text-lg font-semibold text-navy text-center mb-1">Magnet size</h2>
        <p className="text-sm text-text-secondary text-center mb-5">Applies to every magnet in your basket. You can change one at a time by tapping it.</p>
        <div className="flex flex-col gap-2">
          {sizes.map(s => (
            <button
              key={s.id}
              onClick={() => applySizeToAll(s)}
              className={`flex items-center justify-between px-4 py-3.5 rounded-[3px] border transition-colors cursor-pointer ${
                size?.id === s.id ? 'border-navy bg-navy text-white' : 'border-border text-navy hover:border-navy/40'
              }`}
            >
              <span className="font-medium">{s.label}</span>
              <span className={size?.id === s.id ? 'text-white/75 text-sm' : 'text-text-secondary text-sm'}>
                {formatPrice(s.pricePerMagnet)} per magnet
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <AnimatePresence>
        {editing && (
          <EditView
            key={editing.id}
            item={editing}
            photoUrl={localUrls[editing.id] ?? editing.sourceUrl ?? null}
            layouts={layouts}
            sizes={sizes}
            onDone={(ps, thumb, natural) => {
              updateItem(editing.id, {
                cropData: cropDataFrom(ps),
                ...(thumb ? { thumbUrl: thumb } : {}),
                ...(natural && !editing.naturalW ? { naturalW: natural.w, naturalH: natural.h } : {}),
              });
              setEditingId(null);
            }}
            onLayout={l => changeItemProduct(editing, findSize(config, itemSizeMm(editing)), l)}
            onSize={s => changeItemProduct(editing, s, findLayout(config, itemLayoutSlug(editing)))}
            onReplace={() => startReplace(editing)}
            onClone={() => cloneItem(editing)}
            onDelete={() => deleteItem(editing)}
          />
        )}
      </AnimatePresence>

      {/* Undo after removing a magnet — sits above the floating toolbar */}
      <AnimatePresence>
        {undo && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
            className="fixed bottom-28 inset-x-0 z-30 flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-4 bg-navy text-white text-sm rounded-xl pl-4 pr-1.5 py-1.5 shadow-lg">
              Magnet removed
              <button onClick={undoRemove} className="h-9 px-3 rounded-lg font-semibold text-[#9FD3D0] hover:bg-white/10 cursor-pointer">
                Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomSheet open={confirmClear} onClose={() => setConfirmClear(false)} label="Clear basket">
        <h2 className="font-heading text-2xl text-navy mb-2">Clear your basket?</h2>
        <p className="text-sm text-text-secondary mb-6">
          This removes all {items.length} item{items.length !== 1 ? 's' : ''} ({magnetCount} magnet{magnetCount !== 1 ? 's' : ''}). You can’t undo this.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setConfirmClear(false)} className="h-12 rounded-lg border border-border font-semibold text-navy hover:border-navy/40 cursor-pointer">
            Keep them
          </button>
          <button onClick={clearAll} className="h-12 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800 cursor-pointer">
            Clear all
          </button>
        </div>
      </BottomSheet>

      {bulkPopup && (
        <BulkDiscountPopup remaining={bulkPopup.remaining} pct={bulkPopup.pct} onClose={() => setBulkPopup(null)} />
      )}
    </div>
  );
}

export default function ConfigurePage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center text-text-secondary text-sm">Loading…</div>}
    >
      <Studio />
    </Suspense>
  );
}
