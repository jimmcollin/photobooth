const Photo = require("../models/photobooth.js");


module.exports.index = async (req, res) => {
    res.render("photobooth/index");
};

module.exports.renderNewForm = async (req, res) => {
    res.render("photobooth/new", { selectedImage: req.session.selectedImage });
};

module.exports.createPhoto = async (req, res) => {
    const { image } = req.body;
    const photo = new Photo({ image });
    await photo.save();
    res.json({ returnedUrl: '/photobooth/new' });
};

module.exports.selectPhoto = async (req, res) => {
    req.session.selectedImage = req.body.image
    res.render("photobooth/new", { selectedImage: req.session.selectedImage });
    // res.json({ returnedUrl: '/photosession/new' });
};
