function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (trimmed === "") {
    return null;
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num === 0) {
    return null;
  }
  return num;
}

export function analyzeData(rows, config) {
  const {
    sampleColumn,
    groupColumn,
    housekeepingColumn,
    targetColumns,
    controlGroup,
  } = config;

  const longRows = [];
  const summaryByGene = new Map();

  const groups = new Set();

  targetColumns.forEach((gene) => {
    summaryByGene.set(gene, {
      gene,
      processed: 0,
      discarded: 0,
      controlHousekeepingMean: null,
      controlTargetMean: null,
    });
  });

  const validControlByGene = new Map();
  targetColumns.forEach((gene) => {
    validControlByGene.set(gene, []);
  });
  const validRowsByGene = new Map();
  targetColumns.forEach((gene) => {
    validRowsByGene.set(gene, []);
  });

  rows.forEach((row) => {
    const sampleId = String(row[sampleColumn] ?? "").trim();
    const group = String(row[groupColumn] ?? "").trim();
    const hkValue = toNumber(row[housekeepingColumn]);
    if (group) {
      groups.add(group);
    }

    targetColumns.forEach((gene) => {
      const targetValue = toNumber(row[gene]);
      if (!sampleId || !group || hkValue === null || targetValue === null) {
        summaryByGene.get(gene).discarded += 1;
        return;
      }

      validRowsByGene.get(gene).push({
        sampleId,
        group,
        hkValue,
        targetValue,
      });

      if (group === controlGroup) {
        validControlByGene.get(gene).push({ hkValue, targetValue });
      }
    });
  });

  const controlMeans = new Map();
  targetColumns.forEach((gene) => {
    const controlValues = validControlByGene.get(gene) || [];
    if (!controlValues.length) {
      return;
    }
    const hkMean =
      controlValues.reduce((sum, item) => sum + item.hkValue, 0) /
      controlValues.length;
    const targetMean =
      controlValues.reduce((sum, item) => sum + item.targetValue, 0) /
      controlValues.length;
    controlMeans.set(gene, { hkMean, targetMean });
    const summary = summaryByGene.get(gene);
    summary.controlHousekeepingMean = hkMean;
    summary.controlTargetMean = targetMean;
  });

  const missingControlGenes = targetColumns.filter(
    (gene) => !controlMeans.has(gene)
  );
  if (missingControlGenes.length) {
    return {
      error: `El grupo control no tiene muestras válidas para: ${missingControlGenes.join(
        ", "
      )}`,
    };
  }

  targetColumns.forEach((gene) => {
    const rowsForGene = validRowsByGene.get(gene);
    const { hkMean, targetMean } = controlMeans.get(gene);

    rowsForGene.forEach(({ sampleId, group, hkValue, targetValue }) => {
      const deltaCtHousekeeping = hkValue - hkMean;
      const deltaCtTarget = targetValue - targetMean;
      const hkExp = Math.pow(2, deltaCtHousekeeping);
      const targetExp = Math.pow(2, deltaCtTarget);
      const normalizedExpression = targetExp / hkExp;
      const log2Expression = Math.log2(normalizedExpression);

      longRows.push({
        sample_id: sampleId,
        group,
        gene,
        Ct_housekeeping: hkValue,
        Ct_target: targetValue,
        "ΔCt_housekeeping": deltaCtHousekeeping,
        "ΔCt_target": deltaCtTarget,
        "2^ΔCt_housekeeping": hkExp,
        "2^ΔCt_target": targetExp,
        normalized_expression: normalizedExpression,
        log2_expression: log2Expression,
      });

      summaryByGene.get(gene).processed += 1;
    });
  });

  const wideMap = new Map();
  longRows.forEach((row) => {
    const key = `${row.sample_id}__${row.group}`;
    if (!wideMap.has(key)) {
      wideMap.set(key, {
        sample_id: row.sample_id,
        group: row.group,
      });
    }
    const wideRow = wideMap.get(key);
    wideRow[`log2_expr_${row.gene}`] = row.log2_expression;
  });

  return {
    longRows,
    wideRows: Array.from(wideMap.values()),
    summary: Array.from(summaryByGene.values()),
    groups: Array.from(groups),
  };
}
