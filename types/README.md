# Types Documentation

This directory contains all TypeScript types and interfaces that align with the backend API routes.

## File Structure

- **`api.ts`** - Main types file containing all API-related types, interfaces, and enums
- **`api-client.ts`** - Axios client configuration and API request/response handling
- **`hooks.ts`** - Custom React hooks for data fetching (`useData`, `useMutation`)
- **`utils.ts`** - Utility functions
- **`index.ts`** - Centralized export for all types

## Backend Routes Alignment

Types are organized according to backend routes:

### `/api/auth` - Authentication
- `LoginPayload` - Login request payload
- `LoginResponse` - Login response with token
- `RegisterPayload` - User registration payload

### `/api/users` - User Management
- `User` - User entity
- `UserProfile` - User profile (without sensitive data)
- `UserFormData` - User create/update form data

### `/api/suggestions` - Suggestion Management
- `Suggestion` - Suggestion entity
- `SuggestionFormData` - Suggestion create/update form data
- `SuggestionHistory` - Suggestion status history
- `FormPenilaian` - Evaluation form

## Enums

All enums from Prisma schema are included:
- `Role` - User roles
- `Department` - Departments
- `Position` - Positions
- `PermissionLevel` - Permission levels
- `KriteriaSS` - SS criteria
- `SifatPerbaikan` - Improvement types
- `StatusIde` - Idea status

## Usage

```typescript
// Import types
import { User, UserFormData, LoginPayload, LoginResponse } from "@/types/api";

// Or import from index
import { User, UserFormData } from "@/types";
```

## API Response Structure

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

## Type Safety

All types are aligned with:
- Backend Prisma schema
- Backend Express routes
- API response structures
- Frontend component requirements


