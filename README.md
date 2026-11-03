# Gemstone Code

Gemstone Code is a React single-page application served by Vite.

## Get started

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

The browser entry point is `src/main.jsx`.

## Web push notifications

To enable purchase notifications, set `VITE_FIREBASE_VAPID_KEY` in `.env.local` to the Web Push certificate key from Firebase Console under Project settings > Cloud Messaging. Users must allow browser notifications; purchases continue normally if push is unavailable or permission is declined.
