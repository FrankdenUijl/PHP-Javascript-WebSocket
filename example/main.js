window.addEventListener ? window.addEventListener("load",init,false) : window.attachEvent && window.attachEvent("onload",init);

function init(){
	websocket = new _webSocket('ws://localhost:5002');
	websocket._log._ignoreAll = false;

	websocket._onMessage = function(_msgObject, _type, _sender){
		console.log("Get message:")
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
	
	//websocket._sendAll('message') 
	//websocket._sendUser('message')
	//websocket._sendTeam('message', who)
}