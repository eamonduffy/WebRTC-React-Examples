import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { useParams } from "react-router-dom";


const Room = (props) => {
    const { roomID } = useParams();
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const socketRef = useRef();

    useEffect(() => {
        socketRef.current = io.connect("http://localhost:8000");
        socketRef.current.emit("join room", roomID);

        socketRef.current.on("receive message", message => {
            setMessages(messages => [...messages, message]);
        });

        return () => {
            socketRef.current.disconnect();
            console.log('disconnecting from socket')
        };
    }, [roomID]);
    // props.peer, roomID

    const sendMessage = (e) => {
        console.log('roomID:', roomID)
        e.preventDefault();
        const messageObject = {
            body: message,
            roomID,
        };
        socketRef.current.emit("send message", messageObject);
        setMessages(messages => [...messages, messageObject]);
        setMessage("");
    };

    return (
        <div>
            <h1>Chat Room</h1>
            <div>
                {messages.map((message, index) => (
                    <p key={index}>{message.body}</p>
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
