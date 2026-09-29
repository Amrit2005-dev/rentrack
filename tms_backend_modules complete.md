# Backend Module-wise Breakdown — FastAPI + PostgreSQL

> **Implementation reference for Antigravity IDE**
> Total estimated duration: ~97 days across 14 modules

---

## Module Index

| # | Module | Duration |
|---|--------|----------|
| 1 | [Login Module](#1-login-module) | 12 days |
| 2 | [Registration Module](#2-registration-module) | 10 days |
| 3 | [Admin + Super Admin + User Module](#3-admin--super-admin--user-module) | 27 days |
| 4 | [Challan Module](#4-challan-module) | 8 days |
| 5 | [Quotation Module](#5-quotation-module) | 8 days |
| 6 | [Party / Client Ledger Module](#6-party--client-ledger-module) | 6 days |
| 7 | [TDS Deduction Module](#7-tds-deduction-module) | 2 days |
| 8 | [Driver Daily Collection Module](#8-driver-daily-collection-module) | 2 days |
| 9 | [Invoice Module](#9-invoice-module) | 7 days |
| 10 | [Outstanding Report Module](#10-outstanding-report-module) | 2 days |
| 11 | [Rate Card Module](#11-rate-card-module) | 3 days |
| 12 | [Client Multi-site Module](#12-client-multi-site-module) | 3 days |
| 13 | [Reports & Analytics Module](#13-reports--analytics-module) | 5 days |
| 14 | [Physical Challan Entry Module](#14-physical-challan-entry-module) | 2 days |

---

## 1. Login Module

**Duration:** 12 days

**Overall Purpose:** Provide a secure password-less authentication system using OTP, JWT authentication, and role-based authorization built on FastAPI.

| Feature | Purpose |
|---------|---------|
| **FastAPI Backend Setup** | Setup FastAPI project structure with routers, controllers (services), dependencies, middleware, configuration, logging, exception handlers, Pydantic models, SQLAlchemy ORM, Alembic migrations, environment configuration, and authentication utilities. Builds a scalable backend foundation for all future modules. |
| **Authentication API** | Accept registered mobile number, validate user existence, and initiate login flow. Entry point of authentication. |
| **OTP Generation API** | Generate OTP, securely store hashed OTP with expiry time, and trigger SMS service. Password-less secure authentication. |
| **OTP Verification API** | Verify OTP and authenticate the user. Completes the secure login process. |
| **OTP Security & Rate Limiting** | Limit OTP requests, block repeated invalid attempts, implement cooldown timers, and prevent brute-force attacks. Improves security and reduces SMS abuse. |
| **SMS Integration (Sendbird/Twilio)** | Integrate third-party SMS provider using FastAPI service layer. Delivers OTP to users. |
| **JWT Authentication** | Generate JWT Access Token and Refresh Token after successful OTP verification. Secure API authentication. |
| **Role-Based Authentication** | Detect Super Admin, Admin, or User role and return permissions in JWT payload. Controls dashboard and API access. |
| **Database Schema** | Create `users` and `login_history` tables using SQLAlchemy models and Alembic migrations. Maintains authentication records and login history (visible to Super Admin only). |
| **API Documentation** | Auto-generate Swagger UI and ReDoc documentation. Simplifies frontend integration and API testing. |
| **Frontend-Backend Integration** | Connect FastAPI endpoints with frontend login flow and database. End-to-end authentication testing. |

---

## 2. Registration Module

**Duration:** 10 days

**Overall Purpose:** Provide company-based user registration with an approval workflow before granting system access.

| Feature | Purpose |
|---------|---------|
| **Registration APIs** | Create FastAPI endpoints for new user registration and profile creation. Onboards new users securely. |
| **Company Detection Logic** | Detect whether the company already exists in the database. Decides whether approval goes to Super Admin or Company Admin. |
| **Approval Workflow Engine** | Handle `Pending → Approved → Rejected` workflow with role assignment. Prevents unauthorized users from accessing the system. |
| **Admin Approval APIs** | FastAPI endpoints for approve, reject, assign role, and update registration status. User verification workflow. |
| **Registration Database Schema** | Create `registration_requests`, `companies`, and `approval_history` tables with SQLAlchemy. Tracks registration lifecycle. |
| **Validation Layer (Pydantic)** | Validate mobile number, company name, duplicate registrations, and required fields. Ensures clean and valid input data. |
| **Notification Integration** | Notify Admin/Super Admin when new registration requests are received. Enables faster approval process. |
| **API Documentation** | Document all registration endpoints using Swagger UI. Simplifies frontend integration. |
| **Frontend-Backend Integration** | Connect registration screens with backend APIs and approval workflow. Completes registration lifecycle. |

---

## 3. Admin + Super Admin + User Module

**Duration:** 27 days

**Overall Purpose:** Manage users, vehicles, drivers, trips, notifications, and business revenue using a scalable FastAPI backend.

| Feature | Purpose |
|---------|---------|
| **Dashboard APIs** | FastAPI endpoints to provide trips, vehicles, drivers, users, revenue, and pending approval statistics. Business overview dashboard. |
| **Vehicle Management APIs** | CRUD APIs for vehicle records including RC, Insurance, Capacity, Fitness, Pollution, and Status. Fleet management. |
| **Driver Management APIs** | CRUD APIs for driver profiles, license details, assigned vehicle, and availability. Driver management. |
| **User Management APIs** | APIs to manage user profiles, roles, permissions, and account status. User administration. |
| **Trip Management APIs** | APIs to create, assign, start, update, complete, and cancel trips. End-to-end trip lifecycle management. |
| **Revenue Calculation Engine** | Service layer to calculate Base Fare, Distance Charges, Weight Charges, Waiting Charges, Toll, Extra Charges, GST, and Final Amount. Business revenue calculation. |
| **Receipt Generation APIs** | Generate trip receipts and store receipt history. Delivery proof and documentation. |
| **Notification Service** | Send notifications for approvals, trip assignment, trip completion, and receipts. Real-time communication. |
| **RBAC (Role-Based Access Control)** | Implement FastAPI dependency-based authorization for Super Admin, Admin, and User roles. Secure endpoint access. |
| **Database Design** | Create relational tables for Users, Vehicles, Drivers, Trips, Receipts, Notifications, and Roles using SQLAlchemy. Maintains structured business data. |
| **Background Tasks** | Use FastAPI `BackgroundTasks` (or Celery if required) for sending notifications and generating receipts asynchronously. Improves API performance. |
| **Frontend-Backend Integration** | Integrate all admin dashboards and CRUD operations with FastAPI endpoints. Completes operational workflow. |

---

## 4. Challan Module

**Duration:** 8 days

**Overall Purpose:** Digitize daily operational work into structured billing records using FastAPI services.

| Feature | Purpose |
|---------|---------|
| **Challan APIs** | FastAPI endpoints to create, update, fetch, and manage challans. Daily operational billing. |
| **Database Schema** | Create `challans` table using SQLAlchemy with client, vehicle, driver, hours, amount, and status. Stores billing records. |
| **Client Pricing Engine** | Fetch client-specific pricing during challan creation. Supports negotiated client rates. |
| **Money Calculation Service** | Calculate amount using hours, machine, package, client pricing, taxes, and extra charges. Automated billing. |
| **SMS Notification** | Trigger SMS after challan generation using `BackgroundTasks`. Informs client immediately. |
| **Validation Layer** | Validate challan inputs using Pydantic schemas. Prevents invalid records. |
| **API Documentation** | Swagger documentation for all challan endpoints. Easy API testing. |
| **Frontend-Backend Integration** | Connect challan creation screens and history with backend APIs. Completes challan workflow. |

---

## 5. Quotation Module

**Duration:** 8 days

**Overall Purpose:** Provide a complete quotation management system that supports pricing, approval, PDF generation, customer communication, and booking conversion.

| Feature | Purpose |
|---------|---------|
| **PostgreSQL Database Schema** | Create `quotations` table using SQLAlchemy and Alembic with quotation number, client, machine, package, rates, validity, terms & conditions, status, and timestamps. Stores and manages quotation records. |
| **Quotation CRUD APIs** | Create, update, view, delete, and list quotations. Complete quotation lifecycle management. |
| **Quotation PDF Generator** | Generate professional quotation PDFs. Shares quotations in a standardized format. |
| **Email / WhatsApp Sharing** | Send quotations through Email or WhatsApp using FastAPI `BackgroundTasks`. Faster customer communication. |
| **Quotation Approval Workflow** | Mark quotations as `Draft`, `Sent`, `Accepted`, `Rejected`, or `Expired`. Tracks quotation status. |
| **Rate Card Integration** | Fetch pricing automatically from the Rate Card module. Maintains pricing consistency. |
| **Terms & Conditions Templates** | Store reusable T&C templates. Reduces manual work. |
| **Booking / Trip Conversion** | Convert accepted quotations into bookings or trips. Smooth operational workflow. |
| **API Documentation** | Auto-generate Swagger UI documentation for all quotation APIs. Easy testing and frontend integration. |
| **Frontend-Backend Integration** | Connect quotation screens with backend APIs. End-to-end quotation management. |

---

## 6. Party / Client Ledger Module

**Duration:** 6 days

**Overall Purpose:** Maintain complete client financial records, payments, and account balances.

| Feature | Purpose |
|---------|---------|
| **PostgreSQL Database Schema** | Create `clients`, `ledger_entries`, and `payments` tables. Maintains client financial records. |
| **Client CRUD APIs** | Manage client information. Maintains customer database. |
| **Ledger Entry APIs** | Record debit, credit, invoices, and payments. Maintains transaction history. |
| **Balance Calculation** | Calculate opening, current, and closing balances. Financial tracking. |
| **Payment Recording** | Record payments received from clients. Updates outstanding balance. |
| **Ledger Statement Generator** | Generate client ledger statements. Financial reporting. |
| **Search & Filter APIs** | Search by client, date, invoice, or payment. Quick record retrieval. |
| **API Documentation** | Swagger documentation for ledger APIs. Easy API testing. |
| **Frontend-Backend Integration** | Connect ledger dashboard with backend. Completes financial workflow. |

---

## 7. TDS Deduction Module

**Duration:** 2 days

**Overall Purpose:** Automatically calculate and manage TDS deductions for invoices and financial reporting.

| Feature | Purpose |
|---------|---------|
| **PostgreSQL Database Schema** | Create `tds_records` table. Stores TDS information. |
| **TDS Calculation Service** | Calculate TDS based on applicable percentage. Automated tax deduction. |
| **TDS APIs** | Create, update, and retrieve TDS records. Manages tax deductions. |
| **Invoice Integration** | Apply TDS during invoice generation. Accurate billing. |
| **Reports** | Generate TDS reports. Tax compliance. |
| **API Documentation** | Swagger documentation. API testing. |
| **Frontend Integration** | Display TDS information in invoices. User visibility. |

---

## 8. Driver Daily Collection Module

**Duration:** 2 days

**Overall Purpose:** Track and manage the daily cash collections made by drivers.

| Feature | Purpose |
|---------|---------|
| **PostgreSQL Database Schema** | Create `driver_collections` table. Stores daily collections. |
| **Collection APIs** | Add and manage driver collections. Records daily cash collections. |
| **Driver Mapping** | Associate collections with drivers and trips. Accurate accounting. |
| **Daily Summary** | Generate collection summaries. Daily reconciliation. |
| **API Documentation** | Swagger documentation. Easy integration. |
| **Frontend Integration** | Connect collection screens with backend. Complete workflow. |

---

## 9. Invoice Module

**Duration:** 7 days

**Overall Purpose:** Generate professional invoices with tax calculations, payment tracking, and digital sharing.

| Feature | Purpose |
|---------|---------|
| **PostgreSQL Database Schema** | Create `invoices` and `invoice_items` tables. Stores invoice data. |
| **Invoice CRUD APIs** | Create, update, view, and cancel invoices. Invoice management. |
| **Invoice Number Generator** | Generate unique invoice numbers. Organized billing. |
| **GST & Tax Calculation** | Calculate GST, TDS, and total amount. Accurate billing. |
| **PDF Generator** | Generate printable invoice PDFs. Customer documentation. |
| **Email / WhatsApp Sharing** | Send invoices digitally. Faster communication. |
| **Payment Status Tracking** | Track `Paid`, `Pending`, and `Partial` statuses. Payment monitoring. |
| **API Documentation** | Swagger documentation. API testing. |
| **Frontend Integration** | Connect invoice module with frontend. End-to-end billing. |

---

## 10. Outstanding Report Module

**Duration:** 2 days

**Overall Purpose:** Monitor unpaid invoices and outstanding client balances.

| Feature | Purpose |
|---------|---------|
| **Outstanding APIs** | Calculate unpaid invoices. Pending payment tracking. |
| **PostgreSQL Queries** | Fetch outstanding balances client-wise. Financial reporting. |
| **Aging Report** | 30/60/90-day outstanding reports. Collection planning. |
| **Export APIs** | Export reports to Excel/PDF. Reporting. |
| **API Documentation** | Swagger documentation. Testing. |
| **Frontend Integration** | Display outstanding reports. User reporting. |

---

## 11. Rate Card Module

**Duration:** 3 days

**Overall Purpose:** Maintain centralized pricing rules used across quotations, challans, and invoices.

| Feature | Purpose |
|---------|---------|
| **PostgreSQL Database Schema** | Create `rate_cards` table. Stores pricing rules. |
| **Rate Card CRUD APIs** | Manage pricing information. Pricing management. |
| **Client-Specific Rates** | Support customized client pricing. Flexible billing. |
| **Price Lookup Service** | Fetch rates automatically. Reusable pricing engine. |
| **API Documentation** | Swagger documentation. Testing. |
| **Frontend Integration** | Connect pricing screens. Complete workflow. |

---

## 12. Client Multi-site Module

**Duration:** 3 days

**Overall Purpose:** Allow each client to manage multiple operational locations.

| Feature | Purpose |
|---------|---------|
| **PostgreSQL Database Schema** | Create `client_sites` table. Stores multiple client locations. |
| **Site CRUD APIs** | Manage client sites. Multi-location support. |
| **Client Mapping** | Link sites with clients. Organized operations. |
| **Site Selection APIs** | Fetch sites during booking. Operational efficiency. |
| **API Documentation** | Swagger documentation. Easy testing. |
| **Frontend Integration** | Connect site management screens. Complete workflow. |

---

## 13. Reports & Analytics Module

**Duration:** 5 days

**Overall Purpose:** Provide business analytics, operational insights, and financial reporting for decision-making.

| Feature | Purpose |
|---------|---------|
| **Dashboard Reports APIs** | Generate operational and financial reports. Business insights. |
| **Revenue Reports** | Revenue by client, vehicle, driver, and period. Financial analysis. |
| **Trip Reports** | Completed, ongoing, and cancelled trips. Operational tracking. |
| **Vehicle Utilization Reports** | Monitor vehicle usage. Fleet optimization. |
| **Driver Performance Reports** | Analyze driver productivity. Performance monitoring. |
| **Export Reports** | Export to Excel and PDF. Reporting. |
| **API Documentation** | Swagger documentation. Testing. |
| **Frontend Integration** | Display analytics dashboards. Business intelligence. |

---

## 14. Physical Challan Entry Module

**Duration:** 2 days

**Overall Purpose:** Digitize offline challans by allowing manual entry, verification, and document storage within the transportation management system.

| Feature | Purpose |
|---------|---------|
| **PostgreSQL Database Schema** | Create `physical_challans` table. Stores manually entered challans. |
| **Manual Entry APIs** | Create and manage physical challans. Records offline transactions. |
| **Challan Verification** | Verify manually entered records. Data accuracy. |
| **Image Upload Support** | Upload scanned challan images. Document storage. |
| **Search APIs** | Search challans by client, vehicle, driver, or date. Quick retrieval. |
| **API Documentation** | Swagger documentation. Easy testing. |
| **Frontend Integration** | Connect manual challan entry screens. End-to-end workflow. |

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Framework** | FastAPI |
| **Database** | PostgreSQL |
| **ORM** | SQLAlchemy |
| **Migrations** | Alembic |
| **Validation** | Pydantic |
| **Auth** | JWT (Access + Refresh Tokens) |
| **Background Jobs** | FastAPI BackgroundTasks / Celery |
| **SMS** | Sendbird / Twilio |
| **PDF Generation** | (per module requirements) |
| **API Docs** | Swagger UI + ReDoc |