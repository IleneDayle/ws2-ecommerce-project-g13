// routes/users.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const { MongoClient, ObjectId } = require('mongodb');
const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const dbName = "ecommerceDB";

// ---------- Helper: Connect to DB ----------
async function getDB() {
  if (!client.topology?.isConnected()) await client.connect();
  return client.db(dbName);
}

// ---------- Registration ----------
router.get('/register', (req, res) => {
  res.render('register', { title: "Register" });
});

router.post('/register', async (req, res) => {
  try {
    const db = await getDB();
    const users = db.collection('users');

    const existingUser = await users.findOne({ email: req.body.email });
    if (existingUser) return res.send("User already exists with this email.");

    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
    const token = uuidv4();
    const currentDate = new Date();

    const newUser = {
      userId: uuidv4(),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      passwordHash: hashedPassword,
      role: 'customer',
      accountStatus: 'active',
      isEmailVerified: false,
      verificationToken: token,
      tokenExpiry: new Date(Date.now() + 3600000),
      createdAt: currentDate,
      updatedAt: currentDate
    };

    await users.insertOne(newUser);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/users/verify/${token}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: newUser.email,
      subject: 'Verify your account',
      html: `
        <h2>Welcome, ${newUser.firstName}!</h2>
        <p>Please verify your email by clicking below:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
      `
    });

    res.send(`<h2>Registration Successful!</h2>
      <p>Please check your email to verify your account.</p>`);
  } catch (err) {
    console.error("Error saving user:", err);
    res.send("Something went wrong.");
  }
});

// ---------- Email Verification ----------
router.get('/verify/:token', async (req, res) => {
  try {
    const db = await getDB();
    const users = db.collection('users');
    const user = await users.findOne({ verificationToken: req.params.token });

    if (!user) return res.send("Invalid or expired verification link.");
    if (user.tokenExpiry < new Date()) return res.send("Verification link expired.");

    await users.updateOne(
      { verificationToken: req.params.token },
      { $set: { isEmailVerified: true }, $unset: { verificationToken: "", tokenExpiry: "" } }
    );

    res.send(`<h2>Email Verified!</h2>
      <p>Your account is now verified.</p>
      <a href="/users/login">Login</a>`);
  } catch (err) {
    console.error("Error verifying user:", err);
    res.send("Something went wrong.");
  }
});

// ---------- Login ----------
router.get('/login', (req, res) => {
  res.render('login', { title: "Login" });
});

router.post('/login', async (req, res) => {
  try {
    const db = await getDB();
    const users = db.collection('users');
    const user = await users.findOne({ email: req.body.email });

    if (!user) return res.send("User not found.");
    if (!user.isEmailVerified) return res.send("Please verify your email first.");
    if (user.accountStatus !== 'active') return res.send("Account is not active.");

    const isPasswordValid = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!isPasswordValid) return res.send("Invalid password.");

    req.session.user = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    };

    // Redirect based on role
    if (user.role.toLowerCase() === 'admin') {
      return res.redirect('/users/adminDashboard');
    } else if (user.role.toLowerCase() === 'employee') {
      return res.redirect('/users/emp-dashboard');
    } else {
      return res.redirect('/users/dashboard');
    }
  } catch (err) {
    console.error("Error during login:", err);
    res.send("Something went wrong.");
  }
});

// ---------- Logout ----------
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send("Something went wrong during logout.");
    res.redirect('/users/login');
  });
});

// ========== DASHBOARDS ==========

// ----- Customer -----
router.get('/dashboard', (req, res) => {
  res.render('dashboard', { title: 'Dashboard | ONEJA POS', currentUser: req.session.user });
});

// ----- Employee -----
router.get('/emp-dashboard', (req, res) => {
  if (!req.session.user || req.session.user.role.toLowerCase() !== 'employee') {
    return res.status(403).send("Access denied.");
  }
  res.render('emp-dashboard', { title: 'Employee Dashboard | ONEJA POS', currentUser: req.session.user });
});

// ----- Admin -----
router.get('/adminDashboard', (req, res) => {
  if (!req.session.user || req.session.user.role.toLowerCase() !== 'admin') {
    return res.status(403).send("Access denied.");
  }
  res.render('adminDashboard', { title: 'Admin Dashboard | ONEJA POS', currentUser: req.session.user });
});

// ---------- Sidebar Pages ----------
router.get('/profile', (req, res) => {
  res.render('profile', { title: 'Profile | ONEJA POS', currentUser: req.session.user });
});

router.get('/custom', (req, res) => {
  res.render('custom', { title: 'Custom Jewelry | ONEJA POS', currentUser: req.session.user });
});

router.get('/orderhistory', (req, res) => {
  res.render('orderhistory', { title: 'Order History | ONEJA POS', currentUser: req.session.user });
});

router.get('/dsr', (req, res) => {
  res.render('dsr', { title: 'Daily Sales Report | ONEJA POS', currentUser: req.session.user });
});

router.get('/reports', (req, res) => {
  if (!req.session.user || req.session.user.role.toLowerCase() !== 'admin') {
    return res.status(403).send("Access denied.");
  }
  res.render('reports', { title: 'Reports | ONEJA POS', currentUser: req.session.user });
});

// ---------- Admin Actions ----------
router.post('/update-role', async (req, res) => {
  const { userId, newRole } = req.body;
  try {
    const db = await getDB();
    const users = db.collection('users');
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role: newRole, updatedAt: new Date() } }
    );
    res.json({ success: true, message: `Role updated to ${newRole}` });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error updating role' });
  }
});

router.post('/archive-employee', async (req, res) => {
  const { userId } = req.body;
  try {
    const db = await getDB();
    const users = db.collection('users');
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { accountStatus: 'resigned', updatedAt: new Date() } }
    );
    res.json({ success: true, message: 'Employee marked as Resigned' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error archiving employee' });
  }
});

// ---------- 404 ----------
router.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

module.exports = router;
