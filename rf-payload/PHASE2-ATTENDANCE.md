# Phase 2 - Attendance System Implementation

## Overview
The attendance system allows tracking player attendance for events with proper role-based access control and automated workflows.

## Collections

### Attendance Collection
**File**: `src/collections/Attendance.ts`

**Fields**:
- `eventId` (relationship to events) - Required
- `playerId` (relationship to users, filtered to players only) - Required  
- `status` (select) - pending, attending, declined, attended, excused
- `notes` (textarea) - Optional notes for trainers/admins
- `updatedBy` (relationship to users) - Auto-populated on changes
- `updatedAt` (date) - Auto-populated on changes

**Access Control**:
- **Read**: Admin/trainers see all, players see their own, parents see their children's
- **Create**: Admin/trainers only (via automated hooks)
- **Update**: Admin/trainers can update all, players/parents limited to their own/children's
- **Delete**: Admin only

**Business Rules**:
- Players/parents can only set status to: `attending`, `declined`
- Trainers/admins can set any status including: `attended`, `excused`
- Changes blocked if event is locked (except for admins)
- Parent access validated through parent-child relationships

## Automated Workflows

### Event Creation Hook
**Location**: `src/collections/Events.ts`
- When a new event is created, attendance records are automatically generated for all active players
- Initial status set to `pending`
- Creator is recorded as `updatedBy`

### New Player Hook  
**Location**: `src/collections/Users.ts`
- When a new player is created, attendance records are automatically generated for all upcoming events
- Only applies to events with date >= today
- Initial status set to `pending`

## API Endpoints

### Event Attendance Endpoint
**Path**: `/api/events/[eventId]/attendance`

**GET** - Retrieve attendance for specific event
- Returns all attendance records for the event (filtered by user permissions)
- Includes populated user and event details (depth: 2)

**PATCH** - Update attendance status
- Body: `{ playerId, status, notes }`
- Validates user permissions and parent-child relationships
- Auto-updates `updatedBy` and `updatedAt` fields

### Attendance Summary Endpoint
**Path**: `/api/attendance/summary`

**GET** - Retrieve attendance summary (admin/trainer only)
- Query params: `eventId` (optional - if provided, filters to specific event)
- Groups attendance by event with counts for each status
- Includes detailed records with player names and update history

### Bulk Operations Endpoint
**Path**: `/api/attendance/bulk-update`

**POST** - Bulk update multiple attendance records (admin/trainer only)
- Body: `{ updates: [{ attendanceId, status, notes }] }`
- Processes multiple updates in a single request
- Returns success/failure results for each update

**PATCH** - Mark all players for an event (admin/trainer only)  
- Body: `{ eventId, status, notes }`
- Updates all attendance records for an event to specified status
- Only allows `attended` or `excused` for bulk operations

## User Roles & Permissions

### Admin
- Full access to all attendance records
- Can modify attendance for locked events
- Can perform bulk operations
- Can set any attendance status

### Trainer
- Full access to all attendance records (except locked events)
- Can perform bulk operations
- Can set any attendance status
- Cannot modify locked events

### Player
- Can view and update their own attendance only
- Limited to `attending` and `declined` status changes
- Cannot modify attendance for locked events

### Parent
- Can view and update their children's attendance
- Limited to `attending` and `declined` status changes  
- Cannot modify attendance for locked events
- Access validated through `parentId`/`playerIds` relationships

## Parent-Child Relationships

### User Fields Added:
- `parentId` (relationship) - Links player to parent account
- `playerIds` (relationship, hasMany) - Links parent to their children

### Validation:
- Parents can only modify attendance for players in their `playerIds` array
- Enforced in `beforeChange` hook with database validation
- Filtered in `afterRead` hook to prevent unauthorized data access

## Event Locking
- Events have a `locked` field to prevent changes after finalization
- When locked, only admins can modify attendance
- Validated in `beforeValidate` hook of Attendance collection

## Error Handling
- Comprehensive error messages for permission violations
- Graceful handling of missing relationships
- Database errors logged but don't crash operations
- Bulk operations return detailed success/failure reports

## Frontend Integration Notes

### Key Endpoints for Frontend:
1. `GET /api/events/[eventId]/attendance` - Display attendance list
2. `PATCH /api/events/[eventId]/attendance` - Player/parent updates
3. `GET /api/attendance/summary` - Admin dashboard
4. `POST /api/attendance/bulk-update` - Admin bulk operations

### Status Values:
- `pending` - Default state, no response yet
- `attending` - Player confirmed attendance
- `declined` - Player declined attendance  
- `attended` - Trainer marked as attended (post-event)
- `excused` - Trainer marked as excused absence

### Access Patterns:
- Players see simple attend/decline interface
- Parents see children's attendance with same interface
- Trainers see full attendance management with marking capabilities
- Admins have additional bulk operation tools

## Database Considerations
- Attendance records created proactively for all events
- Indexes recommended on: `eventId`, `playerId`, `status`
- Parent-child relationships stored bidirectionally for efficiency
- Soft deletes used via `active` field on users

## Future Enhancements (Not in Phase 2)
- Email notifications for attendance changes
- Attendance history and statistics
- Integration with calendar systems
- Mobile app push notifications
- Attendance requirements and warnings