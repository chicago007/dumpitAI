export interface BoardDateRange {
  startDate: string;
  endDate: string;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function currentYear() {
  return new Date().getFullYear();
}

function bumpYearIfPast(month: number, day: number) {
  const year = currentYear();
  const candidate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (candidate >= today) return year;
  return year + 1;
}

const RANGE_SEP = /[~\-–—]|부터|에서/;

/** `8월 1일 ~ 10일`, `8/1-8/10`, `2026-08-01 ~ 08-10` 등 */
export function parseBoardDateRange(text: string): BoardDateRange | null {
  const trimmed = text
    .trim()
    .replace(/^@(?:기간|period)\s*/i, "")
    .trim();
  if (!trimmed || !RANGE_SEP.test(trimmed)) return null;

  const fullRange = trimmed.match(
    /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\s*[~\-–—]+\s*(?:(\d{4})[.\-/])?(\d{1,2})[.\-/](\d{1,2})/,
  );
  if (fullRange) {
    const startYear = parseInt(fullRange[1], 10);
    const startMonth = parseInt(fullRange[2], 10);
    const startDay = parseInt(fullRange[3], 10);
    const endYear = fullRange[4]
      ? parseInt(fullRange[4], 10)
      : startYear;
    const endMonth = parseInt(fullRange[5], 10);
    const endDay = parseInt(fullRange[6], 10);
    if (!isValidDate(startYear, startMonth, startDay)) return null;
    if (!isValidDate(endYear, endMonth, endDay)) return null;
    return {
      startDate: toIsoDate(startYear, startMonth, startDay),
      endDate: toIsoDate(endYear, endMonth, endDay),
    };
  }

  const koreanSameMonth = trimmed.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*[~\-–—부터에서]+\s*(\d{1,2})\s*일?/,
  );
  if (koreanSameMonth) {
    const month = parseInt(koreanSameMonth[1], 10);
    const startDay = parseInt(koreanSameMonth[2], 10);
    const endDay = parseInt(koreanSameMonth[3], 10);
    const year = bumpYearIfPast(month, startDay);
    if (!isValidDate(year, month, startDay)) return null;
    if (!isValidDate(year, month, endDay)) return null;
    return {
      startDate: toIsoDate(year, month, startDay),
      endDate: toIsoDate(year, month, endDay),
    };
  }

  const koreanCrossMonth = trimmed.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*[~\-–—]+\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?/,
  );
  if (koreanCrossMonth) {
    const startMonth = parseInt(koreanCrossMonth[1], 10);
    const startDay = parseInt(koreanCrossMonth[2], 10);
    const endMonth = parseInt(koreanCrossMonth[3], 10);
    const endDay = parseInt(koreanCrossMonth[4], 10);
    let year = bumpYearIfPast(startMonth, startDay);
    if (endMonth < startMonth) year += 1;
    if (!isValidDate(year, startMonth, startDay)) return null;
    if (!isValidDate(year, endMonth, endDay)) return null;
    return {
      startDate: toIsoDate(year, startMonth, startDay),
      endDate: toIsoDate(year, endMonth, endDay),
    };
  }

  const slashRange = trimmed.match(
    /(\d{1,2})[\/\-](\d{1,2})\s*[~\-–—]+\s*(\d{1,2})(?:[\/\-](\d{1,2}))?/,
  );
  if (slashRange) {
    const startMonth = parseInt(slashRange[1], 10);
    const startDay = parseInt(slashRange[2], 10);
    const endMonth = slashRange[4]
      ? parseInt(slashRange[3], 10)
      : startMonth;
    const endDay = slashRange[4]
      ? parseInt(slashRange[4], 10)
      : parseInt(slashRange[3], 10);
    let year = bumpYearIfPast(startMonth, startDay);
    if (endMonth < startMonth) year += 1;
    if (!isValidDate(year, startMonth, startDay)) return null;
    if (!isValidDate(year, endMonth, endDay)) return null;
    return {
      startDate: toIsoDate(year, startMonth, startDay),
      endDate: toIsoDate(year, endMonth, endDay),
    };
  }

  return null;
}

function isValidDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

export function formatBoardDateRangeKo(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  if (!start && !end) return null;

  const fmtPart = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${Number(m)}월 ${Number(d)}일`;
  };

  if (start && end) {
    const [sy, sm] = start.split("-");
    const [ey, em] = end.split("-");
    if (sy === ey && sm === em) {
      const startDay = Number(start.split("-")[2]);
      const endDay = Number(end.split("-")[2]);
      return `${Number(sm)}월 ${startDay}일 ~ ${endDay}일`;
    }
    return `${fmtPart(start)} ~ ${fmtPart(end)}`;
  }

  return start ? fmtPart(start) : fmtPart(end!);
}

export function normalizeBoardDateRange(
  startDate: string,
  endDate: string,
): BoardDateRange {
  if (startDate <= endDate) {
    return { startDate, endDate };
  }
  return { startDate: endDate, endDate: startDate };
}
