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
  |-- layout.tsx            # ROOT LAYOUT: Global Styles, StoreProvider, ToastContainer
  |
  |-- (main)                # PUBLIC ROUTES GROUP (With Navbar & Footer)
  |   |-- layout.tsx        # Public Layout: Common Navbar and Footer
  |   |-- page.tsx          # Main Landing Page (Search Engine)
  |   |-- home/             # Home Dashboard
  |   |-- about/            # About Page
  |   |-- login/            # Standard User Login
  |   |-- submit-paper/     # Public Article Submission
  |   |-- join-us/          # Registration
  |
  |-- (dashboard)           # INTERNAL PORTAL GROUP (No Footer, Sidebar Based)
  |   |-- layout.tsx        # Portal Layout: Clean UI, No Footer, Private Header
  |   |-- admin/            # Admin Dashboard (Live Data Integrated)
  |   |-- editor/           # Editor Dashboard (Review System)
  |   |-- admin-login/      # Dedicated Admin Authentication
  |   |-- live-database/    # System Monitoring
  |
  |-- components/           # Reusable UI (Navbar, Footer, Sidebar)
  |-- lib/                  # Utilities & API Config
  |   |-- store/            # Redux Store, authSlice