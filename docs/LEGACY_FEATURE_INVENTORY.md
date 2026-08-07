# Legacy site feature inventory

**Source:** `https://admin.fishmaster.ng` (Administrative backend)  
**Purpose:** Cheat sheet for patterning the Fishmaster monorepo (web + mobile + API).  
**Status:** Inspiration only — do not call legacy APIs from the monorepo.

---

## 1. Auth

| Feature | Details |
|--------|---------|
| Sign in | Email + password |
| Forgot password | Link on login screen |
| Session | JWT-style admin session; logout (“End session and logout”) |
| Roles (observed) | Admin account; staff accounts with selectable permissions |

---

## 2. Global shell / navigation

**Layout:** Left sidebar + main content + breadcrumb (`Home / Section`).

| Nav item | Route (hash) | Notes |
|----------|--------------|--------|
| Users | `#/users` | Primary member management |
| Reports | `#/reports` | Generated report archive |
| Staff | `#/staff` | Admin staff CRUD + permissions |
| Marketplace → Products | `#/marketplace/products` | Cross-farm product catalog |
| Marketplace → Categories | `#/marketplace/categories` | Product categories |
| Configurations | `#/config` | Ingredients + FCR tables |
| Admin profile | sidebar footer | Email + logout |

**UI patterns to copy:** searchable DataTables, page-size (10/25/50/100), Actions menus, create/update modals, teal/active sidebar highlight.

---

## 3. Users (members)

### 3.1 List — All Users

- Search users
- Columns: **Name**, **Email address** (+ phone under email), **Gender**, **Farm**, **Action**
- Pagination
- Per-row Actions (e.g. View)
- Count badge (e.g. All Users(235))

### 3.2 Create user

| Field | Notes |
|-------|--------|
| Name | required |
| Email | required |
| Phone number | required |
| Gender | Male / Female |
| **Setup user's farm** | Farm name, State, LGA, Location |
| Add user's farm | Separate add-farm flow (same geo fields) |

Nigeria **states** dropdown (full 36 + FCT).

### 3.3 User detail header

- Name, Update User
- Email, Phone
- Farm name
- **Wallet balance** (₦)
- Sub-nav tabs: **Ponds | Stocks | Wallet | Market**

### 3.4 Ponds tab (`#/users/:id/ponds`)

**List columns:** Name, Type, Volume, Actions  

**Create pond:**
- Pond name
- Pond number
- Pond type (e.g. Rectangular observed)
- Description / volume

### 3.5 Stocks tab (`#/users/:id/stocks`)

**Stock list columns:** Pond, Quantity, Present quantity, Actions  

**Stock a pond:**
- Pond (select)
- Fingerlings/juvenile quantity
- Weight (g)
- Price (₦)
- Crude protein of feed
- Desired feed quantity (kg)
- Stocking date

**Mortality:**
- Update stock mortality (date + mortality count)
- Daily mortality history

**Feed brands:**
- New feed brand: feeding month (1–6), feed name, feed size (mm), feed cost (₦)
- List of feed brands for cycle

**Generate report:**
- Email
- Report type (see §5)
- Note: **₦50 deducted** from user wallet per download

### 3.6 Wallet tab (`#/users/:id/wallet`)

- Balance display
- **Update wallet:** Type = Topup funds | Deduct funds; Amount
- **Transactions** table: Amount, Type, Date  
  Observed types: `Funds topup`, `Generate Report` (₦50)

### 3.7 Market tab (`#/users/:id/market`)

**New / update product (per farm/user):**
- Name
- Price
- Product quantity
- Product category
- Product image
- Description
- Product sold (update only)

---

## 4. Reports (admin archive)

**List — All Reports**

| Column | Example |
|--------|---------|
| Pond | Ayo, Profundis 20, … |
| Type | Feed chart, Advised feed size per month, … |
| Date | timestamp |
| Action | View Report → opens downloadable HTML |

View URL pattern: `https://fishmaster.ng/download/:token`  
Sample header: farm name, location (State, LGA, city), report title, requested date.

---

## 5. Report types (generate / catalog)

These appear in the Stocks → Generate Report dropdown (legacy naming):

