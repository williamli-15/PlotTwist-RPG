import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // Note: removed NEXT_PUBLIC_
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(request) {
  try {
    const { messages } = await request.json();

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
        'X-Title': 'AI Merchant NPC'
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5-8b',
        messages,
        max_tokens: 5000,
        stream: true
      })
    });

    // Return the stream directly
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}