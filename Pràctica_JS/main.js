const CITIES = {
  barcelona: {
    name: "Barcelona",
    country: "Espanya",
    lat: 41.3851,
    lon: 2.1734,
    currency: "EUR",
    flag: "🇪🇸",
  },
  london: {
    name: "London",
    country: "Regne Unit",
    lat: 51.5074,
    lon: -0.1278,
    currency: "GBP",
    flag: "🇬🇧",
  },
  paris: {
    name: "Paris",
    country: "França",
    lat: 48.8566,
    lon: 2.3522,
    currency: "EUR",
    flag: "🇫🇷",
  },
  new_york: {
    name: "New York",
    country: "Estats Units",
    lat: 40.7128,
    lon: -74.006,
    currency: "USD",
    flag: "🇺🇸",
  },
  tokyo: {
    name: "Tokyo",
    country: "Japó",
    lat: 35.6762,
    lon: 139.6503,
    currency: "JPY",
    flag: "🇯🇵",
  },
};
const citySelect       = document.getElementById("city-select");
const dashboard        = document.getElementById("dashboard");
const errorMsg         = document.getElementById("error-msg");

const sumCity          = document.getElementById("sum-city");
const sumCountry       = document.getElementById("sum-country");
const sumTemp          = document.getElementById("sum-temp");
const sumCurrency      = document.getElementById("sum-currency");
const weatherIcon      = document.getElementById("weather-icon");
const weatherTemp      = document.getElementById("weather-temp");
const weatherDesc      = document.getElementById("weather-desc");
const weatherHumidity  = document.getElementById("weather-humidity");
const weatherRain      = document.getElementById("weather-rain");
const rainLabel        = document.getElementById("rain-label");

const eurAmount        = document.getElementById("eur-amount");
const targetCurrencyLabel = document.getElementById("target-currency-label");
const convertBtn       = document.getElementById("convert-btn");
const resultText       = document.getElementById("result-text");

const travelTip        = document.getElementById("travel-tip");

let currentCity = null;
let currentWeather = null;
let currentRate = null;

/**
 * Obté dades meteorològiques de Open-Meteo (sense API key)
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Object>}
 */
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=precipitation_probability_max&timezone=auto&forecast_days=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("No s'ha pogut obtenir el temps.");
  return response.json();
}

/**
 * Obté el tipus de canvi EUR → moneda destí via Frankfurter
 * @param {string} targetCurrency  ex: "JPY"
 * @returns {Promise<number>}  tipus de canvi
 */
