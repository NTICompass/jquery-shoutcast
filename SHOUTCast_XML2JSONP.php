<?php
$url = $_GET['url'];
$callback = $_GET['callback'];

// http://wiki.winamp.com/wiki/SHOUTcast_DNAS_Server_2_XML_Reponses#General_Server_Summary
$json = array(
	'currentlisteners' => NULL,
	'peaklisteners' => NULL,
	'maxlisteners' => NULL,
	'uniquelisteners' => NULL,
	'averagetime' => NULL,
	'servergenre' => NULL,
	'serverurl' => NULL,
	'servertitle' => NULL,
	'songtitle' => NULL,
	'nexttitle' => NULL,
	#'irc' => NULL,
	#'icq' => NULL,
	#'aim' => NULL,
	'streamhits' => NULL,
	'streamstatus' => NULL,
	'streampath' => NULL,
	'bitrate' => NULL,
	'content' => NULL,
	'version' => NULL
);

// SHOUTCASTSERVER
$xml = new SimpleXMLElement($url, NULL, TRUE);

foreach($json as $key => &$value){
	$value = (string)$xml->{strtoupper($key)};
}

$jsonp = json_encode($json);
header('Content-type: application/javascript');
die("{$callback}({$jsonp})");
