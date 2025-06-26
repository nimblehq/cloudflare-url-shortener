// URL Shortener with Cloudflare Workers + KV + Access
// Deploy this as a Cloudflare Worker with KV binding named "SHORT_URL_STORE"

import HTML_TEMPLATE from './admin.html';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        
        // Handle admin interface (protected by Cloudflare Access)
        if (path === '/' || path === '/admin') {
            return new Response(HTML_TEMPLATE, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        // Handle API endpoints (protected by Cloudflare Access)
        if (path.startsWith('/api/')) {
            return handleApiRequest(request, env);
        }
        
        // Handle short URL redirects (public access)
        return handleRedirect(request, env);
    }
};

// Generate a random short path
function generateShortPath(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Validate URL format
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Validate custom path (alphanumeric, hyphens, underscores only)
function isValidPath(path) {
    return /^[a-zA-Z0-9_-]+$/.test(path);
}

// Handle redirect requests
async function handleRedirect(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1); // Remove leading slash
    
    if (!path) {
        return new Response('Not Found', { status: 404 });
    }
    
    try {
        const targetUrl = await env.SHORT_URL_STORE.get(path);
        
        if (!targetUrl) {
            return new Response('Short URL not found', { status: 404 });
        }
        
        return Response.redirect(targetUrl, 302);
    } catch (error) {
        return new Response('Internal Server Error', { status: 500 });
    }
}

// Handle API requests
async function handleApiRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Set CORS headers for API requests
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    try {
        switch (path) {
            case '/api/shorten':
                return await handleShorten(request, env, corsHeaders);
            case '/api/links':
                return await handleListLinks(request, env, corsHeaders);
            case '/api/update':
                return await handleUpdateLink(request, env, corsHeaders);
            case '/api/delete':
                return await handleDeleteLink(request, env, corsHeaders);
            default:
                return new Response('API endpoint not found', { 
                    status: 404, 
                    headers: corsHeaders 
                });
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Create a new short URL
async function handleShorten(request, env, corsHeaders) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }
    
    const { url: targetUrl, customPath } = await request.json();
    
    if (!targetUrl || !isValidUrl(targetUrl)) {
        return new Response(JSON.stringify({ error: 'Invalid URL provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    let shortPath;
    
    if (customPath) {
        if (!isValidPath(customPath)) {
            return new Response(JSON.stringify({ 
                error: 'Custom path can only contain letters, numbers, hyphens, and underscores' 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        // Check if custom path already exists
        const existing = await env.SHORT_URL_STORE.get(customPath);
        if (existing) {
            return new Response(JSON.stringify({ 
                error: 'Custom path already exists. Please choose a different one.' 
            }), {
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        shortPath = customPath;
    } else {
        // Generate unique short path
        do {
            shortPath = generateShortPath();
        } while (await env.SHORT_URL_STORE.get(shortPath));
    }
    
    // Store the URL mapping
    await env.SHORT_URL_STORE.put(shortPath, targetUrl);
    
    // Also store metadata for listing (using a prefix to separate from actual redirects)
    const metadata = {
        path: shortPath,
        url: targetUrl,
        created: new Date().toISOString()
    };
    await env.SHORT_URL_STORE.put(`meta:${shortPath}`, JSON.stringify(metadata));
    
    const shortUrl = `${new URL(request.url).origin}/${shortPath}`;
    
    return new Response(JSON.stringify({ 
        shortUrl, 
        path: shortPath,
        targetUrl 
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// List all short URLs
async function handleListLinks(request, env, corsHeaders) {
    if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }
    
    try {
        const list = await env.SHORT_URL_STORE.list({ prefix: 'meta:' });
        const links = [];
        
        for (const key of list.keys) {
            const metadata = await env.SHORT_URL_STORE.get(key.name);
            if (metadata) {
                links.push(JSON.parse(metadata));
            }
        }
        
        // Sort by creation date (newest first)
        links.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        return new Response(JSON.stringify(links), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch links' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Update an existing short URL
async function handleUpdateLink(request, env, corsHeaders) {
    if (request.method !== 'PUT') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }
    
    const { path, url: newUrl } = await request.json();
    
    if (!path || !newUrl || !isValidUrl(newUrl)) {
        return new Response(JSON.stringify({ error: 'Invalid path or URL provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Check if the short path exists
    const existing = await env.SHORT_URL_STORE.get(path);
    if (!existing) {
        return new Response(JSON.stringify({ error: 'Short URL not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Update the URL mapping
    await env.SHORT_URL_STORE.put(path, newUrl);
    
    // Retrieve existing metadata to preserve creation date
    let existingMetadata;
    try {
        const stored = await env.SHORT_URL_STORE.get(`meta:${path}`);
        existingMetadata = stored ? JSON.parse(stored) : null;
    } catch (_) {
        existingMetadata = null;
    }

    const metadata = {
        path,
        url: newUrl,
        created: existingMetadata?.created || new Date().toISOString(),
        updated: new Date().toISOString()
    };
    await env.SHORT_URL_STORE.put(`meta:${path}`, JSON.stringify(metadata));
    
    return new Response(JSON.stringify({ 
        success: true,
        path,
        newUrl 
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Delete a short URL
async function handleDeleteLink(request, env, corsHeaders) {
    if (request.method !== 'DELETE') {
        return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }
    
    const { path } = await request.json();
    
    if (!path) {
        return new Response(JSON.stringify({ error: 'Path is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Check if the short path exists
    const existing = await env.SHORT_URL_STORE.get(path);
    if (!existing) {
        return new Response(JSON.stringify({ error: 'Short URL not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Delete both the redirect and metadata
    await env.SHORT_URL_STORE.delete(path);
    await env.SHORT_URL_STORE.delete(`meta:${path}`);
    
    return new Response(JSON.stringify({ 
        success: true,
        deletedPath: path 
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}