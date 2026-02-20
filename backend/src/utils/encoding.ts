import iconv from 'iconv-lite';

const MOJIBAKE_HINT = /[馃锛銆鈥]|浣犵殑|鑾峰彇|澶辫触|鐧诲綍|宸茶繛鎺ュ悗绔|鍙戦€侀/;

function repairMojibakeString(input: string): string {
  if (!MOJIBAKE_HINT.test(input)) return input;

  try {
    const repaired = iconv.decode(iconv.encode(input, 'gbk'), 'utf8');
    if (!repaired || repaired === input) return input;
    if (MOJIBAKE_HINT.test(repaired)) return input;
    return repaired;
  } catch {
    return input;
  }
}

export function normalizeUtf8Value<T>(value: T): T {
  if (typeof value === 'string') return repairMojibakeString(value) as T;
  if (Array.isArray(value)) return value.map((item) => normalizeUtf8Value(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, normalizeUtf8Value(val)])
    ) as T;
  }
  return value as T;
}
