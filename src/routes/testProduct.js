const express = require("express");
const router = express.Router();
const testProductAPI = require("../controllers/testProductAPI")

router.route("/api/test-products").get(testProductAPI);

module.exports = router;