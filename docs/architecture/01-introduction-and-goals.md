# 1. Introduction and Goals

## 1.1 Requirements Overview

The DiviTrack application is a full-stack dividend tracking system designed to help users manage and analyze their investment portfolios with a focus on dividend income.

### Core Features

- **Portfolio Management**: Track securities (stocks, ETFs, bonds) with comprehensive metadata (ISIN, WKN, symbol)
- **Dividend Tracking**: Record and analyze dividend payments with multi-currency support
- **Transaction Management**: Track buy/sell transactions with automatic portfolio calculations
- **Multi-Currency Support**: ISO 4217-compliant currency management with automatic exchange rate synchronization
- **Price History**: End-of-day (EOD) price tracking for securities via Yahoo Finance
- **Analytics**: KPI calculation, time-range filtering, and portfolio performance analysis
- **Data Management**: Import/export capabilities for backup and migration
- **CSV Import**: Bulk import of securities, dividend payments and buy/sell transactions from CSV files (`POST /api/securities/import/csv`, `/api/dividend-payments/import/csv`, `/api/security-transactions/import/csv`)
- **Authentication**: Login with JWT; single-user mode (self-registration disabled by default, enabled only via `ALLOW_REGISTRATION=true`)

## 1.2 Quality Goals

| Priority | Quality Goal | Motivation |
|----------|-------------|------------|
| 1 | **Maintainability** | Clean architecture and modular design enable easy feature additions and bug fixes |
| 2 | **Data Integrity** | Financial data must be accurate and consistent; multi-layer validation prevents errors |
| 3 | **Extensibility** | New asset types, currencies, and features should be easy to add |
| 4 | **Performance** | Responsive UI and efficient data queries for smooth user experience |
| 5 | **Usability** | Intuitive interface with German localization for the target audience |
| 6 | **Testability** | Comprehensive test coverage to ensure reliability |

## 1.3 Stakeholders

| Role | Expectations | Concerns |
|------|-------------|----------|
| **End Users** | Easy dividend tracking, accurate calculations, multi-currency support | Data privacy, ease of use, data export |
| **Developers** | Clean codebase, good documentation, modern tech stack | Maintainability, test coverage, deployment complexity |
| **Product Owner** | Feature completeness, user satisfaction | Time to market, quality, extensibility |

## 1.4 Business Context

**Problem Domain**: Individual investors need a tool to track dividend income across multiple securities and currencies, analyze performance, and maintain accurate portfolio records.

**Solution**: A self-hosted web application that provides comprehensive dividend and portfolio tracking with automatic data synchronization from external market data providers.

**Differentiation**:
- Self-hosted (data privacy)
- Multi-currency with automatic exchange rate sync
- Comprehensive transaction tracking (buys, sells, dividends)
- German-first interface
- Full data export/import for backup
