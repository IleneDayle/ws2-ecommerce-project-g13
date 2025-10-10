// server.js
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { MongoClient } = require('mongodb');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------- Security & Performance -------------------
app.set('trust proxy', 1); // if behind proxy
app.use(helmet());
app.use(compression());

// ------------------- Middleware -------------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ------------------- Session Setup -------------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 15 * 60 * 1000 } // 15 mins
}));

// Make user available in all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  next();
});

// ------------------- MongoDB Connection -------------------
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
app.locals.client = client;
app.locals.dbName = process.env.DB_NAME || "ecommerceDB";

// ------------------- Routes -------------------
const indexRoute = require('./routes/index');
const usersRoute = require('./routes/users');
const passwordRoute = require('./routes/password');

app.use('/', indexRoute);
app.use('/users', usersRoute);
app.use('/password', passwordRoute);

// ------------------- Health Check -------------------
app.get('/health', (req, res) => res.type('text').send('ok'));

// ------------------- 404 Handler -------------------
app.use((req, res, next) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    req,
    user: req.session?.user || null
  });
});

// ------------------- 500 Error Handler -------------------
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).render('500', {
    title: 'Server Error',
    req,
    user: req.session?.user || null
  });
});

// ------------------- Start Server -------------------
async function main() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}

main();
