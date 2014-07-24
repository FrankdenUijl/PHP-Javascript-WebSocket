function _log(_base){
	this._ignore = [];
	this._ignoreAll = false;
	this._onlyType = "";
	this._base = _base;
	this._logs = [];
}

_log.prototype._msg = function(_msg, _type) {
	if(this._onlyType == ""){
		if(!this._ignoreAll){
			if(this._ignore.indexOf(_type) == -1){
				var _log = this._base+"> "+_type+": "+_msg;
				console.log(_log);
				this._logs.push(_log)
			} 
		}
	} else {
		if(this._onlyType == _type){
			var _log = this._base+"> "+_type+": "+_msg;
			console.log(_log);
			this._logs.push(_log)
		}
	}
}
	
_log.prototype._iqnoreType = function(_type) {
	if(this._ignore.indexOf(_type) == -1){
		this._ignore.push(_type);
	} 
}

_log.prototype._ignoreAll = function(_bool) {
	this._ignoreAll = _bool;
}

_log.prototype._ignoreAllExcept = function (_type) {
	this._ignoreAll = false;
	this._onlyType = _type;
}

function _webSocket(_host){
	this._host = _host;
	this._admin = false;
	this._users = new Array();
	this._id = "undefined";
	this._dataPrivate = [];
	this._dataGlobal = [];
	this._messageRecieved = [];
	this._messageSend = [];
	this._connectionOpen = false;
	
	this._log = new _log("socket");
	
	this.DEFS = {
		"IDENTIFICATION" : {
			"ID" : 0, 
			"HANDLER" : {
				"SET_ID" : 0,
				"SET_ADMIN" : 1,
				"NEW_PLAYER" : 2,
				"DISCONNECT_PLAYER" : 3,
				"EXISTING_PLAYERS" : 4
			}
		},
		"DATA" : {
			"ID" : 1, 
			"HANDLER" : {
				"SET_DATA" : 0,
				"GET_DATA" : 1
			}
		},
		"MESSAGE" : {
			"ID" : 2, 
			"HANDLER" : {
				"TO_ALL" : 0,
				"TO_PLAYER" : 1,
				"TO_TEAM" : 2
			}
		},
		"INFO" : {
			"ID" : 3, 
			"HANDLER" : {
				"GLOBAL" : 0
			}
		},
		"ERROR" : {
			"ID" : 4, 
			"HANDLER" : {
				"CONNECTION" : 0,
				"IDENTIFICATION" : 1,
				"OTHER" : 2
			}
		},
		"ACTION" : {
			"ID" : 5, 
			"HANDLER" : {
				"DISCONNECT" : 0,
				"STOP_SERVER" : 1,
			} 
		}
	}
	
	
}

_webSocket.prototype._returnId = function(){
	return this._id;
}

_webSocket.prototype._startConnection = function(){
	this._connection = new WebSocket(this._host);
	
	var that = this;
	this._connection.onopen = function(e){that._open()};
	this._connection.onclose = function(e){that._close()};
	this._connection.onerror = function(e){that._error(e)};
	this._connection.onmessage = function(e){that._message(e)};
}

_webSocket.prototype._open = function(){
	this._connectionOpen = true;
	this._log._msg("Connection Open", "Info");
	this._onopen();
}

_webSocket.prototype._close = function(){
	this._connectionOpen = false;
	
	this._log._msg("Connection Close", "Info");
	this._onclose();
}


_webSocket.prototype._error = function(error){
	this._log._msg(error.data, "Error");
	this._connection.close();
	this._close();
}

