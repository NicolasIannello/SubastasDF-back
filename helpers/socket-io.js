let io;
exports.socketConnection = (server) => {
    io = require('socket.io')(server,{
        cors: {
            origin: process.env.LINK,
        },
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;    
        if (token==process.env.SOCKET_TOKEN) {
            next();
        } else {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        //console.log('a user connected '+socket.id);
            
        socket.on('message', (data) => {
            socket.join(data);
            //console.log('Received message: '+data+" user: "+socket.id);
            //io.emit('message', data);
        });

        socket.on('disconnect', () => {
            //console.log('user disconnected '+socket.id);
        });
    });
};

exports.sendMessage = (roomId, key, message) => io.to(roomId).emit(key, message);

exports.getRooms = () => io.sockets.adapter.rooms;