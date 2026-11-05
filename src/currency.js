let usdRateCache = null;
let lastFetchTime = 0;

export async function getUsdRate() {
  // Кэшируем курс на 1 час, чтобы не спамить API при каждом рендере
  const now = Date.now();
  if (usdRateCache && now - lastFetchTime < 3600000) {
    return usdRateCache;
  }

  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
    const data = await res.json();
    // ЦБ отдает стоимость 1 USD в рублях (например, 95.5)
    const rate = data.Valute.USD.Value; 
    usdRateCache = rate;
    lastFetchTime = now;
    return rate;
  } catch (e) {
    console.error('Не удалось загрузить курс ЦБ', e);
    return 95; // Фолбэк, если API недоступен
  }
}

export async function rubToUsd(rub) {
  if (!rub || rub <= 0) return 0;
  const rate = await getUsdRate();
  return +(rub / rate).toFixed(2);
}

export async function usdToRub(usd) {
  if (!usd || usd <= 0) return 0;
  const rate = await getUsdRate();
  return +(usd * rate).toFixed(2);
}