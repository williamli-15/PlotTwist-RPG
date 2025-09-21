import { NextResponse } from 'next/server';

const SERPAPI_KEY = process.env.SERP_API_KEY;

export async function POST(request) {
  try {
    const { query, num = 5 } = await request.json();

    console.log('Google search request:', { query, num, hasApiKey: !!SERPAPI_KEY });

    if (!query) {
      return NextResponse.json(
        { error: 'Missing search query parameter' },
        { status: 400 }
      );
    }

    if (!SERPAPI_KEY) {
      return NextResponse.json(
        { error: 'SerpAPI key not configured' },
        { status: 500 }
      );
    }

    // Perform Google search
    const searchParams = new URLSearchParams({
      engine: 'google',
      q: query,
      api_key: SERPAPI_KEY,
      gl: 'us',
      hl: 'en',
      num: num.toString()
    });

    const response = await fetch(`https://serpapi.com/search.json?${searchParams}`);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'SerpAPI request failed', details: data },
        { status: response.status }
      );
    }

    // Extract search results
    let results = [];
    let searchInfo = {};

    if (data.organic_results && data.organic_results.length > 0) {
      results = data.organic_results.map(result => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        displayed_link: result.displayed_link,
        source: result.displayed_link || new URL(result.link).hostname
      }));
    }

    if (data.search_information) {
      searchInfo = {
        query: data.search_information.query_displayed || query,
        total_results: data.search_information.total_results || 0,
        time_taken: data.search_information.time_taken_displayed
      };
    }

    // Also get knowledge graph if available
    let knowledgeGraph = null;
    if (data.knowledge_graph) {
      knowledgeGraph = {
        title: data.knowledge_graph.title,
        type: data.knowledge_graph.type,
        description: data.knowledge_graph.description,
        source: data.knowledge_graph.source
      };
    }

    // Get answer box if available
    let answerBox = null;
    if (data.answer_box) {
      answerBox = {
        type: data.answer_box.type,
        title: data.answer_box.title,
        snippet: data.answer_box.snippet || data.answer_box.answer,
        source: data.answer_box.source
      };
    }

    return NextResponse.json({
      success: true,
      searchInfo,
      results,
      knowledgeGraph,
      answerBox,
      totalResults: results.length
    });

  } catch (error) {
    console.error('Google search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}