import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const enhanceTaskDescription = async (rawInput: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key not found, returning raw input");
    return rawInput;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Transform this raw task input into a concise, professional, and actionable task title. Keep it under 6 words. Do not add quotes.
      
      Input: "${rawInput}"`,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini enhancement failed:", error);
    return rawInput;
  }
};

export const suggestSubtasks = async (taskTitle: string): Promise<string[]> => {
    if (!apiKey) return [];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `For the task "${taskTitle}", suggest 3 short, actionable sub-steps. Return them as a comma-separated list only.`,
        });
        
        const text = response.text || "";
        return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
    } catch (e) {
        return [];
    }
}

export const analyzeTaskPriority = async (task: any): Promise<'High' | 'Medium' | 'Low'> => {
  if (!apiKey) return 'Medium';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this task and suggest a priority level (High, Medium, or Low).
      Title: ${task.title}
      Due Date: ${task.dueDate || 'None'}
      Notes: ${task.notes || 'None'}
      Subtasks: ${task.subtasks?.length || 0}
      
      Return ONLY one word: High, Medium, or Low.`,
    });

    const text = response.text?.trim();
    if (text === 'High' || text === 'Medium' || text === 'Low') {
      return text;
    }
    return 'Medium';
  } catch (e) {
    console.error("Priority analysis failed", e);
    return 'Medium';
  }
};