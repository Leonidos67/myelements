import JSON5 from 'json5';

const maxSourceLength = 1024 * 1024;

function parseData(source) {
  if (source.length > maxSourceLength) throw Error('Файл должен быть не больше 1 МБ.');
  const declaration = /\b(?:const|let|var)\s+DATA\s*=\s*(?=\{)/.exec(source);
  let data = source.trim();
  if (declaration) {
    const start = declaration.index + declaration[0].length;
    const tokens = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|[{}]/g;
    tokens.lastIndex = start;
    let depth = 0;
    for (let match; (match = tokens.exec(source));) {
      if (match[0] === '{') depth++;
      if (match[0] === '}' && --depth === 0) {
        data = source.slice(start, tokens.lastIndex);
        break;
      }
    }
  }
  let parsed;
  try { parsed = JSON5.parse(data); }
  catch { throw Error('Вставьте объект данных или JS с блоком const DATA = { … }.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('В JS должен быть объект данных.');
  return parsed;
}

function atPath(object, path) {
  return path.reduce((value, key) => value != null && Object.hasOwn(value, key) ? value[key] : undefined, object);
}

function assignPath(object, path, value) {
  const parent = path.slice(0, -1).reduce((target, key) => (target[key] ??= {}), object);
  parent[path.at(-1)] = value;
}

export function projectBlockSource(config, paths) {
  const block = {};
  for (const key of paths) {
    const path = key.split('.');
    const value = atPath(config, path);
    if (value !== undefined) assignPath(block, path, value);
  }
  return 'const DATA = ' + JSON.stringify(block, null, 2) + ';\n';
}

export function applyProjectBlock(source, config, paths) {
  const parsed = parseData(source);
  const legacyDuration = parsed.video?.duration?.match?.(/^(\d+(?:[.,]\d+)?)\s*с\.?$/)?.[1];
  if (legacyDuration && parsed.video.durationSeconds === undefined) {
    parsed.video.durationSeconds = Number(legacyDuration.replace(',', '.'));
    parsed.video.durationText = legacyDuration;
  }
  if (parsed.metrics && !parsed.watch) {
    const metrics = parsed.metrics;
    const watch = {};
    const total = String(metrics.total?.value ?? '').match(/^(\d+)\s*ч\.?\s*:\s*(\d+)\s*мин\.?\s*:\s*(\d+)\s*с/);
    if (total) watch.totalSeconds = +total[1] * 3600 + +total[2] * 60 + +total[3];
    for (const [field, metric] of [['averageSeconds', 'avg'], ['completionPercent', 'full'], ['subscribers', 'subs']]) {
      const value = Number.parseFloat(String(metrics[metric]?.value ?? '').replace(',', '.'));
      if (Number.isFinite(value)) watch[field] = value;
    }
    if (Object.keys(watch).length) parsed.watch = watch;
  }
  const next = structuredClone(config);
  let imported = false;
  for (const key of paths) {
    const path = key.split('.');
    const value = atPath(parsed, path);
    if (value === undefined) continue;
    const current = atPath(next, path);
    assignPath(next, path, current && value && typeof value === 'object' && !Array.isArray(current) && !Array.isArray(value) &&
      typeof current === 'object' ? { ...current, ...value } : value);
    imported = true;
  }
  if (!imported) throw Error('В файле нет параметров этой карточки.');
  return next;
}
