const express = require('express');
const router = express.Router();
const photobooth = require('../controllers/photobooth.js');
const catchAsync = require('../utils/catchAsync.js');
const methodOverride = require('method-override');
const Photo = require('../models/photobooth.js');
const { isLoggedIn, validatePhotobooth, storeReturnTo } = require('../middleware.js');

router.route('/')
    .get(catchAsync(photobooth.index))
    .post(isLoggedIn, validatePhotobooth, catchAsync(photobooth.createPhotobooth));

router.post('/select', catchAsync(photobooth.selectPhoto));

router.route('/new')
    .get(photobooth.renderNewForm)
    .post(catchAsync(photobooth.createPhoto));


module.exports = router;