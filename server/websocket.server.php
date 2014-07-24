<?php
	include "websocket.log.php";
	include "websocket.user.php";
	
	class server {
		private $sock, $address, $port, $running, $users, $log, $DEFS;

		public function __construct($address = '0.0.0.0', $port = 5002) {
			$this->DEFS = json_decode('{
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
						"STOP_SERVER" : 1
					} 
				}
			}');
		
			$this->address = $address;
			$this->version = 0.1;
			$this->port = $port;
			$this->running = false;
			$this->log = new log("Server");
			//$this->log->iqnoreType("Info");
			//$this->log->iqnoreType("Debug");
			$this->log->msg("Server created $address:$port", "Info");
		}
		
		public function setupSocket() {
			if (($this->sock = socket_create(AF_INET, SOCK_STREAM, SOL_TCP)) === false) {
				$this->log->msg("socket_create() failed: " . socket_strerror(socket_last_error()), "Error");
				exit;
			} 

			if (socket_bind($this->sock, $this->address, $this->port) === false) {
				$this->log->msg("socket_bind() failed: " . socket_strerror(socket_last_error($this->sock)), "Error");
				exit;
			}
			
			if (socket_listen($this->sock, 5) === false) {
				$this->log->msg("socket_listen() failed: " . socket_strerror(socket_last_error($this->sock)), "Error");
				exit;
			}
			$this->log->msg("Socket succesfull created", "Info");
		}
		
		public function run() {
			$this->log->msg("Server started to run", "Info");
			$this->running = true;
			
			$this->users = array();
			do {
				$read = array($this->sock);
				for($i=0; $i < count($this->users); $i++){
					array_push($read, $this->users[$i]->returnSocket());
				}
				
				$write=NULL;
				$except=NULL;
				if(socket_select($read,$write,$except, $tv_sec = 5) < 1){
					continue;
				}
				if (in_array($this->sock, $read)) {        
					if (($userSocket = socket_accept($this->sock)) === false) {
						$this->log->msg("socket_accept() has failed ".socket_strerror(socket_last_error($this->sock)), "Error");
						break;
					}

					if (false === ($headers = socket_read($userSocket, 2048, PHP_BINARY_READ))) {
						$this->log->msg("socket_read() has failed ".socket_strerror(socket_last_error($this->sock)), "Error");
						break;
					}
					
					if(($handshake = $this->handshake($headers)) === false){
						$this->log->msg("handshake has failed", "Error");
					} else {
						socket_write($userSocket, $handshake);
					}
					$temp = new user($userSocket, $this->version);
					$userArray = array();
					foreach ($this->users as $otherUser) {
						$this->log->msg("Letting ".$otherUser->getId()." know there is a new player", "Info");
						$otherUser->send('[0, 2, "'.$temp->getId().'"]');
						array_push($userArray, $otherUser->getId());
					}
					$temp->send('[0, 4, '.json_encode($userArray).']');
					array_push($this->users, $temp);
				}

				foreach ($this->users as $key => $user) {       
					if (in_array($user->returnSocket(), $read)) {
						if (false === ($msg = $user->read())) {
							array_splice($this->users, $key, 1);
							foreach ($this->users as $otherUser) {
								$this->log->msg("Letting ".$otherUser->getId()." know player has disconnected", "Info");
								$otherUser->send('[0, 3, "'.$user->getId().'"]');
							}
							unset($user);
							continue;
						}
						
						$package = json_decode ($msg);
						
						if($package){
							if($package[0] == $this->DEFS->IDENTIFICATION->ID){
								if($package[1] == $this->DEFS->IDENTIFICATION->HANDLER->SET_ADMIN){
									$user->setAdmin();
									//$user->send('[0, 1]');
								}
							} else if($package[0] == $this->DEFS->DATA->ID){
								if($package[1] == $this->DEFS->DATA->HANDLER->SET_DATA){
									if($user->getId() == $package[2][0]){
										//$private = $package[2][3] == 0 ? true : false;
										$user->addData($package[2][2], $package[2][1], $package[2][3]);
									} else {
										foreach ($this->users as $otherUser) {
											if($otherUser->getId() == $package[2][0]){
												$otherUser->addData($package[2][2], $package[2][1], false);
											}
										}
									}
								} else if($package[1] == $this->DEFS->DATA->HANDLER->GET_DATA){
									if($user->getId() == $package[2][0]){
										//$private = $package[2][2] == 0 ? true : false;
										$user->sendData($package[2][1], $package[2][2]);
									} else {
										foreach ($this->users as $otherUser) {
											if($otherUser->getId() == $package[2][0]){
												$value = $otherUser->getData($package[2][1], false);
												$user->send('[1, 0, ["'.$otherUser->getId().'", 1, "'.$package[2][1].'","'.$value.'"]]');
											}
										}
									}
								}
							} else  if($package[0] == $this->DEFS->MESSAGE->ID){
								if($package[1] == $this->DEFS->MESSAGE->HANDLER->TO_ALL){
									foreach ($this->users as $otherUser) {
										if($otherUser->getId() != $user->getId()){
											$otherUser->send('[2, 0, ["'.$user->getId().'", '.$package[2].']]');
										}
									}
								} else if($package[1] == $this->DEFS->MESSAGE->HANDLER->TO_PLAYER){
									foreach ($this->users as $otherUser) {
										if($otherUser->getId() == $package[2]){
											$otherUser->send('[2, 1, ["'.$user->getId().'", '.$package[3].']]');
										}
									}
								} else if($package[1] == $this->DEFS->MESSAGE->HANDLER->TO_TEAM){
									foreach ($package[2][0] as $userId) {
										foreach ($this->users as $otherUser) {
											if($otherUser->getId() == $userId){
												$otherUser->send('[2, 2, ["'.$user->getId().'", '.$package[3].']]');
											}
										}
									}
								}
							} else if($package[0] == $this->DEFS->ERROR->ID){
								if($package[1] == $this->DEFS->ERROR->HANDLER->CONNECTION){
									$this->log->msg("Client recieved curropted data", "Error");
								} else if($package[1] == $this->DEFS->ERROR->HANDLER->IDENTIFICATION){
									$this->log->msg("IDENTIFICATION ERROR", "Error");
								} else if($package[1] == $this->DEFS->ERROR->HANDLER->OTHER){
									$this->log->msg($package[2], "Error");
								}
							} else if($package[0] == $this->DEFS->ACTION->ID){
								if($package[1] == $this->DEFS->ACTION->HANDLER->STOP_SERVER){
									if($user->returnAdmin()){
										$this->stop();
									} else {
										$user->send('[4, 1]');
									}
								}
							}
						} else {
							$this->log->msg("Recieved corrupted data", "Error");
							$user->send('[4, 0]');
						}
						
					} 
					
				} 
			} while ($this->running);
		}
		
		private function stop() {
			$this->log->msg("Server stopped running", "Info");
			$this->log->closeLog();
			$this->running = false;
			socket_close($this->sock);
			exit;
		}
		
		public function __destruct() {
			if($this->running){
				$this->log->msg("Server forced stopped", "Info");
				$this->log->closeLog();
				$this->running = false;
				socket_close($this->sock);
				exit;
			}
		}
		
		private function handshake($headers) {
			if(preg_match("/Sec-WebSocket-Version: (.*)\r\n/", $headers, $match))
				$version = $match[1];
			else {
				$this->log->msg("preg_match failed", "Error");
				return false;
			}
			if($version == 13) {
				if(preg_match("/GET (.*) HTTP/", $headers, $match))
					$root = $match[1];
				if(preg_match("/Host: (.*)\r\n/", $headers, $match))
					$host = $match[1];
				if(preg_match("/Origin: (.*)\r\n/", $headers, $match))
					$origin = $match[1];
				if(preg_match("/Sec-WebSocket-Key: (.*)\r\n/", $headers, $match))
					$key = $match[1];

				$acceptKey = $key.'258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
				$acceptKey = base64_encode(sha1($acceptKey, true));
		 
				$upgrade = "HTTP/1.1 101 Switching Protocols\r\n".
						   "Upgrade: websocket\r\n".
						   "Connection: Upgrade\r\n".
						   "Sec-WebSocket-Accept: $acceptKey".
						   "\r\n\r\n";
						   
				return $upgrade;
			}
			else {
				$this->log->msg("Wrong version, version:".$version, "Error");
				return false;
			}
		}
	}
?>