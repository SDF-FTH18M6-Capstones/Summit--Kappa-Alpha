# Summit — Chama Management Application

Summit is a full-stack application for managing a chama (community savings group). The frontend serves public information and role-based member dashboards; the backend provides authentication, membership, finance, and group-operations APIs.

The trees below describe the **target project structure**. They document the intended application and are not a claim that every listed feature or file is already implemented in this repository.

## Repository structure

```text
Summit--Kappa-Alpha/
├── chama-backend/
└── chama-frontend/
```

## Backend — `chama-backend/`

The Flask backend is responsible for the REST API, data persistence, authentication and authorization, finance workflows, and group operations.

```text
chama-backend/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Lint and run pytest on pull requests
├── app/
│   ├── __init__.py                # App factory and Flask extension setup
│   ├── models.py                  # SQLAlchemy models
│   ├── schemas.py                 # Marshmallow validation and serialization
│   ├── decorators.py              # Role-based access control decorators
│   ├── utils.py                   # Email, image, and audit-log helpers
│   └── routes/
│       ├── __init__.py
│       ├── auth.py                # Registration, email verification, and JWT sessions
│       ├── chamas.py              # Chama details, membership, and roles
│       ├── finance.py             # Contributions, loans, penalties, and statistics
│       └── operations.py          # Meetings, minutes, announcements, and audit logs
├── docs/
│   └── erd.png                    # Entity-relationship diagram
├── migrations/                    # Flask-Migrate database migration history
├── tests/
│   ├── conftest.py                # Shared pytest fixtures
│   ├── test_auth.py               # Authentication and authorization tests
│   └── test_finance.py            # Finance and audit-log tests
├── .env.example                   # Backend environment variable template
├── .gitignore
├── pytest.ini                     # Pytest and coverage configuration
├── requirements.txt               # Pinned Python dependencies
├── seed.py                        # Local development seed data
├── run.py                         # Backend entry point and health endpoint
└── README.md                      # Backend setup and API documentation
```

The intended data model includes `Chama`, `User`, `JoinRequest`, `Contribution`, `Loan`, `Penalty`, `Meeting`, `Announcement`, `Project`, and `AuditLog`. The API is organized around authentication, chama membership, finance, and group operations. Planned finance safeguards include rejecting duplicate M-Pesa references; access to private operations is role-controlled.

### Database diagram

The entity-relationship diagram is available interactively on dbdiagram.io: [Summit ERD](https://dbdiagram.io/d/Summit-erd-6af2efc76fcc7ae4c7aa3640). A static copy is kept in `chama-backend/docs/erd.png`.

## Frontend — `chama-frontend/`

The React frontend provides public chama pages, registration and sign-in flows, and dashboards tailored to each authenticated user's role.

```text
chama-frontend/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Lint, build, and test the React app
├── public/
│   ├── icons/                     # PWA icons (192x192 and 512x512)
│   └── manifest.json              # PWA web app manifest
├── src/
│   ├── api/
│   │   └── axiosClient.js         # Axios client with JWT and token-refresh interceptors
│   ├── context/
│   │   └── AuthContext.jsx        # User, role, authentication, and token state
│   ├── components/
│   │   ├── PublicLayout.jsx       # Public navigation and footer
│   │   ├── DashboardLayout.jsx    # Role-aware dashboard sidebar and top bar
│   │   ├── ProtectedRoute.jsx     # Protects private routes and redirects to /login
│   │   ├── BaseComponents.jsx     # Shared statistic cards, pagination, loading, and date formatting
│   │   ├── FinanceModals.jsx      # Contribution, loan request, and penalty forms
│   │   └── ErrorBoundary.jsx      # Graceful handling of UI runtime errors
│   ├── pages/
│   │   ├── public/
│   │   │   ├── Home.jsx           # Landing page and chama overview
│   │   │   ├── About.jsx          # Chama history and constitution summary
│   │   │   ├── Officials.jsx      # Leadership profiles
│   │   │   ├── Projects.jsx       # Investment projects and photos
│   │   │   └── Join.jsx           # Membership guide and join request form
│   │   ├── auth/
│   │   │   ├── Login.jsx          # Member and official sign-in
│   │   │   ├── Register.jsx       # Account registration
│   │   │   ├── VerifyEmail.jsx    # Email token verification
│   │   │   └── NotFound.jsx       # Custom 404 page
│   │   └── dashboard/
│   │       ├── DashboardRouter.jsx    # Routes to a dashboard based on user role
│   │       ├── AdminDashboard.jsx     # Join requests, role assignment, and audit logs
│   │       ├── TreasurerDashboard.jsx # Contributions, loans, penalties, and defaulters
│   │       ├── SecretaryDashboard.jsx # Meetings, minutes, and announcements
│   │       └── MemberDashboard.jsx    # Balances, contributions, loans, and updates
│   ├── tests/
│   │   └── JoinForm.test.jsx      # Tests for key forms and dashboards
│   ├── App.jsx                    # React Router configuration
│   ├── main.jsx                   # App entry point and PWA service worker registration
│   └── index.css                  # Tailwind CSS imports
├── .env.example                   # Frontend environment variable template
├── .gitignore
├── index.html                     # HTML entry point and PWA metadata
├── package.json                   # Frontend dependencies and scripts
├── tailwind.config.js             # Tailwind theme configuration
├── vite.config.js                 # Vite and PWA plugin configuration
└── README.md                      # Frontend setup and deployment guide
```

### User roles

- **Administrator:** Approves join requests, assigns official roles, and reviews audit logs.
- **Treasurer:** Records M-Pesa contributions, reviews loans, applies penalties, and monitors defaulters.
- **Secretary:** Schedules meetings, uploads minutes, and posts announcements.
- **Member:** Views personal balances and contribution history, requests loans, and checks meeting updates.

## Local development

The backend and frontend are separate applications with their own dependencies and configuration.

### Backend

Use the Python version and installation instructions documented in `chama-backend/README.md`. Configure local environment variables using `chama-backend/.env.example`, then follow that README to initialize the database, optionally seed development data, and start the API.

### Frontend

Configure `VITE_API_URL` in a local `.env` file using `chama-frontend/.env.example`, then install dependencies and start the Vite development server:

```bash
cd chama-frontend
npm install
npm run dev
```
