// 如果你用手机 Expo Go 测试，要改成电脑局域网 IP：
// const API_BASE_URL = "http://192.168.x.x:8000";
//const API_BASE_URL = "http://127.0.0.1:8000";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function parseMenuFile(file, targetLang = "zh") {
  const formData = new FormData();

  const fileName =
    file.name ||
    (file.mimeType === "application/pdf" ? "menu.pdf" : "menu.jpg");

  const mimeType =
    file.mimeType ||
    file.type ||
    (fileName.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : "image/jpeg");

  let uploadFile;

  // Expo Web: uri 是 blob:http://...，必须转 Blob
  if (typeof window !== "undefined") {
    const fileResponse = await fetch(file.uri);
    const blob = await fileResponse.blob();

    uploadFile = new File([blob], fileName, {
      type: mimeType,
    });

    formData.append("file", uploadFile);
  } else {
    // Expo Go / Native
    formData.append("file", {
      uri: file.uri,
      name: fileName,
      type: mimeType,
    });
  }

  const startRes = await fetch(
    `${API_BASE_URL}/menus/parse/start?target_lang=${targetLang}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!startRes.ok) {
    const text = await startRes.text();
    console.log("Start parse failed:", startRes.status, text);
    throw new Error(`Failed to start menu analysis: ${startRes.status}`);
  }

  const startData = await startRes.json();
  const taskId = startData.task_id;

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusRes = await fetch(
      `${API_BASE_URL}/menus/parse/status/${taskId}`
    );

    const statusData = await statusRes.json();

    if (statusData.status === "done") {
      return statusData.result;
    }

    if (statusData.status === "error") {
      throw new Error(statusData.error || "Menu analysis failed");
    }
  }
}


export async function getDishDetail(dishName, targetLang = "zh") {
  const res = await fetch(`${API_BASE_URL}/dish/detail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dish_name: dishName,
      target_lang: targetLang,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to load dish detail");
  }

  return await res.json();
}