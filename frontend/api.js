import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

// 如果你用手机 Expo Go 测试，要改成电脑局域网 IP：
// const API_BASE_URL = "http://192.168.x.x:8000";
//const API_BASE_URL = "http://127.0.0.1:8000";
//const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://127.0.0.1:8000";
    }
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL || "https://ai-menu-app.onrender.com";
};

const API_BASE_URL = getApiBaseUrl();


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollParseTask(taskId) {
  let consecutiveErrors = 0;
  let attempts = 0;
  const maxAttempts = 150; // 5 minutes max

  while (attempts < maxAttempts) {
    attempts++;
    await sleep(2000);

    try {
      const statusRes = await fetch(
        `${API_BASE_URL}/menus/parse/status/${taskId}`
      );

      if (!statusRes.ok) {
        throw new Error(`HTTP error ${statusRes.status}`);
      }

      const statusData = await statusRes.json();
      consecutiveErrors = 0;

      if (statusData.status === "done") {
        return statusData.result;
      }

      if (statusData.status === "error") {
        throw new Error(statusData.error || "Menu analysis failed");
      }
    } catch (err) {
      console.warn(`Error checking parsing status (attempt ${attempts}):`, err);
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        throw new Error(`Failed to retrieve analysis status: ${err.message}`);
      }
    }
  }

  throw new Error("Menu analysis timed out after 5 minutes.");
}

export async function parseMenuFile(file, targetLang = "zh", sourceLang = "auto") {
  const url = `${API_BASE_URL}/menus/parse/start?target_lang=${encodeURIComponent(targetLang)}&source_lang=${encodeURIComponent(sourceLang)}`;

  if (Platform.OS === "web") {
    const formData = new FormData();
    const fileName = file.name || "menu-upload";
    const mimeType = file.mimeType || file.type || "application/octet-stream";

    const fileResponse = await fetch(file.uri);
    const blob = await fileResponse.blob();
    const uploadFile = new File([blob], fileName, { type: mimeType });
    formData.append("file", uploadFile);

    const startRes = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!startRes.ok) {
      const text = await startRes.text();
      console.log("Start parse failed:", startRes.status, text);
      throw new Error(`Failed to start menu analysis: ${startRes.status}`);
    }

    const startData = await startRes.json();
    return pollParseTask(startData.task_id);
  } else {
    // Native (Android/iOS): Use expo-file-system's native Multipart upload task.
    // This completely bypasses the JS-side FormData and fetch serialization issues.
    const headers = getHeaders();

    const uploadTask = FileSystem.createUploadTask(
      url,
      file.uri,
      {
        httpMethod: "POST",
        fieldName: "file",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        headers: headers,
      }
    );

    const result = await uploadTask.uploadAsync();

    if (!result || result.status < 200 || result.status >= 300) {
      console.log("Start native parse failed:", result?.status, result?.body);
      throw new Error(`Failed to start menu analysis: ${result?.status || 'Unknown error'}`);
    }

    const startData = JSON.parse(result.body);
    return pollParseTask(startData.task_id);
  }
}

export async function parseMenuUrl(menuUrl, targetLang = "zh", sourceLang = "auto") {
  const startRes = await fetch(`${API_BASE_URL}/menus/parse/url/start`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      url: menuUrl,
      target_lang: targetLang,
      source_lang: sourceLang,
    }),
  });

  if (!startRes.ok) {
    let message = `Failed to start URL menu analysis: ${startRes.status}`;
    const responseText = await startRes.text();
    try {
      const payload = JSON.parse(responseText);
      if (payload?.detail) {
        message = payload.detail;
      }
    } catch (err) {
      if (responseText) {
        message = responseText;
      }
    }
    console.log("Start URL parse failed:", startRes.status, message);
    throw new Error(message);
  }

  const startData = await startRes.json();
  return pollParseTask(startData.task_id);
}


let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function hasAuthToken() {
  return Boolean(authToken);
}

