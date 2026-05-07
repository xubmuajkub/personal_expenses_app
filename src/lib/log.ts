const MAX = 1000;
const lines: string[] = [];

function fmt(level: string, args: unknown[]): string {
  return `[${new Date().toISOString()}] ${level} ${args.map(s).join(' ')}`;
}

function s(v: unknown): string {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function push(level: 'info' | 'warn' | 'error', args: unknown[]) {
  lines.push(fmt(level, args));
  while (lines.length > MAX) lines.shift();
}

export const log = {
  info: (...a: unknown[]) => push('info', a),
  warn: (...a: unknown[]) => {
    push('warn', a);
    console.warn(...a);
  },
  error: (...a: unknown[]) => {
    push('error', a);
    console.error(...a);
  },
};

export function dumpLogs(): string {
  return lines.join('\n');
}
