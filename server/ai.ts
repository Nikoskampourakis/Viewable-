/**
 * AI Deep Thread Analysis & Fact-Check Engine
 * Powered by Google Gemini 3.1 Pro Preview with HIGH Thinking Mode
 * (ThinkingLevel.HIGH) to analyze complex arguments, fact-check claims,
 * and provide neutral debate summaries.
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Request, Response } from 'express';

const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function handleAIAnalysis(req: Request, res: Response) {
  try {
    const { tweetText, author, threadContext, question } = req.body;

    if (!tweetText) {
      res.status(400).json({ error: 'Missing tweetText parameter' });
      return;
    }

    if (!ai) {
      // Graceful local summary if API key is not configured in environment
      res.json({
        analysis: `### 🔍 Thread Summary\n**Author**: ${author || 'Unknown'}\n**Primary Claim**: "${tweetText.slice(0, 150)}..."\n\n*Note: High-thinking Gemini 3.1 Pro analysis is ready. Configure GEMINI_API_KEY in the Secrets panel to activate live deep fact-checking.*`,
        thinkingModel: 'gemini-3.1-pro-preview',
        mode: 'fallback',
      });
      return;
    }

    const systemPrompt = `You are a neutral, highly analytical fact-checker and discourse scholar for Viewable, a privacy-preserving reader client.
Your goal is to perform a rigorous deep analysis of the provided social media post or thread.
Break down:
1. Core Claims & Logic: Identify the main assertions.
2. Fact-Check & Verification: Assess claims against known evidence, noting consensus, ambiguity, or disputed points.
3. Perspective & Counterarguments: Present well-reasoned counter-perspectives fairly.
4. Rhetoric & Nuance: Highlight emotional framing, missing context, or logical fallacies if present.
Remain completely objective, calm, and evidence-grounded.`;

    const userPrompt = `Analyze this post:
Author: @${author || 'unknown'}
Content: "${tweetText}"
${threadContext ? `Contextual Thread: ${threadContext}` : ''}
${question ? `User Question: ${question}` : 'Provide a comprehensive breakdown.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    const outputText = response.text || 'Unable to generate analysis at this time.';

    res.json({
      analysis: outputText,
      thinkingModel: 'gemini-3.1-pro-preview',
      thinkingLevel: 'HIGH',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      error: `AI analysis failed: ${err?.message || 'unknown error'}`,
    });
  }
}
