import { GoogleGenAI } from "@google/genai";

// Initialize the GenAI client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends the image to Gemini to convert handwriting to digital font
 * while maintaining layout.
 */
export const digitizeHandwriting = async (base64Data: string): Promise<string> => {
  // Ensure we strip the data URL prefix to get raw base64 if necessary,
  // though the SDK often handles it, it's safer to provide clean data or handled via inlineData structure.
  // The SDK expects the raw base64 string for 'data'.
  const base64String = base64Data.includes(',') 
    ? base64Data.split(',')[1] 
    : base64Data;
    
  // Detect mime type roughly
  let mimeType = 'image/jpeg';
  if (base64Data.startsWith('data:image/png')) mimeType = 'image/png';
  if (base64Data.startsWith('data:image/webp')) mimeType = 'image/webp';

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

    // Check if the model returned an image
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