1. Advised feed size per month  
2. Advised stocking per pond  
3. Cumulative bags of feed needed per month  
4. Cumulative feed consumed per Kg and cumulative total weight of fish per pond  
5. Cumulative fish monthly mortality record  
6. Estimated feed quantity (Kg) for fish stock in pond  
7. Estimated feed quantity / Bags (Kg) for fish stock in pond  
8. Expected 15Kg bags needed per month  
9. Expected monthly average weight  
10. Expected monthly feed consumption per Kg  
11. Expected monthly total weight  
12. Feed chart  
13. Feed ingredients composition  
14. Fish quantity  
15. Monthly feed consumed and monthly closing stock  
16. Monthly feed consumed per Kg and monthly average weight per pond  
17. Monthly feed consumed per Kg and monthly mortality records per pond  
18. Monthly feed consumed per Kg and monthly total weight per pond  
19. Monthly mortality and fish quantity record  
20. Monthly mortality record  
21. Monthly opening and closing stock  
22. Monthly quantity and fish percentage mortality  

*(Monorepo catalog uses 21 titled reports — align names when patterning.)*

---

## 6. Staff

**List columns:** Name, Email address, Permissions, Action  

**Create staff:**
- Name
- Email address
- Password
- Phone
- Select permissions

*(Observed empty staff list on live admin; permissions UI present.)*

---

## 7. Marketplace (global)

### 7.1 Products

**List columns:** Product, Farm (+ owner name), Amount (₦), Quantity, Status (Active / Sold), Action  

**New / update product:**
- Farm (select)
- Name, Price, Product quantity
- Product category
- Product image
- Description
- Product sold (update)

### 7.2 Categories

**List:** Category title, description snippet, created date, Actions  

**New / update category:**
- Title
- Category image
- Description

---

## 8. Configurations (`#/config`)

### 8.1 Ingredients (25 observed)

**Columns:** Name, Crude protein, Inclusion ratio, Composition, Food class, Action (Update)

**Food classes:** Protein | Carbohydrate | Others  

**Update ingredient fields:** Name, Crude protein, Inclusion ratio, Composition, Food class  

**Observed ingredients:**
- Protein: 72% Fish meal, Yeast, Poultry meal, Groundnut cake, 65% Fish meal, Soya meal, Fullfat soya, Blood meal 1, Blood meal 2  
- Carbohydrate: Maize, Wheat flour, Cassava flour, Rice bran, Cassava crumbs  
- Others: Vitamin C, Methionine, Lysine, Vitamin premix, Oxytetracycline, Bone meal, Dicalcium phosphate, Probiotic, Poultry oil, Soya oil, Anti toxin  

### 8.2 Update FCR

Months **1–6**, each with:
- Body weight
- FCR

---

## 9. Cross-cutting domain concepts

| Concept | Meaning in legacy |
|---------|-------------------|
| User / member | Farmer account |
| Farm | Named farm + State / LGA / Location |
| Pond | Named pond, type, volume |
| Stock / cycle | Quantity stocked vs present qty; linked to pond + feed/mortality |
| Wallet | Prepaid balance for report generation |
| Report | Computed HTML artifact, archived admin-wide |
| Marketplace | Farm-listed products + categories |
| Config | Global nutrition/FCR engine inputs |

---

## 10. Suggested monorepo patterning map

| Legacy area | Pattern in monorepo | Status (2026-08-07) |
|-------------|---------------------|---------------------|
| Users list + create + farm geo | Members admin + registration fields | ✅ List + detail; create via register |
| User → Ponds / Stocks | Pond + cycle APIs; member + admin UIs | ✅ Member detail tabs |
| Mortality + feed brands | Daily logs + feed brand matrix | ✅ |
| Wallet + ₦/report | Subscription model (or wallet if keeping prepaid) | ✅ Subscriptions (no prepaid wallet) |
| Generate report types | Calc-engine + `REPORT_CATALOG` (21 reports) | ✅ |
| Reports archive | Admin report history (optional) | ⚠️ Catalog only (no HTML archive yet) |
| Staff + permissions | Manager / super_admin roles | ✅ Create manager + role promote |
| Marketplace products/categories | Admin CRUD + public `/marketplace` | ✅ |
| Config ingredients + FCR | GlobalIngredient + FcrMonthConfig | ✅ |
| Broadcasts / member messages | Monorepo posts + per-member messages | ✅ (surpasses legacy sidebar) |

---

## 11. UX checklist (copy / improve)

- [x] Sidebar IA matching §2 (improve duplicate “Staff”, clearer Config label)
- [x] Breadcrumb Home / Section
- [x] “All X (count)” headers
- [x] Search + page size on large tables *(search yes; page-size control TBD)*
- [x] Member detail sub-tabs: Ponds, Stocks, Wallet, Market (or Economics)
- [x] Primary action buttons (Create / Update) in teal accent
- [x] Clear empty states (“No data available”)
- [x] Currency formatting in ₦
- [x] Nigeria State (+ LGA) on farm setup
