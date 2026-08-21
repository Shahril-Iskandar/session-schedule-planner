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
const calendarSection = document.querySelector("#calendar-section");
const calendarMonths = document.querySelector("#calendar-months");

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

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthsBetween(startDate, endDate) {
  const months = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 12);
  const finalMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1, 12);

  while (cursor <= finalMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function renderCalendars() {
  const sessionLookup = new Map(
    currentDates.map((date, index) => [dateKey(date), index + 1]),
  );
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  calendarMonths.replaceChildren();

  getMonthsBetween(currentDates[0], currentDates.at(-1)).forEach((monthDate) => {
    const month = document.createElement("article");
    month.className = "calendar-month";

    const title = document.createElement("h3");
    title.textContent = new Intl.DateTimeFormat("en-AU", {
      month: "long",
      year: "numeric",
    }).format(monthDate);
    month.append(title);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    grid.setAttribute("role", "grid");
    grid.setAttribute("aria-label", title.textContent);

    weekdayLabels.forEach((label) => {
      const weekday = document.createElement("span");
      weekday.className = "calendar-weekday";
      weekday.textContent = label;
      weekday.setAttribute("aria-hidden", "true");
      grid.append(weekday);
    });

    const year = monthDate.getFullYear();
    const monthIndex = monthDate.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1, 12).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate();

    for (let blank = 0; blank < firstWeekday; blank += 1) {
      const spacer = document.createElement("span");
      spacer.className = "calendar-day is-empty";
      spacer.setAttribute("aria-hidden", "true");
      grid.append(spacer);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day, 12);
      const sessionNumber = sessionLookup.get(dateKey(date));
      const cell = document.createElement("span");
      cell.className = "calendar-day";
      if (date.getDay() === 0) cell.classList.add("is-sunday");
      cell.innerHTML = `<span>${day}</span>`;

      if (sessionNumber) {
        cell.classList.add("is-session");
        cell.innerHTML += `<b>S${sessionNumber}</b>`;
        cell.setAttribute("aria-label", `${formatLong(date)}, Session ${sessionNumber}`);
      } else {
        cell.setAttribute("aria-label", formatLong(date));
      }

      grid.append(cell);
    }

    month.append(grid);
    calendarMonths.append(month);
  });

  calendarSection.hidden = false;
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
  renderCalendars();
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
