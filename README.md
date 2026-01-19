# Kolam Renang UNY Frontend

This is the frontend application for the Kolam Renang UNY Management System, built with React, Vite, and TailwindCSS. It connects to a Supabase backend for data persistence and authentication.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- NPM (v9 or higher)

### Installation

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Database Setup

The project includes a complete database definition file.

1.  Open your Supabase SQL Editor.
2.  Copy the content of `FINAL_SCHEMA.sql` from the project root.
3.  Run the script to create all tables, policies, and seed data.

### Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## 🛠️ Tech Stack

-   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
-   **Styling**: [TailwindCSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Backend/Auth**: [Supabase](https://supabase.com/)
-   **Routing**: [React Router](https://reactrouter.com/)

## 📂 Project Structure

-   `src/components`: Reusable UI components (buttons, forms, layout, etc.)
-   `src/pages`: Main application views (**Admin**, **Receptionist**, **Scanner**, **Login**)
-   `src/services`: API service layers (Supabase integration)
-   `src/contexts`: Global state providers (AuthContext, etc.)
-   `src/lib`: Utility functions and helpers
-   `database`: SQL migration files and schemas
-   `FINAL_SCHEMA.sql`: **Master database definition file**

## 🔑 Key Features

-   **Admin Dashboard**:
    -   **Reporting**: Detailed financial reports, daily usage, and export to Excel.
    -   **Staff Management**: Shift scheduling (Morning/Afternoon) and role management.
    -   **Master Data**: Manage Ticket Categories, Packages, Pools, and Prices.
-   **Receptionist View**:
    -   **Fast POS**: Touch-friendly interface for selling tickets.
    -   **Thermal Printing**: Optimized 80mm ticket printing support.
    -   **History**: View recent transactions and reprint capability.
-   **Ticket Scanner**:
    -   **QR Scanning**: Fast validation of visitor tickets.
    -   **Multi-Scan**: Support for package tickets (e.g., 5-visit pass).

## 🎫 Ticket System Logic

### Special Request / Custom Tickets (Prefix 'K')

The system includes a specialized ticket category "Khusus" (Prefix: **K**) designed for flexible usage scenarios like bulk packages, member passes, or contracts.

-   **Multi-Use Capability**: Unlike standard tickets (single-use), 'K' tickets can be linked to **Ticket Packages** (e.g., "Paket 10x Renang").
-   **Usage Tracking**: The system tracks `usage_count` for these tickets. A scanner can scan the same ticket multiple times until it reaches its quota.
-   **Pricing**: These tickets often have dynamic pricing:
    -   If linked to a package, the price defaults to the package's `price_per_person`.
    -   They can be issued with custom pricing for special billing requirements.
-   **Reporting**: In admin reports, usage for 'K' tickets is displayed as `Current/Max` (e.g., "5/10") to track consumption of prepaid packages.

## 📦 Building for Production

To create a production build:

```bash
npm run build
```

The output will be in the `dist` directory.
