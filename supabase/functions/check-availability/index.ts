const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const bucket = "calendarICS";
const file = "lab-events.json";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

type CalendarEvent = {
  startWithTimeZone?: string;
  endWithTimeZone?: string;
  start?: string;
  end?: string;
  showAs?: string;
  isAllDay?: boolean;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "POST required" }, 405);
  }

  try {
    // -----------------------------------------
    // Get requested dates
    // -----------------------------------------

    const { dates } = await request.json();

    if (
      !Array.isArray(dates) ||
      dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))
    ) {
      return jsonResponse(
        { error: "dates must be an array of YYYY-MM-DD values" },
        400,
      );
    }

    // -----------------------------------------
    // Download lab-events.json from Storage
    // -----------------------------------------

    const calendarUrl =
      `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(file)}`;

    const calendarResponse = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    });

    if (!calendarResponse.ok) {
      console.error(
        "Unable to read lab calendar:",
        calendarResponse.status,
        await calendarResponse.text(),
      );

      return jsonResponse(
        { error: "Unable to read lab calendar" },
        500,
      );
    }

    const events: CalendarEvent[] = await calendarResponse.json();

    if (!Array.isArray(events)) {
      return jsonResponse(
        { error: "Invalid lab calendar format" },
        500,
      );
    }

    // -----------------------------------------
    // Convert Outlook UTC times -> Brisbane time
    // -----------------------------------------

    const brisbaneDateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Brisbane",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const brisbaneTimeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Australia/Brisbane",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const bookings = events
      .filter((event) => event.showAs !== "free")
      .map((event) => {
        const startRaw =
          event.startWithTimeZone ??
          (event.start ? `${event.start}Z` : null);

        const endRaw =
          event.endWithTimeZone ??
          (event.end ? `${event.end}Z` : null);

        if (!startRaw || !endRaw) {
          return null;
        }

        const start = new Date(startRaw);
        const end = new Date(endRaw);

        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime())
        ) {
          return null;
        }

        return {
          startDate: brisbaneDateFormatter.format(start),
          endDate: brisbaneDateFormatter.format(end),
          startTime: brisbaneTimeFormatter.format(start),
          endTime: brisbaneTimeFormatter.format(end),
        };
      })
      .filter((booking) => booking !== null);

    // -----------------------------------------
    // Return bookings matching requested dates
    // -----------------------------------------

    const conflicts = bookings.filter(
      (booking) =>
        dates.includes(booking.startDate) ||
        dates.includes(booking.endDate),
    );

    return jsonResponse({ conflicts });

  } catch (error) {
    console.error(error);

    return jsonResponse(
      { error: "Availability check failed" },
      500,
    );
  }
});