"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const games_1 = __importDefault(require("./routes/games"));
const users_1 = __importDefault(require("./routes/users"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const admin_1 = __importDefault(require("./routes/admin"));
// Import socket handler
const gameSocket_1 = require("./sockets/gameSocket");
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
// Socket.io setup
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
exports.io = io;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/games', games_1.default);
app.use('/api/users', users_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/admin', admin_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
});
// Setup Socket.io handlers
(0, gameSocket_1.setupGameSocket)(io);
// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qoder-mvp';
mongoose_1.default.connect(MONGODB_URI)
    .then(() => {
    console.log('Connected to MongoDB');
    // Start server
    const PORT = Number(process.env.PORT) || 3001;
    const HOST = '0.0.0.0';
    httpServer.listen(PORT, HOST, () => {
        console.log(`Server running on ${HOST}:${PORT}`);
        console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
    });
})
    .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing HTTP server...');
    httpServer.close(() => {
        console.log('HTTP server closed');
        mongoose_1.default.connection.close(false).then(() => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});
//# sourceMappingURL=server.js.map