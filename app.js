// loading express library
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
const db = require('./db');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
// lets the browser get files from the public folder
app.use(express.static('public'));

// KEEPS track of who is signed in
app.use(session({
    secret: 'blog-secret',
    resave: false,
    saveUninitialized: false
}));

// shows all the posts on the home page for users
app.get('/', async (req, res) => {
const result = await db.query('SELECT * FROM blogs ORDER BY blog_id DESC');
res.render('index', { groupPosts: result.rows, user: req.session.user });
});

// runs when someone starts to make post
app.post('/create', async (req, res) => {
// have to be logged in to post
if (!req.session.user) return res.redirect('/signin');

await db.query(
'INSERT INTO blogs (creator_name, creator_user_id, title, body) VALUES ($1, $2, $3, $4)',
[req.session.user.name, req.session.user.user_id, req.body.postTitle, req.body.postBody]
    );
res.redirect('/'); // go back to homepage after posting
});

// shows edit page with existing posts
app.get('/edit/:id', async (req, res) => {
if (!req.session.user) return res.redirect('/signin');

const result = await db.query('SELECT * FROM blogs WHERE blog_id = $1', [req.params.id]);
const post = result.rows[0];

// CAN only edit your own posts
if (!post || post.creator_user_id !== req.session.user.user_id) {
return res.redirect('/');
    }
res.render('edit', { post: post });
});

// handles saving the edited post
app.post('/edit/:id', async (req, res) => {
if (!req.session.user) return res.redirect('/signin');

// double check they own it
const check = await db.query('SELECT * FROM blogs WHERE blog_id = $1', [req.params.id]);
const post = check.rows[0];

if (post && post.creator_user_id === req.session.user.user_id) {
await db.query(
'UPDATE blogs SET title = $1, body = $2, date_created = CURRENT_TIMESTAMP WHERE blog_id = $3',
[req.body.postTitle, req.body.postBody, req.params.id]
        );
    }
res.redirect('/');
});

// gets rid of post through id
app.post('/delete/:id', async (req, res) => {
if (!req.session.user) return res.redirect('/signin');

// CAN only delete your own posts
await db.query(
'DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2',
[req.params.id, req.session.user.user_id]
    );
res.redirect('/');
});

// shows the sign up page
app.get('/signup', (req, res) => {
res.render('signup', { error: null });
});

// runs when someone signs up
app.post('/signup', async (req, res) => {
const { user_id, password, name } = req.body;

// see if that user_id is already taken
const existing = await db.query('SELECT * FROM users WHERE user_id = $1', [user_id]);

if (existing.rows.length > 0) {
return res.render('signup', { error: 'That user_id is taken, try a different one.' });
    }

// hash the password before saving
const hashed = await bcrypt.hash(password, 10);

await db.query(
'INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)',
[user_id, hashed, name]
    );
res.redirect('/signin');
});

// shows the sign in page
app.get('/signin', (req, res) => {
res.render('signin', { error: null });
});

// runs when someone signs in
app.post('/signin', async (req, res) => {
const { user_id, password } = req.body;

const result = await db.query('SELECT * FROM users WHERE user_id = $1', [user_id]);

// no user with that id
if (result.rows.length === 0) {
return res.render('signin', { error: 'Wrong user_id or password.' });
    }

const user = result.rows[0];

// check the password against the hashed one
const match = await bcrypt.compare(password, user.password);

if (!match) {
return res.render('signin', { error: 'Wrong user_id or password.' });
    }

// save user to session so they stay logged in
req.session.user = { user_id: user.user_id, name: user.name };
res.redirect('/');
});

// sign out
app.get('/signout', (req, res) => {
req.session.destroy();
res.redirect('/');
});

// starts server and auto opens in the browser
app.listen(3000, () => {
console.log("running on 3000");
import('open').then(open => open.default('http://localhost:3000'));
});