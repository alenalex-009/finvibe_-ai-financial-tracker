import { GoogleGenAI } from "@google/genai";
import { Transaction, AI_INSIGHT_SCHEMA } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getFinancialInsights(transactions: Transaction[]) {
  if (transactions.length === 0) return null;

  const prompt = `
    Analyze the following financial transactions and provide insights.
    Currency is in Indian Rupees (INR).
    
    Transactions:
    ${JSON.stringify(transactions, null, 2)}
    
    Provide a summary, suggestions for saving, and any warnings about spending habits.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: AI_INSIGHT_SCHEMA,
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    return null;
  }
}

export async function getFinancialAdvice(message: string, transactions: Transaction[], userProfile?: any) {
  const systemInstruction = `
    You are "FinVibe AI", a smart financial advisor for students and young professionals.
    Your goal is to provide actionable financial advice, budgeting tips, and investment guidance.
    
    Context:
    - User Transactions: ${JSON.stringify(transactions.slice(0, 20))}
    - User Profile: ${JSON.stringify(userProfile)}
    
    Guidelines:
    1. Be encouraging, practical, and student-friendly.
    2. Use the 50-30-20 rule as a reference point.
    3. If asked about investments, tailor suggestions to their risk profile (${userProfile?.riskProfile || 'medium'}).
    4. Keep responses concise and formatted in Markdown.
    5. Focus on "Intelligence Guidance" - don't just state facts, provide "next steps".
  `;

  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: { systemInstruction },
    });

    const response = await chat.sendMessage({
      message: message,
    });

    return response.text;
  } catch (error) {
    console.error("Error fetching financial advice:", error);
    return "I'm sorry, I'm having trouble connecting to my financial brain right now. Please try again later!";
  }
}

export async function categorizeDescription(description: string): Promise<string | null> {
  const prompt = `
    Categorize this transaction description into one of these categories: 
    Income: Salary, Freelance, Investment Inflow, Gift, Other.
    Expense: Food, Rent, Transport, Shopping, Entertainment, Health, Bills, Investment Outflow, Savings, Other.
    
    Description: "${description}"
    
    Return only the category name.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text?.trim() || 'Other';
  } catch (error) {
    console.error("Error categorizing description:", error);
    return 'Other';
  }
}
