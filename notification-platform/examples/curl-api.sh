#!/usr/bin/env bash

# Example 6: cURL REST API Commands for NaaS Integration

API_URL="http://localhost:5000/api/v1"
API_KEY="test_api_key"

echo "=== 1. Check Liveness Probe ==="
curl -X GET "${API_URL}/health/live"

echo -e "\n\n=== 2. Send Email Notification ==="
curl -X POST "${API_URL}/notifications/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "channel": "EMAIL",
    "category": "TRANSACTIONAL",
    "template": "welcome-email",
    "recipient": "curl_user@example.com",
    "data": {
      "name": "cURL Tester"
    }
  }'

echo -e "\n\n=== 3. Track Business Event ==="
curl -X POST "${API_URL}/events" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d '{
    "event": "ORDER_CREATED",
    "externalEventId": "evt_curl_101",
    "recipient": {
      "externalUserId": "usr_curl_101"
    },
    "data": {
      "orderId": "ORD-CURL-101",
      "amount": 29.99
    }
  }'

echo -e "\n\n=== 4. Fetch Active Subscription Plans ==="
curl -X GET "${API_URL}/plans"

echo -e "\n"
