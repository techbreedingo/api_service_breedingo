const express = require("express");
const router = express.Router();

const { addPregEasyData,getAllPregEasyData ,getUserAllPregEasyData  } = require("../controllers/pregEasyController");


router.route("/add").post(addPregEasyData);
router.route("/getAll").get(getAllPregEasyData );
router.route("/getUserAll").get(getUserAllPregEasyData );

module.exports = router;