import { Socket } from "socket.io";
import http from "http";

const expess = require('express');
const { Server } = require('socket.io');

const app = expess();
const server = http.createServer(http);

const io = new Server(server);

io.on('connection', (socket: Socket) => {
    console.log('User Connected!');
});

server.listen(3000, () => {
    console.log('listening on 3000!')
})