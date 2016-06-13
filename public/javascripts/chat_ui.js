function divEscapedContentElement(message) {
	return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
	return $('<div></div>').html('<i>'+ message+'</i>');
}

function processUserInput(chatApp, socket) {
	var message = $('#send-message').val();
	var systemMessage;

	if (message.charAt(0) == '/') {
		 systemMessage = chatApp.processCommand(message);
		 if (systemMessage) {
		 	$('#messages').append(divSystemContentElement(systemMessage));
		 }
	}else{
		chatApp.sendMessage($('room').text(), message);
		var mess='_我_:'+message;
		socket.on('my_nick',function (my) {
			if (my.success) {
				mess='_我_('+my.my_nick+'):'+message;
				console.log(mess);
				$('#messages').append(divEscapedContentElement(mess));
				$('#messages').scrollTop($('#messages').prop('scrollHeight'));
			}else{
				$('#messages').append(divEscapedContentElement(mess));
				$('#messages').scrollTop($('#messages').prop('scrollHeight'));
			}
		});
		
		
		
	}
	$('#send-message').val('');
}



var socket = io.connect();
// var socket= io('http://localhost:3000');
$(document).ready(function () {

	
	// alert('connecting...')
	// console.log('connecting..2..')
 //        socket.on('news', function (data) {//接收到服务器发送过来的名为'new'的数据  
 //        	console.log(data.hello);//data为应服务器发送过来的数据。  
 //        	socket.emit('my new event', { my:'new data' });//向服务器发送数据，实现双向数据传输  
 //        });

 //        socket.on('other', function (data) {//接收另一个名为'other'数据，  
 //                console.log(data.hello);  
 //                socket.emit('event1', { my:'other data' });  
 //        });  
        

	alert('ready');
	var chatApp = new Chat(socket);

	socket.on('nameResult', function (result) {
		var message;
		if (result.success) {
			message = 'you are now known as ' + result.name + '.';
		}else{
			message = result.message;
		}

		$('#messages').append(divSystemContentElement(message));
	});

	socket.on('joinResult', function (result) {
		$('#room').text('当前房间为：'+result.room);
		$('#room').css({'text-align':'center','color':'red'});
		$('#messages').append(divSystemContentElement('(房间变更)room changed.'));
	});

	socket.on('message', function (message) {
		var  newElement = $('<div></div>').text(message.text);
		$('#messages').append(newElement);
	});

	socket.on('rooms', function (rooms) {
		$('#room-list').empty();

		for (var room in rooms) {
			room = room.substring(1, room.length);
			if (room != '') {
				$('#room-list').append(divEscapedContentElement(room));
			}
		}

		$('#room-list div').click(function () {
			// alert('send-click')
			chatApp.processCommand('/join ' + $(this).text());
			$('#send-message').focus();
		});


	});

		setInterval(function () {
			socket.emit('rooms');
		},1000);

		$('#send-message').focus();

		$('#send-form').submit(function () {
			// alert('submit:'+socket);
			processUserInput(chatApp, socket);
			return false;
		});

});