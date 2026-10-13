import { NextResponse } from 'next/server';
import OpenAI from 'openai';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const client = new OpenAI({
  apiKey: process.env.AGNES_API_KEY,
  baseURL: process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1',
});

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[] };
    const { messages } = body;

    const completion = await client.chat.completions.create({
      model: process.env.AGNES_MODEL || 'agnes-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an intelligent assistant integrated into Tua Website.' },
        ...(messages || []),
      ],
    });

    return NextResponse.json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error('Agnes AI error:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with Agnes AI' },
      { status: 500 }
    );
  }
}