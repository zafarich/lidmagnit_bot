import User from "../models/User.js";
import logger from "../utils/logger.js";

// Get current user by telegramId
export const getUser = async (req, res) => {
  try {
    const {telegramId} = req.params;

    console.log("[getUser] Fetching user:", telegramId);

    const user = await User.findOne({telegramId});

    if (!user) {
      console.log("[getUser] User not found:", telegramId);
      return res.status(404).json({error: "User not found"});
    }

    console.log("[getUser] Found user, onboarding:", user.onboarding);

    res.json({
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      onboarding: user.onboarding,
      grade: user.grade,
    });
  } catch (error) {
    logger.error("Error getting user:", error);
    res.status(500).json({error: "Internal server error"});
  }
};

// Update phone number (for web app phone input)
export const updatePhone = async (req, res) => {
  try {
    const {telegramId, phoneNumber} = req.body;

    if (!telegramId || !phoneNumber) {
      return res
        .status(400)
        .json({error: "telegramId and phoneNumber are required"});
    }

    const user = await User.findOneAndUpdate(
      {telegramId},
      {
        phoneNumber,
        "onboarding.currentStep": "name",
      },
      {new: true},
    );

    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    res.json({
      success: true,
      message: "Phone number updated",
      onboarding: user.onboarding,
    });
  } catch (error) {
    logger.error("Error updating phone:", error);
    res.status(500).json({error: "Internal server error"});
  }
};

// Update onboarding step 1: Student name
export const saveStudentName = async (req, res) => {
  try {
    const {telegramId, studentName} = req.body;

    if (!telegramId || !studentName) {
      return res
        .status(400)
        .json({error: "telegramId and studentName are required"});
    }

    if (studentName.length < 2) {
      return res
        .status(400)
        .json({error: "Name must be at least 2 characters"});
    }

    const user = await User.findOneAndUpdate(
      {telegramId},
      {
        "onboarding.studentName": studentName,
        "onboarding.currentStep": "schedule",
      },
      {new: true},
    );

    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    // Return full user data (same format as getUser)
    res.json({
      success: true,
      message: "Name saved",
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      onboarding: user.onboarding,
      grade: user.grade,
    });
  } catch (error) {
    logger.error("Error saving name:", error);
    res.status(500).json({error: "Internal server error"});
  }
};

// Update onboarding step 2: Study schedule
export const saveStudySchedule = async (req, res) => {
  try {
    const {telegramId, period, hour} = req.body;

    if (!telegramId || !period || hour === undefined) {
      return res
        .status(400)
        .json({error: "telegramId, period, and hour are required"});
    }

    const validPeriods = ["morning", "afternoon", "evening"];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({error: "Invalid period"});
    }

    if (hour < 0 || hour > 23) {
      return res.status(400).json({error: "Hour must be between 0 and 23"});
    }

    const user = await User.findOneAndUpdate(
      {telegramId},
      {
        "onboarding.studySchedule": {period, hour},
        "onboarding.currentStep": "test-info",
      },
      {new: true},
    );

    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    // Return full user data (same format as getUser)
    res.json({
      success: true,
      message: "Schedule saved",
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      onboarding: user.onboarding,
      grade: user.grade,
    });
  } catch (error) {
    logger.error("Error saving schedule:", error);
    res.status(500).json({error: "Internal server error"});
  }
};

// Update onboarding step 3: Test started
export const startTest = async (req, res) => {
  try {
    const {telegramId} = req.body;

    if (!telegramId) {
      return res.status(400).json({error: "telegramId is required"});
    }

    const user = await User.findOneAndUpdate(
      {telegramId},
      {
        "onboarding.testStarted": true,
        "onboarding.currentStep": "test",
      },
      {new: true},
    );

    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    res.json({
      success: true,
      message: "Test started",
      onboarding: user.onboarding,
    });
  } catch (error) {
    logger.error("Error starting test:", error);
    res.status(500).json({error: "Internal server error"});
  }
};

