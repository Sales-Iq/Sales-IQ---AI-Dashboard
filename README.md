# SalesIQ — AI Powered Sales & Inventory Forecasting Dashboard

This is a normal **HTML + CSS + Tailwind CDN + Vanilla JavaScript** project. It uses Firebase Authentication, Firebase Firestore, Chart.js, jsPDF, SheetJS, and Gemini API.

## How to run

1. Open the folder in VS Code.
2. Install the **Live Server** extension.
3. Right click `index.html` and choose **Open with Live Server**.
4. Register one Admin account first. The app now stores Admin/Manager accounts in `admins` and Sales Staff accounts in `staff`.
5. Add products, then create sales. The dashboard, analytics, forecasting, reports, and AI pages will start showing real data.

## Firebase setup required

In Firebase Console:

- Enable **Authentication > Email/Password**.
- Enable **Authentication > Google**.
- Enable **Firestore Database**.
- Add your Live Server URL to Firebase Auth authorized domains if needed. For local testing, `localhost` is normally already allowed.

## Important security note

The Firebase config is okay to keep in frontend, but Firestore rules must protect data. The Gemini key inside `js/firebase-config.js` is visible in browser developer tools. For a real hosted project, restrict the Gemini key or move Gemini calls to a backend/Cloudflare Worker.

## Pages included

- Landing page
- Login page
- Register page
- Admin dashboard
- Product management
- Inventory
- Sales management
- Add sale / billing
- Forecasting
- AI insights
- Analytics
- Customer management
- Supplier management
- Purchase / restock
- Reports
- User management
- Notifications
- Settings
- Sales staff dashboard
- Sales staff add sale
- My sales
- Stock view
- Profile
- 404 page
- Loading page

## Collections used

- admins
- staff
- products
- sales
- customers
- suppliers
- purchases
- notifications
- forecasting
- businessSettings

## Forecasting formula

Average Daily Sales = Total Sold / Number of Days

Stock Finish Days = Current Stock / Average Daily Sales

Suggested Reorder = Average Daily Sales × 30 Days


## Structured Liquid Glass Update

This ZIP uses a cleaner folder structure:

```text
css/shared.css              common layout + UI
css/auth.css                root login/register 3D auth design
css/liquid-glass.css        common liquid glass / 3D animation layer
js/firebase-config.js       common Firebase + Gemini config
js/shared.js                common shell/auth helpers
js/auth.js                  login/register Firebase logic
js/liquid-glass.js          common liquid glass animation
js/auth-3d.js               auth page 3D tilt

admin/css/admin.css         admin-only styling
admin/js/*.js               admin page logic
sales/css/sales.css         sales staff-only styling
sales/js/*.js               sales staff page logic
```

Open with VS Code Live Server from `index.html` or `login.html`.
If update/delete gives `Missing or insufficient permissions`, publish `firestore-rules.txt` in Firebase Firestore Rules and make sure your Auth UID exists in `admins` with `role: "Admin"` and `status: "active"`.

## Dummy Live Data Update

This ZIP includes a dummy live sales generator for project/demo use.

How to use it:

1. Login as Admin.
2. Open `admin/dashboard.html`.
3. Click **Seed / Restock Demo Products** once.
4. Click **Generate 1 Dummy Sale** to test one sale.
5. Click **Start Dummy Live Data** to automatically create demo sales every few seconds.

What it does:

- Adds demo products with `source: "demo"`.
- Creates sales with `source: "dummy"` and `isDemo: true`.
- Reduces stock automatically.
- Updates the Admin Dashboard live using Firestore realtime listeners.
- Keeps staff-created sales separate using `source: "staff"`.
- Keeps admin billing sales separate using `source: "admin"`.

Important:

- Dummy live sales only use demo products, so your real/admin-added products are not randomly reduced.
- Staff can still create real/manual billing entries from the Sales Staff panel.
- Publish the updated `firestore-rules.txt` in Firebase. It allows staff billing to reduce only `stock`, `status`, and `updatedAt` on products.

## Admin and Staff collections

This version does not use a `users` collection for login profiles.

Use these collections instead:

- `admins` for Admin and Manager login accounts
- `staff` for Sales Staff login accounts
- `customers` for buyers/customers

For an existing Firebase Auth account, create a document manually first:

1. Firebase Console → Authentication → Users → copy your account UID.
2. Firestore Database → create collection `admins`.
3. Create document with the copied UID.
4. Add fields:

```text
name: "King"
email: "your-email@example.com"
role: "Admin"
status: "active"
```

Then publish `firestore-rules.txt` in Firestore Rules and refresh the website.
