const express = require("express");

const router = express.Router();

router.post("/session", (req, res) => {
    res.json({
        message: "Auth route working",
    });
});

module.exports = router;