_webSocket.prototype._message = function(_e){
	this._log._msg(_e.data, "RawData");
	
	try{
		var _package = JSON.parse(_e.data);
	} catch (e){
		this._log._msg("Data corrupted", "Error");
		var msg = [this.DEFS.ERROR.ID, this.DEFS.ERROR.HANDLER.CONNECTION];	
		var a = {
			"rawMsg" : JSON.stringify(msg),
		}
		this._messageSend.push(a);
		//this._connection.send(a.rawMsg);
		this._log._msg("Sending error message", "Info");
	}
	
	if(_package[0] == this.DEFS.IDENTIFICATION.ID){
		if(_package[1] == this.DEFS.IDENTIFICATION.HANDLER.SET_ID){
			if(this._id == "undefined"){
				this._id = _package[2];
				this._log._msg("New ID ="+this._id, "Info");
			} else {
				this._log._msg("ID already set", "Error");
				var msg = [this.DEFS.ERROR.ID, this.DEFS.ERROR.HANDLER.IDENTIFICATION];
				var a = {
					"rawMsg" : JSON.stringify(msg),
				}
				this._messageSend.push(a);
				//this._connection.send(a.rawMsg);
				this._log._msg("Sending error message", "Info");
			}
		} else if(_package[1] == this.DEFS.IDENTIFICATION.HANDLER.SET_ADMIN){
			this._admin = true;
			this._log._msg("User is now admin", "Info");
		} else if(_package[1] == this.DEFS.IDENTIFICATION.HANDLER.NEW_PLAYER){
			this._users.push(_package[2]);
			this._onNewUser(_package[2]);
			this._log._msg("New user", "Info");
		} else if(_package[1] == this.DEFS.IDENTIFICATION.HANDLER.EXISTING_PLAYERS){
			/* var a = new Array();
			for (var i = 0; i < _package[2].length; i++) {
				a.push();
			} */
			this._users = this._users.concat(_package[2]);
			this._onExistingUsers(_package[2]);
			this._log._msg(_package[2].length+" existing users", "Info");
		} else if(_package[1] == this.DEFS.IDENTIFICATION.HANDLER.DISCONNECT_PLAYER){
			var _index = this._users.indexOf(_package[2]);
			if(_index == -1)
				this._users.splice(_index, 1);
			this._onUserDisconnect(_package[2]);
			this._log._msg("User disconnects", "Info");
		} else {
			this._log._msg("Unknown ("+_package[1]+") handler at channel ("+_package[0]+")", "Error");
			var msg = [this.DEFS.ERROR.ID, this.DEFS.ERROR.HANDLER.OTHER];
				var a = {
				"rawMsg" : JSON.stringify(msg),
			}
			this._messageSend.push(a);
			//this._connection.send(a.rawMsg);
			this._log._msg("Sending error message", "Info");
		}
	} else if(_package[0] == this.DEFS.DATA.ID){
		if(_package[1] == this.DEFS.DATA.HANDLER.SET_DATA){
			if(_package[2][0] == this._id){
				if(_package[2][1] == 0){
					this._dataPrivate[_package[2][2]] = _package[2][3];
				} else {
					this._dataGlobal[_package[2][2]] = _package[2][3];
				}
			}
			this._returnData(_package[2][0], _package[2][2], _package[2][3]);
			this._log._msg("Recieved data: Key:"+_package[2][2]+" value:"+_package[2][3]+" from user"+_package[2][0], "Info");
		} else {
			this._log._msg("Unknown ("+_package[1]+") handler at channel ("+_package[0]+")", "Error");
			var msg = [this.DEFS.ERROR.ID, this.DEFS.ERROR.HANDLER.OTHER];
			var a = {
				"rawMsg" : JSON.stringify(msg),
			}
			this._messageSend.push(a);
			//this._connection.send(a.rawMsg);
			this._log._msg("Sending error message", "Info");
		}
	} else if(_package[0] == this.DEFS.MESSAGE.ID){
		if(_package[1] == this.DEFS.MESSAGE.HANDLER.TO_ALL){
			var _currentDate = new Date();
			var a = {
				"date" : _currentDate,
				"sender" : _package[2][0],
				"type" : "GLOBAL_MESSAGE",
				"message" : _package[2][1]
			};
			this._messageRecieved.push(a);
			this._onMessage(_package[2][1], "GLOBAL_MESSAGE", _package[2][0]);
		} else if(_package[1] == this.DEFS.MESSAGE.HANDLER.TO_PLAYER){
			var _currentDate = new Date();
			var a = {
				"date" : _currentDate,
				"sender" : _package[2][0],
				"type" : "PRIVATE_MESSAGE",
				"message" : _package[2][1]
			};
			this._messageRecieved.push(a);
			this._onMessage(_package[2][1], "PRIVATE_MESSAGE", _package[2][0]);
		} else if(_package[1] == this.DEFS.MESSAGE.HANDLER.TO_TEAM){
			var _currentDate = new Date();
			var a = {
				"date" : _currentDate,
				"sender" : _package[2][0],
				"type" : "TEAM_MESSAGE",
				"message" : _package[2][1]
			};
			this._messageRecieved.push(a);
			this._onMessage(_package[2][1], "TEAM_MESSAGE", _package[2][0]);
		} else {
			this._log._msg("Unknown ("+_package[1]+") handler at channel ("+_package[0]+")", "Error");
			var msg = [this.DEFS.ERROR.ID, this.DEFS.ERROR.HANDLER.OTHER];
				var a = {
				"rawMsg" : JSON.stringify(msg),
			}
			this._messageSend.push(a);
			//this._connection.send(a.rawMsg);
			this._log._msg("Sending error message", "Info");
		}
	} else if(_package[0] == this.DEFS.INFO.ID){
		this._log._msg(_package[1]+"-"+_package[2], "Info");
	} else if(_package[0] == this.DEFS.ERROR.ID){
		if(_package[1] == this.DEFS.ERROR.HANDLER.CONNECTION){
			this._log._msg("Last sended package corrupted", "Error");
			var msg = this._messageSend[this._messageSend.length-1].rawMsg;
				var a = {
				"rawMsg" : JSON.stringify(msg),
			}
			this._messageSend.push(a);
			//this._connection.send(a.rawMsg);
			this._log._msg("Sending error message", "Info");
		} else if(_package[1] == this.DEFS.ERROR.HANDLER.IDENTIFICATION){
			this._log._msg("You are not authorized", "Error");
		} else if(_package[1] == this.DEFS.ERROR.HANDLER.OTHER){
			this._log._msg(_package[2], "Error");
		}
	} else {
		this._log._msg("Unknown ("+_package[0]+") channel", "Error");
		var msg = [this.DEFS.ERROR.ID, this.DEFS.ERROR.HANDLER.OTHER];
		var a = {
			"rawMsg" : JSON.stringify(msg),
		}
		this._messageSend.push(a);
		//this._connection.send(a.rawMsg);
		this._log._msg("Sending error message", "Info");
	} 
}

