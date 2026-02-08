function buildColorPalette(groups) {
  const colors = [
    "#3a6ff7",
    "#f76a3a",
    "#2cb67d",
    "#ffb703",
    "#8e7dff",
    "#ef476f",
    "#118ab2",
  ];
  const palette = new Map();
  groups.forEach((group, index) => {
    palette.set(group, colors[index % colors.length]);
  });
  return palette;
}

export function renderPlot({ containerId, data, gene, plotType }) {
  const plotContainer = document.getElementById(containerId);
  if (!plotContainer) {
    return;
  }

  const geneRows = data.filter((row) => row.gene === gene);
  if (!geneRows.length) {
    Plotly.purge(plotContainer);
    plotContainer.innerHTML = "Sin datos para graficar.";
    return;
  }

  const groups = [...new Set(geneRows.map((row) => row.group))];
  const palette = buildColorPalette(groups);

  let traces = [];

  if (plotType === "box") {
    traces = groups.map((group) => {
      const groupRows = geneRows.filter((row) => row.group === group);
      return {
        type: "box",
        y: groupRows.map((row) => row.log2_expression),
        name: group,
        marker: { color: palette.get(group) },
        boxpoints: "all",
        jitter: 0.4,
        pointpos: 0,
      };
    });
  } else {
    const groupIndex = new Map();
    groups.forEach((group, index) => groupIndex.set(group, index + 1));
    traces = groups.map((group) => {
      const groupRows = geneRows.filter((row) => row.group === group);
      const xValues = groupRows.map(() => {
        const jitter = (Math.random() - 0.5) * 0.25;
        return groupIndex.get(group) + jitter;
      });
      return {
        type: "scatter",
        mode: "markers",
        x: xValues,
        y: groupRows.map((row) => row.log2_expression),
        name: group,
        marker: { color: palette.get(group), size: 8 },
      };
    });
  }

  const layout = {
    title: `Expresión log2 - ${gene}`,
    xaxis: plotType === "box" ? { title: "Grupo" } : {
      title: "Grupo",
      tickvals: groups.map((_, index) => index + 1),
      ticktext: groups,
    },
    yaxis: { title: "log2_expression" },
    margin: { t: 50, l: 50, r: 20, b: 60 },
  };

  Plotly.newPlot(plotContainer, traces, layout, { responsive: true });
}
