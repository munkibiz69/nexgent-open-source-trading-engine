# Nexgent AI API - Postman Collections

This directory contains Postman collections and environments for testing the Nexgent AI API.

## 📦 Files

| File | Description |
|------|-------------|
| `Nexgent-API.postman_collection.json` | **Main collection** - All endpoints with JWT authentication (for dashboard/UI testing) |
| `Nexgent-API-Keys.postman_collection.json` | **API Keys collection** - Endpoints accessible via API keys (for external integrations) |
| `Nexgent-API.postman_environment.json` | Environment variables for local development |
| `README.md` | This file |

## 🔑 Which Collection Should I Use?

| Use Case | Collection |
|----------|------------|
| Testing the web dashboard flow | Main collection (JWT auth) |
| Building external integrations | API Keys collection |
| Creating/managing agents | Main collection (JWT auth) |
| Sending trading signals programmatically | API Keys collection |
| Reading agent data from external systems | API Keys collection |

## API Key Scopes

The API Keys collection is organized by scope:

| Scope | Access | Folder |
|-------|--------|--------|
| `signals` | Read + Write | Signals |
| `agents` | Read only | Agents |
| `positions` | Read only | Positions |
| `balances` | Read only | Balances |
| `transactions` | Read only | Transactions |
| `history` | Read only | History |
| `full_access` | All | All folders |

## 🚀 Quick Start

### 1. Import Collections

1. Open Postman
2. Click **Import** button (top left)
3. Select both collection files:
   - `Nexgent-API.postman_collection.json` (main collection)
   - `Nexgent-API-Keys.postman_collection.json` (API keys collection)
4. Click **Import**

### 2. Import Environment

1. Click **Import** button
2. Select **`Nexgent-API.postman_environment.json`**
3. Click **Import**
4. Select the environment from the dropdown (top right): **"Nexgent API - Local Development"**

### 3. Configure Environment

1. Click the **eye icon** (top right) next to the environment dropdown
2. Click **Edit** (or click the environment name)
3. Update variables as needed:
   - **`base_url`**: Backend API URL (default: `http://localhost:4000`)
   - **`user_email`**: Your test user email (default: `test@example.com`)

### 4. Start Backend Server

Make sure your backend server is running:

```bash
cd packages/backend
pnpm dev
```

The server should be running on `http://localhost:4000` (or your configured port).

### 5. Test Authentication Flow (Main Collection)

1. **Register** a new user (or use an existing account)
2. **Login** to get access and refresh tokens
3. Tokens are automatically stored in the environment
4. Use **Get Current User** to test protected endpoints
5. Use **Refresh Token** to get a new access token
6. Use **Logout** to invalidate tokens

### 6. Test API Key Authentication (API Keys Collection)

1. First, use the **Main Collection** to login with JWT
2. Go to **API Keys > Create API Key** in the Main Collection
3. Select your desired scopes and create the key
4. Copy the API key (shown only once!)
5. Set the `api_key` environment variable
6. Switch to the **API Keys Collection** and test endpoints

## 📋 Available Endpoints

### Authentication

#### Register
- **Method**: `POST`
- **URL**: `/api/v1/auth/register`
- **Body**: `{ "email": "user@example.com", "password": "SecurePassword123!" }`
- **Description**: Register a new user account
- **Authentication**: Not required

#### Login
- **Method**: `POST`
- **URL**: `/api/v1/auth/login`
- **Body**: `{ "email": "user@example.com", "password": "SecurePassword123!", "rememberMe": false }`
- **Description**: Authenticate a user and receive tokens
- **Authentication**: Not required

#### Refresh Token
- **Method**: `POST`
- **URL**: `/api/v1/auth/refresh`
- **Body**: `{ "refreshToken": "..." }`
- **Description**: Refresh an expired access token
- **Authentication**: Not required

#### Get Current User
- **Method**: `GET`
- **URL**: `/api/v1/auth/me`
- **Headers**: `Authorization: Bearer <access_token>`
- **Description**: Get information about the authenticated user
- **Authentication**: Required

#### Logout
- **Method**: `POST`
- **URL**: `/api/v1/auth/logout`
- **Headers**: `Authorization: Bearer <access_token>`
- **Description**: Logout the authenticated user
- **Authentication**: Required

### Agents

#### Create Agent
- **Method**: `POST`
- **URL**: `/api/v1/agents`
- **Headers**: `Authorization: Bearer <access_token>`
- **Body**: `{ "name": "My First Agent", "tradingMode": "simulation" }`
- **Description**: Create a new agent for the authenticated user
- **Authentication**: Required

#### List Agents
- **Method**: `GET`
- **URL**: `/api/v1/agents`
- **Headers**: `Authorization: Bearer <access_token>`
- **Description**: Get all agents for the authenticated user
- **Authentication**: Required

