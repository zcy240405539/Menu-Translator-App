const fs = require('fs');

const path = 'frontend/components/LoginRegisterModal.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import * as Crypto')) {
    content = content.replace(
        'import * as AppleAuthentication from "expo-apple-authentication";',
        'import * as AppleAuthentication from "expo-apple-authentication";\nimport * as Crypto from "expo-crypto";'
    );
}

const oldAppleLogin = `  const handleAppleLogin = async () => {
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

const newAppleLogin = `  const handleAppleLogin = async () => {
    if (Platform.OS === 'ios') {
      try {
        const rawNonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const hashedNonce = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          rawNonce
        );
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        });
        if (credential.identityToken) {
          setError("");
          setLoading(true);
          const data = await loginWithAppleIdToken(credential.identityToken, rawNonce);
          onLoginSuccess(data.access_token, data.user);
          onClose();
        }
      } catch (e) {
        console.error(e);
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

content = content.replace(oldAppleLogin, newAppleLogin);

fs.writeFileSync(path, content);
console.log("Updated LoginRegisterModal.js");
