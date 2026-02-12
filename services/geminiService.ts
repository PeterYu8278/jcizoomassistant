import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize the client only if the key is available to avoid runtime crashes on init
// Actual checks happen inside the function
const getAiClient = () => {
  if (!apiKey) {
    console.warn("API_KEY is missing from process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateMeetingAgenda = async (topic: string, category: string, duration: number): Promise<string> => {
  const ai = getAiClient();
  if (!ai) {
    return "Error: API Key is missing. Please configure the environment.";
  }

  try {
    const prompt = `
      You are an expert secretary for the Junior Chamber International (JCI).
      Create a structured, professional meeting agenda for a ${duration}-minute "${category}" meeting about: "${topic}".
      
      Format the output as a clean Markdown list with time allocations for each item. 
      Keep it concise and action-oriented.
      Do not include a preamble or postscript, just the agenda.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful, organized, and professional JCI administrator. JCI is a network of young active citizens creating positive change. Maintain a tone that is empowering, professional, and efficient.",
        temperature: 0.7,
      }
    });

    return response.text || "Could not generate agenda.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate agenda due to an error. Please try again.";
  }
};