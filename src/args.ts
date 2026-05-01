export interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }

    const raw = arg.slice(2);
    const eqIndex = raw.indexOf('=');
    if (eqIndex >= 0) {
      flags.set(raw.slice(0, eqIndex), raw.slice(eqIndex + 1));
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      flags.set(raw, next);
      i += 1;
    } else {
      flags.set(raw, true);
    }
  }

  return { positionals, flags };
}

export function getString(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name);
  if (value === undefined || typeof value === 'boolean') return undefined;
  return value;
}

export function getRequiredString(args: ParsedArgs, name: string): string {
  const value = getString(args, name);
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

export function getNumber(args: ParsedArgs, name: string): number | undefined {
  const value = getString(args, name);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`--${name} must be a number`);
  return parsed;
}

export function getRequiredNumber(args: ParsedArgs, name: string): number {
  const value = getNumber(args, name);
  if (value === undefined) throw new Error(`Missing --${name}`);
  return value;
}

export function getBoolean(args: ParsedArgs, name: string): boolean {
  return args.flags.get(name) === true;
}

export function getNumberList(args: ParsedArgs, name: string): number[] | undefined {
  const value = getString(args, name);
  if (!value) return undefined;
  return value.split(',').map((item) => {
    const parsed = Number(item.trim());
    if (!Number.isFinite(parsed)) throw new Error(`--${name} contains non-number value`);
    return parsed;
  });
}

