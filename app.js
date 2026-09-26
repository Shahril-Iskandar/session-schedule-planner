const SESSION_WEEK_OFFSETS = [0, 1, 3, 6, 9, 11];
const CORE_SESSION_COUNT = SESSION_WEEK_OFFSETS.length;
const FIRST_SESSION_NUMBER = 2;
const IS_S1 = new URLSearchParams(window.location.search).get("session")?.toLowerCase() === "s1";
const ATTENDEE_EMAIL = "s5424179@griffithuni.edu.au";
const SUPABASE_FUNCTION_URL = "https://rqyogwdvaaxtovysorbm.supabase.co/functions/v1/check-availability";

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
const calendarDialog = document.querySelector("#calendar-dialog");
const calendarForm = document.querySelector("#calendar-form");
const calendarDialogClose = document.querySelector("#calendar-dialog-close");
const calendarCancel = document.querySelector("#calendar-cancel");
const subjectIdInput = document.querySelector("#subject-id");
const appointmentTimeInput = document.querySelector("#appointment-time");
const labStatus = document.querySelector("#lab-status");
const availabilityWarning = document.querySelector("#availability-warning");

let currentDates = [];
let currentSessions = [];
let labBookings = [];

if (IS_S1) {
  document.title = "Session 1 (S1) | Session Schedule Planner";
  document.querySelector(".eyebrow").textContent = "Session 1 (S1)";
  document.querySelector(".intro").textContent = "Choose a date for Session 1 (S1) to check lab availability. Confirm your appointment with the research team.";
  document.querySelector("#planner-title").textContent = "Choose your Session 1 date";
  document.querySelector(".helper").textContent = "One appointment. Estimated duration: about 3 hours.";
  document.querySelector('label[for="start-date"]').textContent = "Session 1 date";
  form.querySelector('button[type="submit"]').textContent = "Check lab availability →";
  labStatus.textContent = "Lab availability is checked when you select Check lab availability.";
  document.querySelector(".results-header h2").textContent = "Your Session 1 date";
  emptyState.querySelector("p").textContent = "Your Session 1 date will appear here.";
  document.querySelector(".calendar-heading p:not(.section-number)").textContent = "Your Session 1 date is highlighted.";
  document.querySelector(".calendar-legends").replaceChildren();
  document.querySelector("footer span:last-child").textContent = "Session 1 (S1) · About 3 hours";
}

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

function addMonthsClamped(date, months) {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0, 12).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

function alignToWeekday(date, weekday) {
  const result = new Date(date);
  const difference = ((weekday - result.getDay() + 3) % 7) - 3;
  result.setDate(result.getDate() + difference);
  return result;
}

function buildSessions(startDate) {
  if (IS_S1) {
    return [{ date: new Date(startDate), number: 1, name: "Session 1", timing: "Single session", duration: "About 3 hours", type: "core" }];
  }
  const coreSessions = SESSION_WEEK_OFFSETS.map((weeks, index) => ({
    date: addWeeks(startDate, weeks),
    number: FIRST_SESSION_NUMBER + index,
    name: `Session ${FIRST_SESSION_NUMBER + index}`,
    timing: weeks === 0 ? "Start" : `Week +${weeks}`,
    duration: index < 5 ? "About 1 hour" : "About 2 hours",
    type: "core",
  }));

  return [
    ...coreSessions,
    {
      date: alignToWeekday(addMonthsClamped(coreSessions.at(-1).date, 3), startDate.getDay()),
      number: FIRST_SESSION_NUMBER + CORE_SESSION_COUNT,
      name: "3-month follow-up",
      timing: "3 months after S7",
      duration: "About 2 hours",
      type: "follow-up",
    },
    {
      date: alignToWeekday(addMonthsClamped(startDate, 12), startDate.getDay()),
      number: FIRST_SESSION_NUMBER + CORE_SESSION_COUNT + 1,
      name: "1-year follow-up",
      timing: "1 year after S2",
      duration: "About 2 hours",
      type: "follow-up",
    },
  ];
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

function parseCalendarDate(value) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!match) return null;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0),
    0,
  );
}

