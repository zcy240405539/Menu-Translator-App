const fs = require('fs');

const path = 'frontend/components/LoginRegisterModal.js';
let content = fs.readFileSync(path, 'utf8');

// Add import
content = content.replace(
  'import { login, register, passwordReset, getAppleAuthUrl, getGoogleAuthUrl } from "../api";',
  'import { login, register, passwordReset, getAppleAuthUrl, getGoogleAuthUrl, loginWithAppleIdToken } from "../api";\nimport * as AppleAuthentication from "expo-apple-authentication";'
);

// Replace handleAppleLogin
const newAppleLogin = `  const handleAppleLogin = async () => {
    if (Platform.OS === 'ios') {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (credential.identityToken) {
          setError("");
          setLoading(true);
          const data = await loginWithAppleIdToken(credential.identityToken, credential.nonce);
          onLoginSuccess(data.access_token, data.user);
          onClose();
        }
      } catch (e) {
        if (e.code === 'ERR_REQUEST_CANCELED') {
          // ignore
        } else {
          setError(t.appleLoginFailed || "Failed to start Apple sign-in");
        }
      } finally {
        setLoading(false);
      }
    } else {
      handleOAuthLogin(getAppleAuthUrl, t.appleLoginFailed);
    }
  };`;

content = content.replace(
  /const handleAppleLogin = \(\) => handleOAuthLogin\(getAppleAuthUrl, t\.appleLoginFailed\);/,
  newAppleLogin
);

fs.writeFileSync(path, content);
