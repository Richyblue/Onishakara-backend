const express =
    require("express");

const router =
    express.Router();

const register =
    require("../controllers/auth/register");

const login =
    require("../controllers/auth/login");

const getMe =
    require("../controllers/auth/getMe");

const changePassword =
    require("../controllers/auth/changePassword");

const authMiddleware =
    require("../middlewares/authMiddleware");

router.post(
    "/register",
    register
);

router.post(
    "/login",
    login
);

router.get(
    "/me",
    authMiddleware,
    getMe
);

router.put(
    "/change-password",
    authMiddleware,
    changePassword
);
module.exports =
    router;
