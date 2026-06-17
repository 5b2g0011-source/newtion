/**
 * Uploads a file anonymously to a public image hosting API (telegra.ph)
 * with a fallback to graph.org if the primary service fails.
 * Returns the direct URL of the uploaded image.
 */
export const uploadImage = async (file: File): Promise<string> => {
  // 5MB limit check
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('檔案大小不能超過 5MB');
  }

  const formData = new FormData();
  formData.append('file', file);

  // 1. Try Telegra.ph first
  try {
    const response = await fetch('https://telegra.ph/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      if (Array.isArray(result) && result[0] && result[0].src) {
        return `https://telegra.ph${result[0].src}`;
      }
    }
  } catch (err) {
    console.warn('Telegra.ph upload failed, trying backup mirror...', err);
  }

  // 2. Fallback to Graph.org (Telegraph mirror)
  try {
    const response = await fetch('https://graph.org/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      if (Array.isArray(result) && result[0] && result[0].src) {
        return `https://graph.org${result[0].src}`;
      }
    }
  } catch (err) {
    console.error('All image upload mirrors failed:', err);
  }

  throw new Error('圖片上傳失敗，所有匿名圖床服務暫時無法使用，請稍後再試');
};
