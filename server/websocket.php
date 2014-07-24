<?php
	//C:\server\php\php.exe C:\server\htdocs\territory\server\server.prototype.php
	include "websocket.server.php";
	error_reporting(E_ALL);
	set_time_limit(0);
	ob_implicit_flush();
	date_default_timezone_set('UTC');
	
	$address = '0.0.0.0';
	$port = 5002;
	
	$server = new server($address, $port);
	$server->setupSocket();
	$server->run();
?>