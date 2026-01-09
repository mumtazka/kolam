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

### Environment Configuration

Create a `.env` file in the `frontend` root directory with the following variables:

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

-   `src/components`: Reusable UI components (buttons, cards, etc.)
-   `src/pages`: Main application pages (Admin, Receptionist, Scanner views)
-   `src/services`: API service layers for communicating with Supabase
-   `src/stats`: Context providers (Auth, Theme, etc.)

## 🔑 Key Features

-   **Admin Dashboard**: Manage staff, categories, prices, sessions, packages, and reports.
-   **Receptionist View**: Ticket sales, member lookup, and transaction handling.
-   **Ticket Scanner**: Mobile-optimized view for scanning QR tickets.

## 📦 Building for Production

To create a production build:

```bash
npm run build
```

The output will be in the `dist` directory.
