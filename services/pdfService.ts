import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { EditorPage } from '../types';

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
      const threshold = 180; 

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (luminance > threshold) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        } else {
          const contrastFactor = 0.75;
          data[i] = Math.max(0, r * contrastFactor);
          data[i + 1] = Math.max(0, g * contrastFactor);
          data[i + 2] = Math.max(0, b * contrastFactor);
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
};

const renderHtmlToImage = async (htmlContent: string): Promise<string> => {
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '794px'; // A4 width at 96 DPI approx
  container.style.minHeight = '1123px'; // A4 height
  container.style.padding = '48px';
  container.style.backgroundColor = 'white';
  container.style.color = 'black';
  container.className = 'prose prose-slate max-w-none'; // Use Tailwind typography matches
  container.innerHTML = htmlContent;
  
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // Higher resolution
      useCORS: true,
      logging: false
    });
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Generates a PDF from a list of pages (Images or Text).
 */
export const generatePDF = async (
  pages: EditorPage[], 
  filename: string, 
  options: GeneratePDFOptions = { includePageNumbers: false, enableScanMode: false }
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const maxW = pageWidth - (margin * 2);
  const maxH = pageHeight - (margin * 2);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    if (i > 0) doc.addPage();

    let processedImageUrl = '';

    if (page.type === 'IMAGE') {
       processedImageUrl = await processImageForPDF(page.content, options.enableScanMode);
    } else if (page.type === 'TEXT') {
       processedImageUrl = await renderHtmlToImage(page.content);
    }

    if (!processedImageUrl) continue;

    const imgProps = doc.getImageProperties(processedImageUrl);
    const imgRatio = imgProps.width / imgProps.height;
    
    let finalWidth = pageWidth;
    let finalHeight = pageHeight;
    
    if (imgRatio > 1) {
       finalWidth = maxW;
       finalHeight = maxW / imgRatio;
       if (finalHeight > maxH) {
         finalHeight = maxH;
         finalWidth = maxH * imgRatio;
       }
    } else {
       finalHeight = maxH;
       finalWidth = maxH * imgRatio;
       if (finalWidth > maxW) {
         finalWidth = maxW;
         finalHeight = maxW / imgRatio;
       }
    }

    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    doc.addImage(processedImageUrl, 'JPEG', x, y, finalWidth, finalHeight);

    if (options.includePageNumbers) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      const pageNumText = `Page ${i + 1} of ${pages.length}`;
      const textWidth = doc.getTextWidth(pageNumText);
      doc.text(pageNumText, (pageWidth - textWidth) / 2, pageHeight - 10);
    }
  }

  doc.save(`${filename}.pdf`);
};