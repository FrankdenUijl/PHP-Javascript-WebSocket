<?php
	//include "websocket.log.php";
	
	class user {
		private $socket, $id, $log, $ip, $admin;
		private $dataPrivate = array();
		private $dataGlobal = array();
		
		public function __construct($socket, $version) {
			$this->admin = false;
			$this->socket = $socket;
			socket_getpeername($this->socket, $this->ip);
			$this->id = uniqid();
			$this->log = new log("User $this->id");
			$this->log->msg("User ip:$this->ip is created", "Info");
			$this->version = $version;
			
			$this->sendId();
		}
		
		public function returnAdmin(){
			return $this->admin;
		}
		
		public function setAdmin($bool = true){
			$this->admin = $bool;
			$this->log->msg("Send id", "Debug");
			$msg = '[0, 1]';
			$this->send($msg);
		}
		
		public function getId() {
			return $this->id;
		}
		
		public function returnSocket(){
			return $this->socket;
		}
		
		public function addData($key, $value, $private = false) {
			if($private){
				$this->dataPrivate[$key] = $value;
			} else {
				$this->dataGlobal[$key] = $value;
			}
			$this->log->msg("$key added $value", "Debug");
		}
		
		public function getData($key, $private = false) {
			if($private){
				return $this->dataPrivate[$key];
			} else {
				return $this->dataGlobal[$key];
			}
			
			$this->send($msg);
		}	
		
		public function sendData($key, $private = false) {
			if($private){
				$msg = '[1, 0, ["'.$this->id.'", 0, "'.$key.'", "'.$this->dataPrivate[$key].'"]]';
			} else {
				$msg = '[1, 0, ["'.$this->id.'", 1, "'.$key.'", "'.$this->dataGlobal[$key].'"]]';
			}
			$this->send($msg);
		}
		
		public function sendId() {
			$this->log->msg("Send id", "Debug");
			$msg = '[0, 0, "'.$this->id.'"]';
			$this->send($msg);
		}
		
		public function send($msg) {
			$this->log->msg("Send $msg", "Info");
			$msg = $this->encode($msg);
			socket_write($this->socket, $msg, strlen($msg));
		}
		
		public function read() {
			$msg = socket_read($this->socket, 2048, PHP_BINARY_READ);
			if (!$msg = trim($msg)) {
				$msg = false;
			} else {
				$msg = $this->decode($msg);
				$this->log->msg("Recieved $msg", "Info");
			}
			
			return $msg;
		}
		
		public function __destruct() {
			$this->log->msg("User ip:$this->ip disconnected", "Info");
			socket_close($this->socket);
			$this->log->closeLog();
		}
		
		private function encode($text) {
			$b1 = 0x80 | (0x1 & 0x0f);
			$length = strlen($text);

			if($length <= 125)
				$header = pack('CC', $b1, $length);
			elseif($length > 125 && $length < 65536)
				$header = pack('CCS', $b1, 126, $length);
			elseif($length >= 65536)
				$header = pack('CCN', $b1, 127, $length);

			return $header.$text;
		}

		private function decode($payload) {
			$length = ord($payload[1]) & 127;
		 
			if($length == 126) {
				$masks = substr($payload, 4, 4);
				$data = substr($payload, 8);
			}
			elseif($length == 127) {
				$masks = substr($payload, 10, 4);
				$data = substr($payload, 14);
			}
			else {
				$masks = substr($payload, 2, 4);
				$data = substr($payload, 6);
			}
		 
			$text = '';
			for ($i = 0; $i < strlen($data); ++$i) {
				$text .= $data[$i] ^ $masks[$i%4];
			}
			return $text;
		}
	}	
?>