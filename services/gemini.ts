
import { GoogleGenAI, Type } from "@google/genai";
import { ProductSuggestion } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Identifies a product based on a barcode string using Google Search Grounding.
 */
export const identifyProductByBarcode = async (barcode: string): Promise<ProductSuggestion | null> => {
  try {
    // Note: When using googleSearch, response.text might not be strictly valid JSON if additional text is included.
    // We use responseMimeType and handle potential cleanup and grounding URLs.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identifique o produto com o código de barras "${barcode}". Retorne o nome comum do produto, a marca (fabricante) e sua categoria geral (ex: Laticínios, Bebidas, Higiene).`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "O nome comercial do produto" },
            brand: { type: Type.STRING, description: "A marca ou fabricante do produto" },
            category: { type: Type.STRING, description: "A categoria do produto" }
          },
          required: ["name", "category"]
        }
      }
    });

    // Extracting text output from GenerateContentResponse property
    let jsonText = response.text || "";
    
    // Clean up markdown code blocks if present (e.g., ```json ... ```)
    jsonText = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      const result = JSON.parse(jsonText) as ProductSuggestion;
      
      // Extract website URLs from groundingChunks as required by guidelines
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        result.searchSourceUrls = groundingChunks
          .map((chunk: any) => chunk.web?.uri)
          .filter((uri: string | undefined): uri is string => !!uri);
      }
      
      return result;
    } catch (parseError) {
      console.error("Failed to parse JSON from AI response:", jsonText);
      return null;
    }

  } catch (error) {
    console.error("Erro ao identificar produto por código de barras:", error);
    return null;
  }
};

/**
 * Identifies a product from an image (simulating a barcode scan or product photo).
 */
export const identifyProductByImage = async (base64Image: string): Promise<ProductSuggestion | null> => {
  try {
    // Use gemini-3-flash-preview for multimodal vision tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          {
            text: "Identifique este produto. Se houver um código de barras visível, leia-o. Retorne o nome do produto, a marca e a categoria em formato JSON com as chaves: name, brand, category."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            brand: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["name", "category"]
        }
      }
    });
    
    // Extracting text output from GenerateContentResponse property
    let jsonText = response.text || "";
    jsonText = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      return JSON.parse(jsonText) as ProductSuggestion;
    } catch (parseError) {
      console.error("Failed to parse vision response:", jsonText);
      return {
        name: response.text?.substring(0, 100) || "Produto desconhecido",
        category: "Detectado por Imagem"
      };
    }

  } catch (error) {
    console.error("Erro ao identificar produto por imagem:", error);
    return null;
  }
};
