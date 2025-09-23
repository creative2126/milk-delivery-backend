# Milk Delivery Subscription System

## Overview
This subscription system enables customers to set up recurring milk deliveries with flexible scheduling, zone-based delivery, and comprehensive management features.

## Database Schema

### Tables Created

#### 1. `delivery_zones`
- **Purpose**: Defines delivery zones with postal codes, delivery days, and time slots
- **Key Fields**:
  - `zoneName`: Name of the delivery zone
  - `postalCodes`: JSON array of supported postal codes
  - `deliveryDays`: JSON array of available delivery days
  - `deliveryTimeSlots`: JSON array of available time slots
  - `isActive`: Boolean flag for zone availability

#### 2. `subscriptions`
- **Purpose**: Stores customer subscription details
- **Key Fields**:
  - `userId`: Reference to the user
  - `milkType`: Type of milk (Whole, Skim, Toned, etc.)
  - `quantity`: Number of units per delivery
  - `frequency`: daily, weekly, or monthly
  - `deliveryAddress`: Complete delivery address
  - `deliveryZoneId`: Reference to delivery zone
  - `preferredDeliveryTime`: Selected time slot
  - `startDate`: Subscription start date
  - `nextDeliveryDate`: Next scheduled delivery
  - `totalAmount`: Total subscription amount
  - `status`: active, paused, cancelled, expired
  - `paymentStatus`: pending, paid, failed

#### 3. `subscription_history`
- **Purpose**: Tracks all changes to subscriptions for audit trail
- **Key Fields**:
  - `subscriptionId`: Reference to subscription
  - `action`: Type of change (create, update, pause, cancel, etc.)
  - `oldValue`: Previous values (JSON)
  - `newValue`: New values (JSON)
  - `changedBy`: User who made the change

## Setup Instructions

### 1. Database Migration
```bash
# Navigate to the scripts directory
cd scripts/

# Run the migration script
node migrate-subscription-tables.js

# Or run manually with SQL
mysql -u root -p milk_delivery < create-subscription-tables.sql
```

### 2. Environment Configuration
Create a `.env` file in the backend directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=milk_delivery
```

### 3. API Endpoints

#### Subscription Management
- `POST /api/subscriptions` - Create new subscription
- `GET /api/subscriptions/user/:userId` - Get user subscriptions
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Cancel subscription
- `POST /api/subscriptions/:id/pause` - Pause subscription
- `POST /api/subscriptions/:id/resume` - Resume subscription

#### Delivery Zones
- `GET /api/delivery-zones` - Get all active delivery zones
- `GET /api/delivery-zones/:id` - Get specific zone details
- `GET /api/delivery-zones/check/:postalCode` - Check if postal code is serviceable

## Usage Examples

### Creating a Subscription
```javascript
const subscription = {
  userId: 1,
  milkType: 'Whole Milk',
  quantity: 2,
  frequency: 'daily',
  deliveryAddress: '123 Main Street, Mumbai',
  deliveryZoneId: 1,
  preferredDeliveryTime: '6:00 AM - 8:00 AM',
  startDate: '2024-01-15',
  totalAmount: 1200.00
};

// POST /api/subscriptions
```

### Managing Subscriptions
```javascript
// Pause subscription
// POST /api/subscriptions/123/pause

// Resume subscription
// POST /api/subscriptions/123/resume

// Cancel subscription
// DELETE /api/subscriptions/123
```

## Features

### 1. Flexible Scheduling
- Daily, weekly, or monthly delivery options
- Multiple time slots per zone
- Customizable delivery days per zone

### 2. Zone-Based Delivery
- Geographic delivery zones with postal code mapping
- Zone-specific delivery schedules
- Real-time zone availability checking

### 3. Subscription Management
- Pause/resume subscriptions
- Modify delivery details
- Track subscription history
- Automatic next delivery calculation

### 4. Payment Integration
- Track payment status
- Automatic billing cycles
- Failed payment handling

### 5. Audit Trail
- Complete history of subscription changes
- Track who made changes and when
- Rollback capabilities

## Testing

### Run Migration Tests
```bash
# Test database connection
node backend/test-db-connection.js

# Test subscription endpoints
node backend/test-subscription.js

# Run comprehensive tests
node backend/test-improvements-complete.js
```

### Manual Testing
1. Check delivery zones: `GET /api/delivery-zones`
2. Create test subscription: `POST /api/subscriptions`
3. Verify subscription: `GET /api/subscriptions/user/:userId`
4. Test pause/resume functionality

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL service is running
   - Verify credentials in .env file
   - Ensure database exists: `CREATE DATABASE milk_delivery`

2. **Migration Fails**
   - Check if tables already exist
   - Verify foreign key constraints
   - Run with debug: `DEBUG=* node migrate-subscription-tables.js`

3. **Zone Not Found**
   - Verify postal code is in delivery_zones table
   - Check zone is active: `isActive = true`
   - Validate delivery days and time slots

### Debug Commands
```bash
# Check table structure
mysql -u root -p -e "DESCRIBE subscriptions" milk_delivery

# Check sample data
mysql -u root -p -e "SELECT * FROM delivery_zones LIMIT 5" milk_delivery

# Check foreign key constraints
mysql -u root -p -e "SELECT * FROM information_schema.table_constraints WHERE table_schema = 'milk_delivery'" milk_delivery
```

## Performance Optimization

### Indexes Created
- `idx_subscriptions_userId` - Fast user subscription lookups
- `idx_subscriptions_status` - Filter by subscription status
- `idx_subscriptions_nextDeliveryDate` - Schedule delivery queries
- `idx_subscriptions_deliveryZoneId` - Zone-based queries
- `idx_delivery_zones_isActive` - Active zone filtering

### Query Optimization
- Use JSON fields for flexible data storage
- Indexed foreign keys for join performance
- Optimized for common query patterns

## Security Considerations
- Input validation on all endpoints
- SQL injection prevention with parameterized queries
- User authorization checks
- Rate limiting on API endpoints

## Future Enhancements
- SMS notifications for delivery updates
- Mobile app integration
- Advanced analytics dashboard
- Machine learning for delivery optimization
- Multi-language support
