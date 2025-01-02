import { useEffect, useRef, useState } from "react";
import { Socket, io } from "socket.io-client";

const URL = "http://localhost:3000";

declare global {
    interface Window {
        pcr: RTCPeerConnection;
    }
}

interface RoomProps {
    name: string;
    localAudioTrack: MediaStreamTrack | null;
    localVideoTrack: MediaStreamTrack | null;
    socket: Socket
}

export const Room = ({ name, localAudioTrack, localVideoTrack}: RoomProps) => {
    const [lobby, setLobby] = useState(true);
    const [, setSocket] = useState<null | Socket>(null);
    const [, setSendingPc] = useState<null | RTCPeerConnection>(null);
    const [, setReceivingPc] = useState<null | RTCPeerConnection>(null);
    const [, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
    const [, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);

    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    

    useEffect(() => {
        const socket = io(URL);

        socket.on('send-offer', async ({roomId}) => {
            console.log("sending offer");
            setLobby(false);
            const pc = new RTCPeerConnection();

            setSendingPc(pc);
            if (localVideoTrack) {
                console.error("added track");
                console.log(localVideoTrack)
                pc.addTrack(localVideoTrack)
            }
            if (localAudioTrack) {
                console.error("added track");
                console.log(localAudioTrack)
                pc.addTrack(localAudioTrack)
            }

            pc.onicecandidate = async (e) => {
                console.log("receiving ice candidate locally");
                if (e.candidate) {
                   socket.emit("add-ice-candidate", {
                    candidate: e.candidate,
                    type: "sender",
                    roomId
                   })
                }
            }

            pc.onnegotiationneeded = async () => {
                console.log("on negotiation needed, sending offer");
                const sdp = await pc.createOffer();
                pc.setLocalDescription(sdp)
                socket.emit("offer", {
                    sdp,
                    roomId
                })
            }
        });

        socket.on("offer", async ({roomId, sdp: remoteSdp}) => {
            console.log("received offer");
            setLobby(false);
            const pc = new RTCPeerConnection();
            try {
                pc.setRemoteDescription(remoteSdp);
            } catch (error) {
                console.error("Failed to set remote description", error)
            }
            const sdp = await pc.createAnswer();
            pc.setLocalDescription(sdp)
            const stream = new MediaStream();
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
            }

            setRemoteMediaStream(stream);
            setReceivingPc(pc);
            
            window.pcr = pc;
            pc.ontrack = (event) => {
                event.streams[0].getTracks().forEach((track) => {
                    remoteMediaStream?.addTrack(track);
                });
            };

            pc.onicecandidate = async (e) => {
                if (!e.candidate) {
                    return;
                }
                console.log("on ice candidate on receiving side");
                if (e.candidate) {
                   socket.emit("add-ice-candidate", {
                    candidate: e.candidate,
                    type: "receiver",
                    roomId
                   })
                }
            }

            socket.emit("answer", {
                roomId,
                sdp: sdp
            });
            setTimeout(() => {
                const track1 = pc.getTransceivers()[0].receiver.track
                const track2 = pc.getTransceivers()[1].receiver.track
                console.log(track1);
                if (track1.kind === "video") {
                    setRemoteAudioTrack(track2)
                    setRemoteVideoTrack(track1)
                } else {
                    setRemoteAudioTrack(track1)
                    setRemoteVideoTrack(track2)
                }
                // @ts-expect-error: done
                remoteVideoRef.current.srcObject.addTrack(track1)
                // @ts-expect-error: done
                remoteVideoRef.current.srcObject.addTrack(track2)
                // @ts-expect-error: done
                remoteVideoRef.current.play();
            }, 3000)
        });

        socket.on("answer", ({sdp: remoteSdp}) => {
            setLobby(false);
            setSendingPc(pc => {
                pc?.setRemoteDescription(remoteSdp)
                return pc;
            });
            console.log("loop closed");
        })

        socket.on("lobby", () => {
            setLobby(true);
        })

        socket.on("add-ice-candidate", ({candidate, type}) => {
            console.log("add ice candidate from remote");
            console.log({candidate, type})
            if (type == "sender") {
                setReceivingPc(pc => {
                    if (!pc) {
                        console.error("receicng pc not found")
                    } else {
                        console.error(pc.ontrack)
                    }
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            } else {
                setSendingPc(pc => {
                    if (!pc) {
                        console.error("sending pc not found")
                    } else {
                        console.error(pc.ontrack)
                    }
                    pc?.addIceCandidate(candidate)
                    return pc;
                });
            }
        })

        setSocket(socket)
    }, [localAudioTrack, localVideoTrack, name, remoteMediaStream])

    useEffect(() => {
        if (localVideoRef.current) {
            if (localVideoTrack) {
                localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
                localVideoRef.current.play();
                // const localStream = new MediaStream([localVideoTrack, localAudioTrack]);
                // localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
            }
        }
    }, [localVideoRef, localVideoTrack])

    return (
        <div className="min-h-screen bg-space-dark relative overflow-hidden flex flex-col items-center">
            {/* Animated background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,61,255,0.1),rgba(0,0,0,0))]" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent animate-pulse" />
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-purple to-transparent animate-pulse" />

            {/* Header */}
            <div className="w-full px-8 py-6 backdrop-blur-sm bg-space-light/30 border-b border-neon-blue/20">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
                    Neural Link: <span className="text-neon-pink">{name}</span>
                </h1>
            </div>

            {/* Main content */}
            <div className="flex-1 w-full max-w-7xl mx-auto p-8">
                <div className="grid grid-cols-2 gap-8">
                    {/* Local video container */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
                        <div className="relative">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full aspect-video rounded-xl border border-neon-blue/30 shadow-lg"
                            />
                            <div className="absolute bottom-4 left-4 px-4 py-2 rounded-lg bg-space-dark/80 border border-neon-blue/30 text-neon-blue">
                                Local Neural Feed
                            </div>
                        </div>
                    </div>

                    {/* Remote video container */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
                        <div className="relative">
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full aspect-video rounded-xl border border-neon-pink/30 shadow-lg"
                            />
                            <div className="absolute bottom-4 left-4 px-4 py-2 rounded-lg bg-space-dark/80 border border-neon-pink/30 text-neon-pink">
                                Remote Neural Feed
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status indicator */}
                <div className="mt-8 flex justify-center">
                    {lobby ? (
                        <div className="flex items-center space-x-3 px-6 py-3 rounded-full bg-space-light/50 border border-neon-blue/30">
                            <div className="w-3 h-3 rounded-full bg-neon-blue animate-pulse" />
                            <span className="text-neon-blue">Scanning neural network for available connections...</span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-3 px-6 py-3 rounded-full bg-space-light/50 border border-neon-green/30">
                            <div className="w-3 h-3 rounded-full bg-neon-green" />
                            <span className="text-neon-green">Neural link established</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};