const express = require('express');
const { corsMiddleware, helmetMiddleware } = require('./config/security');
const requestIdMiddleware = require('./middlewares/request-id.middleware');
const notFoundHandler = require('./middlewares/not-found.middleware');
const errorHandlerMiddleware = require('./middlewares/error-handler.middleware');
const healthRoutes = require('./modules/health/health.routes');
const routes = require('./routes');

const app = express();

app.use(helmetMiddleware);
app.use(corsMiddleware);

app.use(
  express.json({
    limit: '100kb',
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(requestIdMiddleware);

// Health check routes
app.use('/health', healthRoutes);

// API v1 routes
app.use('/api/v1', routes);

// 404 & Centralized Production Error Handling
app.use(notFoundHandler);
app.use(errorHandlerMiddleware);

module.exports = app;
