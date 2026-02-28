import { GoogleGenAI } from "@google/genai";
import { Trade } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateTradeInsights(trades: Trade[]) {
  if (trades.length < 5) return "Adicione mais trades para receber insights inteligentes.";

  const tradeSummary = trades.slice(0, 20).map(t => ({
    asset: t.asset,
    result: t.result_cash,
    setup: t.setup,
    planned: t.is_planned,
    emotion: t.emotion,
    discipline: t.discipline_note,
    time: t.entry_time
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analise estes trades de um trader e forneça 3 insights curtos e diretos em português sobre sua performance, focando em padrões de erro ou acerto.
      
      Dados: ${JSON.stringify(tradeSummary)}`,
      config: {
        systemInstruction: "Você é um mentor de trading profissional. Seja direto, técnico e encorajador.",
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar insights no momento.";
  }
}