function formatBookingTime(date) {
  if (!date) return "All day";
  if (typeof date === "string") {
    const [hours, minutes] = date.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "All day";
    return new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(2000, 0, 1, hours, minutes));
  }
  if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
    return "All day";
  }
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function parseLabCalendar(text) {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const bookings = [];
  let event = null;

  lines.forEach((line) => {
    if (line === "BEGIN:VEVENT") {
      event = {};
      return;
    }
    if (line === "END:VEVENT") {
      if (event?.start) {
        const end = event.end || new Date(event.start.getTime() + 24 * 60 * 60 * 1000);
        const dates = [];
        for (const cursor = new Date(event.start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
          dates.push(dateKey(cursor));
        }
        bookings.push({ dates, summary: event.summary || "Lab booking" });
        bookings[bookings.length - 1].start = event.start;
        bookings[bookings.length - 1].end = event.end;
      }
      event = null;
      return;
    }
    if (!event) return;

    const separator = line.indexOf(":");
    if (separator === -1) return;
    const property = line.slice(0, separator).split(";", 1)[0];
    const value = line.slice(separator + 1);
    if (property.startsWith("DTSTART")) event.start = parseCalendarDate(value);
    if (property.startsWith("DTEND")) event.end = parseCalendarDate(value);
    if (property === "SUMMARY") event.summary = value.replace(/\\([,;\\])/g, "$1");
  });

  return bookings;
}

function renderLabStatus() {
  const count = currentSessions.filter((session) => labBookings.some((booking) => booking.dates.includes(dateKey(session.date)))).length;
  labStatus.textContent = `${count} date${count === 1 ? "" : "s"} in conflict with existing lab booking${count === 1 ? "" : "s"}.`;
}

async function loadLabCalendar() {
  labStatus.textContent = "Checking lab availability...";
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dates: currentSessions.map((session) => dateKey(session.date)),
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Calendar request failed: ${response.status}`);
    const result = await response.json();
    labBookings = (result.conflicts || []).map((booking) => ({
      dates: booking.dates || [booking.startDate, booking.endDate].filter(Boolean),
      summary: booking.summary || "Lab booking",
      startTime: booking.startTime || booking.start?.time || null,
      endTime: booking.endTime || booking.end?.time || null,
    }));
    renderLabStatus();
    return true;
  } catch (error) {
    labBookings = [];
    labStatus.textContent = "Lab availability could not be checked; schedule generated without the conflict check.";
    console.error("Unable to load the lab calendar.", error);
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

function renderAvailabilityWarning() {
  if (!currentSessions.length || !labBookings.length) {
    availabilityWarning.hidden = true;
    availabilityWarning.replaceChildren();
    return;
  }

  const conflicts = currentSessions.flatMap((session) => {
    const date = dateKey(session.date);
    return labBookings
      .filter((booking) => booking.dates.includes(date))
      .map((booking) => ({ session, booking }));
  });

  availabilityWarning.hidden = conflicts.length === 0;
  availabilityWarning.replaceChildren();
  if (!conflicts.length) return;

  const heading = document.createElement("strong");
  const count = new Set(conflicts.map(({ session }) => dateKey(session.date))).size;
  heading.textContent = `${count} schedule date${count === 1 ? "" : "s"} conflict${count === 1 ? "s" : ""} based on your selected ${IS_S1 ? "date" : "start date"}.`;
  availabilityWarning.append(heading);

  const list = document.createElement("ul");
  conflicts.forEach(({ session, booking }) => {
    const item = document.createElement("li");
    item.textContent = `S${session.number} on ${formatLong(session.date)} - ${formatBookingTime(booking.startTime || booking.start)}${booking.endTime || booking.end ? `–${formatBookingTime(booking.endTime || booking.end)}` : ""}.`;
    list.append(item);
  });
  availabilityWarning.append(list);

  const note = document.createElement("p");
  note.className = "availability-note";
  note.textContent = "If you would like to book outside these hours, please let Shahril know.";
  availabilityWarning.append(note);
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
    currentSessions.map((session) => [dateKey(session.date), session]),
  );
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  calendarMonths.replaceChildren();

  const sessionMonths = getMonthsBetween(currentDates[0], IS_S1 ? currentDates[0] : currentDates[CORE_SESSION_COUNT - 1]);
  currentDates.slice(CORE_SESSION_COUNT).forEach((date) => {
    const alreadyIncluded = sessionMonths.some(
      (month) => month.getFullYear() === date.getFullYear() && month.getMonth() === date.getMonth(),
    );
    if (!alreadyIncluded) sessionMonths.push(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  });

  sessionMonths.forEach((monthDate) => {
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
      const session = sessionLookup.get(dateKey(date));
      const cell = document.createElement("span");
      cell.className = "calendar-day";
      if (date.getDay() === 0) cell.classList.add("is-sunday");
      cell.innerHTML = `<span>${day}</span>`;

      if (session) {
        cell.classList.add("is-session");
        if (session.type === "follow-up") cell.classList.add("is-follow-up");
        cell.innerHTML += `<b>S${session.number}</b>`;
        cell.setAttribute("aria-label", `${formatLong(date)}, Session ${session.number}`);
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
  currentSessions = buildSessions(startDate);
  currentDates = currentSessions.map((session) => session.date);
  scheduleList.replaceChildren();

  currentSessions.forEach((session, index) => {
    const { date } = session;
    const item = document.createElement("li");
    item.className = `session${session.type === "follow-up" ? " is-follow-up" : ""}`;
    item.innerHTML = `
      <span class="session-number">S${session.number}</span>
      <div class="session-date">
        <strong>${formatLong(date)}</strong>
        <span>${session.name} · ${formatShort(date)}</span>
        <span class="session-duration">Estimated duration: ${session.duration}</span>
      </div>
      <span class="week-label">${session.timing}</span>
    `;
    scheduleList.append(item);
  });

  scheduleSummary.textContent = IS_S1 ? "One appointment. Confirm availability with the research team." : `Eight appointments in total. Every intervention and follow-up session falls on a ${new Intl.DateTimeFormat("en-AU", { weekday: "long" }).format(startDate)}.`;
  emptyState.hidden = true;
  scheduleList.hidden = false;
  scheduleSummary.hidden = false;
  scheduleActions.hidden = IS_S1;
  renderCalendars();
  renderAvailabilityWarning();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const startDate = parseLocalDate(dateInput.value);
  dateError.hidden = Boolean(startDate);
  if (!startDate) return;
  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  labBookings = [];
  renderSchedule(startDate);
  await loadLabCalendar();
  renderAvailabilityWarning();
  submitButton.disabled = false;
});

copyButton.addEventListener("click", async () => {
  const text = currentDates
    .map((date, index) => `${currentSessions[index].name}: ${formatLong(date)} (${currentSessions[index].duration})`)
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

function toCalendarDateTime(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}00`;
}

calendarButton.addEventListener("click", () => {
  calendarDialog.showModal();
  subjectIdInput.focus();
});

calendarDialogClose.addEventListener("click", () => calendarDialog.close());
calendarCancel.addEventListener("click", () => calendarDialog.close());

calendarDialog.addEventListener("click", (event) => {
  if (event.target === calendarDialog) calendarDialog.close();
});

function escapeCalendarText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

calendarForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!calendarForm.reportValidity()) return;

  const subjectId = subjectIdInput.value.trim();
  const [hours, minutes] = appointmentTimeInput.value.split(":").map(Number);
  const createdAt = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const events = currentSessions.map((session) => {
    const appointmentStart = new Date(session.date);
    appointmentStart.setHours(hours, minutes, 0, 0);
    const bookingStart = new Date(appointmentStart.getTime() - 60 * 60 * 1000);
    const bookingMinutes = session.number <= 6 ? 150 : 180;
    const bookingEnd = new Date(bookingStart.getTime() + bookingMinutes * 60 * 1000);
    const summary = `HipOA Gait Intervention (Mocap, EMG, Treadmill) - ${subjectId} (S${session.number})`;

    return [
      "BEGIN:VEVENT",
      `UID:hipoa-${escapeCalendarText(subjectId)}-s${session.number}-${dateKey(session.date)}@schedule-planner`,
      `DTSTAMP:${createdAt}`,
      `DTSTART;TZID=Australia/Brisbane:${toCalendarDateTime(bookingStart)}`,
      `DTEND;TZID=Australia/Brisbane:${toCalendarDateTime(bookingEnd)}`,
      `SUMMARY:${escapeCalendarText(summary)}`,
      `ATTENDEE;CN=${ATTENDEE_EMAIL};ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:${ATTENDEE_EMAIL}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ].join("\r\n");
  });

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Session Schedule Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-TIMEZONE:Australia/Brisbane",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  link.download = `hipoa-${subjectId.replace(/[^a-z0-9_-]+/gi, "-")}-schedule.ics`;
  link.click();
  URL.revokeObjectURL(link.href);
  calendarDialog.close();
});