_webSocket.prototype._sendAll = function(_msg){
	var msg = [this.DEFS.MESSAGE.ID, this.DEFS.MESSAGE.HANDLER.TO_ALL, _msg];
	var a = {
		"rawMsg" : JSON.stringify(msg),
	}
	this._messageSend.push(a);
	this._connection.send(a.rawMsg);
	this._log._msg("Sending:"+JSON.stringify(msg), "RawData");
}

_webSocket.prototype._sendUser = function(_msg, _reciever){
	console.log("send to user");
	var msg = [this.DEFS.MESSAGE.ID, this.DEFS.MESSAGE.HANDLER.TO_PLAYER, _reciever, _msg];
	var a = {
		"rawMsg" : JSON.stringify(msg),
	}
	this._messageSend.push(a);
	this._connection.send(a.rawMsg);
	this._log._msg("Sending:"+JSON.stringify(msg), "RawData");
}

_webSocket.prototype._sendTeam = function(_msg, _reciever){
	var msg = [this.DEFS.MESSAGE.ID, this.DEFS.MESSAGE.HANDLER.TO_TEAM, _reciever];
	var a = {
		"rawMsg" : JSON.stringify(msg),
	}
	this._messageSend.push(a);
	this._connection.send(a.rawMsg);
	this._log._msg("Sending:"+JSON.stringify(msg), "RawData");
}

_webSocket.prototype._setData = function(_value, _key, _user, _private){
	if(_user == this._user){
		if(_private){
			this._dataPrivate[_key] = _value;
		} else {
			this._dataGlobal[_key] = _value;
		}
	}
	
	var msg = [this.DEFS.DATA.ID, this.DEFS.DATA.HANDLER.SET_DATA, [_user, _value, _key, _private]];
	var a = {
		"rawMsg" : JSON.stringify(msg),
	}
	this._messageSend.push(a);
	this._connection.send(a.rawMsg);
	this._log._msg("Set data:"+JSON.stringify(msg), "RawData");
}

_webSocket.prototype._getData = function(_key, _user, _private){
	if(_user == this._user){
		if(_private){
			var data = this._dataPrivate[_key];
		} else {
			var data = this._dataGlobal[_key];
		}
	}
	if(data && _private && _user == this._id){
		this._returnData(_user, _key, data);
	} else {
		var msg = [this.DEFS.DATA.ID, this.DEFS.DATA.HANDLER.GET_DATA, [_user, _key, _private]];
		var a = {
			"rawMsg" : JSON.stringify(msg),
		}
		this._messageSend.push(a);
		this._connection.send(a.rawMsg);
		this._log._msg("Get data:"+JSON.stringify(msg), "RawData");
	}
}

_webSocket.prototype._setToAdmin = function(){
	if(!this._admin){
		var msg = [0, 1];
		var a = {
			"rawMsg" : JSON.stringify(msg),
		}
		this._messageSend.push(a);
		this._connection.send(a.rawMsg);
		this._log._msg("Asked to be Admin", "Info");
	}
}



_webSocket.prototype._closeTheServer = function(){
	if(this._admin){
		var msg = [this.DEFS.ACTION.ID, this.DEFS.ACTION.HANDLER.STOP_SERVER];
		var a = {
			"rawMsg" : JSON.stringify(msg),
		}
		this._messageSend.push(a);
		this._connection.send(a.rawMsg);
	} else {
		this._log._msg("You are not authorized to stop the server", "Error");
	}
}

_webSocket.prototype._disconnect = function(){
	this._connection.close();
	this._close();
}

_webSocket.prototype._returnData = function(_user, _key, _value){
	return false;
}

_webSocket.prototype._onMessage = function(_msg, _type, _sender){
	return false;
}

_webSocket.prototype._onNewUser = function(_id){
	return false;
}

_webSocket.prototype._onExistingUsers = function(_users){
	return false;
}

_webSocket.prototype._onUserDisconnect = function(_id){
	return false;
}

_webSocket.prototype._onclose = function(){
	return false;
}

_webSocket.prototype._onopen = function(){
	return false;
}