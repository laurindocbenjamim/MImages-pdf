import { GoogleGenAI } from "@google/genai";

// Initialize the GenAI client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getBase64AndMime = (base64Data: string) => {
  const base64String = base64Data.includes(',') 
    ? base64Data.split(',')[1] 
    : base64Data;
    
  let mimeType = 'image/jpeg';
  if (base64Data.startsWith('data:image/png')) mimeType = 'image/png';
  if (base64Data.startsWith('data:image/webp')) mimeType = 'image/webp';
  
  return { base64String, mimeType };
};

const urlToBase64 = async (url: string): Promise<string> => {
  // If it's already a data URL, return it
  if (url.startsWith('data:')) return url;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert blob to base64 string"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting URL to base64:", error);
    throw error;
  }
};

/**
 * Analyzes the image layout and returns structured HTML content
 * representing the document (Headers, Paragraphs, Lists).
 */
export const extractDocumentLayout = async (imageUrl: string, preserveFormatting: boolean = true): Promise<string> => {
  try {
    // Ensure we have a base64 data URL
    const base64Data = await urlToBase64(imageUrl);
    const { base64String, mimeType } = getBase64AndMime(base64Data);

    const prompt = preserveFormatting 
      ? `Perform a layout analysis of this document image. Extract the text and convert it into a semantic HTML structure. 
            
            Rules:
            1. Use <h1>, <h2>, <h3> for headers based on font size/weight.
            2. Use <p> for paragraphs.
            3. Use <ul>/<li> for bulleted lists and <ol>/<li> for numbered lists.
            4. Use <table> for tabular data.
            5. Do NOT use <html>, <head>, or <body> tags. Return only the inner HTML body content.
            6. Do NOT use any CSS classes or inline styles.
            7. Ensure the reading order is correct.
            
            Return ONLY the raw HTML string.`
      : `Extract all text from this image and return it as simple HTML paragraphs (<p>). 
         Do not use headers, lists, or bold/italic formatting. 
         Just clean, readable paragraphs of text. 
         Return ONLY the raw HTML string.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64String,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    // Extract text content (HTML)
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error("No text content returned from layout analysis.");
    }

    // Clean up markdown code blocks if present
    const cleanHtml = text.replace(/```html/g, '').replace(/```/g, '').trim();

    return cleanHtml;
  } catch (error) {
    console.error("AI Layout Extraction Error:", error);
    throw error;
  }
};