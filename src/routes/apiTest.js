const express = require("express");
const router = express.Router();
const apiTestController = require("../controllers/apiTest");

router.route("/").get(apiTestController);

module.exports = router;
