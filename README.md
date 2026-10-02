# Home Tutor Marketplace

![Home Tutor Marketplace demo](homeTutor.gif)

**Problem Statement 171** · B.Tech Computer Science Engineering · Backend Development – Node.js, Express.js & MongoDB · ITM Skills University

## Problem statement

A tutoring marketplace wants parents to search for home tutors by subject and locality and send a hire request. A tutor should only be able to view hire requests sent to them, and only accept one active student per time slot.

## Objectives

- Design Tutor, Parent and HireRequest schemas using Mongoose.
- Implement search and filtering by subject and locality.
- Implement ownership-based authorization for tutor request access.
- Enforce a single-active-student-per-slot business rule.
- Validate hire request data before saving.

## Outcomes

| Outcome | How this project does it |
| --- | --- |
| Parents can search tutors by subject and locality | `GET /api/tutors?subject=&locality=` (`tutorController.getTutors`) |
| Tutors can view and respond only to their own hire requests | `authMiddleware` + `ownershipMiddleware` on accept / reject |
| A tutor cannot accept two students for the same time slot | Slot-conflict check returns **409 Conflict** (`hireRequestController.acceptHireRequest`) |
| Hire request status is tracked from pending to accepted | `status` enum `pending → accepted / rejected` on `HireRequest` |

## Tech stack

| Layer | Tools |
| --- | --- |
| Backend | Node.js, Express 5, Mongoose 9, MongoDB Atlas |
| Auth | JSON Web Tokens (`jsonwebtoken`), password hashing (`bcryptjs`) |
| File upload | `multer` (tutor resumes: PDF, Word, PNG, JPG · max 5 MB) |
| Frontend | HTML, CSS, vanilla JavaScript (`fetch`), served by Express |
| Testing | `test-api.js` script, Postman / Thunder Client collections |

## Project structure

```text
FINAL_BACKEND/
├── backend/
│   ├── models/          Tutor.js · Parent.js · HireRequest.js
│   ├── middleware/      authMiddleware.js (JWT) · ownershipMiddleware.js · uploadMiddleware.js (multer)
│   ├── controllers/     authController.js · tutorController.js · hireRequestController.js
│   ├── routes/          authRoutes.js · tutorRoutes.js · hireRequestRoutes.js
│   ├── uploads/resumes/ uploaded resume files (created automatically)
│   ├── server.js        Express app, MongoDB connection, routes
│   ├── seed.js          sample parents, tutors and hire requests
│   ├── test-api.js      automated checks of every business rule
│   ├── .env.example     environment variable template
│   └── Home_Tutor_Marketplace.postman_collection.json · thunder-collection_Home_Tutor_Marketplace.json
├── frontend/            index.html · styles.css · app.js
├── package.json         shortcut scripts (run from the project root)
└── README.md
```

## Schemas

| Model | Fields |
| --- | --- |
| **Tutor** | name, email (unique), password (hashed), `subjects[]`, locality, `availableSlots[]`, resume (file URL, name, type, size) |
| **Parent** | name, email (unique), password (hashed) |
| **HireRequest** | `tutor` (ref Tutor), `parent` (ref Parent), subject, slot, message, status (`pending` / `accepted` / `rejected`), timestamps |

## API endpoints

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | – | Register a parent (JSON) or tutor (multipart with `resume` file) |
| POST | `/api/auth/login` | – | Log in as parent or tutor, returns a JWT |
| GET | `/api/tutors?subject=&locality=` | – | Search and filter tutors |
| GET | `/api/tutors/:id` | – | Get one tutor |
| POST | `/api/tutors` | – | Create a tutor (testing) |
| POST | `/api/hire-requests` | JWT (parent) | Send a hire request (validated) |
| GET | `/api/hire-requests/my-requests` | JWT | Parent: sent requests · Tutor: received requests |
| PATCH | `/api/hire-requests/:id/accept` | JWT + ownership | Accept (409 if the slot is already taken) |
| PATCH | `/api/hire-requests/:id/reject` | JWT + ownership | Reject |

Send the token as `Authorization: Bearer <token>`.

## Business rules

- **Validation:** tutor, subject and slot are required, and the slot must be one of that tutor's `availableSlots` (400 otherwise).
- **Ownership:** only the tutor named on a request can accept or reject it (403 otherwise).
- **One student per slot:** if the tutor already has an accepted request for that slot, accepting another returns **409 Conflict**.
- **Roles in the UI:** parents see Find Tutors and My Requests; tutors see only their Requests. Tutors upload a resume at sign-up, and parents can open it from each tutor card.

## Setup and run

1. Install dependencies:
   ```bash
   npm run install-backend
   ```
2. Create `backend/.env` from `backend/.env.example`:
   ```env
   PORT=3000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/homeTutorDB?retryWrites=true&w=majority
   JWT_SECRET=your_jwt_secret_key
   ```
3. Seed sample data (this wipes the existing collections):
   ```bash
   npm run seed
   ```
4. Run the tests:
   ```bash
   npm test
   ```
5. Start the server and open `http://localhost:3000`:
   ```bash
   npm run dev
   ```

**Demo accounts** (password `Password@123` for all): parents `paarshvi@example.com`, `sunita@example.com` · tutors `rahul@gmail.com`, `pooja@gmail.com`, `amit@gmail.com`.

## Deliverables checklist

- [x] Express.js REST API for tutors and hire requests
- [x] MongoDB / Mongoose database with referenced collections
- [x] Ownership-based authorization middleware
- [x] Postman / Thunder Client collection
- [x] Environment configuration for MongoDB Atlas

## Deployment note

Deploy the backend on Render or Railway with MongoDB Atlas, setting `PORT`, `MONGO_URI` and `JWT_SECRET` as environment variables. The brief suggests deploying a React frontend on Vercel or Netlify and connecting it to the live backend through an environment-based API base URL. This project's frontend is plain HTML/JS served by Express, so it deploys together with the backend. To host it separately, change `API_BASE` at the top of `frontend/app.js` to the live backend URL.