#### Get Agent
- **Method**: `GET`
- **URL**: `/api/v1/agents/:id`
- **Headers**: `Authorization: Bearer <access_token>`
- **Description**: Get a specific agent by ID
- **Authentication**: Required

#### Update Agent
- **Method**: `PUT`
- **URL**: `/api/v1/agents/:id`
- **Headers**: `Authorization: Bearer <access_token>`
- **Body**: `{ "name": "Updated Name", "tradingMode": "simulation", "automatedTradingSimulation": true, "automatedTradingLive": false }`
- **Description**: Update an existing agent
- **Authentication**: Required

#### Delete Agent
- **Method**: `DELETE`
- **URL**: `/api/v1/agents/:id`
- **Headers**: `Authorization: Bearer <access_token>`
- **Description**: Delete an agent
- **Authentication**: Required

### Agent Balances

#### Create Agent Balance
- **Method**: `POST`
- **URL**: `/api/v1/agent-balances`
- **Headers**: `Authorization: Bearer <access_token>`
- **Body**: `{ "agentId": "uuid", "tokenAddress": "So111...", "tokenSymbol": "SOL", "balance": "1000000000", "walletAddress": "optional" }`
- **Description**: Create a new agent balance
- **Authentication**: Required

#### List Agent Balances
- **Method**: `GET`
- **URL**: `/api/v1/agent-balances?agentId=:agentId`
- **Headers**: `Authorization: Bearer <access_token>`
- **Description**: Get all balances for an agent
- **Authentication**: Required

#### Get Agent Balance
- **Method**: `GET`
- **URL**: `/api/v1/agent-balances/:id`
- **Headers**: `Authorization: Bearer <access_token>`
- **Description**: Get a specific agent balance by ID
- **Authentication**: Required

#### Update Agent Balance
- **Method**: `PUT`
- **URL**: `/api/v1/agent-balances/:id`
- **Headers**: `Authorization: Bearer <access_token>`
- **Body**: `{ "balance": "2000000000", "tokenSymbol": "SOL" }`
- **Description**: Update an existing agent balance
- **Authentication**: Required

#### Delete Agent Balance
- **Method**: `DELETE`
- **URL**: `/api/v1/agent-balances/:id`
- **Headers**: `Authorization: Bearer <access_token>`
- **Description**: Delete an agent balance
- **Authentication**: Required

## 🔐 Authentication Flow

### 1. Register a New User

1. Open the **Register** request
2. Update the `user_email` in the request body (or use the environment variable)
3. Set a strong password (meets password requirements)
4. Click **Send**
5. Tokens are automatically stored in the environment

### 2. Login

1. Open the **Login** request
2. Update the `user_email` and `password` in the request body
3. Optionally set `rememberMe` to `true` for a longer-lived refresh token
4. Click **Send**
5. Tokens are automatically stored in the environment

### 3. Use Protected Endpoints

1. Tokens are automatically included in the **Authorization** header
2. Open any protected endpoint (e.g., **Get Current User**)
3. Click **Send**
4. The request will include the access token automatically

### 4. Refresh Token

1. When the access token expires (after 15 minutes), use **Refresh Token**
2. The refresh token is automatically used from the environment
3. A new access token is automatically stored in the environment

### 5. Logout

1. Open the **Logout** request
2. Click **Send**
3. Tokens are automatically cleared from the environment

### 6. Create Agent

1. Open the **Create Agent** request
2. Update the `name` in the request body 
3. Click **Send**
4. Agent ID is automatically stored in the environment

### 7. List Agents

1. Open the **List Agents** request
2. Click **Send**
3. View all agents for the authenticated user

### 8. Get Agent

1. Open the **Get Agent** request
2. The `agent_id` from the environment is automatically used
3. Click **Send**
4. View the agent details

### 9. Update Agent

1. Open the **Update Agent** request
2. Update the `name`, `tradingMode`, and/or `automatedTradingSimulation`/`automatedTradingLive` in the request body
3. Click **Send**
4. View the updated agent

### 10. Delete Agent

1. Open the **Delete Agent** request
2. Click **Send**
3. Agent ID is automatically cleared from the environment

### 11. Create Agent Balance

1. Open the **Create Agent Balance** request
2. Update the `agentId`, `tokenAddress`, `tokenSymbol`, `balance`, and optionally `walletAddress` in the request body
3. Click **Send**
4. Balance ID is automatically stored in the environment

### 12. List Agent Balances

1. Open the **List Agent Balances** request
2. The `agentId` query parameter is automatically set from the environment
3. Click **Send**
4. View all balances for the agent

### 13. Get Agent Balance

1. Open the **Get Agent Balance** request
2. The `balance_id` from the environment is automatically used
3. Click **Send**
4. View the balance details

