# Law Nation - Frontend & API Integration Guide

This document is for the **Frontend Developers** of Law Nation. It explains the project architecture, Redux Toolkit setup, and the implementation of User, Admin, and Editor workflows.

---

## 1. Project Overview
Law Nation is a legal research portal. The frontend is built with **Next.js 15+ (App Router)** and uses **Redux Toolkit** for centralized state management.

---

## 2. Technical Stack
* **Framework**: Next.js 15+ (App Router)
* **State Management**: Redux Toolkit (RTK) & Local State
* **Styling**: Tailwind CSS
* **Notifications**: React-Toastify
* **Language**: TypeScript (.tsx) / JavaScript (.jsx)
* **HTTP Client**: Native Fetch API

---

## 3. Project Structure
The project follows a standard Next.js structure with modular folders for different roles:

```text
/app
  /admin            # Admin Dashboard (Live Data Integrated)
  /admin-login      # Dedicated login for Administrators
  /editor           # Editor Dashboard (Review System)
  /components       # UI Components (Navbar, StoreProvider)
  /lib
    /store          # Redux Store, authSlice
  /login            # Standard User Authentication Page
  /home             # Main Home page
  /submit-paper     # Guest Article Submission Page (Public)
  layout.tsx        # Root layout with StoreProvider & Toaster