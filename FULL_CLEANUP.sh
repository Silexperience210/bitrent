#!/bin/bash
# FULL CLEANUP - Remove ALL fake data from Supabase

echo "🧹 BitRent Full Cleanup Script"
echo "==============================="
echo ""
echo "This will:"
echo "1. Delete ALL payments"
echo "2. Delete ALL rentals"
echo "3. Delete ALL mineurs"
echo "4. Delete ALL users"
echo "5. Leave Supabase database EMPTY"
echo ""
echo "⚠️  This is DESTRUCTIVE - use only for development!"
echo ""

# Check if required env vars are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required"
  echo "Set them in packages/backend/.env"
  exit 1
fi

cd packages/backend

# Delete all data via Supabase REST API
echo "🗑️  Deleting payments..."
curl -X DELETE \
  "${SUPABASE_URL}/rest/v1/payments?id=gt.0" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json"

echo "🗑️  Deleting rentals..."
curl -X DELETE \
  "${SUPABASE_URL}/rest/v1/rentals?id=gt.0" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json"

echo "🗑️  Deleting mineurs..."
curl -X DELETE \
  "${SUPABASE_URL}/rest/v1/mineurs?id=gt.0" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json"

echo "🗑️  Deleting users..."
curl -X DELETE \
  "${SUPABASE_URL}/rest/v1/users?id=gt.0" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json"

echo ""
echo "✅ Full cleanup complete!"
echo "Database is now empty and ready for real data."
