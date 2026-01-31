# ⚖️ Law Nation - Frontend Documentation

Welcome to the **Law Nation** Frontend codebase! This guide is designed to help new developers understand the project architecture, technical stack, and core workflows.

---

## 🚀 Project Overview
Law Nation is a high-performance **Legal Research Portal** built for legal professionals and scholars. It features automated article submission, multi-level peer review (Editor & Reviewer), and a searchable digital archive of legal manuscripts.

---

## 🛠 Tech Stack
*   **Framework**: [Next.js 15+](https://nextjs.org/) (App Router) - For SSR, SEO, and optimized routing.
*   **Language**: JavaScript (.jsx) / TypeScript (.tsx)
*   **State Management**: [Redux Toolkit (RTK)](https://redux-toolkit.js.org/) - Global state for authentication and sessions.
*   **Styling**: Vanilla CSS with [Tailwind CSS v4](https://tailwindcss.com/) utilities.
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Notifications**: [React-Toastify](https://fkhadra.github.io/react-toastify/)
*   **PDF Handling**: [pdf-lib](https://pdf-lib.js.org/) & [pdfjs-dist](https://mozilla.github.io/pdf.js/)

---

## 📁 Project Structure
The project follows a standard Next.js 15 structure with modular folders for different roles:

```text
/app
  ├── (main)                    # Public Facing Pages
  │   ├── layout.tsx            # Navbar & Footer Integration
  │   ├── home/                 # Landing Page (Search & Latest Updates)
  │   ├── about/                # About the Journal
  │   ├── articles/             # Complete Article Archive
  │   ├── article/[slug]/       # Individual Article Reading View
  │   ├── recent-issues/        # Digital Issue Library
  │   ├── issue/[id]/           # Deep Link to Specific Digital Issues
  │   ├── submit-paper/         # Public Manuscript Submission Form
  │   ├── our-team/             # Editorial Board & Staff
  │   ├── login/                # User Authentication
  │   └── join-us/              # User Registration
  │
  ├── (dashboard)               # Protected Administrative Portals
  │   ├── layout.tsx            # Admin UI Layout (Sidebar & Theme)
  │   ├── admin/                # Master Admin Dashboard
  │   │   ├── audit/            # Action Logs & System Tracking
  │   │   ├── banners/          # Homepage Hero Management
  │   │   ├── live-database/    # Real-time System Analytics
  │   │   ├── settings/         # About Us & Global Configuration
  │   │   └── upload-issue/     # Digital Issue Publishing
  │   ├── editor/               # Editor Workflow Panel
  │   ├── reviewer/             # Reviewer Feedback Portal
  │   └── management-login/     # Admin/Editor Secure Access
  │
  ├── components/               # Core Reusable UI Components
  │   ├── Navbar.tsx            # Global Navigation
  │   ├── Footer.tsx            # Global Footer
  │   ├── AdminSidebar.jsx      # Dashboard Navigation
  │   └── BackgroundCarousel.jsx# Hero Animation Component
  │
  ├── lib/                      # Business Logic & Global State
  │   └── store/                # Redux Toolkit Config (authSlice, store)
  │
  ├── assets/                   # Static Media (Logos, Icons, GIFs)
  ├── public/                   # Static Public Assets (Fonts, Favicon)
  └── readme/                   # Project Documentation
```

---

## 🔑 Authentication Workflow
We use a hybrid approach with **Redux Toolkit** and **LocalStorage**:
- **Standard Users**: Use `authToken` for standard access.
- **Admins**: Use `adminToken` for system-wide control.
- **Redux Slice**: Located at `app/lib/store/authSlice.ts`. It syncs with localStorage on page load to maintain the session.

---

## 🌟 Best Practices & Conventions
### 1. Data Fetching
- Always use **Skeleton Loaders** while data is being fetched. Refer to `app/(main)/home/page.jsx` for implementation.
- Handle empty states gracefully (e.g., "No articles found").

### 2. Image Optimization
- Use `loading="lazy"` for all non-critical images to improve "Largest Contentful Paint" (LCP).
- Prefer Next.js `<Image />` component for automatic resizing and format conversion.

### 3. Cleaning Up Data
- **Dates**: Per recent updates, avoid showing "Just Now" fallbacks. If data is missing locally, show an empty string or remove the field (Author-only displays).

### 4. UI Consistency
- Headings that act as links should be styled as: `text-blue-600 underline hover:text-blue-800`.

---

## ⚙️ Environment Variables
Create a `.env` file in the root directory:
```env
NEXT_PUBLIC_BASE_URL=http://your-api-url         # Backend API Endpoint
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-key         # Google reCAPTCHA
```

---

## 🏃 Local Development
1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
3.  **Build for Production**:
    ```bash
    npm run build
    ```

---

> [!TIP]
> **Pro Tip**: Always check the `(dashboard)` layout if you are adding new admin pages to ensure the **AdminSidebar** is properly integrated.

Happy Coding! 🚀