function getHeaders(isFormData = false) {
  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

export async function getDishDetail(
  dishName,
  targetLang = "zh",
  sourceLang = "auto",
  dishContext = {}
) {
  const res = await fetch(`${API_BASE_URL}/dish/detail`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      dish_name: dishName,
      target_lang: targetLang,
      source_lang: sourceLang,
      original_name: dishContext.original_name,
      translated_name: dishContext.translated_name || dishContext.name,
      description: dishContext.description,
      ingredients: dishContext.ingredients,
      cuisine: dishContext.cuisine,
      image_prompt: dishContext.image_prompt,
      section_heading_original: dishContext.section_heading_original,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to load dish detail");
  }

  return await res.json();
}

export async function getAIRecommendations(menuItems, people, diets, budget, taste, targetLang = "zh", allergies = null) {
  const res = await fetch(`${API_BASE_URL}/menus/recommend`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      menu_items: menuItems,
      people: people ? parseInt(people, 10) : null,
      diets: diets && diets.length > 0 ? diets : null,
      budget: budget || null,
      taste: taste || null,
      target_lang: targetLang,
      allergies: allergies && allergies.length > 0 ? allergies : null,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Failed to load AI recommendations");
  }

  return await res.json();
}

export async function getCachedMenu(imageHash, targetLang = "zh") {
  const res = await fetch(`${API_BASE_URL}/menus/cache/${imageHash}?target_lang=${encodeURIComponent(targetLang)}`);
  if (!res.ok) {
    throw new Error("Failed to load cached menu");
  }
  return await res.json();
}

async function getErrorMessage(res) {
  try {
    const data = await res.json();
    return data?.detail || data?.message || null;
  } catch (e) {
    try {
      const text = await res.text();
      return text || null;
    } catch (err) {
      return null;
    }
  }
}

export async function register(username, email, password, phone, diets, allergies, budget, taste, preferredLanguage) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email,
      password,
      phone,
      diets,
      allergies,
      budget,
      taste,
      preferred_language: preferredLanguage,
    }),
  });
  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || "Failed to register");
  }
  const data = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || "Failed to login");
  }
  const data = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function loginWithGoogle(email, name, avatarUrl) {
  const res = await fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, avatar_url: avatarUrl }),
  });
  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || "Failed to login with Google");
  }
  const data = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function getProfile() {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || "Failed to fetch user profile");
  }
  return await res.json();
}

export async function updateProfile(profileData) {
  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(profileData),
  });
  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || "Failed to update profile");
  }
  return await res.json();
}

export async function saveUserMenuHistory(record) {
  if (!authToken || !record?.raw) {
    return null;
  }

  const res = await fetch(`${API_BASE_URL}/user/menu-history`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      menu_result: record.raw,
      source_uri: record.imageUri,
      target_lang: record.targetLang,
    }),
  });

  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || "Failed to save user menu history");
  }

  return await res.json();
}

export async function getUserCart() {
  if (!authToken) {
    return { items: [] };
  }

  const res = await fetch(`${API_BASE_URL}/user/cart`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || "Failed to fetch user cart");
  }

  return await res.json();
}

export async function saveUserCart(items) {
  if (!authToken) {
    return null;
  }

  const res = await fetch(`${API_BASE_URL}/user/cart`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({
      items: Array.isArray(items) ? items : [],
    }),
  });

  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || "Failed to save user cart");
  }

  return await res.json();
}

export async function uploadAvatar(file) {
  const url = `${API_BASE_URL}/auth/avatar`;

  if (Platform.OS === "web") {
    const formData = new FormData();
    const fileName = file.name || "avatar.jpg";
    const mimeType = file.mimeType || file.type || "image/jpeg";

    const fileResponse = await fetch(file.uri);
    const blob = await fileResponse.blob();
    formData.append("file", new File([blob], fileName, { type: mimeType }));

    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });

    if (!res.ok) {
      const errMsg = await getErrorMessage(res);
      throw new Error(errMsg || "Failed to upload avatar");
    }
    return await res.json();
  } else {
    // Native (Android/iOS): Use expo-file-system
    const headers = getHeaders();

    const uploadTask = FileSystem.createUploadTask(
      url,
      file.uri,
      {
        httpMethod: "POST",
        fieldName: "file",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        headers: headers,
      }
    );

    const result = await uploadTask.uploadAsync();

    if (!result || result.status < 200 || result.status >= 300) {
      let errMsg = "Failed to upload avatar";
      try {
        const payload = JSON.parse(result.body);
        if (payload?.detail) {
          errMsg = payload.detail;
        } else if (payload?.message) {
          errMsg = payload.message;
        }
      } catch (err) {
        if (result?.body) {
          errMsg = result.body;
        }
      }
      throw new Error(errMsg);
    }

    return JSON.parse(result.body);
  }
}

export async function logout() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: getHeaders(),
    });
  } catch (err) {
    console.warn("Logout request failed:", err);
  }
  setAuthToken(null);
}

export async function passwordReset(email) {
  const res = await fetch(`${API_BASE_URL}/auth/password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || "Failed to send password reset email");
  }
  return await res.json();
}

export async function getGoogleAuthUrl(redirectTo) {
  const url = `${API_BASE_URL}/auth/google/url?redirect_to=${encodeURIComponent(redirectTo)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errMsg = await getErrorMessage(res);
    throw new Error(errMsg || "Failed to get Google Auth URL");
  }
  return await res.json();
}