// Skip test step (finish onboarding without grading yet)
export const skipTest = async (req, res) => {
  try {
    const {telegramId} = req.body;

    if (!telegramId) {
      return res.status(400).json({error: "telegramId is required"});
    }

    console.log("[skipTest] Updating user:", telegramId);

    const user = await User.findOneAndUpdate(
      {telegramId},
      {
        "onboarding.currentStep": "completed",
        "onboarding.isCompleted": true,
      },
      {new: true},
    );

    if (!user) {
      console.log("[skipTest] User not found:", telegramId);
      return res.status(404).json({error: "User not found"});
    }

    console.log("[skipTest] Updated onboarding:", user.onboarding);

    // Return full user data (same format as getUser)
    res.json({
      success: true,
      message: "Test skipped, onboarding completed",
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      onboarding: user.onboarding,
      grade: user.grade,
    });
  } catch (error) {
    logger.error("Error skipping test:", error);
    res.status(500).json({error: "Internal server error"});
  }
};

// Save user's grade after completing test
export const saveGrade = async (req, res) => {
  try {
    const {telegramId, grade, percentage} = req.body;

    console.log("Saving grade:", {telegramId, grade, percentage});

    if (!telegramId || !grade) {
      return res.status(400).json({error: "telegramId and grade are required"});
    }

    const validGrades = ["A+", "A", "B+", "B", "C+", "C"];
    if (!validGrades.includes(grade)) {
      return res.status(400).json({error: "Invalid grade"});
    }

    const user = await User.findOneAndUpdate(
      {telegramId},
      {
        grade: {
          level: grade,
          percentage: percentage || 0,
          achievedAt: new Date(),
        },
        "onboarding.currentStep": "completed",
        "onboarding.isCompleted": true,
      },
      {new: true},
    );

    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    logger.info(`Grade saved for user ${telegramId}: ${grade}`);

    res.json({
      success: true,
      message: "Grade saved successfully",
      grade: user.grade,
    });
  } catch (error) {
    logger.error("Error saving grade:", error);
    console.error("Save grade error:", error);
    res.status(500).json({error: "Internal server error"});
  }
};

// Update user profile (name, study schedule)
export const updateProfile = async (req, res) => {
  try {
    const {telegramId} = req.params;
    const {firstName, studySchedule, grade} = req.body;

    if (!telegramId) {
      return res.status(400).json({error: "telegramId is required"});
    }

    if (firstName && firstName.length < 2) {
      return res
        .status(400)
        .json({error: "Name must be at least 2 characters"});
    }

    if (studySchedule) {
      const validPeriods = ["morning", "afternoon", "evening"];
      if (!validPeriods.includes(studySchedule.period)) {
        return res.status(400).json({error: "Invalid period"});
      }
      if (studySchedule.hour < 0 || studySchedule.hour > 23) {
        return res.status(400).json({error: "Hour must be between 0 and 23"});
      }
    }

    if (grade) {
      const validGrades = ["A+", "A", "B+", "B", "C+", "C"];
      if (!validGrades.includes(grade)) {
        return res.status(400).json({error: "Invalid grade"});
      }
    }

    const updateFields = {};
    if (firstName) {
      updateFields.firstName = firstName;
      updateFields["onboarding.studentName"] = firstName;
    }
    if (studySchedule) {
      updateFields["onboarding.studySchedule"] = studySchedule;
    }
    if (grade) {
      updateFields["grade.level"] = grade;
    }

    const user = await User.findOneAndUpdate({telegramId}, updateFields, {
      new: true,
    });

    if (!user) {
      return res.status(404).json({error: "User not found"});
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        firstName: user.firstName,
        onboarding: user.onboarding,
        grade: user.grade,
      },
    });
  } catch (error) {
    logger.error("Error updating profile:", error);
    res.status(500).json({error: "Internal server error"});
  }
};

export default {
  getUser,
  updatePhone,
  saveStudentName,
  saveStudySchedule,
  startTest,
  skipTest,
  saveGrade,
  updateProfile,
};
