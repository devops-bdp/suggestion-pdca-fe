# API Integration Guide

## Base URL

```
https://sugestion-system.vercel.app/api
```

## Implemented Endpoints

### 1. User Profile

- **Endpoint**: `/users/profile`
- **Method**: `GET`
- **Usage**: Fetch current user profile in navbar
- **Implementation**: `types/api-client.ts`

### 2. Login

- **Endpoint**: `/auth/login`
- **Method**: `POST`
- **Body**:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- **Usage**: User authentication
- **Implementation**: `app/login/page.tsx`

## API Client Setup

The API client (`types/api-client.ts`) provides methods for:

- `GET` - Fetch data
- `POST` - Create/submit data
- `PUT` - Update data
- `DELETE` - Remove data

All requests include:

- `Content-Type: application/json`

## Usage Examples

### Fetch User Profile

```typescript
import { apiClient } from "@/types/api-client";

const data = await apiClient.get("/users/profile");
```

### Login

```typescript
const response = await apiClient.post("/auth/login", {
  email: "user@example.com",
  password: "password123",
});
```

## Notes

- Token is stored in `localStorage` after login
- You may need to adjust endpoints based on your backend response structure
- Add error handling and retry logic as needed
- Consider adding request/response interceptors for token management
