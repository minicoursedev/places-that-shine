// Designer dialog: profile, catalogue images, social links and share link.
import { state, markVisited, findBoothIn } from '../state.js';
import { loadAisle, aisleOfBooth } from '../data.js?v=20261124-profile-title';
import { boothHtml, loadingHtml, failHtml } from './booth-markup.js?v=20261125-hall-routes';
import { designerPath, designerSharePath, designerViewPath, designerWalkPath, resolveDesignerRoute, updateDesignerMetadata } from '../routes.js?v=20261125-hall-routes';
import { retryOriginal } from '../images.js';
import { loadProducts, sampleProducts } from '../products.js?v=20261030-pinned-work';

const dlg = () => document.getElementById('dlg-booth');

// The designer currently shown in the dialog.
let current = null;
let openToken = 0;


function paint() {
  const d = dlg();
  if (!d || !current) return;
  const { booth, aisle } = current;
  const store = aisle.stores?.[booth.store] || null;
  const scroll = d.querySelector('.dlg-body')?.scrollTop || 0;
  // Replace the static fallback only once the complete interactive profile is ready.
  document.getElementById('static-designer-profile')?.remove();
  d.innerHTML = boothHtml(booth, store, { profile: true });
  const body = d.querySelector('.dlg-body');
  if (body) body.scrollTop = scroll;
}

async function getAisleFor(boothId) {
  const code = aisleOfBooth(boothId);
  if (state.aisle && state.aisle.code === code) return state.aisle;
  return loadAisle(code);
}

export async function openBooth(boothId, { keepHall = false, initialUrl = null } = {}) {
  const d = dlg();
  if (!d || !boothId) return;
  const token = ++openToken;
  current = null;
  // Direct profile pages already contain the author's complete static view.
  if (!initialUrl && !d.open) {
    d.innerHTML = loadingHtml(boothId);
    d.showModal();
  }

  let aisle;
  try {
    aisle = await getAisleFor(boothId);
  } catch (e) {
    if (token !== openToken) return;
    d.innerHTML = failHtml(boothId, '設計師資料載入失敗，請再試一次。');
    return;
  }
  if (token !== openToken) return;
  if (!aisle) { if (d.open) d.close(); return; }
  let booth = findBoothIn(aisle, boothId);
  if (!booth) {
    d.innerHTML = failHtml(boothId, '找不到這位設計師。');
    return;
  }
  const store = aisle.stores?.[booth.store];
  if (store?.productsUrl) {
    try {
      const products = await loadProducts(store.productsUrl, booth.store);
      booth = { ...booth, works: sampleProducts(products), total: products.length, randomSelection: true };
    } catch {
      if (initialUrl) return;
      booth = { ...booth, productsError: true };
    }
    if (token !== openToken) return;
  }
  if (initialUrl) {
    // The visitor may have left the profile while its catalogue was loading.
    const staticProfile = document.getElementById('static-designer-profile');
    if (location.href !== initialUrl || !staticProfile?.getClientRects().length || document.querySelector('dialog[open]')) return;
    // A legacy ?hall= link shares the primary profile's static HTML.
    if (location.pathname === designerPath(store.id) && keepHall && aisle.hall !== store.primaryHall) {
      updateDesignerMetadata(store, booth);
    }
  } else {
    const path = keepHall || aisle.hall !== store.primaryHall
      ? designerSharePath(booth.store, aisle.hall)
      : designerPath(booth.store);
    history.replaceState(null, '', path);
    updateDesignerMetadata(store, booth);
  }
  current = { boothId, booth, aisle, initialUrl };
  paint();
  if (!d.open) d.showModal();
  d.querySelector('.dlg-close')?.focus();
  markVisited(boothId);
  return true;
}

function wire() {
  const d = dlg();
  if (!d) return;
  // a cover that fails to load falls back to the halftone square
  d.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (retryOriginal(img)) return;
    const box = img.parentElement;
    if (box?.classList.contains('bo-cover')) { box.classList.add('bo-cover-none'); img.remove(); }
    else if (box?.classList.contains('bo-avatar')) { box.classList.add('bo-avatar-none'); img.remove(); }
  }, true);
  d.addEventListener('close', () => {
    const closingInitialProfile = current?.initialUrl === location.href;
    openToken++; current = null;
    if (closingInitialProfile || resolveDesignerRoute(new URL(location.href)).mode === 'designer') {
      const returnPath = document.getElementById('stage-list').hidden
        ? designerWalkPath(state.aisleCode)
        : designerViewPath(state.aisleCode, 'list');
      history.replaceState(null, '', returnPath);
      updateDesignerMetadata();
    }
  });
}

wire();
