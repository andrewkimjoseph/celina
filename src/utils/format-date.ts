export function formatUnixDate(unixSeconds: number | bigint): string {
  const date = new Date(Number(unixSeconds) * 1000);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .replace(",", "");
}
