// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session'); // Added for user sessions
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
const helmet = require('helmet')
const compression = require('compression')
app.set('trust proxy', 1) // if behind Render proxy
app.use(helmet()) // sensible security headers
app.use(compression()) // smaller responses

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use((req, res, next) => {
res.locals.user = req.session?.user || null
next()
})

// Session setup
app.use(session({
secret: process.env.SESSION_SECRET || 'dev-secret',
resave: false,
saveUninitialized: false,
cookie: {
    secure: false, // set to true only if using HTTPS
    maxAge: 15 * 60 * 1000 // 15 minutes (in milliseconds)
}
}));

app.use((req, res, next) => {
res.locals.user = req.session?.user || null
next()
})

// Routes
const indexRoute = require('./routes/index');
const usersRoute = require('./routes/users');
// 1) All routers and routes
app.use('/', indexRoute)
app.use('/users', usersRoute)
const passwordRoute = require('./routes/password');
app.use('/password', passwordRoute);

// 2) Static files (if any)
app.use(express.static('public'))

// lightweight logger before the final 404 render
app.use((req, res, next) => {
    if (!res.headersSent) {
        console.warn('404:', req.method, req.originalUrl, 'referrer:',
        req.get('referer') || '-')
    }
    next()
})

//health route
app.get('/health', (req, res) => res.type('text').send('ok'))

// 3) Catch-all 404 (last)
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not Found', path: req.path })
    }
    // place before res.render in your 404 handler
    res.set('Cache-Control', 'no-store')
    res.status(404).render('404', { title: 'Page Not Found' })
})

// 500 handler (last)
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (res.headersSent) return next(err);
    res.status(500).render('500', { title: 'Server Error', req });
});



// MongoDB Setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Expose client & dbName to routes
app.locals.client = client;
app.locals.dbName = process.env.DB_NAME || "ecommerceDB";
async function main() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");
        // Start server
        app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        });
        } catch (err) {
        console.error("MongoDB connection failed", err);
    }
}

main();