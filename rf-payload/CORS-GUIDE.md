# CORS Configuration Guide

## Overview
The backend uses custom CORS handling for all API routes to ensure proper cross-origin access from the frontend, especially in production deployments.

## Environment Variables

### Required for Production
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins
- `NODE_ENV`: Set to "production" for production deployments

### Example Configuration
```bash
# For Vercel deployment
NODE_ENV=production
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com

# For development (automatically includes localhost:3000 and localhost:4000)
NODE_ENV=development
```

## How CORS Works

1. **Development Mode**: Automatically allows `localhost:3000` and `localhost:4000`
2. **Production Mode**: Only allows origins specified in `ALLOWED_ORIGINS`
3. **Preflight Handling**: All custom API routes handle OPTIONS requests properly
4. **Dynamic Origin**: The system checks the request's `Origin` header and allows it if it's in the allowed list

## Troubleshooting CORS Errors

### 1. Check Environment Variables
Ensure `ALLOWED_ORIGINS` includes your frontend domain:
```bash
# Correct
ALLOWED_ORIGINS=https://your-app.vercel.app

# Incorrect (missing protocol)
ALLOWED_ORIGINS=your-app.vercel.app

# Incorrect (trailing slash)
ALLOWED_ORIGINS=https://your-app.vercel.app/
```

### 2. Verify Frontend Configuration
In your frontend `.env`:
```bash
NUXT_PUBLIC_API_BASE=https://your-backend-domain.com
```

### 3. Check Browser Developer Tools
1. Open Network tab
2. Look for preflight OPTIONS requests
3. Check response headers for `Access-Control-Allow-Origin`

### 4. Backend Logs
The CORS utility logs debug information:
```
CORS Debug: { 
  requestOrigin: 'https://your-app.vercel.app',
  allowedOrigins: ['https://your-app.vercel.app'],
  isDevelopment: false,
  nodeEnv: 'production',
  allowedOriginsEnv: 'https://your-app.vercel.app'
}
```

## Common Issues

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
- **Cause**: Frontend origin not in `ALLOWED_ORIGINS`
- **Solution**: Add your frontend domain to `ALLOWED_ORIGINS`

### Error: "CORS policy: The request client is not a secure context"
- **Cause**: Mixed HTTP/HTTPS requests
- **Solution**: Ensure both frontend and backend use HTTPS in production

### Error: "Failed to fetch"
- **Cause**: Network issues or incorrect API base URL
- **Solution**: Check `NUXT_PUBLIC_API_BASE` configuration

## Testing CORS Configuration

### Health Check
```bash
curl -H "Origin: https://your-app.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: authorization,content-type" \
     -X OPTIONS \
     https://your-backend.com/api/health
```

Should return:
```
Access-Control-Allow-Origin: https://your-app.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

### Attendance API Test
```bash
curl -H "Origin: https://your-app.vercel.app" \
     -H "Authorization: JWT your-token" \
     https://your-backend.com/api/events/EVENT_ID/attendance
```

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` with your frontend domain(s)
- [ ] Verify frontend `NUXT_PUBLIC_API_BASE` points to production backend
- [ ] Test API endpoints with curl or browser dev tools
- [ ] Check backend logs for CORS debug information