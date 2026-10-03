const express =
require("express");

const router =
express.Router();

const authMiddleware =
require("../middlewares/authMiddleware");

const authorize =
require("../middlewares/roleMiddleware");

const getCommissions =
require("../controllers/commission/getCommissions");

const getCommission =
require("../controllers/commission/getCommission");

const getPendingCommissions =
require("../controllers/commission/getPenddingCommission");

const payCommission =
require("../controllers/commission/payCommission");

const getStaffCommissions =
require("../controllers/commission/payStaffCommission");

const payStaffCommission =
require("../controllers/commission/payStaffCommission");

router.get(
    "/",
    authMiddleware,
    authorize(
        "admin",
        "manager"
    ),
    getCommissions
);

router.get(
    "/pending",
    authMiddleware,
    authorize(
        "admin",
        "manager"
    ),
    getPendingCommissions
);

router.get(
    "/staff/:staffId",
    authMiddleware,
    authorize(
        "admin",
        "manager"
    ),
    getStaffCommissions
);

router.put(
    "/staff/:staffId/pay",
    authMiddleware,
    authorize(
        "admin",
        "manager"
    ),
    payStaffCommission
);

router.put(
    "/:id/pay",
    authMiddleware,
    authorize(
        "admin",
        "manager"
    ),
    payCommission
);

router.get(
    "/:id",
    authMiddleware,
    authorize(
        "admin",
        "manager"
    ),
    getCommission
);

module.exports = router;