const API_URL = window.location.origin.startsWith("http")
  ? window.location.origin
  : "http://localhost:3001";

const state = {
  token: localStorage.getItem("ecovision_token"),
  user: JSON.parse(localStorage.getItem("ecovision_user") || "null"),
  filters: {
    status: "",
    severity: "",
    category: "",
    location: ""
  },
  environmentalData: {
    labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    airQuality: [38, 42, 55, 61, 48, 44, 52],
    temperature: [24, 25, 27, 29, 28, 26, 27],
    humidity: [68, 64, 61, 56, 59, 63, 60],
    co2: [620, 680, 760, 890, 820, 740, 780],
    previousAverage: 47
  }
};

const streamingSeed = {
  labels: [...state.environmentalData.labels],
  airQuality: [...state.environmentalData.airQuality],
  temperature: [22, 23, 24, 25, 26, 25, 24],
  humidity: [62, 61, 60, 59, 58, 59, 60],
  co2: [680, 705, 728, 760, 790, 770, 745]
};

const API_POLLING_INTERVAL_MS = 30000;
const demoMonitoredLocations = [
  "Plano Piloto, Brasilia - DF",
  "Lago Paranoa, Brasilia - DF",
  "Eixo Monumental, Brasilia - DF"
];

const chartMetricStyles = {
  airQuality: {
    axis: "airQualityAxis",
    color: "#1f7a4c",
    background: "rgba(31, 122, 76, 0.12)"
  },
  temperature: {
    axis: "temperatureAxis",
    color: "#c26a21"
  },
  humidity: {
    axis: "humidityAxis",
    color: "#2d6cdf"
  },
  co2: {
    axis: "co2Axis",
    color: "#e25555"
  }
};

let environmentChart = null;
let reportsMap = null;
let reportMarkers = [];
let liveTimer = null;
let apiStreamTimer = null;
let streamIndex = 0;

const loginScreen = document.querySelector("#loginScreen");
const dashboardScreen = document.querySelector("#dashboardScreen");
const authMessage = document.querySelector("#authMessage");
const reportMessage = document.querySelector("#reportMessage");
const filterMessage = document.querySelector("#filterMessage");
const reportsList = document.querySelector("#reportsList");
const pendingAnalysisList = document.querySelector("#pendingAnalysisList");
const pendingAnalysisCounter = document.querySelector("#pendingAnalysisCounter");
const alertsList = document.querySelector("#alertsList");
const alertCounter = document.querySelector("#alertCounter");
const evidenceImageInput = document.querySelector("#evidenceImage");
const evidencePreview = document.querySelector("#evidencePreview");
const reportTitleInput = document.querySelector("#reportTitle");
const reportDescriptionInput = document.querySelector("#reportDescription");
const reportCategoryInput = document.querySelector("#reportCategory");
const submitReportButton = document.querySelector("#submitReportButton");
const descriptionCounter = document.querySelector("#descriptionCounter");
const analyzeButton = document.querySelector("#analyzeButton");
const analysisResult = document.querySelector("#analysisResult");
const analysisProgress = document.querySelector("#analysisProgress");
const riskMeterFill = document.querySelector("#riskMeterFill");
const riskMeterLabel = document.querySelector("#riskMeterLabel");

document.querySelectorAll(".presentation-link").forEach((link) => {
  if (window.location.protocol === "file:") {
    link.href = "../backend/sql/site-ecovision-ai/ecovision-ai-apresentacao.html";
  }
});

const locationCoordinates = {
  "plano piloto": [-15.7939, -47.8828],
  "brasília": [-15.7939, -47.8828],
  "brasilia": [-15.7939, -47.8828],
  "lago paranoá": [-15.8099, -47.8072],
  "lago paranoa": [-15.8099, -47.8072],
  "eixo monumental": [-15.7835, -47.8992],
  "asa norte": [-15.7598, -47.8826],
  "asa sul": [-15.8201, -47.8977],
  "taguatinga": [-15.8328, -48.0568],
  "ceilândia": [-15.8192, -48.1082],
  "ceilandia": [-15.8192, -48.1082]
};

