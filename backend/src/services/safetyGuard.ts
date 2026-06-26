// Only flag imperative credential requests — NOT existing safety warnings like "do not share"
const CREDENTIAL_REQUEST = [
  /(?<!(?:not|never|don't|dont)\s{0,10})\b(?:please\s+)?(?:share|provide|enter|send|give)\s+(?:your\s+)?(?:pin|otp|password|passcode|credentials?)\b/i,
  /(?:pin|otp|password)\s*(?:টি|টা)?\s*(?:share|দিন|বলুন)\b/i,
];

const REFUND_PROMISE = [
  /we(?:'ll|\s+will)\s+(?:refund|return|send\s+back|reimburse)\s+(?:your\s+)?(?:money|amount|funds?|taka)\b/i,
  /you(?:'ll|\s+will)\s+(?:get|receive)\s+(?:your\s+)?(?:money|refund|amount)\s+back\b/i,
  /আপনার\s+টাকা\s+ফেরত\s+(?:দেব|দেওয়া\s+হবে|পাবেন)\b/i,
];

const UNBLOCK_PROMISE = [
  /your\s+account\s+(?:will\s+(?:be|get)\s+)?(?:unblocked|unlocked|activated|restored)\b/i,
  /আপনার\s+(?:একাউন্ট|অ্যাকাউন্ট)\s+(?:আনলক|খুলে)\s+(?:দেব|দেওয়া\s+হবে)\b/i,
];

const THIRD_PARTY_REDIRECT = [
  /contact\s+(?:this\s+)?number\s*:?\s*\+?\d{10,}/i,
  /call\s+(?:this|our)\s+(?:agent|person|number)\s*:?\s*\+?\d{7,}/i,
];

export interface SafetyResult {
  safe: boolean;
  sanitized: string;
  violations: string[];
}

export function sanitizeCustomerReply(reply: string): SafetyResult {
  const violations: string[] = [];
  let text = reply;

  if (CREDENTIAL_REQUEST.some((p) => p.test(text))) {
    violations.push('credential_request');
    text = text.replace(
      /(?:please\s+)?(?:share|provide|enter|send|give)\s+(?:your\s+)?(?:pin|otp|password|passcode|credentials?)[^.!?]*/gi,
      'Please do not share your PIN or OTP with anyone'
    );
  }

  if (REFUND_PROMISE.some((p) => p.test(text))) {
    violations.push('refund_promise');
    text = text.replace(
      /we(?:'ll|\s+will)\s+(?:refund|return|send\s+back|reimburse)\s+(?:your\s+)?(?:money|amount|funds?|taka)[^.!?]*/gi,
      'any eligible amount will be returned through official channels'
    );
    text = text.replace(
      /you(?:'ll|\s+will)\s+(?:get|receive)\s+(?:your\s+)?(?:money|refund|amount)\s+back[^.!?]*/gi,
      'any eligible amount will be returned through official channels'
    );
  }

  if (UNBLOCK_PROMISE.some((p) => p.test(text))) {
    violations.push('unblock_promise');
    text = text.replace(
      /your\s+account\s+(?:will\s+(?:be|get)\s+)?(?:unblocked|unlocked|activated|restored)[^.!?]*/gi,
      'your case has been forwarded for review'
    );
  }

  if (THIRD_PARTY_REDIRECT.some((p) => p.test(text))) {
    violations.push('third_party_redirect');
    text = text.replace(
      /contact\s+(?:this\s+)?number\s*:?\s*\+?\d+/gi,
      'contact our official support channels'
    );
  }

  return { safe: violations.length === 0, sanitized: text, violations };
}
