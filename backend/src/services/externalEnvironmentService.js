const BRASILIA = {
  name: "Brasília, DF",
  latitude: -15.7939,
  longitude: -47.8828,
  timezone: "America/Sao_Paulo"
};

const FALLBACK_DATA = {
  location: BRASILIA.name,
  source: "Open-Meteo",
  status: "fallback",
  updatedAt: new Date().toISOString(),
  aqi: 69,
  pm25: 18,
  temperature: 27,
  humidity: 58,
  carbonMonoxide: 205,
  recommendation: "Dados locais de contingência usados no momento. API externa indisponível."
};

function buildUrl(baseUrl, params) {
  const searchParams = new URLSearchParams(params);
  return `${baseUrl}?${searchParams.toString()}`;
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API externa respondeu com status ${response.status}.`);
  }

  return response.json();
}

function getRecommendation(aqi) {
  if (aqi <= 50) {
    return "Qualidade do ar normal. Condições adequadas para atividades ao ar livre.";
  }

  if (aqi <= 100) {
    return "Qualidade do ar moderada. Pessoas sensíveis devem evitar exposição prolongada.";
  }

  return "Qualidade do ar crítica. Reduza atividades externas e acompanhe novas atualizações.";
}

async function getExternalEnvironmentData() {
  try {
    const weatherUrl = buildUrl("https://api.open-meteo.com/v1/forecast", {
      latitude: BRASILIA.latitude,
      longitude: BRASILIA.longitude,
      current: "temperature_2m,relative_humidity_2m",
      timezone: BRASILIA.timezone
    });

    const airUrl = buildUrl("https://air-quality-api.open-meteo.com/v1/air-quality", {
      latitude: BRASILIA.latitude,
      longitude: BRASILIA.longitude,
      current: "us_aqi,pm2_5,carbon_monoxide",
      timezone: BRASILIA.timezone
    });

    const [weather, air] = await Promise.all([fetchJson(weatherUrl), fetchJson(airUrl)]);
    const currentWeather = weather.current || {};
    const currentAir = air.current || {};
    const aqi = Math.round(Number(currentAir.us_aqi ?? FALLBACK_DATA.aqi));

    return {
      location: BRASILIA.name,
      source: "Open-Meteo",
      status: "online",
      updatedAt: currentAir.time || currentWeather.time || new Date().toISOString(),
      aqi,
      pm25: Math.round(Number(currentAir.pm2_5 ?? FALLBACK_DATA.pm25)),
      temperature: Math.round(Number(currentWeather.temperature_2m ?? FALLBACK_DATA.temperature)),
      humidity: Math.round(Number(currentWeather.relative_humidity_2m ?? FALLBACK_DATA.humidity)),
      carbonMonoxide: Math.round(Number(currentAir.carbon_monoxide ?? FALLBACK_DATA.carbonMonoxide)),
      recommendation: getRecommendation(aqi)
    };
  } catch (error) {
    return {
      ...FALLBACK_DATA,
      updatedAt: new Date().toISOString(),
      error: error.message
    };
  }
}

module.exports = {
  getExternalEnvironmentData
};
