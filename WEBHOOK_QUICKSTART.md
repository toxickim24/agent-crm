# Webhook API - Quick Start Guide

## Overview

This webhook API allows you to insert contacts into the CRM by sending HTTP POST requests with an API key for authentication.

---

## Quick Start (3 Steps)

### Step 1: Get Your API Key

1. Login to the CRM system
2. Navigate to API Keys section (or use the API endpoint below)
3. Create a new API key

**Via API**:
```bash
# Login first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'

# Create API key (use the token from login response)
curl -X POST http://localhost:5000/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"My Webhook Integration"}'
```

Save the `api_key` value from the response!

### Step 2: Get Your User ID and Lead Type ID

**Your User ID**: Found in your account settings or login response

**Available Lead Types**:
- `1` = Probate
- `2` = Refi
- `3` = Equity
- `4` = Permit
- `5` = Home

Or fetch dynamically:
```bash
curl -X GET http://localhost:5000/api/webhook/lead-types \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Step 3: Send Contact Data

```bash
curl -X POST http://localhost:5000/api/webhook/{USER_ID}/{LEAD_TYPE_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "contact_1_name": "John Doe",
    "contact_1_phone1": "+1234567890",
    "contact_1_email1": "john@example.com",
    "property_address_full": "123 Main St",
    "estimated_value": 250000
  }'
```

**Example**:
```bash
curl -X POST http://localhost:5000/api/webhook/1/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 4385637ad7da663197680dc6a217b89f7b7e837fdb5ea534e4f907e5e91811fc" \
  -d '{
    "contact_1_name": "John Doe",
    "contact_1_phone1": "+1234567890",
    "contact_1_email1": "john@example.com"
  }'
```

---

## Endpoint Format

```
POST /api/webhook/{userId}/{leadTypeId}
```

**Headers**:
- `Content-Type: application/json`
- `Authorization: Bearer YOUR_API_KEY`

**OR** alternatively:
- `X-API-Key: YOUR_API_KEY`

---

## Required Fields

- `contact_1_name` - Contact's full name (REQUIRED)

## Optional Fields

- `contact_1_phone1` - Phone number
- `contact_1_email1` - Email address
- `property_address_full` - Full property address
- `property_address_city` - City
- `property_address_state` - State
- `property_address_zipcode` - ZIP code
- `property_address_county` - County
- `estimated_value` - Property value (number)
- `property_type` - Type of property
- `sale_date` - Sale date (YYYY-MM-DD)
- `lead_id` - Your internal lead ID
- `status_id` - Status ID

---

## Success Response

```json
{
  "success": true,
  "message": "Contact created successfully.",
  "contact": {
    "id": 123,
    "user_id": 1,
    "contact_1_name": "John Doe",
    "lead_type": 1,
    "lead_type_name": "Probate",
    "created_at": "2025-01-15T12:30:00.000Z",
    ...
  }
}
```

---

## Common Errors

**401 - Missing API Key**:
```json
{"error": "API key required. Provide it via Authorization: Bearer YOUR_API_KEY or X-API-Key header."}
```
→ Add the Authorization header with your API key

**401 - Invalid API Key**:
```json
{"error": "Invalid or inactive API key."}
```
→ Check your API key is correct and active

**403 - User ID Mismatch**:
```json
{"error": "Access denied. API key does not match the specified user ID."}
```
→ Ensure the userId in the URL matches your account

**400 - Missing Required Field**:
```json
{"error": "contact_1_name is required."}
```
→ Add the contact_1_name field to your request body

**400 - Invalid Lead Type**:
```json
{"error": "Invalid lead type ID: 99. Please use a valid lead type ID."}
```
→ Use a valid lead type ID (1-5 for default types)

---

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const userId = 1;
const leadTypeId = 1;
const apiKey = 'your-api-key-here';

axios.post(`http://localhost:5000/api/webhook/${userId}/${leadTypeId}`, {
  contact_1_name: 'John Doe',
  contact_1_phone1: '+1234567890',
  contact_1_email1: 'john@example.com',
  property_address_full: '123 Main St',
  estimated_value: 250000
}, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  }
})
.then(response => console.log('Contact created:', response.data.contact.id))
.catch(error => console.error('Error:', error.response?.data));
```

### Python
```python
import requests

