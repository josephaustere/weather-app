
console.log("[app.js] loaded");

// --- Config (avoid const redeclare crashes) ---
const FORECAST_API_BASE =
  window.API_BASE || window.API_BASE_URL || "http://127.0.0.1:5001";

// --- DOM: make a private mount so other scripts don't overwrite our UI ---
const forecastRoot = document.getElementById("forecast");
if (!forecastRoot) {
  console.warn("[app.js] #forecast not found. Forecast UI disabled.");
} else {
  // Create/ensure a private child container
  let forecastMount = document.getElementById("forecast-mount");
  if (!forecastMount) {
    forecastMount = document.createElement("div");
    forecastMount.id = "forecast-mount";
    // Clear anything dumped by other scripts
    forecastRoot.innerHTML = "";
    forecastRoot.appendChild(forecastMount);
  }

  // --- Helpers ---
  const ICONS = [
    { key: "thunder", icon: "⛈️" },
    { key: "storm", icon: "⛈️" },
    { key: "rain", icon: "🌧️" },
    { key: "drizzle", icon: "🌦️" },
    { key: "snow", icon: "❄️" },
    { key: "mist", icon: "🌫️" },
    { key: "fog", icon: "🌫️" },
    { key: "haze", icon: "🌫️" },
    { key: "cloud", icon: "☁️" },
    { key: "clear", icon: "☀️" },
  ];

  function pickIcon(desc = "") {
    const d = desc.toLowerCase();
    const found = ICONS.find((x) => d.includes(x.key));
    return found ? found.icon : "🌡️";
  }

  function safeCityFromUI() {
    // Your UI uses #place for the displayed city name
    const placeEl = document.getElementById("place");
    const txt = (placeEl?.textContent || "").trim();
    if (!txt || txt === "—" || txt.toLowerCase().includes("search")) return "";
    return txt.split(",")[0].trim();
  }

  function formatDay(dateStr) {
    // dateStr like "2026-02-08"
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }

  function setLoading() {
    forecastMount.innerHTML = `<div class="forecast-loading">Loading forecast…</div>`;
  }

  function setError(msg = "Forecast unavailable") {
    forecastMount.innerHTML = `<div class="forecast-error">${msg}</div>`;
  }

  // --- Rendering ---
  function renderForecast(days) {
    forecastMount.innerHTML = "";

    if (!Array.isArray(days) || days.length === 0) {
      forecastMount.innerHTML = `<div class="forecast-empty">No forecast data</div>`;
      return;
    }

    // Build cards
    days.slice(0, 5).forEach((d) => {
      const card = document.createElement("div");
      card.className = "forecast-card";

      // supports either {max/min} or {temp}
      const hiRaw = d.max ?? d.temp ?? d.temperature;
      const loRaw = d.min ?? d.temp ?? d.temperature;

      const hi = Number.isFinite(Number(hiRaw)) ? Math.round(Number(hiRaw)) : "—";
      const lo = Number.isFinite(Number(loRaw)) ? Math.round(Number(loRaw)) : "—";

      const desc = (d.weather ?? d.description ?? "—").toString();
      const icon = pickIcon(desc);
      const day = d.date ? formatDay(d.date) : "—";

      card.innerHTML = `
        <div class="forecast-day">${day}</div>
        <div class="forecast-icon">${icon}</div>
        <div class="forecast-temp">${hi}° <span>/ ${lo}°</span></div>
        <div class="forecast-desc">${desc}</div>
      `;

      forecastMount.appendChild(card);
    });
  }

  // --- API ---
  async function fetchJson(url) {
    const r = await fetch(url);
    const text = await r.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!r.ok) throw data;
    return data;
  }

  async function loadForecast(city) {
    const c = (city || "").trim();
    if (!c) {
      forecastMount.innerHTML = `<div class="forecast-empty">Search a city to see forecast</div>`;
      return;
    }

    setLoading();

    try {
      const data = await fetchJson(
        `${FORECAST_API_BASE}/forecast?city=${encodeURIComponent(c)}`
      );
      renderForecast(data.days);
    } catch (err) {
      console.error("[forecast] error:", err);
      setError(err?.error || "Forecast unavailable");
    }
  }

  // --- Wiring: attach to existing UI buttons WITHOUT touching index.html ---
  function wire() {
    const cityInput = document.getElementById("city");
    const cityBtn = document.getElementById("cityBtn");
    const geoBtn = document.getElementById("geoBtn");
    const refreshBtn = document.getElementById("refreshBtn");

    // After city search
    if (cityBtn && cityInput) {
      cityBtn.addEventListener("click", () => {
        const city = cityInput.value.trim();
        // allow other JS to update #place first
        setTimeout(() => loadForecast(city || safeCityFromUI()), 350);
      });

      cityInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const city = cityInput.value.trim();
          setTimeout(() => loadForecast(city || safeCityFromUI()), 350);
        }
      });
    }

    // After location
    if (geoBtn) {
      geoBtn.addEventListener("click", () => {
        // location fetch + UI update takes longer
        setTimeout(() => loadForecast(safeCityFromUI()), 1400);
      });
    }

    // After refresh
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        setTimeout(() => loadForecast(safeCityFromUI()), 450);
      });
    }
  }

  // --- Start ---
  wire();

  // First paint (use whatever city is displayed)
  setTimeout(() => {
    loadForecast(safeCityFromUI() || "London");
  }, 600);
}