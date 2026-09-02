<?php
/**
 * POST /api/quote.php, free-assessment request handler (HostPapa / Apache version).
 *
 * This is the PHP twin of api/quote.js, which was written for a Vercel/Node
 * deployment. Same validation, same field limits, same honeypot, same
 * response codes and messages, the only real difference is how the email
 * gets sent: this uses PHP's built-in mail(), which needs no API key and
 * works out of the box on virtually every shared host, HostPapa included.
 *
 * Trade-off worth knowing: mail() hands the message to the server's local
 * mail transport and returns true as soon as that hand-off succeeds. It is
 * NOT a delivery guarantee, and shared-host mail is more prone to landing in
 * spam than a transactional provider like Resend or Postmark. If leads start
 * going missing, that is the first thing to check (search the destination
 * inbox's spam folder, or switch to SMTP via PHPMailer / a provider's API).
 *
 * As with the Node version: every lead is written to the PHP error log
 * before anything else happens, so a failed or lost send is still
 * recoverable from the server's error log rather than gone for good.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const PHONE = '0416 085 122';
const EMAIL = 'info@annergy.com.au';
const TO_ADDRESS = 'info@annergy.com.au';
const FROM_ADDRESS = 'website@annergy.com.au'; // must be a real mailbox/alias on this domain
const CONTACT_FALLBACK = "Sorry, our form isn't sending right now. Please call " . PHONE . " or email " . EMAIL . " and we'll get straight onto it.";

const FIELD_LIMITS = [
    'name'     => 120,
    'phone'    => 40,
    'email'    => 160,
    'postcode' => 8,
    'enquiry'  => 40,
];

function respond(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body);
    exit;
}

function clean($value, int $max): string {
    if (!is_string($value)) return '';
    $v = trim($value);
    // Strip CR/LF so nothing can be smuggled into mail headers via Reply-To.
    $v = str_replace(["\r", "\n"], '', $v);
    return mb_substr($v, 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'Method not allowed']);
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) {
    $body = $_POST; // fall back to a normal form post if it wasn't JSON
}

// Honeypot: real people never fill this in. Answer 200 so bots see "success".
if (clean($body['company_website'] ?? '', 200) !== '') {
    respond(200, ['ok' => true]);
}

$data = [];
foreach (FIELD_LIMITS as $field => $max) {
    $data[$field] = clean($body[$field] ?? '', $max);
}

$errors = [];
if ($data['name'] === '') $errors[] = 'name';
if (strlen(preg_replace('/\D/', '', $data['phone'])) < 8) $errors[] = 'phone';
if (!preg_match('/^4\d{3}$/', $data['postcode'])) $errors[] = 'postcode';
if ($data['email'] !== '' && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
$consentRaw = $body['consent'] ?? '';
if (!in_array($consentRaw, ['on', true, 'true', '1', 1], true)) $errors[] = 'consent';

if ($errors) {
    respond(400, ['error' => 'Some details are missing or invalid.', 'fields' => $errors]);
}

$lead = $data + [
    'receivedAt' => gmdate('c'),
    'source'     => clean($_SERVER['HTTP_REFERER'] ?? 'direct', 200),
];

// Log every valid lead immediately, before attempting delivery, so nothing
// is lost even if mail() itself fails outright.
error_log('QUOTE LEAD: ' . json_encode($lead));

$label = $data['enquiry'] !== '' ? ucfirst($data['enquiry']) : 'Quote';
$subjectRaw = $label . ' request: ' . $data['name'] . ', ' . $data['postcode'];
// mail() does not MIME-encode headers itself, an em dash, or any accented
// character in a customer's name, corrupts the Subject unless this is done
// explicitly. Applies to any non-ASCII text placed in a header, not just this one.
$subject = mb_encode_mimeheader($subjectRaw, 'UTF-8', 'B', "\r\n");
$lines = [];
foreach ($lead as $k => $v) {
    if ($v !== '') $lines[] = "$k: $v";
}
$text = implode("\n", $lines);

$headers = [
    'From: Annergy website <' . FROM_ADDRESS . '>',
    'Content-Type: text/plain; charset=utf-8',
];
if ($data['email'] !== '') {
    $headers[] = 'Reply-To: ' . $data['email'];
}

$sent = @mail(TO_ADDRESS, $subject, $text, implode("\r\n", $headers));

if (!$sent) {
    error_log('QUOTE LEAD DELIVERY FAILED (mail() returned false): ' . json_encode($lead));
    respond(502, ['error' => CONTACT_FALLBACK]);
}

respond(200, ['ok' => true]);
