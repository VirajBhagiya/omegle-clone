import { useEffect, useRef, useState } from "react"
import { Room } from "./Room";

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

        return () => {
            if (localAudioTrack || localVideoTrack) {
                console.log("Cleaning up media tracks...");
                localAudioTrack?.stop();
                localVideoTrack?.stop();
            }
        };
    }, []);
    
    if(!joined){
        return (
            <div style={{ textAlign: "center", marginTop: "20px" }}>
                {!localVideoTrack && <p>Camera preview unavailable. Please grant camera access.</p>}
                <video autoPlay ref={videoRef} style={{ width: "300px", borderRadius: "10px" }} />
                <input
                    type="text"
                    placeholder="Enter your name"
                    onChange={(e) => setName(e.target.value)}
                    style={{ display: "block", margin: "10px auto", padding: "5px" }}
                />
                <button 
                    onClick={() => setJoined(true)} 
                    disabled={!name.trim()}
                    style={{ padding: "10px 20px", cursor: name.trim() ? "pointer" : "not-allowed" }}
                >
                    Join
                </button>
            </div>
        );
    }

    return <Room name={name} localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} />;

};