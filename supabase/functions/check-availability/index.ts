const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const bucket = "calendarICS";
const file = "Movement LabCalendar.ics";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseCalendarValue(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!match) return null;
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: match[4] ? `${match[4]}:${match[5]}` : null,
  };
}

function parseCalendar(text: string) {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const bookings: Array<{ dates: string[]; summary: string; startTime: string | null; endTime: string | null }> = [];
  let event: Record<string, any> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      event = {};
      continue;
    }

    if (line === "END:VEVENT") {
      if (event?.start) {
        const dates = [event.start.date];
        if (event.end?.date && event.end.date !== event.start.date) dates.push(event.end.date);
        bookings.push({
          dates,
          summary: event.summary || "Lab booking",
          startTime: event.start.time,
          endTime: event.end?.time || null,
        });
      }
      event = null;
      continue;
    }

    if (!event) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const property = line.slice(0, separator).split(";", 1)[0];
    const value = line.slice(separator + 1);
    if (property === "DTSTART") event.start = parseCalendarValue(value);
    if (property === "DTEND") event.end = parseCalendarValue(value);
    if (property === "SUMMARY") event.summary = value.replace(/\\([,;\\])/g, "$1");
  }

  return bookings;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

  try {
    const { dates } = await request.json();
    if (!Array.isArray(dates) || dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      return jsonResponse({ error: "dates must be an array of YYYY-MM-DD values" }, 400);
    }

    const calendarUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(file)}`;
    const calendarResponse = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    });
    if (!calendarResponse.ok) return jsonResponse({ error: "Unable to read lab calendar" }, 500);

    const bookings = parseCalendar(await calendarResponse.text());
    const conflicts = bookings.filter((booking) => booking.dates.some((date) => dates.includes(date)));
    return jsonResponse({ conflicts });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Availability check failed" }, 500);
  }
});
