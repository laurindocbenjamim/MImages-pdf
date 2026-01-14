import jsPDF from 'jspdf';
import { ImageFile } from '../types';

/**
 * Generates a PDF from a list of images.
 * In a real Flask application, this would send the file blobs to a Python endpoint.
 * Here, we use jsPDF to do it client-side for immediate functionality.
 */
export const generatePDF = async (images: ImageFile[], filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      // Default to A4, but we will adjust page size per image if needed or fit image to A4
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      images.forEach((image, index) => {
        if (index > 0) {
          doc.addPage();
        }

        const imgProps = doc.getImageProperties(image.previewUrl);
        
        // Calculate dimensions to fit the image within the page (A4) while maintaining aspect ratio
        const pdfRatio = pageWidth / pageHeight;
        const imgRatio = imgProps.width / imgProps.height;
        
        let finalWidth = pageWidth;
        let finalHeight = pageHeight;
        
        // Add some margin (10mm)
        const margin = 10;
        const maxW = pageWidth - (margin * 2);
        const maxH = pageHeight - (margin * 2);

        if (imgRatio > 1) {
           // Landscapeish
           finalWidth = maxW;
           finalHeight = maxW / imgRatio;
           if (finalHeight > maxH) {
             finalHeight = maxH;
             finalWidth = maxH * imgRatio;
           }
        } else {
           // Portraitish
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

        doc.addImage(image.previewUrl, 'JPEG', x, y, finalWidth, finalHeight);
      });

      doc.save(`${filename}.pdf`);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

/*
  // FLASK MOCK IMPLEMENTATION
  // If you were connecting to a Flask backend, the code would look like this:

  export const generatePDFFlask = async (images: ImageFile[], filename: string) => {
    const formData = new FormData();
    images.forEach(img => formData.append('files', img.file));
    formData.append('filename', filename);

    const response = await fetch('/api/merge', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Merge failed');
    
    // Handle blob download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.pdf`;
    a.click();
  }
*/