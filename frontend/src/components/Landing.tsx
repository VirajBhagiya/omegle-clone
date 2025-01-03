import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client";
import { Room } from "./Room";

const socket = io("http://localhost:3000", {
    reconnection: false,  // Prevent automatic reconnection
    transports: ['websocket']  // Use WebSocket transport only
});

export const Landing = () => {
    const [name, setName] = useState("");
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [joined, setJoined] = useState(false);

    const getCam = async() => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            const audioTrack = stream.getAudioTracks()[0];
            const videoTrack = stream.getVideoTracks()[0];
            setLocalAudioTrack(audioTrack);
            setLocalVideoTrack(videoTrack);
            if(videoRef.current){
                videoRef.current.srcObject = new MediaStream([videoTrack]);
                await videoRef.current.play();
            }
        } catch (error) {
            console.error("Error accessing media devices:", error);
            alert("Unable to access your camera or microphone. Please check your device settings.");
        }
    };

    useEffect(() => {
        if (videoRef && videoRef.current) {
            getCam();
        }

    }, [videoRef]);

    const handleJoinRoom = () => {
        if (!name.trim()) return;
        console.log("Emitting join-room event with name:", name);
        socket.emit('join-room', name);
        setJoined(true);
    };

    useEffect(() => {
        socket.on('queue-joined', () => {
            console.log('Joined queue, waiting for match...');
        });

        return () => {
            socket.off('queue-joined');
        };
    }, []);

    if(!joined){
        return (
            <div className="min-h-screen bg-space-dark relative overflow-hidden flex flex-col items-center justify-center">
                {/* Animated background elements */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,61,255,0.1),rgba(0,0,0,0))]" />
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent animate-pulse" />
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-purple to-transparent animate-pulse" />
                
                {/* Main content container */}
                <div className="relative z-10 backdrop-blur-sm bg-space-light/30 p-8 rounded-2xl border border-neon-blue/20 shadow-2xl animate-float">
                    <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink">
                        Neural Link
                    </h1>
                    
                    {!localVideoTrack && (
                        <div className="mb-6 text-neon-pink flex items-center space-x-2 animate-pulse">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Neural interface offline. Enable visual sensors.</span>
                        </div>
                    )}

                    <div className="relative group mb-8">
                        <video
                            autoPlay
                            ref={videoRef}
                            className="w-96 h-72 rounded-xl border border-neon-blue/30 shadow-lg transform transition-transform group-hover:scale-[1.02]"
                            style={{
                                boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)',
                            }}
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-space-dark/80 via-transparent to-transparent" />
                    </div>

                    <div className="space-y-6">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Enter neural signature"
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-6 py-4 bg-space-accent/50 rounded-lg border border-neon-blue/30 text-neon-blue placeholder-neon-blue/50 focus:outline-none focus:border-neon-purple/50 transition-all"
                                style={{
                                    caretColor: '#00f3ff',
                                }}
                            />
                            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink transform scale-x-0 transition-transform duration-300 origin-left peer-focus:scale-x-100" />
                        </div>

                        <button
                            onClick={handleJoinRoom}
                            disabled={!name.trim()}
                            className={`
                                w-full px-8 py-4 rounded-lg font-bold text-lg
                                transition-all duration-300 transform hover:scale-105
                                ${name.trim() 
                                    ? 'bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white shadow-lg hover:shadow-neon-purple/50' 
                                    : 'bg-space-accent text-gray-500 cursor-not-allowed'}
                            `}
                        >
                            Initialize Connection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <Room name={name} localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} socket={socket} />;

};