require('dotenv').config();
const express = require("express");
const app = express();
const apiTestRouter = require("./src/routes/apiTest");
const userRoutes = require("./src/routes/userRoutes");
const cattleSellRoutes = require("./src/routes/cattleSellRoutes");
// const otpRoutes = require("./src/routes/otpRoutes");
const authRoutes = require("./src/routes/authRoutes");
const pregEasyRoutes = require("./src/routes/pregEasyRoutes");
const pregEasyEventRoutes = require("./src/routes/pregEasyEventRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");
const promotionRoutes = require("./src/routes/promotionRoutes");
const { authenticateRequest } = require('./src/controllers/authController');
const mongoose = require('mongoose')

const PORT = process.env.PORT || 8000;
const DB_URL = process.env.DB_URL

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended : true}))
app.use((req, res, next) => {
  console.log("Request Method:", req.method);
  console.log("Requested URL:", req.originalUrl); // Logs full URL path
  //console.log("Request Body:", req);
  next();
});

app.get('/', (req, res) => {
  res.status(200).send('Welcome to Breedingo App Service');
});

app.get('/health', (req, res) => {
  res.status(200).send('Healthy');
});

app.use('/login', authRoutes);

console.log(app.get)
// Routes
app.use("/user",authenticateRequest,userRoutes);
// app.use("/auth",otpRoutes);

app.use("/cattle",authenticateRequest,cattleSellRoutes);

// Register event routes before the main pregEasy routes to avoid conflicts
console.log('Registering PregEasy Event Routes...');
app.use("/pregEasy", authenticateRequest, pregEasyEventRoutes);
console.log('Registering PregEasy Main Routes...');
app.use("/pregEasy", authenticateRequest, pregEasyRoutes);

app.use("/payment",authenticateRequest,paymentRoutes);

// Promotions route - No authentication required for public banners
app.use("/promotions", promotionRoutes);

app.use("/api/test", apiTestRouter); // Test the API

// Connect to DB
mongoose.connect(DB_URL).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.log('Error connecting to MongoDB:', err);
});

// Server Start Function
const start = async () => {
  try {
    app.listen(PORT, () => {
      const timestamp = new Date().toLocaleString();
      console.log(`Server started on port ${PORT} at ${timestamp}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('Process terminated');
  process.exit(0);
});

start();