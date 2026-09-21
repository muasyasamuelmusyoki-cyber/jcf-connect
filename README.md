# JCF Connect – Joy Christian Fellowship Rongai

**City of Champions**

Church Management System (frontend) for Joy Christian Fellowship – Rongai.

## Folder Structure

```
jcf-connect/
├── assets/
│   ├── css/
│   ├── images/
│   │   └── logo.jpg
│   └── js/
├── components/
├── pages/
│   ├── login.html
│   ├── forgot-password.html
│   ├── dashboard.html
│   ├── members.html
│   ├── member-form.html
│   ├── visitors.html
│   ├── visitor-form.html
│   ├── growth-groups.html
│   ├── attendance.html
│   └── finance.html
├── index.html          ← redirects to login
└── README.md
```

## How to Run

1. Unzip the folder
2. Open in **VS Code**
3. Open `pages/login.html` with Live Server (or open in browser)

Or open `index.html` — it redirects to login.

## Login (demo)

Use the credentials set on the login page (check `login.html`).

## Modules Included

| Page | Description |
|------|-------------|
| Login / Forgot Password | Auth + simulated reset |
| Dashboard | Stats, charts, theme toggle, 5‑min idle logout |
| Members | List + Add/Edit form |
| Visitors | List + Check-in form + validation |
| Growth Groups | Card list + Add/Edit/Delete |
| Attendance | Group counts (Men, Ladies, Youths, Teens, Sunday School) + total |
| Finance | Income/Expense + Edit/Delete |

Data is stored in **browser localStorage** (demo only). Backend can be added later.

---
© Joy Christian Fellowship – Rongai | JCF Connect
