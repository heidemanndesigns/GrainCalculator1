# Stores

This directory contains Svelte stores for reactive state management. Stores use Svelte 5 runes (`$state`, `$derived`) and interact with services for data persistence.

## Current Stores

### `equipmentStore.js`
Reactive store for equipment data. Provides:
- `all` - Reactive array of all equipment
- `getAll()` - Get all equipment
- `getById(id)` - Get equipment by ID
- `save(item)` - Save equipment (create or update)
- `remove(id)` - Delete equipment
- `updateHours(id, hours)` - Update equipment hours

### `soilMoistureStore.js`
Reactive store for soil moisture data. Provides:
- `allFields` - Reactive array of all fields
- `getAllFields()` - Get all fields
- `getFieldById(id)` - Get field by ID
- `saveField(field)` - Save field (create or update)
- `deleteField(id)` - Delete field
- `saveReading(fieldId, reading)` - Save reading for a field
- `deleteReading(fieldId, readingId)` - Delete reading

## Store Pattern

All stores follow this pattern:
- Use Svelte 5 runes for reactivity
- Lazy initialization (loads data on first access)
- Interact with services for persistence
- Provide reactive getters and action methods
- Export singleton instances for use in components

## Usage in Components

```javascript
import { equipmentStore } from '$lib/stores/equipmentStore.js';

// Access reactive data
let equipment = $derived(equipmentStore.all);

// Use actions
equipmentStore.save(item);
equipmentStore.remove(id);
```

