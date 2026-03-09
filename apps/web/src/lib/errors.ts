export function getErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  const anyErr = err as Record<string, unknown>;
  const message = anyErr.message;
  if (typeof message === "string") return message;
  return "Unknown error";
}

export function isUserRejectedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as Record<string, unknown>;

  const code = e.code;
  if (code === 4001) return true;

  const name = e.name;
  if (name === "UserRejectedRequestError") return true;

  const message = e.message;
  if (typeof message === "string" && /user rejected|rejected the request|denied/i.test(message)) return true;

  const shortMessage = e.shortMessage;
  if (typeof shortMessage === "string" && /user rejected|rejected the request|denied/i.test(shortMessage)) return true;

  const cause = e.cause;
  if (cause && typeof cause === "object") {
    const c = cause as Record<string, unknown>;
    if (c.code === 4001) return true;
    if (c.name === "UserRejectedRequestError") return true;
    if (typeof c.message === "string" && /user rejected|rejected the request|denied/i.test(c.message)) return true;
  }

  return false;
}

