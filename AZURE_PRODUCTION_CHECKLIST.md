# Azure Production Deployment Checklist

## Part 1: Environment Variables Configuration

### Required Environment Variables in Azure App Service

Go to Azure Portal > App Service > Configuration > Application Settings

| Variable | Value | How to Get |
|----------|-------|------------|
| `DATABASE_URL` | `postgresql://...` | Already configured |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard > Developers > API Keys |
| `VITE_STRIPE_PUBLIC_KEY` | `pk_live_...` | Stripe Dashboard > Developers > API Keys |
| `RESEND_API_KEY` | `re_...` | Resend Dashboard > API Keys |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.com` | Must match verified domain in Resend |
| `CLICKSEND_USERNAME` | Your ClickSend username | ClickSend Dashboard |
| `CLICKSEND_API_KEY` | Your ClickSend API key | ClickSend Dashboard > API Credentials |
| `PLAID_CLIENT_ID` | Your Plaid client ID | Plaid Dashboard > Keys |
| `PLAID_SECRET` | Plaid production secret | Plaid Dashboard > Keys (Production) |
| `PLAID_ENV` | `production` | Set to "production" |
| `SESSION_SECRET` | Random 64-character string | Generate with: `openssl rand -hex 32` |
| `NODE_ENV` | `production` | Set to "production" |

---

## Part 2: Third-Party Service Configuration

### Stripe Dashboard (dashboard.stripe.com)

1. **Webhook Endpoint**
   - Go to Developers > Webhooks > Add endpoint
   - URL: `https://chipinpool.azurewebsites.net/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `account.updated` (for Connect)
     - `payout.paid`
     - `payout.failed`
     - `identity.verification_session.verified`
     - `identity.verification_session.requires_input`

2. **Connect Settings**
   - Go to Settings > Connect > Settings
   - Add redirect URL: `https://chipinpool.azurewebsites.net/security`
   - Add redirect URL: `https://chipinpool.azurewebsites.net/payment-methods`

3. **Issuing (Virtual Cards)**
   - Ensure Issuing is enabled for your account
   - Configure spending controls if needed

### Resend Dashboard (resend.com)

1. **Domain Verification**
   - Go to Domains > Add Domain
   - Add your domain (e.g., chipinpool.com)
   - Add the DNS records provided (SPF, DKIM, DMARC)
   - Wait for verification (can take up to 24 hours)

2. **API Key**
   - Go to API Keys > Create API Key
   - Copy and add to Azure environment variables

### Plaid Dashboard (dashboard.plaid.com)

1. **Redirect URIs**
   - Go to Developers > API > Allowed redirect URIs
   - Add: `https://chipinpool.azurewebsites.net/security`
   - Add: `https://chipinpool.azurewebsites.net/payment-methods`

2. **Production Access**
   - Ensure you have production access approved
   - Use production credentials (not sandbox)

### ClickSend Dashboard (clicksend.com)

1. **Verify API Credentials**
   - Go to API Credentials
   - Ensure username and API key are correct

---

## Part 3: Production Testing Checklist

### Authentication & Security

- [ ] **User Registration**
  - [ ] Can register with email, phone, name, DOB
  - [ ] Phone verification SMS is received
  - [ ] Account is created successfully
  - [ ] Redirected to dashboard after registration

- [ ] **User Login**
  - [ ] Can login with email/password
  - [ ] Session persists across page refreshes
  - [ ] Logout works correctly

- [ ] **Two-Factor Authentication (2FA)**
  - [ ] Can enable 2FA with QR code
  - [ ] TOTP codes work correctly
  - [ ] Recovery codes are generated
  - [ ] Login requires 2FA code when enabled

- [ ] **Password Reset**
  - [ ] Password reset email is sent
  - [ ] Reset link works
  - [ ] Can set new password

### KYC Verification

- [ ] **Stripe Identity**
  - [ ] Can start KYC verification
  - [ ] Stripe Identity modal opens
  - [ ] Verification completes and status updates
  - [ ] "Refresh Status" button works

### Payment Methods

