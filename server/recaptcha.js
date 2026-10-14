
async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    console.error('RECAPTCHA_SECRET_KEY is not configured.');
    return false;
  }

  if (typeof token !== 'string' || !token.trim()) {
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token.trim());

    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString(),
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}

module.exports = { verifyRecaptcha };
