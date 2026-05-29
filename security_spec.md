# Security Specification & Test Driven Design for ReviewReply AI Firestore Rules

## 1. Data Invariants

1. **User Ownership Isolation**: Users must only be allowed to view, create, or update their own `/users_profile/{userId}` document.
2. **Subcollection Relational Security**: Access to `/users_profile/{userId}/history/{reviewId}` derived collection is strictly bound to `/users_profile/{userId}` document owner.
3. **Immutability of Key Fields**: Once created, user `id`, `email`, and `createdAt` are completely immutable. They cannot be updated.
4. **No Cross-User Manipulation**: Users cannot read. write, or delete other users' directories.
5. **No Custom RBAC Claims / Secure State Transitions**: Users cannot arbitrarily upgrade their own plan to premium or manually increase their `replies_used` count except through formal transaction routes or server administrative checks.

## 2. The Dirty Dozen Payloads (Malicious Attempt Cases)

The following payload attempts must be strictly evaluated and rejected by the security rules:

1. **Self-Upgrade Plan Spoofing (Write Bypass)**:
   ```json
   {
     "id": "user_123",
     "email": "user@gmail.com",
     "plan": "agency",
     "replies_limit": 1000
   }
   ```
2. **Identity Spoofing via False ID Field**:
   ```json
   {
     "id": "target_victim_id",
     "email": "attacker@gmail.com"
   }
   ```
3. **Invalid Character ID Poisoning**:
   Inserting path variable with malicious text: `userId = "user_123%2Fadmin%2Fhack"`.
4. **Large Size Resource Exhaustion (Denial of Wallet)**:
   A `business_name` exceeding 5KB.
5. **PII Blanket Unauthorized Listing**:
   Listing all documents from `/users_profile` collection.
6. **Shadow Update Gate bypass**:
   Adding a hidden field `isAdmin: true` to a profile change.
7. **Bypassing Verification (Email Spoofing)**:
   Self-asserting claims with `email_verified: false` on critical updates.
8. **Stale/Fake Timestamps injection**:
   Sending client-relative `created_at` or `updated_at` timestamps instead of server values.
9. **Tampering with Historic Statistics**:
   Updating a review history document with mock fields or spoofing `user_id` to another account.
10. **Writing to Unmapped Collections**:
    Attempting to save to a random collection `/attack_logs`.
11. **Orphaned Writes without Master Gate verification**:
    Creating history logs under a userId map that does not have an active matching `/users_profile/{userId}` parent.
12. **Status/Rule Corruption bypass**:
    Removing verification links or deleting other merchants' profiles.

## 3. Test Cases Configuration

The security rules must enforce all above constraints and guarantee `PERMISSION_DENIED` on any non-verified or invalid user payload.
