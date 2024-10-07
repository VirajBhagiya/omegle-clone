import { Socket } from "socket.io";
import http from "http";

import expess from 'express';
import { Server } from 'socket.io';
import { UserManager } from "./managers/UserManager";

const app = expess();
const server = http.createServer(http);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const userManager = new UserManager();

io.on('connection', (socket: Socket) => {
    console.log('User Connected!'); 
    userManager.addUser("randomName", socket)
});

server.listen(3000, () => {
    console.log('listening on 3000!')
})