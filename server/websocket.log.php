<?php
	
	class log {
		private $ignore = Array();
		private $ignoreAll = false;
		private $onlyType = "";
		private $base;
		private $logFile;
		
		public function __construct($base = "Main") {
			$this->base = $base;
			$filename = $base.".log";
			//$this->logFile = fopen($filename, "a") or die("Could not open log file.");
		}

		public function msg($msg = "", $type = "Info") {
			if($this->onlyType == ""){
				if(!$this->ignoreAll){
					if(array_search($type, $this->ignore) === false){
						echo date("d-m-Y, H:i")."  ".$this->base."> ".$type.": ".$msg."\n";
					} 
				}
			} else {
				if($this->onlyType == $type){
					echo date("d-m-Y, H:i")."  ".$this->base."> ".$type.": ".$msg."\n";
				}
			}
			//fwrite($this->logFile, date("d-m-Y, H:i")."  ".$this->base."> ".$type.": ".$msg."\n") or die(date("d-m-Y, H:i")."  ".$this->base."> ".$type.": Could not write to log file\n");
		}
		
		public function iqnoreType($type = "Debug") {
			if(array_search($type, $this->ignore) === false){
				array_push ($this->ignore, $type);
			} 
		}
		public function ignoreAll($bool = true) {
			$this->ignoreAll = $bool;
		}
		public function ignoreAllExcept($type = "") {
			$this->ignoreAll = false;
			$this->onlyType = $type;
		}
		public function closeLog(){
			//fclose($this->logFile);
		}
	}
?>