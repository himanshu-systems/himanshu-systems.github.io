import { defineMiddleware } from 'astro:middleware';
import TurndownService from 'turndown';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const accept = context.request.headers.get('accept') || '';

  // Only intercept HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Clone the response so we can modify it
  const html = await response.clone().text();

  // If the agent requested markdown via content negotiation
  if (accept.includes('text/markdown')) {
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    
    const markdown = turndownService.turndown(html);
    
    return new Response(markdown, {
      status: response.status,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept, Accept-Encoding'
      }
    });
  }

  // Otherwise, return HTML but include the Vary header to prevent CDN caching issues
  const newResponse = new Response(html, {
    status: response.status,
    headers: new Headers(response.headers)
  });
  newResponse.headers.set('Vary', 'Accept, Accept-Encoding');
  
  return newResponse;
});
