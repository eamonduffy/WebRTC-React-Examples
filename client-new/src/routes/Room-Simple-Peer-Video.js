import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import { useParams } from "react-router-dom";

const Room = () => {
    const { roomID } = useParams();
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideoRef = useRef();
    const peersRef = useRef([]);

    useEffect(() => {
        socketRef.current = io.connect("http://localhost:8000");

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                userVideoRef.current.srcObject = stream;
                socketRef.current.emit("join room", roomID);

                socketRef.current.on("all users", users => {
                    const peers = [];
                    users.forEach(userID => {
                        if (userID !== socketRef.current.id) {
                            const peer = createPeer(userID, socketRef.current.id, stream);
                            peersRef.current.push({
                                peerID: userID,
                                peer,
                            });
                            peers.push(peer);
                        }
                    });
                    setPeers(peers);
                });

                socketRef.current.on("user joined", payload => {
                    const peer = addPeer(payload.signal, payload.callerID, stream);
                    peersRef.current.push({
                        peerID: payload.callerID,
                        peer,
                    });
                    setPeers(users => [...users, peer]);
                });

                socketRef.current.on("receiving returned signal", payload => {
                    const item = peersRef.current.find(p => p.peerID === payload.id);
                    if (item) {
                        item.peer.signal(payload.signal);
                    }
                });
            })
            .catch(error => {
                console.error('Error accessing media devices.', error);
            });

        return () => {
            socketRef.current.disconnect();
        };
    }, [roomID]);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal });
        });

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID });
        });

        peer.signal(incomingSignal);

        return peer;
    }

    return (
        <div>
            <h1>Video Chat Room</h1>
            <div>
                <video muted ref={userVideoRef} autoPlay playsInline />
                {console.log('peers: ', peers)}
                {peers.map((peer, index) => {
                    return (
                        <video key={index} playsInline autoPlay />
                    );
                })}
            </div>
        </div>
    );
};

export default Room;
