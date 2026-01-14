import jsPDF from 'jspdf';
import { ImageFile } from '../types';

export interface GeneratePDFOptions {
  includePageNumbers: boolean;
  enableScanMode: boolean;
}

const processImageForPDF = (url: string, enableScanMode: boolean): Promise<string> => {
  if (!enableScanMode) return Promise.resolve(url);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(url);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Threshold for considering a pixel "background" (paper)
      // 0 = black, 255 = white. Higher threshold = more aggressive cleaning.
      const threshold = 180; 

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate luminance (perceived brightness)
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (luminance > threshold) {
          // Turn light pixels (background) to pure white
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        } else {
          // Increase contrast for dark pixels (text/ink) by darkening them
          // Multiply by factor < 1 to darken
          const contrastFactor = 0.75;
          data[i] = Math.max(0, r * contrastFactor);
          data[i + 1] = Math.max(0, g * contrastFactor);
          data[i + 2] = Math.max(0, b * contrastFactor);
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      // Return high quality JPEG to keep file size reasonable
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(url); // Fallback to original if processing fails
    img.src = url;
  });
};

/**
 * Generates a PDF from a list of images.
 * Includes options for background cleaning and pagination.
 */
export const generatePDF = async (
  images: ImageFile[], 
  filename: string, 
  options: GeneratePDFOptions = { includePageNumbers: false, enableScanMode: false }
): Promise<void> => {
  // Create a new PDF document (A4 default)
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const maxW = pageWidth - (margin * 2);
  const maxH = pageHeight - (margin * 2);

  // Process images sequentially to manage memory/resources
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    // Add page if not the first one
    if (i > 0) {
      doc.addPage();
    }

    // Process image (clean background if enabled)
    const processedImageUrl = await processImageForPDF(image.previewUrl, options.enableScanMode);

    const imgProps = doc.getImageProperties(processedImageUrl);
    
    // Calculate dimensions to fit the image within the page (A4) while maintaining aspect ratio
    const imgRatio = imgProps.width / imgProps.height;
    
    let finalWidth = pageWidth;
    let finalHeight = pageHeight;
    
    if (imgRatio > 1) {
       // Landscape-ish image
       finalWidth = maxW;
       finalHeight = maxW / imgRatio;
       if (finalHeight > maxH) {
         finalHeight = maxH;
         finalWidth = maxH * imgRatio;
       }
    } else {
       // Portrait-ish image
       finalHeight = maxH;
       finalWidth = maxH * imgRatio;
       if (finalWidth > maxW) {
         finalWidth = maxW;
         finalHeight = maxW / imgRatio;
       }
    }

    // Center the image
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    doc.addImage(processedImageUrl, 'JPEG', x, y, finalWidth, finalHeight);

    // Add Page Numbers
    if (options.includePageNumbers) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      const pageNumText = `Page ${i + 1} of ${images.length}`;
      const textWidth = doc.getTextWidth(pageNumText);
      // Position at bottom center, slightly above bottom edge
      doc.text(pageNumText, (pageWidth - textWidth) / 2, pageHeight - 10);
    }
  }

  doc.save(`${filename}.pdf`);
};