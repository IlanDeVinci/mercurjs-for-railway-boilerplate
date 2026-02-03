> ## Documentation Index
>
> Fetch the complete documentation index at: https://docs.mercurjs.com/llms.txt Use this file to discover all available pages before exploring further.

# Get Started

> Learn how to install and run Mercur using the CLI or manual setup.

<Info>
  There are two ways of installing Mercur: the CLI script or
  manual installation.
</Info>

# **Requirements**

**_[Node.js v20+ (LTS version only)](https://nodejs.org/en/download)_**

**_[Yarn installed](https://yarnpkg.com/getting-started/install)_**

**_[Git CLI tool](https://git-scm.com/downloads)_**

**_[PostgreSQL installed and running](https://www.postgresql.org/download/)_**

# **Install with the Mercur CLI**

The Mercur CLI provides a guided setup and configures all required components automatically.

**Step 1**: Install `mercur-cli` using NPM:

```bash theme={null}
npm i -g mercur-cli
```

**Step 2**: Run CLI installation:

```bash theme={null}
mercur-cli install
```

or

```bash theme={null}
npx mercur-cli install
```

The script will guide you through the installation process. You will have to enter project name and database connection parameters. Also, you'll be asked if you want to install Mercur Storefront and Vendor panel.

**Step 3**: After installation is done, move to the project catalog and start the servers:

```bash theme={null}
cd <yourProjectName>

mercur-cli dev
```

The script automatically configures environment variables, and runs seed. The default credentials for created users are:

**Vendor:**

```
email: seller@mercurjs.com
password: secret
```

**Admin:**

```
email: admin@mercurjs.com
password: admin
```

# **Manual installation**

Manual installation gives you full control over the Medusa and Mercur setup.

**Step 1**: Create empty Medusa application using tool:

```bash theme={null}
npx create-medusa-app@latest my-medusa-store
```

**Step 2**: Install following dependencies:

```
  @mercurjs/framework
  @mercurjs/b2c-core
  @mercurjs/commission
  @mercurjs/reviews
  @mercurjs/requests
  @mercurjs/resend
  @mercurjs/payment-stripe-connect
  meilisearch
```

<Info>
  First two packages: `@mercurjs/framework` and
  `@mercurjs/b2c-core` are required, the rest of them are
  optional. We strongly recommend installing them all to
  avoid problems and missing features.
</Info>

**Step 3**: Configure plugins in `medusa-config.ts`

```
import { defineConfig, loadEnv } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      // @ts-expect-error: vendorCors is not a valid config
      vendorCors: process.env.VENDOR_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret'
    }
  },
  plugins: [
    {
      resolve: '@mercurjs/framework',
      options: {}
    },
    {
      resolve: '@mercurjs/b2c-core',
      options: {}
    },
    {
      resolve: '@mercurjs/commission',
      options: {}
    },
    {
      resolve: '@mercurjs/reviews',
      options: {}
    },
    {
      resolve: '@mercurjs/requests',
      options: {}
    },
    {
      resolve: '@mercurjs/resend',
      options: {}
    }
  ],
  modules: [
    {
      resolve: '@medusajs/medusa/payment',
      options: {
        providers: [
          {
            resolve:
              '@mercurjs/payment-stripe-connect/providers/stripe-connect',
            id: 'stripe-connect',
            options: {
              apiKey: process.env.STRIPE_SECRET_API_KEY
            }
          }
        ]
      }
    },
    {
      resolve: '@medusajs/medusa/notification',
      options: {
        providers: [
          {
            resolve: '@mercurjs/resend/providers/resend',
            id: 'resend',
            options: {
              channels: ['email'],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL
            }
          },
          {
            resolve: '@medusajs/medusa/notification-local',
            id: 'local',
            options: {
              channels: ['feed', 'seller_feed']
            }
          }
        ]
      }
    }
  ]
})
```

**Step 4**: Configure database credentials in the `.env` file

```
# Replace user, password, address and port parameters with your values
DATABASE_URL=postgres://[user]:[password]@[address]:[port]/$DB_NAME
# For example:
DATABASE_URL=postgres://postgres:postgres@localhost:5432/$DB_NAME
```

<Warning>
  Do not delete `$DB_NAME` from the connection string.
  You'll be prompted to choose database name during the next
  step.
</Warning>

**Step 5**: Configure rest of your environment variables

```
STRIPE_SECRET_API_KEY=
STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

MEILI_HOST=
MEILI_MASTER_KEY=
MEILI_API_KEY=
MEILI_INDEX_PRODUCTS=

VITE_TALK_JS_APP_ID=
VITE_TALK_JS_SECRET_API_KEY=

STORE_CORS=
ADMIN_CORS=
VENDOR_CORS=

VENDOR_PANEL_URL=
STOREFRONT_URL=
BACKEND_URL=
```

**Step 6**: Setup database and run migrations

```bash theme={null}
yarn medusa db:create && yarn medusa db:migrate
```

**Step 7**: Create admin user

```bash theme={null}
npx medusa user --email <email> --password <password>
```

**Step 8**: Run application

```bash theme={null}
yarn dev
```

# **You're ready to build**

You now have a working Mercur marketplace environment.

> ## Documentation Index
>
> Fetch the complete documentation index at: https://docs.mercurjs.com/llms.txt Use this file to discover all available pages before exploring further.

# Backend Architecture

> Understand how Mercur extends Medusa using a modular plugin architecture and a powerful customization layer.

# Backend Architecture

Mercur’s backend is built directly on top of the **Medusa Framework**.\
Instead of replacing Medusa or hiding its internals, Mercur uses Medusa’s native plugin mechanism to introduce all marketplace logic-keeping the entire system transparent, modular, and fully extensible.

This allows developers to build custom marketplace functionality the same way they would build a custom Medusa project, while also having access to Mercur’s marketplace services, workflows, and APIs.

<Info>
  Check Mercur main repository: <a href="https://github.com/mercurjs/mercur">
  Github</a>
</Info>

---

# Architecture Overview

Mercur extends Medusa through a set of modular Medusa plugins.\
Together, Medusa + Mercur form a single backend application with a unified API surface.

<img src="https://mintcdn.com/mercur/qM9q0U3nHYB8oZhx/images/mercur-backend-architecture.png?fit=max&auto=format&n=qM9q0U3nHYB8oZhx&q=85&s=c69e5dac133cd0986d58663ce00811e6" alt="mercur-backend-architecture.png" data-og-width="1664" width="1664" data-og-height="1200" height="1200" data-path="images/mercur-backend-architecture.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/mercur/qM9q0U3nHYB8oZhx/images/mercur-backend-architecture.png?w=280&fit=max&auto=format&n=qM9q0U3nHYB8oZhx&q=85&s=940fde3e92d41b50b38742d6a351ec61 280w, https://mintcdn.com/mercur/qM9q0U3nHYB8oZhx/images/mercur-backend-architecture.png?w=560&fit=max&auto=format&n=qM9q0U3nHYB8oZhx&q=85&s=5904b0d1c4cd1e3d2a3209bdd454db9d 560w, https://mintcdn.com/mercur/qM9q0U3nHYB8oZhx/images/mercur-backend-architecture.png?w=840&fit=max&auto=format&n=qM9q0U3nHYB8oZhx&q=85&s=9d0e9b446b653b3bc43ec1dfe110a924 840w, https://mintcdn.com/mercur/qM9q0U3nHYB8oZhx/images/mercur-backend-architecture.png?w=1100&fit=max&auto=format&n=qM9q0U3nHYB8oZhx&q=85&s=d222fa770693c86b31733cb83b51c7fd 1100w, https://mintcdn.com/mercur/qM9q0U3nHYB8oZhx/images/mercur-backend-architecture.png?w=1650&fit=max&auto=format&n=qM9q0U3nHYB8oZhx&q=85&s=537c762d123dc6cd12663eda19748710 1650w, https://mintcdn.com/mercur/qM9q0U3nHYB8oZhx/images/mercur-backend-architecture.png?w=2500&fit=max&auto=format&n=qM9q0U3nHYB8oZhx&q=85&s=323bcefee038fada0a6bcb4bdc7c8ff2 2500w" />

The structure consists of three layers:

### **1. Medusa Core (commerce engine)**

Handles core commerce primitives: products, pricing, carts, orders, customers, payments, inventory, fulfillment, etc.

### **2. Mercur (marketplace engine)**

Adds marketplace domain logic: sellers, commissions, moderation, requests, reviews, payouts, multi-vendor flows, and vendor-facing APIs.

### **3. Customization Layer (your code)**

Your project’s own routes, modules, workflows, links, subscribers, and custom rules - built exactly the same way you customize a standard Medusa project.

You can extend **both Medusa and Mercur** through this customization layer.\
This gives you access to all Medusa APIs and all Mercur APIs as one combined system, while keeping your domain-specific logic separated and easy to maintain.

---

# Plugin-Based Marketplace Architecture

Mercur is delivered as a **collection of Medusa plugins**, each implemented as a separate npm package.

This has several advantages:

- Install only the packages your project needs
- Keep upgrades isolated and predictable
- Clean overrides and customizations
- Full compatibility with Medusa’s architecture
- Your custom code stays separate from Mercur’s internals

Typical setup includes packages like:

- `@mercurjs/framework`
- `@mercurjs/b2c-core`
- `@mercurjs/commission`
- `@mercurjs/requests`
- `@mercurjs/reviews`
- `meilisearch`
- `@mercurjs/resend`
- `@mercurjs/payment-stripe-connect`

More packages are being added for advanced or niche marketplace cases, such as subscriptions or B2B procurement flows.

---

# Unified Medusa + Mercur API

Because Mercur is implemented as Medusa plugins, the backend exposes **one unified API** containing:

- All Medusa Admin API endpoints
- All Medusa Store API endpoints
- All Mercur Admin API endpoints
- All Mercur Vendor API endpoints
- All Mercur Store API endpoints

Everything runs inside a single Medusa server instance.

No separate services, no proxying - a single consolidated backend.

---

# Three APIs and Actors

Mercur introduces three API surfaces built on Medusa’s routing system:

### **Admin API**

For platform operators managing the marketplace.

### **Vendor API**

A dedicated API for sellers, giving access only to their own products, orders, reviews, and Marketplace features.

### **Store API**

Customer-facing commerce operations.

Mercur defines three actors:

- **User (Admin)**
- **Seller**
- **Customer**

Medusa’s authentication middleware ensures the correct actor accesses the correct API.

---

# Customizing Mercur

Everything in Mercur is built using **Medusa Framework conventions**, which means you can customize Mercur in the exact same way you customize any Medusa project - modules, workflows, routes, links, subscribers, scheduled jobs, data models, and more.

Learn more about the underlying customization patterns in the\
[**Framework**](../framework) section.

---

# Using the Mercur CLI

The Mercur CLI provides the fastest path to starting a project.\
It automatically:

- scaffolds a full Medusa application
- installs and configures all Mercur packages
- prepares environment variables
- seeds initial data
- and creates a **clean, empty customization layer** for your project code

This means you start with:

- A ready-to-run Medusa + Mercur backend
- Clear separation between Mercur code and your custom code
- A structure designed for maintainability and upgrades
- Full access to Medusa and Mercur APIs out of the box

The CLI essentially gives you the ideal development foundation:\
a fresh customization layer on top of a fully wired marketplace engine.

---

# Why This Architecture Matters

This design gives you:

- **All of Medusa’s flexibility**
- **All of Mercur’s marketplace capabilities**
- Safe and predictable upgrades
- Separation of your custom logic from vendor code
- Long-term maintainability
- No vendor lock-in (MIT-licensed, plugin-based, transparent)
- A single, unified backend instead of a distributed patchwork

It is the best combination for projects that require both marketplace complexity and full control over the backend architecture.

---

> ## Documentation Index
>
> Fetch the complete documentation index at: https://docs.mercurjs.com/llms.txt Use this file to discover all available pages before exploring further.

# Admin Panel

## Admin Panel Overview

The admin panel is built on top of Medusa's admin framework, providing a powerful and extensible interface for managing your marketplace.

## Custom Features

### Commission System

Our platform includes a sophisticated commission management system that allows for flexible commission structures:

#### Marketplace commission settings

- **Multiple Rule Types**:
  - Seller-specific rules
  - Product category-based rules
  - Product type-based rules
  - Site-wide default rules
- **Calculation Methods**:
  - Percentage-based commissions
  - Flat-rate commissions
  - Tax-inclusive/exclusive options
  - Minimum and maximum commission limits

<Info>
  You can find more information here:
  <a href="/core-concepts/commission">Commission</a>
</Info>

### Marketplace Configuration

The marketplace configuration section allows administrators to manage global marketplace settings and rules:

#### Configuration Rules

- **Product Request System**: Toggle the product request submission system
- **Product Approval Requirements**: Enable/disable mandatory product approval
- **Product Import**: Control product import functionality

<Info>
  You can find more information here:
  <a href="/core-concepts/marketplace-settings">Marketplace Settings</a>
</Info>

### Requests Panel

The requests panel is a communication interface between sellers and marketplace administrator. They can request certain actions to be performed:

- **New Seller Applications**: Review a new seller account.
- **New Product Submissions**: Review a new product listings.
- **Product Collection Request**: Review a new product collection.
- **Product Category Request**: Review a new product category.
- **Review Remove Request**: Review a submission to remove unfair review.
- **Product Type Request**: Review a new product type.
- **Product Tag Request**: Review a new product tag.

Requests are submitted by sellers to the marketplace administrator for review. Once the administrator makes a decision, the action is automatically executed by the Mercur backend.

<Info>
  You can find more information on requests here:
  <a href="/core-concepts/requests">Requests</a>
</Info>

### Sellers Panel

The sellers panel provides tools for managing marketplace vendors:

- **Seller Profiles**: View and manage seller information
- **Store Suspension**: Activate or suspend seller accounts
- **Product Management**: Oversee seller product listings
- **Order Management**: List seller orders
- **Customer groups Management**: List seller customer groups

> ## Documentation Index
>
> Fetch the complete documentation index at: https://docs.mercurjs.com/llms.txt Use this file to discover all available pages before exploring further.

# Vendor Panel

## Overview

The Vendor Panel is a powerful platform that enables vendors to manage their online store, products, orders, and customer interactions. This guide provides an overview of the main features available in the panel.

<Info>
  Check our implementation of Vendor Panel:
  <a href="https://github.com/mercurjs/vendor-panel">Github</a>
</Info>

## Core Features

### Dashboard

- Overview of store performance and key metrics
- Quick access to important information and actions

### Company Profile

- Manage company details
- Update business information

### Orders Management

- View and manage customer orders
- Track order status and fulfillment
- Process and update order information
- Handle customer inquiries related to orders

### Product Management

- Create and manage product listings
- Organize products into collections and categories
- Update product details, pricing, and inventory
- Manage product images and descriptions

### Inventory Control

- Track stock levels across products and locations
- Manage inventory reservations

### Customer Management

- View customer information and order history
- Manage customer groups
- Monitor and respond to customer reviews

### Promotions and Marketing

- Create and manage promotional campaigns
- Set up special offers and discounts
- Manage price lists for different customer segments

### TalkJS based Messaging System

- Communicate with customers
- Handle customer inquiries
- Track conversation history

## Getting Started

To begin using the Vendor Panel:

1. Log in to your vendor account
2. Complete your store profile setup
3. Configure your store settings
4. Start adding products and managing your store

> ## Documentation Index
>
> Fetch the complete documentation index at: https://docs.mercurjs.com/llms.txt Use this file to discover all available pages before exploring further.

# B2C Marketplace Storefront

# B2C Marketplace Storefront Features

Our B2C Marketplace Storefront implementation is a powerful, customizable storefront designed for B2C marketplaces, built to work perfectly with other MercurJS components.

<Info>
  Check our implementation of Storefront:
  <a href="https://github.com/mercurjs/b2c-marketplace-storefront">Github</a>
</Info>

## Core Features

### Home Page

- Trending listings section powered by Meilisearch
- Shop by category navigation
- Banner section for promotions
- Shop by style section
- Blog section for content marketing

### Product Management

- Advanced product listing with Meilisearch-powered search
- Product variants support (size, color, etc.)
- Product details page with:
  - High-quality image gallery
  - Product measurements
  - Shipping information
  - Seller information
  - Product reviews
  - Related products

### Shopping Experience

- Wishlist functionality
- Advanced filtering options:
  - Price range
  - Size
  - Color
  - Condition
  - Seller rating
- Sorting capabilities:
  - Price (ascending/descending)
  - Newest first
  - Popularity

### User Features

- User authentication (login/register)
- User profile management
- Order history
- Address management
- Review system
- Wishlist management

### Seller Features

- Dedicated seller pages
- Seller ratings and reviews
- Seller information display

## Technical Integration with Mercur

The storefront is built as part of the Mercur ecosystem, which provides:

1. **Backend Integration**
   - Seamless integration with Mercur's backend services
   - MedusaJS as the foundation for e-commerce functionality
   - RESTful API endpoints for all marketplace operations

2. **Search and Discovery**

- Meilisearch integration for powerful search capabilities
- Faceted search for precise product filtering
- Real-time search results

3. **Payment Processing**
   - Stripe integration for secure payments
   - Support for multiple payment methods
   - Secure transaction handling
