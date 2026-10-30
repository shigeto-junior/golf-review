// ホール図などの画像は容量が大きいので、localStorage ではなく IndexedDB に保存する。
// 保存前に長辺 1600px の JPEG に縮小して容量を抑える。
import { newId } from "./model.js";

const DB_NAME = "golf-review-images";
const STORE = "images";
const MAX_SIZE = 1600;

let dbPromise = null;

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  });
}

async function shrink(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
}

export async function addImage(file) {
  const blob = await shrink(file);
  const id = newId();
  await tx("readwrite", (s) => s.put(blob, id));
  return id;
}

export async function getImage(id) {
  return tx("readonly", (s) => s.get(id));
}

export async function deleteImage(id) {
  await tx("readwrite", (s) => s.delete(id));
}

const urlCache = new Map();

// <img src> に使える URL。同じ画像は使い回す。
export async function imageUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = await getImage(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

// バックアップ用。指定した画像を data URL にしてまとめる。
export async function exportImages(ids) {
  const out = {};
  for (const id of ids) {
    const blob = await getImage(id);
    if (blob) out[id] = await blobToDataUrl(blob);
  }
  return out;
}

export async function importImages(map) {
  for (const [id, dataUrl] of Object.entries(map ?? {})) {
    const blob = await (await fetch(dataUrl)).blob();
    await tx("readwrite", (s) => s.put(blob, id));
  }
}
