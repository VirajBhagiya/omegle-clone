import { User } from "./UserManager";

let GLOBAL_ROOM_ID = 1;

interface Room{
    user1: User,
    user2: User
    createdAt: Date;
    status: 'connecting' | 'connected' | 'disconnected';
}

export class RoomManager {
    private rooms: Map<string, Room>
    private readonly ROOM_TIMEOUT = 30000; // 30 seconds timeout for connection

    constructor() {
        this.rooms = new Map<string, Room>();
        this.startCleanupInterval();
    }

    private startCleanupInterval() {
        setInterval(() => this.cleanupStaleRooms(), 10000);
    }

    private cleanupStaleRooms() {
        const now = new Date();
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.status === 'connecting' && 
                now.getTime() - room.createdAt.getTime() > this.ROOM_TIMEOUT) {
                this.handleRoomTimeout(roomId, room);
            }
        }
    }

    private handleRoomTimeout(roomId: string, room: Room) {
        room.user1.socket.emit('connection-timeout');
        room.user2.socket.emit('connection-timeout');
        this.rooms.delete(roomId);
    }

    createRoom(user1: User, user2: User){
        const roomId = this.generate().toString();

        this.rooms.set(roomId, {
            user1,
            user2,
            createdAt: new Date(),
            status: 'connecting'
        });

        // Send ICE server configuration
        const iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        user1.socket.emit("start-call", {
            roomId,
            iceServers,
            isInitiator: true
        });

        user2.socket.emit("start-call", {
            roomId,
            iceServers,
            isInitiator: false
        });

        return roomId;
    }

    onOffer(roomId: string, sdp: RTCSessionDescriptionInit, senderSocketId: string){
        const room = this.rooms.get(roomId);
        if(!room){
            console.log(`Room ${roomId} not found for offer`);
            return;
        }

        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        console.log(`Forwarding offer from ${senderSocketId} to ${receivingUser.socket.id}`);

        receivingUser?.socket.emit("offer", {
            sdp,
            roomId
        });
    }

    onAnswer(roomId: string, sdp: RTCSessionDescriptionInit, senderSocketId: string){
        const room = this.rooms.get(roomId);
        if(!room){
            console.log(`Room ${roomId} not found for answer`);
            return;
        }

        room.status = 'connected';
        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        console.log(`Forwarding answer from ${senderSocketId} to ${receivingUser.socket.id}`);

        receivingUser?.socket.emit("answer", {
            sdp,
            roomId
        });
    }

    onIceCandidates(roomId: string, senderSocketId: string, candidate:RTCIceCandidate, type: "sender" | "receiver"){
        const room = this.rooms.get(roomId);
        if(!room){
            console.log(`Room ${roomId} not found for ICE candidate`);
            return;
        }

        const receivingUser = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;
        console.log(`Forwarding ICE candidate from ${senderSocketId} to ${receivingUser.socket.id}`);

        receivingUser.socket.emit("add-ice-candidate", {
            candidate, 
            type,
            roomId
        });
    }

    handleDisconnect(socketId: string) {
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.user1.socket.id === socketId || room.user2.socket.id === socketId) {
                const otherUser = room.user1.socket.id === socketId ? room.user2 : room.user1;
                console.log(`User ${socketId} disconnected, notifying ${otherUser.socket.id}`);
                otherUser.socket.emit('peer-disconnected');
                this.rooms.delete(roomId);
                break;
            }
        }
    }

    // In RoomManager.ts
    onChatMessage(roomId: string, senderSocketId: string, text: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const sender = room.user1.socket.id === senderSocketId ? room.user1 : room.user2;
        const receiver = room.user1.socket.id === senderSocketId ? room.user2 : room.user1;

        receiver.socket.emit('chat-message', {
            text,
            timestamp: new Date().toISOString(),
            isLocal: false
        });
    }

    private generate() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }
    
    // generate(){
    //     return GLOBAL_ROOM_ID++;
    // }
}