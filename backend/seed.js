const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: require("path").join(__dirname, ".env") });

const Tutor = require("./models/Tutor");
const Parent = require("./models/Parent");
const HireRequest = require("./models/HireRequest");

const seedDatabase = async () => {
  try {
    console.log("Connecting to MongoDB for seeding...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Clear existing data
    await HireRequest.deleteMany({});
    await Tutor.deleteMany({});
    await Parent.deleteMany({});
    console.log("Cleared old collections.");

    const defaultPassword = await bcrypt.hash("Password@123", 10);

    // Create Parents
    const parent1 = await Parent.create({
      name: "Paarshvi Vijoy",
      email: "paarshvi@example.com",
      password: defaultPassword
    });

    const parent2 = await Parent.create({
      name: "Sunita Verma",
      email: "sunita@example.com",
      password: defaultPassword
    });

    console.log(`Created 2 Parents: ${parent1.name}, ${parent2.name}`);

    // Create Tutors
    const tutor1 = await Tutor.create({
      name: "Rahul Sharma",
      email: "rahul@gmail.com",
      password: defaultPassword,
      subjects: ["Maths", "Physics"],
      locality: "Kharghar",
      availableSlots: ["Monday 5PM", "Wednesday 5PM", "Saturday 10AM"]
    });

    const tutor2 = await Tutor.create({
      name: "Pooja Patel",
      email: "pooja@gmail.com",
      password: defaultPassword,
      subjects: ["Chemistry", "Biology"],
      locality: "Kharghar",
      availableSlots: ["Tuesday 4PM", "Thursday 4PM", "Sunday 11AM"]
    });

    const tutor3 = await Tutor.create({
      name: "Amit Deshmukh",
      email: "amit@gmail.com",
      password: defaultPassword,
      subjects: ["Maths", "Computer Science"],
      locality: "Nerul",
      availableSlots: ["Monday 5PM", "Friday 6PM"]
    });

    console.log(`Created 3 Tutors: ${tutor1.name}, ${tutor2.name}, ${tutor3.name}`);

    // Create Sample Hire Requests
    // 1. Accepted request: Paarshvi hired Rahul for Monday 5PM
    const req1 = await HireRequest.create({
      tutor: tutor1._id,
      parent: parent1._id,
      subject: "Maths",
      slot: "Monday 5PM",
      message: "Need Class 10 Board preparation for Maths.",
      status: "accepted"
    });

    // 2. Pending request conflicting on the same slot (Monday 5PM) with Rahul!
    const req2 = await HireRequest.create({
      tutor: tutor1._id,
      parent: parent2._id,
      subject: "Physics",
      slot: "Monday 5PM",
      message: "Looking for Class 12 Physics tuition on Monday evening.",
      status: "pending"
    });

    // 3. Pending request on a free slot (Wednesday 5PM) for Rahul
    const req3 = await HireRequest.create({
      tutor: tutor1._id,
      parent: parent2._id,
      subject: "Maths",
      slot: "Wednesday 5PM",
      message: "Need weekly algebra practice.",
      status: "pending"
    });

    console.log("Created 3 initial Hire Requests.");
    console.log("\n================ SEED SUMMARY ================");
    console.log(`Parent: email: paarshvi@example.com | password: Password@123`);
    console.log(`Tutor 1 (Rahul): email: rahul@gmail.com | password: Password@123 | ID: ${tutor1._id}`);
    console.log(`Tutor 2 (Pooja): email: pooja@gmail.com | password: Password@123 | ID: ${tutor2._id}`);
    console.log("----------------------------------------------");
    console.log(`Hire Request 1 (Accepted Monday 5PM): ID: ${req1._id}`);
    console.log(`Hire Request 2 (Pending conflict test): ID: ${req2._id}`);
    console.log(`Hire Request 3 (Pending non-conflict):  ID: ${req3._id}`);
    console.log("==============================================\n");

    await mongoose.disconnect();
    console.log("Database seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedDatabase();