- [ ] **Bank Account Linking (Stripe Financial Connections)**
  - [ ] "Link Bank Account" button works
  - [ ] Stripe Financial Connections modal opens
  - [ ] Can select and link bank account
  - [ ] Bank account appears in list after linking

- [ ] **Debit Card Linking**
  - [ ] "Link Debit Card" button works
  - [ ] Card entry form loads (Stripe Elements)
  - [ ] Can enter and save debit card
  - [ ] Card appears in list after linking

- [ ] **Payout Verification (Stripe Connect)**
  - [ ] "Verify for Payouts" button works
  - [ ] Redirects to Stripe Connect onboarding
  - [ ] Can complete onboarding
  - [ ] Status shows "Verified" after completion

### Wallet & Deposits

- [ ] **Add Funds**
  - [ ] Can initiate deposit from profile
  - [ ] Stripe Checkout opens
  - [ ] Payment completes successfully
  - [ ] Balance updates after successful payment
  - [ ] Transaction appears in history

### Pools

- [ ] **Create Pool**
  - [ ] Can create new pool with all details
  - [ ] Pool appears in dashboard

- [ ] **Pool Contributions**
  - [ ] Can contribute to pool (from wallet)
  - [ ] Can contribute via Stripe Checkout (card)
  - [ ] Balance updates correctly
  - [ ] Contribution appears in pool activity

- [ ] **Pool Invitations**
  - [ ] Email invitations are sent
  - [ ] SMS invitations are sent
  - [ ] Invite links work for recipients

- [ ] **Virtual Cards**
  - [ ] Virtual card is created when pool is funded
  - [ ] Can view card details (number, CVV, expiry)
  - [ ] Card can be used for purchases (test with small amount)

### Withdrawals/Payouts

- [ ] **Pool Withdrawal (to self)**
  - [ ] Pool creator can initiate withdrawal
  - [ ] Can select payout method (ACH or instant)
  - [ ] Withdrawal processes successfully

- [ ] **Transfer Requests**
  - [ ] Pool creator can send transfer request to contributor
  - [ ] Contributor receives notification
  - [ ] Contributor can accept/decline
  - [ ] Accept flow works with bank selection

### Notifications

- [ ] **Email Notifications**
  - [ ] Pool invitations send email
  - [ ] Contribution notifications send email
  - [ ] Security alerts send email

- [ ] **SMS Notifications**
  - [ ] Pool invitations send SMS
  - [ ] Verification codes send SMS

### Admin Portal

- [ ] **Access**
  - [ ] Admin can access /admin
  - [ ] Non-admin users cannot access

- [ ] **User Management**
  - [ ] Can view users list
  - [ ] Can search users
  - [ ] Can suspend/unsuspend users

- [ ] **Pool Management**
  - [ ] Can view all pools
  - [ ] Can filter by status

### Merchant API (ChipInPay)

- [ ] **Merchant Registration**
  - [ ] Can register as merchant
  - [ ] Can generate API keys

- [ ] **Checkout Sessions**
  - [ ] Can create checkout session via API
  - [ ] Checkout page loads for customers
  - [ ] Payment completes successfully

---

## Part 4: Quick Smoke Test (Do This First)

1. Open `https://chipinpool.azurewebsites.net`
2. Click "Sign In" - page should load without errors
3. Try to register a new account
4. Verify phone with SMS code
5. Complete KYC verification
6. Go to Payment Methods
7. Try to link a bank account
8. Create a pool
9. Add funds to wallet
10. Contribute to the pool

If all these work, the core flows are functioning.

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Stripe not loaded" error | Check `VITE_STRIPE_PUBLIC_KEY` is set correctly |
| Emails not sending | Verify domain in Resend, check `RESEND_API_KEY` |
| SMS not sending | Check ClickSend credentials |
| Bank linking fails | Check Plaid credentials and redirect URIs |
| Payouts fail | Complete Stripe Connect onboarding, verify bank account |
| KYC not updating | Use "Refresh Status" button, check Stripe Identity dashboard |

### Checking Logs on Azure

1. Go to Azure Portal > App Service > Log stream
2. Or: App Service > Diagnose and solve problems > Application Logs
