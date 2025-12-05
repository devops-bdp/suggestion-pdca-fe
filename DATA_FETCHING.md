# Data Fetching Implementation Guide

## Overview

This guide explains how data fetching is implemented across your dashboard using custom React hooks and the API client.

## Architecture

### 1. API Client (`types/api-client.ts`)

Low-level HTTP methods for making requests to your backend:

- `get(endpoint)` - Fetch data
- `post(endpoint, data)` - Create/submit data
- `put(endpoint, data)` - Update data
- `delete(endpoint)` - Remove data

### 2. Custom Hooks (`types/hooks.ts`)

High-level hooks built on top of the API client:

#### `useData<T>(options)`

Fetches data automatically on mount.

**Parameters:**

```typescript
{
  endpoint: string;  // API endpoint (e.g., '/users')
  immediate?: boolean;  // Auto-fetch on mount (default: true)
}
```

**Returns:**

```typescript
{
  data: T | null; // Fetched data
  loading: boolean; // Loading state
  error: Error | null; // Error if any
  refetch: () => Promise<void>; // Manual refetch function
}
```

**Example:**

```typescript
const {
  data: users,
  loading,
  error,
  refetch,
} = useData<User[]>({
  endpoint: "/users",
});
```

#### `useMutation<T, R>(method)`

For modifying data (POST, PUT, DELETE).

**Parameters:**

```typescript
method: "post" | "put" | "delete";
```

**Returns:**

```typescript
{
  mutate: (endpoint: string, payload?: T) => Promise<R>;
  loading: boolean;
  error: Error | null;
}
```

**Example:**

```typescript
const { mutate: updateUser, loading } = useMutation<UserData, User>("put");

await updateUser("/users/123", { name: "John" });
```

## Implemented Pages

### 1. Dashboard (`/dashboard`)

**Endpoint:** `/dashboard/stats`

Fetches:

- Total users
- Total suggestions
- Pending requests
- Resolved suggestions

### 2. Users (`/dashboard/users`)

**Endpoint:** `/users`

Fetches user list with:

- Name, email, role
- Status (active/inactive)
- Join date

Displays in a table with hover effects.

### 3. Analytics (`/dashboard/analytics`)

**Endpoint:** `/analytics`

Fetches:

- Total suggestions
- Accepted/rejected count
- Average resolution time
- Top categories with bar chart

### 4. Settings (`/dashboard/settings`)

**Endpoint:** `/settings`

Fetches and updates:

- App name
- API URL
- Theme preference
- Notification settings
- Email alert settings

Uses `useMutation` to save changes via PUT request.

## Expected API Responses

### Dashboard Stats

```json
{
  "data": {
    "totalUsers": 150,
    "totalSuggestions": 450,
    "pendingRequests": 23,
    "resolvedSuggestions": 427
  }
}
```

### Users List

```json
{
  "data": [
    {
      "id": "1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Admin",
      "status": "active",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Analytics

```json
{
  "data": {
    "totalSuggestions": 450,
    "acceptedSuggestions": 350,
    "rejectedSuggestions": 100,
    "avgResolutionTime": "2.5 days",
    "topCategories": [
      { "name": "UI/UX", "count": 120 },
      { "name": "Performance", "count": 95 }
    ],
    "monthlyTrends": [
      { "month": "Jan", "count": 50 },
      { "month": "Feb", "count": 75 }
    ]
  }
}
```

### Settings

```json
{
  "data": {
    "appName": "Suggestion System",
    "apiUrl": "https://api.example.com",
    "theme": "light",
    "notifications": true,
    "emailAlerts": true
  }
}
```

## Error Handling

All pages include error handling with:

- Loading states (spinners/skeleton)
- Error messages with retry button
- Empty states when no data

Example:

```typescript
{
  error && (
    <Card className="p-6 bg-red-50">
      <p className="text-red-600 mb-4">{error.message}</p>
      <button onClick={refetch}>Try Again</button>
    </Card>
  );
}
```

## Adding New Data-Fetching Pages

1. Create your page component with 'use client'
2. Import and use `useData` hook:

```typescript
const { data, loading, error, refetch } = useData({
  endpoint: "/your-endpoint",
});
```

3. Handle loading, error, and success states
4. Render your data

## Notes

- All requests share the same Axios instance and JSON headers
- Errors are logged to console for debugging
- Loading states show user feedback
- Manual refetch available on all pages
- Mutations handle both success and error cases
