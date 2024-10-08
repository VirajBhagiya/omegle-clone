import { useEffect, useRef, useState } from "react"
import { Room } from "./Room";

export const Landing = () => {
    const [name, setName] = useState("");
    const [localAudioTrack, setLocalAudioTrack] = useState<MediaStreamTrack | null>(null);
    const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [joined, setJoined] = useState(false);

    const getCam = async() => {
        const stream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        const audioTrack = (await stream).getAudioTracks()[0];
        const videoTrack = (await stream).getVideoTracks()[0];
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        if(!videoRef.current){
            return;
        }
        videoRef.current.srcObject = new MediaStream([videoTrack]);
        videoRef.current.play();
    }
    useEffect(() => {
        if(videoRef && videoRef.current){
            getCam();
        }
    }, [videoRef]);
    
    if(!joined){
    
    return <div>
            <video autoPlay ref={videoRef}></video>
            <input type="text" onChange={(e) => {
                setName(e.target.value);
            }}>
            </input>
            <button onClick={() => {
                setJoined(true);
            }}>Join</button>
        </div>
    }

    return <Room name={name} localAudioTrack={localAudioTrack} localVideoTrack={localVideoTrack} />
    
}