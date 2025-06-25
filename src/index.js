// URL Shortener with Cloudflare Workers + KV + Access
// Deploy this as a Cloudflare Worker with KV binding named "SHORT_URL_STORE"

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URL Shortener</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 40px;
            font-size: 2.5em;
            font-weight: 700;
        }
        
        .form-section {
            background: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }
        
        input[type="url"], input[type="text"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        input[type="url"]:focus, input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .button-group {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        
        button {
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            flex: 1;
            min-width: 140px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .btn-secondary {
            background: #f8f9fa;
            color: #333;
            border: 2px solid #e1e5e9;
        }
        
        .btn-secondary:hover {
            background: #e9ecef;
        }
        
        .result {
            margin-top: 20px;
            padding: 20px;
            border-radius: 10px;
            font-weight: 600;
        }
        
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .short-url {
            font-family: monospace;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #dee2e6;
            margin-top: 10px;
            word-break: break-all;
        }
        
        .links-section {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }
        
        .links-section h2 {
            margin-bottom: 20px;
            color: #333;
        }
        
        .link-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border: 1px solid #e1e5e9;
            border-radius: 10px;
            margin-bottom: 10px;
            background: #f8f9fa;
        }
        
        .link-info {
            flex: 1;
            margin-right: 15px;
        }
        
        .link-short {
            font-weight: 600;
            color: #667eea;
            font-family: monospace;
        }
        
        .link-target {
            color: #666;
            word-break: break-all;
            margin-top: 5px;
        }
        
        .link-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn-small {
            padding: 8px 15px;
            font-size: 14px;
            border-radius: 6px;
        }
        
        .btn-edit {
            background: #ffc107;
            color: #212529;
        }
        
        .btn-delete {
            background: #dc3545;
            color: white;
        }
        
        .edit-form {
            margin-top: 15px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 2px solid #667eea;
        }
        
        .edit-form input {
            margin-bottom: 10px;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 20px;
            }
            
            .button-group {
                flex-direction: column;
            }
            
            .link-item {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .link-actions {
                margin-top: 10px;
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 URL Shortener</h1>
        
        <div class="form-section">
            <form id="shortenForm">
                <div class="form-group">
                    <label for="url">URL to Shorten:</label>
                    <input type="url" id="url" name="url" required placeholder="https://example.com/very/long/url">
                </div>
                
                <div class="form-group">
                    <label for="customPath">Custom Path (optional):</label>
                    <input type="text" id="customPath" name="customPath" placeholder="my-custom-link">
                </div>
                
                <div class="button-group">
                    <button type="submit" class="btn-primary">Shorten URL</button>
                    <button type="button" class="btn-secondary" onclick="loadLinks()">Refresh Links</button>
                </div>
            </form>
            
            <div id="result"></div>
        </div>
        
        <div class="links-section">
            <h2>📋 Your Short Links</h2>
            <div id="linksList">Loading...</div>
        </div>
    </div>

    <script>
        // Load existing links on page load
        document.addEventListener('DOMContentLoaded', loadLinks);
        
        // Handle form submission
        document.getElementById('shortenForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = document.getElementById('url').value;
            const customPath = document.getElementById('customPath').value;
            const resultDiv = document.getElementById('result');
            
            try {
                const response = await fetch('/api/shorten', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ url, customPath })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    resultDiv.innerHTML = \`
                        <div class="result success">
                            ✅ Short URL created successfully!
                            <div class="short-url">\${data.shortUrl}</div>
                        </div>
                    \`;
                    document.getElementById('shortenForm').reset();
                    loadLinks();
                } else {
                    resultDiv.innerHTML = \`
                        <div class="result error">
                            ❌ Error: \${data.error}
                        </div>
                    \`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="result error">
                        ❌ Network error: \${error.message}
                    </div>
                \`;
            }
        });
        
        // Load and display all links
        async function loadLinks() {
            const linksDiv = document.getElementById('linksList');
            
            try {
                const response = await fetch('/api/links');
                const links = await response.json();
                
                if (links.length === 0) {
                    linksDiv.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">No short links created yet.</p>';
                    return;
                }
                
                linksDiv.innerHTML = links.map(link => \`
                    <div class="link-item" id="link-\${link.path}">
                        <div class="link-info">
                            <div class="link-short">
                                <a href="/\${link.path}" target="_blank">\${window.location.origin}/\${link.path}</a>
                            </div>
                            <div class="link-target">→ \${link.url}</div>
                        </div>
                        <div class="link-actions">
                            <button class="btn-small btn-edit" onclick="editLink('\${link.path}', '\${link.url}')">
                                ✏️ Edit
                            </button>
                            <button class="btn-small btn-delete" onclick="deleteLink('\${link.path}')">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                \`).join('');
            } catch (error) {
                linksDiv.innerHTML = \`<p style="color: #dc3545;">Error loading links: \${error.message}</p>\`;
            }
        }
        
        // Edit link functionality
        function editLink(path, currentUrl) {
            const linkItem = document.getElementById(\`link-\${path}\`);
            const editForm = \`
                <div class="edit-form">
                    <input type="url" id="edit-url-\${path}" value="\${currentUrl}" placeholder="New URL">
                    <div class="button-group">
                        <button class="btn-primary btn-small" onclick="saveEdit('\${path}')">💾 Save</button>
                        <button class="btn-secondary btn-small" onclick="cancelEdit('\${path}')">❌ Cancel</button>
                    </div>
                </div>
            \`;
            linkItem.innerHTML += editForm;
        }
        
        // Save edit
        async function saveEdit(path) {
            const newUrl = document.getElementById(\`edit-url-\${path}\`).value;
            
            try {
                const response = await fetch('/api/update', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ path, url: newUrl })
                });
                
                if (response.ok) {
                    loadLinks();
                } else {
                    const data = await response.json();
                    alert('Error updating link: ' + data.error);
                }
            } catch (error) {
                alert('Network error: ' + error.message);
            }
        }
        
        // Cancel edit
        function cancelEdit(path) {
            loadLinks();
        }
        
        // Delete link
        async function deleteLink(path) {
            if (!confirm(\`Are you sure you want to delete the short link "/$\{path}"?\`)) {
                return;
            }
            
            try {
                const response = await fetch('/api/delete', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ path })
                });
                
                if (response.ok) {
                    loadLinks();
                } else {
                    const data = await response.json();
                    alert('Error deleting link: ' + data.error);
                }
            } catch (error) {
                alert('Network error: ' + error.message);
            }
        }
    </script>
</body>
</html>
`;

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
    
    // Update metadata
    const metadata = {
        path,
        url: newUrl,
        created: new Date().toISOString(),
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