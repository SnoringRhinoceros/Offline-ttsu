/**
 * @license BSD-3-Clause
 * Copyright (c) 2026, ッツ Reader Authors
 * All rights reserved.
 */

export async function GET() {
  const ZIP_URL =
    'https://github.com/stephenmk/stephenmk.github.io/releases/latest/download/jitendex-yomitan.zip';

  try {
    const response = await fetch(ZIP_URL);

    if (!response.ok) {
      return new Response('Failed to fetch ZIP', { status: response.status });
    }

    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    console.error(err);
    return new Response('Proxy failed', { status: 500 });
  }
}
