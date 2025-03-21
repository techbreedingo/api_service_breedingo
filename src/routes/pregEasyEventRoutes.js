const express = require("express");
const router = express.Router();
const { 
  createInitialEvents,
  getCattleEvents,
  updateEventStatus,
  updateHeatCheckBeforePD,
  updatePDCheck
} = require("../controllers/pregEasyEventController");

// Create initial events for a cattle
router.post("/events/initial", createInitialEvents);

// Get all events for a cattle
router.get("/events", getCattleEvents);

// Update event status
router.patch("/events/:eventId", updateEventStatus);

// Update Heat Check Before PD and Heat Cycle events
router.patch("/events/:eventId/heat-check", updateHeatCheckBeforePD);

// Update PD Check event
router.patch("/events/:eventId/pd-check", updatePDCheck);

// Export the router
module.exports = router;
