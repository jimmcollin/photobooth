const express = require("express");
const router = express.Router();
const passport = require("passport");
const catchAsync = require("../utils/catchAsync");

const users = require('../controllers/users.js');
const { storeReturnTo } = require('../middleware.js');

router.route('/register')
    .get(users.renderRegister)
    .post(catchAsync(users.register));

router.route('/login')
    .get(users.renderLogin)
    .post(storeReturnTo, passport.authenticate("local", { failureFlash: true, failureRedirect: "/login" }),
        users.login,
    );

router.get("/logout", users.logout);

module.exports = router;        