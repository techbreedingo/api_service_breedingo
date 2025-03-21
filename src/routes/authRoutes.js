const express = require("express");
const router = express.Router();
const {sendOTP,verifyOTPAndLogin} = require("../controllers/authController")
//const {registerUser} = require("../controllers/userController")

router.route("/").post(sendOTP);
router.route("/verify").post(verifyOTPAndLogin);
 

module.exports = router;