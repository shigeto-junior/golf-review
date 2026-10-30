// 衛星写真の地図と、GPS による距離表示。
// 地図は Leaflet + Esri World Imagery（無料、出典表示が必要）。地図を開いたときだけ読み込む。

// Leaflet 1.9.4 はオフラインでも読めるよう vendor/ に同梱している
const LEAFLET_CSS = "./vendor/leaflet/leaflet.css";
const LEAFLET_JS = "./vendor/leaflet/leaflet.js";
const TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
// 出典表示は地図の下のパネルに出す（地図の上に重なって読めなくなるため）
export const TILE_ATTRIBUTION = "地図: Leaflet ｜ 衛星写真 &copy; Esri, Maxar, Earthstar Geographics";

let leafletPromise = null;

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = LEAFLET_JS;
      js.onload = () => resolve(window.L);
      js.onerror = () => {
        leafletPromise = null;
        reject(new Error("地図を読み込めませんでした。アプリを開き直してください"));
      };
      document.head.appendChild(js);
    });
  }
  return leafletPromise;
}

export function createSatelliteMap(L, el, center, zoom) {
  const map = L.map(el, { zoomControl: false, attributionControl: false }).setView(center, zoom);
  L.tileLayer(TILE_URL, { maxZoom: 20, maxNativeZoom: 19 }).addTo(map);
  return map;
}

// 2点間の距離（メートル）
export function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function yards(a, b) {
  return Math.round(distanceMeters(a, b) * 1.09361);
}

// 現在地を見張る。止めるときは戻り値の関数を呼ぶ。
export function watchLocation(onChange, onError) {
  if (!navigator.geolocation) {
    onError?.(new Error("この端末では位置情報が使えません"));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
    (err) => onError?.(err),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

// コース名から場所を探す（OpenStreetMap の Nominatim）。家でグリーン位置を登録するとき用。
export async function searchPlace(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "ja" } });
  if (!res.ok) throw new Error("検索できませんでした");
  return (await res.json()).map((r) => ({ name: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }));
}
