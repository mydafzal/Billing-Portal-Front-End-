import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'PATCH');
}

async function handleRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string
) {
  try {
    const resolvedParams = await params;
    const pathSegments = Array.isArray(resolvedParams.path) ? resolvedParams.path : [];
    const apiPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
    
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}${apiPath}${queryString ? `?${queryString}` : ''}`;

    const authHeader = request.headers.get('authorization');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    let body: string | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const requestBody = await request.json();
        body = JSON.stringify(requestBody);
      } catch {
        body = undefined;
      }
    }

    console.log(`[PROXY] ${method} ${url}`, { hasAuth: !!authHeader, hasBody: !!body });

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    let data;
    const contentType = response.headers.get('content-type');
    
    const responseText = await response.text();
    
    if (contentType && contentType.includes('application/json')) {
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('[PROXY] Failed to parse JSON response');
        console.error('[PROXY] Response text:', responseText);
        data = { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid JSON response', details: responseText } };
      }
    } else {
      console.error('[PROXY] Non-JSON response:', responseText);
      data = { success: false, error: { code: 'INVALID_RESPONSE', message: 'Non-JSON response from backend', details: responseText } };
    }

    console.log(`[PROXY] Response status: ${response.status}`, JSON.stringify(data, null, 2));
    
    if (response.status >= 400) {
      console.error(`[PROXY] Error response from backend:`, {
        status: response.status,
        url,
        method,
        headers: Object.fromEntries(response.headers.entries()),
        data
      });
    }

    // Return response with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  } catch (error: any) {
    console.error('[PROXY] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'PROXY_ERROR', 
          message: error.message || 'Proxy request failed' 
        } 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