async function fetchExchangeRate(targetCurrency) {
  if (targetCurrency === "EUR") return 1;
  const url = `https://api.frankfurter.app/latest?from=EUR&to=${targetCurrency}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("No s'ha pogut obtenir el tipus de canvi.");
  const data = await response.json();
  return data.rates[targetCurrency];
}


/**
 * Retorna l'emoji i el text de la condició meteorològica
 * basat en el WMO weather code
 */
function interpretWeatherCode(code) {
  if (code === 0) return { icon: "☀️", desc: "Cel clar" };
  if (code <= 2)  return { icon: "🌤️", desc: "Parcialment ennuvolat" };
  if (code <= 3)  return { icon: "☁️", desc: "Ennuvolat" };
  if (code <= 49) return { icon: "🌫️", desc: "Boira" };
  if (code <= 59) return { icon: "🌦️", desc: "Pluja lleugera" };
  if (code <= 69) return { icon: "🌧️", desc: "Pluja" };
  if (code <= 79) return { icon: "🌨️", desc: "Neu" };
  if (code <= 84) return { icon: "🌦️", desc: "Xàfecs" };
  return { icon: "⛈️", desc: "Tempesta" };
}

/**
 * Retorna el text i la classe CSS per la probabilitat de pluja
 */
function interpretRainProb(prob) {
  if (prob <= 20) return { text: "☀️ Sense pluja", cls: "rain-label--low" };
  if (prob <= 50) return { text: "🌦️ Possible pluja", cls: "rain-label--mid" };
  return { text: "🌧️ Probable pluja", cls: "rain-label--high" };
}

/**
 * Genera el missatge de recomanació de viatge
 */
function generateTip(city, tempC, rainProb, rate, eurVal) {
  const tips = [];

  if (tempC >= 25) {
    tips.push(`☀️ Avui fa bon temps per passejar per ${city.name}: ${tempC}°C i molt assolellat.`);
  } else if (tempC >= 15) {
    tips.push(`🧥 Temperatura agradable a ${city.name} (${tempC}°C). Porta una jaqueta lleugera.`);
  } else {
    tips.push(`🧤 Recorda portar jaqueta: la temperatura a ${city.name} és de ${tempC}°C.`);
  }

  if (rainProb > 50) {
    tips.push("☔ Alta probabilitat de pluja — no oblidis el paraigua!");
  }

  if (city.currency !== "EUR") {
    const converted = (eurVal * rate).toFixed(2);
    tips.push(`💱 ${eurVal} EUR equivalen a ${converted} ${city.currency}.`);
  }

  return tips.join(" ");
}

/**
 * Mostra un error a l'usuari
 */
function showError(msg) {
  errorMsg.textContent = "⚠️ " + msg;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
  errorMsg.textContent = "";
}

function renderSummary(city, tempC) {
  sumCity.textContent     = `${city.flag} ${city.name}`;
  sumCountry.textContent  = city.country;
  sumTemp.textContent     = `${tempC}°C`;
  sumCurrency.textContent = city.currency;
}

function renderWeather(weatherData) {
  const curr = weatherData.current;
  const rainProb = weatherData.daily.precipitation_probability_max[0];
  const { icon, desc } = interpretWeatherCode(curr.weather_code);
  const { text, cls }  = interpretRainProb(rainProb);

  weatherIcon.textContent     = icon;
  weatherTemp.textContent     = `${curr.temperature_2m}°C`;
  weatherDesc.textContent     = desc;
  weatherHumidity.textContent = `${curr.relative_humidity_2m}%`;
  weatherRain.textContent     = `${rainProb}%`;

  rainLabel.textContent = text;
  rainLabel.className   = `rain-label ${cls}`;

  return { tempC: curr.temperature_2m, rainProb };
}

function renderCurrency(city) {
  targetCurrencyLabel.textContent = city.currency;
  resultText.textContent = "Introdueix una quantitat i prem Convertir";
}


async function loadCityData(cityKey) {
  const city = CITIES[cityKey];
  currentCity = city;
  hideError();

  dashboard.classList.remove("hidden");


  weatherIcon.textContent = "⏳";
  weatherTemp.textContent = "—";
  weatherDesc.textContent = "Carregant...";
  weatherHumidity.textContent = "—";
  weatherRain.textContent = "—";
  rainLabel.textContent = "—";
  rainLabel.className = "rain-label";
  travelTip.textContent = "Carregant recomanació...";

  try {
    // 1. Temps
    const weatherData = await fetchWeather(city.lat, city.lon);
    currentWeather = weatherData;
    const { tempC, rainProb } = renderWeather(weatherData);

    // 2. Resum
    renderSummary(city, tempC);

    // 3. Moneda
    currentRate = await fetchExchangeRate(city.currency);
    renderCurrency(city);

    // 4. Tip
    const eurVal = parseFloat(eurAmount.value) || 100;
    travelTip.textContent = generateTip(city, tempC, rainProb, currentRate, eurVal);

  } catch (error) {
    showError(error.message);
  }
}


async function handleConvert() {
  if (!currentCity) return;

  const amount = parseFloat(eurAmount.value);
  if (isNaN(amount) || amount < 0) {
    resultText.textContent = "Introdueix una quantitat vàlida.";
    return;
  }

  try {
    if (!currentRate) {
      currentRate = await fetchExchangeRate(currentCity.currency);
    }
    const converted = (amount * currentRate).toFixed(2);
    resultText.textContent = `${amount} EUR = ${converted} ${currentCity.currency}`;

    if (currentWeather) {
      const tempC    = currentWeather.current.temperature_2m;
      const rainProb = currentWeather.daily.precipitation_probability_max[0];
      travelTip.textContent = generateTip(currentCity, tempC, rainProb, currentRate, amount);
    }
  } catch (error) {
    resultText.textContent = "Error en obtenir el tipus de canvi.";
    showError(error.message);
  }
}

citySelect.addEventListener("change", (e) => {
  const value = e.target.value;
  if (value) {
    loadCityData(value);
  } else {
    dashboard.classList.add("hidden");
    hideError();
    currentCity = null;
  }
});

convertBtn.addEventListener("click", handleConvert);

eurAmount.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleConvert();
});