function setSession({ token, user }) {
  state.token = token;
  state.user = user;
  localStorage.setItem("ecovision_token", token);
  localStorage.setItem("ecovision_user", JSON.stringify(user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("ecovision_token");
  localStorage.removeItem("ecovision_user");
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Erro na requisição.");
  }

  return data;
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatStatus(status) {
  const labels = {
    pendente: "Pendente",
    em_analise: "Em análise",
    resolvida: "Resolvida",
    arquivada: "Arquivada"
  };

  return labels[status] || status;
}

function formatSeverity(severity) {
  const labels = {
    baixa: "baixa",
    media: "média",
    alta: "alta"
  };

  return labels[severity] || severity;
}

function formatRisk(risk) {
  const labels = {
    baixo: "baixo",
    medio: "médio",
    alto: "alto"
  };

  return labels[risk] || risk;
}

function formatRecommendation(text) {
  return String(text || "")
    .replace(/\borgaos\b/gi, "órgãos")
    .replace(/\bevidencias\b/gi, "evidências")
    .replace(/\btecnica\b/gi, "técnica")
    .replace(/\breincidencia\b/gi, "reincidência");
}

function buildReportQuery() {
  const params = new URLSearchParams();

  Object.entries(state.filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

function readEvidenceImage() {
  const file = evidenceImageInput.files[0];

  if (!file) {
    return Promise.resolve("");
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return Promise.reject(new Error("Envie uma imagem PNG, JPG ou WebP."));
  }

  if (file.size > 3 * 1024 * 1024) {
    return Promise.reject(new Error("A imagem deve ter no máximo 3 MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    reader.readAsDataURL(file);
  });
}

function clearEvidencePreview() {
  evidenceImageInput.value = "";
  evidencePreview.classList.add("hidden");
  evidencePreview.innerHTML = "";
}

function renderEvidencePreview(file) {
  if (!file) {
    clearEvidencePreview();
    return;
  }

  const imageUrl = URL.createObjectURL(file);
  evidencePreview.classList.remove("hidden");
  evidencePreview.innerHTML = `
    <img src="${imageUrl}" alt="Prévia da evidência enviada">
    <button type="button" class="secondary" id="removeEvidenceImage">Remover imagem</button>
  `;
}

function updateReportFormState() {
  const descriptionLength = reportDescriptionInput.value.length;
  const hasRequiredData = Boolean(
    reportTitleInput.value.trim() &&
    reportDescriptionInput.value.trim() &&
    reportCategoryInput.value
  );

  descriptionCounter.textContent = `${descriptionLength}/500`;
  submitReportButton.disabled = !hasRequiredData;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setAnalysisVisualState(risk = "") {
  const config = {
    baixo: { width: "35%", color: "var(--green)", label: "Risco baixo" },
    medio: { width: "65%", color: "var(--amber)", label: "Risco médio" },
    alto: { width: "92%", color: "var(--danger)", label: "Risco alto" }
  };

  const current = config[risk] || { width: "12%", color: "var(--teal)", label: "Aguardando texto" };
  riskMeterFill.style.width = current.width;
  riskMeterFill.style.background = current.color;
  riskMeterLabel.textContent = current.label;
}

function setAnalysisResultState(className) {
  analysisResult.classList.remove("processing", "risk-baixo", "risk-medio", "risk-alto");

  if (className) {
    analysisResult.classList.add(className);
  }
}

function getLastValue(values) {
  return values[values.length - 1] || 0;
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function getSensorStatus(type, value) {
  if (type === "airQuality") {
    if (value <= 50) return { level: "normal", label: "🟢 Normal" };
    if (value <= 75) return { level: "attention", label: "🟡 Moderado" };
    return { level: "critical", label: "🔴 Crítico" };
  }

  if (type === "temperature") {
    if (value <= 28) return { level: "normal", label: "🟢 Normal" };
    if (value <= 34) return { level: "attention", label: "🟡 Moderado" };
    return { level: "critical", label: "🔴 Crítico" };
  }

  if (type === "humidity") {
    if (value >= 40 && value <= 70) return { level: "normal", label: "🟢 Normal" };
    if (value >= 30 && value <= 80) return { level: "attention", label: "🟡 Moderado" };
    return { level: "critical", label: "🔴 Crítico" };
  }

  if (value <= 800) return { level: "normal", label: "🟢 Normal" };
  if (value <= 1200) return { level: "attention", label: "🟡 Moderado" };
  return { level: "critical", label: "🔴 Crítico" };
}

function getAlertMessage(type, value, status) {
  const messages = {
    airQuality: {
      attention: `🌫️ Qualidade do ar moderada (${value} AQI)`,
      critical: `🌫️ Qualidade do ar crítica (${value} AQI)`
    },
    temperature: {
      attention: `🔥 Temperatura elevada (${value}°C)`,
      critical: `🔥 Temperatura elevada (${value}°C)`
    },
    humidity: {
      attention: `💧 Umidade fora da faixa ideal (${value}%)`,
      critical: `💧 Umidade crítica (${value}%)`
    },
    co2: {
      attention: `🌿 CO₂ acima do ideal (${value} ppm)`,
      critical: `🌿 CO₂ crítico (${value} ppm)`
    }
  };

  return messages[type]?.[status.level] || "";
}

function getAlertRecommendation(type, status) {
  if (type === "temperature" && status.level !== "normal") {
    return "Risco de desconforto térmico. Hidrate-se e evite sol intenso.";
  }

  if (type === "airQuality" && status.level !== "normal") {
    return "Pessoas sensíveis devem evitar exposição prolongada.";
  }

  if (type === "humidity" && status.level !== "normal") {
    return "Acompanhe a hidratação e evite exposição prolongada em horários críticos.";
  }

  if (type === "co2" && status.level !== "normal") {
    return "Ambiente pode estar mal ventilado. Recomenda-se circulação de ar.";
  }

  return "";
}

function getAirQualityInsight(status) {
  if (status.level === "normal") {
    return "Qualidade do ar boa. Condições adequadas para atividades ao ar livre.";
  }

  if (status.level === "attention") {
    return "Qualidade do ar moderada. Pessoas sensíveis devem evitar exposição prolongada.";
  }

  return "Qualidade do ar ruim. Reduza atividades externas e acompanhe os alertas.";
}

function getSensorInsight(type, status, value) {
  if (type === "airQuality") {
    return getAirQualityInsight(status);
  }

  if (type === "temperature") {
    if (status.level === "normal") {
      return `Temperatura em ${value}°C, dentro da faixa confortavel para monitoramento em campo.`;
    }

    if (status.level === "attention") {
      return `Temperatura em ${value}°C. Reforce hidratacao e reduza exposicao ao sol.`;
    }

    return `Temperatura critica em ${value}°C. Priorize alertas e atividades emergenciais.`;
  }

  if (type === "humidity") {
    if (status.level === "normal") {
      return `Umidade em ${value}%, faixa adequada para conforto ambiental.`;
    }

    if (value < 40) {
      return `Umidade baixa em ${value}%. Acompanhe risco de ar seco e focos de queimada.`;
    }

    return `Umidade elevada em ${value}%. Observe risco de saturacao e pontos de alagamento.`;
  }

  if (status.level === "normal") {
    return `CO2 em ${value} ppm, indicando boa circulacao de ar.`;
  }

  if (status.level === "attention") {
    return `CO2 em ${value} ppm. Recomenda-se melhorar ventilacao e acompanhar a tendencia.`;
  }

  return `CO2 critico em ${value} ppm. Verifique ventilacao e priorize resposta operacional.`;
}

function getTrendLabel(values) {
  if (values.length < 2) {
    return "estavel";
  }

  const previous = values[values.length - 2];
  const current = values[values.length - 1];
  const difference = current - previous;

  if (Math.abs(difference) <= 1) {
    return "estavel";
  }

  return difference > 0 ? "subindo" : "caindo";
}

function renderSensorDetails(elementId, values, unit) {
  const element = document.querySelector(elementId);
  const currentValues = values.filter((value) => Number.isFinite(value));

  if (!currentValues.length) {
    element.innerHTML = "";
    return;
  }

  const min = Math.min(...currentValues);
  const max = Math.max(...currentValues);
  const avg = average(currentValues);
  const trend = getTrendLabel(currentValues);

  element.innerHTML = `
    <div>
      <dt>Media</dt>
      <dd>${avg}${unit}</dd>
    </div>
    <div>
      <dt>Faixa</dt>
      <dd>${min}-${max}${unit}</dd>
    </div>
    <div>
      <dt>Tendencia</dt>
      <dd>${trend}</dd>
    </div>
  `;
}

function getActiveAlerts() {
  const data = state.environmentalData;
  const sensors = [
    { type: "airQuality", label: "Qualidade do ar", value: getLastValue(data.airQuality) },
    { type: "temperature", label: "Temperatura", value: getLastValue(data.temperature) },
    { type: "humidity", label: "Umidade", value: getLastValue(data.humidity) },
    { type: "co2", label: "CO₂", value: getLastValue(data.co2) }
  ];

  return sensors
    .map((sensor) => {
      const status = getSensorStatus(sensor.type, sensor.value);

      return {
        ...sensor,
        status,
        message: getAlertMessage(sensor.type, sensor.value, status),
        recommendation: getAlertRecommendation(sensor.type, status)
      };
    })
    .filter((alert) => alert.status.level !== "normal");
}

function renderAlerts() {
  const alerts = getActiveAlerts();
  alertCounter.textContent = `${alerts.length} ${alerts.length === 1 ? "ativo" : "ativos"}`;
  alertCounter.classList.toggle("has-alerts", alerts.length > 0);

  if (!alerts.length) {
    alertsList.innerHTML = "<p class=\"muted\">Nenhum alerta ativo.</p>";
    return;
  }

  alertsList.innerHTML = alerts
    .map((alert) => {
      return `
        <article class="alerta alert-item ${alert.status.level}">
          <div>
            <strong>${escapeHTML(alert.message)}</strong>
            <span>${escapeHTML(alert.label)} · ${escapeHTML(alert.status.label)}</span>
            ${alert.recommendation ? `<p class="alert-recommendation">${escapeHTML(alert.recommendation)}</p>` : ""}
          </div>
          <small>Atualizado agora</small>
        </article>
      `;
    })
    .join("");
}

function updateSensorCard(cardId, valueId, labelId, type, value) {
  const card = document.querySelector(cardId);
  const valueElement = document.querySelector(valueId);
  const labelElement = document.querySelector(labelId);
  const status = getSensorStatus(type, value);

  valueElement.textContent = value;
  labelElement.textContent = status.label;
  card.classList.remove("normal", "attention", "critical");
  card.classList.add(status.level);

  return status;
}

function renderSensorCards() {
  const data = state.environmentalData;
  const currentAirQuality = getLastValue(data.airQuality);
  const currentTemperature = getLastValue(data.temperature);
  const currentHumidity = getLastValue(data.humidity);
  const currentCo2 = getLastValue(data.co2);

  const airQualityStatus = updateSensorCard(
    "#airQualityCard",
    "#airQualityValue",
    "#airQualityLabel",
    "airQuality",
    currentAirQuality
  );
  document.querySelector("#airQualityInsight").textContent = getAirQualityInsight(airQualityStatus);
  renderSensorDetails("#airQualityDetails", data.airQuality, " AQI");

  const temperatureStatus = updateSensorCard(
    "#temperatureCard",
    "#temperatureValue",
    "#temperatureLabel",
    "temperature",
    currentTemperature
  );
  document.querySelector("#temperatureInsight").textContent = getSensorInsight("temperature", temperatureStatus, currentTemperature);
  renderSensorDetails("#temperatureDetails", data.temperature, "°C");

  const humidityStatus = updateSensorCard(
    "#humidityCard",
    "#humidityValue",
    "#humidityLabel",
    "humidity",
    currentHumidity
  );
  document.querySelector("#humidityInsight").textContent = getSensorInsight("humidity", humidityStatus, currentHumidity);
  renderSensorDetails("#humidityDetails", data.humidity, "%");

  const co2Status = updateSensorCard("#co2Card", "#co2Value", "#co2Label", "co2", currentCo2);
  document.querySelector("#co2Insight").textContent = getSensorInsight("co2", co2Status, currentCo2);
  renderSensorDetails("#co2Details", data.co2, " ppm");
}

function renderComparison() {
  const currentAverage = average(state.environmentalData.airQuality);
  const previousAverage = state.environmentalData.previousAverage;
  const variation = previousAverage
    ? Math.round(((currentAverage - previousAverage) / previousAverage) * 100)
    : 0;

  document.querySelector("#todayAverage").textContent = currentAverage;
  document.querySelector("#previousAverage").textContent = previousAverage;
  document.querySelector("#weeklyVariation").textContent = `${variation > 0 ? "+" : ""}${variation}%`;
  document.querySelector("#variationLabel").textContent = variation > 0 ? "piora no período" : "melhora no período";
}

function renderEnvironmentChart() {
  const canvas = document.querySelector("#environmentChart");
  const fallback = document.querySelector("#chartFallback");

  if (!window.Chart) {
    canvas.classList.add("hidden");
    fallback.classList.remove("hidden");
    return;
  }

  const data = state.environmentalData;

  if (!environmentChart) {
    environmentChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Qualidade do ar",
            data: data.airQuality,
            borderColor: chartMetricStyles.airQuality.color,
            backgroundColor: chartMetricStyles.airQuality.background,
            yAxisID: chartMetricStyles.airQuality.axis,
            tension: 0.35,
            fill: true
          },
          {
            label: "Temperatura °C",
            data: data.temperature,
            borderColor: chartMetricStyles.temperature.color,
            yAxisID: chartMetricStyles.temperature.axis,
            tension: 0.35
          },
          {
            label: "Umidade %",
            data: data.humidity,
            borderColor: chartMetricStyles.humidity.color,
            yAxisID: chartMetricStyles.humidity.axis,
            tension: 0.35
          },
          {
            label: "CO₂ ppm",
            data: data.co2,
            borderColor: chartMetricStyles.co2.color,
            yAxisID: chartMetricStyles.co2.axis,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          intersect: false,
          mode: "index"
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              boxWidth: 8
            },
            onClick(event, legendItem, legend) {
              const chart = legend.chart;
              const datasetIndex = legendItem.datasetIndex;
              chart.setDatasetVisibility(datasetIndex, !chart.isDatasetVisible(datasetIndex));
              chart.update();
            }
          }
        },
        animation: {
          duration: 520,
          easing: "easeOutQuart"
        },
        scales: {
          airQualityAxis: {
            beginAtZero: true,
            suggestedMax: 100,
            position: "left",
            title: {
              display: true,
              text: "AQI",
              color: chartMetricStyles.airQuality.color
            },
            ticks: {
              color: chartMetricStyles.airQuality.color
            },
            grid: {
              color: "rgba(15, 61, 46, 0.08)"
            }
          },
          temperatureAxis: {
            suggestedMin: 20,
            suggestedMax: 40,
            position: "right",
            title: {
              display: true,
              text: "C",
              color: chartMetricStyles.temperature.color
            },
            ticks: {
              color: chartMetricStyles.temperature.color
            },
            grid: {
              drawOnChartArea: false
            }
          },
          humidityAxis: {
            suggestedMin: 40,
            suggestedMax: 100,
            position: "left",
            title: {
              display: true,
              text: "%",
              color: chartMetricStyles.humidity.color
            },
            ticks: {
              color: chartMetricStyles.humidity.color
            },
            grid: {
              drawOnChartArea: false
            }
          },
          co2Axis: {
            beginAtZero: false,
            suggestedMin: 500,
            suggestedMax: 1200,
            position: "right",
            title: {
              display: true,
              text: "CO2 ppm",
              color: chartMetricStyles.co2.color
            },
            ticks: {
              color: chartMetricStyles.co2.color
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
    return;
  }

  environmentChart.data.labels = data.labels;
  environmentChart.data.datasets[0].data = data.airQuality;
  environmentChart.data.datasets[1].data = data.temperature;
  environmentChart.data.datasets[2].data = data.humidity;
  environmentChart.data.datasets[3].data = data.co2;
  environmentChart.update();
}

function setExternalApiState(stateName) {
  const card = document.querySelector("#externalApiCard");
  card.classList.remove("is-loading", "is-success", "is-error", "is-fallback");
  card.classList.add(`is-${stateName}`);
}

function renderExternalEnvironment(data) {
  setExternalApiState(data.status === "online" ? "success" : "fallback");
  document.querySelector("#externalApiTitle").textContent = `${data.source} · ${data.location}`;
  document.querySelector("#externalAqi").textContent = data.aqi;
  document.querySelector("#externalTemperature").textContent = `${data.temperature}°C`;
  document.querySelector("#externalHumidity").textContent = `${data.humidity}%`;
  document.querySelector("#externalPm25").textContent = data.pm25;
  document.querySelector("#externalApiRecommendation").textContent = data.recommendation;
  document.querySelector("#externalApiStatus").textContent = data.status === "online" ? "Dados públicos em tempo real" : "Fallback local ativado";
}

function normalizeApiPoint(data) {
  return {
    airQuality: clamp(Number(data.aqi) || getLastValue(state.environmentalData.airQuality), 38, 95),
    temperature: clamp(Number(data.temperature) || getLastValue(state.environmentalData.temperature), 22, 26),
    humidity: clamp(Number(data.humidity) || getLastValue(state.environmentalData.humidity), 52, 66),
    co2: getRealisticNextValue(state.environmentalData.co2, 650, 980, 35)
  };
}

function renderExternalEnvironmentError() {
  setExternalApiState("error");
  document.querySelector("#externalAqi").textContent = "--";
  document.querySelector("#externalTemperature").textContent = "--";
  document.querySelector("#externalHumidity").textContent = "--";
  document.querySelector("#externalPm25").textContent = "--";
  document.querySelector("#externalApiRecommendation").textContent = "Não foi possível conectar aos sensores. Tente novamente.";
  document.querySelector("#externalApiStatus").textContent = "Erro de conexão";
}

async function loadExternalEnvironment() {
  const status = document.querySelector("#externalApiStatus");
  setExternalApiState("loading");
  status.innerHTML = "<span class=\"loading-dot\" aria-hidden=\"true\"></span>Carregando sensores externos...";

  try {
    const data = await window.apiService.getAmbientalData();
    renderExternalEnvironment(data);
    return data;
  } catch (error) {
    renderExternalEnvironmentError();
    return null;
  }
}

function getCoordinates(report, index) {
  const key = String(report.location || "").toLowerCase();
  const match = Object.keys(locationCoordinates).find((location) => key.includes(location));

  if (match) {
    return locationCoordinates[match];
  }

  return [-15.7939 + index * 0.012, -47.8828 + index * 0.014];
}

function getSeverityColor(severity) {
  if (severity === "alta") return "#b42318";
  if (severity === "media") return "#c26a21";
  return "#1f7a4c";
}

function renderReportsMap(reports) {
  const mapElement = document.querySelector("#reportsMap");
  const fallback = document.querySelector("#mapFallback");

  if (!window.L) {
    mapElement.classList.add("hidden");
    fallback.classList.remove("hidden");
    return;
  }

  if (!reportsMap) {
    reportsMap = L.map("reportsMap", {
      scrollWheelZoom: false
    }).setView([-15.7939, -47.8828], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(reportsMap);
  }

  reportMarkers.forEach((marker) => marker.remove());
  reportMarkers = reports.map((report, index) => {
    const coordinates = getCoordinates(report, index);

    return L.circleMarker(coordinates, {
      radius: 9,
      color: getSeverityColor(report.severity),
      fillColor: getSeverityColor(report.severity),
      fillOpacity: 0.78,
      weight: 2
    })
      .addTo(reportsMap)
      .bindPopup(`
        <strong>${escapeHTML(report.title)}</strong><br>
        ${escapeHTML(report.location)}<br>
        ${formatStatus(report.status)} · ${formatSeverity(report.severity)}
      `);
  });

  setTimeout(() => reportsMap.invalidateSize(), 80);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRealisticNextValue(values, min, max, step) {
  const previous = getLastValue(values) || Math.round((min + max) / 2);
  const variation = Math.round((Math.random() * step * 2 - step) * 10) / 10;
  return Math.round(clamp(previous + variation, min, max));
}

function pushEnvironmentalPoint(label, point) {
  const data = state.environmentalData;

  data.airQuality.push(point.airQuality);
  data.temperature.push(point.temperature);
  data.humidity.push(point.humidity);
  data.co2.push(point.co2);
  data.labels.push(label);

  Object.keys(data).forEach((key) => {
    if (Array.isArray(data[key]) && data[key].length > 7) {
      data[key].shift();
    }
  });

  renderSensorCards();
  renderAlerts();
  renderComparison();
  renderEnvironmentChart();
  document.querySelector("#lastUpdate").textContent = "Última atualização: agora";
}

function streamNextSensorPoint() {
  if (streamIndex < streamingSeed.labels.length) {
    pushEnvironmentalPoint(streamingSeed.labels[streamIndex], {
      airQuality: streamingSeed.airQuality[streamIndex],
      temperature: streamingSeed.temperature[streamIndex],
      humidity: streamingSeed.humidity[streamIndex],
      co2: streamingSeed.co2[streamIndex]
    });
    streamIndex += 1;
    return;
  }

  pushEnvironmentalPoint("Agora", {
    airQuality: getRealisticNextValue(state.environmentalData.airQuality, 38, 72, 4),
    temperature: getRealisticNextValue(state.environmentalData.temperature, 22, 26, 1),
    humidity: getRealisticNextValue(state.environmentalData.humidity, 52, 66, 2),
    co2: getRealisticNextValue(state.environmentalData.co2, 650, 980, 35)
  });
}

async function streamExternalApiPoint() {
  const data = await loadExternalEnvironment();

  if (!data) {
    return;
  }

  pushEnvironmentalPoint("API", normalizeApiPoint(data));
}

function startLiveDashboard() {
  if (liveTimer) {
    clearInterval(liveTimer);
    liveTimer = null;
  }

  if (apiStreamTimer) {
    clearInterval(apiStreamTimer);
    apiStreamTimer = null;
  }

  state.environmentalData.labels = [];
  state.environmentalData.airQuality = [];
  state.environmentalData.temperature = [];
  state.environmentalData.humidity = [];
  state.environmentalData.co2 = [];
  streamIndex = 0;

  renderSensorCards();
  renderAlerts();
  renderComparison();
  renderEnvironmentChart();

  streamNextSensorPoint();

  liveTimer = setInterval(streamNextSensorPoint, 1000);
  apiStreamTimer = setInterval(streamExternalApiPoint, API_POLLING_INTERVAL_MS);
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");
  document.querySelector("#userName").textContent = state.user?.name || "";
  document.querySelector("#lastUpdate").textContent = "Última atualização: agora";
  startLiveDashboard();
  loadExternalEnvironment();
  loadDashboard();
}

function showLogin() {
  dashboardScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}

async function loadDashboard() {
  const [stats, reports, pendingAnalysisReports] = await Promise.all([
    api("/reports/stats"),
    api(`/reports${buildReportQuery()}`),
    api("/reports?status=pendente")
  ]);

  document.querySelector("#totalReports").textContent = stats.total_reports || 0;
  document.querySelector("#highSeverity").textContent = stats.high_severity || 0;
  document.querySelector("#pendingReports").textContent = stats.pending_reports || 0;
  document.querySelector("#monitoredLocations").textContent = stats.monitored_locations || demoMonitoredLocations.length;
  document.querySelector("#monitoredLocationsSummary").textContent = formatLocationSummary(stats.monitored_location_names);

  renderPendingAnalysis(pendingAnalysisReports);
  renderReports(reports);
  renderReportsMap(reports);
}

function formatLocationSummary(locations = []) {
  const visibleLocations = locations.filter(Boolean).slice(0, 3);
  const displayLocations = visibleLocations.length ? visibleLocations : demoMonitoredLocations;

  return `Demo: ${displayLocations.join(" · ")}`;
}

function renderPendingAnalysis(reports) {
  pendingAnalysisList.innerHTML = "";
  pendingAnalysisCounter.textContent = `${reports.length} ${reports.length === 1 ? "pendente" : "pendentes"}`;
  pendingAnalysisCounter.classList.toggle("has-alerts", reports.length > 0);

  if (!reports.length) {
    pendingAnalysisList.innerHTML = "<p class=\"muted\">Nenhuma pendencia de analise.</p>";
    return;
  }

  reports.forEach((report) => {
    const item = document.createElement("article");
    item.className = `pending-item ${escapeHTML(report.severity)}`;
    item.innerHTML = `
      <div>
        <strong>${escapeHTML(report.title)}</strong>
        <span>${escapeHTML(report.location)}</span>
      </div>
      <div class="badges">
        <span class="badge ${escapeHTML(report.severity)}">${formatSeverity(report.severity)}</span>
        <span class="badge">${escapeHTML(report.category)}</span>
        <span class="badge status-pendente">Pendente</span>
      </div>
    `;
    pendingAnalysisList.appendChild(item);
  });
}

function renderReports(reports) {
  reportsList.innerHTML = "";

  if (!reports.length) {
    reportsList.innerHTML = "<p class=\"muted\">Nenhuma denúncia encontrada.</p>";
    return;
  }

  reports.forEach((report) => {
    const item = document.createElement("article");
    item.className = "report-item";
    item.innerHTML = `
      <div class="report-heading">
        <h4>${escapeHTML(report.title)}</h4>
        <span class="badge status-${escapeHTML(report.status)}">${formatStatus(report.status)}</span>
      </div>
      <p>${escapeHTML(report.description)}</p>
      <div class="badges">
        <span class="badge ${escapeHTML(report.severity)}">${formatSeverity(report.severity)}</span>
        <span class="badge">${escapeHTML(report.category)}</span>
        <span class="badge">${escapeHTML(report.location)}</span>
        <span class="badge">${escapeHTML(report.user_name || "Sem responsável")}</span>
      </div>
      ${
        report.evidence_image
          ? `<img class="report-evidence" src="${escapeHTML(report.evidence_image)}" alt="Evidência fotográfica da denúncia">`
          : ""
      }
      <label class="status-control">
        Status
        <select data-report-status="${report.id}">
          <option value="pendente" ${report.status === "pendente" ? "selected" : ""}>Pendente</option>
          <option value="em_analise" ${report.status === "em_analise" ? "selected" : ""}>Em análise</option>
          <option value="resolvida" ${report.status === "resolvida" ? "selected" : ""}>Resolvida</option>
          <option value="arquivada" ${report.status === "arquivada" ? "selected" : ""}>Arquivada</option>
        </select>
      </label>
    `;
    reportsList.appendChild(item);
  });
}

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "Autenticando...";

  try {
    const data = await api("/users/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.querySelector("#email").value,
        password: document.querySelector("#password").value
      })
    });

    setSession(data);
    authMessage.textContent = "";
    showDashboard();
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

document.querySelector("#createDemoUser").addEventListener("click", async () => {
  authMessage.textContent = "Criando usuário demo...";

  try {
    await api("/users/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Ana Verde",
        email: "ana@ecovision.com",
        password: "123456"
      })
    });
    authMessage.textContent = "Usuário demo criado. Use ana@ecovision.com / 123456.";
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

document.querySelector("#logoutButton").addEventListener("click", () => {
  clearSession();
  showLogin();
});

document.querySelector("#reportFilters").addEventListener("submit", async (event) => {
  event.preventDefault();
  filterMessage.textContent = "Aplicando filtros...";

  state.filters = {
    status: document.querySelector("#filterStatus").value,
    severity: document.querySelector("#filterSeverity").value,
    category: document.querySelector("#filterCategory").value,
    location: document.querySelector("#filterLocation").value.trim()
  };

  try {
    await loadDashboard();
    filterMessage.textContent = "";
  } catch (error) {
    filterMessage.textContent = error.message;
  }
});

document.querySelector("#clearFilters").addEventListener("click", async () => {
  document.querySelector("#reportFilters").reset();
  state.filters = {
    status: "",
    severity: "",
    category: "",
    location: ""
  };

  filterMessage.textContent = "Limpando filtros...";

  try {
    await loadDashboard();
    filterMessage.textContent = "";
  } catch (error) {
    filterMessage.textContent = error.message;
  }
});

evidenceImageInput.addEventListener("change", () => {
  const file = evidenceImageInput.files[0];

  if (file && file.size > 3 * 1024 * 1024) {
    reportMessage.textContent = "A imagem deve ter no máximo 3 MB.";
    clearEvidencePreview();
    return;
  }

  reportMessage.textContent = "";
  renderEvidencePreview(file);
});

evidencePreview.addEventListener("click", (event) => {
  if (event.target.id === "removeEvidenceImage") {
    clearEvidencePreview();
  }
});

[reportTitleInput, reportDescriptionInput, reportCategoryInput].forEach((field) => {
  field.addEventListener("input", updateReportFormState);
  field.addEventListener("change", updateReportFormState);
});

reportsList.addEventListener("change", async (event) => {
  if (!event.target.matches("[data-report-status]")) {
    return;
  }

  const reportId = event.target.dataset.reportStatus;
  const status = event.target.value;
  filterMessage.textContent = "Atualizando status...";

  try {
    await api(`/reports/${reportId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    await loadDashboard();
    filterMessage.textContent = "Status atualizado.";
  } catch (error) {
    filterMessage.textContent = error.message;
    await loadDashboard();
  }
});

const chatPanel = document.querySelector("#ecoChatPanel");
const chatToggle = document.querySelector("#ecoChatToggle");
const chatClose = document.querySelector("#ecoChatClose");
const chatMessages = document.querySelector("#ecoChatMessages");
const chatForm = document.querySelector("#ecoChatForm");
const chatInput = document.querySelector("#ecoChatInput");

const chatAnswers = [
  {
    keywords: ["denuncia", "denúncia", "registrar", "ocorrencia", "ocorrência"],
    answer: "Preencha título, descrição, localização, categoria e severidade em Nova denúncia. Depois clique em Registrar denúncia."
  },
  {
    keywords: ["ia", "analisa", "risco", "score", "palavra"],
    answer: "A análise IA usa título, descrição e categoria para estimar risco, score, palavras-chave e recomendação de prioridade."
  },
  {
    keywords: ["mapa", "local", "brasilia", "brasília", "df"],
    answer: "O mapa mostra as ocorrências por localização. Na demo, os pontos estão contextualizados em Brasília, DF."
  },
  {
    keywords: ["status", "resolver", "pendente", "analise", "análise"],
    answer: "Na lista de denúncias, use o seletor Status para mover uma ocorrência entre pendente, em análise, resolvida ou arquivada."
  },
  {
    keywords: ["sensor", "alerta", "qualidade", "co2", "temperatura"],
    answer: "Os sensores simulam dados ambientais em tempo real e geram alertas automáticos quando algum indicador exige atenção."
  }
];

const chatMetrics = [
  {
    type: "airQuality",
    dataKey: "airQuality",
    label: "AQI atual",
    unit: "",
    keywords: ["ar", "aqi", "qualidade", "poluicao", "nivel do ar"]
  },
  {
    type: "temperature",
    dataKey: "temperature",
    label: "Temperatura atual",
    unit: "°C",
    keywords: ["temperatura", "calor", "clima"]
  },
  {
    type: "humidity",
    dataKey: "humidity",
    label: "Umidade atual",
    unit: "%",
    keywords: ["umidade", "umido", "umida", "chuva"]
  },
  {
    type: "co2",
    dataKey: "co2",
    label: "CO2 atual",
    unit: " ppm",
    keywords: ["co2", "carbono", "dioxido"]
  }
];

function normalizeChatText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getMetricChatAnswer(metric) {
  const value = getLastValue(state.environmentalData[metric.dataKey]);
  const status = getSensorStatus(metric.type, value);

  return `${metric.label}: ${value}${metric.unit} (${status.label}) em Brasília.`;
}

function addChatMessage(text, type = "bot") {
  const message = document.createElement("div");
  message.className = `chat-message ${type}`;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getChatAnswer(question) {
  const normalized = normalizeChatText(question);

  const metric = chatMetrics.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
  if (metric) {
    return getMetricChatAnswer(metric);
  }

  const match = chatAnswers.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
  return match?.answer || "Posso ajudar com denúncias, mapa, sensores, status e análise IA dentro do EcoVision AI.";
}

function askChat(question) {
  if (!question.trim()) return;
  addChatMessage(question, "user");
  addChatMessage(getChatAnswer(question));
}

function getChatGreeting() {
  const firstName = (state.user?.name || "Ana").trim().split(/\s+/)[0];
  return `Olá, ${firstName}! Quer saber como está a qualidade do ar hoje?`;
}

function openChat() {
  chatPanel.hidden = false;
  chatToggle.setAttribute("aria-expanded", "true");

  if (!chatMessages.children.length) {
    addChatMessage(getChatGreeting());
  }

  chatInput.focus();
}

function closeChat() {
  chatPanel.hidden = true;
  chatToggle.setAttribute("aria-expanded", "false");
}

function abrirChat() {
  if (chatPanel.hidden) {
    openChat();
  } else {
    closeChat();
  }
}

chatClose.addEventListener("click", () => {
  closeChat();
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askChat(chatInput.value);
  chatInput.value = "";
});

document.querySelectorAll(".chat-suggestion").forEach((button) => {
  button.addEventListener("click", () => askChat(button.dataset.question));
});

document.querySelector("#reportForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  reportMessage.textContent = "Registrando denúncia...";

  try {
    const evidenceImage = await readEvidenceImage();

    await api("/reports", {
      method: "POST",
      body: JSON.stringify({
        title: document.querySelector("#reportTitle").value,
        description: document.querySelector("#reportDescription").value,
        location: document.querySelector("#reportLocation").value,
        category: document.querySelector("#reportCategory").value,
        severity: document.querySelector("#reportSeverity").value,
        evidenceImage
      })
    });

    event.target.reset();
    clearEvidencePreview();
    updateReportFormState();
    reportMessage.textContent = "Denúncia registrada com sucesso.";
    loadDashboard();
  } catch (error) {
    reportMessage.textContent = error.message;
  }
});

analyzeButton.addEventListener("click", async () => {
  setAnalysisResultState("processing");
  setAnalysisVisualState("");
  analysisProgress.classList.remove("hidden");
  analyzeButton.disabled = true;
  analyzeButton.textContent = "Analisando...";
  analysisResult.innerHTML = "<span>IA processando texto, categoria e palavras-chave...</span>";

  try {
    const [result] = await Promise.all([
      api("/analysis", {
        method: "POST",
        body: JSON.stringify({
          title: reportTitleInput.value,
          description: reportDescriptionInput.value,
          category: reportCategoryInput.value
        })
      }),
      delay(2400)
    ]);

    setAnalysisResultState(`risk-${result.risk}`);
    setAnalysisVisualState(result.risk);
    analysisResult.innerHTML = `
      <strong>Risco ${formatRisk(result.risk)} - score ${result.score}</strong>
      <span>${escapeHTML(formatRecommendation(result.recommendation))}</span>
      <p class="muted">Palavras-chave: ${result.keywords.map(escapeHTML).join(", ") || "nenhuma"}</p>
    `;
  } catch (error) {
    setAnalysisResultState("risk-alto");
    analysisResult.textContent = error.message;
  } finally {
    analysisProgress.classList.add("hidden");
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Analisar texto da denúncia";
  }
});

updateReportFormState();

if (state.token) {
  showDashboard();
} else {
  showLogin();
}
