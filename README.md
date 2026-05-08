# MediTrace AI
### Every Medicine. Every Step. Verified.

MediTrace AI is a blockchain-powered pharmaceutical supply chain verification platform designed to combat counterfeit medicines and improve transparency across the medical distribution ecosystem.

The platform combines:
- Blockchain-based medicine batch tracking
- QR-powered supply chain verification
- AI-assisted medicine information analysis
- Role-based pharmaceutical management
- Secure scan history and audit systems

Built as part of the **Unisys Innovation Program (UIP)** by **Lev The Team**.

---

# Problem Statement

Counterfeit and unverified medicines are a growing global problem. Patients often have no reliable way to verify:
- Whether a medicine is genuine
- Where it originated from
- Whether it has been tampered with
- Whether storage conditions were maintained
- Whether the medicine information is trustworthy

Traditional pharmaceutical tracking systems are centralized, fragmented, and difficult to audit.

MediTrace AI solves this by creating a transparent and traceable medicine verification ecosystem using blockchain technology and AI-assisted analysis.

---

# Key Features

## Blockchain-Based Batch Verification
Every medicine batch is registered on-chain using Solidity smart contracts.

Features:
- Immutable batch records
- Blockchain-backed authenticity
- Batch revocation support
- Transparent supply chain tracking
- Tamper-resistant verification

---

## QR-Based Medicine Authentication
Each medicine batch generates a unique QR code.

When scanned:
- Users are redirected to the verification page
- Batch details are fetched from blockchain + database
- Medicine authenticity is verified instantly

---

## AI-Powered Medicine Information
Integrated with Google Gemini AI.

The AI currently provides:
- Simple medicine summaries
- What the medicine is used for
- Basic side-effect awareness
- Guidance on who should or should not take it
- Safety warnings
- Recommendation to always consult a doctor before use

> MediTrace AI does not replace professional medical advice.

---

## Multi-Role Access System

### SuperAdmin
- Creates organization/admin accounts
- Oversees the platform ecosystem

### Admin
- Mints medicine batches
- Generates supply chain QR codes
- Monitors alerts and batch activity
- Revokes compromised batches

### Patient/User
- Scans medicines
- Verifies authenticity
- Views medicine information
- Accesses scan history and reminders

---

# Technology Stack

## Frontend
- React.js
- Tailwind CSS
- Framer Motion
- tsParticles

## Backend
- Node.js
- Express.js

## Database & Authentication
- Supabase
- PostgreSQL

## Blockchain
- Solidity
- Hardhat
- Polygon-compatible architecture
- OpenZeppelin Contracts

## AI
- Google Gemini API

## QR Technologies
- html5-qrcode
- qrcode.react

---

# Project Architecture

```text
User Scan
   ↓
QR Verification
   ↓
Frontend (React)
   ↓
Backend API (Express)
   ↓
Blockchain + Supabase
   ↓
AI Analysis (Gemini)
   ↓
Verification Result
