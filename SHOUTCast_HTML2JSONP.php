<?php
$url = $_GET['url'];
$callback = $_GET['callback'];

$urlParts = parse_url($url);
$baseURL = "{$urlParts['scheme']}://{$urlParts['host']}:{$urlParts['port']}";

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

$HTMLMap = array(
	'currentlisteners' => NULL,
	'peaklisteners' => 'Listener Peak:',
	'maxlisteners' => NULL,
	'uniquelisteners' => NULL,
	'averagetime' => 'Average Listen Time:',
	'servergenre' => 'Stream Genre:',
	'serverurl' => 'Stream URL:',
	'servertitle' => 'Stream Title:',
	'songtitle' => 'Current Song:',
	'nexttitle' => NULL,
	#'irc' => 'Stream IRC:',
	#'icq' => 'Stream ICQ:',
	#'aim' => 'Stream AIM:',
	'streamhits' => NULL,
	'streamstatus' => 'Server Status:',
	'streampath' => NULL,
	'bitrate' => 'Stream Status:',
	'content' => 'Content Type:',
	'version' => NULL
);

// Get SHOUTCast HTML
$cURL = curl_init($url);
curl_setopt_array($cURL, array(
	CURLOPT_RETURNTRANSFER => TRUE,
	CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US)'
));
$html = curl_exec($cURL);
curl_close($cURL);

// Parse HTML page
$dom = new DOMDocument;
if(@$dom->loadHTML($html)){
	$xPath = new DOMXPath($dom);

	$streamTable = $xPath->query('//table[@align="center"]//tr');

	foreach($streamTable as $row){
		if(($jsonKey = array_search(trim($row->firstChild->nodeValue), $HTMLMap)) !== FALSE){
			$val = str_replace("\xc2\xa0", ' ', $row->lastChild->nodeValue);

			$bitrateListeners = '/^Stream is up at (?<bitrate>\d*) kbps with '.
				'(?<currentlisteners>\d*) of (?<maxlisteners>\d*) listeners \((?<uniquelisteners>\d*) unique\)$/';
			if(preg_match($bitrateListeners, $val, $matches) === 1){
				$json = array_merge($json, array_intersect_key($matches, $json));
			}
			elseif(preg_match('/^Server is currently (\w*) .*$/', $val, $matches) === 1){
				$json[$jsonKey] = $matches[1] === 'up' ? '1' : '0';
			}
			elseif(preg_match('/^(\d*)h (\d*)m (\d*)s$/', $val, $matches) === 1){
				$json[$jsonKey] = strval((intval($matches[1])*60*60) + (intval($matches[2])*60) + intval($matches[3]));
			}
			else{
				$json[$jsonKey] = $val;
			}
		}
	}

	$json['version'] = preg_replace('@SHOUTcast Server V(?:ersion )?(.*)/(.*)@i', '$1 ($2)', $xPath->evaluate('string(//a[@id="ltv"][1])'));

	// http://stackoverflow.com/a/3655588
	$plsFile = $xPath->evaluate('string(//a[@id="tnl"][text()[contains(.,"Listen")]][1]/@href)');
	$plsFile = $baseURL.'/'.$plsFile;

	$playlist = parse_ini_string(file_get_contents($plsFile), true);

	$json['streampath'] = str_replace($baseURL, '', $playlist['playlist']['File1']);
}

$jsonp = json_encode($json);
header('Content-type: application/javascript');
die("{$callback}({$jsonp})");