user_id = 1
lead_type_id = 1
api_key = 'your-api-key-here'

response = requests.post(
    f'http://localhost:5000/api/webhook/{user_id}/{lead_type_id}',
    json={
        'contact_1_name': 'John Doe',
        'contact_1_phone1': '+1234567890',
        'contact_1_email1': 'john@example.com',
        'property_address_full': '123 Main St',
        'estimated_value': 250000
    },
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
)

if response.status_code == 201:
    print('Contact created:', response.json()['contact']['id'])
else:
    print('Error:', response.json())
```

### PHP
```php
<?php
$userId = 1;
$leadTypeId = 1;
$apiKey = 'your-api-key-here';

$data = [
    'contact_1_name' => 'John Doe',
    'contact_1_phone1' => '+1234567890',
    'contact_1_email1' => 'john@example.com',
    'property_address_full' => '123 Main St',
    'estimated_value' => 250000
];

$ch = curl_init("http://localhost:5000/api/webhook/$userId/$leadTypeId");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    "Authorization: Bearer $apiKey"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 201) {
    $result = json_decode($response, true);
    echo "Contact created: " . $result['contact']['id'];
} else {
    echo "Error: $response";
}
?>
```

---

## Production Checklist

When moving to production:

1. **Use HTTPS** - Never send API keys over HTTP
   ```
   https://yourdomain.com/api/webhook/{userId}/{leadTypeId}
   ```

2. **Update Base URL** - Change from localhost to your domain

3. **Secure API Keys**
   - Store in environment variables
   - Never commit to version control
   - Rotate periodically (every 90 days)

4. **Configure CORS** - Restrict allowed domains in server settings

5. **Set up SSL/TLS** - Use nginx or Apache as reverse proxy

6. **Monitor Usage** - Track API calls and errors

7. **Enable Rate Limiting** - Prevent abuse (recommended: 100 req/min)

---

## Testing Your Integration

### 1. Health Check
```bash
curl http://localhost:5000/api/webhook/health
```
Should return: `{"success":true,"message":"Webhook API is operational",...}`

### 2. Get Lead Types
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:5000/api/webhook/lead-types
```

### 3. Insert Test Contact
```bash
curl -X POST http://localhost:5000/api/webhook/1/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"contact_1_name":"Test Contact","contact_1_phone1":"+1234567890"}'
```

---

## API Key Management

### List Your API Keys
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/api-keys
```

### Create New API Key
```bash
curl -X POST http://localhost:5000/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"Production API Key"}'
```

### Deactivate API Key
```bash
curl -X PATCH http://localhost:5000/api/api-keys/{KEY_ID}/toggle \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete API Key
```bash
curl -X DELETE http://localhost:5000/api/api-keys/{KEY_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Need More Help?

See the full documentation: [WEBHOOK_API_DOCUMENTATION.md](./WEBHOOK_API_DOCUMENTATION.md)

---

## Test Results

All endpoints tested and working:
- ✅ API Key creation
- ✅ Contact insertion with Bearer token
- ✅ Contact insertion with X-API-Key header
- ✅ Lead types retrieval
- ✅ Health check
- ✅ User validation
- ✅ Lead type validation
- ✅ Error handling

**Test API Key** (for localhost testing only):
```
4385637ad7da663197680dc6a217b89f7b7e837fdb5ea534e4f907e5e91811fc
```

**Test Contacts Created**:
- Contact ID 33: John Doe (Probate)
- Contact ID 34: Jane Smith (Refi)

---

**Last Updated**: 2025-11-20
