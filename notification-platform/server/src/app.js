const express = require('express');
const requestIdMiddleware = require('./middlewares/request-id.middleware');
const notFoundHandler = require('./middlewares/not-found.middleware');
const errorHandler = require('./middlewares/error.middleware');
const routes = require('./routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// API v1 routes
app.use('/api/v1', routes);

// 404 & Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
