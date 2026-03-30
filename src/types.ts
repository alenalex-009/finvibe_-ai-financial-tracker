import { Type } from "@google/genai";

export type TransactionType = 'income' | 'expense';

export type RiskProfile = 'low' | 'medium' | 'high';

export interface User {
  id: string;
  name: string;
  email: string;
  riskProfile?: RiskProfile;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: TransactionType;
}

export interface Budget {
  amount: number;
  month: string; // YYYY-MM
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment Inflow', 'Gift', 'Other'],
  expense: ['Food', 'Rent', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Investment Outflow', 'Savings', 'Other'],
  rule503020: {
    Needs: ['Rent', 'Bills', 'Food', 'Health', 'Transport'],
    Wants: ['Shopping', 'Entertainment', 'Other'],
    Savings: ['Investment Outflow', 'Savings']
  }
};

export const CURRENCY_SYMBOL = '₹';

export const AI_INSIGHT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A brief summary of the financial status."
    },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Actionable financial advice."
    },
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Potential issues or overspending alerts."
    }
  },
  required: ["summary", "suggestions", "warnings"]
};
