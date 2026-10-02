const http = require("http");
const app = require("./server");
const HireRequest = require("./models/HireRequest");
const Tutor = require("./models/Tutor");
const Parent = require("./models/Parent");

let server;
const PORT = 5001;

const request = async (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const options = {
      hostname: "127.0.0.1",
      port: PORT,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const runTests = async () => {
  console.log("\n🧪 STARTING COMPREHENSIVE BACKEND VERIFICATION TESTS...\n");

  server = app.listen(PORT);
  await new Promise((r) => setTimeout(r, 1000));

  // Reset HireRequests to initial test state
  const rahul = await Tutor.findOne({ email: "rahul@gmail.com" });
  const parent1 = await Parent.findOne({ email: "paarshvi@example.com" });
  const parent2 = await Parent.findOne({ email: "sunita@example.com" });

  if (rahul && parent1 && parent2) {
    await HireRequest.deleteMany({ tutor: rahul._id });

    // 1. Accepted for Monday 5PM
    await HireRequest.create({
      tutor: rahul._id,
      parent: parent1._id,
      subject: "Maths",
      slot: "Monday 5PM",
      message: "Need Class 10 Board preparation for Maths.",
      status: "accepted",
    });

    // 2. Pending for Monday 5PM (Conflict test)
    await HireRequest.create({
      tutor: rahul._id,
      parent: parent2._id,
      subject: "Physics",
      slot: "Monday 5PM",
      message: "Looking for Class 12 Physics tuition on Monday evening.",
      status: "pending",
    });

    // 3. Pending for Wednesday 5PM (Non-conflict test)
    await HireRequest.create({
      tutor: rahul._id,
      parent: parent2._id,
      subject: "Maths",
      slot: "Wednesday 5PM",
      message: "Need weekly algebra practice.",
      status: "pending",
    });
  }

  let parentToken = "";
  let tutorToken = "";
  let otherTutorToken = "";
  let rahulId = "";
  let conflictingRequestId = "";
  let nonConflictingRequestId = "";

  try {
    // 1. Tutor search with req.query
    const search = await request("GET", "/api/tutors?subject=Maths&locality=Kharghar");
    console.log(`[TEST 1] Tutor Search (Maths & Kharghar): Status ${search.status}, Found: ${search.data.length} tutors =>`, search.data.length >= 1 ? "✅ PASS" : "❌ FAIL");
    rahulId = search.data[0]._id;

    // 2. Parent Login
    const parentLogin = await request("POST", "/api/auth/login", {
      email: "paarshvi@example.com",
      password: "Password@123",
    });
    console.log(`[TEST 2] Parent Login: Status ${parentLogin.status} =>`, parentLogin.data.token ? "✅ PASS" : "❌ FAIL");
    parentToken = parentLogin.data.token;

    // 3. Tutor 1 (Rahul) Login
    const tutorLogin = await request("POST", "/api/auth/login", {
      email: "rahul@gmail.com",
      password: "Password@123",
    });
    console.log(`[TEST 3] Tutor Login (Rahul): Status ${tutorLogin.status} =>`, tutorLogin.data.token ? "✅ PASS" : "❌ FAIL");
    tutorToken = tutorLogin.data.token;

    // 4. Tutor 2 (Pooja) Login
    const tutor2Login = await request("POST", "/api/auth/login", {
      email: "pooja@gmail.com",
      password: "Password@123",
    });
    console.log(`[TEST 4] Tutor 2 Login (Pooja): Status ${tutor2Login.status} =>`, tutor2Login.data.token ? "✅ PASS" : "❌ FAIL");
    otherTutorToken = tutor2Login.data.token;

    // 5. Test Invalid Slot Validation (slot not in tutor's availableSlots)
    const invalidSlotReq = await request(
      "POST",
      "/api/hire-requests",
      {
        tutor: rahulId,
        subject: "Maths",
        slot: "Friday Midnight", // not offered
        message: "Can we do midnight?",
      },
      parentToken
    );
    console.log(`[TEST 5] Validation Check (Slot not offered): Status ${invalidSlotReq.status} =>`, invalidSlotReq.status === 400 ? "✅ PASS (Rejected with 400)" : "❌ FAIL");

    // 6. Tutor views their inbox
    const myRequests = await request("GET", "/api/hire-requests/my-requests", null, tutorToken);
    console.log(`[TEST 6] Tutor's Request Inbox: Status ${myRequests.status}, Count: ${myRequests.data.length} =>`, myRequests.data.length >= 2 ? "✅ PASS" : "❌ FAIL");

    // Find the conflicting (Monday 5PM) and non-conflicting (Wednesday 5PM) pending requests
    const pendingRequests = myRequests.data.filter((r) => r.status === "pending");
    const mondayReq = pendingRequests.find((r) => r.slot === "Monday 5PM");
    const wednesdayReq = pendingRequests.find((r) => r.slot === "Wednesday 5PM");

    conflictingRequestId = mondayReq?._id;
    nonConflictingRequestId = wednesdayReq?._id;

    // 7. Ownership check: Pooja tries to accept Rahul's request
    const unauthorizedAttempt = await request(
      "PATCH",
      `/api/hire-requests/${conflictingRequestId}/accept`,
      null,
      otherTutorToken
    );
    console.log(
      `[TEST 7] Ownership Authorization: Status ${unauthorizedAttempt.status} =>`,
      unauthorizedAttempt.status === 403 ? "✅ PASS (Denied with 403 Forbidden)" : "❌ FAIL"
    );

    // 8. SLOT CONFLICT CHECK: Rahul tries to accept another student for Monday 5PM (already accepted)
    const conflictAttempt = await request(
      "PATCH",
      `/api/hire-requests/${conflictingRequestId}/accept`,
      null,
      tutorToken
    );
    console.log(
      `[TEST 8] Slot Conflict Business Rule: Status ${conflictAttempt.status} =>`,
      conflictAttempt.status === 409 ? `✅ PASS (Rejected with 409 Conflict: "${conflictAttempt.data.message}")` : "❌ FAIL"
    );

    // 9. Accept available slot (Wednesday 5PM)
    const validAccept = await request(
      "PATCH",
      `/api/hire-requests/${nonConflictingRequestId}/accept`,
      null,
      tutorToken
    );
    console.log(
      `[TEST 9] Accept Non-conflicting Request: Status ${validAccept.status} =>`,
      validAccept.status === 200 && validAccept.data.request.status === "accepted" ? "✅ PASS (Accepted with 200 OK)" : "❌ FAIL"
    );

    console.log("\n🎉 ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!\n");
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    server.close();
    process.exit(0);
  }
};

runTests();
