const fs = require('fs');
let content = fs.readFileSync('frontend/api.js', 'utf8');
const func = `
export async function loginWithAppleIdToken(idToken, nonce) {
  const res = await fetch(\`\${API_BASE_URL}/auth/apple/id_token\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken, nonce })
  });
  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || 'Failed to authenticate with Apple');
  }
  return await res.json();
}
`;
content += func;
fs.writeFileSync('frontend/api.js', content);
