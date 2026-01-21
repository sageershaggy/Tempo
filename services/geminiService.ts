import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const enhanceTaskDescription = async (rawInput: string): Promise<string> => {
  if (!genAI) {
    console.warn("API Key not found, returning raw input");
    return rawInput;
  }

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Transform this raw task input into a concise, professional, and actionable task title. Keep it under 6 words. Do not add quotes.

      Input: "${rawInput}"`
    });

    return response.text?.trim() || rawInput;
  } catch (error) {
    console.error("Gemini enhancement failed:", error);
    return rawInput;
  }
};

export const suggestSubtasks = async (taskTitle: string): Promise<string[]> => {
    if (!genAI) return [];

    try {
        const response = await genAI.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `For the task "${taskTitle}", suggest 3 short, actionable sub-steps. Return them as a comma-separated list only.`
        });

        const text = response.text || "";
        return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
    } catch (e) {
        return [];
    }
};

export const analyzeTaskPriority = async (task: any): Promise<'High' | 'Medium' | 'Low'> => {
  if (!genAI) return 'Medium';

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Analyze this task and suggest a priority level (High, Medium, or Low).
      Title: ${task.title}
      Due Date: ${task.dueDate || 'None'}
      Notes: ${task.notes || 'None'}
      Subtasks: ${task.subtasks?.length || 0}

      Return ONLY one word: High, Medium, or Low.`
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