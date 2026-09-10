/**
 * Exit codes are part of the CLI's contract with CI:
 *   0  success
 *   1  the user or this machine needs to change something
 *   2  the network or the server failed, so retrying later may work
 */
export type ExitCode = 1 | 2;

export class CliError extends Error {
  readonly exitCode: ExitCode;

  constructor(message: string, exitCode: ExitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export function userError(message: string): CliError {
  return new CliError(message, 1);
}

export function networkError(message: string): CliError {
  return new CliError(message, 2);
}

/**
 * Node collapses DNS failures, TLS errors and offline sockets into an opaque
 * `TypeError: fetch failed`, so the actionable detail only exists on `.cause`.
 */
export function fetchFailure(err: unknown, what: string): CliError {
  if (err instanceof CliError) return err;
  const cause = err instanceof Error && err.cause instanceof Error ? err.cause : undefined;
  const detail = cause?.message ?? (err instanceof Error ? err.message : String(err));
  return networkError(`Could not reach ${what}: ${detail}`);
}

/** A fetch that fails loudly instead of hanging forever on a black-holed socket. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  what: string,
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw networkError(`Timed out after ${Math.round(timeoutMs / 1000)}s reaching ${what}.`);
    }
    throw fetchFailure(err, what);
  } finally {
    clearTimeout(timer);
  }
}

/** Reads a response body as JSON without throwing on an HTML error page. */
export async function readJson(res: Response): Promise<unknown> {
  const body = await res.text();
  if (!body.trim()) return undefined;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}
