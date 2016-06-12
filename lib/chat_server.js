// var chatServer = require('./lib/chat_server.js');
// chat_server.listen(server); 
var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var nameUsed = [];
var currentRoom = {};

exports.listen = function (server) {
	
	io = socketio.listen(server);
	io.set('log level', 1);
	io.sockets.on('connection', function (socket) {
		
		// 用户连接时给个昵称
		guestNumber = assignGuestName(socket, guestNumber,
			nickNames, nameUsed);

		// 把链接进来的用户放在Lobby聊天室里
		joinRoom(socket, 'Lobby');

		// 处理用户的消息
		handleMessageBroadcasting(socket, nickNames);

		// 处理用户改昵称
		handleNameChangeAttempts(socket, nickNames, nameUsed);

		// 聊天室的创建与变更
		handleRoomJoining(socket);

		// 用户发出请求时，向其提供已经被占用的聊天室列表
		socket.on('rooms', function () {
			socket.emit('rooms', io.sockets.manage.rooms);
		});

		// 定义断开链接后的处理逻辑
		handleClientDisconnection(socket, nickNames, nameUsed);
	});
}

// 分配昵称
function assignGuestName(socket, guestNumber, nickNames, nameUsed) {
	// 生成新昵称
	var name = 'Guest' + guestNumber;
	// 把用户昵称跟客户端id关联
	nickNames[socket.id] = name;
	// 让用户知道他们的昵称
	socket.emit('nameResult', {
		success: true,
		name: name
	});
	// 存放已经被占用的昵称
	nameUsed.push(name);
	// 增加用来生成昵称的计数器
	return guestNumber + 1;
}

// 进入聊天室
function joinRoom(socket, room) {
	// 让用户进入房间
	socket.join(room);
	// 记录用户的当前房间
	currentRoom[socket.id] = room;
	socket.emit('joinResult', {room: room});
	// 让房间里的用户知道有新用户
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + 'has joined ' + room + '.'
	});

	var userInRoom = io.socket.clients(room);
	// 如果不止一个用户，就汇总出所有的用户
	if (userInRoom.length > 1) {
		var userInRoomSummary = 'users current in' + room +':';
		for (var index in userInRoom) {
			var userSocketId = userInRoom[index].id;
			if (userSocketId != socket.id) {
				if (index > 0) {
					userInRoomSummary += ', ';
				}
				userInRoomSummary += nickNames[userSocketId];
			}
			
		}
		userInRoomSummary += '.';
		socket.emit('message', {text: userInRoomSummary});
	}
}

// 用户断开链接
function handleClientDisconnection(socket) {
	socket.on('disconnect', function () {
		var nameIndex = nameUsed.indexOf(nickNames[socket.id]);
		delete nameUsed[nameIndex];
		delete nickNames [socket.id];
	});
}

// 创建房间
function handleRoomJoining(socket) {
	socket.on('join', function (room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

// 发送消息
function handleMessageBroadcasting(socket) {
	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ':' + message.text
		});
	})
}

// 处理昵称变更
function handleNameChangeAttempts(socket, nickNames, nameUsed) {
	socket.on('nameAttempt', function (name) {
		if (name.indexOf('Guest') == 0) {
			socket.emit('nameResult', {
				success: false,
				message: 'name cannot begin with Guest.'
			});
		}else{
			if (name.indexOf(name) == -1) {
				var previousName = nickNames[socket.id];
				var previousNameIndex = nameUsed.indexOf(previousName);
				nameUsed.push(name);
				nickNames[socket.id] = name;
				delete nameUsed[previousNameIndex];
				socket.emit('nameResult', {
					success: true,
					name: name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' is now known as ' + name + '.'
				});
			}else{
				socket.emit('nameResult', {
					success: true,
					message: 'that name is already in use.'
				});
			}
		}
	});
}