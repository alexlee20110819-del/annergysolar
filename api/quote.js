/**
 * POST /api/quote — free-assessment request handler.
 *
 * Vercel picks this up automatically as a Node serverless function; there is no
 * build step. It validates server-side (the browser validation in site.js is a
 * convenience, not a control) and drops obvious spam.
 *
 * TO GO LIVE: set RESEND_API_KEY and QUOTE_INBOX in the Vercel project's
 * environment variables and uncomment the delivery block below. Until then the
 * function validates and logs, so the form never silently swallows a lead.
 */

const FIELD_LIMITS = {
  name: 120,
  phone: 40,
  email: 160,
  postcode: 8,
  property: 40,
  bill: 40,
  interest: 40,
  message: 4000
};

const clean = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function validate(body) {
  const errors = [];
  const data = {};

  for (const [field, max] of Object.entries(FIELD_LIMITS)) {
    data[field] = clean(body[field], max);
  }

  if (!data.name) errors.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.push("email");
  if (data.phone.replace(/\D/g, "").length < 8) errors.push("phone");
  if (!/^4\d{3}$/.test(data.postcode)) errors.push("postcode");
  if (body.consent !== "on" && body.consent !== true && body.consent !== "true") {
    errors.push("consent");
  }

  return { data, errors };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};

  // Honeypot: real people never fill this in.
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

  // --- Delivery -----------------------------------------------------------
  // const response = await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  //     "Content-Type": "application/json"
  //   },
  //   body: JSON.stringify({
  //     from: "Annergy website <website@annergysolar.com.au>",
  //     to: [process.env.QUOTE_INBOX],
  //     reply_to: lead.email,
  //     subject: `Quote request — ${lead.name}, ${lead.postcode}`,
  //     text: Object.entries(lead).map(([k, v]) => `${k}: ${v}`).join("\n")
  //   })
  // });
  // if (!response.ok) {
  //   console.error("lead delivery failed", await response.text());
  //   return res.status(502).json({ error: "We couldn't send that just now." });
  // }
  // ------------------------------------------------------------------------

  console.log("quote request", lead);
  return res.status(200).json({ ok: true });
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
