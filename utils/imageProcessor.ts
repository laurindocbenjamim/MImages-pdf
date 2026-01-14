/**
 * Processes an image to remove the background (make it transparent)
 * based on luminance thresholding.
 */
export const removeBackground = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { 
        resolve(imageUrl); 
        return; 
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Threshold for considering a pixel "background"
      // Pixels lighter than this will become transparent
      const threshold = 180; 

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate luminance (perceived brightness)
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (luminance > threshold) {
           // Set alpha channel to 0 (fully transparent) for light pixels
           data[i + 3] = 0;
        } else {
           // Enhance the foreground (ink)
           // Make it fully opaque and potentially darken it
           const contrast = 0.8;
           data[i] = r * contrast;
           data[i + 1] = g * contrast;
           data[i + 2] = b * contrast;
           data[i + 3] = 255;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      // Must return PNG to support transparency
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error("Failed to load image for processing"));
    img.src = imageUrl;
  });
};
