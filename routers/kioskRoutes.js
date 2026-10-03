const express = require("express");

const router = express.Router();

const kioskController = require("../controllers/kioskController");

/*
=========================================
SCAN QR CODE
=========================================
*/

router.post(
    "/scan",
    kioskController.scanQRCode
);

/*
=========================================
CLOCK IN
=========================================
*/

router.post(
    "/clock-in",
    kioskController.clockIn
);

/*
=========================================
GO OUT
=========================================
*/

router.post(
    "/go-out",
    kioskController.goOut
);

/*
=========================================
RETURN
=========================================
*/

router.post(
    "/return",
    kioskController.returnBack
);

/*
=========================================
CLOCK OUT
=========================================
*/

router.post(
    "/clock-out",
    kioskController.clockOut
);

module.exports = router;