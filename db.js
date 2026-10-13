const { Pool } = require('pg');

// connect to the BlogDB database 
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'BlogDB',
    user: 'postgres',
    password: '', // blank 
});

module.exports = pool;