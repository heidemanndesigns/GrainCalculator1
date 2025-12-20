# Services

This directory contains service files that handle data operations. Currently, all services use localStorage, but they are structured to easily switch to Firebase when ready.

## Current Services

### `storageService.js`
Base storage service that handles localStorage operations. This will be replaced with Firebase operations when Firebase is integrated.

### `equipmentService.js`
Service for managing equipment data (CRUD operations).

### `soilMoistureService.js`
Service for managing field and soil moisture reading data (CRUD operations).

### `firebaseService.js`
Placeholder for future Firebase integration. Contains example structure and comments for implementation.

## Migration to Firebase

When ready to integrate Firebase:

1. Install Firebase: `npm install firebase`
2. Configure Firebase in `firebaseService.js`
3. Update `equipmentService.js` and `soilMoistureService.js` to use `FirebaseService` instead of `StorageService`
4. Update stores to handle async operations (Firebase is async, localStorage is sync)

## Service Pattern

All services follow this pattern:
- Static methods for operations
- No direct state management (handled by stores)
- Return data or success/failure status
- Handle errors gracefully

