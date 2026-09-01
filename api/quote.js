/**
 * POST /api/quote — free-assessment request handler.
 *
 * Vercel picks this up automatically as a Node serverless function; there is no
 * build step. It validates server-side (the browser validation in site.js is a
 * convenience, not a control) and drops obvious spam.
 *
 * CONFIGURATION — the form is inert until both of these are set in the Vercel
 * project's environment variables:
 *
 *   RESEND_API_KEY   an API key from resend.com
 *   QUOTE_INBOX      where leads should land, e.g. info@annergy.com.au
 *
 * Until they are, the handler deliberately returns 503 and tells the visitor to
 * phone instead. It does NOT pretend to have accepted the enquiry — a form that
 * silently swallows leads is worse than one that is visibly switched off. Every
 * lead is also written to the error log, so nothing is lost if delivery breaks.
 *
 * Using a different provider? Replace deliver() below; nothing else changes.
 */

const FIELD_LIMITS = {
  name: 120,
  phone: 40,
  email: 160,
  postcode: 8,
  // Not on the current four-field form, but accepted and forwarded if a
  // message field is ever added back to the page.
  message: 2000
};

const PHONE = "0416 085 122";
const EMAIL = "info@annergy.com.au";
const CONTACT_FALLBACK =
  `Sorry — our form isn't sending right now. Please call ${PHONE} or email ${EMAIL} and we'll get straight onto it.`;

const clean = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function validate(body) {
  const errors = [];
  const data = {};

  for (const [field, max] of Object.entries(FIELD_LIMITS)) {
    data[field] = clean(body[field], max);
  }

  if (!data.name) errors.push("name");
  if (data.phone.replace(/\D/g, "").length < 8) errors.push("phone");
  if (!/^4\d{3}$/.test(data.postcode)) errors.push("postcode");
  // Email is optional — validated only when the visitor supplied one.
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
    errors.push("email");
  }
  if (body.consent !== "on" && body.consent !== true && body.consent !== "true") {
    errors.push("consent");
  }

  return { data, errors };
}

async function deliver(lead) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Annergy website <website@annergy.com.au>",
      to: [process.env.QUOTE_INBOX],
      ...(lead.email ? { reply_to: lead.email } : {}),
      subject: `Quote request — ${lead.name}, ${lead.postcode}`,
      text: Object.entries(lead)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    })
  });

  if (!response.ok) {
    throw new Error(`resend ${response.status}: ${await response.text()}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};

  // Honeypot: real people never fill this in. Answer 200 so bots see success.
  if (clean(body.company_website, 200)) {
    return res.status(200).json({ ok: true });
  }

  const { data, errors } = validate(body);
  if (errors.length) {
    return res.status(400).json({
      error: "Some details are missing or invalid.",
      fields: errors
    });
  }

  const lead = {
    ...data,
    receivedAt: new Date().toISOString(),
    source: req.headers.referer || "direct"
  };

  if (!process.env.RESEND_API_KEY || !process.env.QUOTE_INBOX) {
    console.error(
      "QUOTE FORM NOT CONFIGURED — set RESEND_API_KEY and QUOTE_INBOX. Lead:",
      JSON.stringify(lead)
    );
    return res.status(503).json({ error: CONTACT_FALLBACK });
  }

  try {
    await deliver(lead);
  } catch (err) {
    // Log the whole lead so it is recoverable from the function logs.
    console.error("LEAD DELIVERY FAILED:", err.message, JSON.stringify(lead));
    return res.status(502).json({ error: CONTACT_FALLBACK });
  }

  return res.status(200).json({ ok: true });
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
