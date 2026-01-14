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
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '794px'; // A4 width at 96 DPI approx
  // Let height be auto to capture full content, but ensure min height matches A4 aspect
  container.style.minHeight = '1123px'; // A4 height
  
  // Padding Logic:
  // Editor Width: 595px, Padding: 80px (px-20)
  // Ratio: 80 / 595 = 0.1344
  // PDF Width: 794px
  // Target Padding: 794 * 0.1344 ≈ 106px
  container.style.padding = '106px 106px 85px 106px'; // Top/Left/Right: ~106px, Bottom: slightly less
  
  container.style.backgroundColor = 'white';
  container.style.color = '#1e293b'; // slate-800
  
  // Apply the EXACT same classes as the editor
  container.className = 'font-sans prose prose-slate max-w-none break-words whitespace-pre-wrap leading-relaxed'; 
  
  container.innerHTML = htmlContent;
  
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // Higher resolution for crisp text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794
    });
    return canvas.toDataURL('image/jpeg', 0.95);
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Slices a long image into multiple A4-sized chunks
 */
const sliceLongImage = (imageUrl: string, a4Ratio: number): Promise<string[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const imgW = img.width;
      const imgH = img.height;
      
      // Calculate the height of one "page" in image pixels based on the target aspect ratio
      // a4Ratio = width / height (~0.7)
      // pageHeight = width / ratio
      const pageHeightInPixels = Math.floor(imgW / a4Ratio);
      
      // If image fits in one page (with small tolerance), don't split
      if (imgH <= pageHeightInPixels + 10) {
         resolve([imageUrl]);
         return;
      }

      const pagesCount = Math.ceil(imgH / pageHeightInPixels);
      const chunks: string[] = [];

      const canvas = document.createElement('canvas');
      canvas.width = imgW;
      canvas.height = pageHeightInPixels;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve([imageUrl]); return; }

      for (let i = 0; i < pagesCount; i++) {
        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate crop area from source
        const sY = i * pageHeightInPixels;
        // The source height is either a full page or the remainder
        const sH = Math.min(pageHeightInPixels, imgH - sY);
        
        // Draw the slice onto the canvas
        // We draw it at y=0. If it's the last partial page, it will be at the top,
        // and the rest of the canvas will remain white (filling the A4 page).
        ctx.drawImage(img, 0, sY, imgW, sH, 0, 0, imgW, sH);
        
        chunks.push(canvas.toDataURL('image/jpeg', 0.95));
      }
      resolve(chunks);
    };
    img.onerror = () => resolve([imageUrl]);
    img.src = imageUrl;
  });
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
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  
  // Use a standard print margin
  const margin = 10; 
  
  // Dimensions of the writable area
  const maxW = pageWidth - (margin * 2);
  const maxH = pageHeight - (margin * 2);
  const pdfRatio = maxW / maxH;

  let pageCounter = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    let processedImageUrl = '';

    if (page.type === 'IMAGE') {
       processedImageUrl = await processImageForPDF(page.content, options.enableScanMode);
    } else if (page.type === 'TEXT') {
       processedImageUrl = await renderHtmlToImage(page.content);
    }

    if (!processedImageUrl) continue;

    // Split content if it exceeds one page vertically
    const imageChunks = await sliceLongImage(processedImageUrl, pdfRatio);

    for (let k = 0; k < imageChunks.length; k++) {
        const chunkUrl = imageChunks[k];
        
        // Add new page for every chunk (except the very first page of the doc)
        if (pageCounter > 0) doc.addPage();
        pageCounter++;

        const imgProps = doc.getImageProperties(chunkUrl);
        const imgRatio = imgProps.width / imgProps.height;
        
        let finalWidth = maxW;
        let finalHeight = maxW / imgRatio;

        // If for some reason the slice doesn't match PDF ratio (e.g. slight rounding),
        // ensure we don't exceed bounds
        if (finalHeight > maxH) {
             finalHeight = maxH;
             finalWidth = maxH * imgRatio;
        }

        // Center the image in the writable area
        const x = margin + (maxW - finalWidth) / 2;
        const y = margin + (maxH - finalHeight) / 2;

        doc.addImage(chunkUrl, 'JPEG', x, y, finalWidth, finalHeight);

        if (options.includePageNumbers) {
          doc.setFontSize(10);
          doc.setTextColor(150);
          const pageNumText = `Page ${pageCounter}`;
          const textWidth = doc.getTextWidth(pageNumText);
          // Position footer inside the bottom margin
          doc.text(pageNumText, (pageWidth - textWidth) / 2, pageHeight - 5);
        }
    }
  }

  doc.save(`${filename}.pdf`);
};