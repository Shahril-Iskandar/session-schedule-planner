const SESSION_WEEK_OFFSETS = [0, 1, 3, 6, 9, 11];

const form = document.querySelector("#schedule-form");
const dateInput = document.querySelector("#start-date");
const dateError = document.querySelector("#date-error");
const emptyState = document.querySelector("#empty-state");
const scheduleList = document.querySelector("#schedule-list");
const scheduleSummary = document.querySelector("#schedule-summary");
const scheduleActions = document.querySelector("#schedule-actions");
const copyButton = document.querySelector("#copy-button");
const calendarButton = document.querySelector("#calendar-button");

let currentDates = [];

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day, 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addWeeks(date, weeks) {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function formatLong(date) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShort(date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function renderSchedule(startDate) {
  currentDates = SESSION_WEEK_OFFSETS.map((weeks) => addWeeks(startDate, weeks));
  scheduleList.replaceChildren();

  currentDates.forEach((date, index) => {
    const item = document.createElement("li");
    item.className = "session";
    item.innerHTML = `
      <span class="session-number">S${index + 1}</span>
      <div class="session-date">
        <strong>${formatLong(date)}</strong>
        <span>${formatShort(date)}</span>
      </div>
      <span class="week-label">${SESSION_WEEK_OFFSETS[index] === 0 ? "Start" : `Week +${SESSION_WEEK_OFFSETS[index]}`}</span>
    `;
    scheduleList.append(item);
  });

  const days = Math.round((currentDates.at(-1) - currentDates[0]) / 86400000);
  scheduleSummary.textContent = `${days} days from the first session to the final session · all sessions fall on a ${new Intl.DateTimeFormat("en-AU", { weekday: "long" }).format(startDate)}.`;
  emptyState.hidden = true;
  scheduleList.hidden = false;
  scheduleSummary.hidden = false;
  scheduleActions.hidden = false;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const startDate = parseLocalDate(dateInput.value);
  dateError.hidden = Boolean(startDate);
  if (!startDate) return;
  renderSchedule(startDate);
});

copyButton.addEventListener("click", async () => {
  const text = currentDates
    .map((date, index) => `Session ${index + 1}: ${formatLong(date)}`)
    .join("\n");
  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Copied!";
    copyButton.classList.add("copied");
    window.setTimeout(() => {
      copyButton.textContent = "Copy dates";
      copyButton.classList.remove("copied");
    }, 1800);
  } catch {
    window.prompt("Copy your session dates:", text);
  }
});

function toCalendarDate(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

calendarButton.addEventListener("click", () => {
  const events = currentDates.map((date, index) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return [
      "BEGIN:VEVENT",
      `UID:session-${index + 1}-${toCalendarDate(date)}@schedule-planner`,
      `DTSTART;VALUE=DATE:${toCalendarDate(date)}`,
      `DTEND;VALUE=DATE:${toCalendarDate(nextDay)}`,
      `SUMMARY:Study Session ${index + 1}`,
      "DESCRIPTION:Scheduled with Session Schedule Planner",
      "END:VEVENT",
    ].join("\r\n");
  });

  const calendar = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Session Schedule Planner//EN", ...events, "END:VCALENDAR"].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  link.download = "session-schedule.ics";
  link.click();
  URL.revokeObjectURL(link.href);
});