### 14. Update Agent Balance

1. Open the **Update Agent Balance** request
2. Update the `balance` and/or `tokenSymbol` in the request body
3. Click **Send**
4. View the updated balance

### 15. Delete Agent Balance

1. Open the **Delete Agent Balance** request
2. Click **Send**
3. Balance ID is automatically cleared from the environment

## 🔧 Environment Variables

### Automatic Variables (Set by Collection)

- **`access_token`**: JWT access token (set after login/register)
- **`refresh_token`**: JWT refresh token (set after login/register)
- **`user_id`**: User ID (set after login/register)
- **`user_email`**: User email (set after login/register)
- **`agent_id`**: Agent ID (set after creating an agent)
- **`balance_id`**: Agent balance ID (set after creating an agent balance)

### Manual Variables (You Set)

- **`base_url`**: Backend API URL (default: `http://localhost:4000`)

## 🧪 Testing

The collection includes automated tests for each endpoint:

### Register Tests
- ✅ Status code is 201
- ✅ Response has access token
- ✅ Response has refresh token
- ✅ Response has user object

### Login Tests
- ✅ Status code is 200
- ✅ Response has access token
- ✅ Response has refresh token
- ✅ Response has user object
- ✅ Account lockout handling

### Refresh Token Tests
- ✅ Status code is 200
- ✅ Response has access token

### Get Current User Tests
- ✅ Status code is 200
- ✅ Response has user id
- ✅ Response has user email
- ✅ Response has createdAt

### Logout Tests
- ✅ Status code is 200
- ✅ Response indicates success

### List Agents Tests
- ✅ Status code is 200
- ✅ Response is an array
- ✅ Each agent has required fields

### Get Agent Tests
- ✅ Status code is 200
- ✅ Response has agent id
- ✅ Response has agent name
- ✅ Response has userId
- ✅ Response has createdAt
- ✅ Response has updatedAt

### Update Agent Tests
- ✅ Status code is 200
- ✅ Response has agent id
- ✅ Response has updated name
- ✅ Response has updatedAt

### Delete Agent Tests
- ✅ Status code is 200
- ✅ Response indicates success

### Create Agent Balance Tests
- ✅ Status code is 201
- ✅ Response has balance id
- ✅ Response has agentId
- ✅ Response has tokenAddress
- ✅ Response has tokenSymbol
- ✅ Response has balance
- ✅ Response has lastUpdated

### List Agent Balances Tests
- ✅ Status code is 200
- ✅ Response is an array
- ✅ Each balance has required fields

### Get Agent Balance Tests
- ✅ Status code is 200
- ✅ Response has balance id
- ✅ Response has agentId
- ✅ Response has tokenAddress
- ✅ Response has tokenSymbol
- ✅ Response has balance
- ✅ Response has lastUpdated

### Update Agent Balance Tests
- ✅ Status code is 200
- ✅ Response has balance id
- ✅ Response has updated balance
- ✅ Response has lastUpdated

### Delete Agent Balance Tests
- ✅ Status code is 200
- ✅ Response indicates success

### Global Tests
- ✅ Response time is less than 5000ms

## 📝 Password Requirements

Passwords must meet the following requirements:

- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## 🔒 Security Features

### Account Lockout
- Account is locked after 5 failed login attempts
- Lockout duration: 15 minutes
- Lockout status is returned in the response (status code 423)

### Token Expiration
- Access tokens expire after 15 minutes
- Refresh tokens expire after 24 hours (or 30 days if `rememberMe` is true)

### Error Messages
- Generic error messages prevent email enumeration
- Constant-time password verification prevents timing attacks

## 🌍 Environment Setup

### Local Development

```json
{
  "base_url": "http://localhost:4000",
  "user_email": "test@example.com"
}
```


## 🐛 Troubleshooting

### Issue: "Access token not found"

**Solution**: Login or register first to get tokens.

### Issue: "Invalid or expired refresh token"

**Solution**: Login again to get a new refresh token.

### Issue: "Account is locked"

**Solution**: Wait 15 minutes or reset the account lockout in the database.

### Issue: "Connection refused"

**Solution**: Make sure the backend server is running on the configured port.

### Issue: "CORS error"

**Solution**: Make sure the backend CORS configuration allows requests from Postman.

## 📚 Additional Resources

- [Postman Documentation](https://learning.postman.com/docs/)
- [Backend README](../README.md) - Architecture, services, and setup

## 🤝 Contributing

When adding new endpoints:

1. Add the endpoint to the collection
2. Include request/response examples
3. Add automated tests
4. Update this README
5. Document authentication requirements
6. Include error responses

## 📄 License

This Postman collection is part of the Nexgent AI open-source project.

---

**Last Updated**: 2026-02-11  
**Version**: 2.1.0

