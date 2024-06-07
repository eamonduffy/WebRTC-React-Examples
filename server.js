require('dotenv').config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

const rooms = {};

io.on("connection", socket => {
    socket.on("join room", roomID => {
        console.log('\n## user joining room ##')
        if (rooms[roomID]) {
            if (rooms[roomID].length === 4) {
                socket.emit("room full");
                return;
            }
            if (!rooms[roomID].includes(socket.id)) {
                rooms[roomID].push(socket.id);
            }
        } else {
            rooms[roomID] = [socket.id];
        }
        socket.join(roomID);
        const otherUsers = rooms[roomID].filter(id => id !== socket.id);
        socket.emit("all users", otherUsers);
        console.log('current rooms: ', rooms)

    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on("send message", message => {
        console.log('## sending message ##');
        io.to(message.roomID).emit("receive message", message);
    });

    socket.on("disconnect", () => {
        for (const roomID in rooms) {
            rooms[roomID] = rooms[roomID].filter(id => id !== socket.id);
            if (rooms[roomID].length === 0) {
                delete rooms[roomID];
            }
        }
    });
});

server.listen(process.env.PORT || 8000, () => console.log('server is running on port 8000'));

