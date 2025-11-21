# Webhook API Documentation

## Overview

This API allows you to insert contacts into the CRM system using a secure webhook endpoint. Each user gets unique API keys to authenticate their requests, and contacts are automatically associated with specific lead types.

**New Features:**
- 🚀 **Bulk Insert**: Send up to 100 contacts in a single request
- 👤 **Auto Name Parsing**: Automatically splits full names into first/last names
- ✅ **Default Status**: Contacts default to "New" status (ID: 1)
- 🔒 **Duplicate Detection**: Prevents duplicate contacts based on lead_id and lead_type
- 📧 **Email Validation**: Rejects empty email strings

## Table of Contents

1. [Getting Started](#getting-started)
2. [API Key Management](#api-key-management)
3. [Webhook Endpoint](#webhook-endpoint)
4. [Bulk Insert](#bulk-insert)
5. [Auto-Processing Features](#auto-processing-features)
6. [Testing in Localhost](#testing-in-localhost)
7. [Production Setup](#production-setup)
8. [Security Best Practices](#security-best-practices)
9. [Error Handling](#error-handling)
10. [Integration Examples](#integration-examples)

---

## Getting Started

### Prerequisites

- Active user account in the CRM system
- Access to create API keys (via Admin panel)
- Your User ID (available in Admin > API Keys)

### Base URLs

- **Localhost**: `http://localhost:5000/api`
- **Production**: `https://yourdomain.com/api` (replace with your actual domain)

---

## API Key Management

API keys are managed through the Admin panel at **Admin > API Keys**.

### Creating an API Key

1. Navigate to **Admin > API Keys**
2. Select the user
3. Click **Create API Key**
4. Enter a descriptive name (e.g., "Production Webhook", "Test Integration")
5. Copy and securely save the generated API key

**Important**: The API key is only shown once! Save it securely.

### Key Features

- **Active/Inactive Toggle**: Deactivate keys without deleting them
- **Soft Delete**: Deleted keys can be restored
- **Usage Tracking**: See when each key was last used
- **Per-User Keys**: Admin can manage keys for any user

---

## Webhook Endpoint

### Insert Contact (Single or Bulk)

**Endpoint**: `POST /api/webhook/:userId/:leadTypeId`

**Authentication**: API Key (Bearer token or X-API-Key header)

**URL Parameters**:
- `userId`: Your user ID (integer)
- `leadTypeId`: Lead type ID (1-5 for default types)

**Available Lead Types**:
- `1` - Probate
- `2` - Refi
- `3` - Equity
- `4` - Permit
- `5` - Home

**Request Headers**:
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

OR alternatively:
```
X-API-Key: YOUR_API_KEY
Content-Type: application/json
```

### Single Contact Insert

**Request Body**:
```json
{
  "lead_id": "LEAD-12345",
  "contact_1_name": "John Doe",
  "contact_1_phone1": "+1234567890",
  "contact_1_email1": "john@example.com",
  "property_address_full": "123 Main Street, Springfield, IL 62701",
  "property_address_city": "Springfield",
  "property_address_state": "IL",
  "property_address_zipcode": "62701",
  "property_address_county": "Sangamon",
  "estimated_value": 250000.00,
  "property_type": "Single Family",
  "sale_date": "2025-01-15"
}
```

**Required Fields**:
- `contact_1_name`: Contact's full name (will be auto-parsed into first/last)

**Optional Fields**:
- `lead_id`: Your internal lead identifier (used for duplicate detection)
- `contact_1_phone1`: Contact's phone number
- `contact_1_email1`: Contact's email (cannot be empty string)
- `property_address_full`: Full property address
- `property_address_city`: City
- `property_address_state`: State
- `property_address_zipcode`: ZIP code
- `property_address_county`: County
- `estimated_value`: Property value (decimal)
- `property_type`: Type of property
- `sale_date`: Sale date (YYYY-MM-DD format)
- `status_id`: Status ID (defaults to 1 if not provided)

**Success Response** (201):
```json
{
  "success": true,
  "message": "Contact created successfully.",
  "contact": {
    "id": 123,
    "user_id": 2,
    "lead_id": "LEAD-12345",
    "contact_1_name": "John Doe",
    "contact_first_name": "John",
    "contact_last_name": "Doe",
    "contact_1_phone1": "+1234567890",
    "contact_1_email1": "john@example.com",
    "property_address_full": "123 Main Street, Springfield, IL 62701",
    "lead_type": 1,
    "lead_type_name": "Probate",
    "lead_type_color": "#8B5CF6",
    "status_id": 1,
    "status_name": "New",
    "status_color": "#3B82F6",
    "created_at": "2025-01-15T12:30:00.000Z"
  }
}
```

---

## Bulk Insert

Send multiple contacts in a single request for improved performance.

**Limit**: Maximum 100 contacts per request

**Request Body** (Array):
```json
[
  {
    "lead_id": "LEAD-001",
    "contact_1_name": "Jane Smith",
    "contact_1_phone1": "+1987654321",
    "contact_1_email1": "jane@example.com",
    "property_address_full": "456 Oak Avenue",
    "estimated_value": 350000
  },
  {
    "lead_id": "LEAD-002",
    "contact_1_name": "David Johnson",
    "contact_1_phone1": "+18885553333",
    "contact_1_email1": "david@example.com",
    "property_address_full": "789 Pine Street",
    "estimated_value": 525000
  }
]
```

**Success Response** (201 - All Succeeded):
```json
{
  "success": true,
  "message": "Processed 2 contact(s): 2 succeeded, 0 failed.",
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "success": true,
      "contact": { /* contact object */ },
      "index": 0
    },
    {
      "success": true,
      "contact": { /* contact object */ },
      "index": 1
    }
  ]
}
```

**Partial Success Response** (207 - Multi-Status):
```json
{
  "success": false,
  "message": "Processed 4 contact(s): 3 succeeded, 1 failed.",
  "total": 4,
  "successful": 3,
  "failed": 1,
  "results": [
    {
      "success": true,
      "contact": { /* contact object */ },
      "index": 0
    },
    {
      "success": false,
      "error": "Duplicate contact detected. A contact with lead_id \"LEAD-002\" already exists.",
      "details": "Duplicate contact...",
      "index": 1,
      "lead_id": "LEAD-002"
    },
    {
      "success": true,
      "contact": { /* contact object */ },
      "index": 2
    },
    {
      "success": true,
      "contact": { /* contact object */ },
      "index": 3
    }
  ]
}
```

---

## Auto-Processing Features

### 1. Automatic Name Parsing

When you provide `contact_1_name`, it's automatically split into:
- `contact_first_name`: First word
- `contact_last_name`: Remaining words

**Examples**:
- "John Doe" → first: "John", last: "Doe"
- "Mary Jane Smith" → first: "Mary", last: "Jane Smith"
- "Prince" → first: "Prince", last: ""

### 2. Default Status

If `status_id` is not provided, contacts automatically receive `status_id = 1` ("New" status).

### 3. Duplicate Detection

Duplicates are detected based on:
- Same `user_id`
- Same `lead_id`
- Same `lead_type`

If a duplicate is found, the request returns a 409 error with the existing contact ID.

### 4. Email Validation

Empty email strings are rejected. Either:
- Provide a valid email address, OR
- Omit the `contact_1_email1` field entirely

---

## Other Endpoints

### Get Available Lead Types

**Endpoint**: `GET /api/webhook/lead-types`

**Authentication**: API Key

**Response**:
```json
{
  "success": true,
  "leadTypes": [
    { "id": 1, "name": "Probate", "color": "#8B5CF6" },
    { "id": 2, "name": "Refi", "color": "#3B82F6" },
    { "id": 3, "name": "Equity", "color": "#10B981" },
    { "id": 4, "name": "Permit", "color": "#F59E0B" },
    { "id": 5, "name": "Home", "color": "#EF4444" }
  ]
}
```

### Health Check

**Endpoint**: `GET /api/webhook/health`

**Authentication**: None

**Response**:
```json
{
  "success": true,
  "message": "Webhook API is operational",
  "timestamp": "2025-01-15T12:30:00.000Z"
}
```

---

## Testing in Localhost

### Quick Test with Postman

1. **Create API Key** in Admin > API Keys panel

2. **Create a new POST request**:
   ```
   http://localhost:5000/api/webhook/2/1
   ```

3. **Headers**:
   - `Content-Type`: `application/json`
   - `Authorization`: `Bearer YOUR_API_KEY`

4. **Body** (raw JSON - Single Contact):
   ```json
   {
     "lead_id": "TEST-001",
     "contact_1_name": "Jane Smith",
     "contact_1_phone1": "+1987654321",
     "contact_1_email1": "jane@example.com",
     "property_address_full": "456 Oak Avenue",
     "estimated_value": 350000
   }
   ```

5. **Body** (raw JSON - Bulk):
   ```json
   [
     {
       "lead_id": "TEST-001",
       "contact_1_name": "Jane Smith",
       "contact_1_email1": "jane@example.com"
     },
     {
       "lead_id": "TEST-002",
       "contact_1_name": "John Doe",
       "contact_1_email1": "john@example.com"
     }
   ]
   ```

---

## Production Setup

### 1. Environment Configuration

```env
# Production Database
DB_HOST=your-production-db-host.com
DB_PORT=3306
DB_NAME=agent_crm_production
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# Production JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secure-random-string-min-64-characters-long

PORT=5000
```

### 2. HTTPS Setup (REQUIRED)

**⚠️ Important**: Always use HTTPS in production to protect API keys.

**Nginx Example**:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Production Endpoints

```
https://yourdomain.com/api/webhook/{userId}/{leadTypeId}
https://yourdomain.com/api/webhook/lead-types
https://yourdomain.com/api/webhook/health
```

### 4. Process Management with PM2

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server/index.js --name "agent-crm-api"

# Enable startup on boot
pm2 startup
pm2 save

# Monitor
pm2 logs agent-crm-api
pm2 monit

# Restart after updates
pm2 restart agent-crm-api
```

---

## Security Best Practices

### 1. API Key Management

- ✅ **Never commit API keys to version control**
- ✅ **Rotate keys every 90 days**
- ✅ **Use different keys for different integrations**
- ✅ **Deactivate unused keys immediately**
- ✅ **Monitor usage** via `last_used_at` timestamp

### 2. Request Security

- ✅ API validates user ID matches API key owner
- ✅ Lead type validation before insertion
- ✅ All inputs are sanitized
- ✅ Duplicate detection prevents data pollution
- ✅ 100-contact limit per bulk request

### 3. Rate Limiting (Recommended)

Implement rate limiting in production:
- Recommended: 100 requests/minute per API key
- Use nginx `limit_req` module or Express middleware

### 4. Monitoring

- Log all requests (without sensitive data)
- Alert on failed authentication attempts
- Track unusual patterns (high volume, repeated failures)
- Monitor API key usage statistics

---

## Error Handling

### Authentication Errors

**401 - Missing API Key**:
```json
{
  "error": "API key required. Provide it via Authorization: Bearer YOUR_API_KEY or X-API-Key header."
}
```

**401 - Invalid API Key**:
```json
{
  "error": "Invalid or inactive API key."
}
```

**403 - User ID Mismatch**:
```json
{
  "error": "Access denied. API key does not match the specified user ID."
}
```

**403 - Inactive Account**:
```json
{
  "error": "User account is not active."
}
```

### Validation Errors

**400 - Missing Required Field**:
```json
{
  "error": "contact_1_name is required."
}
```

**400 - Empty Email**:
```json
{
  "error": "contact_1_email1 cannot be empty. Either provide a valid email or omit the field."
}
```

**400 - Invalid Lead Type**:
```json
{
  "error": "Invalid lead type ID: 99. Please use a valid lead type ID."
}
```

**400 - Bulk Limit Exceeded**:
```json
{
  "error": "Bulk insert limit exceeded. Maximum 100 contacts per request."
}
```

### Conflict Errors

**409 - Duplicate Contact**:
```json
{
  "error": "Duplicate contact detected.",
  "message": "A contact with lead_id \"LEAD-12345\" and lead_type 1 already exists for this user.",
  "existing_contact_id": 456
}
```

---

## Integration Examples

### cURL (Single Contact)

```bash
curl -X POST https://yourdomain.com/api/webhook/2/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "lead_id": "LEAD-12345",
    "contact_1_name": "John Doe",
    "contact_1_phone1": "+1234567890",
    "contact_1_email1": "john@example.com",
    "property_address_full": "123 Main St",
    "estimated_value": 250000
  }'
```

### cURL (Bulk Insert)

```bash
curl -X POST https://yourdomain.com/api/webhook/2/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '[
    {
      "lead_id": "LEAD-001",
      "contact_1_name": "Jane Smith",
      "contact_1_email1": "jane@example.com"
    },
    {
      "lead_id": "LEAD-002",
      "contact_1_name": "John Doe",
      "contact_1_email1": "john@example.com"
    }
  ]'
```

### PHP (Bulk Insert)

```php
<?php
$userId = 2;
$leadTypeId = 1;
$apiKey = 'your-api-key-here';

$contacts = [
    [
        'lead_id' => 'LEAD-001',
        'contact_1_name' => 'Jane Smith',
        'contact_1_email1' => 'jane@example.com',
        'property_address_full' => '456 Oak Ave',
        'estimated_value' => 350000
    ],
    [
        'lead_id' => 'LEAD-002',
        'contact_1_name' => 'John Doe',
        'contact_1_email1' => 'john@example.com',
        'property_address_full' => '789 Pine St',
        'estimated_value' => 525000
    ]
];

$ch = curl_init("https://yourdomain.com/api/webhook/$userId/$leadTypeId");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($contacts));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    "Authorization: Bearer $apiKey"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 201) {
    $result = json_decode($response, true);
    echo "Processed {$result['total']} contacts: ";
    echo "{$result['successful']} succeeded, {$result['failed']} failed\n";
} else {
    echo "Error: $response\n";
}
?>
```

### Python (with Error Handling)

```python
import requests

user_id = 2
lead_type_id = 1
api_key = 'your-api-key-here'

url = f'https://yourdomain.com/api/webhook/{user_id}/{lead_type_id}'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {api_key}'
}

# Bulk insert
contacts = [
    {
        'lead_id': 'LEAD-001',
        'contact_1_name': 'Jane Smith',
        'contact_1_email1': 'jane@example.com',
        'estimated_value': 350000
    },
    {
        'lead_id': 'LEAD-002',
        'contact_1_name': 'John Doe',
        'contact_1_email1': 'john@example.com',
        'estimated_value': 525000
    }
]

response = requests.post(url, json=contacts, headers=headers)

if response.status_code in [201, 207]:
    result = response.json()
    print(f"Processed {result['total']} contacts:")
    print(f"  ✓ {result['successful']} succeeded")
    print(f"  ✗ {result['failed']} failed")

    # Show failed contacts
    for item in result['results']:
        if not item['success']:
            print(f"  Error at index {item['index']}: {item['error']}")
else:
    print(f"Error {response.status_code}: {response.text}")
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const userId = 2;
const leadTypeId = 1;
const apiKey = 'your-api-key-here';

const url = `https://yourdomain.com/api/webhook/${userId}/${leadTypeId}`;
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`
};

// Bulk insert
const contacts = [
  {
    lead_id: 'LEAD-001',
    contact_1_name: 'Jane Smith',
    contact_1_email1: 'jane@example.com',
    estimated_value: 350000
  },
  {
    lead_id: 'LEAD-002',
    contact_1_name: 'John Doe',
    contact_1_email1: 'john@example.com',
    estimated_value: 525000
  }
];

axios.post(url, contacts, { headers })
  .then(response => {
    const { total, successful, failed, results } = response.data;
    console.log(`Processed ${total} contacts: ${successful} succeeded, ${failed} failed`);

    // Show errors
    results.filter(r => !r.success).forEach(r => {
      console.log(`Error at index ${r.index}: ${r.error}`);
    });
  })
  .catch(error => {
    console.error('Error:', error.response?.data || error.message);
  });
```

---

## Support & Troubleshooting

### Common Issues

1. **"Invalid API key"**
   - Verify key is active in Admin > API Keys
   - Check for typos in the API key
   - Ensure API key belongs to the correct user

2. **"Access denied. API key does not match user ID"**
   - The userId in the URL must match the user who owns the API key

3. **"Duplicate contact detected"**
   - Contact with same lead_id and lead_type already exists
   - Use a different lead_id or update the existing contact

4. **ECONNREFUSED / Connection errors**
   - Verify server is running
   - Check firewall settings
   - Ensure correct URL (http vs https)

### Best Practices

✅ **Use bulk insert** for multiple contacts (up to 100)
✅ **Include lead_id** to enable duplicate detection
✅ **Provide status_id** if you have custom statuses
✅ **Monitor API key usage** regularly
✅ **Use HTTPS** in production
✅ **Implement error handling** in your integration

---

## Changelog

### Version 2.0.0 (2025-01-21)
- ✨ **NEW**: Bulk insert support (up to 100 contacts)
- ✨ **NEW**: Automatic name parsing (first/last name)
- ✨ **NEW**: Default status_id = 1
- ✨ **NEW**: Duplicate detection
- ✨ **NEW**: Empty email validation
- 🔧 Production-ready logging
- 🔧 Improved error messages with detailed results
- 📚 Updated documentation

### Version 1.0.0 (2025-01-15)
- Initial release
- API key management system
- Webhook endpoint for contact insertion
- Bearer token and X-API-Key authentication
- Lead type validation
