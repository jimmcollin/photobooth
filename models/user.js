const mongoose = require('mongoose');
const passportLocalMongooseModule = require('passport-local-mongoose');
const passportLocalMongoose =
    passportLocalMongooseModule.default || passportLocalMongooseModule;
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    }
});
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);
