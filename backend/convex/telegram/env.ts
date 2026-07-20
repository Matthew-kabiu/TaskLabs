function requiredEnv(name: string) {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for Telegram integration`);
  }
  return value.trim();
}

function requiredHttpsOrigin(name: string) {
  const raw = requiredEnv(name);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`${name} must use https`);
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function telegramApiOrigin() {
  return requiredHttpsOrigin("TELEGRAM_API_ORIGIN");
}

export function telegramWebhookOrigin() {
  return requiredHttpsOrigin("TELEGRAM_WEBHOOK_ORIGIN");
}

export function configuredTelegramChatId() {
  const value = process.env.TELEGRAM_CHAT_ID?.trim();
  if (value === undefined || value.length === 0) return undefined;
  if (!/^-?\d+$/.test(value)) {
    throw new Error("TELEGRAM_CHAT_ID must be a numeric Telegram chat ID");
  }
  return value;
}
