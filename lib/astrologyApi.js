// lib/astrologyApi.js
// Vedic astrology API integration
// API: https://json.astrologyapi.com (AstrologyAPI.com)
// Uses Basic Auth: base64(user_id:api_key) - here we use the key as the api_key
// Many Vedic APIs also accept Bearer token — adjust BASE_URL & auth below to match your provider

const API_KEY = process.env.ASTROLOGY_API_KEY;

// ------------------------------------------------------------------
// AstrologyAPI.com uses   POST  with form-data body
// Base URL: https://json.astrologyapi.com/v1/
// Auth: Basic  userId:apiKey  (userId is typically a separate value)
// If your key is from a different provider swap BASE_URL + buildHeaders
// ------------------------------------------------------------------
const BASE_URL = 'https://json.astrologyapi.com/v1';

function buildHeaders() {
  // AstrologyAPI.com expects "userId:apiKey" as Basic auth
  // If you have a separate userId, set it here or in .env
  const userId = process.env.ASTROLOGY_USER_ID || 'default';
  const encoded = Buffer.from(`${userId}:${API_KEY}`).toString('base64');
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  };
}

// Convert a JS Date + time string + timezone offset to API payload
function buildPayload({ day, month, year, hour, minute, lat, lon, tzone }) {
  return { day, month, year, hour, min: minute, lat, lon, tzone };
}

async function fetchEndpoint(endpoint, payload) {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error [${endpoint}]: ${res.status} - ${text}`);
  }
  return res.json();
}

// ---- Public helpers ----

export async function getPlanetsData(birthData) {
  const payload = buildPayload(birthData);
  return fetchEndpoint('planets', payload);
}

export async function getBirthChart(birthData) {
  const payload = buildPayload(birthData);
  return fetchEndpoint('horo_chart/D1', payload);
}

export async function getHouseData(birthData) {
  const payload = buildPayload(birthData);
  return fetchEndpoint('house_cusps', payload);
}

export async function getMahadasha(birthData) {
  const payload = buildPayload(birthData);
  return fetchEndpoint('dashas/mahadasha', payload);
}

export async function getCurrentDasha(birthData) {
  const payload = buildPayload(birthData);
  return fetchEndpoint('dashas/current_mahadasha_full', payload);
}

export async function getYogas(birthData) {
  const payload = buildPayload(birthData);
  return fetchEndpoint('yoga_list', payload);
}

export async function getAscendant(birthData) {
  const payload = buildPayload(birthData);
  return fetchEndpoint('ascendant_report', payload);
}

// Gather ALL data for the AI context in one call
export async function getAllKundaliData(birthData) {
  const results = await Promise.allSettled([
    fetchEndpoint('planets', buildPayload(birthData)),
    fetchEndpoint('house_cusps', buildPayload(birthData)),
    fetchEndpoint('dashas/current_mahadasha_full', buildPayload(birthData)),
    fetchEndpoint('dashas/mahadasha', buildPayload(birthData)),
    fetchEndpoint('yoga_list', buildPayload(birthData)),
    fetchEndpoint('ascendant_report', buildPayload(birthData)),
  ]);

  const [planets, houses, currentDasha, mahadasha, yogas, ascendant] = results;

  return {
    planets: planets.status === 'fulfilled' ? planets.value : null,
    houses: houses.status === 'fulfilled' ? houses.value : null,
    currentDasha: currentDasha.status === 'fulfilled' ? currentDasha.value : null,
    mahadasha: mahadasha.status === 'fulfilled' ? mahadasha.value : null,
    yogas: yogas.status === 'fulfilled' ? yogas.value : null,
    ascendant: ascendant.status === 'fulfilled' ? ascendant.value : null,
  };
}
