# expense-tracker
Created with CodeSandbox

## Firebase env vars (required for deploy)

Create React App bakes `process.env.REACT_APP_*` into the build at **build time**. So you must set these where the build runs:

- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`

Copy from Firebase Console → Project settings → Your apps. Use a `.env` file locally (see `.env.example`).

---

## Deploy to Vercel (recommended)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your repo.
3. **Environment variables:** In project settings, add all six `REACT_APP_FIREBASE_*` variables (Production, Preview, Development).
4. Deploy. Vercel will run `yarn build` with those env vars; the app will work with Firebase.

**Or via CLI:**

```bash
npm i -g vercel
vercel login
# Add env vars: vercel env add REACT_APP_FIREBASE_API_KEY (repeat for each)
vercel --prod
```

---

## Deploy to Firebase Hosting

1. **Link your Firebase project** (one-time):
   ```bash
   npx firebase login
   npx firebase use --add
   ```
   Select the same project as in your `.env` (`REACT_APP_FIREBASE_PROJECT_ID`).

2. **Build and deploy** (use a shell that has your `.env` loaded so the build gets the vars):
   ```bash
   yarn deploy:firebase
   ```

Your app will be live at `https://<project-id>.web.app`.
