import "server-only";

export function getDailyIngestionLimit() {
  const value = Number.parseInt(process.env.INGESTION_DAILY_LIMIT ?? "5", 10);
  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : 5;
}
