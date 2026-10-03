const express = require("express");
const router = express.Router();

const staffPenaltyController = require("../controllers/staffPenaltyController");

// Automatic penalty route must come before /:id
router.post(
  "/automatic",
  staffPenaltyController.createAutomaticPenalty
);

router.get(
  "/",
  staffPenaltyController.getAllPenalties
);

router.get(
  "/summary",
  staffPenaltyController.getPenaltySummary
);

router.get(
  "/:id",
  staffPenaltyController.getPenaltyById
);

router.put(
  "/:id",
  staffPenaltyController.updatePenalty
);

router.patch(
  "/:id/approve",
  staffPenaltyController.approvePenalty
);

router.patch(
  "/:id/deduct",
  staffPenaltyController.markPenaltyAsDeducted
);

router.patch(
  "/:id/waive",
  staffPenaltyController.waivePenalty
);

router.delete(
  "/:id",
  staffPenaltyController.deletePenalty
);

module.exports = router;