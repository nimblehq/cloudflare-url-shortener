# Cloudflare URL Shortener

A serverless, lightweight URL shortening service built on [Cloudflare Workers](https://developers.cloudflare.com/workers/), using [KV Namespaces](https://developers.cloudflare.com/workers/platform/kv/) for globally distributed storage. Ideal for fast, low-latency link redirection and short link management, with no infrastructure overhead.

## ✨ Features

- ⚡️ Ultra-fast link redirection via edge compute  
- 🗂️ CRUD API for managing short links  
- 🔒 Optional access protection via Cloudflare Access  
- 🧩 Deployable in seconds with Wrangler  
- 🗃️ Backed by Cloudflare KV for global persistence  

## 🚀 Getting Started

### 1. Create the worker

```bash
wrangler init cloudflare-url-shortener
cd cloudflare-url-shortener
```

Follow the setup assistant:
- Template: **Hello World**
- Type: **Worker only**
- Language: **JavaScript**

### 2. Create the KV namespace

```bash
wrangler kv namespace create "SHORT_URL_STORE"
```

Then update your `wrangler.toml` file with the provided namespace ID:

```toml
[[kv_namespaces]]
binding = "SHORT_URL_STORE"
id = "${SHORT_URL_STORE_ID}"
```

### 3. Deploy the worker

```bash
wrangler deploy
```

## ⚙️ Optional Setup

### ➕ Add a Custom Domain

5. On the Cloudflare dashboard, go to:

   ```
   Workers & Pages → Your Worker → Settings
   ```

   Add your custom domain under **Custom Domains**.

### 🔐 Secure with Cloudflare Access

1. Open [Cloudflare Zero Trust](https://dash.teams.cloudflare.com/)
2. Navigate to:

   ```
   Access → Applications
   ```

3. Click **Create an application**
4. Choose **Self-hosted**
5. Configure the domain path for `/` and `/api/*`
6. Set up your access rules (e.g. email domain, identity provider, etc.)

This will restrict access to the management API (`/api/*`) while keeping redirection public.

## 🔌 API Endpoints

All endpoints return `application/json` and support CORS.

### `POST /api/shorten`
Create a new short URL.

**Request Body:**
```json
{
  "url": "https://example.com",         // Required
  "customPath": "my-alias"              // Optional (must be alphanumeric, hyphen or underscore)
}
```

**Success Response:**
```json
{
  "shortUrl": "https://yourdomain.com/my-alias",
  "path": "my-alias",
  "targetUrl": "https://example.com"
}
```

**Error Responses:**
- `400` — Invalid URL or custom path format
- `409` — Custom path already exists

### `GET /api/links`
List all short links (metadata only, not actual redirect keys).

**Success Response:**
```json
[
  {
    "path": "my-alias",
    "url": "https://example.com",
    "created": "2025-06-25T10:15:00.000Z"
  },
  ...
]
```

### `PUT /api/update`
Update the destination URL of an existing short link.

**Request Body:**
```json
{
  "path": "my-alias",
  "url": "https://new-destination.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "path": "my-alias",
  "newUrl": "https://new-destination.com"
}
```

**Error Responses:**
- `400` — Invalid path or URL
- `404` — Short link not found

### `DELETE /api/delete`
Delete an existing short link.

**Request Body:**
```json
{
  "path": "my-alias"
}
```

**Success Response:**
```json
{
  "success": true,
  "deletedPath": "my-alias"
}
```

**Error Responses:**
- `400` — Missing path
- `404` — Short link not found

### CORS Support

All endpoints allow cross-origin requests and handle `OPTIONS` preflight.
