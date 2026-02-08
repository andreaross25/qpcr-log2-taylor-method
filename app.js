import {
  getWorkbookFromFile,
  getSheetNames,
  parseSheetToJson,
  normalizeHeaders,
  uniqueValues,
} from "./utils/parser.js";
import { analyzeData } from "./utils/analysis.js";
import { renderPlot } from "./utils/plots.js";

const fileInput = document.getElementById("file-input");
const fileStatus = document.getElementById("file-status");
const sheetRow = document.getElementById("sheet-row");
const sheetSelect = document.getElementById("sheet-select");
const sampleSelect = document.getElementById("sample-column");
const groupSelect = document.getElementById("group-column");
const hkSelect = document.getElementById("hk-column");
const targetSelect = document.getElementById("target-columns");
const controlGroupSelect = document.getElementById("control-group");
const runButton = document.getElementById("run-analysis");
const analysisStatus = document.getElementById("analysis-status");
const alertBox = document.getElementById("alert-box");
const summaryContainer = document.getElementById("summary");
const downloadLongBtn = document.getElementById("download-long");
const downloadWideBtn = document.getElementById("download-wide");
const previewTable = document.getElementById("preview-table");
const plotTypeSelect = document.getElementById("plot-type");
const plotGeneSelect = document.getElementById("plot-gene");

let workbook = null;
let currentRows = [];
let longResults = [];
let wideResults = [];

function setStatus(message, isError = false) {
  analysisStatus.textContent = message;
  analysisStatus.style.color = isError ? "#c0392b" : "#55607a";
}

function showAlert(message) {
  alertBox.textContent = message;
  alertBox.classList.remove("hidden");
}

function clearAlert() {
  alertBox.classList.add("hidden");
  alertBox.textContent = "";
}

function fillSelect(select, options, placeholder = "Seleccione") {
  select.innerHTML = "";
  if (placeholder) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
  }
  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
}

function fillMultiSelect(select, options) {
  select.innerHTML = "";
  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
}

function loadSheet(sheetName) {
  const rawRows = parseSheetToJson(workbook, sheetName);
  const { headers, rows } = normalizeHeaders(rawRows);
  currentRows = rows;
  fillSelect(sampleSelect, headers);
  fillSelect(groupSelect, headers);
  fillSelect(hkSelect, headers);
  fillMultiSelect(targetSelect, headers);
  fillSelect(controlGroupSelect, []);
  plotGeneSelect.innerHTML = "";
  summaryContainer.innerHTML = "";
  previewTable.innerHTML = "";
  setStatus("Datos cargados. Configure el análisis.");
}

function updateControlGroups() {
  if (!groupSelect.value) {
    fillSelect(controlGroupSelect, []);
    return;
  }
  const groups = uniqueValues(currentRows, groupSelect.value);
  fillSelect(controlGroupSelect, groups, "Seleccione un grupo");
}

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  try {
    workbook = await getWorkbookFromFile(file);
    const sheetNames = getSheetNames(workbook);
    if (!sheetNames.length) {
      throw new Error("El archivo no contiene hojas válidas.");
    }
    fileStatus.textContent = `Archivo cargado: ${file.name}`;
    if (sheetNames.length > 1) {
      sheetRow.classList.remove("hidden");
      fillSelect(sheetSelect, sheetNames, "Seleccione una hoja");
    } else {
      sheetRow.classList.add("hidden");
      sheetSelect.innerHTML = "";
      loadSheet(sheetNames[0]);
    }
  } catch (error) {
    showAlert("No fue posible leer el archivo. Verifique el formato.");
    fileStatus.textContent = "Error al cargar archivo.";
  }
});

sheetSelect.addEventListener("change", (event) => {
  if (!event.target.value) {
    return;
  }
  loadSheet(event.target.value);
});

groupSelect.addEventListener("change", () => {
  updateControlGroups();
});

runButton.addEventListener("click", () => {
  clearAlert();
  if (!currentRows.length) {
    showAlert("Primero cargue un archivo con datos válidos.");
    return;
  }

  const sampleColumn = sampleSelect.value;
  const groupColumn = groupSelect.value;
  const housekeepingColumn = hkSelect.value;
  const targetColumns = Array.from(targetSelect.selectedOptions).map(
    (option) => option.value
  );
  const controlGroup = controlGroupSelect.value;

  if (!sampleColumn || !groupColumn || !housekeepingColumn) {
    showAlert("Debe seleccionar columnas de muestra, grupo y housekeeping.");
    return;
  }
  if (!controlGroup) {
    showAlert("Debe seleccionar un grupo control.");
    return;
  }
  if (!targetColumns.length) {
    showAlert("Debe seleccionar al menos un gen target.");
    return;
  }

  const analysisResult = analyzeData(currentRows, {
    sampleColumn,
    groupColumn,
    housekeepingColumn,
    targetColumns,
    controlGroup,
  });

  if (analysisResult.error) {
    showAlert(analysisResult.error);
    return;
  }

  ({ longRows: longResults, wideRows: wideResults } = analysisResult);

  fillSelect(plotGeneSelect, targetColumns, "Seleccione gen");
  plotGeneSelect.value = targetColumns[0];
  renderPlot({
    containerId: "plot",
    data: longResults,
    gene: plotGeneSelect.value,
    plotType: plotTypeSelect.value,
  });

  updateSummary(analysisResult.summary, controlGroup);
  updatePreview(longResults);
  setStatus("Análisis completado.");
});

plotTypeSelect.addEventListener("change", () => {
  if (!longResults.length) {
    return;
  }
  renderPlot({
    containerId: "plot",
    data: longResults,
    gene: plotGeneSelect.value,
    plotType: plotTypeSelect.value,
  });
});

plotGeneSelect.addEventListener("change", () => {
  if (!longResults.length) {
    return;
  }
  renderPlot({
    containerId: "plot",
    data: longResults,
    gene: plotGeneSelect.value,
    plotType: plotTypeSelect.value,
  });
});

function updateSummary(summary, controlGroup) {
  summaryContainer.innerHTML = "";
  summary.forEach((item) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.innerHTML = `
      <strong>${item.gene}</strong><br />
      Grupo control: ${controlGroup}<br />
      Muestras procesadas: ${item.processed}<br />
      Muestras descartadas: ${item.discarded}
    `;
    summaryContainer.appendChild(card);
  });
}

function updatePreview(rows) {
  previewTable.innerHTML = "";
  if (!rows.length) {
    return;
  }
  const headers = Object.keys(rows[0]);
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  previewTable.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.slice(0, 10).forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((header) => {
      const td = document.createElement("td");
      td.textContent =
        typeof row[header] === "number"
          ? row[header].toFixed(4)
          : row[header];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  previewTable.appendChild(tbody);
}

function downloadFile(data, filename) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
  XLSX.writeFile(workbook, filename);
}

downloadLongBtn.addEventListener("click", () => {
  if (!longResults.length) {
    showAlert("No hay resultados para descargar.");
    return;
  }
  downloadFile(longResults, "tabla_intermedia_qpcr.xlsx");
});

downloadWideBtn.addEventListener("click", () => {
  if (!wideResults.length) {
    showAlert("No hay resultados para descargar.");
    return;
  }
  downloadFile(wideResults, "tabla_final_qpcr.xlsx");
});
