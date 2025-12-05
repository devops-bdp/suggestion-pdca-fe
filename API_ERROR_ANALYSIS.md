# API Error 500 Analysis

## Problem
Login endpoint `/auth/login` returns 500 Internal Server Error.

## Current Implementation

### Request Format
```typescript
{
  nrp: string,
  password: string
}
```

### Endpoint
- URL: `https://sugestion-system.vercel.app/api/auth/login`
- Method: `POST`
- Headers: `Content-Type: application/json`

## Possible Causes

### 1. **Field Name Mismatch**
API might expect different field names:
- `email` instead of `nrp`
- `username` instead of `nrp`
- `nrp` might need to be in different format (string vs number)

### 2. **Missing Required Fields**
API might require additional fields:
- `email` (in addition to or instead of `nrp`)
- `username`
- `deviceId` or other metadata

### 3. **Data Type Issues**
- `nrp` might need to be sent as number instead of string
- Password might need special encoding

### 4. **Server-Side Validation**
- NRP format validation failing
- Password validation failing
- Database connection issues
- Missing user in database

### 5. **Request Structure**
API might expect nested structure:
```json
{
  "data": {
    "nrp": "...",
    "password": "..."
  }
}
```

## Debugging Steps

1. **Check Console Logs**
   - Look for detailed request/response in browser console
   - Check Network tab for actual request sent

2. **Test with Different Formats**
   - Try `email` instead of `nrp`
   - Try sending `nrp` as number
   - Try nested structure

3. **Check API Documentation**
   - Verify expected request format
   - Check if API has changed

4. **Test with Postman/curl**
   - Test directly to isolate frontend issues
   - Compare working request format

## Recommendations

1. **Add Better Error Logging**
   - Log full request details
   - Log full response details
   - Include request headers

2. **Try Alternative Formats**
   - Add fallback to try `email` field
   - Try different payload structures

3. **Contact Backend Team**
   - Verify expected request format
   - Check server logs for specific error
   - Verify API endpoint is working

## Next Steps

1. Check browser console for detailed error logs
2. Test API directly with Postman
3. Verify API documentation for correct format
4. Contact backend developer for server logs

