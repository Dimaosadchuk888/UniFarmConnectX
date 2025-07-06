# UniFarm useState Error Root Cause Analysis
**Date:** July 6, 2025  
**Status:** Non-critical error with identified root cause

## Executive Summary

The useState error is a symptom of authentication flow issues, specifically the deprecated guest user system trying to call non-existent API endpoints.

## Root Cause Chain

### 1. Guest User API Call (404 Error)
```javascript
// client/src/pages/Friends.tsx:173
data = await correctApiRequest(`/api/users/guest/${guestId}`, 'GET');
```
- **Problem**: Backend endpoint `/api/users/guest/` no longer exists
- **Guest ID**: `guest_1751710404084_lcqta8gqx`
- **Result**: 404 Not Found error

### 2. Authentication Flow Confusion
- System tries guest user flow when JWT authentication fails
- Multiple authentication attempts cause state updates
- Components may unmount during async operations

### 3. useState Error Trigger
```
TypeError: null is not an object (evaluating 'U.current.useState')
```
- Occurs ~5 minutes after app start
- Likely caused by component trying to update state after unmounting
- Error contained by React error boundaries

## Error Flow Sequence

```
1. App starts normally
   ↓
2. JWT authentication works initially
   ↓
3. After ~5 minutes, something triggers guest user flow
   ↓
4. Friends.tsx attempts to call /api/users/guest/
   ↓
5. 404 error returned
   ↓
6. Component tries to update state after error
   ↓
7. useState error occurs (component possibly unmounted)
   ↓
8. Error boundary catches it, app continues working
```

## Authentication Issues Found

### Primary Issues
1. **Deprecated Guest User System**
   - Frontend still calls `/api/users/guest/` endpoints
   - Backend no longer implements these endpoints
   - Causes 404 errors

2. **Mixed Authentication States**
   - JWT token exists but sometimes returns 401
   - System falls back to guest user flow
   - Creates authentication state confusion

### Console Evidence
```javascript
// 404 Error
[correctApiRequest] Ошибка ответа: {
  success: false, 
  error: "Route not found", 
  statusCode: 404, 
  path: "/api/users/guest/guest_1751710404084_lcqta8gqx"
}

// 401 Error
[QueryClient] Данные ошибки: {
  success: false, 
  error: "Authentication required", 
  need_jwt_token: true
}
```

## Why App Continues Working

1. **Error Boundaries**: Catch and contain the useState error
2. **Non-Critical Path**: Guest user flow is optional
3. **JWT Works**: Main authentication via JWT continues functioning
4. **WebSocket Active**: Real-time features unaffected

## Specific Location in Code

### Friends.tsx (lines 168-178)
```javascript
// Problematic code trying to fetch guest user
try {
  data = await correctApiRequest(`/api/users/guest/${guestId}`, 'GET');
} catch (apiError: any) {
  console.error('Ошибка при запросе данных пользователя:', apiError);
  // Error handling continues...
}
```

## Impact Analysis

### What Works ✅
- Main app functionality
- JWT authentication (mostly)
- WebSocket connections
- API calls with proper auth
- User interface rendering

### What Fails ❌
- Guest user data fetching (404)
- Some authentication states (401)
- State updates in unmounted components

## Technical Explanation

The 'U.current' in the error refers to React's internal minified variable, likely a `useRef` that's null because:
1. Component unmounted during async operation
2. Hook called outside proper React lifecycle
3. Race condition between unmounting and state update

## Recommendations (Without Code Changes)

1. **Monitor Pattern**: Note when guest user flow is triggered
2. **Check JWT Expiry**: Verify if JWT tokens are expiring after 5 minutes
3. **Browser Storage**: Check if `unifarm_guest_id` in localStorage is causing issues
4. **User Actions**: Identify what user action triggers the error

## Conclusion

The useState error is a downstream effect of the deprecated guest user system. When JWT authentication has issues, the system falls back to guest user endpoints that no longer exist. This causes 404 errors and subsequent state update attempts in components that may have unmounted, resulting in the useState error.

The error is non-critical because:
- Error boundaries contain it
- Main authentication flow (JWT) continues working
- App functionality remains intact

To fully resolve: Remove guest user API calls from Friends.tsx and other components, or implement the guest user endpoints on the backend.