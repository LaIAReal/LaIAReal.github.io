(function () {
  "use strict";

  const PREFIX = "laiareal-kit:v1:";
  const form = document.querySelector("[data-workbook]");
  const number = (value) => Number.parseFloat(String(value || "").replace(",", ".")) || 0;
  const currency = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  });

  function setStatus(message, state) {
    document.querySelectorAll("[data-save-status]").forEach((element) => {
      element.textContent = message;
      element.dataset.state = state || "saved";
    });
  }

  function fieldsByName(targetForm) {
    const result = new Map();
    targetForm.querySelectorAll("[name]").forEach((field) => {
      const fields = result.get(field.name) || [];
      fields.push(field);
      result.set(field.name, fields);
    });
    return result;
  }

  function readGroup(fields) {
    const first = fields[0];
    if (first.type === "radio") return fields.find((field) => field.checked)?.value || "";
    if (first.type === "checkbox") {
      if (fields.length === 1) return first.checked;
      return fields.filter((field) => field.checked).map((field) => field.value);
    }
    return first.value;
  }

  function writeGroup(fields, value) {
    const first = fields[0];
    if (first.type === "radio") {
      fields.forEach((field) => { field.checked = field.value === value; });
      return;
    }
    if (first.type === "checkbox") {
      if (fields.length === 1) first.checked = Boolean(value);
      else fields.forEach((field) => { field.checked = Array.isArray(value) && value.includes(field.value); });
      return;
    }
    first.value = value == null ? "" : value;
  }

  function collectData() {
    const data = {};
    fieldsByName(form).forEach((fields, name) => { data[name] = readGroup(fields); });
    return data;
  }

  function hasValue(field) {
    if (field.type === "checkbox" || field.type === "radio") {
      return Array.from(form.elements[field.name] ? (form.elements[field.name].length ? form.elements[field.name] : [form.elements[field.name]]) : [field])
        .some((item) => item.checked);
    }
    return String(field.value || "").trim().length > 0;
  }

  function progress() {
    const required = Array.from(form.querySelectorAll("[data-required]"));
    if (!required.length) return 0;
    const names = [...new Set(required.map((field) => field.name))];
    const complete = names.filter((name) => {
      const field = required.find((item) => item.name === name);
      return field && hasValue(field);
    }).length;
    return Math.round((complete / names.length) * 100);
  }

  function updateProgress(value) {
    const current = value == null ? progress() : value;
    document.querySelectorAll("[data-progress-value]").forEach((element) => {
      element.textContent = `${current}%`;
    });
    document.querySelectorAll("[data-progress-bar]").forEach((element) => {
      element.style.width = `${current}%`;
    });
    return current;
  }

  function updateCalculations() {
    if (!form) return;
    if (form.dataset.workbook === "oportunidad") {
      const monthly = number(form.elements.baseline_volume?.value) * number(form.elements.baseline_human_minutes?.value) / 60 * number(form.elements.baseline_hour_cost?.value)
        + number(form.elements.baseline_fixed_cost?.value)
        + number(form.elements.baseline_error_cost?.value);
      document.querySelectorAll("[data-baseline-cost]").forEach((element) => { element.textContent = currency.format(monthly); });
    }
    if (form.dataset.workbook === "plan90") {
      const volume = number(form.elements.value_volume?.value);
      const savedMinutes = Math.max(0, number(form.elements.value_baseline_minutes?.value) - number(form.elements.value_pilot_minutes?.value));
      const adoption = Math.min(100, Math.max(0, number(form.elements.value_adoption?.value))) / 100;
      const gross = volume * savedMinutes / 60 * number(form.elements.value_hour_cost?.value) * adoption;
      const net = gross
        - number(form.elements.value_recurring_cost?.value)
        - number(form.elements.value_review_cost?.value)
        - number(form.elements.value_incident_cost?.value);
      document.querySelectorAll("[data-gross-value]").forEach((element) => { element.textContent = currency.format(gross); });
      document.querySelectorAll("[data-net-value]").forEach((element) => { element.textContent = currency.format(net); });
    }
    if (form.dataset.workbook === "consultor") {
      for (let row = 1; row <= 8; row += 1) {
        const impact = number(form.elements[`opp_${row}_impact`]?.value);
        const feasibility = number(form.elements[`opp_${row}_feasibility`]?.value);
        const context = number(form.elements[`opp_${row}_context`]?.value);
        const adoption = number(form.elements[`opp_${row}_adoption`]?.value);
        const risk = number(form.elements[`opp_${row}_risk`]?.value);
        const score = impact * 0.30 + feasibility * 0.20 + context * 0.20 + adoption * 0.15 + (risk ? 6 - risk : 0) * 0.15;
        document.querySelectorAll(`[data-consult-score="${row}"]`).forEach((element) => {
          element.textContent = score ? score.toFixed(2) : "—";
        });
      }

      const maturityFields = ["identity", "knowledge", "process", "permissions", "learning"];
      const maturityValues = maturityFields.map((item) => number(form.elements[`maturity_${item}`]?.value)).filter((value) => value >= 0);
      const maturityAverage = maturityValues.length ? maturityValues.reduce((sum, value) => sum + value, 0) / maturityValues.length : 0;
      const maturityBand = maturityAverage < 1 ? "Implícito" : maturityAverage < 2 ? "Documentado" : maturityAverage < 3 ? "Gobernado" : maturityAverage < 4 ? "Medible" : "Adaptativo";
      document.querySelectorAll("[data-maturity-average]").forEach((element) => { element.textContent = maturityAverage.toFixed(1); });
      document.querySelectorAll("[data-maturity-band]").forEach((element) => { element.textContent = maturityBand; });

      for (let row = 1; row <= 8; row += 1) {
        const riskScore = number(form.elements[`risk_${row}_likelihood`]?.value) * number(form.elements[`risk_${row}_impact`]?.value);
        document.querySelectorAll(`[data-risk-score="${row}"]`).forEach((element) => {
          element.textContent = riskScore || "—";
          element.dataset.level = riskScore >= 16 ? "critical" : riskScore >= 10 ? "high" : riskScore >= 5 ? "medium" : riskScore ? "low" : "empty";
        });
      }

      const volume = number(form.elements.consult_volume?.value);
      const savedMinutes = Math.max(0, number(form.elements.consult_before_minutes?.value) - number(form.elements.consult_after_minutes?.value));
      const adoption = Math.min(100, Math.max(0, number(form.elements.consult_adoption?.value))) / 100;
      const timeValue = volume * savedMinutes / 60 * number(form.elements.consult_hour_cost?.value) * adoption;
      const avoidedErrors = Math.max(0, number(form.elements.consult_error_before?.value) - number(form.elements.consult_error_after?.value));
      const grossMonthly = timeValue + avoidedErrors;
      const netMonthly = grossMonthly - number(form.elements.consult_recurring_cost?.value);
      const implementation = number(form.elements.consult_implementation_cost?.value);
      const horizon = Math.max(1, number(form.elements.consult_horizon?.value) || 12);
      const horizonValue = netMonthly * horizon - implementation;
      const payback = netMonthly > 0 ? implementation / netMonthly : 0;
      const roi = implementation > 0 ? horizonValue / implementation : 0;
      document.querySelectorAll("[data-consult-gross]").forEach((element) => { element.textContent = currency.format(grossMonthly); });
      document.querySelectorAll("[data-consult-net]").forEach((element) => { element.textContent = currency.format(netMonthly); });
      document.querySelectorAll("[data-consult-horizon-value]").forEach((element) => { element.textContent = currency.format(horizonValue); });
      document.querySelectorAll("[data-consult-payback]").forEach((element) => { element.textContent = payback ? `${payback.toFixed(1)} meses` : "No recuperado"; });
      document.querySelectorAll("[data-consult-roi]").forEach((element) => { element.textContent = implementation > 0 ? `${(roi * 100).toFixed(0)}%` : "—"; });
    }
  }

  function record() {
    return {
      schema: "laiareal-kit/v1",
      workbook: form.dataset.workbook,
      title: form.dataset.title,
      savedAt: new Date().toISOString(),
      progress: updateProgress(),
      data: collectData()
    };
  }

  function save() {
    if (!form) return;
    try {
      const item = record();
      localStorage.setItem(`${PREFIX}${item.workbook}`, JSON.stringify(item));
      const time = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date());
      setStatus(`Guardado en este navegador · ${time}`, "saved");
    } catch (error) {
      setStatus("No se ha podido guardar en este navegador", "error");
    }
  }

  function restore() {
    if (!form) return;
    try {
      const raw = localStorage.getItem(`${PREFIX}${form.dataset.workbook}`);
      if (!raw) return;
      const item = JSON.parse(raw);
      const groups = fieldsByName(form);
      Object.entries(item.data || {}).forEach(([name, value]) => {
        if (groups.has(name)) writeGroup(groups.get(name), value);
      });
      updateProgress(item.progress);
      updateCalculations();
      setStatus("Trabajo recuperado de este navegador", "saved");
    } catch (error) {
      setStatus("No se pudo recuperar el trabajo guardado", "error");
    }
  }

  function exportData() {
    save();
    const item = record();
    const blob = new Blob([JSON.stringify(item, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `la-ia-real-${item.workbook}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importData(file) {
    if (!file || !form) return;
    try {
      const item = JSON.parse(await file.text());
      if (item.schema !== "laiareal-kit/v1" || item.workbook !== form.dataset.workbook || !item.data) {
        throw new Error("Formato incompatible");
      }
      const groups = fieldsByName(form);
      Object.entries(item.data).forEach(([name, value]) => {
        if (groups.has(name)) writeGroup(groups.get(name), value);
      });
      updateCalculations();
      save();
      setStatus("Archivo importado y guardado", "saved");
    } catch (error) {
      setStatus("El archivo no corresponde a este artefacto", "error");
    }
  }

  function clearData() {
    if (!form || !window.confirm("¿Borrar todos los datos guardados de este artefacto en este navegador?")) return;
    form.reset();
    localStorage.removeItem(`${PREFIX}${form.dataset.workbook}`);
    updateCalculations();
    updateProgress(0);
    setStatus("Artefacto vacío", "saved");
  }

  function initialiseHub() {
    document.querySelectorAll("[data-kit-progress-for]").forEach((card) => {
      const id = card.dataset.kitProgressFor;
      let value = 0;
      let savedAt = null;
      try {
        const item = JSON.parse(localStorage.getItem(`${PREFIX}${id}`) || "null");
        value = item?.progress || 0;
        savedAt = item?.savedAt || null;
      } catch (error) {
        value = 0;
      }
      card.querySelectorAll("[data-card-progress]").forEach((element) => { element.textContent = `${value}%`; });
      card.querySelector("[data-card-progress-bar]").style.width = `${value}%`;
      const status = card.querySelector("[data-card-status]");
      status.textContent = savedAt ? `Último guardado: ${new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(savedAt))}` : "Todavía sin completar";
    });
  }

  if (form) {
    restore();
    updateCalculations();
    updateProgress();
    let timer;
    form.addEventListener("input", () => {
      setStatus("Guardando…", "saving");
      updateCalculations();
      updateProgress();
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 350);
    });
    form.addEventListener("change", () => {
      updateCalculations();
      save();
    });
  } else {
    initialiseHub();
  }

  document.querySelectorAll("[data-action='save']").forEach((button) => button.addEventListener("click", save));
  document.querySelectorAll("[data-action='export']").forEach((button) => button.addEventListener("click", exportData));
  document.querySelectorAll("[data-action='print']").forEach((button) => button.addEventListener("click", () => window.print()));
  document.querySelectorAll("[data-action='clear']").forEach((button) => button.addEventListener("click", clearData));
  document.querySelectorAll("[data-action='import']").forEach((button) => {
    button.addEventListener("click", () => document.querySelector("[data-import-file]")?.click());
  });
  document.querySelectorAll("[data-import-file]").forEach((input) => {
    input.addEventListener("change", () => {
      importData(input.files?.[0]);
      input.value = "";
    });
  });
})();
