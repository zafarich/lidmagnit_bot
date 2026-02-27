import express from "express";
import {
  getUser,
  updatePhone,
  saveStudentName,
  saveStudySchedule,
  startTest,
  skipTest,
  saveGrade,
  updateProfile,
} from "../controllers/userController.js";

const router = express.Router();

// Get current user by telegramId
router.get("/me/:telegramId", getUser);

// Update phone number (for web app phone input)
router.post("/phone", updatePhone);

// Update onboarding step 1: Student name
router.post("/onboarding/name", saveStudentName);

// Update onboarding step 2: Study schedule
router.post("/onboarding/schedule", saveStudySchedule);

// Update onboarding step 3: Test started
router.post("/onboarding/test-start", startTest);

// Skip test step
router.post("/onboarding/test-skip", skipTest);

// Save user's grade after test
router.post("/grade", saveGrade);

// Update user profile
router.put("/profile/:telegramId", updateProfile);

export default router;
