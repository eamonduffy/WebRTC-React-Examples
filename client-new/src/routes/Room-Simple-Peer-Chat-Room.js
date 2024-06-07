import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import { useParams } from "react-router-dom";
import * as process from 'process';

const Room = () => {
    const { roomID } = useParams();
    const [peers, setPeers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const socketRef = useRef();
    const peersRef = useRef([]);
    const messagesRef = useRef([]);

    useEffect(() => {
        socketRef.current = io.connect("http://localhost:8000");
        socketRef.current.emit("join room", roomID);

        socketRef.current.on("all users", users => {
            const peers = [];
            users.forEach(userID => {
                const peer = createPeer(userID, socketRef.current.id);
                peersRef.current.push({
                    peerID: userID,
                    peer,
                });
                peers.push(peer);
            });
            setPeers(peers);
        });

        socketRef.current.on("user joined", payload => {
            const peer = addPeer(payload.signal, payload.callerID);
            peersRef.current.push({
                peerID: payload.callerID,
                peer,
            });
            setPeers(users => [...users, peer]);
        });

        socketRef.current.on("receiving returned signal", payload => {
            const item = peersRef.current.find(p => p.peerID === payload.id);
            item.peer.signal(payload.signal);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    const createPeer = (userToSignal, callerID) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal });
        });

        peer.on("data", handleData);

        return peer;
    };

    const addPeer = (incomingSignal, callerID) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID });
        });

        peer.on("data", handleData);

        peer.signal(incomingSignal);

        return peer;
    };

    const handleData = (data) => {
        const decodedMessage = new TextDecoder().decode(data);
        if (!decodedMessage.startsWith(socketRef.current.id)) {
            setMessages(messages => [...messages, decodedMessage]);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        const messageObject = `${socketRef.current.id}: ${message}`;
        setMessages(messages => [...messages, messageObject]);
        peersRef.current.forEach(peer => {
            peer.peer.send(new TextEncoder().encode(messageObject));
        });
        setMessage("");
    };

    return (
        <div>
            <h1>Chat Room</h1>
            <div>
                {messages.map((message, index) => (
                    <p key={index}>{message}</p>
                ))}
            </div>
            <form onSubmit={sendMessage}>
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

export default Room;
