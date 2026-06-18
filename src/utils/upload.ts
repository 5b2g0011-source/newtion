/**
 * Compresses an image file to a JPEG base64 Data URL using HTML Canvas
 * to limit width/height to 1200px and compress at 0.7 quality.
 */
export const compressImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const maxW = 1200;
        const maxH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      img.onerror = () => {
        reject(new Error('無法載入圖片進行壓縮'));
      };
    };
    reader.onerror = () => {
      reject(new Error('檔案讀取失敗'));
    };
  });
};

/**
 * Uploads a file. If an ImgBB API key is provided, uploads to ImgBB cloud.
 * Otherwise, falls back to local compressed base64 data URL.
 */
export const uploadImage = async (file: File): Promise<string> => {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('檔案大小不能超過 5MB');
  }

  const imgbbApiKey = localStorage.getItem('newtion_imgbb_api_key');

  if (imgbbApiKey && imgbbApiKey.trim() !== '') {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey.trim()}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.data && result.data.url) {
          return result.data.url;
        }
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'ImgBB 上傳失敗，請檢查金鑰或網路連線');
    } catch (err: any) {
      console.warn('ImgBB upload failed, falling back to local compression base64...', err);
    }
  }

  // ponytail: base64 fallback has a 1MB firestore/localStorage ceiling. Upgrade path: enforce/prompt for ImgBB/cloud storage key if payload exceeds limits.
  return compressImageToBase64(file);
};

