import { NextResponse } from 'next/server';

const MODAL_ENDPOINT = process.env.MODAL_ENDPOINT || 'https://your-app--chat.modal.run';

export async function POST(request) {
  try {
    const { messages } = await request.json();

    const response = await fetch(MODAL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        max_tokens: 5000,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Modal API error: ${response.status}`);
    }

    // For now, handle non-streaming response
    const data = await response.json();
    
    // Convert to streaming format that matches OpenRouter
    const streamResponse = new ReadableStream({
      start(controller) {
        const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.delta?.content || '';
        
        // Send the response in chunks to simulate streaming
        const words = content.split(' ');
        let currentContent = '';
        
        words.forEach((word, index) => {
          currentContent += (index > 0 ? ' ' : '') + word;
          
          const chunk = `data: ${JSON.stringify({
            choices: [{
              delta: { content: index === 0 ? currentContent : (' ' + word) },
              finish_reason: null
            }]
          })}\n\n`;
          
          controller.enqueue(new TextEncoder().encode(chunk));
        });
        
        // Send final chunk
        const finalChunk = `data: ${JSON.stringify({
          choices: [{
            delta: {},
            finish_reason: 'stop'
          }]
        })}\n\n`;
        
        controller.enqueue(new TextEncoder().encode(finalChunk));
        controller.close();
      }
    });

    return new NextResponse(streamResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Modal API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}