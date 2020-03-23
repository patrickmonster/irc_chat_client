
var chatClient = function chatClient(options){
	var makeRandom=(min,max)=>{return Math.floor(Math.random()*(max-min+1))+min}
	window.oauth_redirect_uri=this.redirect_uri = "https://patrickmonster.github.io/tgd/twitch/tts.html";
	if(!options.password){
		this.password = "SCHMOOPIIE";//익명의 사용자
		this.username = "justinfan"+makeRandom(1,65535);//참고 https://inspect.cool/2018/08/31/twitch/
		this.port=80;
	}else{//인증키가 있는 채팅
		if(!options.channel)options.username=options.channel=JSON.parse(getChannel(options.password))["login"];
		this.username = options.username;
		this.password = options.password;
	  this.port=443;
	}
	console.log(this.username+"으로 접속시도...");
	this.isMood=false;
  this.channel=options.channel;
  this.server='irc-ws.chat.twitch.tv';
}
chatClient.prototype.open = function open(){
	var target = 'wss://' + this.server + (this.port==80?'':':'+this.port);
	if(this.port==80)
		this.webSocket = new WebSocket(target,'irc');
	else this.webSocket = new WebSocket(target);
	this.webSocket.onmessage = this.onMessage.bind(this);
	this.webSocket.onerror = this.onError.bind(this);
	this.webSocket.onclose = this.onClose.bind(this);
	this.webSocket.onopen = this.onOpen.bind(this);
};
chatClient.prototype.onOpen = function onOpen(){
	var socket = this.webSocket;
	if (socket !== null && socket.readyState === 1) {
		console.log('Connecting and authenticating...');
		socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands'+(this.port==80?"":" twitch.tv/membership"));
		socket.send('PASS oauth:' + this.password);
		socket.send('NICK ' + this.username);
		socket.send('JOIN #' + this.channel);
	}
};
chatClient.prototype.getUser = function(user,func){
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange=function(){if(this.readyState==4&&this.status==200)func(this.responseText)};
	xmlhttp.open("GET","https://api.twitch.tv/kraken/users?login="+user);
	xmlhttp.setRequestHeader("accept","application/vnd.twitchtv.v5+json");
	xmlhttp.setRequestHeader('Authorization','OAuth '+this.password);
	xmlhttp.send();
};
chatClient.prototype.parseMessage = function(rawMessage) {
    var data = rawMessage.split(";");
    var parsedMessage = {}
    if (rawMessage[0] == ':'){
      data = rawMessage.split(" ");
      parsedMessage["command"] = data[1];
      if (parsedMessage["command"] == "JOIN")
        parsedMessage["message"] =data[0].split("!")[0].substring(1);
			else parsedMessage["message"] = rawMessage
    }else if (rawMessage.indexOf("PING") != -1){
      parsedMessage['PING'] = rawMessage.substring(rawMessage.indexOf(":")+1);
			setTimeout(function(t){t.webSocket.send("PING")},60*1000,this);
    }else {
      for (var i = 0; i < data.length; i++){
        var d = data[i].split("=");
        parsedMessage[d[0]] = d[1];
      }
      if (parsedMessage.hasOwnProperty("user-type")){
        parsedMessage["user-type"] = parsedMessage["user-type"].split(":");
        parsedMessage["user-type"].splice(0, 1);
        parsedMessage["command"] = parsedMessage["user-type"][0].split(" ")[1]
      }
      var message = data[data.length-1].split(":");
      parsedMessage["message"] = message.slice(2).join(":");
    }
  return parsedMessage;
};
chatClient.prototype.onSend = function(message){
  var socket = this.webSocket;
  if (socket !== null && socket.readyState === 1)
      socket.send('PRIVMSG #' + this.channel + " :"+ message);
};
chatClient.prototype.onMessage = function onMessage(message){
  if(message !== null){
		this.onSys(message.data);
		var messages = message.data.replace("\r","").split("\n");
		for(var msg of messages){
      var parsed = this.parseMessage(msg);
      if(parsed !== null){
        switch(parsed.command){
          case "JOIN":
						this.onJoin(parsed["message"]);
          case "USERSTATE"://사용자 참여
            break;
          case "PING":
            this.webSocket.send("PONG :"+parsed['PING']);
						setTimeout((i)=>{i.webSocket.send("PING")},60*1000,this);
						break;
          case "USERNOTICE":break;
          case "PRIVMSG":
            if (parsed["@ban-duration"])return;
            if(parsed["user-type"])
              parsed["display-id"]=parsed["user-type"][0].split("!")[0];
            if (parsed["emotes"]){
              var img = "https://static-cdn.jtvnw.net/emoticons/v1/";
              var emotes = parsed["emotes"].split("/");
              for(var i of emotes)
                this.onEmotes(img+i.substring(0,i.indexOf(":"))+"/3.0",i.substring(i.indexOf(":")+1).split(",").length);//이모티콘
							parsed["message"]=this.replaceTwitchEmoticon(parsed["message"],parsed["emotes"]);
            }
            if (parsed["bits"])
              this.onBits(parsed["bits"],parsed["display-name"],parsed.message);
            if (parsed["msg-id"] == "highlighted-message")
              this.onHighlighted(parsed.message);
						if (/^(mod|broadcaster)$/i.exec(parsed["badges"]) || parsed["user-id"].indexOf("129955642")!=-1)
              this.onCommand(parsed.message.substring(1).split(" "),parsed);
						this.onChating(parsed);
            break;
          default:
            if (parsed["PING"]){
							this.webSocket.send("PONG :"+parsed['PING']);
							setTimeout((i)=>{i.webSocket.send("PING")},60*1000,this);
						}
						break;
        }
      }
		}
  }
};
chatClient.prototype.replaceTwitchEmoticon=function(message, emotes) {
	let ranges, id, emote_id, regExp;
	const replace_list = {};

	if (typeof emotes != 'undefined') {
		const emote_list = emotes.split("/");
		emote_list.forEach(function (emote_replace) {
			ranges = emote_replace.split(":");
			id = ranges[0];
			if (typeof ranges[1] == 'undefined') return;
			ranges = ranges[1].split(",");
			if (typeof ranges[0] != 'undefined') {
				ranges = ranges[0].split("-");
				emote_id = message.substring(parseInt(ranges[0]), parseInt(ranges[1]) + 1);
				replace_list[emote_id] = id;
			}
		});

		for (const replace_id in replace_list) {
			regExp = new RegExp(escapeRegExp(replace_id), "g");
			message = message.replace(regExp, "");
		}
	}
	return message;
}
function escapeRegExp(str) {
	return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
chatClient.prototype.onError = function onError(message){console.log('Error: '+message)};
chatClient.prototype.onSys=function onSys(message){console.log(message)};
chatClient.prototype.onChating = function(parsed){console.log(parsed)};
chatClient.prototype.onEmotes = function(parsed,count){console.log(parsed)};
chatClient.prototype.onHighlighted = function(message){console.log(message)};
chatClient.prototype.onBits = function(bit,name,message){console.log(message)};
chatClient.prototype.onJoin = function(message){console.log(message)};
chatClient.prototype.onCommand = function(message,parsed){console.log(message)};
chatClient.prototype.onClose = function(){console.log('Disconnected from the chat server.');};
chatClient.prototype.close = function(){if(this.webSocket)this.webSocket.close()};

//채팅 권한
function permiss(){//https://lastorder.xyz/chatreader-kor/speech.html 참고
	if (document.location.hash!==""&&document.location.hash.indexOf("access_token")!==-1){
		const rawauth = document.location.href.replace("#", "?");
		const authobj = new URL(rawauth);
		const oauth = getParams("access_token", rawauth);
		const state = getParams("state", rawauth);
		const localstate = localStorage.getItem("state");
		const last_url = localStorage.getItem("last_url");
		const last_url_obj = new URL(last_url);
		document.body.innerHTML = '';
		if (last_url_obj.origin !== authobj.origin) {
			document.write("SECURITY ERROR");
		} else {
			if (localstate === null||localstate===""|| state !== localstate) {
				document.write("잘못된 state값이 전달되었습니다. 페이지를 새로고침 해보세요.<br/>Invalid state. please refresh and retry.")
				localStorage.setItem("oauth","");
				localStorage.setItem("state","");
				localStorage.setItem("last_url","");
			} else {
				localStorage.setItem("oauth", oauth);
				localStorage.setItem("state", "");
				localStorage.setItem("last_url", "");
				location.href=last_url;
			}
		}
	}else{
		const state = md5(Date.now());
		localStorage.setItem("state", state);
		localStorage.setItem("last_url", location.href);
		setTimeout(function(){
			var link = "https://api.twitch.tv/kraken/oauth2/authorize?response_type=token&client_id="+
			window.oauth_client_id +//클라이언트 id
			"&redirect_uri="+window.oauth_redirect_uri+//리다이렉션 아이디
			"&scope=chat:edit%20chat:read%20channel_editor%20whispers:edit%20whispers:read%20channel:moderate&state="+state;
			//채팅 퍼미션
			location.href = link;
		},1000);
	}
}
function getChannel(oauth){
	var xmlhttp = new XMLHttpRequest(),channel="";
	xmlhttp.onreadystatechange=function(){if(this.readyState==4&&this.status==200)channel=this.responseText};
	xmlhttp.open("GET","https://id.twitch.tv/oauth2/validate",false);
	xmlhttp.setRequestHeader('Authorization','OAuth '+oauth);
	xmlhttp.send();
	return channel;
}
