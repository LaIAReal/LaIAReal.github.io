(function () {
  "use strict";

  const raw = localStorage.getItem("laiareal-kit:v1:consultor");
  const warning = document.querySelector("[data-empty-report]");
  const data = raw ? JSON.parse(raw).data || {} : {};
  const number = (value) => Number.parseFloat(String(value || "").replace(",", ".")) || 0;
  const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const text = (value) => String(value || "").trim() || "Pendiente de completar";

  if (!raw && warning) warning.hidden = false;

  document.querySelectorAll("[data-field]").forEach((element) => {
    element.textContent = text(data[element.dataset.field]);
  });

  const decisionDate = data.engagement_decision_date ? new Date(`${data.engagement_decision_date}T00:00:00`) : null;
  document.querySelectorAll("[data-report-date]").forEach((element) => {
    element.textContent = decisionDate && !Number.isNaN(decisionDate.valueOf())
      ? new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(decisionDate)
      : new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date());
  });

  const maturityFields = ["identity", "knowledge", "process", "permissions", "learning"];
  const maturityAverage = maturityFields.reduce((sum, item) => sum + number(data[`maturity_${item}`]), 0) / maturityFields.length;
  const maturityBand = maturityAverage < 1 ? "Implícito" : maturityAverage < 2 ? "Documentado" : maturityAverage < 3 ? "Gobernado" : maturityAverage < 4 ? "Medible" : "Adaptativo";
  document.querySelectorAll("[data-report-maturity]").forEach((element) => { element.textContent = maturityAverage.toFixed(1); });
  document.querySelectorAll("[data-report-maturity-band]").forEach((element) => { element.textContent = maturityBand; });

  const volume = number(data.consult_volume);
  const savedMinutes = Math.max(0, number(data.consult_before_minutes) - number(data.consult_after_minutes));
  const adoption = Math.min(100, Math.max(0, number(data.consult_adoption))) / 100;
  const grossMonthly = volume * savedMinutes / 60 * number(data.consult_hour_cost) * adoption
    + Math.max(0, number(data.consult_error_before) - number(data.consult_error_after));
  const netMonthly = grossMonthly - number(data.consult_recurring_cost);
  const implementation = number(data.consult_implementation_cost);
  const horizon = Math.max(1, number(data.consult_horizon) || 12);
  const horizonValue = netMonthly * horizon - implementation;
  const payback = netMonthly > 0 ? implementation / netMonthly : 0;

  document.querySelectorAll("[data-report-net]").forEach((element) => { element.textContent = currency.format(netMonthly); });
  document.querySelectorAll("[data-report-horizon]").forEach((element) => { element.textContent = currency.format(horizonValue); });
  document.querySelectorAll("[data-report-payback]").forEach((element) => { element.textContent = payback ? `${payback.toFixed(1)} meses` : "No recuperado"; });

  function renderList(name, values) {
    const list = document.querySelector(`[data-report-list="${name}"]`);
    if (!list) return;
    list.replaceChildren();
    const filtered = values.filter((value) => String(value || "").trim());
    (filtered.length ? filtered : ["Pendiente de completar"]).forEach((value) => {
      const item = document.createElement("li");
      item.textContent = value;
      list.appendChild(item);
    });
  }

  renderList("findings", [data.finding_1, data.finding_2, data.finding_3]);
  renderList("recommendations", [data.recommendation_1, data.recommendation_2, data.recommendation_3]);

  const risks = [];
  for (let row = 1; row <= 8; row += 1) {
    const label = String(data[`risk_${row}_name`] || "").trim();
    if (!label) continue;
    risks.push({
      label,
      score: number(data[`risk_${row}_likelihood`]) * number(data[`risk_${row}_impact`]),
      response: String(data[`risk_${row}_response`] || "").trim()
    });
  }
  risks.sort((a, b) => b.score - a.score);
  renderList("risks", risks.slice(0, 3).map((risk) => `${risk.label} · ${risk.score || "sin puntuar"}${risk.response ? ` · ${risk.response}` : ""}`));

  document.querySelectorAll("[data-action='print-report']").forEach((button) => button.addEventListener("click", () => window.print()));
})();
