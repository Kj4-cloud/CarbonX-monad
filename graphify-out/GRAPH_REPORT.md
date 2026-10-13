# Graph Report - CarbonX  (2026-10-06)

## Corpus Check
- 81 files · ~109,230 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 13, .example 1, (none) 1)

## Summary
- 294 nodes · 668 edges · 24 communities (14 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Auth and App Shell
- Build Config and Deps
- Blockchain Proof Layer
- Buyer Layout and State
- Wallet and Checkout
- App Entry and Providers
- Satellite NDVI Mapping
- Dependency Manifest
- Credit Minting Contracts
- Marketplace Browsing
- Seller Audit Report
- Docs and HTML Entry
- Logo Brand Identity
- Localization Strings
- Marketplace Concepts
- Project Data Catalog
- Wallet Documentation
- Submission Verification Docs
- Vercel Routing
- Farmer Dashboard Concept
- Integrated Wallet Concept

## God Nodes (most connected - your core abstractions)
1. `react` - 47 edges
2. `useAuth()` - 43 edges
3. `useTranslation` - 35 edges
4. `react-router-dom` - 16 edges
5. `supabase` - 16 edges
6. `useTheme()` - 9 edges
7. `CheckoutPage()` - 8 edges
8. `useBlockchain()` - 7 edges
9. `LanguageSwitcher()` - 7 edges
10. `useWallet()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `PhotoVerification()` --calls--> `useAuth()`  [EXTRACTED]
  src/Seller/PhotoVerification/PhotoVerification.jsx → src/context/AuthContext.jsx
- `Manrope typography` --conceptually_related_to--> `Premium eco-friendly design philosophy`  [EXTRACTED]
  index.html → README.md
- `CheckoutPage()` --calls--> `mintCredits()`  [EXTRACTED]
  src/Buyer/CheckoutPage.jsx → src/blockchain/mint.js
- `CheckoutPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/Buyer/CheckoutPage.jsx → src/context/AuthContext.jsx
- `Filters()` --calls--> `useTranslation`  [EXTRACTED]
  src/Buyer/Filters.jsx → src/context/LanguageContext.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Seller farmer flow** — readme_farmer_dashboard, readme_project_submission, readme_wallet_minting [EXTRACTED 1.00]
- **Buyer purchase flow** — readme_marketplace, readme_integrated_wallet, readme_carbon_offset_certificates, readme_blockchain_verification [EXTRACTED 1.00]
- **App Logo Visual Composition** — public_applogo_leaf_sprout_motif, public_applogo_upward_growth_arrow, public_applogo_circuit_iot_motif, public_applogo_circular_badge_layout [EXTRACTED 1.00]

## Communities (24 total, 10 thin omitted)

### Community 0 - "Auth and App Shell"
Cohesion: 0.11
Nodes (32): react, react-router-dom, AuthCallback(), FarmerRegistration(), ForgotPassword(), ResetPassword(), SelectAccountType(), StandardUserRegistration() (+24 more)

### Community 1 - "Build Config and Deps"
Cohesion: 0.06
Nodes (34): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/react, @types/react-dom (+26 more)

### Community 2 - "Blockchain Proof Layer"
Cohesion: 0.13
Nodes (20): jspdf, AMOY_NETWORK, BLOCK_EXPLORER, CARBON_CREDIT_ADDRESS, CREDIT_TYPES, POLYGON_AMOY_CHAIN_ID, RPC_URL, src_blockchain_contracts_carboncrediterc1155 (+12 more)

### Community 3 - "Buyer Layout and State"
Cohesion: 0.12
Nodes (14): AuditReport(), CONFETTI_COLORS, I, txData, Header(), PortfolioPage(), ConnectWallet(), readStorage() (+6 more)

### Community 4 - "Wallet and Checkout"
Cohesion: 0.18
Nodes (13): connectMetaMask(), copyToClipboard(), formatAddress(), generateWalletAddress(), isMetaMaskAvailable(), CheckoutPage(), PROCESSING_STEPS, InvoicePage() (+5 more)

### Community 5 - "App Entry and Providers"
Cohesion: 0.12
Nodes (18): ref_react_dom_client, App(), buildSmoothPath(), CarbonCreditChart(), PAD, AuthProvider(), CarbonPriceContext, CarbonPriceProvider() (+10 more)

### Community 6 - "Satellite NDVI Mapping"
Cohesion: 0.23
Nodes (10): @geoman-io/leaflet-geoman-free, ref_geoman_io_leaflet_geoman_free_dist_leaflet_geoman_css, leaflet, ref_leaflet_dist_leaflet_css, react-leaflet, VegetationMap(), estimateCarbonFromNDVI(), fetchNDVIImage() (+2 more)

### Community 7 - "Dependency Manifest"
Cohesion: 0.15
Nodes (13): dependencies, ethers, @geoman-io/leaflet-geoman-free, jspdf, jspdf-autotable, leaflet, react, react-dom (+5 more)

### Community 8 - "Credit Minting Contracts"
Cohesion: 0.23
Nodes (7): ref_abi_carboncreditabi_json, ethers, src_abi_carboncreditsabi, getCreditBalance(), getContract(), mintCredits(), MintCarbonCredits()

### Community 9 - "Marketplace Browsing"
Cohesion: 0.36
Nodes (5): Filters(), MarketplacePage(), DEFAULT_IMAGES, getDefaultImage(), ProjectCard()

### Community 11 - "Docs and HTML Entry"
Cohesion: 0.29
Nodes (7): HTML entry point, Manrope typography, React root mount, CarbonX Loop, Premium eco-friendly design philosophy, React Vite frontend, Supabase authentication and database

### Community 12 - "Logo Brand Identity"
Cohesion: 0.33
Nodes (6): CarbonX App Logo, Circuit IoT Connectivity Motif, Circular Badge Layout with Blue Green Palette, Leaf Sprout Motif, Sustainability Meets Technology Brand Identity, Upward Growth Arrow

### Community 13 - "Localization Strings"
Cohesion: 0.47
Nodes (3): en, hi, translations

### Community 14 - "Marketplace Concepts"
Cohesion: 0.67
Nodes (3): Blockchain Verification, Carbon Offset Certificates, Marketplace

## Knowledge Gaps
- **76 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+71 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 112 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Auth and App Shell` to `Build Config and Deps`, `Blockchain Proof Layer`, `Buyer Layout and State`, `Wallet and Checkout`, `App Entry and Providers`, `Satellite NDVI Mapping`, `Marketplace Browsing`, `Seller Audit Report`?**
  _High betweenness centrality (0.415) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Dependency Manifest` to `Build Config and Deps`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _76 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth and App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.10564971751412429 - nodes in this community are weakly interconnected._
- **Should `Build Config and Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.06156156156156156 - nodes in this community are weakly interconnected._
- **Should `Blockchain Proof Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.13368983957219252 - nodes in this community are weakly interconnected._
- **Should `Buyer Layout and State` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._