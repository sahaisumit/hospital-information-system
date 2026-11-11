# Hospital Information System (HIS) — MERN

A full-stack Hospital Information System.

## Included modules
- Dashboard
- Patient registration and records
- Doctor management
- Appointment scheduling
- Electronic Medical Records (EMR)
- Prescriptions
- Pharmacy inventory and stock alerts
- Laboratory tests and reports
- Ward/bed availability and admissions
- Billing and payment tracking
- Staff workload view
- Role-based authentication foundation
- MongoDB/Mongoose models and REST APIs

## Tech stack
React + Vite, Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs.
The client uses Tailwind CSS v4 for the shared layout, dashboards, forms, and workflow surfaces.

## Run
1. Install Node.js 18+ and MongoDB.
2. Copy `server/.env.example` to `server/.env`.
3. In `server`: `npm install` then `npm run seed` then `npm run dev`.
4. In `client`: `npm install` then `npm run dev`.
5. Open the Vite URL shown in the terminal.

The seed command provisions demo accounts for each staff role. Use `admin@his.local` / `Admin@123` or the login screen's staff shortcuts (password: `Demo@123`). Public sign-up is for patients; staff accounts must be created by an administrator.

Administrators can onboard staff from **Staff & Workload**. Add the staff member's work email and a temporary password (8+ characters); the system creates the role-linked login and shows the credentials in the confirmation. For doctors, the login is linked to that doctor's own appointment schedule. Doctors sign in with their assigned work email and password, then use **Appointments** and **Prescriptions**. Staff credentials are stored as password hashes.

Appointment booking shows the doctor's consultation fee and requires a payment confirmation before booking. This academic build records a demo UPI/card payment; it does not connect to a payment gateway.

> This is an academic/project implementation. Do not use it for real patient care or production healthcare data without appropriate security, compliance, audit, backup, and clinical validation.
# Razorpay payment setup

The billing screen uses Razorpay Standard Checkout. The server creates each order and verifies the checkout signature and captured payment before changing an invoice to paid. Do not put the API secret in the client or commit it to source control.

1. Create or sign in to a Razorpay account and switch to **Test Mode**.
2. In the Razorpay Dashboard, open **Account & Settings → API Keys** and generate a test key pair.
3. Copy `server/.env.example` to `server/.env` (or add these variables to the existing server environment) and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to the test pair. Restart the API server.
4. For webhook recovery, add a webhook in the Dashboard with URL `https://<your-public-api-host>/api/billing-ops/razorpay-webhook`, select `payment.captured` and `order.paid`, set a webhook secret, and put that same value in `RAZORPAY_WEBHOOK_SECRET`. Webhooks are optional for local checkout; the checkout verification endpoint is required.
5. Test checkout with Razorpay's test payment methods. Switch to **Live Mode** only after your account is activated; generate a separate live key pair and replace the test values in the production server environment.

Required account credentials are the Razorpay **Key ID** and **Key Secret**. The **Webhook Secret** is optional and only needed for webhook recovery. I cannot generate these on your behalf because Razorpay issues them inside the account dashboard; enter them directly into the server's private environment file and do not send the secret in chat.
