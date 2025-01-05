import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Chat } from "./Chat";

interface RoomProps {
    name: string;
    localAudioTrack: MediaStreamTrack | null;
    localVideoTrack: MediaStreamTrack | null;
    socket: Socket
}

export const Room = ({ name, localAudioTrack, localVideoTrack, socket }: RoomProps) => {
    const [lobby, setLobby] = useState(true);
    const [sendingPc, setSendingPc] = useState<RTCPeerConnection | null>(null);
    const [receivingPc, setReceivingPc] = useState<RTCPeerConnection | null>(null);
    const [, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteMediaStream] = useState<MediaStream>(new MediaStream());
    const [connectionQuality, setConnectionQuality] = useState(100);
    const [roomId, setRoomId] = useState<string>("");

    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('start-call', async ({ roomId, isInitiator }) => {
            setRoomId(roomId);
            setLobby(false);
            if (isInitiator) {
                const pc = new RTCPeerConnection();
                setSendingPc(pc);

                if (localVideoTrack) pc.addTrack(localVideoTrack);
                if (localAudioTrack) pc.addTrack(localAudioTrack);

                pc.onicecandidate = ({ candidate }) => {
                    if (candidate) {
                        socket.emit("add-ice-candidate", {
                            candidate,
                            type: "sender",
                            roomId
                        });
                    }
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit("offer", { sdp: offer, roomId });
            }
        });

        socket.on("offer", async ({ roomId, sdp }) => {
            const pc = new RTCPeerConnection();
            setReceivingPc(pc);
            
            pc.ontrack = (event) => {
                const [track] = event.streams[0].getTracks();
                if (track.kind === "video") {
                    remoteMediaStream.addTrack(track);
                    setRemoteVideoTrack(track);
                } else {
                    remoteMediaStream.addTrack(track);
                    setRemoteAudioTrack(track);
                }
            };

            pc.onicecandidate = ({ candidate }) => {
                if (candidate) {
                    socket.emit("add-ice-candidate", {
                        candidate,
                        type: "receiver",
                        roomId
                    });
                }
            };

            await pc.setRemoteDescription(sdp);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { sdp: answer, roomId });
        });

        socket.on("add-ice-candidate", async ({ candidate, type }) => {
            const pc = type === "sender" ? receivingPc : sendingPc;
            if (pc) await pc.addIceCandidate(candidate);
        });

        return () => {
            socket.off('start-call');
            socket.off('offer');
            socket.off('answer');
            socket.off('add-ice-candidate');
            sendingPc?.close();
            receivingPc?.close();
        };
    }, [socket, localAudioTrack, localVideoTrack, remoteMediaStream, receivingPc, sendingPc]);

    useEffect(() => {
        if (localVideoRef.current && localVideoTrack) {
            const stream = new MediaStream([localVideoTrack]);
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(e => console.error("Local video play failed:", e));
        }
    }, [localVideoTrack]);

    useEffect(() => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteMediaStream;
        }

        const qualityInterval = setInterval(() => {
            setConnectionQuality(prev => Math.max(60, Math.min(100, prev + Math.random() * 10 - 5)));
        }, 2000);

        return () => clearInterval(qualityInterval);
    }, [remoteMediaStream]);

    return (
        <div className="min-h-screen bg-gray-900 relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),rgba(0,0,0,0))]" />
            
            {/* Animated grid background */}
            <div className="absolute inset-0" style={{
                background: 'linear-gradient(transparent 0%, transparent calc(100% - 1px), rgba(0, 255, 255, 0.1) 100%), linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), rgba(0, 255, 255, 0.1) 100%)',
                backgroundSize: '50px 50px',
                animation: 'move 15s linear infinite'
            }} />
            
            {/* Header */}
            <div className="relative w-full px-8 py-4 bg-black/50 border-b border-cyan-500/30 backdrop-blur-md">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                        NEURAL·LINK/<span className="text-pink-500">{name}</span>
                    </h1>
                    <div className="flex items-center space-x-4">
                        <div className="text-cyan-400">
                            Signal: {connectionQuality}%
                            <div className="w-24 h-1 bg-gray-800 rounded-full mt-1">
                                <div 
                                    className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                                    style={{ width: `${connectionQuality}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-8">
                <div className="grid grid-cols-2 gap-8 max-w-7xl mx-auto">
                    {/* Local feed */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg opacity-75 blur group-hover:opacity-100 transition duration-300" />
                        <div className="relative bg-black rounded-lg p-1">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full aspect-video rounded-lg border border-cyan-500/20"
                            />
                            <div className="absolute top-4 left-4 px-3 py-1 rounded border border-cyan-500/50 bg-black/80 text-cyan-400 text-sm">
                                LOCAL_FEED:://{name}
                            </div>
                        </div>
                    </div>

                    {/* Remote feed */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg opacity-75 blur group-hover:opacity-100 transition duration-300" />
                        <div className="relative bg-black rounded-lg p-1">
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full aspect-video rounded-lg border border-pink-500/20"
                            />
                            <div className="absolute top-4 left-4 px-3 py-1 rounded border border-pink-500/50 bg-black/80 text-pink-400 text-sm">
                                REMOTE_FEED::/*connected*/
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat section */}
                <div className="col-span-1">
                        {!lobby && <Chat socket={socket} roomId={roomId} />}
                    </div>

                {/* Status indicator */}
                <div className="mt-8 flex justify-center">
                    {lobby ? (
                        <div className="flex items-center space-x-3 px-6 py-2 rounded-full bg-black/50 border border-cyan-500/30">
                            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                            <span className="text-cyan-400 text-sm">SCANNING_NETWORK...</span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-3 px-6 py-2 rounded-full bg-black/50 border border-green-500/30">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-green-400 text-sm">NEURAL_LINK::ESTABLISHED</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};