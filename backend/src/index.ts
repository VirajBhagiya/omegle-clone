import expess from 'express';
import http from "http";
import { Server } from 'socket.io';
import { UserManager } from "./managers/UserManager";
import cors from "cors";

const app = expess();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket']
});

const userManager = new UserManager();

io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    const originalEmit = socket.emit;
    socket.emit = function(...args) {
        console.log('Socket event emitted:', args[0]);
        return originalEmit.apply(this, args);
    };
    
    socket.on('join-room', (name: string) => {
        console.log(`User ${socket.id} joining room with name:`, name);
        userManager.addUser(name || 'Anonymous', socket);
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected:', socket.id);
        userManager.removeUser(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}!`);
});