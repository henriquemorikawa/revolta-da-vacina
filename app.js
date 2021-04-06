require('dotenv').config();

const express = require('express');

const app = express();

const authRoutes = require('./routes/auth.routes');
const sessionRoutes = require('./routes/session.routes');

require('./config/mongodb.config');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require('./routes/index.routes')(app);

app.listen(process.env.PORT, () => console.log(`apiRestNode is running on port ${ process.env.PORT }`));
