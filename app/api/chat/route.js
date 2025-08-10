import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // Note: removed NEXT_PUBLIC_
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(request) {
  try {
    const { messages } = await request.json();

    // Check if API key is available
    if (!OPENROUTER_API_KEY) {
      console.warn('OPENROUTER_API_KEY not set, using mock response');
      
      // Create a mock streaming response
      const mockResponse = "Hello! I'm currently in demo mode since the API key isn't configured. In a real deployment, I would be powered by AI to have dynamic conversations!";
      
      const stream = new ReadableStream({
        start(controller) {
          // Simulate streaming by sending the response in chunks
          const chunks = mockResponse.split(' ');
          let index = 0;
          
          const interval = setInterval(() => {
            if (index < chunks.length) {
              const chunk = {
                choices: [{
                  delta: {
                    content: (index === 0 ? '' : ' ') + chunks[index]
                  }
                }]
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
              index++;
            } else {
              controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
              controller.close();
              clearInterval(interval);
            }
          }, 100);
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

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

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

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