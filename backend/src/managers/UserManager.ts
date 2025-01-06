import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User{
    socket: Socket;
    name: string;
    queueJoinTime: number;
}

export class UserManager {
    private users: User[];
    private queue: string[];
    private roomManager: RoomManager;
    private readonly MAX_QUEUE_TIME = 60000; // 1 minute

    constructor() {
        this.users = [];
        this.queue = [];
        this.roomManager = new RoomManager();
        this.startQueueCleanup();
    }

    private startQueueCleanup() {
        setInterval(() => this.cleanupQueue(), 10000);
    }

    private cleanupQueue() {
        const now = Date.now();
        this.queue = this.queue.filter(socketId => {
            const user = this.users.find(u => u.socket.id === socketId);
            return user && (now - user.queueJoinTime) < this.MAX_QUEUE_TIME;
        });
    }

    addUser(name:string, socket: Socket){
        this.removeUser(socket.id);
        const user = {
            name,
            socket,
            queueJoinTime: Date.now()
        };

        this.users.push(user)
        this.queue.push(socket.id);
        socket.emit("queue-joined");
        this.clearQueue();
        this.initHandlers(socket);
    }

    removeUser(socketId: string){
        this.roomManager.handleDisconnect(socketId)
        this.users = this.users.filter(x => x.socket.id !== socketId);
        this.queue = this.queue.filter(x => x !== socketId);
    }

    private clearQueue(){
        console.log("Queue status:", {
            queueLength: this.queue.length,
            totalUsers: this.users.length,
            queueIds: this.queue,
            userIds: this.users.map(u => u.socket.id)
        });

        while(this.queue.length >=2){
            const id1 = this.queue.shift();
            const id2 = this.queue.shift();

            if(!id1 || !id2) {
                console.log("Invalid IDs:", { id1, id2 });
                continue;
            }

            const user1 = this.users.find(x => x.socket.id === id1);
            const user2 = this.users.find(x => x.socket.id === id2);

            if(!user1 || !user2) {
                console.log("Users not found:", {
                    id1Found: !!user1,
                    id2Found: !!user2,
                    id1,
                    id2
                });
                continue;
            };

            console.log("Creating room for users:", {
                user1: user1.socket.id,
                user2: user2.socket.id
            });
            this.roomManager.createRoom(user1, user2);
        }
    }

    private initHandlers(socket: Socket){
        socket.on("offer", ({sdp, roomId}: {sdp:RTCSessionDescriptionInit, roomId: string}) => {
            // console.log(`Offer received from ${socket.id} for room ${roomId}`);
            this.roomManager.onOffer(roomId, sdp, socket.id);
        })

        socket.on("answer", ({sdp, roomId}:  {sdp:RTCSessionDescriptionInit, roomId: string}) => {
            // console.log(`Answer received from ${socket.id} for room ${roomId}`);
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        })

        socket.on("add-ice-candidate", ({candidate, roomId, type}) => {
            // console.log(`ICE candidate received from ${socket.id} for room ${roomId}`);
            this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
        });

        socket.on("skip", () => {
            this.removeUser(socket.id);
            this.addUser(socket.id, socket);
        });

        socket.on("send-message", ({ text, roomId }) => {
            this.roomManager.onChatMessage(roomId, socket.id, text);
        });
    }
} 