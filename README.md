# RentTrack - Transportation Management System (TMS) Backend

This repository contains the backend for the **Transportation Management System (TMS)**, built with a modern Python stack. It is designed to handle users, vehicles, drivers, trips, billing (challan, invoices, quotations), and analytics.

## Tech Stack

*   **Framework:** FastAPI
*   **Database:** PostgreSQL
*   **ORM:** SQLAlchemy
*   **Migrations:** Alembic
*   **Validation:** Pydantic
*   **Auth:** JWT (Access + Refresh Tokens)
*   **Background Jobs:** FastAPI BackgroundTasks / Celery
*   **SMS:** Sendbird / Twilio
*   **API Docs:** Swagger UI + ReDoc

## Modules Overview

The backend is modularized to support various business requirements. The core modules include:

1.  **Login & Authentication**: Secure password-less authentication system using OTP, JWT, and role-based authorization.
2.  **Registration Module**: Company-based user registration with an approval workflow.
3.  **Admin / Super Admin / User Management**: Manage users, vehicles, drivers, trips, notifications, and business revenue.
4.  **Challan Module**: Digitize daily operational work into structured billing records.
5.  **Quotation Module**: Quotation management system supporting pricing, approval, PDF generation, and booking conversion.
6.  **Party / Client Ledger Module**: Complete client financial records, payments, and account balances.
7.  **TDS Deduction Module**: Automatic TDS calculations and management.
8.  **Driver Daily Collection**: Track and manage daily cash collections.
9.  **Invoice Module**: Generate professional invoices with tax calculations, payment tracking, and digital sharing.
10. **Outstanding Report**: Monitor unpaid invoices and outstanding client balances.
11. **Rate Card Module**: Centralized pricing rules used across quotations, challans, and invoices.
12. **Client Multi-site Module**: Manage multiple operational locations per client.
13. **Reports & Analytics Module**: Business analytics, operational insights, and financial reporting.
14. **Physical Challan Entry Module**: Digitize offline challans with manual entry and verification.

## Setup & Installation

> 💡 **For a complete step-by-step local laptop setup guide, see [RUN_LOCALLY.md](RUN_LOCALLY.md).**

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd renttrack
    ```

2.  **Start PostgreSQL & Redis with Docker:**
    ```bash
    docker compose up -d
    ```

3.  **Environment Variables:**
    Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env      # On Windows PowerShell: Copy-Item .env.example .env
    ```

4.  **Set up a virtual environment & install dependencies:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows PowerShell: .\venv\Scripts\activate
    pip install -r requirements.txt
    ```

5.  **Database Migrations & Initial Data Seeding:**
    ```bash
    alembic upgrade head
    python -m scripts.seed_data
    ```

6.  **Run the Server:**
    Start the FastAPI application:
    ```bash
    uvicorn app.main:app --reload
    ```

7.  **API Documentation:**
    Once the server is running, access the interactive API documentation at:
    *   Swagger UI: `http://localhost:8000/docs`
    *   ReDoc: `http://localhost:8000/redoc`
    *   Health Check: `http://localhost:8000/health`
