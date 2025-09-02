// routes/users.js

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const dbName = "ecommerceDB";

// Show registration form
router.get('/register', (req, res) => {
res.render('register', { title: "Register" });
});

// Handle form submission
    router.post('/register', async (req, res) => {
        try {
            await client.connect();
            const db = client.db(dbName);
            const usersCollection = db.collection('users');

            // Get form data
            const newUser = {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password
            };

            // Insert into MongoDB
            await usersCollection.insertOne(newUser);
            res.send("User registered successfully!");

        } catch (err) {
            console.error("Error saving user:", err);
            res.send("Something went wrong.");
        }
    });

//Show all registered users
router.get('/list', async (req, red) =>{
    try {
        await client.connect();
        const db = client.db(dbName);
        const userCollection = db.collection('users');

        const users = await userCollection.find().toArray();

        res.render('users-list',{ title: "Registered Users", users: users});
    } catch (err){
        console.error("Error fetching users:", err);
        res.send("Something went wrong.");
    }
});

// Show edit form
router.get('/edit/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ _id: new
        ObjectId(req.params.id) });
        if (!user) {
        return res.send("User not found.");
        }
        res.render('edit-user', { title: "Edit User", user: user });
    } catch (err) {
        console.error("Error loading user:", err);
        res.send("Something went wrong.");
    }
});

// Handle update form
router.post('/edit/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');
        await usersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { name: req.body.name, email: req.body.email } }
        );
        res.redirect('/users/list');
    } catch (err) {
        console.error("Error updating user:", err);
        res.send("Something went wrong.");
    }
});

// Delete user
router.post('/delete/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.redirect('/users/list');
    } catch (err) {
        console.error("Error deleting user:", err);
        res.send("Something went wrong.");
    }
});
    module.exports = router;