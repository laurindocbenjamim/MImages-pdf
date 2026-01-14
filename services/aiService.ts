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

/**
 * Sends the image to Gemini to convert handwriting to digital font
 * while maintaining layout.
 */
export const digitizeHandwriting = async (base64Data: string): Promise<string> => {
  const { base64String, mimeType } = getBase64AndMime(base64Data);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64String,
              mimeType: mimeType,
            },
          },
          {
            text: 'Analyze the handwriting in this document. Replace all handwritten text with a clean, professional digital sans-serif font (like Arial or Roboto). Crucially, you must maintain the EXACT layout, position, line spacing, and scale of the original text. Preserve any non-text elements like lines, boxes, or logos. Return only the processed image.',
          },
        ],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
           return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("The AI model processed the request but did not return an image.");
  } catch (error) {
    console.error("AI Digitize Error:", error);
    throw error;
  }
};

/**
 * Analyzes the image layout and returns structured HTML content
 * representing the document (Headers, Paragraphs, Lists).
 */
export const extractDocumentLayout = async (base64Data: string): Promise<string> => {
  const { base64String, mimeType } = getBase64AndMime(base64Data);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64String,
              mimeType: mimeType,
            },
          },
          {
            text: `Perform a layout analysis of this document image. Extract the text and convert it into a semantic HTML structure. 
            
            Rules:
            1. Use <h1>, <h2>, <h3> for headers based on font size/weight.
            2. Use <p> for paragraphs.
            3. Use <ul>/<li> for bulleted lists and <ol>/<li> for numbered lists.
            4. Use <table> for tabular data.
            5. Do NOT use <html>, <head>, or <body> tags. Return only the inner HTML body content.
            6. Do NOT use any CSS classes or inline styles.
            7. Ensure the reading order is correct.
            
            Return ONLY the raw HTML string.`,
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
