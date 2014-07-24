PHP-Javascript-WebSocket
========================

PHP realtime connection with javascript via html5 websocket

This works by creating a connection between PHP and javascript. With this you can make a small chatroom or a multiplayer game.

## Features

This is not stable enough when dealing with alot of messages or connections! 

* Multiple connections
* Different rooms
* Sending message to an user, room or all the users
* Easy to use! You only have to program in javascript to make it work
* No worries about the handshake
* Admin user

## Examples

Planning to make a chatroom example

## How to use

First you need to run the PHP server, this is done in the command prompt in windows.

-->php websocket.php

``` js
websocket = new _webSocket('ws://localhost:5002');
websocket._log._iqnoreType("Info") // ignore info message in to console.log
websocket._log._iqnoreType("Error") // ignore Errors
websocket._log._iqnoreType("RawData") // ignore rawdata coming form the server

websocket._onMessage = function(_msgObject, _type, _sender){
	console.log("Get message: "+_msgObject)
	console.log(_msgObject)
	console.log("type: "+_type)
	console.log("sender: "+_sender)
}

websocket._onNewUser = function(_id){
	console.log("new user id:"+_id)
}

websocket._onExistingUsers = function(_users){
	console.log("Get all existing players")
	console.log(_users)
}

websocket._onUserDisconnect = function(_id){
	console.log("User disconnected")
}

websocket._onclose = function(){
	console.log("Connection Close")
}

websocket._onopen = function(){
	console.log("Connection open")
}

//functions to send messages:

websocket._sendAll('message') 
websocket._sendUser('message')
websocket._sendTeam('message', who)
```
