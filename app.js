require('dns').setDefaultResultOrder('ipv4first');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const MongoDBStoreModule = require('connect-mongo');
const MongoDBStore = MongoDBStoreModule.default || MongoDBStoreModule;
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const helmet = require('helmet');

const mongoSanitize = require('express-mongo-sanitize');
const sanitizeV5 = require('./utils/mongoSanitizeV5.js');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');

const userRoutes = require('./routes/users');
const photoSessionRoutes = require('./routes/photobooth.js')

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/photo-booth';
const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

mongoose.connect(dbUrl);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open',
    () => {
        console.log('Database connected');
        console.log('DB_URL:', dbUrl);
    });

const app  = express();
app.set('query parser', 'extended');

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));

//app.use(morgan('tiny'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(sanitizeV5({ replaceWith: '_' }));

const store = MongoDBStore.create({
    mongoUrl: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: secret
    }
}); 

store.on('error',
    function(e) {
        console.log('SESSION STORE ERROR', e);
    });

    
app.use(session({
    store: store,
    secret: secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 30 // 30 minutes 
    }
}));

app.use(flash());
app.use(helmet({ contentSecurityPolicy: false }));

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net",
];
const connectSrcUrls = [
    "https://localhost:3500",
    "wss://localhost:3500",
    "https://cdn.jsdelivr.net",
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    console.log(req.query);
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

app.use(express.json({ limit: '10mb'}));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use((req, res, next) => {
    if (!req.secure) {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});


app.use('/', userRoutes);
app.use('/photosession', photoSessionRoutes);


app.get('/',
    (req, res) => {
        res.render('home');
    });

app.all(/(.*)/,
    (req, res, next) => {
        next(new ExpressError('Page not found!', 404));
    });

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!';
    res.status(statusCode).render('error', { err });
});



const https = require('https');
const fs = require('fs');

const port = process.env.PORT || 3500;

https.createServer({
    key: fs.readFileSync(path.join(__dirname, 'ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl/cert.pem'))
}, app).listen(port, () => {
    console.log(`Serving on https://localhost:${port}`);
});

// app.listen(port, () => {
//     console.log(`Serving on ${port}`);
// });
